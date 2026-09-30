import { describe, expect, it } from 'vitest';
import type { Task } from '../types';

describe('Circuit Breaker & Agent Escalation Guard', () => {
  const isCircuitBreakerTripped = (task: Pick<Task, 'revisionCount' | 'escalated'>): boolean => {
    return Boolean(task.escalated || (task.revisionCount ?? 0) >= 3);
  };

  const isEligibleForAutonomousExecution = (task: Task): boolean => {
    if (task.status !== 'To Do') return false;
    if (task.escalated) return false;
    if ((task.revisionCount ?? 0) >= 3) return false;
    return true;
  };

  const resetCircuitBreaker = (task: Task): Task => {
    return {
      ...task,
      escalated: false,
      revisionCount: 0,
    };
  };

  const sampleTask: Task = {
    id: 't-circuit',
    projectId: 'p-1',
    title: 'Flaky Auth Integration',
    status: 'To Do',
    completed: false,
    duration: '30m',
    priority: 'High',
    revisionCount: 2,
    escalated: false,
  };

  it('permits autonomous execution for normal revisions under threshold', () => {
    expect(isCircuitBreakerTripped(sampleTask)).toBe(false);
    expect(isEligibleForAutonomousExecution(sampleTask)).toBe(true);
  });

  it('trips circuit breaker and bars execution when revisionCount reaches 3', () => {
    const trippedTask: Task = {
      ...sampleTask,
      revisionCount: 3,
      escalated: true,
    };

    expect(isCircuitBreakerTripped(trippedTask)).toBe(true);
    expect(isEligibleForAutonomousExecution(trippedTask)).toBe(false);
  });

  it('resets circuit breaker clearing escalation and revision count', () => {
    const trippedTask: Task = {
      ...sampleTask,
      revisionCount: 3,
      escalated: true,
    };

    const restoredTask = resetCircuitBreaker(trippedTask);
    expect(restoredTask.escalated).toBe(false);
    expect(restoredTask.revisionCount).toBe(0);
    expect(isCircuitBreakerTripped(restoredTask)).toBe(false);
    expect(isEligibleForAutonomousExecution(restoredTask)).toBe(true);
  });
});
