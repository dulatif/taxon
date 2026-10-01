import {
  AlertCircle,
  Archive,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Target,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import MarkdownViewer from '../components/MarkdownViewer';
import { useEscapeKey } from '../hooks/useEscapeKey';
import type { Sprint, Task } from '../types';

interface SprintCompleteModalProps {
  isOpen: boolean;
  sprint: Sprint | null;
  tasks: Task[];
  plannedSprints: Sprint[];
  onCancel: () => void;
  onConfirm: (rolloverAction: 'next' | 'backlog' | 'keep', targetSprintId: string | null) => void;
}

export default function SprintCompleteModal({
  isOpen,
  sprint,
  tasks,
  plannedSprints,
  onCancel,
  onConfirm,
}: SprintCompleteModalProps) {
  useEscapeKey(onCancel, { enabled: isOpen });

  const [rolloverAction, setRolloverAction] = useState<'next' | 'backlog' | 'keep'>('backlog');
  const [selectedTargetSprintId, setSelectedTargetSprintId] = useState<string | null>(null);
  const [isGoalExpanded, setIsGoalExpanded] = useState(false);

  useEffect(() => {
    if (plannedSprints.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRolloverAction('next');

      setSelectedTargetSprintId(plannedSprints[0]?.id ?? null);
    } else {
      setRolloverAction('backlog');

      setSelectedTargetSprintId(null);
    }
  }, [plannedSprints, isOpen]);

  if (!isOpen || !sprint) return null;

  const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id && !t.archived);
  const completedCount = sprintTasks.filter((t) => t.completed).length;
  const incompleteCount = sprintTasks.length - completedCount;
  const completionPercentage =
    sprintTasks.length > 0 ? Math.round((completedCount / sprintTasks.length) * 100) : 100;

  const handleConfirm = () => {
    let targetId: string | null = null;
    if (rolloverAction === 'next') {
      targetId = selectedTargetSprintId || (plannedSprints[0]?.id ?? null);
    } else if (rolloverAction === 'backlog') {
      targetId = null;
    } else if (rolloverAction === 'keep') {
      targetId = sprint.id;
    }
    onConfirm(rolloverAction, targetId);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-surface-elevated border border-border-primary rounded-xl w-full max-w-lg p-6 relative shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/30 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text-primary tracking-wide uppercase font-mono">
                Complete Sprint
              </h3>
              <p className="text-xs text-text-muted">
                Finalize "{sprint.name}" and review task progress
              </p>
            </div>
          </div>

          {/* Sprint Details & Goal */}
          <div className="bg-surface-primary border border-border-primary rounded-lg p-3.5 mb-4 text-left">
            <div className="flex items-center justify-between text-xs font-mono text-text-muted mb-2">
              <span className="flex items-center gap-1.5 text-text-primary font-bold">
                <Calendar className="w-3.5 h-3.5 text-[#3B82F6]" />
                {sprint.startDate} — {sprint.endDate}
              </span>
              <span className="text-emerald-400 font-semibold px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">
                {completionPercentage}% Done
              </span>
            </div>
            {sprint.goal && (
              <div className="flex items-start gap-2 text-xs text-text-muted pt-2 border-t border-border-primary">
                <Target className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 pr-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <strong className="text-text-primary block">Goal:</strong>
                    <button
                      type="button"
                      onClick={() => setIsGoalExpanded((prev) => !prev)}
                      className="inline-flex items-center gap-0.5 text-[10px] font-mono text-text-muted hover:text-text-primary transition-colors px-1 py-0.5 rounded cursor-pointer select-none"
                      title={isGoalExpanded ? 'Collapse goal' : 'Expand goal'}
                    >
                      <span>{isGoalExpanded ? 'Collapse' : 'Expand'}</span>
                      {isGoalExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <div
                    data-testid="sprint-complete-goal-container"
                    className={`text-xs text-text-muted [&_p]:mb-1 [&_p]:last:mb-0 transition-all ${
                      isGoalExpanded
                        ? 'max-h-none overflow-visible'
                        : 'max-h-32 overflow-y-auto pr-1'
                    }`}
                  >
                    <MarkdownViewer content={sprint.goal} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-surface-primary border border-border-primary rounded-lg p-3 text-center">
              <span className="block text-[10px] uppercase font-mono text-text-muted">
                Total Tasks
              </span>
              <span className="text-lg font-bold text-text-primary font-mono mt-0.5 block">
                {sprintTasks.length}
              </span>
            </div>
            <div className="bg-surface-primary border border-emerald-500/20 rounded-lg p-3 text-center">
              <span className="block text-[10px] uppercase font-mono text-emerald-400">
                Completed
              </span>
              <span className="text-lg font-bold text-emerald-400 font-mono mt-0.5 block">
                {completedCount}
              </span>
            </div>
            <div className="bg-surface-primary border border-amber-500/20 rounded-lg p-3 text-center">
              <span className="block text-[10px] uppercase font-mono text-amber-400">
                Incomplete
              </span>
              <span className="text-lg font-bold text-amber-400 font-mono mt-0.5 block">
                {incompleteCount}
              </span>
            </div>
          </div>

          {/* Rollover Section */}
          {incompleteCount > 0 ? (
            <div className="mb-6 border-t border-border-primary pt-4 text-left">
              <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-mono mb-3 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                Rollover Incomplete Tasks ({incompleteCount})
              </h4>
              <div className="space-y-2.5">
                {plannedSprints.length > 0 && (
                  <label
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${rolloverAction === 'next' ? 'bg-[#3B82F6]/10 border-[#3B82F6]/50 text-text-primary' : 'bg-surface-primary border-border-primary text-text-muted hover:border-text-muted'}`}
                  >
                    <input
                      type="radio"
                      name="rollover"
                      checked={rolloverAction === 'next'}
                      onChange={() => setRolloverAction('next')}
                      className="mt-0.5 accent-[#3B82F6]"
                    />
                    <div className="flex-1 text-xs">
                      <div className="font-semibold text-text-primary flex items-center gap-1.5">
                        <ArrowRight className="w-3.5 h-3.5 text-[#3B82F6]" />
                        Move to next planned sprint
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Assign unfinished items to an upcoming iteration
                      </p>
                      {rolloverAction === 'next' && (
                        <select
                          value={selectedTargetSprintId || ''}
                          onChange={(e) => setSelectedTargetSprintId(e.target.value)}
                          className="mt-2 w-full bg-surface-secondary border border-border-primary rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-[#3B82F6]"
                        >
                          {plannedSprints.map((ps) => (
                            <option key={ps.id} value={ps.id}>
                              {ps.name} ({ps.startDate} – {ps.endDate})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>
                )}

                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${rolloverAction === 'backlog' ? 'bg-[#3B82F6]/10 border-[#3B82F6]/50 text-text-primary' : 'bg-surface-primary border-border-primary text-text-muted hover:border-text-muted'}`}
                >
                  <input
                    type="radio"
                    name="rollover"
                    checked={rolloverAction === 'backlog'}
                    onChange={() => setRolloverAction('backlog')}
                    className="mt-0.5 accent-[#3B82F6]"
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-semibold text-text-primary flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      Move to Backlog
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Remove sprint assignment and return tasks to unassigned backlog
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${rolloverAction === 'keep' ? 'bg-[#3B82F6]/10 border-[#3B82F6]/50 text-text-primary' : 'bg-surface-primary border-border-primary text-text-muted hover:border-text-muted'}`}
                >
                  <input
                    type="radio"
                    name="rollover"
                    checked={rolloverAction === 'keep'}
                    onChange={() => setRolloverAction('keep')}
                    className="mt-0.5 accent-[#3B82F6]"
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-semibold text-text-primary flex items-center gap-1.5">
                      <Archive className="w-3.5 h-3.5 text-amber-400" />
                      Keep in completed sprint
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Leave tasks attached to "{sprint.name}" as incomplete historical items
                    </p>
                  </div>
                </label>
              </div>
            </div>
          ) : (
            <p className="text-xs text-emerald-400 font-mono mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
              All tasks in this sprint have been completed!
            </p>
          )}

          <div className="flex gap-3 justify-end pt-3 border-t border-border-primary">
            <button
              onClick={onCancel}
              className="text-xs font-semibold text-text-muted hover:text-text-primary px-4 py-2 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              Complete Sprint
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
