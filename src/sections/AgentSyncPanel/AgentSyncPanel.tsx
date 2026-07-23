import {
  Bot,
  ChevronDown,
  ChevronRight,
  DownloadCloud,
  FolderOpen,
  Loader2,
  RefreshCw,
  UploadCloud,
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
  onExport: () => void;
  onImport: () => void;
  onSetVaultDirectory: () => void;
  onSelectFile: (entry: VaultEntry) => void;
  onRefreshEntries: () => void;
  error?: string | null;
}

export default function AgentSyncPanel({
  project,
  syncState,
  agentEntries,
  isExporting,
  isScanning,
  hasVaultPath,
  onExport,
  onImport,
  onSetVaultDirectory,
  onSelectFile,
  onRefreshEntries,
  error,
}: AgentSyncPanelProps) {
  const [isTreeExpanded, setIsTreeExpanded] = useState(true);

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

  return (
    <div className="bg-surface-secondary border border-border-primary rounded-xl p-6 mt-6">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-primary/50">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
          <Bot className="w-4 h-4 text-emerald-400" />
          AI Agent Sync
        </h3>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-xs font-mono">
          {error}
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
          <div className="bg-surface-primary rounded-lg border border-border-primary/50 p-3">
            <div className="flex items-center justify-between mb-3">
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
          </div>
        </div>
      )}

      {hasVaultPath && (
        <div className="mt-4 pt-4 border-t border-border-primary/50">
          <div className="flex justify-between items-center mb-2">
            <button
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
      )}
    </div>
  );
}
