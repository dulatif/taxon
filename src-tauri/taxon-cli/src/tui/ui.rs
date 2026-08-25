use crate::tui::app::{App, Pane, Tab};
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

fn render_tasks_left(f: &mut Frame, app: &App, area: Rect) {
    let is_focused = app.focused_pane == Pane::Left;
    let border_style = if is_focused {
        Style::default().fg(Color::Yellow)
    } else {
        Style::default().fg(Color::DarkGray)
    };

    let items: Vec<ListItem> = app
        .tasks
        .iter()
        .enumerate()
        .map(|(idx, task)| {
            let is_selected = idx == app.selected_task_index;
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

            let mut spans = vec![
                Span::styled(format!("{} ", check_mark), Style::default().fg(check_color)),
                Span::styled(format!("{} ", p_badge), Style::default().fg(priority_color)),
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
                Style::default().bg(Color::Rgb(30, 40, 60))
            } else {
                Style::default()
            };

            ListItem::new(Line::from(spans)).style(style)
        })
        .collect();

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
                .title(format!(" Tasks ({}) ", app.tasks.len())),
        )
        .highlight_symbol("▶ ");

    f.render_widget(list, area);
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
                .title(" Obsidian Vault Tree "),
        )
        .highlight_symbol("▶ ");

    f.render_widget(list, area);
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
        Tab::Tasks => "[Tab] Pane  [1-3] Tabs  [Space] Toggle Done  [m] Status  [p] Priority  [P] Projects  [?] Help  [q] Quit",
        Tab::Vault => "[Tab] Pane  [1-3] Tabs  [Enter] Open/Expand  [e] Edit ($EDITOR)  [j/k] Scroll  [P] Projects  [?] Help  [q] Quit",
        Tab::Sync => "[Tab] Pane  [1-3] Tabs  [y] Apply Sync  [e] Export  [i] Import  [s] Refresh  [P] Projects  [?] Help  [q] Quit",
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

fn render_project_modal(f: &mut Frame, app: &App) {
    let area = centered_rect(50, 40, f.area());
    f.render_widget(Clear, area);

    let items: Vec<ListItem> = app
        .projects
        .iter()
        .enumerate()
        .map(|(idx, p)| {
            let is_selected = idx == app.project_modal_selected;
            let style = if is_selected {
                Style::default()
                    .fg(Color::Yellow)
                    .bg(Color::Rgb(40, 50, 70))
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(Color::White)
            };
            ListItem::new(format!("  {} ({})  ", p.name, p.id)).style(style)
        })
        .collect();

    let list = List::new(items).block(
        Block::default()
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Blue))
            .title(" Switch Active Project [Enter / Esc] "),
    );
    f.render_widget(list, area);
}

fn render_help_modal(f: &mut Frame) {
    let area = centered_rect(60, 55, f.area());
    f.render_widget(Clear, area);

    let help_text = "
  Taxon TUI Keybindings Guide:

  Global Navigation:
    • [1], [2], [3]       : Switch directly between Tabs (Tasks, Vault, Sync)
    • [Tab]               : Toggle focus between Left and Right panes
    • [j] / [↓], [k] / [↑]: Navigate items up / down
    • [P]                 : Open Project Picker modal
    • [?]                 : Toggle this Help dialog
    • [q] / [Ctrl+C]      : Exit application

  Tab 1 (Tasks & Sprints):
    • [Space]             : Quick toggle task completion (Done / To Do)
    • [m]                 : Open Status Picker dialog
    • [p]                 : Cycle priority (Low → Med → High → Crit)

  Tab 2 (Vault Browser):
    • [Enter]             : Open document preview
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
