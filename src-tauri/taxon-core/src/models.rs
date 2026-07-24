use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    #[serde(rename = "projectId")]
    pub project_id: Option<String>,
    #[serde(rename = "sprintId")]
    pub sprint_id: Option<String>,
    pub title: String,
    pub completed: bool,
    pub priority: String,
    pub status: String,
    pub description: Option<String>,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    pub labels: Option<Vec<String>>,
    #[serde(rename = "timeEffort")]
    pub time_effort: Option<i64>,
    #[serde(rename = "timeSpent")]
    pub time_spent: Option<i64>,
    #[serde(rename = "sortOrder")]
    pub sort_order: Option<i64>,
    pub archived: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sprint {
    pub id: String,
    #[serde(rename = "projectId")]
    pub project_id: Option<String>,
    pub name: String,
    pub status: String,
    #[serde(rename = "startDate")]
    pub start_date: String,
    #[serde(rename = "endDate")]
    pub end_date: String,
    pub goal: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub progress: Option<i64>,
    #[serde(rename = "dueDate")]
    pub due_date: Option<String>,
    #[serde(rename = "vaultPath")]
    pub vault_path: Option<String>,
}
