import { useCallback, useEffect, useState } from 'react';
import {
  applyAgentChanges,
  cleanUpArchivedFiles,
  diffAgentChanges,
  exportProjectToAgent,
  generateContextSnapshot,
  scanAgentDirectory,
} from '../services/agentSync';
import { getAgentSyncState, saveAgentSyncState } from '../services/database';
import { scanAgentVault } from '../services/vaultScanner';
import type { Project, Sprint, Task, VaultEntry } from '../types';
import type { AgentDiffResult, AgentSyncState } from '../types/agent';

export function useAgentSync(
  project: Project | null,
  tasks: Task[],
  sprints: Sprint[],
  refreshAllData: () => Promise<void>,
) {
  const [syncState, setSyncState] = useState<AgentSyncState | null>(null);
  const [agentDiff, setAgentDiff] = useState<AgentDiffResult | null>(null);
  const [agentEntries, setAgentEntries] = useState<VaultEntry[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sync state from DB on mount / project change
  useEffect(() => {
    async function loadSyncState() {
      if (!project) {
        setSyncState(null);
        return;
      }
      try {
        const state = await getAgentSyncState(project.id);
        setSyncState(state);
      } catch (err) {
        console.error('Failed to load agent sync state', err);
      }
    }
    loadSyncState();
  }, [project]);

  const refreshAgentEntries = useCallback(async () => {
    if (!project?.vaultPath) {
      setAgentEntries([]);
      return;
    }
    try {
      const entries = await scanAgentVault(project.vaultPath);
      setAgentEntries(entries);
    } catch (err) {
      console.error('Failed to scan agent vault', err);
    }
  }, [project]);

  // Load agent entries on mount if vault path exists
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshAgentEntries();
  }, [refreshAgentEntries]);

  const exportToAgent = async () => {
    if (!project) return;

    setIsExporting(true);
    setError(null);

    if (!project.vaultPath) {
      setError('Project vault path is not set.');
      setIsExporting(false);
      return;
    }

    try {
      const state = await exportProjectToAgent(project, tasks, sprints, project.vaultPath);
      await saveAgentSyncState(project.id, state);
      setSyncState(state);
      await refreshAgentEntries();
    } catch (err: unknown) {
      console.error('Failed to export to agent', err);
      setError(err instanceof Error ? err.message : 'Unknown error during export');
    } finally {
      setIsExporting(false);
    }
  };

  const scanForChanges = async () => {
    if (!project) return;

    setIsScanning(true);
    setError(null);
    setAgentDiff(null);

    if (!project.vaultPath) {
      setError('Project vault path is not set.');
      setIsScanning(false);
      return;
    }

    try {
      const {
        tasks: agentTasks,
        sprints: agentSprints,
        warnings,
      } = await scanAgentDirectory(project.vaultPath, project.id);

      const diff = diffAgentChanges(project.id, tasks, sprints, agentTasks, agentSprints);
      diff.warnings.push(...warnings);

      setAgentDiff(diff);

      if (
        diff.newTasks.length === 0 &&
        diff.modifiedTasks.length === 0 &&
        diff.newSprints.length === 0 &&
        diff.modifiedSprints.length === 0
      ) {
        setError('No changes found in the agent directory.');
      }
    } catch (err: unknown) {
      console.error('Failed to scan agent directory for changes', err);
      setError(err instanceof Error ? err.message : 'Unknown error during scan');
    } finally {
      setIsScanning(false);
    }
  };

  const confirmImport = async () => {
    if (!project || !agentDiff) return;

    setIsImporting(true);
    setError(null);

    try {
      await applyAgentChanges(agentDiff);

      const newState: AgentSyncState = syncState
        ? { ...syncState }
        : {
            exportedTaskCount: 0,
            exportedSprintCount: 0,
            lastExportedAt: null,
            lastImportedAt: null,
          };

      newState.lastImportedAt = new Date().toISOString();
      await saveAgentSyncState(project.id, newState);
      setSyncState(newState);

      await refreshAllData();
      await refreshAgentEntries();

      setAgentDiff(null);
    } catch (err: unknown) {
      console.error('Failed to apply agent changes', err);
      setError(err instanceof Error ? err.message : 'Unknown error during apply');
    } finally {
      setIsImporting(false);
    }
  };

  const cancelImport = () => {
    setAgentDiff(null);
    setError(null);
  };

  const cleanUpArchived = async () => {
    if (!project?.vaultPath) {
      setError('Project vault path is not set.');
      return { movedCount: 0, errors: ['Project vault path is not set.'] };
    }

    setIsExporting(true);
    setError(null);

    try {
      const result = await cleanUpArchivedFiles(project.vaultPath);
      await refreshAgentEntries();
      return result;
    } catch (err: unknown) {
      console.error('Failed to clean up archived files', err);
      const errMsg = err instanceof Error ? err.message : 'Unknown error during cleanup';
      setError(errMsg);
      return { movedCount: 0, errors: [errMsg] };
    } finally {
      setIsExporting(false);
    }
  };

  const copyContextSnapshot = async (): Promise<{ success: boolean; activeCount: number }> => {
    if (!project) {
      setError('No project selected.');
      return { success: false, activeCount: 0 };
    }

    try {
      const snapshot = generateContextSnapshot(project, tasks, sprints);
      await navigator.clipboard.writeText(snapshot);
      const activeCount = tasks.filter(
        (t) =>
          t.projectId === project.id &&
          !t.archived &&
          (t.status === 'In Progress' || t.status === 'To Do'),
      ).length;
      return { success: true, activeCount };
    } catch (err: unknown) {
      console.error('Failed to copy context snapshot to clipboard', err);
      const errMsg = err instanceof Error ? err.message : 'Failed to copy to clipboard';
      setError(errMsg);
      return { success: false, activeCount: 0 };
    }
  };

  return {
    syncState,
    agentDiff,
    agentEntries,
    isExporting,
    isImporting,
    isScanning,
    error,
    exportToAgent,
    scanForChanges,
    confirmImport,
    cancelImport,
    cleanUpArchived,
    copyContextSnapshot,
    refreshAgentEntries,
  };
}
