pub mod app;
pub mod events;
pub mod ui;

use app::App;
use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, Terminal};
use std::io::{self, Stdout};
use std::path::PathBuf;
use std::time::Duration;
use taxon_core::db::TaxonDb;

pub fn run_tui(
    db: TaxonDb,
    project_id: Option<String>,
    vault_path: Option<PathBuf>,
) -> Result<(), Box<dyn std::error::Error>> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut app = App::new(db, project_id, vault_path);

    let res = run_app(&mut terminal, &mut app);

    // Restore terminal
    let _ = disable_raw_mode();
    let _ = execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    );
    let _ = terminal.show_cursor();

    if let Err(err) = res {
        eprintln!("TUI Error: {:?}", err);
    }

    Ok(())
}

fn run_app(
    terminal: &mut Terminal<CrosstermBackend<Stdout>>,
    app: &mut App,
) -> io::Result<()> {
    loop {
        app.tick();

        terminal.draw(|f| ui::render(f, app))?;

        if app.should_quit {
            return Ok(());
        }

        if let Some(file_to_edit) = app.suspend_for_editor.take() {
            // Suspend TUI and launch external editor
            let _ = disable_raw_mode();
            let mut stdout = io::stdout();
            let _ = execute!(
                stdout,
                LeaveAlternateScreen,
                DisableMouseCapture
            );

            let editor = std::env::var("EDITOR")
                .or_else(|_| std::env::var("VISUAL"))
                .unwrap_or_else(|_| "nano".to_string());

            let _ = std::process::Command::new(&editor)
                .arg(&file_to_edit)
                .status();

            let _ = enable_raw_mode();
            let mut stdout2 = io::stdout();
            let _ = execute!(
                stdout2,
                EnterAlternateScreen,
                EnableMouseCapture
            );
            terminal.clear()?;
            app.load_current_doc();
        }

        if event::poll(Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                events::handle_key(app, key);
            }
        }
    }
}
