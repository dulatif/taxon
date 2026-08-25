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

    if app.project_modal_open {
        match key.code {
            KeyCode::Esc | KeyCode::Char('q') => {
                app.project_modal_open = false;
            }
            KeyCode::Up | KeyCode::Char('k') => {
                if app.project_modal_selected > 0 {
                    app.project_modal_selected -= 1;
                } else if !app.projects.is_empty() {
                    app.project_modal_selected = app.projects.len() - 1;
                }
            }
            KeyCode::Down | KeyCode::Char('j') => {
                if app.project_modal_selected + 1 < app.projects.len() {
                    app.project_modal_selected += 1;
                } else {
                    app.project_modal_selected = 0;
                }
            }
            KeyCode::Enter => {
                if let Some(p) = app.projects.get(app.project_modal_selected) {
                    app.active_project_id = Some(p.id.clone());
                    app.active_vault_path = p.vault_path.as_ref().map(std::path::PathBuf::from);
                    app.refresh_project_state();
                }
                app.project_modal_open = false;
            }
            _ => {}
        }
        return;
    }

    // 2. Global Shortcuts
    if key.modifiers.contains(KeyModifiers::CONTROL) && key.code == KeyCode::Char('c') {
        app.should_quit = true;
        return;
    }
    if key.modifiers.contains(KeyModifiers::CONTROL) && (key.code == KeyCode::Char('p') || key.code == KeyCode::Char('P')) {
        app.project_modal_open = true;
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
        KeyCode::Char('P') | KeyCode::Char('p') if key.modifiers.contains(KeyModifiers::SHIFT) => {
            app.project_modal_open = true;
            return;
        }
        KeyCode::Char('P') => {
            app.project_modal_open = true;
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
    }
}

fn handle_tasks_tab(app: &mut App, key: KeyEvent) {
    let display_items = app.get_display_task_items();
    let task_indices: Vec<usize> = display_items
        .iter()
        .filter_map(|item| match item {
            crate::tui::app::DisplayTaskItem::Task { task_index } => Some(*task_index),
            _ => None,
        })
        .collect();

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
        KeyCode::Char('g') | KeyCode::Char('v') => {
            app.cycle_task_grouping();
        }
        KeyCode::Char(' ') => {
            app.toggle_current_task();
        }
        KeyCode::Char('p') => {
            app.cycle_current_task_priority();
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
        KeyCode::Char('p') => {
            app.project_modal_open = true;
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
        KeyCode::Char('p') => {
            app.project_modal_open = true;
        }
        _ => {}
    }
}
