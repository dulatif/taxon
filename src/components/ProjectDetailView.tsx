import { addMonths, format } from 'date-fns';
import {
  AlertTriangle,
  Archive,
  ArrowLeft,
  CalendarIcon,
  CheckCircle,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit,
  ExternalLink,
  FileCode,
  FileImage,
  FileText,
  FolderOpen,
  Plus,
  RotateCcw,
  SortAsc,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { PROJECT_CATEGORIES } from '../constants/categories';
import { getCategoryStyle } from '../services/category-color';
import { DocumentFile, Project, Sprint, Task } from '../types';

import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { stat } from '@tauri-apps/plugin-fs';
import { open as shellOpen } from '@tauri-apps/plugin-shell';
import { AnimatePresence, motion } from 'motion/react';
import SprintCompleteModal from '../modals/SprintCompleteModal';
import {
  createDocument,
  deleteDocument,
  readDocument,
  scanVault,
  writeDocument,
} from '../services/vaultScanner';
import { VaultEntry } from '../types';
import DocumentPanel from './DocumentPanel';
import SprintPanel from './SprintPanel';
import VaultFileTree from './VaultFileTree';

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
    recurrence?: any,
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
}: ProjectDetailViewProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedSort, setSelectedSort] = useState<'custom' | 'priority' | 'dueDate'>('custom');
  const [taskTab, setTaskTab] = useState<'todo' | 'completed' | 'archived'>('todo');
  const [selectedSprintId, setSelectedSprintId] = useState<string | 'all' | 'backlog'>(() => {
    const activeSprint = sprints?.find((s) => s.projectId === project.id && s.status === 'Active');
    return activeSprint ? activeSprint.id : 'all';
  });
  const [sprintToComplete, setSprintToComplete] = useState<Sprint | null>(null);

  // File addition triggers
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<DocumentFile['type']>('code');
  const [isAddingFile, setIsAddingFile] = useState(false);

  // Editing Project
  const [isEditingProj, setIsEditingProj] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description);
  const [editCategory, setEditCategory] = useState(project.category);
  const [editDueDate, setEditDueDate] = useState(project.dueDate || '');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);

  const formatDateStr = (d: Date) => d.toISOString().split('T')[0];
  const formatDisplayDate = (dStr: string) => {
    try {
      return format(new Date(dStr + 'T00:00:00'), 'MMM d, yyyy');
    } catch {
      return dStr;
    }
  };

  // Deleting Project confirmation modal
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  // Deleting Vault Document confirmation modal
  const [docToDelete, setDocToDelete] = useState<VaultEntry | null>(null);
  // Deleting Task confirmation modal
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Vault state
  const [vaultEntries, setVaultEntries] = useState<VaultEntry[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<VaultEntry | null>(null);
  const [isDocumentPanelOpen, setIsDocumentPanelOpen] = useState(false);

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

  const handleDeleteVaultDoc = (entry: VaultEntry) => {
    setDocToDelete(entry);
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

  // Filters tasks for this project
  const projectTasksAll = tasks.filter((t) => t.projectId === project.id);
  const projectTasks = projectTasksAll.filter((t) => {
    if (selectedSprintId === 'all') return true;
    if (selectedSprintId === 'backlog') return !t.sprintId;
    return t.sprintId === selectedSprintId;
  });
  const unarchivedProjectTasks = projectTasks.filter((t) => !t.archived);
  const projectFiles = files.filter((f) => f.projectId === project.id);

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

        // Store absolute path as name
        onAddFile(project.id, selected, sizeStr, determinedType);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProjectEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onEditProject(project.id, editName, editDesc, editCategory, editDueDate);
    setIsEditingProj(false);
  };

  // Sort logic for tasks
  const activeTasks = projectTasks.filter((t) => !t.completed && !t.archived);
  const completedTasks = projectTasks.filter((t) => t.completed && !t.archived);
  const archivedTasks = projectTasks.filter((t) => t.archived);

  const sortTasksHelper = (list: Task[]) => {
    return [...list].sort((a, b) => {
      if (selectedSort === 'priority') {
        const weights: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
        return (weights[b.priority || 'Medium'] || 2) - (weights[a.priority || 'Medium'] || 2);
      }
      if (selectedSort === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999);
    });
  };

  const sortedActiveTasks = sortTasksHelper(activeTasks);
  const sortedCompletedTasks = sortTasksHelper(completedTasks);
  const sortedArchivedTasks = sortTasksHelper(archivedTasks);

  const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;
    if (!destination || !onReorderTasks) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index)
      return;

    const isSourceCompleted = source.droppableId === 'completed-tasks';
    const isDestCompleted = destination.droppableId === 'completed-tasks';

    const draggedTask = projectTasks.find((t) => t.id === draggableId);
    if (!draggedTask) return;

    const currentActive = [...sortedActiveTasks];
    const currentCompleted = [...sortedCompletedTasks];

    if (isSourceCompleted) {
      const idx = currentCompleted.findIndex((t) => t.id === draggableId);
      if (idx !== -1) currentCompleted.splice(idx, 1);
    } else {
      const idx = currentActive.findIndex((t) => t.id === draggableId);
      if (idx !== -1) currentActive.splice(idx, 1);
    }

    const updatedTask = {
      ...draggedTask,
      completed: isDestCompleted,
      status: isDestCompleted ? ('Done' as const) : ('To Do' as const),
    };

    if (isSourceCompleted !== isDestCompleted) {
      onToggleTask(draggedTask.id);
    }

    if (isDestCompleted) {
      currentCompleted.splice(destination.index, 0, updatedTask);
    } else {
      currentActive.splice(destination.index, 0, updatedTask);
    }

    const reorderedProjectTasks = [...currentActive, ...currentCompleted];
    const otherTasks = tasks.filter((t) => t.projectId !== project.id);
    onReorderTasks([...reorderedProjectTasks, ...otherTasks]);
  };

  const getFileIcon = (type: DocumentFile['type']) => {
    switch (type) {
      case 'image':
        return <FileImage className="w-4 h-4 text-[#8E9192]" />;
      case 'code':
        return <FileCode className="w-4 h-4 text-[#8E9192]" />;
      default:
        return <FileText className="w-4 h-4 text-[#8E9192]" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
      {/* Back button */}
      <button
        onClick={onBackToProjects}
        className="flex items-center gap-2 text-xs font-semibold text-[#8E9192] hover:text-white transition-colors uppercase tracking-wider font-mono bg-[#141313] hover:bg-[#201F1F] px-3 py-1.5 rounded-lg border border-[#27272A] w-fit cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>All projects</span>
      </button>

      {/* Project Header Description Block */}
      <section className="space-y-6 bg-[#0A0A0A] border border-[#27272A] p-6 rounded-xl relative">
        {isEditingProj ? (
          <form onSubmit={handleSaveProjectEdit} className="space-y-4">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-black text-white border border-[#27272A] text-xl font-bold rounded p-2 w-full focus:outline-none focus:border-white"
              required
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="bg-black text-[#C4C7C8] border border-[#27272A] text-sm rounded p-2 w-full h-20 focus:outline-none focus:border-white"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] font-mono mb-1">
                  Due Date
                </label>
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  className="bg-black border border-[#27272A] text-xs text-white rounded p-2 w-full focus:outline-none focus:border-white flex items-center justify-between cursor-pointer"
                >
                  {editDueDate ? (
                    <span className="font-semibold">{formatDisplayDate(editDueDate)}</span>
                  ) : (
                    <span className="text-[#8E9192]">Set due date...</span>
                  )}
                  <CalendarIcon className="w-4 h-4 text-[#8E9192]" />
                </button>

                {isDatePickerOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setIsDatePickerOpen(false)}
                    />
                    <div className="absolute left-0 top-[calc(100%+8px)] w-[340px] bg-[#0A0A0A] border border-[#27272A] rounded-xl p-3.5 z-[9999] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs font-bold text-white tracking-wide">
                          {format(pickerMonth, 'MMMM yyyy')}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPickerMonth((prev) => addMonths(prev, -1))}
                            className="w-6 h-6 rounded-md border border-[#27272A] bg-[#141313] hover:bg-[#201F1F] hover:border-white text-[#8E9192] hover:text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPickerMonth((prev) => addMonths(prev, 1))}
                            className="w-6 h-6 rounded-md border border-[#27272A] bg-[#141313] hover:bg-[#201F1F] hover:border-white text-[#8E9192] hover:text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <DayPicker
                        mode="single"
                        required
                        selected={editDueDate ? new Date(editDueDate + 'T00:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            setEditDueDate(formatDateStr(date));
                          }
                          setIsDatePickerOpen(false);
                        }}
                        month={pickerMonth}
                        onMonthChange={setPickerMonth}
                        hideNavigation={true}
                        classNames={{
                          root: 'taxon-calendar',
                          months: 'taxon-months',
                          month: 'taxon-month',
                          month_caption: 'taxon-caption',
                          nav: 'taxon-nav',
                          button_previous: 'taxon-nav-button',
                          button_next: 'taxon-nav-button',
                          month_grid: 'taxon-table',
                          weekdays: 'taxon-head-row',
                          weekday: 'taxon-head-cell',
                          week: 'taxon-row',
                          day: 'taxon-cell',
                          day_button: 'taxon-day',
                          selected: 'taxon-day-selected',
                          today: 'taxon-day-today',
                          outside: 'taxon-day-outside',
                        }}
                      />

                      {editDueDate && (
                        <div className="pt-2 mt-2 border-t border-[#27272A] flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setEditDueDate('');
                              setIsDatePickerOpen(false);
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Clear Date</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] font-mono">
                    Category Tag
                  </label>
                  {isCustomCategoryMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategoryMode(false);
                        setEditCategory('Engineering');
                      }}
                      className="text-[10px] text-[#8E9192] hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" /> Select from list
                    </button>
                  )}
                </div>
                {(() => {
                  const pooled = Array.from(
                    new Set(
                      availableCategories.length > 0 ? availableCategories : PROJECT_CATEGORIES,
                    ),
                  ).filter(Boolean);
                  if (isCustomCategoryMode) {
                    return (
                      <input
                        type="text"
                        placeholder="Type custom category name (e.g. AI Research)..."
                        className="bg-black border border-white/40 text-xs text-white rounded p-2 w-full focus:outline-none focus:border-white"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        autoFocus
                      />
                    );
                  }
                  return (
                    <select
                      value={pooled.includes(editCategory as any) ? editCategory : '__custom__'}
                      onChange={(e) => {
                        if (e.target.value === '__custom__') {
                          setIsCustomCategoryMode(true);
                          setEditCategory('');
                        } else {
                          setEditCategory(e.target.value);
                        }
                      }}
                      className="bg-black border border-[#27272A] text-xs text-[#C4C7C8] rounded p-2 w-full focus:outline-none focus:border-white cursor-pointer"
                    >
                      {pooled.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option disabled value="">
                        ───
                      </option>
                      <option value="__custom__">+ Add Custom Category...</option>
                    </select>
                  );
                })()}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsEditingProj(false)}
                className="text-xs text-[#8E9192] hover:text-white px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs bg-white text-black font-bold px-4 py-1.5 rounded"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {(() => {
                  const style = getCategoryStyle(project.category);
                  return (
                    <span
                      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider leading-tight border ${style.border} ${style.bg} ${style.text}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 self-center ${style.dot}`}
                      ></span>
                      <span className="self-center">{project.category}</span>
                    </span>
                  );
                })()}
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                {project.name}
              </h1>
              <p className="text-[#C4C7C8] text-sm mt-2 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            </div>

            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => {
                  setEditName(project.name);
                  setEditDesc(project.description);
                  setEditCategory(project.category);
                  setEditDueDate(project.dueDate || '');
                  setIsEditingProj(true);
                }}
                className="bg-black text-white border border-[#27272A] font-medium text-xs px-4 py-2 rounded-lg hover:bg-[#201F1F] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                className="bg-black text-[#8E9192] border border-[#27272A] font-medium text-xs px-4 py-2 rounded-lg hover:bg-[#201F1F] hover:text-red-400 hover:border-red-400/30 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              {project.category !== 'Completed' && (
                <button
                  onClick={() => onCompleteProject(project.id)}
                  className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-white/90 transition-opacity flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Complete Project
                </button>
              )}
            </div>
          </div>
        )}

        {/* Unified progress track row */}
        <div className="pt-4 border-t border-[#27272A]/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-[#8E9192] uppercase tracking-wider font-mono font-bold">
                Progress
              </span>
              <span className="text-lg font-bold text-white font-mono">{calculatedProgress}%</span>
            </div>
            <div className="flex-1 max-w-md">
              <div className="w-full bg-[#141313] h-1.5 rounded-full overflow-hidden border border-[#27272A]/30">
                <div
                  className="bg-white h-full rounded-full transition-all duration-500"
                  style={{ width: `${calculatedProgress}%` }}
                ></div>
              </div>
            </div>
            {project.dueDate && (
              <div className="text-[10px] text-[#8E9192] uppercase tracking-widest font-mono shrink-0 font-bold bg-[#141313] px-2.5 py-1 rounded inline-block border border-[#27272A]/50">
                Due on{' '}
                {new Date(project.dueDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Grid Content: Tasks & Documents */}
      <div className="grid grid-cols-12 gap-8">
        {/* Task List Section */}
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

          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6">
            {sprints && (
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#27272A]/40 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[#8E9192]">Filter by Sprint:</span>
                  <select
                    value={selectedSprintId}
                    onChange={(e) => setSelectedSprintId(e.target.value as any)}
                    className="bg-[#141313] border border-[#27272A] rounded px-2.5 py-1 text-white text-xs focus:outline-none focus:border-[#3B82F6] cursor-pointer"
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
                    className="text-[#3B82F6] hover:underline text-[11px] cursor-pointer"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}

            {/* Header and Segmented Control Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#27272A]/60">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  Tasks
                </h2>
                <div className="flex items-center bg-[#141313] p-1 rounded-lg border border-[#27272A]/80">
                  <button
                    type="button"
                    onClick={() => setTaskTab('todo')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer focus:outline-none ${
                      taskTab === 'todo'
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'text-[#8E9192] hover:text-white hover:bg-[#1C1B1B]/60 border border-transparent'
                    }`}
                  >
                    <span className="translate-y-[1px]">To Do</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        taskTab === 'todo' ? 'bg-black text-white' : 'bg-[#1C1B1B] text-[#8E9192]'
                      }`}
                    >
                      {sortedActiveTasks.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaskTab('completed')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer focus:outline-none ${
                      taskTab === 'completed'
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'text-[#8E9192] hover:text-white hover:bg-[#1C1B1B]/60 border border-transparent'
                    }`}
                  >
                    <span className="translate-y-[1px]">Completed</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        taskTab === 'completed'
                          ? 'bg-black text-white'
                          : 'bg-[#1C1B1B] text-[#8E9192]'
                      }`}
                    >
                      {sortedCompletedTasks.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTaskTab('archived')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium transition-colors cursor-pointer focus:outline-none ${
                      taskTab === 'archived'
                        ? 'bg-white text-black font-bold shadow-sm'
                        : 'text-[#8E9192] hover:text-white hover:bg-[#1C1B1B]/60 border border-transparent'
                    }`}
                  >
                    <Archive className="w-3 h-3 translate-y-[1px]" />
                    <span className="translate-y-[1px]">Archived</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        taskTab === 'archived'
                          ? 'bg-black text-white'
                          : 'bg-[#1C1B1B] text-[#8E9192]'
                      }`}
                    >
                      {sortedArchivedTasks.length}
                    </span>
                  </button>
                </div>
              </div>

              {taskTab !== 'archived' && (
                <button
                  onClick={() => {
                    const seq: ('custom' | 'priority' | 'dueDate')[] = [
                      'custom',
                      'priority',
                      'dueDate',
                    ];
                    const nextIdx = (seq.indexOf(selectedSort) + 1) % seq.length;
                    setSelectedSort(seq[nextIdx]);
                  }}
                  className="flex items-center gap-1.5 text-[#8E9192] hover:text-white transition-colors text-xs uppercase tracking-wider font-mono cursor-pointer bg-[#141313] hover:bg-[#201F1F] px-2.5 py-1.5 rounded-lg border border-[#27272A]/80 self-start sm:self-auto"
                >
                  <SortAsc className="w-3.5 h-3.5" />
                  <span>Sort: {selectedSort}</span>
                </button>
              )}
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              {/* To Do Tab */}
              {taskTab === 'todo' && (
                <div>
                  <Droppable droppableId="active-tasks" isDropDisabled={selectedSort !== 'custom'}>
                    {(provided, snapshot) => (
                      <ul
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-1.5 min-h-[40px] rounded-lg transition-colors select-none ${
                          snapshot.isDraggingOver
                            ? 'bg-[#141313]/50 border border-white/20 p-1.5'
                            : ''
                        }`}
                      >
                        {sortedActiveTasks.length === 0 && !snapshot.isDraggingOver ? (
                          <div className="py-8 text-center text-xs text-[#8E9192]">
                            No active tasks. Use the field below to add one!
                          </div>
                        ) : (
                          sortedActiveTasks.map((task, index) => (
                            // @ts-ignore
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                              isDragDisabled={selectedSort !== 'custom'}
                            >
                              {(provided, snapshot) => (
                                <li
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  id={`task-item-${task.id}`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => onSelectTask?.(task)}
                                  className={`flex items-start justify-between py-3 px-3 rounded-lg transition-colors group cursor-grab active:cursor-grabbing select-none border border-transparent ${
                                    snapshot.isDragging
                                      ? 'bg-[#201F1F] text-white ring-1 ring-white/30 shadow-lg z-50 border-white/20'
                                      : 'hover:bg-[#141313]/10 '
                                  }`}
                                >
                                  <div className="flex items-start gap-4 flex-1 mr-4">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleTask(task.id);
                                      }}
                                      className="shrink-0 mt-0.5 text-[#8E9192] hover:text-white transition-colors cursor-pointer"
                                    >
                                      <Square className="w-4 h-4" />
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold leading-relaxed text-white">
                                        {task.title}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    {sprints && (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <select
                                          value={task.sprintId || ''}
                                          onChange={(e) =>
                                            onAssignTaskToSprint?.(task.id, e.target.value || null)
                                          }
                                          className="text-[9px] font-mono bg-[#141313] hover:bg-[#201F1F] text-[#60A5FA] px-1.5 py-0.5 rounded border border-[#3B82F6]/30 cursor-pointer focus:outline-none transition-colors"
                                          title="Assign or change sprint"
                                        >
                                          <option value="">Backlog</option>
                                          {sprints
                                            .filter((s) => s.projectId === project.id)
                                            .map((s) => (
                                              <option key={s.id} value={s.id}>
                                                {s.name}
                                              </option>
                                            ))}
                                        </select>
                                      </div>
                                    )}
                                    {task.duration && (
                                      <span className="text-[9px] font-mono font-semibold bg-black px-1.5 py-0.5 rounded border border-[#27272A]/50 text-[#8E9192]">
                                        {task.duration}
                                      </span>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onArchiveTask?.(task.id);
                                      }}
                                      className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      title="Archive task"
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTaskToDelete(task);
                                      }}
                                      className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      title="Delete task item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </li>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>

                  {/* inline input field for adding project specific tasks */}
                  <form onSubmit={handleAddTaskSubmit} className="mt-4">
                    <div className="flex items-center gap-3 px-3 py-2 bg-[#141313] border border-[#27272A]/80 rounded-lg focus-within:border-white/30 transition-all">
                      <Plus className="w-4 h-4 text-[#8E9192]" />
                      <input
                        type="text"
                        className="bg-transparent border-none focus:outline-none text-xs text-white placeholder:text-[#8E9192]/60 w-full"
                        placeholder="Add a new task..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                      />
                      <button
                        type="submit"
                        disabled={!newTaskTitle.trim()}
                        className="bg-zinc-800 text-white hover:bg-zinc-700 text-[10px] font-bold px-2 py-1 rounded disabled:opacity-40"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Completed Tab */}
              {taskTab === 'completed' && (
                <div>
                  <Droppable
                    droppableId="completed-tasks"
                    isDropDisabled={selectedSort !== 'custom'}
                  >
                    {(provided, snapshot) => (
                      <ul
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-1.5 min-h-[40px] rounded-lg transition-colors select-none ${
                          snapshot.isDraggingOver
                            ? 'bg-[#141313]/50 border border-white/20 p-1.5'
                            : ''
                        }`}
                      >
                        {sortedCompletedTasks.length === 0 && !snapshot.isDraggingOver ? (
                          <div className="py-8 text-center text-xs text-[#8E9192]">
                            No completed tasks yet. Finish a task in the To Do tab!
                          </div>
                        ) : (
                          sortedCompletedTasks.map((task, index) => (
                            // @ts-ignore
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                              isDragDisabled={selectedSort !== 'custom'}
                            >
                              {(provided, snapshot) => (
                                <li
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  id={`task-item-${task.id}`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => onSelectTask?.(task)}
                                  className={`flex items-start justify-between py-3 px-3 rounded-lg transition-colors group cursor-grab active:cursor-grabbing select-none border border-transparent opacity-75 ${
                                    snapshot.isDragging
                                      ? 'bg-[#201F1F] text-white ring-1 ring-white/30 shadow-lg z-50 opacity-100 border-white/20'
                                      : 'hover:bg-[#141313]/40 hover:border-[#27272A]/30'
                                  }`}
                                >
                                  <div className="flex items-start gap-4 flex-1 mr-4">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onToggleTask(task.id);
                                      }}
                                      className="shrink-0 mt-0.5 text-[#8E9192] hover:text-white transition-colors cursor-pointer"
                                    >
                                      <CheckSquare className="w-4 h-4 text-white" />
                                    </button>

                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold leading-relaxed text-white group-hover:underline line-through text-[#8E9192]/80 decoration-[#27272A]">
                                        {task.title}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0">
                                    {sprints && (
                                      <div onClick={(e) => e.stopPropagation()}>
                                        <select
                                          value={task.sprintId || ''}
                                          onChange={(e) =>
                                            onAssignTaskToSprint?.(task.id, e.target.value || null)
                                          }
                                          className="text-[9px] font-mono bg-[#141313] hover:bg-[#201F1F] text-[#60A5FA] px-1.5 py-0.5 rounded border border-[#3B82F6]/30 cursor-pointer focus:outline-none transition-colors"
                                          title="Assign or change sprint"
                                        >
                                          <option value="">Backlog</option>
                                          {sprints
                                            .filter((s) => s.projectId === project.id)
                                            .map((s) => (
                                              <option key={s.id} value={s.id}>
                                                {s.name}
                                              </option>
                                            ))}
                                        </select>
                                      </div>
                                    )}
                                    {task.duration && (
                                      <span className="text-[9px] font-mono font-semibold bg-black px-1.5 py-0.5 rounded border border-[#27272A]/50 text-[#8E9192]">
                                        {task.duration}
                                      </span>
                                    )}
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onArchiveTask?.(task.id);
                                      }}
                                      className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      title="Archive task"
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setTaskToDelete(task);
                                      }}
                                      className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                      title="Delete task item"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </li>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </ul>
                    )}
                  </Droppable>

                  {sortedCompletedTasks.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-[#27272A]/60 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          onArchiveAllCompleted?.(
                            project.id,
                            sortedCompletedTasks.map((t) => t.id),
                          )
                        }
                        className="bg-black text-white border border-[#27272A] font-medium text-xs px-4 py-2 rounded-lg hover:bg-[#201F1F] transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        <span>Archive All Completed ({sortedCompletedTasks.length})</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </DragDropContext>

            {/* Archived Tab */}
            {taskTab === 'archived' && (
              <div className="space-y-4">
                <div className="bg-[#141313]/60 border border-[#27272A]/80 rounded-lg p-3 flex items-center justify-between text-xs text-[#8E9192]">
                  <div className="flex items-center gap-2">
                    <Archive className="w-4 h-4 text-[#8E9192] shrink-0" />
                    <span>Archived tasks are read-only. Restore to resume or edit.</span>
                  </div>
                </div>

                <ul className="space-y-1.5 min-h-[40px]">
                  {sortedArchivedTasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#8E9192]">
                      No archived tasks for this project.
                    </div>
                  ) : (
                    sortedArchivedTasks.map((task) => {
                      const archivedDateStr = task.archivedAt
                        ? new Date(task.archivedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : undefined;
                      return (
                        <li
                          key={task.id}
                          className="flex items-center justify-between py-3 px-3 rounded-lg bg-[#141313]/30 border border-[#27272A]/40 opacity-70 hover:opacity-100 transition-opacity select-none group"
                        >
                          <div className="flex items-center gap-4 flex-1 mr-4">
                            <Archive className="w-4 h-4 text-[#8E9192] shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold leading-relaxed text-[#8E9192] line-through decoration-[#27272A]">
                                {task.title}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            {archivedDateStr && (
                              <span className="text-[9px] font-mono text-[#8E9192] bg-black/60 px-1.5 py-0.5 rounded border border-[#27272A]/50">
                                Archived {archivedDateStr}
                              </span>
                            )}
                            {task.duration && (
                              <span className="text-[9px] font-mono font-semibold bg-black px-1.5 py-0.5 rounded border border-[#27272A]/50 text-[#8E9192]">
                                {task.duration}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => onUnarchiveTask?.(task.id)}
                              className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-white transition-colors cursor-pointer"
                              title="Restore task"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setTaskToDelete(task)}
                              className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-white transition-colors cursor-pointer"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Documents Columns section */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#27272A]/50">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-white" />
                Project Vault & Documents
              </h3>
            </div>

            {project.vaultPath ? (
              <div className="space-y-6">
                <VaultFileTree
                  entries={vaultEntries}
                  selectedPath={selectedDocument?.path}
                  vaultPath={project.vaultPath}
                  onSelectFile={(entry) => {
                    setSelectedDocument(entry);
                    setIsDocumentPanelOpen(true);
                  }}
                  onDeleteFile={handleDeleteVaultDoc}
                  onCreateDocument={handleCreateVaultDoc}
                  onRefresh={refreshVault}
                  onChangeVaultPath={handleSetVaultDirectory}
                />
              </div>
            ) : (
              <div className="bg-[#141313] border border-dashed border-[#27272A] hover:border-white/40 rounded-xl p-5 text-center space-y-3 transition-colors mb-6">
                <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                    No Project Vault Set
                  </h4>
                  <p className="text-[11px] text-[#8E9192] mt-1 leading-relaxed max-w-xs mx-auto">
                    Connect a local directory to scan for .md / .txt documents with live preview &
                    editing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSetVaultDirectory}
                  className="bg-white text-black hover:bg-white/90 font-bold text-xs px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Set Vault Directory</span>
                </button>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-[#27272A]/50 mt-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-[#8E9192]/80">
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold font-mono tracking-tight text-white">
                    Manual Attachments
                  </span>
                </div>
                <button
                  onClick={handleNativeAddFile}
                  className="text-[10px] text-white hover:underline uppercase tracking-wider font-mono cursor-pointer"
                >
                  + Attach file
                </button>
              </div>

              {projectFiles.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-[#8E9192] font-mono italic">
                  No manual attachments listed
                </div>
              ) : (
                <div className="ml-2 pl-3 border-l border-[#27272A]/50 space-y-2">
                  {projectFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 hover:bg-[#121212] rounded transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getFileIcon(file.type)}
                        <div className="min-w-0">
                          <p
                            className="text-xs font-semibold text-white truncate max-w-[150px]"
                            title={file.name}
                          >
                            {file.name.split(/[/\\]/).pop()}
                          </p>
                          <p className="text-[10px] text-[#8E9192] font-mono mt-0.5">{file.size}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={async () => {
                            try {
                              await shellOpen(file.name);
                            } catch (e) {
                              console.error('Failed to open file', e);
                            }
                          }}
                          className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-white"
                          title="Open document"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteFile(file.id)}
                          className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-red-400"
                          title="Delete asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Modal Confirmation for Deleting Project */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              aria-label="Close"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="absolute right-4 top-4 hover:bg-[#141313] p-1.5 rounded-lg text-[#8E9192] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-md font-bold uppercase tracking-wider font-mono text-white">
                Delete Project
              </h3>
            </div>

            <p className="text-xs text-[#C4C7C8] leading-relaxed mb-6">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white font-semibold">"{project.name}"</strong>? All associated
              tasks, files, and progress metrics will be removed immediately. This action cannot be
              undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="bg-black text-[#C4C7C8] border border-[#27272A] font-medium text-xs px-4 py-2 rounded-lg hover:bg-[#141313] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  onDeleteProject(project.id);
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" /> Yes, Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal Confirmation for Deleting Task */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setTaskToDelete(null)}
              className="absolute right-4 top-4 hover:bg-[#141313] p-1.5 rounded-lg text-[#8E9192] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-md font-bold uppercase tracking-wider font-mono text-white">
                Delete Task
              </h3>
            </div>

            <p className="text-xs text-[#C4C7C8] leading-relaxed mb-6">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white font-semibold font-mono">"{taskToDelete.title}"</strong>
              ? This task will be removed immediately. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="bg-black text-[#C4C7C8] border border-[#27272A] font-medium text-xs px-4 py-2 rounded-lg hover:bg-[#141313] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = taskToDelete.id;
                  setTaskToDelete(null);
                  onDeleteTask(id);
                }}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Yes, Delete Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal Confirmation for Deleting Vault Document */}
      {docToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl w-full max-w-md p-6 relative shadow-2xl">
            <button
              type="button"
              aria-label="Close"
              onClick={() => setDocToDelete(null)}
              className="absolute right-4 top-4 hover:bg-[#141313] p-1.5 rounded-lg text-[#8E9192] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 text-red-400 mb-3">
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-md font-bold uppercase tracking-wider font-mono text-white">
                Delete Document
              </h3>
            </div>

            <p className="text-xs text-[#C4C7C8] leading-relaxed mb-6">
              Are you sure you want to permanently delete{' '}
              <strong className="text-white font-semibold font-mono">"{docToDelete.name}"</strong>{' '}
              from disk? This file will be removed from{' '}
              <span className="font-mono text-[#8E9192] break-all">{docToDelete.path}</span>. This
              action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="bg-black text-[#C4C7C8] border border-[#27272A] font-medium text-xs px-4 py-2 rounded-lg hover:bg-[#141313] hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteVaultDoc}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Yes, Delete Document
              </button>
            </div>
          </div>
        </div>
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

      {/* Sprint Complete & Rollover Modal */}
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
    </div>
  );
}
