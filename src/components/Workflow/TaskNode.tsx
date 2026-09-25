import { Handle, type NodeProps, Position } from '@xyflow/react';
import { Bot, CheckCircle2, Circle, Clock, ListTodo, Sparkles } from 'lucide-react';
import React, { memo } from 'react';
import type { Task } from '../../types';

export interface TaskNodeData {
  task: Task;
  isAgentActive?: boolean;
  isAgentNext?: boolean;
  isSelected?: boolean;
  selected?: boolean;
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

  const isSelected = Boolean(selected || nodeData.selected || nodeData.isSelected);
  const isDone = task.completed || task.status === 'Done';
  const isNeedToTest = task.status === 'Need to Test';
  const completedSubtasks = task.subtasks?.filter((st) => st.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

  // Completed / Collapsed rendering (ADR-003)
  if (isDone) {
    return (
      <div
        onClick={() => onSelectTask?.(task)}
        data-testid={`task-node-${task.id}`}
        className={`workflow-task-node workflow-task-node-done w-[220px] h-[45px] rounded-lg border px-3 py-2 flex items-center justify-between cursor-pointer select-none transition-all duration-200 shadow-xs ${
          isSelected
            ? 'border-primary ring-2 ring-primary/60 shadow-md ring-offset-1 ring-offset-background z-10'
            : 'hover:border-emerald-400/80'
        }`}
      >
        {/* Multi-directional Target Handles */}
        <Handle
          id="target-top"
          type="target"
          position={Position.Top}
          className="!opacity-0 !pointer-events-none"
        />
        <Handle
          id="target-left"
          type="target"
          position={Position.Left}
          className="!opacity-0 !pointer-events-none"
        />
        <Handle
          id="target-bottom"
          type="target"
          position={Position.Bottom}
          className="!opacity-0 !pointer-events-none"
        />
        <Handle
          id="target-right"
          type="target"
          position={Position.Right}
          className="!opacity-0 !pointer-events-none"
        />

        <div
          className={`flex items-center gap-1.5 min-w-0 flex-1 transition-opacity ${
            isSelected ? 'opacity-100' : 'opacity-85 hover:opacity-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-medium text-emerald-100/90 dark:text-emerald-100/90 truncate line-through">
            {task.title}
          </span>
        </div>

        <span className="text-[10px] font-mono text-emerald-300/60 shrink-0 ml-1">
          {(task.id || '').slice(-6)}
        </span>

        {/* Multi-directional Source Handles */}
        <Handle
          id="source-bottom"
          type="source"
          position={Position.Bottom}
          className="!opacity-0 !pointer-events-none"
        />
        <Handle
          id="source-right"
          type="source"
          position={Position.Right}
          className="!opacity-0 !pointer-events-none"
        />
        <Handle
          id="source-top"
          type="source"
          position={Position.Top}
          className="!opacity-0 !pointer-events-none"
        />
        <Handle
          id="source-left"
          type="source"
          position={Position.Left}
          className="!opacity-0 !pointer-events-none"
        />
      </div>
    );
  }

  // Active Task rendering
  return (
    <div
      onClick={() => onSelectTask?.(task)}
      data-testid={`task-node-${task.id}`}
      className={`workflow-task-node ${
        isDone ? 'workflow-task-node-done' : isNeedToTest ? 'workflow-task-node-test' : ''
      } w-[220px] h-[90px] rounded-xl border p-3 flex flex-col justify-between cursor-pointer select-none relative ${
        isAgentActive || isAgentNext || task.status === 'In Progress'
          ? ''
          : 'transition-all duration-200'
      } ${
        isSelected
          ? 'border-primary ring-2 ring-primary/60 shadow-md ring-offset-1 ring-offset-background z-10'
          : isDone
            ? 'hover:border-emerald-400/80 shadow-xs'
            : isNeedToTest
              ? 'hover:border-purple-400/80 shadow-xs'
              : 'border-border-primary hover:border-border-hover shadow-xs'
      } ${
        isAgentActive
          ? 'animate-workflow-purple'
          : isAgentNext
            ? 'animate-workflow-cyan border-dashed'
            : task.status === 'In Progress'
              ? 'animate-workflow-blue'
              : ''
      }`}
    >
      {/* Multi-directional Target Handles */}
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className="!opacity-0 !pointer-events-none"
      />
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className="!opacity-0 !pointer-events-none"
      />
      <Handle
        id="target-bottom"
        type="target"
        position={Position.Bottom}
        className="!opacity-0 !pointer-events-none"
      />
      <Handle
        id="target-right"
        type="target"
        position={Position.Right}
        className="!opacity-0 !pointer-events-none"
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
      <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {totalSubtasks > 0 ? (
            <span
              className="flex items-center gap-1 shrink-0"
              title={`${completedSubtasks}/${totalSubtasks} subtasks completed`}
            >
              <ListTodo className="w-3 h-3" />
              {completedSubtasks}/{totalSubtasks}
            </span>
          ) : (
            <span className="flex items-center gap-1 shrink-0">
              {task.status === 'In Progress' ? (
                <Clock className="w-3 h-3 text-blue-400" />
              ) : (
                <Circle className="w-3 h-3 text-zinc-500" />
              )}
            </span>
          )}
        </div>

        <span className="font-mono text-muted-foreground/60 text-[9px] shrink-0 ml-auto">
          {(task.id || '').slice(-6)}
        </span>
      </div>

      {/* Multi-directional Source Handles */}
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        className="!opacity-0 !pointer-events-none"
      />
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        className="!opacity-0 !pointer-events-none"
      />
      <Handle
        id="source-top"
        type="source"
        position={Position.Top}
        className="!opacity-0 !pointer-events-none"
      />
      <Handle
        id="source-left"
        type="source"
        position={Position.Left}
        className="!opacity-0 !pointer-events-none"
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';
