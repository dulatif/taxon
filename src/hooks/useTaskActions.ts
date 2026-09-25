import { useCallback, useState } from 'react';
import { deleteTask, saveTask } from '../services/database';
import type { RecurrenceRule, Task } from '../types';
import { getTodayStr } from '../utils/format-date';
import { calculateNextDueDate } from '../utils/recurrence';

interface UseTaskActionsOptions {
  onTaskCompleted?: (taskId: string, taskTitle: string) => void;
  onProjectProgressChanged?: (projectId: string) => void;
}

export function useTaskActions(options?: UseTaskActionsOptions) {
  const [tasks, setTasks] = useState<Task[]>([]);

  const handleAddTask = useCallback(
    (
      title: string,
      projectId?: string,
      dueDate?: string,
      recurrence?: RecurrenceRule,
      sprintId?: string | null,
    ): Task => {
      const effectiveDueDate =
        dueDate !== undefined && dueDate !== '' ? dueDate : recurrence ? getTodayStr() : '';

      const newTask: Task = {
        id: `task_${Date.now()}`,
        projectId: projectId || null,
        sprintId: sprintId !== undefined ? sprintId : null,
        title,
        completed: false,
        duration: '45m',
        priority: 'Medium',
        status: 'To Do',
        dueDate: effectiveDueDate,
        recurrence,
      };

      setTasks((prev) => [newTask, ...prev]);
      saveTask(newTask);

      if (projectId) {
        setTimeout(() => options?.onProjectProgressChanged?.(projectId), 50);
      }
      return newTask;
    },
    [options],
  );

  const handleCompleteTaskDirectly = useCallback(
    (id: string) => {
      let targetProjId: string | null = null;
      let completedTaskTitle = '';
      let spawnedTask: Task | null = null;

      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.id === id) {
            targetProjId = t.projectId;
            completedTaskTitle = t.title;

            if (!t.completed && t.recurrence) {
              const nextDate = calculateNextDueDate(t.dueDate, t.recurrence);
              spawnedTask = {
                ...t,
                id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                completed: false,
                status: 'To Do' as const,
                dueDate: nextDate,
                timeSpent: 0,
                subtasks: t.subtasks
                  ? t.subtasks.map((s) => ({ ...s, completed: false }))
                  : undefined,
              };
            }
            const effectiveDueDate = !t.dueDate ? getTodayStr() : t.dueDate;
            const updatedTask = {
              ...t,
              completed: true,
              status: 'Done' as const,
              dueDate: effectiveDueDate,
            };
            saveTask(updatedTask);
            return updatedTask;
          }
          return t;
        });

        if (spawnedTask) {
          saveTask(spawnedTask);
          return [spawnedTask, ...updated];
        }
        return updated;
      });

      if (completedTaskTitle) {
        options?.onTaskCompleted?.(id, completedTaskTitle);
      }

      if (targetProjId) {
        setTimeout(() => options?.onProjectProgressChanged?.(targetProjId!), 50);
      }
    },
    [options],
  );

  const handleToggleTask = useCallback(
    (id: string) => {
      let targetProjId: string | null = null;
      let spawnedTask: Task | null = null;

      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.id === id) {
            targetProjId = t.projectId;
            const willComplete = !t.completed;

            if (willComplete) {
              options?.onTaskCompleted?.(t.id, t.title);

              if (t.recurrence) {
                const nextDate = calculateNextDueDate(t.dueDate, t.recurrence);
                spawnedTask = {
                  ...t,
                  id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  completed: false,
                  status: 'To Do' as const,
                  dueDate: nextDate,
                  timeSpent: 0,
                  subtasks: t.subtasks
                    ? t.subtasks.map((s) => ({ ...s, completed: false }))
                    : undefined,
                };
              }
            }
            const effectiveDueDate = willComplete && !t.dueDate ? getTodayStr() : t.dueDate;
            const updatedTask = {
              ...t,
              completed: willComplete,
              status: willComplete ? ('Done' as const) : ('To Do' as const),
              dueDate: effectiveDueDate,
            };
            saveTask(updatedTask);
            return updatedTask;
          }
          return t;
        });

        if (spawnedTask) {
          saveTask(spawnedTask);
          return [spawnedTask, ...updated];
        }
        return updated;
      });

      if (targetProjId) {
        setTimeout(() => options?.onProjectProgressChanged?.(targetProjId!), 50);
      }
    },
    [options],
  );

  const handleDeleteTask = useCallback(
    (id: string, onDeleted?: (id: string) => void) => {
      if (onDeleted) onDeleted(id);
      const task = tasks.find((t) => t.id === id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      deleteTask(id);
      if (task?.projectId) {
        setTimeout(() => options?.onProjectProgressChanged?.(task.projectId!), 50);
      }
    },
    [tasks, options],
  );

  const handleUpdateTaskDetail = useCallback(
    (updatedTask: Task) => {
      let targetProjId: string | null = null;
      let spawnedTask: Task | null = null;

      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.id === updatedTask.id) {
            targetProjId = t.projectId;
            const taskToSave = { ...updatedTask };
            if (taskToSave.status === 'Done') {
              taskToSave.completed = true;
            } else if (taskToSave.status) {
              taskToSave.completed = false;
            }
            if (
              (taskToSave.completed ||
                taskToSave.status === 'Done' ||
                taskToSave.status === 'Need to Test') &&
              !taskToSave.dueDate
            ) {
              taskToSave.dueDate = getTodayStr();
            }

            const willComplete = taskToSave.completed;
            if (willComplete && !t.completed) {
              options?.onTaskCompleted?.(t.id, t.title);

              if (taskToSave.recurrence) {
                const nextDate = calculateNextDueDate(taskToSave.dueDate, taskToSave.recurrence);
                spawnedTask = {
                  ...taskToSave,
                  id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  completed: false,
                  status: 'To Do' as const,
                  dueDate: nextDate,
                  timeSpent: 0,
                  subtasks: taskToSave.subtasks
                    ? taskToSave.subtasks.map((s) => ({ ...s, completed: false }))
                    : undefined,
                };
              }
            }

            saveTask(taskToSave);
            return taskToSave;
          }
          return t;
        });

        if (spawnedTask) {
          saveTask(spawnedTask);
          return [spawnedTask, ...updated];
        }
        return updated;
      });

      const pid = updatedTask.projectId || targetProjId;
      if (pid) {
        setTimeout(() => options?.onProjectProgressChanged?.(pid), 50);
      }
    },
    [options],
  );

  const handleMoveTaskStatus = useCallback(
    (taskId: string, newStatus: Task['status']) => {
      let targetProjId: string | null = null;
      let spawnedTask: Task | null = null;

      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.id === taskId) {
            targetProjId = t.projectId;
            const willComplete = newStatus === 'Done';
            if (willComplete && !t.completed) {
              options?.onTaskCompleted?.(t.id, t.title);

              if (t.recurrence) {
                const nextDate = calculateNextDueDate(t.dueDate, t.recurrence);
                spawnedTask = {
                  ...t,
                  id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  completed: false,
                  status: 'To Do' as const,
                  dueDate: nextDate,
                  timeSpent: 0,
                  subtasks: t.subtasks
                    ? t.subtasks.map((s) => ({ ...s, completed: false }))
                    : undefined,
                };
              }
            }
            const effectiveDueDate = willComplete && !t.dueDate ? getTodayStr() : t.dueDate;
            const updatedTask = {
              ...t,
              status: newStatus,
              completed: willComplete,
              dueDate: effectiveDueDate,
            };
            saveTask(updatedTask);
            return updatedTask;
          }
          return t;
        });

        if (spawnedTask) {
          saveTask(spawnedTask);
          return [spawnedTask, ...updated];
        }
        return updated;
      });

      if (targetProjId) {
        setTimeout(() => options?.onProjectProgressChanged?.(targetProjId!), 50);
      }
    },
    [options],
  );

  const handleArchiveTask = useCallback(
    (id: string) => {
      let targetProjId: string | null = null;
      const now = new Date().toISOString();
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            targetProjId = t.projectId;
            const updatedTask = { ...t, archived: true, archivedAt: now };
            saveTask(updatedTask);
            return updatedTask;
          }
          return t;
        }),
      );
      if (targetProjId) {
        setTimeout(() => options?.onProjectProgressChanged?.(targetProjId!), 50);
      }
    },
    [options],
  );

  const handleUnarchiveTask = useCallback(
    (id: string) => {
      let targetProjId: string | null = null;
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id === id) {
            targetProjId = t.projectId;
            const updatedTask = { ...t, archived: false, archivedAt: undefined };
            saveTask(updatedTask);
            return updatedTask;
          }
          return t;
        }),
      );
      if (targetProjId) {
        setTimeout(() => options?.onProjectProgressChanged?.(targetProjId!), 50);
      }
    },
    [options],
  );

  const handleArchiveAllCompleted = useCallback(
    (projectId?: string, taskIds?: string[]) => {
      const now = new Date().toISOString();
      const affectedProjectIds = new Set<string>();

      setTasks((prev) =>
        prev.map((t) => {
          const shouldArchive = taskIds
            ? taskIds.includes(t.id) && t.completed && !t.archived
            : t.completed && !t.archived && (!projectId || t.projectId === projectId);

          if (shouldArchive) {
            if (t.projectId) affectedProjectIds.add(t.projectId);
            const updatedTask = { ...t, archived: true, archivedAt: now };
            saveTask(updatedTask);
            return updatedTask;
          }
          return t;
        }),
      );

      setTimeout(() => {
        affectedProjectIds.forEach((pid) => options?.onProjectProgressChanged?.(pid));
      }, 50);
    },
    [options],
  );

  const handleReorderTasks = useCallback((reorderedTasks: Task[]) => {
    const updated = reorderedTasks.map((t, idx) => ({ ...t, sortOrder: idx }));
    setTasks(updated);
    updated.forEach((t) => saveTask(t));
  }, []);

  const handleAssignTaskToSprint = useCallback((taskId: string, sprintId: string | null) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === taskId) {
          const u = { ...t, sprintId };
          saveTask(u);
          return u;
        }
        return t;
      }),
    );
  }, []);

  return {
    tasks,
    setTasks,
    handleAddTask,
    handleToggleTask,
    handleCompleteTaskDirectly,
    handleDeleteTask,
    handleUpdateTaskDetail,
    handleMoveTaskStatus,
    handleArchiveTask,
    handleUnarchiveTask,
    handleArchiveAllCompleted,
    handleReorderTasks,
    handleAssignTaskToSprint,
  };
}
