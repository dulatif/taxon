use clap::Subcommand;
use comfy_table::Table;
use taxon_core::db::TaxonDb;
use taxon_core::models::Project;

#[derive(Subcommand, Debug, Clone)]
pub enum ProjectCommands {
    /// List all projects
    List,
    /// Show details for a specific project
    Get {
        #[arg(help = "Project ID")]
        project_id: String,
    },
}

pub fn handle(cmd: ProjectCommands, db: &TaxonDb, json: bool) {
    match cmd {
        ProjectCommands::List => match db.list_projects() {
            Ok(projects) => {
                if json {
                    println!("{}", serde_json::to_string_pretty(&projects).unwrap());
                } else {
                    print_projects_table(&projects);
                }
            }
            Err(e) => eprintln!("Error listing projects: {}", e),
        },
        ProjectCommands::Get { project_id } => match db.get_project(&project_id) {
            Ok(Some(project)) => {
                if json {
                    println!("{}", serde_json::to_string_pretty(&project).unwrap());
                } else {
                    println!("Project: {}", project.name);
                    println!("ID: {}", project.id);
                    println!("Category: {}", project.category.as_deref().unwrap_or("-"));
                    println!("Progress: {}%", project.progress.unwrap_or(0));
                    println!("Vault Path: {}", project.vault_path.as_deref().unwrap_or("-"));
                    if let Some(desc) = project.description {
                        println!("\nDescription:\n{}", desc);
                    }
                }
            }
            Ok(None) => eprintln!("Project not found: {}", project_id),
            Err(e) => eprintln!("Error getting project: {}", e),
        },
    }
}

pub fn print_projects_table(projects: &[Project]) {
    let mut table = Table::new();
    table.set_header(vec!["ID", "Name", "Category", "Progress", "Vault Path"]);
    for p in projects {
        table.add_row(vec![
            &p.id[..p.id.len().min(8)],
            &p.name,
            p.category.as_deref().unwrap_or("-"),
            &format!("{}%", p.progress.unwrap_or(0)),
            p.vault_path.as_deref().unwrap_or("-"),
        ]);
    }
    println!("{}", table);
}
