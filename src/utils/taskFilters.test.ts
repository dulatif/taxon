import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createTask } from '../test/factories';

describe('task filtering', () => {
  const tasks = [
    createTask({
      id: '1',
      title: 'Active task',
      projectId: 'p1',
      completed: false,
      archived: false,
    }),
    createTask({ id: '2', title: 'Completed task', completed: true, archived: false }),
    createTask({ id: '3', title: 'Archived task', completed: true, archived: true }),
    createTask({ id: '4', title: 'Inbox task', projectId: null, dueDate: '', completed: false }),
    createTask({ id: '5', title: 'Scheduled task', dueDate: '2026-01-20', completed: false }),
  ];

  it('filters inbox tasks (no project, no due date, not completed)', () => {
    const inbox = tasks.filter((t) => !t.projectId && !t.dueDate && !t.completed && !t.archived);
    expect(inbox).toHaveLength(1);
    expect(inbox[0].title).toBe('Inbox task');
  });

  it('filters active (non-completed, non-archived) tasks', () => {
    const active = tasks.filter((t) => !t.completed && !t.archived);
    expect(active).toHaveLength(3);
  });

  it('filters archived tasks', () => {
    const archived = tasks.filter((t) => t.archived);
    expect(archived).toHaveLength(1);
    expect(archived[0].title).toBe('Archived task');
  });
});

describe('task sorting', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sorts by priority (Critical first)', () => {
    const tasks = [
      createTask({ priority: 'Low' }),
      createTask({ priority: 'Critical' }),
      createTask({ priority: 'Medium' }),
    ];

    const weights: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const sorted = [...tasks].sort(
      (a, b) => (weights[b.priority || 'Medium'] || 2) - (weights[a.priority || 'Medium'] || 2),
    );

    expect(sorted[0].priority).toBe('Critical');
    expect(sorted[1].priority).toBe('Medium');
    expect(sorted[2].priority).toBe('Low');
  });

  it('sorts by due date (earliest first, no date last)', () => {
    const tasks = [
      createTask({ dueDate: '2026-01-20' }),
      createTask({ dueDate: '' }),
      createTask({ dueDate: '2026-01-10' }),
    ];

    const sorted = [...tasks].sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

    expect(sorted[0].dueDate).toBe('2026-01-10');
    expect(sorted[1].dueDate).toBe('2026-01-20');
    expect(sorted[2].dueDate).toBe('');
  });
});
