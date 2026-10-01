import {
  BarChart3,
  Calendar,
  CheckSquare,
  Folder,
  HelpCircle,
  History,
  Inbox,
  LayoutDashboard,
  Repeat,
  Settings,
} from 'lucide-react';

import type { JumpState } from '../../hooks/useVimNavigation';

interface NavigationListProps {
  currentView: string;
  selectedProjectId: string | null;
  onViewChange: (view: string) => void;
  jumpState?: JumpState;
}

// eslint-disable-next-line react-refresh/only-export-components
export const NAV_SHORTCUT_KEYS: Record<string, string> = {
  dashboard: 'd',
  inbox: 'i',
  projects: 'p',
  todo: 't',
  scheduled: 'c',
  history: 'w',
  recurring: 'r',
  analytics: 'a',
};

// eslint-disable-next-line react-refresh/only-export-components
export const MAIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'projects', label: 'Projects', icon: Folder },
  { id: 'todo', label: 'Todo List', icon: CheckSquare },
  { id: 'scheduled', label: 'Scheduled', icon: Calendar },
  { id: 'history', label: 'Work Log', icon: History },
  { id: 'recurring', label: 'Recurring', icon: Repeat },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

// eslint-disable-next-line react-refresh/only-export-components
export const FOOTER_NAV_ITEMS = [
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help & Support', icon: HelpCircle },
];

export default function NavigationList({
  currentView,
  selectedProjectId,
  onViewChange,
  jumpState,
}: NavigationListProps) {
  const getItemClass = (id: string) => {
    const isPrimary = currentView === id && selectedProjectId === null;
    return `group flex items-center justify-between px-3 py-2 rounded-md text-[13px] transition-colors w-full cursor-pointer ${
      isPrimary
        ? 'bg-surface-active text-text-primary font-bold'
        : 'text-text-muted hover:text-text-primary hover:bg-surface-secondary/50 font-medium'
    }`;
  };

  const showJumpBadge = jumpState?.isActive && jumpState.stage === 'category';

  return (
    <nav className="space-y-1 pb-4 border-b border-border-primary/50 shrink-0">
      {MAIN_NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          id={`nav-${item.id}`}
          onClick={() => onViewChange(item.id)}
          className={getItemClass(item.id)}
        >
          <div className="flex items-center gap-3">
            <item.icon className="w-4 h-4 shrink-0" />
            <span>{item.label}</span>
          </div>
          {showJumpBadge && NAV_SHORTCUT_KEYS[item.id] && (
            <kbd className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded text-[10px] font-mono font-bold shrink-0">
              {NAV_SHORTCUT_KEYS[item.id]}
            </kbd>
          )}
        </button>
      ))}
    </nav>
  );
}
