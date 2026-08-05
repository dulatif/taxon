import { useCallback, useState } from 'react';
import {
  deleteFile,
  deleteFilesByProject,
  deleteProject,
  deleteSprintsByProject,
  deleteTasksByProject,
  saveFile,
  saveProject,
} from '../services/database';
import type { DocumentFile, Project } from '../types';

interface UseProjectActionsOptions {
  onProjectCreated?: (id: string) => void;
  onProjectDeleted?: () => void;
  onCategoryUsed?: (category: string) => void;
}

export function useProjectActions(options?: UseProjectActionsOptions) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<DocumentFile[]>([]);

  const handleCreateProject = useCallback(
    (name: string, description: string, category: Project['category'], dueDate?: string) => {
      if (!name.trim()) return;

      const newId = `proj_${Date.now()}`;
      const newProj: Project = {
        id: newId,
        name: name.trim(),
        description: description.trim() || 'No description provided.',
        category,
        progress: 0,
        dueDate,
      };

      setProjects((prev) => [...prev, newProj]);
      saveProject(newProj);

      options?.onCategoryUsed?.(category);
      options?.onProjectCreated?.(newId);
    },
    [options],
  );

  const handleDeleteProject = useCallback(
    (projectId: string) => {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setFiles((prev) => prev.filter((f) => f.projectId !== projectId));

      deleteProject(projectId);
      deleteTasksByProject(projectId);
      deleteFilesByProject(projectId);
      deleteSprintsByProject(projectId);

      options?.onProjectDeleted?.();
    },
    [options],
  );

  const handleCompleteProject = useCallback(
    (projectId: string, onProjectTasksCompleted?: (projectId: string) => void) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === projectId) {
            const up = { ...p, category: 'Completed' as const, progress: 100 };
            saveProject(up);
            return up;
          }
          return p;
        }),
      );

      if (onProjectTasksCompleted) {
        onProjectTasksCompleted(projectId);
      }
    },
    [],
  );

  const handleEditProject = useCallback(
    (
      projectId: string,
      name: string,
      description: string,
      category?: string,
      dueDate?: string,
      workspacePaths?: string[],
    ) => {
      setProjects((prev) =>
        prev.map((p) => {
          if (p.id === projectId) {
            const up = {
              ...p,
              name,
              description,
              ...(category ? { category } : {}),
              ...(dueDate !== undefined ? { dueDate } : {}),
              ...(workspacePaths !== undefined ? { workspacePaths } : {}),
            };
            saveProject(up);
            return up;
          }
          return p;
        }),
      );
      if (category) {
        options?.onCategoryUsed?.(category);
      }
    },
    [options],
  );

  const handleSetVaultPath = useCallback((projectId: string, vaultPath: string) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          const up = { ...p, vaultPath };
          saveProject(up);
          return up;
        }
        return p;
      }),
    );
  }, []);

  const handleReorderProjects = useCallback((reorderedProjects: Project[]) => {
    const updated = reorderedProjects.map((p, idx) => ({ ...p, sortOrder: idx }));
    setProjects(updated);
    updated.forEach((p) => saveProject(p));
  }, []);

  const handleAddFile = useCallback(
    (projectId: string, name: string, size: string, type: DocumentFile['type']) => {
      const newFile: DocumentFile = {
        id: `file_${Date.now()}`,
        projectId,
        name,
        size,
        type,
      };
      setFiles((prev) => [...prev, newFile]);
      saveFile(newFile);
    },
    [],
  );

  const handleDeleteFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    deleteFile(id);
  }, []);

  const handleTogglePinProject = useCallback((projectId: string) => {
    setProjects((prev) => {
      const pinnedCount = prev.filter((p) => p.pinned).length;
      return prev.map((p) => {
        if (p.id === projectId) {
          const up = { ...p, pinned: !p.pinned };
          if (up.pinned) {
            up.pinnedSortOrder = pinnedCount;
          } else {
            up.pinnedSortOrder = undefined;
          }
          saveProject(up);
          return up;
        }
        return p;
      });
    });
  }, []);

  const handleReorderPinnedProjects = useCallback((reorderedPinnedProjects: Project[]) => {
    const updated = reorderedPinnedProjects.map((p, idx) => ({ ...p, pinnedSortOrder: idx }));
    setProjects((prev) => {
      const newProjects = [...prev];
      updated.forEach((up) => {
        const idx = newProjects.findIndex((p) => p.id === up.id);
        if (idx !== -1) {
          newProjects[idx] = up;
        }
      });
      return newProjects;
    });
    updated.forEach((p) => saveProject(p));
  }, []);

  return {
    projects,
    setProjects,
    files,
    setFiles,
    handleCreateProject,
    handleDeleteProject,
    handleCompleteProject,
    handleEditProject,
    handleSetVaultPath,
    handleReorderProjects,
    handleTogglePinProject,
    handleReorderPinnedProjects,
    handleAddFile,
    handleDeleteFile,
  };
}
