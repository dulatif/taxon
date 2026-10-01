import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProjectSettingsModal from '../components/ProjectSettingsModal';
import * as database from '../services/database';
import type { Task } from '../types';
import { createProject, createTask } from './factories';

vi.mock('../services/database', () => ({
  saveProject: vi.fn().mockResolvedValue(undefined),
}));

describe('ProjectSettingsModal & Worktree Data Model', () => {
  it('Task and Project types support worktree fields', () => {
    const task: Task = createTask({
      workspacePath: '/path/to/.worktrees/TASK-wkt001',
      worktreeBranch: 'feat/TASK-wkt001',
      worktreeStatus: 'active',
    });

    expect(task.workspacePath).toBe('/path/to/.worktrees/TASK-wkt001');
    expect(task.worktreeBranch).toBe('feat/TASK-wkt001');
    expect(task.worktreeStatus).toBe('active');

    const project = createProject({
      worktreeEnabled: true,
      worktreeDir: '.worktrees',
      worktreeSetupCommand: 'pnpm install',
    });

    expect(project.worktreeEnabled).toBe(true);
    expect(project.worktreeDir).toBe('.worktrees');
    expect(project.worktreeSetupCommand).toBe('pnpm install');
  });

  it('renders ProjectSettingsModal with default disabled state', () => {
    const project = createProject({
      name: 'Alpha Project',
      worktreeEnabled: false,
    });

    render(
      <ProjectSettingsModal isOpen={true} onClose={vi.fn()} project={project} onSave={vi.fn()} />,
    );

    expect(screen.getByText(/Project Settings — Alpha Project/i)).toBeInTheDocument();
    expect(screen.getByText(/Git Worktree Sandboxing/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('.worktrees')).not.toBeInTheDocument();
  });

  it('allows toggling worktree sandboxing, editing directory & command, and saving', async () => {
    const project = createProject({
      id: 'proj_123',
      name: 'Alpha Project',
      worktreeEnabled: false,
    });

    const onSave = vi.fn();
    const onClose = vi.fn();

    render(
      <ProjectSettingsModal isOpen={true} onClose={onClose} project={project} onSave={onSave} />,
    );

    // Toggle on
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Directory input should now appear
    const dirInput = screen.getByPlaceholderText('.worktrees');
    expect(dirInput).toBeInTheDocument();
    fireEvent.change(dirInput, { target: { value: '.custom-worktrees' } });

    // Setup command input
    const cmdInput = screen.getByPlaceholderText(/e.g. pnpm install/i);
    expect(cmdInput).toBeInTheDocument();
    fireEvent.change(cmdInput, { target: { value: 'pnpm build' } });

    // Submit form
    const saveBtn = screen.getByRole('button', { name: /Save Settings/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(database.saveProject).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'proj_123',
          worktreeEnabled: true,
          worktreeDir: '.custom-worktrees',
          worktreeSetupCommand: 'pnpm build',
        }),
      );
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          worktreeEnabled: true,
          worktreeDir: '.custom-worktrees',
          worktreeSetupCommand: 'pnpm build',
        }),
      );
      expect(onClose).toHaveBeenCalled();
    });
  });
});
