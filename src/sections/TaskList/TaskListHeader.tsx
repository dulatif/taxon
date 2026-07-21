import { ChevronsUpDown, Folder } from 'lucide-react';

interface TaskListHeaderProps {
  title: string;
  isSimpleView: boolean;
  groupByProject: boolean;
  allExpanded: boolean;
  filteredTasksCount: number;
  totalTasksCount: number;
  toggleAllGroups: () => void;
  setGroupByProject: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function TaskListHeader({
  title,
  isSimpleView,
  groupByProject,
  allExpanded,
  filteredTasksCount,
  totalTasksCount,
  toggleAllGroups,
  setGroupByProject,
}: TaskListHeaderProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-primary bg-surface-secondary">
      <h2 className="text-sm font-bold uppercase tracking-wider text-text-primary font-mono leading-none">
        {title}
      </h2>
      <div className="flex items-center gap-2">
        {/* Expand / Collapse all — only shown when grouped */}
        {!isSimpleView && groupByProject && (
          <button
            onClick={toggleAllGroups}
            title={allExpanded ? 'Collapse all groups' : 'Expand all groups'}
            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition-all cursor-pointer ${
              allExpanded
                ? 'bg-interactive-primary text-interactive-primary-text border-interactive-primary'
                : 'bg-transparent border-border-primary text-text-muted hover:text-text-primary hover:border-border-focus'
            }`}
          >
            <ChevronsUpDown className="w-3 h-3" />
            {allExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        )}
        {/* Group toggle */}
        {!isSimpleView && (
          <button
            onClick={() => setGroupByProject((g) => !g)}
            title={groupByProject ? 'Switch to flat list' : 'Group by project'}
            className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition-all cursor-pointer ${
              groupByProject
                ? 'bg-interactive-primary text-interactive-primary-text border-interactive-primary'
                : 'bg-transparent border-border-primary text-text-muted hover:text-text-primary hover:border-border-focus'
            }`}
          >
            <Folder className="w-3 h-3" />
            {groupByProject ? 'Grouped' : 'Flat'}
          </button>
        )}
        <span className="text-[10px] font-mono font-bold bg-surface-primary border border-border-primary text-text-muted px-2 py-0.5 rounded">
          {filteredTasksCount} / {totalTasksCount} Tasks
        </span>
      </div>
    </div>
  );
}
