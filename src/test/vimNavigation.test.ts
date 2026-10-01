import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVimNavigation } from '../hooks/useVimNavigation';

describe('useVimNavigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const categories = ['Engineering', 'Design', 'Marketing'];
  const mockProjects: Record<string, { id: string }[]> = {
    Engineering: [{ id: 'proj-eng-1' }, { id: 'proj-eng-2' }],
    Design: [{ id: 'proj-des-1' }],
    Marketing: [{ id: 'proj-mkt-1' }],
  };

  const getProjectsForCategory = (cat: string) => mockProjects[cat] || [];

  it('enters jump mode on g keypress and selects project on sequential digits', () => {
    const onSelectProject = vi.fn();
    const onExpandCategory = vi.fn();

    const { result } = renderHook(() =>
      useVimNavigation({
        categories,
        getProjectsForCategory,
        onSelectProject,
        onExpandCategory,
      }),
    );

    expect(result.current.jumpState.isActive).toBe(false);

    // Press 'g'
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    });

    expect(result.current.jumpState.isActive).toBe(true);
    expect(result.current.jumpState.stage).toBe('category');

    // Press '1' for Engineering
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    });

    expect(onExpandCategory).toHaveBeenCalledWith('Engineering');
    expect(result.current.jumpState.isActive).toBe(true);
    expect(result.current.jumpState.stage).toBe('project');
    expect(result.current.jumpState.categoryIndex).toBe(0);

    // Press '2' for second project in Engineering (proj-eng-2)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    });

    expect(onSelectProject).toHaveBeenCalledWith('proj-eng-2');
    expect(result.current.jumpState.isActive).toBe(false);
  });

  it('triggers view navigation chords: g s, g p, g t, g d, g i, g c, g w, g r, g a', () => {
    const onNavigate = vi.fn();

    renderHook(() =>
      useVimNavigation({
        categories,
        getProjectsForCategory,
        onSelectProject: vi.fn(),
        onNavigate,
      }),
    );

    const testPairs: [string, string][] = [
      ['s', 'settings'],
      ['p', 'projects'],
      ['t', 'todo'],
      ['d', 'dashboard'],
      ['i', 'inbox'],
      ['c', 'scheduled'],
      ['w', 'history'],
      ['r', 'recurring'],
      ['a', 'analytics'],
    ];

    for (const [key, expectedView] of testPairs) {
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
        window.dispatchEvent(new KeyboardEvent('keydown', { key }));
      });
      expect(onNavigate).toHaveBeenCalledWith(expectedView);
    }
  });

  it('triggers cheatsheet on ? key', () => {
    const onOpenCheatsheet = vi.fn();

    renderHook(() =>
      useVimNavigation({
        categories,
        getProjectsForCategory,
        onSelectProject: vi.fn(),
        onOpenCheatsheet,
      }),
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    });

    expect(onOpenCheatsheet).toHaveBeenCalledTimes(1);
  });

  it('cancels jump mode on Escape or timeout', () => {
    const { result } = renderHook(() =>
      useVimNavigation({
        categories,
        getProjectsForCategory,
        onSelectProject: vi.fn(),
      }),
    );

    // Test Escape
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    });
    expect(result.current.jumpState.isActive).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(result.current.jumpState.isActive).toBe(false);

    // Test timeout (1500ms)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'g' }));
    });
    expect(result.current.jumpState.isActive).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1600);
    });
    expect(result.current.jumpState.isActive).toBe(false);
  });

  it('ignores shortcuts when input element is focused', () => {
    const onOpenCheatsheet = vi.fn();

    renderHook(() =>
      useVimNavigation({
        categories,
        getProjectsForCategory,
        onSelectProject: vi.fn(),
        onOpenCheatsheet,
      }),
    );

    const input = document.createElement('input');
    document.body.appendChild(input);

    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
    });

    expect(onOpenCheatsheet).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });
});
