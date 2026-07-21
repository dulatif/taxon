import { Pause, Play, RotateCcw, SkipForward, Timer } from 'lucide-react';
import type { Task } from '../../types';

interface PomodoroWidgetProps {
  timerSeconds: number;
  timerIsRunning: boolean;
  activeFocusTask: Task | null;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSkipTimer: () => void;
}

export default function PomodoroWidget({
  timerSeconds,
  timerIsRunning,
  activeFocusTask,
  onToggleTimer,
  onResetTimer,
  onSkipTimer,
}: PomodoroWidgetProps) {
  // Format seconds to MM:SS
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-surface-primary border border-border-primary rounded-xl flex flex-col items-center text-center relative overflow-hidden px-6 py-8">
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0 bg-white rounded-full scale-125 -translate-y-1/4 blur-3xl"></div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center">
        <span className="font-mono text-xs uppercase tracking-widest text-text-muted/80 flex items-center gap-1">
          <Timer className="w-3.5 h-3.5" />
          {activeFocusTask ? 'Active Focus Session' : 'Pomodoro Timer'}
        </span>

        <div className="text-7xl font-sans font-black tracking-tighter text-text-primary leading-none mt-4 mb-6 font-mono tabular-nums">
          {formatTime(timerSeconds)}
        </div>

        {activeFocusTask && (
          <div className="mb-4 text-xs font-medium text-text-secondary/90 max-w-[220px] truncate">
            Working on:{' '}
            <span className="text-text-primary hover:underline">{activeFocusTask.title}</span>
          </div>
        )}

        {/* Timer Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onResetTimer}
            title="Reset Timer"
            className="w-10 h-10 rounded-full bg-surface-secondary border border-border-primary flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleTimer}
            title={timerIsRunning ? 'Pause Session' : 'Start Session'}
            className="w-14 h-14 rounded-full bg-interactive-primary text-interactive-primary-text flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            {timerIsRunning ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
          <button
            onClick={onSkipTimer}
            title="Skip/Interval Session"
            className="w-10 h-10 rounded-full bg-surface-secondary border border-border-primary flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all cursor-pointer"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Session Progress Indicators */}
        <div className="flex gap-2 justify-center mt-6">
          <div
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              timerIsRunning ? 'bg-white animate-pulse' : 'bg-white/40'
            }`}
          ></div>
          <div className="w-2 h-2 rounded-full bg-surface-hover border border-border-primary"></div>
          <div className="w-2 h-2 rounded-full bg-surface-hover border border-border-primary"></div>
          <div className="w-2 h-2 rounded-full bg-surface-hover border border-border-primary"></div>
        </div>
      </div>
    </div>
  );
}
