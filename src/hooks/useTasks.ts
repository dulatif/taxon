import { invoke } from '@tauri-apps/api/core';
import { useCallback } from 'react';
import { saveTask } from '../services/database';
import type { Project, Task } from '../types';
import { useTaskActions } from './useTaskActions';

export interface WorktreeSpawnResult {
  workspacePath: string;
  worktreeBranch: string;
  success: boolean;
  message?: string;
}

export async function spawnWorktreeForTask(
  task: Task,
  project: Project,
): Promise<{ updatedTask: Task; spawnResult: WorktreeSpawnResult } | null> {
  let projectPath = '';
  if (project.workspacePaths && project.workspacePaths.length > 0) {
    projectPath = project.workspacePaths[0];
  }
  if (!projectPath && project.vaultPath) {
    projectPath = project.vaultPath;
  }

  if (!projectPath) {
    console.warn(`No valid repository path found for project ${project.name} (${project.id})`);
    return null;
  }

  try {
    const res = await invoke<WorktreeSpawnResult>('git_worktree_spawn', {
      projectPath,
      taskId: task.id,
      worktreeDir: project.worktreeDir || '.worktrees',
      baseBranch: null,
      setupCommand: project.worktreeSetupCommand || null,
    });

    if (res && res.workspacePath) {
      const updatedTask: Task = {
        ...task,
        workspacePath: res.workspacePath,
        worktreeBranch: res.worktreeBranch,
        worktreeStatus: 'active',
      };
      await saveTask(updatedTask);
      return { updatedTask, spawnResult: res };
    }
  } catch (err) {
    console.error('Failed to spawn worktree for task:', err);
    throw err;
  }

  return null;
}

export interface UseTasksOptions {
  projects?: Project[];
  onTaskCompleted?: (taskId: string, taskTitle: string) => void;
  onProjectProgressChanged?: (projectId: string) => void;
}

export function useTasks(options?: UseTasksOptions) {
  const baseActions = useTaskActions({
    onTaskCompleted: options?.onTaskCompleted,
    onProjectProgressChanged: options?.onProjectProgressChanged,
  });

  const handleMoveTaskStatusWithWorktree = useCallback(
    async (taskId: string, newStatus: Task['status']) => {
      // Find task and associated project
      const currentTask = baseActions.tasks.find((t) => t.id === taskId);
      const proj = options?.projects?.find((p) => p.id === currentTask?.projectId);

      // Perform base move
      baseActions.handleMoveTaskStatus(taskId, newStatus);

      // If moving to In Progress and worktrees are enabled on project, auto-spawn if not yet spawned
      if (
        newStatus === 'In Progress' &&
        currentTask &&
        proj &&
        proj.worktreeEnabled &&
        !currentTask.workspacePath
      ) {
        try {
          const outcome = await spawnWorktreeForTask(currentTask, proj);
          if (outcome) {
            baseActions.setTasks((prev) =>
              prev.map((t) => (t.id === taskId ? outcome.updatedTask : t)),
            );
          }
        } catch (e) {
          console.warn('Automatic worktree spawning encountered an issue:', e);
        }
      }
    },
    [baseActions, options?.projects],
  );

  return {
    ...baseActions,
    handleMoveTaskStatus: handleMoveTaskStatusWithWorktree,
    spawnWorktree: spawnWorktreeForTask,
  };
}

export default useTasks;
