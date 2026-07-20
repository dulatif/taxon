import { Archive, SortAsc } from 'lucide-react';
import React from 'react';

export type TaskTabType = 'todo' | 'completed' | 'archived';
export type TaskSortType = 'custom' | 'priority' | 'dueDate';

interface ProjectTabsProps {
  taskTab: TaskTabType;
  onChangeTab: (tab: TaskTabType) => void;
  selectedSort: TaskSortType;
  onChangeSort: (sort: TaskSortType) => void;
  counts: {
    active: number;
    completed: number;
    archived: number;
  };
}

export default function ProjectTabs({
  taskTab,
  onChangeTab,
  selectedSort,
  onChangeSort,
  counts,
}: ProjectTabsProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border-primary/60">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
          Tasks
        </h2>
        <div className="flex items-center bg-surface-secondary p-1 rounded-lg border border-border-primary/80">
          <button
            type="button"
            onClick={() => onChangeTab('todo')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer focus:outline-none ${
              taskTab === 'todo'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/60 border border-transparent'
            }`}
          >
            <span className="translate-y-[1px]">To Do</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                taskTab === 'todo' ? 'bg-black text-white' : 'bg-surface-primary text-text-muted'
              }`}
            >
              {counts.active}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('completed')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer focus:outline-none ${
              taskTab === 'completed'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/60 border border-transparent'
            }`}
          >
            <span className="translate-y-[1px]">Completed</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                taskTab === 'completed'
                  ? 'bg-black text-white'
                  : 'bg-surface-primary text-text-muted'
              }`}
            >
              {counts.completed}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onChangeTab('archived')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer focus:outline-none ${
              taskTab === 'archived'
                ? 'bg-white text-black font-bold shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-hover/60 border border-transparent'
            }`}
          >
            <Archive className="w-3 h-3 translate-y-[1px]" />
            <span className="translate-y-[1px]">Archived</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                taskTab === 'archived'
                  ? 'bg-black text-white'
                  : 'bg-surface-primary text-text-muted'
              }`}
            >
              {counts.archived}
            </span>
          </button>
        </div>
      </div>

      {taskTab !== 'archived' && (
        <button
          onClick={() => {
            const seq: TaskSortType[] = ['custom', 'priority', 'dueDate'];
            const nextIdx = (seq.indexOf(selectedSort) + 1) % seq.length;
            onChangeSort(seq[nextIdx]);
          }}
          className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors text-xs uppercase tracking-wider font-mono cursor-pointer bg-surface-secondary hover:bg-surface-hover px-2.5 py-1.5 rounded-lg border border-border-primary/80 self-start sm:self-auto"
        >
          <SortAsc className="w-3.5 h-3.5" />
          <span>Sort: {selectedSort}</span>
        </button>
      )}
    </div>
  );
}
