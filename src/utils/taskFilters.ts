import { Task, Project } from '../types';

// ---------------------------------------------------------------------------
// Priority ordering & color maps
// ---------------------------------------------------------------------------

export const PRIORITY_ORDER: Record<Task['priority'], number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/** Tailwind classes for priority badge background / text */
export const PRIORITY_COLORS: Record<Task['priority'], { bg: string; text: string; dot: string }> = {
  Critical: { bg: 'bg-red-500/20',    text: 'text-red-400',    dot: 'bg-red-500' },
  High:     { bg: 'bg-orange-500/20', text: 'text-orange-400', dot: 'bg-orange-500' },
  Medium:   { bg: 'bg-yellow-500/20', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  Low:      { bg: 'bg-zinc-700/40',   text: 'text-zinc-400',   dot: 'bg-zinc-500' },
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getWeekEndStr(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonthEndStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export type DueDateRangeKey = 'overdue' | 'today' | 'week' | 'month' | 'custom' | null;

/** Returns a human-readable relative label for a due date */
export function getDueDateLabel(dueDate: string | undefined): string | null {
  if (!dueDate) return null;
  const today = getTodayStr();
  const weekEnd = getWeekEndStr();
  const date = dueDate.substring(0, 10);
  if (date < today) return 'Overdue';
  if (date === today) return 'Today';
  if (date <= weekEnd) {
    // Calculate days remaining
    const diff = Math.round((new Date(date).getTime() - new Date(today).getTime()) / 86400000);
    return `${diff}d`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Filter spec
// ---------------------------------------------------------------------------

export interface TaskFilters {
  priority: Task['priority'][];
  status: Task['status'][];
  projectIds: string[];
  dueDateRange: DueDateRangeKey;
  customFrom: string;
  customTo: string;
}

export const DEFAULT_FILTERS: TaskFilters = {
  priority: [],
  status: [],
  projectIds: [],
  dueDateRange: null,
  customFrom: '',
  customTo: '',
};

export function hasActiveFilters(filters: TaskFilters): boolean {
  return (
    filters.priority.length > 0 ||
    filters.status.length > 0 ||
    filters.projectIds.length > 0 ||
    filters.dueDateRange !== null
  );
}

// ---------------------------------------------------------------------------
// Filter function
// ---------------------------------------------------------------------------

export function filterTasks(tasks: Task[], filters: TaskFilters): Task[] {
  const today = getTodayStr();
  const weekEnd = getWeekEndStr();
  const monthEnd = getMonthEndStr();

  return tasks.filter((task) => {
    // Priority filter
    if (filters.priority.length > 0 && !filters.priority.includes(task.priority)) return false;

    // Status filter
    if (filters.status.length > 0 && !filters.status.includes(task.status)) return false;

    // Project filter
    if (filters.projectIds.length > 0) {
      // 'unassigned' is a sentinel value for tasks with no project
      if (filters.projectIds.includes('__unassigned__')) {
        if (!task.projectId && !filters.projectIds.filter(id => id !== '__unassigned__').includes(task.projectId ?? '')) return false;
      } else {
        if (!task.projectId || !filters.projectIds.includes(task.projectId)) return false;
      }
    }

    // Due date filter
    if (filters.dueDateRange !== null) {
      const date = task.dueDate ? task.dueDate.substring(0, 10) : null;
      switch (filters.dueDateRange) {
        case 'overdue':
          if (!date || date >= today) return false;
          break;
        case 'today':
          if (date !== today) return false;
          break;
        case 'week':
          if (!date || date < today || date > weekEnd) return false;
          break;
        case 'month':
          if (!date || date < today || date > monthEnd) return false;
          break;
        case 'custom':
          if (filters.customFrom && date && date < filters.customFrom) return false;
          if (filters.customTo && date && date > filters.customTo) return false;
          break;
      }
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Sort functions
// ---------------------------------------------------------------------------

export type SortKey = 'dueDate' | 'priority' | 'none';

export function sortTasks(tasks: Task[], sortBy: SortKey): Task[] {
  if (sortBy === 'none') return tasks;
  const copy = [...tasks];
  if (sortBy === 'dueDate') {
    copy.sort((a, b) => {
      const da = a.dueDate ? a.dueDate.substring(0, 10) : '9999-99-99';
      const db = b.dueDate ? b.dueDate.substring(0, 10) : '9999-99-99';
      if (da !== db) return da < db ? -1 : 1;
      return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    });
  } else if (sortBy === 'priority') {
    copy.sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority];
      const pb = PRIORITY_ORDER[b.priority];
      if (pa !== pb) return pa - pb;
      const da = a.dueDate ? a.dueDate.substring(0, 10) : '9999-99-99';
      const db = b.dueDate ? b.dueDate.substring(0, 10) : '9999-99-99';
      return da < db ? -1 : 1;
    });
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Group by project
// ---------------------------------------------------------------------------

export interface TaskGroup {
  projectId: string | null;
  projectName: string;
  tasks: Task[];
}

export function groupTasksByProject(tasks: Task[], projects: Project[]): TaskGroup[] {
  const groups = new Map<string | null, TaskGroup>();

  for (const task of tasks) {
    const key = task.projectId ?? null;
    if (!groups.has(key)) {
      const proj = projects.find((p) => p.id === key);
      groups.set(key, {
        projectId: key,
        projectName: proj ? proj.name : 'Unassigned',
        tasks: [],
      });
    }
    groups.get(key)!.tasks.push(task);
  }

  // Sort groups: named projects first (alphabetically), Unassigned last
  return Array.from(groups.values()).sort((a, b) => {
    if (a.projectId === null) return 1;
    if (b.projectId === null) return -1;
    return a.projectName.localeCompare(b.projectName);
  });
}
