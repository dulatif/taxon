import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { stat } from '@tauri-apps/plugin-fs';
import { AlertTriangle, Archive, ArrowLeft, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAgentSync } from '../hooks/useAgentSync';
import AgentImportModal from '../modals/AgentImportModal';
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
import ConfirmDialog from './ConfirmDialog/ConfirmDialog';
import DocumentPanel from './DocumentPanel';
import SprintPanel from './SprintPanel';

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
  refreshAllData,
}: ProjectDetailViewProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedSort, setSelectedSort] = useState<TaskSortType>('custom');
  const [taskTab, setTaskTab] = useState<TaskTabType>('todo');
  const [selectedSprintId, setSelectedSprintId] = useState<string | 'all' | 'backlog'>(() => {
    const activeSprint = sprints?.find((s) => s.projectId === project.id && s.status === 'Active');
    return activeSprint ? activeSprint.id : 'all';
  });
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
    isExporting,
    isImporting,
    isScanning,
    exportToAgent,
    scanForChanges,
    confirmImport,
    cancelImport,
    refreshAgentEntries,
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshVault();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.vaultPath]);

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
    if (selectedSprintId === 'all') return true;
    if (selectedSprintId === 'backlog') return !t.sprintId;
    return t.sprintId === selectedSprintId;
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

  const activeTasks = projectTasks.filter((t) => !t.completed && !t.archived);
  const completedTasks = projectTasks.filter((t) => t.completed && !t.archived);
  const archivedTasks = projectTasks.filter((t) => t.archived);

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
      <button
        onClick={onBackToProjects}
        className="flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors uppercase tracking-wider font-mono bg-surface-secondary hover:bg-surface-hover px-3 py-1.5 rounded-lg border border-border-primary w-fit cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>All projects</span>
      </button>

      <ProjectHeader
        project={project}
        availableCategories={availableCategories}
        calculatedProgress={calculatedProgress}
        onEditProject={onEditProject}
        onCompleteProject={onCompleteProject}
        onDeleteProjectClick={() => setIsDeleteConfirmOpen(true)}
      />

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: Tasks & Sprints */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
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

          <div className="bg-surface-secondary border border-border-primary rounded-xl p-6">
            {sprints && (
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-primary/40 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-text-muted">Filter by Sprint:</span>
                  <select
                    value={selectedSprintId}
                    onChange={(e) => setSelectedSprintId(e.target.value)}
                    className="bg-surface-primary border border-border-primary rounded px-2.5 py-1 text-text-primary text-xs focus:outline-none focus:border-interactive-primary cursor-pointer"
                  >
                    <option value="all">All Tasks</option>
                    <option value="backlog">Backlog (Unassigned)</option>
                    {sprints
                      .filter((s) => s.projectId === project.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </option>
                      ))}
                  </select>
                </div>
                {selectedSprintId !== 'all' && (
                  <button
                    onClick={() => setSelectedSprintId('all')}
                    className="text-interactive-primary hover:underline text-[11px] cursor-pointer"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}

            <ProjectTabs
              taskTab={taskTab}
              onChangeTab={setTaskTab}
              selectedSort={selectedSort}
              onChangeSort={setSelectedSort}
              counts={{
                active: activeTasks.length,
                completed: completedTasks.length,
                archived: archivedTasks.length,
              }}
            />

            <ProjectTaskList
              tasks={tasks}
              projectTasks={projectTasks}
              project={project}
              sprints={sprints}
              taskTab={taskTab}
              selectedSort={selectedSort}
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
                    type="text"
                    className="bg-transparent border-none focus:outline-none text-xs text-text-primary placeholder:text-text-muted/60 w-full"
                    placeholder="Add a new task..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                  />
                  <button
                    type="submit"
                    disabled={!newTaskTitle.trim()}
                    className="bg-interactive-primary text-interactive-primary-text hover:bg-interactive-primary/90 text-[10px] font-bold px-2 py-1 rounded disabled:opacity-40"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            {taskTab === 'completed' && completedTasks.length > 0 && (
              <div className="mt-4 pt-3 border-t border-border-primary/60 flex justify-end">
                <button
                  type="button"
                  onClick={() =>
                    onArchiveAllCompleted?.(
                      project.id,
                      completedTasks.map((t) => t.id),
                    )
                  }
                  className="bg-surface-primary text-text-primary border border-border-primary font-medium text-xs px-4 py-2 rounded-lg hover:bg-surface-hover transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive All Completed ({completedTasks.length})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Files & Documents */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
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
          <AgentSyncPanel
            project={project}
            syncState={syncState}
            agentEntries={agentEntries}
            isExporting={isExporting}
            isScanning={isScanning}
            hasVaultPath={!!project.vaultPath}
            onExport={exportToAgent}
            onImport={handleScanForChanges}
            onSetVaultDirectory={handleSetVaultDirectory}
            onSelectFile={(entry) => {
              setSelectedDocument(entry);
              setIsDocumentPanelOpen(true);
            }}
            onRefreshEntries={refreshAgentEntries}
          />
        </div>
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
    </div>
  );
}
