import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskDetailView from '../components/TaskDetailView/TaskDetailView';
import { render, screen } from '../test/helpers';
import type { Task } from '../types';

describe('TaskDetailView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const baseTask: Task = {
    id: 'grf005',
    title: 'Render task contracts in TaskDetailView',
    completed: false,
    duration: '',
    priority: 'Medium',
    status: 'In Progress',
    projectId: 'proj_1',
    description: `## Description
Render contracts and acceptance criteria cleanly.

## Deliverables
- [TaskDetailView.tsx](file:///src/components/TaskDetailView.tsx): Updated component

## Acceptance Criteria
- [ ] Displays editable inputs
- [x] Displays outputs list
`,
    inputs: ['src/types/task.ts', 'docs/contracts/api.md'],
    outputs: ['src/components/TaskDetailView/TaskDetailView.tsx'],
    linkedFiles: ['src/App.tsx'],
    subtasks: [
      { id: 'sub-1', title: 'Subtask 1', completed: false },
      { id: 'sub-2', title: 'Subtask 2', completed: true },
    ],
  };

  const defaultProps = {
    task: baseTask,
    projects: [{ id: 'proj_1', name: 'Taxon', description: '', progress: 0, category: 'Dev' }],
    sprints: [],
    allTasks: [baseTask],
    onClose: vi.fn(),
    onUpdateTask: vi.fn(),
    onDeleteTask: vi.fn(),
    onStartFocus: vi.fn(),
  };

  it('renders input contracts and allows adding and removing inputs', async () => {
    const user = userEvent.setup();
    render(<TaskDetailView {...defaultProps} />);

    expect(screen.getByText('Input Contracts')).toBeInTheDocument();
    expect(screen.getByText('src/types/task.ts')).toBeInTheDocument();
    expect(screen.getByText('docs/contracts/api.md')).toBeInTheDocument();

    // Add input
    const inputField = screen.getByPlaceholderText('Add input (e.g. src/types/task.ts)...');
    await user.type(inputField, 'src/services/database.ts');

    const addButtons = screen.getAllByRole('button', { name: /Add/i });
    // Click the Add button corresponding to inputs
    await user.click(addButtons[0]!);

    expect(defaultProps.onUpdateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: ['src/types/task.ts', 'docs/contracts/api.md', 'src/services/database.ts'],
      }),
    );
  });

  it('renders output targets and allows adding outputs', async () => {
    const user = userEvent.setup();
    render(<TaskDetailView {...defaultProps} />);

    expect(screen.getByText('Output Targets')).toBeInTheDocument();
    expect(
      screen.getByText('src/components/TaskDetailView/TaskDetailView.tsx'),
    ).toBeInTheDocument();

    // Add output
    const outputField = screen.getByPlaceholderText(
      'Add output target (e.g. src/components/New.tsx)...',
    );
    await user.type(outputField, 'src/test/TaskDetailView.test.tsx');

    const addButtons = screen.getAllByRole('button', { name: /Add/i });
    await user.click(addButtons[1]!);

    expect(defaultProps.onUpdateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        outputs: [
          'src/components/TaskDetailView/TaskDetailView.tsx',
          'src/test/TaskDetailView.test.tsx',
        ],
      }),
    );
  });

  it('renders linked files and allows adding linked file', async () => {
    const user = userEvent.setup();
    render(<TaskDetailView {...defaultProps} />);

    expect(screen.getAllByText('Linked Files')[0]).toBeInTheDocument();
    expect(screen.getByText('src/App.tsx')).toBeInTheDocument();

    const linkField = screen.getByPlaceholderText('Add linked file (e.g. src/utils/helper.ts)...');
    await user.type(linkField, 'src/services/agentSync.ts');

    const addButtons = screen.getAllByRole('button', { name: /Add/i });
    await user.click(addButtons[2]!);

    expect(defaultProps.onUpdateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        linkedFiles: ['src/App.tsx', 'src/services/agentSync.ts'],
      }),
    );
  });

  it('renders acceptance criteria and toggles checklist item in description', async () => {
    const user = userEvent.setup();
    render(<TaskDetailView {...defaultProps} />);

    expect(screen.getByText('Acceptance Criteria')).toBeInTheDocument();
    expect(screen.getByText('Displays editable inputs')).toBeInTheDocument();
    expect(screen.getByText('Displays outputs list')).toBeInTheDocument();
    expect(screen.getByText('1/2 Completed')).toBeInTheDocument();

    // Click on uncompleted criterion 'Displays editable inputs'
    await user.click(screen.getByText('Displays editable inputs'));

    expect(defaultProps.onUpdateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('- [x] Displays editable inputs'),
      }),
    );
  });

  it('adds a new acceptance criterion to description', async () => {
    const user = userEvent.setup();
    render(<TaskDetailView {...defaultProps} />);

    const criterionInput = screen.getByPlaceholderText('Add acceptance criterion...');
    await user.type(criterionInput, 'Clean UI styling');

    const addButtons = screen.getAllByRole('button', { name: /Add/i });
    await user.click(addButtons[3]!);

    expect(defaultProps.onUpdateTask).toHaveBeenCalledWith(
      expect.objectContaining({
        description: expect.stringContaining('- [ ] Clean UI styling'),
      }),
    );
  });

  it('renders deliverables section', () => {
    render(<TaskDetailView {...defaultProps} />);

    expect(screen.getAllByText('Deliverables')[0]).toBeInTheDocument();
  });
});
