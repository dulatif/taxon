# Graph Report - taxon  (2026-09-02)

## Corpus Check
- 244 files · ~180,538 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1209 nodes · 2506 edges · 136 communities (54 shown, 73 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 49 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Tauri Window & UI Events
- SQLite Sync & Database Layer
- Initial Data & Constants
- Agent Sync & Import
- Tauri CLI Commands
- React App & Components
- Document Panel & Markdown
- Tauri Capabilities & Permissions
- Biome Linter Config
- Package & Build Config
- Tauri App Config
- Calendar View
- Tauri Dev Config
- Kanban & Projects View
- Technical Documentation
- TypeScript Config
- Custom Select & Project Detail
- Dashboard & Focus Mode
- Task List UI
- Task Filters & Utilities
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 73
- Community 74
- Community 75
- Community 76
- Community 77
- Community 78
- Community 79
- Community 80
- Community 81
- Community 82
- Community 83
- Community 84
- Community 85
- Community 86
- Community 87
- Community 88
- Community 89
- Community 90
- Community 91
- Community 92
- Community 93
- Community 94
- Community 95
- Community 96
- Community 97
- Community 98
- Community 99
- Community 100
- Community 101
- Community 102
- Community 103
- Community 104
- Community 105
- Community 106
- Community 107
- Community 112
- Community 115
- Community 116
- Community 117
- Community 118
- Community 119
- Community 120
- Community 121
- Community 122
- Community 123
- Community 124
- Community 125
- Community 126
- Community 127
- Community 128
- Community 129
- Community 130
- Community 131
- Community 132

## God Nodes (most connected - your core abstractions)
1. `Task` - 75 edges
2. `App` - 72 edges
3. `Project` - 56 edges
4. `TaxonDb` - 48 edges
5. `Sprint` - 44 edges
6. `permissions` - 31 edges
7. `useWorkspaceData()` - 27 edges
8. `initDb()` - 26 edges
9. `scripts` - 21 edges
10. `getTodayStr()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Taxon Local-First Principles` --semantically_similar_to--> `Local-First Privacy Architecture`  [INFERRED] [semantically similar]
  landing/index.html → README.md
- `AI Agent Live Sync Feature` --semantically_similar_to--> `TUI Sync Center (Tab 3)`  [INFERRED] [semantically similar]
  landing/index.html → docs/TECHNICAL_DOCUMENTATION.md
- `Release CI/CD Workflow` --references--> `Taxon Tech Stack`  [INFERRED]
  .github/workflows/release.yml → README.md
- `Desktop GUI Entry HTML` --conceptually_related_to--> `Taxon Tech Stack`  [INFERRED]
  index.html → README.md
- `Taxon Vector T Brandmark` --conceptually_related_to--> `Taxon Origami Dog App Icon (JPG)`  [INFERRED]
  src/assets/logo.png → app-icon.jpg

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Taxon Multi-Tier Core and Interface Architecture** — docs_technical_documentation_architecture, docs_technical_documentation_taxon_core, docs_technical_documentation_taxon_cli [INFERRED]
- **TUI Functional Workspace Tabs** — docs_technical_documentation_tui_spec, docs_technical_documentation_tab_tasks_sprints, docs_technical_documentation_tab_vault_browser, docs_technical_documentation_tab_sync_center, docs_technical_documentation_tab_pomodoro [INFERRED]
- **Local-First Privacy & Zero-Cloud Sync Paradigm** — readme_local_first_privacy, landing_index_local_first_principles, docs_technical_documentation_architecture [INFERRED]
- **Taxon Dashboard Theme Showcase** — landing_assets_dashboard_dark_mode_screenshot, landing_assets_dashboard_light_mode_screenshot, landing_assets_dashboard_dark_mode_obsidian_theme, landing_assets_dashboard_light_mode_light_theme [EXTRACTED 1.00]
- **Taxon Visual Brand Identity Assets** — app_icon_origami_dog_icon, app_icon_origami_dog_png, landing_app_icon_origami_dog_landing, src_assets_logo_vector_t_logo [INFERRED 0.95]
- **Tauri App Icon Asset Set** — src_tauri_icons_128x128_icon, src_tauri_icons_128x128_2x_icon, src_tauri_icons_32x32_icon, src_tauri_icons_64x64_icon, src_tauri_icons_square107x107logo_icon, src_tauri_icons_square142x142logo_icon, src_tauri_icons_square150x150logo_icon, src_tauri_icons_square284x284logo_icon, src_tauri_icons_square30x30logo_icon, src_tauri_icons_square310x310logo_icon, src_tauri_icons_square44x44logo_icon, src_tauri_icons_square71x71logo_icon, src_tauri_icons_square89x89logo_icon, src_tauri_icons_storelogo_icon, src_tauri_icons_icon_main_icon [INFERRED 0.95]
- **Android Mipmap Launcher Icons** — src_tauri_icons_android_mipmap_hdpi_ic_launcher, src_tauri_icons_android_mipmap_hdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_hdpi_ic_launcher_round, src_tauri_icons_android_mipmap_mdpi_ic_launcher, src_tauri_icons_android_mipmap_mdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_mdpi_ic_launcher_round, src_tauri_icons_android_mipmap_xhdpi_ic_launcher, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_xhdpi_ic_launcher_round, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_xxhdpi_ic_launcher_round, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_foreground, src_tauri_icons_android_mipmap_xxxhdpi_ic_launcher_round [EXTRACTED 1.00]
- **iOS Application Icons** — src_tauri_icons_ios_appicon_20x20_1x, src_tauri_icons_ios_appicon_20x20_2x_1, src_tauri_icons_ios_appicon_20x20_2x, src_tauri_icons_ios_appicon_20x20_3x, src_tauri_icons_ios_appicon_29x29_1x, src_tauri_icons_ios_appicon_29x29_2x_1, src_tauri_icons_ios_appicon_29x29_2x, src_tauri_icons_ios_appicon_29x29_3x, src_tauri_icons_ios_appicon_40x40_1x, src_tauri_icons_ios_appicon_40x40_2x_1, src_tauri_icons_ios_appicon_40x40_2x, src_tauri_icons_ios_appicon_40x40_3x, src_tauri_icons_ios_appicon_512_2x, src_tauri_icons_ios_appicon_60x60_2x, src_tauri_icons_ios_appicon_60x60_3x, src_tauri_icons_ios_appicon_76x76_1x, src_tauri_icons_ios_appicon_76x76_2x, src_tauri_icons_ios_appicon_83_5x83_5_2x [EXTRACTED 1.00]

## Communities (136 total, 73 thin omitted)

### Community 0 - "Tauri Window & UI Events"
Cohesion: 0.05
Nodes (56): Default, Frame, Instant, KeyEvent, Rect, App, DisplayTaskItem, filter_vault_entries() (+48 more)

### Community 1 - "SQLite Sync & Database Layer"
Cohesion: 0.07
Nodes (53): Connection, HashMap, Row, handle(), resolve_taxon_dir(), Option, Path, PathBuf (+45 more)

### Community 2 - "Initial Data & Constants"
Cohesion: 0.10
Nodes (51): futureDate(), generateWeeklyActivity(), INITIAL_DAILY_ACTIVITY, INITIAL_FILES, INITIAL_PROJECTS, INITIAL_SPRINTS, INITIAL_TASKS, useCategoryActions() (+43 more)

### Community 3 - "Agent Sync & Import"
Cohesion: 0.09
Nodes (48): extractErrorMessage(), useAgentSync(), loadSyncState(), AgentImportModal(), AgentImportModalProps, AuditLogModal(), AuditLogModalProps, AgentSyncPanel() (+40 more)

### Community 4 - "Tauri CLI Commands"
Cohesion: 0.06
Nodes (42): Commands, Option, PathBuf, String, handle(), print_projects_table(), ProjectCommands, Project (+34 more)

### Community 5 - "React App & Components"
Cohesion: 0.10
Nodes (36): App(), DatePicker(), DatePickerProps, PropertyCard(), PropertyCardProps, ActivityChart(), ActivityChartProps, SprintList() (+28 more)

### Community 6 - "Document Panel & Markdown"
Cohesion: 0.07
Nodes (28): DocumentPanel(), DocumentPanelProps, baseMarkdownComponents, MarkdownViewer(), MarkdownViewerProps, MermaidRenderer(), DEFAULT_SETTINGS, SettingsContext (+20 more)

### Community 7 - "Tauri Capabilities & Permissions"
Cohesion: 0.05
Nodes (36): core:default, core:window:allow-close, core:window:allow-maximize, core:window:allow-minimize, core:window:allow-set-decorations, core:window:allow-start-dragging, core:window:allow-start-resize-dragging, core:window:allow-toggle-maximize (+28 more)

### Community 8 - "Biome Linter Config"
Cohesion: 0.06
Nodes (30): source, assist, actions, css, parser, files, ignoreUnknown, includes (+22 more)

### Community 9 - "Package & Build Config"
Cohesion: 0.07
Nodes (30): lint-staged, src/**/*.css, src/**/*.{ts,tsx}, name, private, scripts, build, check-all (+22 more)

### Community 10 - "Tauri App Config"
Cohesion: 0.07
Nodes (28): rpm, debugApplicationIdSuffix, app, enableGTKAppId, security, windows, build, beforeBuildCommand (+20 more)

### Community 11 - "Calendar View"
Cohesion: 0.10
Nodes (18): CalendarView(), CalendarViewProps, DateFilterMode, DashboardView(), useAppNavigation(), useGlobalShortcuts(), UseGlobalShortcutsOptions, useSystemTray() (+10 more)

### Community 12 - "Tauri Dev Config"
Cohesion: 0.07
Nodes (27): debugApplicationIdSuffix, app, enableGTKAppId, security, windows, build, beforeBuildCommand, beforeDevCommand (+19 more)

### Community 13 - "Kanban & Projects View"
Cohesion: 0.14
Nodes (19): KanbanView(), KanbanViewProps, ProjectsView(), ProjectsViewProps, WorkflowToolbar(), WorkflowToolbarProps, nodeTypes, WorkflowCanvasProps (+11 more)

### Community 14 - "Technical Documentation"
Cohesion: 0.09
Nodes (24): Taxon Suite Architecture, Headless CLI Reference, SQLite Database Schema, TUI Keybindings Reference, Safe Sync COALESCE Preservation, TUI Pomodoro Focus Timer (Tab 4), TUI Sync Center (Tab 3), TUI Tasks & Sprints Dashboard (Tab 1) (+16 more)

### Community 15 - "TypeScript Config"
Cohesion: 0.08
Nodes (23): DOM, DOM.Iterable, ES2022, compilerOptions, allowImportingTsExtensions, forceConsistentCasingInFileNames, isolatedModules, jsx (+15 more)

### Community 16 - "Custom Select & Project Detail"
Cohesion: 0.20
Nodes (16): CustomSelect(), CustomSelectOption, CustomSelectProps, ProjectDetailView(), ProjectTabs(), ProjectTabsProps, TaskSortType, TaskTabType (+8 more)

### Community 17 - "Dashboard & Focus Mode"
Cohesion: 0.15
Nodes (14): DashboardViewProps, formatMinutes(), getTaskTimeBadge(), FocusModeView(), FocusModeViewProps, PRIORITY_CONFIG, PRIORITY_ORDER, PomodoroWidget() (+6 more)

### Community 18 - "Task List UI"
Cohesion: 0.14
Nodes (11): TaskEmptyState(), TaskEmptyStateProps, TaskListGroup(), TaskListGroupProps, TaskListHeader(), TaskListHeaderProps, TaskListItem(), TaskListItemProps (+3 more)

### Community 19 - "Task Filters & Utilities"
Cohesion: 0.18
Nodes (16): DueDateBadge(), DEFAULT_FILTERS, DueDateRangeKey, filterTasks(), getDueDateLabel(), getMonthEndStr(), getTodayStr(), getWeekEndStr() (+8 more)

### Community 20 - "Community 20"
Cohesion: 0.20
Nodes (11): SprintPanel(), SprintPanelProps, SprintCompleteModal(), SprintCompleteModalProps, SprintDatePicker(), SprintDatePickerProps, SprintFormModal(), SprintFormModalProps (+3 more)

### Community 21 - "Community 21"
Cohesion: 0.23
Nodes (10): ProjectDetailViewProps, FileNode(), FileNodeProps, filterEntries(), VaultFileTree(), VaultFileTreeProps, ProjectFiles(), ProjectFilesProps (+2 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (15): 128x128@2x Retina Application Icon, 128x128 Application Icon, 32x32 Application Icon, 64x64 Application Icon, Application Master Icon, Windows Square 107x107 Logo Icon, Windows Square 142x142 Logo Icon, Windows Square 150x150 Logo Icon (+7 more)

### Community 23 - "Community 23"
Cohesion: 0.30
Nodes (14): default_priority(), default_sprint_status(), default_status(), DiffItem, DiffKind, Project, Option, String (+6 more)

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (10): ProjectTaskList(), createProject(), createSprint(), createSubTask(), createTask(), createTasks(), uniqueId(), mockActiveSprint (+2 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (10): Button(), ButtonProps, ButtonSize, ButtonVariant, sizeStyles, variantStyles, TreeToolbar(), TreeToolbarProps (+2 more)

### Community 26 - "Community 26"
Cohesion: 0.28
Nodes (6): RecurrencePicker(), RecurrencePickerProps, ProjectCategory, RecurrenceFrequency, RecurrenceRule, calculateNextDueDate()

### Community 27 - "Community 27"
Cohesion: 0.21
Nodes (9): Sidebar(), SidebarProps, FOOTER_NAV_ITEMS, MAIN_NAV_ITEMS, NavigationList(), NavigationListProps, SidebarProjectList(), SidebarProjectListProps (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.27
Nodes (11): SubtaskList(), SubtaskListProps, addCriterionToDescription(), extractMainDescription(), extractSection(), parseChecklistItems(), TaskDetailView(), TaskDetailViewProps (+3 more)

### Community 29 - "Community 29"
Cohesion: 0.23
Nodes (10): ModuleGroupNode, ModuleGroupNodeData, TaskNodeData, buildTaskIdLookup(), getWorkflowElements(), TASK_NODE_HEIGHT_COLLAPSED, TASK_NODE_HEIGHT_NORMAL, TASK_NODE_WIDTH (+2 more)

### Community 30 - "Community 30"
Cohesion: 0.21
Nodes (11): Box, CrosstermBackend, Error, Option, PathBuf, Result, String, run_app() (+3 more)

### Community 31 - "Community 31"
Cohesion: 0.36
Nodes (9): addLog(), formatTime(), getStatusBadgeClass(), initScenario(), pauseSimulation(), playSimulation(), renderDAG(), renderFrontmatter() (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.31
Nodes (5): ConfirmDialog(), ConfirmDialogProps, AllProviders(), customRender(), WrapperProps

### Community 33 - "Community 33"
Cohesion: 0.22
Nodes (3): IRenderProps, IWhenProps, Render

### Community 34 - "Community 34"
Cohesion: 0.22
Nodes (9): autoprefixer, lint-staged, devDependencies, autoprefixer, lint-staged, @testing-library/jest-dom, @testing-library/react, @testing-library/jest-dom (+1 more)

### Community 35 - "Community 35"
Cohesion: 0.22
Nodes (9): dagre, lucide-react, dependencies, dagre, lucide-react, sonner, @tauri-apps/plugin-dialog, sonner (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.39
Nodes (7): extractMainDescription(), extractSection(), parseChecklistItems(), PRIORITY_BADGES, STATUS_BADGES, WorkflowSidebar, WorkflowSidebarProps

### Community 37 - "Community 37"
Cohesion: 0.29
Nodes (7): Daily Progress Focus Metrics UI, Obsidian Onyx Dark Theme, Pomodoro Timer Widget UI, Taxon Dashboard Dark Mode Screenshot, Daily and Overdue Task List UI, Precision Light Theme, Taxon Dashboard Light Mode Screenshot

### Community 38 - "Community 38"
Cohesion: 0.43
Nodes (5): Mutex, BackupState, String, set_backup_frequency(), State

### Community 39 - "Community 39"
Cohesion: 0.38
Nodes (5): CalendarGrid(), CalendarGridProps, SelectionMode, SelectionRange, WorkLogView()

### Community 40 - "Community 40"
Cohesion: 0.38
Nodes (5): PomodoroPhase, sendNotificationSafely(), useFocusTimer(), UseFocusTimerOptions, UseFocusTimerReturn

### Community 41 - "Community 41"
Cohesion: 0.40
Nodes (4): ADR-0003, PRIORITY_STYLES, STATUS_BADGE_STYLES, TaskNode

### Community 42 - "Community 42"
Cohesion: 0.47
Nodes (3): Repeater(), RepeaterProps, useRepeater()

### Community 43 - "Community 43"
Cohesion: 0.60
Nodes (3): AgentHeartbeatState, parseAgentFocusContent(), useAgentHeartbeat()

### Community 44 - "Community 44"
Cohesion: 0.60
Nodes (3): useWindowMaximize(), AppLayout(), AppLayoutProps

### Community 45 - "Community 45"
Cohesion: 0.50
Nodes (4): Taxon Origami Dog App Icon (JPG), Taxon Origami Dog App Icon (PNG), Landing Page App Icon, Taxon Vector T Brandmark

### Community 48 - "Community 48"
Cohesion: 0.67
Nodes (3): Graphify Knowledge Graph Rules, Graphify Agent Rule, Graphify Workflow

### Community 49 - "Community 49"
Cohesion: 0.67
Nodes (3): vite, vite, vite

### Community 50 - "Community 50"
Cohesion: 0.67
Nodes (3): taxon, taxon-cli, taxon-core

### Community 52 - "Community 52"
Cohesion: 0.67
Nodes (3): ic_launcher (mipmap-hdpi), ic_launcher_foreground (mipmap-hdpi), ic_launcher_round (mipmap-hdpi)

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (3): ic_launcher (mipmap-mdpi), ic_launcher_foreground (mipmap-mdpi), ic_launcher_round (mipmap-mdpi)

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (3): ic_launcher (mipmap-xhdpi), ic_launcher_foreground (mipmap-xhdpi), ic_launcher_round (mipmap-xhdpi)

### Community 55 - "Community 55"
Cohesion: 0.67
Nodes (3): ic_launcher (mipmap-xxhdpi), ic_launcher_foreground (mipmap-xxhdpi), ic_launcher_round (mipmap-xxhdpi)

### Community 56 - "Community 56"
Cohesion: 0.67
Nodes (3): ic_launcher (mipmap-xxxhdpi), ic_launcher_foreground (mipmap-xxxhdpi), ic_launcher_round (mipmap-xxxhdpi)

## Knowledge Gaps
- **333 isolated node(s):** `$schema`, `ignoreUnknown`, `src/**/*`, `**`, `!**/dist/**` (+328 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 408 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **73 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `TaxonDb` connect `SQLite Sync & Database Layer` to `Tauri Window & UI Events`, `Tauri CLI Commands`, `Community 30`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `App` connect `Tauri Window & UI Events` to `SQLite Sync & Database Layer`, `Community 30`, `Community 23`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `Project` connect `Kanban & Projects View` to `Initial Data & Constants`, `Agent Sync & Import`, `React App & Components`, `Document Panel & Markdown`, `Community 39`, `Calendar View`, `Custom Select & Project Detail`, `Dashboard & Focus Mode`, `Task List UI`, `Task Filters & Utilities`, `Community 21`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `$schema`, `ignoreUnknown`, `src/**/*` to the rest of the system?**
  _333 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Tauri Window & UI Events` be split into smaller, more focused modules?**
  _Cohesion score 0.05353535353535353 - nodes in this community are weakly interconnected._
- **Should `SQLite Sync & Database Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.07278481012658228 - nodes in this community are weakly interconnected._
- **Should `Initial Data & Constants` be split into smaller, more focused modules?**
  _Cohesion score 0.10338983050847457 - nodes in this community are weakly interconnected._