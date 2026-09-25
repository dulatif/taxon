import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { useEffect } from 'react';

interface UseGlobalShortcutsOptions {
  onQuickAddTask: () => void;
  onLaunchFocusMode: () => void;
  onOpenSpotlight: () => void;
  onStartPauseTimer: () => void;
  onStopTimer: () => void;
}

export function useGlobalShortcuts({
  onQuickAddTask,
  onLaunchFocusMode,
  onOpenSpotlight,
  onStartPauseTimer,
  onStopTimer,
}: UseGlobalShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        const key = e.key.toLowerCase();
        if (key === 'k') {
          e.preventDefault();
          onOpenSpotlight();
        } else if (key === 'n') {
          e.preventDefault();
          onQuickAddTask();
        } else if (key === 'f') {
          e.preventDefault();
          onLaunchFocusMode();
        } else if (key === 'p' && e.shiftKey) {
          e.preventDefault();
          onStartPauseTimer();
        } else if (key === 's' && e.shiftKey) {
          e.preventDefault();
          onStopTimer();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSpotlight, onQuickAddTask, onLaunchFocusMode, onStartPauseTimer, onStopTimer]);

  useEffect(() => {
    const setupShortcuts = async () => {
      try {
        await unregisterAll();

        await register('CommandOrControl+K', (e) => {
          if (e.state === 'Pressed') {
            onOpenSpotlight();
          }
        });

        await register('CommandOrControl+N', (e) => {
          if (e.state === 'Pressed') {
            onQuickAddTask();
          }
        });

        await register('CommandOrControl+F', (e) => {
          if (e.state === 'Pressed') {
            onLaunchFocusMode();
          }
        });

        await register('CommandOrControl+Shift+P', (e) => {
          if (e.state === 'Pressed') {
            onStartPauseTimer();
          }
        });

        await register('CommandOrControl+Shift+S', (e) => {
          if (e.state === 'Pressed') {
            onStopTimer();
          }
        });
      } catch (err) {
        console.error('Failed to register global shortcuts:', err);
      }
    };

    setupShortcuts();

    return () => {
      unregisterAll().catch(console.error);
    };
  }, [onQuickAddTask, onLaunchFocusMode, onOpenSpotlight, onStartPauseTimer, onStopTimer]);
}
