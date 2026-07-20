import { Calendar, Check, Repeat, Tag, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';
import type { RecurrenceRule, Task } from '../../types';
import { getDueDateLabel, PRIORITY_COLORS } from '../../utils/taskFilters';

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const c = PRIORITY_COLORS[priority];
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider leading-tight ${c.bg} ${c.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 self-center ${c.dot}`} />
      <span className="self-center">{priority}</span>
    </span>
  );
}

export function DueDateBadge({ dueDate }: { dueDate: string | undefined }) {
  const label = getDueDateLabel(dueDate);
  if (!label) return null;
  const isOverdue = label === 'Overdue';
  const isToday = label === 'Today';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${
        isOverdue
          ? 'text-red-400 border-red-500/40 bg-red-500/10'
          : isToday
            ? 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10'
            : 'text-text-muted border-border-primary bg-black/30'
      }`}
    >
      <Calendar className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

export function RecurrenceBadge({ recurrence }: { recurrence?: RecurrenceRule }) {
  if (!recurrence) return null;
  let label = 'Daily';
  if (recurrence.frequency === 'daily')
    label =
      recurrence.interval && recurrence.interval > 1 ? `Every ${recurrence.interval}d` : 'Daily';
  else if (recurrence.frequency === 'weekdays') label = 'Weekdays';
  else if (recurrence.frequency === 'weekly') {
    if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = recurrence.daysOfWeek.map((d) => names[d]).join(',');
      label =
        recurrence.interval && recurrence.interval > 1
          ? `Every ${recurrence.interval}w (${days})`
          : `Weekly (${days})`;
    } else {
      label =
        recurrence.interval && recurrence.interval > 1 ? `Every ${recurrence.interval}w` : 'Weekly';
    }
  } else if (recurrence.frequency === 'monthly')
    label =
      recurrence.interval && recurrence.interval > 1 ? `Every ${recurrence.interval}m` : 'Monthly';
  else if (recurrence.frequency === 'yearly')
    label =
      recurrence.interval && recurrence.interval > 1 ? `Every ${recurrence.interval}y` : 'Yearly';
  else if (recurrence.frequency === 'custom') label = `Every ${recurrence.interval || 1}d`;

  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border text-blue-400 border-blue-500/40 bg-blue-500/10"
      title="Recurring Task"
    >
      <Repeat className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// TaskListItem
// ---------------------------------------------------------------------------

interface TaskListItemProps {
  task: Task;
  index: number;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSelectTask: (task: Task) => void;
}

export default function TaskListItem({
  task,
  index,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
}: TaskListItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ delay: index * 0.03 }}
      className="py-3 flex items-center justify-between group hover:bg-surface-secondary/50 px-2 rounded-lg transition-colors cursor-pointer"
      onClick={() => onSelectTask(task)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleTask(task.id);
          }}
          aria-label="Toggle Complete"
          className="w-4 h-4 rounded border border-border-primary flex items-center justify-center shrink-0 hover:border-white transition-colors"
        >
          <Check
            className={`w-2.5 h-2.5 text-text-primary transition-opacity ${
              task.completed ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
            }`}
          />
        </button>
        <div className="min-w-0">
          <span
            className={`text-xs font-semibold truncate block max-w-sm ${
              task.completed ? 'line-through text-text-muted' : 'text-text-primary'
            }`}
          >
            {task.title}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <PriorityBadge priority={task.priority} />
            <DueDateBadge dueDate={task.dueDate} />
            <RecurrenceBadge recurrence={task.recurrence} />
            {task.labels && task.labels.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[9px] text-text-muted bg-black/30 border border-border-primary/50 px-1.5 py-0.5 rounded">
                <Tag className="w-2.5 h-2.5" />
                {task.labels[0]}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[9px] font-mono text-text-muted bg-surface-primary border border-border-primary/40 px-1.5 py-0.5 rounded hidden group-hover:inline-flex items-center gap-1">
          {task.duration || '25m'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteTask(task.id);
          }}
          aria-label="Delete Task"
          className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
