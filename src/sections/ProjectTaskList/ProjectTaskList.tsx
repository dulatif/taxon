import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { Archive, CheckSquare, RotateCcw, Square, Trash2 } from 'lucide-react';
import React from 'react';
import type { Project, Sprint, Task } from '../../types';

import type { TaskSortType, TaskTabType } from '../ProjectTabs/ProjectTabs';

interface ProjectTaskListProps {
  tasks: Task[]; // Note: This should be all tasks across workspace to support reordering properly, or handle it carefully.
  projectTasks: Task[]; // Tasks specifically for this project/sprint filter
  project: Project;
  sprints?: Sprint[];
  taskTab: TaskTabType;
  selectedSort: TaskSortType;
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
  sprints,
  taskTab,
  selectedSort,
  onToggleTask,
  onReorderTasks,
  onSelectTask,
  onAssignTaskToSprint,
  onArchiveTask,
  onUnarchiveTask,
  onSetTaskToDelete,
}: ProjectTaskListProps) {
  const activeTasks = projectTasks.filter((t) => !t.completed && !t.archived);
  const completedTasks = projectTasks.filter((t) => t.completed && !t.archived);
  const archivedTasks = projectTasks.filter((t) => t.archived);

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

  const sortedActiveTasks = sortTasksHelper(activeTasks);
  const sortedCompletedTasks = sortTasksHelper(completedTasks);
  const sortedArchivedTasks = sortTasksHelper(archivedTasks);

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

    const currentActive = [...sortedActiveTasks];
    const currentCompleted = [...sortedCompletedTasks];

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

  const renderTaskList = (taskList: Task[], droppableId: string, emptyMessage: string) => (
    <Droppable droppableId={droppableId} isDropDisabled={selectedSort !== 'custom'}>
      {(provided, snapshot) => (
        <ul
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`space-y-1.5 min-h-[40px] rounded-lg transition-colors select-none ${
            snapshot.isDraggingOver ? 'bg-surface-secondary/50 border border-white/20 p-1.5' : ''
          }`}
        >
          {taskList.length === 0 && !snapshot.isDraggingOver ? (
            <div className="py-8 text-center text-xs text-text-muted">{emptyMessage}</div>
          ) : (
            taskList.map((task, index) => (
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
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTask(task.id);
                        }}
                        className={`shrink-0 mt-0.5 transition-colors cursor-pointer ${
                          task.completed
                            ? 'text-green-400 hover:text-green-300'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {task.completed ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-semibold leading-relaxed ${
                            task.completed ? 'line-through text-text-muted' : 'text-text-primary'
                          }`}
                        >
                          {task.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {sprints && !task.archived && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <select
                            value={task.sprintId || ''}
                            onChange={(e) =>
                              onAssignTaskToSprint?.(task.id, e.target.value || null)
                            }
                            className="text-[9px] font-mono bg-surface-secondary hover:bg-surface-hover text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 cursor-pointer focus:outline-none transition-colors"
                            title="Assign or change sprint"
                          >
                            <option value="">Backlog</option>
                            {sprints
                              .filter((s) => s.projectId === project.id)
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                      {task.duration && !task.archived && (
                        <span className="text-[9px] font-mono font-semibold bg-surface-primary px-1.5 py-0.5 rounded border border-border-primary/50 text-text-muted">
                          {task.duration}
                        </span>
                      )}
                      {!task.archived ? (
                        <button
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
            ))
          )}
          {provided.placeholder}
        </ul>
      )}
    </Droppable>
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {taskTab === 'todo' &&
        renderTaskList(
          sortedActiveTasks,
          'active-tasks',
          'No active tasks. Use the field below to add one!',
        )}
      {taskTab === 'completed' &&
        renderTaskList(
          sortedCompletedTasks,
          'completed-tasks',
          'No completed tasks yet. Get to work!',
        )}
      {taskTab === 'archived' &&
        renderTaskList(sortedArchivedTasks, 'archived-tasks', 'No archived tasks.')}
    </DragDropContext>
  );
}
