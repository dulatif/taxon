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
import TaskListView from './views/TaskListView';
import AnalyticsView from './views/AnalyticsView';
import SettingsView from './views/SettingsView';
import HelpView from './views/HelpView';
import AddProjectModal from './modals/AddProjectModal';
import QuickAddTaskModal from './modals/QuickAddTaskModal';
import ImportConfirmModal from './modals/ImportConfirmModal';
import ManageCategoriesModal from './modals/ManageCategoriesModal';
import { Project } from './types';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // --- Modal Dialog States ---
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjCategory, setNewProjCategory] = useState<Project['category']>('Engineering');

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
    handleReorderTasks
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
    }
  });

  const { settings } = useSettings();

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
    createProjectInHook(newProjName, newProjDesc, newProjCategory);
    setNewProjName('');
    setNewProjDesc('');
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
      return tasks.filter(t => !t.projectId && !t.dueDate && !t.completed);
    }
    if (currentView === 'todo') {
      return tasks.filter(t => !t.completed);
    }
    if (currentView === 'recurring') {
      return tasks.filter(t => !t.completed && t.recurrence !== undefined);
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
                onProjectSelect={(id) => setSelectedProjectId(id)}
                onViewChange={setCurrentView}
                onAddProjectClick={() => setIsAddProjectOpen(true)}
                onManageCategoriesClick={() => setIsManageCategoriesOpen(true)}
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
                availableCategories={categories}
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
                onAddTask={currentView === 'inbox' || currentView === 'todo' || currentView === 'recurring' ? ((title: string) => handleAddTask(title, undefined, '', currentView === 'recurring' ? { frequency: 'daily', interval: 1 } : undefined)) : undefined}
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
        availableCategories={categories}
        onChangeName={setNewProjName}
        onChangeDesc={setNewProjDesc}
        onChangeCategory={setNewProjCategory}
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

    </div>
  );
}
