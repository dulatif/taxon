import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { useEffect } from 'react';

interface UseGlobalShortcutsOptions {
  onQuickAddTask: () => void;
  onLaunchFocusMode: () => void;
  onOpenSpotlight: () => void;
}

export function useGlobalShortcuts({
  onQuickAddTask,
  onLaunchFocusMode,
  onOpenSpotlight,
}: UseGlobalShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenSpotlight();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSpotlight]);

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
      } catch (err) {
        console.error('Failed to register global shortcuts:', err);
      }
    };

    setupShortcuts();

    return () => {
      unregisterAll().catch(console.error);
    };
  }, [onQuickAddTask, onLaunchFocusMode, onOpenSpotlight]);
}
