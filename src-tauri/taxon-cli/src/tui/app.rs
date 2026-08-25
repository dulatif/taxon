use std::path::PathBuf;
use taxon_core::db::TaxonDb;
use taxon_core::models::{Project, Sprint, SyncDiff, Task, VaultEntry};
use taxon_core::sync::{apply_two_way_sync, compute_sync_diff, export_to_taxon_files, import_from_taxon_files};
use taxon_core::vault::{read_document, scan_vault};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Tab {
    Tasks,
    Vault,
    Sync,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Pane {
    Left,
    Right,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskGrouping {
    BySprint,
    ByStatus,
    All,
}

#[derive(Debug, Clone)]
pub enum DisplayTaskItem {
    Header {
        title: String,
        count: usize,
        completed_count: usize,
        is_active: bool,
    },
    Task {
        task_index: usize,
    },
}

#[derive(Debug, Clone)]
pub struct FlattenedVaultItem {
    pub name: String,
    pub path: PathBuf,
    pub is_directory: bool,
    pub depth: usize,
}

pub struct App {
    pub db: TaxonDb,
    pub projects: Vec<Project>,
    pub active_project_id: Option<String>,
    pub active_project_name: String,
    pub active_vault_path: Option<PathBuf>,
    pub active_taxon_dir: Option<PathBuf>,

    pub active_tab: Tab,
    pub focused_pane: Pane,

    // Tab 1: Tasks
    pub tasks: Vec<Task>,
    pub sprints: Vec<Sprint>,
    pub selected_task_index: usize,
    pub task_grouping: TaskGrouping,

    // Tab 2: Vault
    pub vault_entries: Vec<VaultEntry>,
    pub flattened_vault: Vec<FlattenedVaultItem>,
    pub selected_vault_index: usize,
    pub doc_content: Option<String>,
    pub doc_scroll: usize,

    // Tab 3: Sync
    pub sync_diff: Option<SyncDiff>,
    pub selected_diff_index: usize,
    pub sync_status_message: Option<String>,

    // Modals
    pub status_modal_open: bool,
    pub status_modal_selected: usize,
    pub project_modal_open: bool,
    pub project_modal_selected: usize,
    pub help_modal_open: bool,

    pub should_quit: bool,
    pub suspend_for_editor: Option<PathBuf>,
}

impl App {
    pub fn new(db: TaxonDb, requested_project_id: Option<String>, explicit_path: Option<PathBuf>) -> Self {
        let projects = db.list_projects().unwrap_or_default();

        let mut active_project_id = requested_project_id;
        let mut active_vault_path = explicit_path;

        // Auto-detect project if not provided
        if active_project_id.is_none() && active_vault_path.is_none() {
            if let Ok(current_dir) = std::env::current_dir() {
                let local_taxon = current_dir.join(".taxon");
                if local_taxon.exists() {
                    active_vault_path = Some(current_dir.clone());
                    // Try to match project from DB by vault path
                    for p in &projects {
                        if let Some(ref vp) = p.vault_path {
                            if PathBuf::from(vp) == current_dir {
                                active_project_id = Some(p.id.clone());
                                break;
                            }
                        }
                    }
                    if active_project_id.is_none() {
                        // Check project.md
                        if let Ok(content) = std::fs::read_to_string(local_taxon.join("project.md")) {
                            if let Ok(p) = taxon_core::sync::markdown_to_project(&content) {
                                active_project_id = Some(p.id);
                            }
                        }
                    }
                }
            }
        }

        if active_project_id.is_none() {
            if let Some(first) = projects.first() {
                active_project_id = Some(first.id.clone());
                if active_vault_path.is_none() {
                    if let Some(ref vp) = first.vault_path {
                        active_vault_path = Some(PathBuf::from(vp));
                    }
                }
            }
        }

        let mut app = Self {
            db,
            projects,
            active_project_id,
            active_project_name: "Taxon".to_string(),
            active_vault_path,
            active_taxon_dir: None,
            active_tab: Tab::Tasks,
            focused_pane: Pane::Left,
            tasks: Vec::new(),
            sprints: Vec::new(),
            selected_task_index: 0,
            task_grouping: TaskGrouping::BySprint,
            vault_entries: Vec::new(),
            flattened_vault: Vec::new(),
            selected_vault_index: 0,
            doc_content: None,
            doc_scroll: 0,
            sync_diff: None,
            selected_diff_index: 0,
            sync_status_message: None,
            status_modal_open: false,
            status_modal_selected: 0,
            project_modal_open: false,
            project_modal_selected: 0,
            help_modal_open: false,
            should_quit: false,
            suspend_for_editor: None,
        };

        app.refresh_project_state();
        app
    }

    pub fn refresh_project_state(&mut self) {
        if let Some(ref pid) = self.active_project_id {
            if let Ok(Some(p)) = self.db.get_project(pid) {
                self.active_project_name = p.name;
                if self.active_vault_path.is_none() {
                    if let Some(ref vp) = p.vault_path {
                        self.active_vault_path = Some(PathBuf::from(vp));
                    }
                }
            }
        }

        if let Some(ref vp) = self.active_vault_path {
            let td = if vp.ends_with(".taxon") {
                vp.clone()
            } else {
                vp.join(".taxon")
            };
            self.active_taxon_dir = Some(td);
        }

        self.reload_tasks();
        self.reload_vault();
        self.reload_sync();
    }

    pub fn reload_tasks(&mut self) {
        let pid = self.active_project_id.as_deref();
        self.tasks = self.db.list_tasks(pid).unwrap_or_default();
        self.sprints = self.db.list_sprints(pid).unwrap_or_default();
        if self.selected_task_index >= self.tasks.len() && !self.tasks.is_empty() {
            self.selected_task_index = self.tasks.len() - 1;
        }
    }

    pub fn reload_vault(&mut self) {
        if let Some(ref vp) = self.active_vault_path {
            if let Ok(entries) = scan_vault(vp) {
                self.vault_entries = entries;
                let mut flat = Vec::new();
                flatten_entries(&self.vault_entries, 0, &mut flat);
                self.flattened_vault = flat;

                if self.selected_vault_index >= self.flattened_vault.len() && !self.flattened_vault.is_empty() {
                    self.selected_vault_index = self.flattened_vault.len() - 1;
                }
                self.load_current_doc();
            }
        }
    }

    pub fn load_current_doc(&mut self) {
        if let Some(item) = self.flattened_vault.get(self.selected_vault_index) {
            if !item.is_directory {
                if let Ok(content) = read_document(&item.path) {
                    self.doc_content = Some(content);
                    self.doc_scroll = 0;
                    return;
                }
            }
        }
        self.doc_content = None;
        self.doc_scroll = 0;
    }

    pub fn reload_sync(&mut self) {
        if let (Some(ref pid), Some(ref td)) = (&self.active_project_id, &self.active_taxon_dir) {
            if let Ok(diff) = compute_sync_diff(&self.db, Some(pid), td) {
                self.sync_diff = Some(diff);
                if self.selected_diff_index >= self.sync_diff.as_ref().map_or(0, |d| d.items.len()) && self.selected_diff_index > 0 {
                    self.selected_diff_index = 0;
                }
            }
        }
    }

    pub fn toggle_current_task(&mut self) {
        if let Some(task) = self.tasks.get(self.selected_task_index) {
            let task_id = task.id.clone();
            let task_title = task.title.clone();
            if let Ok(new_completed) = self.db.toggle_task_completed(&task_id) {
                self.reload_tasks();
                self.reload_sync();
                self.sync_status_message = Some(format!(
                    "Task '{}' marked as {}",
                    task_title,
                    if new_completed { "Done" } else { "To Do" }
                ));
            }
        }
    }

    pub fn cycle_current_task_priority(&mut self) {
        if let Some(task) = self.tasks.get(self.selected_task_index) {
            let next_p = match task.priority.as_str() {
                "Low" => "Medium",
                "Medium" => "High",
                "High" => "Critical",
                "Critical" => "Low",
                _ => "Medium",
            };
            if self.db.update_task_priority(&task.id, next_p).is_ok() {
                self.reload_tasks();
                self.reload_sync();
                self.sync_status_message = Some(format!("Task priority changed to {}", next_p));
            }
        }
    }

    pub fn set_current_task_status(&mut self, status: &str) {
        if let Some(task) = self.tasks.get(self.selected_task_index) {
            if self.db.update_task_status(&task.id, status).is_ok() {
                self.reload_tasks();
                self.reload_sync();
                self.sync_status_message = Some(format!("Task status changed to {}", status));
            }
        }
    }

    pub fn apply_sync(&mut self) {
        if let (Some(ref pid), Some(ref td)) = (&self.active_project_id, &self.active_taxon_dir) {
            match apply_two_way_sync(&self.db, pid, td) {
                Ok(count) => {
                    self.reload_tasks();
                    self.reload_sync();
                    self.sync_status_message = Some(format!("Synced {} items successfully.", count));
                }
                Err(e) => {
                    self.sync_status_message = Some(format!("Sync error: {}", e));
                }
            }
        }
    }

    pub fn force_export(&mut self) {
        if let (Some(ref pid), Some(ref td)) = (&self.active_project_id, &self.active_taxon_dir) {
            match export_to_taxon_files(&self.db, pid, td) {
                Ok(count) => {
                    self.reload_sync();
                    self.sync_status_message = Some(format!("Exported {} items to .taxon files.", count));
                }
                Err(e) => {
                    self.sync_status_message = Some(format!("Export error: {}", e));
                }
            }
        }
    }

    pub fn force_import(&mut self) {
        if let (Some(ref pid), Some(ref td)) = (&self.active_project_id, &self.active_taxon_dir) {
            match import_from_taxon_files(&self.db, pid, td) {
                Ok(count) => {
                    self.reload_tasks();
                    self.reload_sync();
                    self.sync_status_message = Some(format!("Imported {} items into DB.", count));
                }
                Err(e) => {
                    self.sync_status_message = Some(format!("Import error: {}", e));
                }
            }
        }
    }

    pub fn get_display_task_items(&self) -> Vec<DisplayTaskItem> {
        match self.task_grouping {
            TaskGrouping::BySprint => {
                let mut items = Vec::new();

                // Sprints sorted: Active first, then Planned, then Completed
                let mut sorted_sprints = self.sprints.clone();
                sorted_sprints.sort_by(|a, b| {
                    let order = |status: &str| match status {
                        "Active" => 0,
                        "Planned" => 1,
                        "Completed" => 2,
                        _ => 3,
                    };
                    order(&a.status).cmp(&order(&b.status))
                });

                for sprint in &sorted_sprints {
                    let sprint_tasks: Vec<(usize, &Task)> = self
                        .tasks
                        .iter()
                        .enumerate()
                        .filter(|(_, t)| t.sprint_id.as_deref() == Some(&sprint.id))
                        .collect();

                    let count = sprint_tasks.len();
                    let completed_count = sprint_tasks.iter().filter(|(_, t)| t.completed).count();
                    let is_active = sprint.status == "Active";

                    let status_badge = match sprint.status.as_str() {
                        "Active" => "Active",
                        "Planned" => "Planned",
                        "Completed" => "Completed",
                        s => s,
                    };

                    items.push(DisplayTaskItem::Header {
                        title: format!("🏃 {} [{}]", sprint.name, status_badge),
                        count,
                        completed_count,
                        is_active,
                    });

                    for (idx, _) in sprint_tasks {
                        items.push(DisplayTaskItem::Task { task_index: idx });
                    }
                }

                // Backlog tasks (no sprint)
                let backlog_tasks: Vec<(usize, &Task)> = self
                    .tasks
                    .iter()
                    .enumerate()
                    .filter(|(_, t)| t.sprint_id.is_none() || t.sprint_id.as_deref() == Some(""))
                    .collect();

                if !backlog_tasks.is_empty() || self.sprints.is_empty() {
                    let count = backlog_tasks.len();
                    let completed_count = backlog_tasks.iter().filter(|(_, t)| t.completed).count();
                    items.push(DisplayTaskItem::Header {
                        title: "📦 Backlog / No Sprint".to_string(),
                        count,
                        completed_count,
                        is_active: false,
                    });
                    for (idx, _) in backlog_tasks {
                        items.push(DisplayTaskItem::Task { task_index: idx });
                    }
                }

                items
            }
            TaskGrouping::ByStatus => {
                let mut items = Vec::new();
                let statuses = [
                    ("📋 To Do", "To Do"),
                    ("⚡ In Progress", "In Progress"),
                    ("🧪 Need to Test", "Need to Test"),
                    ("✅ Done", "Done"),
                ];

                for (label, status_key) in statuses {
                    let group_tasks: Vec<(usize, &Task)> = self
                        .tasks
                        .iter()
                        .enumerate()
                        .filter(|(_, t)| t.status.as_str() == status_key)
                        .collect();

                    let count = group_tasks.len();
                    let completed_count = group_tasks.iter().filter(|(_, t)| t.completed).count();
                    items.push(DisplayTaskItem::Header {
                        title: label.to_string(),
                        count,
                        completed_count,
                        is_active: status_key == "In Progress",
                    });

                    for (idx, _) in group_tasks {
                        items.push(DisplayTaskItem::Task { task_index: idx });
                    }
                }

                items
            }
            TaskGrouping::All => {
                let mut items = Vec::new();
                let count = self.tasks.len();
                let completed_count = self.tasks.iter().filter(|t| t.completed).count();
                items.push(DisplayTaskItem::Header {
                    title: "📋 All Project Tasks".to_string(),
                    count,
                    completed_count,
                    is_active: false,
                });
                for idx in 0..self.tasks.len() {
                    items.push(DisplayTaskItem::Task { task_index: idx });
                }
                items
            }
        }
    }

    pub fn cycle_task_grouping(&mut self) {
        self.task_grouping = match self.task_grouping {
            TaskGrouping::BySprint => TaskGrouping::ByStatus,
            TaskGrouping::ByStatus => TaskGrouping::All,
            TaskGrouping::All => TaskGrouping::BySprint,
        };
    }
}

fn flatten_entries(entries: &[VaultEntry], depth: usize, out: &mut Vec<FlattenedVaultItem>) {
    for entry in entries {
        out.push(FlattenedVaultItem {
            name: entry.name.clone(),
            path: PathBuf::from(&entry.path),
            is_directory: entry.is_directory,
            depth,
        });
        if let Some(ref children) = entry.children {
            flatten_entries(children, depth + 1, out);
        }
    }
}
