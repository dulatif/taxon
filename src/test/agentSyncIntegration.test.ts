/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyAgentChanges,
  diffAgentChanges,
  exportProjectToAgent,
  scanAgentDirectory,
} from '../services/agentSync';
import type { Project, Sprint, Task } from '../types';

// Mock dependencies
vi.mock('@tauri-apps/plugin-fs', () => {
  const fs: Record<string, string> = {};
  return {
    mkdir: vi.fn(async () => {}),
    writeTextFile: vi.fn(async (path: string, content: string) => {
      fs[path] = content;
    }),
    readTextFile: vi.fn(async (path: string) => {
      if (!(path in fs)) throw new Error('File not found');
      return fs[path];
    }),
    readDir: vi.fn(async (dirPath: string) => {
      return Object.keys(fs)
        .filter((p) => p.startsWith(dirPath) && p.length > dirPath.length)
        .map((p) => {
          const name = p.substring(dirPath.length).replace(/^[/\\]/, '');
          return { name, isDirectory: false };
        });
    }),
    remove: vi.fn(async (path: string) => {
      for (const p of Object.keys(fs)) {
        if (p.startsWith(path)) delete fs[p];
      }
    }),
    exists: vi.fn(async (path: string) => {
      return Object.keys(fs).some((p) => p.startsWith(path));
    }),
    _getMockFs: () => fs, // helper to inspect state in tests
    _resetMockFs: () => {
      for (const key of Object.keys(fs)) delete fs[key];
    },
  };
});

vi.mock('../services/database', () => {
  const db: { tasks: Record<string, Task>; sprints: Record<string, Sprint> } = {
    tasks: {},
    sprints: {},
  };
  return {
    saveTask: vi.fn(async (task: Task) => {
      db.tasks[task.id] = task;
    }),
    saveSprint: vi.fn(async (sprint: Sprint) => {
      db.sprints[sprint.id] = sprint;
    }),
    _getMockDb: () => db,
    _resetMockDb: () => {
      db.tasks = {};
      db.sprints = {};
    },
  };
});

import * as fsMock from '@tauri-apps/plugin-fs';
import * as dbMock from '../services/database';

describe('agentSync Integration (AGENT-206)', () => {
  const mockProject: Project = {
    id: 'proj-1',
    name: 'Integration Test Project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockTasks: Task[] = Array.from({ length: 5 }).map(
    (_, i) =>
      ({
        id: `task-${i}`,
        projectId: 'proj-1',
        title: `Task ${i}`,
        description: '',
        priority: 'Medium',
        status: 'To Do',
        completed: false,
        labels: [],
        subtasks: [],
        timeSpent: 0,
        sortOrder: 0,
        archived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }) as Task,
  );

  const mockSprints: Sprint[] = [
    {
      id: 'sprint-1',
      projectId: 'proj-1',
      name: 'Sprint 1',
      goal: '',
      status: 'Active',
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Sprint,
  ];

  const vaultPath = '/mock/vault';

  beforeEach(() => {
    vi.clearAllMocks();
    (fsMock as any)._resetMockFs();
    (dbMock as any)._resetMockDb();
  });

  it('should export project, tasks, and sprints correctly', async () => {
    const result = await exportProjectToAgent(mockProject, mockTasks, mockSprints, vaultPath);

    expect(result.exportedTaskCount).toBe(5);
    expect(result.exportedSprintCount).toBe(1);

    const fs = (fsMock as any)._getMockFs();
    expect(Object.keys(fs).length).toBe(9); // project.md, 5 tasks, 1 sprint, AGENTS.md, CLAUDE.md
    expect(fs['/mock/vault/.taxon/project.md']).toContain('Integration Test Project');
  });

  it('should compute diff when a new task is added manually to fs', async () => {
    await exportProjectToAgent(mockProject, mockTasks, mockSprints, vaultPath);

    const newTaskContent = `---
id: task-new
title: Brand New Task
priority: High
status: To Do
---
## Description
New task added by agent.
`;
    await fsMock.writeTextFile(
      '/mock/vault/.taxon/tasks/TASK-task-n-brand-new-task.md',
      newTaskContent,
    );

    const {
      tasks: parsedTasks,
      sprints: parsedSprints,
      warnings,
    } = await scanAgentDirectory(vaultPath, mockProject.id);

    const diff = diffAgentChanges(mockTasks, mockSprints, parsedTasks, parsedSprints);

    expect(diff.newTasks.length).toBe(1);
    expect(diff.newTasks[0].id).toBe('task-new');
    expect(diff.modifiedTasks.length).toBe(0);
    expect(warnings.length).toBe(0);
  });

  it('should compute diff when a task is modified', async () => {
    await exportProjectToAgent(mockProject, mockTasks, mockSprints, vaultPath);

    // Modify one task
    const fs = (fsMock as any)._getMockFs();
    const taskPath = Object.keys(fs).find((p) => p.includes('TASK-task-0'));
    let content = fs[taskPath!];
    content = content.replace('priority: Medium', 'priority: High');
    await fsMock.writeTextFile(taskPath!, content);

    const { tasks: parsedTasks, sprints: parsedSprints } = await scanAgentDirectory(
      vaultPath,
      mockProject.id,
    );

    const diff = diffAgentChanges(mockTasks, mockSprints, parsedTasks, parsedSprints);

    expect(diff.newTasks.length).toBe(0);
    expect(diff.modifiedTasks.length).toBe(1);
    expect(diff.modifiedTasks[0].changedFields).toContain('priority');
    expect(diff.modifiedTasks[0].after.priority).toBe('High');
  });

  it('should ignore deleted files in the diff', async () => {
    await exportProjectToAgent(mockProject, mockTasks, mockSprints, vaultPath);

    // Delete one task
    const fs = (fsMock as any)._getMockFs();
    const taskPath = Object.keys(fs).find((p) => p.includes('TASK-task-0'));
    delete fs[taskPath!];

    const { tasks: parsedTasks, sprints: parsedSprints } = await scanAgentDirectory(
      vaultPath,
      mockProject.id,
    );

    const diff = diffAgentChanges(mockTasks, mockSprints, parsedTasks, parsedSprints);

    // Deletions from file system are ignored by design
    expect(diff.newTasks.length).toBe(0);
    expect(diff.modifiedTasks.length).toBe(0);
  });

  it('should capture warnings for invalid markdown', async () => {
    await exportProjectToAgent(mockProject, mockTasks, mockSprints, vaultPath);

    // Add invalid file
    await fsMock.writeTextFile(
      '/mock/vault/.taxon/tasks/invalid.md',
      'Not a valid frontmatter file',
    );

    const { warnings } = await scanAgentDirectory(vaultPath, mockProject.id);
    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain('invalid.md');
  });

  it('should apply changes to the database', async () => {
    const diff: AgentDiffResult = {
      newTasks: [mockTasks[0]],
      modifiedTasks: [
        {
          before: mockTasks[1],
          after: { ...mockTasks[1], priority: 'High' },
          changedFields: ['priority'],
        },
      ],
      newSprints: [],
      modifiedSprints: [],
      warnings: [],
    };

    const stats = await applyAgentChanges(diff);
    expect(stats.tasksApplied).toBe(2);
    expect(stats.sprintsApplied).toBe(0);

    const db = (dbMock as any)._getMockDb();
    expect(Object.keys(db.tasks).length).toBe(2);
    expect(db.tasks['task-0']).toBeDefined();
    expect(db.tasks['task-1'].priority).toBe('High');
  });
});
