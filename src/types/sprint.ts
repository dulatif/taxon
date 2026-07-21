export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  status: 'Active' | 'Planned' | 'Completed';
  startDate: string;
  endDate: string;
  goal?: string;
  sortOrder?: number;
  completedAt?: string;
}
