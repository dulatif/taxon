import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { GitFork, Plus } from 'lucide-react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useAgentHeartbeat } from '../../hooks/useAgentHeartbeat';
import type { Project, Sprint, Task } from '../../types';
import { ModuleGroupNode } from './ModuleGroupNode';
import { TaskNode } from './TaskNode';
import { WorkflowToolbar } from './WorkflowToolbar';
import { buildTaskIdLookup, getWorkflowElements } from './workflowLayout';

const nodeTypes = {
  taskNode: TaskNode,
  moduleGroup: ModuleGroupNode,
};

interface WorkflowCanvasProps {
  project: Project;
  tasks: Task[];
  sprints?: Sprint[];
  selectedSprintId?: string | 'all' | 'backlog';
  onSelectSprint?: (sprintId: string) => void;
  onSelectTask?: (task: Task) => void;
  onAddTask?: () => void;
  onAutoSync?: () => Promise<void>;
}

const WorkflowCanvas: React.FC<WorkflowCanvasProps> = memo(
  ({
    project,
    tasks,
    sprints = [],
    selectedSprintId: externalSprintId,
    onSelectSprint: externalSelectSprint,
    onSelectTask,
    onAddTask,
    onAutoSync,
  }) => {
    const { zoomIn, zoomOut, fitView } = useReactFlow();
    const heartbeat = useAgentHeartbeat(project.vaultPath);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [internalSprintId, setInternalSprintId] = useState<string | 'all' | 'backlog'>('all');

    const currentSprintId = externalSprintId !== undefined ? externalSprintId : internalSprintId;
    const handleSelectSprint = useCallback(
      (id: string) => {
        if (externalSelectSprint) {
          externalSelectSprint(id);
        } else {
          setInternalSprintId(id);
        }
      },
      [externalSelectSprint],
    );

    // Ref-based auto-sync to avoid re-trigger loops on tasks state update
    const onAutoSyncRef = React.useRef(onAutoSync);
    React.useEffect(() => {
      onAutoSyncRef.current = onAutoSync;
    }, [onAutoSync]);

    const prevFocusRef = React.useRef<string | null>(null);

    React.useEffect(() => {
      if (heartbeat.isLive && heartbeat.activeTaskId) {
        const focusKey = `${heartbeat.activeTaskId}_${heartbeat.timestamp || ''}`;
        if (prevFocusRef.current !== focusKey) {
          prevFocusRef.current = focusKey;
          onAutoSyncRef.current?.();
        }
      }
    }, [heartbeat.isLive, heartbeat.activeTaskId, heartbeat.timestamp]);

    // Get unique module groups for filtering
    const moduleGroups = useMemo(() => {
      const groups = new Set<string>();
      for (const t of tasks) {
        if (!t.archived && t.moduleGroup?.trim()) {
          groups.add(t.moduleGroup.trim());
        }
      }
      return Array.from(groups).sort();
    }, [tasks]);

    // Filter tasks based on sprint, module group, and search query
    const filteredTasks = useMemo(() => {
      let list = tasks.filter((t) => !t.archived);

      // Filter by sprint if specified
      if (currentSprintId && currentSprintId !== 'all') {
        const lookup = buildTaskIdLookup(list);
        const allTaskMap = new Map(list.map((t) => [t.id, t]));
        const includedIds = new Set<string>();

        for (const t of list) {
          const matchesSprint =
            currentSprintId === 'backlog' ? !t.sprintId : t.sprintId === currentSprintId;
          if (matchesSprint) {
            includedIds.add(t.id);
            // Include dependent upstream tasks to keep DAG layout intact
            if (t.dependsOn && Array.isArray(t.dependsOn)) {
              for (const dep of t.dependsOn) {
                const resolvedId = lookup.get(dep);
                if (resolvedId && allTaskMap.has(resolvedId)) {
                  includedIds.add(resolvedId);
                }
              }
            }
          }
        }

        list = list.filter((t) => includedIds.has(t.id));
      }

      if (selectedGroup) {
        list = list.filter((t) => (t.moduleGroup?.trim() || 'Ungrouped') === selectedGroup);
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        list = list.filter(
          (t) =>
            t.title.toLowerCase().includes(q) ||
            t.id.toLowerCase().includes(q) ||
            t.moduleGroup?.toLowerCase().includes(q),
        );
      }

      return list;
    }, [tasks, currentSprintId, selectedGroup, searchQuery]);

    // Compute DAG nodes & edges
    const { nodes, edges } = useMemo(() => {
      return getWorkflowElements(filteredTasks, {
        activeTaskId: heartbeat.isLive ? heartbeat.activeTaskId : null,
        nextTaskIds: heartbeat.isLive ? heartbeat.nextTaskIds : [],
        onSelectTask,
      });
    }, [
      filteredTasks,
      heartbeat.isLive,
      heartbeat.activeTaskId,
      heartbeat.nextTaskIds,
      onSelectTask,
    ]);

    // Smooth initial viewport fit without jarring resets during live node updates
    const initialFitDone = React.useRef(false);
    React.useEffect(() => {
      if (nodes.length > 0 && !initialFitDone.current) {
        initialFitDone.current = true;
        const timer = setTimeout(() => {
          fitView({ padding: 0.2, duration: 400 });
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [nodes.length, fitView]);

    const handleFitView = useCallback(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, [fitView]);

    if (tasks.filter((t) => !t.archived).length === 0) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center select-none bg-background/50">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 text-primary shadow-inner">
            <GitFork className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No Workflow Tasks Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-4">
            Tasks in this project will appear here as an interconnected workflow DAG graph.
          </p>
          {onAddTask && (
            <button
              onClick={onAddTask}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Task
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="w-full h-full relative overflow-hidden bg-background">
        <WorkflowToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGroup={selectedGroup}
          onSelectGroup={setSelectedGroup}
          moduleGroups={moduleGroups}
          sprints={sprints}
          selectedSprintId={currentSprintId}
          onSelectSprint={handleSelectSprint}
          isLive={heartbeat.isLive}
          activeTaskId={heartbeat.activeTaskId}
          agentName={heartbeat.agentName}
          onZoomIn={() => zoomIn({ duration: 300 })}
          onZoomOut={() => zoomOut({ duration: 300 })}
          onFitView={handleFitView}
          totalTasksCount={tasks.filter((t) => !t.archived).length}
        />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          defaultViewport={{ x: 50, y: 50, zoom: 0.9 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="bg-dot-pattern"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="var(--color-border, #334155)"
            className="opacity-40"
          />
          <Controls showInteractive={false} className="!hidden" />
        </ReactFlow>
      </div>
    );
  },
);

WorkflowCanvas.displayName = 'WorkflowCanvas';

export interface WorkflowViewProps {
  project: Project;
  tasks: Task[];
  sprints?: Sprint[];
  selectedSprintId?: string | 'all' | 'backlog';
  onSelectSprint?: (sprintId: string) => void;
  onSelectTask?: (task: Task) => void;
  onAddTask?: () => void;
  onAutoSync?: () => Promise<void>;
  className?: string;
}

export const WorkflowView: React.FC<WorkflowViewProps> = ({
  project,
  tasks,
  sprints = [],
  selectedSprintId,
  onSelectSprint,
  onSelectTask,
  onAddTask,
  onAutoSync,
  className = '',
}) => {
  return (
    <div className={`w-full h-full relative ${className}`}>
      <ReactFlowProvider>
        <WorkflowCanvas
          project={project}
          tasks={tasks}
          sprints={sprints}
          selectedSprintId={selectedSprintId}
          onSelectSprint={onSelectSprint}
          onSelectTask={onSelectTask}
          onAddTask={onAddTask}
          onAutoSync={onAutoSync}
        />
      </ReactFlowProvider>
    </div>
  );
};
