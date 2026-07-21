import type { Sprint, Task } from './index';

export interface AgentDiffResult {
  newTasks: Task[];
  modifiedTasks: { before: Task; after: Task; changedFields: string[] }[];
  newSprints: Sprint[];
  modifiedSprints: { before: Sprint; after: Sprint; changedFields: string[] }[];
  warnings: string[];
}

export interface AgentSyncState {
  lastExportedAt: string | null;
  lastImportedAt: string | null;
  exportedTaskCount: number;
  exportedSprintCount: number;
}
