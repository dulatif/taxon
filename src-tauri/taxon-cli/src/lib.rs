pub mod commands;
pub mod tui;

use clap::Parser;
use is_terminal::IsTerminal;
use std::path::PathBuf;
use taxon_core::db::TaxonDb;

#[derive(Parser, Debug)]
#[command(name = "taxon")]
#[command(version, about = "Taxon CLI companion & interactive TUI dashboard", long_about = None)]
pub struct Cli {
    #[arg(long, global = true, help = "Path to custom Taxon SQLite database")]
    pub db: Option<PathBuf>,

    #[arg(long, global = true, help = "Output results in JSON format")]
    pub json: bool,

    #[command(subcommand)]
    pub command: Option<commands::Commands>,
}

pub fn run_cli() {
    let cli = Cli::parse();

    let db = match &cli.db {
        Some(path) => match TaxonDb::open(path) {
            Ok(d) => d,
            Err(e) => {
                eprintln!("Error opening database: {}", e);
                std::process::exit(1);
            }
        },
        None => match TaxonDb::open_default() {
            Ok(d) => d,
            Err(e) => {
                eprintln!("Warning: {}", e);
                eprintln!("Attempting fallback to local database...");
                match TaxonDb::open(&PathBuf::from("taxon.db")) {
                    Ok(d) => d,
                    Err(_) => {
                        std::process::exit(1);
                    }
                }
            }
        },
    };

    match cli.command {
        None => {
            if std::io::stdout().is_terminal() {
                if let Err(e) = tui::run_tui(db, None, None) {
                    eprintln!("Error running TUI: {}", e);
                    std::process::exit(1);
                }
            } else {
                let _ = commands::project::handle(commands::project::ProjectCommands::List, &db, cli.json);
            }
        }
        Some(commands::Commands::Tui { project_id, path }) => {
            if let Err(e) = tui::run_tui(db, project_id, path) {
                eprintln!("Error running TUI: {}", e);
                std::process::exit(1);
            }
        }
        Some(commands::Commands::Task(task_cmd)) => {
            commands::task::handle(task_cmd, &db, cli.json);
        }
        Some(commands::Commands::Sprint(sprint_cmd)) => {
            commands::sprint::handle(sprint_cmd, &db, cli.json);
        }
        Some(commands::Commands::Project(project_cmd)) => {
            commands::project::handle(project_cmd, &db, cli.json);
        }
        Some(commands::Commands::Sync(sync_cmd)) => {
            commands::sync::handle(sync_cmd, &db, cli.json);
        }
        Some(commands::Commands::Vault(vault_cmd)) => {
            commands::vault::handle(vault_cmd, &db, cli.json);
        }
    }
}
