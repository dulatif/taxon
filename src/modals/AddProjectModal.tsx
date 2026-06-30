import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project } from '../types';

interface AddProjectModalProps {
  isOpen: boolean;
  projName: string;
  projDesc: string;
  projCategory: Project['category'];
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
  onChangeName,
  onChangeDesc,
  onChangeCategory,
  onClose,
  onSubmit,
}: AddProjectModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0A0A0A] border border-[#27272A] rounded-xl w-full max-w-md p-6 relative"
          >
            <button
              aria-label="Close"
              onClick={onClose}
              className="absolute right-4 top-4 hover:bg-[#141313] p-1.5 rounded-lg text-[#8E9192] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-md font-bold text-white uppercase tracking-widest font-mono mb-4">
              Add New Project
            </h3>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] mb-1.5 font-mono">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mobile Companion App"
                  className="bg-black border border-[#27272A] text-xs text-white rounded-lg p-2.5 w-full focus:outline-none focus:border-white focus:ring-0"
                  value={projName}
                  onChange={(e) => onChangeName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] mb-1.5 font-mono">
                  Description / Objectives
                </label>
                <textarea
                  placeholder="Summarize key features, scopes, or launch schedules..."
                  className="bg-black border border-[#27272A] text-xs text-white rounded-lg p-2.5 w-full h-24 focus:outline-none focus:border-white focus:ring-0"
                  value={projDesc}
                  onChange={(e) => onChangeDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] mb-1.5 font-mono">
                  Category Tag
                </label>
                <select
                  className="bg-black border border-[#27272A] text-xs text-[#C4C7C8] rounded-lg p-2.5 w-full focus:outline-none focus:border-white"
                  value={projCategory}
                  onChange={(e) => onChangeCategory(e.target.value as Project['category'])}
                >
                  <option value="Active">Active Module</option>
                  <option value="Design">Architecture / Design</option>
                  <option value="Planning">Q3 Planning / Ideation</option>
                </select>
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
