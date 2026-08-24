import { type Edge, MarkerType, type Node } from '@xyflow/react';
import dagre from 'dagre';
import type { Task } from '../../types';
import type { ModuleGroupNodeData } from './ModuleGroupNode';
import type { TaskNodeData } from './TaskNode';

export const TASK_NODE_WIDTH = 220;
export const TASK_NODE_HEIGHT_NORMAL = 90;
export const TASK_NODE_HEIGHT_COLLAPSED = 45;

export interface WorkflowGraphOptions {
  activeTaskId?: string | null;
  nextTaskIds?: string[];
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
  const { activeTaskId, nextTaskIds = [], onSelectTask } = options;
  const lookup = buildTaskIdLookup(tasks);

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

  let currentGroupOffsetX = 40;
  const GROUP_MARGIN_X = 80;
  const PADDING_X = 28;
  const PADDING_TOP = 56;
  const PADDING_BOTTOM = 28;

  // Process each module group
  for (const [groupName, groupTasks] of groups.entries()) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({
      rankdir: 'TB',
      nodesep: 40,
      ranksep: 55,
      marginx: 0,
      marginy: 0,
    });

    const taskIdsInGroup = new Set(groupTasks.map((t) => t.id));

    // Add nodes to dagre
    for (const task of groupTasks) {
      const isDone = task.completed || task.status === 'Done';
      const height = isDone ? TASK_NODE_HEIGHT_COLLAPSED : TASK_NODE_HEIGHT_NORMAL;
      g.setNode(task.id, { width: TASK_NODE_WIDTH, height });
    }

    // Add intra-group edges to dagre for internal positioning
    for (const task of groupTasks) {
      if (task.dependsOn && Array.isArray(task.dependsOn)) {
        for (const dep of task.dependsOn) {
          const resolvedDepId = lookup.get(dep);
          if (resolvedDepId && taskIdsInGroup.has(resolvedDepId)) {
            g.setEdge(resolvedDepId, task.id);
          }
        }
      }
    }

    try {
      dagre.layout(g);
    } catch (err) {
      console.warn(`[WorkflowLayout] Dagre layout warning for group '${groupName}':`, err);
    }

    // Verify all nodes have valid finite numeric coordinates
    let needsGridFallback = false;
    for (const task of groupTasks) {
      const nodePos = g.node(task.id);
      if (
        !nodePos ||
        typeof nodePos.x !== 'number' ||
        !Number.isFinite(nodePos.x) ||
        typeof nodePos.y !== 'number' ||
        !Number.isFinite(nodePos.y)
      ) {
        needsGridFallback = true;
        break;
      }
    }

    if (needsGridFallback) {
      let i = 0;
      for (const task of groupTasks) {
        const isDone = task.completed || task.status === 'Done';
        const height = isDone ? TASK_NODE_HEIGHT_COLLAPSED : TASK_NODE_HEIGHT_NORMAL;
        g.setNode(task.id, {
          width: TASK_NODE_WIDTH,
          height,
          x: (i % 3) * (TASK_NODE_WIDTH + 40) + TASK_NODE_WIDTH / 2,
          y: Math.floor(i / 3) * (TASK_NODE_HEIGHT_NORMAL + 55) + height / 2,
        });
        i++;
      }
    }

    // Compute bounding box safely
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const task of groupTasks) {
      const nodePos = g.node(task.id);
      if (
        !nodePos ||
        typeof nodePos.x !== 'number' ||
        !Number.isFinite(nodePos.x) ||
        typeof nodePos.y !== 'number' ||
        !Number.isFinite(nodePos.y)
      ) {
        continue;
      }

      const isDone = task.completed || task.status === 'Done';
      const nodeHeight = isDone ? TASK_NODE_HEIGHT_COLLAPSED : TASK_NODE_HEIGHT_NORMAL;

      const left = nodePos.x - TASK_NODE_WIDTH / 2;
      const right = nodePos.x + TASK_NODE_WIDTH / 2;
      const top = nodePos.y - nodeHeight / 2;
      const bottom = nodePos.y + nodeHeight / 2;

      if (
        Number.isFinite(left) &&
        Number.isFinite(right) &&
        Number.isFinite(top) &&
        Number.isFinite(bottom)
      ) {
        minX = Math.min(minX, left);
        maxX = Math.max(maxX, right);
        minY = Math.min(minY, top);
        maxY = Math.max(maxY, bottom);
      }
    }

    // If no nodes or invalid bounding box, fallback
    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      minX = 0;
      maxX = TASK_NODE_WIDTH;
    }
    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
      minY = 0;
      maxY = TASK_NODE_HEIGHT_NORMAL;
    }

    const groupWidth = Math.max(maxX - minX + PADDING_X * 2, 280);
    const groupHeight = Math.max(maxY - minY + PADDING_TOP + PADDING_BOTTOM, 140);
    const groupX = currentGroupOffsetX;
    const groupY = 40;

    // Create ModuleGroupNode container
    const completedTasksCount = groupTasks.filter((t) => t.completed || t.status === 'Done').length;

    const groupNode: Node = {
      id: `group-${groupName}`,
      type: 'moduleGroup',
      position: { x: groupX, y: groupY },
      style: {
        width: groupWidth,
        height: groupHeight,
        zIndex: -1,
      },
      data: {
        title: groupName,
        totalTasks: groupTasks.length,
        completedTasks: completedTasksCount,
      } as ModuleGroupNodeData,
      selectable: false,
      draggable: false,
    };
    nodes.push(groupNode);

    // Create Task nodes positioned inside this group
    for (const task of groupTasks) {
      const nodePos = g.node(task.id);
      const isDone = task.completed || task.status === 'Done';
      const nodeHeight = isDone ? TASK_NODE_HEIGHT_COLLAPSED : TASK_NODE_HEIGHT_NORMAL;

      const posX =
        typeof nodePos?.x === 'number' && Number.isFinite(nodePos.x)
          ? nodePos.x
          : TASK_NODE_WIDTH / 2;
      const posY =
        typeof nodePos?.y === 'number' && Number.isFinite(nodePos.y) ? nodePos.y : nodeHeight / 2;

      let relativeX = posX - TASK_NODE_WIDTH / 2 - minX + PADDING_X;
      let relativeY = posY - nodeHeight / 2 - minY + PADDING_TOP;

      if (!Number.isFinite(relativeX)) relativeX = PADDING_X;
      if (!Number.isFinite(relativeY)) relativeY = PADDING_TOP;

      const isResolvedActive = activeTaskId
        ? lookup.get(activeTaskId) === task.id || activeTaskId === task.id
        : false;
      const isResolvedNext = nextTaskIds.some((id) => lookup.get(id) === task.id || id === task.id);

      const taskNode: Node = {
        id: task.id,
        type: 'taskNode',
        position: {
          x: groupX + relativeX,
          y: groupY + relativeY,
        },
        data: {
          task,
          isAgentActive: isResolvedActive,
          isAgentNext: isResolvedNext,
          onSelectTask,
        } as TaskNodeData,
        draggable: false,
      };
      nodes.push(taskNode);
    }

    currentGroupOffsetX += Math.max(groupWidth, 280) + GROUP_MARGIN_X;
  }

  // Generate All Dependency Edges (Intra & Inter-Group)
  const activeResolvedId = activeTaskId ? lookup.get(activeTaskId) || activeTaskId : null;
  const nextResolvedSet = new Set(nextTaskIds.map((id) => lookup.get(id) || id).filter(Boolean));

  const renderedTaskNodeIds = new Set(nodes.filter((n) => n.type === 'taskNode').map((n) => n.id));

  for (const task of tasks) {
    if (task.archived || !task.dependsOn || !Array.isArray(task.dependsOn)) continue;

    for (const dep of task.dependsOn) {
      const sourceId = lookup.get(dep);
      if (!sourceId || sourceId === task.id) continue;
      if (!renderedTaskNodeIds.has(sourceId) || !renderedTaskNodeIds.has(task.id)) continue;

      const isTargetActive = activeResolvedId === task.id;
      const isSourceActive = activeResolvedId === sourceId;
      const isTargetNext = nextResolvedSet.has(task.id);

      const isAgentTrajectoryEdge =
        (isSourceActive && isTargetNext) || (isSourceActive && isTargetActive) || isTargetActive;

      const edge: Edge = {
        id: `e-${sourceId}-${task.id}`,
        source: sourceId,
        target: task.id,
        type: 'smoothstep',
        animated: isAgentTrajectoryEdge,
        style: {
          stroke: isAgentTrajectoryEdge ? '#a855f7' : 'var(--color-border, #475569)',
          strokeWidth: isAgentTrajectoryEdge ? 2.5 : 1.5,
          opacity: 0.85,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isAgentTrajectoryEdge ? '#a855f7' : 'var(--color-border, #475569)',
          width: 14,
          height: 14,
        },
      };

      edges.push(edge);
    }
  }

  return { nodes, edges };
}
