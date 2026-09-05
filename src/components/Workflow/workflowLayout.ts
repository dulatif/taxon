import { type Edge, MarkerType, type Node } from '@xyflow/react';
import type { Task } from '../../types';
import type { ModuleGroupNodeData } from './ModuleGroupNode';
import type { TaskNodeData } from './TaskNode';

export const TASK_NODE_WIDTH = 220;
export const TASK_NODE_HEIGHT_NORMAL = 90;
export const TASK_NODE_HEIGHT_COLLAPSED = 45;
export const MAX_MODULES_PER_ROW = 2;
export const MAX_TASKS_PER_ROW = 2; // Maksimal 2 task berjajar horizontal
export const TASK_HORIZONTAL_GAP = 60;
export const TASK_VERTICAL_GAP = 50;
export const MODULE_PADDING = 30;
export const MODULE_HEADER_OFFSET = 40;
export const MODULE_WIDTH = 450;
export const MODULE_HEIGHT = 350;
export const MODULE_GAP = 60;

export interface DynamicModuleBounds {
  position: {
    x: number;
    y: number;
  };
  style: {
    width: number;
    height: number;
  };
  width: number;
  height: number;
  x: number;
  y: number;
}

export type ModuleBounds = DynamicModuleBounds;

export interface WorkflowGraphOptions {
  activeTaskId?: string | null;
  nextTaskIds?: string[];
  selectedTaskId?: string | null;
  onSelectTask?: (task: Task) => void;
}

export function buildTaskIdLookup(tasks: Task[]): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const task of tasks) {
    const rawId = task.id;
    if (!rawId) continue;

    lookup.set(rawId, rawId);
    lookup.set(rawId.toLowerCase(), rawId);

    const shortId = rawId.length > 6 ? rawId.slice(-6) : rawId;
    lookup.set(shortId, rawId);
    lookup.set(shortId.toLowerCase(), rawId);
    lookup.set(`TASK-${shortId}`, rawId);
    lookup.set(`TASK-${shortId.toLowerCase()}`, rawId);
    lookup.set(`task-${shortId.toLowerCase()}`, rawId);

    if (rawId.toUpperCase().startsWith('TASK-')) {
      const withoutPrefix = rawId.slice(5);
      lookup.set(withoutPrefix, rawId);
      lookup.set(withoutPrefix.toLowerCase(), rawId);
    } else {
      lookup.set(`TASK-${rawId}`, rawId);
      lookup.set(`task-${rawId.toLowerCase()}`, rawId);
    }
  }
  return lookup;
}

export function getWorkflowElements(
  tasks: Task[],
  options: WorkflowGraphOptions = {},
): { nodes: Node[]; edges: Edge[] } {
  const { activeTaskId, nextTaskIds = [], selectedTaskId, onSelectTask } = options;
  const lookup = buildTaskIdLookup(tasks);

  const activeResolvedId = activeTaskId ? lookup.get(activeTaskId) || activeTaskId : null;
  const selectedResolvedId = selectedTaskId ? lookup.get(selectedTaskId) || selectedTaskId : null;
  const nextResolvedSet = new Set(nextTaskIds.map((id) => lookup.get(id) || id).filter(Boolean));

  const taskById = new Map<string, Task>();
  for (const t of tasks) {
    taskById.set(t.id, t);
    const shortId = t.id.replace(/^task_/, '');
    taskById.set(shortId, t);
    taskById.set(`TASK-${shortId}`, t);
  }

  // Group tasks by moduleGroup (default: 'Ungrouped')
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    if (task.archived) continue;
    const groupName = task.moduleGroup?.trim() || 'Ungrouped';
    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }
    groups.get(groupName)!.push(task);
  }

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const taskPositions = new Map<string, { x: number; y: number; width: number; height: number }>();

  const CANVAS_OFFSET_X = 40;
  const CANVAS_OFFSET_Y = 40;

  interface GroupLayoutData {
    name: string;
    tasks: Task[];
    orderedTasks: Task[];
    relPositions: Map<string, { x: number; y: number; col: number; row: number }>;
    width: number;
    height: number;
  }

  const groupLayouts: GroupLayoutData[] = [];

  // 1. Layout each module group internally with multi-row / wrap layout (MAX_TASKS_PER_ROW = 2)
  for (const [groupName, groupTasks] of groups.entries()) {
    const orderedTasks = sortTasksTopologically(groupTasks, lookup);
    const relPositions = layoutTasksInModule(orderedTasks, MAX_TASKS_PER_ROW);

    // Create provisional child nodes to calculate initial dynamic module bounds
    const provisionalNodes: Node[] = orderedTasks.map((task) => {
      const pos = relPositions.get(task.id)!;
      return {
        id: task.id,
        position: {
          x: MODULE_PADDING + pos.x,
          y: MODULE_PADDING + MODULE_HEADER_OFFSET + pos.y,
        },
        data: {},
      };
    });

    const bounds = getDynamicModuleBounds(provisionalNodes, MODULE_PADDING);

    groupLayouts.push({
      name: groupName,
      tasks: groupTasks,
      orderedTasks,
      relPositions,
      width: bounds.style.width,
      height: bounds.style.height,
    });
  }

  // 2. Position Parent Modules in a Vertical Hybrid 2-Column Grid
  const numRows = Math.ceil(groupLayouts.length / MAX_MODULES_PER_ROW);
  const colWidths = new Array(MAX_MODULES_PER_ROW).fill(0);
  const rowHeights = new Array(numRows).fill(0);

  groupLayouts.forEach((gl, index) => {
    const col = index % MAX_MODULES_PER_ROW;
    const row = Math.floor(index / MAX_MODULES_PER_ROW);
    colWidths[col] = Math.max(colWidths[col], gl.width);
    rowHeights[row] = Math.max(rowHeights[row], gl.height);
  });

  groupLayouts.forEach((gl, index) => {
    const col = index % MAX_MODULES_PER_ROW;
    const row = Math.floor(index / MAX_MODULES_PER_ROW);

    let moduleX = CANVAS_OFFSET_X;
    for (let c = 0; c < col; c++) {
      moduleX += colWidths[c] + MODULE_GAP;
    }

    let moduleY = CANVAS_OFFSET_Y;
    for (let r = 0; r < row; r++) {
      moduleY += rowHeights[r] + MODULE_GAP;
    }

    const completedTasksCount = gl.tasks.filter((t) => t.completed || t.status === 'Done').length;
    const childTaskNodes: Node[] = [];

    for (const task of gl.orderedTasks) {
      const relPos = gl.relPositions.get(task.id) || { x: 0, y: 0 };
      const isDone = task.completed || task.status === 'Done';
      const nodeHeight = isDone ? TASK_NODE_HEIGHT_COLLAPSED : TASK_NODE_HEIGHT_NORMAL;

      const posX = moduleX + MODULE_PADDING + relPos.x;
      const posY = moduleY + MODULE_PADDING + MODULE_HEADER_OFFSET + relPos.y;

      const isResolvedActive = activeTaskId
        ? lookup.get(activeTaskId) === task.id || activeTaskId === task.id
        : false;
      const isResolvedNext = nextTaskIds.some((id) => lookup.get(id) === task.id || id === task.id);
      const isSelected = selectedTaskId
        ? lookup.get(selectedTaskId) === task.id || selectedTaskId === task.id
        : false;

      taskPositions.set(task.id, {
        x: posX,
        y: posY,
        width: TASK_NODE_WIDTH,
        height: nodeHeight,
      });

      const taskNode: Node = {
        id: task.id,
        type: 'taskNode',
        selected: isSelected,
        position: { x: posX, y: posY },
        data: {
          task,
          isAgentActive: isResolvedActive,
          isAgentNext: isResolvedNext,
          onSelectTask,
        } as TaskNodeData,
        draggable: true,
      };
      nodes.push(taskNode);
      childTaskNodes.push(taskNode);
    }

    // Dynamic parent bounding box calculation using getDynamicModuleBounds
    const bounds = getDynamicModuleBounds(childTaskNodes, MODULE_PADDING);

    const groupNode: Node = {
      id: `group-${gl.name}`,
      type: 'moduleGroup',
      position: childTaskNodes.length > 0 ? bounds.position : { x: moduleX, y: moduleY },
      style: {
        ...bounds.style,
        zIndex: -1,
      },
      data: {
        title: gl.name,
        totalTasks: gl.tasks.length,
        completedTasks: completedTasksCount,
      } as ModuleGroupNodeData,
      selectable: false,
      draggable: false,
    };
    nodes.push(groupNode);
  });

  // Generate All Dependency Edges (Intra & Inter-Group)
  const renderedTaskNodeIds = new Set(nodes.filter((n) => n.type === 'taskNode').map((n) => n.id));

  for (const task of tasks) {
    if (task.archived || !task.dependsOn || !Array.isArray(task.dependsOn)) continue;

    for (const dep of task.dependsOn) {
      const sourceId = lookup.get(dep);
      if (!sourceId || sourceId === task.id) continue;
      if (!renderedTaskNodeIds.has(sourceId) || !renderedTaskNodeIds.has(task.id)) continue;

      const sourceTask = taskById.get(sourceId);
      const isSourceInProgress = sourceTask?.status === 'In Progress';
      const isSourceSelected = Boolean(selectedResolvedId && sourceId === selectedResolvedId);
      const isTargetQueue =
        task.status === 'To Do' || task.status === 'Need to Test' || nextResolvedSet.has(task.id);

      const isTargetActive = activeResolvedId === task.id;
      const isSourceActive = activeResolvedId === sourceId;
      const isTargetNext = nextResolvedSet.has(task.id);

      const isAgentTrajectoryEdge =
        (isSourceActive && isTargetNext) || (isSourceActive && isTargetActive) || isTargetActive;

      const isQueueFlowEdge =
        (isSourceInProgress || isSourceSelected) && isTargetQueue && !isAgentTrajectoryEdge;
      const isAnimated = isAgentTrajectoryEdge || isQueueFlowEdge;

      let edgeClassName = 'workflow-edge';
      let strokeColor = 'var(--workflow-edge-stroke, #94a3b8)';
      let strokeWidth = 1.75;

      if (isAgentTrajectoryEdge) {
        edgeClassName = 'workflow-edge-agent';
        strokeColor = '#c084fc';
        strokeWidth = 2.5;
      } else if (isQueueFlowEdge) {
        edgeClassName = 'workflow-edge-queue';
        strokeColor = '#60a5fa';
        strokeWidth = 2.25;
      }

      const sPos = taskPositions.get(sourceId);
      const tPos = taskPositions.get(task.id);
      const { sourceHandle, targetHandle } =
        sPos && tPos
          ? getSmartEdgeHandles(sPos, tPos)
          : { sourceHandle: 'source-right', targetHandle: 'target-left' };

      const edge: Edge = {
        id: `e-${sourceId}-${task.id}`,
        source: sourceId,
        target: task.id,
        sourceHandle,
        targetHandle,
        type: 'bezier',
        animated: isAnimated,
        className: edgeClassName,
        style: {
          stroke: strokeColor,
          strokeWidth,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: strokeColor,
          width: 16,
          height: 16,
        },
      };

      edges.push(edge);
    }
  }

  return { nodes, edges: removeRedundantEdges(edges) };
}

/**
 * Transitive Reduction: Prunes redundant edges from the DAG.
 * If there is an alternative path from source to target through one or more
 * intermediate nodes (e.g. A -> B -> C), the direct redundant edge (A -> C) is removed.
 */
export function removeRedundantEdges(rawEdges: Edge[]): Edge[] {
  const adj = new Map<string, string[]>();
  for (const edge of rawEdges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }

  return rawEdges.filter((edgeToCheck) => {
    const { source, target } = edgeToCheck;

    const queue: string[] = [];
    const visited = new Set<string>();

    const neighbors = adj.get(source) || [];
    for (const neighbor of neighbors) {
      if (neighbor !== target && !visited.has(neighbor)) {
        queue.push(neighbor);
        visited.add(neighbor);
      }
    }

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (curr === target) return false;

      const nextNodes = adj.get(curr) || [];
      for (const next of nextNodes) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }

    return true;
  });
}

export function getSmartEdgeHandles(
  sourcePos: { x: number; y: number; width?: number; height?: number },
  targetPos: { x: number; y: number; width?: number; height?: number },
): { sourceHandle: string; targetHandle: string } {
  const sWidth = sourcePos.width ?? TASK_NODE_WIDTH;
  const sHeight = sourcePos.height ?? TASK_NODE_HEIGHT_NORMAL;
  const tWidth = targetPos.width ?? TASK_NODE_WIDTH;
  const tHeight = targetPos.height ?? TASK_NODE_HEIGHT_NORMAL;

  const sourceCenter = { x: sourcePos.x + sWidth / 2, y: sourcePos.y + sHeight / 2 };
  const targetCenter = { x: targetPos.x + tWidth / 2, y: targetPos.y + tHeight / 2 };

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  // When wrapping to a lower row on the left (e.g. col 1 row 0 -> col 0 row 1)
  if (dx < -sWidth / 2 && dy > sHeight / 2) {
    return { sourceHandle: 'source-bottom', targetHandle: 'target-top' };
  }

  // Primarily horizontal connection (across module columns or horizontal placements)
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      return { sourceHandle: 'source-right', targetHandle: 'target-left' };
    } else {
      return { sourceHandle: 'source-left', targetHandle: 'target-right' };
    }
  }

  // Primarily vertical connection (top-to-bottom within column)
  if (dy >= 0) {
    return { sourceHandle: 'source-bottom', targetHandle: 'target-top' };
  } else {
    return { sourceHandle: 'source-top', targetHandle: 'target-bottom' };
  }
}

// Fungsi kalkulasi ukuran fleksibel untuk Parent Box Modul
export const getDynamicModuleBounds = (
  childTasks: Node[],
  padding = 30,
  taskWidth = TASK_NODE_WIDTH,
  taskHeight = TASK_NODE_HEIGHT_NORMAL,
): DynamicModuleBounds => {
  if (childTasks.length === 0) {
    return {
      position: { x: 0, y: 0 },
      style: { width: 300, height: 120 },
      width: 300,
      height: 120,
      x: 0,
      y: 0,
    }; // Default size jika modul kosong
  }

  // 1. Cari titik paling kiri, paling kanan, paling atas, dan paling bawah
  const xCoords = childTasks.map((t) => t.position.x);
  const yCoords = childTasks.map((t) => t.position.y);

  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);

  const TASK_WIDTH = taskWidth; // Sesuaikan dengan lebar kartu task kamu
  const TASK_HEIGHT = taskHeight; // Sesuaikan dengan tinggi kartu task kamu
  const HEADER_OFFSET = 40; // Space untuk Judul Modul di atas

  const posX = minX - padding;
  const posY = minY - padding - HEADER_OFFSET;
  const width = maxX - minX + TASK_WIDTH + padding * 2;
  const height = maxY - minY + TASK_HEIGHT + padding * 2 + HEADER_OFFSET;

  // 2. Tentukan ukuran container yang pas dengan sebaran task
  return {
    position: {
      x: posX,
      y: posY,
    },
    style: {
      width,
      height,
    },
    width,
    height,
    x: posX,
    y: posY,
  };
};

export const calculateModuleBounds = getDynamicModuleBounds;

/**
 * Trik sederhana membagi task di dalam modul menjadi Grid/Staggered
 * Maksimal 2 task berjajar horizontal (MAX_TASKS_PER_ROW)
 */
export function layoutTasksInModule(
  tasks: Task[],
  maxTasksPerRow = MAX_TASKS_PER_ROW,
  nodeWidth = TASK_NODE_WIDTH,
  nodeHeight = TASK_NODE_HEIGHT_NORMAL,
  horizontalGap = TASK_HORIZONTAL_GAP,
  verticalGap = TASK_VERTICAL_GAP,
): Map<string, { x: number; y: number; col: number; row: number }> {
  const positions = new Map<string, { x: number; y: number; col: number; row: number }>();

  tasks.forEach((task, index) => {
    const col = index % maxTasksPerRow;
    const row = Math.floor(index / maxTasksPerRow);

    positions.set(task.id, {
      x: col * (nodeWidth + horizontalGap),
      y: row * (nodeHeight + verticalGap),
      col,
      row,
    });
  });

  return positions;
}

/**
 * Sorts tasks within a module topologically so prerequisites appear before dependent tasks.
 */
export function sortTasksTopologically(tasks: Task[], lookup: Map<string, string>): Task[] {
  const taskIdsInGroup = new Set(tasks.map((t) => t.id));
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const task of tasks) {
    inDegree.set(task.id, 0);
    adj.set(task.id, []);
  }

  for (const task of tasks) {
    if (task.dependsOn && Array.isArray(task.dependsOn)) {
      for (const dep of task.dependsOn) {
        const sourceId = lookup.get(dep);
        if (sourceId && taskIdsInGroup.has(sourceId) && sourceId !== task.id) {
          adj.get(sourceId)!.push(task.id);
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      }
    }
  }

  const queue: Task[] = [];
  for (const task of tasks) {
    if ((inDegree.get(task.id) || 0) === 0) {
      queue.push(task);
    }
  }

  const result: Task[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    result.push(curr);

    const neighbors = adj.get(curr.id) || [];
    for (const nextId of neighbors) {
      const newDeg = (inDegree.get(nextId) || 1) - 1;
      inDegree.set(nextId, newDeg);
      if (newDeg === 0) {
        const nextTask = tasks.find((t) => t.id === nextId);
        if (nextTask) queue.push(nextTask);
      }
    }
  }

  if (result.length < tasks.length) {
    const visited = new Set(result.map((t) => t.id));
    for (const task of tasks) {
      if (!visited.has(task.id)) {
        result.push(task);
      }
    }
  }

  return result;
}
