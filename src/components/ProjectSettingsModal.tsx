import { FolderGit2, Info, Settings, Terminal, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';
import { saveProject } from '../services/database';
import type { Project } from '../types';
import Button from './Button';

export interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSave?: (updatedProject: Project) => void;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
}) => {
  const [worktreeEnabled, setWorktreeEnabled] = useState(project.worktreeEnabled ?? false);
  const [worktreeDir, setWorktreeDir] = useState(project.worktreeDir || '.worktrees');
  const [worktreeSetupCommand, setWorktreeSetupCommand] = useState(
    project.worktreeSetupCommand || '',
  );
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated: Project = {
        ...project,
        worktreeEnabled,
        worktreeDir: worktreeDir.trim() || '.worktrees',
        worktreeSetupCommand: worktreeSetupCommand.trim() || undefined,
      };
      await saveProject(updated);
      onSave?.(updated);
      onClose();
    } catch (err) {
      console.error('Failed to save project settings:', err);
    } finally {
      setIsSaving(false);
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
          className="relative bg-surface-secondary border border-border-primary rounded-xl p-6 max-w-lg w-full shadow-2xl z-10 space-y-6"
        >
          {/* Header */}
          <div className="flex justify-between items-center pb-3 border-b border-border-primary/50">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-interactive-primary" />
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
                Project Settings — {project.name}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Worktree Sandboxing Section */}
            <div className="space-y-4 bg-surface-primary/40 border border-border-primary/60 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-text-primary">
                      Git Worktree Sandboxing
                    </span>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Automatically isolate tasks into dedicated Git worktrees when moved to In
                    Progress. Eliminates multi-agent branch checkout collisions and working-tree
                    pollution.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                  <input
                    type="checkbox"
                    checked={worktreeEnabled}
                    onChange={(e) => setWorktreeEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-surface-secondary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {worktreeEnabled && (
                <div className="space-y-3 pt-2 border-t border-border-primary/40">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted font-mono mb-1">
                      Worktree Root Directory
                    </label>
                    <input
                      type="text"
                      value={worktreeDir}
                      onChange={(e) => setWorktreeDir(e.target.value)}
                      placeholder=".worktrees"
                      className="bg-surface-primary border border-border-primary text-xs text-text-primary rounded px-3 py-2 w-full focus:outline-none focus:border-white font-mono"
                    />
                    <p className="text-[10px] text-text-muted mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3 shrink-0" />
                      Relative to project root. An auto-generated .gitignore with &quot;*&quot;
                      protects this folder.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-text-muted font-mono mb-1">
                      Setup Command (Optional)
                    </label>
                    <div className="relative">
                      <Terminal className="w-3.5 h-3.5 text-text-muted absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={worktreeSetupCommand}
                        onChange={(e) => setWorktreeSetupCommand(e.target.value)}
                        placeholder="e.g. pnpm install or cargo build"
                        className="bg-surface-primary border border-border-primary text-xs text-text-primary rounded pl-8 pr-3 py-2 w-full focus:outline-none focus:border-white font-mono"
                      />
                    </div>
                    <p className="text-[10px] text-text-muted mt-1">
                      Runs once inside the new worktree upon creation (heavy node_modules &amp;
                      .venv are symlinked automatically).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ProjectSettingsModal;
