import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ActivityLogEntry, DailyActivity, Task } from '../types';
import AnalyticsView from '../views/AnalyticsView';

describe('AnalyticsView Heatmap Month Labels', () => {
  const mockTasks: Task[] = [];
  const mockDailyActivity: DailyActivity[] = [];
  const mockActivityLog: ActivityLogEntry[] = [];

  it('renders heatmap month labels properly positioned above week columns', () => {
    const { container } = render(
      <AnalyticsView
        tasks={mockTasks}
        dailyActivity={mockDailyActivity}
        activityLog={mockActivityLog}
      />,
    );

    expect(screen.getByText('Annual Contribution Heatmap')).toBeInTheDocument();

    // Check month labels
    const monthLabelsContainer = container.querySelector('.relative.h-5.flex-1');
    expect(monthLabelsContainer).toBeInTheDocument();

    const monthSpans = monthLabelsContainer?.querySelectorAll('span');
    expect(monthSpans && monthSpans.length).toBeGreaterThan(0);

    // Verify month labels have pixel left offsets matching pitch of 15px
    const offsets: number[] = [];
    monthSpans?.forEach((span) => {
      const leftStr = span.style.left;
      expect(leftStr).toMatch(/^\d+px$/);
      const leftVal = parseInt(leftStr, 10);
      offsets.push(leftVal);
    });

    // Ensure offsets are strictly increasing and separated by at least 2 weeks (30px)
    for (let i = 1; i < offsets.length; i++) {
      const prev = offsets[i - 1];
      const curr = offsets[i];
      if (prev !== undefined && curr !== undefined) {
        expect(curr).toBeGreaterThan(prev);
        expect(curr - prev).toBeGreaterThanOrEqual(30); // at least 2 weeks (30px)
      }
    }
  });
});
