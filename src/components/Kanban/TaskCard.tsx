import type {
  DraggableProvidedDraggableProps,
  DraggableProvidedDragHandleProps,
} from '@hello-pangea/dnd';
import { AlertCircle, CheckCircle } from 'lucide-react';
import React, { forwardRef } from 'react';
import type { Task } from '../../types';

export interface TaskCardProps {
  task: Task;
  colName: string;
  isDragging?: boolean;
  draggableProps?: DraggableProvidedDraggableProps;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  onSelectTask?: (task: Task) => void;
  getPriorityClass: (priority: Task['priority']) => string;
}

export const TaskCard = forwardRef<HTMLDivElement, TaskCardProps>(
  (
    {
      task,
      colName,
      isDragging = false,
      draggableProps,
      dragHandleProps,
      onSelectTask,
      getPriorityClass,
    },
    ref,
  ) => {
    const hasWorktree = !!task.workspacePath || task.worktreeStatus === 'active';

    return (
      <div
        ref={ref}
        {...draggableProps}
        {...dragHandleProps}
        onClick={() => onSelectTask?.(task)}
        className={`task-card bg-surface-secondary border p-4 transition-all group rounded-lg relative cursor-grab select-none ${
          isDragging
            ? 'border-text-primary ring-2 ring-text-primary/20 z-50'
            : colName === 'Need to Test'
              ? 'border-orange-500/50 hover:border-orange-400/80 bg-orange-500/5'
              : 'border-border-primary hover:border-border-primary/80'
        } ${colName === 'Done' && !isDragging ? 'opacity-65' : ''}`}
      >
        {/* Header: Title and optional Worktree indicator */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`text-xs font-medium leading-relaxed text-text-primary flex-1 ${
              colName === 'Done'
                ? 'line-through text-text-muted'
                : colName === 'Need to Test'
                  ? 'text-orange-400'
                  : ''
            }`}
          >
            {task.title}
          </h3>

          {hasWorktree && (
            <span
              className="flex items-center gap-0.5 px-1 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 shrink-0"
              title={`Active Worktree: ${task.worktreeBranch || task.workspacePath}`}
            >
              <span>🌳</span>
            </span>
          )}
        </div>

        {/* Bottom metadata row: Priority, Time effort/duration, Done indicator */}
        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border-primary/40">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded-sm uppercase tracking-wider ${getPriorityClass(
                task.priority,
              )}`}
            >
              {task.priority || 'Medium'}
            </span>
            {task.escalated ? (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold font-mono rounded-sm uppercase tracking-wider bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                <span>Escalated</span>
              </span>
            ) : task.revisionCount !== undefined && task.revisionCount > 0 ? (
              <span className="px-2 py-0.5 text-[9px] font-bold font-mono rounded-sm uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Attempt {task.revisionCount + 1}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-text-muted text-[10px] font-mono leading-none bg-surface-primary/40 px-1.5 py-0.5 rounded border border-border-primary/40">
              {task.duration || '25m'}
            </span>
            {colName === 'Done' && <CheckCircle className="w-3.5 h-3.5 text-text-primary" />}
          </div>
        </div>
      </div>
    );
  },
);

TaskCard.displayName = 'TaskCard';

export default TaskCard;
