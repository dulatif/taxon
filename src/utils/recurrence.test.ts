import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecurrenceRule } from '../types';
import { calculateNextDueDate } from './recurrence';

describe('calculateNextDueDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15)); // Thursday, Jan 15, 2026
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty string when no rule provided', () => {
    expect(calculateNextDueDate('2026-01-15')).toBe('2026-01-15');
  });

  describe('daily recurrence', () => {
    it('advances by 1 day with interval=1', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
      expect(calculateNextDueDate('2026-01-15', rule)).toBe('2026-01-16');
    });

    it('advances by N days with interval=N', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 3 };
      expect(calculateNextDueDate('2026-01-15', rule)).toBe('2026-01-18');
    });
  });

  describe('weekdays recurrence', () => {
    it('skips weekends (Thu → Fri)', () => {
      const rule: RecurrenceRule = { frequency: 'weekdays' };
      expect(calculateNextDueDate('2026-01-15', rule)).toBe('2026-01-16'); // Fri
    });

    it('skips weekends (Fri → Mon)', () => {
      const rule: RecurrenceRule = { frequency: 'weekdays' };
      expect(calculateNextDueDate('2026-01-16', rule)).toBe('2026-01-19'); // Mon
    });
  });

  describe('weekly recurrence', () => {
    it('advances by 7 days with no specific days', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 1 };
      expect(calculateNextDueDate('2026-01-15', rule)).toBe('2026-01-22');
    });

    it('advances by 2 weeks with interval=2', () => {
      const rule: RecurrenceRule = { frequency: 'weekly', interval: 2 };
      expect(calculateNextDueDate('2026-01-15', rule)).toBe('2026-01-29');
    });
  });

  describe('monthly recurrence', () => {
    it('advances by 1 month', () => {
      const rule: RecurrenceRule = { frequency: 'monthly', interval: 1 };
      expect(calculateNextDueDate('2026-01-15', rule)).toBe('2026-02-15');
    });
  });

  describe('yearly recurrence', () => {
    it('advances by 1 year', () => {
      const rule: RecurrenceRule = { frequency: 'yearly', interval: 1 };
      expect(calculateNextDueDate('2026-01-15', rule)).toBe('2027-01-15');
    });
  });

  describe('edge cases', () => {
    it('uses today when currentDate is empty', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
      expect(calculateNextDueDate('', rule)).toBe('2026-01-16');
    });

    it('uses today when currentDate is in the past', () => {
      const rule: RecurrenceRule = { frequency: 'daily', interval: 1 };
      expect(calculateNextDueDate('2025-01-01', rule)).toBe('2026-01-15');
    });
  });
});
