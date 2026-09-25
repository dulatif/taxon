import { open as shellOpen } from '@tauri-apps/plugin-shell';
import {
  Check,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileCode,
  FileText,
  Loader2,
  Save,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { VaultEntry } from '../types';
import MarkdownViewer from './MarkdownViewer';

interface DocumentPanelProps {
  isOpen: boolean;
  entry: VaultEntry | null;
  onClose: () => void;
  onSaveContent: (path: string, content: string) => Promise<void>;
  onReadContent: (path: string) => Promise<string>;
}

export default function DocumentPanel({
  isOpen,
  entry,
  onClose,
  onSaveContent,
  onReadContent,
}: DocumentPanelProps) {
  const [content, setContent] = useState<string>('');
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty' | 'error'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const contentRef = useRef(content);
  const entryRef = useRef(entry);

  useEffect(() => {
    contentRef.current = content;
    entryRef.current = entry;
  });

  // Load document content whenever selected entry changes
  useEffect(() => {
    if (isOpen && entry) {
      let isMounted = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoading(true);
      setSaveStatus('saved');

      // Default to edit mode for .txt, view mode for .md
      if (entry.name.endsWith('.txt')) {
        setMode('edit');
      } else {
        setMode('view');
      }

      onReadContent(entry.path)
        .then((text) => {
          if (isMounted) {
            setContent(text);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error('Failed to read file:', err);
          if (isMounted) {
            setContent('# Error reading document content\n\nCould not open the selected file.');
            setIsLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, entry, onReadContent]);

  // Save helper
  const handleSave = async (textToSave?: string) => {
    const targetEntry = entryRef.current;
    if (!targetEntry) return;
    const text = textToSave !== undefined ? textToSave : contentRef.current;

    setSaveStatus('saving');
    try {
      await onSaveContent(targetEntry.path, text);
      setSaveStatus('saved');
      setLastSavedAt(new Date());
    } catch (err) {
      console.error('Error saving document:', err);
      setSaveStatus('error');
    }
  };

  // Auto-save on mode switch Edit -> View
  const handleToggleMode = (newMode: 'view' | 'edit') => {
    if (mode === 'edit' && newMode === 'view' && saveStatus === 'dirty') {
      handleSave();
    }
    setMode(newMode);
  };

  // Auto-save on panel close
  const handleClose = () => {
    if (mode === 'edit' && saveStatus === 'dirty') {
      handleSave().finally(() => {
        onClose();
      });
    } else {
      onClose();
    }
  };

  if (!isOpen || !entry) return null;

  const isCode = entry.name.endsWith('.txt');

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] overflow-hidden pointer-events-none flex justify-end">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        />

        {/* Slide-In Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-2xl h-full bg-surface-elevated border-l border-border-primary shadow-2xl flex flex-col pointer-events-auto z-10 text-text-primary font-sans overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary bg-surface-elevated shrink-0">
            <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
              <div className="p-2 rounded-lg bg-surface-primary border border-border-primary shrink-0">
                {isCode ? (
                  <FileCode className="w-4 h-4 text-cyan-400" />
                ) : (
                  <FileText className="w-4 h-4 text-blue-400" />
                )}
              </div>
              <div className="min-w-0">
                <h3
                  className="text-sm font-bold text-text-primary truncate tracking-tight font-sans"
                  title={entry.name}
                >
                  {entry.name}
                </h3>
                <p
                  className="text-[10px] text-text-muted font-mono truncate mt-0.5"
                  title={entry.path}
                >
                  {entry.path}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* View / Edit Mode Toggle Button */}
              <div className="bg-surface-primary p-1 rounded-lg border border-border-primary flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleToggleMode('view')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                    mode === 'view'
                      ? 'bg-interactive-primary text-interactive-primary-text font-bold shadow'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleMode('edit')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                    mode === 'edit'
                      ? 'bg-interactive-primary text-interactive-primary-text font-bold shadow'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleClose}
                title="Close Document (Auto-Saves)"
                className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Document Content / Editor Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin bg-surface-app/30">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-text-muted space-y-3">
                <Loader2 className="w-6 h-6 animate-spin text-text-primary" />
                <span className="text-xs font-mono uppercase tracking-wider">
                  Loading document...
                </span>
              </div>
            ) : mode === 'view' ? (
              <div className="max-w-none">
                <MarkdownViewer content={content || '*Document is empty*'} />
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setSaveStatus('dirty');
                }}
                placeholder="Write your markdown or text document here..."
                className="w-full h-full min-h-[420px] bg-surface-secondary border border-border-primary rounded-xl p-4 text-xs font-mono text-text-primary leading-relaxed focus:outline-none focus:border-interactive-primary/40 resize-none shadow-inner"
              />
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-6 py-3 border-t border-border-primary bg-surface-elevated flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono">
              {saveStatus === 'saving' && (
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving to disk...</span>
                </span>
              )}
              {saveStatus === 'dirty' && (
                <span className="flex items-center gap-1.5 text-amber-400/90">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Unsaved changes (auto-saves on close)</span>
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    Saved to vault{' '}
                    {lastSavedAt
                      ? `at ${lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
                      : ''}
                  </span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-400 font-bold">Failed to save changes</span>
              )}

              {mode === 'edit' && saveStatus === 'dirty' && (
                <button
                  type="button"
                  onClick={() => handleSave()}
                  className="ml-2 bg-interactive-primary/10 hover:bg-interactive-primary/20 text-interactive-primary px-2 py-0.5 rounded flex items-center gap-1 text-[10px] cursor-pointer"
                >
                  <Save className="w-3 h-3" /> Save Now
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (saveStatus === 'dirty') {
                    await handleSave();
                  }
                  try {
                    await shellOpen(entry.path);
                  } catch (e) {
                    console.error('Failed to open file in external editor:', e);
                  }
                }}
                className="flex items-center gap-1.5 bg-surface-primary hover:bg-surface-hover border border-border-primary text-text-muted hover:text-text-primary text-xs font-mono px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in external editor</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
