/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlertTriangle, ChevronDown, ChevronRight, FileDiff, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { AgentDiffResult } from '../types/agent';

interface AgentImportModalProps {
  isOpen: boolean;
  diff: AgentDiffResult | null;
  isImporting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AgentImportModal({
  isOpen,
  diff,
  isImporting,
  onConfirm,
  onCancel,
}: AgentImportModalProps) {
  useEscapeKey(onCancel, { enabled: isOpen && !isImporting });

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    newTasks: true,
    newSprints: true,
    modTasks: true,
    modSprints: true,
    warnings: true,
  });

  if (!isOpen || !diff) return null;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const totalChanges =
    diff.newTasks.length +
    diff.modifiedTasks.length +
    diff.newSprints.length +
    diff.modifiedSprints.length;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface-primary border border-border-primary rounded-xl w-full max-w-2xl p-6 relative shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          <div className="flex items-center gap-3 mb-4 shrink-0">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 text-emerald-400">
              <FileDiff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary tracking-wide uppercase font-mono">
                Import Agent Changes
              </h3>
              <p className="text-xs text-text-muted">
                Review and apply changes made by the AI agent
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[100px] pr-2 space-y-4">
            {totalChanges === 0 && diff.warnings.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <p className="text-sm font-mono text-text-muted">No changes detected.</p>
                <p className="text-xs text-text-muted">
                  The agent files match your current database.
                </p>
              </div>
            ) : (
              <>
                {/* Warnings */}
                {diff.warnings.length > 0 && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('warnings')}
                      className="w-full flex items-center gap-2 p-3 text-amber-400 hover:bg-amber-500/5 transition-colors cursor-pointer text-left"
                    >
                      {expandedSections.warnings ? (
                        <ChevronDown className="w-4 h-4 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      )}
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span className="text-xs font-bold uppercase font-mono tracking-wider">
                        Warnings ({diff.warnings.length})
                      </span>
                    </button>
                    {expandedSections.warnings && (
                      <div className="px-4 pb-3 space-y-2">
                        {diff.warnings.map((warning, idx) => (
                          <div key={idx} className="text-xs text-amber-400/80 font-mono pl-6">
                            ⚠ {warning}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* New Tasks */}
                {diff.newTasks.length > 0 && (
                  <div className="border border-border-primary rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('newTasks')}
                      className="w-full flex items-center gap-2 p-3 text-text-primary hover:bg-surface-hover transition-colors cursor-pointer text-left border-b border-border-primary/50"
                    >
                      {expandedSections.newTasks ? (
                        <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                      )}
                      <span className="text-xs font-bold uppercase font-mono tracking-wider">
                        New Tasks ({diff.newTasks.length})
                      </span>
                    </button>
                    {expandedSections.newTasks && (
                      <div className="divide-y divide-border-primary/50">
                        {diff.newTasks.map((t) => (
                          <div
                            key={t.id}
                            className="p-3 pl-10 text-xs flex items-center justify-between hover:bg-surface-hover transition-colors"
                          >
                            <span className="text-text-primary font-medium truncate pr-4">
                              {t.title}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-border-primary text-text-muted">
                                {t.priority}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                {t.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Modified Tasks */}
                {diff.modifiedTasks.length > 0 && (
                  <div className="border border-border-primary rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('modTasks')}
                      className="w-full flex items-center gap-2 p-3 text-text-primary hover:bg-surface-hover transition-colors cursor-pointer text-left border-b border-border-primary/50"
                    >
                      {expandedSections.modTasks ? (
                        <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                      )}
                      <span className="text-xs font-bold uppercase font-mono tracking-wider">
                        Modified Tasks ({diff.modifiedTasks.length})
                      </span>
                    </button>
                    {expandedSections.modTasks && (
                      <div className="divide-y divide-border-primary/50">
                        {diff.modifiedTasks.map((mod) => (
                          <div
                            key={mod.after.id}
                            className="p-3 pl-10 hover:bg-surface-hover transition-colors"
                          >
                            <span className="text-xs text-text-primary font-medium block mb-1.5">
                              {mod.after.title}
                            </span>
                            <div className="space-y-1 pl-2 border-l border-border-primary">
                              {mod.changedFields.map((field) => (
                                <div
                                  key={field}
                                  className="text-[11px] font-mono text-text-muted flex items-center gap-1.5"
                                >
                                  <span className="text-text-primary/60 w-24 shrink-0">
                                    {field}:
                                  </span>
                                  {field === 'description' ? (
                                    <span className="text-amber-400 italic">(content updated)</span>
                                  ) : (
                                    <div className="flex items-center gap-2 overflow-hidden">
                                      <span className="text-red-400/80 line-through truncate max-w-[150px]">
                                        {String((mod.before as any)[field] ?? 'none')}
                                      </span>
                                      <span className="text-text-muted">→</span>
                                      <span className="text-emerald-400 truncate max-w-[150px]">
                                        {String((mod.after as any)[field] ?? 'none')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* New Sprints */}
                {diff.newSprints.length > 0 && (
                  <div className="border border-border-primary rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('newSprints')}
                      className="w-full flex items-center gap-2 p-3 text-text-primary hover:bg-surface-hover transition-colors cursor-pointer text-left border-b border-border-primary/50"
                    >
                      {expandedSections.newSprints ? (
                        <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                      )}
                      <span className="text-xs font-bold uppercase font-mono tracking-wider">
                        New Sprints ({diff.newSprints.length})
                      </span>
                    </button>
                    {expandedSections.newSprints && (
                      <div className="divide-y divide-border-primary/50">
                        {diff.newSprints.map((s) => (
                          <div
                            key={s.id}
                            className="p-3 pl-10 text-xs flex items-center justify-between hover:bg-surface-hover transition-colors"
                          >
                            <span className="text-text-primary font-medium truncate pr-4">
                              {s.name}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-mono text-text-muted">
                                {s.startDate} - {s.endDate}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-mono border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                {s.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Modified Sprints */}
                {diff.modifiedSprints.length > 0 && (
                  <div className="border border-border-primary rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleSection('modSprints')}
                      className="w-full flex items-center gap-2 p-3 text-text-primary hover:bg-surface-hover transition-colors cursor-pointer text-left border-b border-border-primary/50"
                    >
                      {expandedSections.modSprints ? (
                        <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                      )}
                      <span className="text-xs font-bold uppercase font-mono tracking-wider">
                        Modified Sprints ({diff.modifiedSprints.length})
                      </span>
                    </button>
                    {expandedSections.modSprints && (
                      <div className="divide-y divide-border-primary/50">
                        {diff.modifiedSprints.map((mod) => (
                          <div
                            key={mod.after.id}
                            className="p-3 pl-10 hover:bg-surface-hover transition-colors"
                          >
                            <span className="text-xs text-text-primary font-medium block mb-1.5">
                              {mod.after.name}
                            </span>
                            <div className="space-y-1 pl-2 border-l border-border-primary">
                              {mod.changedFields.map((field) => (
                                <div
                                  key={field}
                                  className="text-[11px] font-mono text-text-muted flex items-center gap-1.5"
                                >
                                  <span className="text-text-primary/60 w-24 shrink-0">
                                    {field}:
                                  </span>
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-red-400/80 line-through truncate max-w-[150px]">
                                      {String((mod.before as any)[field] ?? 'none')}
                                    </span>
                                    <span className="text-text-muted">→</span>
                                    <span className="text-emerald-400 truncate max-w-[150px]">
                                      {String((mod.after as any)[field] ?? 'none')}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-border-primary shrink-0">
            <button
              onClick={onCancel}
              disabled={isImporting}
              className="text-xs font-semibold text-text-muted hover:text-text-primary px-4 py-2 cursor-pointer transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isImporting || totalChanges === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-secondary disabled:text-text-muted text-text-primary font-bold text-xs px-5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:shadow-none"
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDiff className="w-4 h-4" />
              )}
              Import {totalChanges} {totalChanges === 1 ? 'Change' : 'Changes'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
