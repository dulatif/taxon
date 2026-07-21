import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { ChevronRight, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { getCategoryStyle } from '../../services/category-color';
import type { Project } from '../../types';

interface SidebarProjectListProps {
  activeProjects: Project[];
  categories: string[];
  selectedProjectId: string | null;
  onProjectSelect: (id: string) => void;
  onAddProjectClick: () => void;
  onAddProjectToCategory?: (category: string) => void;
  onDragEnd: (result: DropResult) => void;
}

export default function SidebarProjectList({
  activeProjects,
  categories,
  selectedProjectId,
  onProjectSelect,
  onAddProjectClick,
  onAddProjectToCategory,
  onDragEnd,
}: SidebarProjectListProps) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedCategories((prev) => {
      const next = { ...prev };
      let changed = false;
      categories.forEach((cat) => {
        if (next[cat] === undefined) {
          next[cat] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [categories]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="pt-4 pb-4">
      <h3 className="px-3 mb-2 text-[10px] font-bold text-text-muted/50 uppercase tracking-widest">
        projects
      </h3>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="space-y-3">
          {categories.map((cat) => {
            const catProjects = activeProjects
              .filter((p) => p.category === cat)
              .sort((a, b) => a.name.localeCompare(b.name));
            if (catProjects.length === 0) return null;

            const isExpanded = expandedCategories[cat] !== false;

            return (
              <div key={cat} className="space-y-1">
                {/* Accordion Header */}
                <div
                  onClick={() => toggleCategory(cat)}
                  className="flex items-center justify-between px-3 py-1.5 cursor-pointer group rounded-lg hover:bg-surface-secondary transition-colors select-none"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <ChevronRight
                      className={`w-3.5 h-3.5 text-text-muted shrink-0 group-hover:text-text-primary transition-transform duration-200 ${
                        isExpanded ? 'rotate-90 text-text-primary' : ''
                      }`}
                    />
                    <span className="text-xs font-semibold text-text-secondary group-hover:text-text-primary truncate">
                      {cat}
                    </span>
                    <span className="text-[10px] font-mono bg-surface-secondary group-hover:bg-surface-hover text-text-muted px-1.5 py-0.5 rounded border border-border-primary">
                      {catProjects.length}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onAddProjectToCategory) {
                        onAddProjectToCategory(cat);
                      } else {
                        onAddProjectClick();
                      }
                    }}
                    className="text-text-muted hover:text-text-primary p-1 rounded hover:bg-surface-hover opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title={`Add project to ${cat}`}
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Accordion Body (Droppable Zone) */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <Droppable droppableId={`cat_${cat}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`space-y-1 pl-2 border-l border-border-primary/40 ml-4 py-1 rounded transition-colors min-h-[10px] select-none ${
                              snapshot.isDraggingOver
                                ? 'bg-surface-secondary/50 border-white/30'
                                : ''
                            }`}
                          >
                            {catProjects.map((project, index) => {
                              const isSelected = selectedProjectId === project.id;
                              const style = getCategoryStyle(project.category);
                              return (
                                <Draggable key={project.id} draggableId={project.id} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      id={`sidebar-project-${project.id}`}
                                      role="button"
                                      tabIndex={0}
                                      onClick={() => onProjectSelect(project.id)}
                                      className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg font-sans text-sm text-left transition-colors whitespace-nowrap overflow-hidden text-ellipsis cursor-grab active:cursor-grabbing select-none ${
                                        snapshot.isDragging
                                          ? 'bg-surface-hover text-text-primary ring-1 ring-white/30 shadow-lg z-50'
                                          : isSelected
                                            ? 'text-text-primary font-semibold bg-surface-hover'
                                            : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                                      }`}
                                      title={`${project.name} (${project.category})`}
                                    >
                                      <span
                                        className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`}
                                      />
                                      <span className="truncate">{project.name}</span>
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <button
        onClick={onAddProjectClick}
        id="btn-new-project-sidebar"
        className="w-full flex items-center gap-3 px-3 py-2 mt-4 text-xs text-text-secondary/70 hover:text-text-primary hover:bg-surface-secondary transition-colors rounded-lg group text-left border border-dashed border-border-primary hover:border-white/30 cursor-pointer"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Project</span>
      </button>
    </div>
  );
}
