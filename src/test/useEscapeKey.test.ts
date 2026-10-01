import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { _getHandlerStackSize, useEscapeKey } from '../hooks/useEscapeKey';

describe('useEscapeKey', () => {
  afterEach(() => {
    // verify stack gets cleaned up
    expect(_getHandlerStackSize()).toBe(0);
  });

  it('triggers handler on Escape keydown', () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useEscapeKey(onEscape));

    expect(_getHandlerStackSize()).toBe(1);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onEscape).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('ignores other keys', () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useEscapeKey(onEscape));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onEscape).not.toHaveBeenCalled();

    unmount();
  });

  it('does not trigger when disabled', () => {
    const onEscape = vi.fn();
    const { unmount } = renderHook(() => useEscapeKey(onEscape, { enabled: false }));

    expect(_getHandlerStackSize()).toBe(0);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(onEscape).not.toHaveBeenCalled();

    unmount();
  });

  it('dispatches to topmost handler in LIFO order for equal priority', () => {
    const bottomHandler = vi.fn();
    const topHandler = vi.fn();

    const bottom = renderHook(() => useEscapeKey(bottomHandler));
    const top = renderHook(() => useEscapeKey(topHandler));

    expect(_getHandlerStackSize()).toBe(2);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(topHandler).toHaveBeenCalledTimes(1);
    expect(bottomHandler).not.toHaveBeenCalled();

    top.unmount();

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(bottomHandler).toHaveBeenCalledTimes(1);

    bottom.unmount();
  });

  it('prioritizes higher priority handler over newer low-priority handler', () => {
    const lowHandler = vi.fn();
    const highHandler = vi.fn();

    // Low priority mounted first
    const low = renderHook(() => useEscapeKey(lowHandler, { priority: 0 }));
    // High priority mounted (e.g. dropdown)
    const high = renderHook(() => useEscapeKey(highHandler, { priority: 10 }));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(highHandler).toHaveBeenCalledTimes(1);
    expect(lowHandler).not.toHaveBeenCalled();

    high.unmount();
    low.unmount();
  });
});
