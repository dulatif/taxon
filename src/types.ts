export type ProjectCategory = 'Engineering' | 'Design' | 'Product' | 'Marketing' | 'Operations' | 'Personal' | 'Completed' | string;

export interface Project {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  progress: number; // percentage (0 - 100)
  dueDays: number;
  sortOrder?: number;
}

export const PROJECT_CATEGORIES = [
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Operations',
  'Personal',
] as const;

export type CategoryColor = 'blue' | 'pink' | 'purple' | 'orange' | 'emerald' | 'yellow' | 'cyan' | 'teal' | 'indigo' | 'rose' | 'violet' | 'lime' | 'red' | 'amber' | 'white';

export const CATEGORY_COLORS = [
  { id: 'blue', name: 'Blue', dot: 'bg-[#3B82F6]', text: 'text-[#60A5FA]', border: 'border-[#3B82F6]/40', bg: 'bg-[#3B82F6]/10' },
  { id: 'pink', name: 'Pink', dot: 'bg-[#EC4899]', text: 'text-[#F472B6]', border: 'border-[#EC4899]/40', bg: 'bg-[#EC4899]/10' },
  { id: 'purple', name: 'Purple', dot: 'bg-[#A855F7]', text: 'text-[#C084FC]', border: 'border-[#A855F7]/40', bg: 'bg-[#A855F7]/10' },
  { id: 'orange', name: 'Orange', dot: 'bg-[#F97316]', text: 'text-[#FB923C]', border: 'border-[#F97316]/40', bg: 'bg-[#F97316]/10' },
  { id: 'emerald', name: 'Emerald', dot: 'bg-[#10B981]', text: 'text-[#34D399]', border: 'border-[#10B981]/40', bg: 'bg-[#10B981]/10' },
  { id: 'yellow', name: 'Yellow', dot: 'bg-[#EAB308]', text: 'text-[#FACC15]', border: 'border-[#EAB308]/40', bg: 'bg-[#EAB308]/10' },
  { id: 'cyan', name: 'Cyan', dot: 'bg-[#06B6D4]', text: 'text-[#22D3EE]', border: 'border-[#06B6D4]/40', bg: 'bg-[#06B6D4]/10' },
  { id: 'teal', name: 'Teal', dot: 'bg-[#14B8A6]', text: 'text-[#2DD4BF]', border: 'border-[#14B8A6]/40', bg: 'bg-[#14B8A6]/10' },
  { id: 'indigo', name: 'Indigo', dot: 'bg-[#6366F1]', text: 'text-[#818CF8]', border: 'border-[#6366F1]/40', bg: 'bg-[#6366F1]/10' },
  { id: 'rose', name: 'Rose', dot: 'bg-[#F43F5E]', text: 'text-[#FB7185]', border: 'border-[#F43F5E]/40', bg: 'bg-[#F43F5E]/10' },
  { id: 'violet', name: 'Violet', dot: 'bg-[#8B5CF6]', text: 'text-[#A78BFA]', border: 'border-[#8B5CF6]/40', bg: 'bg-[#8B5CF6]/10' },
  { id: 'lime', name: 'Lime', dot: 'bg-[#84CC16]', text: 'text-[#A3E635]', border: 'border-[#84CC16]/40', bg: 'bg-[#84CC16]/10' },
  { id: 'red', name: 'Red', dot: 'bg-[#EF4444]', text: 'text-[#F87171]', border: 'border-[#EF4444]/40', bg: 'bg-[#EF4444]/10' },
  { id: 'amber', name: 'Amber', dot: 'bg-[#F59E0B]', text: 'text-[#FBBF24]', border: 'border-[#F59E0B]/40', bg: 'bg-[#F59E0B]/10' },
] as const;

const CATEGORY_COLORS_KEY = 'axon_tasking_category_colors';
const CATEGORIES_KEY = 'axon_tasking_categories';

let categoryColorsMap: Record<string, string> = {};
try {
  const saved = localStorage.getItem(CATEGORY_COLORS_KEY);
  if (saved) {
    categoryColorsMap = JSON.parse(saved);
  }
} catch (e) {}

export function getCategoryColorId(cat: string): string {
  if (categoryColorsMap[cat]) return categoryColorsMap[cat];
  switch (cat) {
    case 'Engineering': return 'blue';
    case 'Design': return 'pink';
    case 'Product': return 'purple';
    case 'Marketing': return 'orange';
    case 'Operations': return 'emerald';
    case 'Personal': return 'yellow';
    case 'Completed': return 'white';
    default: {
      let hash = 0;
      for (let i = 0; i < cat.length; i++) {
        hash = cat.charCodeAt(i) + ((hash << 5) - hash);
      }
      const defaultPalette = ['cyan', 'teal', 'indigo', 'rose', 'violet', 'lime'];
      return defaultPalette[Math.abs(hash) % defaultPalette.length];
    }
  }
}

export function getCategoryStyle(cat: string) {
  if (cat === 'Completed') {
    return { dot: 'bg-white', text: 'text-black font-bold', border: 'border-white', bg: 'bg-white' };
  }
  const colorId = getCategoryColorId(cat);
  const found = CATEGORY_COLORS.find(c => c.id === colorId);
  if (found) {
    return { dot: found.dot, text: found.text, border: found.border, bg: found.bg };
  }
  return { dot: 'bg-[#06B6D4]', text: 'text-[#22D3EE]', border: 'border-[#06B6D4]/40', bg: 'bg-[#06B6D4]/10' };
}

export function setCategoryColor(cat: string, colorId: string) {
  categoryColorsMap[cat] = colorId;
  try {
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(categoryColorsMap));
  } catch (e) {}
}

export function removeCategoryColor(cat: string) {
  delete categoryColorsMap[cat];
  try {
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(categoryColorsMap));
  } catch (e) {}
}

export function renameCategoryColor(oldCat: string, newCat: string) {
  if (categoryColorsMap[oldCat]) {
    categoryColorsMap[newCat] = categoryColorsMap[oldCat];
    delete categoryColorsMap[oldCat];
  } else {
    categoryColorsMap[newCat] = getCategoryColorId(oldCat);
  }
  try {
    localStorage.setItem(CATEGORY_COLORS_KEY, JSON.stringify(categoryColorsMap));
  } catch (e) {}
}

export function getSavedCategories(): string[] | null {
  try {
    const saved = localStorage.getItem(CATEGORIES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return null;
}

export function saveCategories(cats: string[]) {
  try {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
  } catch (e) {}
}


export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export type RecurrenceFrequency = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number; // e.g. every 2 weeks
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
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
  sortOrder?: number;
  recurrence?: RecurrenceRule;
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
