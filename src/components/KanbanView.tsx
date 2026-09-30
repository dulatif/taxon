import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { CheckCircle, MoreHorizontal, Plus } from 'lucide-react';
import { Fragment, useState } from 'react';
import { sortTasksWithQueueElevation } from '../hooks/useTaskActions';
import type { Project, Sprint, Task } from '../types';

interface KanbanViewProps {
  projects: Project[];
  tasks: Task[];
  sprints?: Sprint[];
  onMoveTaskStatus: (taskId: string, newStatus: Task['status']) => void;
  onAddTaskToProject: (
    taskTitle: string,
    projectId: string,
    sprintId?: string | null,
  ) => Task | void;
  onSelectTask?: (task: Task) => void;
  onAssignTaskToSprint?: (taskId: string, sprintId: string | null) => void;
  hideToolbar?: boolean;
}

export default function KanbanView({
  projects,
  tasks,
  sprints,
  onMoveTaskStatus,
  onAddTaskToProject,
  onSelectTask,
  onAssignTaskToSprint,
  hideToolbar,
}: KanbanViewProps) {
  // Columns state
  const [columns, setColumns] = useState<string[]>([
    'To Do',
    'In Progress',
    'Need to Test',
    'Done',
  ]);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [selectedSprintId, setSelectedSprintId] = useState<string | 'all' | 'backlog'>('all');
  const [isAddingTask, setIsAddingTask] = useState<string | null>(null); // column name
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Drag and drop local trackers
  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    if (
      destination.droppableId === 'To Do' ||
      destination.droppableId === 'In Progress' ||
      destination.droppableId === 'Need to Test' ||
      destination.droppableId === 'Done'
    ) {
      onMoveTaskStatus(draggableId, destination.droppableId as Task['status']);
    }
  };

  // Filter tasks belonging strictly to active projects
  const activeTasksAll = tasks.filter(
    (t) => t.projectId === selectedProjectId || (!t.projectId && selectedProjectId === 'all'),
  );
  const activeTasks = activeTasksAll.filter((t) => {
    if (selectedSprintId === 'all') return true;
    if (selectedSprintId === 'backlog') return !t.sprintId;
    return t.sprintId === selectedSprintId;
  });

  const handleAddTaskSubmit = (_columnName: string) => {
    if (!newTaskTitle.trim()) return;
    const targetSprintId =
      selectedSprintId !== 'all' && selectedSprintId !== 'backlog' ? selectedSprintId : null;
    const createdTask = onAddTaskToProject(newTaskTitle, selectedProjectId, targetSprintId);
    if (
      createdTask &&
      targetSprintId &&
      (!createdTask.sprintId || createdTask.sprintId !== targetSprintId) &&
      onAssignTaskToSprint
    ) {
      onAssignTaskToSprint(createdTask.id, targetSprintId);
    }
    setNewTaskTitle('');
    setIsAddingTask(null);
  };

  const handleAddColumnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;
    setColumns([...columns, newColumnName.trim()]);
    setNewColumnName('');
    setIsAddingColumn(false);
  };

  // Styles maps for priority classes
  const getPriorityClass = (priority: Task['priority']) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'High':
        return 'bg-orange-500/10 text-orange-500 border border-orange-500/20';
      case 'Medium':
        return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'Low':
        return 'bg-surface-secondary text-text-muted border border-border-primary/50';
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-primary rounded-xl overflow-hidden min-h-[500px]">
      {/* Scope Board Filter Row */}
      {!hideToolbar && (
        <div className="flex items-center justify-between px-6 py-4 bg-surface-secondary border border-border-primary rounded-t-xl gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">
                scope:
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedSprintId('all');
                }}
                className="bg-surface-elevated border border-border-primary text-xs text-text-primary rounded-lg px-3 py-1.5 focus:border-border-primary/80 focus:outline-none focus:ring-0 max-w-[220px]"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="all">All Standalone Tasks</option>
              </select>
            </div>

            {sprints && selectedProjectId && selectedProjectId !== 'all' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider font-mono">
                  sprint:
                </span>
                <select
                  value={selectedSprintId}
                  onChange={(e) => setSelectedSprintId(e.target.value)}
                  className="bg-surface-elevated border border-border-primary text-xs text-text-primary rounded-lg px-3 py-1.5 focus:border-border-primary/80 focus:outline-none focus:ring-0 max-w-[200px]"
                >
                  <option value="all">All Sprints</option>
                  <option value="backlog">Backlog (Unassigned)</option>
                  {sprints
                    .filter((s) => s.projectId === selectedProjectId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                </select>
              </div>
            )}
          </div>

          <span className="text-[10px] text-text-muted font-mono uppercase bg-surface-elevated px-2 py-1 rounded border border-border-primary/80">
            OLED BOARD STICKY
          </span>
        </div>
      )}

      {/* Main Board Columns Frame */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div
          className={`flex-1 overflow-x-auto p-4 flex gap-6 bg-surface-primary border-x border-b border-border-primary min-h-[620px] ${hideToolbar ? 'rounded-xl border-t' : 'rounded-b-xl'}`}
        >
          {columns.map((colName) => {
            // Sync database status filter
            const filteredTasks = activeTasks.filter(
              (t) => t.status === colName || (colName === 'Done' && t.completed),
            );
            const colTasks =
              colName === 'To Do' ? sortTasksWithQueueElevation(filteredTasks) : filteredTasks;
            const countVal = colTasks.length;

            return (
              <Fragment key={colName}>
                <Droppable droppableId={colName}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`w-80 shrink-0 flex flex-col h-full bg-surface-secondary/40 rounded-xl transition-colors ${
                        snapshot.isDraggingOver
                          ? 'bg-surface-secondary/80 ring-1 ring-border-primary'
                          : ''
                      }`}
                    >
                      {/* Header Title segment */}
                      <div className="flex items-center justify-between px-2 py-3 border-b border-border-primary/40 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-widest ${colName === 'Done' ? 'text-text-muted' : colName === 'Need to Test' ? 'text-orange-400' : 'text-text-primary'}`}
                          >
                            {colName}
                          </span>
                          <span className="px-1.5 py-0.5 bg-surface-elevated border border-border-primary text-text-muted text-[10px] rounded-sm font-mono font-bold">
                            {countVal}
                          </span>
                        </div>
                        <button
                          aria-label="Column Options"
                          className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Scrollable Tasks Body Container */}
                      <div className="flex-1 overflow-y-auto space-y-3 pb-4 max-h-[580px] scrollbar-thin">
                        {colTasks.length === 0 && !snapshot.isDraggingOver ? (
                          <div className="py-12 text-center text-xs text-text-muted/60 border border-dashed border-border-primary/50 rounded-lg">
                            No active tasks
                          </div>
                        ) : (
                          colTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => onSelectTask?.(task)}
                                  className={`task-card bg-surface-secondary border p-4 transition-all group rounded-lg relative cursor-grab select-none ${
                                    snapshot.isDragging
                                      ? 'border-text-primary ring-2 ring-text-primary/20 z-50'
                                      : colName === 'Need to Test'
                                        ? 'border-orange-500/50 hover:border-orange-400/80 bg-orange-500/5'
                                        : 'border-border-primary hover:border-border-primary/80'
                                  } ${colName === 'Done' && !snapshot.isDragging ? 'opacity-65' : ''}`}
                                >
                                  {/* Task title */}
                                  <h3
                                    className={`text-xs font-medium leading-relaxed text-text-primary ${colName === 'Done' ? 'line-through text-text-muted' : colName === 'Need to Test' ? 'text-orange-400' : ''}`}
                                  >
                                    {task.title}
                                  </h3>

                                  {/* Bottom metadata row: Priority, Time effort/duration, Done indicator */}
                                  <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-border-primary/40">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded-sm uppercase tracking-wider ${getPriorityClass(task.priority)}`}
                                      >
                                        {task.priority || 'Medium'}
                                      </span>
                                      {task.revisionCount !== undefined &&
                                        task.revisionCount > 0 && (
                                          <span className="px-2 py-0.5 text-[9px] font-bold font-mono rounded-sm uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                            Attempt {task.revisionCount + 1}
                                          </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-text-muted text-[10px] font-mono leading-none bg-surface-primary/40 px-1.5 py-0.5 rounded border border-border-primary/40">
                                        {task.duration || '25m'}
                                      </span>
                                      {colName === 'Done' && (
                                        <CheckCircle className="w-3.5 h-3.5 text-text-primary" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}

                        {/* Inline project add task trigger */}
                        {isAddingTask === colName ? (
                          <div className="p-3 bg-surface-secondary border border-border-primary/80 rounded-lg space-y-2 mt-2">
                            <input
                              type="text"
                              className="bg-surface-primary text-text-primary border border-border-primary text-xs rounded p-2 w-full focus:outline-none focus:border-border-primary/80"
                              placeholder="Add task details..."
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddTaskSubmit(colName);
                              }}
                              autoFocus
                            />
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setIsAddingTask(null)}
                                className="text-[10px] text-text-muted hover:text-text-primary cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleAddTaskSubmit(colName)}
                                className="text-[10px] bg-interactive-primary text-interactive-primary-text font-bold px-2.5 py-1 rounded cursor-pointer"
                              >
                                Add Task
                              </button>
                            </div>
                          </div>
                        ) : (
                          selectedProjectId !== 'all' && (
                            <button
                              onClick={() => setIsAddingTask(colName)}
                              className="w-full py-2 mt-2 border border-dashed border-border-primary/50 hover:border-border-primary hover:bg-surface-secondary/50 transition-all rounded-lg flex items-center justify-center gap-1.5 text-xs text-text-muted cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Add Task</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </Droppable>
              </Fragment>
            );
          })}

          {/* Dynamic add column toggle block */}
          {isAddingColumn ? (
            <form
              onSubmit={handleAddColumnSubmit}
              className="w-80 shrink-0 p-4 border border-dashed border-border-primary/80 rounded-xl space-y-3 bg-surface-secondary/40"
            >
              <h3 className="text-xs font-bold text-text-primary uppercase tracking-widest mb-1">
                Add Segment Column
              </h3>
              <input
                type="text"
                className="bg-surface-primary text-text-primary border border-border-primary text-xs rounded p-2.5 w-full focus:ring-0 focus:border-border-primary/80"
                placeholder="Column Name (e.g., Testing)"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                required
                autoFocus
              />
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddingColumn(false)}
                  className="text-xs text-text-muted hover:text-text-primary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs bg-interactive-primary text-interactive-primary-text font-bold px-3 py-1.5 rounded cursor-pointer"
                >
                  Add Column
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="w-80 shrink-0 border border-dashed border-border-primary hover:border-border-primary/80 rounded-xl flex flex-col items-center justify-center text-text-muted hover:text-text-primary transition-all group cursor-pointer"
            >
              <Plus className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest text-text-muted font-sans">
                Add Column
              </span>
            </button>
          )}
        </div>
      </DragDropContext>
    </div>
  );
}
