import { describe, expect, it } from 'vitest';
import { sortTasksWithQueueElevation } from '../hooks/useTaskActions';
import type { Task } from '../types';

describe('Queue Elevation Sorting', () => {
  const baseTask = (overrides: Partial<Task>): Task => ({
    id: 't-1',
    projectId: 'p-1',
    title: 'Task',
    completed: false,
    duration: '25m',
    priority: 'Medium',
    status: 'To Do',
    ...overrides,
  });

  it('elevates tasks in To Do with revisionCount > 0 above tasks with revisionCount = 0', () => {
    const regularTask1 = baseTask({ id: 't-1', title: 'Regular 1', sortOrder: 0 });
    const regularTask2 = baseTask({ id: 't-2', title: 'Regular 2', sortOrder: 1 });
    const revisedTask = baseTask({
      id: 't-rev',
      title: 'Revised Task',
      revisionCount: 1,
      sortOrder: 10,
    });

    const sorted = sortTasksWithQueueElevation([regularTask1, regularTask2, revisedTask]);
    expect(sorted[0]?.id).toBe('t-rev');
    expect(sorted[1]?.id).toBe('t-1');
    expect(sorted[2]?.id).toBe('t-2');
  });

  it('sorts multiple revised tasks by lastRevisionAt DESC', () => {
    const revOlder = baseTask({
      id: 't-rev-old',
      title: 'Older Revision',
      revisionCount: 1,
      lastRevisionAt: '2026-09-30T10:00:00Z',
    });
    const revNewer = baseTask({
      id: 't-rev-new',
      title: 'Newer Revision',
      revisionCount: 2,
      lastRevisionAt: '2026-09-30T12:00:00Z',
    });
    const regular = baseTask({ id: 't-regular', title: 'Regular', sortOrder: 0 });

    const sorted = sortTasksWithQueueElevation([regular, revOlder, revNewer]);
    expect(sorted[0]?.id).toBe('t-rev-new');
    expect(sorted[1]?.id).toBe('t-rev-old');
    expect(sorted[2]?.id).toBe('t-regular');
  });

  it('does NOT elevate escalated tasks (circuit breaker tripped)', () => {
    const escalatedTask = baseTask({
      id: 't-escalated',
      title: 'Escalated Task',
      revisionCount: 3,
      escalated: true,
      sortOrder: 5,
    });
    const regularTask = baseTask({
      id: 't-reg',
      title: 'Regular Task',
      sortOrder: 0,
    });
    const activeRevision = baseTask({
      id: 't-active-rev',
      title: 'Active Revision',
      revisionCount: 1,
      escalated: false,
      sortOrder: 10,
    });

    const sorted = sortTasksWithQueueElevation([escalatedTask, regularTask, activeRevision]);
    expect(sorted[0]?.id).toBe('t-active-rev');
    expect(sorted[1]?.id).toBe('t-reg');
    expect(sorted[2]?.id).toBe('t-escalated');
  });

  it('does not elevate non-To-Do revised tasks (e.g. Done or Need to Test)', () => {
    const doneRevised = baseTask({
      id: 't-done-rev',
      title: 'Done Revised',
      status: 'Done',
      completed: true,
      revisionCount: 2,
    });
    const todoTask = baseTask({
      id: 't-todo',
      title: 'To Do Regular',
      status: 'To Do',
      sortOrder: 0,
    });

    const sorted = sortTasksWithQueueElevation([doneRevised, todoTask]);
    expect(sorted[0]?.id).toBe('t-todo');
    expect(sorted[1]?.id).toBe('t-done-rev');
  });
});
