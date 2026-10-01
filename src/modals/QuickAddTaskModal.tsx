import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface QuickAddTaskModalProps {
  isOpen: boolean;
  taskTitle: string;
  onChangeTitle: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function QuickAddTaskModal({
  isOpen,
  taskTitle,
  onChangeTitle,
  onClose,
  onSubmit,
}: QuickAddTaskModalProps) {
  useEscapeKey(onClose, { enabled: isOpen });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#0A0A0A] border border-[#27272A] rounded-xl w-full max-w-sm p-6 relative"
          >
            <button
              aria-label="Close"
              onClick={onClose}
              className="absolute right-4 top-4 hover:bg-[#141313] p-1.5 rounded-lg text-[#8E9192] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-md font-bold text-white uppercase tracking-widest font-mono mb-4">
              Quick Add Task
            </h3>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (taskTitle.trim()) {
                  onSubmit();
                }
              }}
              className="space-y-4"
            >
              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="What needs to be done?"
                  className="bg-black border border-[#27272A] text-xs text-white rounded-lg p-3 w-full focus:outline-none focus:border-white focus:ring-0"
                  value={taskTitle}
                  onChange={(e) => onChangeTitle(e.target.value)}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold text-[#8E9192] hover:text-white px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!taskTitle.trim()}
                  className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-40 transition-colors"
                >
                  Add Task
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
