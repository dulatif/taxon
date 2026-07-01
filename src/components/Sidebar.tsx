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
  HelpCircle,
  Pause,
  Play,
  Sun,
  Moon,
} from 'lucide-react';
import { Project, getCategoryStyle } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  projects: Project[];
  selectedProjectId: string | null;
  onProjectSelect: (id: string) => void;
  onAddProjectClick: () => void;
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
  timerSeconds,
  timerIsRunning,
  activeFocusTaskTitle,
  onLaunchFocusMode,
  onToggleTimer,
}: SidebarProps) {
  const { settings, updateSetting } = useSettings();

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
          <div className="space-y-1">
            {projects
              .filter((p) => p.category !== 'Completed')
              .map((project) => {
                const isSelected = selectedProjectId === project.id;
                const style = getCategoryStyle(project.category);
                return (
                  <button
                    key={project.id}
                    id={`sidebar-project-${project.id}`}
                    onClick={() => onProjectSelect(project.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-sans text-sm text-left transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${isSelected
                      ? 'text-white font-semibold bg-[#201F1F]'
                      : 'text-[#C4C7C8] hover:text-white hover:bg-[#141313]'
                      }`}
                    title={`${project.name} (${project.category})`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
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

          {/* Theme Toggle */}
          <div className="flex items-center justify-between px-3 py-2 pt-3 border-t border-[#27272A]/50 mt-2">
            <div className="flex items-center gap-3 text-sm text-[#C4C7C8] font-sans tracking-tight">
              {settings.theme === 'light' ? (
                <Sun className="w-4 h-4 text-white" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
              <span>{settings.theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
            <button
              onClick={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
              className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors duration-200 ${
                settings.theme === 'light' ? 'bg-white' : 'bg-[#27272A]'
              }`}
              title="Toggle Theme"
            >
              <div className={`w-4 h-4 rounded-full transition-all duration-200 ${
                settings.theme === 'light' ? 'bg-black ml-auto' : 'bg-[#8E9192] ml-0'
              }`} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
