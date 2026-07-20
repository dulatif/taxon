import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import {
  CheckSquare,
  ChevronRight,
  Clock,
  ListTodo,
  Play,
  SortAsc,
  Square,
  Timer,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';
import type { Project, Task } from '../../types';
import { PRIORITY_COLORS } from '../../utils/taskFilters';

interface TodayTasksProps {
  sortedActiveTasks: Task[];
  sortedOverdueTasks: Task[];
  sortedCompletedTasks: Task[];
  projects: Project[];
  remainingTodayCount: number;
  selectedSort: 'custom' | 'priority';
  setSelectedSort: React.Dispatch<React.SetStateAction<'custom' | 'priority'>>;
  handleDragEnd: (result: DropResult) => void;
  onToggleTask: (id: string) => void;
  onSelectTask?: (task: Task) => void;
  onStartFocus: (task: Task) => void;
  onDeleteTask?: (id: string, onDeleted?: (id: string) => void) => void;
  getTaskTimeBadge: (task: Task) => string;
}

export default function TodayTasks({
  sortedActiveTasks,
  sortedOverdueTasks,
  sortedCompletedTasks,
  projects,
  remainingTodayCount,
  selectedSort,
  setSelectedSort,
  handleDragEnd,
  onToggleTask,
  onSelectTask,
  onStartFocus,
  onDeleteTask,
  getTaskTimeBadge,
}: TodayTasksProps) {
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [isOverdueExpanded, setIsOverdueExpanded] = useState(true);

  return (
    <section className="bg-surface-primary border border-border-primary rounded-xl">
      <div className="px-6 py-4 flex justify-between items-center bg-surface-secondary border-b border-border-primary rounded-t-xl">
        <h2 className="text-sm font-bold text-text-primary tracking-tight flex items-center gap-2">
          <ListTodo className="text-text-primary w-4 h-4" />
          Today's Tasks
        </h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedSort((s) => (s === 'custom' ? 'priority' : 'custom'))}
            className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors text-xs uppercase tracking-wider font-mono cursor-pointer bg-surface-hover px-2.5 py-1 rounded border border-border-primary hover:border-white/30"
            title={
              selectedSort === 'custom'
                ? 'Custom ordering enabled (click to sort by priority)'
                : 'Sorted by priority (click to enable custom drag & drop)'
            }
          >
            <SortAsc className="w-3.5 h-3.5" />
            <span>Sort: {selectedSort}</span>
          </button>
          <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest leading-none bg-surface-hover px-2 py-1 rounded-sm border border-border-primary">
            {remainingTodayCount} Remaining
          </span>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        {/* Active Tasks Container */}
        <div className="p-4">
          <Droppable droppableId="today-active-tasks" isDropDisabled={selectedSort !== 'custom'}>
            {(provided, snapshot) => (
              <ul
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`space-y-1.5 min-h-[40px] rounded-lg transition-colors select-none ${
                  snapshot.isDraggingOver
                    ? 'bg-surface-secondary/50 border border-white/20 p-1.5'
                    : ''
                }`}
              >
                {sortedActiveTasks.length === 0 && !snapshot.isDraggingOver ? (
                  <div className="py-12 text-center text-text-muted text-sm">
                    All done! Quick add a task above to get focused.
                  </div>
                ) : (
                  sortedActiveTasks.map((task, index) => {
                    const proj = projects.find((p) => p.id === task.projectId);
                    return (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                        isDragDisabled={selectedSort !== 'custom'}
                      >
                        {(provided, snapshot) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            id={`task-item-${task.id}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectTask?.(task)}
                            className={`py-3 px-4 flex items-center justify-between rounded-lg transition-colors group cursor-grab active:cursor-grabbing select-none border border-transparent ${
                              snapshot.isDragging
                                ? 'bg-surface-hover text-text-primary ring-1 ring-white/30 shadow-lg z-50 border-white/20'
                                : 'hover:bg-surface-secondary/50'
                            }`}
                          >
                            <div className="flex items-start gap-3 min-w-0 flex-1 mr-4 py-0.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleTask(task.id);
                                }}
                                className="shrink-0 mt-0.5 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                              >
                                <Square className="w-4 h-4" />
                              </button>
                              <span
                                title={task.priority}
                                className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${PRIORITY_COLORS[task.priority].dot}`}
                              />
                              <div className="min-w-0 flex-1 w-full flex flex-col gap-1 overflow-hidden">
                                <h3
                                  className="text-text-primary font-medium text-sm truncate w-full block leading-tight"
                                  title={task.title}
                                >
                                  {task.title}
                                </h3>
                                {proj && (
                                  <span className="text-[10px] text-text-muted bg-surface-secondary px-1.5 py-0.5 rounded border border-border-primary inline-block max-w-[200px] truncate leading-none">
                                    {proj.name}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-[10px] text-text-muted flex items-center gap-1 font-mono tracking-wider bg-black/40 px-2 py-0.5 rounded border border-border-primary/50">
                                <Clock className="w-3 h-3" /> {getTaskTimeBadge(task)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStartFocus(task);
                                }}
                                title="Start Focus Session"
                                className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-all cursor-pointer"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                              </button>
                              {onDeleteTask && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTask(task.id);
                                  }}
                                  className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  title="Delete task item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </li>
                        )}
                      </Draggable>
                    );
                  })
                )}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </div>

        {/* Overdue Tasks Accordion */}
        {sortedOverdueTasks.length > 0 && (
          <div className="border-t border-red-500/20 bg-red-500/5 pt-4 px-4 pb-4">
            <button
              type="button"
              onClick={() => setIsOverdueExpanded(!isOverdueExpanded)}
              className="w-full flex items-center justify-between py-2 text-red-400 hover:text-red-300 transition-colors cursor-pointer group px-2"
            >
              <div className="flex items-center gap-2">
                <ChevronRight
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isOverdueExpanded ? 'rotate-90' : ''
                  }`}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  Overdue Tasks
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 font-mono">
                  {sortedOverdueTasks.length}
                </span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isOverdueExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden mt-2"
                >
                  <Droppable
                    droppableId="today-overdue-tasks"
                    isDropDisabled={selectedSort !== 'custom'}
                  >
                    {(provided, snapshot) => (
                      <ul
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-1.5 min-h-[40px] rounded-lg transition-colors select-none ${
                          snapshot.isDraggingOver
                            ? 'bg-red-500/10 border border-red-500/20 p-1.5'
                            : ''
                        }`}
                      >
                        {sortedOverdueTasks.map((task, index) => {
                          const proj = projects.find((p) => p.id === task.projectId);
                          return (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                              isDragDisabled={selectedSort !== 'custom'}
                            >
                              {(provided, snapshot) => (
                                <li
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  id={`task-item-${task.id}`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => onSelectTask?.(task)}
                                  className={`py-3 px-4 flex items-center justify-between rounded-lg transition-colors group cursor-grab active:cursor-grabbing select-none border border-transparent bg-surface-secondary/40 ${
                                    snapshot.isDragging
                                      ? 'bg-surface-hover text-text-primary ring-1 ring-white/30 shadow-lg z-50 border-white/20'
                                      : 'hover:bg-surface-secondary'
                                  }`}
                                >
                                  <div className="flex items-start gap-3 min-w-0 flex-1 mr-4 py-0.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleTask(task.id);
                                      }}
                                      className="shrink-0 mt-0.5 text-red-400/70 hover:text-red-400 transition-colors cursor-pointer"
                                    >
                                      <Square className="w-4 h-4" />
                                    </button>
                                    <span
                                      title={task.priority}
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${PRIORITY_COLORS[task.priority].dot}`}
                                    />
                                    <div className="min-w-0 flex-1 w-full flex flex-col gap-1 overflow-hidden">
                                      <h3
                                        className="text-red-200/90 font-medium text-sm truncate w-full block leading-tight"
                                        title={task.title}
                                      >
                                        {task.title}
                                      </h3>
                                      {proj && (
                                        <span className="text-[10px] text-red-400/70 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 inline-block max-w-[200px] truncate leading-none">
                                          {proj.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-[10px] text-red-400/70 flex items-center gap-1 font-mono tracking-wider bg-black/40 px-2 py-0.5 rounded border border-red-500/20">
                                      <Clock className="w-3 h-3" /> {getTaskTimeBadge(task)}
                                    </span>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onStartFocus(task);
                                      }}
                                      title="Start Focus Session"
                                      className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded transition-all cursor-pointer"
                                    >
                                      <Play className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                    {onDeleteTask && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteTask(task.id);
                                        }}
                                        className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        title="Delete task item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </li>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Completed Tasks Accordion */}
        {sortedCompletedTasks.length > 0 && (
          <div className="border-t border-border-primary/50 pt-4 px-4 pb-4">
            <button
              type="button"
              onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}
              className="w-full flex items-center justify-between py-2 text-text-muted hover:text-text-primary transition-colors cursor-pointer group px-2"
            >
              <div className="flex items-center gap-2">
                <ChevronRight
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isCompletedExpanded
                      ? 'rotate-90 text-text-primary'
                      : 'text-text-muted group-hover:text-text-primary'
                  }`}
                />
                <span className="text-[11px] font-bold uppercase tracking-wider font-mono">
                  Completed Tasks
                </span>
                <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-surface-secondary text-text-muted border border-border-primary font-mono">
                  {sortedCompletedTasks.length}
                </span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {isCompletedExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: 'easeInOut' }}
                  className="overflow-hidden mt-2"
                >
                  <Droppable
                    droppableId="today-completed-tasks"
                    isDropDisabled={selectedSort !== 'custom'}
                  >
                    {(provided, snapshot) => (
                      <ul
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-1.5 min-h-[30px] rounded-lg transition-colors select-none ${
                          snapshot.isDraggingOver
                            ? 'bg-surface-secondary/50 border border-white/20 p-1.5'
                            : ''
                        }`}
                      >
                        {sortedCompletedTasks.map((task, index) => {
                          const proj = projects.find((p) => p.id === task.projectId);
                          return (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                              isDragDisabled={selectedSort !== 'custom'}
                            >
                              {(provided, snapshot) => (
                                <li
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  id={`task-item-${task.id}`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => onSelectTask?.(task)}
                                  className={`py-3 px-4 flex items-center justify-between rounded-lg transition-colors group cursor-grab active:cursor-grabbing select-none border border-transparent opacity-75 ${
                                    snapshot.isDragging
                                      ? 'bg-surface-hover text-text-primary ring-1 ring-white/30 shadow-lg z-50 opacity-100 border-white/20'
                                      : 'hover:bg-surface-secondary/40 hover:border-border-primary/30'
                                  }`}
                                >
                                  <div className="flex items-start gap-3 min-w-0 flex-1 mr-4 py-0.5">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleTask(task.id);
                                      }}
                                      className="shrink-0 mt-0.5 text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                                    >
                                      <CheckSquare className="w-4 h-4 text-text-primary" />
                                    </button>
                                    <span
                                      title={task.priority}
                                      className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${PRIORITY_COLORS[task.priority].dot}`}
                                    />
                                    <div className="min-w-0 flex-1 w-full flex flex-col gap-1 overflow-hidden">
                                      <span
                                        className="text-xs font-semibold text-text-primary group-hover:underline line-through text-text-muted/80 decoration-border-primary truncate w-full block leading-tight"
                                        title={task.title}
                                      >
                                        {task.title}
                                      </span>
                                      {proj && (
                                        <span className="text-[10px] text-text-muted bg-surface-secondary px-1.5 py-0.5 rounded border border-border-primary inline-block max-w-[200px] truncate leading-none opacity-60">
                                          {proj.name}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-[10px] text-text-muted flex items-center gap-1 font-mono tracking-wider bg-black/40 px-2 py-0.5 rounded border border-border-primary/50">
                                      <Clock className="w-3 h-3" /> {getTaskTimeBadge(task)}
                                    </span>
                                    {onDeleteTask && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteTask(task.id);
                                        }}
                                        className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                        title="Delete task item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </li>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </DragDropContext>

      <button
        type="button"
        onClick={() => {
          const el = document.querySelector('input[placeholder="I want to work on..."]');
          if (el) (el as HTMLInputElement).focus();
        }}
        className="w-full text-xs font-bold text-text-muted hover:text-text-primary bg-surface-secondary/30 hover:bg-surface-secondary/50 transition-all py-4 border-t border-border-primary rounded-b-xl cursor-pointer"
      >
        + Add New Task to Today
      </button>
    </section>
  );
}
