import React, { useState, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, parseISO, isSameDay } from 'date-fns';
import {
  Calendar,
  Clock,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Task, Project } from '../types';

interface CalendarViewProps {
  tasks: Task[];
  projects: Project[];
  onToggleTask: (id: string) => void;
  onSelectTask?: (task: Task) => void;
}

export default function CalendarView({
  tasks,
  projects,
  onToggleTask,
  onSelectTask,
}: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // Build a map of dates that have tasks due
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks) {
      if (task.dueDate) {
        const dateKey = task.dueDate;
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
    return keys.map(d => parseISO(d));
  }, [tasksByDate]);

  // Tasks for the selected date
  const selectedDateTasks = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return tasksByDate.get(dateKey) || [];
  }, [selectedDate, tasksByDate]);

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'Personal';
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown';
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <div className="grid grid-cols-12 gap-6">

        {/* Calendar Widget */}
        <div className="col-span-12 lg:col-span-7">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Calendar
              </h2>
              <span className="text-[10px] text-[#8E9192] font-mono uppercase tracking-wider">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
            </div>

            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              modifiers={{
                hasTasks: datesWithTasks,
              }}
              modifiersClassNames={{
                hasTasks: 'taxon-has-tasks',
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
              components={{
                Chevron: ({ orientation }) =>
                  orientation === 'left' ? (
                    <ChevronLeft className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  ),
              }}
            />
          </div>
        </div>

        {/* Selected Day Task Panel */}
        <div className="col-span-12 lg:col-span-5">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6 sticky top-24">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#27272A]/50">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                {isSameDay(selectedDate, new Date()) ? "Today" : format(selectedDate, 'MMM d, yyyy')}
              </h3>
              <span className="text-[10px] font-mono font-bold bg-[#141313] border border-[#27272A] text-[#8E9192] px-2 py-0.5 rounded">
                {selectedDateTasks.length} Task{selectedDateTasks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {selectedDateTasks.length === 0 ? (
              <div className="py-12 text-center">
                <Calendar className="w-8 h-8 text-[#27272A] mx-auto mb-3" />
                <p className="text-xs text-[#8E9192]">No tasks scheduled for this date.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                {selectedDateTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask?.(task)}
                    className={`p-3.5 bg-[#141313] border border-[#27272A] rounded-lg group hover:border-white/20 transition-all cursor-pointer ${
                      task.completed ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                        className="w-4 h-4 rounded border border-[#27272A] flex items-center justify-center shrink-0 mt-0.5 hover:border-white transition-colors"
                      >
                        <Check className={`w-2.5 h-2.5 text-white transition-opacity ${task.completed ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold text-white leading-relaxed ${task.completed ? 'line-through text-[#8E9192]' : ''}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-mono text-[#8E9192] bg-black px-1.5 py-0.5 rounded border border-[#27272A]/40">
                            {getProjectName(task.projectId)}
                          </span>
                          <span className="text-[9px] font-mono text-[#8E9192] flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            {task.duration || '25m'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
