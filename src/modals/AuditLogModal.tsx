import { Bot, Calendar, Download, FileText, History, X } from 'lucide-react';
import { useState } from 'react';
import type { AuditLogEntry } from '../types/agent';

interface AuditLogModalProps {
  isOpen: boolean;
  entries: AuditLogEntry[];
  projectName: string;
  onClose: () => void;
  onExportChangelog: () => Promise<boolean>;
}

export default function AuditLogModal({
  isOpen,
  entries,
  projectName,
  onClose,
  onExportChangelog,
}: AuditLogModalProps) {
  const [isExported, setIsExported] = useState(false);

  if (!isOpen) return null;

  // Group entries by date
  const groupedEntries = new Map<string, AuditLogEntry[]>();
  for (const entry of entries) {
    const date = entry.timestamp.split('T')[0] || 'Unknown Date';
    if (!groupedEntries.has(date)) groupedEntries.set(date, []);
    groupedEntries.get(date)!.push(entry);
  }

  const handleExport = async () => {
    const success = await onExportChangelog();
    if (success) {
      setIsExported(true);
      setTimeout(() => setIsExported(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-surface-secondary border border-border-primary rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-border-primary/50 flex items-center justify-between bg-surface-primary/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                AI Agent Activity Log
              </h3>
              <p className="text-xs text-text-muted font-mono mt-0.5">
                {projectName} • {entries.length} recorded change{entries.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-text-muted font-mono text-xs space-y-2">
              <Bot className="w-8 h-8 mx-auto text-text-muted/40" />
              <p>No external AI activity recorded yet.</p>
            </div>
          ) : (
            [...groupedEntries.entries()].map(([date, dateEntries]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-text-muted uppercase tracking-wider">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{date}</span>
                </div>
                <div className="space-y-2.5 pl-2 border-l-2 border-border-primary/60 ml-1.5">
                  {dateEntries.map((entry) => {
                    const time = entry.timestamp.split('T')[1]?.substring(0, 8) || '';
                    const isCreate = entry.action.includes('created');
                    return (
                      <div
                        key={entry.id}
                        className="bg-surface-primary/60 border border-border-primary/50 rounded-xl p-3.5 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 font-mono">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isCreate
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {entry.action.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-text-primary font-semibold font-sans">
                              {entry.entityTitle}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-text-muted">{time}</span>
                        </div>

                        {entry.changedFields && entry.changedFields.length > 0 && (
                          <div className="text-[11px] text-text-muted font-mono">
                            Changed fields: {entry.changedFields.join(', ')}
                          </div>
                        )}

                        {entry.diffSummary && (
                          <div className="bg-surface-secondary/80 border border-border-primary/40 rounded-lg p-2.5 space-y-1 font-mono text-[11px]">
                            {Object.entries(entry.diffSummary).map(([field, { before, after }]) => (
                              <div key={field} className="flex items-start gap-2">
                                <span className="text-text-muted font-bold min-w-[80px]">
                                  {field}:
                                </span>
                                <span className="text-red-400/80 line-through truncate max-w-[150px]">
                                  {before || '(empty)'}
                                </span>
                                <span className="text-text-muted">→</span>
                                <span className="text-emerald-400 font-semibold truncate max-w-[150px]">
                                  {after || '(empty)'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-primary/50 bg-surface-primary/40 flex items-center justify-between">
          <button
            type="button"
            onClick={handleExport}
            disabled={entries.length === 0}
            className={`px-4 py-2 rounded-xl text-xs font-semibold font-mono flex items-center gap-2 transition-colors cursor-pointer border shadow ${
              isExported
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-surface-secondary border-border-primary text-text-primary hover:bg-surface-hover'
            }`}
          >
            {isExported ? (
              <>
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exported to .taxon/CHANGELOG.md! ✓</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export .taxon/CHANGELOG.md</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-surface-hover text-text-primary hover:bg-surface-hover/80 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-border-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
