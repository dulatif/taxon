import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { WorkflowToolbar } from '../components/Workflow/WorkflowToolbar';
import { WorkflowView } from '../components/Workflow/WorkflowView';
import type { Project, Task } from '../types';

describe('Workflow Theater Mode & Toolbar', () => {
  beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });
  const defaultProps = {
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onFitView: vi.fn(),
    moduleGroups: ['UI', 'Backend'],
    selectedGroup: null,
    onSelectGroup: vi.fn(),
    searchQuery: '',
    onSearchChange: vi.fn(),
    isLive: false,
    activeTaskId: null,
    totalTasksCount: 5,
  };

  it('renders Scan button for Fit View', () => {
    render(<WorkflowToolbar {...defaultProps} />);

    const fitViewBtn = screen.getByTitle('Fit View');
    expect(fitViewBtn).toBeDefined();

    fireEvent.click(fitViewBtn);
    expect(defaultProps.onFitView).toHaveBeenCalledTimes(1);
  });

  it('renders theater mode toggle button and toggles state', () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <WorkflowToolbar {...defaultProps} isTheaterMode={false} onToggleTheaterMode={onToggle} />,
    );

    const fullScreenBtn = screen.getByTitle('Full Screen');
    expect(fullScreenBtn).toBeDefined();

    fireEvent.click(fullScreenBtn);
    expect(onToggle).toHaveBeenCalledTimes(1);

    // Re-render in theater mode
    rerender(
      <WorkflowToolbar {...defaultProps} isTheaterMode={true} onToggleTheaterMode={onToggle} />,
    );

    expect(screen.getByTitle('Exit Full Screen')).toBeDefined();
  });

  it('offsets theater mode container below TitleBar with top-10 to prevent overlap', () => {
    const project: Project = {
      id: 'p1',
      name: 'Test Project',
      category: 'General',
      createdAt: '2026-01-01',
      sortOrder: 0,
    };
    const tasks: Task[] = [
      {
        id: 't1',
        projectId: 'p1',
        title: 'Task 1',
        status: 'To Do',
        priority: 'Medium',
        order: 0,
        created: '2026-01-01',
      },
    ];

    render(<WorkflowView project={project} tasks={tasks} />);

    const container = screen.getByTestId('workflow-canvas-container');
    expect(container.className).toContain('w-full h-full relative');
    expect(container.className).not.toContain('fixed top-10');

    // Click full screen button
    const fullScreenBtn = screen.getByTitle('Full Screen');
    fireEvent.click(fullScreenBtn);

    // Container should now have top-10 offset below TitleBar
    expect(container.className).toContain('fixed top-10 inset-x-0 bottom-0');
    expect(container.className).not.toContain('fixed inset-0');
  });
});
