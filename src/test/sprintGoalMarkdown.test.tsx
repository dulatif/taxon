import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SettingsProvider } from '../contexts/SettingsContext';
import SprintProgress from '../sections/Sprint/SprintProgress';
import type { Sprint } from '../types';

describe('Sprint Goal Markdown Rendering', () => {
  const mockSprint: Sprint = {
    id: 'sp-test',
    projectId: 'proj-1',
    name: 'Sprint Alpha',
    status: 'Active',
    goal: 'Deliver **OLED metrics** & `Precision API` with *smooth* execution.',
    startDate: '2026-10-01',
    endDate: '2026-10-15',
  };

  const defaultStats = { total: 10, completed: 5, percentage: 50 };

  it('renders markdown elements inside sprint goal', () => {
    render(
      <SettingsProvider>
        <SprintProgress
          sprint={mockSprint}
          stats={defaultStats}
          isSelected={false}
          onSelect={vi.fn()}
          onEdit={vi.fn()}
          onComplete={vi.fn()}
        />
      </SettingsProvider>,
    );

    // Verify Sprint Goal label is rendered
    expect(screen.getByText('Sprint Goal:')).toBeDefined();

    // Verify markdown bold formatted text rendered as strong
    const boldEl = screen.getByText('OLED metrics');
    expect(boldEl.tagName).toBe('STRONG');

    // Verify code block formatted text
    const codeEl = screen.getByText('Precision API');
    expect(codeEl.tagName).toBe('CODE');
  });

  it('toggles expand and collapse for sprint goal description', () => {
    const onSelect = vi.fn();
    render(
      <SettingsProvider>
        <SprintProgress
          sprint={mockSprint}
          stats={defaultStats}
          isSelected={false}
          onSelect={onSelect}
          onEdit={vi.fn()}
          onComplete={vi.fn()}
        />
      </SettingsProvider>,
    );

    const goalContainer = screen.getByTestId('sprint-goal-container');
    expect(goalContainer.className).toContain('max-h-32');
    expect(goalContainer.className).not.toContain('max-h-none');

    // Click Expand button
    const expandBtn = screen.getByTitle('Expand description');
    fireEvent.click(expandBtn);

    // Goal container should now be expanded without max-h-32 restriction
    expect(goalContainer.className).toContain('max-h-none');
    expect(goalContainer.className).not.toContain('max-h-32');

    // Clicking Expand should stop propagation and NOT trigger onSelect
    expect(onSelect).not.toHaveBeenCalled();

    // Click Collapse button
    const collapseBtn = screen.getByTitle('Collapse description');
    fireEvent.click(collapseBtn);

    expect(goalContainer.className).toContain('max-h-32');
    expect(goalContainer.className).not.toContain('max-h-none');
  });
});
