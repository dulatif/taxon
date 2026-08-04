/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyAgentChanges,
  cleanUpArchivedFiles,
  diffAgentChanges,
  exportProjectToAgent,
  generateChangelog,
  scanAgentDirectory,
} from '../services/agentSync';
import type { Project, Sprint, Task } from '../types';
import type { AgentDiffResult, AuditLogEntry } from '../types/agent';

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
    saveAuditLogEntry: vi.fn(async () => {}),
    getActivityLog: vi.fn(async () => []),
    saveActivityLogEntry: vi.fn(async () => {}),
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
    description: '',
    category: 'Engineering',
    progress: 0,
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
        duration: '',
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
    expect(Object.keys(fs).length).toBe(10); // project.md, 5 tasks, 1 sprint, hooks/post-commit, AGENTS.md, CLAUDE.md
    expect(fs['/mock/vault/.taxon/project.md']).toContain('Integration Test Project');
    expect(fs['/mock/vault/.taxon/hooks/post-commit']).toContain('Taxon Auto-Sync Git Hook');
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

    const diff = diffAgentChanges(
      mockProject.id,
      mockTasks,
      mockSprints,
      parsedTasks,
      parsedSprints,
    );

    expect(diff.newTasks.length).toBe(1);
    expect(diff.newTasks[0]!.id).toBe('task-new');
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

    const diff = diffAgentChanges(
      mockProject.id,
      mockTasks,
      mockSprints,
      parsedTasks,
      parsedSprints,
    );

    expect(diff.newTasks.length).toBe(0);
    expect(diff.modifiedTasks.length).toBe(1);
    expect(diff.modifiedTasks[0]!.changedFields).toContain('priority');
    expect(diff.modifiedTasks[0]!.after.priority).toBe('High');
  });

  it('should preserve existing task dueDate when imported task has empty dueDate', async () => {
    const existingTasksWithDueDate: Task[] = [
      {
        ...mockTasks[0]!,
        dueDate: '2026-07-30',
      },
    ];

    const importedTaskWithNoDueDate: Task[] = [
      {
        ...mockTasks[0]!,
        dueDate: '',
      },
    ];

    const diff = diffAgentChanges(
      mockProject.id,
      existingTasksWithDueDate,
      mockSprints,
      importedTaskWithNoDueDate,
      [],
    );

    expect(diff.modifiedTasks.length).toBe(0);
    expect(importedTaskWithNoDueDate[0]!.dueDate).toBe('2026-07-30');
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

    const diff = diffAgentChanges(
      mockProject.id,
      mockTasks,
      mockSprints,
      parsedTasks,
      parsedSprints,
    );

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
    const diff = {
      newTasks: [mockTasks[0] as Task],
      modifiedTasks: [
        {
          before: mockTasks[1] as Task,
          after: { ...mockTasks[1], priority: 'High' } as Task,
          changedFields: ['priority'],
        },
      ],
      newSprints: [],
      modifiedSprints: [],
      warnings: [],
    } as AgentDiffResult;

    const stats = await applyAgentChanges(diff, mockProject.id);
    expect(stats.tasksApplied).toBe(2);
    expect(stats.sprintsApplied).toBe(0);
    expect(stats.auditEntries.length).toBe(2);

    const db = (dbMock as any)._getMockDb();
    expect(Object.keys(db.tasks).length).toBe(2);
    expect(db.tasks['task-0']).toBeDefined();
    expect(db.tasks['task-1'].priority).toBe('High');
  });

  it('should generate changelog markdown correctly', () => {
    const entries: AuditLogEntry[] = [
      {
        id: 'aud-1',
        projectId: 'proj-1',
        timestamp: '2026-07-24T12:00:00.000Z',
        action: 'task_created',
        entityType: 'task',
        entityId: 't1',
        entityTitle: 'New Auth Task',
      },
      {
        id: 'aud-2',
        projectId: 'proj-1',
        timestamp: '2026-07-24T12:05:00.000Z',
        action: 'task_modified',
        entityType: 'task',
        entityId: 't2',
        entityTitle: 'Database Migration',
        changedFields: ['status', 'priority'],
      },
    ];

    const changelog = generateChangelog(entries);

    expect(changelog).toContain('# Taxon AI Agent Changelog');
    expect(changelog).toContain('## 2026-07-24');
    expect(changelog).toContain('🆕 **12:00:00** — task created: *New Auth Task*');
    expect(changelog).toContain(
      '✏️ **12:05:00** — task modified: *Database Migration* (status, priority)',
    );
  });

  it('should skip archived tasks during export', async () => {
    const tasksWithArchived = [
      ...mockTasks,
      {
        id: 'archived-task',
        projectId: 'proj-1',
        title: 'Archived Task',
        description: '',
        priority: 'Low',
        status: 'Done',
        completed: true,
        labels: [],
        subtasks: [],
        timeSpent: 0,
        sortOrder: 0,
        archived: true,
        duration: '',
      } as Task,
    ];

    const result = await exportProjectToAgent(
      mockProject,
      tasksWithArchived,
      mockSprints,
      vaultPath,
    );

    expect(result.exportedTaskCount).toBe(5); // archived task skipped
    const fs = (fsMock as any)._getMockFs();
    expect(Object.keys(fs).some((p) => p.includes('archived-task'))).toBe(false);
  });

  it('should move archived task files to .taxon/archive directory', async () => {
    // Write 2 active tasks and 1 archived task file into mock fs
    const activeTaskMd = `---
id: task-active
title: Active Task
priority: Medium
status: To Do
archived: false
---
## Description
Active task.
`;
    const archivedTaskMd = `---
id: task-archived
title: Archived Task
priority: Low
status: Done
archived: true
---
## Description
Archived task.
`;
    await fsMock.writeTextFile('/mock/vault/.taxon/tasks/TASK-task-a-active-task.md', activeTaskMd);
    await fsMock.writeTextFile(
      '/mock/vault/.taxon/tasks/TASK-task-b-archived-task.md',
      archivedTaskMd,
    );

    const { movedCount, errors } = await cleanUpArchivedFiles(vaultPath);

    expect(movedCount).toBe(1);
    expect(errors.length).toBe(0);

    const fs = (fsMock as any)._getMockFs();
    expect(fs['/mock/vault/.taxon/tasks/TASK-task-a-active-task.md']).toBeDefined();
    expect(fs['/mock/vault/.taxon/tasks/TASK-task-b-archived-task.md']).toBeUndefined();
    expect(fs['/mock/vault/.taxon/archive/TASK-task-b-archived-task.md']).toBeDefined();
  });

  it('should detect and apply task status changes from In Progress to Need to Test', async () => {
    await exportProjectToAgent(mockProject, mockTasks, mockSprints, vaultPath);

    // AI agent updates TASK-task-0 to Need to Test
    const fs = (fsMock as any)._getMockFs();
    const taskPath = Object.keys(fs).find((p) => p.includes('TASK-task-0'));
    let content = fs[taskPath!];
    content = content.replace('status: To Do', 'status: Need to Test');
    await fsMock.writeTextFile(taskPath!, content);

    const { tasks: parsedTasks, sprints: parsedSprints } = await scanAgentDirectory(
      vaultPath,
      mockProject.id,
    );

    const diff = diffAgentChanges(
      mockProject.id,
      mockTasks,
      mockSprints,
      parsedTasks,
      parsedSprints,
    );

    expect(diff.modifiedTasks.length).toBe(1);
    expect(diff.modifiedTasks[0]!.after.status).toBe('Need to Test');

    const result = await applyAgentChanges(diff, mockProject.id);
    expect(result.tasksApplied).toBe(1);

    const db = (dbMock as any)._getMockDb();
    expect(db.tasks['task-0']!.status).toBe('Need to Test');
  });

  it('blocks status regression when allowStatusRegression is false (production mode)', () => {
    const existingTasks: Task[] = [
      {
        ...mockTasks[0]!,
        id: 't-reg-1',
        status: 'Need to Test',
        completed: false,
      },
    ];

    const agentTasks: Task[] = [
      {
        ...mockTasks[0]!,
        id: 't-reg-1',
        status: 'In Progress',
        completed: false,
      },
    ];

    const diff = diffAgentChanges(mockProject.id, existingTasks, [], agentTasks, [], {
      allowStatusRegression: false,
    });

    // Should prevent regression back to In Progress
    expect(diff.modifiedTasks.length).toBe(0);
    expect(agentTasks[0]!.status).toBe('Need to Test');
  });

  it('allows status regression when allowStatusRegression is true (development mode)', () => {
    const existingTasks: Task[] = [
      {
        ...mockTasks[0]!,
        id: 't-reg-2',
        status: 'Need to Test',
        completed: false,
      },
    ];

    const agentTasks: Task[] = [
      {
        ...mockTasks[0]!,
        id: 't-reg-2',
        status: 'In Progress',
        completed: false,
      },
    ];

    const diff = diffAgentChanges(mockProject.id, existingTasks, [], agentTasks, [], {
      allowStatusRegression: true,
    });

    // Should allow regression back to In Progress
    expect(diff.modifiedTasks.length).toBe(1);
    expect(diff.modifiedTasks[0]!.after.status).toBe('In Progress');
  });
});
