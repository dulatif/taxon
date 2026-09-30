import { describe, expect, it } from 'vitest';
import {
  appendRevisionBlock,
  formatRevisionBlock,
  parseRevisionHistory,
  type RevisionBlock,
} from '../services/revisionSync';

describe('revisionSync Service', () => {
  const sampleBlock: RevisionBlock = {
    attemptNumber: 1,
    timestamp: '2026-09-30T16:30:00Z',
    author: 'Human Tester',
    category: 'Runtime Error',
    failingCriteria: [
      'Refresh token automatically on 401 response',
      'Retry original failed request after token refresh',
    ],
    observedBehavior: 'Infinite redirect loop occurs when refresh endpoint returns 401.',
    expectedBehavior: 'Clear auth storage and redirect user to /login.',
    errorLogs: 'Error: Maximum call stack size exceeded at AxiosAuthInterceptor.retry (auth.ts:45)',
    remediationGuidance: 'Add an isRetrying flag on the Axios request config.',
  };

  it('formats revision block matching expected schema', () => {
    const formatted = formatRevisionBlock(sampleBlock);
    expect(formatted).toContain('### Revision Attempt 1');
    expect(formatted).toContain('- **Timestamp**: 2026-09-30T16:30:00Z');
    expect(formatted).toContain('- **Author**: Human Tester');
    expect(formatted).toContain('- **Category**: Runtime Error');
    expect(formatted).toContain('- **Failing Criteria**:');
    expect(formatted).toContain('  - [ ] Refresh token automatically on 401 response');
    expect(formatted).toContain('  - [ ] Retry original failed request after token refresh');
    expect(formatted).toContain('- **Observed Behavior**:');
    expect(formatted).toContain(
      '  Infinite redirect loop occurs when refresh endpoint returns 401.',
    );
    expect(formatted).toContain('- **Expected Behavior**:');
    expect(formatted).toContain('  Clear auth storage and redirect user to /login.');
    expect(formatted).toContain('- **Error Trace / Logs**:');
    expect(formatted).toContain('  ```text');
    expect(formatted).toContain(
      '  Error: Maximum call stack size exceeded at AxiosAuthInterceptor.retry (auth.ts:45)',
    );
    expect(formatted).toContain('- **Remediation Guidance**:');
    expect(formatted).toContain('  Add an isRetrying flag on the Axios request config.');
  });

  it('appends revision block to markdown without existing Revision History', () => {
    const initialDescription = `## Description\nInitial description\n\n## Acceptance Criteria\n- [ ] Criterion 1\n\n## Subtasks\n- [ ] Subtask 1\n`;
    const updated = appendRevisionBlock(initialDescription, sampleBlock);

    expect(updated).toContain('## Revision History');
    expect(updated).toContain('### Revision Attempt 1');
    expect(updated).toContain('## Description\nInitial description');
    expect(updated).toContain('## Acceptance Criteria\n- [ ] Criterion 1');
    expect(updated).toContain('## Subtasks\n- [ ] Subtask 1');
  });

  it('appends multiple revision blocks non-destructively', () => {
    const initial = `## Description\nTest task\n`;
    const firstRev = appendRevisionBlock(initial, sampleBlock);

    const secondBlock: RevisionBlock = {
      attemptNumber: 2,
      timestamp: '2026-09-30T17:00:00Z',
      author: 'Human Tester',
      category: 'Missing Edge Case',
      failingCriteria: ['Handle null user payload'],
      observedBehavior: 'App crashes on null user',
      expectedBehavior: 'Display fallback avatar',
    };

    const secondRev = appendRevisionBlock(firstRev, secondBlock);
    expect(secondRev).toContain('### Revision Attempt 1');
    expect(secondRev).toContain('### Revision Attempt 2');
    expect(secondRev).toContain('Missing Edge Case');

    const parsed = parseRevisionHistory(secondRev);
    expect(parsed.length).toBe(2);
    expect(parsed[0]?.attemptNumber).toBe(1);
    expect(parsed[0]?.category).toBe('Runtime Error');
    expect(parsed[0]?.failingCriteria).toEqual(sampleBlock.failingCriteria);
    expect(parsed[0]?.observedBehavior).toBe(sampleBlock.observedBehavior);
    expect(parsed[0]?.expectedBehavior).toBe(sampleBlock.expectedBehavior);
    expect(parsed[0]?.errorLogs).toBe(sampleBlock.errorLogs);
    expect(parsed[0]?.remediationGuidance).toBe(sampleBlock.remediationGuidance);

    expect(parsed[1]?.attemptNumber).toBe(2);
    expect(parsed[1]?.category).toBe('Missing Edge Case');
    expect(parsed[1]?.failingCriteria).toEqual(['Handle null user payload']);
  });
});
