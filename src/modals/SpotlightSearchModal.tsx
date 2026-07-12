import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Timer,
  LayoutDashboard,
  Inbox,
  FolderKanban,
  Calendar,
  BarChart2,
  Settings,
  Check,
  Folder,
  ArrowRight,
  Sparkles,
  Command
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Project } from '../types';

interface SpotlightSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  projects: Project[];
  onToggleTask: (taskId: string) => void;
  onSelectProject: (projectId: string) => void;
  onSelectTask: (taskId: string) => void;
  onNavigate: (view: string) => void;
  onQuickAddTask: () => void;
  onLaunchFocusMode: () => void;
}

interface CombinedItem {
  id: string;
  type: 'action' | 'task' | 'project';
  label: string;
  subLabel?: string;
  icon: React.ReactNode;
  action: () => void;
  task?: Task;
}

export default function SpotlightSearchModal({
  isOpen,
  onClose,
  tasks,
  projects,
  onToggleTask,
  onSelectProject,
  onSelectTask,
  onNavigate,
  onQuickAddTask,
  onLaunchFocusMode,
}: SpotlightSearchModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset query and selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const projectsMap = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  // Build the list of available quick actions
  const quickActionsList = useMemo(() => [
    {
      id: 'action-quick-add',
      type: 'action' as const,
      label: 'Quick Add Task',
      subLabel: 'Create a new task immediately',
      icon: <Plus className="w-4 h-4 text-white" />,
      action: () => {
        onClose();
        onQuickAddTask();
      }
    },
    {
      id: 'action-focus-mode',
      type: 'action' as const,
      label: 'Launch Focus Mode',
      subLabel: 'Start an immersive pomodoro session',
      icon: <Timer className="w-4 h-4 text-yellow-400" />,
      action: () => {
        onClose();
        onLaunchFocusMode();
      }
    },
    {
      id: 'action-nav-dashboard',
      type: 'action' as const,
      label: 'Go to Dashboard',
      subLabel: 'View primary overview and daily activity',
      icon: <LayoutDashboard className="w-4 h-4 text-blue-400" />,
      action: () => {
        onClose();
        onNavigate('dashboard');
      }
    },
    {
      id: 'action-nav-inbox',
      type: 'action' as const,
      label: 'Go to Inbox',
      subLabel: 'Review unorganized tasks',
      icon: <Inbox className="w-4 h-4 text-purple-400" />,
      action: () => {
        onClose();
        onNavigate('inbox');
      }
    },
    {
      id: 'action-nav-projects',
      type: 'action' as const,
      label: 'Go to Workspace Projects',
      subLabel: 'Manage active projects and categories',
      icon: <FolderKanban className="w-4 h-4 text-emerald-400" />,
      action: () => {
        onClose();
        onNavigate('projects');
      }
    },
    {
      id: 'action-nav-calendar',
      type: 'action' as const,
      label: 'Go to Calendar & Scheduled',
      subLabel: 'Inspect scheduled tasks and upcoming dates',
      icon: <Calendar className="w-4 h-4 text-orange-400" />,
      action: () => {
        onClose();
        onNavigate('scheduled');
      }
    },
    {
      id: 'action-nav-analytics',
      type: 'action' as const,
      label: 'Go to Productivity Analytics',
      subLabel: 'View charts and completed focus hours',
      icon: <BarChart2 className="w-4 h-4 text-cyan-400" />,
      action: () => {
        onClose();
        onNavigate('analytics');
      }
    },
    {
      id: 'action-nav-settings',
      type: 'action' as const,
      label: 'Platform Settings',
      subLabel: 'Configure timers, themes and data exports',
      icon: <Settings className="w-4 h-4 text-gray-400" />,
      action: () => {
        onClose();
        onNavigate('settings');
      }
    }
  ], [onClose, onQuickAddTask, onLaunchFocusMode, onNavigate]);

  // Filter items by search query
  const { filteredActions, filteredTasks, filteredProjects } = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        filteredActions: quickActionsList.slice(0, 4),
        filteredProjects: projects.slice(0, 4),
        filteredTasks: tasks.filter(t => !t.completed).slice(0, 6)
      };
    }

    const actions = quickActionsList.filter(a =>
      a.label.toLowerCase().includes(q) || (a.subLabel && a.subLabel.toLowerCase().includes(q))
    );

    const matchingProjects = projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
    );

    const matchingTasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description && t.description.toLowerCase().includes(q))
    ).slice(0, 6);

    return {
      filteredActions: actions,
      filteredTasks: matchingTasks,
      filteredProjects: matchingProjects
    };
  }, [query, quickActionsList, tasks, projects]);

  // Combine grouped items into a single ordered array for index-based keyboard navigation
  const combinedList = useMemo<CombinedItem[]>(() => {
    const list: CombinedItem[] = [];

    // Actions group
    for (const action of filteredActions) {
      list.push(action);
    }

    // Projects group
    for (const proj of filteredProjects) {
      list.push({
        id: `project-${proj.id}`,
        type: 'project',
        label: proj.name,
        subLabel: `${proj.category} • ${proj.progress}% Complete`,
        icon: <Folder className="w-4 h-4 text-[#8E9192]" />,
        action: () => {
          onClose();
          onSelectProject(proj.id);
        }
      });
    }

    // Tasks group
    for (const task of filteredTasks) {
      const proj = task.projectId ? projectsMap.get(task.projectId) : undefined;
      list.push({
        id: `task-${task.id}`,
        type: 'task',
        label: task.title,
        subLabel: proj ? proj.name : task.completed ? 'Completed Task' : 'Inbox Task',
        icon: (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleTask(task.id);
            }}
            className="w-4 h-4 rounded border border-[#27272A] flex items-center justify-center hover:border-white transition-colors cursor-pointer shrink-0"
          >
            <Check className={`w-3 h-3 ${task.completed ? 'text-green-400' : 'text-transparent'}`} />
          </div>
        ),
        action: () => {
          onClose();
          if (task.projectId) {
            onSelectProject(task.projectId);
          } else {
            onNavigate('dashboard');
          }
          onSelectTask(task.id);
        },
        task
      });
    }

    return list;
  }, [filteredActions, filteredTasks, filteredProjects, projectsMap, onClose, onToggleTask, onSelectProject, onSelectTask, onNavigate]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(prev => (combinedList.length > 0 && prev < combinedList.length ? prev : 0));
  }, [combinedList.length]);

  // Ensure selected item stays in view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }

    if (combinedList.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % combinedList.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + combinedList.length) % combinedList.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const currentItem = combinedList[selectedIndex];
      if (currentItem) {
        currentItem.action();
      }
    }
  };

  // Helper to get index offset for each group
  const getIndexOffset = (type: 'action' | 'task' | 'project', indexInGroup: number): number => {
    if (type === 'action') return indexInGroup;
    if (type === 'project') return filteredActions.length + indexInGroup;
    return filteredActions.length + filteredProjects.length + indexInGroup;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-start justify-center pt-[15vh] p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -16 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            className="w-full max-w-2xl bg-[#0A0A0A]/95 backdrop-blur-2xl border border-[#27272A] rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[70vh]"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#27272A]/80 bg-[#141313]/50">
              <Search className="w-5 h-5 text-[#8E9192] shrink-0 ml-1" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type a command or search tasks & projects... (↑↓ to navigate)"
                className="w-full bg-transparent border-0 text-sm text-white placeholder-[#8E9192]/60 focus:outline-none focus:ring-0"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-[10px] text-[#8E9192] hover:text-white font-mono uppercase bg-[#141313] px-2 py-1 rounded border border-[#27272A]"
                >
                  Clear
                </button>
              )}
              <span className="text-[10px] bg-[#1E1E22] border border-[#27272A] rounded px-2 py-1 font-mono text-[#8E9192] shrink-0">
                ESC
              </span>
            </div>

            {/* Scrollable Results Area */}
            <div ref={listRef} className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin">
              {combinedList.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <Command className="w-8 h-8 text-[#27272A] mb-3 stroke-[1.5]" />
                  <p className="text-xs text-[#8E9192]">No results matching "{query}"</p>
                  <p className="text-[11px] text-[#8E9192]/60 mt-1">Try checking for typos or searching a different keyword.</p>
                </div>
              ) : (
                <>
                  {/* Quick Actions Group */}
                  {filteredActions.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-[#8E9192] uppercase tracking-[0.15em] font-mono">
                        <Sparkles className="w-3 h-3 text-[#8E9192]" />
                        <span>Quick Actions</span>
                      </div>
                      <div className="space-y-0.5">
                        {filteredActions.map((action, idx) => {
                          const globalIdx = getIndexOffset('action', idx);
                          const isSelected = selectedIndex === globalIdx;
                          return (
                            <div
                              key={action.id}
                              data-index={globalIdx}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              onClick={action.action}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-[#1E1E22] border border-[#27272A] text-white shadow-sm'
                                  : 'border border-transparent hover:bg-[#141313]/50 text-[#8E9192] hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 rounded-lg bg-[#1E1E22] border border-[#27272A]/60">
                                  {action.icon}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold truncate text-white">
                                    {action.label}
                                  </div>
                                  {action.subLabel && (
                                    <div className="text-[11px] text-[#8E9192]/80 truncate">
                                      {action.subLabel}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <ArrowRight className={`w-3.5 h-3.5 transition-opacity ${isSelected ? 'opacity-100 text-white' : 'opacity-0'}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Projects Group */}
                  {filteredProjects.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-[#8E9192] uppercase tracking-[0.15em] font-mono">
                        <Folder className="w-3 h-3 text-[#8E9192]" />
                        <span>Projects ({filteredProjects.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {filteredProjects.map((proj, idx) => {
                          const globalIdx = getIndexOffset('project', idx);
                          const isSelected = selectedIndex === globalIdx;
                          return (
                            <div
                              key={proj.id}
                              data-index={globalIdx}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              onClick={() => {
                                onClose();
                                onSelectProject(proj.id);
                              }}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-[#1E1E22] border border-[#27272A] text-white shadow-sm'
                                  : 'border border-transparent hover:bg-[#141313]/50 text-[#8E9192] hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-1.5 rounded-lg bg-[#1E1E22] border border-[#27272A]/60 text-[#8E9192]">
                                  <Folder className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="text-xs font-semibold truncate text-white">
                                    {proj.name}
                                  </div>
                                  <div className="text-[11px] text-[#8E9192]/80 truncate">
                                    {proj.category} • {proj.progress}% Complete
                                  </div>
                                </div>
                              </div>
                              <ArrowRight className={`w-3.5 h-3.5 transition-opacity ${isSelected ? 'opacity-100 text-white' : 'opacity-0'}`} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tasks Group */}
                  {filteredTasks.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-[#8E9192] uppercase tracking-[0.15em] font-mono">
                        <Check className="w-3 h-3 text-[#8E9192]" />
                        <span>Tasks ({filteredTasks.length})</span>
                      </div>
                      <div className="space-y-0.5">
                        {filteredTasks.map((task, idx) => {
                          const globalIdx = getIndexOffset('task', idx);
                          const isSelected = selectedIndex === globalIdx;
                          const proj = task.projectId ? projectsMap.get(task.projectId) : undefined;
                          return (
                            <div
                              key={task.id}
                              data-index={globalIdx}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              onClick={() => {
                                onClose();
                                if (task.projectId) {
                                  onSelectProject(task.projectId);
                                } else {
                                  onNavigate('dashboard');
                                }
                                onSelectTask(task.id);
                              }}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-[#1E1E22] border border-[#27272A] text-white shadow-sm'
                                  : 'border border-transparent hover:bg-[#141313]/50 text-[#8E9192] hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleTask(task.id);
                                  }}
                                  title="Click to toggle task status"
                                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                    task.completed
                                      ? 'bg-green-500/10 border-green-500 text-green-400'
                                      : 'border-[#27272A] hover:border-white'
                                  }`}
                                >
                                  <Check className={`w-3 h-3 ${task.completed ? 'opacity-100' : 'opacity-0'}`} />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <div className={`text-xs font-semibold truncate ${task.completed ? 'line-through text-[#8E9192]' : 'text-white'}`}>
                                    {task.title}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-[#8E9192]/80 truncate mt-0.5">
                                    {proj ? (
                                      <span className="bg-[#1E1E22] px-1.5 py-0.5 rounded text-[10px] border border-[#27272A]">
                                        {proj.name}
                                      </span>
                                    ) : (
                                      <span className="text-[#8E9192]/60">Inbox</span>
                                    )}
                                    {task.priority && (
                                      <span className="text-[10px] opacity-80 font-mono">
                                        Priority: {task.priority}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <span className="text-[10px] font-mono text-[#8E9192]/60 shrink-0 ml-2">
                                {task.completed ? 'Done' : 'Active'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer Shortcuts Guide */}
            <div className="px-4 py-2.5 border-t border-[#27272A]/80 bg-[#141313]/40 flex items-center justify-between text-[11px] text-[#8E9192] font-mono">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-[#1E1E22] border border-[#27272A] rounded text-[10px] text-white">↑↓</span>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-[#1E1E22] border border-[#27272A] rounded text-[10px] text-white">↵</span>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-[#1E1E22] border border-[#27272A] rounded text-[10px] text-white">ESC</span>
                  Close
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span>Spotlight</span>
                <span className="px-1.5 py-0.5 bg-[#1E1E22] border border-[#27272A] rounded text-[10px] text-white">⌘K</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
