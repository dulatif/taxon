import { Calendar, CheckCircle2, Edit3, Target } from 'lucide-react';
import React from 'react';
import type { Sprint } from '../../types';
import { formatDateRange } from '../../utils/format-date';

interface SprintProgressProps {
  sprint: Sprint;
  stats: { total: number; completed: number; percentage: number };
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onComplete: () => void;
}

export default function SprintProgress({
  sprint,
  stats,
  isSelected,
  onSelect,
  onEdit,
  onComplete,
}: SprintProgressProps) {
  return (
    <div
      onClick={onSelect}
      className={`relative rounded-xl border p-4 transition-all cursor-pointer ${
        isSelected
          ? 'bg-surface-secondary border-interactive-primary shadow-lg shadow-interactive-primary/10'
          : 'bg-surface-secondary border-interactive-primary/40 hover:border-interactive-primary/60'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-interactive-primary/20 text-interactive-primary border border-interactive-primary/40">
            <span className="w-1.5 h-1.5 rounded-full bg-interactive-primary animate-pulse" />
            ACTIVE SPRINT
          </span>
          <h4 className="text-sm font-bold text-text-primary tracking-wide font-mono hover:text-interactive-primary transition-colors flex items-center gap-1.5">
            {sprint.name}
          </h4>
          <span className="text-xs font-mono text-text-muted flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-text-muted" />
            {formatDateRange(sprint.startDate, sprint.endDate)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
              isSelected
                ? 'bg-interactive-primary text-interactive-primary-text font-bold'
                : 'bg-surface-primary border border-border-primary text-text-muted hover:text-text-primary'
            }`}
          >
            {isSelected ? 'Filtered' : 'Filter Tasks'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="p-1.5 rounded bg-surface-primary border border-border-primary hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            title="Edit Sprint"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onComplete();
            }}
            className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-white font-bold text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-green-500/10"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Complete
          </button>
        </div>
      </div>

      {/* Goal if exists */}
      {sprint.goal && (
        <div className="flex items-start gap-2 text-xs text-text-primary bg-surface-primary/80 border border-border-primary rounded-lg p-2.5 mb-3">
          <Target className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong className="text-amber-400/90 font-mono">Sprint Goal:</strong> {sprint.goal}
          </span>
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-text-muted">
            Progress ({stats.completed}/{stats.total} Tasks)
          </span>
          <span className="text-interactive-primary font-bold">{stats.percentage}%</span>
        </div>
        <div className="w-full h-2 bg-surface-primary border border-border-primary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-interactive-primary to-cyan-400 transition-all duration-500"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
