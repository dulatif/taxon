import { ChevronDown, ChevronUp, Plus, Rocket } from 'lucide-react';
import type { Sprint } from '../../types';

interface SprintHeaderProps {
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  activeSprint?: Sprint;
  totalSprints: number;
  onNewSprint: () => void;
}

export default function SprintHeader({
  isExpanded,
  setIsExpanded,
  activeSprint,
  totalSprints,
  onNewSprint,
}: SprintHeaderProps) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 bg-surface-secondary/60 border-b border-border-primary/80 transition-all ${
        isExpanded ? 'rounded-t-xl' : 'rounded-xl border-b-0'
      }`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors cursor-pointer group"
      >
        <div className="w-6 h-6 bg-surface-primary group-hover:bg-interactive-primary/20 rounded flex items-center justify-center transition-colors">
          <Rocket className="w-3.5 h-3.5 text-interactive-primary" />
        </div>
        <span>Sprints & Iterations</span>
        <span className="ml-1 px-2 py-0.5 rounded text-[10px] bg-surface-primary text-text-primary border border-border-primary">
          {activeSprint ? `Active: ${activeSprint.name}` : `${totalSprints} Sprints`}
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 ml-1 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 ml-1 text-text-muted" />
        )}
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={onNewSprint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-interactive-primary/10 hover:bg-interactive-primary/20 text-interactive-primary border border-interactive-primary/30 text-xs font-semibold font-mono transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Sprint</span>
        </button>
      </div>
    </div>
  );
}
