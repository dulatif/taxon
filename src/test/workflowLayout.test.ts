import type { Edge, Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import type { TaskNodeData } from '../components/Workflow/TaskNode';
import {
  buildTaskIdLookup,
  calculateModuleBounds,
  computeModuleTiers,
  getBusPath,
  getDynamicModuleBounds,
  getWorkflowElements,
  hasNodeDirectlyAbove,
  hasSiblingDirectlyBelow,
  identifySecondaryEdges,
  isNodeBetweenHorizontal,
  isNodeBetweenVertical,
  isRightSideOccupied,
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

    // Intra-module topological depth: task1 (prerequisite) sits above task2 (dependent)
    expect(task1!.position.y).toBeLessThan(task2!.position.y);

    // Cross-module horizontal progression: Backend tasks precede Frontend tasks along X axis
    expect(task1!.position.x).toBeLessThan(task3!.position.x);
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

    it('applies topological depth ranking for sequential tasks inside a module', () => {
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

      // Dependent tasks flow strictly top-to-bottom on subsequent rows
      expect(node1.position.y).toBeLessThan(node2.position.y);
      expect(node2.position.y).toBeLessThan(node3.position.y);

      // Group node position matches calculated bounding box
      expect(groupNode.position.x).toBe(node1.position.x - 30);
      expect(groupNode.position.y).toBe(node1.position.y - 30 - 40);

      // Group node dimensions dynamically encompass the stacked rows
      expect(groupNode.style?.width).toBe(280);
      expect(groupNode.style?.height).toBe(470);
    });

    it('places parallel tasks on the same row across columns and encloses them dynamically', () => {
      const parallelTasks: Task[] = [
        { id: 't1', moduleGroup: 'Backend', title: 'Task 1', dependsOn: [] } as unknown as Task,
        { id: 't2', moduleGroup: 'Backend', title: 'Task 2', dependsOn: [] } as unknown as Task,
        {
          id: 't3',
          moduleGroup: 'Backend',
          title: 'Task 3',
          dependsOn: ['t1', 't2'],
        } as unknown as Task,
      ];

      const { nodes } = getWorkflowElements(parallelTasks);

      const node1 = nodes.find((n) => n.id === 't1')!;
      const node2 = nodes.find((n) => n.id === 't2')!;
      const node3 = nodes.find((n) => n.id === 't3')!;
      const groupNode = nodes.find((n) => n.id === 'group-Backend')!;

      // Parallel independent tasks t1 and t2 sit on the same row across columns
      expect(node1.position.y).toBe(node2.position.y);
      expect(node1.position.x).toBeLessThan(node2.position.x);

      // Dependent task t3 sits on row 1 below row 0
      expect(node3.position.y).toBeGreaterThan(node1.position.y);

      // Group node spans both columns
      expect(groupNode.style?.width).toBe(560);
      expect(groupNode.style?.height).toBe(330);
    });

    it('renders Karion Sprint 22 workflow DAG with centered consumer module and collision-free handles', () => {
      const sprint22Tasks: Task[] = [
        {
          id: 's22m01',
          moduleGroup: 'Image Caching & Media Cockpit',
          title: 'Configure cached_network_image',
          dependsOn: [],
        } as unknown as Task,
        {
          id: 's22m02',
          moduleGroup: 'Drift Queries & Database Projections',
          title: 'Optimize Drift SQLite Resources',
          dependsOn: [],
        } as unknown as Task,
        {
          id: 's22m03',
          moduleGroup: 'Drift Queries & Database Projections',
          title: 'Eliminate StreamBuilder',
          dependsOn: [],
        } as unknown as Task,
        {
          id: 's22m04',
          moduleGroup: 'UI Hydration & Shimmer Engine',
          title: 'Build Native Shimmer Skeleton',
          dependsOn: ['s22m01', 's22m02'],
        } as unknown as Task,
        {
          id: 's22m05',
          moduleGroup: 'UI Hydration & Shimmer Engine',
          title: 'Optimize Markdown Reader',
          dependsOn: ['s22m02', 's22m04'],
        } as unknown as Task,
        {
          id: 's22m06',
          moduleGroup: 'UI Hydration & Shimmer Engine',
          title: 'Debounce Search Filters',
          dependsOn: ['s22m01', 's22m02', 's22m03', 's22m04', 's22m05'],
        } as unknown as Task,
      ];

      const { nodes, edges } = getWorkflowElements(sprint22Tasks);

      const mod1 = nodes.find((n) => n.id === 'group-Image Caching & Media Cockpit')!;
      const mod2 = nodes.find((n) => n.id === 'group-Drift Queries & Database Projections')!;
      const mod3 = nodes.find((n) => n.id === 'group-UI Hydration & Shimmer Engine')!;

      // Producers (Mod 1 and Mod 2) share Row 0
      expect(mod1.position.y).toBe(mod2.position.y);
      expect(mod1.position.x).toBeLessThan(mod2.position.x);

      // Consumer (Mod 3) is on Row 1, positioned below Row 0
      expect(mod3.position.y).toBeGreaterThan(mod1.position.y);

      // Mod 3 is centered underneath Row 0 (barycenter alignment)
      expect(mod3.position.x).toBeGreaterThan(mod1.position.x);
      expect(mod3.position.x + (mod3.style?.width as number)).toBeLessThan(
        mod2.position.x + (mod2.style?.width as number),
      );

      // Inside Mod 3, sequential tasks flow strictly downwards
      const n4 = nodes.find((n) => n.id === 's22m04')!;
      const n5 = nodes.find((n) => n.id === 's22m05')!;
      const n6 = nodes.find((n) => n.id === 's22m06')!;
      expect(n4.position.y).toBeLessThan(n5.position.y);
      expect(n5.position.y).toBeLessThan(n6.position.y);

      // Verify transitive reduction preserved exactly the 5 non-redundant edges
      expect(edges.length).toBe(5);

      // Check incoming handles on s22m04 (incoming from s22m01 and s22m02): merged into bus trunk at target-top
      const e_1_4 = edges.find((e) => e.source === 's22m01' && e.target === 's22m04')!;
      const e_2_4 = edges.find((e) => e.source === 's22m02' && e.target === 's22m04')!;
      expect(e_1_4).toBeDefined();
      expect(e_2_4).toBeDefined();
      expect(e_1_4.type).toBe('bus');
      expect(e_2_4.type).toBe('bus');
      expect(e_1_4.targetHandle).toBe('target-top');
      expect(e_2_4.targetHandle).toBe('target-top');

      // Check incoming handles on s22m06 (incoming from s22m03 and s22m05): merged into bus trunk at target-top
      const e_3_6 = edges.find((e) => e.source === 's22m03' && e.target === 's22m06')!;
      const e_5_6 = edges.find((e) => e.source === 's22m05' && e.target === 's22m06')!;
      expect(e_3_6).toBeDefined();
      expect(e_5_6).toBeDefined();
      expect(e_3_6.type).toBe('bus');
      expect(e_5_6.type).toBe('bus');
      expect(e_3_6.targetHandle).toBe('target-top');
      expect(e_5_6.targetHandle).toBe('target-top');
    });

    it('computes topological tiers using Tarjan SCC and condensation DAG', () => {
      const tasks: Task[] = [
        { id: 't1', moduleGroup: 'ModA', dependsOn: [] } as unknown as Task,
        { id: 't2', moduleGroup: 'ModB', dependsOn: ['t1'] } as unknown as Task,
        { id: 't3', moduleGroup: 'ModC', dependsOn: ['t2'] } as unknown as Task,
      ];
      const lookup = buildTaskIdLookup(tasks);
      const groupLayouts = [
        {
          name: 'ModA',
          tasks: [tasks[0]!],
          orderedTasks: [],
          relPositions: new Map(),
          width: 300,
          height: 120,
        },
        {
          name: 'ModB',
          tasks: [tasks[1]!],
          orderedTasks: [],
          relPositions: new Map(),
          width: 300,
          height: 120,
        },
        {
          name: 'ModC',
          tasks: [tasks[2]!],
          orderedTasks: [],
          relPositions: new Map(),
          width: 300,
          height: 120,
        },
      ];
      const tiers = computeModuleTiers(groupLayouts, tasks, lookup);
      expect(tiers.get('ModA')).toBe(0);
      expect(tiers.get('ModB')).toBe(1);
      expect(tiers.get('ModC')).toBe(2);
    });

    it('detects obstacle nodes between and directly beneath cards', () => {
      const positions = new Map<string, { x: number; y: number; width?: number; height?: number }>([
        ['top', { x: 100, y: 100, width: 260, height: 100 }],
        ['middle', { x: 100, y: 240, width: 260, height: 100 }],
        ['bottomRight', { x: 380, y: 240, width: 260, height: 100 }],
        ['right', { x: 380, y: 100, width: 260, height: 100 }],
        ['farRight', { x: 660, y: 100, width: 260, height: 100 }],
      ]);

      // middle is directly below top
      expect(
        hasSiblingDirectlyBelow(
          'top',
          'bottomRight',
          positions.get('top')!,
          positions.get('bottomRight')!,
          positions,
        ),
      ).toBe(true);

      // right is between top and farRight horizontally
      expect(
        isNodeBetweenHorizontal(
          'top',
          'farRight',
          positions.get('top')!,
          positions.get('farRight')!,
          positions,
        ),
      ).toBe(true);

      // middle is between top and a hypothetical y=400 bottom card vertically
      const bottomPos = { x: 100, y: 400, width: 260, height: 100 };
      expect(
        isNodeBetweenVertical('top', 'bottom', positions.get('top')!, bottomPos, positions),
      ).toBe(true);

      // right side is occupied for top because right is on the same row to its right
      expect(isRightSideOccupied('top', positions.get('top')!, positions)).toBe(true);
      // right side is not occupied for farRight
      expect(isRightSideOccupied('farRight', positions.get('farRight')!, positions)).toBe(false);
    });

    it('renders Karion Sprint 19 workflow with clear handle bypass for s19t01 -> s19t03', () => {
      const sprint19Tasks: Task[] = [
        {
          id: 's19t01',
          moduleGroup: 'Mobile UI & Core',
          title: 'Task 1',
          dependsOn: [],
        } as unknown as Task,
        {
          id: 's19t02',
          moduleGroup: 'Mobile UI & Core',
          title: 'Task 2',
          dependsOn: ['s19t01'],
        } as unknown as Task,
        {
          id: 's19t03',
          moduleGroup: 'Mobile UI & Core',
          title: 'Task 3',
          dependsOn: ['s19t01'],
        } as unknown as Task,
        {
          id: 's19t04',
          moduleGroup: 'Frontend Responsiveness & UI',
          title: 'Task 4',
          dependsOn: [],
        } as unknown as Task,
        {
          id: 's19t05',
          moduleGroup: 'System & UX Architecture',
          title: 'Task 5',
          dependsOn: [],
        } as unknown as Task,
        {
          id: 's19t06',
          moduleGroup: 'Frontend Responsiveness & UI',
          title: 'Task 6',
          dependsOn: ['s19t04'],
        } as unknown as Task,
      ];

      const { edges } = getWorkflowElements(sprint19Tasks);

      // s19t02 is directly beneath s19t01. s19t01 -> s19t03 must route via source-right to bypass s19t02!
      const e_1_3 = edges.find((e) => e.source === 's19t01' && e.target === 's19t03')!;
      expect(e_1_3).toBeDefined();
      expect(e_1_3.sourceHandle).toBe('source-right');

      // s19t01 -> s19t02 is straight down
      const e_1_2 = edges.find((e) => e.source === 's19t01' && e.target === 's19t02')!;
      expect(e_1_2).toBeDefined();
      expect(e_1_2.sourceHandle).toBe('source-bottom');
      expect(e_1_2.targetHandle).toBe('target-top');
    });

    it('renders Karion Sprint 20 workflow with strict 3-tier top-to-bottom layout, eliminating reverse edges', () => {
      const sprint20Tasks: Task[] = [
        {
          id: 's20t01',
          moduleGroup: 'Universal Skeleton Engine',
          title: 'Task 1',
          dependsOn: [],
        } as unknown as Task,
        {
          id: 's20t02',
          moduleGroup: 'Universal Skeleton Engine',
          title: 'Task 2',
          dependsOn: ['s20t01'],
        } as unknown as Task,
        {
          id: 's20t03',
          moduleGroup: 'Universal Skeleton Engine',
          title: 'Task 3',
          dependsOn: ['s20t01'],
        } as unknown as Task,
        {
          id: 's20t04',
          moduleGroup: 'Frontend Performance',
          title: 'Task 4',
          dependsOn: ['s20t02', 's20t03'],
        } as unknown as Task,
        {
          id: 's20t05',
          moduleGroup: 'Data Caching',
          title: 'Task 5',
          dependsOn: ['s20t04'],
        } as unknown as Task,
        {
          id: 's20t06',
          moduleGroup: 'Data Caching',
          title: 'Task 6',
          dependsOn: ['s20t05'],
        } as unknown as Task,
      ];

      const { nodes, edges } = getWorkflowElements(sprint20Tasks);

      const mod1 = nodes.find((n) => n.id === 'group-Universal Skeleton Engine')!;
      const mod2 = nodes.find((n) => n.id === 'group-Frontend Performance')!;
      const mod3 = nodes.find((n) => n.id === 'group-Data Caching')!;

      // Strict Topological Tiering: Tier 0 -> Tier 1 -> Tier 2
      expect(mod1.position.y).toBeLessThan(mod2.position.y);
      expect(mod2.position.y).toBeLessThan(mod3.position.y);

      // ALL inter-module edges flow strictly downward (no reverse upward edges)
      for (const edge of edges) {
        const sNode = nodes.find((n) => n.id === edge.source)!;
        const tNode = nodes.find((n) => n.id === edge.target)!;
        expect(tNode.position.y).toBeGreaterThan(sNode.position.y);
      }

      // Obstacle bypass on s20t01 -> s20t03 around s20t02
      const e_1_3 = edges.find((e) => e.source === 's20t01' && e.target === 's20t03')!;
      expect(e_1_3.sourceHandle).toBe('source-right');
    });

    it('renders Karion Sprint 21 workflow eliminating the X crossing via SCC tiering and horizontal arching', () => {
      const sprint21Tasks: Task[] = [
        {
          id: 's21q01',
          moduleGroup: 'Notification Infrastructure',
          title: 'QS Layout',
          dependsOn: [],
        } as unknown as Task,
        {
          id: 's21q02',
          moduleGroup: 'Notification Infrastructure',
          title: 'QS Tile',
          dependsOn: [],
        } as unknown as Task,
        {
          id: 's21q03',
          moduleGroup: 'Flutter Bridge',
          title: 'MethodChannel Bridge',
          dependsOn: ['s21q01'],
        } as unknown as Task,
        {
          id: 's21q04',
          moduleGroup: 'Deep Link Routing',
          title: 'Deep Link Router',
          dependsOn: ['s21q03'],
        } as unknown as Task,
        {
          id: 's21q05',
          moduleGroup: 'Notification Infrastructure',
          title: 'Boot Receiver',
          dependsOn: ['s21q03'],
        } as unknown as Task,
        {
          id: 's21q06',
          moduleGroup: 'Verification & Testing',
          title: 'Integration Tests',
          dependsOn: ['s21q04', 's21q05'],
        } as unknown as Task,
      ];

      const { nodes, edges } = getWorkflowElements(sprint21Tasks);

      const modNotif = nodes.find((n) => n.id === 'group-Notification Infrastructure')!;
      const modBridge = nodes.find((n) => n.id === 'group-Flutter Bridge')!;
      const modDeep = nodes.find((n) => n.id === 'group-Deep Link Routing')!;
      const modVerify = nodes.find((n) => n.id === 'group-Verification & Testing')!;

      // Mutual feedback modules (Notification & Flutter Bridge) share Tier 0 (Row 0)
      expect(modNotif.position.y).toBe(modBridge.position.y);
      expect(modNotif.position.x).toBeLessThan(modBridge.position.x);

      // Deep Link is on Tier 1 (Row 1), strictly below Row 0
      expect(modDeep.position.y).toBeGreaterThan(modNotif.position.y);

      // Verification is on Tier 2 (Row 2), strictly below Row 1
      expect(modVerify.position.y).toBeGreaterThan(modDeep.position.y);

      // s21q01 -> s21q03 arches over s21q02 (source-top -> target-top) to prevent card penetration
      const e_1_3 = edges.find((e) => e.source === 's21q01' && e.target === 's21q03')!;
      expect(e_1_3).toBeDefined();
      expect(e_1_3.sourceHandle).toBe('source-top');
      expect(e_1_3.targetHandle).toBe('target-top');

      // The X crossing between s21q03 -> s21q04 and s21q05 -> s21q06 is eliminated:
      // s21q03 -> s21q04 flows from Row 0 to Row 1, while s21q05 -> s21q06 flows into Row 2
      const e_3_4 = edges.find((e) => e.source === 's21q03' && e.target === 's21q04')!;
      const e_5_6 = edges.find((e) => e.source === 's21q05' && e.target === 's21q06')!;
      expect(e_3_4).toBeDefined();
      expect(e_5_6).toBeDefined();
    });

    it('renders Karion Sprint 23 workflow with strict 3-tier layout and gutter routing around s23t05', () => {
      const sprint23Tasks: Task[] = [
        {
          id: 's23t01',
          moduleGroup: 'Foundation & Data',
          title: 'DB Schema',
          dependsOn: [],
        } as unknown as Task,
        {
          id: 's23t02',
          moduleGroup: 'Foundation & Data',
          title: 'Data Stores',
          dependsOn: ['s23t01'],
        } as unknown as Task,
        {
          id: 's23t03',
          moduleGroup: 'Svelte 5 Runes',
          title: 'Rune Store',
          dependsOn: ['s23t02'],
        } as unknown as Task,
        {
          id: 's23t04',
          moduleGroup: 'Svelte 5 Runes',
          title: 'Reactive Components',
          dependsOn: ['s23t02'],
        } as unknown as Task,
        {
          id: 's23t05',
          moduleGroup: 'Svelte 5 Runes',
          title: 'Animation Shell',
          dependsOn: ['s23t02'],
        } as unknown as Task,
        {
          id: 's23t06',
          moduleGroup: 'Benchmarking',
          title: 'Benchmark Suite',
          dependsOn: ['s23t03', 's23t04', 's23t05'],
        } as unknown as Task,
      ];

      const { nodes, edges } = getWorkflowElements(sprint23Tasks);

      const mod1 = nodes.find((n) => n.id === 'group-Foundation & Data')!;
      const mod2 = nodes.find((n) => n.id === 'group-Svelte 5 Runes')!;
      const mod3 = nodes.find((n) => n.id === 'group-Benchmarking')!;

      // Strict Topological Tiering: Foundation (Row 0) -> Svelte 5 (Row 1) -> Benchmarking (Row 2)
      expect(mod1.position.y).toBeLessThan(mod2.position.y);
      expect(mod2.position.y).toBeLessThan(mod3.position.y);

      // Fan-Out Bus Trunk from s23t02 to its 3 downstream tasks (s23t03, s23t04, s23t05):
      // A single stem exits source-bottom into the horizontal distribution rail in the upper gutter
      const e_2_3 = edges.find((e) => e.source === 's23t02' && e.target === 's23t03')!;
      const e_2_4 = edges.find((e) => e.source === 's23t02' && e.target === 's23t04')!;
      const e_2_5 = edges.find((e) => e.source === 's23t02' && e.target === 's23t05')!;

      expect(e_2_3).toBeDefined();
      expect(e_2_4).toBeDefined();
      expect(e_2_5).toBeDefined();

      // All 3 share source-bottom exit to form 1 single outgoing stem
      expect(e_2_3.sourceHandle).toBe('source-bottom');
      expect(e_2_4.sourceHandle).toBe('source-bottom');
      expect(e_2_5.sourceHandle).toBe('source-bottom');

      expect(e_2_3.type).toBe('bus');
      expect(e_2_4.type).toBe('bus');
      expect(e_2_5.type).toBe('bus');

      expect((e_2_3.data as { busMode?: string })?.busMode).toBe('divergence');
      expect((e_2_4.data as { busMode?: string })?.busMode).toBe('divergence');
      expect((e_2_5.data as { busMode?: string })?.busMode).toBe('divergence');

      // s23t03 and s23t04 are accessible on Row 0 from target-top
      expect(e_2_3.targetHandle).toBe('target-top');
      expect(e_2_4.targetHandle).toBe('target-top');

      // s23t05 is on Row 1 (directly below s23t03), so it routes around s23t03 via the left gutter into target-left
      expect(e_2_5.targetHandle).toBe('target-left');

      // All 3 prerequisite edges (s23t03, s23t04, s23t05) merge into a single bus trunk at target-top
      const e_3_6 = edges.find((e) => e.source === 's23t03' && e.target === 's23t06')!;
      const e_4_6 = edges.find((e) => e.source === 's23t04' && e.target === 's23t06')!;
      const e_5_6 = edges.find((e) => e.source === 's23t05' && e.target === 's23t06')!;

      expect(e_3_6).toBeDefined();
      expect(e_4_6).toBeDefined();
      expect(e_5_6).toBeDefined();

      // s23t03 has s23t04 on its right and s23t05 directly below, so it routes via source-left into the clear gutter
      expect(e_3_6.sourceHandle).toBe('source-left');
      expect(e_4_6.sourceHandle).toBe('source-bottom');
      expect(e_5_6.sourceHandle).toBe('source-bottom');

      // All 3 edges are typed as 'bus' and share the same targetHandle ('target-top') for single connector entry
      expect(e_3_6.type).toBe('bus');
      expect(e_4_6.type).toBe('bus');
      expect(e_5_6.type).toBe('bus');
      expect(e_3_6.targetHandle).toBe('target-top');
      expect(e_4_6.targetHandle).toBe('target-top');
      expect(e_5_6.targetHandle).toBe('target-top');

      // Connector Opacity Hierarchy:
      // In s23t02 fan-out: s23t05 is on Row 1 (farther distance), so e_2_5 is secondary with opacity 0.7
      expect(e_2_5.style?.opacity).toBe(0.7);
      // In s23t06 fan-in: s23t05 is nearest to s23t06 (on Row 1), so e_5_6 has opacity 1, while e_3_6 and e_4_6 have opacity 0.7
      expect(e_5_6.style?.opacity).toBe(1);
      expect(e_3_6.style?.opacity).toBe(0.7);
      expect(e_4_6.style?.opacity).toBe(0.7);
    });
  });

  describe('BusEdge & getBusPath', () => {
    it('generates gutter bypass path for source-left handle (convergence)', () => {
      const path = getBusPath({
        sourceX: 100,
        sourceY: 200,
        sourceHandle: 'source-left',
        targetX: 300,
        targetY: 500,
        railYOffset: 28,
        borderRadius: 8,
      });

      // Starts at source, turns left into gutter (x=80), drops to rail (y=472), turns to target (x=300), drops to targetY (500)
      expect(path).toContain('M 100 200');
      expect(path).toContain('80');
      expect(path).toContain('472');
      expect(path).toContain('L 300 500');
    });

    it('generates gutter bypass path for source-right handle (convergence)', () => {
      const path = getBusPath({
        sourceX: 400,
        sourceY: 200,
        sourceHandle: 'source-right',
        targetX: 200,
        targetY: 500,
        railYOffset: 28,
        borderRadius: 8,
      });

      // Starts at source, turns right into gutter (x=420), drops to rail (y=472), turns to target (x=200), drops to targetY (500)
      expect(path).toContain('M 400 200');
      expect(path).toContain('420');
      expect(path).toContain('472');
      expect(path).toContain('L 200 500');
    });

    it('generates orthogonal rail drop for source-bottom handle with horizontal offset (convergence)', () => {
      const path = getBusPath({
        sourceX: 150,
        sourceY: 200,
        sourceHandle: 'source-bottom',
        targetX: 350,
        targetY: 500,
        railYOffset: 28,
        borderRadius: 8,
      });

      // Drops from sourceY to rail (y=472), routes horizontally to targetX (350), drops to targetY (500)
      expect(path).toContain('M 150 200');
      expect(path).toContain('472');
      expect(path).toContain('L 350 500');
    });

    it('generates direct vertical drop for source-bottom handle when sourceX is aligned with targetX (convergence)', () => {
      const path = getBusPath({
        sourceX: 300,
        sourceY: 200,
        sourceHandle: 'source-bottom',
        targetX: 300,
        targetY: 500,
      });

      expect(path).toBe('M 300 200 L 300 500');
    });

    it('generates divergence fan-out path with target-top', () => {
      const path = getBusPath({
        sourceX: 350,
        sourceY: 300,
        sourceHandle: 'source-bottom',
        targetX: 200,
        targetY: 500,
        targetHandle: 'target-top',
        busMode: 'divergence',
        railYOffset: 35,
        borderRadius: 8,
      });

      // Exits source-bottom at (350, 300), drops to rail (y=335), routes to targetX (200), drops to targetY (500)
      expect(path).toContain('M 350 300');
      expect(path).toContain('335');
      expect(path).toContain('L 200 500');
    });

    it('generates divergence fan-out path with outer gutter bypass for target-left', () => {
      const path = getBusPath({
        sourceX: 350,
        sourceY: 300,
        sourceHandle: 'source-bottom',
        targetX: 100,
        targetY: 650,
        targetHandle: 'target-left',
        busMode: 'divergence',
        railYOffset: 35,
        borderRadius: 8,
      });

      // Exits source-bottom (350, 300), drops to rail (y=335), routes past targetX into gutter (gutterX = 76),
      // drops down gutter to targetY (650), turns right into targetX (100)
      expect(path).toContain('M 350 300');
      expect(path).toContain('335');
      expect(path).toContain('76');
      expect(path).toContain('L 100 650');
    });

    it('generates divergence fan-out path with outer gutter bypass for target-right', () => {
      const path = getBusPath({
        sourceX: 350,
        sourceY: 300,
        sourceHandle: 'source-bottom',
        targetX: 500,
        targetY: 650,
        targetHandle: 'target-right',
        busMode: 'divergence',
        railYOffset: 35,
        borderRadius: 8,
      });

      // Exits source-bottom (350, 300), drops to rail (y=335), routes past targetX into right gutter (gutterX = 524),
      // drops down gutter to targetY (650), turns left into targetX (500)
      expect(path).toContain('M 350 300');
      expect(path).toContain('335');
      expect(path).toContain('524');
      expect(path).toContain('L 500 650');
    });

    it('generates direct vertical drop for divergence when sourceX is aligned with targetX', () => {
      const path = getBusPath({
        sourceX: 300,
        sourceY: 200,
        sourceHandle: 'source-bottom',
        targetX: 300,
        targetY: 500,
        targetHandle: 'target-top',
        busMode: 'divergence',
      });

      expect(path).toBe('M 300 200 L 300 500');
    });
  });

  describe('hasNodeDirectlyAbove', () => {
    it('detects when a node has another node directly above it in the same column', () => {
      const positions = new Map<
        string,
        { x: number; y: number; width?: number; height?: number }
      >();
      positions.set('topNode', { x: 100, y: 100, width: 220, height: 88 });
      positions.set('bottomNode', { x: 100, y: 240, width: 220, height: 88 });

      expect(hasNodeDirectlyAbove('bottomNode', positions.get('bottomNode')!, positions)).toBe(
        true,
      );
      expect(hasNodeDirectlyAbove('topNode', positions.get('topNode')!, positions)).toBe(false);
    });
  });

  describe('identifySecondaryEdges & Connector Opacity Logic', () => {
    it('prioritizes active In Progress tasks over To Do tasks in multi-connector fan-in', () => {
      const positions = new Map<string, { x: number; y: number }>();
      positions.set('t1', { x: 100, y: 100 });
      positions.set('t2', { x: 300, y: 100 });
      positions.set('target', { x: 200, y: 300 });

      const testEdges: Edge[] = [
        { id: 'e-t1-target', source: 't1', target: 'target' },
        { id: 'e-t2-target', source: 't2', target: 'target' },
      ];

      const testTasks = [
        { id: 't1', status: 'To Do', priority: 'Medium' } as Task,
        { id: 't2', status: 'In Progress', priority: 'Medium' } as Task,
        { id: 'target', status: 'To Do', priority: 'Medium' } as Task,
      ];

      const secondaries = identifySecondaryEdges(testEdges, positions, testTasks);
      // t2 is In Progress, so e-t2-target is primary; e-t1-target is secondary
      expect(secondaries.has('e-t1-target')).toBe(true);
      expect(secondaries.has('e-t2-target')).toBe(false);
    });

    it('prioritizes nearest spatial distance when all tasks share the same status', () => {
      const positions = new Map<string, { x: number; y: number }>();
      positions.set('source', { x: 200, y: 100 });
      positions.set('nearTarget', { x: 200, y: 200 }); // dist: 100
      positions.set('farTarget', { x: 500, y: 600 }); // dist: 583

      const testEdges: Edge[] = [
        { id: 'e-source-near', source: 'source', target: 'nearTarget' },
        { id: 'e-source-far', source: 'source', target: 'farTarget' },
      ];

      const testTasks = [
        { id: 'source', status: 'To Do', priority: 'Medium' } as Task,
        { id: 'nearTarget', status: 'To Do', priority: 'Medium' } as Task,
        { id: 'farTarget', status: 'To Do', priority: 'Medium' } as Task,
      ];

      const secondaries = identifySecondaryEdges(testEdges, positions, testTasks);
      // nearTarget is closest, so e-source-near is primary; e-source-far is secondary
      expect(secondaries.has('e-source-far')).toBe(true);
      expect(secondaries.has('e-source-near')).toBe(false);
    });
  });
});
