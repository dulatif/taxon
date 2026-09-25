import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import type { Task } from '../types';

export type SelectionMode = 'day' | 'week';
export type SelectionRange = { mode: 'day'; date: Date } | { mode: 'week'; start: Date; end: Date };

interface CalendarGridProps {
  completedTasks: Task[];
  selection: SelectionRange | null;
  onSelectRange: (range: SelectionRange) => void;
}

export default function CalendarGrid({
  completedTasks,
  selection,
  onSelectRange,
}: CalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    onSelectRange({ mode: 'day', date: now });
  };
  const goToThisWeek = () => {
    const now = new Date();
    setCurrentDate(now);
    onSelectRange({ mode: 'week', start: startOfWeek(now), end: endOfWeek(now) });
  };

  // Group tasks by date string 'yyyy-MM-dd'
  const tasksByDate = completedTasks.reduce(
    (acc, task) => {
      const completedTime = (task as Task & { _completedAt?: string })._completedAt;
      if (!completedTime) return acc;
      const dateStr = format(new Date(completedTime), 'yyyy-MM-dd');
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(task);
      return acc;
    },
    {} as Record<string, Task[]>,
  );

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="flex flex-col h-full bg-surface-primary rounded-xl border border-border-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-primary bg-surface-secondary/50">
        <h2 className="text-xl font-semibold text-text-primary">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToThisWeek}
            className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-surface-hover rounded-lg transition-colors mr-1"
          >
            This Week
          </button>
          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-primary bg-surface-hover rounded-lg transition-colors"
          >
            Today
          </button>
          <div className="flex items-center bg-surface-hover rounded-lg p-0.5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 text-text-secondary hover:text-text-primary rounded-md transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 text-text-secondary hover:text-text-primary rounded-md transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto">
        <div className="grid grid-cols-7 border-b border-border-primary">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-3 text-center text-xs font-semibold text-text-tertiary uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-7 grid-rows-5 md:grid-rows-auto">
          {days.map((day, dayIdx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayTasks = tasksByDate[dateKey] || [];
            const isSelected = selection
              ? selection.mode === 'day'
                ? isSameDay(day, selection.date)
                : day >= selection.start && day <= selection.end
              : false;
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);

            return (
              <button
                type="button"
                key={day.toString()}
                onClick={() => onSelectRange({ mode: 'day', date: day })}
                className={`
                  min-h-[100px] p-2 border-b border-r border-border-primary relative
                  flex flex-col items-start justify-start text-left
                  transition-all duration-200 group
                  ${!isCurrentMonth ? 'bg-surface-secondary/30 text-text-tertiary' : 'bg-surface-primary text-text-secondary'}
                  ${isSelected ? 'bg-interactive-primary/20' : 'hover:bg-surface-hover'}
                  ${dayIdx % 7 === 6 ? 'border-r-0' : ''}
                `}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className={`
                      text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                      ${isDayToday ? 'bg-interactive-primary text-interactive-primary-text' : ''}
                      ${isSelected && !isDayToday ? 'text-interactive-primary font-bold' : ''}
                    `}
                  >
                    {format(day, 'd')}
                  </span>
                </div>

                {dayTasks.length > 0 && (
                  <div className="mt-1 w-full flex flex-col gap-1 overflow-hidden">
                    <div className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md inline-flex items-center self-start">
                      {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                    </div>
                    {/* Optional: Show first 2 task titles */}
                    <div className="hidden md:flex flex-col gap-1 mt-1 w-full">
                      {dayTasks.slice(0, 2).map((task) => (
                        <div key={task.id} className="text-[10px] text-text-tertiary truncate px-1">
                          • {task.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <div className="text-[10px] text-text-tertiary px-1 italic">
                          +{dayTasks.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
