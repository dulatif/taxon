import { invoke } from '@tauri-apps/api/core';
import {
  AlertTriangle,
  CheckCircle,
  FileCode,
  GitBranch,
  GitMerge,
  Terminal,
  Trash2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';
import { saveTask } from '../../services/database';
import type { Project, Task } from '../../types';
import Button from '../Button';

export interface MergeResult {
  success: boolean;
  message?: string;
  conflictFiles: string[];
  baseBranchClean: boolean;
}

export interface MergeWorktreeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  project?: Project;
  onMergeSuccess?: (updatedTask: Task) => void;
}

export type MergeStrategy = 'squash' | 'merge' | 'rebase';

export const MergeWorktreeDialog: React.FC<MergeWorktreeDialogProps> = ({
  isOpen,
  onClose,
  task,
  project,
  onMergeSuccess,
}) => {
  const [strategy, setStrategy] = useState<MergeStrategy>('squash');
  const [deleteWorktree, setDeleteWorktree] = useState(true);
  const [isMerging, setIsMerging] = useState(false);
  const [conflictResult, setConflictResult] = useState<MergeResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const branchName =
    task.worktreeBranch || `feat/TASK-${task.id.replace(/^task_/, '').replace(/^TASK-/, '')}`;

  const getProjectPath = (): string => {
    if (project?.workspacePaths && project.workspacePaths.length > 0) {
      return project.workspacePaths[0];
    }
    if (project?.vaultPath) {
      return project.vaultPath;
    }
    return '';
  };

  const handleMerge = async () => {
    const projectPath = getProjectPath();
    if (!projectPath) {
      setErrorMessage('No repository path found for this project.');
      return;
    }
    if (!task.workspacePath) {
      setErrorMessage('Task has no sandbox workspace path.');
      return;
    }

    setIsMerging(true);
    setErrorMessage(null);
    setConflictResult(null);

    try {
      const res = await invoke<MergeResult>('git_worktree_merge', {
        projectPath,
        worktreePath: task.workspacePath,
        branch: branchName,
        strategy,
        deleteWorktree,
      });

      if (res.success) {
        const updatedTask: Task = {
          ...task,
          status: 'Done',
          completed: true,
          worktreeStatus: 'merged',
          workspacePath: deleteWorktree ? undefined : task.workspacePath,
        };
        await saveTask(updatedTask);
        onMergeSuccess?.(updatedTask);
        onClose();
      } else {
        // Safe Merge Abort was triggered by backend
        setConflictResult(res);
      }
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : 'Merge operation failed';
      setErrorMessage(msg);
    } finally {
      setIsMerging(false);
    }
  };

  const handleOpenTerminalToResolve = async () => {
    if (!task.workspacePath) return;
    try {
      await invoke('launch_sandbox_terminal', { worktreePath: task.workspacePath });
    } catch (err) {
      console.error('Failed to open terminal for conflict resolution:', err);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-surface-secondary border border-border-primary rounded-xl p-6 max-w-lg w-full shadow-2xl z-10 space-y-5"
        >
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b border-border-primary/50">
            <div className="flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
                Merge &amp; Prune Worktree
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Branch & Target info */}
          <div className="bg-surface-primary/60 border border-border-primary/60 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-text-muted">Branch to Merge:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" />
                {branchName}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-text-muted">Target:</span>
              <span className="text-text-primary font-semibold">Active Repository Branch</span>
            </div>
          </div>

          {/* Conflict Display Screen */}
          {conflictResult && !conflictResult.success ? (
            <div className="space-y-4 bg-rose-500/10 border border-rose-500/30 rounded-lg p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono">
                    Merge Conflict Encountered — Safe Abort Executed
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Taxon automatically ran <code className="text-rose-300">git merge --abort</code>
                    . Your base repository branch remains completely clean and untouched. The
                    worktree sandbox was preserved.
                  </p>
                </div>
              </div>

              {conflictResult.conflictFiles.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider block">
                    Conflicting Files ({conflictResult.conflictFiles.length}):
                  </span>
                  <div className="max-h-36 overflow-y-auto space-y-1 bg-surface-primary/80 border border-border-primary/80 rounded p-2">
                    {conflictResult.conflictFiles.map((file, i) => (
                      <div
                        key={`conf-${i}`}
                        className="flex items-center gap-1.5 font-mono text-xs text-rose-300"
                      >
                        <FileCode className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{file}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-between items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleOpenTerminalToResolve}
                  className="flex items-center gap-1.5 text-xs"
                >
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Open in Terminal to Resolve</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                  Dismiss
                </Button>
              </div>
            </div>
          ) : (
            /* Normal Merge Options */
            <div className="space-y-4">
              {/* Strategy Radio Options */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted font-mono">
                  Merge Strategy
                </label>
                <div className="space-y-2">
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      strategy === 'squash'
                        ? 'border-emerald-500/60 bg-emerald-500/5'
                        : 'border-border-primary/60 bg-surface-primary/40 hover:bg-surface-primary/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mergeStrategy"
                      value="squash"
                      checked={strategy === 'squash'}
                      onChange={() => setStrategy('squash')}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-text-primary block">
                        Squash &amp; Merge (Recommended)
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        Combines all task commits into a single clean commit on the target branch.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      strategy === 'merge'
                        ? 'border-emerald-500/60 bg-emerald-500/5'
                        : 'border-border-primary/60 bg-surface-primary/40 hover:bg-surface-primary/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mergeStrategy"
                      value="merge"
                      checked={strategy === 'merge'}
                      onChange={() => setStrategy('merge')}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-text-primary block">
                        Create Merge Commit
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        Retains all individual commit records with an explicit merge commit.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      strategy === 'rebase'
                        ? 'border-emerald-500/60 bg-emerald-500/5'
                        : 'border-border-primary/60 bg-surface-primary/40 hover:bg-surface-primary/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mergeStrategy"
                      value="rebase"
                      checked={strategy === 'rebase'}
                      onChange={() => setStrategy('rebase')}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-semibold text-text-primary block">
                        Rebase &amp; Merge
                      </span>
                      <span className="text-[11px] text-text-muted block">
                        Applies commits individually on top of target branch without a merge commit.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Delete Worktree Checkbox */}
              <div className="pt-2 border-t border-border-primary/40">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-text-secondary select-none">
                  <input
                    type="checkbox"
                    checked={deleteWorktree}
                    onChange={(e) => setDeleteWorktree(e.target.checked)}
                    className="rounded border-border-primary"
                  />
                  <div className="flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-text-muted" />
                    <span>Delete worktree folder and remove branch upon merge</span>
                  </div>
                </label>
              </div>

              {errorMessage && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded p-2.5">
                  {errorMessage}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border-primary/40">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  disabled={isMerging}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleMerge}
                  disabled={isMerging}
                  className="flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>{isMerging ? 'Merging...' : 'Confirm Merge'}</span>
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MergeWorktreeDialog;
