import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Code,
  Copy,
  CornerDownLeft,
  FileText,
  History,
  Sparkles,
  User,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import {
  extractAttemptResolutions,
  parseRevisionHistory,
  type RevisionBlock,
} from '../../services/revisionSync';
import type { Task } from '../../types';
import MarkdownViewer from '../MarkdownViewer';

export interface RevisionHistoryViewerProps {
  task: Task;
  defaultExpanded?: boolean;
}

export const RevisionHistoryViewer: React.FC<RevisionHistoryViewerProps> = ({
  task,
  defaultExpanded = true,
}) => {
  const [isSectionOpen, setIsSectionOpen] = useState(defaultExpanded);
  const [expandedAttempts, setExpandedAttempts] = useState<Record<number, boolean>>({});
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const revisionBlocks = useMemo(() => {
    return parseRevisionHistory(task.description || '');
  }, [task.description]);

  const resolutionNotes = useMemo(() => {
    return extractAttemptResolutions(task.description || '');
  }, [task.description]);

  if (revisionBlocks.length === 0 && (!task.revisionCount || task.revisionCount === 0)) {
    return null;
  }

  const toggleAttempt = (attemptNum: number) => {
    setExpandedAttempts((prev) => ({
      ...prev,
      [attemptNum]: prev[attemptNum] === undefined ? false : !prev[attemptNum],
    }));
  };

  const handleCopyLogs = (text: string, idx: number) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 1500);
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t border-border-primary/60">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsSectionOpen(!isSectionOpen)}
          className="flex items-center gap-2 text-xs font-bold text-text-muted uppercase tracking-wider font-mono hover:text-text-primary transition-colors cursor-pointer"
        >
          <History className="w-4 h-4 text-amber-400" />
          <span>Revision History</span>
          {isSectionOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded border bg-amber-500/10 text-amber-400 border-amber-500/30">
          {revisionBlocks.length} Attempt{revisionBlocks.length === 1 ? '' : 's'}
        </span>
      </div>

      {isSectionOpen && (
        <div className="space-y-3">
          {revisionBlocks.length === 0 ? (
            <div className="p-3 rounded-xl bg-surface-secondary/40 border border-border-primary text-xs text-text-muted italic">
              Revision count is {task.revisionCount}, but no structured revision entries were found.
            </div>
          ) : (
            // Render from latest to oldest
            [...revisionBlocks].reverse().map((block: RevisionBlock, idx: number) => {
              const isExpanded = expandedAttempts[block.attemptNumber] !== false; // expanded by default
              const resolution = resolutionNotes.get(block.attemptNumber);

              return (
                <div
                  key={block.attemptNumber}
                  className="bg-surface-secondary border border-border-primary rounded-xl overflow-hidden shadow-sm"
                >
                  {/* Attempt Header Bar */}
                  <div
                    onClick={() => toggleAttempt(block.attemptNumber)}
                    className="flex items-center justify-between p-3 bg-surface-secondary/80 hover:bg-surface-secondary transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        Attempt {block.attemptNumber}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-primary border border-border-primary text-text-muted">
                        {block.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] font-mono text-text-muted">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-text-muted/80" />
                        <span>{block.author}</span>
                      </div>
                      {block.timestamp && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-text-muted/80" />
                          <span>{block.timestamp.slice(0, 10)}</span>
                        </div>
                      )}
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </div>
                  </div>

                  {/* Attempt Content */}
                  {isExpanded && (
                    <div className="p-4 space-y-3.5 border-t border-border-primary/50 text-xs">
                      {/* Failing Criteria */}
                      {block.failingCriteria.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-mono text-amber-400 font-semibold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Failing Criteria:</span>
                          </div>
                          <div className="space-y-1 bg-amber-950/15 border border-amber-500/20 p-2.5 rounded-lg">
                            {block.failingCriteria.map((fc, fcIdx) => (
                              <div
                                key={fcIdx}
                                className="flex items-start gap-2 font-mono text-[11px] text-amber-200"
                              >
                                <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
                                <span className="leading-relaxed">{fc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Observed vs Expected */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted font-semibold">
                            <FileText className="w-3 h-3 text-amber-400" />
                            <span>Observed Behavior:</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-surface-primary/60 border border-border-primary text-text-secondary font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                            {block.observedBehavior}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-mono text-text-muted font-semibold">
                            <CornerDownLeft className="w-3 h-3 text-emerald-400" />
                            <span>Expected Behavior:</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-surface-primary/60 border border-border-primary text-text-secondary font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                            {block.expectedBehavior}
                          </div>
                        </div>
                      </div>

                      {/* Error Trace / Logs */}
                      {block.errorLogs && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono text-text-muted font-semibold">
                            <div className="flex items-center gap-1">
                              <Code className="w-3 h-3 text-blue-400" />
                              <span>Error Trace / Logs:</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyLogs(block.errorLogs!, idx)}
                              className="flex items-center gap-1 text-[10px] text-text-muted hover:text-white transition-colors cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedIndex === idx ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                          <div className="p-3 bg-[#050505] border border-border-primary/80 rounded-lg max-h-48 overflow-y-auto font-mono text-[11px] text-blue-300 scrollbar-thin">
                            <pre className="whitespace-pre-wrap leading-relaxed">
                              {block.errorLogs}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Remediation Guidance */}
                      {block.remediationGuidance && (
                        <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/30 text-blue-200 space-y-1">
                          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-blue-300">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Remediation Guidance:</span>
                          </div>
                          <p className="font-mono text-[11px] leading-relaxed pl-5">
                            {block.remediationGuidance}
                          </p>
                        </div>
                      )}

                      {/* Agent Resolution Note (if recorded in deliverables) */}
                      {resolution && (
                        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/40 text-emerald-200 space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-300">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Attempt {block.attemptNumber} Resolution:</span>
                          </div>
                          <div className="font-mono text-[11px] leading-relaxed pl-5 text-text-primary">
                            <MarkdownViewer content={resolution} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
