import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { CheckSquare, Plus, Square, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { SubTask } from '../../types';

interface SubtaskListProps {
  subtasks: SubTask[];
  onChange: (subtasks: SubTask[]) => void;
}

export default function SubtaskList({ subtasks, onChange }: SubtaskListProps) {
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');

  const completedCount = subtasks.filter((st) => st.completed).length;

  const handleAddSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTaskTitle.trim()) return;
    const newSub: SubTask = {
      id: `sub_${Date.now()}`,
      title: newSubTaskTitle.trim(),
      completed: false,
    };
    onChange([...subtasks, newSub]);
    setNewSubTaskTitle('');
  };

  const handleToggleSubTask = (subId: string) => {
    const updated = subtasks.map((st) =>
      st.id === subId ? { ...st, completed: !st.completed } : st,
    );
    onChange(updated);
  };

  const handleDeleteSubTask = (subId: string) => {
    const updated = subtasks.filter((st) => st.id !== subId);
    onChange(updated);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const updated = Array.from(subtasks);
    const reorderedItem = updated.splice(sourceIndex, 1)[0];
    if (reorderedItem) {
      updated.splice(destinationIndex, 0, reorderedItem);
      onChange(updated);
    }
  };

  return (
    <div className="space-y-3 pb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
            Sub-tasks
          </h3>
          {subtasks.length > 0 && (
            <span className="text-[10px] font-mono font-bold bg-surface-secondary px-2 py-0.5 rounded border border-border-primary text-text-muted">
              {completedCount}/{subtasks.length}
            </span>
          )}
        </div>
      </div>

      {subtasks.length > 0 && (
        <div className="w-full bg-surface-secondary h-1.5 rounded-full overflow-hidden border border-border-primary/40">
          <div
            className="bg-white h-full transition-all duration-300"
            style={{
              width: `${Math.round((completedCount / subtasks.length) * 100)}%`,
            }}
          />
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="subtasks">
          {(provided, snapshot) => (
            <div
              className={`space-y-2 min-h-[10px] rounded-lg transition-colors ${
                snapshot.isDraggingOver
                  ? 'bg-surface-secondary/50 border border-white/20 p-1.5'
                  : ''
              }`}
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {subtasks.map((st, index) => (
                <Draggable key={st.id} draggableId={st.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`flex items-center justify-between p-2.5 bg-surface-secondary border rounded-lg group transition-all cursor-grab active:cursor-grabbing select-none ${
                        snapshot.isDragging
                          ? 'ring-1 ring-white/30 shadow-lg z-50 border-white/20 !bg-surface-hover'
                          : 'border-border-primary hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                        <button
                          onClick={() => handleToggleSubTask(st.id)}
                          className="text-text-muted hover:text-text-primary transition-colors shrink-0 cursor-pointer"
                        >
                          {st.completed ? (
                            <CheckSquare className="w-4 h-4 text-white" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <span
                          className={`text-xs font-medium truncate ${
                            st.completed ? 'line-through text-text-muted' : 'text-text-primary'
                          }`}
                        >
                          {st.title}
                        </span>
                      </div>

                      <button
                        onClick={() => handleDeleteSubTask(st.id)}
                        className="text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                        title="Delete sub-task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <form onSubmit={handleAddSubTask} className="flex items-center gap-2 pt-1">
        <div className="flex-1 flex items-center gap-2 bg-surface-secondary border border-border-primary rounded-lg px-3 py-2 focus-within:border-white/40 transition-all">
          <Plus className="w-4 h-4 text-text-muted shrink-0" />
          <input
            type="text"
            value={newSubTaskTitle}
            onChange={(e) => setNewSubTaskTitle(e.target.value)}
            placeholder="Add a sub-task..."
            className="w-full bg-transparent border-none text-xs text-text-primary focus:outline-none placeholder:text-text-muted/60"
          />
        </div>
        <button
          type="submit"
          disabled={!newSubTaskTitle.trim()}
          className="bg-interactive-primary hover:bg-interactive-primary/90 text-interactive-primary-text font-bold text-xs px-3.5 py-2 rounded-lg disabled:opacity-40 transition-all shrink-0 cursor-pointer"
        >
          Add
        </button>
      </form>
    </div>
  );
}
