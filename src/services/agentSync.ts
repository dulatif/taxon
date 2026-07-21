import type { Project, Sprint, SubTask, Task } from '../types';

// AGENT-102: YAML frontmatter parser
export function parseFrontmatter(markdown: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = markdown.match(frontmatterRegex);

  if (!match) {
    return { data: {}, body: markdown };
  }

  const frontmatterStr = match[1];
  const body = match[2];
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
  const shortId = task.id.substring(0, 6);
  return `TASK-${shortId}-${slugify(task.title)}.md`;
}

export function sprintFilename(sprint: Sprint): string {
  const shortId = sprint.id.substring(0, 6);
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
  const description = descMatch ? descMatch[1].trim() : '';

  const subtasksMatch = body.match(/## Subtasks\s*\n([\s\S]*)$/);
  const subtasks: SubTask[] = [];

  if (subtasksMatch) {
    const subtasksText = subtasksMatch[1];
    const lines = subtasksText.split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^-\s*\[([ xX])\]\s+(.*)$/);
      if (match) {
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
    id: data.id || generateShortId(),
    projectId,
    title: data.title || 'Untitled Task',
    description,
    priority: data.priority || 'Medium',
    status: data.status || 'To Do',
    completed: data.completed || false,
    sprintId: data.sprintId,
    dueDate: data.dueDate,
    labels: data.labels || [],
    subtasks,
    timeEffort: data.timeEffort,
    timeSpent: data.timeSpent || 0,
    sortOrder: data.sortOrder || 0,
    archived: data.archived || false,
    archivedAt: data.archivedAt,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
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
      markdown += `- ${taskFilename(task)}\n`;
    }
  }

  return markdown;
}

export function markdownToSprint(markdown: string, projectId: string): Sprint {
  const { data, body } = parseFrontmatter(markdown);

  const goalMatch = body.match(/## Goal\s*\n([\s\S]*?)(?:## Tasks|$)/);
  const goal = goalMatch ? goalMatch[1].trim() : '';

  return {
    id: data.id || generateShortId(),
    projectId,
    name: data.name || 'Untitled Sprint',
    goal,
    status: data.status || 'Planned',
    startDate: data.startDate || new Date().toISOString(),
    endDate: data.endDate || new Date().toISOString(),
    completedAt: data.completedAt,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Sprint;
}

// AGENT-106: Project metadata serializer
export function projectToMarkdown(project: Project): string {
  const frontmatterData = {
    id: project.id,
    name: project.name,
    description: project.description,
    category: project.category,
    progress: project.progress,
    dueDate: project.dueDate,
  };
  return serializeFrontmatter(frontmatterData);
}

export function markdownToProject(markdown: string): Partial<Project> {
  const { data } = parseFrontmatter(markdown);
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    category: data.category,
    progress: data.progress,
    dueDate: data.dueDate,
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
All task files are in \`.taxon/tasks/\`. Each has YAML frontmatter with structured
metadata and a markdown body with description and subtasks.

### Creating New Tasks
Create a new \`.md\` file in \`.taxon/tasks/\` with this format:
- Filename: \`TASK-{6-char-id}-{slugified-title}.md\`
- Generate a unique 6-character alphanumeric ID
- Required frontmatter: \`id\`, \`title\`, \`priority\`, \`status\`
- Valid priorities: Critical, High, Medium, Low
- Valid statuses: To Do, In Progress, Done

### Modifying Tasks
Edit the frontmatter fields or markdown body directly.
To complete a task: set \`completed: true\` and \`status: Done\`.
To archive: set \`archived: true\`.

### Creating Sprints
Create a new \`.md\` file in \`.taxon/sprints/\`:
- Filename: \`SPRINT-{6-char-id}-{slugified-name}.md\`
- Required frontmatter: \`id\`, \`name\`, \`status\`, \`startDate\`, \`endDate\`
- Valid statuses: Planned, Active
- List task filenames under \`## Tasks\`
- Set each task's \`sprintId\` in its frontmatter to match

### Rules
- Do NOT delete task files. Mark unwanted tasks as \`archived: true\`.
- Do NOT modify \`project.md\` (treated as read-only context).
- IDs must be unique across all tasks/sprints.
`;
}

export function generateClaudeMdPointer(): string {
  return `See AGENTS.md for project task integration instructions.\n`;
}
