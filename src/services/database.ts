import Database from '@tauri-apps/plugin-sql';
import { Project, Task, DocumentFile, DailyActivity, ActivityLogEntry, Sprint } from '../types';

let dbPromise: Promise<Database> | null = null;

export const initDb = (): Promise<Database> => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await Database.load('sqlite:taxon.db');
      
      // Defensive table creation in case migrations didn't run or dev DB is out of sync
      await database.execute(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            progress INTEGER,
            dueDays INTEGER,
            sortOrder INTEGER,
            vaultPath TEXT
        );
      `).catch(() => {});

      await database.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            projectId TEXT,
            title TEXT NOT NULL,
            completed BOOLEAN,
            duration TEXT,
            priority TEXT,
            status TEXT,
            timeEffort INTEGER,
            timeSpent INTEGER
        );
      `).catch(() => {});

      await database.execute(`
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            projectId TEXT,
            name TEXT,
            size TEXT,
            type TEXT
        );
      `).catch(() => {});

      await database.execute(`
        CREATE TABLE IF NOT EXISTS activity (
            day TEXT PRIMARY KEY,
            hours REAL,
            completions INTEGER,
            isToday BOOLEAN
        );
      `).catch(() => {});

      await database.execute(`
        CREATE TABLE IF NOT EXISTS activityLog (
            id TEXT PRIMARY KEY,
            taskId TEXT,
            taskTitle TEXT,
            completedAt TEXT
        );
      `).catch(() => {});

      await database.execute(`
        CREATE TABLE IF NOT EXISTS sprints (
            id TEXT PRIMARY KEY,
            projectId TEXT,
            name TEXT NOT NULL,
            status TEXT NOT NULL,
            startDate TEXT NOT NULL,
            endDate TEXT NOT NULL,
            goal TEXT,
            sortOrder INTEGER,
            completedAt TEXT
        );
      `).catch(() => {});

      try {
        await database.execute('ALTER TABLE tasks ADD COLUMN sprintId TEXT');
      } catch (_) {
        // Column already exists
      }

      const cols = ['dueDate', 'description', 'labels', 'reminders', 'deadline', 'subtasks', 'recurrence'];
      for (const col of cols) {
        try {
          await database.execute(`ALTER TABLE tasks ADD COLUMN ${col} TEXT`);
        } catch (_) {
          // Column already exists
        }
      }
      const numCols = ['timeEffort', 'timeSpent', 'sortOrder'];
      for (const col of numCols) {
        try {
          await database.execute(`ALTER TABLE tasks ADD COLUMN ${col} INTEGER`);
        } catch (_) {
          // Column already exists
        }
      }
      try {
        await database.execute('ALTER TABLE projects ADD COLUMN sortOrder INTEGER');
      } catch (_) {
        // Column already exists
      }
      try {
        await database.execute('ALTER TABLE projects ADD COLUMN vaultPath TEXT');
      } catch (_) {
        // Column already exists
      }
      try {
        await database.execute('ALTER TABLE tasks ADD COLUMN archived BOOLEAN');
      } catch (_) {
        // Column already exists
      }
      try {
        await database.execute('ALTER TABLE tasks ADD COLUMN archivedAt TEXT');
      } catch (_) {
        // Column already exists
      }
      return database;
    })();
  }
  return dbPromise;
};

// --- Projects ---
export const getProjects = async (): Promise<Project[]> => {
  const d = await initDb();
  return d.select<Project[]>('SELECT * FROM projects ORDER BY COALESCE(sortOrder, 999999) ASC, id ASC');
};

export const saveProject = async (p: Project) => {
  const d = await initDb();
  await d.execute(
    'INSERT OR REPLACE INTO projects (id, name, description, category, progress, dueDays, sortOrder, vaultPath) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [
      p.id ?? null,
      p.name ?? null,
      p.description ?? null,
      p.category ?? null,
      p.progress ?? 0,
      p.dueDays ?? null,
      p.sortOrder ?? null,
      p.vaultPath ?? null
    ]
  );
};

export const deleteProject = async (id: string) => {
  const d = await initDb();
  await d.execute('DELETE FROM projects WHERE id = $1', [id]);
};

// --- Tasks ---
export const getTasks = async (): Promise<Task[]> => {
  const d = await initDb();
  const rawTasks = await d.select<any[]>('SELECT * FROM tasks ORDER BY COALESCE(sortOrder, 999999) ASC, id ASC');
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
      sprintId: t.sprintId ?? null,
      completed: !!t.completed,
      labels: parseJSON(t.labels),
      reminders: parseJSON(t.reminders),
      subtasks: parseJSON(t.subtasks),
      recurrence: parseJSON(t.recurrence),
      timeEffort: timeEffortNum,
      timeSpent: timeSpentNum,
      archived: !!t.archived,
      archivedAt: t.archivedAt || undefined,
    };
  });
};

export const saveTask = async (t: Task) => {
  const d = await initDb();
  const labelsStr = t.labels ? JSON.stringify(t.labels) : null;
  const remindersStr = t.reminders ? JSON.stringify(t.reminders) : null;
  const subtasksStr = t.subtasks ? JSON.stringify(t.subtasks) : null;
  const recurrenceStr = t.recurrence ? JSON.stringify(t.recurrence) : null;

  await d.execute(
    'INSERT OR REPLACE INTO tasks (id, projectId, sprintId, title, completed, duration, priority, status, dueDate, description, labels, reminders, deadline, subtasks, timeEffort, timeSpent, sortOrder, recurrence, archived, archivedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)',
    [
      t.id ?? null, 
      t.projectId ?? null, 
      t.sprintId ?? null,
      t.title ?? null, 
      t.completed ? 1 : 0, 
      t.duration ?? null, 
      t.priority ?? null, 
      t.status ?? null, 
      t.dueDate ?? null, 
      t.description ?? null, 
      labelsStr, 
      remindersStr, 
      t.deadline ?? null, 
      subtasksStr,
      t.timeEffort ?? null,
      t.timeSpent ?? null,
      t.sortOrder ?? null,
      recurrenceStr,
      t.archived ? 1 : 0,
      t.archivedAt ?? null
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

// --- Sprints ---
export const getSprints = async (projectId?: string): Promise<Sprint[]> => {
  const d = await initDb();
  if (projectId) {
    return d.select<Sprint[]>('SELECT * FROM sprints WHERE projectId = $1 ORDER BY COALESCE(sortOrder, 999999) ASC, startDate ASC, id ASC', [projectId]);
  }
  return d.select<Sprint[]>('SELECT * FROM sprints ORDER BY COALESCE(sortOrder, 999999) ASC, startDate ASC, id ASC');
};

export const saveSprint = async (s: Sprint) => {
  const d = await initDb();
  await d.execute(
    'INSERT OR REPLACE INTO sprints (id, projectId, name, status, startDate, endDate, goal, sortOrder, completedAt) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
    [
      s.id ?? null,
      s.projectId ?? null,
      s.name ?? null,
      s.status ?? null,
      s.startDate ?? null,
      s.endDate ?? null,
      s.goal ?? null,
      s.sortOrder ?? null,
      s.completedAt ?? null
    ]
  );
};

export const deleteSprint = async (id: string) => {
  const d = await initDb();
  await d.execute('DELETE FROM sprints WHERE id = $1', [id]);
};

export const deleteSprintsByProject = async (projectId: string) => {
  const d = await initDb();
  await d.execute('DELETE FROM sprints WHERE projectId = $1', [projectId]);
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
    [
      f.id ?? null,
      f.projectId ?? null,
      f.name ?? null,
      f.size ?? null,
      f.type ?? null
    ]
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
    [
      a.day ?? null,
      a.hours ?? 0,
      a.completions ?? 0,
      a.isToday ? 1 : 0
    ]
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
    [
      entry.id ?? null,
      entry.taskId ?? null,
      entry.taskTitle ?? null,
      entry.completedAt ?? null
    ]
  );
};

// --- TAXON-405 & 407: Data Export / Import ---
export const exportWorkspaceData = async (): Promise<string> => {
  const projects = await getProjects();
  const sprints = await getSprints();
  const tasks = await getTasks();
  const files = await getFiles();
  const activity = await getActivity();
  const activityLog = await getActivityLog();
  
  const data = {
    projects,
    sprints,
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
  await d.execute('DELETE FROM sprints');
  await d.execute('DELETE FROM tasks');
  await d.execute('DELETE FROM files');
  await d.execute('DELETE FROM activity');
  await d.execute('DELETE FROM activityLog');

  // Re-insert data
  if (data.projects) {
    for (const p of data.projects) await saveProject(p);
  }
  if (data.sprints) {
    for (const s of data.sprints) await saveSprint(s);
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
