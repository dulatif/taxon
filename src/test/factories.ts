import type { Project, Sprint, SubTask, Task } from '../types';

let idCounter = 0;
const uniqueId = (prefix: string) => `${prefix}_test_${++idCounter}`;

/**
 * Create a test Task with sensible defaults.
 * Override any property by passing it in the overrides object.
 */
export function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: uniqueId('task'),
    projectId: null,
    title: 'Test Task',
    completed: false,
    duration: '45m',
    priority: 'Medium',
    status: 'To Do',
    dueDate: '',
    ...overrides,
  };
}

/**
 * Create a test Project with sensible defaults.
 */
export function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: uniqueId('project'),
    name: 'Test Project',
    description: 'A test project',
    category: 'Engineering',
    progress: 0,
    ...overrides,
  };
}

/**
 * Create a test Sprint with sensible defaults.
 */
export function createSprint(overrides: Partial<Sprint> = {}): Sprint {
  return {
    id: uniqueId('sprint'),
    projectId: 'project_test_1',
    name: 'Sprint 1',
    status: 'Active',
    startDate: '2026-01-01',
    endDate: '2026-01-14',
    ...overrides,
  };
}

/**
 * Create a test SubTask.
 */
export function createSubTask(overrides: Partial<SubTask> = {}): SubTask {
  return {
    id: uniqueId('sub'),
    title: 'Test Subtask',
    completed: false,
    ...overrides,
  };
}

/**
 * Create multiple tasks at once.
 */
export function createTasks(count: number, overrides: Partial<Task> = {}): Task[] {
  return Array.from({ length: count }, (_, i) =>
    createTask({ title: `Task ${i + 1}`, ...overrides }),
  );
}
