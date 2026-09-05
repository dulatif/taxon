import { type NodeProps, ReactFlowProvider } from '@xyflow/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskNode } from '../components/Workflow/TaskNode';
import type { Task } from '../types';
import { fireEvent, render, screen } from './helpers';

describe('TaskNode Component', () => {
  const baseTask: Task = {
    id: 'task_grf004',
    projectId: 'proj-1',
    title: 'Add contract badges to TaskNode',
    priority: 'High',
    status: 'To Do',
    completed: false,
    duration: '2h',
    moduleGroup: 'Workflow DAG UI',
    subtasks: [
      { id: 'st1', title: 'Badge icons', completed: true },
      { id: 'st2', title: 'Selection styling', completed: false },
    ],
    inputs: ['src/components/Workflow/TaskNode.tsx', 'docs/contracts/task.md'],
    outputs: ['src/components/Workflow/TaskNode.tsx'],
  };

  const renderTaskNode = (props: {
    task: Task;
    selected?: boolean;
    isAgentActive?: boolean;
    isAgentNext?: boolean;
    onSelectTask?: (task: Task) => void;
  }) => {
    return render(
      <ReactFlowProvider>
        <TaskNode
          {...({
            id: props.task.id,
            data: {
              task: props.task,
              isAgentActive: props.isAgentActive,
              isAgentNext: props.isAgentNext,
              onSelectTask: props.onSelectTask,
            },
            selected: props.selected ?? false,
            type: 'taskNode',
            zIndex: 1,
            isConnectable: true,
            positionAbsoluteX: 0,
            positionAbsoluteY: 0,
            dragging: false,
            deletable: false,
            selectable: true,
            draggable: false,
          } as unknown as NodeProps)}
        />
      </ReactFlowProvider>,
    );
  };

  it('renders task basic details including title, status, priority, subtasks, and ID', () => {
    renderTaskNode({ task: baseTask });

    expect(screen.getByText('Add contract badges to TaskNode')).toBeInTheDocument();
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('High')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
    expect(screen.getByText('grf004')).toBeInTheDocument();
  });

  it('applies selection highlight styling when selected is true', () => {
    renderTaskNode({ task: baseTask, selected: true });

    const nodeElement = screen.getByTestId('task-node-task_grf004');
    expect(nodeElement.className).toContain('border-primary');
    expect(nodeElement.className).toContain('ring-2');
    expect(nodeElement.className).toContain('ring-primary/60');
  });

  it('triggers onSelectTask when clicked', () => {
    const onSelectTask = vi.fn();
    renderTaskNode({ task: baseTask, onSelectTask });

    const nodeElement = screen.getByTestId('task-node-task_grf004');
    fireEvent.click(nodeElement);

    expect(onSelectTask).toHaveBeenCalledTimes(1);
    expect(onSelectTask).toHaveBeenCalledWith(baseTask);
  });

  it('renders completed/collapsed task node correctly with strike-through title', () => {
    const doneTask: Task = {
      ...baseTask,
      completed: true,
      status: 'Done',
    };

    renderTaskNode({ task: doneTask, selected: true });

    const nodeElement = screen.getByTestId('task-node-task_grf004');
    expect(nodeElement).toBeInTheDocument();
    expect(nodeElement.className).toContain('border-primary');
    expect(nodeElement.className).toContain('ring-2');

    expect(nodeElement.className).toContain('workflow-task-node-done');

    const titleElement = screen.getByText('Add contract badges to TaskNode');
    expect(titleElement.className).toContain('line-through');
  });

  it('renders Need to Test task node with workflow-task-node-test purple styling', () => {
    const needToTestTask: Task = {
      ...baseTask,
      completed: false,
      status: 'Need to Test',
    };

    renderTaskNode({ task: needToTestTask });

    const nodeElement = screen.getByTestId('task-node-task_grf004');
    expect(nodeElement).toBeInTheDocument();
    expect(nodeElement.className).toContain('workflow-task-node-test');
  });
});
