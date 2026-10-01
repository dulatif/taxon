import type { DailyActivity, DocumentFile, Project, SettingsState, Sprint, Task } from '../types';
import { formatDateStr } from '../utils/format-date';

// Generate future date string
function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return formatDateStr(d);
}

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'web-redesign',
    name: 'Website Redesign',
    description:
      'Overhaul of the corporate landing pages focusing on conversion rate optimization.',
    category: 'Design',
    progress: 74,
    dueDate: futureDate(14),
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    description: 'Cross-platform companion app for the dashboard ecosystem.',
    category: 'Engineering',
    progress: 32,
    dueDate: futureDate(28),
  },
  {
    id: 'marketing',
    name: 'Summer Brand Campaign',
    description:
      'Execute cross-channel marketing initiatives for Q3. Focus on technical audiences and developer tooling narrative.',
    category: 'Marketing',
    progress: 68,
    dueDate: futureDate(14),
  },
  {
    id: 'db-migration',
    name: 'Database Migration',
    description: 'Transitioning legacy user data to new distributed cluster architecture.',
    category: 'Engineering',
    progress: 92,
    dueDate: futureDate(5),
  },
  {
    id: 'obsidian-core',
    name: 'Obsidian Core 2.0',
    description: 'Major version update for the internal tooling framework.',
    category: 'Product',
    progress: 58,
    dueDate: futureDate(45),
  },
  {
    id: 'ui-refresh',
    name: 'UI Kit Refresh',
    description: 'System-wide token update and component library deprecation.',
    category: 'Completed',
    progress: 100,
    dueDate: futureDate(0),
  },
];

export const INITIAL_SPRINTS: Sprint[] = [
  {
    id: 'sprint-1',
    projectId: 'obsidian-core',
    name: 'Sprint 1',
    status: 'Completed',
    startDate: futureDate(-14),
    endDate: futureDate(0),
    goal: 'Complete core architecture & theme setup.',
    sortOrder: 0,
    completedAt: futureDate(0),
  },
  {
    id: 'sprint-2',
    projectId: 'obsidian-core',
    name: 'Sprint 2',
    status: 'Active',
    startDate: futureDate(0),
    endDate: futureDate(14),
    goal: 'Deliver OLED metrics ingestion & Precision API v2.',
    sortOrder: 1,
  },
  {
    id: 'sprint-web-1',
    projectId: 'web-redesign',
    name: 'Sprint 1',
    status: 'Active',
    startDate: futureDate(-3),
    endDate: futureDate(11),
    goal: 'Revamp typography system and fix alignment issues.',
    sortOrder: 0,
  },
];

export const INITIAL_TASKS: Task[] = [
  // Today's dashboard tasks
  {
    id: 'today-1',
    projectId: 'web-redesign',
    sprintId: 'sprint-web-1',
    title: 'Refactor State Management Providers',
    completed: false,
    duration: '45m',
    priority: 'High',
    status: 'In Progress',
    dueDate: futureDate(0),
  },
  {
    id: 'today-2',
    projectId: 'mobile-app',
    title: 'Integrate Spotify Focus API',
    completed: false,
    duration: '1h',
    priority: 'Medium',
    status: 'To Do',
    dueDate: futureDate(0),
  },
  {
    id: 'today-3',
    projectId: 'marketing',
    title: 'Review Accessibility Contrast Ratios',
    completed: false,
    duration: '30m',
    priority: 'Low',
    status: 'To Do',
    dueDate: futureDate(0),
  },

  // Marketing Tasks (Summer Brand Campaign)
  {
    id: 'm-1',
    projectId: 'marketing',
    title: 'Draft technical blog post series',
    completed: true,
    duration: '45m',
    priority: 'Critical',
    status: 'Done',
  },
  {
    id: 'm-2',
    projectId: 'marketing',
    title: 'Finalize API documentation graphics',
    completed: false,
    duration: '2h',
    priority: 'Medium',
    status: 'To Do',
    dueDate: futureDate(5),
  },
  {
    id: 'm-3',
    projectId: 'marketing',
    title: 'Review staging deployment',
    completed: false,
    duration: '1.5h',
    priority: 'Medium',
    status: 'To Do',
    dueDate: futureDate(7),
  },
  {
    id: 'm-4',
    projectId: 'marketing',
    title: 'Prepare launch analytics dashboard',
    completed: false,
    duration: '3h',
    priority: 'Medium',
    status: 'To Do',
    dueDate: futureDate(10),
  },
  {
    id: 'm-5',
    projectId: 'marketing',
    title: 'Update dependency manifest',
    completed: false,
    duration: '30m',
    priority: 'Medium',
    status: 'To Do',
  },

  // Kanban Tasks
  {
    id: 'k-1',
    projectId: 'obsidian-core',
    sprintId: 'sprint-2',
    title: 'Refactor data ingestion pipeline for OLED metrics',
    completed: false,
    duration: '45m',
    priority: 'Critical',
    status: 'To Do',
    dueDate: futureDate(4),
  },
  {
    id: 'k-2',
    projectId: 'obsidian-core',
    sprintId: 'sprint-2',
    title: 'Update documentation for Precision API v2',
    completed: false,
    duration: '2h',
    priority: 'Medium',
    status: 'To Do',
    dueDate: futureDate(6),
  },
  {
    id: 'k-3',
    projectId: 'db-migration',
    title: 'Analyze dark-mode battery efficiency logs',
    completed: false,
    duration: '1.5h',
    priority: 'High',
    status: 'To Do',
    dueDate: futureDate(2),
  },
  {
    id: 'k-4',
    projectId: 'obsidian-core',
    sprintId: 'sprint-2',
    title: 'Implement Obsidian Onyx theme tokens',
    completed: false,
    duration: '4h',
    priority: 'High',
    status: 'In Progress',
    dueDate: futureDate(8),
  },
  {
    id: 'k-5',
    projectId: 'web-redesign',
    sprintId: 'sprint-web-1',
    title: 'Review pull request #1104: Grid alignment',
    completed: false,
    duration: '30m',
    priority: 'Medium',
    status: 'In Progress',
    dueDate: futureDate(1),
  },
  {
    id: 'k-6',
    projectId: 'ui-refresh',
    title: 'Setup initial repo for project Synapse',
    completed: true,
    duration: '1h',
    priority: 'Low',
    status: 'Done',
  },
  {
    id: 'k-7',
    projectId: 'ui-refresh',
    title: "Finalize 'Precision in Darkness' style guide",
    completed: true,
    duration: '2.5h',
    priority: 'High',
    status: 'Done',
  },
];

export const INITIAL_FILES: DocumentFile[] = [
  {
    id: 'f-1',
    projectId: 'marketing',
    name: 'hero-banner-dark.svg',
    size: '2.4 MB',
    type: 'image',
  },
  {
    id: 'f-2',
    projectId: 'marketing',
    name: 'tracking-config.json',
    size: '12 KB',
    type: 'code',
  },
  {
    id: 'f-3',
    projectId: 'web-redesign',
    name: 'typography-system-spec.json',
    size: '4.2 KB',
    type: 'code',
  },
  {
    id: 'f-4',
    projectId: 'web-redesign',
    name: 'branding-guidelines.pdf',
    size: '15.4 MB',
    type: 'pdf',
  },
  {
    id: 'f-5',
    projectId: 'mobile-app',
    name: 'api-endpoints-map.json',
    size: '8.1 KB',
    type: 'code',
  },
  {
    id: 'f-6',
    projectId: 'mobile-app',
    name: 'figma-mockups-export.zip',
    size: '124 MB',
    type: 'image',
  },
];

// Generate daily activity for the current week with real dates
function generateWeeklyActivity(): DailyActivity[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday
  const todayDateStr = formatDateStr(today);
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() + diffToMonday);
  const result: DailyActivity[] = [];

  // Generate Mon–Sun activity for the current week
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const dateStr = formatDateStr(date);
    const targetDay = date.getDay();

    const isToday = dateStr === todayDateStr;
    const isPast = date < today;
    const isFuture = date > today;

    result.push({
      day: days[targetDay]!,
      date: dateStr,
      hours: isFuture
        ? 0
        : isPast
          ? Number((Math.random() * 4 + 0.5).toFixed(1))
          : Number((Math.random() * 3 + 1).toFixed(1)),
      completions: isFuture ? 0 : isPast ? Math.floor(Math.random() * 6 + 1) : 0,
      isToday,
    });
  }

  return result;
}

export const INITIAL_DAILY_ACTIVITY: DailyActivity[] = generateWeeklyActivity();

export const DEFAULT_SETTINGS: SettingsState = {
  theme: 'dark',
  oledBlackMode: true,
  soundAlerts: true,
  backupFrequency: 'Never',
  pomodoroWorkDuration: 25,
  pomodoroShortBreak: 5,
  pomodoroLongBreak: 15,
  pomodoroLongBreakInterval: 4,
  pomodoroAutoStartBreaks: false,
  pomodoroAutoStartPomodoros: false,
  showCompletedProjectsInSidebar: true,
};
