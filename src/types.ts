export type ProjectCategory = 'Engineering' | 'Design' | 'Product' | 'Marketing' | 'Operations' | 'Personal' | 'Completed' | string;

export interface Project {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  progress: number; // percentage (0 - 100)
  dueDays: number;
}

export const PROJECT_CATEGORIES = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Operations',
  'Personal',
] as const;

export function getCategoryStyle(cat: string) {
  switch (cat) {
    case 'Engineering':
      return { dot: 'bg-[#3B82F6]', text: 'text-[#60A5FA]', border: 'border-[#3B82F6]/40', bg: 'bg-[#3B82F6]/10' };
    case 'Design':
      return { dot: 'bg-[#EC4899]', text: 'text-[#F472B6]', border: 'border-[#EC4899]/40', bg: 'bg-[#EC4899]/10' };
    case 'Product':
      return { dot: 'bg-[#A855F7]', text: 'text-[#C084FC]', border: 'border-[#A855F7]/40', bg: 'bg-[#A855F7]/10' };
    case 'Marketing':
      return { dot: 'bg-[#F97316]', text: 'text-[#FB923C]', border: 'border-[#F97316]/40', bg: 'bg-[#F97316]/10' };
    case 'Operations':
      return { dot: 'bg-[#10B981]', text: 'text-[#34D399]', border: 'border-[#10B981]/40', bg: 'bg-[#10B981]/10' };
    case 'Personal':
      return { dot: 'bg-[#EAB308]', text: 'text-[#FACC15]', border: 'border-[#EAB308]/40', bg: 'bg-[#EAB308]/10' };
    case 'Completed':
      return { dot: 'bg-white', text: 'text-black font-bold', border: 'border-white', bg: 'bg-white' };
    default: {
      let hash = 0;
      for (let i = 0; i < cat.length; i++) {
        hash = cat.charCodeAt(i) + ((hash << 5) - hash);
      }
      const palette = [
        { dot: 'bg-[#06B6D4]', text: 'text-[#22D3EE]', border: 'border-[#06B6D4]/40', bg: 'bg-[#06B6D4]/10' },
        { dot: 'bg-[#14B8A6]', text: 'text-[#2DD4BF]', border: 'border-[#14B8A6]/40', bg: 'bg-[#14B8A6]/10' },
        { dot: 'bg-[#6366F1]', text: 'text-[#818CF8]', border: 'border-[#6366F1]/40', bg: 'bg-[#6366F1]/10' },
        { dot: 'bg-[#F43F5E]', text: 'text-[#FB7185]', border: 'border-[#F43F5E]/40', bg: 'bg-[#F43F5E]/10' },
        { dot: 'bg-[#8B5CF6]', text: 'text-[#A78BFA]', border: 'border-[#8B5CF6]/40', bg: 'bg-[#8B5CF6]/10' },
        { dot: 'bg-[#84CC16]', text: 'text-[#A3E635]', border: 'border-[#84CC16]/40', bg: 'bg-[#84CC16]/10' },
      ];
      return palette[Math.abs(hash) % palette.length];
    }
  }
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
  pomodoroWorkDuration: number; // in minutes
  pomodoroShortBreak: number; // in minutes
  pomodoroLongBreak: number; // in minutes
  pomodoroLongBreakInterval: number; // sessions before long break
}
