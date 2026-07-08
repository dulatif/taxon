import { useEffect } from 'react';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';

interface UseGlobalShortcutsOptions {
  onQuickAddTask: () => void;
  onLaunchFocusMode: () => void;
}

export function useGlobalShortcuts({ onQuickAddTask, onLaunchFocusMode }: UseGlobalShortcutsOptions) {
  useEffect(() => {
    const setupShortcuts = async () => {
      try {
        await unregisterAll();
        
        await register('CommandOrControl+K', (e) => {
          if (e.state === 'Pressed') {
            const searchInput = document.getElementById('global-search-input');
            if (searchInput) {
              (searchInput as HTMLInputElement).focus();
            }
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
        console.error("Failed to register global shortcuts:", err);
      }
    };

    setupShortcuts();

    return () => {
      unregisterAll().catch(console.error);
    };
  }, [onQuickAddTask, onLaunchFocusMode]);
}
