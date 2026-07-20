import { useCallback, useState } from 'react';
import { deleteSprint, saveSprint } from '../services/database';
import type { Sprint } from '../types';

interface UseSprintActionsOptions {
  onSprintDeleted?: (sprintId: string) => void;
  onSprintRollover?: (sprintId: string, targetSprintId: string | null) => void;
}

export function useSprintActions(options?: UseSprintActionsOptions) {
  const [sprints, setSprints] = useState<Sprint[]>([]);

  const handleCreateSprint = useCallback(
    (projectId: string, name: string, startDate: string, endDate: string, goal?: string) => {
      if (!name.trim()) return;
      let validEnd = endDate;
      if (new Date(validEnd) < new Date(startDate)) {
        validEnd = startDate;
      }
      const hasActive = sprints.some((s) => s.projectId === projectId && s.status === 'Active');
      const newSprint: Sprint = {
        id: `sprint_${Date.now()}`,
        projectId,
        name: name.trim(),
        status: hasActive ? 'Planned' : 'Active',
        startDate,
        endDate: validEnd,
        goal: goal?.trim() || undefined,
        sortOrder: sprints.filter((s) => s.projectId === projectId).length,
      };
      setSprints((prev) => [...prev, newSprint]);
      saveSprint(newSprint);
    },
    [sprints],
  );

  const handleEditSprint = useCallback((sprintId: string, updates: Partial<Sprint>) => {
    setSprints((prev) => {
      const target = prev.find((s) => s.id === sprintId);
      if (!target) return prev;
      let newSprints = [...prev];
      if (updates.status === 'Active') {
        newSprints = newSprints.map((s) => {
          if (s.projectId === target.projectId && s.id !== sprintId && s.status === 'Active') {
            const updated = { ...s, status: 'Planned' as const };
            saveSprint(updated);
            return updated;
          }
          return s;
        });
      }
      const updated = newSprints.map((s) => {
        if (s.id === sprintId) {
          let validEnd = updates.endDate || s.endDate;
          const validStart = updates.startDate || s.startDate;
          if (new Date(validEnd) < new Date(validStart)) {
            validEnd = validStart;
          }
          const u = { ...s, ...updates, endDate: validEnd };
          saveSprint(u);
          return u;
        }
        return s;
      });
      return updated;
    });
  }, []);

  const handleCompleteSprint = useCallback((sprintId: string) => {
    const now = new Date().toISOString();
    setSprints((prev) =>
      prev.map((s) => {
        if (s.id === sprintId) {
          const u = { ...s, status: 'Completed' as const, completedAt: now };
          saveSprint(u);
          return u;
        }
        return s;
      }),
    );
  }, []);

  const handleDeleteSprint = useCallback(
    (sprintId: string) => {
      setSprints((prev) => prev.filter((s) => s.id !== sprintId));
      deleteSprint(sprintId);
      options?.onSprintDeleted?.(sprintId);
    },
    [options],
  );

  const handleSprintRollover = useCallback(
    (sprintId: string, targetSprintId: string | null) => {
      const now = new Date().toISOString();
      setSprints((prev) =>
        prev.map((s) => {
          if (s.id === sprintId) {
            const u = { ...s, status: 'Completed' as const, completedAt: now };
            saveSprint(u);
            return u;
          }
          return s;
        }),
      );
      options?.onSprintRollover?.(sprintId, targetSprintId);
    },
    [options],
  );

  return {
    sprints,
    setSprints,
    handleCreateSprint,
    handleEditSprint,
    handleCompleteSprint,
    handleDeleteSprint,
    handleSprintRollover,
  };
}
