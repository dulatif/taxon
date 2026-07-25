import { exists, mkdir, readDir, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs';
import type { Project, Sprint, SubTask, Task } from '../types';
import type { AgentDiffResult, AgentSyncState, AuditLogEntry } from '../types/agent';
import { getTodayStr } from '../utils/format-date';
import { saveAuditLogEntry, saveSprint, saveTask } from './database';

// AGENT-102: YAML frontmatter parser
function joinPath(parent: string, child: string): string {
  const cleanedParent = parent.replace(/[/\\]+$/, '');
  return `${cleanedParent}/${child}`;
}

export function parseFrontmatter(markdown: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    throw new Error('Invalid markdown: missing frontmatter');
  }

  const frontmatterStr = match[1] || '';
  const body = match[2] || '';
  const data: Record<string, unknown> = {};

  const lines = frontmatterStr.split(/\r?\n/);
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (value === 'true') {
      data[key] = true;
    } else if (value === 'false') {
      data[key] = false;
    } else if (!isNaN(Number(value)) && value !== '') {
      data[key] = Number(value);
    } else if (value.startsWith('[') && value.endsWith(']')) {
      const arrContent = value.slice(1, -1).trim();
      if (arrContent) {
        data[key] = arrContent.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''));
      } else {
        data[key] = [];
      }
    } else {
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
  };

  let markdown = serializeFrontmatter(frontmatterData);
  markdown += '\n## Description\n\n';
  markdown += task.description || '';
  markdown += '\n\n## Subtasks\n\n';

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

  // Parse description and subtasks
  const descMatch = body.match(/## Description\s*\n([\s\S]*?)(?:## Subtasks|$)/);
  const description = descMatch?.[1]?.trim() ?? '';

  const subtasksMatch = body.match(/## Subtasks\s*\n([\s\S]*)$/);
  const subtasks: SubTask[] = [];

  if (subtasksMatch?.[1]) {
    const subtasksText = subtasksMatch[1];
    const lines = subtasksText.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^-\s*\[([ xX])\]\s+(.*)$/);
      if (match?.[1] && match?.[2]) {
        // use hash of title for deterministic ID if possible, otherwise random
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
    id: (data.id as string) || generateShortId(),
    projectId,
    title: (data.title as string) || 'Untitled Task',
    description,
    priority: (data.priority as Task['priority']) || 'Medium',
    status: (data.status as Task['status']) || 'To Do',
    completed: (data.completed as boolean) || false,
    sprintId: data.sprintId as string | undefined,
    dueDate: data.dueDate as string | undefined,
    labels: (data.labels as string[]) || [],
    subtasks,
    duration: '',
    timeEffort: data.timeEffort as number | undefined,
    timeSpent: (data.timeSpent as number) || 0,
    sortOrder: (data.sortOrder as number) || 0,
    archived: (data.archived as boolean) || false,
    archivedAt: data.archivedAt as string | undefined,
  } as Task;
}

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

  for (const task of tasks) {
    if (task.sprintId === sprint.id) {
      markdown += `- [${task.priority || 'Medium'}] ${taskFilename(task)}\n`;
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
  return `# Taxon Project — AI Agent Integration

This directory is managed by **Taxon**, a project & task management app.
Task data is synced via files in the \`.taxon/\` directory.

Project Name: ${project.name}

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

### Creating New Tasks
Create a new \`.md\` file in \`.taxon/tasks/\` with this format:
- Filename: \`TASK-{6-char-id}-{slugified-title}.md\`
- Generate a unique 6-character alphanumeric ID (e.g. \`a1b2c3\`)
- Required frontmatter: \`id\`, \`title\`, \`priority\`, \`status\`
- Valid priorities: \`Critical\`, \`High\`, \`Medium\`, \`Low\`
- Valid statuses: \`To Do\`, \`In Progress\`, \`Need to Test\`, \`Done\`

Example Task File:
\`\`\`markdown
---
id: a1b2c3
title: Implement Login Screen
priority: High
status: To Do
completed: false
sprintId: 
labels:
  - frontend
  - auth
---
## Description
Implement the login screen using React Hook Form.

## Subtasks
- [x] Create form component
- [ ] Add validation
- [ ] Connect to API
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
- Version: 1.0.0
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
  sqlite3 "$DB_PATH" "UPDATE tasks SET completed = 0, status = 'Need to Test' WHERE id LIKE '%$SHORT_ID%';" 2>/dev/null
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

  const taxonExists = await exists(taxonPath).catch(() => false);
  if (taxonExists) {
    const tasksExists = await exists(tasksPath).catch(() => false);
    if (tasksExists) await remove(tasksPath, { recursive: true }).catch(console.error);
    const sprintsExists = await exists(sprintsPath).catch(() => false);
    if (sprintsExists) await remove(sprintsPath, { recursive: true }).catch(console.error);
  } else {
    await mkdir(taxonPath, { recursive: true });
  }

  await mkdir(tasksPath, { recursive: true });
  await mkdir(sprintsPath, { recursive: true });

  const projectTasks = tasks.filter((t) => t.projectId === project.id && !t.archived);
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

  let exportedSprintCount = 0;
  for (const sprint of projectSprints) {
    const filePath = joinPath(sprintsPath, sprintFilename(sprint));
    await writeTextFile(filePath, sprintToMarkdown(sprint, projectTasks));
    exportedSprintCount++;
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

  const seenTaskIds = new Set<string>();
  const tasksExists = await exists(tasksPath).catch(() => false);
  if (tasksExists) {
    const entries = await readDir(tasksPath).catch(() => []);
    // Sort to make the first file deterministic (alphabetical)
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (!entry.isDirectory && entry.name.toLowerCase().endsWith('.md')) {
        try {
          const content = await readTextFile(joinPath(tasksPath, entry.name));
          const task = markdownToTask(content, projectId);
          if (seenTaskIds.has(task.id)) {
            warnings.push(
              `Duplicate task ID '${task.id}' found — using first found, skipping ${entry.name}`,
            );
            continue;
          }
          seenTaskIds.add(task.id);
          tasks.push(task);
        } catch {
          warnings.push(`Failed to parse task file: ${entry.name}`);
        }
      }
    }
  }

  const seenSprintIds = new Set<string>();
  const sprintsExists = await exists(sprintsPath).catch(() => false);
  if (sprintsExists) {
    const entries = await readDir(sprintsPath).catch(() => []);
    entries.sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (!entry.isDirectory && entry.name.toLowerCase().endsWith('.md')) {
        try {
          const content = await readTextFile(joinPath(sprintsPath, entry.name));
          const sprint = markdownToSprint(content, projectId);
          if (seenSprintIds.has(sprint.id)) {
            warnings.push(
              `Duplicate sprint ID '${sprint.id}' found — using first found, skipping ${entry.name}`,
            );
            continue;
          }
          seenSprintIds.add(sprint.id);
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
  };
}

function normalizeSprint(sprint: Sprint): Sprint {
  return {
    ...sprint,
    goal: sprint.goal || '',
    completedAt: sprint.completedAt || undefined,
  };
}

export function diffAgentChanges(
  projectId: string,
  allTasks: Task[],
  allSprints: Sprint[],
  agentTasks: Task[],
  agentSprints: Sprint[],
): AgentDiffResult {
  const newTasks: Task[] = [];
  const modifiedTasks: { before: Task; after: Task; changedFields: string[] }[] = [];
  const newSprints: Sprint[] = [];
  const modifiedSprints: { before: Sprint; after: Sprint; changedFields: string[] }[] = [];
  const warnings: string[] = [];

  const allTasksMap = new Map(allTasks.map((t) => [t.id, t]));
  const allSprintsMap = new Map(allSprints.map((s) => [s.id, s]));

  for (const agentTask of agentTasks) {
    const existingTask = allTasksMap.get(agentTask.id);

    // Prevent AI agents from marking tasks as 'Done' directly.
    if (agentTask.status === 'Done' || agentTask.completed) {
      const wasAlreadyDone =
        existingTask && (existingTask.status === 'Done' || existingTask.completed);
      if (!wasAlreadyDone) {
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
): string {
  const projectTasks = tasks.filter((t) => t.projectId === project.id && !t.archived);

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
