// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use is_terminal::IsTerminal;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    let has_gui_flag = args.iter().any(|a| a == "--gui");
    let has_help_or_version = args.iter().any(|a| a == "-h" || a == "--help" || a == "-V" || a == "--version");
    let has_subcommand = args.len() > 1 && !has_gui_flag;

    if has_gui_flag || (!has_help_or_version && !has_subcommand && !std::io::stdout().is_terminal()) {
        taxon_lib::run();
    } else {
        taxon_cli::run_cli();
    }
}
