import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';

interface UseSystemTrayOptions {
  onQuickAdd: () => void;
  onStartFocus: () => void;
}

export function useSystemTray({ onQuickAdd, onStartFocus }: UseSystemTrayOptions) {
  useEffect(() => {
    const unlistenAdd = listen('tray-quick-add', () => {
      onQuickAdd();
    });
    const unlistenFocus = listen('tray-start-focus', () => {
      onStartFocus();
    });

    return () => {
      unlistenAdd.then(f => f());
      unlistenFocus.then(f => f());
    };
  }, [onQuickAdd, onStartFocus]);
}
