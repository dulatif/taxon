import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProjectTaskList from '../sections/ProjectTaskList/ProjectTaskList';
import { createProject, createSprint, createTask } from './factories';

const mockProject = createProject({
  id: 'proj_1',
  name: 'Test Project',
});

const mockActiveSprint = createSprint({
  id: 'sprint_1',
  projectId: 'proj_1',
  name: 'Sprint 1',
  status: 'Active',
});

const mockTasks = [
  createTask({
    id: 'task_backlog',
    projectId: 'proj_1',
    sprintId: undefined,
    title: 'Backlog Task Item',
  }),
  createTask({
    id: 'task_in_sprint',
    projectId: 'proj_1',
    sprintId: 'sprint_1',
    title: 'Sprint Task Item',
  }),
];

describe('ProjectTaskList - Backlog Add to Active Sprint action', () => {
  it('renders Plus button to move backlog task to active sprint instead of archive button', () => {
    const onAssignTaskToSprint = vi.fn();
    const onArchiveTask = vi.fn();

    render(
      <ProjectTaskList
        tasks={mockTasks}
        projectTasks={mockTasks}
        project={mockProject}
        sprints={[mockActiveSprint]}
        taskTab="all"
        selectedSort="custom"
        dueDateFilter="all"
        onToggleTask={vi.fn()}
        onAssignTaskToSprint={onAssignTaskToSprint}
        onArchiveTask={onArchiveTask}
        onSetTaskToDelete={vi.fn()}
      />,
    );

    // Backlog task should have "Move to active sprint (Sprint 1)" button
    const moveToSprintBtn = screen.getByTitle('Move to active sprint (Sprint 1)');
    expect(moveToSprintBtn).toBeInTheDocument();

    fireEvent.click(moveToSprintBtn);
    expect(onAssignTaskToSprint).toHaveBeenCalledWith('task_backlog', 'sprint_1');

    // Sprint task should have "Archive task" button
    const archiveBtn = screen.getByTitle('Archive task');
    expect(archiveBtn).toBeInTheDocument();

    fireEvent.click(archiveBtn);
    expect(onArchiveTask).toHaveBeenCalledWith('task_in_sprint');
  });
});
