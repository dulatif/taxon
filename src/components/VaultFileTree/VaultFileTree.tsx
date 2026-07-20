import { Search, X } from 'lucide-react';
import React, { useState } from 'react';
import type { VaultEntry } from '../../types';
import FileNode from './FileNode';
import TreeToolbar from './TreeToolbar';

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
          children:
            matchesSelf && filteredChildren.length === 0 ? entry.children : filteredChildren,
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

export default function VaultFileTree({
  entries,
  selectedPath,
  vaultPath,
  onSelectFile,
  onDeleteFile,
  onCreateDocument,
  onRefresh,
  onChangeVaultPath,
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
      <TreeToolbar
        vaultPath={vaultPath}
        isCreating={isCreating}
        setIsCreating={setIsCreating}
        onChangeVaultPath={onChangeVaultPath}
        onRefresh={onRefresh}
        newDocName={newDocName}
        setNewDocName={setNewDocName}
        handleCreateSubmit={handleCreateSubmit}
        createError={createError}
      />

      {/* Search & Filter Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
        <input
          type="text"
          placeholder="Filter documents inside vault..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-surface-primary border border-border-primary rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:border-white/40 font-mono transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Tree View Canvas */}
      <div className="bg-black/40 rounded-lg p-2 border border-border-primary/40 min-h-[140px] max-h-[380px] overflow-y-auto scrollbar-thin">
        {filteredEntries.length === 0 ? (
          <div className="py-10 text-center text-xs text-text-muted font-mono italic">
            {searchQuery
              ? `No files matching "${searchQuery}"`
              : 'Vault directory is empty or contains no .md / .txt files'}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filteredEntries.map((entry) => (
              <FileNode
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
