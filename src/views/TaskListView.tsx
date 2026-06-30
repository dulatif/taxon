import React from 'react';
import { Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task } from '../types';

interface TaskListViewProps {
  title: string;
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSelectTask: (task: Task) => void;
}

export default function TaskListView({
  title,
  tasks,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
}: TaskListViewProps) {
  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6">
        <div className="flex justify-between items-center mb-6 pb-2 border-b border-[#27272A]/50">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono leading-none">
            {title}
          </h2>
          <span className="text-[10px] font-mono font-bold bg-[#141313] border border-[#27272A] text-[#8E9192] px-2 py-0.5 rounded">
            {tasks.length} Items Listed
          </span>
        </div>

        <div className="divide-y divide-[#27272A]/50">
          <AnimatePresence>
            {tasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 text-center text-xs text-[#8E9192]"
              >
                No records match current parameters.
              </motion.div>
            ) : (
              tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ delay: index * 0.05 }}
                  className="py-3.5 flex items-center justify-between group hover:bg-[#141313]/50 px-2 rounded-lg transition-colors cursor-pointer"
                  onClick={() => onSelectTask(task)}
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                      aria-label="Toggle Complete"
                      className="w-4 h-4 rounded border border-[#27272A] flex items-center justify-center shrink-0 hover:border-white transition-colors"
                    >
                      <Check className={`w-2.5 h-2.5 text-white transition-opacity ${task.completed ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                    </button>
                    <span className={`text-xs font-semibold truncate max-w-lg hover:text-white ${task.completed ? 'line-through text-[#8E9192]' : 'text-white'}`}>
                      {task.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[9px] font-mono tracking-wide py-0.5 px-1.5 bg-[#141313] border border-[#27272A]/40 text-[#8E9192] rounded">
                      {task.duration || '25m'}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                      aria-label="Delete Task"
                      className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-white"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
