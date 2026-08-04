import { describe, expect, it } from 'vitest';
import { parseAgentFocusContent } from '../hooks/useAgentHeartbeat';

describe('useAgentHeartbeat parser', () => {
  it('should parse standard multiline .agent-focus file', () => {
    const yaml = `
active: TASK-6a7b8c
next:
  - TASK-1d2e3f
  - TASK-4g5h6j
agent: Antigravity
timestamp: 2026-08-03T10:00:00Z
`;
    const result = parseAgentFocusContent(yaml);
    expect(result.activeTaskId).toBe('TASK-6a7b8c');
    expect(result.nextTaskIds).toEqual(['TASK-1d2e3f', 'TASK-4g5h6j']);
    expect(result.agentName).toBe('Antigravity');
    expect(result.timestamp).toBe('2026-08-03T10:00:00Z');
  });

  it('should parse inline next array and quotes', () => {
    const yaml = `
active: "TASK-123456"
next: ["TASK-234567", "TASK-345678"]
agent: "Claude"
`;
    const result = parseAgentFocusContent(yaml);
    expect(result.activeTaskId).toBe('TASK-123456');
    expect(result.nextTaskIds).toEqual(['TASK-234567', 'TASK-345678']);
    expect(result.agentName).toBe('Claude');
  });

  it('should handle empty or missing next list gracefully', () => {
    const yaml = `
active: TASK-999999
`;
    const result = parseAgentFocusContent(yaml);
    expect(result.activeTaskId).toBe('TASK-999999');
    expect(result.nextTaskIds).toEqual([]);
  });
});
