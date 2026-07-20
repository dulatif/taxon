export interface DailyActivity {
  day: string;
  date: string;
  hours: number;
  completions: number;
  isToday?: boolean;
}

export interface ActivityLogEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  completedAt: string;
}
