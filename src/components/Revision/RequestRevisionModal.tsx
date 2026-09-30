import { AlertCircle, CheckSquare, Code, CornerDownLeft, FileText, Square, X } from 'lucide-react';
import React, { useState } from 'react';
import { saveTask } from '../../services/database';
import { appendRevisionBlock } from '../../services/revisionSync';
import type { Task } from '../../types';
import { parseAcceptanceCriteria } from '../DiffViewer/criteria';
import { REVISION_CATEGORIES, type RevisionCategory } from './types';

export interface RequestRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onUpdateTask: (task: Task) => void;
  onRevisionSubmitted?: () => void;
}

export const RequestRevisionModal: React.FC<RequestRevisionModalProps> = ({
  isOpen,
  onClose,
  task,
  onUpdateTask,
  onRevisionSubmitted,
}) => {
  const allCriteria = parseAcceptanceCriteria(task.description);
  // Pre-select criteria that are currently unchecked (failing)
  const initialFailing = allCriteria.filter((c) => !c.completed).map((c) => c.text);

  const [selectedCriteria, setSelectedCriteria] = useState<string[]>(initialFailing);
  const [category, setCategory] = useState<RevisionCategory>('Runtime Error');
  const [observedBehavior, setObservedBehavior] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [errorLogs, setErrorLogs] = useState('');
  const [remediationGuidance, setRemediationGuidance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAttempt = (task.revisionCount ?? 0) + 1;

  const toggleCriterion = (text: string) => {
    setSelectedCriteria((prev) =>
      prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!observedBehavior.trim() || !expectedBehavior.trim()) {
      setError('Please provide both observed and expected behavior.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const newRevisionCount = currentAttempt;
      const isEscalated = newRevisionCount >= 3;

      const newDescription = appendRevisionBlock(task.description || '', {
        attemptNumber: newRevisionCount,
        timestamp: now,
        author: 'Human Reviewer',
        category,
        failingCriteria: selectedCriteria,
        observedBehavior: observedBehavior.trim(),
        expectedBehavior: expectedBehavior.trim(),
        errorLogs: errorLogs.trim() || undefined,
        remediationGuidance: remediationGuidance.trim() || undefined,
      });

      const updatedTask: Task = {
        ...task,
        status: 'To Do',
        completed: false,
        revisionCount: newRevisionCount,
        lastRevisionAt: now,
        escalated: isEscalated ? true : task.escalated,
        description: newDescription,
      };

      await saveTask(updatedTask);
      onUpdateTask(updatedTask);
      onRevisionSubmitted?.();
      onClose();
    } catch (err: unknown) {
      console.error('Failed to submit revision request:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit revision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-surface-primary border border-border-primary rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary bg-surface-secondary/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text-primary font-mono">
                  Request Revision (Attempt {currentAttempt})
                </h2>
                {currentAttempt >= 3 && (
                  <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Trips Circuit Breaker
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">
                {currentAttempt >= 3 ? (
                  'Submitting will escalate task to human and bar autonomous agents'
                ) : (
                  <>
                    Task will revert to <span className="font-mono text-amber-400">To Do</span> with
                    structured failure context
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-secondary rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin"
        >
          {error && (
            <div className="p-3 text-xs bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 font-mono">
              {error}
            </div>
          )}

          {/* Failing Criteria Selection */}
          {allCriteria.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
                Failing Acceptance Criteria
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto bg-surface-secondary/40 p-2.5 rounded-xl border border-border-primary/60">
                {allCriteria.map((c, idx) => {
                  const isChecked = selectedCriteria.includes(c.text);
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => toggleCriterion(c.text)}
                      className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left text-xs transition-colors cursor-pointer border ${
                        isChecked
                          ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                          : 'bg-surface-primary/40 border-border-primary/40 text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <Square className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                      )}
                      <span className="font-mono text-[11px] leading-relaxed flex-1">{c.text}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Selector */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
              Failure Category
            </label>
            <div className="flex flex-wrap gap-2">
              {REVISION_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer border ${
                    category === cat
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold shadow'
                      : 'bg-surface-secondary border-border-primary text-text-muted hover:text-text-primary'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Observed Behavior */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Observed Behavior</span>
              <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={observedBehavior}
              onChange={(e) => setObservedBehavior(e.target.value)}
              placeholder="Describe what actually happened (e.g. TypeError thrown on click, button does not trigger refresh)..."
              className="w-full bg-surface-secondary border border-border-primary text-xs text-text-primary rounded-xl p-3 focus:outline-none focus:border-amber-400 font-mono placeholder:text-text-muted/50 leading-relaxed resize-none"
            />
          </div>

          {/* Expected Behavior */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
              <CornerDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Expected Behavior</span>
              <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={expectedBehavior}
              onChange={(e) => setExpectedBehavior(e.target.value)}
              placeholder="Describe the expected outcome according to acceptance criteria..."
              className="w-full bg-surface-secondary border border-border-primary text-xs text-text-primary rounded-xl p-3 focus:outline-none focus:border-emerald-400 font-mono placeholder:text-text-muted/50 leading-relaxed resize-none"
            />
          </div>

          {/* Monospace Error Trace / Logs */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
              <Code className="w-3.5 h-3.5 text-blue-400" />
              <span>Terminal Error Trace / Logs (Optional)</span>
            </label>
            <textarea
              rows={4}
              value={errorLogs}
              onChange={(e) => setErrorLogs(e.target.value)}
              placeholder="Paste terminal stack trace, failed assertions, or console error messages..."
              className="w-full bg-[#050505] border border-border-primary/80 text-xs text-text-primary rounded-xl p-3 focus:outline-none focus:border-blue-400 font-mono text-[11px] placeholder:text-text-muted/40 leading-relaxed resize-none"
            />
          </div>

          {/* Remediation Guidance */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
              Remediation Guidance (Optional Hint for Agent)
            </label>
            <input
              type="text"
              value={remediationGuidance}
              onChange={(e) => setRemediationGuidance(e.target.value)}
              placeholder="e.g. Check auth interceptor loop flag in auth.ts"
              className="w-full bg-surface-secondary border border-border-primary text-xs text-text-primary rounded-xl px-3 py-2.5 focus:outline-none focus:border-white font-mono placeholder:text-text-muted/50"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border-primary">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !observedBehavior.trim() || !expectedBehavior.trim()}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              {isSubmitting ? 'Submitting Revision...' : `Submit Revision & Revert to To Do`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
