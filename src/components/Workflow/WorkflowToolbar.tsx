import {
  Bot,
  Filter,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Scan,
  Search,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React from 'react';
import type { Sprint } from '../../types';

export interface WorkflowToolbarProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onTidyLayout?: () => void;
  isTheaterMode?: boolean;
  onToggleTheaterMode?: () => void;
  moduleGroups: string[];
  selectedGroup: string | null;
  onSelectGroup: (group: string | null) => void;
  sprints?: Sprint[];
  selectedSprintId?: string | 'all' | 'backlog';
  onSelectSprint?: (sprintId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLive: boolean;
  activeTaskId: string | null;
  agentName?: string;
  totalTasksCount: number;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  onZoomIn,
  onZoomOut,
  onFitView,
  onTidyLayout,
  isTheaterMode,
  onToggleTheaterMode,
  moduleGroups,
  selectedGroup,
  onSelectGroup,
  sprints = [],
  selectedSprintId = 'backlog',
  onSelectSprint,
  searchQuery,
  onSearchChange,
  isLive,
  activeTaskId,
  agentName,
  totalTasksCount,
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
      {/* Left controls: Search & Filter */}
      <div className="flex items-center gap-2 pointer-events-auto bg-card/90 backdrop-blur-md p-1.5 rounded-xl border border-border/70 shadow-lg">
        {/* Search */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Find in workflow..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-44 pl-8 pr-3 py-1 text-xs rounded-lg bg-muted/40 border border-transparent focus:border-primary/40 focus:bg-background focus:outline-hidden transition-all text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Sprint Filter */}
        {sprints && sprints.length > 0 && onSelectSprint && (
          <div className="flex items-center gap-1 pl-1 border-l border-border/60">
            <Layers className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            <select
              value={
                selectedSprintId && selectedSprintId !== 'all'
                  ? selectedSprintId
                  : sprints[0]?.id || 'backlog'
              }
              onChange={(e) => onSelectSprint(e.target.value)}
              className="text-xs bg-muted/40 hover:bg-muted/70 text-foreground py-1 px-2 rounded-lg border border-transparent focus:border-primary/40 focus:outline-hidden cursor-pointer transition-colors max-w-[180px] truncate"
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.status === 'Active' ? '🟢 ' : ''}
                  {s.name}
                </option>
              ))}
              <option value="backlog">Backlog Only</option>
            </select>
          </div>
        )}

        {/* Module Filter */}
        {moduleGroups.length > 0 && (
          <div className="flex items-center gap-1 pl-1 border-l border-border/60">
            <Filter className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            <select
              value={selectedGroup || ''}
              onChange={(e) => onSelectGroup(e.target.value || null)}
              className="text-xs bg-muted/40 hover:bg-muted/70 text-foreground py-1 px-2 rounded-lg border border-transparent focus:border-primary/40 focus:outline-hidden cursor-pointer transition-colors"
            >
              <option value="">All Modules ({moduleGroups.length})</option>
              {moduleGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Center / Agent Status Pill */}
      {isLive && activeTaskId ? (
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/80 backdrop-blur-md border border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)] animate-pulse">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
          </span>
          <Bot className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs font-semibold text-purple-200">
            {agentName ? `${agentName} Active:` : 'AI Active:'}
          </span>
          <span className="text-xs font-mono font-bold text-purple-300">
            {(activeTaskId || '').slice(-6)}
          </span>
        </div>
      ) : (
        <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground bg-card/70 backdrop-blur-md px-3 py-1 rounded-full border border-border/50 shadow-xs">
          <Sparkles className="w-3 h-3 text-muted-foreground" />
          <span>{totalTasksCount} tasks in DAG</span>
        </div>
      )}

      {/* Right controls: Zoom & Fit View */}
      <div className="flex items-center gap-1 pointer-events-auto bg-card/90 backdrop-blur-md p-1 rounded-xl border border-border/70 shadow-lg">
        <button
          type="button"
          onClick={onZoomIn}
          title="Zoom In"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          title="Zoom Out"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-border/60 mx-0.5" />
        <button
          type="button"
          onClick={onFitView}
          title="Fit View"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <Scan className="w-4 h-4" />
        </button>
        {onToggleTheaterMode && (
          <>
            <div className="h-4 w-px bg-border/60 mx-0.5" />
            <button
              type="button"
              onClick={onToggleTheaterMode}
              title={isTheaterMode ? 'Exit Full Screen' : 'Full Screen'}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            >
              {isTheaterMode ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
          </>
        )}
        {onTidyLayout && (
          <>
            <div className="h-4 w-px bg-border/60 mx-0.5" />
            <button
              type="button"
              onClick={onTidyLayout}
              title="Tidy Graph Layout"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors flex items-center gap-1 text-xs px-2"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Tidy</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
