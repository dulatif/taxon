import { AlertTriangle, Edit2, FilePlus, FolderDot, Plus, RefreshCw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface TreeToolbarProps {
  vaultPath: string;
  isCreating: boolean;
  setIsCreating: (val: boolean) => void;
  onChangeVaultPath: () => void;
  onRefresh: () => void;
  newDocName: string;
  setNewDocName: (name: string) => void;
  handleCreateSubmit: (e: React.FormEvent) => void;
  createError: string | null;
}

export default function TreeToolbar({
  vaultPath,
  isCreating,
  setIsCreating,
  onChangeVaultPath,
  onRefresh,
  newDocName,
  setNewDocName,
  handleCreateSubmit,
  createError,
}: TreeToolbarProps) {
  return (
    <div className="bg-surface-primary rounded-xl border border-border-primary/70 p-3 shadow-sm transition-all hover:border-border-primary">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Path Info Section */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <FolderDot className="w-4 h-4 text-amber-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className="text-[11px] font-mono text-text-muted bg-surface-secondary px-2 py-0.5 rounded-md border border-border-primary truncate block max-w-[200px] sm:max-w-xs md:max-w-sm"
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-secondary hover:bg-surface-hover text-text-muted hover:text-text-primary rounded-lg border border-border-primary transition-all text-xs font-medium cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Change</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            title="Refresh Vault Scan"
            className="p-1.5 bg-surface-secondary hover:bg-surface-hover text-text-muted hover:text-text-primary rounded-lg border border-border-primary transition-all cursor-pointer"
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
            className="overflow-hidden border-t border-border-primary/80 pt-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="relative flex-1">
                <FilePlus className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Document name (e.g., Architecture.md)"
                  autoFocus
                  className="w-full bg-surface-secondary text-text-primary text-xs pl-8 pr-3 py-2 rounded-lg border border-border-primary focus:outline-none focus:border-white/50 font-mono transition-colors"
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
  );
}
