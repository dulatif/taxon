import { useState, useEffect, useCallback, useRef } from 'react';
import { Project, Task, DocumentFile, DailyActivity, ActivityLogEntry } from '../types';
import {
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_FILES,
  INITIAL_DAILY_ACTIVITY
} from '../data';
import {
  createLogEntry,
  updateDailyActivityWithCompletion
} from '../services/activityLogger';
import {
  getProjects, saveProject, deleteProject,
  getTasks, saveTask, deleteTask, deleteTasksByProject,
  getFiles, saveFile, deleteFile, deleteFilesByProject,
  getActivity, saveActivity, getActivityLog, saveActivityLogEntry,
  exportWorkspaceData, importWorkspaceData
} from '../services/database';
import { save as dialogSave, open as dialogOpen } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';

const STORAGE_PREFIX = 'axon_tasking_';

const tryParseJSON = (str: string | null) => {
  if (!str) return null;
  try { return JSON.parse(str); } catch (_) { return null; }
};

interface UseWorkspaceDataOptions {
  onProjectCreated?: (id: string) => void;
  onProjectDeleted?: () => void;
}

export function useWorkspaceData(options?: UseWorkspaceDataOptions) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const focusTickCounterRef = useRef(0);

  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [importPendingJson, setImportPendingJson] = useState<string | null>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        let dbProjects = await getProjects();
        let dbTasks = await getTasks();
        let dbFiles = await getFiles();
        let dbActivity = await getActivity();
        let dbLog = await getActivityLog();

        const isInitialized = localStorage.getItem(`${STORAGE_PREFIX}initialized`) === 'true';
        const isAllEmpty = dbProjects.length === 0 && dbTasks.length === 0 && dbFiles.length === 0 && dbActivity.length === 0;

        if (isAllEmpty || !isInitialized || dbProjects.length === 0 || dbTasks.length === 0) {
          const lsProjects = localStorage.getItem(`${STORAGE_PREFIX}projects`);
          const lsTasks = localStorage.getItem(`${STORAGE_PREFIX}tasks`);
          const lsFiles = localStorage.getItem(`${STORAGE_PREFIX}files`);
          const lsActivity = localStorage.getItem(`${STORAGE_PREFIX}activity`);
          const lsLog = localStorage.getItem(`${STORAGE_PREFIX}activityLog`);

          if (dbProjects.length === 0) {
            const parsed = lsProjects ? tryParseJSON(lsProjects) : null;
            dbProjects = (parsed && Array.isArray(parsed) && parsed.length > 0) ? parsed : INITIAL_PROJECTS;
            for (const p of dbProjects) await saveProject(p).catch(console.error);
          }

          if (dbTasks.length === 0) {
            const parsed = lsTasks ? tryParseJSON(lsTasks) : null;
            dbTasks = (parsed && Array.isArray(parsed) && parsed.length > 0) ? parsed : INITIAL_TASKS;
            for (const t of dbTasks) await saveTask(t).catch(console.error);
          }

          if (dbFiles.length === 0) {
            const parsed = lsFiles ? tryParseJSON(lsFiles) : null;
            dbFiles = (parsed && Array.isArray(parsed) && parsed.length > 0) ? parsed : INITIAL_FILES;
            for (const f of dbFiles) await saveFile(f).catch(console.error);
          }

          if (dbActivity.length === 0) {
            const parsed = lsActivity ? tryParseJSON(lsActivity) : null;
            dbActivity = (parsed && Array.isArray(parsed) && parsed.length > 0) ? parsed : INITIAL_DAILY_ACTIVITY;
            for (const a of dbActivity) await saveActivity(a).catch(console.error);
          }

          if (dbLog.length === 0 && lsLog) {
            const parsed = tryParseJSON(lsLog);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
              dbLog = parsed;
              for (const l of dbLog) await saveActivityLogEntry(l).catch(console.error);
            }
          }
          localStorage.setItem(`${STORAGE_PREFIX}initialized`, 'true');
        }

        setProjects(dbProjects);
        setTasks(dbTasks);
        setFiles(dbFiles);
        setDailyActivity(dbActivity);
        setActivityLog(dbLog);
      } catch (e) {
        console.error("Failed to load DB", e);
      } finally {
        setIsDataLoaded(true);
      }
    };
    initData();
  }, []);

  const logCompletion = useCallback((taskId: string, taskTitle: string) => {
    const entry = createLogEntry(taskId, taskTitle);
    setActivityLog(prev => [...prev, entry]);
    saveActivityLogEntry(entry);
  }, []);

  const recalculateProjectProgress = useCallback((projId: string) => {
    setTasks(latestTasks => {
      const pTasks = latestTasks.filter(t => t.projectId === projId);
      if (pTasks.length === 0) return latestTasks;
      const completed = pTasks.filter(t => t.completed).length;
      const computedPercentage = Math.round((completed / pTasks.length) * 100);

      setProjects(prevProjs => prevProjs.map(p => {
        if (p.id === projId) {
          const updatedProj = {
            ...p,
            progress: computedPercentage,
            category: computedPercentage === 100 ? 'Completed' as const : p.category
          };
          saveProject(updatedProj);
          return updatedProj;
        }
        return p;
      }));
      return latestTasks;
    });
  }, []);

  const handleCompleteTaskDirectly = useCallback((id: string) => {
    let targetProjId: string | null = null;
    let completedTaskTitle = '';
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        targetProjId = t.projectId;
        completedTaskTitle = t.title;
        const updatedTask = { ...t, completed: true, status: 'Done' as const };
        saveTask(updatedTask);
        return updatedTask;
      }
      return t;
    }));

    if (completedTaskTitle) {
      logCompletion(id, completedTaskTitle);
    }

    setDailyActivity(prev => {
      const acts = updateDailyActivityWithCompletion(prev);
      acts.forEach(a => saveActivity(a));
      return acts;
    });

    if (targetProjId) {
      recalculateProjectProgress(targetProjId);
    }
  }, [logCompletion, recalculateProjectProgress]);

  const handleToggleTask = useCallback((id: string) => {
    let targetProjId: string | null = null;
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          targetProjId = t.projectId;
          const willComplete = !t.completed;
          if (willComplete) {
            logCompletion(t.id, t.title);
            setDailyActivity(prevAct => {
              const acts = updateDailyActivityWithCompletion(prevAct);
              acts.forEach(a => saveActivity(a));
              return acts;
            });
          }
          const updatedTask = {
            ...t,
            completed: willComplete,
            status: willComplete ? ('Done' as const) : ('To Do' as const)
          };
          saveTask(updatedTask);
          return updatedTask;
        }
        return t;
      });
      return updated;
    });

    setTimeout(() => {
      if (targetProjId) {
        recalculateProjectProgress(targetProjId);
      }
    }, 50);
  }, [logCompletion, recalculateProjectProgress]);

  const handleAddTask = useCallback((title: string, projectId?: string, dueDate?: string) => {
    const getTodayStr = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const newTask: Task = {
      id: `task_${Date.now()}`,
      projectId: projectId || null,
      title,
      completed: false,
      duration: '45m',
      priority: 'Medium',
      status: 'To Do',
      dueDate: dueDate || getTodayStr()
    };
    setTasks(prev => [newTask, ...prev]);
    saveTask(newTask);

    if (projectId) {
      setTimeout(() => recalculateProjectProgress(projectId), 50);
    }
  }, [recalculateProjectProgress]);

  const handleDeleteTask = useCallback((id: string, onDeleted?: (id: string) => void) => {
    if (onDeleted) {
      onDeleted(id);
    }
    const task = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    deleteTask(id);
    if (task?.projectId) {
      setTimeout(() => recalculateProjectProgress(task.projectId!), 50);
    }
  }, [tasks, recalculateProjectProgress]);

  const handleUpdateTaskDetail = useCallback((updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    saveTask(updatedTask);
    if (updatedTask.projectId) {
      setTimeout(() => recalculateProjectProgress(updatedTask.projectId!), 50);
    }
  }, [recalculateProjectProgress]);

  const handleCreateProject = useCallback((name: string, description: string, category: Project['category']) => {
    if (!name.trim()) return;

    const newId = `proj_${Date.now()}`;
    const newProj: Project = {
      id: newId,
      name: name.trim(),
      description: description.trim() || 'No description provided.',
      category,
      progress: 0,
      dueDays: Math.floor(Math.random() * 20) + 10
    };

    setProjects(prev => [...prev, newProj]);
    saveProject(newProj);

    if (options?.onProjectCreated) {
      options.onProjectCreated(newId);
    }
  }, [options]);

  const handleDeleteProject = useCallback((projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTasks(prev => prev.filter(t => t.projectId !== projectId));
    setFiles(prev => prev.filter(f => f.projectId !== projectId));

    deleteProject(projectId);
    deleteTasksByProject(projectId);
    deleteFilesByProject(projectId);

    if (options?.onProjectDeleted) {
      options.onProjectDeleted();
    }
  }, [options]);

  const handleCompleteProject = useCallback((projectId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const up = { ...p, category: 'Completed' as const, progress: 100 };
        saveProject(up);
        return up;
      }
      return p;
    }));
    setTasks(prev => prev.map(t => {
      if (t.projectId === projectId && !t.completed) {
        logCompletion(t.id, t.title);
        const ut = { ...t, completed: true, status: 'Done' as const };
        saveTask(ut);
        return ut;
      }
      return t;
    }));
  }, [logCompletion]);

  const handleEditProject = useCallback((projectId: string, name: string, description: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const up = { ...p, name, description };
        saveProject(up);
        return up;
      }
      return p;
    }));
  }, []);

  const handleAddFile = useCallback((projectId: string, name: string, size: string, type: DocumentFile['type']) => {
    const newFile: DocumentFile = {
      id: `file_${Date.now()}`,
      projectId,
      name,
      size,
      type
    };
    setFiles(prev => [...prev, newFile]);
    saveFile(newFile);
  }, []);

  const handleDeleteFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    deleteFile(id);
  }, []);

  const handleExportData = useCallback(async () => {
    try {
      const json = await exportWorkspaceData();
      const path = await dialogSave({
        title: 'Export Workspace Data',
        defaultPath: 'taxon-workspace.json',
        filters: [{ name: 'JSON', extensions: ['json'] }]
      });
      if (path) {
        await writeTextFile(path, json);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, []);

  const handleImportDataTrigger = useCallback(async () => {
    try {
      const selected = await dialogOpen({
        title: 'Import Workspace Data',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        multiple: false
      });
      if (selected && typeof selected === 'string') {
        const json = await readTextFile(selected);
        setImportPendingJson(json);
        setIsImportConfirmOpen(true);
      }
    } catch (err) {
      console.error('Import failed:', err);
    }
  }, []);

  const confirmImport = useCallback(async () => {
    if (!importPendingJson) return;
    try {
      await importWorkspaceData(importPendingJson);
      setIsImportConfirmOpen(false);
      setImportPendingJson(null);
      window.location.reload();
    } catch (err) {
      console.error('Import confirmation failed:', err);
    }
  }, [importPendingJson]);

  const handleMoveTaskStatus = useCallback((taskId: string, newStatus: Task['status']) => {
    let targetProjId: string | null = null;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        targetProjId = t.projectId;
        const willComplete = newStatus === 'Done';
        if (willComplete && !t.completed) {
          logCompletion(t.id, t.title);
          setDailyActivity(prevAct => {
            const acts = updateDailyActivityWithCompletion(prevAct);
            acts.forEach(a => saveActivity(a));
            return acts;
          });
        }
        const updatedTask = {
          ...t,
          status: newStatus,
          completed: willComplete
        };
        saveTask(updatedTask);
        return updatedTask;
      }
      return t;
    }));

    if (targetProjId) {
      setTimeout(() => recalculateProjectProgress(targetProjId!), 50);
    }
  }, [logCompletion, recalculateProjectProgress]);

  const onTickFocusTime = useCallback((task: Task | null) => {
    if (task) {
      focusTickCounterRef.current += 1;
      if (focusTickCounterRef.current >= 60) {
        focusTickCounterRef.current = 0;
        setTasks(prev => prev.map(t => {
          if (t.id === task.id) {
            const updated = { ...t, timeSpent: (t.timeSpent || 0) + 1 };
            saveTask(updated);
            return updated;
          }
          return t;
        }));
      }
    } else {
      focusTickCounterRef.current = 0;
    }
    setDailyActivity(prev => {
      const acts = prev.map(act => {
        if (act.isToday) {
          return {
            ...act,
            hours: Number((act.hours + (1 / 3600)).toFixed(4)),
          };
        }
        return act;
      });
      const todayAct = acts.find(a => a.isToday);
      if (todayAct) saveActivity(todayAct);
      return acts;
    });
  }, []);

  return {
    projects,
    tasks,
    files,
    dailyActivity,
    activityLog,
    isDataLoaded,
    handleToggleTask,
    handleCompleteTaskDirectly,
    handleAddTask,
    handleDeleteTask,
    handleUpdateTaskDetail,
    handleMoveTaskStatus,
    handleCreateProject,
    handleDeleteProject,
    handleCompleteProject,
    handleEditProject,
    handleAddFile,
    handleDeleteFile,
    handleExportData,
    handleImportDataTrigger,
    confirmImport,
    isImportConfirmOpen,
    setIsImportConfirmOpen,
    setImportPendingJson,
    onTickFocusTime
  };
}
