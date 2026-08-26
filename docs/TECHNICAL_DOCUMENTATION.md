# Taxon Technical Architecture & TUI Documentation

## 1. Overview & Architecture

Taxon is a local-first, privacy-focused task and project management suite consisting of a Tauri desktop GUI, a headless CLI companion, and an interactive Terminal User Interface (TUI).

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                TAXON SUITE                              │
├──────────────────────────┬──────────────────────────────────────────────┤
│  Frontend Desktop (GUI)  │  Terminal Ecosystem (CLI & TUI)             │
│  React 18 + Vite + Tauri │  taxon-cli (Ratatui 0.29 + Crossterm)        │
└────────────┬─────────────┴──────────────────────┬───────────────────────┘
             │                                    │
             ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                              taxon-core                                 │
│  • SQLite Database Engine (rusqlite)                                    │
│  • YAML / Frontmatter Parser & Markdown Serializer                      │
│  • Two-way Diffing & Sync Engine                                        │
│  • Vault Directory Scanner & Model Definitions                          │
└────────────────────────────┬────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         PERSISTENCE LAYERS                              │
│  1. SQLite DB: `~/.config/com.taxon.app/taxon.db` (Primary State)       │
│  2. Local File Vault: `<VaultPath>/.taxon/` (Markdown Files)            │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Crates & Modular Structure

### `taxon-core` (`src-tauri/taxon-core`)
Shared library powering data storage, data structures, and the file synchronization engine:
- **`db.rs`**: SQLite initialization, schema migrations (`ensure_tables`), CRUD queries for projects, tasks, and sprints.
- **`models.rs`**: Core domain types (`Project`, `Task`, `SubTask`, `Sprint`, `VaultEntry`, `SyncDiff`, `DiffItem`).
- **`sync.rs`**: YAML frontmatter serialization, two-way diff computation, export (`export_to_taxon_files`), import (`import_from_taxon_files`).
- **`vault.rs`**: Recursive file tree scanner (`read_vault_tree`) and document file reader.

### `taxon-cli` (`src-tauri/taxon-cli`)
Lightweight binary providing headless CLI commands and interactive full-screen TUI:
- **`src/tui/app.rs`**: Reactive TUI state container (`App`), filter engines, progress calculations, and action dispatchers.
- **`src/tui/ui.rs`**: Ratatui rendering engine (Header, Footer, Modals, Left/Right pane layouts).
- **`src/tui/events.rs`**: Crossterm event loop, keyboard shortcuts, auto-focus live search, modal event delegation.
- **`src/commands/`**: Headless CLI subcommands (`sync`, `tasks`, `sprints`, `vault`, `project`).

---

## 3. Database Schema & Data Integrity

### SQLite Tables (`taxon.db`)

#### `projects`
| Column | Type | Description |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | Unique identifier (e.g. `proj_1783077504863`) |
| `name` | `TEXT NOT NULL` | Human-readable project name |
| `description` | `TEXT` | Extended project description |
| `category` | `TEXT` | Category group (e.g. `Portfolio`, `Work`) |
| `progress` | `INTEGER` | Cached completion percentage (0-100) |
| `dueDays` | `INTEGER` | Target days remaining |
| `dueDate` | `TEXT` | Target completion date (YYYY-MM-DD) |
| `sortOrder` | `INTEGER` | Manual sort position |
| `vaultPath` | `TEXT` | Absolute path to local project vault |
| `workspacePaths` | `TEXT` (JSON) | Array of associated local code workspaces |
| `pinned` | `INTEGER` (0/1) | Whether project is pinned to top of sidebar |
| `pinnedSortOrder` | `INTEGER` | Sort order among pinned projects |

#### `tasks`
| Column | Type | Description |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | Alphanumeric ID (e.g. `task_tuic01` or `a1b2c3`) |
| `projectId` | `TEXT` | Foreign key to `projects.id` |
| `sprintId` | `TEXT` | Foreign key to `sprints.id` (NULL for backlog) |
| `title` | `TEXT NOT NULL` | Task summary title |
| `completed` | `INTEGER` | 0 (Incomplete) or 1 (Completed) |
| `priority` | `TEXT` | `Critical`, `High`, `Medium`, or `Low` |
| `status` | `TEXT` | `To Do`, `In Progress`, `Need to Test`, or `Done` |
| `description` | `TEXT` | Markdown body content |
| `dueDate` | `TEXT` | Target date (YYYY-MM-DD) |
| `labels` | `TEXT` (JSON) | Tag array |
| `subtasks` | `TEXT` (JSON) | Array of `{ id, title, completed }` |
| `moduleGroup` | `TEXT` | Module grouping for DAG view (e.g. `TUI Dashboard`) |
| `dependsOn` | `TEXT` (JSON) | Array of predecessor task IDs |

#### `sprints`
| Column | Type | Description |
|---|---|---|
| `id` | `TEXT PRIMARY KEY` | Unique sprint ID (e.g. `sprint_1787627tui07`) |
| `projectId` | `TEXT` | Foreign key to `projects.id` |
| `name` | `TEXT NOT NULL` | Sprint name (e.g. `Sprint 7`) |
| `status` | `TEXT` | `Active`, `Planned`, or `Completed` |
| `startDate` | `TEXT` | Start date (YYYY-MM-DD) |
| `endDate` | `TEXT` | Target completion date (YYYY-MM-DD) |
| `goal` | `TEXT` | Summary sprint objective |

### Safe Sync Configuration Preservation (`COALESCE`)
To prevent `.taxon/project.md` metadata imports from clearing local workspace or vault configurations, `upsert_project` executes non-destructive coalescing:
```sql
ON CONFLICT(id) DO UPDATE SET
   name = excluded.name,
   description = excluded.description,
   category = excluded.category,
   progress = excluded.progress,
   dueDays = COALESCE(excluded.dueDays, projects.dueDays),
   dueDate = COALESCE(excluded.dueDate, projects.dueDate),
   sortOrder = COALESCE(excluded.sortOrder, projects.sortOrder),
   vaultPath = COALESCE(excluded.vaultPath, projects.vaultPath),
   workspacePaths = COALESCE(excluded.workspacePaths, projects.workspacePaths),
   pinned = COALESCE(excluded.pinned, projects.pinned),
   pinnedSortOrder = COALESCE(excluded.pinnedSortOrder, projects.pinnedSortOrder)
```

---

## 4. Terminal User Interface (TUI) Specification

### Application Tabs

#### Tab 1: Tasks & Sprints Dashboard
- **Sprint Overview & Progress Card (Top)**:
  - Displays dynamic status badge (`[ACTIVE]`, `[PLANNED]`, `[BACKLOG]`, `[FULL SCOPE]`).
  - Sprint start/end dates with live remaining days countdown (e.g. `4d remaining` or `Overdue by 2d` in red).
  - Sprint goal statement.
  - Visual ASCII Progress Bar: `Progress: [■■■■········] 45% (9/20 Tasks)`.
- **Filtered Task List (Bottom Left)**:
  - Clean flat list matching the active sprint and status filters.
  - Status badges (`[To Do]`, `[In Prog]`, `[Test]`, `[Done]`), priority tags (`[Crit]`, `[High]`, `[Med]`, `[Low]`), and module group tags.
  - Rich empty states when no tasks match filters.
- **Task Details Inspector (Right)**:
  - Formatted title, ID, priority, status, module group, dependencies, labels, markdown description, and interactive subtask checklist.

#### Tab 2: Vault Browser
- **Left Pane (File Tree)**:
  - Recursive directory tree showing folders (`📁`) and markdown documents (`📄`).
  - **Auto-Focus Live Search**: Typing any character immediately opens the search bar and filters the file tree in real-time.
  - Arrow navigation (`↑`/`↓`) while searching; `Enter` to preview; `Esc` to clear search and restore directory tree.
- **Right Pane (Document Reader)**:
  - Real-time markdown document preview with scrolling (`j`/`k`).
  - `[e]` keystroke suspends the TUI and opens the file in `$EDITOR` (`nvim`, `nano`, `code`), returning seamlessly to TUI upon exit.

#### Tab 3: Sync Center
- **Two-Way Diff Inspection**:
  - Live table of differences between SQLite DB and `.taxon/` markdown files (`Added`, `Modified`, `Deleted`, `Conflict`).
  - `[y]` / `[Enter]` to apply two-way synchronization.
  - `[e]` to force export DB → `.taxon/`.
  - `[i]` to force import `.taxon/` → DB.
  - `[s]` to refresh diff.

#### Tab 4: Pomodoro Focus Timer
- **Live Header Indicator**:
  - Visible across all tabs: displays active timer ticking (`🍅 24:58 (Work)`) or paused status (`⏸ 25:00`).
- **Large Digital Clock Display**:
  - High-visibility stylized block numbers (`████`) rendering `MM:SS`.
  - Color-coded by phase (Work = Green/Red, Short Break = Cyan, Long Break = Blue).
- **Phases & Round Tracking**:
  - Work Focus (25m), Short Break (5m), Long Break (15m).
  - Round progress dots: `Session 2/4 : [ ●  ●  ○  ○ ]` (advances to Long Break after 4 sessions).
  - ASCII progress bar showing elapsed vs total duration.
- **Active Task Linking & Time Tracking**:
  - Shows linked task title, ID, status, priority, subtasks, and total time spent.
  - Automatically increments task's `timeSpent` in SQLite database every minute.
  - `[F]` keystroke from Tab 1 immediately links highlighted task and starts focus mode.
  - Task actions: `[u]` Unlink Task, `[c]` Mark Done, `[m]` Change Status.
- **Session Analytics**:
  - Tracks total completed pomodoros today and total focused hours/minutes.

---

## 5. Keyboard Navigation & Keybindings Reference

### Global Shortcuts (Any Tab)
| Shortcut | Action |
|---|---|
| `1`, `2`, `3`, `4` | Switch directly to Tab 1 (Tasks), Tab 2 (Vault), Tab 3 (Sync), Tab 4 (Pomodoro) |
| `[`, `]` | Quick cycle tabs backward / forward (matches GUI sidebar toggle) |
| `Tab` | Switch focus between Left and Right panes |
| `p`, `P`, `Ctrl+P` | Open Project Switcher modal with real-time search |
| `Alt+E` | Force Export SQLite DB → `.taxon/` files |
| `Alt+I` | Force Import `.taxon/` files → SQLite DB |
| `?` | Open Help dialog |
| `q`, `Ctrl+C` | Quit application |

### Tab 1 (Tasks & Sprints)
| Shortcut | Action |
|---|---|
| `↑` / `k`, `↓` / `j` | Navigate tasks list |
| `Space` | Toggle task completion (`Done` ↔ `To Do`) and auto-advance to next task |
| `F` (`Shift+F`) | Start Pomodoro Focus Session on highlighted task & switch to Tab 4 |
| `s`, `Alt+S` | Cycle sprint filter (`Active` → `Planned` → `Backlog` → `All`) |
| `S` (`Shift+S`) | Open interactive Sprint Selection modal |
| `f`, `Alt+F` | Cycle status filter (`All` → `In Progress` → `To Do` → `Need to Test` → `Done`) |
| `m` | Open Status Picker modal dialog |

### Tab 2 (Vault Browser)
| Shortcut | Action |
|---|---|
| *Any character* | Auto-activate search bar and live-filter vault tree |
| `/`, `Ctrl+F` | Focus search bar explicitly |
| `↑` / `↓` | Navigate filtered matches while searching |
| `Enter` | Confirm selection & load document preview |
| `Esc` | Clear search query and restore full vault tree |
| `e` | Suspend TUI and edit selected document in external `$EDITOR` |
| `j` / `k` (Right pane) | Scroll document preview text up / down |

### Tab 3 (Sync Center)
| Shortcut | Action |
|---|---|
| `y`, `Enter` | Apply two-way synchronization |
| `e` | Export database records to markdown |
| `i` | Import markdown files to database |
| `s` | Refresh diff status |

### Tab 4 (Pomodoro Focus Timer)
| Shortcut | Action |
|---|---|
| `Space` | Start / Pause session timer |
| `r`, `R` | Reset current timer |
| `s`, `n` | Skip to next phase (Work → Break) |
| `w`, `W` | Switch to Work phase (25m) |
| `b`, `B` | Switch to Short Break phase (5m) |
| `l` | Switch to Long Break phase (15m) |
| `u`, `U` | Unlink active task |
| `L` | Link highlighted task from Tab 1 |
| `c` | Mark linked task as Done |
| `m` | Change linked task status |
| `+` / `=` | Add 1 minute to current phase |
| `-` / `_` | Subtract 1 minute from current phase |

---

## 6. Headless CLI Reference

The `taxon-cli` binary supports scriptable automation:

```bash
# Launch interactive TUI
taxon-cli

# Project Commands
taxon-cli project list

# Task Commands
taxon-cli tasks list [--project-id <ID>] [--sprint-id <ID>] [--status <STATUS>] [--json]
taxon-cli tasks create "Implement auth flow" --priority High --status "To Do"
taxon-cli tasks complete "a1b2c3"

# Sprint Commands
taxon-cli sprints list [--project-id <ID>] [--json]

# Vault Commands
taxon-cli vault list [--path /path/to/vault] [--json]
taxon-cli vault cat "notes/architecture.md"

# Bidirectional Synchronization
taxon-cli sync status [--path /path/to/vault] [--json]
taxon-cli sync export [--path /path/to/vault]
taxon-cli sync import [--path /path/to/vault]
taxon-cli sync apply [--path /path/to/vault]
```
