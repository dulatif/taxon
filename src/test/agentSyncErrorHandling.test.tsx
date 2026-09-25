import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { extractErrorMessage } from '../hooks/useAgentSync';
import AgentSyncPanel from '../sections/AgentSyncPanel/AgentSyncPanel';
import { createProject } from './factories';

describe('extractErrorMessage helper', () => {
  it('returns message from Error instance', () => {
    expect(extractErrorMessage(new Error('Permission denied'), 'fallback')).toBe(
      'Permission denied',
    );
  });

  it('returns raw string when error is string primitive (from Tauri IPC)', () => {
    expect(extractErrorMessage('Tauri command failed: NotFound', 'fallback')).toBe(
      'Tauri command failed: NotFound',
    );
  });

  it('returns message property when error is an object with message', () => {
    expect(extractErrorMessage({ message: 'DB constraint violation' }, 'fallback')).toBe(
      'DB constraint violation',
    );
  });

  it('returns fallback when error is empty or undefined', () => {
    expect(extractErrorMessage(null, 'Fallback error')).toBe('Fallback error');
    expect(extractErrorMessage(undefined, 'Fallback error')).toBe('Fallback error');
  });
});

describe('AgentSyncPanel - Collapsible & Dismissable Error Banner', () => {
  const mockProject = createProject({
    id: 'proj_1',
    name: 'Test Project',
    vaultPath: '/path/to/vault',
  });

  it('renders short error and calls onDismissError when X is clicked', () => {
    const onDismissError = vi.fn();

    render(
      <AgentSyncPanel
        project={mockProject}
        syncState={{
          exportedTaskCount: 5,
          exportedSprintCount: 1,
          lastExportedAt: new Date().toISOString(),
          lastImportedAt: null,
        }}
        agentEntries={[]}
        isExporting={false}
        isScanning={false}
        hasVaultPath={true}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onSetVaultDirectory={vi.fn()}
        onSelectFile={vi.fn()}
        onRefreshEntries={vi.fn()}
        error="File system write error occurred"
        onDismissError={onDismissError}
        isLiveSyncEnabled={false}
        onToggleLiveSync={vi.fn()}
      />,
    );

    expect(screen.getByText('Sync Error')).toBeInTheDocument();
    expect(screen.getByText('File system write error occurred')).toBeInTheDocument();

    const dismissBtn = screen.getByLabelText('Dismiss error');
    fireEvent.click(dismissBtn);
    expect(onDismissError).toHaveBeenCalledTimes(1);
  });

  it('renders collapsible toggle for long error messages', () => {
    const longError =
      'Custom Tauri Error: Path /some/deeply/nested/directory/.taxon/tasks/TASK-123456-example-task.md failed to write due to OS level file lock from another process.';

    render(
      <AgentSyncPanel
        project={mockProject}
        syncState={{
          exportedTaskCount: 5,
          exportedSprintCount: 1,
          lastExportedAt: new Date().toISOString(),
          lastImportedAt: null,
        }}
        agentEntries={[]}
        isExporting={false}
        isScanning={false}
        hasVaultPath={true}
        onExport={vi.fn()}
        onImport={vi.fn()}
        onSetVaultDirectory={vi.fn()}
        onSelectFile={vi.fn()}
        onRefreshEntries={vi.fn()}
        error={longError}
        onDismissError={vi.fn()}
        isLiveSyncEnabled={false}
        onToggleLiveSync={vi.fn()}
      />,
    );

    const detailsToggle = screen.getByLabelText('Show details');
    expect(detailsToggle).toBeInTheDocument();

    // Click to expand details
    fireEvent.click(detailsToggle);
    expect(screen.getByLabelText('Hide details')).toBeInTheDocument();
  });
});
