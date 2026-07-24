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

export interface AuditLogEntry {
  id: string;
  projectId: string;
  timestamp: string;
  action: 'task_created' | 'task_modified' | 'sprint_created' | 'sprint_modified';
  entityType: 'task' | 'sprint';
  entityId: string;
  entityTitle: string;
  changedFields?: string[];
  diffSummary?: Record<string, { before: string; after: string }>;
  commitHash?: string;
}
