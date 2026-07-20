import React, { useState } from 'react';

import CalendarView from './components/CalendarView';
import DashboardView from './components/DashboardView';
import FocusModeView from './components/FocusModeView';
import ProjectDetailView from './components/ProjectDetailView';
import ProjectsView from './components/ProjectsView';
import Sidebar from './components/Sidebar';
import TaskDetailView from './components/TaskDetailView/TaskDetailView';
import { useSettings } from './contexts/SettingsContext';
import Render from './elements/Render';
import { useAppNavigation } from './hooks/useAppNavigation';
import { useFocusTimer } from './hooks/useFocusTimer';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { useSystemTray } from './hooks/useSystemTray';
import { useWorkspaceData } from './hooks/useWorkspaceData';

import AppHeader from './layouts/AppHeader';
import AppLayout from './layouts/AppLayout';
import TitleBar from './layouts/TitleBar';

import AddProjectModal from './modals/AddProjectModal';
import ImportConfirmModal from './modals/ImportConfirmModal';
import ManageCategoriesModal from './modals/ManageCategoriesModal';
import QuickAddTaskModal from './modals/QuickAddTaskModal';
import SpotlightSearchModal from './modals/SpotlightSearchModal';

import { getCompletionsToday, getFocusedHoursToday } from './services/activityLogger';
import type { Project } from './types';
import { getTodayStr } from './utils/taskFilters';

import AnalyticsView from './views/AnalyticsView';
import HelpView from './views/HelpView';
import SettingsView from './views/SettingsView';
import TaskListView from './views/TaskListView';

export default function App() {
  const {
    currentView,
    selectedProjectId,
    navigateTo,
    selectProject,
    setSelectedProjectId,
    setCurrentView,
  } = useAppNavigation();
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

  const {
    projects,
    tasks,
    files,
    categories,
    dailyActivity,
    activityLog,
    isDataLoaded,
    handleToggleTask,
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
    handleSprintRollover,
  } = useWorkspaceData({
    onProjectCreated: (newId) => {
      setSelectedProjectId(newId);
      setCurrentView('project-details');
    },
    onProjectDeleted: () => {
      setSelectedProjectId(null);
      setCurrentView('projects');
    },
  });

  const selectedDetailTask = tasks.find((t) => t.id === selectedDetailTaskId) || null;

  useSystemTray({
    onQuickAdd: () => {
      const title = prompt('Quick Add Task:');
      if (title) handleAddTask(title);
    },
    onStartFocus: () => setCurrentView('todo'),
  });

  useGlobalShortcuts({
    onQuickAddTask: () => setIsQuickAddTaskOpen(true),
    onLaunchFocusMode: () => {
      document.getElementById('header-focus-mode')?.click();
    },
    onOpenSpotlight: () => setIsSpotlightOpen(true),
  });

  const { settings } = useSettings();

  const focusTimer = useFocusTimer({
    onTimerComplete: () => {},
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

  const completionsToday = getCompletionsToday(activityLog);
  const focusedHoursToday = getFocusedHoursToday(dailyActivity);

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
      case 'project-details': {
        const p = projects.find((pr) => pr.id === selectedProjectId);
        return p ? `${p.name} Details` : 'Project Management';
      }
      default:
        return 'Taxon Tasking';
    }
  };

  const getFilteredViewTasks = () => {
    if (currentView === 'inbox') {
      return tasks.filter((t) => !t.projectId && !t.dueDate && !t.completed && !t.archived);
    }
    if (currentView === 'todo') {
      return tasks.filter((t) => !t.completed && !t.archived);
    }
    if (currentView === 'recurring') {
      return tasks.filter((t) => !t.completed && t.recurrence !== undefined && !t.archived);
    }
    if (currentView === 'scheduled') {
      return tasks.filter((t) => !t.archived);
    }
    return tasks.filter((t) => !t.archived);
  };

  if (!isDataLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-app text-text-primary">
        Loading database...
      </div>
    );
  }

  return (
    <AppLayout
      titleBar={<TitleBar />}
      sidebar={
        <Sidebar
          currentView={currentView}
          onViewChange={navigateTo}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectSelect={selectProject}
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
      }
      header={
        <AppHeader
          title={getHeaderTitle()}
          onOpenSpotlight={() => setIsSpotlightOpen(true)}
          onLaunchFocusMode={focusTimer.launchFocusMode}
        />
      }
      focusMode={
        <Render in={focusTimer.isFocusModeActive}>
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
        </Render>
      }
      taskDetailDrawer={
        <Render in={!!selectedDetailTask}>
          <TaskDetailView
            task={selectedDetailTask}
            projects={projects}
            sprints={sprints}
            onClose={() => setSelectedDetailTaskId(null)}
            onUpdateTask={handleUpdateTaskDetail}
            onDeleteTask={handleDeleteTask}
          />
        </Render>
      }
    >
      <Render in={currentView === 'dashboard'}>
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
      </Render>

      <Render in={currentView === 'projects'}>
        <ProjectsView
          projects={projects}
          tasks={tasks}
          categories={categories}
          sprints={sprints}
          onAssignTaskToSprint={handleAssignTaskToSprint}
          onProjectSelect={selectProject}
          onViewChange={setCurrentView}
          onAddProjectClick={() => setIsAddProjectOpen(true)}
          onManageCategoriesClick={() => setIsManageCategoriesOpen(true)}
          onMoveTaskStatus={handleMoveTaskStatus}
          onAddTaskToProject={(title, projId, sprintId) =>
            handleAddTask(title, projId, undefined, undefined, sprintId)
          }
          onSelectTask={(task) => setSelectedDetailTaskId(task.id)}
        />
      </Render>

      <Render in={currentView === 'project-details' && !!selectedProjectId}>
        {selectedProjectId && (
          <ProjectDetailView
            project={projects.find((p) => p.id === selectedProjectId)!}
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
      </Render>

      <Render in={currentView === 'inbox' || currentView === 'todo' || currentView === 'recurring'}>
        <TaskListView
          key={currentView}
          title={getHeaderTitle()}
          tasks={getFilteredViewTasks()}
          projects={projects}
          defaultGrouped={currentView !== 'inbox' && currentView !== 'recurring'}
          isInboxView={currentView === 'inbox'}
          isRecurringView={currentView === 'recurring'}
          onAddTask={
            currentView === 'inbox' || currentView === 'todo' || currentView === 'recurring'
              ? (title: string) =>
                  handleAddTask(
                    title,
                    undefined,
                    currentView === 'recurring' ? getTodayStr() : '',
                    currentView === 'recurring' ? { frequency: 'daily', interval: 1 } : undefined,
                  )
              : undefined
          }
          addTaskPlaceholder={
            currentView === 'inbox'
              ? 'Add a new task to Inbox...'
              : currentView === 'recurring'
                ? 'Add a new recurring task (defaults to daily)...'
                : 'Add a new task...'
          }
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onSelectTask={(task) => setSelectedDetailTaskId(task.id)}
        />
      </Render>

      <Render in={currentView === 'scheduled'}>
        <CalendarView
          tasks={tasks}
          projects={projects}
          onToggleTask={handleToggleTask}
          onDeleteTask={handleDeleteTask}
          onAddTask={handleAddTask}
          onSelectTask={(task) => setSelectedDetailTaskId(task.id)}
        />
      </Render>

      <Render in={currentView === 'analytics'}>
        <AnalyticsView tasks={tasks} dailyActivity={dailyActivity} activityLog={activityLog} />
      </Render>

      <Render in={currentView === 'settings'}>
        <SettingsView
          onExportData={handleExportData}
          onImportDataTrigger={handleImportDataTrigger}
        />
      </Render>

      <Render in={currentView === 'help'}>
        <HelpView />
      </Render>

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
        onSelectProject={selectProject}
        onSelectTask={(id) => setSelectedDetailTaskId(id)}
        onNavigate={navigateTo}
        onQuickAddTask={() => setIsQuickAddTaskOpen(true)}
        onLaunchFocusMode={() => {
          document.getElementById('header-focus-mode')?.click();
        }}
      />
    </AppLayout>
  );
}
