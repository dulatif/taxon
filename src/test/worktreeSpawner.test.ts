import { invoke } from '@tauri-apps/api/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnWorktreeForTask } from '../hooks/useTasks';
import { markdownToTask, taskToMarkdown } from '../services/agentSync';
import * as database from '../services/database';
import type { Project, Task } from '../types';
import { createProject, createTask } from './factories';

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('../services/database', () => ({
  saveTask: vi.fn().mockResolvedValue(undefined),
  initDb: vi.fn(),
}));

describe('Worktree Spawner & Dependency Bridging (TASK-wkt002)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('agentSync Serialization & Parsing', () => {
    it('serializes workspacePath, worktreeBranch, and worktreeStatus to YAML frontmatter', () => {
      const task: Task = createTask({
        id: 'wkt002',
        title: 'Zero-Runtime Worktree Spawner',
        workspacePath: '/repo/.worktrees/TASK-wkt002',
        worktreeBranch: 'feat/TASK-wkt002',
        worktreeStatus: 'active',
        description: 'Test description',
      });

      const md = taskToMarkdown(task);

      expect(md).toContain('workspacePath: /repo/.worktrees/TASK-wkt002');
      expect(md).toContain('worktreeBranch: feat/TASK-wkt002');
      expect(md).toContain('worktreeStatus: active');
    });

    it('parses workspacePath, worktreeBranch, and worktreeStatus from YAML frontmatter', () => {
      const markdown = `---
id: wkt002
title: Zero-Runtime Worktree Spawner
priority: High
status: In Progress
completed: false
workspacePath: /repo/.worktrees/TASK-wkt002
worktreeBranch: feat/TASK-wkt002
worktreeStatus: active
---

## Description
Test description
`;

      const parsed = markdownToTask(markdown);

      expect(parsed.id).toBe('wkt002');
      expect(parsed.workspacePath).toBe('/repo/.worktrees/TASK-wkt002');
      expect(parsed.worktreeBranch).toBe('feat/TASK-wkt002');
      expect(parsed.worktreeStatus).toBe('active');
    });
  });

  describe('spawnWorktreeForTask Hook', () => {
    it('invokes git_worktree_spawn and updates task record with worktree info', async () => {
      const project: Project = createProject({
        id: 'proj_alpha',
        name: 'Alpha Project',
        workspacePaths: ['/mnt/repo'],
        worktreeEnabled: true,
        worktreeDir: '.worktrees',
        worktreeSetupCommand: 'pnpm install',
      });

      const task: Task = createTask({
        id: 'task_xyz123',
        projectId: 'proj_alpha',
        title: 'Build Feature',
        status: 'In Progress',
      });

      vi.mocked(invoke).mockResolvedValueOnce({
        workspacePath: '/mnt/repo/.worktrees/TASK-xyz123',
        worktreeBranch: 'feat/TASK-xyz123',
        success: true,
      });

      const result = await spawnWorktreeForTask(task, project);

      expect(invoke).toHaveBeenCalledWith('git_worktree_spawn', {
        projectPath: '/mnt/repo',
        taskId: 'task_xyz123',
        worktreeDir: '.worktrees',
        baseBranch: null,
        setupCommand: 'pnpm install',
      });

      expect(result).not.toBeNull();
      expect(result?.updatedTask.workspacePath).toBe('/mnt/repo/.worktrees/TASK-xyz123');
      expect(result?.updatedTask.worktreeBranch).toBe('feat/TASK-xyz123');
      expect(result?.updatedTask.worktreeStatus).toBe('active');
      expect(database.saveTask).toHaveBeenCalledWith(result?.updatedTask);
    });

    it('returns null if project has no workspacePaths or vaultPath', async () => {
      const project: Project = createProject({
        id: 'proj_empty',
        name: 'Empty Project',
        workspacePaths: [],
        vaultPath: '',
        worktreeEnabled: true,
      });

      const task: Task = createTask({
        id: 'task_1',
        projectId: 'proj_empty',
      });

      const result = await spawnWorktreeForTask(task, project);

      expect(result).toBeNull();
      expect(invoke).not.toHaveBeenCalled();
    });
  });
});
