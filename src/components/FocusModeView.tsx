import { Circle, Minimize2, Pause, Play, SkipForward, StopCircle, Unlink } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';
import type { Project, Task } from '../types';

interface FocusModeViewProps {
  activeTask: Task | null;
  projects: Project[];
  tasks: Task[];
  timerSeconds: number;
  timerIsRunning: boolean;
  phase?: 'work' | 'shortBreak' | 'longBreak';
  totalDuration?: number;
  onToggleTimer: () => void;
  onSkipTimer: () => void;
  onEndFocusMode: () => void;
  onSelectTaskToFocus: (task: Task) => void;
  onUnlinkTask?: () => void;
  onMinimizeFocusMode: () => void;
}

export default function FocusModeView({
  activeTask,
  projects,
  tasks,
  timerSeconds,
  timerIsRunning,
  phase = 'work',
  totalDuration = 1500,
  onToggleTimer,
  onSkipTimer,
  onEndFocusMode,
  onSelectTaskToFocus,
  onUnlinkTask,
  onMinimizeFocusMode,
}: FocusModeViewProps) {
  const currentProject = activeTask ? projects.find((p) => p.id === activeTask.projectId) : null;

  // Up Next Queue contains other uncompleted tasks for this active project
  const upNextTasks = activeTask
    ? tasks.filter(
        (t) =>
          t.id !== activeTask.id &&
          !t.completed &&
          (t.projectId === activeTask.projectId || (!t.projectId && !activeTask.projectId)),
      )
    : tasks.filter((t) => !t.completed);

  const formattedTime = () => {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const strokeOffset = () => {
    const rawFrac = timerSeconds / totalDuration;
    const fraction = Math.max(0, Math.min(rawFrac, 1));
    const circumference = 2 * Math.PI * 140; // Approx 879.64
    return circumference - fraction * circumference;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-surface-app text-text-primary z-50 flex flex-col items-center justify-between py-12 px-6 overflow-hidden select-none"
    >
      {/* Hide / Minimize button to close full screen without stopping timer */}
      <button
        onClick={onMinimizeFocusMode}
        className="absolute top-14 right-6 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-secondary/80 hover:bg-surface-hover border border-border-primary hover:border-border-focus/40 text-text-muted hover:text-text-primary transition-all cursor-pointer font-mono text-xs uppercase font-semibold"
        title="Hide full screen focus mode (keep timer running)"
      >
        <Minimize2 className="w-3.5 h-3.5" />
        <span>Hide</span>
      </button>

      {/* Subtle background ambient overlay glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.02)_0%,_rgba(0,0,0,0)_60%)] pointer-events-none"></div>

      {/* Top Header details */}
      <div className="text-center w-full max-w-xl animate-fade-in z-10">
        <div className="mb-2 flex items-center justify-center gap-2">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border ${
              phase === 'work'
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : 'bg-green-500/10 text-green-400 border-green-500/30'
            }`}
          >
            {phase === 'work'
              ? '🔥 Focus Sprint'
              : phase === 'shortBreak'
                ? '☕ Short Break'
                : '🌴 Long Break'}
          </span>
        </div>
        <span className="font-mono text-[10px] font-semibold text-text-muted uppercase tracking-[0.2em] mb-1 block">
          Working On
        </span>
        <h2 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight px-4 leading-normal truncate">
          {activeTask ? activeTask.title : 'Standalone Focus'}
        </h2>

        {/* Priority tags metadata indicators */}
        <div className="mt-4 flex items-center justify-center space-x-2 text-text-muted text-xs flex-wrap gap-y-2">
          <span className="font-mono uppercase px-2 py-0.5 rounded border border-border-primary/80 bg-surface-primary/50">
            {currentProject ? currentProject.name : 'Personal'}
          </span>
          <span className="text-border-primary font-bold">•</span>
          <span className="font-mono uppercase font-bold text-text-primary tracking-wider">
            {activeTask ? activeTask.priority || 'Medium' : 'FREE SESSION'}
          </span>
          {activeTask && onUnlinkTask && (
            <>
              <span className="text-border-primary font-bold">•</span>
              <button
                onClick={onUnlinkTask}
                className="flex items-center gap-1 font-mono text-[10px] uppercase text-text-muted hover:text-text-primary bg-surface-secondary hover:bg-surface-hover px-2 py-0.5 rounded border border-border-primary transition-colors cursor-pointer"
                title="Unlink task to run a standalone focus session"
              >
                <Unlink className="w-3 h-3" />
                <span>Unlink Task</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Large central progress circle ring with monolithic clock */}
      <div
        onClick={onToggleTimer}
        className="relative flex items-center justify-center my-6 group cursor-pointer z-10 select-none hover:scale-[1.02] transition-transform duration-300"
      >
        <svg
          className="w-72 h-72 md:w-[350px] md:h-[350px] rotate-[-90deg] drop-shadow-[0_0_20px_rgba(255,255,255,0.03)]"
          viewBox="0 0 300 300"
        >
          {/* Background track circle */}
          <circle
            className="text-surface-primary"
            stroke="currentColor"
            strokeWidth="4"
            fill="transparent"
            r="140"
            cx="150"
            cy="150"
          />
          {/* Active progress meter stroke with transition and correct timing coordinates */}
          <circle
            className="text-text-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={2 * Math.PI * 140}
            strokeDashoffset={strokeOffset()}
            strokeLinecap="round"
            fill="transparent"
            r="140"
            cx="150"
            cy="150"
          />
        </svg>

        {/* Floating monospace timer readouts */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="font-sans font-medium text-6xl md:text-[80px] tracking-tighter text-text-primary font-mono leading-none">
            {formattedTime()}
          </div>
          <div className="mt-2 flex items-center space-x-1.5 text-text-muted group-hover:text-text-primary transition-colors">
            {timerIsRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span className="text-[10px] uppercase font-bold tracking-wider font-mono">
                  Pause
                </span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span className="text-[10px] uppercase font-bold tracking-wider font-mono">
                  Resume
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Control console row */}
      <div className="flex items-center space-x-8 z-10 pb-4">
        <button
          onClick={onEndFocusMode}
          className="flex flex-col items-center justify-center text-text-muted hover:text-text-primary transition-colors group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full border border-border-primary flex items-center justify-center mb-2 group-hover:border-border-focus transition-colors">
            <StopCircle className="w-5 h-5 text-red-500 fill-current" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest font-mono">
            End Focus
          </span>
        </button>

        <button
          onClick={onSkipTimer}
          className="flex flex-col items-center justify-center text-text-muted hover:text-text-primary transition-colors group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full border border-border-primary flex items-center justify-center mb-2 group-hover:border-border-focus transition-colors">
            <SkipForward className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest font-mono">Skip</span>
        </button>
      </div>

      {/* Up Next pending tasks footer queue */}
      <div className="w-full max-w-lg pb-4 border-t border-border-primary pt-6 relative z-10 bg-surface-app">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-surface-app px-4 whitespace-nowrap">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">
            Up Next Queue
          </span>
        </div>

        <div className="flex flex-col space-y-3.5 max-h-[140px] overflow-y-auto scrollbar-none px-2">
          {upNextTasks.length === 0 ? (
            <div className="text-center py-2 text-xs text-text-muted/50 italic">
              No pending tasks queued
            </div>
          ) : (
            upNextTasks.slice(0, 3).map((task) => (
              <div
                key={task.id}
                onClick={() => onSelectTaskToFocus(task)}
                className="flex items-center justify-between text-text-muted hover:text-text-primary transition-colors cursor-pointer group"
              >
                <div className="flex items-center space-x-3 truncate">
                  <Circle className="w-2.5 h-2.5 fill-transparent text-border-primary/80 group-hover:text-text-primary transition-colors shrink-0" />
                  <span className="text-xs font-semibold truncate max-w-[280px]">{task.title}</span>
                </div>
                <span className="font-mono text-[10px] text-border-primary group-hover:text-text-muted font-semibold transition-colors shrink-0 bg-surface-primary px-2 py-0.5 rounded border border-border-primary/50">
                  {task.duration || '25m'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
