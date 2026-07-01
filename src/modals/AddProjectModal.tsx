import React, { useState } from 'react';
import { X, Plus, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, PROJECT_CATEGORIES } from '../types';

interface AddProjectModalProps {
  isOpen: boolean;
  projName: string;
  projDesc: string;
  projCategory: Project['category'];
  availableCategories?: string[];
  onChangeName: (v: string) => void;
  onChangeDesc: (v: string) => void;
  onChangeCategory: (v: Project['category']) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AddProjectModal({
  isOpen,
  projName,
  projDesc,
  projCategory,
  availableCategories = [],
  onChangeName,
  onChangeDesc,
  onChangeCategory,
  onClose,
  onSubmit,
}: AddProjectModalProps) {
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Merge default categories with any existing custom categories pooled from projects
  const allPooledCategories = Array.from(
    new Set([...PROJECT_CATEGORIES, ...availableCategories])
  ).filter(Boolean);

  const handleCategorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomMode(true);
      onChangeCategory('');
    } else {
      onChangeCategory(val);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="relative bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6 max-w-md w-full shadow-2xl z-10"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Initialize Project Board
              </h3>
              <button onClick={onClose} className="text-[#8E9192] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] mb-1.5 font-mono">
                  Project Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Core System Refactor"
                  className="bg-black border border-[#27272A] text-xs text-white rounded-lg p-2.5 w-full focus:outline-none focus:border-white focus:ring-0"
                  value={projName}
                  onChange={(e) => onChangeName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] mb-1.5 font-mono">
                  Executive Summary
                </label>
                <textarea
                  placeholder="Summarize key features, scopes, or launch schedules..."
                  className="bg-black border border-[#27272A] text-xs text-white rounded-lg p-2.5 w-full h-24 focus:outline-none focus:border-white focus:ring-0"
                  value={projDesc}
                  onChange={(e) => onChangeDesc(e.target.value)}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] font-mono">
                    Category Tag
                  </label>
                  {isCustomMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomMode(false);
                        onChangeCategory('Engineering');
                      }}
                      className="text-[10px] text-[#8E9192] hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" /> Select from list
                    </button>
                  )}
                </div>

                {isCustomMode ? (
                  <input
                    type="text"
                    placeholder="Type custom category name (e.g. AI Research)..."
                    className="bg-black border border-white/40 text-xs text-white rounded-lg p-2.5 w-full focus:outline-none focus:border-white focus:ring-0"
                    value={projCategory}
                    onChange={(e) => onChangeCategory(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <select
                    className="bg-black border border-[#27272A] text-xs text-[#C4C7C8] rounded-lg p-2.5 w-full focus:outline-none focus:border-white cursor-pointer"
                    value={allPooledCategories.includes(projCategory) ? projCategory : '__custom__'}
                    onChange={handleCategorySelect}
                  >
                    {allPooledCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option disabled value="">───</option>
                    <option value="__custom__">+ Add Custom Category...</option>
                  </select>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold text-[#8E9192] hover:text-white px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!projName.trim()}
                  className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-40 transition-colors"
                >
                  Create Board
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
