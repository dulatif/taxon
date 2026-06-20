import React from 'react';
import { 
  LayoutDashboard, 
  Folder, 
  CheckSquare, 
  CheckCircle, 
  Calendar, 
  BarChart3, 
  Circle, 
  Plus, 
  Settings, 
  HelpCircle 
} from 'lucide-react';
import { Project } from '../types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (id: string) => void;
  onAddProjectClick: () => void;
}

export default function Sidebar({
  currentView,
  onViewChange,
  projects,
  selectedProjectId,
  onProjectSelect,
  onAddProjectClick,
}: SidebarProps) {
  // Main Navigation Items
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: Folder },
    { id: 'todo', label: 'Todo List', icon: CheckSquare },
    { id: 'completed', label: 'Completed', icon: CheckCircle },
    { id: 'scheduled', label: 'Scheduled', icon: Calendar },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  // Active styles helper
  const getItemClass = (id: string) => {
    const isPrimary = currentView === id && selectedProjectId === null;
    return `w-full flex items-center gap-3 px-3 py-2 rounded-lg font-sans tracking-tight text-sm transition-all duration-200 ${
      isPrimary
        ? 'text-white font-bold bg-[#1C1B1B] border border-[#27272A]'
        : 'text-[#C4C7C8] hover:text-white hover:bg-[#141313]'
    }`;
  };

  return (
    <aside className="h-screen w-64 flex flex-col py-6 px-4 bg-black border-r border-[#27272A] shrink-0 overflow-y-auto scrollbar-thin">
      {/* Brand Header */}
      <div className="mb-10 px-2 cursor-pointer" onClick={() => { onViewChange('dashboard'); onProjectSelect(''); }}>
        <h1 className="text-xl font-black text-white tracking-tighter">Taxon</h1>
        <p className="text-xs tracking-tight text-[#c4c7c8]/60 font-medium">Precision Tasking</p>
      </div>

      {/* Main Nav */}
      <nav className="space-y-1 pb-6 border-b border-[#27272A]/50">
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
      <div className="pt-6 border-b border-[#27272A]/50 pb-6">
        <h3 className="px-3 mb-2 text-[10px] font-bold text-[#c4c7c8]/50 uppercase tracking-widest">
          projects
        </h3>
        <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1">
          {projects
            .filter((p) => p.category !== 'Completed')
            .map((project) => {
              const isSelected = selectedProjectId === project.id;
              return (
                <button
                  key={project.id}
                  id={`sidebar-project-${project.id}`}
                  onClick={() => {
                    onProjectSelect(project.id);
                    onViewChange('project-details');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-sans text-sm text-left transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
                    isSelected
                      ? 'text-white font-semibold bg-[#201F1F] border border-[#27272A]'
                      : 'text-[#C4C7C8] hover:text-white hover:bg-[#141313]'
                  }`}
                  title={project.name}
                >
                  <Circle className={`w-2.5 h-2.5 shrink-0 ${isSelected ? 'fill-white text-white' : 'text-[#8E9192]'}`} />
                  <span className="truncate">{project.name}</span>
                </button>
              );
            })}
        </div>

        <button
          onClick={onAddProjectClick}
          id="btn-new-project-sidebar"
          className="w-full flex items-center gap-3 px-3 py-2 mt-2 text-xs text-[#C4C7C8]/70 hover:text-white hover:bg-[#141313] transition-colors rounded-lg group text-left border border-dashed border-[#27272A] hover:border-white/30"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Footer Nav */}
      <div className="mt-auto pt-6 space-y-1">
        <button
          onClick={() => onViewChange('settings')}
          id="nav-settings"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-sans tracking-tight text-sm transition-all duration-200 ${
            currentView === 'settings'
              ? 'text-white font-bold bg-[#1C1B1B] border border-[#27272A]'
              : 'text-[#C4C7C8] hover:text-white hover:bg-[#141313]'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
        <button
          onClick={() => onViewChange('help')}
          id="nav-help"
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-sans tracking-tight text-sm transition-all duration-200 ${
            currentView === 'help'
              ? 'text-white font-bold bg-[#1C1B1B] border border-[#27272A]'
              : 'text-[#C4C7C8] hover:text-white hover:bg-[#141313]'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Help &amp; Support</span>
        </button>
      </div>
    </aside>
  );
}
