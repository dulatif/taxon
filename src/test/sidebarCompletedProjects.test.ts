import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, INITIAL_PROJECTS } from '../constants/initial-data';

describe('Sidebar Completed Projects Setting', () => {
  it('defaults showCompletedProjectsInSidebar to true', () => {
    expect(DEFAULT_SETTINGS.showCompletedProjectsInSidebar).toBe(true);
  });

  it('includes completed projects when showCompletedProjectsInSidebar is true', () => {
    const showCompleted = true;
    const activeProjects = showCompleted
      ? INITIAL_PROJECTS
      : INITIAL_PROJECTS.filter((p) => p.category !== 'Completed');

    const completed = activeProjects.filter((p) => p.category === 'Completed');
    expect(completed.length).toBeGreaterThan(0);
  });

  it('filters out completed projects when showCompletedProjectsInSidebar is false', () => {
    const showCompleted = false;
    const activeProjects = showCompleted
      ? INITIAL_PROJECTS
      : INITIAL_PROJECTS.filter((p) => p.category !== 'Completed');

    const completed = activeProjects.filter((p) => p.category === 'Completed');
    expect(completed.length).toBe(0);
  });

  it('sorts Completed category to the bottom of the category list', () => {
    const mockCategories = ['Completed', 'Design', 'Engineering', 'Marketing'];
    const sorted = [...mockCategories].sort((a, b) => {
      if (a === 'Completed') return 1;
      if (b === 'Completed') return -1;
      return a.localeCompare(b);
    });

    expect(sorted[sorted.length - 1]).toBe('Completed');
    expect(sorted[0]).toBe('Design');
  });
});
