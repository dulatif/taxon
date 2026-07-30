import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { Archive, CheckSquare, RotateCcw, Square, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import Button from '../../components/Button';

import type { Project, Sprint, Task } from '../../types';
import type { TaskSortType, TaskTabType } from '../ProjectTabs/ProjectTabs';

interface ProjectTaskListProps {
  tasks: Task[];
  projectTasks: Task[];
  project: Project;
  sprints?: Sprint[];
  taskTab: TaskTabType;
  selectedSort: TaskSortType;
  dueDateFilter: string;
  onToggleTask: (id: string) => void;
  onReorderTasks?: (tasks: Task[]) => void;
  onSelectTask?: (task: Task) => void;
  onAssignTaskToSprint?: (taskId: string, sprintId: string | null) => void;
  onArchiveTask?: (id: string) => void;
  onUnarchiveTask?: (id: string) => void;
  onSetTaskToDelete: (task: Task) => void;
}

export default function ProjectTaskList({
  tasks,
  projectTasks,
  project,
  taskTab,
  selectedSort,
  dueDateFilter,
  onToggleTask,
  onReorderTasks,
  onSelectTask,
  onArchiveTask,
  onUnarchiveTask,
  onSetTaskToDelete,
}: ProjectTaskListProps) {
  const [visibleCount, setVisibleCount] = useState(10);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleCount(10);
  }, [project.id, taskTab]);
  const filterByDueDate = (list: Task[]) => {
    if (dueDateFilter === 'all') return list;
    if (dueDateFilter === 'unscheduled') return list.filter((t) => !t.dueDate);
    return list.filter((t) => t.dueDate === dueDateFilter);
  };

  const getFilteredTasksByStatus = () => {
    const list = filterByDueDate(projectTasks);
    switch (taskTab) {
      case 'all':
        return list.filter((t) => !t.archived);
      case 'todo':
      case 'To Do':
        return list.filter((t) => (!t.status || t.status === 'To Do') && !t.archived);
      case 'In Progress':
        return list.filter((t) => t.status === 'In Progress' && !t.archived);
      case 'Need to Test':
        return list.filter((t) => t.status === 'Need to Test' && !t.archived);
      case 'completed':
        return list.filter((t) => (t.completed || t.status === 'Done') && !t.archived);
      case 'archived':
        return list.filter((t) => t.archived);
      default:
        return list.filter((t) => !t.archived);
    }
  };

  const currentFilteredTasks = getFilteredTasksByStatus();

  const sortTasksHelper = (list: Task[]) => {
    return [...list].sort((a, b) => {
      if (selectedSort === 'priority') {
        const weights: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        return (weights[b.priority || 'Medium'] || 2) - (weights[a.priority || 'Medium'] || 2);
      }
      if (selectedSort === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999);
    });
  };

  const sortedTasks = sortTasksHelper(currentFilteredTasks);
  const visibleTasks = sortedTasks.slice(0, visibleCount);

  const handleDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || !onReorderTasks) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const isSourceCompleted = source.droppableId === 'completed-tasks';
    const isDestCompleted = destination.droppableId === 'completed-tasks';

    const draggedTask = projectTasks.find((t) => t.id === draggableId);
    if (!draggedTask) return;

    const activeTasks = projectTasks.filter((t) => !t.completed && !t.archived);
    const completedTasks = projectTasks.filter((t) => t.completed && !t.archived);

    const currentActive = [...sortTasksHelper(activeTasks)];
    const currentCompleted = [...sortTasksHelper(completedTasks)];

    if (isSourceCompleted) {
      const idx = currentCompleted.findIndex((t) => t.id === draggableId);
      if (idx !== -1) currentCompleted.splice(idx, 1);
    } else {
      const idx = currentActive.findIndex((t) => t.id === draggableId);
      if (idx !== -1) currentActive.splice(idx, 1);
    }

    const updatedTask = {
      ...draggedTask,
      completed: isDestCompleted,
      status: isDestCompleted ? ('Done' as const) : ('To Do' as const),
    };

    if (isSourceCompleted !== isDestCompleted) {
      onToggleTask(draggedTask.id);
    }

    if (isDestCompleted) {
      currentCompleted.splice(destination.index, 0, updatedTask);
    } else {
      currentActive.splice(destination.index, 0, updatedTask);
    }

    const reorderedProjectTasks = [...currentActive, ...currentCompleted];
    const otherTasks = tasks.filter((t) => t.projectId !== project.id);
    onReorderTasks([...reorderedProjectTasks, ...otherTasks]);
  };

  const emptyMessages: Record<string, string> = {
    all: 'No tasks found.',
    todo: 'No active tasks. Use the field below to add one!',
    'To Do': 'No tasks in To Do.',
    'In Progress': 'No tasks currently In Progress.',
    'Need to Test': 'No tasks waiting to be tested.',
    completed: 'No completed tasks yet.',
    archived: 'No archived tasks.',
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="project-tasks-list" isDropDisabled={selectedSort !== 'custom'}>
        {(provided, snapshot) => (
          <ul
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-1.5 min-h-[40px] rounded-lg transition-colors select-none ${
              snapshot.isDraggingOver ? 'bg-surface-secondary/50 border border-white/20 p-1.5' : ''
            }`}
          >
            {sortedTasks.length === 0 && !snapshot.isDraggingOver ? (
              <div className="py-8 text-center text-xs text-text-muted">
                {emptyMessages[taskTab] || 'No tasks matching current filter.'}
              </div>
            ) : (
              <>
                {visibleTasks.map((task, index) => (
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
                        className={`flex items-start justify-between py-3 px-3 rounded-lg transition-colors group cursor-grab active:cursor-grabbing select-none border border-transparent ${
                          snapshot.isDragging
                            ? 'bg-surface-hover text-white ring-1 ring-white/30 shadow-lg z-50 border-white/20'
                            : 'hover:bg-surface-secondary/10'
                        }`}
                      >
                        <div className="flex items-start gap-4 flex-1 mr-4">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTask(task.id);
                            }}
                            className={`shrink-0 mt-0.5 transition-colors cursor-pointer ${
                              task.completed || task.status === 'Done'
                                ? 'text-green-400 hover:text-green-300'
                                : 'text-text-muted hover:text-text-primary'
                            }`}
                          >
                            {task.completed || task.status === 'Done' ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0 flex items-start gap-2">
                            <div
                              className={`w-1.5 h-1.5 rounded-full shrink-0 mt-[6px] ${
                                task.priority === 'Critical'
                                  ? 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]'
                                  : task.priority === 'High'
                                    ? 'bg-orange-400 shadow-[0_0_6px_rgba(251,146,60,0.5)]'
                                    : task.priority === 'Medium'
                                      ? 'bg-blue-400'
                                      : 'bg-gray-500/50'
                              }`}
                              title={`Priority: ${task.priority || 'None'}`}
                            />
                            <p
                              className={`text-xs font-semibold leading-relaxed ${
                                task.completed || task.status === 'Done'
                                  ? 'line-through text-text-muted'
                                  : 'text-text-primary'
                              }`}
                            >
                              {task.title}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {task.duration && !task.archived && (
                            <span className="text-[9px] font-mono font-semibold bg-surface-primary px-1.5 py-0.5 rounded border border-border-primary/50 text-text-muted">
                              {task.duration}
                            </span>
                          )}
                          {task.subtasks && task.subtasks.length > 0 && (
                            <div
                              className="flex items-center justify-center shrink-0"
                              title={`${task.subtasks.filter((st) => st.completed).length}/${task.subtasks.length} subtasks`}
                            >
                              <svg viewBox="0 0 36 36" className="w-4 h-4 -rotate-90">
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.9155"
                                  fill="none"
                                  className="stroke-border-primary"
                                  strokeWidth="4.5"
                                />
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="15.9155"
                                  fill="none"
                                  className={
                                    task.subtasks.filter((st) => st.completed).length ===
                                    task.subtasks.length
                                      ? 'stroke-green-400'
                                      : 'stroke-interactive-primary'
                                  }
                                  strokeWidth="4.5"
                                  strokeDasharray={`${(task.subtasks.filter((st) => st.completed).length / task.subtasks.length) * 100}, 100`}
                                  strokeLinecap="round"
                                />
                              </svg>
                            </div>
                          )}
                          {!task.archived ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onArchiveTask?.(task.id);
                              }}
                              className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Archive task"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnarchiveTask?.(task.id);
                              }}
                              className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Unarchive task"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSetTaskToDelete(task);
                            }}
                            className="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            title="Delete task item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </li>
                    )}
                  </Draggable>
                ))}

                {visibleCount < sortedTasks.length && !snapshot.isDraggingOver && (
                  <div className="pt-2 pb-1 flex justify-center">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setVisibleCount((prev) => prev + 10)}
                    >
                      Show More
                    </Button>
                  </div>
                )}
              </>
            )}
            {provided.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );
}
