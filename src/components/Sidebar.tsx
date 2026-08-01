import type { DropResult } from '@hello-pangea/dnd';
import { Moon, Pause, Search, Sun } from 'lucide-react';
import { useMemo } from 'react';
import logo from '../assets/logo.png';
import { PROJECT_CATEGORIES } from '../constants/categories';
import { useSettings } from '../contexts/SettingsContext';
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
  onOpenSpotlight?: () => void;
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
  onOpenSpotlight,
}: SidebarProps) {
  const { settings, updateSetting } = useSettings();
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
      <div className="flex-1 overflow-y-auto scrollbar-thin pt-3 pb-6 px-4 min-h-0 flex flex-col">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 mb-4 shrink-0">
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => onViewChange('dashboard')}
          >
            <img
              src={logo}
              alt="Taxon Logo"
              className="w-12 h-12 p-1 rounded-lg shrink-0 object-cover"
            />
            <span className="font-bold text-text-primary text-[15px] tracking-tight">Taxon</span>
          </div>
          <button
            onClick={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
            title="Toggle Theme"
            className="p-1.5 hover:bg-surface-secondary text-text-muted hover:text-text-primary rounded-md transition-colors cursor-pointer"
          >
            {settings.theme === 'light' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Global Search / Command Palette */}
        {onOpenSpotlight && (
          <div className="px-2 mb-4 shrink-0">
            <button
              id="global-search-input-sidebar"
              onClick={onOpenSpotlight}
              className="w-full relative group bg-surface-secondary border border-border-primary hover:border-border-hover rounded-md pl-8 pr-2 py-1.5 text-xs text-text-muted hover:text-text-primary flex items-center justify-between transition-all cursor-pointer select-none"
            >
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted group-hover:text-text-primary w-3.5 h-3.5 transition-colors" />
              <span className="truncate mr-2">Search...</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-tertiary border border-border-primary text-[10px] font-mono text-text-muted group-hover:text-text-primary transition-colors shrink-0">
                ⌘K
              </span>
            </button>
          </div>
        )}

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
            className="bg-surface-secondary hover:bg-surface-hover border border-border-primary/50 hover:border-border-primary/80 rounded-md p-3 cursor-pointer transition-all group relative overflow-hidden animate-fade-in"
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
              className={`group flex items-center justify-between px-3 py-2 rounded-md text-[13px] transition-colors w-full cursor-pointer ${
                currentView === item.id
                  ? 'bg-surface-active text-text-primary font-bold'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary/50 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
