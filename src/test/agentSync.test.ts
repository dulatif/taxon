import { describe, expect, it } from 'vitest';
import {
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
      expect(taskFilename(task)).toBe('TASK-abc12d-my-task.md');

      const sprint = { id: 'jkl78mno', name: 'v1 MVP' } as Sprint;
      expect(sprintFilename(sprint)).toBe('SPRINT-jkl78m-v1-mvp.md');
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
        subtasks: [
          { id: 'sub-1', title: 'Subtask 1', completed: true },
          { id: 'sub-2', title: 'Subtask 2', completed: false },
        ],
      };

      const markdown = taskToMarkdown(task);
      const parsedTask = markdownToTask(markdown, 'proj-1');

      expect(parsedTask.title).toBe(task.title);
      expect(parsedTask.description).toBe(task.description);
      expect(parsedTask.priority).toBe(task.priority);
      expect(parsedTask.status).toBe(task.status);
      expect(parsedTask.labels).toEqual(task.labels);
      expect(parsedTask.timeEffort).toBe(task.timeEffort);
      expect(parsedTask.timeSpent).toBe(task.timeSpent);
      expect(parsedTask.subtasks!.length).toBe(2);
      expect(parsedTask.subtasks![0]!.title).toBe('Subtask 1');
      expect(parsedTask.subtasks![0]!.completed).toBe(true);
      expect(parsedTask.subtasks![1]!.title).toBe('Subtask 2');
      expect(parsedTask.subtasks![1]!.completed).toBe(false);
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
        { id: 'task-1', title: 'Task 1', sprintId: 'sprint-1' } as Task,
        { id: 'task-2', title: 'Task 2', sprintId: 'sprint-2' } as Task,
      ];

      const markdown = sprintToMarkdown(sprint, tasks);
      expect(markdown).toContain('TASK-task-1-task-1.md');
      expect(markdown).not.toContain('TASK-task-2-task-2.md');

      const parsedSprint = markdownToSprint(markdown, 'proj-1');
      expect(parsedSprint.name).toBe(sprint.name);
      expect(parsedSprint.goal).toBe(sprint.goal);
      expect(parsedSprint.status).toBe(sprint.status);
    });
  });

  describe('Project Metadata Serialization (AGENT-106)', () => {
    it('should roundtrip project serialization', () => {
      const project: Project = {
        id: 'proj-1',
        name: 'Project 1',
        description: 'Project description',
        category: 'Work',
        progress: 50,
      };

      const markdown = projectToMarkdown(project);
      const parsedProject = markdownToProject(markdown);

      expect(parsedProject.name).toBe(project.name);
      expect(parsedProject.description).toBe(project.description);
      expect(parsedProject.category).toBe(project.category);
      expect(parsedProject.progress).toBe(project.progress);
    });
  });
});
