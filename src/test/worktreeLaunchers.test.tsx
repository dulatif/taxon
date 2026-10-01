import { invoke } from '@tauri-apps/api/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskCard from '../components/Kanban/TaskCard';
import WorktreeControlPanel from '../components/Worktree/WorktreeControlPanel';
import type { Task } from '../types';
import { createTask } from './factories';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

describe('Native Sandbox Launchers & Badges (TASK-wkt003)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe('WorktreeControlPanel Component', () => {
    it('returns null if task has no workspacePath and worktreeStatus is not active', () => {
      const task: Task = createTask({
        id: 'task_regular',
        workspacePath: undefined,
        worktreeStatus: 'none',
      });

      const { container } = render(<WorktreeControlPanel task={task} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders branch name, path, and launcher buttons when worktree is active', async () => {
      const task: Task = createTask({
        id: 'task_wkt003',
        workspacePath: '/repo/.worktrees/TASK-wkt003',
        worktreeBranch: 'feat/TASK-wkt003',
        worktreeStatus: 'active',
      });

      render(<WorktreeControlPanel task={task} />);

      expect(screen.getByText(/feat\/TASK-wkt003/i)).toBeInTheDocument();
      expect(screen.getByText(/\/repo\/\.worktrees\/TASK-wkt003/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Copy Path/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Open Terminal/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Open Editor/i })).toBeInTheDocument();

      // Test Copy Path
      fireEvent.click(screen.getByRole('button', { name: /Copy Path/i }));
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('/repo/.worktrees/TASK-wkt003');

      // Test Open Terminal
      vi.mocked(invoke).mockResolvedValueOnce(undefined);
      fireEvent.click(screen.getByRole('button', { name: /Open Terminal/i }));
      expect(invoke).toHaveBeenCalledWith('launch_sandbox_terminal', {
        worktreePath: '/repo/.worktrees/TASK-wkt003',
      });

      // Test Open Editor
      vi.mocked(invoke).mockResolvedValueOnce(undefined);
      fireEvent.click(screen.getByRole('button', { name: /Open Editor/i }));
      expect(invoke).toHaveBeenCalledWith('launch_sandbox_editor', {
        worktreePath: '/repo/.worktrees/TASK-wkt003',
        editorCmd: null,
      });
    });
  });

  describe('TaskCard Worktree Indicator', () => {
    it('renders visual 🌳 indicator when task has active worktree', () => {
      const taskWithWorktree: Task = createTask({
        id: 'task_tree',
        title: 'Worktree Isolated Task',
        workspacePath: '/repo/.worktrees/TASK-tree',
        worktreeBranch: 'feat/TASK-tree',
        worktreeStatus: 'active',
      });

      render(
        <TaskCard
          task={taskWithWorktree}
          colName="In Progress"
          getPriorityClass={() => 'text-blue-400'}
        />,
      );

      expect(screen.getByTitle(/Active Worktree:/i)).toBeInTheDocument();
      expect(screen.getByText('🌳')).toBeInTheDocument();
    });

    it('does not render 🌳 indicator when task is standard without worktree', () => {
      const standardTask: Task = createTask({
        id: 'task_standard',
        title: 'Standard Repo Task',
        workspacePath: undefined,
        worktreeStatus: 'none',
      });

      render(
        <TaskCard
          task={standardTask}
          colName="In Progress"
          getPriorityClass={() => 'text-blue-400'}
        />,
      );

      expect(screen.queryByTitle(/Active Worktree:/i)).not.toBeInTheDocument();
      expect(screen.queryByText('🌳')).not.toBeInTheDocument();
    });
  });
});
