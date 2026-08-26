use crate::tui::app::{App, Pane, StatusFilter, Tab};
use ratatui::{
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{
        Block, BorderType, Borders, Clear, List, ListItem, Paragraph, Row, Table, Tabs, Wrap,
    },
    Frame,
};

pub fn render(f: &mut Frame, app: &mut App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(3), // Header & Tabs
            Constraint::Min(0),    // Main Content (2-column split)
            Constraint::Length(3), // Footer / Keybindings
        ])
        .split(f.area());

    render_header(f, app, chunks[0]);
    render_body(f, app, chunks[1]);
    render_footer(f, app, chunks[2]);

    if app.status_modal_open {
        render_status_modal(f, app);
    }
    if app.sprint_modal_open {
        render_sprint_modal(f, app);
    }
    if app.project_modal_open {
        render_project_modal(f, app);
    }
    if app.help_modal_open {
        render_help_modal(f);
    }
}

fn render_header(f: &mut Frame, app: &App, area: Rect) {
    let header_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Min(40), Constraint::Length(30)])
        .split(area);

    let tab_titles = vec!["[1] Tasks & Sprints", "[2] Vault Browser", "[3] Sync Center"];
    let tab_index = match app.active_tab {
        Tab::Tasks => 0,
        Tab::Vault => 1,
        Tab::Sync => 2,
    };

    let tabs = Tabs::new(tab_titles)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .title(" 🌿 Taxon TUI ")
                .border_style(Style::default().fg(Color::Cyan)),
        )
        .select(tab_index)
        .style(Style::default().fg(Color::DarkGray))
        .highlight_style(
            Style::default()
                .fg(Color::Yellow)
                .add_modifier(Modifier::BOLD),
        );
    f.render_widget(tabs, header_chunks[0]);

    let project_badge = Paragraph::new(format!(" Project: {} [P] ", app.active_project_name))
        .alignment(Alignment::Right)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_style(Style::default().fg(Color::Blue)),
        )
        .style(
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        );
    f.render_widget(project_badge, header_chunks[1]);
}

fn render_body(f: &mut Frame, app: &App, area: Rect) {
    let columns = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(35), Constraint::Percentage(65)])
        .split(area);

    match app.active_tab {
        Tab::Tasks => {
            render_tasks_left(f, app, columns[0]);
            render_tasks_right(f, app, columns[1]);
        }
        Tab::Vault => {
            render_vault_left(f, app, columns[0]);
            render_vault_right(f, app, columns[1]);
        }
        Tab::Sync => {
            render_sync_left(f, app, columns[0]);
            render_sync_right(f, app, columns[1]);
        }
    }
}

// -------------------------------------------------------------
// Tab 1: Tasks & Sprints View
// -------------------------------------------------------------

fn format_days_remaining(end_date_str: &str) -> Option<(String, bool)> {
    if let Ok(end_date) = chrono::NaiveDate::parse_from_str(end_date_str, "%Y-%m-%d") {
        let today = chrono::Local::now().date_naive();
        let diff = (end_date - today).num_days();
        if diff < 0 {
            Some((format!("Overdue by {}d", diff.abs()), true))
        } else if diff == 0 {
            Some(("Ends today".to_string(), false))
        } else {
            Some((format!("{}d remaining", diff), false))
        }
    } else {
        None
    }
}

fn render_tasks_left(f: &mut Frame, app: &App, area: Rect) {
    let is_focused = app.focused_pane == Pane::Left;
    let border_style = if is_focused {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default().fg(Color::DarkGray)
    };

    let (sprint_opt, filter_title, total_scope_tasks, completed_scope_tasks, percentage) =
        app.get_sprint_banner_info();

    let banner_height = if sprint_opt.and_then(|s| s.goal.as_ref()).is_some() {
        6
    } else {
        5
    };

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(banner_height), Constraint::Min(0)])
        .split(area);

    // 1. Top Sprint Information & Progress Card
    let mut banner_lines = Vec::new();

    let mut line1_spans = Vec::new();
    if let Some(sprint) = sprint_opt {
        line1_spans.push(Span::styled(
            format!("🏃 {}  ", sprint.name),
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        ));

        let status_color = match sprint.status.as_str() {
            "Active" => Color::Green,
            "Planned" => Color::Blue,
            "Completed" => Color::DarkGray,
            _ => Color::White,
        };

        line1_spans.push(Span::styled(
            format!("[{}] ", sprint.status.to_uppercase()),
            Style::default()
                .fg(status_color)
                .add_modifier(Modifier::BOLD),
        ));

        line1_spans.push(Span::raw(" 📅 "));
        line1_spans.push(Span::styled(
            format!("{} → {}", sprint.start_date, sprint.end_date),
            Style::default().fg(Color::DarkGray),
        ));

        if let Some((rem_text, is_overdue)) = format_days_remaining(&sprint.end_date) {
            line1_spans.push(Span::raw("  "));
            let rem_style = if is_overdue {
                Style::default()
                    .fg(Color::Red)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(Color::LightYellow)
            };
            line1_spans.push(Span::styled(format!("({})", rem_text), rem_style));
        }
    } else {
        line1_spans.push(Span::styled(
            filter_title.clone(),
            Style::default()
                .fg(Color::Yellow)
                .add_modifier(Modifier::BOLD),
        ));
    }
    banner_lines.push(Line::from(line1_spans));

    if let Some(sprint) = sprint_opt {
        if let Some(ref goal) = sprint.goal {
            banner_lines.push(Line::from(vec![
                Span::styled("🎯 Goal: ", Style::default().fg(Color::Yellow)),
                Span::styled(goal.clone(), Style::default().fg(Color::White)),
            ]));
        }
    }

    // Progress Bar Line
    let bar_width = 24;
    let filled_len = (percentage * bar_width) / 100;
    let empty_len = bar_width.saturating_sub(filled_len);
    let bar_str = format!("[{}{}]", "■".repeat(filled_len), "·".repeat(empty_len));

    banner_lines.push(Line::from(vec![
        Span::styled("Progress: ", Style::default().fg(Color::DarkGray)),
        Span::styled(bar_str, Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)),
        Span::styled(
            format!("  {}% ", percentage),
            Style::default()
                .fg(Color::LightGreen)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled(
            format!("({}/{} Tasks)", completed_scope_tasks, total_scope_tasks),
            Style::default().fg(Color::DarkGray),
        ),
    ]));

    let banner_block = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Cyan))
        .title(" 🏃 Sprint Overview [s: Cycle • S: Switch] ");

    let banner_widget = Paragraph::new(banner_lines).block(banner_block);
    f.render_widget(banner_widget, chunks[0]);

    // 2. Filtered Tasks Flat List
    let filtered_tasks = app.get_filtered_tasks();

    let items: Vec<ListItem> = filtered_tasks
        .iter()
        .map(|(idx, task)| {
            let is_selected = *idx == app.selected_task_index;
            let check_mark = if task.completed { "[✓]" } else { "[ ]" };
            let check_color = if task.completed {
                Color::Green
            } else {
                Color::DarkGray
            };

            let priority_color = match task.priority.as_str() {
                "Critical" => Color::Red,
                "High" => Color::LightRed,
                "Medium" => Color::Yellow,
                "Low" => Color::Blue,
                _ => Color::White,
            };

            let p_badge = format!("[{}]", &task.priority[..task.priority.len().min(4)]);

            let (status_badge, status_color) = match task.status.as_str() {
                "To Do" => ("To Do", Color::DarkGray),
                "In Progress" => ("In Prog", Color::Cyan),
                "Need to Test" => ("Test", Color::LightYellow),
                "Done" => ("Done", Color::Green),
                s => (s, Color::White),
            };

            let mut spans = vec![
                Span::raw(" "),
                Span::styled(format!("{} ", check_mark), Style::default().fg(check_color)),
                Span::styled(format!("{} ", p_badge), Style::default().fg(priority_color)),
                Span::styled(format!("[{}] ", status_badge), Style::default().fg(status_color)),
                Span::styled(
                    task.title.clone(),
                    if task.completed {
                        Style::default()
                            .fg(Color::DarkGray)
                            .add_modifier(Modifier::CROSSED_OUT)
                    } else if is_selected {
                        Style::default()
                            .fg(Color::White)
                            .add_modifier(Modifier::BOLD)
                    } else {
                        Style::default().fg(Color::White)
                    },
                ),
            ];

            if let Some(ref mg) = task.module_group {
                spans.push(Span::styled(
                    format!(" ({})", mg),
                    Style::default().fg(Color::Magenta),
                ));
            }

            let style = if is_selected {
                Style::default().bg(Color::Rgb(40, 50, 75))
            } else {
                Style::default()
            };

            ListItem::new(Line::from(spans)).style(style)
        })
        .collect();

    let status_label = match app.status_filter {
        StatusFilter::All => "All",
        StatusFilter::InProgress => "In Prog",
        StatusFilter::ToDo => "To Do",
        StatusFilter::NeedToTest => "Test",
        StatusFilter::Done => "Done",
    };

    let list = List::new(items)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_type(if is_focused {
                    BorderType::Thick
                } else {
                    BorderType::Plain
                })
                .border_style(border_style)
                .title(format!(
                    " Tasks ({}) • Filter: {} [f] ",
                    filtered_tasks.len(),
                    status_label
                )),
        );

    f.render_widget(list, chunks[1]);
}

fn render_tasks_right(f: &mut Frame, app: &App, area: Rect) {
    let is_focused = app.focused_pane == Pane::Right;
    let border_style = if is_focused {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default().fg(Color::DarkGray)
    };

    if let Some(task) = app.tasks.get(app.selected_task_index) {
        let mut lines = Vec::new();

        lines.push(Line::from(vec![
            Span::styled(
                "Title: ",
                Style::default()
                    .fg(Color::Cyan)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(
                &task.title,
                Style::default()
                    .fg(Color::White)
                    .add_modifier(Modifier::BOLD),
            ),
        ]));

        let priority_color = match task.priority.as_str() {
            "Critical" => Color::Red,
            "High" => Color::LightRed,
            "Medium" => Color::Yellow,
            "Low" => Color::Blue,
            _ => Color::White,
        };

        lines.push(Line::from(vec![
            Span::styled("ID: ", Style::default().fg(Color::DarkGray)),
            Span::raw(format!("{}  |  ", task.id)),
            Span::styled("Status: ", Style::default().fg(Color::Cyan)),
            Span::styled(
                format!("{}  |  ", task.status),
                Style::default()
                    .fg(Color::Yellow)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled("Priority: ", Style::default().fg(Color::Cyan)),
            Span::styled(&task.priority, Style::default().fg(priority_color)),
        ]));

        if let Some(ref dd) = task.due_date {
            lines.push(Line::from(vec![
                Span::styled("Due Date: ", Style::default().fg(Color::Cyan)),
                Span::raw(dd),
            ]));
        }

        if let Some(ref mg) = task.module_group {
            lines.push(Line::from(vec![
                Span::styled("Module Group: ", Style::default().fg(Color::Cyan)),
                Span::styled(mg, Style::default().fg(Color::Magenta)),
            ]));
        }

        if let Some(ref deps) = task.depends_on {
            if !deps.is_empty() {
                lines.push(Line::from(vec![
                    Span::styled("Depends On: ", Style::default().fg(Color::Cyan)),
                    Span::raw(deps.join(", ")),
                ]));
            }
        }

        if let Some(ref labels) = task.labels {
            if !labels.is_empty() {
                lines.push(Line::from(vec![
                    Span::styled("Labels: ", Style::default().fg(Color::Cyan)),
                    Span::styled(labels.join(", "), Style::default().fg(Color::Green)),
                ]));
            }
        }

        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            "── Description ────────────────────────────────────",
            Style::default().fg(Color::DarkGray),
        )));

        if let Some(ref desc) = task.description {
            for l in desc.lines() {
                lines.push(Line::from(l));
            }
        } else {
            lines.push(Line::from(Span::styled(
                "*No description provided*",
                Style::default().fg(Color::DarkGray),
            )));
        }

        lines.push(Line::from(""));
        lines.push(Line::from(Span::styled(
            "── Subtasks ───────────────────────────────────────",
            Style::default().fg(Color::DarkGray),
        )));

        if let Some(ref subtasks) = task.subtasks {
            let done_count = subtasks.iter().filter(|s| s.completed).count();
            lines.push(Line::from(Span::styled(
                format!("Progress: {}/{} subtasks completed", done_count, subtasks.len()),
                Style::default().fg(Color::Cyan),
            )));
            for st in subtasks {
                let check = if st.completed { "[✓]" } else { "[ ]" };
                let color = if st.completed {
                    Color::Green
                } else {
                    Color::DarkGray
                };
                lines.push(Line::from(vec![
                    Span::styled(format!("  {} ", check), Style::default().fg(color)),
                    Span::raw(&st.title),
                ]));
            }
        } else {
            lines.push(Line::from(Span::styled(
                "*No subtasks*",
                Style::default().fg(Color::DarkGray),
            )));
        }

        let paragraph = Paragraph::new(lines)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .border_type(if is_focused {
                        BorderType::Thick
                    } else {
                        BorderType::Plain
                    })
                    .border_style(border_style)
                    .title(" Task Details Inspector "),
            )
            .wrap(Wrap { trim: false });
        f.render_widget(paragraph, area);
    } else {
        let empty = Paragraph::new("No task selected")
            .alignment(Alignment::Center)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .border_style(border_style)
                    .title(" Task Details Inspector "),
            );
        f.render_widget(empty, area);
    }
}

// -------------------------------------------------------------
// Tab 2: Vault Browser View
// -------------------------------------------------------------

fn render_vault_left(f: &mut Frame, app: &App, area: Rect) {
    let is_focused = app.focused_pane == Pane::Left;
    let border_style = if is_focused {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default().fg(Color::DarkGray)
    };

    let (search_area, list_area) = if app.vault_search_active || !app.vault_search_query.is_empty() {
        let chunks = Layout::default()
            .direction(Direction::Vertical)
            .constraints([Constraint::Length(3), Constraint::Min(0)])
            .split(area);
        (Some(chunks[0]), chunks[1])
    } else {
        (None, area)
    };

    if let Some(sa) = search_area {
        let cursor_marker = if app.vault_search_active { "▋" } else { "" };
        let search_text = format!(" 🔍 Search: {}{} ", app.vault_search_query, cursor_marker);
        let search_p = Paragraph::new(search_text)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .border_style(if app.vault_search_active {
                        Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)
                    } else {
                        Style::default().fg(Color::DarkGray)
                    })
                    .title(" Filter Vault [/] [Esc clear] "),
            )
            .style(Style::default().fg(Color::Yellow));
        f.render_widget(search_p, sa);
    }

    let items: Vec<ListItem> = app
        .flattened_vault
        .iter()
        .enumerate()
        .map(|(idx, item)| {
            let is_selected = idx == app.selected_vault_index;
            let indent = "  ".repeat(item.depth);
            let icon = if item.is_directory { "📁 " } else { "📄 " };
            let color = if item.is_directory {
                Color::Blue
            } else {
                Color::White
            };

            let spans = vec![
                Span::raw(indent),
                Span::raw(icon),
                Span::styled(
                    &item.name,
                    if is_selected {
                        Style::default()
                            .fg(Color::Yellow)
                            .add_modifier(Modifier::BOLD)
                    } else {
                        Style::default().fg(color)
                    },
                ),
            ];

            let style = if is_selected {
                Style::default().bg(Color::Rgb(30, 40, 60))
            } else {
                Style::default()
            };

            ListItem::new(Line::from(spans)).style(style)
        })
        .collect();

    let search_indicator = if !app.vault_search_query.is_empty() {
        format!(" (Filtered: \"{}\")", app.vault_search_query)
    } else {
        String::new()
    };

    let list = List::new(items)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_type(if is_focused {
                    BorderType::Thick
                } else {
                    BorderType::Plain
                })
                .border_style(border_style)
                .title(format!(" Obsidian Vault ({}){} [/ Search] ", app.flattened_vault.len(), search_indicator)),
        )
        .highlight_symbol("▶ ");

    f.render_widget(list, list_area);
}

fn render_vault_right(f: &mut Frame, app: &App, area: Rect) {
    let is_focused = app.focused_pane == Pane::Right;
    let border_style = if is_focused {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default().fg(Color::DarkGray)
    };

    let selected_item = app.flattened_vault.get(app.selected_vault_index);
    let title = if let Some(item) = selected_item {
        format!(" Document: {} [Press 'e' to open in $EDITOR] ", item.name)
    } else {
        " Document Viewer ".to_string()
    };

    if let Some(ref content) = app.doc_content {
        let lines: Vec<Line> = content
            .lines()
            .skip(app.doc_scroll)
            .map(|l| {
                if l.starts_with("# ") {
                    Line::from(Span::styled(
                        l,
                        Style::default()
                            .fg(Color::Cyan)
                            .add_modifier(Modifier::BOLD),
                    ))
                } else if l.starts_with("## ") {
                    Line::from(Span::styled(
                        l,
                        Style::default()
                            .fg(Color::LightCyan)
                            .add_modifier(Modifier::BOLD),
                    ))
                } else if l.starts_with("### ") {
                    Line::from(Span::styled(l, Style::default().fg(Color::Yellow)))
                } else if l.starts_with("- ") || l.starts_with("* ") {
                    Line::from(Span::styled(l, Style::default().fg(Color::Green)))
                } else if l.starts_with("```") {
                    Line::from(Span::styled(l, Style::default().fg(Color::DarkGray)))
                } else {
                    Line::from(Span::raw(l))
                }
            })
            .collect();

        let paragraph = Paragraph::new(lines)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .border_type(if is_focused {
                        BorderType::Thick
                    } else {
                        BorderType::Plain
                    })
                    .border_style(border_style)
                    .title(title),
            )
            .wrap(Wrap { trim: false });
        f.render_widget(paragraph, area);
    } else {
        let empty = Paragraph::new("Select a markdown document on the left to preview contents.")
            .alignment(Alignment::Center)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .border_style(border_style)
                    .title(title),
            );
        f.render_widget(empty, area);
    }
}

// -------------------------------------------------------------
// Tab 3: Sync Center View
// -------------------------------------------------------------

fn render_sync_left(f: &mut Frame, app: &App, area: Rect) {
    let is_focused = app.focused_pane == Pane::Left;
    let border_style = if is_focused {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default().fg(Color::DarkGray)
    };

    if let Some(ref diff) = app.sync_diff {
        let rows: Vec<Row> = diff
            .items
            .iter()
            .enumerate()
            .map(|(idx, item)| {
                let is_selected = idx == app.selected_diff_index;
                let (kind_str, kind_color) = match item.kind {
                    taxon_core::models::DiffKind::Added => ("[+] Added", Color::Green),
                    taxon_core::models::DiffKind::Modified => ("[~] Modified", Color::Yellow),
                    taxon_core::models::DiffKind::Deleted => ("[-] Deleted", Color::Red),
                    taxon_core::models::DiffKind::Conflict => ("[!] Conflict", Color::Magenta),
                };

                let style = if is_selected {
                    Style::default().bg(Color::Rgb(30, 40, 60))
                } else {
                    Style::default()
                };

                Row::new(vec![
                    Span::styled(kind_str, Style::default().fg(kind_color)),
                    Span::styled(&item.entity_type, Style::default().fg(Color::Cyan)),
                    Span::raw(&item.title),
                ])
                .style(style)
            })
            .collect();

        let table = Table::new(
            rows,
            [
                Constraint::Length(14),
                Constraint::Length(10),
                Constraint::Min(20),
            ],
        )
        .header(
            Row::new(vec!["Action", "Entity", "Title"]).style(
                Style::default()
                    .fg(Color::Yellow)
                    .add_modifier(Modifier::BOLD),
            ),
        )
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_type(if is_focused {
                    BorderType::Thick
                } else {
                    BorderType::Plain
                })
                .border_style(border_style)
                .title(format!(
                    " Diff Items ({}) | DB: {}t, {}s | Files: {}t, {}s ",
                    diff.items.len(),
                    diff.db_task_count,
                    diff.db_sprint_count,
                    diff.file_task_count,
                    diff.file_sprint_count
                )),
        );

        f.render_widget(table, area);
    } else {
        let empty = Paragraph::new("Press 's' to scan and compute synchronization diff.")
            .alignment(Alignment::Center)
            .block(
                Block::default()
                    .borders(Borders::ALL)
                    .border_style(border_style)
                    .title(" Sync Differences "),
            );
        f.render_widget(empty, area);
    }
}

fn render_sync_right(f: &mut Frame, app: &App, area: Rect) {
    let is_focused = app.focused_pane == Pane::Right;
    let border_style = if is_focused {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default().fg(Color::DarkGray)
    };

    let mut lines = Vec::new();

    lines.push(Line::from(vec![
        Span::styled(
            "Sync Actions:",
            Style::default()
                .fg(Color::Cyan)
                .add_modifier(Modifier::BOLD),
        ),
    ]));
    lines.push(Line::from("  • Press [y] or [Enter] : Apply two-way sync"));
    lines.push(Line::from("  • Press [e]             : Force Export (DB → .taxon files)"));
    lines.push(Line::from("  • Press [i]             : Force Import (.taxon files → DB)"));
    lines.push(Line::from("  • Press [s]             : Refresh diff calculation"));
    lines.push(Line::from(""));

    if let Some(ref diff) = app.sync_diff {
        if let Some(item) = diff.items.get(app.selected_diff_index) {
            lines.push(Line::from(Span::styled(
                "── Selected Change Breakdown ──────────────────────",
                Style::default().fg(Color::DarkGray),
            )));
            lines.push(Line::from(vec![
                Span::styled("Entity: ", Style::default().fg(Color::Cyan)),
                Span::raw(&item.entity_type),
            ]));
            lines.push(Line::from(vec![
                Span::styled("Title: ", Style::default().fg(Color::Cyan)),
                Span::styled(&item.title, Style::default().add_modifier(Modifier::BOLD)),
            ]));
            lines.push(Line::from(vec![
                Span::styled("Details: ", Style::default().fg(Color::Cyan)),
                Span::raw(&item.summary),
            ]));
        } else if diff.items.is_empty() {
            lines.push(Line::from(Span::styled(
                "✨ All tasks and sprints are synchronized with no differences.",
                Style::default().fg(Color::Green),
            )));
        }
    }

    if let Some(ref msg) = app.sync_status_message {
        lines.push(Line::from(""));
        lines.push(Line::from(vec![
            Span::styled("Last Action: ", Style::default().fg(Color::Yellow)),
            Span::raw(msg),
        ]));
    }

    let paragraph = Paragraph::new(lines)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_type(if is_focused {
                    BorderType::Thick
                } else {
                    BorderType::Plain
                })
                .border_style(border_style)
                .title(" Sync Inspector & Controls "),
        )
        .wrap(Wrap { trim: false });
    f.render_widget(paragraph, area);
}

// -------------------------------------------------------------
// Footer & Modals
// -------------------------------------------------------------

fn render_footer(f: &mut Frame, app: &App, area: Rect) {
    let keybindings = match app.active_tab {
        Tab::Tasks => "[Tab] Pane  [1-3]/[[/]] Tabs  [s/S] Sprint  [f] Status Filter  [Space] Done  [m] Status  [P] Projects  [?] Help  [q] Quit",
        Tab::Vault => if app.vault_search_active {
            "Typing Search...  [Enter] Confirm  [Esc] Clear & Exit Search"
        } else {
            "[Tab] Pane  [1-3]/[[/]] Tabs  [/] Search Vault  [Enter] Preview  [e] Edit ($EDITOR)  [P] Projects  [?] Help  [q] Quit"
        },
        Tab::Sync => "[Tab] Pane  [1-3]/[[/]] Tabs  [y] Apply Sync  [e] Export  [i] Import  [s] Refresh  [P] Projects  [?] Help  [q] Quit",
    };

    let msg = app
        .sync_status_message
        .as_deref()
        .unwrap_or(keybindings);

    let footer = Paragraph::new(format!("  {}  ", msg))
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_style(Style::default().fg(Color::DarkGray)),
        )
        .style(Style::default().fg(Color::Yellow));
    f.render_widget(footer, area);
}

fn render_status_modal(f: &mut Frame, app: &App) {
    let area = centered_rect(40, 30, f.area());
    f.render_widget(Clear, area);

    let statuses = ["To Do", "In Progress", "Need to Test", "Done"];
    let items: Vec<ListItem> = statuses
        .iter()
        .enumerate()
        .map(|(idx, s)| {
            let is_selected = idx == app.status_modal_selected;
            let style = if is_selected {
                Style::default()
                    .fg(Color::Yellow)
                    .bg(Color::Rgb(40, 50, 70))
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(Color::White)
            };
            ListItem::new(format!("  {}  ", s)).style(style)
        })
        .collect();

    let list = List::new(items).block(
        Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Yellow))
            .title(" Select Status [Enter / Esc] "),
    );
    f.render_widget(list, area);
}

fn render_sprint_modal(f: &mut Frame, app: &App) {
    let area = centered_rect(65, 50, f.area());
    f.render_widget(Clear, area);

    let mut options = vec![
        ("All Sprints (Full Project)".to_string(), "Show all tasks".to_string()),
        ("Active Sprint Only".to_string(), "Filter to active sprint tasks".to_string()),
        ("Planned Sprints Only".to_string(), "Filter to upcoming sprints".to_string()),
        ("Backlog (No Sprint)".to_string(), "Filter to unassigned backlog tasks".to_string()),
    ];

    for s in &app.sprints {
        let dates = format!("{} to {}", s.start_date, s.end_date);
        options.push((format!("🏃 {} [{}]", s.name, s.status), dates));
    }

    let items: Vec<ListItem> = options
        .iter()
        .enumerate()
        .map(|(idx, (title, sub))| {
            let is_selected = idx == app.sprint_modal_selected;

            let title_style = if is_selected {
                Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(Color::White)
            };

            let line1 = Line::from(Span::styled(format!("  {}  ", title), title_style));
            let line2 = Line::from(Span::styled(format!("    {}", sub), Style::default().fg(Color::DarkGray)));

            let bg_style = if is_selected {
                Style::default().bg(Color::Rgb(40, 50, 70))
            } else {
                Style::default()
            };

            ListItem::new(vec![line1, line2]).style(bg_style)
        })
        .collect();

    let list = List::new(items).block(
        Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Cyan))
            .title(" 🏃 Switch Sprint Filter [↑/↓ Navigate • Enter Select • Esc Cancel] "),
    );
    f.render_widget(list, area);
}

fn render_project_modal(f: &mut Frame, app: &App) {
    let area = centered_rect(70, 65, f.area());
    f.render_widget(Clear, area);

    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(3), Constraint::Min(0)])
        .split(area);

    // 1. Search Bar
    let search_text = format!(" 🔍 Search: {}▋ ", app.project_search_query);
    let search_p = Paragraph::new(search_text)
        .block(
            Block::default()
                .borders(Borders::ALL)
                .border_style(Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))
                .title(" Filter Projects [Type to Search • Esc Clear/Close] "),
        )
        .style(Style::default().fg(Color::Yellow));
    f.render_widget(search_p, chunks[0]);

    // 2. Filtered Projects List
    let filtered_projects = app.get_filtered_projects();
    let total_projects = app.projects.len();

    let items: Vec<ListItem> = filtered_projects
        .iter()
        .enumerate()
        .map(|(list_idx, (_orig_idx, p))| {
            let is_selected = list_idx == app.project_modal_selected;
            let is_active = app.active_project_id.as_ref() == Some(&p.id);

            let marker = if is_active { "● " } else { "  " };
            let marker_style = if is_active {
                Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(Color::DarkGray)
            };

            let name_style = if is_selected {
                Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(Color::White)
            };

            let category_str = p.category.as_deref().unwrap_or("General");
            let progress_str = format!("{}%", p.progress.unwrap_or(0));
            let vault_str = p.vault_path.as_deref().unwrap_or("-");

            let mut line1_spans = vec![
                Span::styled(marker, marker_style),
            ];

            if p.pinned {
                line1_spans.push(Span::styled("📌 ", Style::default().fg(Color::Yellow)));
            }

            line1_spans.push(Span::styled(&p.name, name_style));
            line1_spans.push(Span::raw("  "));
            line1_spans.push(Span::styled(
                format!("[{} • {}]", category_str, progress_str),
                Style::default().fg(Color::Cyan),
            ));

            let line1 = Line::from(line1_spans);

            let line2 = Line::from(vec![
                Span::raw("    📁 "),
                Span::styled(vault_str, Style::default().fg(Color::DarkGray)),
            ]);

            let bg_style = if is_selected {
                Style::default().bg(Color::Rgb(40, 50, 70))
            } else {
                Style::default()
            };

            ListItem::new(vec![line1, line2]).style(bg_style)
        })
        .collect();

    let title = format!(
        " 🌿 Switch Project ({}/{}) [↑/↓ Navigate • Enter Switch • Esc Close] ",
        filtered_projects.len(),
        total_projects
    );

    let list = List::new(items).block(
        Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Cyan))
            .title(title),
    );
    f.render_widget(list, chunks[1]);
}

fn render_help_modal(f: &mut Frame) {
    let area = centered_rect(65, 60, f.area());
    f.render_widget(Clear, area);

    let help_text = "
  Taxon TUI Keybindings & GUI Parity Guide:

  Global Navigation & Shortcuts:
    • [1], [2], [3]       : Switch directly between Tabs (Tasks, Vault, Sync)
    • [ [ ], [ ] ]        : Quick cycle between Tabs (matching GUI sidebar toggle)
    • [Tab]               : Toggle focus between Left and Right panes
    • [j] / [↓], [k] / [↑]: Navigate items up / down
    • [P] / [Ctrl+P]      : Open Project Switcher modal
    • [Alt+E]             : Export DB → .taxon files (any tab)
    • [Alt+I]             : Scan & Import .taxon files → DB (any tab)
    • [?]                 : Toggle this Help dialog
    • [q] / [Ctrl+C]      : Exit application

  Tab 1 (Tasks & Sprints):
    • [s] / [Alt+S]       : Cycle Sprint filter (All → Active → Planned → Backlog)
    • [S] (Shift+S)       : Open interactive Sprint Selector modal
    • [f] / [Alt+F]       : Cycle Task Status filter (All → In Prog → To Do → Test → Done)
    • [g] / [v]           : Cycle Grouping mode (By Sprint → By Status → Flat)
    • [Space]             : Quick toggle task completion (Done / To Do)
    • [m]                 : Open Status modification dialog

  Tab 2 (Vault Browser):
    • [/] / [Ctrl+F]      : Live search/filter files inside vault (Esc to clear)
    • [Enter]             : Open / expand document preview
    • [e]                 : Open selected file in external $EDITOR
    • [j] / [k] (Right)   : Scroll document text up / down

  Tab 3 (Sync Center):
    • [y] / [Enter]       : Apply two-way synchronization
    • [e]                 : Force Export (DB → .taxon files)
    • [i]                 : Force Import (.taxon files → DB)
    • [s]                 : Refresh diff calculation

  Press [Esc] or [?] to close this help window.
";

    let paragraph = Paragraph::new(help_text).block(
        Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Cyan))
            .title(" Keyboard Shortcuts Help "),
    );
    f.render_widget(paragraph, area);
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Percentage((100 - percent_y) / 2),
            Constraint::Percentage(percent_y),
            Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Percentage((100 - percent_x) / 2),
            Constraint::Percentage(percent_x),
            Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}
