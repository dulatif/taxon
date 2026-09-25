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

export interface GroupLayoutData {
  name: string;
  tasks: Task[];
  orderedTasks: Task[];
  relPositions: Map<string, { x: number; y: number; col: number; row: number }>;
  width: number;
  height: number;
}

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

  const groupLayouts: GroupLayoutData[] = [];

  // 1. Layout each module group internally with topological depth ranks
  for (const [groupName, groupTasks] of groups.entries()) {
    const orderedTasks = sortTasksTopologically(groupTasks, lookup);
    const relPositions = layoutTasksInModule(orderedTasks, MAX_TASKS_PER_ROW, lookup);

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

  // 2. Position Parent Modules in a Layered Hybrid Grid via Strict Topological Tiering
  const rows: GroupLayoutData[][] = [];

  if (groupLayouts.length <= MAX_MODULES_PER_ROW) {
    // Up to 2 modules: single horizontal row in topological order
    const sortedGroupLayouts = sortModulesTopologically(groupLayouts, tasks, lookup);
    rows.push(sortedGroupLayouts);
  } else {
    // > 2 modules: Strict Topological Tiering (Sugiyama Layering)
    const moduleTiers = computeModuleTiers(groupLayouts, tasks, lookup);

    const tierMap = new Map<number, GroupLayoutData[]>();
    groupLayouts.forEach((gl) => {
      const tier = moduleTiers.get(gl.name) ?? 0;
      if (!tierMap.has(tier)) tierMap.set(tier, []);
      tierMap.get(tier)!.push(gl);
    });

    const sortedTiers = Array.from(tierMap.keys()).sort((a, b) => a - b);

    // Build module inter-adjacency for in-tier topological ordering
    const moduleAdj = new Map<string, Set<string>>();
    for (const gl of groupLayouts) {
      moduleAdj.set(gl.name, new Set<string>());
    }
    const taskToGroup = new Map<string, string>();
    for (const gl of groupLayouts) {
      for (const t of gl.tasks) {
        taskToGroup.set(t.id, gl.name);
        const shortId = t.id.replace(/^task_/, '');
        taskToGroup.set(shortId, gl.name);
        taskToGroup.set(`TASK-${shortId}`, gl.name);
      }
    }
    for (const gl of groupLayouts) {
      for (const task of gl.tasks) {
        if (task.dependsOn && Array.isArray(task.dependsOn)) {
          for (const dep of task.dependsOn) {
            const sourceId = lookup.get(dep);
            if (sourceId) {
              const sourceGroup = taskToGroup.get(sourceId);
              if (sourceGroup && sourceGroup !== gl.name && moduleAdj.has(sourceGroup)) {
                moduleAdj.get(sourceGroup)!.add(gl.name);
              }
            }
          }
        }
      }
    }

    for (const tier of sortedTiers) {
      const tierModules = tierMap.get(tier)!;
      if (tierModules.length > 1) {
        // Order modules within multi-module tier topologically by intra-tier dependencies
        const inDeg = new Map<string, number>();
        tierModules.forEach((m) => inDeg.set(m.name, 0));
        tierModules.forEach((m) => {
          const targets = moduleAdj.get(m.name) || new Set<string>();
          for (const tgt of targets) {
            if (inDeg.has(tgt)) {
              inDeg.set(tgt, (inDeg.get(tgt) || 0) + 1);
            }
          }
        });
        tierModules.sort((a, b) => (inDeg.get(a.name) || 0) - (inDeg.get(b.name) || 0));
      }

      for (let i = 0; i < tierModules.length; i += MAX_MODULES_PER_ROW) {
        rows.push(tierModules.slice(i, i + MAX_MODULES_PER_ROW));
      }
    }
  }

  const sortedGroupLayouts = rows.flat();

  const numCols = MAX_MODULES_PER_ROW;
  const colWidths = Array.from({ length: numCols }, () => 0);
  const rowHeights = Array.from({ length: rows.length }, () => 0);

  rows.forEach((rowModules, rIdx) => {
    rowModules.forEach((gl, cIdx) => {
      colWidths[cIdx] = Math.max(colWidths[cIdx] ?? 0, gl.width);
      rowHeights[rIdx] = Math.max(rowHeights[rIdx] ?? 0, gl.height);
    });
  });

  const totalGridWidth = (colWidths[0] ?? 0) + MODULE_GAP + (colWidths[1] ?? 0);
  const modulePositions = new Map<string, { x: number; y: number }>();

  let currentY = CANVAS_OFFSET_Y;
  rows.forEach((rowModules, rIdx) => {
    const rHeight = rowHeights[rIdx] ?? 0;

    if (rowModules.length === 1 && rows.length > 1 && rowModules[0]) {
      // Single module on this row: horizontally center beneath parent modules (Barycenter Alignment)
      const gl = rowModules[0];
      const centeredX = CANVAS_OFFSET_X + Math.max(0, (totalGridWidth - gl.width) / 2);
      modulePositions.set(gl.name, { x: centeredX, y: currentY });
    } else {
      // Standard multi-column placement
      rowModules.forEach((gl, cIdx) => {
        let moduleX = CANVAS_OFFSET_X;
        for (let c = 0; c < cIdx; c++) {
          moduleX += (colWidths[c] ?? 0) + MODULE_GAP;
        }
        modulePositions.set(gl.name, { x: moduleX, y: currentY });
      });
    }

    currentY += rHeight + MODULE_GAP;
  });

  sortedGroupLayouts.forEach((gl) => {
    const modPos = modulePositions.get(gl.name) || { x: CANVAS_OFFSET_X, y: CANVAS_OFFSET_Y };
    const moduleX = modPos.x;
    const moduleY = modPos.y;

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

      const edge: Edge = {
        id: `e-${sourceId}-${task.id}`,
        source: sourceId,
        target: task.id,
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

  const nonRedundantEdges = removeRedundantEdges(edges);
  const finalEdges = assignHandlesToEdges(
    nonRedundantEdges,
    taskPositions,
    tasks,
    options?.selectedTaskId,
  );

  return { nodes, edges: finalEdges };
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

/**
 * Checks if a sibling node occupies the space directly to the right of sourcePos on the same row.
 */
export function isRightSideOccupied(
  sourceId: string,
  sourcePos: { x: number; y: number; width?: number; height?: number },
  taskPositions: Map<string, { x: number; y: number; width?: number; height?: number }>,
): boolean {
  const sWidth = sourcePos.width ?? TASK_NODE_WIDTH;
  const sHeight = sourcePos.height ?? TASK_NODE_HEIGHT_NORMAL;
  for (const [id, pos] of taskPositions.entries()) {
    if (id === sourceId) continue;
    const onSameRow = Math.abs(pos.y - sourcePos.y) < sHeight * 0.5;
    const isToTheRight = pos.x > sourcePos.x && pos.x < sourcePos.x + sWidth * 2;
    if (onSameRow && isToTheRight) return true;
  }
  return false;
}

/**
 * Checks if another task node sits directly beneath sourcePos in the same column,
 * blocking a direct downward exit from source-bottom.
 */
export function hasSiblingDirectlyBelow(
  sourceId: string,
  targetId: string,
  sourcePos: { x: number; y: number; width?: number; height?: number },
  targetPos: { x: number; y: number; width?: number; height?: number },
  taskPositions: Map<string, { x: number; y: number; width?: number; height?: number }>,
): boolean {
  const sWidth = sourcePos.width ?? TASK_NODE_WIDTH;
  const sHeight = sourcePos.height ?? TASK_NODE_HEIGHT_NORMAL;

  for (const [id, pos] of taskPositions.entries()) {
    if (id === sourceId || id === targetId) continue;
    const inSameCol = Math.abs(pos.x - sourcePos.x) < sWidth * 0.4;
    const isBelowSource = pos.y > sourcePos.y + sHeight * 0.5 && pos.y <= targetPos.y;
    if (inSameCol && isBelowSource) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if another task node sits between sourcePos and targetPos on the same horizontal row.
 */
export function isNodeBetweenHorizontal(
  sourceId: string,
  targetId: string,
  sourcePos: { x: number; y: number; width?: number; height?: number },
  targetPos: { x: number; y: number; width?: number; height?: number },
  taskPositions: Map<string, { x: number; y: number; width?: number; height?: number }>,
): boolean {
  const sHeight = sourcePos.height ?? TASK_NODE_HEIGHT_NORMAL;
  if (Math.abs(sourcePos.y - targetPos.y) >= sHeight * 0.5) return false;

  const minX = Math.min(sourcePos.x, targetPos.x);
  const maxX = Math.max(sourcePos.x, targetPos.x);

  for (const [id, pos] of taskPositions.entries()) {
    if (id === sourceId || id === targetId) continue;
    const onSameRow = Math.abs(pos.y - sourcePos.y) < sHeight * 0.5;
    const isBetween = pos.x > minX + 20 && pos.x < maxX - 20;
    if (onSameRow && isBetween) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if another task node sits between sourcePos and targetPos in the same vertical column.
 */
export function isNodeBetweenVertical(
  sourceId: string,
  targetId: string,
  sourcePos: { x: number; y: number; width?: number; height?: number },
  targetPos: { x: number; y: number; width?: number; height?: number },
  taskPositions: Map<string, { x: number; y: number; width?: number; height?: number }>,
): boolean {
  const sWidth = sourcePos.width ?? TASK_NODE_WIDTH;
  if (Math.abs(sourcePos.x - targetPos.x) >= sWidth * 0.4) return false;

  const minY = Math.min(sourcePos.y, targetPos.y);
  const maxY = Math.max(sourcePos.y, targetPos.y);

  for (const [id, pos] of taskPositions.entries()) {
    if (id === sourceId || id === targetId) continue;
    const inSameCol = Math.abs(pos.x - sourcePos.x) < sWidth * 0.4;
    const isBetween = pos.y > minY + 20 && pos.y < maxY - 20;
    if (inSameCol && isBetween) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a task node has another task directly above it in the same vertical column.
 */
export function hasNodeDirectlyAbove(
  targetId: string,
  targetPos: { x: number; y: number; width?: number; height?: number },
  taskPositions: Map<string, { x: number; y: number; width?: number; height?: number }>,
): boolean {
  const tWidth = targetPos.width ?? TASK_NODE_WIDTH;
  const tHeight = targetPos.height ?? TASK_NODE_HEIGHT_NORMAL;

  for (const [id, pos] of taskPositions.entries()) {
    if (id === targetId || id.startsWith('group-')) continue;
    const inSameCol = Math.abs(pos.x - targetPos.x) < tWidth * 0.4;
    const isAbove = pos.y < targetPos.y && targetPos.y - pos.y < tHeight * 2.5;
    if (inSameCol && isAbove) {
      return true;
    }
  }
  return false;
}

export function getSmartEdgeHandles(
  sourcePos: { x: number; y: number; width?: number; height?: number },
  targetPos: { x: number; y: number; width?: number; height?: number },
  taskPositions?: Map<string, { x: number; y: number; width?: number; height?: number }>,
  sourceId?: string,
  targetId?: string,
): { sourceHandle: string; targetHandle: string } {
  const sWidth = sourcePos.width ?? TASK_NODE_WIDTH;
  const sHeight = sourcePos.height ?? TASK_NODE_HEIGHT_NORMAL;
  const tWidth = targetPos.width ?? TASK_NODE_WIDTH;
  const tHeight = targetPos.height ?? TASK_NODE_HEIGHT_NORMAL;

  const sourceCenter = { x: sourcePos.x + sWidth / 2, y: sourcePos.y + sHeight / 2 };
  const targetCenter = { x: targetPos.x + tWidth / 2, y: targetPos.y + tHeight / 2 };

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  // Obstacle Clearance Checks
  if (taskPositions && sourceId && targetId) {
    if (isNodeBetweenHorizontal(sourceId, targetId, sourcePos, targetPos, taskPositions)) {
      return { sourceHandle: 'source-top', targetHandle: 'target-top' };
    }

    if (isNodeBetweenVertical(sourceId, targetId, sourcePos, targetPos, taskPositions)) {
      const handleSide = isRightSideOccupied(sourceId, sourcePos, taskPositions) ? 'left' : 'right';
      return { sourceHandle: `source-${handleSide}`, targetHandle: `target-${handleSide}` };
    }

    if (hasSiblingDirectlyBelow(sourceId, targetId, sourcePos, targetPos, taskPositions)) {
      if (isRightSideOccupied(sourceId, sourcePos, taskPositions)) {
        return {
          sourceHandle: 'source-left',
          targetHandle: Math.abs(dx) > Math.abs(dy) ? 'target-right' : 'target-top',
        };
      }
      if (dx >= 0) {
        return {
          sourceHandle: 'source-right',
          targetHandle: Math.abs(dx) > Math.abs(dy) ? 'target-left' : 'target-top',
        };
      }
      return {
        sourceHandle: 'source-left',
        targetHandle: Math.abs(dx) > Math.abs(dy) ? 'target-right' : 'target-top',
      };
    }
  }

  // Downward connection (source above target)
  if (dy > sHeight / 2) {
    if (dx < -tWidth * 0.4) {
      return { sourceHandle: 'source-bottom', targetHandle: 'target-right' };
    }
    if (dx > tWidth * 0.4) {
      return { sourceHandle: 'source-bottom', targetHandle: 'target-left' };
    }
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

  // Upward connection
  if (dy < -sHeight / 2) {
    if (dx < -tWidth * 0.4) {
      return { sourceHandle: 'source-top', targetHandle: 'target-right' };
    }
    if (dx > tWidth * 0.4) {
      return { sourceHandle: 'source-top', targetHandle: 'target-left' };
    }
    return { sourceHandle: 'source-top', targetHandle: 'target-bottom' };
  }

  return { sourceHandle: 'source-bottom', targetHandle: 'target-top' };
}

const STATUS_RANK: Record<string, number> = {
  'In Progress': 4,
  'Need to Test': 3,
  'To Do': 2,
  Done: 1,
};

const PRIORITY_RANK: Record<string, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

/**
 * Computes Euclidean distance between source and target node centers.
 */
function getEdgeDistance(
  sourceId: string,
  targetId: string,
  taskPositions: Map<string, { x: number; y: number; width?: number; height?: number }>,
): number {
  const sPos = taskPositions.get(sourceId);
  const tPos = taskPositions.get(targetId);
  if (!sPos || !tPos) return 999999;

  const sWidth = sPos.width ?? TASK_NODE_WIDTH;
  const sHeight = sPos.height ?? TASK_NODE_HEIGHT_NORMAL;
  const tWidth = tPos.width ?? TASK_NODE_WIDTH;
  const tHeight = tPos.height ?? TASK_NODE_HEIGHT_NORMAL;

  const dx = tPos.x + tWidth / 2 - (sPos.x + sWidth / 2);
  const dy = tPos.y + tHeight / 2 - (sPos.y + sHeight / 2);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Identifies secondary (de-emphasized) edge IDs among multi-connector convergences and divergences.
 * A connector is "primary" (opacity 1.0) if it links to an active task (In Progress > Need to Test)
 * or, when statuses match, has the shortest spatial distance (nearest path).
 * Secondary connectors receive opacity 0.7.
 */
export function identifySecondaryEdges(
  edges: Edge[],
  taskPositions: Map<string, { x: number; y: number; width?: number; height?: number }>,
  tasks?: Task[],
): Set<string> {
  const taskById = new Map<string, Task>();
  if (tasks) {
    for (const t of tasks) {
      taskById.set(t.id, t);
      const shortId = t.id.replace(/^task_/, '');
      taskById.set(shortId, t);
      taskById.set(`TASK-${shortId}`, t);
    }
  }

  const edgesByTarget = new Map<string, Edge[]>();
  const edgesBySource = new Map<string, Edge[]>();

  for (const edge of edges) {
    if (!edgesByTarget.has(edge.target)) edgesByTarget.set(edge.target, []);
    edgesByTarget.get(edge.target)!.push(edge);

    if (!edgesBySource.has(edge.source)) edgesBySource.set(edge.source, []);
    edgesBySource.get(edge.source)!.push(edge);
  }

  const primaryEdgeIds = new Set<string>();
  const multiGroupEdgeIds = new Set<string>();

  const pickPrimaryEdge = (group: Edge[], evaluateNode: (e: Edge) => string): Edge => {
    return [...group].sort((a, b) => {
      const taskA = taskById.get(evaluateNode(a));
      const taskB = taskById.get(evaluateNode(b));

      const rankA = taskA ? (STATUS_RANK[taskA.status] ?? 0) : 0;
      const rankB = taskB ? (STATUS_RANK[taskB.status] ?? 0) : 0;

      // 1. Higher active status wins (e.g. In Progress > Need to Test > To Do)
      if (rankA !== rankB) return rankB - rankA;

      // 2. Fallback: Shortest spatial distance (nearest path node wins)
      const distA = getEdgeDistance(a.source, a.target, taskPositions);
      const distB = getEdgeDistance(b.source, b.target, taskPositions);
      if (Math.abs(distA - distB) > 1) return distA - distB;

      // 3. Priority fallback (Critical > High > Medium > Low)
      const prioA = taskA ? (PRIORITY_RANK[taskA.priority] ?? 0) : 0;
      const prioB = taskB ? (PRIORITY_RANK[taskB.priority] ?? 0) : 0;
      if (prioA !== prioB) return prioB - prioA;

      return a.id.localeCompare(b.id);
    })[0]!;
  };

  // Evaluate Fan-In (convergences with 2+ incoming edges)
  for (const incoming of edgesByTarget.values()) {
    if (incoming.length >= 2) {
      for (const e of incoming) multiGroupEdgeIds.add(e.id);
      const primary = pickPrimaryEdge(incoming, (e) => e.source);
      primaryEdgeIds.add(primary.id);
    }
  }

  // Evaluate Fan-Out (divergences with 2+ outgoing edges)
  for (const outgoing of edgesBySource.values()) {
    if (outgoing.length >= 2) {
      for (const e of outgoing) multiGroupEdgeIds.add(e.id);
      const primary = pickPrimaryEdge(outgoing, (e) => e.target);
      primaryEdgeIds.add(primary.id);
    }
  }

  const secondaryEdgeIds = new Set<string>();
  for (const edgeId of multiGroupEdgeIds) {
    if (!primaryEdgeIds.has(edgeId)) {
      secondaryEdgeIds.add(edgeId);
    }
  }

  return secondaryEdgeIds;
}

/**
 * Assigns source and target handles to non-redundant edges.
 * If a target node has multiple incoming edges, distributes them across target-top, target-left,
 * and target-right to eliminate handle collisions and overlapping curves.
 */
export function assignHandlesToEdges(
  edges: Edge[],
  taskPositions: Map<string, { x: number; y: number; width?: number; height?: number }>,
  tasks?: Task[],
  activeTaskId?: string | null,
): Edge[] {
  const edgesByTarget = new Map<string, Edge[]>();
  for (const edge of edges) {
    if (!edgesByTarget.has(edge.target)) {
      edgesByTarget.set(edge.target, []);
    }
    edgesByTarget.get(edge.target)!.push(edge);
  }

  const edgesBySource = new Map<string, Edge[]>();
  for (const edge of edges) {
    if (!edgesBySource.has(edge.source)) {
      edgesBySource.set(edge.source, []);
    }
    edgesBySource.get(edge.source)!.push(edge);
  }

  // Detect downward convergence targets (2+ incoming edges from >40px above)
  const fanInTargets = new Set<string>();
  for (const [targetId, incoming] of edgesByTarget.entries()) {
    const tPos = taskPositions.get(targetId);
    if (!tPos) continue;
    const downwardCount = incoming.filter((edge) => {
      const sPos = taskPositions.get(edge.source);
      return sPos && tPos.y - sPos.y > 40;
    }).length;
    if (downwardCount >= 2) {
      fanInTargets.add(targetId);
    }
  }

  // Detect downward divergence sources (2+ outgoing edges to >40px below)
  // Skip if source card's bottom is blocked by a sibling card directly below in the same group
  const fanOutSources = new Set<string>();
  for (const [sourceId, outgoing] of edgesBySource.entries()) {
    const sPos = taskPositions.get(sourceId);
    if (!sPos) continue;
    const hasBlockedBottom = outgoing.some((edge) => {
      const tPos = taskPositions.get(edge.target);
      return tPos && hasSiblingDirectlyBelow(sourceId, edge.target, sPos, tPos, taskPositions);
    });
    if (hasBlockedBottom) continue;

    const downwardCount = outgoing.filter((edge) => {
      const tPos = taskPositions.get(edge.target);
      return tPos && tPos.y - sPos.y > 40;
    }).length;
    if (downwardCount >= 2) {
      fanOutSources.add(sourceId);
    }
  }

  const result: Edge[] = [];

  for (const [targetId, incoming] of edgesByTarget.entries()) {
    const tPos = taskPositions.get(targetId);
    if (!tPos) {
      result.push(...incoming);
      continue;
    }

    const tWidth = tPos.width ?? TASK_NODE_WIDTH;
    const tHeight = tPos.height ?? TASK_NODE_HEIGHT_NORMAL;
    const targetCenter = { x: tPos.x + tWidth / 2, y: tPos.y + tHeight / 2 };

    const isDownwardBus = fanInTargets.has(targetId);

    if (isDownwardBus) {
      for (const edge of incoming) {
        const sPos = taskPositions.get(edge.source) || {
          x: tPos.x,
          y: tPos.y - 100,
          width: TASK_NODE_WIDTH,
          height: TASK_NODE_HEIGHT_NORMAL,
        };
        const sWidth = sPos.width ?? TASK_NODE_WIDTH;
        const sHeight = sPos.height ?? TASK_NODE_HEIGHT_NORMAL;
        const sourceCenter = { x: sPos.x + sWidth / 2, y: sPos.y + sHeight / 2 };
        const dx = targetCenter.x - sourceCenter.x;

        let sourceHandle: string;
        if (fanOutSources.has(edge.source)) {
          sourceHandle = 'source-bottom';
        } else if (hasSiblingDirectlyBelow(edge.source, edge.target, sPos, tPos, taskPositions)) {
          if (isRightSideOccupied(edge.source, sPos, taskPositions)) {
            sourceHandle = 'source-left';
          } else if (dx >= 0) {
            sourceHandle = 'source-right';
          } else {
            sourceHandle = 'source-left';
          }
        } else if (isNodeBetweenHorizontal(edge.source, edge.target, sPos, tPos, taskPositions)) {
          sourceHandle = 'source-top';
        } else if (isNodeBetweenVertical(edge.source, edge.target, sPos, tPos, taskPositions)) {
          const handleSide = isRightSideOccupied(edge.source, sPos, taskPositions)
            ? 'left'
            : 'right';
          sourceHandle = `source-${handleSide}`;
        } else {
          sourceHandle = 'source-bottom';
        }

        const isDual = fanOutSources.has(edge.source);
        result.push({
          ...edge,
          sourceHandle,
          targetHandle: 'target-top',
          type: 'bus',
          data: {
            ...edge.data,
            busMode: isDual ? 'dual' : 'convergence',
          },
        });
      }
      continue;
    }

    // Check for Fan-Out divergence with single incoming edge
    if (incoming.length === 1 && incoming[0]) {
      const edge = incoming[0];
      const sPos = taskPositions.get(edge.source);
      if (fanOutSources.has(edge.source) && sPos && tPos.y - sPos.y > 40) {
        const isBlockedAbove = hasNodeDirectlyAbove(edge.target, tPos, taskPositions);
        let targetHandle = 'target-top';
        if (isBlockedAbove) {
          targetHandle =
            tPos.x <= 200 || isRightSideOccupied(edge.target, tPos, taskPositions)
              ? 'target-left'
              : 'target-right';
        }

        result.push({
          ...edge,
          sourceHandle: 'source-bottom',
          targetHandle,
          type: 'bus',
          data: {
            ...edge.data,
            busMode: 'divergence',
          },
        });
        continue;
      }

      if (sPos) {
        const { sourceHandle, targetHandle } = getSmartEdgeHandles(
          sPos,
          tPos,
          taskPositions,
          edge.source,
          edge.target,
        );
        result.push({ ...edge, sourceHandle, targetHandle, type: 'bezier' });
      } else {
        result.push({ ...edge, type: 'bezier' });
      }
      continue;
    }

    interface EdgeWithGeometry {
      edge: Edge;
      sPos: { x: number; y: number; width?: number; height?: number };
      sourceCenter: { x: number; y: number };
      dx: number;
      dy: number;
    }

    const edgeGeometries: EdgeWithGeometry[] = [];
    for (const edge of incoming) {
      const sPos = taskPositions.get(edge.source) || {
        x: tPos.x,
        y: tPos.y - 100,
        width: TASK_NODE_WIDTH,
        height: TASK_NODE_HEIGHT_NORMAL,
      };
      const sWidth = sPos.width ?? TASK_NODE_WIDTH;
      const sHeight = sPos.height ?? TASK_NODE_HEIGHT_NORMAL;
      const sourceCenter = { x: sPos.x + sWidth / 2, y: sPos.y + sHeight / 2 };
      const dx = targetCenter.x - sourceCenter.x;
      const dy = targetCenter.y - sourceCenter.y;
      edgeGeometries.push({ edge, sPos, sourceCenter, dx, dy });
    }

    edgeGeometries.sort((a, b) => a.sourceCenter.x - b.sourceCenter.x);

    const usedTargetHandles = new Set<string>();

    for (let i = 0; i < edgeGeometries.length; i++) {
      const geom = edgeGeometries[i];
      if (!geom) continue;
      const { edge, dx, dy } = geom;
      let sourceHandle: string;
      let targetHandle: string;

      if (edgeGeometries.length === 2) {
        if (i === 0) {
          targetHandle = dx > tWidth * 0.2 ? 'target-left' : 'target-top';
        } else {
          targetHandle = dx < -tWidth * 0.2 ? 'target-right' : 'target-top';
        }
      } else {
        if (i === 0) {
          targetHandle = 'target-left';
        } else if (i === edgeGeometries.length - 1) {
          targetHandle = 'target-right';
        } else {
          targetHandle = 'target-top';
        }
      }

      if (usedTargetHandles.has(targetHandle)) {
        if (!usedTargetHandles.has('target-top')) targetHandle = 'target-top';
        else if (!usedTargetHandles.has('target-left')) targetHandle = 'target-left';
        else if (!usedTargetHandles.has('target-right')) targetHandle = 'target-right';
        else if (!usedTargetHandles.has('target-bottom')) targetHandle = 'target-bottom';
      }
      usedTargetHandles.add(targetHandle);

      // Obstacle Clearance Checks for multi-incoming edges
      if (isNodeBetweenHorizontal(edge.source, edge.target, geom.sPos, tPos, taskPositions)) {
        sourceHandle = 'source-top';
        targetHandle = 'target-top';
      } else if (isNodeBetweenVertical(edge.source, edge.target, geom.sPos, tPos, taskPositions)) {
        const handleSide = isRightSideOccupied(edge.source, geom.sPos, taskPositions)
          ? 'left'
          : 'right';
        sourceHandle = `source-${handleSide}`;
        targetHandle = `target-${handleSide}`;
      } else if (
        hasSiblingDirectlyBelow(edge.source, edge.target, geom.sPos, tPos, taskPositions)
      ) {
        if (isRightSideOccupied(edge.source, geom.sPos, taskPositions)) {
          sourceHandle = 'source-left';
        } else if (dx >= 0) {
          sourceHandle = 'source-right';
        } else {
          sourceHandle = 'source-left';
        }
      } else if (dy > 0) {
        if (targetHandle === 'target-left') {
          sourceHandle = dx > tWidth ? 'source-right' : 'source-bottom';
        } else if (targetHandle === 'target-right') {
          sourceHandle = dx < -tWidth ? 'source-left' : 'source-bottom';
        } else {
          sourceHandle = 'source-bottom';
        }
      } else {
        sourceHandle = 'source-top';
      }

      result.push({ ...edge, sourceHandle, targetHandle, type: 'bezier' });
    }
  }

  const secondaryEdgeIds = identifySecondaryEdges(result, taskPositions, tasks);

  return result.map((edge) => {
    const isHighlighted =
      Boolean(activeTaskId) && (edge.source === activeTaskId || edge.target === activeTaskId);
    const isAgentOrQueue =
      edge.className?.includes('workflow-edge-agent') ||
      edge.className?.includes('workflow-edge-queue');
    const isSecondary = secondaryEdgeIds.has(edge.id) && !isHighlighted && !isAgentOrQueue;

    const opacity = isSecondary ? 0.7 : 1;
    const strokeWidth = isSecondary ? 1.5 : (edge.style?.strokeWidth ?? 1.75);

    return {
      ...edge,
      style: {
        ...edge.style,
        opacity,
        strokeWidth,
      },
    };
  });
}

/**
 * Computes topological tier ranks for module groups using Tarjan SCC condensation
 * and longest-path DAG layering.
 * Modules within the same SCC (mutual feedback) or with independent roots share Tier 0.
 * Downstream consumer modules receive strictly increasing tier numbers (Tier 1, 2, ...).
 */
export function computeModuleTiers(
  groupLayouts: GroupLayoutData[],
  _tasks: Task[] | undefined,
  lookup: Map<string, string>,
): Map<string, number> {
  const moduleNames = groupLayouts.map((g) => g.name);
  const taskToGroup = new Map<string, string>();
  for (const gl of groupLayouts) {
    for (const t of gl.tasks) {
      taskToGroup.set(t.id, gl.name);
      const shortId = t.id.replace(/^task_/, '');
      taskToGroup.set(shortId, gl.name);
      taskToGroup.set(`TASK-${shortId}`, gl.name);
    }
  }

  // Inter-module adjacency: parentGroup -> childGroup
  const moduleAdj = new Map<string, Set<string>>();
  for (const name of moduleNames) {
    moduleAdj.set(name, new Set<string>());
  }

  for (const gl of groupLayouts) {
    for (const task of gl.tasks) {
      if (task.dependsOn && Array.isArray(task.dependsOn)) {
        for (const dep of task.dependsOn) {
          const sourceId = lookup.get(dep);
          if (sourceId) {
            const sourceGroup = taskToGroup.get(sourceId);
            if (sourceGroup && sourceGroup !== gl.name && moduleAdj.has(sourceGroup)) {
              moduleAdj.get(sourceGroup)!.add(gl.name);
            }
          }
        }
      }
    }
  }

  // Tarjan's Strongly Connected Components (SCC) algorithm
  let index = 0;
  const indices = new Map<string, number>();
  const lowlinks = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: string[][] = [];

  function strongConnect(v: string) {
    indices.set(v, index);
    lowlinks.set(v, index);
    index++;
    stack.push(v);
    onStack.add(v);

    const neighbors = moduleAdj.get(v) || new Set<string>();
    for (const w of neighbors) {
      if (!indices.has(w)) {
        strongConnect(w);
        lowlinks.set(v, Math.min(lowlinks.get(v)!, lowlinks.get(w)!));
      } else if (onStack.has(w)) {
        lowlinks.set(v, Math.min(lowlinks.get(v)!, indices.get(w)!));
      }
    }

    if (lowlinks.get(v) === indices.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const name of moduleNames) {
    if (!indices.has(name)) {
      strongConnect(name);
    }
  }

  // Map each module to its SCC index
  const modToScc = new Map<string, number>();
  sccs.forEach((scc, idx) => {
    scc.forEach((m) => modToScc.set(m, idx));
  });

  // Build Condensation DAG
  const sccAdj = new Map<number, Set<number>>();
  const sccInDegree = new Map<number, number>();
  for (let i = 0; i < sccs.length; i++) {
    sccAdj.set(i, new Set<number>());
    sccInDegree.set(i, 0);
  }

  for (const [uMod, vMods] of moduleAdj.entries()) {
    const uScc = modToScc.get(uMod)!;
    for (const vMod of vMods) {
      const vScc = modToScc.get(vMod)!;
      if (uScc !== vScc && !sccAdj.get(uScc)!.has(vScc)) {
        sccAdj.get(uScc)!.add(vScc);
      }
    }
  }

  for (const [, vSccs] of sccAdj.entries()) {
    for (const v of vSccs) {
      sccInDegree.set(v, (sccInDegree.get(v) || 0) + 1);
    }
  }

  // Longest path in Condensation DAG
  const queue: number[] = [];
  for (let i = 0; i < sccs.length; i++) {
    if ((sccInDegree.get(i) || 0) === 0) {
      queue.push(i);
    }
  }

  const sccDepth = new Map<number, number>();
  for (let i = 0; i < sccs.length; i++) {
    sccDepth.set(i, 0);
  }

  const inDegreeCopy = new Map(sccInDegree);
  const topoOrder: number[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    topoOrder.push(u);
    const neighbors = sccAdj.get(u) || new Set<number>();
    for (const v of neighbors) {
      const deg = (inDegreeCopy.get(v) || 1) - 1;
      inDegreeCopy.set(v, deg);
      if (deg === 0) {
        queue.push(v);
      }
    }
  }

  for (const u of topoOrder) {
    const uD = sccDepth.get(u) || 0;
    const neighbors = sccAdj.get(u) || new Set<number>();
    for (const v of neighbors) {
      const vD = sccDepth.get(v) || 0;
      if (uD + 1 > vD) {
        sccDepth.set(v, uD + 1);
      }
    }
  }

  const result = new Map<string, number>();
  for (const name of moduleNames) {
    const sccIdx = modToScc.get(name) ?? 0;
    result.set(name, sccDepth.get(sccIdx) ?? 0);
  }

  return result;
}

/**
 * Sorts module groups topologically based on inter-module task dependencies.
 */
export function sortModulesTopologically(
  groupLayouts: GroupLayoutData[],
  tasks: Task[],
  lookup: Map<string, string>,
): GroupLayoutData[] {
  const taskById = new Map<string, Task>();
  for (const t of tasks) {
    taskById.set(t.id, t);
    const shortId = t.id.replace(/^task_/, '');
    taskById.set(shortId, t);
    taskById.set(`TASK-${shortId}`, t);
  }

  const groupByName = new Map<string, GroupLayoutData>();
  for (const gl of groupLayouts) {
    groupByName.set(gl.name, gl);
  }

  const moduleInDegree = new Map<string, number>();
  const moduleAdj = new Map<string, string[]>();

  for (const gl of groupLayouts) {
    moduleInDegree.set(gl.name, 0);
    moduleAdj.set(gl.name, []);
  }

  const moduleDeps = new Map<string, Set<string>>();
  for (const gl of groupLayouts) {
    moduleDeps.set(gl.name, new Set<string>());
  }

  for (const gl of groupLayouts) {
    for (const task of gl.tasks) {
      if (task.dependsOn && Array.isArray(task.dependsOn)) {
        for (const dep of task.dependsOn) {
          const sourceId = lookup.get(dep);
          if (sourceId) {
            const sourceTask = taskById.get(sourceId);
            const sourceGroup = sourceTask?.moduleGroup?.trim() || 'Ungrouped';
            if (sourceGroup !== gl.name && groupByName.has(sourceGroup)) {
              moduleDeps.get(gl.name)!.add(sourceGroup);
            }
          }
        }
      }
    }
  }

  for (const [targetGroup, parentSet] of moduleDeps.entries()) {
    moduleInDegree.set(targetGroup, parentSet.size);
    for (const parentGroup of parentSet) {
      moduleAdj.get(parentGroup)!.push(targetGroup);
    }
  }

  const queue: string[] = [];
  for (const gl of groupLayouts) {
    if ((moduleInDegree.get(gl.name) || 0) === 0) {
      queue.push(gl.name);
    }
  }

  const orderedNames: string[] = [];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    orderedNames.push(curr);
    const dependents = moduleAdj.get(curr) || [];
    for (const dep of dependents) {
      const newDeg = (moduleInDegree.get(dep) || 1) - 1;
      moduleInDegree.set(dep, newDeg);
      if (newDeg === 0) {
        queue.push(dep);
      }
    }
  }

  if (orderedNames.length < groupLayouts.length) {
    const visited = new Set(orderedNames);
    for (const gl of groupLayouts) {
      if (!visited.has(gl.name)) {
        orderedNames.push(gl.name);
      }
    }
  }

  return orderedNames.map((name) => groupByName.get(name)!);
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
 * Layout tasks inside a module with Topological Depth Ranks.
 * Tasks at depth 0 on Row 0, depth 1 on Row 1, etc.
 * Parallel tasks on the same depth level wrap horizontally up to maxTasksPerRow.
 */
export function layoutTasksInModule(
  tasks: Task[],
  maxTasksPerRow = MAX_TASKS_PER_ROW,
  lookup?: Map<string, string>,
  nodeWidth = TASK_NODE_WIDTH,
  nodeHeight = TASK_NODE_HEIGHT_NORMAL,
  horizontalGap = TASK_HORIZONTAL_GAP,
  verticalGap = TASK_VERTICAL_GAP,
): Map<string, { x: number; y: number; col: number; row: number }> {
  const positions = new Map<string, { x: number; y: number; col: number; row: number }>();
  if (tasks.length === 0) return positions;

  const resolvedLookup = lookup || buildTaskIdLookup(tasks);
  const taskIdsInGroup = new Set(tasks.map((t) => t.id));
  const intraAdj = new Map<string, string[]>();
  const intraInDegree = new Map<string, number>();

  for (const task of tasks) {
    intraInDegree.set(task.id, 0);
    intraAdj.set(task.id, []);
  }

  let hasIntraDeps = false;
  for (const task of tasks) {
    if (task.dependsOn && Array.isArray(task.dependsOn)) {
      for (const dep of task.dependsOn) {
        const sourceId = resolvedLookup.get(dep);
        if (sourceId && taskIdsInGroup.has(sourceId) && sourceId !== task.id) {
          intraAdj.get(sourceId)!.push(task.id);
          intraInDegree.set(task.id, (intraInDegree.get(task.id) || 0) + 1);
          hasIntraDeps = true;
        }
      }
    }
  }

  // If no intra-module dependencies exist, wrap every maxTasksPerRow
  if (!hasIntraDeps) {
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

  // Compute longest-path topological depth inside module
  const depths = new Map<string, number>();
  for (const task of tasks) {
    depths.set(task.id, 0);
  }

  const queue: string[] = [];
  const inDegreeCopy = new Map(intraInDegree);
  for (const task of tasks) {
    if ((inDegreeCopy.get(task.id) || 0) === 0) {
      queue.push(task.id);
    }
  }

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const currId = queue.shift()!;
    topoOrder.push(currId);
    const neighbors = intraAdj.get(currId) || [];
    for (const nextId of neighbors) {
      const newDeg = (inDegreeCopy.get(nextId) || 1) - 1;
      inDegreeCopy.set(nextId, newDeg);
      if (newDeg === 0) {
        queue.push(nextId);
      }
    }
  }

  if (topoOrder.length < tasks.length) {
    const visited = new Set(topoOrder);
    for (const task of tasks) {
      if (!visited.has(task.id)) {
        topoOrder.push(task.id);
      }
    }
  }

  for (const u of topoOrder) {
    const currentDepth = depths.get(u) || 0;
    const neighbors = intraAdj.get(u) || [];
    for (const v of neighbors) {
      const existingDepth = depths.get(v) || 0;
      if (currentDepth + 1 > existingDepth) {
        depths.set(v, currentDepth + 1);
      }
    }
  }

  // Group tasks by depth level
  const depthGroups = new Map<number, Task[]>();
  for (const task of tasks) {
    const d = depths.get(task.id) || 0;
    if (!depthGroups.has(d)) depthGroups.set(d, []);
    depthGroups.get(d)!.push(task);
  }

  const sortedDepths = Array.from(depthGroups.keys()).sort((a, b) => a - b);
  let currentRow = 0;

  for (const d of sortedDepths) {
    const levelTasks = depthGroups.get(d)!;
    levelTasks.forEach((task, idx) => {
      const col = idx % maxTasksPerRow;
      const row = currentRow + Math.floor(idx / maxTasksPerRow);
      positions.set(task.id, {
        x: col * (nodeWidth + horizontalGap),
        y: row * (nodeHeight + verticalGap),
        col,
        row,
      });
    });
    currentRow += Math.ceil(levelTasks.length / maxTasksPerRow);
  }

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

/**
 * Calculates SVG path for an orthogonal bus connector edge.
 * Renders an obstacle-cleared route from source to a horizontal rail
 * at (targetY - railYOffset) and drops vertically into target-top.
 */
export function getBusPath({
  sourceX,
  sourceY,
  sourceHandle,
  targetX,
  targetY,
  targetHandle,
  busMode = 'convergence',
  railYOffset,
  borderRadius = 8,
}: {
  sourceX: number;
  sourceY: number;
  sourceHandle?: string | null;
  targetX: number;
  targetY: number;
  targetHandle?: string | null;
  busMode?: 'convergence' | 'divergence' | 'dual';
  railYOffset?: number;
  borderRadius?: number;
}): string {
  if (busMode === 'divergence') {
    const offset = railYOffset ?? 35;
    const railY = sourceY + offset;
    const isTargetLeft = targetHandle ? targetHandle.includes('left') : false;
    const isTargetRight = targetHandle ? targetHandle.includes('right') : false;

    let d = `M ${sourceX} ${sourceY} `;

    if (isTargetLeft) {
      const gutterX = targetX - 24;
      const dir = gutterX > sourceX ? 1 : -1;
      const r = Math.min(
        borderRadius,
        Math.max(0, Math.abs(gutterX - sourceX) / 2),
        Math.max(0, Math.abs(railY - sourceY) / 2),
        Math.max(0, Math.abs(targetY - railY) / 2),
      );

      d += `L ${sourceX} ${railY - r} `;
      d += `Q ${sourceX} ${railY} ${sourceX + dir * r} ${railY} `;
      d += `L ${gutterX - dir * r} ${railY} `;
      d += `Q ${gutterX} ${railY} ${gutterX} ${railY + r} `;
      d += `L ${gutterX} ${targetY - r} `;
      d += `Q ${gutterX} ${targetY} ${gutterX + r} ${targetY} `;
      d += `L ${targetX} ${targetY}`;
    } else if (isTargetRight) {
      const gutterX = targetX + 24;
      const dir = gutterX > sourceX ? 1 : -1;
      const r = Math.min(
        borderRadius,
        Math.max(0, Math.abs(gutterX - sourceX) / 2),
        Math.max(0, Math.abs(railY - sourceY) / 2),
        Math.max(0, Math.abs(targetY - railY) / 2),
      );

      d += `L ${sourceX} ${railY - r} `;
      d += `Q ${sourceX} ${railY} ${sourceX + dir * r} ${railY} `;
      d += `L ${gutterX - dir * r} ${railY} `;
      d += `Q ${gutterX} ${railY} ${gutterX} ${railY + r} `;
      d += `L ${gutterX} ${targetY - r} `;
      d += `Q ${gutterX} ${targetY} ${gutterX - r} ${targetY} `;
      d += `L ${targetX} ${targetY}`;
    } else {
      // target-top
      if (Math.abs(sourceX - targetX) < 4) {
        d += `L ${targetX} ${targetY}`;
      } else {
        const dir = targetX > sourceX ? 1 : -1;
        const r = Math.min(
          borderRadius,
          Math.max(0, Math.abs(targetX - sourceX) / 2),
          Math.max(0, Math.abs(railY - sourceY) / 2),
          Math.max(0, Math.abs(targetY - railY) / 2),
        );

        d += `L ${sourceX} ${railY - r} `;
        d += `Q ${sourceX} ${railY} ${sourceX + dir * r} ${railY} `;
        d += `L ${targetX - dir * r} ${railY} `;
        d += `Q ${targetX} ${railY} ${targetX} ${railY + r} `;
        d += `L ${targetX} ${targetY}`;
      }
    }

    return d;
  }

  const offset = railYOffset ?? 28;
  const railY = targetY - offset;
  const isHandleLeft = sourceHandle ? sourceHandle.includes('left') : false;
  const isHandleRight = sourceHandle ? sourceHandle.includes('right') : false;

  let d = `M ${sourceX} ${sourceY} `;

  if (isHandleLeft) {
    const gutterX = sourceX - 20;
    const cornerR = Math.min(borderRadius, Math.max(0, Math.abs(targetX - gutterX) / 2));
    d += `L ${gutterX + cornerR} ${sourceY} `;
    d += `Q ${gutterX} ${sourceY} ${gutterX} ${sourceY + cornerR} `;
    d += `L ${gutterX} ${railY - cornerR} `;
    d += `Q ${gutterX} ${railY} ${gutterX + cornerR} ${railY} `;
    d += `L ${targetX - cornerR} ${railY} `;
    d += `Q ${targetX} ${railY} ${targetX} ${railY + cornerR} `;
    d += `L ${targetX} ${targetY}`;
  } else if (isHandleRight) {
    const gutterX = sourceX + 20;
    const cornerR = Math.min(borderRadius, Math.max(0, Math.abs(targetX - gutterX) / 2));
    d += `L ${gutterX - cornerR} ${sourceY} `;
    d += `Q ${gutterX} ${sourceY} ${gutterX} ${sourceY + cornerR} `;
    d += `L ${gutterX} ${railY - cornerR} `;
    d += `Q ${gutterX} ${railY} ${gutterX - cornerR} ${railY} `;
    d += `L ${targetX + cornerR} ${railY} `;
    d += `Q ${targetX} ${railY} ${targetX} ${railY + cornerR} `;
    d += `L ${targetX} ${targetY}`;
  } else {
    // source-bottom
    const r = Math.min(
      borderRadius,
      Math.max(0, Math.abs(targetX - sourceX) / 2),
      Math.max(0, Math.abs(railY - sourceY) / 2),
    );
    if (Math.abs(sourceX - targetX) < 4) {
      d += `L ${targetX} ${targetY}`;
    } else {
      const dir = targetX > sourceX ? 1 : -1;
      d += `L ${sourceX} ${railY - r} `;
      d += `Q ${sourceX} ${railY} ${sourceX + dir * r} ${railY} `;
      d += `L ${targetX - dir * r} ${railY} `;
      d += `Q ${targetX} ${railY} ${targetX} ${railY + r} `;
      d += `L ${targetX} ${targetY}`;
    }
  }

  return d;
}
