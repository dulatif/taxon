export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export type RecurrenceFrequency = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number;
  daysOfWeek?: number[];
}

export interface Task {
  id: string;
  projectId: string | null;
  sprintId?: string | null;
  title: string;
  completed: boolean;
  duration: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Need to Test' | 'Done';
  dueDate?: string;
  description?: string;
  labels?: string[];
  reminders?: string[];
  deadline?: string;
  subtasks?: SubTask[];
  timeEffort?: number;
  timeSpent?: number;
  sortOrder?: number;
  recurrence?: RecurrenceRule;
  archived?: boolean;
  archivedAt?: string;
  workspacePath?: string;
  worktreeBranch?: string;
  worktreeStatus?: 'none' | 'active' | 'merged' | 'orphaned';
  linkedFiles?: string[];
  dependsOn?: string[];
  moduleGroup?: string;
  inputs?: string[];
  outputs?: string[];
  baseCommit?: string;
  revisionCount?: number;
  lastRevisionAt?: string;
  escalated?: boolean;
}
