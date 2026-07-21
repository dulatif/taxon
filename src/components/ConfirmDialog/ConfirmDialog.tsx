import { AlertTriangle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { ReactNode } from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: ReactNode;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  // # computes
  const variantStyles = {
    danger: {
      icon: 'text-red-400',
      button: 'bg-red-500 hover:bg-red-600 text-white',
    },
    warning: {
      icon: 'text-yellow-400',
      button: 'bg-yellow-500 hover:bg-yellow-600 text-black',
    },
    info: {
      icon: 'text-blue-400',
      button: 'bg-blue-500 hover:bg-blue-600 text-white',
    },
  };

  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {/* ------ Backdrop ------ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[99998] bg-black/60 backdrop-blur-sm"
      />

      {/* ------ Dialog ------ */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      >
        <div className="bg-surface-elevated border border-border-primary rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${styles.icon}`} />
            <div className="flex-1 min-w-0">
              <h3 className="text-text-primary font-bold text-sm">{title}</h3>
              <div className="text-text-muted text-xs mt-1 leading-relaxed">{description}</div>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="text-xs text-text-muted hover:text-text-primary px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`text-xs font-bold px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${styles.button}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
