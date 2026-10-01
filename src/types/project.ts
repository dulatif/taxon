export type ProjectCategory =
  | 'Engineering'
  | 'Design'
  | 'Product'
  | 'Marketing'
  | 'Operations'
  | 'Personal'
  | 'Completed'
  | string;

export interface Project {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  progress: number;
  dueDate?: string;
  sortOrder?: number;
  vaultPath?: string;
  workspacePaths?: string[];
  pinned?: boolean;
  pinnedSortOrder?: number;
  worktreeEnabled?: boolean;
  worktreeDir?: string;
  worktreeSetupCommand?: string;
}
