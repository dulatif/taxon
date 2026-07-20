import { CheckCircle2, Clock, Edit3, Play, Trash2 } from 'lucide-react';
import React from 'react';
import type { Sprint } from '../../types';
import { formatDateRange } from '../../utils/format-date';

interface SprintListProps {
  plannedSprints: Sprint[];
  completedSprints: Sprint[];
  selectedSprintId: string | 'all' | 'backlog';
  getSprintStats: (id: string) => { total: number; completed: number; percentage: number };
  onSelectSprint: (id: string | 'all') => void;
  onEditSprint: (id: string, updates: Partial<Sprint>) => void;
  onStartEdit: (sprint: Sprint) => void;
  onDeleteSprint: (id: string) => void;
}

export default function SprintList({
  plannedSprints,
  completedSprints,
  selectedSprintId,
  getSprintStats,
  onSelectSprint,
  onEditSprint,
  onStartEdit,
  onDeleteSprint,
}: SprintListProps) {
  if (plannedSprints.length === 0 && completedSprints.length === 0) return null;

  return (
    <div className="space-y-2 pt-2 border-t border-border-primary/60">
      <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider block mb-1">
        Other Sprints ({plannedSprints.length + completedSprints.length})
      </span>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* Planned Sprints */}
        {plannedSprints.map((sprint) => {
          const stats = getSprintStats(sprint.id);
          const isSelected = selectedSprintId === sprint.id;
          return (
            <div
              key={sprint.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono transition-all ${
                isSelected
                  ? 'bg-surface-secondary border-interactive-primary'
                  : 'bg-surface-secondary/50 border-border-primary hover:border-text-muted'
              }`}
            >
              <div
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                onClick={() => onSelectSprint(isSelected ? 'all' : sprint.id)}
              >
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="truncate">
                  <span className="font-bold text-text-primary block truncate">{sprint.name}</span>
                  <span className="text-[10px] text-text-muted">
                    {formatDateRange(sprint.startDate, sprint.endDate)} • {stats.total} tasks
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => onEditSprint(sprint.id, { status: 'Active' })}
                  className="px-2 py-1 rounded bg-interactive-primary/10 hover:bg-interactive-primary/20 text-interactive-primary border border-interactive-primary/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Activate this sprint"
                >
                  <Play className="w-2.5 h-2.5 fill-current" />
                  Start
                </button>
                <button
                  onClick={() => onStartEdit(sprint)}
                  className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  title="Edit"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteSprint(sprint.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Completed Sprints */}
        {completedSprints.map((sprint) => {
          const stats = getSprintStats(sprint.id);
          const isSelected = selectedSprintId === sprint.id;
          return (
            <div
              key={sprint.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono opacity-75 hover:opacity-100 transition-all ${
                isSelected
                  ? 'bg-surface-secondary border-interactive-primary opacity-100'
                  : 'bg-surface-primary border-border-primary hover:border-text-muted'
              }`}
            >
              <div
                className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                onClick={() => onSelectSprint(isSelected ? 'all' : sprint.id)}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <div className="truncate">
                  <span className="font-semibold text-text-muted line-through block truncate">
                    {sprint.name}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {formatDateRange(sprint.startDate, sprint.endDate)} • {stats.completed}/
                    {stats.total} done
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => onStartEdit(sprint)}
                  className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                  title="Edit"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteSprint(sprint.id)}
                  className="p-1.5 rounded hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
