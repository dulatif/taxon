import React, { useState } from 'react';
import {
  Plus,
  Search,
  Timer,
  Check,
  X,
  Settings as SettingsIcon,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Lock,
  Award,
  Minus,
  Square,
  Sun,
  Moon
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import ProjectsView from './components/ProjectsView';
import ProjectDetailView from './components/ProjectDetailView';
import FocusModeView from './components/FocusModeView';
import KanbanView from './components/KanbanView';
import CalendarView from './components/CalendarView';
import TaskDetailPanel from './components/TaskDetailPanel';
import TaskListView from './views/TaskListView';
import AnalyticsView from './views/AnalyticsView';
import SettingsView from './views/SettingsView';
import HelpView from './views/HelpView';
import AddProjectModal from './modals/AddProjectModal';
import QuickAddTaskModal from './modals/QuickAddTaskModal';
import ImportConfirmModal from './modals/ImportConfirmModal';
import ManageCategoriesModal from './modals/ManageCategoriesModal';
import SpotlightSearchModal from './modals/SpotlightSearchModal';
import { Project } from './types';;
import { getTodayStr } from './utils/taskFilters';
import { useFocusTimer } from './hooks/useFocusTimer';
import { useWindowMaximize } from './hooks/useWindowMaximize';
import { useSystemTray } from './hooks/useSystemTray';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useWorkspaceData } from './hooks/useWorkspaceData';
import { useSettings } from './contexts/SettingsContext';
import {
  getCompletionsToday,
  getFocusedHoursToday,
} from './services/activityLogger';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // --- UI Navigation/Layout States ---
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

  // --- Modal Dialog States ---
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjCategory, setNewProjCategory] = useState<Project['category']>('Engineering');
  const [newProjDueDate, setNewProjDueDate] = useState<string>('');

  const [isQuickAddTaskOpen, setIsQuickAddTaskOpen] = useState(false);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<string | null>(null);

  const isMaximized = useWindowMaximize();

  const {
    projects,
    tasks,
    files,
    categories,
    dailyActivity,
    activityLog,
    isDataLoaded,
    handleToggleTask,
    handleCompleteTaskDirectly,
    handleAddTask,
    handleDeleteTask: deleteTaskFromHook,
    handleUpdateTaskDetail,
    handleMoveTaskStatus,
    handleCreateProject: createProjectInHook,
    handleDeleteProject,
    handleCompleteProject,
    handleEditProject,
    handleRenameCategory,
    handleDeleteCategory,
    handleAddCategory,
    handleAddFile,
    handleDeleteFile,
    handleExportData,
    handleImportDataTrigger,
    confirmImport,
    isImportConfirmOpen,
    setIsImportConfirmOpen,
    setImportPendingJson,
    onTickFocusTime,
    handleReorderProjects,
    handleReorderTasks,
    handleSetVaultPath,
    handleArchiveTask,
    handleUnarchiveTask,
    handleArchiveAllCompleted,
    sprints,
    handleCreateSprint,
    handleEditSprint,
    handleCompleteSprint,
    handleDeleteSprint,
    handleAssignTaskToSprint,
    handleSprintRollover
  } = useWorkspaceData({
    onProjectCreated: (newId) => {
      setSelectedProjectId(newId);
      setCurrentView('project-details');
    },
    onProjectDeleted: () => {
      setSelectedProjectId(null);
      setCurrentView('projects');
    }
  });

  const selectedDetailTask = tasks.find(t => t.id === selectedDetailTaskId) || null;

  useSystemTray({
    onQuickAdd: () => {
      const title = prompt("Quick Add Task:");
      if (title) handleAddTask(title);
    },
    onStartFocus: () => setCurrentView('todo')
  });

  useGlobalShortcuts({
    onQuickAddTask: () => setIsQuickAddTaskOpen(true),
    onLaunchFocusMode: () => {
      document.getElementById('header-focus-mode')?.click();
    },
    onOpenSpotlight: () => setIsSpotlightOpen(true),
  });

  const { settings, updateSetting } = useSettings();

  const focusTimer = useFocusTimer({
    onTimerComplete: () => {
      // Per user preference: never auto-complete tasks on pomodoro session finish
    },
    workDuration: settings.pomodoroWorkDuration,
    shortBreak: settings.pomodoroShortBreak,
    longBreak: settings.pomodoroLongBreak,
    longBreakInterval: settings.pomodoroLongBreakInterval,
    onTickFocusTime: (task) => onTickFocusTime(task),
    soundEnabled: settings.soundAlerts,
  });

  const handleDeleteTask = (id: string) => {
    deleteTaskFromHook(id, (deletedId) => {
      if (selectedDetailTaskId === deletedId) {
        setSelectedDetailTaskId(null);
      }
    });
  };

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    createProjectInHook(newProjName, newProjDesc, newProjCategory, newProjDueDate);
    setNewProjName('');
    setNewProjDesc('');
    setNewProjDueDate('');
    setIsAddProjectOpen(false);
  };

  // --- TAXON-114/115: Computed Analytics (consumed by views) ---
  const completionsToday = getCompletionsToday(activityLog);
  const focusedHoursToday = getFocusedHoursToday(dailyActivity);

  // --- Render Mappings ---
  const getHeaderTitle = () => {
    switch (currentView) {
      case 'dashboard':
        return 'Dashboard';
      case 'inbox':
        return 'Inbox';
      case 'projects':
        return 'Workspace Projects';
      case 'todo':
        return 'Active Todo List';
      case 'scheduled':
        return 'Calendar / Scheduled Task List';
      case 'recurring':
        return 'Recurring Tasks';
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
    if (currentView === 'inbox') {
      return tasks.filter(t => !t.projectId && !t.dueDate && !t.completed && !t.archived);
    }
    if (currentView === 'todo') {
      return tasks.filter(t => !t.completed && !t.archived);
    }
    if (currentView === 'recurring') {
      return tasks.filter(t => !t.completed && t.recurrence !== undefined && !t.archived);
    }
    if (currentView === 'scheduled') {
      return tasks.filter(t => !t.archived);
    }
    return tasks.filter(t => !t.archived);
  };

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
        sprints={sprints}
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
          onAddProjectToCategory={(cat) => {
            setNewProjCategory(cat);
            setIsAddProjectOpen(true);
          }}
          onReorderProjects={handleReorderProjects}
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

              {/* Global Search Trigger Button */}
              <button
                id="global-search-input"
                onClick={() => setIsSpotlightOpen(true)}
                className="relative group bg-[#141313] border border-[#27272A] hover:border-[#8E9192]/60 rounded-lg pl-9 pr-2.5 py-1.5 text-xs text-[#8E9192]/80 hover:text-white flex items-center justify-between w-64 transition-all cursor-pointer select-none"
              >
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E9192] group-hover:text-white w-3.5 h-3.5 transition-colors" />
                <span>Search tasks & projects...</span>
                <span className="px-1.5 py-0.5 rounded bg-[#1E1E22] border border-[#27272A] text-[10px] font-mono text-[#8E9192] group-hover:text-white transition-colors">
                  ⌘K
                </span>
              </button>

              {/* Theme Toggle Button */}
              <button
                onClick={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
                title="Toggle Theme"
                className="active:scale-95 transition-transform p-2 bg-[#0A0A0A] hover:bg-[#141313] rounded-lg cursor-pointer"
              >
                {settings.theme === 'light' ? (
                  <Sun className="w-4 h-4 text-white" />
                ) : (
                  <Moon className="w-4 h-4 text-white" />
                )}
              </button>

              {/* Immersive Focus Mode launcher button */}
              <button
                id="header-focus-mode"
                onClick={focusTimer.launchFocusMode}
                title="Launch Immersive Focus Mode"
                className="active:scale-95 transition-transform p-2 bg-[#0A0A0A] hover:bg-[#141313] rounded-lg cursor-pointer"
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
                onDeleteTask={handleDeleteTask}
                onReorderTasks={handleReorderTasks}
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
                categories={categories}
                sprints={sprints}
                onAssignTaskToSprint={handleAssignTaskToSprint}
                onProjectSelect={(id) => setSelectedProjectId(id)}
                onViewChange={setCurrentView}
                onAddProjectClick={() => setIsAddProjectOpen(true)}
                onManageCategoriesClick={() => setIsManageCategoriesOpen(true)}
                onMoveTaskStatus={handleMoveTaskStatus}
                onAddTaskToProject={(title, projId, sprintId) => handleAddTask(title, projId, undefined, undefined, sprintId)}
                onSelectTask={(task) => setSelectedDetailTaskId(task.id)}
              />
            )}

            {currentView === 'project-details' && selectedProjectId && (
              <ProjectDetailView
                project={projects.find(p => p.id === selectedProjectId)!}
                tasks={tasks}
                files={files}
                availableCategories={categories}
                sprints={sprints}
                onCreateSprint={handleCreateSprint}
                onEditSprint={handleEditSprint}
                onCompleteSprint={handleCompleteSprint}
                onDeleteSprint={handleDeleteSprint}
                onAssignTaskToSprint={handleAssignTaskToSprint}
                onSprintRollover={handleSprintRollover}
                onToggleTask={handleToggleTask}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
                onCompleteProject={handleCompleteProject}
                onEditProject={handleEditProject}
                onDeleteProject={handleDeleteProject}
                onAddFile={handleAddFile}
                onDeleteFile={handleDeleteFile}
                onReorderTasks={handleReorderTasks}
                onBackToProjects={() => {
                  setSelectedProjectId(null);
                  setCurrentView('projects');
                }}
                onSelectTask={(task) => setSelectedDetailTaskId(task.id)}
                onSetVaultPath={handleSetVaultPath}
                onArchiveTask={handleArchiveTask}
                onUnarchiveTask={handleUnarchiveTask}
                onArchiveAllCompleted={handleArchiveAllCompleted}
              />
            )}

            {/* Simple task lists views templates mapped cleanly */}
            {(currentView === 'inbox' || currentView === 'todo' || currentView === 'recurring') && (
              <TaskListView
                key={currentView}
                title={getHeaderTitle()}
                tasks={getFilteredViewTasks()}
                projects={projects}
                defaultGrouped={currentView !== 'inbox' && currentView !== 'recurring'}
                isInboxView={currentView === 'inbox'}
                isRecurringView={currentView === 'recurring'}
                onAddTask={currentView === 'inbox' || currentView === 'todo' || currentView === 'recurring' ? ((title: string) => handleAddTask(title, undefined, currentView === 'recurring' ? getTodayStr() : '', currentView === 'recurring' ? { frequency: 'daily', interval: 1 } : undefined)) : undefined}
                addTaskPlaceholder={currentView === 'inbox' ? 'Add a new task to Inbox...' : currentView === 'recurring' ? 'Add a new recurring task (defaults to daily)...' : 'Add a new task...'}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onSelectTask={(task) => setSelectedDetailTaskId(task.id)}
              />
            )}

            {/* TAXON-117/118: Calendar / Scheduled View */}
            {currentView === 'scheduled' && (
              <CalendarView
                tasks={tasks}
                projects={projects}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
                onAddTask={handleAddTask}
                onSelectTask={(task) => setSelectedDetailTaskId(task.id)}
              />
            )}

            {/* Productivity Analytics dashboard — TAXON-115: Real data */}
            {currentView === 'analytics' && (
              <AnalyticsView
                tasks={tasks}
                dailyActivity={dailyActivity}
                activityLog={activityLog}
              />
            )}

            {/* Simple modular platform settings — TAXON-119/120: Wired to SettingsContext */}
            {currentView === 'settings' && (
              <SettingsView
                onExportData={handleExportData}
                onImportDataTrigger={handleImportDataTrigger}
              />
            )}

            {/* Simple modular help and support */}
            {currentView === 'help' && <HelpView />}

          </main>
        </div>
      </div>

      {/* Modals */}
      <ManageCategoriesModal
        isOpen={isManageCategoriesOpen}
        onClose={() => setIsManageCategoriesOpen(false)}
        projects={projects}
        categories={categories}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
        onAddCategory={handleAddCategory}
      />

      <AddProjectModal
        isOpen={isAddProjectOpen}
        projName={newProjName}
        projDesc={newProjDesc}
        projCategory={newProjCategory}
        projDueDate={newProjDueDate}
        availableCategories={categories}
        onChangeName={setNewProjName}
        onChangeDesc={setNewProjDesc}
        onChangeCategory={setNewProjCategory}
        onChangeDueDate={setNewProjDueDate}
        onClose={() => setIsAddProjectOpen(false)}
        onSubmit={handleCreateProject}
      />

      <QuickAddTaskModal
        isOpen={isQuickAddTaskOpen}
        taskTitle={quickTaskTitle}
        onChangeTitle={setQuickTaskTitle}
        onClose={() => setIsQuickAddTaskOpen(false)}
        onSubmit={() => {
          if (quickTaskTitle.trim()) {
            handleAddTask(quickTaskTitle.trim());
            setQuickTaskTitle('');
            setIsQuickAddTaskOpen(false);
          }
        }}
      />

      <ImportConfirmModal
        isOpen={isImportConfirmOpen}
        onCancel={() => {
          setIsImportConfirmOpen(false);
          setImportPendingJson(null);
        }}
        onConfirm={confirmImport}
      />

      <SpotlightSearchModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        tasks={tasks}
        projects={projects}
        onToggleTask={handleToggleTask}
        onSelectProject={(id) => {
          setSelectedProjectId(id);
          setCurrentView('project-details');
        }}
        onSelectTask={(id) => setSelectedDetailTaskId(id)}
        onNavigate={(view) => {
          setSelectedProjectId(null);
          setCurrentView(view);
        }}
        onQuickAddTask={() => setIsQuickAddTaskOpen(true)}
        onLaunchFocusMode={() => {
          document.getElementById('header-focus-mode')?.click();
        }}
      />

    </div>
  );
}
