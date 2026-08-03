import { BellRing, Palette, Settings2 } from 'lucide-react';
export type SettingsTab = 'general' | 'appearance' | 'notifications';

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  setActiveTab: (tab: SettingsTab) => void;
}

export default function SettingsSidebar({ activeTab, setActiveTab }: SettingsSidebarProps) {
  const tabs = [
    { id: 'general', label: 'General', icon: Settings2 },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'notifications', label: 'Notifications', icon: BellRing },
  ] as const;

  return (
    <div className="w-48 shrink-0 flex flex-col justify-between pr-6 border-r border-border-primary/50">
      <div className="flex flex-col gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-interactive-primary/10 text-interactive-primary border border-interactive-primary/20'
                  : 'text-text-muted hover:bg-surface-secondary hover:text-text-primary border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-4 border-t border-border-primary/40 flex flex-col gap-0.5">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
          Taxon App
        </span>
        <span className="text-xs font-mono font-bold text-text-primary">v1.0.0</span>
      </div>
    </div>
  );
}
