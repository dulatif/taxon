import { useCallback, useEffect, useRef, useState } from 'react';
import { PROJECT_CATEGORIES } from '../constants/categories';
import {
  INITIAL_DAILY_ACTIVITY,
  INITIAL_FILES,
  INITIAL_PROJECTS,
  INITIAL_SPRINTS,
  INITIAL_TASKS,
} from '../constants/initial-data';
import { createLogEntry, updateDailyActivityWithCompletion } from '../services/activityLogger';
import { getSavedCategories, saveCategories } from '../services/category-color';
import {
  getActivity,
  getActivityLog,
  getFiles,
  getProjects,
  getSprints,
  getTasks,
  saveActivity,
  saveActivityLogEntry,
  saveFile,
  saveProject,
  saveSprint,
  saveTask,
} from '../services/database';
import { ActivityLogEntry, DailyActivity, Task } from '../types';
import { useCategoryActions } from './useCategoryActions';
import { useDataExport } from './useDataExport';
import { useProjectActions } from './useProjectActions';
import { useSprintActions } from './useSprintActions';
import { useTaskActions } from './useTaskActions';

const STORAGE_PREFIX = 'axon_tasking_';

const tryParseJSON = (str: string | null) => {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (_) {
    return null;
  }
};

interface UseWorkspaceDataOptions {
  onProjectCreated?: (id: string) => void;
  onProjectDeleted?: () => void;
}

export function useWorkspaceData(options?: UseWorkspaceDataOptions) {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const focusTickCounterRef = useRef(0);

  // Initialize domain actions
  const categoryActions = useCategoryActions({
    onCategoryRenamed: (oldCat, newCat) => {
      projectActions.setProjects((prev) =>
        prev.map((p) => {
          if (p.category === oldCat) {
            const up = { ...p, category: newCat };
            saveProject(up);
            return up;
          }
          return p;
        }),
      );
    },
    onCategoryDeleted: (catToDelete, fallbackCat) => {
      projectActions.setProjects((prev) =>
        prev.map((p) => {
          if (p.category === catToDelete) {
            const up = { ...p, category: fallbackCat };
            saveProject(up);
            return up;
          }
          return p;
        }),
      );
    },
  });

  const projectActions = useProjectActions({
    onProjectCreated: options?.onProjectCreated,
    onProjectDeleted: options?.onProjectDeleted,
    onCategoryUsed: (cat) => {
      categoryActions.setCategories((prev) => {
        if (!prev.includes(cat)) {
          const updated = [...prev, cat];
          saveCategories(updated);
          return updated;
        }
        return prev;
      });
    },
  });

  const sprintActions = useSprintActions({
    onSprintDeleted: (sprintId) => {
      taskActions.setTasks((prev) =>
        prev.map((t) => {
          if (t.sprintId === sprintId) {
            const u = { ...t, sprintId: null };
            saveTask(u);
            return u;
          }
          return t;
        }),
      );
    },
    onSprintRollover: (sprintId, targetSprintId) => {
      taskActions.setTasks((prev) =>
        prev.map((t) => {
          if (t.sprintId === sprintId && !t.completed) {
            const u = { ...t, sprintId: targetSprintId };
            saveTask(u);
            return u;
          }
          return t;
        }),
      );
    },
  });

  const recalculateProjectProgress = useCallback(
    (projId: string) => {
      taskActions.setTasks((latestTasks) => {
        const pTasks = latestTasks.filter((t) => t.projectId === projId && !t.archived);
        if (pTasks.length === 0) {
          projectActions.setProjects((prevProjs) =>
            prevProjs.map((p) => {
              if (p.id === projId) {
                const updatedProj = { ...p, progress: 0 };
                saveProject(updatedProj);
                return updatedProj;
              }
              return p;
            }),
          );
          return latestTasks;
        }
        const completed = pTasks.filter((t) => t.completed).length;
        const computedPercentage = Math.round((completed / pTasks.length) * 100);

        projectActions.setProjects((prevProjs) =>
          prevProjs.map((p) => {
            if (p.id === projId) {
              const updatedProj = { ...p, progress: computedPercentage };
              saveProject(updatedProj);
              return updatedProj;
            }
            return p;
          }),
        );
        return latestTasks;
      });
    },
    [projectActions, taskActions],
  );

  const logCompletion = useCallback((taskId: string, taskTitle: string) => {
    const entry = createLogEntry(taskId, taskTitle);
    setActivityLog((prev) => [...prev, entry]);
    saveActivityLogEntry(entry);

    setDailyActivity((prev) => {
      const acts = updateDailyActivityWithCompletion(prev);
      acts.forEach((a) => saveActivity(a));
      return acts;
    });
  }, []);

  const taskActions = useTaskActions({
    onTaskCompleted: logCompletion,
    onProjectProgressChanged: recalculateProjectProgress,
  });

  const dataExport = useDataExport();

  useEffect(() => {
    const initData = async () => {
      try {
        let dbProjects = await getProjects();
        let dbTasks = await getTasks();
        let dbFiles = await getFiles();
        let dbSprints = await getSprints();
        let dbActivity = await getActivity();
        let dbLog = await getActivityLog();

        const isInitialized = localStorage.getItem(`${STORAGE_PREFIX}initialized`) === 'true';
        const isAllEmpty =
          dbProjects.length === 0 &&
          dbTasks.length === 0 &&
          dbFiles.length === 0 &&
          dbActivity.length === 0;

        if (isAllEmpty || !isInitialized || dbProjects.length === 0 || dbTasks.length === 0) {
          const lsProjects = localStorage.getItem(`${STORAGE_PREFIX}projects`);
          const lsTasks = localStorage.getItem(`${STORAGE_PREFIX}tasks`);
          const lsFiles = localStorage.getItem(`${STORAGE_PREFIX}files`);
          const lsActivity = localStorage.getItem(`${STORAGE_PREFIX}activity`);
          const lsLog = localStorage.getItem(`${STORAGE_PREFIX}activityLog`);

          if (dbProjects.length === 0) {
            const parsed = lsProjects ? tryParseJSON(lsProjects) : null;
            dbProjects =
              parsed && Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_PROJECTS;
            for (const p of dbProjects) await saveProject(p).catch(console.error);
          }

          if (dbTasks.length === 0) {
            const parsed = lsTasks ? tryParseJSON(lsTasks) : null;
            dbTasks = parsed && Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TASKS;
            for (const t of dbTasks) await saveTask(t).catch(console.error);
          }

          if (dbFiles.length === 0) {
            const parsed = lsFiles ? tryParseJSON(lsFiles) : null;
            dbFiles = parsed && Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_FILES;
            for (const f of dbFiles) await saveFile(f).catch(console.error);
          }

          if (dbSprints.length === 0) {
            const lsSprints = localStorage.getItem(`${STORAGE_PREFIX}sprints`);
            const parsed = lsSprints ? tryParseJSON(lsSprints) : null;
            dbSprints =
              parsed && Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SPRINTS;
            for (const s of dbSprints) await saveSprint(s).catch(console.error);
          }

          if (dbActivity.length === 0) {
            const parsed = lsActivity ? tryParseJSON(lsActivity) : null;
            dbActivity =
              parsed && Array.isArray(parsed) && parsed.length > 0
                ? parsed
                : INITIAL_DAILY_ACTIVITY;
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

        const savedCats = getSavedCategories();
        const initialCats: string[] = savedCats
          ? Array.from(new Set([...savedCats, ...dbProjects.map((p) => p.category)])).filter(
              (c): c is string => Boolean(c),
            )
          : Array.from(
              new Set([...PROJECT_CATEGORIES, ...dbProjects.map((p) => p.category)]),
            ).filter((c): c is string => Boolean(c));

        categoryActions.setCategories(initialCats);
        saveCategories(initialCats);

        projectActions.setProjects(dbProjects);
        taskActions.setTasks(dbTasks);
        projectActions.setFiles(dbFiles);
        sprintActions.setSprints(dbSprints);
        setDailyActivity(dbActivity);
        setActivityLog(dbLog);
      } catch (e) {
        console.error('Failed to load DB', e);
      } finally {
        setIsDataLoaded(true);
      }
    };
    initData();
  }, []);

  const onTickFocusTime = useCallback(
    (task: Task | null) => {
      if (task) {
        focusTickCounterRef.current += 1;
        if (focusTickCounterRef.current >= 60) {
          focusTickCounterRef.current = 0;
          taskActions.setTasks((prev) =>
            prev.map((t) => {
              if (t.id === task.id) {
                const updated = { ...t, timeSpent: (t.timeSpent || 0) + 1 };
                saveTask(updated);
                return updated;
              }
              return t;
            }),
          );
        }
      } else {
        focusTickCounterRef.current = 0;
      }
      setDailyActivity((prev) => {
        const acts = prev.map((act) => {
          if (act.isToday) {
            return {
              ...act,
              hours: Number((act.hours + 1 / 3600).toFixed(4)),
            };
          }
          return act;
        });
        const todayAct = acts.find((a) => a.isToday);
        if (todayAct) saveActivity(todayAct);
        return acts;
      });
    },
    [taskActions],
  );

  // To support legacy complete project behavior that auto completes tasks
  const handleCompleteProject = useCallback(
    (projectId: string) => {
      projectActions.handleCompleteProject(projectId, (pId) => {
        taskActions.setTasks((prev) =>
          prev.map((t) => {
            if (t.projectId === pId && !t.completed) {
              logCompletion(t.id, t.title);
              const ut = { ...t, completed: true, status: 'Done' as const };
              saveTask(ut);
              return ut;
            }
            return t;
          }),
        );
      });
    },
    [projectActions, taskActions, logCompletion],
  );

  return {
    isDataLoaded,
    dailyActivity,
    activityLog,
    onTickFocusTime,
    ...categoryActions,
    ...projectActions,
    handleCompleteProject, // Override with extended version
    ...taskActions,
    ...sprintActions,
    ...dataExport,
  };
}
