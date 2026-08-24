import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SidebarProjectList from '../sections/SidebarProjectList/SidebarProjectList';
import type { Project } from '../types';

const mockProjects: Project[] = [
  {
    id: 'proj_1',
    name: 'Taxon App',
    description: 'Personal task app',
    category: 'Development',
    progress: 50,
    pinned: true,
    pinnedSortOrder: 0,
  },
  {
    id: 'proj_2',
    name: 'Website Redesign',
    description: 'Marketing website',
    category: 'Design',
    progress: 30,
    pinned: true,
    pinnedSortOrder: 1,
  },
  {
    id: 'proj_3',
    name: 'Documentation',
    description: 'Project docs',
    category: 'Development',
    progress: 10,
    pinned: false,
  },
];

describe('SidebarProjectList - Pinned Project Ordering', () => {
  it('renders pinned projects with unique DOM IDs distinct from category projects', () => {
    const onProjectSelect = vi.fn();
    const onAddProjectClick = vi.fn();
    const onDragEnd = vi.fn();

    render(
      <SidebarProjectList
        activeProjects={mockProjects}
        categories={['Development', 'Design']}
        selectedProjectId={null}
        onProjectSelect={onProjectSelect}
        onAddProjectClick={onAddProjectClick}
        onDragEnd={onDragEnd}
      />,
    );

    // Verify pinned project elements exist
    const pinnedProject1 = document.getElementById('sidebar-pinned-project-proj_1');
    const categoryProject1 = document.getElementById('sidebar-project-proj_1');

    expect(pinnedProject1).toBeInTheDocument();
    expect(categoryProject1).toBeInTheDocument();
    expect(pinnedProject1).not.toBe(categoryProject1);

    expect(screen.getByText('Pinned (2)')).toBeInTheDocument();
  });
});
