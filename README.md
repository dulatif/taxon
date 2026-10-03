<div align="center">
  <img width="200" alt="Taxon Logo" src="src/assets/logo.png" />
  <h1>Taxon</h1>
  <p>A local-first, privacy-focused task and project manager with Pomodoro tracking and local vault integration.</p>
</div>

## ✨ Features

- **Task & Sprint Management**: Organize your workflow with projects, sprints, and daily tasks.
- **Interactive Terminal UI (TUI)**: Fast, keyboard-driven full-screen terminal companion (`taxon-cli`).
- **Pomodoro Tracking**: Built-in Pomodoro timer to help you stay focused and manage work sessions.
- **Vault Integration**: Seamlessly connect and manage local file vaults (e.g., Obsidian vaults) within your projects.
- **Bidirectional File Sync**: Automatic two-way synchronization between SQLite database and `.taxon/` markdown files.
- **Local-First & Privacy-Focused**: Your data stays on your machine. No cloud sync required, ensuring complete privacy.

## 🛠 Tech Stack

- **Frontend Desktop**: [React 18](https://reactjs.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/)
- **Desktop Framework**: [Tauri 2](https://tauri.app/) (Rust)
- **Terminal UI**: [Ratatui](https://ratatui.rs/) (Rust)
- **Database & Sync**: SQLite ([rusqlite](https://github.com/rusqlite/rusqlite)), YAML Frontmatter
- **Package Manager**: [pnpm](https://pnpm.io/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation)
- [Rust & Cargo](https://rustup.rs/) (Required for Tauri desktop & CLI builds)
- System dependencies for Tauri (see [Tauri Prerequisites](https://v2.tauri.app/start/prerequisites/))

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/dulatif/taxon.git
   cd taxon
   ```
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Install the CLI & TUI Companion:
   ```bash
   pnpm run cli:install
   ```

### Running the Terminal UI (TUI)

Launch the interactive Terminal User Interface:
```bash
taxon-cli
```

### Local Development

To start the local web development server using Vite:
```bash
pnpm dev
```

To start the Tauri desktop app in development mode:
```bash
pnpm tauri dev
```

### Building for Production

To build the Tauri desktop application:
```bash
pnpm tauri build
```

## 📖 Documentation

- **[GUI User Guide](docs/GUI_USER_GUIDE.md)**: Comprehensive manual for using the desktop GUI, Kanban boards, Pomodoro timer, DAG workflows, Git worktrees, and AI agent verification.
- **[Technical Architecture & TUI Documentation](docs/TECHNICAL_DOCUMENTATION.md)**: In-depth architecture specifications, database schemas, two-way sync algorithms, and headless CLI/TUI guides.

## 🔒 Data Privacy

Taxon is designed with privacy at its core. All your tasks, projects, and settings are stored locally on your device. There is no external database or telemetry, giving you complete control over your data.
