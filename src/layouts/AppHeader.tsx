import { Moon, Search, Sun, Timer } from 'lucide-react';
import React from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface AppHeaderProps {
  title: string;
  onOpenSpotlight: () => void;
  onLaunchFocusMode: () => void;
}

export default function AppHeader({ title, onOpenSpotlight, onLaunchFocusMode }: AppHeaderProps) {
  const { settings, updateSetting } = useSettings();

  return (
    <header className="flex justify-between items-center h-16 border-b border-border-primary px-8 bg-surface-app sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-text-primary font-bold text-sm uppercase tracking-wider font-mono">
          {title}
        </h1>
      </div>

      {/* Quick global utility actions */}
      <div className="flex items-center gap-6">
        {/* Global Search Trigger Button */}
        <button
          id="global-search-input"
          onClick={onOpenSpotlight}
          className="relative group bg-surface-secondary border border-border-primary hover:border-border-hover rounded-lg pl-9 pr-2.5 py-1.5 text-xs text-text-muted hover:text-text-primary flex items-center justify-between w-64 transition-all cursor-pointer select-none"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-hover:text-text-primary w-3.5 h-3.5 transition-colors" />
          <span>Search tasks & projects...</span>
          <span className="px-1.5 py-0.5 rounded bg-surface-tertiary border border-border-primary text-[10px] font-mono text-text-muted group-hover:text-text-primary transition-colors">
            ⌘K
          </span>
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
          title="Toggle Theme"
          className="active:scale-95 transition-transform p-2 bg-surface-primary hover:bg-surface-secondary rounded-lg cursor-pointer"
        >
          {settings.theme === 'light' ? (
            <Sun className="w-4 h-4 text-text-primary" />
          ) : (
            <Moon className="w-4 h-4 text-text-primary" />
          )}
        </button>

        {/* Immersive Focus Mode launcher button */}
        <button
          id="header-focus-mode"
          onClick={onLaunchFocusMode}
          title="Launch Immersive Focus Mode"
          className="active:scale-95 transition-transform p-2 bg-surface-primary hover:bg-surface-secondary rounded-lg cursor-pointer"
        >
          <Timer className="w-4 h-4 text-text-primary" />
        </button>
      </div>
    </header>
  );
}
