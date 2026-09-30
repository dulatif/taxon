export interface RevisionBlock {
  attemptNumber: number;
  timestamp: string;
  author: string;
  category: string;
  failingCriteria: string[];
  observedBehavior: string;
  expectedBehavior: string;
  errorLogs?: string;
  remediationGuidance?: string;
}

export function formatRevisionBlock(block: RevisionBlock): string {
  const lines: string[] = [];
  lines.push(`### Revision Attempt ${block.attemptNumber}`);
  lines.push(`- **Timestamp**: ${block.timestamp}`);
  lines.push(`- **Author**: ${block.author || 'Human Reviewer'}`);
  lines.push(`- **Category**: ${block.category}`);

  if (block.failingCriteria.length > 0) {
    lines.push('- **Failing Criteria**:');
    for (const criterion of block.failingCriteria) {
      lines.push(`  - [ ] ${criterion}`);
    }
  }

  lines.push('- **Observed Behavior**:');
  lines.push(`  ${block.observedBehavior.replace(/\n/g, '\n  ')}`);

  lines.push('- **Expected Behavior**:');
  lines.push(`  ${block.expectedBehavior.replace(/\n/g, '\n  ')}`);

  if (block.errorLogs && block.errorLogs.trim()) {
    lines.push('- **Error Trace / Logs**:');
    lines.push('  ```text');
    for (const logLine of block.errorLogs.trim().split('\n')) {
      lines.push(`  ${logLine}`);
    }
    lines.push('  ```');
  }

  if (block.remediationGuidance && block.remediationGuidance.trim()) {
    lines.push('- **Remediation Guidance**:');
    lines.push(`  ${block.remediationGuidance.replace(/\n/g, '\n  ')}`);
  }

  return lines.join('\n');
}

export function appendRevisionBlock(description: string, block: RevisionBlock): string {
  const blockMarkdown = formatRevisionBlock(block);
  const revHistoryRegex = /(^|\n)##\s+Revision History\s*(\r?\n|$)/i;
  const match = description.match(revHistoryRegex);

  if (!match || match.index === undefined) {
    const trimmed = description.trimEnd();
    return trimmed
      ? `${trimmed}\n\n## Revision History\n\n${blockMarkdown}\n`
      : `## Revision History\n\n${blockMarkdown}\n`;
  }

  const startIndex = match.index + match[0].length;
  const rest = description.slice(startIndex);
  const nextHeaderMatch = rest.match(/\n##\s+/);

  if (nextHeaderMatch && nextHeaderMatch.index !== undefined) {
    const insertPos = startIndex + nextHeaderMatch.index;
    const before = description.slice(0, insertPos).trimEnd();
    const after = description.slice(insertPos).trimStart();
    return `${before}\n\n${blockMarkdown}\n\n${after}`;
  }

  return `${description.trimEnd()}\n\n${blockMarkdown}\n`;
}

export function parseRevisionHistory(description: string): RevisionBlock[] {
  if (!description) return [];

  const revHistoryRegex = /(^|\n)##\s+Revision History\s*(\r?\n|$)([\s\S]*?)(?=\n##\s+|$)/i;
  const match = description.match(revHistoryRegex);
  if (!match || !match[3]) return [];

  const content = match[3];
  const attemptRegex =
    /(?:^|\n)###\s+Revision Attempt\s+(\d+)\s*\r?\n([\s\S]*?)(?=\n###\s+Revision Attempt\s+\d+|$)/gi;
  const blocks: RevisionBlock[] = [];

  const matches = [...content.matchAll(attemptRegex)];
  for (const attemptMatch of matches) {
    const attemptNumber = parseInt(attemptMatch[1] as string, 10);
    const body = attemptMatch[2] || '';

    const timestampMatch = body.match(/-\s*\*\*Timestamp\*\*:\s*([^\r\n]+)/i);
    const authorMatch = body.match(/-\s*\*\*Author\*\*:\s*([^\r\n]+)/i);
    const categoryMatch = body.match(/-\s*\*\*Category\*\*:\s*([^\r\n]+)/i);

    const failingCriteria: string[] = [];
    const fcMatch = body.match(/-\s*\*\*Failing Criteria\*\*:\s*([\s\S]*?)(?=-\s*\*\*|$)/i);
    if (fcMatch && fcMatch[1]) {
      const fcLines = fcMatch[1].split(/\r?\n/);
      for (const line of fcLines) {
        const itemMatch = line.match(/^\s*-\s*\[\s*\]\s+(.*)$/);
        if (itemMatch && itemMatch[1]) {
          failingCriteria.push(itemMatch[1].trim());
        }
      }
    }

    const extractField = (name: string): string => {
      const r = new RegExp(
        `-\\s*\\*\\*${name}\\*\\*:\\s*\\r?\\n?([\\s\\S]*?)(?=-\\s*\\*\\*|$)`,
        'i',
      );
      const m = body.match(r);
      if (!m || !m[1]) return '';
      return m[1]
        .split(/\r?\n/)
        .map((l) => l.replace(/^\s{2}/, ''))
        .join('\n')
        .trim();
    };

    const observedBehavior = extractField('Observed Behavior');
    const expectedBehavior = extractField('Expected Behavior');

    let errorLogs = '';
    const errorMatch = body.match(
      /-\s*\*\*Error Trace \/ Logs\*\*:\s*[\r\n]+\s*```[a-zA-Z]*\r?\n([\s\S]*?)```/i,
    );
    if (errorMatch && errorMatch[1]) {
      errorLogs = errorMatch[1]
        .split(/\r?\n/)
        .map((l) => l.replace(/^\s{2}/, ''))
        .join('\n')
        .trim();
    }

    const remediationGuidance = extractField('Remediation Guidance');

    blocks.push({
      attemptNumber,
      timestamp: timestampMatch ? (timestampMatch[1] as string).trim() : '',
      author: authorMatch ? (authorMatch[1] as string).trim() : 'Human Reviewer',
      category: categoryMatch ? (categoryMatch[1] as string).trim() : 'Bug',
      failingCriteria,
      observedBehavior,
      expectedBehavior,
      errorLogs: errorLogs || undefined,
      remediationGuidance: remediationGuidance || undefined,
    });
  }

  return blocks;
}
