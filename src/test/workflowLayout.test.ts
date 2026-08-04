import { describe, expect, it } from 'vitest';
import type { TaskNodeData } from '../components/Workflow/TaskNode';
import { buildTaskIdLookup, getWorkflowElements } from '../components/Workflow/workflowLayout';
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
    expect((wf3Node?.data as unknown as TaskNodeData).task.status).toBe('Need to Test');

    const wf1Node = taskNodes.find((n) => n.id === 'wf0001');
    expect(wf1Node).toBeDefined();
    expect((wf1Node?.data as unknown as TaskNodeData).task.status).toBe('Done');

    // All edges should have valid source and target within taskNodes
    const taskNodeIds = new Set(taskNodes.map((n) => n.id));
    for (const edge of edges) {
      expect(taskNodeIds.has(edge.source)).toBe(true);
      expect(taskNodeIds.has(edge.target)).toBe(true);
    }
  });
});
