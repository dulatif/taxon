import { Check, CheckCircle2, Circle, GitCommit, Loader2, RotateCcw } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { Task } from '../../types';
import { RequestRevisionModal } from '../Revision/RequestRevisionModal';
import { type CriterionItem, parseAcceptanceCriteria, updateAcceptanceCriterion } from './criteria';

interface AcceptanceChecklistBarProps {
  task: Task;
  projectPath: string;
  workspacePath?: string;
  onUpdateTask: (task: Task) => void;
  onApproveSuccess?: () => void;
}

export const AcceptanceChecklistBar: React.FC<AcceptanceChecklistBarProps> = ({
  task,
  projectPath,
  workspacePath,
  onUpdateTask,
  onApproveSuccess,
}) => {
  const [shouldCommit, setShouldCommit] = useState(true);
  const [isApproving, setIsApproving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);

  const criteria = useMemo(() => {
    return parseAcceptanceCriteria(task.description);
  }, [task.description]);

  const totalCriteria = criteria.length;
  const completedCriteria = criteria.filter((c) => c.completed).length;
  const isAllApproved = totalCriteria === 0 || completedCriteria === totalCriteria;

  const handleToggleCriterion = (item: CriterionItem) => {
    if (!task.description) return;
    const newDesc = updateAcceptanceCriterion(task.description, item.text, !item.completed);
    onUpdateTask({
      ...task,
      description: newDesc,
    });
  };

  const handleApprove = async () => {
    if (!isAllApproved || isApproving) return;
    setIsApproving(true);
    setErrorMsg(null);

    try {
      if (shouldCommit) {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('commit_approved_task', {
          projectPath,
          workspacePath: workspacePath || task.workspacePath || null,
          taskId: task.id,
          title: task.title,
        });
      }

      onUpdateTask({
        ...task,
        status: 'Done',
        completed: true,
      });

      onApproveSuccess?.();
    } catch (err: unknown) {
      console.error('Approval commit failed:', err);
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="bg-[#050505] border-t border-border-primary/80 px-4 py-3 space-y-3">
      {/* Criteria Checklist Stream */}
      {criteria.length > 0 && (
        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
          <div className="flex items-center justify-between text-[11px] font-mono text-text-muted mb-1">
            <span>Acceptance Verification:</span>
            <span
              className={
                isAllApproved ? 'text-emerald-400 font-bold' : 'text-amber-400 font-semibold'
              }
            >
              {completedCriteria}/{totalCriteria} verified (
              {totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 100}%)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {criteria.map((item) => (
              <button
                key={item.index}
                type="button"
                onClick={() => handleToggleCriterion(item)}
                className={`flex items-start gap-2 p-2 rounded-lg text-left text-xs transition-colors cursor-pointer border ${
                  item.completed
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                    : 'bg-surface-primary/40 border-border-primary/60 text-text-secondary hover:text-text-primary'
                }`}
              >
                {item.completed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                )}
                <span className="font-mono text-[11px] leading-tight flex-1">{item.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="text-xs text-rose-400 bg-rose-950/30 border border-rose-500/40 p-2 rounded-lg font-mono">
          Commit Error: {errorMsg}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border-primary/40">
        <label className="flex items-center gap-2 text-xs font-mono text-text-secondary select-none cursor-pointer">
          <input
            type="checkbox"
            checked={shouldCommit}
            onChange={(e) => setShouldCommit(e.target.checked)}
            className="rounded border-border-primary bg-surface-primary text-blue-500 focus:ring-0 cursor-pointer"
          />
          <GitCommit className="w-3.5 h-3.5 text-text-muted" />
          <span>
            Commit changes (`git commit -m "feat(TASK-{task.id}): {task.title}"`)
          </span>
        </label>

        <div className="flex items-center gap-2">
          {task.status === 'Need to Test' && (
            <button
              type="button"
              onClick={() => setIsRevisionModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Request Revision</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleApprove}
            disabled={!isAllApproved || isApproving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-xl hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-900/20 transition-all cursor-pointer font-mono"
          >
            {isApproving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Committing & Approving...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Approve & Mark Done</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isRevisionModalOpen && (
        <RequestRevisionModal
          isOpen={isRevisionModalOpen}
          onClose={() => setIsRevisionModalOpen(false)}
          task={task}
          onUpdateTask={onUpdateTask}
        />
      )}
    </div>
  );
};
