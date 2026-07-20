import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatDateStr,
  formatDisplayDate,
  formatMinutes,
  getPresetDates,
  getTodayStr,
} from './format-date';

describe('formatDateStr', () => {
  it('formats a Date as YYYY-MM-DD', () => {
    const date = new Date(2026, 0, 15); // January 15, 2026
    expect(formatDateStr(date)).toBe('2026-01-15');
  });

  it('pads single-digit months and days', () => {
    const date = new Date(2026, 2, 5); // March 5, 2026
    expect(formatDateStr(date)).toBe('2026-03-05');
  });
});

describe('formatDisplayDate', () => {
  beforeEach(() => {
    // Mock "today" to be January 15, 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Unscheduled" for empty string', () => {
    expect(formatDisplayDate('')).toBe('Unscheduled');
  });

  it('returns "Unscheduled" for undefined', () => {
    expect(formatDisplayDate(undefined)).toBe('Unscheduled');
  });

  it("returns 'Today' for today's date", () => {
    expect(formatDisplayDate('2026-01-15')).toBe('Today');
  });

  it("returns 'Tomorrow' for tomorrow's date", () => {
    expect(formatDisplayDate('2026-01-16')).toBe('Tomorrow');
  });

  it('returns formatted date for other dates', () => {
    const result = formatDisplayDate('2026-01-20');
    expect(result).toContain('Jan');
    expect(result).toContain('20');
  });

  it('returns the raw string for invalid dates', () => {
    expect(formatDisplayDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatMinutes', () => {
  it('returns "0m" for undefined', () => {
    expect(formatMinutes(undefined)).toBe('0m');
  });

  it('returns "0m" for zero', () => {
    expect(formatMinutes(0)).toBe('0m');
  });

  it('formats minutes only', () => {
    expect(formatMinutes(45)).toBe('45m');
  });

  it('formats hours only', () => {
    expect(formatMinutes(120)).toBe('2h');
  });

  it('formats hours and minutes', () => {
    expect(formatMinutes(150)).toBe('2h 30m');
  });
});

describe('getTodayStr', () => {
  it('returns today as YYYY-MM-DD', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 20)); // July 20, 2026
    expect(getTodayStr()).toBe('2026-07-20');
    vi.useRealTimers();
  });
});

describe('getPresetDates', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 15)); // Thursday, Jan 15, 2026
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 5 preset options', () => {
    const presets = getPresetDates();
    expect(presets).toHaveLength(5);
  });

  it('first preset is "Today"', () => {
    const presets = getPresetDates();
    expect(presets[0].label).toBe('Today');
    expect(presets[0].date).toBe('2026-01-15');
  });

  it('second preset is "Tomorrow"', () => {
    const presets = getPresetDates();
    expect(presets[1].label).toBe('Tomorrow');
    expect(presets[1].date).toBe('2026-01-16');
  });
});
