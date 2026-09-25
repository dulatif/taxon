import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useFocusTimer } from '../hooks/useFocusTimer';

describe('useFocusTimer - Auto Start Breaks & Pomodoros', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('automatically continues into short break when autoStartBreaks is true', () => {
    const onTimerComplete = vi.fn();
    const { result } = renderHook(() =>
      useFocusTimer({
        onTimerComplete,
        soundEnabled: false,
        workDuration: 1, // 1 minute = 60s
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 4,
        autoStartBreaks: true,
        autoStartPomodoros: false,
      }),
    );

    expect(result.current.phase).toBe('work');
    expect(result.current.timerSeconds).toBe(60);
    expect(result.current.timerIsRunning).toBe(false);

    // Start timer
    act(() => {
      result.current.toggleTimer();
    });
    expect(result.current.timerIsRunning).toBe(true);

    // Advance by 60 seconds to finish work session
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(onTimerComplete).toHaveBeenCalledWith(null, 'work');
    expect(result.current.phase).toBe('shortBreak');
    expect(result.current.timerSeconds).toBe(5 * 60);
    expect(result.current.timerIsRunning).toBe(true);
    expect(result.current.completedWorkSessions).toBe(1);
  });

  it('stops timer when autoStartBreaks is false', () => {
    const onTimerComplete = vi.fn();
    const { result } = renderHook(() =>
      useFocusTimer({
        onTimerComplete,
        soundEnabled: false,
        workDuration: 1,
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 4,
        autoStartBreaks: false,
        autoStartPomodoros: false,
      }),
    );

    act(() => {
      result.current.toggleTimer();
    });
    expect(result.current.timerIsRunning).toBe(true);

    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.phase).toBe('shortBreak');
    expect(result.current.timerSeconds).toBe(5 * 60);
    expect(result.current.timerIsRunning).toBe(false);
  });

  it('automatically starts next pomodoro after break when autoStartPomodoros is true', () => {
    const onTimerComplete = vi.fn();
    const { result } = renderHook(() =>
      useFocusTimer({
        onTimerComplete,
        soundEnabled: false,
        workDuration: 25,
        shortBreak: 1, // 1 minute break
        longBreak: 15,
        longBreakInterval: 4,
        autoStartBreaks: true,
        autoStartPomodoros: true,
      }),
    );

    // Switch to shortBreak and start running
    act(() => {
      result.current.switchPhase('shortBreak');
    });
    act(() => {
      result.current.toggleTimer();
    });

    expect(result.current.phase).toBe('shortBreak');
    expect(result.current.timerSeconds).toBe(60);
    expect(result.current.timerIsRunning).toBe(true);

    // Advance 60s
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(onTimerComplete).toHaveBeenCalledWith(null, 'shortBreak');
    expect(result.current.phase).toBe('work');
    expect(result.current.timerSeconds).toBe(25 * 60);
    expect(result.current.timerIsRunning).toBe(true);
  });

  it('transitions to longBreak after longBreakInterval work sessions', () => {
    const onTimerComplete = vi.fn();
    const { result } = renderHook(() =>
      useFocusTimer({
        onTimerComplete,
        soundEnabled: false,
        workDuration: 1,
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 2,
        autoStartBreaks: true,
        autoStartPomodoros: true,
      }),
    );

    act(() => {
      result.current.toggleTimer();
    });

    // Session 1 work -> shortBreak
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });
    expect(result.current.phase).toBe('shortBreak');

    // Switch to work for Session 2
    act(() => {
      result.current.switchPhase('work');
      result.current.toggleTimer();
    });

    // Session 2 work -> longBreak
    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });
    expect(result.current.phase).toBe('longBreak');
    expect(result.current.timerSeconds).toBe(15 * 60);
    expect(result.current.completedWorkSessions).toBe(2);
  });
});
