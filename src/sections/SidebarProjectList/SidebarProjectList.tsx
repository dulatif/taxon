import type { DropResult } from '@hello-pangea/dnd';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { ChevronRight, Pin, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import type { JumpState } from '../../hooks/useVimNavigation';
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
  onTogglePinProject?: (projectId: string) => void;
  jumpState?: JumpState;
}

export default function SidebarProjectList({
  activeProjects,
  categories,
  selectedProjectId,
  onProjectSelect,
  onAddProjectClick,
  onAddProjectToCategory,
  onDragEnd,
  onTogglePinProject,
  jumpState,
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

  const pinnedProjects = activeProjects
    .filter((p) => p.pinned)
    .sort((a, b) => (a.pinnedSortOrder ?? 999999) - (b.pinnedSortOrder ?? 999999));

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="pt-3 pb-3">
        {/* Pinned Projects Block */}
        {pinnedProjects.length > 0 && (
          <div className="mb-4 space-y-1">
            <div className="flex items-center justify-between px-3 py-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1.5 font-mono">
                <Pin className="w-3 h-3 fill-amber-400/20 text-amber-400" />
                <span>Pinned ({pinnedProjects.length})</span>
              </span>
            </div>

            <Droppable droppableId="pinned_zone" type="pinned">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`space-y-0.5 pl-2 border-l border-amber-500/30 ml-4 py-0.5 min-h-[10px] rounded transition-colors ${
                    snapshot.isDraggingOver ? 'bg-surface-secondary/50 border-white/30' : ''
                  }`}
                >
                  {pinnedProjects.map((project, index) => {
                    const isSelected = selectedProjectId === project.id;
                    const style = getCategoryStyle(project.category);
                    return (
                      <Draggable
                        key={`pinned-${project.id}`}
                        draggableId={`pinned-${project.id}`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            id={`sidebar-pinned-project-${project.id}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => onProjectSelect(project.id)}
                            className={`group flex items-center justify-between px-3 py-1.5 rounded-md text-[13px] transition-colors w-full cursor-pointer active:cursor-grabbing select-none ${
                              snapshot.isDragging
                                ? 'bg-surface-hover text-text-primary ring-1 ring-amber-500/50 z-50 font-bold'
                                : isSelected
                                  ? 'bg-surface-active text-text-primary font-bold'
                                  : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary/50 font-medium'
                            }`}
                            title={`${project.name} (Pinned)`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden min-w-0">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                              <span className="truncate">{project.name}</span>
                            </div>

                            {onTogglePinProject && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTogglePinProject(project.id);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-amber-400 hover:text-amber-300 transition-opacity cursor-pointer shrink-0"
                                title="Unpin project"
                              >
                                <Pin className="w-3.5 h-3.5 fill-current" />
                              </button>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        )}

        <h3 className="px-3 mb-1.5 text-[10px] font-bold text-text-muted/50 uppercase tracking-widest font-mono">
          projects
        </h3>

        <div className="space-y-1.5">
          {categories.map((cat) => {
            const catProjects = activeProjects
              .filter((p) => p.category === cat)
              .sort((a, b) => (a.sortOrder ?? 999999) - (b.sortOrder ?? 999999));
            if (catProjects.length === 0) return null;

            const isExpanded = expandedCategories[cat] !== false;

            return (
              <div key={cat} className="space-y-0.5">
                <div
                  onClick={() => toggleCategory(cat)}
                  className="group flex items-center justify-between px-3 h-8 rounded-md text-[13px] font-medium transition-colors w-full text-text-muted hover:text-text-primary hover:bg-surface-secondary/50 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                    <span className="truncate">{cat}</span>
                    {jumpState?.isActive &&
                      jumpState.stage === 'category' &&
                      categories.indexOf(cat) < 9 && (
                        <kbd className="px-1.5 py-0.5 bg-surface-tertiary text-text-muted border border-border-primary rounded text-[10px] font-mono font-medium leading-none shrink-0 shadow-2xs">
                          {categories.indexOf(cat) + 1}
                        </kbd>
                      )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-surface-secondary text-text-muted">
                      {catProjects.length}
                    </span>
                    {cat !== 'Completed' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAddProjectToCategory) {
                            onAddProjectToCategory(cat);
                          } else {
                            onAddProjectClick();
                          }
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-interactive-primary transition-opacity cursor-pointer"
                        title={`Add project to ${cat}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
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
                      <Droppable droppableId={`cat_${cat}`} type="category">
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`space-y-0.5 pl-2 border-l border-border-primary/40 ml-4 py-0.5 rounded transition-colors min-h-[10px] select-none ${
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
                                      className={`group flex items-center justify-between px-3 h-8 rounded-md text-[13px] transition-colors w-full cursor-pointer active:cursor-grabbing select-none ${
                                        snapshot.isDragging
                                          ? 'bg-surface-hover text-text-primary ring-1 ring-white/30 z-50 font-bold'
                                          : isSelected
                                            ? 'bg-surface-active text-text-primary font-bold'
                                            : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary/50 font-medium'
                                      }`}
                                      title={`${project.name} (${project.category})`}
                                    >
                                      <div className="flex items-center gap-3 overflow-hidden min-w-0">
                                        <span
                                          className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`}
                                        />
                                        <span className="truncate">{project.name}</span>
                                        {jumpState?.isActive &&
                                          jumpState.stage === 'project' &&
                                          jumpState.categoryIndex !== null &&
                                          categories[jumpState.categoryIndex] === cat &&
                                          index < 9 && (
                                            <kbd className="px-1.5 py-0.5 bg-surface-tertiary text-text-muted border border-border-primary rounded text-[10px] font-mono font-medium leading-none shrink-0 shadow-2xs">
                                              {index + 1}
                                            </kbd>
                                          )}
                                      </div>

                                      {onTogglePinProject && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onTogglePinProject(project.id);
                                          }}
                                          className={`p-0.5 transition-opacity cursor-pointer shrink-0 ${
                                            project.pinned
                                              ? 'text-amber-400 opacity-100'
                                              : 'text-text-muted hover:text-amber-400 opacity-0 group-hover:opacity-100'
                                          }`}
                                          title={project.pinned ? 'Unpin project' : 'Pin project'}
                                        >
                                          <Pin
                                            className={`w-3.5 h-3.5 ${project.pinned ? 'fill-current' : ''}`}
                                          />
                                        </button>
                                      )}
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

        <button
          onClick={onAddProjectClick}
          id="btn-new-project-sidebar"
          className="w-full flex items-center gap-3 px-3 py-1.5 mt-3 text-xs text-text-secondary/70 hover:text-text-primary hover:bg-surface-secondary transition-colors rounded-md group text-left border border-dashed border-border-primary hover:border-white/30 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>
    </DragDropContext>
  );
}
