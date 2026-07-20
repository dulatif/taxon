import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FileText,
  Folder,
  FolderOpen,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import type { VaultEntry } from '../../types';

interface FileNodeProps {
  entry: VaultEntry;
  selectedPath?: string;
  onSelectFile: (entry: VaultEntry) => void;
  onDeleteFile: (entry: VaultEntry) => void;
  depth: number;
  isSearching: boolean;
}

export default function FileNode({
  entry,
  selectedPath,
  onSelectFile,
  onDeleteFile,
  depth,
  isSearching,
}: FileNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (entry.isDirectory) {
    const expanded = isSearching || isExpanded;
    return (
      <div>
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsExpanded(!isExpanded)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
          className="flex items-center gap-1.5 py-1.5 px-2 rounded hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors cursor-pointer select-none text-xs font-mono"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-text-muted shrink-0" />
          )}
          {expanded ? (
            <FolderOpen className="w-4 h-4 text-amber-500/80 shrink-0" />
          ) : (
            <Folder className="w-4 h-4 text-amber-500/80 shrink-0" />
          )}
          <span className="font-semibold truncate">{entry.name}</span>
        </div>

        {expanded && entry.children && (
          <div className="space-y-0.5">
            {entry.children.map((child) => (
              <FileNode
                key={child.path}
                entry={child}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
                onDeleteFile={onDeleteFile}
                depth={depth + 1}
                isSearching={isSearching}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  const isSelected = selectedPath === entry.path;
  const isCode = entry.name.endsWith('.txt');

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelectFile(entry)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelectFile(entry);
        }
      }}
      className={`flex items-center justify-between py-1.5 px-2 rounded transition-colors group cursor-pointer select-none text-xs font-sans ${
        isSelected
          ? 'bg-white/15 text-white font-semibold border-l-2 border-white'
          : 'hover:bg-surface-hover text-text-secondary hover:text-text-primary'
      }`}
      style={{ paddingLeft: `${depth * 14 + 22}px` }}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
        {isCode ? (
          <FileCode className="w-4 h-4 text-cyan-400/80 shrink-0" />
        ) : (
          <FileText className="w-4 h-4 text-blue-400/80 shrink-0" />
        )}
        <span className="truncate">{entry.name}</span>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteFile(entry);
        }}
        title="Delete document"
        className="p-1 hover:bg-surface-secondary rounded text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
