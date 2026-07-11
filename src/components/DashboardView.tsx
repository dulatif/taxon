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
  CheckCircle2,
  ArrowDownNarrowWide,
  SortAsc,
  Square,
  CheckSquare,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { PRIORITY_COLORS } from '../utils/taskFilters';
import { Task, Project, DailyActivity } from '../types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardViewProps {
  tasks: Task[];
  projects: Project[];
  dailyActivity: DailyActivity[];
  onToggleTask: (id: string) => void;
  onAddTask: (title: string, projectId?: string, dueDate?: string) => void;
  onDeleteTask?: (id: string, onDeleted?: (id: string) => void) => void;
  onReorderTasks?: (tasks: Task[]) => void;
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

const formatMinutes = (mins?: number): string => {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const getTaskTimeBadge = (task: Task) => {
  if (task.timeEffort || task.timeSpent) {
    const spentStr = formatMinutes(task.timeSpent);
    const effortStr = formatMinutes(task.timeEffort || 0);
    return `${spentStr} / ${effortStr}`;
  }
  return task.duration || '25m';
};

export default function DashboardView({
  tasks,
  projects,
  dailyActivity,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onReorderTasks,
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
  const [selectedSort, setSelectedSort] = useState<'custom' | 'priority'>('custom');
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();
  const allTodayTasks = tasks.filter(t => {
    if (!t.dueDate || t.dueDate.trim() === '') return false;
    const datePart = t.dueDate.substring(0, 10);
    if (t.completed) {
      return datePart === todayStr;
    }
    return datePart <= todayStr;
  });
  const activeTodayTasks = allTodayTasks.filter(t => !t.completed);
  const completedTodayTasks = allTodayTasks.filter(t => t.completed);

  const sortTasksHelper = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      if (selectedSort === 'priority') {
        const weights: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        return (weights[b.priority || 'Medium'] || 2) - (weights[a.priority || 'Medium'] || 2);
      }
      return (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999);
    });
  };

  const sortedActiveTasks = sortTasksHelper(activeTodayTasks);
  const sortedCompletedTasks = sortTasksHelper(completedTodayTasks);
  const remainingTodayCount = sortedActiveTasks.length;

  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination || !onReorderTasks) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const isSourceCompleted = source.droppableId === 'today-completed-tasks';
    const isDestCompleted = destination.droppableId === 'today-completed-tasks';

    const draggedTask = allTodayTasks.find(t => t.id === draggableId);
    if (!draggedTask) return;

    const currentActive = [...sortedActiveTasks];
    const currentCompleted = [...sortedCompletedTasks];

    if (isSourceCompleted) {
      const idx = currentCompleted.findIndex(t => t.id === draggableId);
      if (idx !== -1) currentCompleted.splice(idx, 1);
    } else {
      const idx = currentActive.findIndex(t => t.id === draggableId);
      if (idx !== -1) currentActive.splice(idx, 1);
    }

    const updatedTask = {
      ...draggedTask,
      completed: isDestCompleted,
      status: isDestCompleted ? ('Done' as const) : ('To Do' as const)
    };

    if (isSourceCompleted !== isDestCompleted) {
      onToggleTask(draggedTask.id);
    }

    if (isDestCompleted) {
      currentCompleted.splice(destination.index, 0, updatedTask);
    } else {
      currentActive.splice(destination.index, 0, updatedTask);
    }

    const reorderedTodayTasks = [...currentActive, ...currentCompleted];
    const otherTasks = tasks.filter(t => !(t.dueDate && t.dueDate.startsWith(todayStr)));
    onReorderTasks([...reorderedTodayTasks, ...otherTasks]);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;
    onAddTask(quickAddText, selectedProjectId || undefined, todayStr);
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
          <section className="bg-[#0A0A0A] border border-[#27272A] rounded-xl">
            <div className="px-6 py-4 flex justify-between items-center bg-[#141313] border-b border-[#27272A] rounded-t-xl">
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <ListTodo className="text-white w-4 h-4" />
                Today's Tasks
              </h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedSort(s => s === 'custom' ? 'priority' : 'custom')}
                  className="flex items-center gap-1.5 text-[#8E9192] hover:text-white transition-colors text-xs uppercase tracking-wider font-mono cursor-pointer bg-[#201F1F] px-2.5 py-1 rounded border border-[#27272A] hover:border-white/30"
                  title={selectedSort === 'custom' ? 'Custom ordering enabled (click to sort by priority)' : 'Sorted by priority (click to enable custom drag & drop)'}
                >
                  <SortAsc className="w-3.5 h-3.5" />
                  <span>Sort: {selectedSort}</span>
                </button>
                <span className="text-[10px] text-[#A1A1AA] font-bold uppercase tracking-widest leading-none bg-[#201F1F] px-2 py-1 rounded-sm border border-[#27272A]">
                  {remainingTodayCount} Remaining
                </span>
              </div>
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              {/* Active Tasks Container */}
              <div className="p-4">
                <Droppable droppableId="today-active-tasks" isDropDisabled={selectedSort !== 'custom'}>
                  {(provided, snapshot) => (
                    <ul
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`space-y-1.5 min-h-[40px] rounded-lg transition-colors select-none ${snapshot.isDraggingOver ? 'bg-[#141313]/50 border border-white/20 p-1.5' : ''
                        }`}
                    >
                      {sortedActiveTasks.length === 0 && !snapshot.isDraggingOver ? (
                        <div className="py-12 text-center text-[#8E9192] text-sm">
                          All done! Quick add a task above to get focused.
                        </div>
                      ) : (
                        sortedActiveTasks.map((task, index) => {
                          const proj = projects.find(p => p.id === task.projectId);
                          return (
                            // @ts-ignore
                            <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={selectedSort !== 'custom'}>
                              {(provided, snapshot) => (
                                <li
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  id={`task-item-${task.id}`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => onSelectTask?.(task)}
                                  className={`py-3 px-4 flex items-center justify-between rounded-lg transition-colors group cursor-grab active:cursor-grabbing select-none border border-transparent ${snapshot.isDragging
                                    ? 'bg-[#201F1F] text-white ring-1 ring-white/30 shadow-lg z-50 border-white/20'
                                    : 'hover:bg-[#141313]/50'
                                    }`}
                                >
                                  <div className="flex items-start gap-3 min-w-0 flex-1 mr-4 py-0.5">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                                      className="shrink-0 mt-0.5 text-[#8E9192] hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Square className="w-4 h-4" />
                                    </button>
                                    {/* Priority dot */}
                                    <span
                                      title={task.priority}
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${PRIORITY_COLORS[task.priority].dot}`}
                                    />
                                    <div className="min-w-0 flex-1 w-full flex flex-col gap-1 overflow-hidden">
                                      <h3 className="text-white font-medium text-sm truncate w-full block leading-tight" title={task.title}>{task.title}</h3>
                                      {proj && (
                                        <span className="text-[10px] text-[#8E9192] bg-[#141313] px-1.5 py-0.5 rounded border border-[#27272A] inline-block max-w-[200px] truncate leading-none">
                                          {proj.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-[10px] text-[#8E9192] flex items-center gap-1 font-mono tracking-wider bg-black/40 px-2 py-0.5 rounded border border-[#27272A]/50">
                                      <Clock className="w-3 h-3" /> {getTaskTimeBadge(task)}
                                    </span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onStartFocus(task); }}
                                      title="Start Focus Session"
                                      className="p-1 text-[#8E9192] hover:text-white hover:bg-[#201F1F] rounded transition-all"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                    {onDeleteTask && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                                        className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        title="Delete task item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </li>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </ul>
                  )}
                </Droppable>
              </div>

              {/* Completed Tasks Accordion */}
              {sortedCompletedTasks.length > 0 && (
                <div className="border-t border-gray-800/10 pt-4 px-4 pb-4">
                  <button
                    type="button"
                    onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
                    className="w-full flex items-center justify-between py-2 text-[#8E9192] hover:text-white transition-colors cursor-pointer group px-2"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${isCompletedExpanded ? 'rotate-90 text-white' : 'text-[#8E9192] group-hover:text-white'
                          }`}
                      />
                      <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
                        Completed Tasks
                      </span>
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#141313] text-[#8E9192] border border-[#27272A] font-mono">
                        {sortedCompletedTasks.length}
                      </span>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isCompletedExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden mt-2"
                      >
                        <Droppable droppableId="today-completed-tasks" isDropDisabled={selectedSort !== 'custom'}>
                          {(provided, snapshot) => (
                            <ul
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`space-y-1.5 min-h-[30px] rounded-lg transition-colors select-none ${snapshot.isDraggingOver ? 'bg-[#141313]/50 border border-white/20 p-1.5' : ''
                                }`}
                            >
                              {sortedCompletedTasks.map((task, index) => {
                                const proj = projects.find(p => p.id === task.projectId);
                                return (
                                  // @ts-ignore
                                  <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={selectedSort !== 'custom'}>
                                    {(provided, snapshot) => (
                                      <li
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        id={`task-item-${task.id}`}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => onSelectTask?.(task)}
                                        className={`py-3 px-4 flex items-center justify-between rounded-lg transition-colors group cursor-grab active:cursor-grabbing select-none border border-transparent opacity-75 ${snapshot.isDragging
                                          ? 'bg-[#201F1F] text-white ring-1 ring-white/30 shadow-lg z-50 opacity-100 border-white/20'
                                          : 'hover:bg-[#141313]/40 hover:border-[#27272A]/30'
                                          }`}
                                      >
                                        <div className="flex items-start gap-3 min-w-0 flex-1 mr-4 py-0.5">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                                            className="shrink-0 mt-0.5 text-[#8E9192] hover:text-white transition-colors cursor-pointer"
                                          >
                                            <CheckSquare className="w-4 h-4 text-white" />
                                          </button>
                                          {/* Priority dot */}
                                          <span
                                            title={task.priority}
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${PRIORITY_COLORS[task.priority].dot}`}
                                          />
                                          <div className="min-w-0 flex-1 w-full flex flex-col gap-1 overflow-hidden">
                                            <span className="text-xs font-semibold text-white group-hover:underline line-through text-[#8E9192]/80 decoration-[#27272A] truncate w-full block leading-tight" title={task.title}>
                                              {task.title}
                                            </span>
                                            {proj && (
                                              <span className="text-[10px] text-[#8E9192] bg-[#141313] px-1.5 py-0.5 rounded border border-[#27272A] inline-block max-w-[200px] truncate leading-none opacity-60">
                                                {proj.name}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 shrink-0">
                                          <span className="text-[10px] text-[#8E9192] flex items-center gap-1 font-mono tracking-wider bg-black/40 px-2 py-0.5 rounded border border-[#27272A]/50">
                                            <Clock className="w-3 h-3" /> {getTaskTimeBadge(task)}
                                          </span>
                                          {onDeleteTask && (
                                            <button
                                              onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                                              className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                              title="Delete task item"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          )}
                                        </div>
                                      </li>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </ul>
                          )}
                        </Droppable>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </DragDropContext>

            <button
              type="button"
              onClick={() => {
                const el = document.querySelector('input[placeholder="I want to work on..."]');
                if (el) (el as HTMLInputElement).focus();
              }}
              className="w-full text-xs font-bold text-[#8E9192] hover:text-white bg-[#141313]/30 hover:bg-[#141313]/50 transition-all py-4 border-t border-[#27272A] rounded-b-xl"
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
                        className={`w-full rounded-t-sm transition-all duration-500 hover:opacity-150 ${act.isToday
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
