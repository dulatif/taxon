import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import type { TaskNodeData } from '../components/Workflow/TaskNode';
import {
  buildTaskIdLookup,
  calculateModuleBounds,
  getDynamicModuleBounds,
  getWorkflowElements,
  layoutTasksInModule,
  MAX_TASKS_PER_ROW,
  removeRedundantEdges,
  sortTasksTopologically,
} from '../components/Workflow/workflowLayout';
import type { Task } from '../types';

describe('workflowLayout Engine', () => {
  const sampleTasks: Task[] = [
    {
      id: 'task_000001',
      projectId: 'proj-1',
      title: 'Setup Database',
      status: 'Done',
      priority: 'High',
      completed: true,
      duration: '1h',
      labels: [],
      moduleGroup: 'Backend',
      dependsOn: [],
    } as unknown as Task,
    {
      id: 'task_000002',
      projectId: 'proj-1',
      title: 'Create Auth API',
      status: 'In Progress',
      priority: 'Critical',
      completed: false,
      duration: '2h',
      labels: [],
      moduleGroup: 'Backend',
      dependsOn: ['TASK-000001'],
    } as unknown as Task,
    {
      id: 'task_000003',
      projectId: 'proj-1',
      title: 'Build Login UI',
      status: 'To Do',
      priority: 'Medium',
      completed: false,
      duration: '3h',
      labels: [],
      moduleGroup: 'Frontend',
      dependsOn: ['TASK-000002'],
    } as unknown as Task,
  ];

  it('buildTaskIdLookup should resolve various ID patterns', () => {
    const lookup = buildTaskIdLookup(sampleTasks);
    expect(lookup.get('task_000001')).toBe('task_000001');
    expect(lookup.get('000001')).toBe('task_000001');
    expect(lookup.get('TASK-000001')).toBe('task_000001');
  });

  it('should generate nodes and edges with group containers', () => {
    const { nodes, edges } = getWorkflowElements(sampleTasks);

    // Should create 2 group nodes (Backend, Frontend) and 3 task nodes
    const groupNodes = nodes.filter((n) => n.type === 'moduleGroup');
    const taskNodes = nodes.filter((n) => n.type === 'taskNode');

    expect(groupNodes.length).toBe(2);
    expect(taskNodes.length).toBe(3);

    // Edges: task 1 -> task 2 (intra-group Backend) and task 2 -> task 3 (inter-group Backend -> Frontend)
    expect(edges.length).toBe(2);
    expect(edges.every((e) => e.type === 'bezier')).toBe(true);
    expect(
      edges.find((e) => e.source === 'task_000001' && e.target === 'task_000002'),
    ).toBeDefined();
    expect(
      edges.find((e) => e.source === 'task_000002' && e.target === 'task_000003'),
    ).toBeDefined();
  });

  it('should apply active agent heartbeat highlights', () => {
    const { nodes, edges } = getWorkflowElements(sampleTasks, {
      activeTaskId: 'TASK-000002',
      nextTaskIds: ['TASK-000003'],
    });

    const activeNode = nodes.find((n) => n.id === 'task_000002');
    const nextNode = nodes.find((n) => n.id === 'task_000003');

    expect(activeNode?.data.isAgentActive).toBe(true);
    expect(nextNode?.data.isAgentNext).toBe(true);

    const activeEdge = edges.find((e) => e.target === 'task_000002');
    expect(activeEdge?.animated).toBe(true);
  });

  it('animates connector line from current task (In Progress) to next queue task', () => {
    const { edges } = getWorkflowElements(sampleTasks);

    // task_000002 is In Progress, task_000003 is To Do (dependent on task_000002)
    const queueEdge = edges.find((e) => e.source === 'task_000002' && e.target === 'task_000003');
    expect(queueEdge).toBeDefined();
    expect(queueEdge?.animated).toBe(true);
    expect(queueEdge?.className).toBe('workflow-edge-queue');
  });

  it('preserves all nodes and generates valid edges when tasks transition to Need to Test or Done', () => {
    const updatedTasks: Task[] = [
      {
        id: 'wf0001',
        projectId: 'proj-1',
        title: 'Setup Database',
        status: 'Done',
        priority: 'High',
        completed: true,
        moduleGroup: 'Backend',
        dependsOn: [],
      } as unknown as Task,
      {
        id: 'wf0002',
        projectId: 'proj-1',
        title: 'Seed Data',
        status: 'Done',
        priority: 'High',
        completed: true,
        moduleGroup: 'Backend',
        dependsOn: ['TASK-wf0001'],
      } as unknown as Task,
      {
        id: 'wf0003',
        projectId: 'proj-1',
        title: 'Implement JWT Endpoints',
        status: 'Need to Test',
        priority: 'High',
        completed: false,
        moduleGroup: 'Backend API',
        dependsOn: ['TASK-wf0002'],
      } as unknown as Task,
      {
        id: 'wf0004',
        projectId: 'proj-1',
        title: 'Build DAG Engine',
        status: 'In Progress',
        priority: 'Critical',
        completed: false,
        moduleGroup: 'Backend API',
        dependsOn: ['TASK-wf0003'],
      } as unknown as Task,
    ];

    const { nodes, edges } = getWorkflowElements(updatedTasks, {
      activeTaskId: 'TASK-wf0004',
      nextTaskIds: [],
    });

    const taskNodes = nodes.filter((n) => n.type === 'taskNode');
    expect(taskNodes.length).toBe(4);

    const wf3Node = taskNodes.find((n) => n.id === 'wf0003');
    expect(wf3Node).toBeDefined();
    expect((wf3Node!.data as unknown as TaskNodeData).task.status).toBe('Need to Test');

    const wf1Node = taskNodes.find((n) => n.id === 'wf0001');
    expect(wf1Node).toBeDefined();
    expect((wf1Node!.data as unknown as TaskNodeData).task.status).toBe('Done');

    // All edges should have valid source and target within taskNodes
    const taskNodeIds = new Set(taskNodes.map((n) => n.id));
    for (const edge of edges) {
      expect(taskNodeIds.has(edge.source)).toBe(true);
      expect(taskNodeIds.has(edge.target)).toBe(true);
    }
  });

  it('positions cross-module dependent tasks along horizontal LR axis', () => {
    const { nodes } = getWorkflowElements(sampleTasks);
    const task1 = nodes.find((n) => n.id === 'task_000001');
    const task2 = nodes.find((n) => n.id === 'task_000002');
    const task3 = nodes.find((n) => n.id === 'task_000003');

    expect(task1).toBeDefined();
    expect(task2).toBeDefined();
    expect(task3).toBeDefined();

    // Sequential horizontal LR progression: task1.x < task2.x < task3.x
    expect(task1!.position.x).toBeLessThan(task2!.position.x);
    expect(task2!.position.x).toBeLessThan(task3!.position.x);

    // Group containers position horizontally
    const backendGroup = nodes.find((n) => n.id === 'group-Backend');
    const frontendGroup = nodes.find((n) => n.id === 'group-Frontend');
    expect(backendGroup!.position.x).toBeLessThan(frontendGroup!.position.x);
  });

  it('wraps parent modules into a vertical hybrid 2-column grid when module count > 2', () => {
    const multiModuleTasks: Task[] = [
      { id: 'm1_t1', moduleGroup: 'Module A', dependsOn: [] } as unknown as Task,
      { id: 'm2_t1', moduleGroup: 'Module B', dependsOn: [] } as unknown as Task,
      { id: 'm3_t1', moduleGroup: 'Module C', dependsOn: [] } as unknown as Task,
      { id: 'm4_t1', moduleGroup: 'Module D', dependsOn: [] } as unknown as Task,
    ];

    const { nodes } = getWorkflowElements(multiModuleTasks);
    const groupA = nodes.find((n) => n.id === 'group-Module A');
    const groupB = nodes.find((n) => n.id === 'group-Module B');
    const groupC = nodes.find((n) => n.id === 'group-Module C');
    const groupD = nodes.find((n) => n.id === 'group-Module D');

    expect(groupA).toBeDefined();
    expect(groupB).toBeDefined();
    expect(groupC).toBeDefined();
    expect(groupD).toBeDefined();

    // Row 0: Group A and Group B
    expect(groupA!.position.y).toBe(groupB!.position.y);
    expect(groupA!.position.x).toBeLessThan(groupB!.position.x);

    // Row 1: Group C and Group D
    expect(groupC!.position.y).toBe(groupD!.position.y);
    expect(groupC!.position.x).toBeLessThan(groupD!.position.x);

    // Vertical progression: Row 1 is below Row 0
    expect(groupA!.position.y).toBeLessThan(groupC!.position.y);
  });

  describe('removeRedundantEdges (Transitive Reduction)', () => {
    it('removes direct redundant edge when a 2-hop alternative path exists', () => {
      const rawEdges: Edge[] = [
        { id: 'e-ab', source: 'A', target: 'B' },
        { id: 'e-bc', source: 'B', target: 'C' },
        { id: 'e-ac', source: 'A', target: 'C' }, // Redundant because A -> B -> C exists
      ];

      const reduced = removeRedundantEdges(rawEdges);
      expect(reduced.map((e) => e.id)).toEqual(['e-ab', 'e-bc']);
    });

    it('removes multi-hop redundant edges across long chains', () => {
      const rawEdges: Edge[] = [
        { id: 'e-ab', source: 'A', target: 'B' },
        { id: 'e-bc', source: 'B', target: 'C' },
        { id: 'e-cd', source: 'C', target: 'D' },
        { id: 'e-ad', source: 'A', target: 'D' }, // Redundant via A -> B -> C -> D
        { id: 'e-ac', source: 'A', target: 'C' }, // Redundant via A -> B -> C
        { id: 'e-bd', source: 'B', target: 'D' }, // Redundant via B -> C -> D
      ];

      const reduced = removeRedundantEdges(rawEdges);
      expect(reduced.map((e) => e.id)).toEqual(['e-ab', 'e-bc', 'e-cd']);
    });

    it('preserves diamond dependencies where both paths are necessary', () => {
      const rawEdges: Edge[] = [
        { id: 'e-ab', source: 'A', target: 'B' },
        { id: 'e-ac', source: 'A', target: 'C' },
        { id: 'e-bd', source: 'B', target: 'D' },
        { id: 'e-cd', source: 'C', target: 'D' },
      ];

      const reduced = removeRedundantEdges(rawEdges);
      expect(reduced.map((e) => e.id)).toEqual(['e-ab', 'e-ac', 'e-bd', 'e-cd']);
    });

    it('prunes transitive dependencies in getWorkflowElements', () => {
      // Task C is blocked by Task B and Task A. Task B is blocked by Task A.
      // Expected: A -> B and B -> C, but NOT direct A -> C.
      const tasksWithRedundantDeps: Task[] = [
        {
          id: 'task_A',
          projectId: 'proj-1',
          title: 'Task A',
          status: 'Done',
          priority: 'High',
          completed: true,
          moduleGroup: 'Core',
          dependsOn: [],
        } as unknown as Task,
        {
          id: 'task_B',
          projectId: 'proj-1',
          title: 'Task B',
          status: 'In Progress',
          priority: 'High',
          completed: false,
          moduleGroup: 'Core',
          dependsOn: ['TASK-task_A'],
        } as unknown as Task,
        {
          id: 'task_C',
          projectId: 'proj-1',
          title: 'Task C',
          status: 'To Do',
          priority: 'Medium',
          completed: false,
          moduleGroup: 'Core',
          dependsOn: ['TASK-task_B', 'TASK-task_A'],
        } as unknown as Task,
      ];

      const { edges } = getWorkflowElements(tasksWithRedundantDeps);

      expect(edges.length).toBe(2);
      expect(edges.find((e) => e.source === 'task_A' && e.target === 'task_B')).toBeDefined();
      expect(edges.find((e) => e.source === 'task_B' && e.target === 'task_C')).toBeDefined();
      expect(edges.find((e) => e.source === 'task_A' && e.target === 'task_C')).toBeUndefined();
    });
  });

  describe('getDynamicModuleBounds (Dynamic Parent Bounding Box)', () => {
    it('returns default fallback dimensions when childTasks array is empty', () => {
      const bounds = getDynamicModuleBounds([]);
      expect(bounds.style.width).toBe(300);
      expect(bounds.style.height).toBe(120);
      expect(bounds.width).toBe(300);
      expect(bounds.height).toBe(120);
      expect(bounds.position).toEqual({ x: 0, y: 0 });

      // Backward-compatible alias
      const legacyBounds = calculateModuleBounds([]);
      expect(legacyBounds.width).toBe(300);
      expect(legacyBounds.height).toBe(120);
    });

    it('calculates position and style covering a single task with padding and header offset', () => {
      const singleChild: Node[] = [
        {
          id: 'task-1',
          position: { x: 80, y: 120 },
          data: {},
        },
      ];

      const bounds = getDynamicModuleBounds(singleChild, 30, 260, 100);
      // minX = maxX = 80, minY = maxY = 120
      // x = 80 - 30 = 50
      // y = 120 - 30 - 40 = 50
      // width = 80 - 80 + 260 + 30 * 2 = 320
      // height = 120 - 120 + 100 + 30 * 2 + 40 = 200
      expect(bounds.position).toEqual({ x: 50, y: 50 });
      expect(bounds.style).toEqual({ width: 320, height: 200 });
    });

    it('calculates flexible bounding box covering multiple child nodes', () => {
      const childNodes: Node[] = [
        { id: 't1', position: { x: 80, y: 120 }, data: {} },
        { id: 't2', position: { x: 360, y: 120 }, data: {} },
        { id: 't3', position: { x: 80, y: 260 }, data: {} },
        { id: 't4', position: { x: 360, y: 260 }, data: {} },
      ];

      const bounds = getDynamicModuleBounds(childNodes, 30, 220, 90);
      // minX = 80, maxX = 360 => width = (360 - 80) + 220 + 60 = 560
      // minY = 120, maxY = 260 => height = (260 - 120) + 90 + 60 + 40 = 330
      // x = 80 - 30 = 50
      // y = 120 - 30 - 40 = 50
      expect(bounds.position).toEqual({ x: 50, y: 50 });
      expect(bounds.style).toEqual({ width: 560, height: 330 });
      expect(bounds.width).toBe(560);
      expect(bounds.height).toBe(330);
    });
  });

  describe('Multi-row / Wrap Layout Inside Module', () => {
    it('wraps tasks into rows with maximum 2 tasks per row', () => {
      const tasks: Task[] = [
        { id: 't1', title: 'Task 1' } as unknown as Task,
        { id: 't2', title: 'Task 2' } as unknown as Task,
        { id: 't3', title: 'Task 3' } as unknown as Task,
        { id: 't4', title: 'Task 4' } as unknown as Task,
        { id: 't5', title: 'Task 5' } as unknown as Task,
      ];

      const positions = layoutTasksInModule(tasks, MAX_TASKS_PER_ROW);

      expect(positions.get('t1')).toEqual({ x: 0, y: 0, col: 0, row: 0 });
      expect(positions.get('t2')).toEqual({ x: 280, y: 0, col: 1, row: 0 });
      expect(positions.get('t3')).toEqual({ x: 0, y: 140, col: 0, row: 1 });
      expect(positions.get('t4')).toEqual({ x: 280, y: 140, col: 1, row: 1 });
      expect(positions.get('t5')).toEqual({ x: 0, y: 280, col: 0, row: 2 });
    });

    it('sorts dependent tasks topologically so prerequisites precede dependents in wrap order', () => {
      const lookup = new Map<string, string>([
        ['t1', 't1'],
        ['t2', 't2'],
        ['t3', 't3'],
      ]);

      // Array input is intentionally reversed: t3 depends on t2, t2 depends on t1
      const unorderedTasks: Task[] = [
        { id: 't3', title: 'Task 3', dependsOn: ['t2'] } as unknown as Task,
        { id: 't2', title: 'Task 2', dependsOn: ['t1'] } as unknown as Task,
        { id: 't1', title: 'Task 1', dependsOn: [] } as unknown as Task,
      ];

      const sorted = sortTasksTopologically(unorderedTasks, lookup);
      expect(sorted.map((t) => t.id)).toEqual(['t1', 't2', 't3']);
    });

    it('applies wrap layout and dynamic container bounding box in getWorkflowElements', () => {
      const threeTasksInModule: Task[] = [
        { id: 't1', moduleGroup: 'Backend', title: 'Task 1', dependsOn: [] } as unknown as Task,
        { id: 't2', moduleGroup: 'Backend', title: 'Task 2', dependsOn: ['t1'] } as unknown as Task,
        { id: 't3', moduleGroup: 'Backend', title: 'Task 3', dependsOn: ['t2'] } as unknown as Task,
      ];

      const { nodes } = getWorkflowElements(threeTasksInModule);

      const node1 = nodes.find((n) => n.id === 't1')!;
      const node2 = nodes.find((n) => n.id === 't2')!;
      const node3 = nodes.find((n) => n.id === 't3')!;
      const groupNode = nodes.find((n) => n.id === 'group-Backend')!;

      // Row 0 has Task 1 (col 0) and Task 2 (col 1)
      expect(node1.position.y).toBe(node2.position.y);
      expect(node1.position.x).toBeLessThan(node2.position.x);

      // Task 3 wraps to Row 1 (below Row 0)
      expect(node3.position.y).toBeGreaterThan(node1.position.y);
      expect(node3.position.x).toBe(node1.position.x);

      // Group node position matches calculated bounding box
      expect(groupNode.position.x).toBe(node1.position.x - 30);
      expect(groupNode.position.y).toBe(node1.position.y - 30 - 40);

      // Group node dimensions dynamically encompass the wrapped rows
      expect(groupNode.style?.width).toBe(560);
      expect(groupNode.style?.height).toBe(330);
    });
  });
});
