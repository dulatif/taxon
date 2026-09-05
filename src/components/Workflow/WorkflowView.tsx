import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  BezierEdge,
  Controls,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
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
import { WorkflowSidebar } from './WorkflowSidebar';
import { WorkflowToolbar } from './WorkflowToolbar';
import { buildTaskIdLookup, getSmartEdgeHandles, getWorkflowElements } from './workflowLayout';

const nodeTypes = {
  taskNode: TaskNode,
  moduleGroup: ModuleGroupNode,
};

const edgeTypes = {
  bezier: BezierEdge,
};

const defaultEdgeOptions = {
  type: 'bezier',
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
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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

    // Filter sprints to current project
    const projectSprints = useMemo(() => {
      if (!project?.id) return sprints;
      return sprints.filter((s) => s.projectId === project.id);
    }, [sprints, project.id]);

    // Reset selected sprint if it does not belong to the current project
    React.useEffect(() => {
      if (
        currentSprintId &&
        currentSprintId !== 'all' &&
        currentSprintId !== 'backlog' &&
        projectSprints.length > 0 &&
        !projectSprints.some((s) => s.id === currentSprintId)
      ) {
        queueMicrotask(() => {
          handleSelectSprint('all');
        });
      }
    }, [currentSprintId, projectSprints, handleSelectSprint]);

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

    const handleNodeTaskSelect = useCallback((task: Task) => {
      setSelectedTaskId(task.id);
    }, []);

    const selectedTask = useMemo(() => {
      if (!selectedTaskId) return null;
      return tasks.find((t) => t.id === selectedTaskId) || null;
    }, [tasks, selectedTaskId]);

    const [layoutKey, setLayoutKey] = useState(0);

    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const onNodesChange = useCallback((changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    }, []);

    const onEdgesChange = useCallback((changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    }, []);

    // Compute base DAG layout elements
    const computedElements = useMemo(() => {
      void layoutKey;
      return getWorkflowElements(filteredTasks, {
        activeTaskId: heartbeat.isLive ? heartbeat.activeTaskId : null,
        nextTaskIds: heartbeat.isLive ? heartbeat.nextTaskIds : [],
        selectedTaskId,
        onSelectTask: handleNodeTaskSelect,
      });
    }, [
      filteredTasks,
      heartbeat.isLive,
      heartbeat.activeTaskId,
      heartbeat.nextTaskIds,
      selectedTaskId,
      handleNodeTaskSelect,
      layoutKey,
    ]);

    // Sync computed elements with internal state while preserving user-dragged node positions
    const prevLayoutKeyRef = React.useRef(layoutKey);
    const prevSprintIdRef = React.useRef(currentSprintId);
    const prevGroupFilterRef = React.useRef(selectedGroup);
    const prevSearchQueryRef = React.useRef(searchQuery);

    React.useEffect(() => {
      const isLayoutOrFilterReset =
        prevLayoutKeyRef.current !== layoutKey ||
        prevSprintIdRef.current !== currentSprintId ||
        prevGroupFilterRef.current !== selectedGroup ||
        prevSearchQueryRef.current !== searchQuery;

      prevLayoutKeyRef.current = layoutKey;
      prevSprintIdRef.current = currentSprintId;
      prevGroupFilterRef.current = selectedGroup;
      prevSearchQueryRef.current = searchQuery;

      setNodes((currentNodes) => {
        if (isLayoutOrFilterReset || currentNodes.length === 0) {
          return computedElements.nodes;
        }
        const currentPosMap = new Map(currentNodes.map((n) => [n.id, n.position]));
        return computedElements.nodes.map((node) => {
          const existingPos = currentPosMap.get(node.id);
          if (existingPos) {
            return { ...node, position: existingPos };
          }
          return node;
        });
      });

      setEdges(computedElements.edges);
    }, [computedElements, layoutKey, currentSprintId, selectedGroup, searchQuery]);

    // Dynamically assign smart connection handles based on current node positions
    const smartEdges = useMemo(() => {
      if (nodes.length === 0 || edges.length === 0) return edges;
      const posMap = new Map(nodes.map((n) => [n.id, n.position]));
      return edges.map((edge) => {
        const sPos = posMap.get(edge.source);
        const tPos = posMap.get(edge.target);
        if (!sPos || !tPos) return { ...edge, type: 'bezier' };
        const { sourceHandle, targetHandle } = getSmartEdgeHandles(sPos, tPos);
        if (
          edge.sourceHandle === sourceHandle &&
          edge.targetHandle === targetHandle &&
          edge.type === 'bezier'
        ) {
          return edge;
        }
        return { ...edge, sourceHandle, targetHandle, type: 'bezier' };
      });
    }, [nodes, edges]);

    // Smooth viewport fit on initial load or when sprint selection changes
    const initialFitDone = React.useRef(false);
    const prevFitSprintRef = React.useRef(currentSprintId);
    React.useEffect(() => {
      if (nodes.length > 0) {
        if (!initialFitDone.current || prevFitSprintRef.current !== currentSprintId) {
          initialFitDone.current = true;
          prevFitSprintRef.current = currentSprintId;
          const timer = setTimeout(() => {
            fitView({ padding: 0.2, duration: 400 });
          }, 100);
          return () => clearTimeout(timer);
        }
      }
    }, [currentSprintId, fitView, nodes.length]);

    const handleFitView = useCallback(() => {
      fitView({ padding: 0.2, duration: 400 });
    }, [fitView]);

    const handleTidyLayout = useCallback(() => {
      setLayoutKey((k) => k + 1);
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
      }, 100);
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
          sprints={projectSprints}
          selectedSprintId={currentSprintId}
          onSelectSprint={handleSelectSprint}
          isLive={heartbeat.isLive}
          activeTaskId={heartbeat.activeTaskId}
          agentName={heartbeat.agentName}
          onZoomIn={() => zoomIn({ duration: 300 })}
          onZoomOut={() => zoomOut({ duration: 300 })}
          onFitView={handleFitView}
          onTidyLayout={handleTidyLayout}
          totalTasksCount={tasks.filter((t) => !t.archived).length}
        />

        {filteredTasks.length === 0 && (
          <div className="absolute inset-0 z-0 flex flex-col items-center justify-center p-8 text-center select-none bg-background/50">
            <div className="w-14 h-14 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-center mb-3 text-muted-foreground">
              <GitFork className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1">
              No Tasks Match Current Filter
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              {currentSprintId && currentSprintId !== 'all'
                ? 'No tasks found in the selected sprint. Try selecting "All Sprints" or clearing the search/module filter.'
                : 'No tasks found matching your search or module filter.'}
            </p>
          </div>
        )}

        <ReactFlow
          nodes={nodes}
          edges={smartEdges}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={true}
          zoomOnScroll={true}
          onPaneClick={() => setSelectedTaskId(null)}
          onNodeClick={(_event, node) => {
            if (node.type === 'taskNode' && node.data?.task) {
              setSelectedTaskId((node.data.task as Task).id);
            }
          }}
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

        <WorkflowSidebar
          task={selectedTask}
          allTasks={tasks}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTaskId(null)}
          onSelectTask={(t) => setSelectedTaskId(t.id)}
          onEditFullTask={onSelectTask}
        />
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
