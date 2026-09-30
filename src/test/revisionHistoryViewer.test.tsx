import React from 'react';
import { describe, expect, it } from 'vitest';
import { RevisionHistoryViewer } from '../components/Revision/RevisionHistoryViewer';
import type { Task } from '../types';
import { render, screen } from './helpers';

describe('RevisionHistoryViewer Component', () => {
  const baseTask: Task = {
    id: 't-123',
    projectId: 'p-1',
    title: 'Test Task',
    completed: false,
    duration: '30m',
    priority: 'High',
    status: 'To Do',
  };

  it('renders nothing when there are no revisions and revisionCount is 0', () => {
    const { container } = render(<RevisionHistoryViewer task={baseTask} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders revision history attempts correctly', () => {
    const taskWithRev: Task = {
      ...baseTask,
      revisionCount: 1,
      description: `## Description\nTask description\n\n## Revision History\n\n### Revision Attempt 1\n- **Timestamp**: 2026-09-30T16:30:00Z\n- **Author**: Human Tester\n- **Category**: Runtime Error\n- **Failing Criteria**:\n  - [ ] Refresh token on 401\n- **Observed Behavior**:\n  Infinite redirect loop\n- **Expected Behavior**:\n  Redirect to /login\n- **Error Trace / Logs**:\n  \`\`\`text\n  Max call stack exceeded\n  \`\`\`\n- **Remediation Guidance**:\n  Add isRetrying flag\n`,
    };

    render(<RevisionHistoryViewer task={taskWithRev} />);

    expect(screen.getByText('Revision History')).toBeInTheDocument();
    expect(screen.getByText('1 Attempt')).toBeInTheDocument();
    expect(screen.getByText('Attempt 1')).toBeInTheDocument();
    expect(screen.getByText('Runtime Error')).toBeInTheDocument();
    expect(screen.getByText('Human Tester')).toBeInTheDocument();
    expect(screen.getByText('Refresh token on 401')).toBeInTheDocument();
    expect(screen.getByText('Infinite redirect loop')).toBeInTheDocument();
    expect(screen.getByText('Redirect to /login')).toBeInTheDocument();
    expect(screen.getByText(/Max call stack exceeded/)).toBeInTheDocument();
    expect(screen.getByText('Add isRetrying flag')).toBeInTheDocument();
  });

  it('displays agent resolution notes from Deliverables', () => {
    const taskWithRes: Task = {
      ...baseTask,
      revisionCount: 1,
      description: `## Deliverables\n### Revision Attempt 1 Resolution\nFixed Axios loop by adding retry guard.\n\n## Revision History\n\n### Revision Attempt 1\n- **Timestamp**: 2026-09-30T16:30:00Z\n- **Author**: Human Tester\n- **Category**: Runtime Error\n- **Failing Criteria**:\n  - [ ] Refresh token on 401\n- **Observed Behavior**:\n  Infinite redirect loop\n- **Expected Behavior**:\n  Redirect to /login\n`,
    };

    render(<RevisionHistoryViewer task={taskWithRes} />);

    expect(screen.getByText('Attempt 1 Resolution:')).toBeInTheDocument();
    expect(screen.getByText('Fixed Axios loop by adding retry guard.')).toBeInTheDocument();
  });
});
