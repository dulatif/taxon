import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AcceptanceChecklistBar,
  categorizeFiles,
  DiffEditorPane,
  DiffFileTree,
  parseAcceptanceCriteria,
  ReviewModal,
  updateAcceptanceCriterion,
} from '../components/DiffViewer';
import type { FileDiffPayload, FileDiffSummary } from '../components/DiffViewer/types';
import type { Task } from '../types';

describe('DiffViewer Subsystem', () => {
  describe('categorizeFiles (Two-Tier Classifier)', () => {
    it('correctly splits declared deliverables vs collateral changes', () => {
      const files: FileDiffSummary[] = [
        { filePath: 'src/types/task.ts', status: 'modified', additions: 5, deletions: 1 },
        { filePath: 'src/services/database.ts', status: 'modified', additions: 12, deletions: 0 },
        { filePath: 'package.json', status: 'modified', additions: 1, deletions: 0 },
        {
          filePath: 'src-tauri/src/commands/git_diff.rs',
          status: 'added',
          additions: 80,
          deletions: 0,
        },
      ];

      const declaredOutputs = ['src/types/task.ts', 'src/services/database.ts'];

      const result = categorizeFiles(files, declaredOutputs);

      expect(result.declared).toHaveLength(2);
      expect(result.declared.map((d) => d.filePath)).toEqual([
        'src/types/task.ts',
        'src/services/database.ts',
      ]);

      expect(result.collateral).toHaveLength(2);
      expect(result.collateral.map((c) => c.filePath)).toEqual([
        'package.json',
        'src-tauri/src/commands/git_diff.rs',
      ]);
    });
  });

  describe('DiffFileTree Component', () => {
    const mockFiles: FileDiffSummary[] = [
      { filePath: 'src/types/task.ts', status: 'modified', additions: 4, deletions: 0 },
      { filePath: 'README.md', status: 'modified', additions: 2, deletions: 1 },
      { filePath: 'src/new-feature.ts', status: 'added', additions: 30, deletions: 0 },
    ];

    it('renders declared and collateral sections with status badges and delta counters', () => {
      const onSelect = vi.fn();
      render(
        <DiffFileTree
          files={mockFiles}
          declaredOutputs={['src/types/task.ts']}
          selectedFile="src/types/task.ts"
          onSelectFile={onSelect}
        />,
      );

      expect(screen.getByText('Declared Deliverables')).toBeInTheDocument();
      expect(screen.getByText('Collateral Changes (Outside Contract)')).toBeInTheDocument();

      // Badges
      expect(screen.getByText('src/types/task.ts')).toBeInTheDocument();
      expect(screen.getByText('+4')).toBeInTheDocument();

      // Click file
      fireEvent.click(screen.getByText('README.md'));
      expect(onSelect).toHaveBeenCalledWith('README.md');
    });
  });

  describe('DiffEditorPane Component & Inline Remediation', () => {
    const payload: FileDiffPayload = {
      filePath: 'src/types/task.ts',
      oldContent: 'export interface Task {\n  id: string;\n}',
      newContent: 'export interface Task {\n  id: string;\n  baseCommit?: string;\n}',
      additions: 1,
      deletions: 0,
      isBinary: false,
    };

    it('renders unified diff view with + indicators', () => {
      const onViewChange = vi.fn();
      render(
        <DiffEditorPane payload={payload} viewMode="unified" onViewModeChange={onViewChange} />,
      );

      expect(screen.getByText('src/types/task.ts')).toBeInTheDocument();
      expect(screen.getByText('baseCommit?: string;')).toBeInTheDocument();
    });

    it('renders side-by-side split view and tracks inline editing dirty state', () => {
      const onViewChange = vi.fn();
      render(<DiffEditorPane payload={payload} viewMode="split" onViewModeChange={onViewChange} />);

      expect(screen.getByText('Original (Baseline)')).toBeInTheDocument();
      expect(screen.getByText('Modified Working Tree (Editable Buffer)')).toBeInTheDocument();

      const textarea = screen.getByPlaceholderText('Empty file content');
      expect(textarea).toBeInTheDocument();

      // Edit content
      fireEvent.change(textarea, {
        target: { value: 'export interface Task { id: string; edited: true; }' },
      });
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
    });

    it('displays binary placeholder for binary payloads', () => {
      const binaryPayload: FileDiffPayload = {
        ...payload,
        isBinary: true,
      };

      render(
        <DiffEditorPane payload={binaryPayload} viewMode="unified" onViewModeChange={vi.fn()} />,
      );

      expect(screen.getByText('Binary file changed')).toBeInTheDocument();
    });
  });

  describe('Acceptance Criteria Parsing & Checklist Bar', () => {
    const markdownWithCriteria = `
## Description
Implement the diff viewer.

## Acceptance Criteria
- [ ] Task interface contains baseCommit.
- [x] SQLite schema adds baseCommit migration.
- [ ] UI shows diff tab.
`;

    it('parses criteria checklist properly', () => {
      const parsed = parseAcceptanceCriteria(markdownWithCriteria);
      expect(parsed).toHaveLength(3);
      expect(parsed[0]?.completed).toBe(false);
      expect(parsed[0]?.text).toBe('Task interface contains baseCommit.');
      expect(parsed[1]?.completed).toBe(true);
      expect(parsed[2]?.completed).toBe(false);
    });

    it('updates criterion status in markdown correctly', () => {
      const updated = updateAcceptanceCriterion(
        markdownWithCriteria,
        'Task interface contains baseCommit.',
        true,
      );
      expect(updated).toContain('- [x] Task interface contains baseCommit.');
    });

    it('disables Approve & Mark Done button until all criteria are completed', () => {
      const task: Task = {
        id: 'dfv001',
        projectId: 'proj1',
        title: 'Task Baseline Capture',
        completed: false,
        duration: '',
        priority: 'High',
        status: 'Need to Test',
        description: markdownWithCriteria,
      };

      const { rerender } = render(
        <AcceptanceChecklistBar task={task} projectPath="/fake/path" onUpdateTask={vi.fn()} />,
      );

      const approveBtn = screen.getByRole('button', { name: /Approve & Mark Done/i });
      expect(approveBtn).toBeDisabled();

      // Rerender with all completed
      const allCompletedDesc = `
## Acceptance Criteria
- [x] Criterion 1
- [x] Criterion 2
`;
      rerender(
        <AcceptanceChecklistBar
          task={{ ...task, description: allCompletedDesc }}
          projectPath="/fake/path"
          onUpdateTask={vi.fn()}
        />,
      );

      const enabledApproveBtn = screen.getByRole('button', { name: /Approve & Mark Done/i });
      expect(enabledApproveBtn).not.toBeDisabled();
    });
  });

  describe('ReviewModal Component', () => {
    it('handles Esc key press to trigger onClose', () => {
      const onClose = vi.fn();
      const task: Task = {
        id: 'dfv006',
        projectId: 'proj1',
        title: 'Review Modal Task',
        completed: false,
        duration: '',
        priority: 'High',
        status: 'Need to Test',
      };

      render(<ReviewModal isOpen={true} onClose={onClose} task={task} onUpdateTask={vi.fn()} />);

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
