import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Edit3,
  Eye,
  FileCode2,
  FileDown,
  FileUp,
  ListCheck,
  ListTodo,
  Maximize2,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useCallback, useState } from 'react';
import TaskPropertyGrid from '../../sections/TaskPropertyGrid/TaskPropertyGrid';
import type { Project, Sprint, SubTask, Task } from '../../types';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import { DeliverablesDiffViewer, ReviewModal } from '../DiffViewer';
import MarkdownViewer from '../MarkdownViewer';
import { RequestRevisionModal } from '../Revision/RequestRevisionModal';
import { RevisionHistoryViewer } from '../Revision/RevisionHistoryViewer';
import SubtaskList from '../SubtaskList/SubtaskList';
import MergeWorktreeDialog from '../Worktree/MergeWorktreeDialog';
import WorktreeControlPanel from '../Worktree/WorktreeControlPanel';

interface TaskDetailViewProps {
  task: Task | null;
  projects: Project[];
  sprints?: Sprint[];
  allTasks?: Task[];
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStartFocus?: (task: Task) => void;
}

function extractSection(description?: string, headerName?: string): string | null {
  if (!description || !headerName) return null;
  const regex = new RegExp(`##\\s+${headerName}\\s*\\r?\\n([\\s\\S]*?)(?=\\n##\\s+|$)`, 'i');
  const match = description.match(regex);
  if (!match || !match[1]?.trim()) return null;
  return match[1].trim();
}

function extractMainDescription(description?: string): string | null {
  if (!description) return null;
  const descHeaderMatch = extractSection(description, 'Description');
  if (descHeaderMatch) return descHeaderMatch;

  const firstHeaderIndex = description.search(/\n##\s+/);
  if (firstHeaderIndex !== -1) {
    const text = description.slice(0, firstHeaderIndex).trim();
    return text || null;
  }
  return description.trim() || null;
}

function parseChecklistItems(markdown?: string): Array<{ text: string; completed: boolean }> {
  if (!markdown) return [];
  const lines = markdown.split(/\r?\n/);
  const items: Array<{ text: string; completed: boolean }> = [];
  for (const line of lines) {
    const match = line.match(/^-\s*\[([ xX])\]\s+(.*)$/);
    if (match && match[1] !== undefined && match[2] !== undefined) {
      items.push({
        completed: match[1].toLowerCase() === 'x',
        text: match[2].trim(),
      });
    }
  }
  return items;
}

function toggleChecklistItem(
  description: string,
  itemText: string,
  targetCompleted: boolean,
): string {
  const lines = description.split(/\r?\n/);
  let replaced = false;
  const newLines = lines.map((line) => {
    if (replaced) return line;
    const match = line.match(/^(\s*-\s*\[)[ xX](\]\s+)(.*)$/);
    if (match && match[3] !== undefined && match[3].trim() === itemText.trim()) {
      replaced = true;
      return `${match[1]}${targetCompleted ? 'x' : ' '}${match[2]}${match[3]}`;
    }
    return line;
  });
  return newLines.join('\n');
}

function addCriterionToDescription(description: string, text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return description;
  const newCriterion = `- [ ] ${trimmed}`;

  if (/##\s+Acceptance Criteria/i.test(description)) {
    const lines = description.split(/\r?\n/);
    const headerIndex = lines.findIndex((l) => /^##\s+Acceptance Criteria/i.test(l));
    if (headerIndex !== -1) {
      let insertIndex = headerIndex + 1;
      while (
        insertIndex < lines.length &&
        lines[insertIndex] !== undefined &&
        !lines[insertIndex]!.startsWith('## ')
      ) {
        insertIndex++;
      }
      lines.splice(insertIndex, 0, newCriterion);
      return lines.join('\n');
    }
  }

  return `${description ? description.trim() + '\n\n' : ''}## Acceptance Criteria\n\n${newCriterion}\n`;
}

export default function TaskDetailView({
  task,
  projects,
  sprints,
  allTasks = [],
  onClose,
  onUpdateTask,
  onDeleteTask,
  onStartFocus,
}: TaskDetailViewProps) {
  const [prevTask, setPrevTask] = useState<Task | null>(task);
  const [editedTask, setEditedTask] = useState<Task | null>(() =>
    task
      ? {
          ...task,
          labels: task.labels || ['Work'],
          reminders: task.reminders || ['Add Reminders'],
          subtasks: task.subtasks || [],
          inputs: task.inputs || [],
          outputs: task.outputs || [],
          linkedFiles: task.linkedFiles || [],
        }
      : null,
  );
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'diff'>('overview');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [isMergeDialogOpen, setIsMergeDialogOpen] = useState(false);

  const [newInputText, setNewInputText] = useState('');
  const [newOutputText, setNewOutputText] = useState('');
  const [newLinkedFileText, setNewLinkedFileText] = useState('');
  const [newCriterionText, setNewCriterionText] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (task !== prevTask) {
    setPrevTask(task);
    setEditedTask(
      task
        ? {
            ...task,
            labels: task.labels || ['Work'],
            reminders: task.reminders || ['Add Reminders'],
            subtasks: task.subtasks || [],
            inputs: task.inputs || [],
            outputs: task.outputs || [],
            linkedFiles: task.linkedFiles || [],
          }
        : null,
    );
  }

  const handleCopy = useCallback((text: string, key: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    }
  }, []);

  if (!task || !editedTask) return null;

  const handleFieldChange = <K extends keyof Task>(field: K, value: Task[K]) => {
    setEditedTask((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      onUpdateTask(updated);
      return updated;
    });
  };

  const handleResetCircuitBreaker = async () => {
    if (!editedTask) return;
    const updated: Task = {
      ...editedTask,
      escalated: false,
      revisionCount: 0,
    };
    setEditedTask(updated);
    onUpdateTask(updated);
    const { saveTask } = await import('../../services/database');
    await saveTask(updated);
  };

  // Input Contract Handlers
  const handleAddInput = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newInputText.trim();
    if (!val) return;
    const current = editedTask.inputs || [];
    if (!current.includes(val)) {
      handleFieldChange('inputs', [...current, val]);
    }
    setNewInputText('');
  };

  const handleRemoveInput = (idx: number) => {
    const updated = (editedTask.inputs || []).filter((_, i) => i !== idx);
    handleFieldChange('inputs', updated.length > 0 ? updated : undefined);
  };

  // Output Target Handlers
  const handleAddOutput = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newOutputText.trim();
    if (!val) return;
    const current = editedTask.outputs || [];
    if (!current.includes(val)) {
      handleFieldChange('outputs', [...current, val]);
    }
    setNewOutputText('');
  };

  const handleRemoveOutput = (idx: number) => {
    const updated = (editedTask.outputs || []).filter((_, i) => i !== idx);
    handleFieldChange('outputs', updated.length > 0 ? updated : undefined);
  };

  // Linked Files Handlers
  const handleAddLinkedFile = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newLinkedFileText.trim();
    if (!val) return;
    const current = editedTask.linkedFiles || [];
    if (!current.includes(val)) {
      handleFieldChange('linkedFiles', [...current, val]);
    }
    setNewLinkedFileText('');
  };

  const handleRemoveLinkedFile = (idx: number) => {
    const updated = (editedTask.linkedFiles || []).filter((_, i) => i !== idx);
    handleFieldChange('linkedFiles', updated.length > 0 ? updated : undefined);
  };

  // Acceptance Criteria Handlers
  const mainDesc = extractMainDescription(editedTask.description);
  const acceptanceCriteriaText = extractSection(editedTask.description, 'Acceptance Criteria');
  const acceptanceChecklist = parseChecklistItems(acceptanceCriteriaText || undefined);
  const deliverablesText = extractSection(editedTask.description, 'Deliverables');

  const completedCriteriaCount = acceptanceChecklist.filter((c) => c.completed).length;

  const handleToggleAcceptanceCriterion = (itemText: string, targetCompleted: boolean) => {
    const currentDesc = editedTask.description || '';
    const updatedDesc = toggleChecklistItem(currentDesc, itemText, targetCompleted);
    handleFieldChange('description', updatedDesc);
  };

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    const val = newCriterionText.trim();
    if (!val) return;
    const currentDesc = editedTask.description || '';
    const updatedDesc = addCriterionToDescription(currentDesc, val);
    handleFieldChange('description', updatedDesc);
    setNewCriterionText('');
  };

  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 transition-opacity"
          />

          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 pt-10 w-[520px] bg-surface-primary border-l border-border-primary shadow-2xl z-[60] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary shrink-0 bg-surface-primary">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-text-primary tracking-wide whitespace-nowrap">
                  Task Details
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    editedTask.status === 'Done'
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : editedTask.status === 'Need to Test'
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  }`}
                >
                  {editedTask.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onStartFocus && (
                  <button
                    onClick={() => {
                      onStartFocus(editedTask);
                      onClose();
                    }}
                    title="Start Pomodoro"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-interactive-primary text-interactive-primary-text font-bold text-xs rounded-lg hover:bg-interactive-primary/90 transition-colors shadow-sm cursor-pointer mr-1"
                  >
                    <Play className="w-3.5 h-3.5" fill="currentColor" />
                    <span>Start Pomodoro</span>
                  </button>
                )}
                <button
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  title="Delete Task"
                  className="p-2 text-text-muted hover:text-red-400 hover:bg-surface-secondary rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  title="Close Panel"
                  className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-border-primary/60 bg-surface-primary shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-surface-secondary text-text-primary border border-border-primary'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('diff')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                  activeTab === 'diff'
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/40'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Diff &amp; Deliverables</span>
                {editedTask.outputs && editedTask.outputs.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 font-mono">
                    {editedTask.outputs.length}
                  </span>
                )}
              </button>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                title="Pop-out Full-Screen Review (F)"
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {activeTab === 'diff' ? (
              <div className="flex-1 min-h-0 overflow-hidden">
                <DeliverablesDiffViewer
                  task={editedTask}
                  project={projects.find((p) => p.id === editedTask.projectId)}
                  onUpdateTask={(updated) => {
                    setEditedTask(updated);
                    onUpdateTask(updated);
                  }}
                  onToggleModal={() => setIsReviewModalOpen(true)}
                />
              </div>
            ) : (
              /* Scrollable Main Content */
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7 scrollbar-thin">
                {/* Circuit Breaker Escalation Warning Banner */}
                {editedTask.escalated && (
                  <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3 shadow-lg shadow-rose-950/20">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-400 shrink-0">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-rose-300 font-mono tracking-wide uppercase">
                              Circuit Breaker Tripped
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              Attempt {editedTask.revisionCount || 3}
                            </span>
                          </div>
                          <p className="text-xs text-rose-200/90 leading-relaxed font-mono text-[11px]">
                            Autonomous AI agents are barred from working on this task due to
                            repeated rejection. A human developer must intervene, resolve edge
                            cases, and reset the circuit breaker.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetCircuitBreaker}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/50 rounded-xl text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-sm"
                      >
                        Reset Circuit Breaker
                      </button>
                    </div>
                  </div>
                )}

                {/* Title Section */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                    Title
                  </label>
                  <div className="bg-surface-secondary border border-border-primary rounded-xl px-4 py-3 focus-within:border-white/40 transition-all shadow-inner">
                    <input
                      type="text"
                      value={editedTask.title}
                      onChange={(e) => handleFieldChange('title', e.target.value)}
                      placeholder="Task title..."
                      className="w-full bg-transparent border-none text-text-primary font-semibold text-lg focus:outline-none placeholder:text-text-muted/60"
                    />
                  </div>
                </div>

                {/* Properties Grid */}
                <TaskPropertyGrid
                  task={editedTask}
                  projects={projects}
                  sprints={sprints || []}
                  allTasks={allTasks}
                  onChange={handleFieldChange}
                />

                {/* Worktree Sandbox Launchers & Branch Panel */}
                {(editedTask.workspacePath || editedTask.worktreeStatus === 'active') && (
                  <WorktreeControlPanel
                    task={editedTask}
                    onOpenMergeDialog={() => setIsMergeDialogOpen(true)}
                  />
                )}

                {/* Task Contracts (Inputs & Outputs & Linked Files) */}
                <div className="space-y-4 pt-2 border-t border-border-primary/60">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                      Task Contracts & Files
                    </h3>
                  </div>

                  {/* Input Contracts (Prerequisites) */}
                  <div className="bg-surface-secondary/70 border border-border-primary rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileDown className="w-4 h-4 text-blue-400" />
                        <span className="text-xs font-semibold text-text-primary font-mono">
                          Input Contracts
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-surface-primary border border-border-primary">
                        {editedTask.inputs?.length || 0} prerequisite(s)
                      </span>
                    </div>

                    <p className="text-[11px] text-text-muted leading-tight">
                      Prerequisite file paths, API contracts, or upstream task contracts read before
                      coding.
                    </p>

                    {/* Inputs List */}
                    {editedTask.inputs && editedTask.inputs.length > 0 ? (
                      <div className="space-y-1.5">
                        {editedTask.inputs.map((inputPath, idx) => (
                          <div
                            key={`inp-${idx}`}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-primary border border-border-primary group hover:border-blue-500/40 transition-colors"
                          >
                            <span
                              className="font-mono text-xs text-text-secondary truncate flex-1"
                              title={inputPath}
                            >
                              {inputPath}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopy(inputPath, `input-${idx}`)}
                                className="p-1 text-text-muted hover:text-text-primary rounded transition-colors"
                                title="Copy path"
                              >
                                {copiedKey === `input-${idx}` ? (
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveInput(idx)}
                                className="p-1 text-text-muted hover:text-red-400 rounded transition-colors"
                                title="Remove input"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-text-muted/70 italic p-2 bg-surface-primary/40 rounded border border-border-primary/40 text-center">
                        No input contracts specified (Root task).
                      </div>
                    )}

                    {/* Add Input Form */}
                    <form onSubmit={handleAddInput} className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newInputText}
                        onChange={(e) => setNewInputText(e.target.value)}
                        placeholder="Add input (e.g. src/types/task.ts)..."
                        className="flex-1 bg-surface-primary border border-border-primary text-xs text-text-primary rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 font-mono placeholder:text-text-muted/60"
                      />
                      <button
                        type="submit"
                        disabled={!newInputText.trim()}
                        className="flex items-center gap-1 bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </form>
                  </div>

                  {/* Output Targets (Deliverables) */}
                  <div className="bg-surface-secondary/70 border border-border-primary rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileUp className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-semibold text-text-primary font-mono">
                          Output Targets
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-surface-primary border border-border-primary">
                        {editedTask.outputs?.length || 0} target(s)
                      </span>
                    </div>

                    <p className="text-[11px] text-text-muted leading-tight">
                      Target file paths to be created or modified by this task.
                    </p>

                    {/* Outputs List */}
                    {editedTask.outputs && editedTask.outputs.length > 0 ? (
                      <div className="space-y-1.5">
                        {editedTask.outputs.map((outputPath, idx) => (
                          <div
                            key={`out-${idx}`}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-primary border border-border-primary group hover:border-emerald-500/40 transition-colors"
                          >
                            <span
                              className="font-mono text-xs text-text-secondary truncate flex-1"
                              title={outputPath}
                            >
                              {outputPath}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopy(outputPath, `output-${idx}`)}
                                className="p-1 text-text-muted hover:text-text-primary rounded transition-colors"
                                title="Copy path"
                              >
                                {copiedKey === `output-${idx}` ? (
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveOutput(idx)}
                                className="p-1 text-text-muted hover:text-red-400 rounded transition-colors"
                                title="Remove output"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-text-muted/70 italic p-2 bg-surface-primary/40 rounded border border-border-primary/40 text-center">
                        No output targets specified.
                      </div>
                    )}

                    {/* Add Output Form */}
                    <form onSubmit={handleAddOutput} className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newOutputText}
                        onChange={(e) => setNewOutputText(e.target.value)}
                        placeholder="Add output target (e.g. src/components/New.tsx)..."
                        className="flex-1 bg-surface-primary border border-border-primary text-xs text-text-primary rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-400 font-mono placeholder:text-text-muted/60"
                      />
                      <button
                        type="submit"
                        disabled={!newOutputText.trim()}
                        className="flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </form>
                  </div>

                  {/* Linked Workspace Files */}
                  <div className="bg-surface-secondary/70 border border-border-primary rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileCode2 className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-semibold text-text-primary font-mono">
                          Linked Files
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted px-2 py-0.5 rounded bg-surface-primary border border-border-primary">
                        {editedTask.linkedFiles?.length || 0} file(s)
                      </span>
                    </div>

                    {editedTask.linkedFiles && editedTask.linkedFiles.length > 0 ? (
                      <div className="space-y-1.5">
                        {editedTask.linkedFiles.map((filePath, idx) => (
                          <div
                            key={`lnk-${idx}`}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-primary border border-border-primary group hover:border-purple-500/40 transition-colors"
                          >
                            <span
                              className="font-mono text-xs text-text-secondary truncate flex-1"
                              title={filePath}
                            >
                              {filePath}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopy(filePath, `link-${idx}`)}
                                className="p-1 text-text-muted hover:text-text-primary rounded transition-colors"
                                title="Copy path"
                              >
                                {copiedKey === `link-${idx}` ? (
                                  <Check className="w-3.5 h-3.5 text-green-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveLinkedFile(idx)}
                                className="p-1 text-text-muted hover:text-red-400 rounded transition-colors"
                                title="Remove linked file"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-text-muted/70 italic p-2 bg-surface-primary/40 rounded border border-border-primary/40 text-center">
                        No linked files specified.
                      </div>
                    )}

                    {/* Add Linked File Form */}
                    <form onSubmit={handleAddLinkedFile} className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newLinkedFileText}
                        onChange={(e) => setNewLinkedFileText(e.target.value)}
                        placeholder="Add linked file (e.g. src/utils/helper.ts)..."
                        className="flex-1 bg-surface-primary border border-border-primary text-xs text-text-primary rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-400 font-mono placeholder:text-text-muted/60"
                      />
                      <button
                        type="submit"
                        disabled={!newLinkedFileText.trim()}
                        className="flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Acceptance Criteria Section */}
                <div className="space-y-3 pt-2 border-t border-border-primary/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ListTodo className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                        Acceptance Criteria
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {editedTask.status === 'Need to Test' && (
                        <button
                          type="button"
                          onClick={() => setIsRevisionModalOpen(true)}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Request Revision</span>
                        </button>
                      )}
                      {acceptanceChecklist.length > 0 && (
                        <span
                          className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                            completedCriteriaCount === acceptanceChecklist.length
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-surface-secondary text-text-muted border-border-primary'
                          }`}
                        >
                          {completedCriteriaCount}/{acceptanceChecklist.length} Completed
                        </span>
                      )}
                    </div>
                  </div>

                  {acceptanceChecklist.length > 0 ? (
                    <div className="space-y-1.5">
                      {acceptanceChecklist.map((item, idx) => (
                        <div
                          key={`ac-${idx}`}
                          onClick={() =>
                            handleToggleAcceptanceCriterion(item.text, !item.completed)
                          }
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                            item.completed
                              ? 'bg-emerald-500/5 border-emerald-500/20 text-text-muted'
                              : 'bg-surface-secondary border-border-primary text-text-primary hover:border-white/30'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {item.completed ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Circle className="w-4 h-4 text-text-muted/60 hover:text-white" />
                            )}
                          </div>
                          <span
                            className={`text-xs leading-relaxed flex-1 ${
                              item.completed ? 'line-through opacity-75' : ''
                            }`}
                          >
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-surface-secondary/50 border border-border-primary text-xs text-text-muted/80 italic text-center">
                      No acceptance criteria defined yet.
                    </div>
                  )}

                  {/* Add Acceptance Criterion Input */}
                  <form onSubmit={handleAddCriterion} className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newCriterionText}
                      onChange={(e) => setNewCriterionText(e.target.value)}
                      placeholder="Add acceptance criterion..."
                      className="flex-1 bg-surface-secondary border border-border-primary text-xs text-text-primary rounded-lg px-3 py-1.5 focus:outline-none focus:border-white placeholder:text-text-muted/60"
                    />
                    <button
                      type="submit"
                      disabled={!newCriterionText.trim()}
                      className="flex items-center gap-1 bg-white text-black font-bold text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </form>
                </div>

                {/* Deliverables Section (if present) */}
                {(deliverablesText || (editedTask.outputs && editedTask.outputs.length > 0)) && (
                  <div className="space-y-3 pt-2 border-t border-border-primary/60">
                    <div className="flex items-center gap-2">
                      <ListCheck className="w-4 h-4 text-emerald-400" />
                      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                        Deliverables
                      </h3>
                    </div>

                    {deliverablesText ? (
                      <div className="bg-surface-secondary border border-border-primary rounded-xl p-3 text-xs">
                        <MarkdownViewer content={deliverablesText} />
                      </div>
                    ) : (
                      <div className="bg-surface-secondary/50 border border-border-primary/60 rounded-xl p-3 space-y-1.5 text-xs">
                        <p className="text-[11px] text-text-muted font-mono">
                          Target deliverables from output contracts:
                        </p>
                        {editedTask.outputs?.map((out, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 font-mono text-[11px] text-text-primary"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate">{out}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Revision History Section */}
                <RevisionHistoryViewer task={editedTask} />

                {/* Description Section */}
                <div className="space-y-2 pt-2 border-t border-border-primary/60">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                      Description & Notes
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="bg-surface-secondary p-0.5 rounded-lg border border-border-primary flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingDescription(false)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                            !isEditingDescription
                              ? 'bg-white text-black font-bold shadow'
                              : 'text-text-muted hover:text-white'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingDescription(true)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                            isEditingDescription
                              ? 'bg-white text-black font-bold shadow'
                              : 'text-text-muted hover:text-white'
                          }`}
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                      <button
                        title="Expand Description"
                        className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div
                    className={`bg-surface-secondary border border-border-primary rounded-xl p-3 focus-within:border-white/40 transition-all shadow-inner ${
                      !isEditingDescription && editedTask.description
                        ? 'max-h-[400px] overflow-y-auto scrollbar-thin'
                        : ''
                    }`}
                  >
                    {isEditingDescription ? (
                      <textarea
                        rows={5}
                        value={editedTask.description || ''}
                        onChange={(e) => handleFieldChange('description', e.target.value)}
                        placeholder="Add a detailed description, contracts, or markdown notes..."
                        className="w-full bg-transparent border-none text-xs text-text-primary focus:outline-none resize-none placeholder:text-text-muted/60 leading-relaxed font-mono"
                      />
                    ) : (
                      <div
                        className={
                          !editedTask.description ? 'text-xs text-text-muted/60 italic' : ''
                        }
                      >
                        <MarkdownViewer
                          content={
                            mainDesc ||
                            editedTask.description ||
                            'Add a detailed description, notes, or links...'
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Subtasks Section */}
                <div className="pt-2 border-t border-border-primary/60">
                  <SubtaskList
                    subtasks={editedTask.subtasks || []}
                    onChange={(newSubtasks: SubTask[]) =>
                      handleFieldChange('subtasks', newSubtasks)
                    }
                  />
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}

      {/* Pop-out Full-Screen Review Modal */}
      {editedTask && (
        <ReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          task={editedTask}
          project={projects.find((p) => p.id === editedTask.projectId)}
          onUpdateTask={(updated) => {
            setEditedTask(updated);
            onUpdateTask(updated);
          }}
        />
      )}

      {isDeleteConfirmOpen && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Task"
          description={`Are you sure you want to delete "${editedTask.title}"? This action cannot be undone.`}
          confirmLabel="Delete Task"
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          onConfirm={() => {
            onDeleteTask(editedTask.id);
            setIsDeleteConfirmOpen(false);
            onClose();
          }}
          onClose={() => setIsDeleteConfirmOpen(false)}
        />
      )}

      {isRevisionModalOpen && editedTask && (
        <RequestRevisionModal
          isOpen={isRevisionModalOpen}
          onClose={() => setIsRevisionModalOpen(false)}
          task={editedTask}
          onUpdateTask={(updated) => {
            setEditedTask(updated);
            onUpdateTask(updated);
          }}
        />
      )}

      {isMergeDialogOpen && editedTask && (
        <MergeWorktreeDialog
          isOpen={isMergeDialogOpen}
          onClose={() => setIsMergeDialogOpen(false)}
          task={editedTask}
          project={projects.find((p) => p.id === editedTask.projectId)}
          onMergeSuccess={(updated) => {
            setEditedTask(updated);
            onUpdateTask(updated);
          }}
        />
      )}
    </AnimatePresence>
  );
}
