import { invoke } from '@tauri-apps/api/core';
import { Check, Copy, ExternalLink, GitBranch, Terminal } from 'lucide-react';
import React, { useState } from 'react';
import type { Task } from '../../types';
import Button from '../Button';

export interface WorktreeControlPanelProps {
  task: Task;
  onOpenMergeDialog?: () => void;
}

export const WorktreeControlPanel: React.FC<WorktreeControlPanelProps> = ({
  task,
  onOpenMergeDialog,
}) => {
  const [copied, setCopied] = useState(false);
  const [launchingTerminal, setLaunchingTerminal] = useState(false);
  const [launchingEditor, setLaunchingEditor] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If no worktree information is attached to the task, don't display
  if (!task.workspacePath && task.worktreeStatus !== 'active') {
    return null;
  }

  const branchDisplay =
    task.worktreeBranch || `feat/TASK-${task.id.replace(/^task_/, '').replace(/^TASK-/, '')}`;
  const pathDisplay = task.workspacePath || '';

  const handleCopyPath = async () => {
    if (!task.workspacePath) return;
    try {
      await navigator.clipboard.writeText(task.workspacePath);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy worktree path', e);
    }
  };

  const handleOpenTerminal = async () => {
    if (!task.workspacePath) return;
    setLaunchingTerminal(true);
    setErrorMsg(null);
    try {
      await invoke('launch_sandbox_terminal', { worktreePath: task.workspacePath });
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : 'Failed to launch terminal';
      setErrorMsg(msg);
    } finally {
      setLaunchingTerminal(false);
    }
  };

  const handleOpenEditor = async () => {
    if (!task.workspacePath) return;
    setLaunchingEditor(true);
    setErrorMsg(null);
    try {
      await invoke('launch_sandbox_editor', {
        worktreePath: task.workspacePath,
        editorCmd: null,
      });
    } catch (err: unknown) {
      const msg = typeof err === 'string' ? err : 'Failed to launch editor';
      setErrorMsg(msg);
    } finally {
      setLaunchingEditor(false);
    }
  };

  return (
    <div className="bg-surface-secondary/70 border border-emerald-500/30 rounded-xl p-4 space-y-3 shadow-sm">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base">🌳</span>
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-emerald-400">
            <GitBranch className="w-3.5 h-3.5" />
            <span>{branchDisplay}</span>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          Worktree Sandbox
        </span>
      </div>

      {pathDisplay && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-surface-primary border border-border-primary/60">
          <span
            className="font-mono text-xs text-text-secondary truncate flex-1"
            title={pathDisplay}
          >
            {pathDisplay}
          </span>
          <button
            type="button"
            onClick={handleCopyPath}
            aria-label="Copy Path"
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono rounded bg-surface-secondary border border-border-primary text-text-secondary hover:text-text-primary transition-colors cursor-pointer shrink-0"
            title="Copy worktree path"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-text-muted" />
                <span>Copy Path</span>
              </>
            )}
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded p-2">
          {errorMsg}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleOpenTerminal}
          disabled={launchingTerminal}
          className="flex items-center gap-1.5 text-xs"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400" />
          <span>{launchingTerminal ? 'Opening...' : 'Open Terminal'}</span>
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleOpenEditor}
          disabled={launchingEditor}
          className="flex items-center gap-1.5 text-xs"
        >
          <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
          <span>{launchingEditor ? 'Opening...' : 'Open Editor'}</span>
        </Button>

        {onOpenMergeDialog && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onOpenMergeDialog}
            className="flex items-center gap-1.5 text-xs ml-auto"
          >
            <span>Merge &amp; Prune</span>
          </Button>
        )}
      </div>
    </div>
  );
};

export default WorktreeControlPanel;
