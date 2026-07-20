import React from 'react';
import { useWindowMaximize } from '../hooks/useWindowMaximize';

interface AppLayoutProps {
  titleBar: React.ReactNode;
  sidebar: React.ReactNode;
  header: React.ReactNode;
  focusMode?: React.ReactNode;
  children: React.ReactNode;
  taskDetailDrawer?: React.ReactNode;
}

export default function AppLayout({
  titleBar,
  sidebar,
  header,
  focusMode,
  children,
  taskDetailDrawer,
}: AppLayoutProps) {
  const isMaximized = useWindowMaximize();

  return (
    <div
      className={`flex flex-col h-screen overflow-hidden bg-surface-app text-text-primary font-sans antialiased selection:bg-white/10 selection:text-white ${
        isMaximized ? '' : 'rounded-xl border border-border-primary shadow-2xl'
      }`}
    >
      {titleBar}

      {focusMode}

      {taskDetailDrawer}

      <div className="flex flex-1 overflow-hidden relative">
        {sidebar}

        <div className="flex-1 flex flex-col overflow-hidden">
          {header}

          <main className="flex-1 overflow-y-auto bg-surface-app bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-surface-primary via-surface-app to-surface-app focus:outline-none scrollbar-thin">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
