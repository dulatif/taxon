import { Project, Task, DocumentFile, DailyActivity, SettingsState } from './types';

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'web-redesign',
    name: 'Website Redesign',
    description: 'Overhaul of the corporate landing pages focusing on conversion rate optimization.',
    category: 'Design',
    progress: 74,
    dueDays: 14,
  },
  {
    id: 'mobile-app',
    name: 'Mobile App',
    description: 'Cross-platform companion app for the dashboard ecosystem.',
    category: 'Active',
    progress: 32,
    dueDays: 28,
  },
  {
    id: 'marketing',
    name: 'Summer Brand Campaign',
    description: 'Execute cross-channel marketing initiatives for Q3. Focus on technical audiences and developer tooling narrative.',
    category: 'Planning',
    progress: 68,
    dueDays: 14,
  },
  {
    id: 'db-migration',
    name: 'Database Migration',
    description: 'Transitioning legacy user data to new distributed cluster architecture.',
    category: 'Active',
    progress: 92,
    dueDays: 5,
  },
  {
    id: 'obsidian-core',
    name: 'Obsidian Core 2.0',
    description: 'Major version update for the internal tooling framework.',
    category: 'Design',
    progress: 58,
    dueDays: 45,
  },
  {
    id: 'ui-refresh',
    name: 'UI Kit Refresh',
    description: 'System-wide token update and component library deprecation.',
    category: 'Completed',
    progress: 100,
    dueDays: 0,
  }
];

// Helper to format date as YYYY-MM-DD
function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Generate future date string
function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return formatDate(d);
}

export const INITIAL_TASKS: Task[] = [
  // Today's dashboard tasks
  {
    id: 'today-1',
    projectId: 'web-redesign',
    title: 'Refactor State Management Providers',
    completed: false,
    duration: '45m',
    priority: 'High',
    status: 'In Progress',
    dueDate: futureDate(1),
  },
  {
    id: 'today-2',
    projectId: 'mobile-app',
    title: 'Integrate Spotify Focus API',
    completed: false,
    duration: '1h',
    priority: 'Medium',
    status: 'To Do',
    dueDate: futureDate(3),
  },
  {
    id: 'today-3',
    projectId: 'marketing',
    title: 'Review Accessibility Contrast Ratios',
    completed: false,
    duration: '30m',
    priority: 'Low',
    status: 'To Do',
    dueDate: futureDate(2),
  },

  // Marketing Tasks (Summer Brand Campaign)
  {
    id: 'm-1',
    projectId: 'marketing',
    title: 'Draft technical blog post series',
    completed: true,
    duration: '45m',
    priority: 'Critical',
    status: 'Done'
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
    status: 'To Do'
  },

  // Kanban Tasks
  {
    id: 'k-1',
    projectId: 'obsidian-core',
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
    status: 'Done'
  },
  {
    id: 'k-7',
    projectId: 'ui-refresh',
    title: "Finalize 'Precision in Darkness' style guide",
    completed: true,
    duration: '2.5h',
    priority: 'High',
    status: 'Done'
  }
];

export const INITIAL_FILES: DocumentFile[] = [
  {
    id: 'f-1',
    projectId: 'marketing',
    name: 'hero-banner-dark.svg',
    size: '2.4 MB',
    type: 'image'
  },
  {
    id: 'f-2',
    projectId: 'marketing',
    name: 'tracking-config.json',
    size: '12 KB',
    type: 'code'
  },
  {
    id: 'f-3',
    projectId: 'web-redesign',
    name: 'typography-system-spec.json',
    size: '4.2 KB',
    type: 'code'
  },
  {
    id: 'f-4',
    projectId: 'web-redesign',
    name: 'branding-guidelines.pdf',
    size: '15.4 MB',
    type: 'pdf'
  },
  {
    id: 'f-5',
    projectId: 'mobile-app',
    name: 'api-endpoints-map.json',
    size: '8.1 KB',
    type: 'code'
  },
  {
    id: 'f-6',
    projectId: 'mobile-app',
    name: 'figma-mockups-export.zip',
    size: '124 MB',
    type: 'image'
  }
];

// Generate daily activity for the current week with real dates
function generateWeeklyActivity(): DailyActivity[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const result: DailyActivity[] = [];

  // Generate Mon–Sun activity for the current week
  for (let i = 1; i <= 7; i++) {
    const targetDay = i % 7; // Mon=1, Tue=2, ..., Sun=0
    const diff = targetDay - dayOfWeek;
    const date = new Date(today);
    date.setDate(today.getDate() + diff);
    
    const isToday = diff === 0;
    const isPast = diff < 0;
    const isFuture = diff > 0;

    result.push({
      day: days[targetDay],
      date: formatDate(date),
      hours: isFuture ? 0 : isPast ? Number((Math.random() * 4 + 0.5).toFixed(1)) : Number((Math.random() * 3 + 1).toFixed(1)),
      completions: isFuture ? 0 : isPast ? Math.floor(Math.random() * 6 + 1) : 0,
      isToday,
    });
  }

  return result;
}

export const INITIAL_DAILY_ACTIVITY: DailyActivity[] = generateWeeklyActivity();

export const DEFAULT_SETTINGS: SettingsState = {
  oledBlackMode: true,
  soundAlerts: true,
  backupFrequency: 'Never',
};
