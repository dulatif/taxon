import Database from '@tauri-apps/plugin-sql';
import type {
  ActivityLogEntry,
  DailyActivity,
  DocumentFile,
  Project,
  Sprint,
  Task,
} from '../types';
import type { AgentSyncState, AuditLogEntry } from '../types/agent';

let dbPromise: Promise<Database> | null = null;

export const initDb = (): Promise<Database> => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await Database.load('sqlite:taxon.db');

      // Defensive table creation in case migrations didn't run or dev DB is out of sync
      await database
        .execute(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT,
            progress INTEGER,
            dueDays INTEGER,
            dueDate TEXT,
            sortOrder INTEGER,
            vaultPath TEXT,
            workspacePaths TEXT
        );
      `)
        .catch(() => {});

      await database
        .execute(`
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
      `)
        .catch(() => {});

      await database
        .execute(`
        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            projectId TEXT,
            name TEXT,
            size TEXT,
            type TEXT
        );
      `)
        .catch(() => {});

      await database
        .execute(`
        CREATE TABLE IF NOT EXISTS activity (
            date TEXT PRIMARY KEY,
            day TEXT,
            hours REAL,
            completions INTEGER,
            isToday BOOLEAN
        );
      `)
        .catch(() => {});

      await database
        .execute(`
        CREATE TABLE IF NOT EXISTS activityLog (
            id TEXT PRIMARY KEY,
            taskId TEXT,
            taskTitle TEXT,
            completedAt TEXT
        );
      `)
        .catch(() => {});

      await database
        .execute(`
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
      `)
        .catch(() => {});

      await database.execute(`
        CREATE TABLE IF NOT EXISTS agent_sync (
            projectId TEXT PRIMARY KEY,
            lastExportedAt TEXT,
            lastImportedAt TEXT,
            exportedTaskCount INTEGER,
            exportedSprintCount INTEGER
        );
      `);
      await database
        .execute(`
        CREATE TABLE IF NOT EXISTS agent_audit_log (
            id TEXT PRIMARY KEY,
            projectId TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            entityType TEXT NOT NULL,
            entityId TEXT NOT NULL,
            entityTitle TEXT NOT NULL,
            changedFields TEXT,
            diffSummary TEXT,
            commitHash TEXT
        );
      `)
        .catch(() => {});

      try {
        await database.execute('ALTER TABLE tasks ADD COLUMN sprintId TEXT');
      } catch {
        // Column already exists
      }

      const cols = [
        'dueDate',
        'description',
        'labels',
        'reminders',
        'deadline',
        'subtasks',
        'recurrence',
        'workspacePath',
        'linkedFiles',
        'dependsOn',
        'moduleGroup',
      ];
      for (const col of cols) {
        try {
          await database.execute(`ALTER TABLE tasks ADD COLUMN ${col} TEXT`);
        } catch {
          // Column already exists
        }
      }
      const numCols = ['timeEffort', 'timeSpent', 'sortOrder'];
      for (const col of numCols) {
        try {
          await database.execute(`ALTER TABLE tasks ADD COLUMN ${col} INTEGER`);
        } catch {
          // Column already exists
        }
      }
      try {
        await database.execute('ALTER TABLE projects ADD COLUMN sortOrder INTEGER');
      } catch {
        // Column already exists
      }
      try {
        await database.execute('ALTER TABLE projects ADD COLUMN dueDate TEXT');
      } catch {
        // Column already exists
      }
      try {
        await database.execute('ALTER TABLE projects ADD COLUMN vaultPath TEXT');
      } catch {
        // Column already exists
      }
      try {
        await database.execute('ALTER TABLE projects ADD COLUMN workspacePaths TEXT');
      } catch {
        // Column already exists
      }
      try {
        await database.execute('ALTER TABLE projects ADD COLUMN pinned BOOLEAN');
      } catch {
        // Column already exists
      }
      try {
        await database.execute('ALTER TABLE projects ADD COLUMN pinnedSortOrder INTEGER');
      } catch {
        // Column already exists
      }
      try {
        await database.execute('ALTER TABLE tasks ADD COLUMN archived BOOLEAN');
      } catch {
        // Column already exists
      }
      try {
        await database.execute('ALTER TABLE tasks ADD COLUMN archivedAt TEXT');
      } catch {
        // Column already exists
      }
      try {
        const tableInfo = await database.select<{ name: string; pk: number }[]>(
          'PRAGMA table_info(activity)',
        );
        const dateCol = tableInfo.find((c) => c.name === 'date');
        if (!dateCol || dateCol.pk !== 1) {
          await database.execute(`
            CREATE TABLE IF NOT EXISTS activity_new (
                date TEXT PRIMARY KEY,
                day TEXT,
                hours REAL,
                completions INTEGER,
                isToday BOOLEAN
            );
          `);
          if (dateCol) {
            await database.execute(`
              INSERT OR REPLACE INTO activity_new (date, day, hours, completions, isToday)
              SELECT COALESCE(date, day), day, hours, completions, isToday FROM activity;
            `);
          } else {
            await database.execute(`
              INSERT OR REPLACE INTO activity_new (date, day, hours, completions, isToday)
              SELECT day, day, hours, completions, isToday FROM activity;
            `);
          }
          await database.execute('DROP TABLE activity;');
          await database.execute('ALTER TABLE activity_new RENAME TO activity;');
        }
      } catch {
        // Migration handled or table doesn't exist yet
      }
      return database;
    })();
  }
  return dbPromise;
};

export const getProjects = async (): Promise<Project[]> => {
  const d = await initDb();
  const rawProjects = await d.select<Record<string, unknown>[]>(
    'SELECT * FROM projects ORDER BY COALESCE(sortOrder, 999999) ASC, id ASC',
  );

  const parseJSON = (val: unknown) => {
    if (typeof val === 'string' && val.trim().startsWith('[')) {
      try {
        return JSON.parse(val);
      } catch {
        return undefined;
      }
    }
    return undefined;
  };

  return rawProjects.map((p) => ({
    ...p,
    pinned: !!p.pinned,
    pinnedSortOrder: typeof p.pinnedSortOrder === 'number' ? p.pinnedSortOrder : undefined,
    workspacePaths: parseJSON(p.workspacePaths),
  })) as unknown as Project[];
};

export const saveProject = async (p: Project) => {
  const d = await initDb();
  const workspacePathsStr = p.workspacePaths ? JSON.stringify(p.workspacePaths) : null;

  await d.execute(
    'INSERT OR REPLACE INTO projects (id, name, description, category, progress, dueDays, sortOrder, vaultPath, dueDate, workspacePaths, pinned, pinnedSortOrder) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)',
    [
      p.id ?? null,
      p.name ?? null,
      p.description ?? null,
      p.category ?? null,
      p.progress ?? 0,
      null, // old dueDays
      p.sortOrder ?? null,
      p.vaultPath ?? null,
      p.dueDate ?? null,
      workspacePathsStr,
      p.pinned ? 1 : 0,
      p.pinnedSortOrder ?? null,
    ],
  );
};

export const deleteProject = async (id: string) => {
  const d = await initDb();
  await d.execute('DELETE FROM projects WHERE id = $1', [id]);
};

// --- Tasks ---
export const getTasks = async (): Promise<Task[]> => {
  const d = await initDb();
  const rawTasks = await d.select<Record<string, unknown>[]>(
    'SELECT * FROM tasks ORDER BY COALESCE(sortOrder, 999999) ASC, id ASC',
  );
  const parseJSON = (val: unknown) => {
    if (typeof val === 'string' && val.trim().startsWith('[')) {
      try {
        return JSON.parse(val);
      } catch {
        return undefined;
      }
    }
    return undefined;
  };
  const parseDurationToMinutes = (dur: string): number => {
    if (!dur) return 0;
    const trimmed = dur.trim().toLowerCase();
    const matchM = trimmed.match(/^(\d+(?:\.\d+)?)m/);
    if (matchM) return Math.round(parseFloat(matchM[1] as string));
    const matchH = trimmed.match(/^(\d+(?:\.\d+)?)h/);
    if (matchH) return Math.round(parseFloat(matchH[1] as string) * 60);
    const num = parseFloat(trimmed);
    return !isNaN(num) ? Math.round(num) : 0;
  };
  return rawTasks.map((t) => {
    const timeEffortNum =
      t.timeEffort !== null && t.timeEffort !== undefined && !isNaN(Number(t.timeEffort))
        ? Number(t.timeEffort)
        : t.duration
          ? parseDurationToMinutes(t.duration as string)
          : 0;
    const timeSpentNum =
      t.timeSpent !== null && t.timeSpent !== undefined && !isNaN(Number(t.timeSpent))
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
      linkedFiles: parseJSON(t.linkedFiles),
      dependsOn: parseJSON(t.dependsOn),
      workspacePath: (t.workspacePath as string) || undefined,
      moduleGroup: (t.moduleGroup as string) || undefined,
      timeEffort: timeEffortNum,
      timeSpent: timeSpentNum,
      archived: !!t.archived,
      archivedAt: t.archivedAt || undefined,
    } as unknown as Task;
  });
};

export const saveTask = async (t: Task) => {
  const d = await initDb();
  const labelsStr = t.labels ? JSON.stringify(t.labels) : null;
  const remindersStr = t.reminders ? JSON.stringify(t.reminders) : null;
  const subtasksStr = t.subtasks ? JSON.stringify(t.subtasks) : null;
  const recurrenceStr = t.recurrence ? JSON.stringify(t.recurrence) : null;
  const linkedFilesStr = t.linkedFiles ? JSON.stringify(t.linkedFiles) : null;
  const dependsOnStr = t.dependsOn ? JSON.stringify(t.dependsOn) : null;

  await d.execute(
    'INSERT OR REPLACE INTO tasks (id, projectId, sprintId, title, completed, duration, priority, status, dueDate, description, labels, reminders, deadline, subtasks, timeEffort, timeSpent, sortOrder, recurrence, archived, archivedAt, workspacePath, linkedFiles, dependsOn, moduleGroup) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)',
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
      t.archivedAt ?? null,
      t.workspacePath ?? null,
      linkedFilesStr,
      dependsOnStr,
      t.moduleGroup ?? null,
    ],
  );

  if (t.projectId) {
    try {
      const projs = await d.select<{ vaultPath: string }[]>(
        'SELECT vaultPath FROM projects WHERE id = $1',
        [t.projectId],
      );
      if (projs.length > 0 && projs[0]?.vaultPath) {
        const { exportSingleTaskToAgent } = await import('./agentSync');
        await exportSingleTaskToAgent(t, projs[0].vaultPath);
      }
    } catch (e) {
      console.error('Failed to trigger surgical task export:', e);
    }
  }
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
    return d.select<Sprint[]>(
      'SELECT * FROM sprints WHERE projectId = $1 ORDER BY COALESCE(sortOrder, 999999) ASC, startDate ASC, id ASC',
      [projectId],
    );
  }
  return d.select<Sprint[]>(
    'SELECT * FROM sprints ORDER BY COALESCE(sortOrder, 999999) ASC, startDate ASC, id ASC',
  );
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
      s.completedAt ?? null,
    ],
  );

  if (s.projectId) {
    try {
      const projs = await d.select<{ vaultPath: string }[]>(
        'SELECT vaultPath FROM projects WHERE id = $1',
        [s.projectId],
      );
      if (projs.length > 0 && projs[0]?.vaultPath) {
        const { exportSingleSprintToAgent } = await import('./agentSync');
        // getTasks handles the JSON parsing mapping safely
        const allTasks = await getTasks();
        const sprintTasks = allTasks.filter((t) => t.sprintId === s.id);
        await exportSingleSprintToAgent(s, sprintTasks, projs[0].vaultPath);
      }
    } catch (e) {
      console.error('Failed to trigger surgical sprint export:', e);
    }
  }
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
    [f.id ?? null, f.projectId ?? null, f.name ?? null, f.size ?? null, f.type ?? null],
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
  const raw = await d.select<Record<string, unknown>[]>('SELECT * FROM activity');
  return raw.map((a) => ({
    date: (a.date as string) || (a.day as string) || '',
    day: (a.day as string) || '',
    hours: typeof a.hours === 'number' ? a.hours : Number(a.hours) || 0,
    completions: typeof a.completions === 'number' ? a.completions : Number(a.completions) || 0,
    isToday: !!a.isToday,
  })) as DailyActivity[];
};

export const saveActivity = async (a: DailyActivity) => {
  const d = await initDb();
  const dateKey = a.date || a.day;
  await d.execute(
    'INSERT OR REPLACE INTO activity (date, day, hours, completions, isToday) VALUES ($1, $2, $3, $4, $5)',
    [dateKey ?? null, a.day ?? null, a.hours ?? 0, a.completions ?? 0, a.isToday ? 1 : 0],
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
    [entry.id ?? null, entry.taskId ?? null, entry.taskTitle ?? null, entry.completedAt ?? null],
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
    activityLog,
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

// --- Agent Sync ---
export const getAgentSyncState = async (projectId: string): Promise<AgentSyncState | null> => {
  const d = await initDb();
  const result = await d.select<AgentSyncState[]>('SELECT * FROM agent_sync WHERE projectId = $1', [
    projectId,
  ]);
  if (result && result.length > 0) {
    return result[0] || null;
  }
  return null;
};

export const saveAgentSyncState = async (projectId: string, state: AgentSyncState) => {
  const d = await initDb();
  await d.execute(
    'INSERT OR REPLACE INTO agent_sync (projectId, lastExportedAt, lastImportedAt, exportedTaskCount, exportedSprintCount) VALUES ($1, $2, $3, $4, $5)',
    [
      projectId,
      state.lastExportedAt ?? null,
      state.lastImportedAt ?? null,
      state.exportedTaskCount ?? 0,
      state.exportedSprintCount ?? 0,
    ],
  );
};

// --- Agent Audit Log ---
export const saveAuditLogEntry = async (entry: AuditLogEntry) => {
  const d = await initDb();
  await d.execute(
    'INSERT OR REPLACE INTO agent_audit_log (id, projectId, timestamp, action, entityType, entityId, entityTitle, changedFields, diffSummary, commitHash) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
    [
      entry.id,
      entry.projectId,
      entry.timestamp,
      entry.action,
      entry.entityType,
      entry.entityId,
      entry.entityTitle,
      entry.changedFields ? JSON.stringify(entry.changedFields) : null,
      entry.diffSummary ? JSON.stringify(entry.diffSummary) : null,
      entry.commitHash ?? null,
    ],
  );
};

export const getAuditLog = async (
  projectId: string,
  limit: number = 50,
): Promise<AuditLogEntry[]> => {
  const d = await initDb();
  const raw = await d.select<Record<string, unknown>[]>(
    'SELECT * FROM agent_audit_log WHERE projectId = $1 ORDER BY timestamp DESC LIMIT $2',
    [projectId, limit],
  );
  return raw.map((r) => ({
    ...r,
    changedFields: r.changedFields ? JSON.parse(r.changedFields as string) : undefined,
    diffSummary: r.diffSummary ? JSON.parse(r.diffSummary as string) : undefined,
  })) as unknown as AuditLogEntry[];
};

export const getRecentAuditSummary = async (
  projectId: string,
): Promise<{ count: number; lastTimestamp: string | null }> => {
  const d = await initDb();
  const result = await d.select<{ cnt: number; lastTs: string | null }[]>(
    "SELECT COUNT(*) as cnt, MAX(timestamp) as lastTs FROM agent_audit_log WHERE projectId = $1 AND timestamp > datetime('now', '-24 hours')",
    [projectId],
  );
  return {
    count: result[0]?.cnt ?? 0,
    lastTimestamp: result[0]?.lastTs ?? null,
  };
};
