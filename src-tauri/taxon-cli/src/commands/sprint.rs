use clap::Subcommand;
use comfy_table::Table;
use taxon_core::db::TaxonDb;
use taxon_core::models::Sprint;

#[derive(Subcommand, Debug, Clone)]
pub enum SprintCommands {
    /// List sprints
    List {
        #[arg(long, help = "Filter by project ID")]
        project_id: Option<String>,
    },
}

pub fn handle(cmd: SprintCommands, db: &TaxonDb, json: bool) {
    match cmd {
        SprintCommands::List { project_id } => {
            match db.list_sprints(project_id.as_deref()) {
                Ok(sprints) => {
                    if json {
                        println!("{}", serde_json::to_string_pretty(&sprints).unwrap());
                    } else {
                        print_sprints_table(&sprints);
                    }
                }
                Err(e) => eprintln!("Error listing sprints: {}", e),
            }
        }
    }
}

pub fn print_sprints_table(sprints: &[Sprint]) {
    let mut table = Table::new();
    table.set_header(vec!["ID", "Name", "Status", "Start Date", "End Date", "Goal"]);
    for s in sprints {
        table.add_row(vec![
            &s.id[..s.id.len().min(8)],
            &s.name,
            &s.status,
            &s.start_date,
            &s.end_date,
            s.goal.as_deref().unwrap_or("-"),
        ]);
    }
    println!("{}", table);
}
