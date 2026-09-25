import {
  AlertTriangle,
  Bot,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  DownloadCloud,
  FolderOpen,
  GitCommit,
  History,
  Loader2,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useState } from 'react';
import VaultFileTree from '../../components/VaultFileTree';
import type { Project, VaultEntry } from '../../types';
import type { AgentSyncState } from '../../types/agent';

interface AgentSyncPanelProps {
  project: Project;
  syncState: AgentSyncState | null;
  agentEntries: VaultEntry[];
  isExporting: boolean;
  isScanning: boolean;
  hasVaultPath: boolean;
  auditSummary?: { count: number; lastTimestamp: string | null };
  onExport: () => void;
  onImport: () => void;
  onCleanUpArchived?: () => Promise<{ movedCount: number; errors: string[] }>;
  onCopyContextSnapshot?: (
    selectedSprintId?: string,
  ) => Promise<{ success: boolean; activeCount: number }>;
  selectedSprintId?: string;
  onOpenAuditLog?: () => void;
  onInstallGitHook?: () => Promise<{ success: boolean; message: string }>;
  onSetVaultDirectory: () => void;
  onSelectFile: (entry: VaultEntry) => void;
  onRefreshEntries: () => void;
  error?: string | null;
  onDismissError?: () => void;
  isLiveSyncEnabled: boolean;
  onToggleLiveSync: (enabled: boolean) => void;
}

export default function AgentSyncPanel({
  project,
  syncState,
  agentEntries,
  isExporting,
  isScanning,
  hasVaultPath,
  auditSummary,
  onExport,
  onImport,
  onCleanUpArchived,
  onCopyContextSnapshot,
  selectedSprintId,
  onOpenAuditLog,
  onInstallGitHook,
  onSetVaultDirectory,
  onSelectFile,
  onRefreshEntries,
  error,
  onDismissError,
  isLiveSyncEnabled,
  onToggleLiveSync,
}: AgentSyncPanelProps) {
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isInstallingHook, setIsInstallingHook] = useState(false);
  const [hookMessage, setHookMessage] = useState<string | null>(null);
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);
  const [isErrorExpanded, setIsErrorExpanded] = useState(false);

  // Time formatting helper
  const getRelativeTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const diff = Math.floor((new Date().getTime() - date.getTime()) / 60000); // in minutes
    if (diff < 1) return 'just now';
    if (diff < 60) return `${diff} min ago`;
    const hours = Math.floor(diff / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const handleCleanUp = async () => {
    if (!onCleanUpArchived) return;
    setIsCleaningUp(true);
    setCleanupMessage(null);
    try {
      const res = await onCleanUpArchived();
      if (res.movedCount > 0) {
        setCleanupMessage(
          `Moved ${res.movedCount} archived file${res.movedCount > 1 ? 's' : ''} to .taxon/archive/`,
        );
      } else {
        setCleanupMessage('No archived files found to clean up.');
      }
    } catch {
      setCleanupMessage('Failed to clean up archived files.');
    } finally {
      setIsCleaningUp(false);
      setTimeout(() => setCleanupMessage(null), 4000);
    }
  };

  const handleCopySnapshot = async () => {
    if (!onCopyContextSnapshot) return;
    const res = await onCopyContextSnapshot(selectedSprintId);
    if (res.success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleInstallGitHook = async () => {
    if (!onInstallGitHook) return;
    setIsInstallingHook(true);
    setHookMessage(null);
    try {
      const res = await onInstallGitHook();
      setHookMessage(res.message);
    } catch {
      setHookMessage('Failed to install git hook.');
    } finally {
      setIsInstallingHook(false);
      setTimeout(() => setHookMessage(null), 4000);
    }
  };

  return (
    <div className="bg-surface-secondary border border-border-primary rounded-xl p-6">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-primary/50">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-400" />
          AI Agent Sync
        </h3>

        {hasVaultPath && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
              Live Sync
            </span>
            <button
              type="button"
              onClick={() => onToggleLiveSync(!isLiveSyncEnabled)}
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors cursor-pointer ${
                isLiveSyncEnabled
                  ? 'bg-emerald-500'
                  : 'bg-surface-elevated border border-border-primary'
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                  isLiveSyncEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg mb-4 text-xs font-mono overflow-hidden">
          <div className="flex items-start justify-between p-3 gap-2">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <span className="font-bold block text-red-300">Sync Error</span>
                <span className="text-red-400/90 break-words leading-relaxed">
                  {error.length > 90 && !isErrorExpanded ? `${error.slice(0, 90)}...` : error}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {error.length > 90 && (
                <button
                  type="button"
                  onClick={() => setIsErrorExpanded(!isErrorExpanded)}
                  className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                  title={isErrorExpanded ? 'Hide details' : 'Show details'}
                  aria-label={isErrorExpanded ? 'Hide details' : 'Show details'}
                >
                  {isErrorExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsErrorExpanded(false);
                  onDismissError?.();
                }}
                className="p-1 hover:bg-red-500/20 rounded text-red-400 hover:text-red-200 transition-colors cursor-pointer"
                title="Dismiss error"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {isErrorExpanded && error.length > 90 && (
            <div className="px-3 pb-3 pt-1 border-t border-red-500/20 bg-black/20">
              <pre className="text-[11px] font-mono whitespace-pre-wrap break-all max-h-40 overflow-y-auto text-red-300/90">
                {error}
              </pre>
            </div>
          )}
        </div>
      )}

      {cleanupMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg mb-4 text-xs font-mono">
          {cleanupMessage}
        </div>
      )}

      {!hasVaultPath ? (
        <div className="bg-surface-primary border border-dashed border-border-primary hover:border-white/40 rounded-xl p-5 text-center space-y-3 transition-colors mb-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-text-primary font-mono uppercase tracking-wider">
              No Vault Set
            </h4>
            <p className="text-[11px] text-text-muted mt-1 leading-relaxed max-w-xs mx-auto">
              Set a vault directory to enable AI agent sync.
            </p>
          </div>
          <button
            type="button"
            onClick={onSetVaultDirectory}
            className="bg-interactive-primary text-interactive-primary-text hover:bg-interactive-primary/90 font-bold text-xs px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Set Vault Directory</span>
          </button>
        </div>
      ) : !syncState?.lastExportedAt ? (
        <div className="bg-surface-primary border border-dashed border-border-primary hover:border-white/40 rounded-xl p-5 text-center space-y-3 transition-colors mb-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-text-primary font-mono uppercase tracking-wider">
              Not Exported Yet
            </h4>
            <p className="text-[11px] text-text-muted mt-1 leading-relaxed max-w-xs mx-auto">
              Export your tasks to start syncing with AI agents.
            </p>
          </div>
          <button
            type="button"
            onClick={onExport}
            disabled={isExporting}
            className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 font-bold text-xs px-4 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UploadCloud className="w-3.5 h-3.5" />
            )}
            <span>Export to Agent</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-surface-primary rounded-lg border border-border-primary/50 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
                  Status
                </span>
                <span className="text-xs font-semibold text-text-primary">
                  {syncState.exportedTaskCount} tasks • {syncState.exportedSprintCount} sprints
                </span>
              </div>
              <div className="text-right flex flex-col">
                <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
                  Last Exported
                </span>
                <span className="text-xs text-text-primary">
                  {getRelativeTime(syncState.lastExportedAt)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onExport}
                disabled={isExporting || isScanning}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-interactive-primary text-interactive-primary-text hover:bg-interactive-primary/90 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <UploadCloud className="w-3.5 h-3.5" />
                )}
                Export
              </button>
              <button
                type="button"
                onClick={onImport}
                disabled={isExporting || isScanning}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-transparent border border-border-primary text-text-primary hover:bg-surface-hover text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isScanning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <DownloadCloud className="w-3.5 h-3.5" />
                )}
                Import
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopySnapshot}
              className={`w-full flex items-center justify-center gap-1.5 py-2 px-3 border text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                isCopied
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-surface-secondary border-border-primary text-text-primary hover:bg-surface-hover'
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied! ✓</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-3.5 h-3.5 text-sky-400" />
                  <span>Copy Sprint Context</span>
                </>
              )}
            </button>
          </div>

          {auditSummary && auditSummary.count > 0 && (
            <div className="bg-surface-primary rounded-lg border border-border-primary/50 p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-text-primary">
                <History className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  {auditSummary.count} AI change{auditSummary.count > 1 ? 's' : ''} (24h)
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenAuditLog}
                className="text-emerald-400 hover:underline text-xs font-mono font-semibold cursor-pointer"
              >
                View Log →
              </button>
            </div>
          )}
        </div>
      )}

      {hasVaultPath && (
        <div className="mt-4 pt-4 border-t border-border-primary/50 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <button
                type="button"
                onClick={() => setIsTreeExpanded(!isTreeExpanded)}
                className="flex items-center gap-1.5 text-text-primary hover:text-white transition-colors cursor-pointer group"
              >
                {isTreeExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-text-muted group-hover:text-white" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-white" />
                )}
                <span className="text-xs font-semibold font-mono tracking-tight flex items-center gap-1">
                  Agent Files
                  <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full bg-surface-primary border border-border-primary text-[9px] text-text-muted">
                    {agentEntries.length} files
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={onRefreshEntries}
                className="p-1 text-text-muted hover:text-text-primary hover:bg-surface-primary rounded transition-colors cursor-pointer"
                title="Refresh agent files"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {isTreeExpanded && agentEntries.length > 0 && (
              <div className="mt-2 max-h-[300px] overflow-y-auto">
                <VaultFileTree
                  entries={agentEntries}
                  vaultPath={project.vaultPath || ''}
                  onSelectFile={onSelectFile}
                  onChangeVaultPath={onSetVaultDirectory}
                  onDeleteFile={() => {}}
                  onCreateDocument={async () => {}}
                  onRefresh={onRefreshEntries}
                />
              </div>
            )}
            {isTreeExpanded && agentEntries.length === 0 && (
              <div className="py-4 text-center text-[10px] text-text-muted font-mono italic">
                No files in .taxon/
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border-primary/40 space-y-3">
            <div>
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">
                Git Integration
              </span>
              <button
                type="button"
                onClick={handleInstallGitHook}
                disabled={isInstallingHook || isExporting || isScanning}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-surface-primary border border-border-primary text-text-muted hover:text-text-primary hover:bg-surface-hover text-xs font-mono rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isInstallingHook ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <GitCommit className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>Install Post-Commit Git Hook</span>
              </button>
              {hookMessage && (
                <div className="mt-2 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                  {hookMessage}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-border-primary/20">
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">
                Maintenance
              </span>
              <button
                type="button"
                onClick={handleCleanUp}
                disabled={isCleaningUp || isExporting || isScanning}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-surface-primary border border-border-primary text-text-muted hover:text-text-primary hover:bg-surface-hover text-xs font-mono rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCleaningUp ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                )}
                <span>Clean Up Archived Files</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
