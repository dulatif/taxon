import {
  BarChart3,
  Calendar,
  CheckSquare,
  Folder,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  Repeat,
  Settings,
} from 'lucide-react';

interface NavigationListProps {
  currentView: string;
  selectedProjectId: string | null;
  onViewChange: (view: string) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const MAIN_NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inbox', label: 'Inbox', icon: Inbox },
  { id: 'projects', label: 'Projects', icon: Folder },
  { id: 'todo', label: 'Todo List', icon: CheckSquare },
  { id: 'scheduled', label: 'Scheduled', icon: Calendar },
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
}: NavigationListProps) {
  const getItemClass = (id: string) => {
    const isPrimary = currentView === id && selectedProjectId === null;
    return `w-full flex items-center gap-3 px-3 py-2 rounded-lg font-sans tracking-tight text-sm transition-all duration-200 ${
      isPrimary
        ? 'text-text-primary font-bold bg-surface-hover'
        : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
    }`;
  };

  return (
    <nav className="space-y-1 pb-4 border-b border-border-primary/50 shrink-0">
      {MAIN_NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          id={`nav-${item.id}`}
          onClick={() => onViewChange(item.id)}
          className={getItemClass(item.id)}
        >
          <item.icon className="w-4 h-4" />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
