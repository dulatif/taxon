import { invoke } from '@tauri-apps/api/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MergeWorktreeDialog from '../components/Worktree/MergeWorktreeDialog';
import * as database from '../services/database';
import type { Project, Task } from '../types';
import { createProject, createTask } from './factories';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../services/database', () => ({
  saveTask: vi.fn().mockResolvedValue(undefined),
}));

describe('MergeWorktreeDialog & Safe Conflict Abort (TASK-wkt004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const project: Project = createProject({
    id: 'proj_merge',
    name: 'Taxon Project',
    workspacePaths: ['/mnt/repo'],
  });

  const task: Task = createTask({
    id: 'wkt004',
    title: 'Interactive Merge Dialog',
    workspacePath: '/mnt/repo/.worktrees/TASK-wkt004',
    worktreeBranch: 'feat/TASK-wkt004',
    worktreeStatus: 'active',
    status: 'Need to Test',
  });

  it('renders dialog with default Squash & Merge strategy and checked delete checkbox', () => {
    render(
      <MergeWorktreeDialog
        isOpen={true}
        onClose={vi.fn()}
        task={task}
        project={project}
        onMergeSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText(/Merge & Prune Worktree/i)).toBeInTheDocument();
    expect(screen.getByText(/feat\/TASK-wkt004/i)).toBeInTheDocument();

    const squashRadio = screen.getByRole('radio', { name: /Squash & Merge/i });
    expect(squashRadio).toBeChecked();

    const deleteCheckbox = screen.getByRole('checkbox', {
      name: /Delete worktree folder and remove branch upon merge/i,
    });
    expect(deleteCheckbox).toBeChecked();
  });

  it('successfully merges and updates task to Done, merged status, and calls saveTask', async () => {
    const onMergeSuccess = vi.fn();
    const onClose = vi.fn();

    vi.mocked(invoke).mockResolvedValueOnce({
      success: true,
      conflictFiles: [],
      baseBranchClean: true,
    });

    render(
      <MergeWorktreeDialog
        isOpen={true}
        onClose={onClose}
        task={task}
        project={project}
        onMergeSuccess={onMergeSuccess}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: /Confirm Merge/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(invoke).toHaveBeenCalledWith('git_worktree_merge', {
        projectPath: '/mnt/repo',
        worktreePath: '/mnt/repo/.worktrees/TASK-wkt004',
        branch: 'feat/TASK-wkt004',
        strategy: 'squash',
        deleteWorktree: true,
      });

      expect(database.saveTask).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wkt004',
          status: 'Done',
          completed: true,
          worktreeStatus: 'merged',
          workspacePath: undefined,
        }),
      );

      expect(onMergeSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'Done',
          completed: true,
          worktreeStatus: 'merged',
        }),
      );

      expect(onClose).toHaveBeenCalled();
    });
  });

  it('displays conflict screen with safe merge abort banner and allows terminal resolution', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      success: false,
      message: 'Merge conflict encountered',
      conflictFiles: ['src/services/database.ts', 'src/types/task.ts'],
      baseBranchClean: true,
    });

    render(
      <MergeWorktreeDialog
        isOpen={true}
        onClose={vi.fn()}
        task={task}
        project={project}
        onMergeSuccess={vi.fn()}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: /Confirm Merge/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Merge Conflict Encountered — Safe Abort Executed/i),
      ).toBeInTheDocument();
      expect(screen.getByText('src/services/database.ts')).toBeInTheDocument();
      expect(screen.getByText('src/types/task.ts')).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /Open in Terminal to Resolve/i }),
      ).toBeInTheDocument();
    });

    // Click Open in Terminal to Resolve
    fireEvent.click(screen.getByRole('button', { name: /Open in Terminal to Resolve/i }));
    expect(invoke).toHaveBeenCalledWith('launch_sandbox_terminal', {
      worktreePath: '/mnt/repo/.worktrees/TASK-wkt004',
    });
  });
});
