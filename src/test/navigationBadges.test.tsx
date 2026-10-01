import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { JumpState } from '../hooks/useVimNavigation';
import NavigationList from '../sections/NavigationList/NavigationList';

describe('NavigationList Keybinding Badges', () => {
  it('does not render shortcut badges when jump mode is inactive', () => {
    const jumpState: JumpState = {
      isActive: false,
      stage: 'category',
      categoryIndex: null,
      indicatorText: '',
    };

    render(
      <NavigationList
        currentView="dashboard"
        selectedProjectId={null}
        onViewChange={vi.fn()}
        jumpState={jumpState}
      />,
    );

    expect(screen.queryByText('d')).toBeNull();
    expect(screen.queryByText('i')).toBeNull();
    expect(screen.queryByText('c')).toBeNull();
  });

  it('renders shortcut badges for navigation items when jump mode is active', () => {
    const jumpState: JumpState = {
      isActive: true,
      stage: 'category',
      categoryIndex: null,
      indicatorText: 'Jump: g > _',
    };

    render(
      <NavigationList
        currentView="dashboard"
        selectedProjectId={null}
        onViewChange={vi.fn()}
        jumpState={jumpState}
      />,
    );

    // Badges for navigation views
    expect(screen.getByText('d')).toBeDefined();
    expect(screen.getByText('i')).toBeDefined();
    expect(screen.getByText('p')).toBeDefined();
    expect(screen.getByText('t')).toBeDefined();
    expect(screen.getByText('c')).toBeDefined();
    expect(screen.getByText('w')).toBeDefined();
    expect(screen.getByText('r')).toBeDefined();
    expect(screen.getByText('a')).toBeDefined();
  });
});
