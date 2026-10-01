import { useEffect, useRef } from 'react';

interface EscapeHandlerEntry {
  id: number;
  priority: number;
  handler: () => void;
}

let nextId = 0;
const handlerStack: EscapeHandlerEntry[] = [];
let isListenerAttached = false;

function onKeyDown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return;

  if (handlerStack.length === 0) return;

  // Handler stack is sorted by priority desc, then LIFO (higher id first)
  const top = handlerStack[0];
  if (top) {
    e.preventDefault();
    e.stopPropagation();
    top.handler();
  }
}

function attachGlobalListener() {
  if (!isListenerAttached && typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown, true); // capture phase
    isListenerAttached = true;
  }
}

function detachGlobalListener() {
  if (isListenerAttached && handlerStack.length === 0 && typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeyDown, true);
    isListenerAttached = false;
  }
}

export interface UseEscapeKeyOptions {
  enabled?: boolean;
  priority?: number;
}

/**
 * Registers an Escape key handler in a prioritized LIFO stack.
 * Higher priority handles first; within same priority, most recently registered handles first.
 */
export function useEscapeKey(
  onEscape: () => void,
  { enabled = true, priority = 0 }: UseEscapeKeyOptions = {},
) {
  const handlerRef = useRef(onEscape);

  useEffect(() => {
    handlerRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!enabled) return;

    const id = ++nextId;
    const entry: EscapeHandlerEntry = {
      id,
      priority,
      handler: () => handlerRef.current(),
    };

    // Insert sorted: higher priority first; if equal, higher id (newer) first
    const insertIndex = handlerStack.findIndex(
      (item) => item.priority < priority || (item.priority === priority && item.id < id),
    );

    if (insertIndex === -1) {
      handlerStack.push(entry);
    } else {
      handlerStack.splice(insertIndex, 0, entry);
    }

    attachGlobalListener();

    return () => {
      const idx = handlerStack.findIndex((item) => item.id === id);
      if (idx !== -1) {
        handlerStack.splice(idx, 1);
      }
      detachGlobalListener();
    };
  }, [enabled, priority]);
}

/**
 * Helper exported for testing stack behavior
 */
export function _getHandlerStackSize() {
  return handlerStack.length;
}
