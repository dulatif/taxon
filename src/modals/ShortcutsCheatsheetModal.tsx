import { Command, Compass, Keyboard, Layout, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface ShortcutsCheatsheetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  icon: React.ReactNode;
  items: ShortcutItem[];
}

export const ShortcutsCheatsheetModal: React.FC<ShortcutsCheatsheetModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEscapeKey(onClose, { enabled: isOpen });

  if (!isOpen) return null;

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'Positional Vim Navigation',
      icon: <Compass className="w-4 h-4 text-emerald-400" />,
      items: [
        {
          keys: ['g', '1..9', '1..9'],
          description: 'Quick jump to project (Category index > Project index)',
        },
        { keys: ['g', 's'], description: 'Navigate to Settings view' },
        { keys: ['g', 'p'], description: 'Navigate to Projects view' },
        { keys: ['g', 't'], description: 'Navigate to Todo view' },
        { keys: ['j', '/', 'k'], description: 'Navigate to next / previous item' },
        { keys: ['Alt', '1..9'], description: 'Switch directly to pinned project 1–9' },
      ],
    },
    {
      title: 'Global Actions & Search',
      icon: <Command className="w-4 h-4 text-indigo-400" />,
      items: [
        { keys: ['⌘/Ctrl', 'K'], description: 'Open Spotlight Quick Search' },
        { keys: ['⌘/Ctrl', 'N'], description: 'Quick add new task' },
        { keys: ['⌘/Ctrl', 'F'], description: 'Toggle Focus Mode' },
        { keys: ['⌘/Ctrl', '⇧', 'P'], description: 'Start / Pause Pomodoro Timer' },
        { keys: ['⌘/Ctrl', '⇧', 'S'], description: 'Stop & Reset Pomodoro Timer' },
      ],
    },
    {
      title: 'General & Windows',
      icon: <Layout className="w-4 h-4 text-amber-400" />,
      items: [
        { keys: ['?'], description: 'Toggle this keyboard shortcuts cheatsheet' },
        { keys: ['Esc'], description: 'Dismiss topmost modal, popover, or active jump chord' },
      ],
    },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="bg-surface-secondary border border-border-primary rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-border-primary/50 flex items-center justify-between bg-surface-primary/40">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-interactive-primary/10 border border-interactive-primary/30 rounded-lg text-interactive-primary">
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary tracking-wide uppercase font-mono">
                  Keyboard Shortcuts
                </h3>
                <p className="text-xs text-text-muted">
                  Vim-style navigation and global application hotkeys
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto space-y-6">
            {shortcutGroups.map((group) => (
              <div key={group.title} className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary uppercase tracking-wider font-mono">
                  {group.icon}
                  <span>{group.title}</span>
                </div>
                <div className="bg-surface-primary border border-border-primary/60 rounded-xl divide-y divide-border-primary/40 overflow-hidden">
                  {group.items.map((item) => (
                    <div
                      key={item.description}
                      className="px-4 py-2.5 flex items-center justify-between text-xs"
                    >
                      <span className="text-text-muted">{item.description}</span>
                      <div className="flex items-center gap-1 shrink-0 font-mono">
                        {item.keys.map((k) => (
                          <kbd
                            key={k}
                            className="px-2 py-0.5 text-[11px] font-semibold bg-surface-secondary border border-border-primary text-text-primary rounded shadow-xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
