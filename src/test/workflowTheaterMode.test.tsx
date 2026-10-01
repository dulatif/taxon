import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WorkflowToolbar } from '../components/Workflow/WorkflowToolbar';

describe('Workflow Theater Mode & Toolbar', () => {
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
});
