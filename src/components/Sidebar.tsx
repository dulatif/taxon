import { DragDropContext, Draggable, DropResult, Droppable } from '@hello-pangea/dnd';
import {
  BarChart3,
  Calendar,
  CheckSquare,
  ChevronRight,
  Folder,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Pause,
  Plus,
  Settings,
  Repeat
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, useMemo } from 'react';
import { Project, getCategoryStyle, PROJECT_CATEGORIES } from '../types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (id: string) => void;
  onAddProjectClick: () => void;
  onAddProjectToCategory?: (category: string) => void;
  onReorderProjects?: (projects: Project[]) => void;
  timerSeconds?: number;
  timerIsRunning?: boolean;
  activeFocusTaskTitle?: string;
  onLaunchFocusMode?: () => void;
  onToggleTimer?: () => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  projects,
  selectedProjectId,
  onProjectSelect,
  onAddProjectClick,
  onAddProjectToCategory,
  onReorderProjects,
  timerSeconds,
  timerIsRunning,
  activeFocusTaskTitle,
  onLaunchFocusMode,
  onToggleTimer,
}: SidebarProps) {
  const activeProjects = projects.filter((p) => p.category !== 'Completed');
  const categories = useMemo(() => {
    const cats = Array.from(new Set(activeProjects.map((p) => p.category))).filter(Boolean);
    return cats.sort((a, b) => {
      const idxA = (PROJECT_CATEGORIES as readonly string[]).indexOf(a);
      const idxB = (PROJECT_CATEGORIES as readonly string[]).indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [activeProjects]);

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  useEffect(() => {
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
  }, [categories.join(',')]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || !onReorderProjects) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceCat = source.droppableId.replace(/^cat_/, '');
    const destCat = destination.droppableId.replace(/^cat_/, '');

    const draggedProject = activeProjects.find((p) => p.id === draggableId);
    if (!draggedProject) return;

    const projectsByCategory: Record<string, Project[]> = {};
    categories.forEach((c) => {
      projectsByCategory[c] = activeProjects.filter((p) => p.category === c);
    });

    projectsByCategory[sourceCat] = projectsByCategory[sourceCat].filter((p) => p.id !== draggableId);

    const updatedProject = { ...draggedProject, category: destCat };

    if (!projectsByCategory[destCat]) {
      projectsByCategory[destCat] = [];
    }
    projectsByCategory[destCat].splice(destination.index, 0, updatedProject);

    const reorderedActive: Project[] = [];
    categories.forEach((c) => {
      if (projectsByCategory[c]) {
        reorderedActive.push(...projectsByCategory[c]);
      }
    });

    const completedProjects = projects.filter((p) => p.category === 'Completed');
    const finalProjects = [...reorderedActive, ...completedProjects];

    onReorderProjects(finalProjects);
  };

  // Main Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'todo', label: 'Todo List', icon: CheckSquare },
    { id: 'scheduled', label: 'Scheduled', icon: Calendar },
    { id: 'recurring', label: 'Recurring', icon: Repeat },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  // Active styles helper
  const getItemClass = (id: string) => {
    const isPrimary = currentView === id && selectedProjectId === null;
    return `w-full flex items-center gap-3 px-3 py-2 rounded-lg font-sans tracking-tight text-sm transition-all duration-200 ${isPrimary
      ? 'text-white font-bold bg-[#201F1F]'
      : 'text-[#C4C7C8] hover:text-white hover:bg-[#141313]'
      }`;
  };

  return (
    <aside className="h-full w-64 flex flex-col bg-black border-r border-[#27272A] shrink-0 overflow-hidden select-none">
      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-6 px-4 min-h-0 flex flex-col">
        {/* Brand Header */}
        <div className="mb-8 px-2 cursor-pointer shrink-0" onClick={() => onViewChange('dashboard')}>
          <h1 className="text-xl font-black text-white tracking-tighter">Taxon</h1>
          <p className="text-xs tracking-tight text-[#c4c7c8]/60 font-medium">Precision Tasking</p>
        </div>

        {/* Main Nav */}
        <nav className="space-y-1 pb-4 border-b border-[#27272A]/50 shrink-0">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => {
                onViewChange(item.id);
              }}
              className={getItemClass(item.id)}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Projects List Sub-Section */}
        <div className="pt-4 pb-4">
          <h3 className="px-3 mb-2 text-[10px] font-bold text-[#c4c7c8]/50 uppercase tracking-widest">
            projects
          </h3>

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="space-y-3">
              {categories.map((cat) => {
                const catProjects = activeProjects.filter((p) => p.category === cat).sort((a, b) => a.name.localeCompare(b.name));
                if (catProjects.length === 0) return null;

                const isExpanded = expandedCategories[cat] !== false;
                const catStyle = getCategoryStyle(cat);

                return (
                  <div key={cat} className="space-y-1">
                    {/* Accordion Header */}
                    <div
                      onClick={() => toggleCategory(cat)}
                      className="flex items-center justify-between px-3 py-1.5 cursor-pointer group rounded-lg hover:bg-[#141313] transition-colors select-none"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <ChevronRight
                          className={`w-3.5 h-3.5 text-[#8E9192] shrink-0 group-hover:text-white transition-transform duration-200 ${isExpanded ? 'rotate-90 text-white' : ''
                            }`}
                        />
                        <span className="text-xs font-semibold text-[#C4C7C8] group-hover:text-white truncate">
                          {cat}
                        </span>
                        <span className="text-[10px] font-mono bg-[#141313] group-hover:bg-[#201F1F] text-[#8E9192] px-1.5 py-0.5 rounded border border-[#27272A]">
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
                        className="text-[#8E9192] hover:text-white p-1 rounded hover:bg-[#201F1F] opacity-0 group-hover:opacity-100 transition-opacity"
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
                                className={`space-y-1 pl-2 border-l border-[#27272A]/40 ml-4 py-1 rounded transition-colors min-h-[10px] select-none ${snapshot.isDraggingOver ? 'bg-[#141313]/50 border-white/30' : ''
                                  }`}
                              >
                                {catProjects.map((project, index) => {
                                  const isSelected = selectedProjectId === project.id;
                                  const style = getCategoryStyle(project.category);
                                  return (
                                    // @ts-ignore
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
                                          className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg font-sans text-sm text-left transition-colors whitespace-nowrap overflow-hidden text-ellipsis cursor-grab active:cursor-grabbing select-none ${snapshot.isDragging
                                            ? 'bg-[#201F1F] text-white ring-1 ring-white/30 shadow-lg z-50'
                                            : isSelected
                                              ? 'text-white font-semibold bg-[#201F1F]'
                                              : 'text-[#C4C7C8] hover:text-white hover:bg-[#141313]'
                                            }`}
                                          title={`${project.name} (${project.category})`}
                                        >
                                          <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
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
            className="w-full flex items-center gap-3 px-3 py-2 mt-4 text-xs text-[#C4C7C8]/70 hover:text-white hover:bg-[#141313] transition-colors rounded-lg group text-left border border-dashed border-[#27272A] hover:border-white/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Fixed Footer Area (Pomodoro Widget & Footer Nav) */}
      <div className="shrink-0 p-4 border-t border-[#27272A]/50 bg-black flex flex-col gap-3">
        {/* Active Focus Timer Widget */}
        {timerIsRunning && currentView !== 'dashboard' && timerSeconds !== undefined && (
          <div
            onClick={onLaunchFocusMode}
            className="bg-[#0E0E0E] hover:bg-[#141313] border border-[#27272A]/50 hover:border-[#27272A]/80 rounded-lg p-3 cursor-pointer transition-all group relative overflow-hidden animate-fade-in"
            title="Click to open full screen Focus Mode"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8E9192] group-hover:text-white transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                Focus Active
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTimer?.();
                }}
                className="text-[#8E9192] hover:text-white p-1 hover:bg-[#201F1F] rounded transition-colors"
                title="Pause/Resume Timer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
            <div className="text-xl font-bold font-mono text-white tracking-tight leading-none my-1.5">
              {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:{(timerSeconds % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-[#8E9192] truncate mt-0.5">
              {activeFocusTaskTitle || 'Standalone Focus'}
            </div>
          </div>
        )}

        {/* Footer Nav */}
        <div className="space-y-1">
          <button
            onClick={() => onViewChange('settings')}
            id="nav-settings"
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-sans tracking-tight text-sm transition-all duration-200 ${currentView === 'settings'
              ? 'text-white font-bold bg-[#201F1F]'
              : 'text-[#C4C7C8] hover:text-white hover:bg-[#141313]'
              }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <button
            onClick={() => onViewChange('help')}
            id="nav-help"
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-sans tracking-tight text-sm transition-all duration-200 ${currentView === 'help'
              ? 'text-white font-bold bg-[#201F1F]'
              : 'text-[#C4C7C8] hover:text-white hover:bg-[#141313]'
              }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Help &amp; Support</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
