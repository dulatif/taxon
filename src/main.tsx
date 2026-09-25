import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { SettingsProvider } from './contexts/SettingsContext.tsx';
import './index.css';

// Disable default right-click context menu across the application
document.addEventListener('contextmenu', (event) => event.preventDefault());

// Disable default app zoom (Ctrl + Wheel / Cmd + Wheel)
document.addEventListener(
  'wheel',
  (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
    }
  },
  { passive: false },
);

// Disable default app zoom keyboard shortcuts (Ctrl/Cmd +/-/0)
document.addEventListener('keydown', (e) => {
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === '=' || e.key === '-' || e.key === '+' || e.key === '_' || e.key === '0')
  ) {
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </StrictMode>,
);
