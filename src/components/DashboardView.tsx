import type { DropResult } from '@hello-pangea/dnd';
import { ArrowRight, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import ActivityChart from '../sections/DashboardWidgets/ActivityChart';
import PomodoroWidget from '../sections/DashboardWidgets/PomodoroWidget';
import StatsBar from '../sections/DashboardWidgets/StatsBar';
import TodayTasks from '../sections/DashboardWidgets/TodayTasks';
import type { DailyActivity, Project, Task } from '../types';

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

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayStr();
  const activeTodayTasks = tasks.filter(
    (t) => !t.completed && t.dueDate && t.dueDate.substring(0, 10) === todayStr,
  );
  const overdueTasks = tasks.filter(
    (t) => !t.completed && t.dueDate && t.dueDate.substring(0, 10) < todayStr && !t.archived,
  );
  const completedTodayTasks = tasks.filter(
    (t) => t.completed && t.dueDate && t.dueDate.substring(0, 10) === todayStr && !t.archived,
  );

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
  const sortedOverdueTasks = sortTasksHelper(overdueTasks);
  const sortedCompletedTasks = sortTasksHelper(completedTodayTasks);
  const remainingTodayCount = sortedActiveTasks.length;

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || !onReorderTasks) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const isSourceCompleted = source.droppableId === 'today-completed-tasks';
    const isDestCompleted = destination.droppableId === 'today-completed-tasks';
    const isSourceOverdue = source.droppableId === 'today-overdue-tasks';
    const isDestOverdue = destination.droppableId === 'today-overdue-tasks';

    const draggedTask = tasks.find((t) => t.id === draggableId);
    if (!draggedTask) return;

    const currentActive = [...sortedActiveTasks];
    const currentOverdue = [...sortedOverdueTasks];
    const currentCompleted = [...sortedCompletedTasks];

    if (isSourceCompleted) {
      const idx = currentCompleted.findIndex((t) => t.id === draggableId);
      if (idx !== -1) currentCompleted.splice(idx, 1);
    } else if (isSourceOverdue) {
      const idx = currentOverdue.findIndex((t) => t.id === draggableId);
      if (idx !== -1) currentOverdue.splice(idx, 1);
    } else {
      const idx = currentActive.findIndex((t) => t.id === draggableId);
      if (idx !== -1) currentActive.splice(idx, 1);
    }

    const updatedTask = {
      ...draggedTask,
      completed: isDestCompleted,
      status: isDestCompleted ? ('Done' as const) : ('To Do' as const),
    };

    // If moved from overdue to today active, reschedule it
    if (isSourceOverdue && destination.droppableId === 'today-active-tasks') {
      updatedTask.dueDate = todayStr;
    }

    if (isSourceCompleted !== isDestCompleted) {
      onToggleTask(draggedTask.id);
    }

    if (isDestCompleted) {
      currentCompleted.splice(destination.index, 0, updatedTask);
    } else if (isDestOverdue) {
      currentOverdue.splice(destination.index, 0, updatedTask);
    } else {
      currentActive.splice(destination.index, 0, updatedTask);
    }

    const reorderedTodayTasks = [...currentActive, ...currentOverdue, ...currentCompleted];
    const otherTasks = tasks.filter((t) => !reorderedTodayTasks.some((rt) => rt.id === t.id));
    onReorderTasks([...reorderedTodayTasks, ...otherTasks]);
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddText.trim()) return;
    onAddTask(quickAddText, selectedProjectId || undefined, todayStr);
    setQuickAddText('');
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-4 space-y-6">
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left Column: Tasks & Quick Add */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Quick task capture with brand styling */}
          <form
            onSubmit={handleQuickAddSubmit}
            className="bg-surface-primary border border-border-primary rounded-xl flex items-center gap-3 px-4 py-2.5 transition-all focus-within:border-white/40"
          >
            <PlusCircle className="text-text-primary w-5 h-5 shrink-0" />
            <input
              type="text"
              value={quickAddText}
              onChange={(e) => setQuickAddText(e.target.value)}
              placeholder="I want to work on..."
              className="bg-transparent border-none text-text-primary focus:outline-none w-full text-lg placeholder:text-text-muted"
            />
            {quickAddText.trim() && (
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="bg-surface-secondary border border-border-primary text-xs text-text-secondary rounded px-2 py-1 mr-2 focus:ring-1 focus:ring-white shrink-0"
              >
                <option value="">No Project</option>
                {projects
                  .filter((p) => p.category !== 'Completed')
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            )}
            <button
              type="submit"
              disabled={!quickAddText.trim()}
              className="p-1.5 hover:bg-surface-hover rounded-full transition-colors text-text-muted hover:text-text-primary disabled:opacity-40 cursor-pointer"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          {/* Today's Tasks board layout */}
          <TodayTasks
            sortedActiveTasks={sortedActiveTasks}
            sortedOverdueTasks={sortedOverdueTasks}
            sortedCompletedTasks={sortedCompletedTasks}
            projects={projects}
            remainingTodayCount={remainingTodayCount}
            selectedSort={selectedSort}
            setSelectedSort={setSelectedSort}
            handleDragEnd={handleDragEnd}
            onToggleTask={onToggleTask}
            onSelectTask={onSelectTask}
            onStartFocus={onStartFocus}
            onDeleteTask={onDeleteTask}
            getTaskTimeBadge={getTaskTimeBadge}
          />
        </div>

        {/* Right Column: Pomodoro & Statistics */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Integrated Pomodoro Widget */}
          <PomodoroWidget
            timerSeconds={timerSeconds}
            timerIsRunning={timerIsRunning}
            activeFocusTask={activeFocusTask}
            onToggleTimer={onToggleTimer}
            onResetTimer={onResetTimer}
            onSkipTimer={onSkipTimer}
          />

          {/* Daily Progress Visualizations */}
          <div className="bg-surface-primary border border-border-primary rounded-xl p-6 space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-widest">
                Daily Progress
              </h3>
              <span className="text-text-primary text-[10px] font-bold tracking-wide">
                +12% over last week
              </span>
            </div>

            {/* Custom high contrast bar graphs */}
            <ActivityChart dailyActivity={dailyActivity} />

            {/* Micro counters */}
            <StatsBar
              totalFocusedHours={totalFocusedHours}
              totalCompletedCount={totalCompletedCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
