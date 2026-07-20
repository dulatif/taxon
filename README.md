<div align="center">
  <img width="200" alt="Taxon Logo" src="src/assets/logo.png" />
  <h1>Taxon</h1>
  <p>A local-first, privacy-focused task and project manager with Pomodoro tracking and local vault integration.</p>
</div>

## ✨ Features

- **Task & Sprint Management**: Organize your workflow with projects, sprints, and daily tasks.
- **Pomodoro Tracking**: Built-in Pomodoro timer to help you stay focused and manage work sessions.
- **Vault Integration**: Seamlessly connect and manage local file vaults (e.g., Obsidian vaults) within your projects.
- **Local-First & Privacy-Focused**: Your data stays on your machine. No cloud sync required, ensuring complete privacy.

## 🛠 Tech Stack

- **Frontend**: [React](https://reactjs.org/) & [Vite](https://vitejs.dev/)
- **Desktop Framework**: [Tauri](https://tauri.app/) (Rust)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Package Manager**: [pnpm](https://pnpm.io/)

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/installation)
- [Rust & Cargo](https://rustup.rs/) (Required for Tauri desktop builds)
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

To build the Tauri desktop application (for example, creating an RPM bundle):
```bash
pnpm tauri build --bundles rpm
```
*Note: Depending on your OS, you can specify different bundles (e.g., `deb`, `appimage`, `msi`, `app`).*

## 🔒 Data Privacy

Taxon is designed with privacy at its core. All your tasks, projects, and settings are stored locally on your device. There is no external database or telemetry, giving you complete control over your data.
