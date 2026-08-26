use crate::models::{Project, Sprint, SubTask, Task};
use rusqlite::{params, Connection, Result};
use std::path::{Path, PathBuf};

pub struct TaxonDb {
    conn: Connection,
}

impl TaxonDb {
    pub fn open_default() -> Result<Self, String> {
        let path = Self::find_db_path().ok_or_else(|| {
            "Could not locate Taxon SQLite database. Please specify path with --db flag."
                .to_string()
        })?;
        Self::open(&path)
    }

    pub fn open(path: &Path) -> Result<Self, String> {
        let conn = Connection::open(path).map_err(|e| format!("Failed to open SQLite DB: {}", e))?;
        let db = Self { conn };
        let _ = db.ensure_tables();
        Ok(db)
    }

    pub fn from_conn(conn: Connection) -> Self {
        let db = Self { conn };
        let _ = db.ensure_tables();
        db
    }

    pub fn find_db_path() -> Option<PathBuf> {
        if let Some(config_dir) = dirs::config_dir() {
            let p_app = config_dir.join("com.taxon.app").join("taxon.db");
            if p_app.exists() && p_app.metadata().map(|m| m.len() > 30000).unwrap_or(false) {
                return Some(p_app);
            }
            let p_dev = config_dir.join("com.taxon.dev").join("taxon.db");
            if p_dev.exists() && p_dev.metadata().map(|m| m.len() > 30000).unwrap_or(false) {
                return Some(p_dev);
            }
            if p_app.exists() {
                return Some(p_app);
            }
        }
        if let Some(data_dir) = dirs::data_dir() {
            let p = data_dir.join("com.taxon.app").join("taxon.db");
            if p.exists() {
                return Some(p);
            }
        }
        None
    }

    pub fn ensure_tables(&self) -> Result<(), String> {
        self.conn
            .execute_batch(
                "CREATE TABLE IF NOT EXISTS projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT,
                    category TEXT,
                    progress INTEGER,
                    dueDays INTEGER,
                    dueDate TEXT,
                    sortOrder INTEGER,
                    vaultPath TEXT,
                    workspacePaths TEXT,
                    pinned INTEGER DEFAULT 0,
                    pinnedSortOrder INTEGER
                );
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    projectId TEXT,
                    sprintId TEXT,
                    title TEXT NOT NULL,
                    completed INTEGER NOT NULL DEFAULT 0,
                    duration TEXT,
                    priority TEXT NOT NULL DEFAULT 'Medium',
                    status TEXT NOT NULL DEFAULT 'To Do',
                    description TEXT,
                    dueDate TEXT,
                    labels TEXT,
                    reminders TEXT,
                    deadline TEXT,
                    subtasks TEXT,
                    timeEffort INTEGER,
                    timeSpent INTEGER,
                    sortOrder INTEGER NOT NULL DEFAULT 0,
                    archived INTEGER NOT NULL DEFAULT 0,
                    archivedAt TEXT,
                    workspacePath TEXT,
                    linkedFiles TEXT,
                    dependsOn TEXT,
                    moduleGroup TEXT
                );
                CREATE TABLE IF NOT EXISTS sprints (
                    id TEXT PRIMARY KEY,
                    projectId TEXT,
                    name TEXT NOT NULL,
                    status TEXT NOT NULL DEFAULT 'Planned',
                    startDate TEXT NOT NULL,
                    endDate TEXT NOT NULL,
                    goal TEXT,
                    sortOrder INTEGER,
                    completedAt TEXT
                );",
            )
            .map_err(|e| e.to_string())?;

        // Best effort column migrations
        let _ = self.conn.execute("ALTER TABLE projects ADD COLUMN pinned INTEGER DEFAULT 0", []);
        let _ = self.conn.execute("ALTER TABLE projects ADD COLUMN pinnedSortOrder INTEGER", []);

        Ok(())
    }

    pub fn list_tasks(&self, project_id: Option<&str>) -> Result<Vec<Task>, String> {
        let query = match project_id {
            Some(_) => "SELECT id, projectId, sprintId, title, completed, duration, priority, status, description, dueDate, labels, reminders, deadline, subtasks, timeEffort, timeSpent, sortOrder, archived, archivedAt, workspacePath, linkedFiles, dependsOn, moduleGroup FROM tasks WHERE projectId = ?1 ORDER BY sortOrder ASC, id DESC",
            None => "SELECT id, projectId, sprintId, title, completed, duration, priority, status, description, dueDate, labels, reminders, deadline, subtasks, timeEffort, timeSpent, sortOrder, archived, archivedAt, workspacePath, linkedFiles, dependsOn, moduleGroup FROM tasks ORDER BY sortOrder ASC, id DESC",
        };

        let mut stmt = self.conn.prepare(query).map_err(|e| e.to_string())?;
        let rows = if let Some(pid) = project_id {
            stmt.query_map(params![pid], Self::map_task)
        } else {
            stmt.query_map([], Self::map_task)
        }
        .map_err(|e| e.to_string())?;

        let mut tasks = Vec::new();
        for r in rows {
            if let Ok(t) = r {
                tasks.push(t);
            }
        }
        Ok(tasks)
    }

    pub fn get_task(&self, task_id: &str) -> Result<Option<Task>, String> {
        let query = "SELECT id, projectId, sprintId, title, completed, duration, priority, status, description, dueDate, labels, reminders, deadline, subtasks, timeEffort, timeSpent, sortOrder, archived, archivedAt, workspacePath, linkedFiles, dependsOn, moduleGroup FROM tasks WHERE id = ?1";
        let mut stmt = self.conn.prepare(query).map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query_map(params![task_id], Self::map_task)
            .map_err(|e| e.to_string())?;

        if let Some(r) = rows.next() {
            r.map(Some).map_err(|e| e.to_string())
        } else {
            Ok(None)
        }
    }

    pub fn upsert_task(&self, task: &Task) -> Result<(), String> {
        let labels_json = task
            .labels
            .as_ref()
            .map(|l| serde_json::to_string(l).unwrap_or_default());
        let reminders_json = task
            .reminders
            .as_ref()
            .map(|r| serde_json::to_string(r).unwrap_or_default());
        let subtasks_json = task
            .subtasks
            .as_ref()
            .map(|s| serde_json::to_string(s).unwrap_or_default());
        let linked_files_json = task
            .linked_files
            .as_ref()
            .map(|l| serde_json::to_string(l).unwrap_or_default());
        let depends_on_json = task
            .depends_on
            .as_ref()
            .map(|d| serde_json::to_string(d).unwrap_or_default());

        self.conn
            .execute(
                "INSERT INTO tasks (
                    id, projectId, sprintId, title, completed, duration, priority, status,
                    description, dueDate, labels, reminders, deadline, subtasks,
                    timeEffort, timeSpent, sortOrder, archived, archivedAt,
                    workspacePath, linkedFiles, dependsOn, moduleGroup
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)
                ON CONFLICT(id) DO UPDATE SET
                    projectId = excluded.projectId,
                    sprintId = excluded.sprintId,
                    title = excluded.title,
                    completed = excluded.completed,
                    duration = excluded.duration,
                    priority = excluded.priority,
                    status = excluded.status,
                    description = excluded.description,
                    dueDate = excluded.dueDate,
                    labels = excluded.labels,
                    reminders = excluded.reminders,
                    deadline = excluded.deadline,
                    subtasks = excluded.subtasks,
                    timeEffort = excluded.timeEffort,
                    timeSpent = excluded.timeSpent,
                    sortOrder = excluded.sortOrder,
                    archived = excluded.archived,
                    archivedAt = excluded.archivedAt,
                    workspacePath = excluded.workspacePath,
                    linkedFiles = excluded.linkedFiles,
                    dependsOn = excluded.dependsOn,
                    moduleGroup = excluded.moduleGroup",
                params![
                    task.id,
                    task.project_id,
                    task.sprint_id,
                    task.title,
                    if task.completed { 1 } else { 0 },
                    task.duration,
                    task.priority,
                    task.status,
                    task.description,
                    task.due_date,
                    labels_json,
                    reminders_json,
                    task.deadline,
                    subtasks_json,
                    task.time_effort,
                    task.time_spent,
                    task.sort_order.unwrap_or(0),
                    if task.archived { 1 } else { 0 },
                    task.archived_at,
                    task.workspace_path,
                    linked_files_json,
                    depends_on_json,
                    task.module_group
                ],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn create_task(&self, task: &Task) -> Result<(), String> {
        self.upsert_task(task)
    }

    pub fn complete_task(&self, task_id_pattern: &str) -> Result<usize, String> {
        let updated = self
            .conn
            .execute(
                "UPDATE tasks SET completed = 1, status = 'Done' WHERE id LIKE ?1",
                params![format!("%{}%", task_id_pattern)],
            )
            .map_err(|e| e.to_string())?;
        Ok(updated)
    }

    pub fn update_task_status(&self, task_id: &str, status: &str) -> Result<(), String> {
        let completed = status == "Done";
        self.conn
            .execute(
                "UPDATE tasks SET status = ?1, completed = ?2 WHERE id = ?3",
                params![status, if completed { 1 } else { 0 }, task_id],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn update_task_priority(&self, task_id: &str, priority: &str) -> Result<(), String> {
        self.conn
            .execute(
                "UPDATE tasks SET priority = ?1 WHERE id = ?2",
                params![priority, task_id],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn toggle_task_completed(&self, task_id: &str) -> Result<bool, String> {
        let current = self.get_task(task_id)?.ok_or_else(|| "Task not found".to_string())?;
        let next_completed = !current.completed;
        let next_status = if next_completed {
            "Done"
        } else if current.status == "Done" {
            "To Do"
        } else {
            &current.status
        };

        self.conn
            .execute(
                "UPDATE tasks SET completed = ?1, status = ?2 WHERE id = ?3",
                params![if next_completed { 1 } else { 0 }, next_status, task_id],
            )
            .map_err(|e| e.to_string())?;

        Ok(next_completed)
    }

    pub fn list_sprints(&self, project_id: Option<&str>) -> Result<Vec<Sprint>, String> {
        let query = match project_id {
            Some(_) => "SELECT id, projectId, name, status, startDate, endDate, goal, sortOrder, completedAt FROM sprints WHERE projectId = ?1",
            None => "SELECT id, projectId, name, status, startDate, endDate, goal, sortOrder, completedAt FROM sprints",
        };

        let mut stmt = self.conn.prepare(query).map_err(|e| e.to_string())?;
        let rows = if let Some(pid) = project_id {
            stmt.query_map(params![pid], Self::map_sprint)
        } else {
            stmt.query_map([], Self::map_sprint)
        }
        .map_err(|e| e.to_string())?;

        let mut sprints = Vec::new();
        for r in rows {
            if let Ok(s) = r {
                sprints.push(s);
            }
        }
        Ok(sprints)
    }

    pub fn upsert_sprint(&self, sprint: &Sprint) -> Result<(), String> {
        self.conn
            .execute(
                "INSERT INTO sprints (id, projectId, name, status, startDate, endDate, goal, sortOrder, completedAt)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                 ON CONFLICT(id) DO UPDATE SET
                    projectId = excluded.projectId,
                    name = excluded.name,
                    status = excluded.status,
                    startDate = excluded.startDate,
                    endDate = excluded.endDate,
                    goal = excluded.goal,
                    sortOrder = excluded.sortOrder,
                    completedAt = excluded.completedAt",
                params![
                    sprint.id,
                    sprint.project_id,
                    sprint.name,
                    sprint.status,
                    sprint.start_date,
                    sprint.end_date,
                    sprint.goal,
                    sprint.sort_order.unwrap_or(0),
                    sprint.completed_at
                ],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn list_projects(&self) -> Result<Vec<Project>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, description, category, progress, dueDays, dueDate, sortOrder, vaultPath, workspacePaths, COALESCE(pinned, 0), pinnedSortOrder FROM projects ORDER BY COALESCE(pinned, 0) DESC, CASE WHEN COALESCE(pinned, 0) = 1 THEN COALESCE(pinnedSortOrder, 999999) ELSE COALESCE(sortOrder, 999999) END ASC, name ASC")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                let ws_raw: Option<String> = row.get(9)?;
                let workspace_paths = ws_raw.and_then(|s| serde_json::from_str(&s).ok());
                let pinned_num: i64 = row.get(10).unwrap_or(0);
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    category: row.get(3)?,
                    progress: row.get(4)?,
                    due_days: row.get(5)?,
                    due_date: row.get(6)?,
                    sort_order: row.get(7)?,
                    vault_path: row.get(8)?,
                    workspace_paths,
                    pinned: pinned_num != 0,
                    pinned_sort_order: row.get(11).ok(),
                })
            })
            .map_err(|e| e.to_string())?;

        let mut projects = Vec::new();
        for r in rows {
            if let Ok(p) = r {
                projects.push(p);
            }
        }
        Ok(projects)
    }

    pub fn get_project(&self, project_id: &str) -> Result<Option<Project>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, description, category, progress, dueDays, dueDate, sortOrder, vaultPath, workspacePaths, COALESCE(pinned, 0), pinnedSortOrder FROM projects WHERE id = ?1")
            .map_err(|e| e.to_string())?;

        let mut rows = stmt
            .query_map(params![project_id], |row| {
                let ws_raw: Option<String> = row.get(9)?;
                let workspace_paths = ws_raw.and_then(|s| serde_json::from_str(&s).ok());
                let pinned_num: i64 = row.get(10).unwrap_or(0);
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    category: row.get(3)?,
                    progress: row.get(4)?,
                    due_days: row.get(5)?,
                    due_date: row.get(6)?,
                    sort_order: row.get(7)?,
                    vault_path: row.get(8)?,
                    workspace_paths,
                    pinned: pinned_num != 0,
                    pinned_sort_order: row.get(11).ok(),
                })
            })
            .map_err(|e| e.to_string())?;

        if let Some(r) = rows.next() {
            r.map(Some).map_err(|e| e.to_string())
        } else {
            Ok(None)
        }
    }

    pub fn upsert_project(&self, project: &Project) -> Result<(), String> {
        let ws_json = project
            .workspace_paths
            .as_ref()
            .map(|w| serde_json::to_string(w).unwrap_or_default());

        self.conn
            .execute(
                "INSERT INTO projects (id, name, description, category, progress, dueDays, dueDate, sortOrder, vaultPath, workspacePaths)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                 ON CONFLICT(id) DO UPDATE SET
                    name = excluded.name,
                    description = excluded.description,
                    category = excluded.category,
                    progress = excluded.progress,
                    dueDays = excluded.dueDays,
                    dueDate = excluded.dueDate,
                    sortOrder = excluded.sortOrder,
                    vaultPath = excluded.vaultPath,
                    workspacePaths = excluded.workspacePaths",
                params![
                    project.id,
                    project.name,
                    project.description,
                    project.category,
                    project.progress,
                    project.due_days,
                    project.due_date,
                    project.sort_order,
                    project.vault_path,
                    ws_json
                ],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn map_task(row: &rusqlite::Row) -> rusqlite::Result<Task> {
        let completed_int: i64 = row.get(4)?;
        let labels_raw: Option<String> = row.get(10)?;
        let labels = labels_raw.and_then(|str_val| serde_json::from_str(&str_val).ok());
        let reminders_raw: Option<String> = row.get(11)?;
        let reminders = reminders_raw.and_then(|s| serde_json::from_str(&s).ok());
        let subtasks_raw: Option<String> = row.get(13)?;
        let subtasks: Option<Vec<SubTask>> =
            subtasks_raw.and_then(|s| serde_json::from_str(&s).ok());
        let archived_int: i64 = row.get(17)?;
        let linked_files_raw: Option<String> = row.get(20)?;
        let linked_files = linked_files_raw.and_then(|s| serde_json::from_str(&s).ok());
        let depends_on_raw: Option<String> = row.get(21)?;
        let depends_on = depends_on_raw.and_then(|s| serde_json::from_str(&s).ok());

        Ok(Task {
            id: row.get(0)?,
            project_id: row.get(1)?,
            sprint_id: row.get(2)?,
            title: row.get(3)?,
            completed: completed_int == 1,
            duration: row.get(5)?,
            priority: row.get(6)?,
            status: row.get(7)?,
            description: row.get(8)?,
            due_date: row.get(9)?,
            labels,
            reminders,
            deadline: row.get(12)?,
            subtasks,
            time_effort: row.get(14)?,
            time_spent: row.get(15)?,
            sort_order: row.get(16)?,
            archived: archived_int == 1,
            archived_at: row.get(18)?,
            workspace_path: row.get(19)?,
            linked_files,
            depends_on,
            module_group: row.get(22)?,
        })
    }

    fn map_sprint(row: &rusqlite::Row) -> rusqlite::Result<Sprint> {
        Ok(Sprint {
            id: row.get(0)?,
            project_id: row.get(1)?,
            name: row.get(2)?,
            status: row.get(3)?,
            start_date: row.get(4)?,
            end_date: row.get(5)?,
            goal: row.get(6)?,
            sort_order: row.get(7)?,
            completed_at: row.get(8)?,
        })
    }
}
