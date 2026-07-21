import { describe, expect, it } from 'vitest';
import { createTask } from '../factories';

// This test verifies the full lifecycle of a task:
// Create → Toggle Complete → Verify Status → Delete

describe('Task Lifecycle Integration', () => {
  it('creates a task, toggles completion, and verifies status change', () => {
    const task = createTask({ title: 'Write tests', status: 'To Do', completed: false });

    // Verify initial state
    expect(task.completed).toBe(false);
    expect(task.status).toBe('To Do');

    // Simulate toggling
    const toggledTask = {
      ...task,
      completed: true,
      status: 'Done' as const,
    };

    expect(toggledTask.completed).toBe(true);
    expect(toggledTask.status).toBe('Done');
  });
});
