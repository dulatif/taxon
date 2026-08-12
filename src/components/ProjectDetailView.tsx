import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { stat } from '@tauri-apps/plugin-fs';
import { AlertTriangle, Archive, ArrowLeft, GitFork, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAgentSync } from '../hooks/useAgentSync';
import AgentImportModal from '../modals/AgentImportModal';
import AuditLogModal from '../modals/AuditLogModal';
import SprintCompleteModal from '../modals/SprintCompleteModal';
import AgentSyncPanel from '../sections/AgentSyncPanel';
import ProjectFiles from '../sections/ProjectFiles/ProjectFiles';
import ProjectHeader from '../sections/ProjectHeader/ProjectHeader';
import type { TaskSortType, TaskTabType } from '../sections/ProjectTabs/ProjectTabs';
import ProjectTabs from '../sections/ProjectTabs/ProjectTabs';
import ProjectTaskList from '../sections/ProjectTaskList/ProjectTaskList';
import {
  createDocument,
  deleteDocument,
  readDocument,
  scanVault,
  writeDocument,
} from '../services/vaultScanner';
import type { DocumentFile, Project, RecurrenceRule, Sprint, Task, VaultEntry } from '../types';
import Button from './Button';
import ConfirmDialog from './ConfirmDialog/ConfirmDialog';
import CustomSelect from './CustomSelect';
import DocumentPanel from './DocumentPanel';
import KanbanView from './KanbanView';
import SprintPanel from './SprintPanel';
import { WorkflowView } from './Workflow/WorkflowView';

interface ProjectDetailViewProps {
  project: Project;
  tasks: Task[];
  files: DocumentFile[];
  availableCategories?: string[];
  sprints?: Sprint[];
  onCreateSprint?: (
    projectId: string,
    name: string,
    startDate: string,
    endDate: string,
    goal?: string,
  ) => void;
  onEditSprint?: (sprintId: string, updates: Partial<Sprint>) => void;
  onCompleteSprint?: (sprintId: string) => void;
  onDeleteSprint?: (sprintId: string) => void;
  onAssignTaskToSprint?: (taskId: string, sprintId: string | null) => void;
  onSprintRollover?: (sprintId: string, targetSprintId: string | null) => void;
  onMoveTaskStatus: (taskId: string, newStatus: Task['status']) => void;
  onToggleTask: (id: string) => void;
  onAddTask: (
    title: string,
    projectId: string,
    dueDate?: string,
    recurrence?: RecurrenceRule,
    sprintId?: string | null,
  ) => Task | void;
  onDeleteTask: (id: string) => void;
  onCompleteProject: (projectId: string) => void;
  onEditProject: (
    projectId: string,
    name: string,
    description: string,
    category?: string,
    dueDate?: string,
    workspacePaths?: string[],
  ) => void;
  onDeleteProject: (projectId: string) => void;
  onAddFile: (projectId: string, name: string, size: string, type: DocumentFile['type']) => void;
  onDeleteFile: (id: string) => void;
  onReorderTasks?: (tasks: Task[]) => void;
  onBackToProjects: () => void;
  onSelectTask?: (task: Task) => void;
  onSetVaultPath?: (projectId: string, vaultPath: string) => void;
  onArchiveTask?: (id: string) => void;
  onUnarchiveTask?: (id: string) => void;
  onArchiveAllCompleted?: (projectId?: string, taskIds?: string[]) => void;
  refreshAllData?: () => Promise<void>;
  initialSprintId?: string;
  onTogglePinProject?: (projectId: string) => void;
}

export default function ProjectDetailView({
  project,
  tasks,
  files,
  availableCategories = [],
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onCompleteProject,
  onEditProject,
  onDeleteProject,
  onAddFile,
  onDeleteFile,
  onReorderTasks,
  onBackToProjects,
  onSelectTask,
  onSetVaultPath,
  onArchiveTask,
  onUnarchiveTask,
  onArchiveAllCompleted,
  sprints,
  onCreateSprint,
  onEditSprint,
  onCompleteSprint,
  onDeleteSprint,
  onAssignTaskToSprint,
  onSprintRollover,
  onMoveTaskStatus,
  refreshAllData,
  initialSprintId,
  onTogglePinProject,
}: ProjectDetailViewProps) {
  const taskInputRef = useRef<HTMLInputElement>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedSort, setSelectedSort] = useState<TaskSortType>('custom');
  const [dueDateFilter, setDueDateFilter] = useState<string>('all');
  const [taskTab, setTaskTab] = useState<TaskTabType>('todo');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'workflow'>('list');
  const [sidebarTab, setSidebarTab] = useState<'vault' | 'agent'>('vault');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSprintId, setSelectedSprintId] = useState<string | 'all' | 'backlog'>(() => {
    if (initialSprintId) return initialSprintId;
    const activeSprint = sprints?.find((s) => s.projectId === project.id && s.status === 'Active');
    return activeSprint ? activeSprint.id : 'all';
  });

  useEffect(() => {
    if (initialSprintId) {
      setSelectedSprintId(initialSprintId);
    }
  }, [initialSprintId]);
  const [sprintToComplete, setSprintToComplete] = useState<Sprint | null>(null);

  // Modal confirmations
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<VaultEntry | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Vault state
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<VaultEntry | null>(null);
  const [isDocumentPanelOpen, setIsDocumentPanelOpen] = useState(false);

  // Agent Sync
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const {
    syncState,
    agentDiff,
    agentEntries,
    auditSummary,
    auditLog,
    isAuditModalOpen,
    isExporting,
    isImporting,
    isScanning,
    error,
    exportToAgent,
    scanForChanges,
    confirmImport,
    cancelImport,
    autoImportChanges,
    cleanUpArchived,
    copyContextSnapshot,
    openAuditLog,
    closeAuditLog,
    exportChangelogFile,
    installGitHook,
    refreshAgentEntries,
    isLiveSyncEnabled,
    toggleLiveSync,
  } = useAgentSync(project, tasks, sprints || [], refreshAllData || (async () => {}));

  const handleScanForChanges = async () => {
    await scanForChanges();
    setIsImportModalOpen(true);
  };

  const handleConfirmImport = async () => {
    await confirmImport();
    setIsImportModalOpen(false);
  };

  const handleCancelImport = () => {
    cancelImport();
    setIsImportModalOpen(false);
  };

  const cycleTaskFilter = () => {
    const options: TaskTabType[] = [
      'all',
      'todo',
      'In Progress',
      'Need to Test',
      'completed',
      'archived',
    ];
    const currentIndex = options.indexOf(taskTab);
    const nextIndex = (currentIndex + 1) % options.length;
    setTaskTab(options[nextIndex] as TaskTabType);
  };

  const cycleSprintFilter = () => {
    const options: string[] = ['all', 'backlog'];
    if (sprints) {
      const projectSprints = sprints.filter(
        (s) => s.projectId === project.id && (s.status === 'Active' || s.status === 'Planned'),
      );
      for (const s of projectSprints) {
        options.push(s.id);
      }
    }
    const currentIndex = options.indexOf(selectedSprintId);
    const nextIndex = (currentIndex + 1) % options.length;
    const targetSprint = options[nextIndex] ?? 'all';
    setSelectedSprintId(targetSprint);
  };

  const refreshVault = async () => {
    if (project.vaultPath) {
      try {
        const entries = await scanVault(project.vaultPath);
        setVaultEntries(entries);
      } catch (err) {
        console.error('Failed to scan vault:', err);
      }
    } else {
      setVaultEntries([]);
    }
  };

  useEffect(() => {
    refreshVault();
  }, [project.vaultPath]);

  // ProjectDetail keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setViewMode('list');
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          setViewMode('kanban');
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          setViewMode('workflow');
          return;
        }
        if (e.key === '[' || e.key === ']') {
          e.preventDefault();
          setSidebarTab((prev) => (prev === 'vault' ? 'agent' : 'vault'));
          return;
        }
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          cycleSprintFilter();
          return;
        }
        if (e.key.toLowerCase() === 'f') {
          e.preventDefault();
          cycleTaskFilter();
          return;
        }
        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          onTogglePinProject?.(project.id);
          return;
        }
        if (e.key === '/') {
          // If we are already focused on an input or textarea, let the user type '/'
          if (
            document.activeElement instanceof HTMLInputElement ||
            document.activeElement instanceof HTMLTextAreaElement
          ) {
            return;
          }
          e.preventDefault();

          let stateChanged = false;
          if (viewMode !== 'list') {
            setViewMode('list');
            stateChanged = true;
          }
          if (taskTab !== 'todo') {
            setTaskTab('todo');
            stateChanged = true;
          }
          if (searchQuery !== '') {
            setSearchQuery('');
            stateChanged = true;
          }
          if (dueDateFilter !== 'all') {
            setDueDateFilter('all');
            stateChanged = true;
          }

          if (stateChanged) {
            setTimeout(() => {
              taskInputRef.current?.focus();
            }, 50);
          } else {
            taskInputRef.current?.focus();
          }
          
          return;
        }
      }

      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 's') {
          e.preventDefault();
          cycleSprintFilter();
          return;
        }
        if (key === 'f') {
          e.preventDefault();
          cycleTaskFilter();
          return;
        }
        if (key === 'p') {
          e.preventDefault();
          onTogglePinProject?.(project.id);
          return;
        }
        if (key === 'e') {
          e.preventDefault();
          exportToAgent();
          return;
        }
        if (key === 'i') {
          e.preventDefault();
          handleScanForChanges();
          return;
        }
        if (key === 'c') {
          e.preventDefault();
          copyContextSnapshot(selectedSprintId);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSprintId, sprints, project.id, exportToAgent, copyContextSnapshot]);

  const handleSetVaultDirectory = async () => {
    try {
      const selected = await openDialog({
        directory: true,
        multiple: false,
      });
      if (selected && typeof selected === 'string' && onSetVaultPath) {
        onSetVaultPath(project.id, selected);
      }
    } catch (e) {
      console.error('Failed to select vault directory:', e);
    }
  };

  const handleCreateVaultDoc = async (filename: string) => {
    if (!project.vaultPath) return;
    const newPath = await createDocument(project.vaultPath, filename);
    await refreshVault();
    const cleanName =
      filename.trim().toLowerCase().endsWith('.md') ||
      filename.trim().toLowerCase().endsWith('.txt')
        ? filename.trim()
        : `${filename.trim()}.md`;
    setSelectedDocument({
      name: cleanName,
      path: newPath,
      isDirectory: false,
    });
    setIsDocumentPanelOpen(true);
  };

  const confirmDeleteVaultDoc = async () => {
    if (!docToDelete) return;
    try {
      await deleteDocument(docToDelete.path);
      if (selectedDocument?.path === docToDelete.path) {
        setIsDocumentPanelOpen(false);
        setSelectedDocument(null);
      }
      setDocToDelete(null);
      await refreshVault();
    } catch (e) {
      console.error('Failed to delete vault document:', e);
      setDocToDelete(null);
    }
  };

  const handleNativeAddFile = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        let sizeStr = 'Unknown';
        try {
          const fileStat = await stat(selected);
          const size = fileStat.size;
          sizeStr =
            size > 1024 * 1024
              ? `${(size / (1024 * 1024)).toFixed(1)} MB`
              : `${Math.round(size / 1024)} KB`;
        } catch (e) {
          console.error('Stat error', e);
        }

        let determinedType: DocumentFile['type'] = 'code';
        if (selected.match(/\.(png|jpe?g|svg|webp|gif)$/i)) determinedType = 'image';
        else if (selected.match(/\.pdf$/i)) determinedType = 'pdf';

        onAddFile(project.id, selected, sizeStr, determinedType);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const projectTasksAll = tasks.filter((t) => t.projectId === project.id);
  const projectTasks = projectTasksAll.filter((t) => {
    const matchesSprint =
      selectedSprintId === 'all' ||
      (selectedSprintId === 'backlog' ? !t.sprintId : t.sprintId === selectedSprintId);
    const matchesSearch =
      !searchQuery.trim() || t.title.toLowerCase().includes(searchQuery.trim().toLowerCase());
    return matchesSprint && matchesSearch;
  });

  const unarchivedProjectTasks = projectTasksAll.filter((t) => !t.archived);
  const completedCount = unarchivedProjectTasks.filter((t) => t.completed).length;
  const totalTasksCount = unarchivedProjectTasks.length;
  const calculatedProgress =
    totalTasksCount > 0 ? Math.round((completedCount / totalTasksCount) * 100) : project.progress;

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const targetSprintId =
      selectedSprintId !== 'all' && selectedSprintId !== 'backlog' ? selectedSprintId : null;
    const createdTask = onAddTask(newTaskTitle, project.id, '', undefined, targetSprintId);
    if (
      createdTask &&
      targetSprintId &&
      (!createdTask.sprintId || createdTask.sprintId !== targetSprintId) &&
      onAssignTaskToSprint
    ) {
      onAssignTaskToSprint(createdTask.id, targetSprintId);
    }
    setNewTaskTitle('');
    setTaskTab('todo');
  };

  const projectFiles = files.filter((f) => f.projectId === project.id);
  const completedTasks = projectTasks.filter(
    (t) => (t.completed || t.status === 'Done') && !t.archived,
  );

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
      <Button
        variant="secondary"
        size="sm"
        onClick={onBackToProjects}
        className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider font-mono w-fit"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>All projects</span>
      </Button>

      <ProjectHeader
        project={project}
        availableCategories={availableCategories}
        calculatedProgress={calculatedProgress}
        onEditProject={onEditProject}
        onCompleteProject={onCompleteProject}
        onDeleteProjectClick={() => setIsDeleteConfirmOpen(true)}
        onTogglePinProject={onTogglePinProject}
      />

      {sprints && onCreateSprint && onEditSprint && onDeleteSprint && (
        <SprintPanel
          projectId={project.id}
          sprints={sprints}
          tasks={tasks}
          onCreateSprint={onCreateSprint}
          onEditSprint={onEditSprint}
          onCompleteSprintTrigger={(s) => setSprintToComplete(s)}
          onDeleteSprint={onDeleteSprint}
          selectedSprintId={selectedSprintId}
          onSelectSprint={setSelectedSprintId}
        />
      )}

      {/* Standalone Filter Toolbar */}
      {sprints && (
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-primary/40 text-xs font-mono">
          <div className="flex items-center gap-2">
            <div className="flex bg-surface-primary border border-border-primary rounded-lg p-0.5 mr-2">
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'list' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('list')}
                className="text-xs font-semibold px-3"
              >
                List
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'kanban' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('kanban')}
                className="text-xs font-semibold px-3"
              >
                Kanban
              </Button>
              <Button
                type="button"
                size="sm"
                variant={viewMode === 'workflow' ? 'primary' : 'ghost'}
                onClick={() => setViewMode('workflow')}
                className="text-xs font-semibold px-3 flex items-center gap-1.5"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Workflow</span>
              </Button>
            </div>
            <span className="text-text-muted">Filter by Sprint:</span>
            <CustomSelect
              value={selectedSprintId}
              onChange={(v) => setSelectedSprintId(v as string)}
              options={[
                { value: 'all', label: 'All Sprints' },
                { value: 'backlog', label: 'Backlog (No Sprint)' },
                ...sprints
                  .filter((s) => s.projectId === project.id)
                  .map((s) => ({ value: s.id, label: s.name })),
              ]}
              size="sm"
            />
          </div>

          {/* Right side of toolbar for Vault/Agent tabs when in list mode */}
          {viewMode === 'list' && (
            <div className="flex bg-surface-primary border border-border-primary rounded-lg p-0.5">
              <Button
                type="button"
                size="sm"
                variant={sidebarTab === 'vault' ? 'primary' : 'ghost'}
                onClick={() => setSidebarTab('vault')}
                className="text-[11px] font-bold px-3"
              >
                Project Vault
              </Button>
              <Button
                type="button"
                size="sm"
                variant={sidebarTab === 'agent' ? 'primary' : 'ghost'}
                onClick={() => setSidebarTab('agent')}
                className="text-[11px] font-bold px-3"
              >
                AI Agent Sync
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-12 gap-8">
        {/* Main Content Column */}
        <div className={`col-span-12 ${viewMode === 'list' ? 'lg:col-span-8' : ''} space-y-6`}>
          {viewMode === 'list' ? (
            <div className="bg-surface-secondary border border-border-primary rounded-xl p-6">
              {selectedSprintId !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSprintId('all')}
                  className="text-interactive-primary hover:underline text-[11px] p-0 h-auto"
                >
                  Clear filter
                </Button>
              )}
              <ProjectTabs
                taskTab={taskTab}
                onChangeTab={setTaskTab}
                selectedSort={selectedSort}
                onChangeSort={setSelectedSort}
                dueDateFilter={dueDateFilter}
                onChangeDueDateFilter={setDueDateFilter}
                counts={{
                  all: projectTasksAll.filter((t) => !t.archived).length,
                  todo: projectTasksAll.filter((t) => t.status === 'To Do' && !t.archived).length,
                  inProgress: projectTasksAll.filter(
                    (t) => t.status === 'In Progress' && !t.archived,
                  ).length,
                  needToTest: projectTasksAll.filter(
                    (t) => t.status === 'Need to Test' && !t.archived,
                  ).length,
                  completed: projectTasksAll.filter(
                    (t) => (t.completed || t.status === 'Done') && !t.archived,
                  ).length,
                  archived: projectTasksAll.filter((t) => t.archived).length,
                }}
                searchQuery={searchQuery}
                onChangeSearchQuery={setSearchQuery}
              />

              <ProjectTaskList
                tasks={tasks}
                projectTasks={projectTasks}
                project={project}
                sprints={sprints}
                taskTab={taskTab}
                selectedSort={selectedSort}
                dueDateFilter={dueDateFilter}
                onToggleTask={onToggleTask}
                onReorderTasks={onReorderTasks}
                onSelectTask={onSelectTask}
                onAssignTaskToSprint={onAssignTaskToSprint}
                onArchiveTask={onArchiveTask}
                onUnarchiveTask={onUnarchiveTask}
                onSetTaskToDelete={setTaskToDelete}
              />

              {taskTab === 'todo' && (
                <form onSubmit={handleAddTaskSubmit} className="mt-4">
                  <div className="flex items-center gap-3 px-3 py-2 bg-surface-primary border border-border-primary/80 rounded-lg focus-within:border-white/30 transition-all">
                    <Plus className="w-4 h-4 text-text-muted" />
                    <input
                      ref={taskInputRef}
                      type="text"
                      className="bg-transparent border-none focus:outline-none text-xs text-text-primary placeholder:text-text-muted/60 w-full"
                      placeholder="Add a new task..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      disabled={!newTaskTitle.trim()}
                      className="text-[10px] px-2 py-1"
                    >
                      Create
                    </Button>
                  </div>
                </form>
              )}

              {taskTab === 'completed' && completedTasks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border-primary/60 flex justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      onArchiveAllCompleted?.(
                        project.id,
                        completedTasks.map((t) => t.id),
                      )
                    }
                    className="flex items-center gap-1.5 shadow-sm"
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>Archive All Completed ({completedTasks.length})</span>
                  </Button>
                </div>
              )}

              {taskTab === 'Need to Test' &&
                projectTasks.some((t) => t.status === 'Need to Test' && !t.archived) && (
                  <div className="mt-4 pt-3 border-t border-border-primary/60 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const toComplete = projectTasks.filter(
                          (t) => t.status === 'Need to Test' && !t.archived,
                        );
                        toComplete.forEach((task) => {
                          onMoveTaskStatus(task.id, 'Done');
                        });
                      }}
                      className="flex items-center gap-1.5 shadow-sm"
                    >
                      <span>Mark All as Completed</span>
                    </Button>
                  </div>
                )}
            </div>
          ) : viewMode === 'kanban' ? (
            <div className="w-full">
              <KanbanView
                projects={[project]}
                tasks={projectTasks}
                sprints={sprints}
                onMoveTaskStatus={onMoveTaskStatus}
                onAddTaskToProject={(title, projId, sprintId) =>
                  onAddTask(title, projId, undefined, undefined, sprintId)
                }
                onSelectTask={onSelectTask}
                onAssignTaskToSprint={onAssignTaskToSprint}
                hideToolbar={true}
              />
            </div>
          ) : (
            <div className="w-full h-[680px] rounded-xl border border-border-primary overflow-hidden shadow-xs bg-background">
              <WorkflowView
                project={project}
                tasks={projectTasksAll.filter((t) => !t.archived)}
                sprints={sprints}
                selectedSprintId={selectedSprintId}
                onSelectSprint={setSelectedSprintId}
                onSelectTask={onSelectTask}
                onAutoSync={autoImportChanges}
                onAddTask={() => {
                  setViewMode('list');
                  setTaskTab('todo');
                }}
              />
            </div>
          )}
        </div>

        {/* Right Column: Documents & Agent */}
        {viewMode === 'list' && (
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {sidebarTab === 'vault' ? (
              <ProjectFiles
                project={project}
                projectFiles={projectFiles}
                vaultEntries={vaultEntries}
                selectedDocumentPath={selectedDocument?.path}
                onSetVaultDirectory={handleSetVaultDirectory}
                onSelectFile={(entry) => {
                  setSelectedDocument(entry);
                  setIsDocumentPanelOpen(true);
                }}
                onDeleteVaultDoc={setDocToDelete}
                onCreateVaultDoc={handleCreateVaultDoc}
                onRefreshVault={refreshVault}
                onAddNativeFile={handleNativeAddFile}
                onDeleteNativeFile={onDeleteFile}
              />
            ) : (
              <AgentSyncPanel
                project={project}
                syncState={syncState}
                agentEntries={agentEntries}
                isExporting={isExporting}
                isScanning={isScanning}
                hasVaultPath={!!project.vaultPath}
                auditSummary={auditSummary}
                error={error}
                onExport={exportToAgent}
                onImport={handleScanForChanges}
                onCleanUpArchived={cleanUpArchived}
                onCopyContextSnapshot={copyContextSnapshot}
                selectedSprintId={selectedSprintId}
                onOpenAuditLog={openAuditLog}
                onInstallGitHook={installGitHook}
                onSetVaultDirectory={handleSetVaultDirectory}
                onSelectFile={(entry) => {
                  setSelectedDocument(entry);
                  setIsDocumentPanelOpen(true);
                }}
                onRefreshEntries={refreshAgentEntries}
                isLiveSyncEnabled={isLiveSyncEnabled}
                onToggleLiveSync={toggleLiveSync}
              />
            )}
          </div>
        )}
      </div>

      {isDeleteConfirmOpen && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Project"
          description={`Are you sure you want to permanently delete "${project.name}"? All associated tasks, files, and progress metrics will be removed immediately. This action cannot be undone.`}
          confirmLabel="Yes, Delete Project"
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          onConfirm={() => {
            onDeleteProject(project.id);
            setIsDeleteConfirmOpen(false);
          }}
          onClose={() => setIsDeleteConfirmOpen(false)}
        />
      )}

      {taskToDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Task"
          description={`Are you sure you want to permanently delete "${taskToDelete.title}"? This task will be removed immediately. This action cannot be undone.`}
          confirmLabel="Yes, Delete Task"
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          onConfirm={() => {
            onDeleteTask(taskToDelete.id);
            setTaskToDelete(null);
          }}
          onClose={() => setTaskToDelete(null)}
        />
      )}

      {docToDelete && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Document"
          description={`Are you sure you want to permanently delete "${docToDelete.name}" from disk? This file will be removed from ${docToDelete.path}. This action cannot be undone.`}
          confirmLabel="Yes, Delete Document"
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          onConfirm={confirmDeleteVaultDoc}
          onClose={() => setDocToDelete(null)}
        />
      )}

      <DocumentPanel
        isOpen={isDocumentPanelOpen}
        entry={selectedDocument}
        onClose={() => setIsDocumentPanelOpen(false)}
        onReadContent={readDocument}
        onSaveContent={async (path, content) => {
          await writeDocument(path, content);
          await refreshVault();
        }}
      />

      {sprints && (
        <SprintCompleteModal
          isOpen={!!sprintToComplete}
          sprint={sprintToComplete}
          tasks={tasks}
          plannedSprints={sprints.filter(
            (s) =>
              s.projectId === project.id && s.status === 'Planned' && s.id !== sprintToComplete?.id,
          )}
          onCancel={() => setSprintToComplete(null)}
          onConfirm={(rolloverAction, targetSprintId) => {
            if (sprintToComplete) {
              if (rolloverAction === 'keep') {
                onCompleteSprint?.(sprintToComplete.id);
              } else {
                onSprintRollover?.(sprintToComplete.id, targetSprintId || null);
              }
              setSprintToComplete(null);
            }
          }}
        />
      )}

      <AgentImportModal
        isOpen={isImportModalOpen && !!agentDiff}
        diff={agentDiff}
        isImporting={isImporting}
        onConfirm={handleConfirmImport}
        onCancel={handleCancelImport}
      />

      <AuditLogModal
        isOpen={isAuditModalOpen}
        entries={auditLog}
        projectName={project.name}
        onClose={closeAuditLog}
        onExportChangelog={exportChangelogFile}
      />
    </div>
  );
}
