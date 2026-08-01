import { Timer } from 'lucide-react';

interface AppHeaderProps {
  title: string;
  onLaunchFocusMode: () => void;
}

export default function AppHeader({ title, onLaunchFocusMode }: AppHeaderProps) {
  return (
    <header className="flex justify-between items-center h-16 border-b border-border-primary px-8 bg-surface-app sticky top-0 z-40 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-text-primary font-bold text-sm uppercase tracking-wider font-mono">
          {title}
        </h1>
      </div>

      {/* Quick global utility actions */}
      <div className="flex items-center gap-6">
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
