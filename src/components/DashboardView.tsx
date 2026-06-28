import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward, 
  PlusCircle, 
  ArrowRight, 
  ListTodo, 
  Clock, 
  Check, 
  Timer,
  CheckCircle2
} from 'lucide-react';
import { Task, Project, DailyActivity } from '../types';

interface DashboardViewProps {
  tasks: Task[];
  projects: Project[];
  dailyActivity: DailyActivity[];
  onToggleTask: (id: string) => void;
  onAddTask: (title: string, projectId?: string) => void;
  onStartFocus: (task: Task) => void;
  // Timer attributes synced to parent
  timerSeconds: number;
  timerIsRunning: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSkipTimer: () => void;
  activeFocusTask: Task | null;
  // Stats
  totalCompletedCount: number;
  totalFocusedHours: number;
  onSelectTask?: (task: Task) => void;
}

export default function DashboardView({
  tasks,
  projects,
  dailyActivity,
  onToggleTask,
  onAddTask,
  onStartFocus,
  timerSeconds,
  timerIsRunning,
  onToggleTimer,
  onResetTimer,
  onSkipTimer,
  activeFocusTask,
  totalCompletedCount,
  totalFocusedHours,
  onSelectTask,
}: DashboardViewProps) {
  const [quickAddText, setQuickAddText] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');

  const todayTasks = tasks.filter(t => !t.completed).slice(0, 5);
  const remainingTodayCount = todayTasks.length;

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;
    onAddTask(quickAddText, selectedProjectId || undefined);
    setQuickAddText('');
  };

  // Format seconds to MM:SS
  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-4 space-y-6">
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left Column: Tasks & Quick Add */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Quick task capture with brand styling */}
          <form 
            onSubmit={handleQuickAddSubmit}
            className="bg-[#0A0A0A] border border-[#27272A] rounded-xl flex items-center gap-3 px-4 py-2.5 transition-all focus-within:border-white/40"
          >
            <PlusCircle className="text-white w-5 h-5 shrink-0" />
            <input 
              type="text" 
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              placeholder="I want to work on..." 
              className="bg-transparent border-none text-white focus:outline-none w-full text-lg placeholder:text-[#8E9192]"
            />
            {quickAddText.trim() && (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-[#141313] border border-[#27272A] text-xs text-[#C4C7C8] rounded px-2 py-1 mr-2 focus:ring-1 focus:ring-white shrink-0"
              >
                <option value="">No Project</option>
                {projects.filter(p => p.category !== 'Completed').map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            )}
            <button 
              type="submit"
              disabled={!quickAddText.trim()}
              className="p-1.5 hover:bg-[#201F1F] rounded-full transition-colors text-[#8E9192] hover:text-white disabled:opacity-40"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Today's Tasks board layout */}
          <section className="bg-[#0A0A0A] border border-[#27272A] rounded-xl overflow-hidden">
            <div className="px-6 py-4 flex justify-between items-center bg-[#141313] border-b border-[#27272A]">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <ListTodo className="text-white w-4 h-4" />
                Today's Tasks
              </h2>
              <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-widest leading-none bg-[#201F1F] px-2 py-1 rounded-sm border border-[#27272A]">
                {remainingTodayCount} Remaining
              </span>
            </div>

            <div className="divide-y divide-[#27272A]/50">
              {todayTasks.length === 0 ? (
                <div className="py-12 text-center text-[#8E9192] text-sm">
                  All done! Quick add a task to get focused.
                </div>
              ) : (
                todayTasks.map((task) => {
                  const proj = projects.find(p => p.id === task.projectId);
                  return (
                    <div 
                      key={task.id} 
                      onClick={() => onSelectTask?.(task)}
                      className="py-3 px-6 flex items-center justify-between hover:bg-[#141313]/70 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1 mr-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                          className="w-4 h-4 rounded border border-[#27272A] flex items-center justify-center shrink-0 hover:border-white transition-colors"
                        >
                          <Check className="w-2.5 h-2.5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <div className="min-w-0">
                          <h3 className="text-white font-medium text-sm truncate group-hover:underline">{task.title}</h3>
                          {proj && (
                            <span className="text-[10px] text-[#8E9192] bg-[#141313] px-1.5 py-0.5 rounded border border-[#27272A] inline-block mt-0.5 max-w-[150px] truncate">
                              {proj.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-[10px] text-[#8E9192] flex items-center gap-1 font-mono tracking-wider bg-black/40 px-2 py-0.5 rounded border border-[#27272A]/50">
                          <Clock className="w-3 h-3" /> {task.duration || '25m'}
                        </span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onStartFocus(task); }}
                          title="Start Focus Session"
                          className="p-1 text-[#8E9192] hover:text-white hover:bg-[#201F1F] rounded transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button 
              type="button"
              onClick={() => {
                const el = document.querySelector('input[placeholder="I want to work on..."]');
                if (el) (el as HTMLInputElement).focus();
              }}
              className="w-full text-xs font-bold text-[#8E9192] hover:text-white bg-[#141313]/30 hover:bg-[#141313]/50 transition-all py-4 border-t border-[#27272A]"
            >
              + Add New Task to Today
            </button>
          </section>
        </div>

        {/* Right Column: Pomodoro & Statistics */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* Integrated Pomodoro Widget */}
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl flex flex-col items-center text-center relative overflow-hidden px-6 py-8">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className="absolute inset-0 bg-white rounded-full scale-125 -translate-y-1/4 blur-3xl"></div>
            </div>
            
            <div className="relative z-10 w-full flex flex-col items-center">
              <span className="font-mono text-xs uppercase tracking-widest text-[#8E9192]/80 flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                {activeFocusTask ? 'Active Focus Session' : 'Pomodoro Timer'}
              </span>
              
              <div className="text-7xl font-sans font-black tracking-tighter text-white leading-none mt-4 mb-6 font-mono tabular-nums">
                {formatTime(timerSeconds)}
              </div>

              {activeFocusTask && (
                <div className="mb-4 text-xs font-medium text-[#C4C7C8]/90 max-w-[220px] truncate">
                  Working on: <span className="text-white hover:underline">{activeFocusTask.title}</span>
                </div>
              )}

              {/* Timer Controls */}
              <div className="flex items-center justify-center gap-4">
                <button 
                  onClick={onResetTimer}
                  title="Reset Timer"
                  className="w-10 h-10 rounded-full bg-[#141313] border border-[#27272A] flex items-center justify-center text-[#8E9192] hover:text-white hover:bg-[#201F1F] transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button 
                  onClick={onToggleTimer}
                  title={timerIsRunning ? 'Pause Session' : 'Start Session'}
                  className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  {timerIsRunning ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
                </button>
                <button 
                  onClick={onSkipTimer}
                  title="Skip/Interval Session"
                  className="w-10 h-10 rounded-full bg-[#141313] border border-[#27272A] flex items-center justify-center text-[#8E9192] hover:text-white hover:bg-[#201F1F] transition-all"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Session Progress Indicators */}
              <div className="flex gap-2 justify-center mt-6">
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${timerIsRunning ? 'bg-white animate-pulse' : 'bg-white/40'}`}></div>
                <div className="w-2 h-2 rounded-full bg-[#201F1F] border border-[#27272A]"></div>
                <div className="w-2 h-2 rounded-full bg-[#201F1F] border border-[#27272A]"></div>
                <div className="w-2 h-2 rounded-full bg-[#201F1F] border border-[#27272A]"></div>
              </div>
            </div>
          </div>

          {/* Daily Progress Visualizations */}
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[#A1A1AA] uppercase tracking-widest">Daily Progress</h3>
              <span className="text-white text-[10px] font-bold tracking-wide">+12% over last week</span>
            </div>

            {/* Custom high contrast bar graphs */}
            <div className="flex items-end justify-between gap-2 h-24 pt-2">
              {dailyActivity.map((act, i) => {
                // Max hours for scale is 6 hours
                const percentage = Math.min((act.hours / 6) * 100, 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer">
                    <div className="text-[9px] font-mono font-medium text-[#8E9192] opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">
                      {act.hours}h
                    </div>
                    <div className="w-full relative rounded-t-sm h-full flex items-end">
                      <div 
                        style={{ height: `${percentage}%` }}
                        className={`w-full rounded-t-sm transition-all duration-500 hover:opacity-150 ${
                          act.isToday 
                            ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)]' 
                            : 'bg-[#201F1F] group-hover:bg-white/50'
                        }`}
                      ></div>
                    </div>
                    <span className={`text-[10px] font-medium ${act.isToday ? 'text-white font-bold' : 'text-[#8E9192]/80'}`}>
                      {act.day}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Micro counters */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-4 bg-[#141313] border border-[#27272A] rounded-lg">
                <div className="text-xl font-bold font-mono text-white">{totalFocusedHours.toFixed(1)}h</div>
                <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wide mt-1">Time Focused</div>
              </div>
              <div className="p-4 bg-[#141313] border border-[#27272A] rounded-lg">
                <div className="text-xl font-bold font-mono text-white">{totalCompletedCount}</div>
                <div className="text-[10px] text-[#A1A1AA] uppercase font-bold tracking-wide mt-1">Tasks Done</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
