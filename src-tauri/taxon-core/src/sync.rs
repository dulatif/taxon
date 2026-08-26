use crate::db::TaxonDb;
use crate::models::{DiffItem, DiffKind, Project, Sprint, SubTask, SyncDiff, Task};
use std::collections::HashMap;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};

pub fn slugify(title: &str) -> String {
    let mut result = String::new();
    let mut prev_is_hyphen = false;

    for c in title.chars() {
        if c.is_alphanumeric() {
            for lc in c.to_lowercase() {
                result.push(lc);
            }
            prev_is_hyphen = false;
        } else if !prev_is_hyphen && !result.is_empty() {
            result.push('-');
            prev_is_hyphen = true;
        }
    }

    let trimmed = result.trim_end_matches('-');
    if trimmed.len() > 50 {
        trimmed[..50].trim_end_matches('-').to_string()
    } else {
        trimmed.to_string()
    }
}

pub fn task_filename(task: &Task) -> String {
    let short_id = if task.id.len() >= 6 {
        &task.id[task.id.len() - 6..]
    } else {
        &task.id
    };
    format!("TASK-{}-{}.md", short_id, slugify(&task.title))
}

pub fn sprint_filename(sprint: &Sprint) -> String {
    let short_id = if sprint.id.len() >= 6 {
        &sprint.id[sprint.id.len() - 6..]
    } else {
        &sprint.id
    };
    format!("SPRINT-{}-{}.md", short_id, slugify(&sprint.name))
}

pub fn parse_frontmatter(
    markdown: &str,
) -> Result<(HashMap<String, serde_json::Value>, String), String> {
    let trimmed = markdown.trim_start();
    if !trimmed.starts_with("---") {
        return Err("Invalid markdown: missing opening frontmatter delimiter".to_string());
    }

    let rest = &trimmed[3..];
    let close_idx = rest
        .find("\n---")
        .or_else(|| rest.find("\r\n---"))
        .ok_or_else(|| {
            "Invalid markdown: missing closing frontmatter delimiter".to_string()
        })?;

    let frontmatter_str = &rest[..close_idx].trim();
    let after_closing = &rest[close_idx..];
    let body_start = if let Some(idx) = after_closing.find('\n') {
        let after_newline = &after_closing[idx + 1..];
        if let Some(second_newline) = after_newline.find('\n') {
            &after_newline[second_newline + 1..]
        } else {
            after_newline
        }
    } else {
        ""
    };

    let mut data = HashMap::new();
    let lines = frontmatter_str.lines();
    let mut current_array_key: Option<String> = None;
    let mut current_array_items: Vec<serde_json::Value> = Vec::new();

    for line in lines {
        let trimmed_line = line.trim();
        if trimmed_line.is_empty() {
            continue;
        }

        if let Some(ref key) = current_array_key {
            if trimmed_line.starts_with('-') {
                let item = trimmed_line[1..]
                    .trim()
                    .trim_matches(|c| c == '\'' || c == '"');
                current_array_items.push(serde_json::Value::String(item.to_string()));
                continue;
            } else {
                data.insert(
                    key.clone(),
                    serde_json::Value::Array(std::mem::take(&mut current_array_items)),
                );
                current_array_key = None;
            }
        }

        if let Some(colon_idx) = trimmed_line.find(':') {
            let key = trimmed_line[..colon_idx].trim().to_string();
            let value_str = trimmed_line[colon_idx + 1..].trim();

            if value_str.is_empty() {
                current_array_key = Some(key.clone());
                current_array_items = Vec::new();
                continue;
            }

            let val = if value_str == "true" {
                serde_json::Value::Bool(true)
            } else if value_str == "false" {
                serde_json::Value::Bool(false)
            } else if value_str.starts_with('[') && value_str.ends_with(']') {
                let inner = value_str[1..value_str.len() - 1].trim();
                if inner.is_empty() {
                    serde_json::Value::Array(vec![])
                } else {
                    let items: Vec<serde_json::Value> = inner
                        .split(',')
                        .map(|s| {
                            serde_json::Value::String(
                                s.trim().trim_matches(|c| c == '\'' || c == '"').to_string(),
                            )
                        })
                        .collect();
                    serde_json::Value::Array(items)
                }
            } else if let Ok(n) = value_str.parse::<i64>() {
                serde_json::Value::Number(n.into())
            } else if let Ok(f) = value_str.parse::<f64>() {
                serde_json::Number::from_f64(f)
                    .map(serde_json::Value::Number)
                    .unwrap_or_else(|| {
                        serde_json::Value::String(
                            value_str
                                .trim_matches(|c| c == '\'' || c == '"')
                                .to_string(),
                        )
                    })
            } else {
                serde_json::Value::String(
                    value_str
                        .trim_matches(|c| c == '\'' || c == '"')
                        .to_string(),
                )
            };

            data.insert(key, val);
        }
    }

    if let Some(key) = current_array_key {
        data.insert(key, serde_json::Value::Array(current_array_items));
    }

    Ok((data, body_start.trim().to_string()))
}

pub fn task_to_markdown(task: &Task) -> String {
    let mut out = String::from("---\n");
    out.push_str(&format!("id: {}\n", task.id));
    out.push_str(&format!("title: {}\n", task.title));
    out.push_str(&format!("priority: {}\n", task.priority));
    out.push_str(&format!("status: {}\n", task.status));
    out.push_str(&format!("completed: {}\n", task.completed));

    if let Some(ref sid) = task.sprint_id {
        out.push_str(&format!("sprintId: {}\n", sid));
    } else {
        out.push_str("sprintId: \n");
    }

    if let Some(ref dd) = task.due_date {
        out.push_str(&format!("dueDate: {}\n", dd));
    } else {
        out.push_str("dueDate: \n");
    }

    if let Some(ref labels) = task.labels {
        out.push_str(&format!("labels: [{}]\n", labels.join(", ")));
    } else {
        out.push_str("labels: []\n");
    }

    if let Some(effort) = task.time_effort {
        out.push_str(&format!("timeEffort: {}\n", effort));
    }
    if let Some(spent) = task.time_spent {
        out.push_str(&format!("timeSpent: {}\n", spent));
    }
    if let Some(sort) = task.sort_order {
        out.push_str(&format!("sortOrder: {}\n", sort));
    }

    out.push_str(&format!("archived: {}\n", task.archived));

    if let Some(ref arch_at) = task.archived_at {
        out.push_str(&format!("archivedAt: {}\n", arch_at));
    }
    if let Some(ref wp) = task.workspace_path {
        out.push_str(&format!("workspacePath: {}\n", wp));
    }
    if let Some(ref lf) = task.linked_files {
        out.push_str(&format!("linkedFiles: [{}]\n", lf.join(", ")));
    } else {
        out.push_str("linkedFiles: []\n");
    }
    if let Some(ref dep) = task.depends_on {
        out.push_str(&format!("dependsOn: [{}]\n", dep.join(", ")));
    } else {
        out.push_str("dependsOn: []\n");
    }
    if let Some(ref mg) = task.module_group {
        out.push_str(&format!("moduleGroup: {}\n", mg));
    }

    out.push_str("---\n\n## Description\n\n");
    if let Some(ref desc) = task.description {
        out.push_str(desc);
    }
    out.push_str("\n\n## Subtasks\n\n");
    if let Some(ref subtasks) = task.subtasks {
        for st in subtasks {
            let check = if st.completed { "[x]" } else { "[ ]" };
            out.push_str(&format!("- {} {}\n", check, st.title));
        }
    }

    out
}

pub fn markdown_to_task(markdown: &str, default_project_id: Option<&str>) -> Result<Task, String> {
    let (data, body) = parse_frontmatter(markdown)?;

    let id = data
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let title = data
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("Untitled Task")
        .to_string();

    let priority = data
        .get("priority")
        .and_then(|v| v.as_str())
        .unwrap_or("Medium")
        .to_string();

    let status = data
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("To Do")
        .to_string();

    let completed = data
        .get("completed")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    let sprint_id = data
        .get("sprintId")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    let due_date = data
        .get("dueDate")
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    let labels = data.get("labels").and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|item| item.as_str().map(|s| s.to_string()))
                .collect()
        })
    });

    let time_effort = data.get("timeEffort").and_then(|v| v.as_i64());
    let time_spent = data.get("timeSpent").and_then(|v| v.as_i64());
    let sort_order = data.get("sortOrder").and_then(|v| v.as_i64());
    let archived = data
        .get("archived")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    let archived_at = data
        .get("archivedAt")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let workspace_path = data
        .get("workspacePath")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let linked_files = data.get("linkedFiles").and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|item| item.as_str().map(|s| s.to_string()))
                .collect()
        })
    });

    let depends_on = data.get("dependsOn").and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|item| item.as_str().map(|s| s.to_string()))
                .collect()
        })
    });

    let module_group = data
        .get("moduleGroup")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // Extract Description and Subtasks from body
    let mut subtasks = Vec::new();

    let desc_split = body.split("## Subtasks").collect::<Vec<_>>();
    let desc_part = desc_split[0];
    let description = if let Some(desc_idx) = desc_part.find("## Description") {
        desc_part[desc_idx + "## Description".len()..]
            .trim()
            .to_string()
    } else {
        desc_part.trim().to_string()
    };

    if desc_split.len() > 1 {
        let subtasks_part = desc_split[1];
        for line in subtasks_part.lines() {
            let line_trimmed = line.trim();
            if let Some(rest) = line_trimmed.strip_prefix("- [") {
                if rest.len() >= 3 && (rest.starts_with(" ]") || rest.starts_with("x]") || rest.starts_with("X]")) {
                    let is_done = !rest.starts_with(" ]");
                    let sub_title = rest[2..].trim().to_string();
                    if !sub_title.is_empty() {
                        let mut hash: u32 = 0;
                        for b in sub_title.bytes() {
                            hash = hash.wrapping_mul(31).wrapping_add(b as u32);
                        }
                        subtasks.push(SubTask {
                            id: format!("sub-{:08x}", hash),
                            title: sub_title,
                            completed: is_done,
                        });
                    }
                }
            }
        }
    }

    Ok(Task {
        id,
        project_id: default_project_id.map(|s| s.to_string()),
        sprint_id,
        title,
        completed,
        duration: None,
        priority,
        status,
        due_date,
        description: if description.is_empty() {
            None
        } else {
            Some(description)
        },
        labels,
        reminders: None,
        deadline: None,
        subtasks: if subtasks.is_empty() {
            None
        } else {
            Some(subtasks)
        },
        time_effort,
        time_spent,
        sort_order,
        archived,
        archived_at,
        workspace_path,
        linked_files,
        depends_on,
        module_group,
    })
}

pub fn sprint_to_markdown(sprint: &Sprint, tasks: &[Task]) -> String {
    let mut out = String::from("---\n");
    out.push_str(&format!("id: {}\n", sprint.id));
    out.push_str(&format!("name: {}\n", sprint.name));
    out.push_str(&format!("status: {}\n", sprint.status));
    out.push_str(&format!("startDate: {}\n", sprint.start_date));
    out.push_str(&format!("endDate: {}\n", sprint.end_date));
    if let Some(ref comp) = sprint.completed_at {
        out.push_str(&format!("completedAt: {}\n", comp));
    }
    out.push_str("---\n\n## Goal\n\n");
    if let Some(ref g) = sprint.goal {
        out.push_str(g);
    }
    out.push_str("\n\n## Tasks\n\n");

    let statuses = ["To Do", "In Progress", "Need to Test", "Done"];
    for st in statuses {
        let matching: Vec<&Task> = tasks
            .iter()
            .filter(|t| t.sprint_id.as_deref() == Some(&sprint.id) && t.status == st)
            .collect();
        if !matching.is_empty() {
            out.push_str(&format!("### {}\n", st));
            for t in matching {
                out.push_str(&format!("- [{}] {}\n", t.priority, task_filename(t)));
            }
            out.push('\n');
        }
    }

    out
}

pub fn markdown_to_sprint(markdown: &str, default_project_id: Option<&str>) -> Result<Sprint, String> {
    let (data, body) = parse_frontmatter(markdown)?;

    let id = data
        .get("id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());

    let name = data
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Untitled Sprint")
        .to_string();

    let status = data
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("Planned")
        .to_string();

    let start_date = data
        .get("startDate")
        .and_then(|v| v.as_str())
        .unwrap_or("2026-01-01")
        .to_string();

    let end_date = data
        .get("endDate")
        .and_then(|v| v.as_str())
        .unwrap_or("2026-01-14")
        .to_string();

    let completed_at = data
        .get("completedAt")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let mut goal = String::new();
    let goal_split = body.split("## Tasks").collect::<Vec<_>>();
    let goal_part = goal_split[0];
    if let Some(goal_idx) = goal_part.find("## Goal") {
        goal = goal_part[goal_idx + "## Goal".len()..].trim().to_string();
    }

    Ok(Sprint {
        id,
        project_id: default_project_id.map(|s| s.to_string()),
        name,
        status,
        start_date,
        end_date,
        goal: if goal.is_empty() { None } else { Some(goal) },
        sort_order: None,
        completed_at,
    })
}

pub fn project_to_markdown(
    project: &Project,
    tasks: Option<&[Task]>,
    sprints: Option<&[Sprint]>,
) -> String {
    let mut out = String::from("---\n");
    out.push_str(&format!("id: {}\n", project.id));
    out.push_str(&format!("name: {}\n", project.name));
    if let Some(ref desc) = project.description {
        out.push_str(&format!("description: {}\n", desc));
    }
    if let Some(ref cat) = project.category {
        out.push_str(&format!("category: {}\n", cat));
    }
    if let Some(prog) = project.progress {
        out.push_str(&format!("progress: {}\n", prog));
    }
    if let Some(ref dd) = project.due_date {
        out.push_str(&format!("dueDate: {}\n", dd));
    } else {
        out.push_str("dueDate: \n");
    }
    out.push_str("---\n\n## Tasks Index\n\n");

    if let (Some(all_tasks), Some(all_sprints)) = (tasks, sprints) {
        let active_tasks: Vec<&Task> = all_tasks.iter().filter(|t| !t.archived).collect();
        if active_tasks.is_empty() {
            out.push_str("*No active tasks*\n");
        } else {
            out.push_str("| ID | Title | Status | Priority | Sprint | File Path |\n");
            out.push_str("|---|---|---|---|---|---|\n");
            for t in active_tasks {
                let sprint_name = t
                    .sprint_id
                    .as_deref()
                    .and_then(|sid| all_sprints.iter().find(|s| s.id == sid).map(|s| s.name.as_str()))
                    .unwrap_or("Backlog");
                let escaped_title = t.title.replace('|', "\\|");
                let file_path = format!(".taxon/tasks/{}", task_filename(t));
                out.push_str(&format!(
                    "| {} | {} | {} | {} | {} | `{}` |\n",
                    t.id, escaped_title, t.status, t.priority, sprint_name, file_path
                ));
            }
        }
    }

    out
}

pub fn markdown_to_project(markdown: &str) -> Result<Project, String> {
    let (data, _body) = parse_frontmatter(markdown)?;

    let id = data
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing project id in frontmatter".to_string())?
        .to_string();

    let name = data
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Untitled Project")
        .to_string();

    let description = data
        .get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let category = data
        .get("category")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let progress = data.get("progress").and_then(|v| v.as_i64());
    let due_date = data
        .get("dueDate")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok(Project {
        id,
        name,
        description,
        category,
        progress,
        due_days: None,
        due_date,
        sort_order: None,
        vault_path: None,
        workspace_paths: None,
        pinned: false,
        pinned_sort_order: None,
    })
}

// -------------------------------------------------------------
// Two-way Diff & Sync Engine
// -------------------------------------------------------------

pub fn read_taxon_directory_tasks(
    taxon_dir: &Path,
    project_id: Option<&str>,
) -> Result<Vec<(PathBuf, Task)>, String> {
    let tasks_dir = taxon_dir.join("tasks");
    if !tasks_dir.exists() {
        return Ok(Vec::new());
    }

    let mut result = Vec::new();
    let entries = fs::read_dir(&tasks_dir)
        .map_err(|e| format!("Failed to read tasks dir {}: {}", tasks_dir.display(), e))?;

    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_file() && p.extension().map_or(false, |ext| ext == "md") {
            if let Ok(content) = fs::read_to_string(&p) {
                if let Ok(task) = markdown_to_task(&content, project_id) {
                    result.push((p, task));
                }
            }
        }
    }

    Ok(result)
}

pub fn read_taxon_directory_sprints(
    taxon_dir: &Path,
    project_id: Option<&str>,
) -> Result<Vec<(PathBuf, Sprint)>, String> {
    let sprints_dir = taxon_dir.join("sprints");
    if !sprints_dir.exists() {
        return Ok(Vec::new());
    }

    let mut result = Vec::new();
    let entries = fs::read_dir(&sprints_dir)
        .map_err(|e| format!("Failed to read sprints dir {}: {}", sprints_dir.display(), e))?;

    for entry in entries.flatten() {
        let p = entry.path();
        if p.is_file() && p.extension().map_or(false, |ext| ext == "md") {
            if let Ok(content) = fs::read_to_string(&p) {
                if let Ok(sprint) = markdown_to_sprint(&content, project_id) {
                    result.push((p, sprint));
                }
            }
        }
    }

    Ok(result)
}

pub fn compute_sync_diff(
    db: &TaxonDb,
    project_id: Option<&str>,
    taxon_dir: &Path,
) -> Result<SyncDiff, String> {
    let db_tasks = db.list_tasks(project_id)?;
    let db_sprints = db.list_sprints(project_id)?;
    let file_tasks_with_path = read_taxon_directory_tasks(taxon_dir, project_id)?;
    let file_sprints_with_path = read_taxon_directory_sprints(taxon_dir, project_id)?;

    let mut diff_items = Vec::new();

    // Map tasks
    let mut file_task_map: HashMap<String, &Task> = HashMap::new();
    for (_, t) in &file_tasks_with_path {
        file_task_map.insert(t.id.clone(), t);
    }

    let mut db_task_map: HashMap<String, &Task> = HashMap::new();
    for t in &db_tasks {
        db_task_map.insert(t.id.clone(), t);
    }

    // Check DB tasks against file tasks
    for (id, db_t) in &db_task_map {
        if let Some(file_t) = file_task_map.get(id) {
            if db_t.status != file_t.status
                || db_t.completed != file_t.completed
                || db_t.title != file_t.title
                || db_t.priority != file_t.priority
                || db_t.sprint_id != file_t.sprint_id
                || db_t.module_group != file_t.module_group
            {
                diff_items.push(DiffItem {
                    entity_type: "task".to_string(),
                    id: id.clone(),
                    title: db_t.title.clone(),
                    kind: DiffKind::Modified,
                    summary: format!(
                        "Status: DB('{}') vs File('{}') | Priority: DB('{}') vs File('{}')",
                        db_t.status, file_t.status, db_t.priority, file_t.priority
                    ),
                });
            }
        } else {
            diff_items.push(DiffItem {
                entity_type: "task".to_string(),
                id: id.clone(),
                title: db_t.title.clone(),
                kind: DiffKind::Added,
                summary: "Exists in SQLite database only (pending export)".to_string(),
            });
        }
    }

    // Check file tasks for items not in DB
    for (id, file_t) in &file_task_map {
        if !db_task_map.contains_key(id) {
            diff_items.push(DiffItem {
                entity_type: "task".to_string(),
                id: id.clone(),
                title: file_t.title.clone(),
                kind: DiffKind::Added,
                summary: "Exists in .taxon files only (pending import)".to_string(),
            });
        }
    }

    // Map sprints
    let mut file_sprint_map: HashMap<String, &Sprint> = HashMap::new();
    for (_, s) in &file_sprints_with_path {
        file_sprint_map.insert(s.id.clone(), s);
    }

    let mut db_sprint_map: HashMap<String, &Sprint> = HashMap::new();
    for s in &db_sprints {
        db_sprint_map.insert(s.id.clone(), s);
    }

    for (id, db_s) in &db_sprint_map {
        if let Some(file_s) = file_sprint_map.get(id) {
            if db_s.name != file_s.name || db_s.status != file_s.status {
                diff_items.push(DiffItem {
                    entity_type: "sprint".to_string(),
                    id: id.clone(),
                    title: db_s.name.clone(),
                    kind: DiffKind::Modified,
                    summary: format!("Status: DB('{}') vs File('{}')", db_s.status, file_s.status),
                });
            }
        } else {
            diff_items.push(DiffItem {
                entity_type: "sprint".to_string(),
                id: id.clone(),
                title: db_s.name.clone(),
                kind: DiffKind::Added,
                summary: "Exists in DB only (pending export)".to_string(),
            });
        }
    }

    for (id, file_s) in &file_sprint_map {
        if !db_sprint_map.contains_key(id) {
            diff_items.push(DiffItem {
                entity_type: "sprint".to_string(),
                id: id.clone(),
                title: file_s.name.clone(),
                kind: DiffKind::Added,
                summary: "Exists in .taxon files only (pending import)".to_string(),
            });
        }
    }

    Ok(SyncDiff {
        items: diff_items,
        db_task_count: db_tasks.len(),
        file_task_count: file_tasks_with_path.len(),
        db_sprint_count: db_sprints.len(),
        file_sprint_count: file_sprints_with_path.len(),
    })
}

pub fn export_to_taxon_files(
    db: &TaxonDb,
    project_id: &str,
    taxon_dir: &Path,
) -> Result<usize, String> {
    let tasks_dir = taxon_dir.join("tasks");
    let sprints_dir = taxon_dir.join("sprints");
    fs::create_dir_all(&tasks_dir)
        .map_err(|e| format!("Failed to create tasks dir: {}", e))?;
    fs::create_dir_all(&sprints_dir)
        .map_err(|e| format!("Failed to create sprints dir: {}", e))?;

    let tasks = db.list_tasks(Some(project_id))?;
    let sprints = db.list_sprints(Some(project_id))?;
    let project = db.get_project(project_id)?.unwrap_or(Project {
        id: project_id.to_string(),
        name: "Taxon Project".to_string(),
        description: None,
        category: None,
        progress: None,
        due_days: None,
        due_date: None,
        sort_order: None,
        vault_path: None,
        workspace_paths: None,
        pinned: false,
        pinned_sort_order: None,
    });

    let mut count = 0;

    // Export tasks
    for task in &tasks {
        let filename = task_filename(task);
        let path = tasks_dir.join(filename);
        let content = task_to_markdown(task);
        let mut file = File::create(&path).map_err(|e| format!("Failed to write {}: {}", path.display(), e))?;
        file.write_all(content.as_bytes())
            .map_err(|e| e.to_string())?;
        count += 1;
    }

    // Export sprints
    for sprint in &sprints {
        let filename = sprint_filename(sprint);
        let path = sprints_dir.join(filename);
        let content = sprint_to_markdown(sprint, &tasks);
        let mut file = File::create(&path).map_err(|e| format!("Failed to write {}: {}", path.display(), e))?;
        file.write_all(content.as_bytes())
            .map_err(|e| e.to_string())?;
        count += 1;
    }

    // Export project.md
    let project_md_path = taxon_dir.join("project.md");
    let project_content = project_to_markdown(&project, Some(&tasks), Some(&sprints));
    let mut file = File::create(&project_md_path)
        .map_err(|e| format!("Failed to write {}: {}", project_md_path.display(), e))?;
    file.write_all(project_content.as_bytes())
        .map_err(|e| e.to_string())?;
    count += 1;

    Ok(count)
}

pub fn import_from_taxon_files(
    db: &TaxonDb,
    project_id: &str,
    taxon_dir: &Path,
) -> Result<usize, String> {
    let file_tasks = read_taxon_directory_tasks(taxon_dir, Some(project_id))?;
    let file_sprints = read_taxon_directory_sprints(taxon_dir, Some(project_id))?;

    let mut count = 0;

    for (_, task) in file_tasks {
        db.upsert_task(&task)?;
        count += 1;
    }

    for (_, sprint) in file_sprints {
        db.upsert_sprint(&sprint)?;
        count += 1;
    }

    // Import project.md if present
    let project_md_path = taxon_dir.join("project.md");
    if project_md_path.exists() {
        if let Ok(content) = fs::read_to_string(&project_md_path) {
            if let Ok(project) = markdown_to_project(&content) {
                let _ = db.upsert_project(&project);
                count += 1;
            }
        }
    }

    Ok(count)
}

pub fn apply_two_way_sync(
    db: &TaxonDb,
    project_id: &str,
    taxon_dir: &Path,
) -> Result<usize, String> {
    let imported = import_from_taxon_files(db, project_id, taxon_dir)?;
    let exported = export_to_taxon_files(db, project_id, taxon_dir)?;
    Ok(imported + exported)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_slugify() {
        assert_eq!(slugify("Hello World! 123"), "hello-world-123");
        assert_eq!(
            slugify("Task with multiple --- special chars @#$"),
            "task-with-multiple-special-chars"
        );
    }

    #[test]
    fn test_task_roundtrip() {
        let task = Task {
            id: "task_123456".to_string(),
            project_id: Some("proj_1".to_string()),
            sprint_id: Some("sprint_1".to_string()),
            title: "Implement Parser".to_string(),
            completed: false,
            duration: None,
            priority: "High".to_string(),
            status: "To Do".to_string(),
            due_date: Some("2026-09-01".to_string()),
            description: Some("Full detailed markdown description".to_string()),
            labels: Some(vec!["rust".to_string(), "tui".to_string()]),
            reminders: None,
            deadline: None,
            subtasks: Some(vec![
                SubTask {
                    id: "sub-1".to_string(),
                    title: "Write unit tests".to_string(),
                    completed: true,
                },
                SubTask {
                    id: "sub-2".to_string(),
                    title: "Implement serializer".to_string(),
                    completed: false,
                },
            ]),
            time_effort: Some(60),
            time_spent: Some(15),
            sort_order: Some(1),
            archived: false,
            archived_at: None,
            workspace_path: None,
            linked_files: Some(vec!["src/main.rs".to_string()]),
            depends_on: Some(vec!["task_000000".to_string()]),
            module_group: Some("Core Engine & Sync".to_string()),
        };

        let md = task_to_markdown(&task);
        let parsed = markdown_to_task(&md, Some("proj_1")).unwrap();

        assert_eq!(parsed.id, task.id);
        assert_eq!(parsed.title, task.title);
        assert_eq!(parsed.priority, task.priority);
        assert_eq!(parsed.status, task.status);
        assert_eq!(parsed.due_date, task.due_date);
        assert_eq!(parsed.description, task.description);
        assert_eq!(parsed.labels, task.labels);
        assert_eq!(parsed.module_group, task.module_group);
        assert_eq!(parsed.depends_on, task.depends_on);
        assert_eq!(parsed.linked_files, task.linked_files);
        assert_eq!(parsed.subtasks.as_ref().unwrap().len(), 2);
        assert!(parsed.subtasks.as_ref().unwrap()[0].completed);
        assert!(!parsed.subtasks.as_ref().unwrap()[1].completed);
    }

    #[test]
    fn test_sync_export_and_import() {
        let conn = rusqlite::Connection::open_in_memory().unwrap();
        let db = TaxonDb::from_conn(conn);

        let project = Project {
            id: "proj-sync-test".to_string(),
            name: "Sync Test Project".to_string(),
            description: Some("Description".to_string()),
            category: Some("Test".to_string()),
            progress: Some(50),
            due_days: None,
            due_date: None,
            sort_order: None,
            vault_path: None,
            workspace_paths: None,
        };
        db.upsert_project(&project).unwrap();

        let sprint = Sprint {
            id: "sprint-123456".to_string(),
            project_id: Some("proj-sync-test".to_string()),
            name: "Sprint Alpha".to_string(),
            status: "Active".to_string(),
            start_date: "2026-08-26".to_string(),
            end_date: "2026-09-09".to_string(),
            goal: Some("Test sync".to_string()),
            sort_order: None,
            completed_at: None,
        };
        db.upsert_sprint(&sprint).unwrap();

        let task = Task {
            id: "task-abcdef".to_string(),
            project_id: Some("proj-sync-test".to_string()),
            sprint_id: Some("sprint-123456".to_string()),
            title: "Task For Sync".to_string(),
            completed: false,
            duration: None,
            priority: "High".to_string(),
            status: "To Do".to_string(),
            due_date: None,
            description: Some("Body text".to_string()),
            labels: Some(vec!["sync".to_string()]),
            reminders: None,
            deadline: None,
            subtasks: None,
            time_effort: None,
            time_spent: None,
            sort_order: Some(0),
            archived: false,
            archived_at: None,
            workspace_path: None,
            linked_files: None,
            depends_on: None,
            module_group: Some("Core".to_string()),
        };
        db.create_task(&task).unwrap();

        let temp_taxon_dir = std::env::temp_dir().join(format!("taxon_sync_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_taxon_dir).unwrap();

        // 1. Export DB -> .taxon/ files
        let exported_count = export_to_taxon_files(&db, "proj-sync-test", &temp_taxon_dir).unwrap();
        assert_eq!(exported_count, 3); // 1 task + 1 sprint + 1 project.md

        // 2. Verify diff is now clean
        let diff = compute_sync_diff(&db, Some("proj-sync-test"), &temp_taxon_dir).unwrap();
        assert_eq!(diff.items.len(), 0);
        assert_eq!(diff.db_task_count, 1);
        assert_eq!(diff.file_task_count, 1);

        // 3. Import to another fresh DB
        let conn2 = rusqlite::Connection::open_in_memory().unwrap();
        let db2 = TaxonDb::from_conn(conn2);
        let imported_count = import_from_taxon_files(&db2, "proj-sync-test", &temp_taxon_dir).unwrap();
        assert!(imported_count >= 2);

        let imported_tasks = db2.list_tasks(Some("proj-sync-test")).unwrap();
        assert_eq!(imported_tasks.len(), 1);
        assert_eq!(imported_tasks[0].title, "Task For Sync");
        assert_eq!(imported_tasks[0].priority, "High");

        let _ = fs::remove_dir_all(&temp_taxon_dir);
    }
}

