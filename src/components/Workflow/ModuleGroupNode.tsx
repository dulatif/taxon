import type { NodeProps } from '@xyflow/react';
import { CheckCircle2, Layers } from 'lucide-react';
import React, { memo } from 'react';

export interface ModuleGroupNodeData {
  title: string;
  totalTasks: number;
  completedTasks: number;
  [key: string]: unknown;
}

export const ModuleGroupNode: React.FC<NodeProps> = memo(({ data }) => {
  const nodeData = data as unknown as ModuleGroupNodeData;
  const { title, totalTasks, completedTasks } = nodeData;

  const isAllCompleted = totalTasks > 0 && completedTasks === totalTasks;

  return (
    <div className="w-full h-full rounded-2xl border border-dashed border-border/80 bg-muted/20 dark:bg-muted/10 p-3 pointer-events-none relative transition-all duration-300">
      {/* Header bar positioned top-left */}
      <div className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/90 backdrop-blur-md border border-border/60 shadow-xs">
        <Layers className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-foreground tracking-tight">{title}</span>

        <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border/60 text-[10px] text-muted-foreground font-medium">
          {isAllCompleted ? (
            <span className="flex items-center gap-1 text-emerald-500 font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              All Completed
            </span>
          ) : (
            <span>
              {completedTasks}/{totalTasks} done
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

ModuleGroupNode.displayName = 'ModuleGroupNode';
