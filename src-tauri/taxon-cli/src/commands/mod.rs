pub mod project;
pub mod sprint;
pub mod sync;
pub mod task;
pub mod vault;

use clap::Subcommand;
use std::path::PathBuf;

#[derive(Subcommand, Debug, Clone)]
pub enum Commands {
    /// Launch the interactive full-screen TUI dashboard
    Tui {
        #[arg(long, help = "Project ID to focus on")]
        project_id: Option<String>,
        #[arg(long, help = "Custom workspace / vault directory path")]
        path: Option<PathBuf>,
    },
    /// Task operations
    #[command(subcommand)]
    Task(task::TaskCommands),
    /// Sprint operations
    #[command(subcommand)]
    Sprint(sprint::SprintCommands),
    /// Project operations
    #[command(subcommand)]
    Project(project::ProjectCommands),
    /// Bidirectional .taxon file synchronization
    #[command(subcommand)]
    Sync(sync::SyncCommands),
    /// Obsidian vault document operations
    #[command(subcommand)]
    Vault(vault::VaultCommands),
}
