import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { listen } from '@tauri-apps/api/event';

export function useWindowMaximize() {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    win.isMaximized().then(setIsMaximized);

    const unlistenPromise = listen('tauri://resize', async () => {
      try {
        setIsMaximized(await win.isMaximized());
      } catch (e) {
        // Ignore errors during window destruction
      }
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, []);

  return isMaximized;
}
