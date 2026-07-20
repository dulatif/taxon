import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import {
  CheckCircle,
  CheckSquare,
  Clock,
  MoreHorizontal,
  MoveLeft,
  MoveRight,
  Plus,
  Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import { Project, Sprint, Task } from '../types';

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
}

export default function KanbanView({
  projects,
  tasks,
  sprints,
  onMoveTaskStatus,
  onAddTaskToProject,
  onSelectTask,
  onAssignTaskToSprint,
}: KanbanViewProps) {
  // Columns state
  const [columns, setColumns] = useState<string[]>(['To Do', 'In Progress', 'Done']);
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
      destination.droppableId === 'Done'
    ) {
      onMoveTaskStatus(draggableId, destination.droppableId as Task['status']);
    }
  };

  // Filter tasks belonging strictly to active projects
  const activeProjectIds = projects.filter((p) => p.category !== 'Completed').map((p) => p.id);
  const activeTasksAll = tasks.filter(
    (t) => t.projectId === selectedProjectId || (!t.projectId && selectedProjectId === 'all'),
  );
  const activeTasks = activeTasksAll.filter((t) => {
    if (selectedSprintId === 'all') return true;
    if (selectedSprintId === 'backlog') return !t.sprintId;
    return t.sprintId === selectedSprintId;
  });

  const handleAddTaskSubmit = (columnName: string) => {
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

  // Move task via button click (excellent touch alternative to drag events)
  const shiftTaskState = (
    taskId: string,
    currentStatus: Task['status'],
    direction: 'left' | 'right',
  ) => {
    const sequence: Task['status'][] = ['To Do', 'In Progress', 'Done'];
    const idx = sequence.indexOf(currentStatus);
    if (direction === 'right' && idx < 2) {
      onMoveTaskStatus(taskId, sequence[idx + 1]);
    } else if (direction === 'left' && idx > 0) {
      onMoveTaskStatus(taskId, sequence[idx - 1]);
    }
  };

  // Styles maps for priority classes
  const getPriorityClass = (priority: Task['priority']) => {
    switch (priority) {
      case 'Critical':
        return 'bg-zinc-100 text-black border border-white';
      case 'High':
        return 'bg-[#201F1F] text-white border border-[#27272A]';
      case 'Medium':
        return 'bg-[#141313] text-[#A1A1AA] border border-[#27272A]/50';
      case 'Low':
        return 'bg-[#0E0E0E] text-[#8E9192] border border-none';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] rounded-xl overflow-hidden min-h-[500px]">
      {/* Scope Board Filter Row */}
      <div className="flex items-center justify-between px-6 py-4 bg-[#0A0A0A] border border-[#27272A] rounded-t-xl gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#8E9192] uppercase tracking-wider font-mono">
              scope:
            </span>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedSprintId('all');
              }}
              className="bg-[#141313] border border-[#27272A] text-xs text-white rounded-lg px-3 py-1.5 focus:border-white focus:outline-none focus:ring-0 max-w-[220px]"
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
              <span className="text-xs font-semibold text-[#8E9192] uppercase tracking-wider font-mono">
                sprint:
              </span>
              <select
                value={selectedSprintId}
                onChange={(e) => setSelectedSprintId(e.target.value as any)}
                className="bg-[#141313] border border-[#27272A] text-xs text-white rounded-lg px-3 py-1.5 focus:border-white focus:outline-none focus:ring-0 max-w-[200px]"
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

        <span className="text-[10px] text-[#A1A1AA] font-mono uppercase bg-[#141313] px-2 py-1 rounded border border-[#27272A]/80">
          OLED BOARD STICKY
        </span>
      </div>

      {/* Main Board Columns Frame */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 overflow-x-auto p-4 flex gap-6 bg-[#000000] border-x border-b border-[#27272A] rounded-b-xl min-h-[450px]">
          {columns.map((colName) => {
            // Sync database status filter
            const colTasks = activeTasks.filter(
              (t) => t.status === colName || (colName === 'Done' && t.completed),
            );
            const countVal = colTasks.length;

            return (
              <React.Fragment key={colName}>
                <Droppable droppableId={colName}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`w-80 shrink-0 flex flex-col h-full bg-[#050505]/40 rounded-xl transition-colors ${
                        snapshot.isDraggingOver ? 'bg-[#0A0A0A]/80 ring-1 ring-white/10' : ''
                      }`}
                    >
                      {/* Header Title segment */}
                      <div className="flex items-center justify-between px-2 py-3 border-b border-[#27272A]/40 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold uppercase tracking-widest ${colName === 'Done' ? 'text-[#8E9192]' : 'text-white'}`}
                          >
                            {colName}
                          </span>
                          <span className="px-1.5 py-0.5 bg-[#141313] border border-[#27272A] text-[#8E9192] text-[10px] rounded-sm font-mono font-bold">
                            {countVal}
                          </span>
                        </div>
                        <button
                          aria-label="Column Options"
                          className="text-[#8E9192] hover:text-white transition-colors"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Scrollable Tasks Body Container */}
                      <div className="flex-1 overflow-y-auto space-y-3 pb-4 max-h-[420px] scrollbar-thin">
                        {colTasks.length === 0 && !snapshot.isDraggingOver ? (
                          <div className="py-12 text-center text-xs text-[#8E9192]/60 border border-dashed border-[#27272A]/50 rounded-lg">
                            No active tasks
                          </div>
                        ) : (
                          colTasks.map((task, index) => (
                            // @ts-ignore
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => onSelectTask?.(task)}
                                  className={`task-card bg-[#0A0A0A] border p-4 transition-all group rounded-lg relative cursor-grab select-none ${
                                    snapshot.isDragging
                                      ? 'border-white ring-2 ring-white/20 z-50'
                                      : 'border-[#27272A] hover:border-white/30'
                                  } ${colName === 'Done' && !snapshot.isDragging ? 'opacity-65' : ''}`}
                                >
                                  {/* Priority Tag and Duration stats */}
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        className={`px-2 py-0.5 text-[9px] font-bold font-mono rounded-sm uppercase tracking-wider ${getPriorityClass(task.priority)}`}
                                      >
                                        {task.priority || 'Medium'}
                                      </span>
                                      {sprints && task.sprintId && (
                                        <span
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-[9px] font-mono bg-[#3B82F6]/15 text-[#60A5FA] border border-[#3B82F6]/30 px-1.5 py-0.5 rounded"
                                        >
                                          {sprints.find((s) => s.id === task.sprintId)?.name ||
                                            'Sprint'}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[#8E9192] text-[10px] font-mono leading-none bg-black/40 px-1.5 py-0.5 rounded border border-[#27272A]/40">
                                      {task.duration || '25m'}
                                    </span>
                                  </div>

                                  {/* Task text body */}
                                  <h3
                                    className={`text-xs font-medium leading-relaxed mb-4 text-white ${colName === 'Done' ? 'line-through text-[#8E9192]' : ''}`}
                                  >
                                    {task.title}
                                  </h3>

                                  {/* Touch Action helpers and status shift arrows */}
                                  <div className="flex items-center justify-between border-t border-[#27272A]/50 pt-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex gap-2">
                                      {colName !== 'To Do' && (
                                        <button
                                          onClick={() =>
                                            shiftTaskState(task.id, task.status, 'left')
                                          }
                                          className="p-1 rounded bg-[#141313] border border-[#27272A] text-[#8E9192] hover:text-white"
                                          title="Move Left"
                                          aria-label="Move Left"
                                        >
                                          <MoveLeft className="w-3 h-3" />
                                        </button>
                                      )}
                                      {colName !== 'Done' && (
                                        <button
                                          onClick={() =>
                                            shiftTaskState(task.id, task.status, 'right')
                                          }
                                          className="p-1 rounded bg-[#141313] border border-[#27272A] text-[#8E9192] hover:text-white"
                                          title="Move Right"
                                          aria-label="Move Right"
                                        >
                                          <MoveRight className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>

                                    {colName === 'Done' && (
                                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}

                        {/* Inline project add task trigger */}
                        {isAddingTask === colName ? (
                          <div className="p-3 bg-[#0A0A0A] border border-white/20 rounded-lg space-y-2 mt-2">
                            <input
                              type="text"
                              className="bg-black text-[#C4C7C8] border border-[#27272A] text-xs rounded p-2 w-full focus:outline-none focus:border-white"
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
                                className="text-[10px] text-[#8E9192] hover:text-white"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleAddTaskSubmit(colName)}
                                className="text-[10px] bg-white text-black font-bold px-2.5 py-1 rounded"
                              >
                                Add Task
                              </button>
                            </div>
                          </div>
                        ) : (
                          selectedProjectId !== 'all' && (
                            <button
                              onClick={() => setIsAddingTask(colName)}
                              className="w-full py-2 mt-2 border border-dashed border-[#27272A]/50 hover:border-[#27272A] hover:bg-[#0A0A0A]/20 transition-all rounded-lg flex items-center justify-center gap-1.5 text-xs text-[#8E9192]"
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
              </React.Fragment>
            );
          })}

          {/* Dynamic add column toggle block */}
          {isAddingColumn ? (
            <form
              onSubmit={handleAddColumnSubmit}
              className="w-80 shrink-0 p-4 border border-dashed border-white/20 rounded-xl space-y-3 bg-[#0A0A0A]/40"
            >
              <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-1">
                Add Segment Column
              </h3>
              <input
                type="text"
                className="bg-black text-[#C4C7C8] border border-[#27272A] text-xs rounded p-2.5 w-full focus:ring-0 focus:border-white"
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
                  className="text-xs text-[#8E9192] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs bg-white text-black font-bold px-3 py-1.5 rounded"
                >
                  Add Column
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="w-80 shrink-0 border border-dashed border-[#27272A] hover:border-white/30 rounded-xl flex flex-col items-center justify-center text-[#8E9192] hover:text-white transition-all group"
            >
              <Plus className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#8E9192] font-sans">
                Add Column
              </span>
            </button>
          )}
        </div>
      </DragDropContext>
    </div>
  );
}
