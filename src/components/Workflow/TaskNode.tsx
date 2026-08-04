import { Handle, type NodeProps, Position } from '@xyflow/react';
import { Bot, CheckCircle2, Circle, Clock, ListTodo, Sparkles } from 'lucide-react';
import React, { memo } from 'react';
import type { Task } from '../../types';

export interface TaskNodeData {
  task: Task;
  isAgentActive?: boolean;
  isAgentNext?: boolean;
  onSelectTask?: (task: Task) => void;
  [key: string]: unknown;
}

const PRIORITY_STYLES: Record<Task['priority'], string> = {
  Critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  High: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Medium: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Low: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const STATUS_BADGE_STYLES: Record<Task['status'], string> = {
  'To Do': 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  'In Progress': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Need to Test': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Done: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

export const TaskNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as TaskNodeData;
  const { task, isAgentActive, isAgentNext, onSelectTask } = nodeData;

  if (!task) return null;

  const isDone = task.completed || task.status === 'Done';
  const completedSubtasks = task.subtasks?.filter((st) => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  // Completed / Collapsed rendering (ADR-003)
  if (isDone) {
    return (
      <div
        onClick={() => onSelectTask?.(task)}
        className={`w-[220px] h-[45px] rounded-lg border px-3 py-2 flex items-center justify-between cursor-pointer select-none transition-all duration-200 bg-card/70 backdrop-blur-xs opacity-40 hover:opacity-100 ${
          selected ? 'border-primary ring-2 ring-primary/30' : 'border-border/60'
        }`}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2 !h-2 !bg-border/80 !border-background"
        />

        <div className="flex items-center gap-2 min-w-0 flex-1">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-xs font-medium text-muted-foreground truncate line-through">
            {task.title}
          </span>
        </div>

        <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0 ml-1">
          {(task.id || '').slice(-6)}
        </span>

        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2 !bg-border/80 !border-background"
        />
      </div>
    );
  }

  // Active Task rendering
  return (
    <div
      onClick={() => onSelectTask?.(task)}
      className={`w-[220px] h-[90px] rounded-xl border p-3 flex flex-col justify-between cursor-pointer select-none bg-card/95 relative ${
        isAgentActive || isAgentNext || task.status === 'In Progress'
          ? ''
          : 'transition-all duration-200'
      } ${
        isAgentActive
          ? 'animate-workflow-purple'
          : isAgentNext
            ? 'animate-workflow-cyan border-dashed bg-cyan-950/5'
            : task.status === 'In Progress'
              ? 'animate-workflow-blue'
              : selected
                ? 'border-primary ring-2 ring-primary/30 shadow-md'
                : 'border-border hover:border-border/80 shadow-xs'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`!w-2.5 !h-2.5 !border-background ${
          isAgentActive
            ? '!bg-purple-500'
            : isAgentNext
              ? '!bg-cyan-400'
              : task.status === 'In Progress'
                ? '!bg-blue-400'
                : '!bg-muted-foreground/40'
        }`}
      />

      {/* Top row: Status/Agent badges and Priority */}
      <div className="flex items-center justify-between gap-1">
        {isAgentActive ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-purple-300 bg-purple-950/70 px-1.5 py-0.5 rounded-full border border-purple-500/50">
            <Bot className="w-3 h-3 text-purple-400 animate-workflow-beacon" />
            AI Active
          </span>
        ) : isAgentNext ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-cyan-300 bg-cyan-950/70 px-1.5 py-0.5 rounded-full border border-cyan-500/40">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            AI Next
          </span>
        ) : (
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex items-center gap-1.5 ${STATUS_BADGE_STYLES[task.status] || STATUS_BADGE_STYLES['To Do']}`}
          >
            {task.status === 'In Progress' && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-workflow-beacon" />
            )}
            {task.status || 'To Do'}
          </span>
        )}

        <span
          className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${PRIORITY_STYLES[task.priority] || PRIORITY_STYLES['Medium']}`}
        >
          {task.priority || 'Medium'}
        </span>
      </div>

      {/* Center: Title */}
      <div className="min-w-0">
        <h4 className="text-xs font-semibold text-foreground truncate leading-snug">
          {task.title}
        </h4>
      </div>

      {/* Bottom row: Subtasks and ID */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-2">
          {totalSubtasks > 0 ? (
            <span className="flex items-center gap-1">
              <ListTodo className="w-3 h-3" />
              {completedSubtasks}/{totalSubtasks}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              {task.status === 'In Progress' ? (
                <Clock className="w-3 h-3 text-blue-400" />
              ) : (
                <Circle className="w-3 h-3 text-zinc-500" />
              )}
            </span>
          )}
        </div>

        <span className="font-mono text-muted-foreground/60 text-[9px]">
          {(task.id || '').slice(-6)}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className={`!w-2.5 !h-2.5 !border-background ${
          isAgentActive
            ? '!bg-purple-500'
            : isAgentNext
              ? '!bg-cyan-400'
              : '!bg-muted-foreground/40'
        }`}
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';
