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
    Pomodoro,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PomodoroPhase {
    Work,
    ShortBreak,
    LongBreak,
}

impl PomodoroPhase {
    pub fn label(&self) -> &'static str {
        match self {
            PomodoroPhase::Work => "Work Focus",
            PomodoroPhase::ShortBreak => "Short Break",
            PomodoroPhase::LongBreak => "Long Break",
        }
    }

    pub fn emoji(&self) -> &'static str {
        match self {
            PomodoroPhase::Work => "🍅",
            PomodoroPhase::ShortBreak => "☕",
            PomodoroPhase::LongBreak => "🌴",
        }
    }
}

#[derive(Debug, Clone)]
pub struct PomodoroState {
    pub phase: PomodoroPhase,
    pub timer_seconds: u32,
    pub is_running: bool,
    pub completed_sessions: u32,
    pub active_task_id: Option<String>,
    pub active_task_title: Option<String>,

    // Duration configurations (in minutes)
    pub work_duration: u32,       // default 25 min
    pub short_break: u32,         // default 5 min
    pub long_break: u32,          // default 15 min
    pub long_break_interval: u32, // default 4 sessions
    pub auto_start_breaks: bool,
    pub auto_start_pomodoros: bool,

    // Timing tracking
    pub last_tick: Option<std::time::Instant>,
    pub total_focus_seconds_today: u64,
    pub session_tick_counter: u32,
}

impl Default for PomodoroState {
    fn default() -> Self {
        Self {
            phase: PomodoroPhase::Work,
            timer_seconds: 25 * 60,
            is_running: false,
            completed_sessions: 0,
            active_task_id: None,
            active_task_title: None,
            work_duration: 25,
            short_break: 5,
            long_break: 15,
            long_break_interval: 4,
            auto_start_breaks: false,
            auto_start_pomodoros: false,
            last_tick: None,
            total_focus_seconds_today: 0,
            session_tick_counter: 0,
        }
    }
}

impl PomodoroState {
    pub fn current_phase_total_seconds(&self) -> u32 {
        match self.phase {
            PomodoroPhase::Work => self.work_duration * 60,
            PomodoroPhase::ShortBreak => self.short_break * 60,
            PomodoroPhase::LongBreak => self.long_break * 60,
        }
    }

    pub fn format_time(&self) -> String {
        let mins = self.timer_seconds / 60;
        let secs = self.timer_seconds % 60;
        format!("{:02}:{:02}", mins, secs)
    }

    pub fn toggle(&mut self) {
        self.is_running = !self.is_running;
        if self.is_running {
            self.last_tick = Some(std::time::Instant::now());
        } else {
            self.last_tick = None;
        }
    }

    pub fn reset(&mut self) {
        self.timer_seconds = self.current_phase_total_seconds();
        self.is_running = false;
        self.last_tick = None;
    }

    pub fn switch_phase(&mut self, new_phase: PomodoroPhase) {
        self.phase = new_phase;
        self.timer_seconds = self.current_phase_total_seconds();
        self.is_running = false;
        self.last_tick = None;
    }

    pub fn skip(&mut self) {
        self.last_tick = None;
        if self.phase == PomodoroPhase::Work {
            self.completed_sessions += 1;
            let next_phase = if self.completed_sessions % self.long_break_interval == 0 {
                PomodoroPhase::LongBreak
            } else {
                PomodoroPhase::ShortBreak
            };
            self.switch_phase(next_phase);
        } else {
            self.switch_phase(PomodoroPhase::Work);
        }
    }

    pub fn link_task(&mut self, task_id: String, task_title: String) {
        self.active_task_id = Some(task_id);
        self.active_task_title = Some(task_title);
        if self.phase != PomodoroPhase::Work {
            self.switch_phase(PomodoroPhase::Work);
        }
    }

    pub fn unlink_task(&mut self) {
        self.active_task_id = None;
        self.active_task_title = None;
    }

    pub fn adjust_duration(&mut self, delta_minutes: i32) {
        let current_dur = match self.phase {
            PomodoroPhase::Work => self.work_duration as i32,
            PomodoroPhase::ShortBreak => self.short_break as i32,
            PomodoroPhase::LongBreak => self.long_break as i32,
        };
        let new_dur = (current_dur + delta_minutes).max(1) as u32;
        match self.phase {
            PomodoroPhase::Work => self.work_duration = new_dur,
            PomodoroPhase::ShortBreak => self.short_break = new_dur,
            PomodoroPhase::LongBreak => self.long_break = new_dur,
        }
        if !self.is_running {
            self.timer_seconds = self.current_phase_total_seconds();
        }
    }

    pub fn tick(&mut self) -> Option<String> {
        if !self.is_running {
            return None;
        }

        let now = std::time::Instant::now();
        let last = self.last_tick.unwrap_or(now);
        let elapsed = now.duration_since(last).as_secs() as u32;

        if elapsed >= 1 {
            self.last_tick = Some(now);

            if self.phase == PomodoroPhase::Work {
                self.total_focus_seconds_today += elapsed as u64;
                self.session_tick_counter += elapsed;
            }

            if self.timer_seconds <= elapsed {
                let msg = self.complete_phase();
                print!("\x07");
                return Some(msg);
            } else {
                self.timer_seconds -= elapsed;
            }
        }

        None
    }

    fn complete_phase(&mut self) -> String {
        match self.phase {
            PomodoroPhase::Work => {
                self.completed_sessions += 1;
                let next_phase = if self.completed_sessions % self.long_break_interval == 0 {
                    PomodoroPhase::LongBreak
                } else {
                    PomodoroPhase::ShortBreak
                };
                self.phase = next_phase;
                self.timer_seconds = self.current_phase_total_seconds();
                self.is_running = self.auto_start_breaks;
                if !self.is_running {
                    self.last_tick = None;
                }

                let task_str = self.active_task_title.as_deref().unwrap_or("Focus session");
                format!("🎉 Work session completed on '{}'! Time for a break.", task_str)
            }
            PomodoroPhase::ShortBreak | PomodoroPhase::LongBreak => {
                self.phase = PomodoroPhase::Work;
                self.timer_seconds = self.current_phase_total_seconds();
                self.is_running = self.auto_start_pomodoros;
                if !self.is_running {
                    self.last_tick = None;
                }

                "☕ Break completed! Ready to get back to work?".to_string()
            }
        }
    }
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

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SprintFilter {
    All,
    ActiveOnly,
    PlannedOnly,
    Specific(String),
    BacklogOnly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StatusFilter {
    All,
    InProgress,
    ToDo,
    NeedToTest,
    Done,
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
    pub sprint_filter: SprintFilter,
    pub status_filter: StatusFilter,

    // Tab 2: Vault
    pub vault_entries: Vec<VaultEntry>,
    pub flattened_vault: Vec<FlattenedVaultItem>,
    pub selected_vault_index: usize,
    pub doc_content: Option<String>,
    pub doc_scroll: usize,
    pub vault_search_active: bool,
    pub vault_search_query: String,

    // Tab 3: Sync
    pub sync_diff: Option<SyncDiff>,
    pub selected_diff_index: usize,
    pub sync_status_message: Option<String>,

    // Tab 4: Pomodoro
    pub pomodoro: PomodoroState,

    // Modals
    pub status_modal_open: bool,
    pub status_modal_selected: usize,
    pub project_modal_open: bool,
    pub project_modal_selected: usize,
    pub project_search_query: String,
    pub sprint_modal_open: bool,
    pub sprint_modal_selected: usize,
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
            sprint_filter: SprintFilter::ActiveOnly,
            status_filter: StatusFilter::All,
            vault_entries: Vec::new(),
            flattened_vault: Vec::new(),
            selected_vault_index: 0,
            doc_content: None,
            doc_scroll: 0,
            vault_search_active: false,
            vault_search_query: String::new(),
            sync_diff: None,
            selected_diff_index: 0,
            sync_status_message: None,
            pomodoro: PomodoroState::default(),
            status_modal_open: false,
            status_modal_selected: 0,
            project_modal_open: false,
            project_modal_selected: 0,
            project_search_query: String::new(),
            sprint_modal_open: false,
            sprint_modal_selected: 0,
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
                let filtered = filter_vault_entries(&self.vault_entries, &self.vault_search_query);
                let mut flat = Vec::new();
                flatten_entries(&filtered, 0, &mut flat);
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
        let filtered_before = self.get_filtered_tasks();
        let current_pos = filtered_before
            .iter()
            .position(|(idx, _)| *idx == self.selected_task_index);

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

                // Move focus to next task in filtered list
                let filtered_after = self.get_filtered_tasks();
                if !filtered_after.is_empty() {
                    if let Some(pos) = current_pos {
                        let still_present = filtered_after.iter().position(|(_, t)| t.id == task_id);
                        let next_target_pos = match still_present {
                            Some(p) => {
                                if p + 1 < filtered_after.len() {
                                    p + 1
                                } else {
                                    p
                                }
                            }
                            None => pos.min(filtered_after.len() - 1),
                        };
                        self.selected_task_index = filtered_after[next_target_pos].0;
                    } else {
                        self.selected_task_index = filtered_after[0].0;
                    }
                }
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
        let is_status_matched = |task: &Task| -> bool {
            match self.status_filter {
                StatusFilter::All => true,
                StatusFilter::InProgress => task.status == "In Progress",
                StatusFilter::ToDo => task.status == "To Do",
                StatusFilter::NeedToTest => task.status == "Need to Test",
                StatusFilter::Done => task.status == "Done",
            }
        };

        let is_sprint_matched = |task: &Task| -> bool {
            match &self.sprint_filter {
                SprintFilter::All => true,
                SprintFilter::ActiveOnly => {
                    let active_ids: Vec<&str> = self
                        .sprints
                        .iter()
                        .filter(|s| s.status == "Active")
                        .map(|s| s.id.as_str())
                        .collect();
                    task.sprint_id
                        .as_deref()
                        .map(|id| active_ids.contains(&id))
                        .unwrap_or(false)
                }
                SprintFilter::PlannedOnly => {
                    let planned_ids: Vec<&str> = self
                        .sprints
                        .iter()
                        .filter(|s| s.status == "Planned")
                        .map(|s| s.id.as_str())
                        .collect();
                    task.sprint_id
                        .as_deref()
                        .map(|id| planned_ids.contains(&id))
                        .unwrap_or(false)
                }
                SprintFilter::Specific(sid) => task.sprint_id.as_deref() == Some(sid.as_str()),
                SprintFilter::BacklogOnly => {
                    task.sprint_id.is_none() || task.sprint_id.as_deref() == Some("")
                }
            }
        };

        match self.task_grouping {
            TaskGrouping::BySprint => {
                let mut items = Vec::new();

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
                    let sprint_filter_allows = match &self.sprint_filter {
                        SprintFilter::All => true,
                        SprintFilter::ActiveOnly => sprint.status == "Active",
                        SprintFilter::PlannedOnly => sprint.status == "Planned",
                        SprintFilter::Specific(sid) => &sprint.id == sid,
                        SprintFilter::BacklogOnly => false,
                    };
                    if !sprint_filter_allows {
                        continue;
                    }

                    let sprint_tasks: Vec<(usize, &Task)> = self
                        .tasks
                        .iter()
                        .enumerate()
                        .filter(|(_, t)| {
                            t.sprint_id.as_deref() == Some(&sprint.id) && is_status_matched(t)
                        })
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

                let backlog_filter_allows = match &self.sprint_filter {
                    SprintFilter::All | SprintFilter::BacklogOnly => true,
                    _ => false,
                };

                if backlog_filter_allows {
                    let backlog_tasks: Vec<(usize, &Task)> = self
                        .tasks
                        .iter()
                        .enumerate()
                        .filter(|(_, t)| {
                            (t.sprint_id.is_none() || t.sprint_id.as_deref() == Some(""))
                                && is_status_matched(t)
                        })
                        .collect();

                    if !backlog_tasks.is_empty() || (self.sprints.is_empty() && self.sprint_filter == SprintFilter::All) {
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
                }

                items
            }
            TaskGrouping::ByStatus => {
                let mut items = Vec::new();
                let statuses = [
                    ("📋 To Do", "To Do", StatusFilter::ToDo),
                    ("⚡ In Progress", "In Progress", StatusFilter::InProgress),
                    ("🧪 Need to Test", "Need to Test", StatusFilter::NeedToTest),
                    ("✅ Done", "Done", StatusFilter::Done),
                ];

                for (label, status_key, s_filter) in statuses {
                    if self.status_filter != StatusFilter::All && self.status_filter != s_filter {
                        continue;
                    }

                    let group_tasks: Vec<(usize, &Task)> = self
                        .tasks
                        .iter()
                        .enumerate()
                        .filter(|(_, t)| t.status.as_str() == status_key && is_sprint_matched(t))
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
                let matching_tasks: Vec<usize> = self
                    .tasks
                    .iter()
                    .enumerate()
                    .filter(|(_, t)| is_status_matched(t) && is_sprint_matched(t))
                    .map(|(idx, _)| idx)
                    .collect();

                let count = matching_tasks.len();
                let completed_count = matching_tasks
                    .iter()
                    .filter(|&&idx| self.tasks[idx].completed)
                    .count();

                items.push(DisplayTaskItem::Header {
                    title: "📋 Filtered Tasks".to_string(),
                    count,
                    completed_count,
                    is_active: false,
                });
                for idx in matching_tasks {
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

    pub fn cycle_sprint_filter(&mut self) {
        self.sprint_filter = match &self.sprint_filter {
            SprintFilter::All => SprintFilter::ActiveOnly,
            SprintFilter::ActiveOnly => SprintFilter::PlannedOnly,
            SprintFilter::PlannedOnly => SprintFilter::BacklogOnly,
            SprintFilter::BacklogOnly | SprintFilter::Specific(_) => SprintFilter::All,
        };
    }

    pub fn cycle_status_filter(&mut self) {
        self.status_filter = match self.status_filter {
            StatusFilter::All => StatusFilter::InProgress,
            StatusFilter::InProgress => StatusFilter::ToDo,
            StatusFilter::ToDo => StatusFilter::NeedToTest,
            StatusFilter::NeedToTest => StatusFilter::Done,
            StatusFilter::Done => StatusFilter::All,
        };
    }

    pub fn cycle_tab_forward(&mut self) {
        self.active_tab = match self.active_tab {
            Tab::Tasks => Tab::Vault,
            Tab::Vault => Tab::Sync,
            Tab::Sync => Tab::Pomodoro,
            Tab::Pomodoro => Tab::Tasks,
        };
    }

    pub fn cycle_tab_backward(&mut self) {
        self.active_tab = match self.active_tab {
            Tab::Tasks => Tab::Pomodoro,
            Tab::Vault => Tab::Tasks,
            Tab::Sync => Tab::Vault,
            Tab::Pomodoro => Tab::Sync,
        };
    }

    pub fn tick(&mut self) {
        if let Some(msg) = self.pomodoro.tick() {
            self.sync_status_message = Some(msg);
        }

        if self.pomodoro.session_tick_counter >= 60 {
            let minutes = self.pomodoro.session_tick_counter / 60;
            self.pomodoro.session_tick_counter %= 60;
            if let Some(ref tid) = self.pomodoro.active_task_id {
                let _ = self.db.increment_task_time_spent(tid, minutes as i64);
                self.reload_tasks();
            }
        }
    }

    pub fn start_focus_on_task(&mut self, task_index: usize) {
        if let Some(task) = self.tasks.get(task_index) {
            let tid = task.id.clone();
            let title = task.title.clone();
            self.pomodoro.link_task(tid, title.clone());
            self.pomodoro.is_running = true;
            self.pomodoro.last_tick = Some(std::time::Instant::now());
            self.active_tab = Tab::Pomodoro;
            self.sync_status_message = Some(format!("Started focus session on '{}'", title));
        }
    }

    pub fn get_linked_focus_task(&self) -> Option<&Task> {
        if let Some(ref tid) = self.pomodoro.active_task_id {
            self.tasks.iter().find(|t| &t.id == tid)
        } else {
            None
        }
    }

    pub fn get_filtered_projects(&self) -> Vec<(usize, &Project)> {
        if self.project_search_query.trim().is_empty() {
            return self.projects.iter().enumerate().collect();
        }
        let q = self.project_search_query.to_lowercase();
        self.projects
            .iter()
            .enumerate()
            .filter(|(_, p)| {
                p.name.to_lowercase().contains(&q)
                    || p.category.as_deref().unwrap_or("").to_lowercase().contains(&q)
                    || p.vault_path.as_deref().unwrap_or("").to_lowercase().contains(&q)
            })
            .collect()
    }

    pub fn get_filtered_tasks(&self) -> Vec<(usize, &Task)> {
        let is_status_matched = |task: &Task| -> bool {
            match self.status_filter {
                StatusFilter::All => true,
                StatusFilter::InProgress => task.status == "In Progress",
                StatusFilter::ToDo => task.status == "To Do",
                StatusFilter::NeedToTest => task.status == "Need to Test",
                StatusFilter::Done => task.status == "Done",
            }
        };

        let is_sprint_matched = |task: &Task| -> bool {
            match &self.sprint_filter {
                SprintFilter::All => true,
                SprintFilter::ActiveOnly => {
                    let active_ids: Vec<&str> = self
                        .sprints
                        .iter()
                        .filter(|s| s.status == "Active")
                        .map(|s| s.id.as_str())
                        .collect();
                    task.sprint_id
                        .as_deref()
                        .map(|id| active_ids.contains(&id))
                        .unwrap_or(false)
                }
                SprintFilter::PlannedOnly => {
                    let planned_ids: Vec<&str> = self
                        .sprints
                        .iter()
                        .filter(|s| s.status == "Planned")
                        .map(|s| s.id.as_str())
                        .collect();
                    task.sprint_id
                        .as_deref()
                        .map(|id| planned_ids.contains(&id))
                        .unwrap_or(false)
                }
                SprintFilter::Specific(sid) => task.sprint_id.as_deref() == Some(sid.as_str()),
                SprintFilter::BacklogOnly => {
                    task.sprint_id.is_none() || task.sprint_id.as_deref() == Some("")
                }
            }
        };

        self.tasks
            .iter()
            .enumerate()
            .filter(|(_, t)| is_status_matched(t) && is_sprint_matched(t))
            .collect()
    }

    pub fn get_sprint_banner_info(&self) -> (Option<&Sprint>, String, usize, usize, usize) {
        let matching_sprint = match &self.sprint_filter {
            SprintFilter::ActiveOnly => self.sprints.iter().find(|s| s.status == "Active"),
            SprintFilter::Specific(sid) => self.sprints.iter().find(|s| &s.id == sid),
            SprintFilter::PlannedOnly => self.sprints.iter().find(|s| s.status == "Planned"),
            SprintFilter::All | SprintFilter::BacklogOnly => None,
        };

        let filter_title = match &self.sprint_filter {
            SprintFilter::All => "All Tasks (Full Project)".to_string(),
            SprintFilter::ActiveOnly => {
                if let Some(s) = matching_sprint {
                    format!("🏃 {} [Active]", s.name)
                } else {
                    "No Active Sprint".to_string()
                }
            }
            SprintFilter::PlannedOnly => {
                if let Some(s) = matching_sprint {
                    format!("📋 {} [Planned]", s.name)
                } else {
                    "Planned Sprints".to_string()
                }
            }
            SprintFilter::Specific(sid) => {
                if let Some(s) = matching_sprint {
                    format!("🏃 {} [{}]", s.name, s.status)
                } else {
                    format!("Sprint {}", sid)
                }
            }
            SprintFilter::BacklogOnly => "📦 Backlog (Unassigned Tasks)".to_string(),
        };

        let tasks_in_scope: Vec<&Task> = self
            .tasks
            .iter()
            .filter(|t| match &self.sprint_filter {
                SprintFilter::All => true,
                SprintFilter::ActiveOnly => {
                    if let Some(s) = matching_sprint {
                        t.sprint_id.as_deref() == Some(&s.id)
                    } else {
                        false
                    }
                }
                SprintFilter::PlannedOnly => {
                    let planned_ids: Vec<&str> = self
                        .sprints
                        .iter()
                        .filter(|s| s.status == "Planned")
                        .map(|s| s.id.as_str())
                        .collect();
                    t.sprint_id.as_deref().map(|id| planned_ids.contains(&id)).unwrap_or(false)
                }
                SprintFilter::Specific(sid) => t.sprint_id.as_deref() == Some(sid.as_str()),
                SprintFilter::BacklogOnly => t.sprint_id.is_none() || t.sprint_id.as_deref() == Some(""),
            })
            .collect();

        let total = tasks_in_scope.len();
        let completed = tasks_in_scope.iter().filter(|t| t.completed).count();
        let percentage = if total > 0 { (completed * 100) / total } else { 0 };

        (matching_sprint, filter_title, total, completed, percentage)
    }
}

fn filter_vault_entries(entries: &[VaultEntry], query: &str) -> Vec<VaultEntry> {
    if query.trim().is_empty() {
        return entries.to_vec();
    }
    let q = query.to_lowercase();
    let mut out = Vec::new();

    for entry in entries {
        if entry.is_directory {
            let filtered_children = entry
                .children
                .as_ref()
                .map(|children| filter_vault_entries(children, query))
                .unwrap_or_default();

            let matches_self = entry.name.to_lowercase().contains(&q);
            if matches_self || !filtered_children.is_empty() {
                let mut cloned = entry.clone();
                cloned.children = if matches_self && filtered_children.is_empty() {
                    entry.children.clone()
                } else {
                    Some(filtered_children)
                };
                out.push(cloned);
            }
        } else if entry.name.to_lowercase().contains(&q) {
            out.push(entry.clone());
        }
    }

    out
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
