import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import ProjectDetailView from '../components/ProjectDetailView';
import { WorkflowToolbar } from '../components/Workflow/WorkflowToolbar';
import { createProject, createSprint, createTask } from './factories';

describe('Disable Workflow tab when filter is all sprints (TASK-196397)', () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  const mockProject = createProject({
    id: 'proj_1',
    name: 'Taxon Project',
    category: 'Work',
  });

  const mockSprint = createSprint({
    id: 'sprint_1',
    projectId: 'proj_1',
    name: 'Sprint 1',
    status: 'Planned',
    startDate: '2026-01-01',
    endDate: '2026-01-14',
  });

  const mockTasks = [
    createTask({
      id: 'task_1',
      projectId: 'proj_1',
      sprintId: 'sprint_1',
      title: 'Task in Sprint',
      status: 'To Do',
      priority: 'Medium',
    }),
  ];

  const defaultProps = {
    project: mockProject,
    tasks: mockTasks,
    files: [],
    sprints: [mockSprint],
    onToggleTask: vi.fn(),
    onAddTask: vi.fn(),
    onDeleteTask: vi.fn(),
    onCompleteProject: vi.fn(),
    onEditProject: vi.fn(),
    onDeleteProject: vi.fn(),
    onAddFile: vi.fn(),
    onDeleteFile: vi.fn(),
    onMoveTaskStatus: vi.fn(),
    onBackToProjects: vi.fn(),
  };

  it('disables workflow button when filter is all sprints', () => {
    render(<ProjectDetailView {...defaultProps} initialSprintId="all" />);

    const workflowBtn = screen.getByRole('button', { name: /workflow/i });
    expect(workflowBtn).toBeDisabled();
    expect(workflowBtn).toHaveAttribute('title', 'Select a specific sprint to view workflow');

    // Clicking it should not switch to workflow mode
    fireEvent.click(workflowBtn);
    expect(screen.queryByTestId('workflow-canvas-container')).not.toBeInTheDocument();
  });

  it('does not navigate to workflow tab on shortcut key 3 when filter is all sprints', () => {
    render(<ProjectDetailView {...defaultProps} initialSprintId="all" />);

    fireEvent.keyDown(window, { key: '3' });

    expect(screen.queryByTestId('workflow-canvas-container')).not.toBeInTheDocument();
  });

  it('enables workflow button and allows navigation when a specific sprint is selected', () => {
    render(<ProjectDetailView {...defaultProps} initialSprintId="sprint_1" />);

    const workflowBtn = screen.getByRole('button', { name: /workflow/i });
    expect(workflowBtn).not.toBeDisabled();
    expect(workflowBtn).toHaveAttribute('title', 'Workflow');

    // Shortcut key 3 should switch to workflow view
    fireEvent.keyDown(window, { key: '3' });
    expect(screen.getByTestId('workflow-canvas-container')).toBeInTheDocument();
  });

  it('auto-reverts to list view if sprint filter is changed to all while in workflow view', () => {
    render(<ProjectDetailView {...defaultProps} initialSprintId="sprint_1" />);

    // Switch to workflow mode
    fireEvent.keyDown(window, { key: '3' });
    expect(screen.getByTestId('workflow-canvas-container')).toBeInTheDocument();

    // Open CustomSelect dropdown by clicking the select trigger
    const sprintSelectBtn = screen.getByRole('button', { name: /sprint 1/i });
    fireEvent.click(sprintSelectBtn);

    // Select "All Sprints" option
    const allOption = screen.getByRole('button', { name: /all sprints/i });
    fireEvent.click(allOption);

    // Should revert back to list view, workflow container removed
    expect(screen.queryByTestId('workflow-canvas-container')).not.toBeInTheDocument();
    const workflowBtn = screen.getByRole('button', { name: /workflow/i });
    expect(workflowBtn).toBeDisabled();
  });

  it('does not include All Sprints in WorkflowToolbar sprint dropdown', () => {
    render(
      <WorkflowToolbar
        onZoomIn={vi.fn()}
        onZoomOut={vi.fn()}
        onFitView={vi.fn()}
        moduleGroups={[]}
        selectedGroup={null}
        onSelectGroup={vi.fn()}
        sprints={[mockSprint]}
        selectedSprintId="sprint_1"
        onSelectSprint={vi.fn()}
        searchQuery=""
        onSearchChange={vi.fn()}
        isLive={false}
        activeTaskId={null}
        totalTasksCount={1}
      />,
    );

    expect(screen.queryByRole('option', { name: /all sprints/i })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /sprint 1/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /backlog only/i })).toBeInTheDocument();
  });
});
