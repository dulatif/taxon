import { Maximize2, Minimize2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { Project, Task } from '../../types';
import { DeliverablesDiffViewer } from './DeliverablesDiffViewer';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  project?: Project;
  onUpdateTask: (task: Task) => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  onClose,
  task,
  project,
  onUpdateTask,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEscapeKey(() => setIsFullScreen(false), { enabled: isOpen && isFullScreen, priority: 10 });
  useEscapeKey(onClose, { enabled: isOpen && !isFullScreen, priority: 0 });

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (!isInput && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setIsFullScreen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`bg-[#050505] border border-border-primary/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
          isFullScreen ? 'w-full h-full rounded-none border-none' : 'w-[95vw] h-[92vh] max-w-7xl'
        }`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#0a0a0a] border-b border-border-primary">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
              TASK-{task.id}
            </span>
            <h2 className="text-sm font-semibold text-text-primary font-mono truncate max-w-xl">
              {task.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullScreen((prev) => !prev)}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors cursor-pointer"
              title={isFullScreen ? 'Exit Full Screen (F)' : 'Full Screen (F)'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 p-4 overflow-hidden">
          <DeliverablesDiffViewer
            task={task}
            project={project}
            onUpdateTask={onUpdateTask}
            isModal={true}
            onToggleModal={() => setIsFullScreen((prev) => !prev)}
          />
        </div>
      </div>
    </div>
  );
};
