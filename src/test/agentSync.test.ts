import { describe, expect, it } from 'vitest';
import {
  generateContextSnapshot,
  generatePostCommitHook,
  generateShortId,
  markdownToProject,
  markdownToSprint,
  markdownToTask,
  parseFrontmatter,
  projectToMarkdown,
  serializeFrontmatter,
  slugify,
  sprintFilename,
  sprintToMarkdown,
  taskFilename,
  taskToMarkdown,
} from '../services/agentSync';
import type { Project, Sprint, Task } from '../types';

describe('agentSync Service', () => {
  describe('Frontmatter Parsing/Serialization (AGENT-102)', () => {
    it('should roundtrip frontmatter serialization', () => {
      const data = {
        id: 'task-123',
        title: 'Test',
        completed: false,
        time: 5,
        labels: ['a', 'b', 'c'],
      };
      const serialized = serializeFrontmatter(data);
      const { data: parsedData } = parseFrontmatter(serialized);
      expect(parsedData).toEqual(data);
    });

    it('should handle undefined and null in frontmatter serialization', () => {
      const data = {
        id: '123',
        missing: undefined,
        empty: null,
      };
      const serialized = serializeFrontmatter(data);
      expect(serialized).not.toContain('missing');
      expect(serialized).not.toContain('empty');
    });

    it('should parse body correctly', () => {
      const markdown = `---
id: 123
---
## Description
Hello World
`;
      const { data, body } = parseFrontmatter(markdown);
      expect(data.id).toBe(123);
      expect(body.trim()).toBe(`## Description
Hello World`);
    });
  });

  describe('Slugify and ID Generation (AGENT-103)', () => {
    it('should slugify strings', () => {
      expect(slugify('Implement Auth Middleware!')).toBe('implement-auth-middleware');
      expect(slugify('  Hello   World  ')).toBe('hello-world');
      expect(slugify('A'.repeat(100))).toBe('a'.repeat(50));
    });

    it('should generate short IDs', () => {
      const id = generateShortId();
      expect(id.length).toBe(6);
      expect(typeof id).toBe('string');
    });

    it('should generate task and sprint filenames', () => {
      const task = { id: 'abc12def789', title: 'My Task' } as Task;
      expect(taskFilename(task)).toBe('TASK-def789-my-task.md');

      const sprint = { id: 'jkl78mno', name: 'v1 MVP' } as Sprint;
      expect(sprintFilename(sprint)).toBe('SPRINT-l78mno-v1-mvp.md');
    });
  });

  describe('Task Serialization (AGENT-104)', () => {
    it('should roundtrip task serialization', () => {
      const task: Task = {
        id: 'abc12def',
        projectId: 'proj-1',
        title: 'Test Task',
        description: 'This is a description.',
        priority: 'High',
        status: 'In Progress',
        completed: false,
        labels: ['bug'],
        timeEffort: 10,
        timeSpent: 5,
        sortOrder: 1,
        archived: false,
        duration: '',
        workspacePath: '/mnt/Linux/Projects/taxon',
        linkedFiles: ['src/App.tsx'],
        dependsOn: ['TASK-111111', 'TASK-222222'],
        moduleGroup: 'Authentication',
        subtasks: [
          { id: 'sub-1', title: 'Subtask 1', completed: true },
          { id: 'sub-2', title: 'Subtask 2', completed: false },
        ],
      };

      const markdown = taskToMarkdown(task);
      expect(markdown).toContain('dependsOn: [TASK-111111, TASK-222222]');
      expect(markdown).toContain('moduleGroup: Authentication');

      const parsedTask = markdownToTask(markdown, 'proj-1');

      expect(parsedTask.title).toBe(task.title);
      expect(parsedTask.description).toBe(task.description);
      expect(parsedTask.priority).toBe(task.priority);
      expect(parsedTask.status).toBe(task.status);
      expect(parsedTask.labels).toEqual(task.labels);
      expect(parsedTask.dependsOn).toEqual(['TASK-111111', 'TASK-222222']);
      expect(parsedTask.moduleGroup).toBe('Authentication');
      expect(parsedTask.timeEffort).toBe(task.timeEffort);
      expect(parsedTask.timeSpent).toBe(task.timeSpent);
      expect(parsedTask.subtasks!.length).toBe(2);
      expect(parsedTask.subtasks![0]!.title).toBe('Subtask 1');
      expect(parsedTask.subtasks![0]!.completed).toBe(true);
      expect(parsedTask.subtasks![1]!.title).toBe('Subtask 2');
      expect(parsedTask.subtasks![1]!.completed).toBe(false);
    });

    it('should parse markdown task without dependsOn or moduleGroup gracefully', () => {
      const markdown = `---
id: task-abc
title: Simple Task
priority: Medium
status: To Do
completed: false
---
## Description
No workflow metadata
`;
      const parsed = markdownToTask(markdown, 'proj-1');
      expect(parsed.dependsOn).toEqual([]);
      expect(parsed.moduleGroup).toBeUndefined();
    });
  });

  describe('Sprint Serialization (AGENT-105)', () => {
    it('should roundtrip sprint serialization', () => {
      const sprint: Sprint = {
        id: 'sprint-1',
        projectId: 'proj-1',
        name: 'Sprint 1',
        goal: 'The goal of the sprint.',
        status: 'Active',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      };

      const tasks: Task[] = [
        {
          id: 'task-1',
          title: 'Task 1',
          sprintId: 'sprint-1',
          priority: 'High',
          status: 'To Do',
          completed: false,
        } as Task,
        {
          id: 'task-2',
          title: 'Task 2',
          sprintId: 'sprint-2',
          priority: 'Medium',
          status: 'To Do',
          completed: false,
        } as Task,
      ];

      const markdown = sprintToMarkdown(sprint, tasks);
      expect(markdown).toContain('[High] TASK-task-1-task-1.md');
      expect(markdown).not.toContain('TASK-task-2-task-2.md');

      const parsedSprint = markdownToSprint(markdown, 'proj-1');
      expect(parsedSprint.name).toBe(sprint.name);
      expect(parsedSprint.goal).toBe(sprint.goal);
      expect(parsedSprint.status).toBe(sprint.status);
    });
  });

  describe('Project Metadata Serialization (AGENT-106)', () => {
    const project: Project = {
      id: 'proj-1',
      name: 'Project 1',
      description: 'Project description',
      category: 'Work',
      progress: 50,
    };

    it('should roundtrip project serialization', () => {
      const markdown = projectToMarkdown(project);
      const parsedProject = markdownToProject(markdown);

      expect(parsedProject.name).toBe(project.name);
      expect(parsedProject.description).toBe(project.description);
      expect(parsedProject.category).toBe(project.category);
      expect(parsedProject.progress).toBe(project.progress);
    });

    it('should append empty tasks index if no tasks', () => {
      const markdown = projectToMarkdown(project, [], []);
      expect(markdown).toContain('## Tasks Index');
      expect(markdown).toContain('*No active tasks*');
    });

    it('should generate task index with proper sorting and escaping', () => {
      const sprints: Sprint[] = [
        {
          id: 'sprint-1',
          name: 'Sprint Alpha',
          projectId: 'proj-1',
          status: 'Active',
          goal: '',
          startDate: '',
          endDate: '',
        },
      ];

      const tasks: Task[] = [
        {
          id: 't1',
          title: 'Task | One',
          priority: 'Low',
          status: 'To Do',
          sprintId: 'sprint-1',
          archived: false,
        } as Task,
        {
          id: 't2',
          title: 'Task Two',
          priority: 'Critical',
          status: 'In Progress',
          sprintId: 'sprint-1',
          archived: false,
        } as Task,
        {
          id: 't3',
          title: 'Task Three',
          priority: 'High',
          status: 'To Do',
          sprintId: undefined,
          archived: false,
        } as Task,
        {
          id: 't4',
          title: 'Task Four',
          priority: 'High',
          status: 'To Do',
          sprintId: 'sprint-1',
          archived: true,
        } as Task, // should be excluded
      ];

      const markdown = projectToMarkdown(project, tasks, sprints);

      expect(markdown).toContain('## Tasks Index');
      expect(markdown).not.toContain('Task Four'); // archived

      // Check escaping
      expect(markdown).toContain('Task \\| One');

      // Check rows and sorting
      // Sprint Alpha (Critical) -> t2
      // Sprint Alpha (Low) -> t1
      // Backlog (High) -> t3
      const t2Index = markdown.indexOf('| t2 | Task Two');
      const t1Index = markdown.indexOf('| t1 | Task \\| One');
      const t3Index = markdown.indexOf('| t3 | Task Three');

      expect(t2Index).toBeLessThan(t1Index);
      expect(t1Index).toBeLessThan(t3Index);
    });
  });

  describe('Context Snapshot (Feature 1)', () => {
    const project: Project = {
      id: 'proj-1',
      name: 'Taxon Project',
      description: '',
      category: 'Dev',
      progress: 0,
    };

    it('should generate snapshot with active tasks grouped by sprint and backlog', () => {
      const sprints: Sprint[] = [
        {
          id: 'sprint-1',
          name: 'Sprint 1',
          projectId: 'proj-1',
          status: 'Active',
          startDate: '',
          endDate: '',
          goal: '',
        },
      ];

      const tasks: Task[] = [
        {
          id: 't1',
          projectId: 'proj-1',
          title: 'In Progress Task',
          status: 'In Progress',
          priority: 'High',
          sprintId: 'sprint-1',
          archived: false,
        } as Task,
        {
          id: 't2',
          projectId: 'proj-1',
          title: 'To Do Backlog Task',
          status: 'To Do',
          priority: 'Critical',
          sprintId: undefined,
          archived: false,
        } as Task,
        {
          id: 't3',
          projectId: 'proj-1',
          title: 'Done Task',
          status: 'Done',
          priority: 'Low',
          sprintId: 'sprint-1',
          archived: false,
        } as Task, // Excluded because status is Done
        {
          id: 't4',
          projectId: 'proj-1',
          title: 'Archived Task',
          status: 'To Do',
          priority: 'Medium',
          sprintId: 'sprint-1',
          archived: true,
        } as Task, // Excluded because archived: true
      ];

      const snapshot = generateContextSnapshot(project, tasks, sprints);

      expect(snapshot).toContain('## Project: Taxon Project');
      expect(snapshot).toContain('### Sprint: Sprint 1 (Active)');
      expect(snapshot).toContain('- [High] In Progress Task');
      expect(snapshot).toContain('### Backlog');
      expect(snapshot).toContain('- [Critical] To Do Backlog Task');
      expect(snapshot).not.toContain('Done Task');
      expect(snapshot).not.toContain('Archived Task');
      expect(snapshot).toContain('Tasks: 2 active');
    });

    it('should return no active tasks message if no tasks are active', () => {
      const snapshot = generateContextSnapshot(project, [], []);
      expect(snapshot).toContain('*No active tasks*');
    });

    it('should filter context snapshot by selectedSprintId', () => {
      const sprints: Sprint[] = [
        {
          id: 'sprint-1',
          name: 'Sprint 1',
          projectId: 'proj-1',
          status: 'Active',
          startDate: '',
          endDate: '',
          goal: '',
        },
      ];

      const tasks: Task[] = [
        {
          id: 't1',
          projectId: 'proj-1',
          title: 'Sprint Task',
          status: 'In Progress',
          priority: 'High',
          sprintId: 'sprint-1',
          archived: false,
        } as Task,
        {
          id: 't2',
          projectId: 'proj-1',
          title: 'Backlog Task',
          status: 'To Do',
          priority: 'Critical',
          sprintId: undefined,
          archived: false,
        } as Task,
      ];

      const sprintOnlySnapshot = generateContextSnapshot(project, tasks, sprints, 'sprint-1');
      expect(sprintOnlySnapshot).toContain('Sprint 1');
      expect(sprintOnlySnapshot).toContain('Sprint Task');
      expect(sprintOnlySnapshot).not.toContain('Backlog Task');

      const backlogOnlySnapshot = generateContextSnapshot(project, tasks, sprints, 'backlog');
      expect(backlogOnlySnapshot).toContain('Backlog');
      expect(backlogOnlySnapshot).toContain('Backlog Task');
      expect(backlogOnlySnapshot).not.toContain('Sprint Task');
    });
  });

  describe('Git Hooks (Feature 3)', () => {
    it('should generate post-commit hook script with sqlite3 command', () => {
      const hookScript = generatePostCommitHook();
      expect(hookScript).toContain('#!/bin/bash');
      expect(hookScript).toContain('# Taxon Auto-Sync Git Hook');
      expect(hookScript).toContain("grep -oE 'TASK-[a-zA-Z0-9]{6}'");
      expect(hookScript).toContain(
        'sqlite3 "$DB_PATH" "UPDATE tasks SET completed = 0, status = \'Need to Test\' WHERE id LIKE \'%$SHORT_ID%\';"',
      );
    });
  });
});
