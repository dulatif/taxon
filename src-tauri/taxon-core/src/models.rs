use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SubTask {
    pub id: String,
    pub title: String,
    pub completed: bool,
}

fn default_priority() -> String {
    "Medium".to_string()
}

fn default_status() -> String {
    "To Do".to_string()
}

fn default_sprint_status() -> String {
    "Planned".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Task {
    pub id: String,
    #[serde(rename = "projectId", default)]
    pub project_id: Option<String>,
    #[serde(rename = "sprintId", default)]
    pub sprint_id: Option<String>,
    pub title: String,
    #[serde(default)]
    pub completed: bool,
    #[serde(default)]
    pub duration: Option<String>,
    #[serde(default = "default_priority")]
    pub priority: String,
    #[serde(default = "default_status")]
    pub status: String,
    #[serde(rename = "dueDate", default)]
    pub due_date: Option<String>,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub labels: Option<Vec<String>>,
    #[serde(default)]
    pub reminders: Option<Vec<String>>,
    #[serde(default)]
    pub deadline: Option<String>,
    #[serde(default)]
    pub subtasks: Option<Vec<SubTask>>,
    #[serde(rename = "timeEffort", default)]
    pub time_effort: Option<i64>,
    #[serde(rename = "timeSpent", default)]
    pub time_spent: Option<i64>,
    #[serde(rename = "sortOrder", default)]
    pub sort_order: Option<i64>,
    #[serde(default)]
    pub archived: bool,
    #[serde(rename = "archivedAt", default)]
    pub archived_at: Option<String>,
    #[serde(rename = "workspacePath", default)]
    pub workspace_path: Option<String>,
    #[serde(rename = "linkedFiles", default)]
    pub linked_files: Option<Vec<String>>,
    #[serde(rename = "dependsOn", default)]
    pub depends_on: Option<Vec<String>>,
    #[serde(rename = "moduleGroup", default)]
    pub module_group: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Sprint {
    pub id: String,
    #[serde(rename = "projectId", default)]
    pub project_id: Option<String>,
    pub name: String,
    #[serde(default = "default_sprint_status")]
    pub status: String,
    #[serde(rename = "startDate")]
    pub start_date: String,
    #[serde(rename = "endDate")]
    pub end_date: String,
    #[serde(default)]
    pub goal: Option<String>,
    #[serde(rename = "sortOrder", default)]
    pub sort_order: Option<i64>,
    #[serde(rename = "completedAt", default)]
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Project {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub progress: Option<i64>,
    #[serde(rename = "dueDays", default)]
    pub due_days: Option<i64>,
    #[serde(rename = "dueDate", default)]
    pub due_date: Option<String>,
    #[serde(rename = "sortOrder", default)]
    pub sort_order: Option<i64>,
    #[serde(rename = "vaultPath", default)]
    pub vault_path: Option<String>,
    #[serde(rename = "workspacePaths", default)]
    pub workspace_paths: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct VaultEntry {
    pub name: String,
    pub path: String,
    #[serde(rename = "isDirectory")]
    pub is_directory: bool,
    #[serde(default)]
    pub children: Option<Vec<VaultEntry>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum DiffKind {
    Added,
    Modified,
    Deleted,
    Conflict,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct DiffItem {
    pub entity_type: String, // "task" | "sprint" | "project"
    pub id: String,
    pub title: String,
    pub kind: DiffKind,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct SyncDiff {
    pub items: Vec<DiffItem>,
    pub db_task_count: usize,
    pub file_task_count: usize,
    pub db_sprint_count: usize,
    pub file_sprint_count: usize,
}
