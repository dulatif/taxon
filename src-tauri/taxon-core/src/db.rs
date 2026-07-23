use crate::models::{Project, Sprint, Task};
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
        Ok(Self { conn })
    }

    pub fn from_conn(conn: Connection) -> Self {
        Self { conn }
    }

    pub fn find_db_path() -> Option<PathBuf> {
        if let Some(config_dir) = dirs::config_dir() {
            let p = config_dir.join("com.taxon.app").join("taxon.db");
            if p.exists() {
                return Some(p);
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

    pub fn list_tasks(&self, project_id: Option<&str>) -> Result<Vec<Task>, String> {
        let query = match project_id {
            Some(_) => "SELECT id, projectId, sprintId, title, completed, priority, status, description, dueDate, labels, timeEffort, timeSpent, sortOrder, archived FROM tasks WHERE projectId = ?1 ORDER BY sortOrder ASC, id DESC",
            None => "SELECT id, projectId, sprintId, title, completed, priority, status, description, dueDate, labels, timeEffort, timeSpent, sortOrder, archived FROM tasks ORDER BY sortOrder ASC, id DESC",
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

    pub fn create_task(&self, task: &Task) -> Result<(), String> {
        let labels_json = task
            .labels
            .as_ref()
            .map(|l| serde_json::to_string(l).unwrap_or_default());

        self.conn
            .execute(
                "INSERT INTO tasks (id, projectId, sprintId, title, completed, priority, status, description, dueDate, labels, timeEffort, timeSpent, sortOrder, archived)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)",
                params![
                    task.id,
                    task.project_id,
                    task.sprint_id,
                    task.title,
                    if task.completed { 1 } else { 0 },
                    task.priority,
                    task.status,
                    task.description,
                    task.due_date,
                    labels_json,
                    task.time_effort,
                    task.time_spent,
                    task.sort_order.unwrap_or(0),
                    if task.archived { 1 } else { 0 }
                ],
            )
            .map_err(|e| e.to_string())?;
        Ok(())
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

    pub fn list_sprints(&self, project_id: Option<&str>) -> Result<Vec<Sprint>, String> {
        let query = match project_id {
            Some(_) => "SELECT id, projectId, name, status, startDate, endDate, goal FROM sprints WHERE projectId = ?1",
            None => "SELECT id, projectId, name, status, startDate, endDate, goal FROM sprints",
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

    pub fn list_projects(&self) -> Result<Vec<Project>, String> {
        let mut stmt = self
            .conn
            .prepare("SELECT id, name, description, category, progress, dueDate, vaultPath FROM projects")
            .map_err(|e| e.to_string())?;

        let rows = stmt
            .query_map([], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    category: row.get(3)?,
                    progress: row.get(4)?,
                    due_date: row.get(5)?,
                    vault_path: row.get(6)?,
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

    fn map_task(row: &rusqlite::Row) -> rusqlite::Result<Task> {
        let completed_int: i64 = row.get(4)?;
        let archived_int: i64 = row.get(13)?;
        let labels_raw: Option<String> = row.get(9)?;
        let labels = labels_raw.and_then(|str_val| serde_json::from_str(&str_val).ok());

        Ok(Task {
            id: row.get(0)?,
            project_id: row.get(1)?,
            sprint_id: row.get(2)?,
            title: row.get(3)?,
            completed: completed_int == 1,
            priority: row.get(5)?,
            status: row.get(6)?,
            description: row.get(7)?,
            due_date: row.get(8)?,
            labels,
            time_effort: row.get(10)?,
            time_spent: row.get(11)?,
            sort_order: row.get(12)?,
            archived: archived_int == 1,
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
        })
    }
}
