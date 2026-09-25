use clap::Subcommand;
use comfy_table::Table;
use taxon_core::db::TaxonDb;
use taxon_core::models::Task;
use uuid::Uuid;

#[derive(Subcommand, Debug, Clone)]
pub enum TaskCommands {
    /// List tasks
    List {
        #[arg(long, help = "Filter by project ID")]
        project_id: Option<String>,
        #[arg(long, help = "Filter by sprint ID")]
        sprint_id: Option<String>,
    },
    /// Create a new task
    Create {
        #[arg(short, long, help = "Task title")]
        title: String,
        #[arg(long, help = "Project ID")]
        project_id: Option<String>,
        #[arg(long, help = "Sprint ID")]
        sprint_id: Option<String>,
        #[arg(long, default_value = "Medium", help = "Priority (Critical, High, Medium, Low)")]
        priority: String,
        #[arg(long, help = "Module Group name")]
        module_group: Option<String>,
    },
    /// Mark task(s) as completed by ID or short ID pattern
    Done {
        #[arg(help = "Task ID or short ID pattern")]
        pattern: String,
    },
    /// Set task status (To Do, In Progress, Need to Test, Done)
    Status {
        #[arg(help = "Task ID")]
        task_id: String,
        #[arg(help = "Status string")]
        status: String,
    },
}

pub fn handle(cmd: TaskCommands, db: &TaxonDb, json: bool) {
    match cmd {
        TaskCommands::List { project_id, sprint_id } => {
            match db.list_tasks(project_id.as_deref()) {
                Ok(mut tasks) => {
                    if let Some(ref sid) = sprint_id {
                        tasks.retain(|t| t.sprint_id.as_deref() == Some(sid));
                    }
                    if json {
                        println!("{}", serde_json::to_string_pretty(&tasks).unwrap());
                    } else {
                        print_tasks_table(&tasks);
                    }
                }
                Err(e) => eprintln!("Error listing tasks: {}", e),
            }
        }
        TaskCommands::Create {
            title,
            project_id,
            sprint_id,
            priority,
            module_group,
        } => {
            let id = format!("task_{}", Uuid::new_v4().to_string().replace('-', "")[..12].to_string());
            let new_task = Task {
                id: id.clone(),
                project_id,
                sprint_id,
                title,
                completed: false,
                duration: None,
                priority,
                status: "To Do".to_string(),
                description: None,
                due_date: None,
                labels: None,
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
                module_group,
            };
            match db.create_task(&new_task) {
                Ok(_) => {
                    if json {
                        println!("{}", serde_json::to_string_pretty(&new_task).unwrap());
                    } else {
                        println!("Created task {} ('{}')", &id[..6.min(id.len())], new_task.title);
                    }
                }
                Err(e) => eprintln!("Error creating task: {}", e),
            }
        }
        TaskCommands::Done { pattern } => match db.complete_task(&pattern) {
            Ok(count) => {
                if json {
                    println!("{{\"completed\": {}}}", count);
                } else {
                    println!("Marked {} task(s) matching '{}' as Done.", count, pattern);
                }
            }
            Err(e) => eprintln!("Error completing task: {}", e),
        },
        TaskCommands::Status { task_id, status } => {
            match db.update_task_status(&task_id, &status) {
                Ok(_) => {
                    if json {
                        println!("{{\"updated\": true, \"taskId\": \"{}\", \"status\": \"{}\"}}", task_id, status);
                    } else {
                        println!("Updated task '{}' status to '{}'", task_id, status);
                    }
                }
                Err(e) => eprintln!("Error updating task status: {}", e),
            }
        }
    }
}

pub fn print_tasks_table(tasks: &[Task]) {
    let mut table = Table::new();
    table.set_header(vec!["ID", "Status", "Priority", "Title", "Module Group", "Sprint ID"]);
    for t in tasks {
        let short_id = if t.id.len() >= 6 { &t.id[..6] } else { &t.id };
        let status_str = if t.completed { "[✓] Done" } else { &t.status };
        table.add_row(vec![
            short_id,
            status_str,
            &t.priority,
            &t.title,
            t.module_group.as_deref().unwrap_or("-"),
            t.sprint_id.as_deref().unwrap_or("-"),
        ]);
    }
    println!("{}", table);
}
