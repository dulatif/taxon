CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    progress INTEGER,
    dueDays INTEGER
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    title TEXT NOT NULL,
    completed BOOLEAN,
    duration TEXT,
    priority TEXT,
    status TEXT
);

CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    projectId TEXT,
    name TEXT,
    size TEXT,
    type TEXT
);

CREATE TABLE IF NOT EXISTS activity (
    day TEXT PRIMARY KEY,
    hours REAL,
    completions INTEGER,
    isToday BOOLEAN
);

CREATE TABLE IF NOT EXISTS activityLog (
    id TEXT PRIMARY KEY,
    taskId TEXT,
    taskTitle TEXT,
    completedAt TEXT
);
