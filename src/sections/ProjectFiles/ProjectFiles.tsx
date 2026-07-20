import { open as shellOpen } from '@tauri-apps/plugin-shell';
import { ExternalLink, FileCode, FileImage, FileText, FolderOpen, Trash2 } from 'lucide-react';
import React from 'react';
import VaultFileTree from '../../components/VaultFileTree';
import type { DocumentFile, Project, VaultEntry } from '../../types';

interface ProjectFilesProps {
  project: Project;
  projectFiles: DocumentFile[];
  vaultEntries: VaultEntry[];
  selectedDocumentPath?: string;
  onSetVaultDirectory: () => void;
  onSelectFile: (entry: VaultEntry) => void;
  onDeleteVaultDoc: (entry: VaultEntry) => void;
  onCreateVaultDoc: (filename: string) => Promise<void>;
  onRefreshVault: () => void;
  onAddNativeFile: () => void;
  onDeleteNativeFile: (id: string) => void;
}

export default function ProjectFiles({
  project,
  projectFiles,
  vaultEntries,
  selectedDocumentPath,
  onSetVaultDirectory,
  onSelectFile,
  onDeleteVaultDoc,
  onCreateVaultDoc,
  onRefreshVault,
  onAddNativeFile,
  onDeleteNativeFile,
}: ProjectFilesProps) {
  const getFileIcon = (type: DocumentFile['type']) => {
    switch (type) {
      case 'image':
        return <FileImage className="w-4 h-4 text-text-muted" />;
      case 'code':
        return <FileCode className="w-4 h-4 text-text-muted" />;
      default:
        return <FileText className="w-4 h-4 text-text-muted" />;
    }
  };

  return (
    <div className="bg-surface-secondary border border-border-primary rounded-xl p-6">
      <div className="flex justify-between items-center mb-4 pb-2 border-b border-border-primary/50">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider font-mono flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-text-primary" />
          Project Vault & Documents
        </h3>
      </div>

      {project.vaultPath ? (
        <div className="space-y-6">
          <VaultFileTree
            entries={vaultEntries}
            selectedPath={selectedDocumentPath}
            vaultPath={project.vaultPath}
            onSelectFile={onSelectFile}
            onDeleteFile={onDeleteVaultDoc}
            onCreateDocument={onCreateVaultDoc}
            onRefresh={onRefreshVault}
            onChangeVaultPath={onSetVaultDirectory}
          />
        </div>
      ) : (
        <div className="bg-surface-primary border border-dashed border-border-primary hover:border-white/40 rounded-xl p-5 text-center space-y-3 transition-colors mb-6">
          <div className="w-10 h-10 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-text-primary font-mono uppercase tracking-wider">
              No Project Vault Set
            </h4>
            <p className="text-[11px] text-text-muted mt-1 leading-relaxed max-w-xs mx-auto">
              Connect a local directory to scan for .md / .txt documents with live preview &
              editing.
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
      )}

      <div className="space-y-4 pt-4 border-t border-border-primary/50 mt-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-text-muted/80">
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold font-mono tracking-tight text-text-primary">
              Manual Attachments
            </span>
          </div>
          <button
            onClick={onAddNativeFile}
            className="text-[10px] text-text-primary hover:underline uppercase tracking-wider font-mono cursor-pointer"
          >
            + Attach file
          </button>
        </div>

        {projectFiles.length === 0 ? (
          <div className="py-6 text-center text-[11px] text-text-muted font-mono italic">
            No manual attachments listed
          </div>
        ) : (
          <div className="ml-2 pl-3 border-l border-border-primary/50 space-y-2">
            {projectFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-2 hover:bg-surface-hover rounded transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getFileIcon(file.type)}
                  <div className="min-w-0">
                    <p
                      className="text-xs font-semibold text-text-primary truncate max-w-[150px]"
                      title={file.name}
                    >
                      {file.name.split(/[/\\]/).pop()}
                    </p>
                    <p className="text-[10px] text-text-muted font-mono mt-0.5">{file.size}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={async () => {
                      try {
                        await shellOpen(file.name);
                      } catch (e) {
                        console.error('Failed to open file', e);
                      }
                    }}
                    className="p-1 hover:bg-surface-primary rounded text-text-muted hover:text-text-primary"
                    title="Open document"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteNativeFile(file.id)}
                    className="p-1 hover:bg-surface-primary rounded text-text-muted hover:text-red-400"
                    title="Delete asset"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
