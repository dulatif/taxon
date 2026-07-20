import {
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
  subWeeks,
} from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import type { Project, Task } from '../types';

import TaskListView from '../views/TaskListView';

type DateFilterMode =
  | 'all'
  | 'single'
  | 'today'
  | 'week'
  | 'next-week'
  | 'last-week'
  | 'month'
  | 'custom';

interface CalendarViewProps {
  tasks: Task[];
  projects: Project[];
  onToggleTask: (id: string) => void;
  onDeleteTask?: (id: string, onDeleted?: (id: string) => void) => void;
  onAddTask?: (title: string, projectId?: string, dueDate?: string) => void;
  onSelectTask?: (task: Task) => void;
}

export default function CalendarView({
  tasks,
  projects,
  onToggleTask,
  onDeleteTask,
  onAddTask,
  onSelectTask,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [filterMode, setFilterMode] = useState<DateFilterMode>('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  // Build a map of dates that have tasks due
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (task.dueDate) {
        const dateKey = task.dueDate.substring(0, 10);
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(task);
      }
    }
    return map;
  }, [tasks]);

  // Dates that have tasks
  const datesWithTasks = useMemo(() => {
    const keys: string[] = [];
    tasksByDate.forEach((_, key) => keys.push(key));
    return keys.map((d) => parseISO(d));
  }, [tasksByDate]);

  // Calculate active date range for highlighting on the calendar
  const activeRange = useMemo(() => {
    const now = new Date();
    if (filterMode === 'week') {
      return {
        from: startOfWeek(now, { weekStartsOn: 0 }),
        to: endOfWeek(now, { weekStartsOn: 0 }),
      };
    }
    if (filterMode === 'next-week') {
      const nextW = addWeeks(now, 1);
      return {
        from: startOfWeek(nextW, { weekStartsOn: 0 }),
        to: endOfWeek(nextW, { weekStartsOn: 0 }),
      };
    }
    if (filterMode === 'last-week') {
      const lastW = subWeeks(now, 1);
      return {
        from: startOfWeek(lastW, { weekStartsOn: 0 }),
        to: endOfWeek(lastW, { weekStartsOn: 0 }),
      };
    }
    if (filterMode === 'month') {
      return { from: startOfMonth(now), to: endOfMonth(now) };
    }
    if (filterMode === 'custom' && customFrom && customTo) {
      return {
        from: parseISO(customFrom),
        to: parseISO(customTo),
      };
    }
    return undefined;
  }, [filterMode, customFrom, customTo]);

  // Filter tasks based on selected filter mode and range
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.dueDate || t.dueDate.trim() === '') return false;
      const dateStr = t.dueDate.substring(0, 10);

      if (filterMode === 'all') return true;
      if (filterMode === 'single' || filterMode === 'today') {
        const targetStr = selectedDate
          ? format(selectedDate, 'yyyy-MM-dd')
          : format(new Date(), 'yyyy-MM-dd');
        return dateStr === targetStr;
      }
      if (activeRange?.from && activeRange?.to) {
        const fromStr = format(activeRange.from, 'yyyy-MM-dd');
        const toStr = format(activeRange.to, 'yyyy-MM-dd');
        return dateStr >= fromStr && dateStr <= toStr;
      }
      if (filterMode === 'custom') {
        if (customFrom && dateStr < customFrom) return false;
        if (customTo && dateStr > customTo) return false;
        return true;
      }
      return true;
    });
  }, [tasks, filterMode, selectedDate, activeRange, customFrom, customTo]);

  const listTitle = useMemo(() => {
    switch (filterMode) {
      case 'all':
        return 'All Scheduled Tasks';
      case 'today':
        return `Today: ${format(new Date(), 'MMM d, yyyy')}`;
      case 'week':
        return 'Scheduled: This Week';
      case 'next-week':
        return 'Scheduled: Next Week';
      case 'last-week':
        return 'Scheduled: Last Week';
      case 'month':
        return 'Scheduled: This Month';
      case 'custom':
        return `Scheduled: ${customFrom || 'Start'} to ${customTo || 'End'}`;
      case 'single':
        return selectedDate
          ? `Scheduled: ${format(selectedDate, 'MMM d, yyyy')}`
          : 'All Scheduled Tasks';
    }
  }, [filterMode, selectedDate, customFrom, customTo]);

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-4 space-y-6">
      <div className="grid grid-cols-12 gap-8 items-start">
        {/* Left/Middle Column: Task List (col-span-12 lg:col-span-8) */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <TaskListView
            title={listTitle}
            tasks={filteredTasks}
            projects={projects}
            defaultGrouped={true}
            isEmbedded={true}
            onAddTask={
              onAddTask
                ? (title: string) => onAddTask(title, undefined, selectedDateStr || undefined)
                : undefined
            }
            addTaskPlaceholder={
              selectedDateStr ? `Add task for ${selectedDateStr}...` : 'Add a scheduled task...'
            }
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask ? (id) => onDeleteTask(id) : () => {}}
            onSelectTask={onSelectTask ? (task) => onSelectTask(task) : () => {}}
          />
        </div>

        {/* Right Column: Calendar Widget & Filter Summary (col-span-12 lg:col-span-4) */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-surface-secondary border border-border-primary rounded-xl p-6 sticky top-24">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Date Filter
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
                  {format(currentMonth, 'MMMM yyyy')}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
                    className="w-7 h-7 rounded-lg border border-border-primary bg-surface-primary hover:bg-surface-hover hover:border-border-focus text-text-muted hover:text-text-primary flex items-center justify-center transition-all"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                    className="w-7 h-7 rounded-lg border border-border-primary bg-surface-primary hover:bg-surface-hover hover:border-border-focus text-text-muted hover:text-text-primary flex items-center justify-center transition-all"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => {
                if (date) {
                  setSelectedDate(date);
                  setFilterMode('single');
                } else {
                  setSelectedDate(undefined);
                  setFilterMode('all');
                }
              }}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              hideNavigation={true}
              modifiers={{
                hasTasks: datesWithTasks,
                rangeStart: activeRange?.from ? [activeRange.from] : [],
                rangeEnd: activeRange?.to ? [activeRange.to] : [],
                rangeMiddle:
                  activeRange?.from && activeRange?.to
                    ? [{ from: activeRange.from, to: activeRange.to }]
                    : [],
              }}
              modifiersClassNames={{
                hasTasks: 'taxon-has-tasks',
                rangeStart: 'taxon-range-start',
                rangeEnd: 'taxon-range-end',
                rangeMiddle: 'taxon-range-middle',
              }}
              classNames={{
                root: 'taxon-calendar',
                months: 'taxon-months',
                month: 'taxon-month',
                month_caption: 'taxon-caption',
                nav: 'taxon-nav',
                button_previous: 'taxon-nav-button',
                button_next: 'taxon-nav-button',
                month_grid: 'taxon-table',
                weekdays: 'taxon-head-row',
                weekday: 'taxon-head-cell',
                week: 'taxon-row',
                day: 'taxon-cell',
                day_button: 'taxon-day',
                selected: 'taxon-day-selected',
                today: 'taxon-day-today',
                outside: 'taxon-day-outside',
              }}
            />

            {/* Filter status and quick toggles */}
            <div className="mt-6 pt-6 border-t border-border-primary/50 space-y-3">
              <div className="flex items-center justify-between text-xs font-mono mb-1">
                <span className="text-text-muted">Filter State:</span>
                <span className="text-text-primary font-bold">
                  {filterMode === 'all' && 'All Scheduled'}
                  {filterMode === 'today' && 'Today'}
                  {filterMode === 'week' && 'This Week'}
                  {filterMode === 'next-week' && 'Next Week'}
                  {filterMode === 'last-week' && 'Last Week'}
                  {filterMode === 'month' && 'This Month'}
                  {filterMode === 'custom' && 'Custom Range'}
                  {filterMode === 'single' && selectedDate && format(selectedDate, 'MMM d, yyyy')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('today');
                    setSelectedDate(new Date());
                    setCurrentMonth(new Date());
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center ${
                    filterMode === 'today'
                      ? 'bg-interactive-primary text-interactive-primary-text border-interactive-primary'
                      : 'bg-surface-primary hover:bg-surface-hover text-text-muted border-border-primary hover:border-border-focus/30 hover:text-text-primary'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = new Date();
                    setFilterMode('week');
                    setSelectedDate(undefined);
                    setCurrentMonth(target);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center ${
                    filterMode === 'week'
                      ? 'bg-interactive-primary text-interactive-primary-text border-interactive-primary'
                      : 'bg-surface-primary hover:bg-surface-hover text-text-muted border-border-primary hover:border-border-focus/30 hover:text-text-primary'
                  }`}
                >
                  This Week
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = subWeeks(new Date(), 1);
                    setFilterMode('last-week');
                    setSelectedDate(undefined);
                    setCurrentMonth(target);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center ${
                    filterMode === 'last-week'
                      ? 'bg-interactive-primary text-interactive-primary-text border-interactive-primary'
                      : 'bg-surface-primary hover:bg-surface-hover text-text-muted border-border-primary hover:border-border-focus/30 hover:text-text-primary'
                  }`}
                >
                  Last Week
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = addWeeks(new Date(), 1);
                    setFilterMode('next-week');
                    setSelectedDate(undefined);
                    setCurrentMonth(target);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center ${
                    filterMode === 'next-week'
                      ? 'bg-interactive-primary text-interactive-primary-text border-interactive-primary'
                      : 'bg-surface-primary hover:bg-surface-hover text-text-muted border-border-primary hover:border-border-focus/30 hover:text-text-primary'
                  }`}
                >
                  Next Week
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('month');
                    setSelectedDate(undefined);
                    setCurrentMonth(new Date());
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center ${
                    filterMode === 'month'
                      ? 'bg-interactive-primary text-interactive-primary-text border-interactive-primary'
                      : 'bg-surface-primary hover:bg-surface-hover text-text-muted border-border-primary hover:border-border-focus/30 hover:text-text-primary'
                  }`}
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFilterMode('custom');
                    setSelectedDate(undefined);
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all flex items-center justify-center ${
                    filterMode === 'custom'
                      ? 'bg-interactive-primary text-interactive-primary-text border-interactive-primary'
                      : 'bg-surface-primary hover:bg-surface-hover text-text-muted border-border-primary hover:border-border-focus/30 hover:text-text-primary'
                  }`}
                >
                  Custom Range
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFilterMode('all');
                  setSelectedDate(undefined);
                }}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-2 mt-1 ${
                  filterMode === 'all'
                    ? 'bg-interactive-primary text-interactive-primary-text border-interactive-primary'
                    : 'bg-surface-primary hover:bg-surface-hover text-text-primary border-border-primary hover:border-border-focus/30'
                }`}
              >
                All Scheduled Tasks
              </button>

              {/* Custom Range Inputs */}
              {filterMode === 'custom' && (
                <div className="pt-3 space-y-2 border-t border-border-primary/40 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted font-mono w-10">From:</span>
                    <input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="bg-surface-primary border border-border-primary rounded px-2 py-1 text-xs text-text-primary flex-1 font-mono focus:outline-none focus:border-border-focus/40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-text-muted font-mono w-10">To:</span>
                    <input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="bg-surface-primary border border-border-primary rounded px-2 py-1 text-xs text-text-primary flex-1 font-mono focus:outline-none focus:border-border-focus/40"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Quick stats for current filter */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 bg-surface-primary border border-border-primary rounded-lg">
                <div className="text-lg font-bold font-mono text-text-primary">
                  {filteredTasks.filter((t) => !t.completed).length}
                </div>
                <div className="text-[9px] text-[#A1A1AA] uppercase font-bold tracking-wide mt-0.5">
                  To Do
                </div>
              </div>
              <div className="p-3 bg-surface-primary border border-border-primary rounded-lg">
                <div className="text-lg font-bold font-mono text-text-primary">
                  {filteredTasks.filter((t) => t.completed).length}
                </div>
                <div className="text-[9px] text-[#A1A1AA] uppercase font-bold tracking-wide mt-0.5">
                  Completed
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
