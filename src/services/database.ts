import Database from '@tauri-apps/plugin-sql';
import { Project, Task, DocumentFile, DailyActivity, ActivityLogEntry } from '../types';

let dbPromise: Promise<Database> | null = null;

export const initDb = (): Promise<Database> => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await Database.load('sqlite:taxon.db');
      const cols = ['dueDate', 'description', 'labels', 'reminders', 'deadline', 'subtasks'];
      for (const col of cols) {
        try {
          await database.execute(`ALTER TABLE tasks ADD COLUMN ${col} TEXT`);
        } catch (_) {
          // Column already exists or table freshly created
        }
      }
      const numCols = ['timeEffort', 'timeSpent'];
      for (const col of numCols) {
        try {
          await database.execute(`ALTER TABLE tasks ADD COLUMN ${col} INTEGER`);
        } catch (_) {
          // Column already exists or table freshly created
        }
      }
      return database;
    })();
  }
  return dbPromise;
};

// --- Projects ---
export const getProjects = async (): Promise<Project[]> => {
  const d = await initDb();
  return d.select<Project[]>('SELECT * FROM projects');
};

export const saveProject = async (p: Project) => {
  const d = await initDb();
  await d.execute(
    'INSERT OR REPLACE INTO projects (id, name, description, category, progress, dueDays) VALUES ($1, $2, $3, $4, $5, $6)',
    [p.id, p.name, p.description, p.category, p.progress, p.dueDays]
  );
};

export const deleteProject = async (id: string) => {
  const d = await initDb();
  await d.execute('DELETE FROM projects WHERE id = $1', [id]);
};

// --- Tasks ---
export const getTasks = async (): Promise<Task[]> => {
  const d = await initDb();
  const rawTasks = await d.select<any[]>('SELECT * FROM tasks');
  const parseJSON = (val: any) => {
    if (typeof val === 'string' && val.trim().startsWith('[')) {
      try { return JSON.parse(val); } catch (_) { return undefined; }
    }
    return undefined;
  };
  const parseDurationToMinutes = (dur: string): number => {
    if (!dur) return 0;
    const trimmed = dur.trim().toLowerCase();
    const matchM = trimmed.match(/^(\d+(?:\.\d+)?)m/);
    if (matchM) return Math.round(parseFloat(matchM[1]));
    const matchH = trimmed.match(/^(\d+(?:\.\d+)?)h/);
    if (matchH) return Math.round(parseFloat(matchH[1]) * 60);
    const num = parseFloat(trimmed);
    return !isNaN(num) ? Math.round(num) : 0;
  };
  return rawTasks.map(t => {
    const timeEffortNum = t.timeEffort !== null && t.timeEffort !== undefined && !isNaN(Number(t.timeEffort))
      ? Number(t.timeEffort)
      : (t.duration ? parseDurationToMinutes(t.duration) : 0);
    const timeSpentNum = t.timeSpent !== null && t.timeSpent !== undefined && !isNaN(Number(t.timeSpent))
      ? Number(t.timeSpent)
      : 0;
    return {
      ...t,
      completed: !!t.completed,
      labels: parseJSON(t.labels),
      reminders: parseJSON(t.reminders),
      subtasks: parseJSON(t.subtasks),
      timeEffort: timeEffortNum,
      timeSpent: timeSpentNum,
    };
  });
};

export const saveTask = async (t: Task) => {
  const d = await initDb();
  const labelsStr = t.labels ? JSON.stringify(t.labels) : null;
  const remindersStr = t.reminders ? JSON.stringify(t.reminders) : null;
  const subtasksStr = t.subtasks ? JSON.stringify(t.subtasks) : null;

  await d.execute(
    'INSERT OR REPLACE INTO tasks (id, projectId, title, completed, duration, priority, status, dueDate, description, labels, reminders, deadline, subtasks, timeEffort, timeSpent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
    [
      t.id, 
      t.projectId, 
      t.title, 
      t.completed ? 1 : 0, 
      t.duration, 
      t.priority, 
      t.status, 
      t.dueDate || null, 
      t.description || null, 
      labelsStr, 
      remindersStr, 
      t.deadline || null, 
      subtasksStr,
      t.timeEffort !== undefined ? t.timeEffort : null,
      t.timeSpent !== undefined ? t.timeSpent : null
    ]
  );
};

export const deleteTask = async (id: string) => {
  const d = await initDb();
  await d.execute('DELETE FROM tasks WHERE id = $1', [id]);
};

export const deleteTasksByProject = async (projectId: string) => {
  const d = await initDb();
  await d.execute('DELETE FROM tasks WHERE projectId = $1', [projectId]);
};

// --- Files ---
export const getFiles = async (): Promise<DocumentFile[]> => {
  const d = await initDb();
  return d.select<DocumentFile[]>('SELECT * FROM files');
};

export const saveFile = async (f: DocumentFile) => {
  const d = await initDb();
  await d.execute(
    'INSERT OR REPLACE INTO files (id, projectId, name, size, type) VALUES ($1, $2, $3, $4, $5)',
    [f.id, f.projectId, f.name, f.size, f.type]
  );
};

export const deleteFile = async (id: string) => {
  const d = await initDb();
  await d.execute('DELETE FROM files WHERE id = $1', [id]);
};

export const deleteFilesByProject = async (projectId: string) => {
  const d = await initDb();
  await d.execute('DELETE FROM files WHERE projectId = $1', [projectId]);
};

// --- Activity ---
export const getActivity = async (): Promise<DailyActivity[]> => {
  const d = await initDb();
  const raw = await d.select<any[]>('SELECT * FROM activity');
  return raw.map(a => ({
    ...a,
    isToday: !!a.isToday
  }));
};

export const saveActivity = async (a: DailyActivity) => {
  const d = await initDb();
  await d.execute(
    'INSERT OR REPLACE INTO activity (day, hours, completions, isToday) VALUES ($1, $2, $3, $4)',
    [a.day, a.hours, a.completions, a.isToday ? 1 : 0]
  );
};

// --- Activity Log ---
export const getActivityLog = async (): Promise<ActivityLogEntry[]> => {
  const d = await initDb();
  return d.select<ActivityLogEntry[]>('SELECT * FROM activityLog');
};

export const saveActivityLogEntry = async (entry: ActivityLogEntry) => {
  const d = await initDb();
  await d.execute(
    'INSERT OR REPLACE INTO activityLog (id, taskId, taskTitle, completedAt) VALUES ($1, $2, $3, $4)',
    [entry.id, entry.taskId, entry.taskTitle, entry.completedAt]
  );
};

// --- TAXON-405 & 407: Data Export / Import ---
export const exportWorkspaceData = async (): Promise<string> => {
  const projects = await getProjects();
  const tasks = await getTasks();
  const files = await getFiles();
  const activity = await getActivity();
  const activityLog = await getActivityLog();
  
  const data = {
    projects,
    tasks,
    files,
    activity,
    activityLog
  };
  
  return JSON.stringify(data, null, 2);
};

export const importWorkspaceData = async (jsonString: string) => {
  const data = JSON.parse(jsonString);
  const d = await initDb();
  
  // Clear existing tables
  await d.execute('DELETE FROM projects');
  await d.execute('DELETE FROM tasks');
  await d.execute('DELETE FROM files');
  await d.execute('DELETE FROM activity');
  await d.execute('DELETE FROM activityLog');

  // Re-insert data
  if (data.projects) {
    for (const p of data.projects) await saveProject(p);
  }
  if (data.tasks) {
    for (const t of data.tasks) await saveTask(t);
  }
  if (data.files) {
    for (const f of data.files) await saveFile(f);
  }
  if (data.activity) {
    for (const a of data.activity) await saveActivity(a);
  }
  if (data.activityLog) {
    for (const al of data.activityLog) await saveActivityLogEntry(al);
  }
};
