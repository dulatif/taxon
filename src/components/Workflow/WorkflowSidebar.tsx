import {
  Box,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  ExternalLink,
  FileCode,
  FileText,
  FolderGit2,
  Layers,
  ListCheck,
  ListTodo,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { Task } from '../../types';
import MarkdownViewer from '../MarkdownViewer';
import { buildTaskIdLookup } from './workflowLayout';

export interface WorkflowSidebarProps {
  task: Task | null;
  allTasks?: Task[];
  isOpen: boolean;
  onClose: () => void;
  onSelectTask?: (task: Task) => void;
  onEditFullTask?: (task: Task) => void;
}

const STATUS_BADGES: Record<
  Task['status'],
  { label: string; bg: string; text: string; border: string; icon: React.ReactNode }
> = {
  'To Do': {
    label: 'To Do',
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border-zinc-500/20',
    icon: <Circle className="w-3 h-3 text-zinc-400" />,
  },
  'In Progress': {
    label: 'In Progress',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    icon: <Clock className="w-3 h-3 text-blue-400" />,
  },
  'Need to Test': {
    label: 'Need to Test',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    icon: <Sparkles className="w-3 h-3 text-purple-400" />,
  },
  Done: {
    label: 'Done',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />,
  },
};

const PRIORITY_BADGES: Record<
  Task['priority'],
  { label: string; bg: string; text: string; border: string }
> = {
  Critical: {
    label: 'Critical',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
  },
  High: {
    label: 'High',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
  },
  Medium: {
    label: 'Medium',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/20',
  },
  Low: {
    label: 'Low',
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-400',
    border: 'border-zinc-500/20',
  },
};

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

export const WorkflowSidebar: React.FC<WorkflowSidebarProps> = memo(
  ({ task, allTasks = [], isOpen, onClose, onSelectTask, onEditFullTask }) => {
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // ESC key listener to dismiss sidebar
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleCopy = useCallback((text: string, key: string) => {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    }, []);

    // Build task lookup for dependencies
    const taskIdMap = useMemo(() => {
      const map = new Map<string, Task>();
      const lookup = buildTaskIdLookup(allTasks);

      for (const t of allTasks) {
        map.set(t.id, t);
      }

      return { map, lookup };
    }, [allTasks]);

    // Resolved dependency items
    const dependencies = useMemo(() => {
      if (!task || !task.dependsOn || !Array.isArray(task.dependsOn)) return [];

      return task.dependsOn.map((depId) => {
        const resolvedId = taskIdMap.lookup.get(depId) || depId;
        const depTask = taskIdMap.map.get(resolvedId);
        const isDone =
          depTask?.completed || depTask?.status === 'Done' || depTask?.status === 'Need to Test';

        return {
          rawId: depId,
          resolvedId,
          task: depTask,
          isDone,
          isBlocked: depTask ? !isDone : false,
        };
      });
    }, [task, taskIdMap]);

    const unresolvedBlockersCount = useMemo(() => {
      return dependencies.filter((d) => d.isBlocked).length;
    }, [dependencies]);

    // Extracted sections from description
    const mainDesc = useMemo(() => extractMainDescription(task?.description), [task?.description]);
    const deliverablesText = useMemo(
      () => extractSection(task?.description, 'Deliverables'),
      [task?.description],
    );
    const acceptanceCriteriaText = useMemo(
      () => extractSection(task?.description, 'Acceptance Criteria'),
      [task?.description],
    );
    const acceptanceChecklist = useMemo(
      () => parseChecklistItems(acceptanceCriteriaText || undefined),
      [acceptanceCriteriaText],
    );

    if (!isOpen || !task) return null;

    const shortId = (task.id || '').slice(-6);
    const statusMeta = STATUS_BADGES[task.status] || STATUS_BADGES['To Do'];
    const priorityMeta = PRIORITY_BADGES[task.priority] || PRIORITY_BADGES['Medium'];

    return (
      <AnimatePresence>
        <div className="absolute inset-0 z-30 pointer-events-none flex justify-end overflow-hidden">
          {/* Subtle backdrop overlay inside Workflow container */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto"
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="relative w-full max-w-[480px] h-full bg-surface-elevated border-l border-border-primary shadow-2xl flex flex-col pointer-events-auto z-40 text-text-primary overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-border-primary/80 bg-surface-elevated/95 backdrop-blur-xs shrink-0">
              <div className="min-w-0 flex-1 pr-3">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  {/* Task ID chip with copy action */}
                  <button
                    type="button"
                    onClick={() => handleCopy(task.id, 'taskId')}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-surface-primary border border-border-primary/80 text-[11px] font-mono font-medium text-text-muted hover:text-text-primary hover:border-interactive-primary/50 transition cursor-pointer"
                    title={`Click to copy Task ID (${task.id})`}
                  >
                    <span>TASK-{shortId}</span>
                    {copiedKey === 'taskId' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 opacity-60" />
                    )}
                  </button>

                  {/* Module Group badge */}
                  {task.moduleGroup && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium">
                      <FolderGit2 className="w-3 h-3" />
                      <span>{task.moduleGroup}</span>
                    </span>
                  )}
                </div>

                <h2 className="text-base font-bold text-text-primary leading-snug tracking-tight">
                  {task.title}
                </h2>
              </div>

              {/* Action buttons (Full Edit & Close) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {onEditFullTask && (
                  <button
                    type="button"
                    onClick={() => onEditFullTask(task)}
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                    title="Open Full Task Editor"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                  title="Close Sidebar (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 scrollbar-thin">
              {/* Status & Priority Row */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-surface-primary/70 border border-border-primary/60">
                <div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted block mb-1">
                    Status
                  </span>
                  <div
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                  >
                    {statusMeta.icon}
                    <span>{statusMeta.label}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-text-muted block mb-1">
                    Priority
                  </span>
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium ${priorityMeta.bg} ${priorityMeta.text} ${priorityMeta.border}`}
                  >
                    <span>{priorityMeta.label}</span>
                  </div>
                </div>
              </div>

              {/* Blockers & Prerequisites Section (dependsOn) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    <span>Prerequisites & Blockers</span>
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    {dependencies.length} {dependencies.length === 1 ? 'task' : 'tasks'}
                  </span>
                </div>

                {/* Blocker status alert banner */}
                {dependencies.length > 0 ? (
                  <div className="space-y-2">
                    {unresolvedBlockersCount > 0 ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                        <span>
                          Blocked by {unresolvedBlockersCount} incomplete prerequisite
                          {unresolvedBlockersCount > 1 ? 's' : ''}.
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                        <span>All prerequisite contracts satisfied. Ready for execution.</span>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {dependencies.map((dep, idx) => (
                        <div
                          key={dep.rawId || idx}
                          onClick={() => dep.task && onSelectTask?.(dep.task)}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition ${
                            dep.task
                              ? 'bg-surface-primary hover:bg-surface-hover hover:border-interactive-primary/40 cursor-pointer'
                              : 'bg-surface-primary/50 border-border-primary/40'
                          }`}
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono text-text-muted">
                                {(dep.resolvedId || dep.rawId).slice(-6)}
                              </span>
                              <span
                                className={`text-xs font-medium truncate ${
                                  dep.isDone ? 'text-text-muted line-through' : 'text-text-primary'
                                }`}
                              >
                                {dep.task ? dep.task.title : dep.rawId}
                              </span>
                            </div>
                          </div>

                          {dep.task ? (
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${
                                STATUS_BADGES[dep.task.status]?.bg || 'bg-zinc-500/10'
                              } ${STATUS_BADGES[dep.task.status]?.text || 'text-zinc-400'} ${
                                STATUS_BADGES[dep.task.status]?.border || 'border-zinc-500/20'
                              }`}
                            >
                              {dep.task.status}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-text-muted/60 shrink-0">
                              External ID
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-surface-primary/50 border border-border-primary/40 text-xs text-text-muted flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>No prerequisite blockers. Task can start immediately.</span>
                  </div>
                )}
              </div>

              {/* Input Contracts Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                    <FileText className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Input Contracts (`inputs`)</span>
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    {task.inputs?.length || 0} {task.inputs?.length === 1 ? 'file' : 'files'}
                  </span>
                </div>

                {task.inputs && task.inputs.length > 0 ? (
                  <div className="space-y-1.5">
                    {task.inputs.map((filePath, idx) => (
                      <div
                        key={`input-${idx}`}
                        className="group flex items-center justify-between p-2 rounded-lg bg-surface-primary border border-border-primary hover:border-cyan-500/40 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                          <FileCode className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          <span
                            className="text-xs font-mono text-text-primary truncate select-all"
                            title={filePath}
                          >
                            {filePath}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(filePath, `input-${idx}`)}
                          className="p-1 text-text-muted hover:text-cyan-400 rounded transition cursor-pointer"
                          title="Copy file path"
                        >
                          {copiedKey === `input-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-surface-primary/40 border border-border-primary/40 text-xs text-text-muted italic">
                    No input contract paths specified.
                  </div>
                )}
              </div>

              {/* Output Targets Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                    <Box className="w-3.5 h-3.5 text-purple-400" />
                    <span>Output Targets (`outputs`)</span>
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">
                    {task.outputs?.length || 0} {task.outputs?.length === 1 ? 'file' : 'files'}
                  </span>
                </div>

                {task.outputs && task.outputs.length > 0 ? (
                  <div className="space-y-1.5">
                    {task.outputs.map((filePath, idx) => (
                      <div
                        key={`output-${idx}`}
                        className="group flex items-center justify-between p-2 rounded-lg bg-surface-primary border border-border-primary hover:border-purple-500/40 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                          <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span
                            className="text-xs font-mono text-text-primary truncate select-all"
                            title={filePath}
                          >
                            {filePath}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(filePath, `output-${idx}`)}
                          className="p-1 text-text-muted hover:text-purple-400 rounded transition cursor-pointer"
                          title="Copy file path"
                        >
                          {copiedKey === `output-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-surface-primary/40 border border-border-primary/40 text-xs text-text-muted italic">
                    No output target paths specified.
                  </div>
                )}
              </div>

              {/* Deliverables Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                    <ListCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Deliverables</span>
                  </div>
                </div>

                {deliverablesText ? (
                  <div className="p-3 rounded-xl bg-surface-primary border border-border-primary text-xs">
                    <MarkdownViewer content={deliverablesText} />
                  </div>
                ) : task.outputs && task.outputs.length > 0 ? (
                  <div className="p-3 rounded-xl bg-surface-primary/50 border border-border-primary/50 text-xs space-y-1">
                    <p className="text-text-muted text-[11px] mb-2">
                      Target deliverables from output contracts:
                    </p>
                    {task.outputs.map((out, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1.5 text-text-primary font-mono text-[11px]"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate">{out}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-surface-primary/40 border border-border-primary/40 text-xs text-text-muted italic">
                    No deliverables recorded yet.
                  </div>
                )}
              </div>

              {/* Acceptance Criteria Section */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                    <ListTodo className="w-3.5 h-3.5 text-primary" />
                    <span>Acceptance Criteria</span>
                  </div>
                </div>

                {acceptanceChecklist.length > 0 ? (
                  <div className="space-y-1.5">
                    {acceptanceChecklist.map((item, idx) => (
                      <div
                        key={`ac-${idx}`}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                          item.completed
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-text-muted'
                            : 'bg-surface-primary border-border-primary text-text-primary'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {item.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-text-muted/60" />
                          )}
                        </div>
                        <span
                          className={`text-xs leading-relaxed ${
                            item.completed ? 'line-through opacity-75' : ''
                          }`}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : acceptanceCriteriaText ? (
                  <div className="p-3 rounded-xl bg-surface-primary border border-border-primary text-xs">
                    <MarkdownViewer content={acceptanceCriteriaText} />
                  </div>
                ) : task.subtasks && task.subtasks.length > 0 ? (
                  <div className="space-y-1.5">
                    {task.subtasks.map((st) => (
                      <div
                        key={st.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                          st.completed
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-text-muted'
                            : 'bg-surface-primary border-border-primary text-text-primary'
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {st.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-text-muted/60" />
                          )}
                        </div>
                        <span
                          className={`text-xs leading-relaxed ${
                            st.completed ? 'line-through opacity-75' : ''
                          }`}
                        >
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-surface-primary/40 border border-border-primary/40 text-xs text-text-muted italic">
                    No acceptance criteria checklist specified.
                  </div>
                )}
              </div>

              {/* Description Body */}
              {mainDesc && (
                <div className="space-y-2.5">
                  <div className="text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                    Description & Context
                  </div>
                  <div className="p-3.5 rounded-xl bg-surface-primary border border-border-primary text-xs text-text-primary leading-relaxed">
                    <MarkdownViewer content={mainDesc} />
                  </div>
                </div>
              )}

              {/* Linked Files Section */}
              {task.linkedFiles && task.linkedFiles.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                      Linked Workspace Files
                    </div>
                    <span className="text-[11px] font-mono text-text-muted">
                      {task.linkedFiles.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {task.linkedFiles.map((file, idx) => (
                      <div
                        key={`link-${idx}`}
                        className="flex items-center justify-between p-2 rounded-lg bg-surface-primary border border-border-primary"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                          <FileText className="w-3.5 h-3.5 text-text-muted shrink-0" />
                          <span className="text-xs font-mono text-text-primary truncate">
                            {file}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(file, `link-${idx}`)}
                          className="p-1 text-text-muted hover:text-text-primary rounded transition cursor-pointer"
                          title="Copy file path"
                        >
                          {copiedKey === `link-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 opacity-60" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Bar */}
            <div className="p-4 border-t border-border-primary bg-surface-elevated flex items-center justify-between shrink-0">
              <span className="text-[11px] font-mono text-text-muted">
                Press{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-surface-primary border border-border-primary text-[10px] text-text-primary">
                  Esc
                </kbd>{' '}
                to close
              </span>

              {onEditFullTask && (
                <button
                  type="button"
                  onClick={() => onEditFullTask(task)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-interactive-primary text-interactive-primary-text text-xs font-bold hover:bg-interactive-primary/90 transition shadow-sm cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Editor</span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  },
);

WorkflowSidebar.displayName = 'WorkflowSidebar';
