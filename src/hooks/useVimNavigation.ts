import { useCallback, useEffect, useRef, useState } from 'react';

export interface JumpState {
  isActive: boolean;
  stage: 'category' | 'project';
  categoryIndex: number | null;
  indicatorText: string;
}

export interface UseVimNavigationOptions {
  categories: string[];
  getProjectsForCategory: (cat: string) => { id: string }[];
  onSelectProject: (projectId: string) => void;
  onExpandCategory?: (cat: string) => void;
  onNavigate?: (view: string) => void;
  onOpenCheatsheet?: () => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  enabled?: boolean;
}

export function useVimNavigation({
  categories,
  getProjectsForCategory,
  onSelectProject,
  onExpandCategory,
  onNavigate,
  onOpenCheatsheet,
  onNavigateNext,
  onNavigatePrev,
  enabled = true,
}: UseVimNavigationOptions) {
  const [jumpState, setJumpState] = useState<JumpState>({
    isActive: false,
    stage: 'category',
    categoryIndex: null,
    indicatorText: '',
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const jumpStateRef = useRef(jumpState);

  useEffect(() => {
    jumpStateRef.current = jumpState;
  }, [jumpState]);

  const optsRef = useRef({
    categories,
    getProjectsForCategory,
    onSelectProject,
    onExpandCategory,
    onNavigate,
    onOpenCheatsheet,
    onNavigateNext,
    onNavigatePrev,
  });

  useEffect(() => {
    optsRef.current = {
      categories,
      getProjectsForCategory,
      onSelectProject,
      onExpandCategory,
      onNavigate,
      onOpenCheatsheet,
      onNavigateNext,
      onNavigatePrev,
    };
  });

  const cancelJump = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const next: JumpState = {
      isActive: false,
      stage: 'category',
      categoryIndex: null,
      indicatorText: '',
    };
    jumpStateRef.current = next;
    setJumpState(next);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      cancelJump();
    }, 1500);
  }, [cancelJump]);

  const updateJumpState = useCallback(
    (next: JumpState) => {
      jumpStateRef.current = next;
      setJumpState(next);
      resetTimer();
    },
    [resetTimer],
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key;
      const opts = optsRef.current;

      // Handle Escape in jump mode
      if (key === 'Escape' && jumpStateRef.current.isActive) {
        e.preventDefault();
        cancelJump();
        return;
      }

      // If in Jump mode
      if (jumpStateRef.current.isActive) {
        const { stage, categoryIndex } = jumpStateRef.current;

        if (stage === 'category') {
          // Direct view chords: g s (settings), g p (projects), g t (todo)
          if (key === 's') {
            e.preventDefault();
            cancelJump();
            opts.onNavigate?.('settings');
            return;
          }
          if (key === 'p') {
            e.preventDefault();
            cancelJump();
            opts.onNavigate?.('projects');
            return;
          }
          if (key === 't') {
            e.preventDefault();
            cancelJump();
            opts.onNavigate?.('todo');
            return;
          }

          // Digit 1..9 for category
          const catNum = parseInt(key, 10);
          if (!isNaN(catNum) && catNum >= 1 && catNum <= 9) {
            const catIdx = catNum - 1;
            if (catIdx < opts.categories.length) {
              e.preventDefault();
              const selectedCat = opts.categories[catIdx];
              if (selectedCat && opts.onExpandCategory) {
                opts.onExpandCategory(selectedCat);
              }
              updateJumpState({
                isActive: true,
                stage: 'project',
                categoryIndex: catIdx,
                indicatorText: `Jump: g > ${catNum} > _`,
              });
              return;
            }
          }

          cancelJump();
          return;
        }

        if (stage === 'project' && categoryIndex !== null) {
          const projNum = parseInt(key, 10);
          if (!isNaN(projNum) && projNum >= 1 && projNum <= 9) {
            const selectedCat = opts.categories[categoryIndex];
            if (selectedCat) {
              const projs = opts.getProjectsForCategory(selectedCat);
              const projIdx = projNum - 1;
              if (projIdx < projs.length && projs[projIdx]) {
                e.preventDefault();
                cancelJump();
                opts.onSelectProject(projs[projIdx]!.id);
                return;
              }
            }
          }
          cancelJump();
          return;
        }
      }

      // Normal mode (jump mode inactive)
      if (key === '?') {
        e.preventDefault();
        opts.onOpenCheatsheet?.();
        return;
      }

      if (key === 'j') {
        e.preventDefault();
        opts.onNavigateNext?.();
        return;
      }

      if (key === 'k') {
        e.preventDefault();
        opts.onNavigatePrev?.();
        return;
      }

      if (key === 'g') {
        e.preventDefault();
        updateJumpState({
          isActive: true,
          stage: 'category',
          categoryIndex: null,
          indicatorText: 'Jump: g > _',
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled, cancelJump, updateJumpState]);

  return {
    jumpState,
    cancelJump,
  };
}
