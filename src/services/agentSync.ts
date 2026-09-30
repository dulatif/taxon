import { exists, mkdir, readDir, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs';
import type { Project, Sprint, SubTask, Task } from '../types';
import type { AgentDiffResult, AgentSyncState, AuditLogEntry } from '../types/agent';
import { getTodayStr } from '../utils/format-date';
import { createLogEntry } from './activityLogger';
import { saveActivityLogEntry, saveAuditLogEntry, saveSprint, saveTask } from './database';

// AGENT-102: YAML frontmatter parser
function joinPath(parent: string, child: string): string {
  const cleanedParent = parent.replace(/[/\\]+$/, '');
  return `${cleanedParent}/${child}`;
}

export function parseFrontmatter(markdown: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    throw new Error('Invalid markdown: missing frontmatter');
  }

  const frontmatterStr = match[1] || '';
  const body = match[2] || '';
  const data: Record<string, unknown> = {};

  const lines = frontmatterStr.split(/\r?\n/);
  let currentArrayKey: string | null = null;

  for (const line of lines) {
    const listItemMatch = line.match(/^\s*-\s*(.*)$/);
    if (listItemMatch?.[1] !== undefined && currentArrayKey) {
      const itemVal = listItemMatch[1].trim().replace(/^['"]|['"]$/g, '');
      if (Array.isArray(data[currentArrayKey])) {
        (data[currentArrayKey] as string[]).push(itemVal);
      } else {
        data[currentArrayKey] = [itemVal];
      }
      continue;
    }

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      currentArrayKey = null;
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (value === '') {
      currentArrayKey = key;
      data[key] = '';
    } else if (value === 'true') {
      currentArrayKey = null;
      data[key] = true;
    } else if (value === 'false') {
      currentArrayKey = null;
      data[key] = false;
    } else if (!isNaN(Number(value)) && value !== '') {
      currentArrayKey = null;
      data[key] = Number(value);
    } else if (value.startsWith('[') && value.endsWith(']')) {
      currentArrayKey = null;
      const arrContent = value.slice(1, -1).trim();
      if (arrContent) {
        data[key] = arrContent.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      } else {
        data[key] = [];
      }
    } else {
      currentArrayKey = null;
      data[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }

  return { data, body };
}

export function serializeFrontmatter(data: Record<string, unknown>): string {
  let yaml = '---\n';
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      yaml += `${key}: [${value.join(', ')}]\n`;
    } else {
      yaml += `${key}: ${value}\n`;
    }
  }
  yaml += '---\n';
  return yaml;
}

// AGENT-103: Slugify and ID generation helpers
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 50);
}

export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8);
}

export function taskFilename(task: Task): string {
  const shortId = task.id.slice(-6);
  return `TASK-${shortId}-${slugify(task.title)}.md`;
}

export function sprintFilename(sprint: Sprint): string {
  const shortId = sprint.id.slice(-6);
  return `SPRINT-${shortId}-${slugify(sprint.name)}.md`;
}

export interface TaskMarkdownSections {
  description: string;
  deliverables?: string;
  acceptanceCriteria?: string;
  subtasks: SubTask[];
  customSections: { title: string; content: string }[];
}

export function extractTaskSections(body: string): TaskMarkdownSections {
  const sections: { title: string; content: string }[] = [];
  const lines = body.split(/\r?\n/);

  let currentTitle: string | null = null;
  let currentContentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.*)$/);
    if (headingMatch?.[1] !== undefined) {
      if (currentTitle !== null) {
        sections.push({
          title: currentTitle,
          content: currentContentLines.join('\n').trim(),
        });
      } else if (currentContentLines.some((l) => l.trim() !== '')) {
        sections.push({
          title: 'Description',
          content: currentContentLines.join('\n').trim(),
        });
      }
      currentTitle = headingMatch[1].trim();
      currentContentLines = [];
    } else {
      currentContentLines.push(line);
    }
  }

  if (currentTitle !== null) {
    sections.push({
      title: currentTitle,
      content: currentContentLines.join('\n').trim(),
    });
  } else if (currentContentLines.some((l) => l.trim() !== '')) {
    sections.push({
      title: 'Description',
      content: currentContentLines.join('\n').trim(),
    });
  }

  let description = '';
  let deliverables: string | undefined;
  let acceptanceCriteria: string | undefined;
  let subtasksText: string | undefined;
  const customSections: { title: string; content: string }[] = [];

  for (const section of sections) {
    const lowerTitle = section.title.toLowerCase();
    if (lowerTitle === 'description') {
      description = section.content;
    } else if (lowerTitle === 'deliverables') {
      deliverables = section.content;
    } else if (lowerTitle === 'acceptance criteria') {
      acceptanceCriteria = section.content;
    } else if (lowerTitle === 'subtasks') {
      subtasksText = section.content;
    } else {
      customSections.push(section);
    }
  }

  const subtasks: SubTask[] = [];
  if (subtasksText) {
    const subtaskLines = subtasksText.split(/\r?\n/);
    for (const line of subtaskLines) {
      const match = line.match(/^-\s*\[([ xX])\]\s+(.*)$/);
      if (match?.[1] && match?.[2]) {
        const title = match[2].trim();
        let hash = 0;
        for (let i = 0; i < title.length; i++) {
          hash = (Math.imul(31, hash) + title.charCodeAt(i)) | 0;
        }
        subtasks.push({
          id: `sub-${Math.abs(hash).toString(16).substring(0, 8)}`,
          title,
          completed: match[1].toLowerCase() === 'x',
        });
      }
    }
  }

  return {
    description,
    deliverables,
    acceptanceCriteria,
    subtasks,
    customSections,
  };
}

// AGENT-104: Task ↔ markdown serializer
export function taskToMarkdown(task: Task): string {
  const frontmatterData: Record<string, unknown> = {
    id: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    completed: task.completed,
    sprintId: task.sprintId,
    dueDate: task.dueDate,
    labels: task.labels,
    timeEffort: task.timeEffort,
    timeSpent: task.timeSpent,
    sortOrder: task.sortOrder,
    archived: task.archived,
    archivedAt: task.archivedAt,
    workspacePath: task.workspacePath,
    linkedFiles: task.linkedFiles,
    dependsOn: task.dependsOn,
    moduleGroup: task.moduleGroup,
    inputs: task.inputs,
    outputs: task.outputs,
    baseCommit: task.baseCommit,
    revisionCount: task.revisionCount,
    lastRevisionAt: task.lastRevisionAt,
    escalated: task.escalated,
  };

  let markdown = serializeFrontmatter(frontmatterData);

  const {
    description: descText,
    deliverables,
    acceptanceCriteria,
    customSections,
  } = extractTaskSections(task.description || '');

  markdown += '\n## Description\n\n';
  markdown += descText || '';
  markdown += '\n';

  if (deliverables !== undefined && deliverables !== '') {
    markdown += '\n## Deliverables\n\n';
    markdown += deliverables;
    markdown += '\n';
  }

  if (acceptanceCriteria !== undefined && acceptanceCriteria !== '') {
    markdown += '\n## Acceptance Criteria\n\n';
    markdown += acceptanceCriteria;
    markdown += '\n';
  }

  for (const custom of customSections) {
    if (custom.content) {
      markdown += `\n## ${custom.title}\n\n`;
      markdown += custom.content;
      markdown += '\n';
    }
  }

  markdown += '\n## Subtasks\n\n';

  if (task.subtasks && task.subtasks.length > 0) {
    for (const subtask of task.subtasks) {
      const checkbox = subtask.completed ? '[x]' : '[ ]';
      markdown += `- ${checkbox} ${subtask.title}\n`;
    }
  }

  return markdown;
}

export function markdownToTask(markdown: string, projectId: string): Task {
  const { data, body } = parseFrontmatter(markdown);

  const {
    description: descText,
    deliverables,
    acceptanceCriteria,
    subtasks,
    customSections,
  } = extractTaskSections(body);

  const descParts: string[] = [];
  if (descText) {
    descParts.push(descText);
  }
  if (deliverables !== undefined && deliverables !== '') {
    descParts.push(`## Deliverables\n${deliverables}`);
  }
  if (acceptanceCriteria !== undefined && acceptanceCriteria !== '') {
    descParts.push(`## Acceptance Criteria\n${acceptanceCriteria}`);
  }
  for (const custom of customSections) {
    if (custom.content) {
      descParts.push(`## ${custom.title}\n${custom.content}`);
    }
  }

  const description = descParts.join('\n\n');

  const parseArrayField = (val: unknown): string[] => {
    if (Array.isArray(val)) return val.map((item) => String(item).trim()).filter(Boolean);
    if (typeof val === 'string' && val.trim()) return [val.trim()];
    return [];
  };

  return {
    id: (data.id as string) || generateShortId(),
    projectId,
    title: (data.title as string) || 'Untitled Task',
    description,
    priority: (data.priority as Task['priority']) || 'Medium',
    status: (data.status as Task['status']) || 'To Do',
    completed: (data.completed as boolean) || false,
    sprintId: (data.sprintId as string) || undefined,
    dueDate: (data.dueDate as string) || undefined,
    labels: parseArrayField(data.labels),
    subtasks,
    duration: '',
    timeEffort: data.timeEffort as number | undefined,
    timeSpent: (data.timeSpent as number) || 0,
    sortOrder: (data.sortOrder as number) || 0,
    archived: (data.archived as boolean) || false,
    archivedAt: (data.archivedAt as string) || undefined,
    workspacePath: (data.workspacePath as string) || undefined,
    linkedFiles: parseArrayField(data.linkedFiles),
    dependsOn: parseArrayField(data.dependsOn),
    moduleGroup: (data.moduleGroup as string) || undefined,
    inputs: parseArrayField(data.inputs),
    outputs: parseArrayField(data.outputs),
    baseCommit: (data.baseCommit as string) || undefined,
    revisionCount: typeof data.revisionCount === 'number' ? data.revisionCount : undefined,
    lastRevisionAt: (data.lastRevisionAt as string) || undefined,
    escalated: typeof data.escalated === 'boolean' ? data.escalated : undefined,
  } as Task;
}

export const parseTaskMarkdown = markdownToTask;
export const exportTaskMarkdown = taskToMarkdown;

// AGENT-105: Sprint ↔ markdown serializer
export function sprintToMarkdown(sprint: Sprint, tasks: Task[]): string {
  const frontmatterData: Record<string, unknown> = {
    id: sprint.id,
    name: sprint.name,
    status: sprint.status,
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    completedAt: sprint.completedAt,
  };

  let markdown = serializeFrontmatter(frontmatterData);
  markdown += '\n## Goal\n\n';
  markdown += sprint.goal || '';
  markdown += '\n\n## Tasks\n\n';

  const sprintTasks = tasks.filter((t) => t.sprintId === sprint.id);
  const STATUS_ORDER: Task['status'][] = ['To Do', 'In Progress', 'Need to Test', 'Done'];

  for (const status of STATUS_ORDER) {
    const statusTasks = sprintTasks.filter((t) => t.status === status);
    if (statusTasks.length > 0) {
      markdown += `### ${status}\n`;
      for (const task of statusTasks) {
        markdown += `- [${task.priority || 'Medium'}] ${taskFilename(task)}\n`;
      }
      markdown += '\n';
    }
  }

  return markdown;
}

export function markdownToSprint(markdown: string, projectId: string): Sprint {
  const { data, body } = parseFrontmatter(markdown);

  const goalMatch = body.match(/## Goal\s*\n([\s\S]*?)(?:## Tasks|$)/);
  const goal = goalMatch?.[1]?.trim() ?? '';

  return {
    id: (data.id as string) || generateShortId(),
    projectId,
    name: (data.name as string) || 'Untitled Sprint',
    goal,
    status: (data.status as Sprint['status']) || 'Planned',
    startDate: (data.startDate as string) || getTodayStr(),
    endDate: (data.endDate as string) || getTodayStr(),
    completedAt: data.completedAt as string | undefined,
  } as Sprint;
}

// AGENT-106: Project metadata serializer
export function projectToMarkdown(project: Project, tasks?: Task[], sprints?: Sprint[]): string {
  const frontmatterData = {
    id: project.id,
    name: project.name,
    description: project.description,
    category: project.category,
    progress: project.progress,
    dueDate: project.dueDate,
  };

  let markdown = serializeFrontmatter(frontmatterData);

  if (tasks && sprints) {
    markdown += `\n## Tasks Index\n`;

    const activeTasks = tasks.filter((t) => !t.archived);
    if (activeTasks.length === 0) {
      markdown += `\n*No active tasks*\n`;
    } else {
      const priorityWeights: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };

      const sortedTasks = activeTasks.sort((a, b) => {
        const sprintA = sprints.find((s) => s.id === a.sprintId)?.name || 'Backlog';
        const sprintB = sprints.find((s) => s.id === b.sprintId)?.name || 'Backlog';

        if (sprintA === 'Backlog' && sprintB !== 'Backlog') return 1;
        if (sprintA !== 'Backlog' && sprintB === 'Backlog') return -1;
        if (sprintA !== sprintB) return sprintA.localeCompare(sprintB);

        const weightA = priorityWeights[a.priority] || 0;
        const weightB = priorityWeights[b.priority] || 0;
        return weightB - weightA;
      });

      markdown += `\n| ID | Title | Status | Priority | Sprint | File Path |`;
      markdown += `\n|---|---|---|---|---|---|\n`;

      for (const task of sortedTasks) {
        const sprintName = sprints.find((s) => s.id === task.sprintId)?.name || 'Backlog';
        const escapedTitle = task.title.replace(/\|/g, '\\|');
        const filePath = `.taxon/tasks/${taskFilename(task)}`;
        markdown += `| ${task.id} | ${escapedTitle} | ${task.status} | ${task.priority} | ${sprintName} | \`${filePath}\` |\n`;
      }
    }
  }

  return markdown;
}

export function markdownToProject(markdown: string): Partial<Project> {
  const { data } = parseFrontmatter(markdown);
  return {
    id: data.id as string,
    name: data.name as string,
    description: data.description as string,
    category: data.category as string,
    progress: data.progress as number,
    dueDate: data.dueDate as string | undefined,
  };
}

// AGENT-107: AGENTS.md and CLAUDE.md templates
export function generateAgentInstructions(project: Project): string {
  let workspacesSection = '';
  if (project.workspacePaths && project.workspacePaths.length > 0) {
    workspacesSection = `\n## Local Workspaces\nThis project spans the following local repositories:\n`;
    for (const p of project.workspacePaths) {
      workspacesSection += `- \`${p}\`\n`;
    }
    workspacesSection += `\n**Agent Instruction**: You are authorized to freely read, explore, and modify code within any of the above local repositories to accomplish your assigned tasks.\n`;
  }

  return `# Taxon Project — AI Agent Integration

This directory is managed by **Taxon**, a project & task management app.
Task data is synced via files in the \`.taxon/\` directory.

Project Name: ${project.name}
${workspacesSection}
## Directory Structure
- \`.taxon/project.md\` — Project metadata (read-only context)
- \`.taxon/tasks/\` — One markdown file per task
- \`.taxon/sprints/\` — One markdown file per sprint

## How to Work With Tasks

### Reading Tasks
All task files are stored in \`.taxon/tasks/\`[cite: 1].
- **Efficiency Rule**: ALWAYS read \`.taxon/project.md\` first to get an index of all tasks, their statuses, and IDs[cite: 1].
- DO NOT list or scan all files in \`.taxon/tasks/\` blindly[cite: 1].
- Use the \`File Path\` provided in \`.taxon/project.md\` to open only the specific task file you need[cite: 1].

### Creating New Tasks (Task Contracts)
Create a new \`.md\` file in \`.taxon/tasks/\` with this format:
- Filename: \`TASK-{6-char-id}-{slugified-title}.md\`
- Generate a unique 6-character alphanumeric ID (e.g. \`a1b2c3\`)
- Required frontmatter: \`id\`, \`title\`, \`priority\`, \`status\`
- Workflow frontmatter: \`moduleGroup\`, \`dependsOn\`, \`inputs\`, \`outputs\`, \`linkedFiles\`
- Valid priorities: \`Critical\`, \`High\`, \`Medium\`, \`Low\`
- Valid statuses: \`To Do\`, \`In Progress\`, \`Need to Test\`, \`Done\`

**Task Contract & Workflow Fields**:
- \`moduleGroup\`: Short architectural category (e.g., "Frontend UI", "Database", "Authentication", "API"). Cluster into **2 to 4 module groups per sprint**.
- \`dependsOn\`: Array of prerequisite task IDs that must be completed before starting this task.
- \`inputs\`: Array of prerequisite files, contracts, or parent task files the agent must read before coding.
- \`outputs\`: Array of target file paths to be created or modified by this task.
- \`linkedFiles\`: Array of relevant workspace file paths.

Example Task Contract File:
\`\`\`markdown
---
id: a1b2c3
title: Implement Login Screen
priority: High
status: To Do
completed: false
sprintId: sp1234
moduleGroup: Authentication
dependsOn:
  - x9y8z7
inputs:
  - docs/contracts/auth-ipc.md
  - .taxon/tasks/TASK-x9y8z7-auth-ipc.md
outputs:
  - src/components/LoginScreen.tsx
  - src/hooks/useAuth.ts
linkedFiles:
  - src/components/LoginScreen.tsx
labels:
  - frontend
  - auth
---
## Description
Implement the login screen using React Hook Form and connect to IPC auth service.

## Deliverables
<!-- Filled upon completion -->
- [LoginScreen.tsx](file:///mnt/Linux/Projects/taxon/src/components/LoginScreen.tsx): UI component with validation.
- [useAuth.ts](file:///mnt/Linux/Projects/taxon/src/hooks/useAuth.ts): Hook binding IPC auth events.

## Acceptance Criteria
- [ ] Renders email and password fields with validation.
- [ ] Error messages display on invalid credentials.
- [ ] Successfully invokes IPC login command on submit.

## Subtasks
- [ ] Create form component
- [ ] Add validation
- [ ] Connect to IPC API
\`\`\`

### Modifying Tasks
Edit the frontmatter fields or markdown body directly.
- To complete a task: set \`completed: false\` and \`status: Need to Test\`. AI agents MUST NOT set status to 'Done'.
- To archive: set \`archived: true\`.
- To assign to a sprint: add the sprint's ID to \`sprintId\`. Leave empty or omit for backlog tasks.

### Creating Sprints
Create a new \`.md\` file in \`.taxon/sprints/\`:
- Filename: \`SPRINT-{6-char-id}-{slugified-name}.md\`
- Required frontmatter: \`id\`, \`name\`, \`status\`, \`startDate\`, \`endDate\`
- Valid statuses: \`Planned\`, \`Active\`
- Dates must be YYYY-MM-DD strings (e.g. \`2024-01-01\`)
- List task filenames under \`## Tasks\`
- Set each task's \`sprintId\` in its frontmatter to match this sprint's \`id\`.

### Git Commit Task References
- Reference tasks in git commits using \`(TASK-{6-char-id})\` or \`TASK-{6-char-id}\` in commit messages.
- Example: \`feat(auth): implement login flow (TASK-a1b2c3)\`
- Installing the post-commit git hook (\`.taxon/hooks/post-commit\`) will automatically mark the task as 'Need to Test' in Taxon upon commit!

### Common Mistakes / Rules
- **DO NOT** delete task files to delete tasks. Instead, mark unwanted tasks as \`archived: true\`.
- **DO NOT** modify \`project.md\` (it is treated as read-only context).
- Ensure YAML syntax is strictly valid.
- Subtasks must strictly use the format \`- [ ] Title\` or \`- [x] Title\`.
- IDs must be unique across all tasks/sprints in the entire database, so use truly random alphanumeric strings.
- You can optionally set \`workspacePath\` to one of the project's Local Workspaces, and \`linkedFiles\` to an array of relative file paths within that workspace to point to specific code.
- Version: 1.0.0

### Tidying Legacy Tasks (Workflow & DAG)
**Mandatory Step 1 for Sprints**: Before writing any code for an active sprint, you MUST inspect all tasks in that sprint. If they lack workflow metadata (\`moduleGroup\` or \`dependsOn\`), you must tidy and organize them first.
**Scope Restriction**: Only tidy tasks within the active sprint. Do NOT modify backlog tasks or tasks outside the current sprint to avoid massive unnecessary edits.

When organizing tasks:
1. **Module Groups (\`moduleGroup\` field)**: Dynamically assign \`moduleGroup\` names based on the technical context of the task (e.g., "Frontend UI", "Database", "Authentication", "API"). **Cluster related tasks together so the sprint has only 2 to 4 module groups total**. Never create a single-use \`moduleGroup\` for just one task unless it is completely isolated.
2. **Dependencies (\`dependsOn\` field)**: Infer logical sequential dependencies based on technical architecture. If Task A (e.g., building an API) must logically precede Task B (e.g., building the UI for that API), add Task A's ID to the \`dependsOn\` array in Task B's frontmatter.
   Example:
   \`\`\`yaml
   moduleGroup: Authentication
   dependsOn:
     - TASK-a1b2c3
   \`\`\`
3. Use your best judgment to create a natural, top-to-bottom execution flow. Do not leave tasks entirely orphaned if they logically belong to a sequence.

### Artifact Chaining & Task Execution Protocol

1. **Read Prerequisites**: Before writing code for any task, read all files listed in \`inputs\` and review the \`## Deliverables\` section of parent tasks listed in \`dependsOn\`.
2. **Blocker Check**:
   - If working autonomously: Find the highest priority task in \`To Do\` where ALL \`dependsOn\` tasks have status \`Need to Test\` or \`Done\`.
   - If assigned a specific task ID: Verify that all \`dependsOn\` tasks are already \`Need to Test\` or \`Done\`. If any blocker is \`To Do\` or \`In Progress\`, **REFUSE** to implement and warn the user about the unresolved dependency.
3. **Fulfill Acceptance Criteria**: Implement code following the \`## Acceptance Criteria\` checklist.
4. **Record Deliverables**: When finished, populate the task's \`## Deliverables\` section with file links, check off completed acceptance criteria, and set \`status: Need to Test\`.

### Multi-Agent Parallel Execution Protocol

When multiple AI coding agents (or subagents) work concurrently on a project:
1. **DAG Graph Independence**: Agents may only work in parallel on tasks from different branches of the DAG. A task is eligible for execution only when all tasks in its \`dependsOn\` array are already \`Need to Test\` or \`Done\`.
2. **Disjoint File Boundaries**: Before starting, verify that the task's \`outputs\` and \`linkedFiles\` do not overlap with any other concurrently running task. If two tasks touch the same files, they must be executed sequentially.
3. **Task Status Locking**: An agent starting work on a task should mark the task as \`status: In Progress\` to signal other agents that the task is actively being handled.
4. **Git Branch / Worktree Isolation**: If using multiple agents with autonomous git commit capabilities, use isolated git worktrees or branches per agent to prevent merge conflicts before integrating into the main branch.
5. **Completion & Sync**: Upon completion, populate \`## Deliverables\`, check off \`Acceptance Criteria\`, and set \`status: Need to Test\`. Never set \`status: Done\`.
`;
}

export function generatePostCommitHook(): string {
  return `#!/bin/bash
# Taxon Auto-Sync Git Hook
# Automatically completes tasks referenced in commit messages like (TASK-abc123)

COMMIT_MSG_FILE=\${1}
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE" 2>/dev/null || git log -1 --pretty=%B)

# Extract task IDs matching (TASK-XXXXXX) or TASK-XXXXXX
TASK_IDS=$(echo "$COMMIT_MSG" | grep -oE 'TASK-[a-zA-Z0-9]{6}' | sort -u)

if [ -z "$TASK_IDS" ]; then
  exit 0
fi

# Locate Taxon SQLite database
DB_PATH=""
if [ -f "$HOME/.config/com.taxon.app/taxon.db" ]; then
  DB_PATH="$HOME/.config/com.taxon.app/taxon.db"
elif [ -f "$HOME/.config/com.taxon.dev/taxon.db" ]; then
  DB_PATH="$HOME/.config/com.taxon.dev/taxon.db"
elif [ -f "$HOME/.config/com.tauri.dev/taxon.db" ]; then
  DB_PATH="$HOME/.config/com.tauri.dev/taxon.db"
elif [ -f "$HOME/Library/Application Support/com.taxon.app/taxon.db" ]; then
  DB_PATH="$HOME/Library/Application Support/com.taxon.app/taxon.db"
elif [ -f "$HOME/Library/Application Support/com.taxon.dev/taxon.db" ]; then
  DB_PATH="$HOME/Library/Application Support/com.taxon.dev/taxon.db"
fi

if [ -z "$DB_PATH" ] || ! command -v sqlite3 &> /dev/null; then
  exit 0
fi

for FULL_ID in $TASK_IDS; do
  SHORT_ID=\${FULL_ID#TASK-}
  sqlite3 "$DB_PATH" "UPDATE tasks SET completed = 0, status = 'Need to Test', dueDate = CASE WHEN dueDate IS NULL OR dueDate = '' THEN date('now') ELSE dueDate END WHERE id LIKE '%$SHORT_ID%';" 2>/dev/null
done
`;
}

export function generateClaudeMdPointer(): string {
  return `See AGENTS.md for project task integration instructions.\n`;
}

export async function exportProjectToAgent(
  project: Project,
  tasks: Task[],
  sprints: Sprint[],
  vaultPath: string,
): Promise<AgentSyncState> {
  const taxonPath = joinPath(vaultPath, '.taxon');
  const tasksPath = joinPath(taxonPath, 'tasks');
  const sprintsPath = joinPath(taxonPath, 'sprints');
  const logsPath = joinPath(taxonPath, 'logs');

  await mkdir(taxonPath, { recursive: true }).catch(() => {});
  await mkdir(tasksPath, { recursive: true }).catch(() => {});
  await mkdir(sprintsPath, { recursive: true }).catch(() => {});
  await mkdir(logsPath, { recursive: true }).catch(() => {});

  const projectTasks = tasks.filter(
    (t) => t.projectId === project.id && !t.archived && !t.completed && t.status !== 'Done',
  );
  const projectSprints = sprints.filter((s) => s.projectId === project.id);

  await writeTextFile(
    joinPath(taxonPath, 'project.md'),
    projectToMarkdown(project, projectTasks, projectSprints),
  );

  let exportedTaskCount = 0;
  for (const task of projectTasks) {
    const filePath = joinPath(tasksPath, taskFilename(task));
    await writeTextFile(filePath, taskToMarkdown(task));
    exportedTaskCount++;
  }

  // Clean up obsolete task files in .taxon/tasks
  const existingTaskEntries = await readDir(tasksPath).catch(() => []);
  const validTaskFiles = new Set(projectTasks.map((t) => taskFilename(t)));
  for (const entry of existingTaskEntries) {
    if (
      !entry.isDirectory &&
      entry.name.toLowerCase().endsWith('.md') &&
      !validTaskFiles.has(entry.name)
    ) {
      await remove(joinPath(tasksPath, entry.name)).catch(() => {});
    }
  }

  let exportedSprintCount = 0;
  for (const sprint of projectSprints) {
    const filePath = joinPath(sprintsPath, sprintFilename(sprint));
    await writeTextFile(filePath, sprintToMarkdown(sprint, projectTasks));
    exportedSprintCount++;
  }

  // Clean up obsolete sprint files in .taxon/sprints
  const existingSprintEntries = await readDir(sprintsPath).catch(() => []);
  const validSprintFiles = new Set(projectSprints.map((s) => sprintFilename(s)));
  for (const entry of existingSprintEntries) {
    if (
      !entry.isDirectory &&
      entry.name.toLowerCase().endsWith('.md') &&
      !validSprintFiles.has(entry.name)
    ) {
      await remove(joinPath(sprintsPath, entry.name)).catch(() => {});
    }
  }

  // Export Daily Work Logs to Second Brain
  const { getActivityLog } = await import('./database');
  const activityLog = await getActivityLog();
  const taskCompletionMap = new Map<string, string>();
  for (const log of activityLog) {
    taskCompletionMap.set(log.taskId, log.completedAt);
  }

  const completedTasks = projectTasks.filter((t) => t.completed && taskCompletionMap.has(t.id));
  const tasksByDate = completedTasks.reduce(
    (acc, t) => {
      const completedAt = taskCompletionMap.get(t.id);
      if (!completedAt) return acc;
      const dateStr = completedAt.split('T')[0];
      if (!dateStr) return acc;
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(t);
      return acc;
    },
    {} as Record<string, Task[]>,
  );

  for (const [dateStr, dateTasks] of Object.entries(tasksByDate)) {
    const logPath = joinPath(logsPath, `${dateStr}.md`);
    let content = `# Work Log: ${dateStr}\n\n`;
    content += `**Total Tasks Completed:** ${dateTasks.length}\n\n`;
    content += `## Completed Tasks\n\n`;
    for (const t of dateTasks) {
      content += `- [x] ${t.title} (Time spent: ${t.timeSpent || 0}m)\n`;
    }
    await writeTextFile(logPath, content);
  }

  const hooksPath = joinPath(taxonPath, 'hooks');
  await mkdir(hooksPath, { recursive: true });
  await writeTextFile(joinPath(hooksPath, 'post-commit'), generatePostCommitHook());

  await writeTextFile(joinPath(vaultPath, 'AGENTS.md'), generateAgentInstructions(project));
  await writeTextFile(joinPath(vaultPath, 'CLAUDE.md'), generateClaudeMdPointer());

  return {
    lastExportedAt: new Date().toISOString(),
    lastImportedAt: null,
    exportedTaskCount,
    exportedSprintCount,
  };
}

export async function scanAgentDirectory(
  vaultPath: string,
  projectId: string,
): Promise<{ tasks: Task[]; sprints: Sprint[]; warnings: string[] }> {
  const taxonPath = joinPath(vaultPath, '.taxon');
  const tasksPath = joinPath(taxonPath, 'tasks');
  const sprintsPath = joinPath(taxonPath, 'sprints');

  const tasks: Task[] = [];
  const sprints: Sprint[] = [];
  const warnings: string[] = [];

  const taxonExists = await exists(taxonPath).catch(() => false);
  if (!taxonExists) {
    return { tasks, sprints, warnings };
  }

  const seenTaskIds = new Map<string, { task: Task; filename: string }>();
  const tasksExists = await exists(tasksPath).catch(() => false);
  if (tasksExists) {
    const entries = await readDir(tasksPath).catch(() => []);
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (!entry.isDirectory && entry.name.toLowerCase().endsWith('.md')) {
        try {
          const filePath = joinPath(tasksPath, entry.name);
          const content = await readTextFile(filePath);
          const task = markdownToTask(content, projectId);
          const canonicalName = taskFilename(task);

          if (seenTaskIds.has(task.id)) {
            const existing = seenTaskIds.get(task.id)!;
            // If current file is the canonical name, replace the stale one and remove stale file from disk
            if (entry.name === canonicalName && existing.filename !== canonicalName) {
              await remove(joinPath(tasksPath, existing.filename)).catch(() => {});
              seenTaskIds.set(task.id, { task, filename: entry.name });
              const idx = tasks.findIndex((t) => t.id === task.id);
              if (idx !== -1) tasks[idx] = task;
            } else if (existing.filename === canonicalName) {
              // Existing is canonical, entry is stale — silently clean up stale file
              await remove(filePath).catch(() => {});
            } else {
              warnings.push(
                `Duplicate task ID '${task.id}' found — using first found, skipping ${entry.name}`,
              );
            }
            continue;
          }

          seenTaskIds.set(task.id, { task, filename: entry.name });
          tasks.push(task);
        } catch {
          warnings.push(`Failed to parse task file: ${entry.name}`);
        }
      }
    }
  }

  const seenSprintIds = new Map<string, { sprint: Sprint; filename: string }>();
  const sprintsExists = await exists(sprintsPath).catch(() => false);
  if (sprintsExists) {
    const entries = await readDir(sprintsPath).catch(() => []);
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (!entry.isDirectory && entry.name.toLowerCase().endsWith('.md')) {
        try {
          const filePath = joinPath(sprintsPath, entry.name);
          const content = await readTextFile(filePath);
          const sprint = markdownToSprint(content, projectId);
          const canonicalName = sprintFilename(sprint);

          if (seenSprintIds.has(sprint.id)) {
            const existing = seenSprintIds.get(sprint.id)!;
            if (entry.name === canonicalName && existing.filename !== canonicalName) {
              await remove(joinPath(sprintsPath, existing.filename)).catch(() => {});
              seenSprintIds.set(sprint.id, { sprint, filename: entry.name });
              const idx = sprints.findIndex((s) => s.id === sprint.id);
              if (idx !== -1) sprints[idx] = sprint;
            } else if (existing.filename === canonicalName) {
              await remove(filePath).catch(() => {});
            } else {
              warnings.push(
                `Duplicate sprint ID '${sprint.id}' found — using first found, skipping ${entry.name}`,
              );
            }
            continue;
          }

          seenSprintIds.set(sprint.id, { sprint, filename: entry.name });
          sprints.push(sprint);
        } catch {
          warnings.push(`Failed to parse sprint file: ${entry.name}`);
        }
      }
    }
  }

  return { tasks, sprints, warnings };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if ((a === undefined && b === null) || (a === null && b === undefined)) return true;

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
        return false;
      }
    }
    return true;
  }
  return false;
}

function getChangedFields<T extends Record<string, unknown>>(before: T, after: T): string[] {
  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (key === 'updatedAt' || key === 'createdAt') continue;
    if (!deepEqual(before[key], after[key])) {
      changed.push(key);
    }
  }
  return changed;
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    description: task.description || '',
    labels: task.labels || [],
    subtasks: task.subtasks || [],
    duration: task.duration || '',
    timeSpent: task.timeSpent || 0,
    sortOrder: task.sortOrder || 0,
    archived: task.archived || false,
    dueDate: task.dueDate || undefined,
    workspacePath: task.workspacePath || undefined,
    linkedFiles: task.linkedFiles || [],
    dependsOn: task.dependsOn || [],
    moduleGroup: task.moduleGroup || undefined,
    inputs: task.inputs || [],
    outputs: task.outputs || [],
    baseCommit: task.baseCommit || undefined,
  };
}

function normalizeSprint(sprint: Sprint): Sprint {
  return {
    ...sprint,
    goal: sprint.goal || '',
    completedAt: sprint.completedAt || undefined,
  };
}

export interface DiffAgentChangesOptions {
  allowStatusRegression?: boolean;
}

export function diffAgentChanges(
  projectId: string,
  allTasks: Task[],
  allSprints: Sprint[],
  agentTasks: Task[],
  agentSprints: Sprint[],
  options?: DiffAgentChangesOptions,
): AgentDiffResult {
  const newTasks: Task[] = [];
  const modifiedTasks: { before: Task; after: Task; changedFields: string[] }[] = [];
  const newSprints: Sprint[] = [];
  const modifiedSprints: { before: Sprint; after: Sprint; changedFields: string[] }[] = [];
  const warnings: string[] = [];

  const allTasksMap = new Map(allTasks.map((t) => [t.id, t]));
  const allSprintsMap = new Map(allSprints.map((s) => [s.id, s]));

  const isDev =
    options?.allowStatusRegression !== undefined
      ? options.allowStatusRegression
      : (import.meta.env?.DEV ?? process.env.NODE_ENV !== 'production');

  for (const agentTask of agentTasks) {
    const existingTask = allTasksMap.get(agentTask.id);

    const statusRank: Record<Task['status'], number> = {
      'To Do': 0,
      'In Progress': 1,
      'Need to Test': 2,
      Done: 3,
    };

    if (existingTask) {
      const existingRank = statusRank[existingTask.status] ?? 0;
      const agentRank = statusRank[agentTask.status] ?? 0;

      // Prevent task status regression (moving backward in status workflow) in production.
      // In DEV / testing mode, allow markdown files to freely update or reset task status.
      if (!isDev) {
        if (existingTask.completed || existingTask.status === 'Done' || existingRank > agentRank) {
          agentTask.status = existingTask.status;
          agentTask.completed = existingTask.completed;
        }
      }
    }

    // Prevent AI agents from marking tasks as 'Done' directly if not already done.
    if (agentTask.status === 'Done' || agentTask.completed) {
      const wasAlreadyDone =
        existingTask && (existingTask.status === 'Done' || existingTask.completed);
      if (!wasAlreadyDone && !isDev) {
        agentTask.status = 'Need to Test';
        agentTask.completed = false;
      }
    }

    if (!existingTask) {
      newTasks.push(agentTask);
    } else if (existingTask.projectId !== projectId) {
      warnings.push(
        `Task '${agentTask.title}' has ID '${agentTask.id}' which belongs to a different project. Treating as new task with new ID.`,
      );
      newTasks.push({ ...agentTask, id: generateShortId() });
    } else {
      // Preserve UI-specific fields and fields missing from markdown
      agentTask.duration = existingTask.duration;
      agentTask.reminders = existingTask.reminders;
      agentTask.deadline = existingTask.deadline;
      agentTask.recurrence = existingTask.recurrence;
      if (existingTask.dueDate && (!agentTask.dueDate || agentTask.dueDate.trim() === '')) {
        agentTask.dueDate = existingTask.dueDate;
      }
      const statusChangedToNeedToTest =
        agentTask.status === 'Need to Test' && existingTask.status !== 'Need to Test';
      if (statusChangedToNeedToTest && (!agentTask.dueDate || agentTask.dueDate.trim() === '')) {
        agentTask.dueDate = getTodayStr();
      }
      if (agentTask.timeEffort === undefined) agentTask.timeEffort = existingTask.timeEffort;
      if (agentTask.timeSpent === 0) agentTask.timeSpent = existingTask.timeSpent;
      if (agentTask.sortOrder === 0) agentTask.sortOrder = existingTask.sortOrder;

      const normalizedExisting = normalizeTask(existingTask);
      const normalizedAgent = normalizeTask(agentTask);
      const changedFields = getChangedFields(
        normalizedExisting as unknown as Record<string, unknown>,
        normalizedAgent as unknown as Record<string, unknown>,
      );
      if (changedFields.length > 0) {
        modifiedTasks.push({ before: existingTask, after: agentTask, changedFields });
      }
    }
  }
  let currentActiveSprintId = allSprints.find(
    (s) => s.projectId === projectId && s.status === 'Active',
  )?.id;

  for (const agentSprint of agentSprints) {
    if (agentSprint.id === currentActiveSprintId && agentSprint.status !== 'Active') {
      currentActiveSprintId = undefined;
    }
  }

  for (const agentSprint of agentSprints) {
    if (agentSprint.status === 'Active') {
      if (currentActiveSprintId && currentActiveSprintId !== agentSprint.id) {
        agentSprint.status = 'Planned';
        warnings.push(
          `Sprint '${agentSprint.name}' was imported as Active, but another sprint is already active. Forced status to Planned.`,
        );
      } else {
        currentActiveSprintId = agentSprint.id;
      }
    }
  }

  for (const agentSprint of agentSprints) {
    const existingSprint = allSprintsMap.get(agentSprint.id);
    if (!existingSprint) {
      newSprints.push(agentSprint);
    } else if (existingSprint.projectId !== projectId) {
      warnings.push(
        `Sprint '${agentSprint.name}' has ID '${agentSprint.id}' which belongs to a different project. Treating as new sprint with new ID.`,
      );
      newSprints.push({ ...agentSprint, id: generateShortId() });
    } else {
      if (agentSprint.sortOrder === undefined) agentSprint.sortOrder = existingSprint.sortOrder;

      const normalizedExisting = normalizeSprint(existingSprint);
      const normalizedAgent = normalizeSprint(agentSprint);
      const changedFields = getChangedFields(
        normalizedExisting as unknown as Record<string, unknown>,
        normalizedAgent as unknown as Record<string, unknown>,
      );
      if (changedFields.length > 0) {
        modifiedSprints.push({ before: existingSprint, after: agentSprint, changedFields });
      }
    }
  }

  return { newTasks, modifiedTasks, newSprints, modifiedSprints, warnings };
}

export async function applyAgentChanges(
  diff: AgentDiffResult,
  projectId: string,
): Promise<{ tasksApplied: number; sprintsApplied: number; auditEntries: AuditLogEntry[] }> {
  let tasksApplied = 0;
  let sprintsApplied = 0;
  const auditEntries: AuditLogEntry[] = [];
  const timestamp = new Date().toISOString();

  for (const task of diff.newTasks) {
    await saveTask(task);
    if (task.completed || task.status === 'Done') {
      const logEntry = createLogEntry(task.id, task.title);
      await saveActivityLogEntry(logEntry).catch(console.error);
    }
    const entry: AuditLogEntry = {
      id: generateShortId(),
      projectId,
      timestamp,
      action: 'task_created',
      entityType: 'task',
      entityId: task.id,
      entityTitle: task.title,
    };
    await saveAuditLogEntry(entry);
    auditEntries.push(entry);
    tasksApplied++;
  }

  for (const modified of diff.modifiedTasks) {
    await saveTask(modified.after);
    if (modified.after.completed || modified.after.status === 'Done') {
      const logEntry = createLogEntry(modified.after.id, modified.after.title);
      await saveActivityLogEntry(logEntry).catch(console.error);
    }
    const diffSummary: Record<string, { before: string; after: string }> = {};
    for (const field of modified.changedFields) {
      diffSummary[field] = {
        before: String((modified.before as unknown as Record<string, unknown>)[field] ?? ''),
        after: String((modified.after as unknown as Record<string, unknown>)[field] ?? ''),
      };
    }
    const entry: AuditLogEntry = {
      id: generateShortId(),
      projectId,
      timestamp,
      action: 'task_modified',
      entityType: 'task',
      entityId: modified.after.id,
      entityTitle: modified.after.title,
      changedFields: modified.changedFields,
      diffSummary,
    };
    await saveAuditLogEntry(entry);
    auditEntries.push(entry);
    tasksApplied++;
  }

  for (const sprint of diff.newSprints) {
    await saveSprint(sprint);
    const entry: AuditLogEntry = {
      id: generateShortId(),
      projectId,
      timestamp,
      action: 'sprint_created',
      entityType: 'sprint',
      entityId: sprint.id,
      entityTitle: sprint.name,
    };
    await saveAuditLogEntry(entry);
    auditEntries.push(entry);
    sprintsApplied++;
  }

  for (const modified of diff.modifiedSprints) {
    await saveSprint(modified.after);
    const diffSummary: Record<string, { before: string; after: string }> = {};
    for (const field of modified.changedFields) {
      diffSummary[field] = {
        before: String((modified.before as unknown as Record<string, unknown>)[field] ?? ''),
        after: String((modified.after as unknown as Record<string, unknown>)[field] ?? ''),
      };
    }
    const entry: AuditLogEntry = {
      id: generateShortId(),
      projectId,
      timestamp,
      action: 'sprint_modified',
      entityType: 'sprint',
      entityId: modified.after.id,
      entityTitle: modified.after.name,
      changedFields: modified.changedFields,
      diffSummary,
    };
    await saveAuditLogEntry(entry);
    auditEntries.push(entry);
    sprintsApplied++;
  }

  return { tasksApplied, sprintsApplied, auditEntries };
}

export async function cleanUpArchivedFiles(
  vaultPath: string,
): Promise<{ movedCount: number; errors: string[] }> {
  const taxonPath = joinPath(vaultPath, '.taxon');
  const tasksPath = joinPath(taxonPath, 'tasks');
  const archivePath = joinPath(taxonPath, 'archive');

  const errors: string[] = [];
  let movedCount = 0;

  const tasksExists = await exists(tasksPath).catch(() => false);
  if (!tasksExists) {
    return { movedCount, errors };
  }

  await mkdir(archivePath, { recursive: true });

  const entries = await readDir(tasksPath).catch(() => []);
  for (const entry of entries) {
    if (entry.isDirectory || !entry.name.toLowerCase().endsWith('.md')) continue;

    try {
      const filePath = joinPath(tasksPath, entry.name);
      const content = await readTextFile(filePath);
      const { data } = parseFrontmatter(content);

      if (data.archived === true) {
        const destPath = joinPath(archivePath, entry.name);
        await writeTextFile(destPath, content);
        await remove(filePath);
        movedCount++;
      }
    } catch (err) {
      errors.push(`Failed to process ${entry.name}: ${err}`);
    }
  }

  return { movedCount, errors };
}

export function generateContextSnapshot(
  project: Project,
  tasks: Task[],
  sprints: Sprint[],
  selectedSprintId?: string | 'all' | 'backlog',
): string {
  let projectTasks = tasks.filter((t) => t.projectId === project.id && !t.archived);

  if (selectedSprintId && selectedSprintId !== 'all') {
    if (selectedSprintId === 'backlog') {
      projectTasks = projectTasks.filter((t) => !t.sprintId);
    } else {
      projectTasks = projectTasks.filter((t) => t.sprintId === selectedSprintId);
    }
  }

  const activeTasks = projectTasks.filter(
    (t) => t.status === 'In Progress' || t.status === 'To Do',
  );

  if (activeTasks.length === 0) {
    return `## Project: ${project.name}\n\n*No active tasks*\n`;
  }

  // Group by sprint
  const sprintMap = new Map<string, { sprint: Sprint | null; tasks: Task[] }>();

  for (const task of activeTasks) {
    const sprintId = task.sprintId || '__backlog__';
    if (!sprintMap.has(sprintId)) {
      const sprint = sprints.find((s) => s.id === sprintId) || null;
      sprintMap.set(sprintId, { sprint, tasks: [] });
    }
    sprintMap.get(sprintId)!.tasks.push(task);
  }

  let output = `## Project: ${project.name}\n`;

  // Active sprints first, then backlog
  const sortedEntries = [...sprintMap.entries()].sort(([a], [b]) => {
    if (a === '__backlog__') return 1;
    if (b === '__backlog__') return -1;
    return 0;
  });

  for (const [key, { sprint, tasks: sprintTasks }] of sortedEntries) {
    if (key === '__backlog__') {
      output += `\n### Backlog\n`;
    } else {
      output += `\n### Sprint: ${sprint?.name || 'Unknown'} (${sprint?.status || 'Active'})\n`;
    }

    const inProgress = sprintTasks.filter((t) => t.status === 'In Progress');
    const toDo = sprintTasks.filter((t) => t.status === 'To Do');

    if (inProgress.length > 0) {
      output += `\n**In Progress:**\n`;
      for (const t of inProgress) {
        output += `- [${t.priority}] ${t.title}\n`;
      }
    }

    if (toDo.length > 0) {
      output += `\n**To Do:**\n`;
      for (const t of toDo) {
        output += `- [${t.priority}] ${t.title}\n`;
      }
    }
  }

  output += `\n---\nTasks: ${activeTasks.length} active\n`;

  return output;
}

export function generateChangelog(entries: AuditLogEntry[]): string {
  let md = '# Taxon AI Agent Changelog\n\n';
  md += '> Auto-generated from Taxon audit log. Do not edit manually.\n\n';

  if (entries.length === 0) {
    md += '*No recorded AI activity.*\n';
    return md;
  }

  const byDate = new Map<string, AuditLogEntry[]>();
  for (const entry of entries) {
    const date = entry.timestamp.split('T')[0] || 'Unknown Date';
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(entry);
  }

  for (const [date, dateEntries] of byDate) {
    md += `## ${date}\n\n`;
    for (const entry of dateEntries) {
      const time = entry.timestamp.split('T')[1]?.substring(0, 8) || '';
      const icon = entry.action.includes('created') ? '🆕' : '✏️';
      const actionName = entry.action.replace('_', ' ');
      md += `- ${icon} **${time}** — ${actionName}: *${entry.entityTitle}*`;
      if (entry.changedFields && entry.changedFields.length > 0) {
        md += ` (${entry.changedFields.join(', ')})`;
      }
      md += '\n';
    }
    md += '\n';
  }

  return md;
}

export async function exportSingleTaskToAgent(task: Task, vaultPath: string): Promise<boolean> {
  if (task.archived) return false;
  try {
    const tasksDir = joinPath(vaultPath, '.taxon/tasks');
    const dirExists = await exists(tasksDir).catch(() => false);
    if (!dirExists) {
      await mkdir(tasksDir, { recursive: true });
    }

    const targetName = taskFilename(task);
    const targetPath = joinPath(tasksDir, targetName);
    const shortId = task.id.slice(-6);

    // Remove any stale files for this task (e.g. old slug or title)
    const existingEntries = await readDir(tasksDir).catch(() => []);
    for (const entry of existingEntries) {
      if (entry.isDirectory || !entry.name.toLowerCase().endsWith('.md')) continue;
      if (entry.name === targetName) continue;

      const matchesPrefix =
        entry.name.startsWith(`TASK-${shortId}-`) || entry.name.startsWith(`TASK-${task.id}-`);
      if (matchesPrefix) {
        await remove(joinPath(tasksDir, entry.name)).catch(() => {});
      }
    }

    await writeTextFile(targetPath, taskToMarkdown(task));
    return true;
  } catch (err) {
    console.error('Failed to export single task to agent:', err);
    return false;
  }
}

export async function exportSingleSprintToAgent(
  sprint: Sprint,
  sprintTasks: Task[],
  vaultPath: string,
): Promise<boolean> {
  try {
    const sprintsDir = joinPath(vaultPath, '.taxon/sprints');
    const dirExists = await exists(sprintsDir).catch(() => false);
    if (!dirExists) {
      await mkdir(sprintsDir, { recursive: true });
    }

    const targetName = sprintFilename(sprint);
    const targetPath = joinPath(sprintsDir, targetName);
    const shortId = sprint.id.slice(-6);

    // Remove any stale sprint files for this sprint
    const existingEntries = await readDir(sprintsDir).catch(() => []);
    for (const entry of existingEntries) {
      if (entry.isDirectory || !entry.name.toLowerCase().endsWith('.md')) continue;
      if (entry.name === targetName) continue;

      const matchesPrefix =
        entry.name.startsWith(`SPRINT-${shortId}-`) ||
        entry.name.startsWith(`SPRINT-${sprint.id}-`);
      if (matchesPrefix) {
        await remove(joinPath(sprintsDir, entry.name)).catch(() => {});
      }
    }

    await writeTextFile(targetPath, sprintToMarkdown(sprint, sprintTasks));
    return true;
  } catch (err) {
    console.error('Failed to export single sprint to agent:', err);
    return false;
  }
}
