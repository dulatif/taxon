import { sendNotification } from '@tauri-apps/plugin-notification';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Task } from '../types';

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak';

interface UseFocusTimerOptions {
  onTimerComplete: (task: Task | null, phase: PomodoroPhase) => void;
  onTickFocusTime?: (task: Task | null) => void;
  soundEnabled: boolean;
  workDuration?: number; // in minutes
  shortBreak?: number; // in minutes
  longBreak?: number; // in minutes
  longBreakInterval?: number; // count
}

interface UseFocusTimerReturn {
  timerSeconds: number;
  timerIsRunning: boolean;
  activeFocusTask: Task | null;
  isFocusModeActive: boolean;
  phase: PomodoroPhase;
  completedWorkSessions: number;
  switchPhase: (newPhase: PomodoroPhase) => void;
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
 */
export function useFocusTimer({
  onTimerComplete,
  onTickFocusTime,
  soundEnabled,
  workDuration = 25,
  shortBreak = 5,
  longBreak = 15,
  longBreakInterval = 4,
}: UseFocusTimerOptions): UseFocusTimerReturn {
  const [phase, setPhase] = useState<PomodoroPhase>('work');
  const [completedWorkSessions, setCompletedWorkSessions] = useState(0);
  const [timerSeconds, setTimerSeconds] = useState(workDuration * 60);
  const [timerIsRunning, setTimerIsRunning] = useState(false);
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);
  const [isFocusModeActive, setIsFocusModeActive] = useState(false);

  const onTimerCompleteRef = useRef(onTimerComplete);
  const onTickFocusTimeRef = useRef(onTickFocusTime);
  const activeFocusTaskRef = useRef(activeFocusTask);
  const soundEnabledRef = useRef(soundEnabled);
  const phaseRef = useRef(phase);
  const completedWorkSessionsRef = useRef(completedWorkSessions);
  const workDurationRef = useRef(workDuration);
  const shortBreakRef = useRef(shortBreak);
  const longBreakRef = useRef(longBreak);
  const longBreakIntervalRef = useRef(longBreakInterval);

  useEffect(() => {
    onTimerCompleteRef.current = onTimerComplete;
    onTickFocusTimeRef.current = onTickFocusTime;
    activeFocusTaskRef.current = activeFocusTask;
    soundEnabledRef.current = soundEnabled;
    phaseRef.current = phase;
    completedWorkSessionsRef.current = completedWorkSessions;
    workDurationRef.current = workDuration;
    shortBreakRef.current = shortBreak;
    longBreakRef.current = longBreak;
    longBreakIntervalRef.current = longBreakInterval;
  });

  // Sync initial timerSeconds when duration settings change (if timer not actively running)
  const prevWorkDurationRef = useRef(workDuration);
  useEffect(() => {
    if (prevWorkDurationRef.current !== workDuration) {
      prevWorkDurationRef.current = workDuration;
      if (phase === 'work' && !timerIsRunning) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTimerSeconds(workDuration * 60);
      }
    }
  }, [workDuration, timerIsRunning, phase]);

  /**
   * TAXON-111: Play a proper beep using AudioContext Web API.
   * Generates a sine wave tone at 880Hz for 200ms, then again after a short gap.
   */
  const playCompletionBeep = useCallback(() => {
    if (!soundEnabledRef.current) return;

    try {
      const audioCtx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )();

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
        if (phaseRef.current === 'work') {
          onTickFocusTimeRef.current?.(activeFocusTaskRef.current);
        }
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            // Timer elapsed
            setTimerIsRunning(false);

            // Play completion sound
            playCompletionBeep();

            const currentTask = activeFocusTaskRef.current;
            const currentPhase = phaseRef.current;

            if (currentPhase === 'work') {
              const nextCount = completedWorkSessionsRef.current + 1;
              setCompletedWorkSessions(nextCount);
              sendNotification({
                title: 'Work Session Complete!',
                body: currentTask
                  ? `Good job on: ${currentTask.title}. Time for a break!`
                  : 'Time for a break!',
              });
              onTimerCompleteRef.current(currentTask, 'work');

              if (nextCount % longBreakIntervalRef.current === 0) {
                setPhase('longBreak');
                return longBreakRef.current * 60;
              } else {
                setPhase('shortBreak');
                return shortBreakRef.current * 60;
              }
            } else {
              sendNotification({
                title: 'Break Ended!',
                body: 'Time to get back to focus.',
              });
              onTimerCompleteRef.current(currentTask, currentPhase);
              setPhase('work');
              return workDurationRef.current * 60;
            }
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
    if (phase === 'work') setTimerSeconds(workDuration * 60);
    else if (phase === 'shortBreak') setTimerSeconds(shortBreak * 60);
    else setTimerSeconds(longBreak * 60);
    setTimerIsRunning(false);
  }, [phase, workDuration, shortBreak, longBreak]);

  const switchPhase = useCallback((newPhase: PomodoroPhase) => {
    setTimerIsRunning(false);
    setPhase(newPhase);
    if (newPhase === 'work') setTimerSeconds(workDurationRef.current * 60);
    else if (newPhase === 'shortBreak') setTimerSeconds(shortBreakRef.current * 60);
    else setTimerSeconds(longBreakRef.current * 60);
  }, []);

  const skipTimer = useCallback(() => {
    setTimerIsRunning(false);
    if (phaseRef.current === 'work') {
      const nextCount = completedWorkSessionsRef.current + 1;
      setCompletedWorkSessions(nextCount);
      if (nextCount % longBreakIntervalRef.current === 0) {
        setPhase('longBreak');
        setTimerSeconds(longBreakRef.current * 60);
      } else {
        setPhase('shortBreak');
        setTimerSeconds(shortBreakRef.current * 60);
      }
    } else {
      setPhase('work');
      setTimerSeconds(workDurationRef.current * 60);
    }
  }, []);

  const startFocusSession = useCallback((task: Task) => {
    setActiveFocusTask(task);
    const workSecs = workDurationRef.current * 60;
    setTimerSeconds((prev) => (prev > 0 && prev < workSecs ? prev : workSecs));
    setPhase('work');
    setTimerIsRunning(true);
    setIsFocusModeActive(true);
  }, []);

  const selectTaskToFocus = useCallback((task: Task) => {
    setActiveFocusTask(task);
    const workSecs = workDurationRef.current * 60;
    setTimerSeconds((prev) => (prev > 0 && prev < workSecs ? prev : workSecs));
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
    phase,
    completedWorkSessions,
    switchPhase,
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
