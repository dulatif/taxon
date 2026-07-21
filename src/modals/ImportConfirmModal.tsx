import { Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

interface ImportConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ImportConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
}: ImportConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0A0A0A] border border-[#27272A] rounded-xl w-full max-w-sm p-6 relative text-center"
          >
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>

            <h3 className="text-md font-bold text-white uppercase tracking-widest font-mono mb-2">
              Overwrite Workspace?
            </h3>

            <p className="text-xs text-[#8E9192] mb-6">
              Importing data will <strong>permanently erase</strong> your current projects, tasks,
              and activity logs. This action cannot be undone.
            </p>

            <div className="flex gap-3 justify-center">
              <button
                onClick={onCancel}
                className="text-xs font-semibold text-[#8E9192] hover:text-white px-3 py-2 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
              >
                Confirm Import
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
