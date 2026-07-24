use clap::{Parser, Subcommand};
use comfy_table::Table;
use std::path::PathBuf;
use taxon_core::db::TaxonDb;
use taxon_core::models::Task;
use uuid::Uuid;

#[derive(Parser)]
#[command(name = "taxon-cli")]
#[command(about = "Lightweight CLI companion for Taxon agent task management", long_about = None)]
struct Cli {
    #[arg(long, global = true, help = "Path to custom Taxon SQLite database")]
    db: Option<PathBuf>,

    #[arg(long, global = true, help = "Output results in JSON format")]
    json: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    #[command(subcommand)]
    Task(TaskCommands),
    #[command(subcommand)]
    Sprint(SprintCommands),
    #[command(subcommand)]
    Project(ProjectCommands),
}

#[derive(Subcommand)]
enum TaskCommands {
    /// List tasks
    List {
        #[arg(long, help = "Filter by project ID")]
        project_id: Option<String>,
    },
    /// Create a new task
    Create {
        #[arg(short, long, help = "Task title")]
        title: String,
        #[arg(long, help = "Project ID")]
        project_id: Option<String>,
        #[arg(long, default_value = "Medium", help = "Priority (High, Medium, Low)")]
        priority: String,
    },
    /// Mark task(s) as completed by ID or 6-character short ID
    Done {
        #[arg(help = "Task ID or short ID pattern")]
        pattern: String,
    },
}

#[derive(Subcommand)]
enum SprintCommands {
    /// List sprints
    List {
        #[arg(long, help = "Filter by project ID")]
        project_id: Option<String>,
    },
}

#[derive(Subcommand)]
enum ProjectCommands {
    /// List projects
    List,
}

fn main() {
    let cli = Cli::parse();

    let db = match &cli.db {
        Some(path) => match TaxonDb::open(path) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(1);
            }
        },
        None => match TaxonDb::open_default() {
            Ok(d) => d,
            Err(e) => {
                eprintln!("Error: {}", e);
                std::process::exit(1);
            }
        },
    };

    match cli.command {
        Commands::Task(TaskCommands::List { project_id }) => {
            match db.list_tasks(project_id.as_deref()) {
                Ok(tasks) => {
                    if cli.json {
                        println!("{}", serde_json::to_string_pretty(&tasks).unwrap());
                    } else {
                        print_tasks_table(&tasks);
                    }
                }
                Err(e) => eprintln!("Error listing tasks: {}", e),
            }
        }
        Commands::Task(TaskCommands::Create {
            title,
            project_id,
            priority,
        }) => {
            let id = Uuid::new_v4().to_string();
            let new_task = Task {
                id: id.clone(),
                project_id,
                sprint_id: None,
                title,
                completed: false,
                priority,
                status: "To Do".to_string(),
                description: None,
                due_date: None,
                labels: None,
                time_effort: None,
                time_spent: None,
                sort_order: Some(0),
                archived: false,
            };
            match db.create_task(&new_task) {
                Ok(_) => {
                    if cli.json {
                        println!("{}", serde_json::to_string_pretty(&new_task).unwrap());
                    } else {
                        println!("Created task {} ('{}')", &id[..6], new_task.title);
                    }
                }
                Err(e) => eprintln!("Error creating task: {}", e),
            }
        }
        Commands::Task(TaskCommands::Done { pattern }) => match db.complete_task(&pattern) {
            Ok(count) => {
                if cli.json {
                    println!("{{\"completed\": {}}}", count);
                } else {
                    println!("Marked {} task(s) matching '{}' as Done.", count, pattern);
                }
            }
            Err(e) => eprintln!("Error completing task: {}", e),
        },
        Commands::Sprint(SprintCommands::List { project_id }) => {
            match db.list_sprints(project_id.as_deref()) {
                Ok(sprints) => {
                    if cli.json {
                        println!("{}", serde_json::to_string_pretty(&sprints).unwrap());
                    } else {
                        let mut table = Table::new();
                        table.set_header(vec!["ID", "Name", "Status", "Start Date", "End Date"]);
                        for s in sprints {
                            table.add_row(vec![
                                &s.id[..s.id.len().min(8)],
                                &s.name,
                                &s.status,
                                &s.start_date,
                                &s.end_date,
                            ]);
                        }
                        println!("{}", table);
                    }
                }
                Err(e) => eprintln!("Error listing sprints: {}", e),
            }
        }
        Commands::Project(ProjectCommands::List) => match db.list_projects() {
            Ok(projects) => {
                if cli.json {
                    println!("{}", serde_json::to_string_pretty(&projects).unwrap());
                } else {
                    let mut table = Table::new();
                    table.set_header(vec!["ID", "Name", "Category", "Vault Path"]);
                    for p in projects {
                        table.add_row(vec![
                            &p.id[..p.id.len().min(8)],
                            &p.name,
                            p.category.as_deref().unwrap_or("-"),
                            p.vault_path.as_deref().unwrap_or("-"),
                        ]);
                    }
                    println!("{}", table);
                }
            }
            Err(e) => eprintln!("Error listing projects: {}", e),
        },
    }
}

fn print_tasks_table(tasks: &[Task]) {
    let mut table = Table::new();
    table.set_header(vec!["ID", "Status", "Priority", "Title", "Sprint ID"]);
    for t in tasks {
        let short_id = if t.id.len() >= 6 { &t.id[..6] } else { &t.id };
        let status_str = if t.completed { "[✓] Done" } else { &t.status };
        table.add_row(vec![
            short_id,
            status_str,
            &t.priority,
            &t.title,
            t.sprint_id.as_deref().unwrap_or("-"),
        ]);
    }
    println!("{}", table);
}
