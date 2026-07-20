import type { DropResult } from '@hello-pangea/dnd';
import { Pause } from 'lucide-react';
import React, { useMemo } from 'react';
import logo from '../assets/logo.png';
import { PROJECT_CATEGORIES } from '../constants/categories';
import NavigationList, { FOOTER_NAV_ITEMS } from '../sections/NavigationList/NavigationList';
import SidebarProjectList from '../sections/SidebarProjectList/SidebarProjectList';
import type { Project } from '../types';

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

    if (projectsByCategory[sourceCat]) {
      projectsByCategory[sourceCat] = projectsByCategory[sourceCat].filter(
        (p) => p.id !== draggableId,
      );
    }

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

  return (
    <aside className="h-full w-64 flex flex-col bg-surface-primary border-r border-border-primary shrink-0 overflow-hidden select-none">
      {/* Main Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-6 px-4 min-h-0 flex flex-col">
        {/* Brand Header */}
        <div
          className="mb-8 px-2 cursor-pointer shrink-0 flex items-center gap-3"
          onClick={() => onViewChange('dashboard')}
        >
          <img src={logo} alt="Taxon Logo" className="w-10 h-10 object-contain rounded-[10px]" />
          <div>
            <h1 className="text-xl font-black text-text-primary tracking-tighter leading-tight">
              Taxon
            </h1>
            <p className="text-[10px] tracking-tight text-text-muted font-medium uppercase mt-0.5">
              Precision Tasking
            </p>
          </div>
        </div>

        <NavigationList
          currentView={currentView}
          selectedProjectId={selectedProjectId}
          onViewChange={onViewChange}
        />

        <SidebarProjectList
          activeProjects={activeProjects}
          categories={categories}
          selectedProjectId={selectedProjectId}
          onProjectSelect={onProjectSelect}
          onAddProjectClick={onAddProjectClick}
          onAddProjectToCategory={onAddProjectToCategory}
          onDragEnd={onDragEnd}
        />
      </div>

      {/* Fixed Footer Area (Pomodoro Widget & Footer Nav) */}
      <div className="shrink-0 p-4 border-t border-border-primary/50 bg-surface-primary flex flex-col gap-3">
        {/* Active Focus Timer Widget */}
        {timerIsRunning && currentView !== 'dashboard' && timerSeconds !== undefined && (
          <div
            onClick={onLaunchFocusMode}
            className="bg-surface-secondary hover:bg-surface-hover border border-border-primary/50 hover:border-border-primary/80 rounded-lg p-3 cursor-pointer transition-all group relative overflow-hidden animate-fade-in"
            title="Click to open full screen Focus Mode"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-text-muted group-hover:text-text-primary transition-colors flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                Focus Active
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTimer?.();
                }}
                className="text-text-muted hover:text-text-primary p-1 hover:bg-surface-hover rounded transition-colors"
                title="Pause/Resume Timer"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
              </button>
            </div>
            <div className="text-xl font-bold font-mono text-text-primary tracking-tight leading-none my-1.5">
              {Math.floor(timerSeconds / 60)
                .toString()
                .padStart(2, '0')}
              :{(timerSeconds % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-text-muted truncate mt-0.5">
              {activeFocusTaskTitle || 'Standalone Focus'}
            </div>
          </div>
        )}

        {/* Footer Nav */}
        <div className="space-y-1">
          {FOOTER_NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              id={`nav-${item.id}`}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-sans tracking-tight text-sm transition-all duration-200 ${
                currentView === item.id
                  ? 'text-text-primary font-bold bg-surface-hover'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
