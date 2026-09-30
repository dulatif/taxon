export interface CriterionItem {
  index: number;
  text: string;
  completed: boolean;
}

export function parseAcceptanceCriteria(description?: string): CriterionItem[] {
  if (!description) return [];
  const sectionMatch = description.match(
    /##\s+Acceptance Criteria\s*\r?\n([\s\S]*?)(?=\n##\s+|$)/i,
  );
  if (!sectionMatch || !sectionMatch[1]) return [];

  const lines = sectionMatch[1].split(/\r?\n/);
  const items: CriterionItem[] = [];
  let itemIdx = 0;

  for (const line of lines) {
    const match = line.match(/^-\s*\[([ xX])\]\s+(.*)$/);
    if (match && match[1] !== undefined && match[2] !== undefined) {
      items.push({
        index: itemIdx++,
        completed: match[1].toLowerCase() === 'x',
        text: match[2].trim(),
      });
    }
  }

  return items;
}

export function updateAcceptanceCriterion(
  description: string,
  targetText: string,
  completed: boolean,
): string {
  const lines = description.split(/\r?\n/);
  let replaced = false;

  const newLines = lines.map((line) => {
    if (replaced) return line;
    const match = line.match(/^(\s*-\s*\[)[ xX](\]\s+)(.*)$/);
    if (match && match[3] !== undefined && match[3].trim() === targetText.trim()) {
      replaced = true;
      return `${match[1]}${completed ? 'x' : ' '}${match[2]}${match[3]}`;
    }
    return line;
  });

  return newLines.join('\n');
}
