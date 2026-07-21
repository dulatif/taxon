import { useState } from 'react';

export function useAppNavigation() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const navigateTo = (view: string) => {
    setSelectedProjectId(null);
    setCurrentView(view);
  };

  const selectProject = (id: string) => {
    setSelectedProjectId(id);
    setCurrentView('project-details');
  };

  return {
    currentView,
    selectedProjectId,
    navigateTo,
    selectProject,
    setCurrentView,
    setSelectedProjectId,
  };
}
