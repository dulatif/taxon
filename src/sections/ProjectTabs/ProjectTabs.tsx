import { Calendar as CalendarIcon, Filter, SortAsc, X } from 'lucide-react';
import { useState } from 'react';
import CustomSelect from '../../components/CustomSelect';
import DatePicker from '../../components/DatePicker/DatePicker';
import { formatDisplayDate } from '../../utils/format-date';

export type TaskTabType =
  | 'all'
  | 'todo'
  | 'To Do'
  | 'In Progress'
  | 'Need to Test'
  | 'completed'
  | 'archived';

export type TaskSortType = 'custom' | 'priority' | 'dueDate';

interface ProjectTabsProps {
  taskTab: TaskTabType;
  onChangeTab: (tab: TaskTabType) => void;
  selectedSort: TaskSortType;
  onChangeSort: (sort: TaskSortType) => void;
  dueDateFilter: string;
  onChangeDueDateFilter: (filter: string) => void;
  counts: {
    all: number;
    todo: number;
    inProgress: number;
    needToTest: number;
    completed: number;
    archived: number;
  };
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
}

export default function ProjectTabs({
  taskTab,
  onChangeTab,
  selectedSort,
  onChangeSort,
  dueDateFilter,
  onChangeDueDateFilter,
  counts,
  searchQuery,
  onChangeSearchQuery,
}: ProjectTabsProps) {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const statusOptions = [
    { value: 'all' as TaskTabType, label: 'All Tasks', badge: counts.all },
    { value: 'todo' as TaskTabType, label: 'To Do', badge: counts.todo },
    { value: 'In Progress' as TaskTabType, label: 'In Progress', badge: counts.inProgress },
    { value: 'Need to Test' as TaskTabType, label: 'Need to Test', badge: counts.needToTest },
    { value: 'completed' as TaskTabType, label: 'Completed', badge: counts.completed },
    { value: 'archived' as TaskTabType, label: 'Archived', badge: counts.archived },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border-primary/60">
      <div className="flex items-center gap-3 sm:gap-4">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
          Tasks
        </h2>

        {/* CustomSelect Status Filter Dropdown */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-tertiary hidden sm:block" />
          <CustomSelect
            value={taskTab}
            onChange={(v) => onChangeTab(v as TaskTabType)}
            options={statusOptions}
            size="sm"
          />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => onChangeSearchQuery(e.target.value)}
            className="hidden sm:block bg-surface-secondary border border-border-primary rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-interactive-primary min-w-[180px]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            className={`flex items-center gap-1.5 text-xs tracking-wider font-mono cursor-pointer px-2.5 py-1.5 rounded-lg border transition-colors ${
              dueDateFilter !== 'all'
                ? 'bg-interactive-primary/10 border-interactive-primary/30 text-interactive-primary'
                : 'bg-surface-secondary border-border-primary/80 text-text-muted hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>
              {dueDateFilter === 'all'
                ? 'Date'
                : dueDateFilter === 'unscheduled'
                  ? 'Unscheduled'
                  : formatDisplayDate(dueDateFilter)}
            </span>
            {dueDateFilter !== 'all' && (
              <X
                className="w-3 h-3 ml-1 cursor-pointer hover:opacity-70"
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeDueDateFilter('all');
                }}
              />
            )}
          </button>

          {isDatePickerOpen && (
            <div className="absolute top-full right-0 mt-2 z-50 shadow-xl">
              <DatePicker
                value={dueDateFilter === 'all' ? undefined : dueDateFilter}
                onChange={(date) => {
                  onChangeDueDateFilter(date);
                  setIsDatePickerOpen(false);
                }}
                onClose={() => setIsDatePickerOpen(false)}
                title="Presets"
                unscheduledValue="unscheduled"
                positionClass="right-0 top-full"
              />
            </div>
          )}
        </div>

        {taskTab !== 'archived' && (
          <button
            type="button"
            onClick={() => {
              const seq: TaskSortType[] = ['custom', 'priority', 'dueDate'];
              const nextIdx = (seq.indexOf(selectedSort) + 1) % seq.length;
              onChangeSort(seq[nextIdx]!);
            }}
            className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors text-xs uppercase tracking-wider font-mono cursor-pointer bg-surface-secondary hover:bg-surface-hover px-2.5 py-1.5 rounded-lg border border-border-primary/80 self-start sm:self-auto"
          >
            <SortAsc className="w-3.5 h-3.5" />
            <span>Sort: {selectedSort}</span>
          </button>
        )}
      </div>
    </div>
  );
}
