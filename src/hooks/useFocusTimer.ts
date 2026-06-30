import { useState, useEffect, useCallback, useRef } from 'react';
import { Task } from '../types';
import { sendNotification } from '@tauri-apps/plugin-notification';

const DEFAULT_DURATION = 1500; // 25 minutes in seconds

interface UseFocusTimerOptions {
  onTimerComplete: (task: Task | null) => void;
  onTickFocusTime?: (task: Task | null) => void;
  soundEnabled: boolean;
}

interface UseFocusTimerReturn {
  timerSeconds: number;
  timerIsRunning: boolean;
  activeFocusTask: Task | null;
  isFocusModeActive: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  skipTimer: () => void;
  startFocusSession: (task: Task) => void;
  selectTaskToFocus: (task: Task) => void;
  unlinkTask: () => void;
  endFocusMode: () => void;
  minimizeFocusMode: () => void;
  launchFocusMode: () => void;
}

/**
 * Custom hook encapsulating all Pomodoro / Focus timer logic.
 * Extracted from App.tsx per TAXON-109.
 * - TAXON-110: On timer completion, fires `onTimerComplete` which auto-marks task as Done.
 * - TAXON-111: Plays an AudioContext sine wave beep on completion (respects soundEnabled).
 */
export function useFocusTimer({ onTimerComplete, onTickFocusTime, soundEnabled }: UseFocusTimerOptions): UseFocusTimerReturn {
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_DURATION);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);

  // Use ref to avoid stale closure for callbacks
  const onTimerCompleteRef = useRef(onTimerComplete);
  onTimerCompleteRef.current = onTimerComplete;

  const onTickFocusTimeRef = useRef(onTickFocusTime);
  onTickFocusTimeRef.current = onTickFocusTime;

  const activeFocusTaskRef = useRef(activeFocusTask);
  activeFocusTaskRef.current = activeFocusTask;

  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  /**
   * TAXON-111: Play a proper beep using AudioContext Web API.
   * Generates a sine wave tone at 880Hz for 200ms, then again after a short gap.
   */
  const playCompletionBeep = useCallback(() => {
    if (!soundEnabledRef.current) return;

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

      const playTone = (startTime: number, frequency: number, duration: number) => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);

        // Fade in/out to avoid click artifacts
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };

      const now = audioCtx.currentTime;
      // Double beep pattern
      playTone(now, 880, 0.2);
      playTone(now + 0.3, 1046.5, 0.25); // Higher C note

      // Clean up AudioContext after sounds play
      setTimeout(() => audioCtx.close().catch(() => {}), 1500);
    } catch {
      // Silently fail if AudioContext is not available
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (timerIsRunning) {
      interval = setInterval(() => {
        onTickFocusTimeRef.current?.(activeFocusTaskRef.current);
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            // Timer elapsed
            setTimerIsRunning(false);

            // TAXON-111: Play completion sound
            playCompletionBeep();

            // TAXON-210: Native Notification
            const currentTask = activeFocusTaskRef.current;
            sendNotification({
              title: 'Focus Complete',
              body: currentTask ? `You completed focus session for: ${currentTask.title}` : 'Your focus session has ended.',
            });

            // TAXON-110: Fire completion callback
            onTimerCompleteRef.current(currentTask);

            if (currentTask) {
              setActiveFocusTask(null);
            }

            return DEFAULT_DURATION;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerIsRunning, playCompletionBeep]);

  const toggleTimer = useCallback(() => {
    setTimerIsRunning((prev) => !prev);
  }, []);

  const resetTimer = useCallback(() => {
    setTimerSeconds(DEFAULT_DURATION);
    setTimerIsRunning(false);
  }, []);

  const skipTimer = useCallback(() => {
    setTimerSeconds(DEFAULT_DURATION);
    setTimerIsRunning(false);
  }, []);

  const startFocusSession = useCallback((task: Task) => {
    setActiveFocusTask(task);
    setTimerSeconds((prev) => (prev > 0 && prev < DEFAULT_DURATION ? prev : DEFAULT_DURATION));
    setTimerIsRunning(true);
    setIsFocusModeActive(true);
  }, []);

  const selectTaskToFocus = useCallback((task: Task) => {
    setActiveFocusTask(task);
    setTimerSeconds((prev) => (prev > 0 && prev < DEFAULT_DURATION ? prev : DEFAULT_DURATION));
    setTimerIsRunning(true);
  }, []);

  const unlinkTask = useCallback(() => {
    setActiveFocusTask(null);
  }, []);

  const endFocusMode = useCallback(() => {
    setTimerIsRunning(false);
    setIsFocusModeActive(false);
  }, []);

  const minimizeFocusMode = useCallback(() => {
    setIsFocusModeActive(false);
  }, []);

  const launchFocusMode = useCallback(() => {
    setIsFocusModeActive(true);
  }, []);

  return {
    timerSeconds,
    timerIsRunning,
    activeFocusTask,
    isFocusModeActive,
    toggleTimer,
    resetTimer,
    skipTimer,
    startFocusSession,
    selectTaskToFocus,
    unlinkTask,
    endFocusMode,
    minimizeFocusMode,
    launchFocusMode,
  };
}
