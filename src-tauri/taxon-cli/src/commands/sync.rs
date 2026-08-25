use clap::Subcommand;
use comfy_table::Table;
use std::path::{Path, PathBuf};
use taxon_core::db::TaxonDb;
use taxon_core::sync::{apply_two_way_sync, compute_sync_diff, export_to_taxon_files, import_from_taxon_files};

#[derive(Subcommand, Debug, Clone)]
pub enum SyncCommands {
    /// Show diff status between SQLite DB and .taxon files
    Status {
        #[arg(long, help = "Project ID")]
        project_id: Option<String>,
        #[arg(long, help = "Path to directory containing .taxon/ folder")]
        path: Option<PathBuf>,
    },
    /// Export SQLite records into .taxon/ markdown files
    Export {
        #[arg(long, help = "Project ID")]
        project_id: Option<String>,
        #[arg(long, help = "Path to directory containing .taxon/ folder")]
        path: Option<PathBuf>,
    },
    /// Import .taxon/ markdown files into SQLite DB
    Import {
        #[arg(long, help = "Project ID")]
        project_id: Option<String>,
        #[arg(long, help = "Path to directory containing .taxon/ folder")]
        path: Option<PathBuf>,
    },
    /// Apply two-way synchronization
    Apply {
        #[arg(long, help = "Project ID")]
        project_id: Option<String>,
        #[arg(long, help = "Path to directory containing .taxon/ folder")]
        path: Option<PathBuf>,
    },
}

pub fn resolve_taxon_dir(
    db: &TaxonDb,
    project_id: Option<&str>,
    explicit_path: Option<&Path>,
) -> Result<(String, PathBuf), String> {
    if let Some(p) = explicit_path {
        let taxon_dir = if p.ends_with(".taxon") {
            p.to_path_buf()
        } else {
            p.join(".taxon")
        };
        let pid = project_id.map(|s| s.to_string()).unwrap_or_else(|| {
            // Check project.md for ID
            let proj_md = taxon_dir.join("project.md");
            if let Ok(content) = std::fs::read_to_string(&proj_md) {
                if let Ok(proj) = taxon_core::sync::markdown_to_project(&content) {
                    return proj.id;
                }
            }
            "default_project".to_string()
        });
        return Ok((pid, taxon_dir));
    }

    // Try finding via current directory
    if let Ok(current_dir) = std::env::current_dir() {
        let local_taxon = current_dir.join(".taxon");
        if local_taxon.exists() {
            let pid = project_id.map(|s| s.to_string()).unwrap_or_else(|| {
                let proj_md = local_taxon.join("project.md");
                if let Ok(content) = std::fs::read_to_string(&proj_md) {
                    if let Ok(proj) = taxon_core::sync::markdown_to_project(&content) {
                        return proj.id;
                    }
                }
                "default_project".to_string()
            });
            return Ok((pid, local_taxon));
        }
    }

    // Try finding via project vault_path in DB
    if let Some(pid) = project_id {
        if let Ok(Some(proj)) = db.get_project(pid) {
            if let Some(vp) = proj.vault_path {
                let p = PathBuf::from(vp);
                let taxon_dir = if p.ends_with(".taxon") { p } else { p.join(".taxon") };
                return Ok((pid.to_string(), taxon_dir));
            }
        }
    }

    // Fallback to first project in DB
    if let Ok(projects) = db.list_projects() {
        if let Some(first) = projects.into_iter().find(|p| p.vault_path.is_some()) {
            let p = PathBuf::from(first.vault_path.unwrap());
            let taxon_dir = if p.ends_with(".taxon") { p } else { p.join(".taxon") };
            return Ok((first.id, taxon_dir));
        }
    }

    Err("Could not resolve .taxon folder. Please provide --path or run inside project directory.".to_string())
}

pub fn handle(cmd: SyncCommands, db: &TaxonDb, json: bool) {
    match cmd {
        SyncCommands::Status { project_id, path } => {
            match resolve_taxon_dir(db, project_id.as_deref(), path.as_deref()) {
                Ok((pid, taxon_dir)) => {
                    match compute_sync_diff(db, Some(&pid), &taxon_dir) {
                        Ok(diff) => {
                            if json {
                                println!("{}", serde_json::to_string_pretty(&diff).unwrap());
                            } else {
                                println!("Sync Status for Project '{}'", pid);
                                println!("Taxon Folder: {}", taxon_dir.display());
                                println!("DB: {} tasks, {} sprints | Files: {} tasks, {} sprints",
                                    diff.db_task_count, diff.db_sprint_count,
                                    diff.file_task_count, diff.file_sprint_count
                                );
                                if diff.items.is_empty() {
                                    println!("\nEverything is up to date. (0 differences)");
                                } else {
                                    println!("\nDifferences Found ({}):", diff.items.len());
                                    let mut table = Table::new();
                                    table.set_header(vec!["Type", "Action", "Title", "Summary"]);
                                    for item in diff.items {
                                        let kind_str = match item.kind {
                                            taxon_core::models::DiffKind::Added => "[+] Added",
                                            taxon_core::models::DiffKind::Modified => "[~] Modified",
                                            taxon_core::models::DiffKind::Deleted => "[-] Deleted",
                                            taxon_core::models::DiffKind::Conflict => "[!] Conflict",
                                        };
                                        table.add_row(vec![&item.entity_type, kind_str, &item.title, &item.summary]);
                                    }
                                    println!("{}", table);
                                }
                            }
                        }
                        Err(e) => eprintln!("Error computing diff: {}", e),
                    }
                }
                Err(e) => eprintln!("Error: {}", e),
            }
        }
        SyncCommands::Export { project_id, path } => {
            match resolve_taxon_dir(db, project_id.as_deref(), path.as_deref()) {
                Ok((pid, taxon_dir)) => {
                    match export_to_taxon_files(db, &pid, &taxon_dir) {
                        Ok(count) => {
                            if json {
                                println!("{{\"exported\": {}}}", count);
                            } else {
                                println!("Successfully exported {} item(s) to {}", count, taxon_dir.display());
                            }
                        }
                        Err(e) => eprintln!("Error exporting: {}", e),
                    }
                }
                Err(e) => eprintln!("Error: {}", e),
            }
        }
        SyncCommands::Import { project_id, path } => {
            match resolve_taxon_dir(db, project_id.as_deref(), path.as_deref()) {
                Ok((pid, taxon_dir)) => {
                    match import_from_taxon_files(db, &pid, &taxon_dir) {
                        Ok(count) => {
                            if json {
                                println!("{{\"imported\": {}}}", count);
                            } else {
                                println!("Successfully imported {} item(s) from {}", count, taxon_dir.display());
                            }
                        }
                        Err(e) => eprintln!("Error importing: {}", e),
                    }
                }
                Err(e) => eprintln!("Error: {}", e),
            }
        }
        SyncCommands::Apply { project_id, path } => {
            match resolve_taxon_dir(db, project_id.as_deref(), path.as_deref()) {
                Ok((pid, taxon_dir)) => {
                    match apply_two_way_sync(db, &pid, &taxon_dir) {
                        Ok(count) => {
                            if json {
                                println!("{{\"synced\": {}}}", count);
                            } else {
                                println!("Successfully applied two-way sync ({} items processed) at {}", count, taxon_dir.display());
                            }
                        }
                        Err(e) => eprintln!("Error applying sync: {}", e),
                    }
                }
                Err(e) => eprintln!("Error: {}", e),
            }
        }
    }
}
