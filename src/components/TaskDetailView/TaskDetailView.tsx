import { AlertTriangle, Edit3, Eye, Maximize2, Play, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import TaskPropertyGrid from '../../sections/TaskPropertyGrid/TaskPropertyGrid';
import type { Project, Sprint, SubTask, Task } from '../../types';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import MarkdownViewer from '../MarkdownViewer';
import SubtaskList from '../SubtaskList/SubtaskList';

interface TaskDetailViewProps {
  task: Task | null;
  projects: Project[];
  sprints?: Sprint[];
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onStartFocus?: (task: Task) => void;
}

export default function TaskDetailView({
  task,
  projects,
  sprints,
  onClose,
  onUpdateTask,
  onDeleteTask,
  onStartFocus,
}: TaskDetailViewProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  useEffect(() => {
    if (task) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditedTask({
        ...task,
        labels: task.labels || ['Work'],
        reminders: task.reminders || ['Add Reminders'],
        subtasks: task.subtasks || [],
      });
    } else {
      setEditedTask(null);
    }
  }, [task]);

  if (!task || !editedTask) return null;

  const handleFieldChange = <K extends keyof Task>(field: K, value: Task[K]) => {
    setEditedTask((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, [field]: value };
      // Call onUpdateTask with the newly computed object
      onUpdateTask(updated);
      return updated;
    });
  };

  return (
    <AnimatePresence>
      {task && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 transition-opacity"
          />

          <motion.div
            initial={{ x: '100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 pt-10 w-[500px] bg-surface-primary border-l border-border-primary shadow-2xl z-[60] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary shrink-0 bg-surface-primary">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-text-primary tracking-wide whitespace-nowrap">
                  Task Details
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                    editedTask.status === 'Done'
                      ? 'bg-green-500/10 text-green-400 border-green-500/30'
                      : editedTask.status === 'Need to Test'
                        ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  }`}
                >
                  {editedTask.status}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {onStartFocus && (
                  <button
                    onClick={() => {
                      onStartFocus(editedTask);
                      onClose();
                    }}
                    title="Start Pomodoro"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-interactive-primary text-interactive-primary-text font-bold text-xs rounded-lg hover:bg-interactive-primary/90 transition-colors shadow-sm cursor-pointer mr-1"
                  >
                    <Play className="w-3.5 h-3.5" fill="currentColor" />
                    <span>Start Pomodoro</span>
                  </button>
                )}
                <button
                  onClick={() => setIsDeleteConfirmOpen(true)}
                  title="Delete Task"
                  className="p-2 text-text-muted hover:text-red-400 hover:bg-surface-secondary rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  title="Close Panel"
                  className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Main Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-thin">
              {/* Title Section */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                  Title
                </label>
                <div className="bg-surface-secondary border border-border-primary rounded-xl px-4 py-3 focus-within:border-white/40 transition-all shadow-inner">
                  <input
                    type="text"
                    value={editedTask.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    placeholder="Task title..."
                    className="w-full bg-transparent border-none text-text-primary font-semibold text-lg focus:outline-none placeholder:text-text-muted/60"
                  />
                </div>
              </div>

              <TaskPropertyGrid
                task={editedTask}
                projects={projects}
                sprints={sprints || []}
                onChange={handleFieldChange}
              />

              {/* Description Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                    Description
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="bg-surface-secondary p-0.5 rounded-lg border border-border-primary flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingDescription(false)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                          !isEditingDescription
                            ? 'bg-white text-black font-bold shadow'
                            : 'text-text-muted hover:text-white'
                        }`}
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingDescription(true)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                          isEditingDescription
                            ? 'bg-white text-black font-bold shadow'
                            : 'text-text-muted hover:text-white'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    </div>
                    <button
                      title="Expand Description"
                      className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div
                  className={`bg-surface-secondary border border-border-primary rounded-xl p-3 focus-within:border-white/40 transition-all shadow-inner ${!isEditingDescription && editedTask.description ? 'max-h-[400px] overflow-y-auto scrollbar-thin' : ''}`}
                >
                  {isEditingDescription ? (
                    <textarea
                      rows={4}
                      value={editedTask.description || ''}
                      onChange={(e) => handleFieldChange('description', e.target.value)}
                      placeholder="Add a detailed description, notes, or links..."
                      className="w-full bg-transparent border-none text-xs text-text-primary focus:outline-none resize-none placeholder:text-text-muted/60 leading-relaxed"
                    />
                  ) : (
                    <div
                      className={!editedTask.description ? 'text-xs text-text-muted/60 italic' : ''}
                    >
                      <MarkdownViewer
                        content={
                          editedTask.description || 'Add a detailed description, notes, or links...'
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              <SubtaskList
                subtasks={editedTask.subtasks || []}
                onChange={(newSubtasks: SubTask[]) => handleFieldChange('subtasks', newSubtasks)}
              />
            </div>
          </motion.div>
        </>
      )}

      {isDeleteConfirmOpen && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Task"
          description={`Are you sure you want to delete "${editedTask.title}"? This action cannot be undone.`}
          confirmLabel="Delete Task"
          icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
          onConfirm={() => {
            onDeleteTask(editedTask.id);
            setIsDeleteConfirmOpen(false);
            onClose();
          }}
          onClose={() => setIsDeleteConfirmOpen(false)}
        />
      )}
    </AnimatePresence>
  );
}
