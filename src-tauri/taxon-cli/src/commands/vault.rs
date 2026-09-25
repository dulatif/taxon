use clap::Subcommand;
use std::path::{Path, PathBuf};
use taxon_core::db::TaxonDb;
use taxon_core::models::VaultEntry;
use taxon_core::vault::{read_document, scan_vault};

#[derive(Subcommand, Debug, Clone)]
pub enum VaultCommands {
    /// List markdown documents in project Obsidian vault
    List {
        #[arg(long, help = "Project ID")]
        project_id: Option<String>,
        #[arg(long, help = "Path to vault directory")]
        path: Option<PathBuf>,
    },
    /// Print contents of a document from vault
    Cat {
        #[arg(help = "Path to markdown document")]
        file_path: PathBuf,
    },
}

pub fn resolve_vault_path(
    db: &TaxonDb,
    project_id: Option<&str>,
    explicit_path: Option<&Path>,
) -> Result<PathBuf, String> {
    if let Some(p) = explicit_path {
        if p.exists() {
            return Ok(p.to_path_buf());
        }
    }

    // Try finding via current directory
    if let Ok(current_dir) = std::env::current_dir() {
        if current_dir.join(".obsidian").exists() || current_dir.join(".taxon").exists() {
            return Ok(current_dir);
        }
    }

    // Try finding via project in DB
    if let Some(pid) = project_id {
        if let Ok(Some(proj)) = db.get_project(pid) {
            if let Some(vp) = proj.vault_path {
                let p = PathBuf::from(vp);
                if p.exists() {
                    return Ok(p);
                }
            }
        }
    }

    // Fallback to first project with vault_path in DB
    if let Ok(projects) = db.list_projects() {
        for proj in projects {
            if let Some(vp) = proj.vault_path {
                let p = PathBuf::from(vp);
                if p.exists() {
                    return Ok(p);
                }
            }
        }
    }

    Err("Could not locate Obsidian vault path. Please specify with --path flag.".to_string())
}

pub fn handle(cmd: VaultCommands, db: &TaxonDb, json: bool) {
    match cmd {
        VaultCommands::List { project_id, path } => {
            match resolve_vault_path(db, project_id.as_deref(), path.as_deref()) {
                Ok(vault_path) => match scan_vault(&vault_path) {
                    Ok(entries) => {
                        if json {
                            println!("{}", serde_json::to_string_pretty(&entries).unwrap());
                        } else {
                            println!("Vault Files in {}:", vault_path.display());
                            print_entries(&entries, 0);
                        }
                    }
                    Err(e) => eprintln!("Error scanning vault: {}", e),
                },
                Err(e) => eprintln!("Error: {}", e),
            }
        }
        VaultCommands::Cat { file_path } => match read_document(&file_path) {
            Ok(content) => {
                print!("{}", content);
            }
            Err(e) => eprintln!("Error reading document: {}", e),
        },
    }
}

fn print_entries(entries: &[VaultEntry], indent: usize) {
    let prefix = "  ".repeat(indent);
    for entry in entries {
        if entry.is_directory {
            println!("{}📁 {}/", prefix, entry.name);
            if let Some(ref children) = entry.children {
                print_entries(children, indent + 1);
            }
        } else {
            println!("{}📄 {}", prefix, entry.name);
        }
    }
}
