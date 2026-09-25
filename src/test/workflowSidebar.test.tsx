import { describe, expect, it, vi } from 'vitest';
import { WorkflowSidebar } from '../components/Workflow/WorkflowSidebar';
import type { Task } from '../types';
import { fireEvent, render, screen } from './helpers';

describe('WorkflowSidebar Component', () => {
  const mockTask: Task = {
    id: 'task_grf003',
    projectId: 'proj-1',
    title: 'Implement node detail sidebar in Workflow DAG view',
    priority: 'High',
    status: 'To Do',
    completed: false,
    duration: '2h',
    moduleGroup: 'Workflow DAG UI',
    dependsOn: ['task_grf001'],
    inputs: ['src/types/task.ts', 'src/components/Workflow/WorkflowView.tsx'],
    outputs: [
      'src/components/Workflow/WorkflowSidebar.tsx',
      'src/components/Workflow/WorkflowView.tsx',
    ],
    description: `## Description
Create a slide-over WorkflowSidebar component.

## Deliverables
- [WorkflowSidebar.tsx](file:///src/components/Workflow/WorkflowSidebar.tsx): Sidebar component.

## Acceptance Criteria
- [ ] Clicking a task node selects the task.
- [x] Renders inputs and outputs.

## Subtasks
- [ ] Build WorkflowSidebar.tsx
`,
  };

  const allTasks: Task[] = [
    {
      id: 'task_grf001',
      projectId: 'proj-1',
      title: 'Add inputs and outputs fields to Task type',
      priority: 'High',
      status: 'Done',
      completed: true,
      duration: '1h',
      dependsOn: [],
    } as unknown as Task,
    mockTask,
  ];

  it('renders task details when open', () => {
    render(<WorkflowSidebar task={mockTask} allTasks={allTasks} isOpen={true} onClose={vi.fn()} />);

    expect(
      screen.getByText('Implement node detail sidebar in Workflow DAG view'),
    ).toBeInTheDocument();
    expect(screen.getByText('TASK-grf003')).toBeInTheDocument();
    expect(screen.getByText('Workflow DAG UI')).toBeInTheDocument();
    expect(screen.getByText('src/types/task.ts')).toBeInTheDocument();
    expect(screen.getByText('src/components/Workflow/WorkflowSidebar.tsx')).toBeInTheDocument();
    expect(screen.getByText('Clicking a task node selects the task.')).toBeInTheDocument();
  });

  it('resolves prerequisites and shows blocker status', () => {
    render(<WorkflowSidebar task={mockTask} allTasks={allTasks} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Add inputs and outputs fields to Task type')).toBeInTheDocument();
    expect(
      screen.getByText('All prerequisite contracts satisfied. Ready for execution.'),
    ).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(
      <WorkflowSidebar task={mockTask} allTasks={allTasks} isOpen={true} onClose={handleClose} />,
    );

    const closeBtn = screen.getByTitle('Close Sidebar (Esc)');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <WorkflowSidebar task={mockTask} allTasks={allTasks} isOpen={true} onClose={handleClose} />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onSelectTask when a prerequisite task card is clicked', () => {
    const handleSelectTask = vi.fn();
    render(
      <WorkflowSidebar
        task={mockTask}
        allTasks={allTasks}
        isOpen={true}
        onClose={vi.fn()}
        onSelectTask={handleSelectTask}
      />,
    );

    const blockerCard = screen.getByText('Add inputs and outputs fields to Task type');
    fireEvent.click(blockerCard);
    expect(handleSelectTask).toHaveBeenCalledWith(allTasks[0]);
  });
});
