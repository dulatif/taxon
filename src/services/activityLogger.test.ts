import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityLogEntry, DailyActivity } from '../types';
import {
  aggregateActivityData,
  createLogEntry,
  getCompletionsToday,
  getCurrentWeekActivity,
  getFocusedHoursToday,
  updateDailyActivityWithCompletion,
} from './activityLogger';

describe('activityLogger', () => {
  beforeEach(() => {
    // Mock today to Wednesday, July 15, 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createLogEntry', () => {
    it('creates an activity log entry with timestamp and id', () => {
      const entry = createLogEntry('task_123', 'Implement feature');
      expect(entry.taskId).toBe('task_123');
      expect(entry.taskTitle).toBe('Implement feature');
      expect(entry.completedAt).toBeDefined();
      expect(entry.id).toContain('log_');
    });
  });

  describe('getCurrentWeekActivity', () => {
    it('generates 7 days from Monday to Sunday for the current week', () => {
      const mockDailyActivity: DailyActivity[] = [
        {
          date: '2026-07-15',
          day: 'Wed',
          hours: 1.5,
          completions: 2,
          isToday: true,
        },
        {
          date: '2026-07-13',
          day: 'Mon',
          hours: 0.8,
          completions: 1,
          isToday: false,
        },
      ];

      const week = getCurrentWeekActivity(mockDailyActivity);
      expect(week).toHaveLength(7);
      expect(week[0]!.day).toBe('Mon');
      expect(week[0]!.date).toBe('2026-07-13');
      expect(week[0]!.hours).toBe(0.8);
      expect(week[0]!.completions).toBe(1);
      expect(week[0]!.isToday).toBe(false);

      expect(week[2]!.day).toBe('Wed');
      expect(week[2]!.date).toBe('2026-07-15');
      expect(week[2]!.hours).toBe(1.5);
      expect(week[2]!.completions).toBe(2);
      expect(week[2]!.isToday).toBe(true);

      expect(week[6]!.day).toBe('Sun');
      expect(week[6]!.date).toBe('2026-07-19');
      expect(week[6]!.hours).toBe(0);
      expect(week[6]!.isToday).toBe(false);
    });
  });

  describe('updateDailyActivityWithCompletion', () => {
    it('updates today existing entry with incremented completions and hours', () => {
      const initial: DailyActivity[] = [
        {
          date: '2026-07-15',
          day: 'Wed',
          hours: 1.0,
          completions: 1,
          isToday: true,
        },
        {
          date: '2026-07-14',
          day: 'Tue',
          hours: 2.0,
          completions: 3,
          isToday: false,
        },
      ];

      const updated = updateDailyActivityWithCompletion(initial, 0.5);
      const todayAct = updated.find((a) => a.date === '2026-07-15');
      expect(todayAct).toBeDefined();
      expect(todayAct?.hours).toBe(1.5);
      expect(todayAct?.completions).toBe(2);
      expect(todayAct?.isToday).toBe(true);
    });

    it('creates new entry for today if not present', () => {
      const initial: DailyActivity[] = [
        {
          date: '2026-07-14',
          day: 'Tue',
          hours: 2.0,
          completions: 3,
          isToday: true,
        },
      ];

      const updated = updateDailyActivityWithCompletion(initial, 0.25);
      expect(updated).toHaveLength(2);
      const todayAct = updated.find((a) => a.date === '2026-07-15');
      expect(todayAct).toBeDefined();
      expect(todayAct?.hours).toBe(0.25);
      expect(todayAct?.completions).toBe(1);
      expect(todayAct?.isToday).toBe(true);

      const yesterdayAct = updated.find((a) => a.date === '2026-07-14');
      expect(yesterdayAct?.isToday).toBe(false);
    });
  });

  describe('getCompletionsToday & getFocusedHoursToday', () => {
    it('calculates completions and focus hours for today', () => {
      const log: ActivityLogEntry[] = [
        {
          id: '1',
          taskId: 't1',
          taskTitle: 'Task 1',
          completedAt: '2026-07-15T09:00:00.000Z',
        },
        {
          id: '2',
          taskId: 't2',
          taskTitle: 'Task 2',
          completedAt: '2026-07-15T11:00:00.000Z',
        },
        {
          id: '3',
          taskId: 't3',
          taskTitle: 'Task 3',
          completedAt: '2026-07-14T11:00:00.000Z',
        },
      ];

      const acts: DailyActivity[] = [
        {
          date: '2026-07-15',
          day: 'Wed',
          hours: 2.45,
          completions: 2,
          isToday: true,
        },
      ];

      expect(getCompletionsToday(log)).toBe(2);
      expect(getFocusedHoursToday(acts)).toBe(2.5);
    });
  });

  describe('aggregateActivityData', () => {
    it('calculates focusVelocity, taskAccomplishments, and streak', () => {
      const log: ActivityLogEntry[] = [
        {
          id: '1',
          taskId: 't1',
          taskTitle: 'Task 1',
          completedAt: '2026-07-15T09:00:00.000Z',
        },
        {
          id: '2',
          taskId: 't2',
          taskTitle: 'Task 2',
          completedAt: '2026-07-14T09:00:00.000Z',
        },
        {
          id: '3',
          taskId: 't3',
          taskTitle: 'Task 3',
          completedAt: '2026-07-13T09:00:00.000Z',
        },
      ];

      const metrics = aggregateActivityData(log, 5);
      expect(metrics.taskAccomplishments).toBe(3);
      expect(metrics.focusVelocity).toBe(60);
      expect(metrics.streak).toBe(3);
    });
  });
});
