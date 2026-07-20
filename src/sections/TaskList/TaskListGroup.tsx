import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import type { Task } from '../../types';
import TaskListItem from './TaskListItem';

interface TaskListGroupProps {
  groupName: string;
  tasks: Task[];
  collapsed: boolean;
  onToggle: () => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSelectTask: (task: Task) => void;
}

export default function TaskListGroup({
  groupName,
  tasks,
  collapsed,
  onToggle,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
}: TaskListGroupProps) {
  const done = tasks.filter((t) => t.completed).length;

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-surface-secondary/60 transition-colors group cursor-pointer"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-text-muted" />
        )}
        <Folder className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-xs font-bold text-text-muted tracking-wide">{groupName}</span>
        <span className="text-[10px] font-mono bg-surface-primary border border-border-primary text-text-muted px-1.5 py-0.5 rounded ml-auto">
          {done}/{tasks.length}
        </span>
      </button>

      {/* Group rows */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-border-primary/40 pl-2">
              <AnimatePresence>
                {tasks.map((task, index) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    index={index}
                    onToggleTask={onToggleTask}
                    onDeleteTask={onDeleteTask}
                    onSelectTask={onSelectTask}
                  />
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
