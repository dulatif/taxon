use crate::tui::app::{App, Pane, Tab};
use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

pub fn handle_key(app: &mut App, key: KeyEvent) {
    // 1. Modals capture keys first
    if app.help_modal_open {
        if matches!(key.code, KeyCode::Esc | KeyCode::Char('?') | KeyCode::Enter | KeyCode::Char('q')) {
            app.help_modal_open = false;
        }
        return;
    }

    if app.status_modal_open {
        match key.code {
            KeyCode::Esc | KeyCode::Char('q') => {
                app.status_modal_open = false;
            }
            KeyCode::Up | KeyCode::Char('k') => {
                if app.status_modal_selected > 0 {
                    app.status_modal_selected -= 1;
                } else {
                    app.status_modal_selected = 3;
                }
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if app.status_modal_selected < 3 {
                    app.status_modal_selected += 1;
                } else {
                    app.status_modal_selected = 0;
                }
            }
            KeyCode::Enter => {
                let statuses = ["To Do", "In Progress", "Need to Test", "Done"];
                let chosen = statuses[app.status_modal_selected];
                app.set_current_task_status(chosen);
                app.status_modal_open = false;
            }
            _ => {}
        }
        return;
    }

    if app.sprint_modal_open {
        let max_options = 4 + app.sprints.len();
        match key.code {
            KeyCode::Esc | KeyCode::Char('q') => {
                app.sprint_modal_open = false;
            }
            KeyCode::Up | KeyCode::Char('k') => {
                if app.sprint_modal_selected > 0 {
                    app.sprint_modal_selected -= 1;
                } else if max_options > 0 {
                    app.sprint_modal_selected = max_options - 1;
                }
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if app.sprint_modal_selected + 1 < max_options {
                    app.sprint_modal_selected += 1;
                } else {
                    app.sprint_modal_selected = 0;
                }
            }
            KeyCode::Enter => {
                match app.sprint_modal_selected {
                    0 => app.sprint_filter = crate::tui::app::SprintFilter::All,
                    1 => app.sprint_filter = crate::tui::app::SprintFilter::ActiveOnly,
                    2 => app.sprint_filter = crate::tui::app::SprintFilter::PlannedOnly,
                    3 => app.sprint_filter = crate::tui::app::SprintFilter::BacklogOnly,
                    idx => {
                        let sprint_idx = idx - 4;
                        if let Some(s) = app.sprints.get(sprint_idx) {
                            app.sprint_filter = crate::tui::app::SprintFilter::Specific(s.id.clone());
                        }
                    }
                }
                app.sprint_modal_open = false;
            }
            _ => {}
        }
        return;
    }

    if app.project_modal_open {
        let max_items = app.get_filtered_projects().len();

        match key.code {
            KeyCode::Esc => {
                if !app.project_search_query.is_empty() {
                    app.project_search_query.clear();
                    app.project_modal_selected = 0;
                } else {
                    app.project_modal_open = false;
                }
            }
            KeyCode::Up => {
                if app.project_modal_selected > 0 {
                    app.project_modal_selected -= 1;
                } else if max_items > 0 {
                    app.project_modal_selected = max_items - 1;
                }
            }
            KeyCode::Down => {
                if max_items > 0 {
                    if app.project_modal_selected + 1 < max_items {
                        app.project_modal_selected += 1;
                    } else {
                        app.project_modal_selected = 0;
                    }
                }
            }
            KeyCode::Enter => {
                let chosen = {
                    let filtered = app.get_filtered_projects();
                    filtered
                        .get(app.project_modal_selected)
                        .map(|(_, p)| (p.id.clone(), p.vault_path.clone()))
                };
                if let Some((pid, vp)) = chosen {
                    app.active_project_id = Some(pid);
                    app.active_vault_path = vp.map(std::path::PathBuf::from);
                    app.refresh_project_state();
                }
                app.project_search_query.clear();
                app.project_modal_open = false;
            }
            KeyCode::Backspace => {
                app.project_search_query.pop();
                app.project_modal_selected = 0;
            }
            KeyCode::Char(c) => {
                app.project_search_query.push(c);
                app.project_modal_selected = 0;
            }
            _ => {}
        }
        return;
    }

    // 2. Vault Search Mode captures keystrokes when active
    if app.active_tab == Tab::Vault && app.vault_search_active {
        match key.code {
            KeyCode::Esc => {
                app.vault_search_active = false;
                app.vault_search_query.clear();
                app.reload_vault();
                return;
            }
            KeyCode::Enter => {
                app.vault_search_active = false;
                app.load_current_doc();
                return;
            }
            KeyCode::Up => {
                if app.selected_vault_index > 0 {
                    app.selected_vault_index -= 1;
                    app.load_current_doc();
                }
                return;
            }
            KeyCode::Down => {
                if app.selected_vault_index + 1 < app.flattened_vault.len() {
                    app.selected_vault_index += 1;
                    app.load_current_doc();
                }
                return;
            }
            KeyCode::Backspace => {
                app.vault_search_query.pop();
                app.selected_vault_index = 0;
                app.reload_vault();
                return;
            }
            KeyCode::Char(c) => {
                app.vault_search_query.push(c);
                app.selected_vault_index = 0;
                app.reload_vault();
                return;
            }
            _ => return,
        }
    }

    // 3. Global Shortcuts (Any tab)
    if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c') {
        app.should_quit = true;
        return;
    }
    if key.modifiers.contains(KeyModifiers::CONTROL) && (key.code == KeyCode::Char('p') || key.code == KeyCode::Char('P')) {
        app.project_modal_open = true;
        return;
    }
    if key.modifiers.contains(KeyModifiers::ALT) && (key.code == KeyCode::Char('e') || key.code == KeyCode::Char('E')) {
        app.force_export();
        return;
    }
    if key.modifiers.contains(KeyModifiers::ALT) && (key.code == KeyCode::Char('i') || key.code == KeyCode::Char('I')) {
        app.force_import();
        return;
    }
    if key.modifiers.contains(KeyModifiers::ALT) && (key.code == KeyCode::Char('s') || key.code == KeyCode::Char('S')) {
        app.cycle_sprint_filter();
        return;
    }
    if key.modifiers.contains(KeyModifiers::ALT) && (key.code == KeyCode::Char('f') || key.code == KeyCode::Char('F')) {
        app.cycle_status_filter();
        return;
    }

    match key.code {
        KeyCode::Char('q') => {
            app.should_quit = true;
            return;
        }
        KeyCode::Char('?') => {
            app.help_modal_open = true;
            return;
        }
        KeyCode::Char('p') | KeyCode::Char('P') => {
            app.project_modal_open = true;
            return;
        }
        KeyCode::Char('[') => {
            app.cycle_tab_backward();
            return;
        }
        KeyCode::Char(']') => {
            app.cycle_tab_forward();
            return;
        }
        KeyCode::Char('1') => {
            app.active_tab = Tab::Tasks;
            return;
        }
        KeyCode::Char('2') => {
            app.active_tab = Tab::Vault;
            return;
        }
        KeyCode::Char('3') => {
            app.active_tab = Tab::Sync;
            return;
        }
        KeyCode::Char('4') => {
            app.active_tab = Tab::Pomodoro;
            return;
        }
        KeyCode::Tab => {
            app.focused_pane = match app.focused_pane {
                Pane::Left => Pane::Right,
                Pane::Right => Pane::Left,
            };
            return;
        }
        _ => {}
    }

    // 3. Tab-Specific Handlers
    match app.active_tab {
        Tab::Tasks => handle_tasks_tab(app, key),
        Tab::Vault => handle_vault_tab(app, key),
        Tab::Sync => handle_sync_tab(app, key),
        Tab::Pomodoro => handle_pomodoro_tab(app, key),
    }
}

fn handle_tasks_tab(app: &mut App, key: KeyEvent) {
    let filtered_tasks = app.get_filtered_tasks();
    let task_indices: Vec<usize> = filtered_tasks.iter().map(|(idx, _)| *idx).collect();

    match key.code {
        KeyCode::Up | KeyCode::Char('k') => {
            if !task_indices.is_empty() {
                if let Some(pos) = task_indices.iter().position(|&idx| idx == app.selected_task_index) {
                    if pos > 0 {
                        app.selected_task_index = task_indices[pos - 1];
                    } else {
                        app.selected_task_index = *task_indices.last().unwrap();
                    }
                } else {
                    app.selected_task_index = task_indices[0];
                }
            }
        }
        KeyCode::Down | KeyCode::Char('j') => {
            if !task_indices.is_empty() {
                if let Some(pos) = task_indices.iter().position(|&idx| idx == app.selected_task_index) {
                    if pos + 1 < task_indices.len() {
                        app.selected_task_index = task_indices[pos + 1];
                    } else {
                        app.selected_task_index = task_indices[0];
                    }
                } else {
                    app.selected_task_index = task_indices[0];
                }
            }
        }
        KeyCode::Char('S') => {
            app.sprint_modal_open = true;
            app.sprint_modal_selected = 0;
        }
        KeyCode::Char('s') => {
            app.cycle_sprint_filter();
        }
        KeyCode::Char('f') => {
            app.cycle_status_filter();
        }
        KeyCode::Char('g') | KeyCode::Char('v') => {
            app.cycle_task_grouping();
        }
        KeyCode::Char(' ') => {
            app.toggle_current_task();
        }
        KeyCode::Char('F') => {
            app.start_focus_on_task(app.selected_task_index);
        }
        KeyCode::Char('m') => {
            if !app.tasks.is_empty() {
                app.status_modal_open = true;
                if let Some(t) = app.tasks.get(app.selected_task_index) {
                    app.status_modal_selected = match t.status.as_str() {
                        "To Do" => 0,
                        "In Progress" => 1,
                        "Need to Test" => 2,
                        "Done" => 3,
                        _ => 0,
                    };
                }
            }
        }
        _ => {}
    }
}

fn handle_vault_tab(app: &mut App, key: KeyEvent) {
    match key.code {
        KeyCode::Char('/') => {
            app.vault_search_active = true;
        }
        KeyCode::Char('f') if key.modifiers.contains(KeyModifiers::CONTROL) => {
            app.vault_search_active = true;
        }
        KeyCode::Esc => {
            if !app.vault_search_query.is_empty() {
                app.vault_search_query.clear();
                app.reload_vault();
            }
        }
        KeyCode::Up | KeyCode::Char('k') => {
            if app.focused_pane == Pane::Right {
                if app.doc_scroll > 0 {
                    app.doc_scroll -= 1;
                }
            } else if app.selected_vault_index > 0 {
                app.selected_vault_index -= 1;
                app.load_current_doc();
            }
        }
        KeyCode::Down | KeyCode::Char('j') => {
            if app.focused_pane == Pane::Right {
                app.doc_scroll += 1;
            } else if app.selected_vault_index + 1 < app.flattened_vault.len() {
                app.selected_vault_index += 1;
                app.load_current_doc();
            }
        }
        KeyCode::Enter => {
            app.load_current_doc();
        }
        KeyCode::Char('e') => {
            if let Some(item) = app.flattened_vault.get(app.selected_vault_index) {
                if !item.is_directory {
                    app.suspend_for_editor = Some(item.path.clone());
                }
            }
        }
        KeyCode::Backspace => {
            if !app.vault_search_query.is_empty() {
                app.vault_search_active = true;
                app.vault_search_query.pop();
                app.selected_vault_index = 0;
                app.reload_vault();
            }
        }
        KeyCode::Char(c) => {
            // Typing any non-shortcut key automatically focuses and searches the vault
            app.vault_search_active = true;
            app.vault_search_query.push(c);
            app.selected_vault_index = 0;
            app.reload_vault();
        }
        _ => {}
    }
}

fn handle_sync_tab(app: &mut App, key: KeyEvent) {
    match key.code {
        KeyCode::Up | KeyCode::Char('k') => {
            if app.selected_diff_index > 0 {
                app.selected_diff_index -= 1;
            }
        }
        KeyCode::Down | KeyCode::Char('j') => {
            let max_items = app.sync_diff.as_ref().map_or(0, |d| d.items.len());
            if max_items > 0 && app.selected_diff_index + 1 < max_items {
                app.selected_diff_index += 1;
            }
        }
        KeyCode::Char('y') | KeyCode::Enter => {
            app.apply_sync();
        }
        KeyCode::Char('e') => {
            app.force_export();
        }
        KeyCode::Char('i') => {
            app.force_import();
        }
        KeyCode::Char('s') => {
            app.reload_sync();
            app.sync_status_message = Some("Diff refreshed.".to_string());
        }
        _ => {}
    }
}

fn handle_pomodoro_tab(app: &mut App, key: KeyEvent) {
    match key.code {
        KeyCode::Char(' ') => {
            app.pomodoro.toggle();
        }
        KeyCode::Char('r') | KeyCode::Char('R') => {
            app.pomodoro.reset();
        }
        KeyCode::Char('s') | KeyCode::Char('n') => {
            app.pomodoro.skip();
        }
        KeyCode::Char('w') | KeyCode::Char('W') => {
            app.pomodoro.switch_phase(crate::tui::app::PomodoroPhase::Work);
        }
        KeyCode::Char('b') | KeyCode::Char('B') => {
            app.pomodoro.switch_phase(crate::tui::app::PomodoroPhase::ShortBreak);
        }
        KeyCode::Char('l') => {
            app.pomodoro.switch_phase(crate::tui::app::PomodoroPhase::LongBreak);
        }
        KeyCode::Char('u') | KeyCode::Char('U') => {
            app.pomodoro.unlink_task();
            app.sync_status_message = Some("Unlinked task from focus timer.".to_string());
        }
        KeyCode::Char('L') => {
            if let Some(task) = app.tasks.get(app.selected_task_index) {
                app.pomodoro.link_task(task.id.clone(), task.title.clone());
                app.sync_status_message = Some(format!("Linked task '{}' to focus timer.", task.title));
            }
        }
        KeyCode::Char('c') => {
            if let Some(ref tid) = app.pomodoro.active_task_id {
                let tid_clone = tid.clone();
                let _ = app.db.update_task_status(&tid_clone, "Done");
                app.reload_tasks();
                app.sync_status_message = Some("Marked focus task as Done!".to_string());
            }
        }
        KeyCode::Char('m') => {
            if let Some(ref tid) = app.pomodoro.active_task_id {
                if let Some(pos) = app.tasks.iter().position(|t| &t.id == tid) {
                    app.selected_task_index = pos;
                    app.status_modal_open = true;
                    if let Some(t) = app.tasks.get(pos) {
                        app.status_modal_selected = match t.status.as_str() {
                            "To Do" => 0,
                            "In Progress" => 1,
                            "Need to Test" => 2,
                            "Done" => 3,
                            _ => 0,
                        };
                    }
                }
            }
        }
        KeyCode::Char('+') | KeyCode::Char('=') => {
            app.pomodoro.adjust_duration(1);
        }
        KeyCode::Char('-') | KeyCode::Char('_') => {
            app.pomodoro.adjust_duration(-1);
        }
        _ => {}
    }
}
