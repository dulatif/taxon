import React, { useState } from 'react';
import { X, Edit2, Trash2, Check, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, PROJECT_CATEGORIES, getCategoryStyle } from '../types';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onRenameCategory: (oldCat: string, newCat: string) => void;
  onDeleteCategory: (catToDelete: string, fallbackCat: string) => void;
}

export default function ManageCategoriesModal({
  isOpen,
  onClose,
  projects,
  onRenameCategory,
  onDeleteCategory,
}: ManageCategoriesModalProps) {
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [deletingCat, setDeletingCat] = useState<string | null>(null);
  const [fallbackCat, setFallbackCat] = useState<string>('Engineering');

  if (!isOpen) return null;

  // Gather all categories present or default
  const allCategories = Array.from(
    new Set([...PROJECT_CATEGORIES, ...projects.map((p) => p.category)])
  ).filter(Boolean);

  const handleSaveRename = (oldCat: string) => {
    if (!renameValue.trim() || renameValue.trim() === oldCat) {
      setEditingCat(null);
      return;
    }
    onRenameCategory(oldCat, renameValue.trim());
    setEditingCat(null);
  };

  const handleConfirmDelete = (catToDelete: string) => {
    onDeleteCategory(catToDelete, fallbackCat);
    setDeletingCat(null);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="relative bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6 max-w-lg w-full shadow-2xl z-10 max-h-[80vh] flex flex-col"
        >
          <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Manage Category Tags
              </h3>
              <p className="text-xs text-[#8E9192] mt-0.5">
                Rename or delete tags globally across all projects.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-[#8E9192] hover:text-white cursor-pointer p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 overflow-y-auto pr-1 flex-1 scrollbar-thin">
            {allCategories.map((cat) => {
              const projectCount = projects.filter((p) => p.category === cat).length;
              const style = getCategoryStyle(cat);
              const isEditing = editingCat === cat;
              const isDeleting = deletingCat === cat;
              const isPreset = (PROJECT_CATEGORIES as readonly string[]).includes(cat);

              return (
                <div
                  key={cat}
                  className="bg-black border border-[#27272A] rounded-lg p-3.5 flex flex-col gap-2 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Tag display or Inline rename input */}
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="bg-[#141313] border border-white text-xs text-white rounded px-2.5 py-1.5 flex-1 focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename(cat);
                            if (e.key === 'Escape') setEditingCat(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveRename(cat)}
                          className="bg-white text-black font-bold text-xs px-3 py-1.5 rounded hover:bg-white/90 cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCat(null)}
                          className="text-xs text-[#8E9192] hover:text-white px-2 py-1.5 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider leading-tight border ${style.border} ${style.bg} ${style.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 self-center ${style.dot}`} />
                          <span className="self-center">{cat}</span>
                        </span>
                        <span className="text-[10px] text-[#8E9192] font-mono">
                          {projectCount} {projectCount === 1 ? 'project' : 'projects'}
                        </span>
                        {!isPreset && (
                          <span className="text-[9px] bg-white/10 text-white/80 font-mono px-1.5 py-0.5 rounded">
                            Custom
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {!isEditing && !isDeleting && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCat(cat);
                            setRenameValue(cat);
                            setDeletingCat(null);
                          }}
                          className="p-1.5 text-[#8E9192] hover:text-white hover:bg-[#1C1B1B] rounded transition-colors cursor-pointer"
                          title="Rename Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {cat !== 'Completed' && (
                          <button
                            onClick={() => {
                              setDeletingCat(cat);
                              setEditingCat(null);
                              // Pick fallback that isn't the current category
                              setFallbackCat(cat === 'Engineering' ? 'Personal' : 'Engineering');
                            }}
                            className="p-1.5 text-[#8E9192] hover:text-red-400 hover:bg-[#1C1B1B] rounded transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reassignment confirmation bar */}
                  {isDeleting && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-2 border-t border-[#27272A]/80 mt-1 flex flex-col gap-2"
                    >
                      <div className="flex items-center gap-1.5 text-xs text-amber-400">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Delete tag and reassign {projectCount} projects to:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={fallbackCat}
                          onChange={(e) => setFallbackCat(e.target.value)}
                          className="bg-[#141313] border border-[#27272A] text-xs text-white rounded p-1.5 flex-1 focus:outline-none"
                        >
                          {allCategories
                            .filter((c) => c !== cat)
                            .map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={() => handleConfirmDelete(cat)}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs px-3 py-1.5 rounded transition-colors cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                        <button
                          onClick={() => setDeletingCat(null)}
                          className="text-xs text-[#8E9192] hover:text-white px-2 py-1.5 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex justify-end pt-5 mt-4 border-t border-[#27272A] shrink-0">
            <button
              onClick={onClose}
              className="bg-white text-black font-bold text-xs px-5 py-2 rounded-lg hover:bg-white/90 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
