use std::sync::Mutex;
use std::time::Duration;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Emitter, Manager, State,
};
use tauri_plugin_sql::{Migration, MigrationKind};

struct BackupState {
    frequency: Mutex<String>,
}

#[tauri::command]
fn set_backup_frequency(frequency: String, state: State<'_, BackupState>) {
    let mut freq = state.frequency.lock().unwrap();
    *freq = frequency;
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: include_str!("../migrations/schema.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .manage(BackupState {
            frequency: Mutex::new("Never".to_string()),
        })
        .invoke_handler(tauri::generate_handler![set_backup_frequency])
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:taxon.db", migrations)
                .build(),
        )
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let quick_add =
                MenuItem::with_id(app, "quick_add", "Quick Add Task", true, None::<&str>)?;
            let start_focus =
                MenuItem::with_id(app, "start_focus", "Start Focus", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&quick_add, &start_focus, &quit])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quick_add" => {
                        app.emit("tray-quick-add", ()).unwrap();
                    }
                    "start_focus" => {
                        app.emit("tray-start-focus", ()).unwrap();
                    }
                    "quit" => {
                        std::process::exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            // TAXON-401 & TAXON-402: Background Backup Worker
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                loop {
                    // Test schedule: 10 seconds. In production, this would be an hour or a day.
                    tokio::time::sleep(Duration::from_secs(10)).await;
                    
                    let frequency = {
                        let state = app_handle.state::<BackupState>();
                        let f = state.frequency.lock().unwrap().clone();
                        f
                    };
                    
                    if frequency != "Never" {
                        let mut db_path_opt = None;
                        if let Ok(config_dir) = app_handle.path().app_config_dir() {
                            let p = config_dir.join("taxon.db");
                            if p.exists() {
                                db_path_opt = Some(p);
                            }
                        }
                        if db_path_opt.is_none() {
                            if let Ok(data_dir) = app_handle.path().app_data_dir() {
                                let p = data_dir.join("taxon.db");
                                if p.exists() {
                                    db_path_opt = Some(p);
                                }
                            }
                        }
                        if let Some(db_path) = db_path_opt {
                            if let Ok(app_data_dir) = app_handle.path().app_data_dir() {
                                let backup_dir = app_data_dir.join(".backup");
                                let _ = std::fs::create_dir_all(&backup_dir);
                                let timestamp = std::time::SystemTime::now()
                                    .duration_since(std::time::SystemTime::UNIX_EPOCH)
                                    .unwrap()
                                    .as_secs();
                                let backup_path = backup_dir.join(format!("taxon_{}.db.bak", timestamp));
                                let _ = std::fs::copy(&db_path, backup_path);
                            }
                        }
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
