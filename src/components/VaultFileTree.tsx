import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Folder,
  FolderOpen,
  FileText,
  FileCode,
  Search,
  Plus,
  RefreshCw,
  Trash2,
  ChevronRight,
  ChevronDown,
  Edit2,
  FolderDot,
  FilePlus,
  AlertTriangle,
  X
} from 'lucide-react';
import { VaultEntry } from '../types';

interface VaultFileTreeProps {
  entries: VaultEntry[];
  selectedPath?: string;
  vaultPath: string;
  onSelectFile: (entry: VaultEntry) => void;
  onDeleteFile: (entry: VaultEntry) => void;
  onCreateDocument: (filename: string) => Promise<void>;
  onRefresh: () => void;
  onChangeVaultPath: () => void;
}

function filterEntries(entries: VaultEntry[], query: string): VaultEntry[] {
  if (!query.trim()) return entries;
  const q = query.toLowerCase();

  return entries.reduce<VaultEntry[]>((acc, entry) => {
    if (entry.isDirectory) {
      const filteredChildren = filterEntries(entry.children || [], query);
      const matchesSelf = entry.name.toLowerCase().includes(q);
      if (matchesSelf || filteredChildren.length > 0) {
        acc.push({
          ...entry,
          children: matchesSelf && filteredChildren.length === 0 ? entry.children : filteredChildren
        });
      }
    } else {
      if (entry.name.toLowerCase().includes(q)) {
        acc.push(entry);
      }
    }
    return acc;
  }, []);
}

interface TreeNodeProps {
  entry: VaultEntry;
  selectedPath?: string;
  onSelectFile: (entry: VaultEntry) => void;
  onDeleteFile: (entry: VaultEntry) => void;
  depth: number;
  isSearching: boolean;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  entry,
  selectedPath,
  onSelectFile,
  onDeleteFile,
  depth,
  isSearching
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

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
          className="flex items-center gap-1.5 py-1.5 px-2 rounded hover:bg-[#141313] text-[#C4C7C8] hover:text-white transition-colors cursor-pointer select-none text-xs font-mono"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-[#8E9192] shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-[#8E9192] shrink-0" />
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
              <TreeNode
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
          : 'hover:bg-[#141313] text-[#C4C7C8] hover:text-white'
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
        className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default function VaultFileTree({
  entries,
  selectedPath,
  vaultPath,
  onSelectFile,
  onDeleteFile,
  onCreateDocument,
  onRefresh,
  onChangeVaultPath
}: VaultFileTreeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const filteredEntries = filterEntries(entries, searchQuery);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    setCreateError(null);
    try {
      await onCreateDocument(newDocName.trim());
      setNewDocName('');
      setIsCreating(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create document');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with Vault Path & Actions */}
      {/* Sleek Integrated Top Bar */}
      <div className="bg-[#0B0B0C] rounded-xl border border-[#27272A]/70 p-3 shadow-sm transition-all hover:border-[#27272A]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Path Info Section */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
              <FolderDot className="w-4 h-4 text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-white tracking-tight">Project Vault</span>
                <span 
                  className="text-[11px] font-mono text-[#A1A1A6] bg-[#161618] px-2 py-0.5 rounded-md border border-[#2A2A2E] truncate block max-w-[200px] sm:max-w-xs md:max-w-sm"
                  title={vaultPath}
                >
                  {vaultPath}
                </span>
              </div>
            </div>
          </div>

          {/* Action Button Group */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={onChangeVaultPath}
              title="Change Vault Directory"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161618] hover:bg-[#202024] text-[#A1A1A6] hover:text-white rounded-lg border border-[#2A2A2E] transition-all text-xs font-medium cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Change</span>
            </button>

            <button
              type="button"
              onClick={onRefresh}
              title="Refresh Vault Scan"
              className="p-1.5 bg-[#161618] hover:bg-[#202024] text-[#A1A1A6] hover:text-white rounded-lg border border-[#2A2A2E] transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setIsCreating(!isCreating)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-semibold cursor-pointer shadow-sm ${
                isCreating
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                  : 'bg-white text-black hover:bg-white/90 border border-transparent'
              }`}
            >
              {isCreating ? (
                <>
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Note</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Animated Inline Document Creation Form */}
        <AnimatePresence>
          {isCreating && (
            <motion.form
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.18, ease: 'easeInOut' }}
              onSubmit={handleCreateSubmit}
              className="overflow-hidden border-t border-[#27272A]/80 pt-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="relative flex-1">
                  <FilePlus className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E9192]" />
                  <input
                    type="text"
                    value={newDocName}
                    onChange={(e) => setNewDocName(e.target.value)}
                    placeholder="Document name (e.g., Architecture.md)"
                    autoFocus
                    className="w-full bg-[#161618] text-white text-xs pl-8 pr-3 py-2 rounded-lg border border-[#2A2A2E] focus:outline-none focus:border-white/50 font-mono transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="submit"
                    disabled={!newDocName.trim()}
                    className="px-4 py-2 bg-white text-black font-semibold text-xs rounded-lg disabled:opacity-40 hover:bg-white/90 transition-all cursor-pointer shrink-0 shadow-sm"
                  >
                    Create Document
                  </button>
                </div>
              </div>

              {createError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 text-[11px] text-red-400 font-mono flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1.5 rounded-md border border-red-500/20"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{createError}</span>
                </motion.div>
              )}
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Search & Filter Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E9192]" />
        <input
          type="text"
          placeholder="Filter documents inside vault..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#141313] border border-[#27272A] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-[#8E9192]/60 focus:outline-none focus:border-white/40 font-mono transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9192] hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tree View Canvas */}
      <div className="bg-black/40 rounded-lg p-2 border border-[#27272A]/40 min-h-[140px] max-h-[380px] overflow-y-auto scrollbar-thin">
        {filteredEntries.length === 0 ? (
          <div className="py-10 text-center text-xs text-[#8E9192] font-mono italic">
            {searchQuery
              ? `No files matching "${searchQuery}"`
              : 'Vault directory is empty or contains no .md / .txt files'}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredEntries.map((entry) => (
              <TreeNode
                key={entry.path}
                entry={entry}
                selectedPath={selectedPath}
                onSelectFile={onSelectFile}
                onDeleteFile={onDeleteFile}
                depth={0}
                isSearching={Boolean(searchQuery.trim())}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
