import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Search,
  Timer,
  Check,
  X,
  Settings as SettingsIcon,
  HelpCircle,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Trash2,
  Lock,
  Flame,
  Award,
  Minus,
  Square
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ProjectsView from './components/ProjectsView';
import ProjectDetailView from './components/ProjectDetailView';
import FocusModeView from './components/FocusModeView';
import KanbanView from './components/KanbanView';
import CalendarView from './components/CalendarView';
import TaskDetailPanel from './components/TaskDetailPanel';
import { Project, Task, DocumentFile, DailyActivity, ActivityLogEntry } from './types';
import {
  INITIAL_PROJECTS,
  INITIAL_TASKS,
  INITIAL_FILES,
  INITIAL_DAILY_ACTIVITY
} from './data';
import { useFocusTimer } from './hooks/useFocusTimer';
import { useSettings } from './contexts/SettingsContext';
import {
  createLogEntry,
  aggregateActivityData,
  updateDailyActivityWithCompletion,
  getCompletionsToday,
  getFocusedHoursToday,
} from './services/activityLogger';

import {
  getProjects, saveProject, deleteProject,
  getTasks, saveTask, deleteTask, deleteTasksByProject,
  getFiles, saveFile, deleteFile, deleteFilesByProject,
  getActivity, saveActivity, getActivityLog, saveActivityLogEntry,
  exportWorkspaceData, importWorkspaceData
} from './services/database';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { save as dialogSave, open as dialogOpen } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { motion, AnimatePresence } from 'motion/react';

// Local storage key constants
const STORAGE_PREFIX = 'axon_tasking_';

const tryParseJSON = (str: string | null) => {
  if (!str) return null;
  try { return JSON.parse(str); } catch (_) { return null; }
};

export default function App() {
  // --- Persistent States ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const focusTickCounterRef = useRef(0);

  // Track window maximization to toggle border radius
  useEffect(() => {
    const win = getCurrentWindow();
    win.isMaximized().then(setIsMaximized);

    const unlistenPromise = listen('tauri://resize', async () => {
      try {
        setIsMaximized(await win.isMaximized());
      } catch (e) {
        // Ignore errors during window destruction
      }
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  // --- Initialize Database and Migrate ---
  useEffect(() => {
    const initData = async () => {
      try {
        let dbProjects = await getProjects();
        let dbTasks = await getTasks();
        let dbFiles = await getFiles();
        let dbActivity = await getActivity();
        let dbLog = await getActivityLog();

        // Migration from localStorage or initialization if DB tables are empty
        if (dbProjects.length === 0 || dbTasks.length === 0 || dbFiles.length === 0 || dbActivity.length === 0) {
          const lsProjects = localStorage.getItem(`${STORAGE_PREFIX}projects`);
          const lsTasks = localStorage.getItem(`${STORAGE_PREFIX}tasks`);
          const lsFiles = localStorage.getItem(`${STORAGE_PREFIX}files`);
          const lsActivity = localStorage.getItem(`${STORAGE_PREFIX}activity`);
          const lsLog = localStorage.getItem(`${STORAGE_PREFIX}activityLog`);

          if (dbProjects.length === 0) {
            const parsed = lsProjects ? tryParseJSON(lsProjects) : null;
            dbProjects = (parsed && Array.isArray(parsed) && parsed.length > 0) ? parsed : INITIAL_PROJECTS;
            for (const p of dbProjects) await saveProject(p);
          }

          if (dbTasks.length === 0) {
            const parsed = lsTasks ? tryParseJSON(lsTasks) : null;
            dbTasks = (parsed && Array.isArray(parsed) && parsed.length > 0) ? parsed : INITIAL_TASKS;
            for (const t of dbTasks) await saveTask(t);
          }

          if (dbFiles.length === 0) {
            const parsed = lsFiles ? tryParseJSON(lsFiles) : null;
            dbFiles = (parsed && Array.isArray(parsed) && parsed.length > 0) ? parsed : INITIAL_FILES;
            for (const f of dbFiles) await saveFile(f);
          }

          if (dbActivity.length === 0) {
            const parsed = lsActivity ? tryParseJSON(lsActivity) : null;
            dbActivity = (parsed && Array.isArray(parsed) && parsed.length > 0) ? parsed : INITIAL_DAILY_ACTIVITY;
            for (const a of dbActivity) await saveActivity(a);
          }

          if (dbLog.length === 0 && lsLog) {
            const parsed = tryParseJSON(lsLog);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
              dbLog = parsed;
              for (const l of dbLog) await saveActivityLogEntry(l);
            }
          }
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

  // --- Settings from Context ---
  const { settings, toggleSetting, updateSetting } = useSettings();

  // --- UI Navigation/Layout States ---
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // --- Modal Dialog States ---
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjCategory, setNewProjCategory] = useState<Project['category']>('Active');

  const [isQuickAddTaskOpen, setIsQuickAddTaskOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [importPendingJson, setImportPendingJson] = useState<string | null>(null);

  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<string | null>(null);
  const selectedDetailTask = tasks.find(t => t.id === selectedDetailTaskId) || null;

  // System Tray Listeners
  useEffect(() => {
    const unlistenAdd = listen('tray-quick-add', () => {
      // Logic for quick add from tray
      const title = prompt("Quick Add Task:");
      if (title) {
        const newTask: Task = {
          id: `task_${Date.now()}`,
          projectId: null,
          title,
          completed: false,
          duration: '25m',
          priority: 'Medium',
          status: 'To Do'
        };
        setTasks(prev => [newTask, ...prev]);
        saveTask(newTask);
      }
    });
    const unlistenFocus = listen('tray-start-focus', () => {
      setCurrentView('todo');
    });

    return () => {
      unlistenAdd.then(f => f());
      unlistenFocus.then(f => f());
    }
  }, []);
  // TC-1.3 & TAXON-307: Global keyboard shortcuts
  useEffect(() => {
    const setupShortcuts = async () => {
      try {
        await unregisterAll();
        
        await register('CommandOrControl+K', (e) => {
          if (e.state === 'Pressed') {
            const searchInput = document.getElementById('global-search-input');
            if (searchInput) {
              (searchInput as HTMLInputElement).focus();
            }
          }
        });

        await register('CommandOrControl+N', (e) => {
          if (e.state === 'Pressed') {
            setIsQuickAddTaskOpen(true);
          }
        });

        await register('CommandOrControl+F', (e) => {
          if (e.state === 'Pressed') {
            document.getElementById('header-focus-mode')?.click();
          }
        });
      } catch (err) {
        console.error("Failed to register global shortcuts:", err);
      }
    };

    setupShortcuts();

    return () => {
      unregisterAll().catch(console.error);
    };
  }, []);

  // --- Activity Log Helper ---
  const logCompletion = useCallback((taskId: string, taskTitle: string) => {
    const entry = createLogEntry(taskId, taskTitle);
    setActivityLog(prev => [...prev, entry]);
    saveActivityLogEntry(entry);
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

    // Log the completion for analytics
    if (completedTaskTitle) {
      logCompletion(id, completedTaskTitle);
    }

    // Update daily activity chart
    setDailyActivity(prev => {
      const acts = updateDailyActivityWithCompletion(prev);
      acts.forEach(a => saveActivity(a));
      return acts;
    });

    if (targetProjId) {
      recalculateProjectProgress(targetProjId);
    }
  }, [logCompletion]);

  const handleToggleTask = (id: string) => {
    let targetProjId: string | null = null;
    setTasks(prev => {
      const updated = prev.map(t => {
        if (t.id === id) {
          targetProjId = t.projectId;
          const willComplete = !t.completed;
          if (willComplete) {
            // Log completion for analytics
            logCompletion(t.id, t.title);
            // Update daily activity
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
  };

  const recalculateProjectProgress = (projId: string) => {
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
  };

  const handleAddTask = (title: string, projectId?: string, dueDate?: string) => {
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
  };

  const handleDeleteTask = (id: string) => {
    if (selectedDetailTaskId === id) {
      setSelectedDetailTaskId(null);
    }
    const task = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(t => t.id !== id));
    deleteTask(id);
    if (task?.projectId) {
      setTimeout(() => recalculateProjectProgress(task.projectId!), 50);
    }
  };

  const handleUpdateTaskDetail = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
    saveTask(updatedTask);
    if (updatedTask.projectId) {
      setTimeout(() => recalculateProjectProgress(updatedTask.projectId!), 50);
    }
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;

    const newId = `proj_${Date.now()}`;
    const newProj: Project = {
      id: newId,
      name: newProjName.trim(),
      description: newProjDesc.trim() || 'No description provided.',
      category: newProjCategory,
      progress: 0,
      dueDays: Math.floor(Math.random() * 20) + 10
    };

    setProjects(prev => [...prev, newProj]);
    saveProject(newProj);
    setNewProjName('');
    setNewProjDesc('');
    setIsAddProjectOpen(false);

    // Automatically navigate to detail view for editing
    setSelectedProjectId(newId);
    setCurrentView('project-details');
  };

  const handleDeleteProject = (projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setTasks(prev => prev.filter(t => t.projectId !== projectId));
    setFiles(prev => prev.filter(f => f.projectId !== projectId));

    deleteProject(projectId);
    deleteTasksByProject(projectId);
    deleteFilesByProject(projectId);

    // Navigate back to projects list
    setSelectedProjectId(null);
    setCurrentView('projects');
  };

  const handleCompleteProject = (projectId: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const up = { ...p, category: 'Completed' as const, progress: 100 };
        saveProject(up);
        return up;
      }
      return p;
    }));
    // Complete all its tasks
    setTasks(prev => prev.map(t => {
      if (t.projectId === projectId && !t.completed) {
        logCompletion(t.id, t.title);
        const ut = { ...t, completed: true, status: 'Done' as const };
        saveTask(ut);
        return ut;
      }
      return t;
    }));
  };

  const handleEditProject = (projectId: string, name: string, description: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        const up = { ...p, name, description };
        saveProject(up);
        return up;
      }
      return p;
    }));
  };

  const handleAddFile = (projectId: string, name: string, size: string, type: DocumentFile['type']) => {
    const newFile: DocumentFile = {
      id: `file_${Date.now()}`,
      projectId,
      name,
      size,
      type
    };
    setFiles(prev => [...prev, newFile]);
    saveFile(newFile);
  };

  const handleDeleteFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    deleteFile(id);
  };

  const handleExportData = async () => {
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
  };

  const handleImportDataTrigger = async () => {
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
  };

  const confirmImport = async () => {
    if (!importPendingJson) return;
    try {
      await importWorkspaceData(importPendingJson);
      setIsImportConfirmOpen(false);
      setImportPendingJson(null);
      window.location.reload();
    } catch (err) {
      console.error('Import confirmation failed:', err);
    }
  };

  // Switch task status values dynamically (Board view drag / shift)
  const handleMoveTaskStatus = (taskId: string, newStatus: Task['status']) => {
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
  };

  // --- TAXON-109/110/111: Focus Timer Hook ---
  const focusTimer = useFocusTimer({
    onTimerComplete: () => {
      // Per user preference: never auto-complete tasks on pomodoro session finish
    },
    workDuration: settings.pomodoroWorkDuration,
    shortBreak: settings.pomodoroShortBreak,
    longBreak: settings.pomodoroLongBreak,
    longBreakInterval: settings.pomodoroLongBreakInterval,
    onTickFocusTime: (task) => {
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
    },
    soundEnabled: settings.soundAlerts,
  });

  // --- TAXON-114/115: Computed Analytics ---
  const completedTasks = tasks.filter(t => t.completed);
  const analyticsData = aggregateActivityData(activityLog, tasks.length);
  const completionsToday = getCompletionsToday(activityLog);
  const focusedHoursToday = getFocusedHoursToday(dailyActivity);

  // --- Render Mappings ---
  const getHeaderTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Dashboard';
      case 'projects':
        return 'Workspace Projects';
      case 'todo':
        return 'Active Todo List';
      case 'completed':
        return 'Done / Archived Tasks';
      case 'scheduled':
        return 'Calendar / Scheduled Task List';
      case 'analytics':
        return 'Productivity Analytics';
      case 'settings':
        return 'Platform Settings';
      case 'help':
        return 'Onyx Help Desk';
      case 'project-details':
        const p = projects.find(pr => pr.id === selectedProjectId);
        return p ? `${p.name} Details` : 'Project Management';
      default:
        return 'Taxon Tasking';
    }
  };

  // Filtered Task views based on navbar selected page
  const getFilteredViewTasks = () => {
    if (currentView === 'todo') {
      return tasks.filter(t => !t.completed);
    }
    if (currentView === 'completed') {
      return tasks.filter(t => t.completed);
    }
    if (currentView === 'scheduled') {
      return tasks;
    }
    return tasks;
  };

  // Global search
  const filteredSearchTasks = searchQuery.trim() === ''
    ? []
    : tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!isDataLoaded) {
    return <div className="flex items-center justify-center h-screen bg-black text-white">Loading database...</div>;
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden bg-black text-white font-sans antialiased selection:bg-white/10 selection:text-white ${isMaximized ? '' : 'rounded-xl border border-[#27272A] shadow-2xl'}`}>

      {/* Custom Title Bar (macOS Style) */}
      <div
        data-tauri-drag-region
        className="relative z-[9999] shrink-0 h-10 flex items-center justify-end select-none bg-[#0A0A0A] border-b border-[#27272A] w-full px-4"
      >
        {/* Title (Center) */}
        <div data-tauri-drag-region className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs font-semibold text-[#8E9192]">Taxon</span>
        </div>

        {/* macOS Traffic Lights (Right) */}
        <div className="flex items-center gap-2 z-10">
          <button
            onClick={() => getCurrentWindow().minimize()}
            className="w-4 h-4 rounded-full bg-[#FFBD2E] border border-[#DEA123] flex items-center justify-center group"
          >
            <Minus className="w-2 h-2 text-black opacity-0 group-hover:opacity-60 transition-opacity" strokeWidth={3} />
          </button>
          <button
            onClick={() => getCurrentWindow().toggleMaximize()}
            className="w-4 h-4 rounded-full bg-[#27C93F] border border-[#1AAB29] flex items-center justify-center group"
          >
            <Square className="w-2 h-2 text-black opacity-0 group-hover:opacity-60 transition-opacity" strokeWidth={3} fill="currentColor" />
          </button>
          <button
            onClick={() => getCurrentWindow().close()}
            className="w-4 h-4 rounded-full bg-[#FF5F56] border border-[#E0443E] flex items-center justify-center group"
          >
            <X className="w-2 h-2 text-black opacity-0 group-hover:opacity-60 transition-opacity" strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* Absolute immersive focus container overlay */}
      {focusTimer.isFocusModeActive && (
        <FocusModeView
          activeTask={focusTimer.activeFocusTask}
          projects={projects}
          tasks={tasks}
          timerSeconds={focusTimer.timerSeconds}
          timerIsRunning={focusTimer.timerIsRunning}
          phase={focusTimer.phase}
          totalDuration={
            focusTimer.phase === 'work'
              ? (settings.pomodoroWorkDuration || 25) * 60
              : focusTimer.phase === 'shortBreak'
              ? (settings.pomodoroShortBreak || 5) * 60
              : (settings.pomodoroLongBreak || 15) * 60
          }
          onToggleTimer={focusTimer.toggleTimer}
          onSkipTimer={focusTimer.skipTimer}
          onEndFocusMode={focusTimer.endFocusMode}
          onSelectTaskToFocus={focusTimer.selectTaskToFocus}
          onUnlinkTask={focusTimer.unlinkTask}
          onMinimizeFocusMode={focusTimer.minimizeFocusMode}
        />
      )}

      {/* Task Detail Side Panel */}
      <TaskDetailPanel
        task={selectedDetailTask}
        projects={projects}
        onClose={() => setSelectedDetailTaskId(null)}
        onUpdateTask={handleUpdateTaskDetail}
        onDeleteTask={handleDeleteTask}
      />

      {/* Main app row container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Side Navigation */}
        <Sidebar
          currentView={currentView}
          onViewChange={(v) => {
            setSelectedProjectId(null);
            setCurrentView(v);
          }}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectSelect={(id) => {
            setSelectedProjectId(id);
            setCurrentView('project-details');
          }}
          onAddProjectClick={() => setIsAddProjectOpen(true)}
          timerSeconds={focusTimer.timerSeconds}
          timerIsRunning={focusTimer.timerIsRunning}
          activeFocusTaskTitle={focusTimer.activeFocusTask?.title}
          onLaunchFocusMode={focusTimer.launchFocusMode}
          onToggleTimer={focusTimer.toggleTimer}
        />

        {/* Main Application Core viewport container */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Universal Top Header Menu */}
          <header className="flex justify-between items-center h-16 border-b border-[#27272A] px-8 bg-black sticky top-0 z-40 shrink-0">
            <div className="flex items-center gap-4">
              <h1 className="text-white font-bold text-sm tracking-tight uppercase tracking-wider font-mono">
                {getHeaderTitle()}
              </h1>
            </div>

            {/* Quick global utility actions */}
            <div className="flex items-center gap-6">

              {/* Global Search Interface */}
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9192] w-3.5 h-3.5" />
                <input
                  id="global-search-input"
                  type="text"
                  placeholder="Search tasks... (⌘K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                  className="bg-[#141313] border border-[#27272A] rounded-lg pl-9 pr-4 py-1.5 text-xs text-white placeholder-[#8E9192]/60 focus:outline-none focus:border-white w-64 transition-all"
                />

                {/* Dynamic search results overlay dashboard */}
                {isSearchFocused && searchQuery.trim() !== '' && (
                  <div className="absolute right-0 top-10 bg-[#0A0A0A] border border-[#27272A] w-80 rounded-xl p-3 z-50 shadow-2xl max-h-[300px] overflow-y-auto">
                    <h4 className="text-[10px] font-bold text-[#8E9192] uppercase tracking-[0.15em] mb-2 font-mono">
                      Search Results ({filteredSearchTasks.length})
                    </h4>
                    {filteredSearchTasks.length === 0 ? (
                      <div className="text-xs text-[#8E9192] py-4 text-center">No tasks match queries</div>
                    ) : (
                      <div className="divide-y divide-[#27272A]/50">
                        {filteredSearchTasks.map(t => (
                          <div
                            key={t.id}
                            className="py-2 flex items-center justify-between text-xs cursor-pointer hover:bg-[#141313] px-1 rounded transition-colors"
                            onClick={() => {
                              if (t.projectId) {
                                setSelectedProjectId(t.projectId);
                                setCurrentView('project-details');
                              } else {
                                setCurrentView('dashboard');
                              }
                            }}
                          >
                            <span className={`${t.completed ? 'line-through text-[#8E9192]' : 'text-white'} truncate max-w-[200px]`}>
                              {t.title}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTask(t.id);
                              }}
                              className="p-1 hover:bg-[#201F1F] rounded"
                            >
                              <Check className={`w-3 h-3 ${t.completed ? 'text-green-400' : 'text-[#8E9192]'}`} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Immersive Focus Mode launcher button */}
              <button
                id="header-focus-mode"
                onClick={focusTimer.launchFocusMode}
                title="Launch Immersive Focus Mode"
                className="active:scale-95 transition-transform p-2 border border-[#27272A] hover:border-white bg-[#0A0A0A] hover:bg-[#141313] rounded-lg cursor-pointer"
              >
                <Timer className="w-4 h-4 text-white" />
              </button>
            </div>
          </header>

          {/* Inner Scrollable Frame Canvas Area */}
          <main className="flex-1 overflow-y-auto bg-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#0A0A0A] via-[#000000] to-[#000000] focus:outline-none scrollbar-thin">

            {/* Main Content Router */}
            {currentView === 'dashboard' && (
              <DashboardView
                tasks={tasks}
                projects={projects}
                dailyActivity={dailyActivity}
                onToggleTask={handleToggleTask}
                onAddTask={handleAddTask}
                onStartFocus={focusTimer.startFocusSession}
                timerSeconds={focusTimer.timerSeconds}
                timerIsRunning={focusTimer.timerIsRunning}
                onToggleTimer={focusTimer.toggleTimer}
                onResetTimer={focusTimer.resetTimer}
                onSkipTimer={focusTimer.skipTimer}
                activeFocusTask={focusTimer.activeFocusTask}
                totalCompletedCount={completionsToday}
                totalFocusedHours={focusedHoursToday}
                onSelectTask={(task) => setSelectedDetailTaskId(task.id)}
              />
            )}

            {currentView === 'projects' && (
              <ProjectsView
                projects={projects}
                tasks={tasks}
                onProjectSelect={(id) => setSelectedProjectId(id)}
                onViewChange={setCurrentView}
                onAddProjectClick={() => setIsAddProjectOpen(true)}
                onMoveTaskStatus={handleMoveTaskStatus}
                onAddTaskToProject={(title, projId) => handleAddTask(title, projId)}
                onSelectTask={(task) => setSelectedDetailTaskId(task.id)}
              />
            )}

            {currentView === 'project-details' && selectedProjectId && (
              <ProjectDetailView
                project={projects.find(p => p.id === selectedProjectId)!}
                tasks={tasks}
                files={files}
                onToggleTask={handleToggleTask}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
                onCompleteProject={handleCompleteProject}
                onEditProject={handleEditProject}
                onDeleteProject={handleDeleteProject}
                onAddFile={handleAddFile}
                onDeleteFile={handleDeleteFile}
                onBackToProjects={() => {
                  setSelectedProjectId(null);
                  setCurrentView('projects');
                }}
                onSelectTask={(task) => setSelectedDetailTaskId(task.id)}
              />
            )}

            {/* Simple task lists views templates mapped cleanly */}
            {(currentView === 'todo' || currentView === 'completed') && (
              <div className="max-w-4xl mx-auto py-8 px-6">
                <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6">
                  <div className="flex justify-between items-center mb-6 pb-2 border-b border-[#27272A]/50">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono leading-none">
                      {getHeaderTitle()}
                    </h2>
                    <span className="text-[10px] font-mono font-bold bg-[#141313] border border-[#27272A] text-[#8E9192] px-2 py-0.5 rounded">
                      {getFilteredViewTasks().length} Items Listed
                    </span>
                  </div>

                  <div className="divide-y divide-[#27272A]/50">
                    <AnimatePresence>
                    {getFilteredViewTasks().length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="py-12 text-center text-xs text-[#8E9192]"
                      >
                        No records match current parameters.
                      </motion.div>
                    ) : (
                      getFilteredViewTasks().map((task, index) => (
                        <motion.div 
                          key={task.id} 
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: 50 }}
                          transition={{ delay: index * 0.05 }}
                          className="py-3.5 flex items-center justify-between group hover:bg-[#141313]/50 px-2 rounded-lg transition-colors cursor-pointer"
                          onClick={() => setSelectedDetailTaskId(task.id)}
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleTask(task.id); }}
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
                              onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
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
            )}

            {/* TAXON-117/118: Calendar / Scheduled View */}
            {currentView === 'scheduled' && (
              <CalendarView
                tasks={tasks}
                projects={projects}
                onToggleTask={handleToggleTask}
                onSelectTask={(task) => setSelectedDetailTaskId(task.id)}
              />
            )}

            {/* Productivity Analytics dashboard — TAXON-115: Real data */}
            {currentView === 'analytics' && (
              <div className="max-w-4xl mx-auto py-8 px-6 space-y-6">
                <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6 space-y-6">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Performance Analytics</h2>
                    <p className="text-xs text-[#8E9192] mt-1">Daily metrics report mapping metrics across sprints.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-[#141313] border border-[#27272A] rounded-xl p-5 relative overflow-hidden">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-[#8E9192]">Focus Velocity</span>
                      <div className="text-3xl font-bold font-mono text-white mt-2">{analyticsData.focusVelocity}%</div>
                      <p className="text-[10px] text-[#8E9192] mt-1">Completion rate across all tasks</p>
                    </div>
                    <div className="bg-[#141313] border border-[#27272A] rounded-xl p-5">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-[#8E9192]">Task Accomplishments</span>
                      <div className="text-3xl font-bold font-mono text-white mt-2">{analyticsData.taskAccomplishments}</div>
                      <p className="text-[10px] text-[#8E9192] mt-1">Completed across 30 days</p>
                    </div>
                    <div className="bg-[#141313] border border-[#27272A] rounded-xl p-5">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-[#8E9192]">Uninterrupted Streaks</span>
                      <div className="text-3xl font-bold font-mono text-white mt-2 flex items-center gap-2">
                        <Flame className="w-6 h-6 text-white fill-current animate-pulse" />
                        <span>{analyticsData.streak} Day{analyticsData.streak !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-[10px] text-[#8E9192] mt-1">Maintained focus sprint daily</p>
                    </div>
                  </div>

                  {/* Grid chart representation */}
                  <div className="border-t border-[#27272A]/50 pt-6">
                    <h3 className="text-xs font-bold text-[#8E9192] uppercase tracking-wider font-mono mb-4">Strategic Activity Load</h3>
                    <div className="h-48 flex items-end justify-between gap-4">
                      {dailyActivity.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                          <div className="text-xs text-[#8E9192] opacity-0 group-hover:opacity-100 transition-opacity font-mono">{d.completions}t / {(d.hours * 60).toFixed(0)}m</div>
                          <div
                            style={{ height: `${(d.hours / 6) * 100}%` }}
                            className={`w-full rounded-t-sm transition-all duration-300 ${d.isToday ? 'bg-white' : 'bg-[#1C1B1B] hover:bg-zinc-700'}`}
                          ></div>
                          <span className="text-[10px] uppercase font-bold font-mono text-[#8E9192]">{d.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Simple modular platform settings — TAXON-119/120: Wired to SettingsContext */}
            {currentView === 'settings' && (
              <div className="max-w-2xl mx-auto py-8 px-6">
                <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6 space-y-6">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">System Preferences</h2>
                    <p className="text-xs text-[#8E9192] mt-1">Onyx default hardware battery saving metrics.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-[#141313] border border-[#27272A] rounded-lg">
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wide font-mono">Light Theme</h4>
                        <p className="text-[10px] text-[#8E9192] mt-0.5">Switch to a bright, high-contrast interface.</p>
                      </div>
                      <button
                        onClick={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
                        className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors duration-200 ${settings.theme === 'light' ? 'bg-white' : 'bg-[#27272A]'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full transition-all duration-200 ${settings.theme === 'light'
                            ? 'bg-black ml-auto'
                            : 'bg-[#8E9192] ml-0'
                          }`}></div>
                      </button>
                    </div>

                    {/* OLED Black Mode Toggle */}
                    <div className={`flex items-center justify-between p-3.5 bg-[#141313] border border-[#27272A] rounded-lg transition-opacity ${settings.theme === 'light' ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wide font-mono">OLED Black Mode</h4>
                        <p className="text-[10px] text-[#8E9192] mt-0.5">Force completely black pixel rendering.</p>
                      </div>
                      <button
                        onClick={() => toggleSetting('oledBlackMode')}
                        disabled={settings.theme === 'light'}
                        className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors duration-200 ${settings.oledBlackMode ? 'bg-white' : 'bg-[#27272A]'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full transition-all duration-200 ${settings.oledBlackMode
                            ? 'bg-black ml-auto'
                            : 'bg-[#8E9192] ml-0'
                          }`}></div>
                      </button>
                    </div>

                    {/* Sound Alerts Toggle */}
                    <div className="flex items-center justify-between p-3.5 bg-[#141313] border border-[#27272A]/80 rounded-lg">
                      <div>
                        <h4 className="text-xs font-bold text-[#C4C7C8] uppercase tracking-wide font-mono">Sound Alerts</h4>
                        <p className="text-[10px] text-[#8E9192] mt-0.5">Strategic alarm alerts upon sprint completions.</p>
                      </div>
                      <button
                        onClick={() => toggleSetting('soundAlerts')}
                        className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors duration-200 ${settings.soundAlerts ? 'bg-white' : 'bg-[#27272A]'
                          }`}
                      >
                        <div className={`w-4 h-4 rounded-full transition-all duration-200 ${settings.soundAlerts
                            ? 'bg-black ml-auto'
                            : 'bg-[#8E9192] ml-0'
                          }`}></div>
                      </button>
                    </div>

                    {/* Pomodoro Timer Configuration */}
                    <div className="p-4 bg-[#141313] border border-[#27272A]/80 rounded-lg space-y-3">
                      <div>
                        <h4 className="text-xs font-bold text-[#C4C7C8] uppercase tracking-wide font-mono">Pomodoro Timer Settings</h4>
                        <p className="text-[10px] text-[#8E9192] mt-0.5">Customize sprint durations, rest periods, and break intervals.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-[#0A0A0A] border border-[#27272A] p-2.5 rounded-lg">
                          <label className="text-[10px] text-[#8E9192] uppercase font-mono block mb-1">Work Duration</label>
                          <select
                            className="w-full bg-black border border-[#27272A] text-xs font-bold text-white rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono cursor-pointer"
                            value={settings.pomodoroWorkDuration || 25}
                            onChange={(e) => updateSetting('pomodoroWorkDuration', Number(e.target.value))}
                          >
                            {[15, 20, 25, 30, 45, 60].map((mins) => (
                              <option key={mins} value={mins}>{mins} mins</option>
                            ))}
                          </select>
                        </div>
                        <div className="bg-[#0A0A0A] border border-[#27272A] p-2.5 rounded-lg">
                          <label className="text-[10px] text-[#8E9192] uppercase font-mono block mb-1">Short Break</label>
                          <select
                            className="w-full bg-black border border-[#27272A] text-xs font-bold text-white rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono cursor-pointer"
                            value={settings.pomodoroShortBreak || 5}
                            onChange={(e) => updateSetting('pomodoroShortBreak', Number(e.target.value))}
                          >
                            {[3, 5, 10, 15].map((mins) => (
                              <option key={mins} value={mins}>{mins} mins</option>
                            ))}
                          </select>
                        </div>
                        <div className="bg-[#0A0A0A] border border-[#27272A] p-2.5 rounded-lg">
                          <label className="text-[10px] text-[#8E9192] uppercase font-mono block mb-1">Long Break</label>
                          <select
                            className="w-full bg-black border border-[#27272A] text-xs font-bold text-white rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono cursor-pointer"
                            value={settings.pomodoroLongBreak || 15}
                            onChange={(e) => updateSetting('pomodoroLongBreak', Number(e.target.value))}
                          >
                            {[10, 15, 20, 30].map((mins) => (
                              <option key={mins} value={mins}>{mins} mins</option>
                            ))}
                          </select>
                        </div>
                        <div className="bg-[#0A0A0A] border border-[#27272A] p-2.5 rounded-lg">
                          <label className="text-[10px] text-[#8E9192] uppercase font-mono block mb-1">Long Break Interval</label>
                          <select
                            className="w-full bg-black border border-[#27272A] text-xs font-bold text-white rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono cursor-pointer"
                            value={settings.pomodoroLongBreakInterval || 4}
                            onChange={(e) => updateSetting('pomodoroLongBreakInterval', Number(e.target.value))}
                          >
                            {[2, 3, 4, 5, 6].map((cnt) => (
                              <option key={cnt} value={cnt}>{cnt} sessions</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Backup Frequency */}
                    <div className="flex items-center justify-between p-3.5 bg-[#141313] border border-[#27272A]/80 rounded-lg">
                      <div>
                        <h4 className="text-xs font-bold text-[#C4C7C8] uppercase tracking-wide font-mono">Local Background Backups</h4>
                        <p className="text-[10px] text-[#8E9192] mt-0.5">Automated safety net directly to OS AppData.</p>
                      </div>
                      <select
                        className="bg-black border border-[#27272A] text-[10px] uppercase font-bold text-[#C4C7C8] rounded px-3 py-1.5 focus:outline-none focus:border-white cursor-pointer tracking-wider font-mono"
                        value={settings.backupFrequency}
                        onChange={(e) => updateSetting('backupFrequency', e.target.value as any)}
                      >
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Never">Never</option>
                      </select>
                    </div>

                    {/* Data Export / Import */}
                    <div className="flex items-center justify-between p-3.5 bg-[#141313] border border-[#27272A]/80 rounded-lg">
                      <div>
                        <h4 className="text-xs font-bold text-[#C4C7C8] uppercase tracking-wide font-mono">Workspace Data</h4>
                        <p className="text-[10px] text-[#8E9192] mt-0.5">Securely backup or restore local databases.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleExportData}
                          className="bg-black border border-[#27272A] hover:bg-[#1C1B1B] hover:text-white transition-colors text-[10px] uppercase font-bold text-[#8E9192] rounded px-3 py-1.5 cursor-pointer tracking-wider font-mono"
                        >
                          Export
                        </button>
                        <button
                          onClick={handleImportDataTrigger}
                          className="bg-black border border-[#27272A] hover:bg-[#1C1B1B] hover:text-white transition-colors text-[10px] uppercase font-bold text-[#8E9192] rounded px-3 py-1.5 cursor-pointer tracking-wider font-mono"
                        >
                          Import
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Simple modular help and support */}
            {currentView === 'help' && (
              <div className="max-w-2xl mx-auto py-8 px-6">
                <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6 space-y-6">
                  <div>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-white" />
                      Help &amp; Support Desk
                    </h2>
                    <p className="text-xs text-[#8E9192] mt-1">Documentation, guidelines, and feedback options.</p>
                  </div>

                  <div className="space-y-4 text-xs leading-relaxed text-[#C4C7C8]">
                    <p>
                      Welcome to <strong>Taxon - Precision Tasking</strong>. This platform is optimized on
                      <strong>Precision in Darkness</strong> aesthetic guidelines. It facilitates absolute visual focus,
                      battery efficiency on high contrast OLED matrices, and robust daily tracking.
                    </p>

                    <h4 className="font-bold text-white font-mono uppercase tracking-wider text-[11px] pt-2">How to Use focus session:</h4>
                    <ul className="list-disc pl-4 space-y-1 text-[#8E9192]">
                      <li>Select a task on the dashboard or inside a project list.</li>
                      <li>Click the Play action button to transition into fullscreen Focus Mode immediately.</li>
                      <li>Click the central circle to toggle timer countdown pausing/resumption.</li>
                      <li>Upon completing the timer, your accomplishments increment instantly.</li>
                    </ul>

                    <div className="p-4 bg-[#141313] border border-[#27272A] rounded-lg mt-4 text-center">
                      <p className="font-bold text-white font-mono uppercase tracking-wider text-[10px] mb-2">Need direct engineer support?</p>
                      <a
                        href="mailto:support@taxon.io"
                        className="text-white hover:underline text-xs"
                        onClick={(e) => { e.preventDefault(); alert("For support queries, contact us at: support@taxon.io"); }}
                      >
                        support@taxon.io
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* Overlaid Modal Dialog: Create Project */}
      <AnimatePresence>
      {isAddProjectOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0A0A0A] border border-[#27272A] rounded-xl w-full max-w-md p-6 relative"
          >
            <button
              aria-label="Close"
              onClick={() => setIsAddProjectOpen(false)}
              className="absolute right-4 top-4 hover:bg-[#141313] p-1.5 rounded-lg text-[#8E9192] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-md font-bold text-white uppercase tracking-widest font-mono mb-4">
              Add New Project
            </h3>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] mb-1.5 font-mono">Project Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Companion App"
                  className="bg-black border border-[#27272A] text-xs text-white rounded-lg p-2.5 w-full focus:outline-none focus:border-white focus:ring-0"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] mb-1.5 font-mono">Description / Objectives</label>
                <textarea
                  placeholder="Summarize key features, scopes, or launch schedules..."
                  className="bg-black border border-[#27272A] text-xs text-white rounded-lg p-2.5 w-full h-24 focus:outline-none focus:border-white focus:ring-0"
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] mb-1.5 font-mono">Category Tag</label>
                <select
                  className="bg-black border border-[#27272A] text-xs text-[#C4C7C8] rounded-lg p-2.5 w-full focus:outline-none focus:border-white"
                  value={newProjCategory}
                  onChange={(e) => setNewProjCategory(e.target.value as Project['category'])}
                >
                  <option value="Active">Active Module</option>
                  <option value="Design">Architecture / Design</option>
                  <option value="Planning">Q3 Planning / Ideation</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddProjectOpen(false)}
                  className="text-xs font-semibold text-[#8E9192] hover:text-white px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjName.trim()}
                  className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-40 transition-colors"
                >
                  Create Board
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Overlaid Modal Dialog: Quick Add Task */}
      <AnimatePresence>
      {isQuickAddTaskOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0A0A0A] border border-[#27272A] rounded-xl w-full max-w-sm p-6 relative"
          >
            <button
              aria-label="Close"
              onClick={() => setIsQuickAddTaskOpen(false)}
              className="absolute right-4 top-4 hover:bg-[#141313] p-1.5 rounded-lg text-[#8E9192] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-md font-bold text-white uppercase tracking-widest font-mono mb-4">
              Quick Add Task
            </h3>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (quickTaskTitle.trim()) {
                handleAddTask(quickTaskTitle.trim());
                setQuickTaskTitle('');
                setIsQuickAddTaskOpen(false);
              }
            }} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="What needs to be done?"
                  className="bg-black border border-[#27272A] text-xs text-white rounded-lg p-3 w-full focus:outline-none focus:border-white focus:ring-0"
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickAddTaskOpen(false)}
                  className="text-xs font-semibold text-[#8E9192] hover:text-white px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!quickTaskTitle.trim()}
                  className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-40 transition-colors"
                >
                  Add Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

      {/* Overlaid Modal Dialog: Import Confirmation */}
      <AnimatePresence>
      {isImportConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0A0A0A] border border-[#27272A] rounded-xl w-full max-w-sm p-6 relative text-center"
          >
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>

            <h3 className="text-md font-bold text-white uppercase tracking-widest font-mono mb-2">
              Overwrite Workspace?
            </h3>
            
            <p className="text-xs text-[#8E9192] mb-6">
              Importing data will <strong>permanently erase</strong> your current projects, tasks, and activity logs. This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setIsImportConfirmOpen(false);
                  setImportPendingJson(null);
                }}
                className="text-xs font-semibold text-[#8E9192] hover:text-white px-3 py-2 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                className="bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Confirm Import
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>

    </div>
  );
}
