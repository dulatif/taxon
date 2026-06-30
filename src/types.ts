export interface Project {
  id: string;
  name: string;
  description: string;
  category: 'Design' | 'Active' | 'Planning' | 'Completed';
  progress: number; // percentage (0 - 100)
  dueDays: number;
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  projectId: string | null;
  title: string;
  completed: boolean;
  duration: string; // e.g. "45m", "2h", "1.5h"
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'To Do' | 'In Progress' | 'Done';
  dueDate?: string; // ISO date string for calendar mapping
  description?: string;
  labels?: string[];
  reminders?: string[];
  deadline?: string;
  subtasks?: SubTask[];
  timeEffort?: number; // estimated effort in minutes
  timeSpent?: number; // time spent in minutes
}

export interface DocumentFile {
  id: string;
  projectId: string;
  name: string;
  size: string;
  type: 'image' | 'code' | 'pdf' | 'spreadsheet';
}

export interface DailyActivity {
  day: string; // e.g. "Mon"
  date: string; // ISO date string (YYYY-MM-DD)
  hours: number;
  completions: number;
  isToday?: boolean;
}

export interface ActivityLogEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  completedAt: string; // ISO datetime string
}

export interface SettingsState {
  theme: 'dark' | 'light';
  oledBlackMode: boolean;
  soundAlerts: boolean;
  backupFrequency: 'Daily' | 'Weekly' | 'Never';
}
