import { format, isSameDay, isWithinInterval } from 'date-fns';
import { History, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import CalendarGrid, { type SelectionRange } from '../components/CalendarGrid';
import type { ActivityLogEntry, Project, Task } from '../types';
import TaskListView from './TaskListView';

interface WorkLogViewProps {
  tasks: Task[];
  projects: Project[];
  activityLog: ActivityLogEntry[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSelectTask: (task: Task) => void;
}

export default function WorkLogView({
  tasks,
  projects,
  activityLog,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
}: WorkLogViewProps) {
  const [selection, setSelection] = useState<SelectionRange | null>({
    mode: 'day',
    date: new Date(),
  });

  // Map task IDs to their completion dates
  const taskCompletionMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const log of activityLog) {
      map.set(log.taskId, log.completedAt);
    }
    return map;
  }, [activityLog]);

  // Extend tasks with completedAt property for internal use
  const tasksWithCompletion = useMemo(() => {
    return tasks.map((t) => ({
      ...t,
      _completedAt: taskCompletionMap.get(t.id),
    }));
  }, [tasks, taskCompletionMap]);

  // Only consider completed tasks that have a logged completion date
  const completedTasks = useMemo(
    () => tasksWithCompletion.filter((t) => t.completed && t._completedAt),
    [tasksWithCompletion],
  );

  const selectedTasks = useMemo(() => {
    if (!selection) return [];
    return completedTasks.filter((t) => {
      if (!t._completedAt) return false;
      const tDate = new Date(t._completedAt);
      if (selection.mode === 'day') {
        return isSameDay(tDate, selection.date!);
      }
      return isWithinInterval(tDate, { start: selection.start!, end: selection.end! });
    });
  }, [completedTasks, selection]);

  return (
    <div className="flex flex-col h-full bg-surface-primary">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border-primary">
        <h1 className="text-2xl font-semibold text-text-primary flex items-center gap-2">
          <History className="w-6 h-6 text-interactive-primary" />
          Work Log History
        </h1>
        <p className="text-sm text-text-tertiary mt-1">Review tasks you've completed over time.</p>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Calendar Grid Container */}
        <div className="flex-1 h-full p-4 md:p-6 overflow-hidden">
          <CalendarGrid
            completedTasks={completedTasks}
            selection={selection}
            onSelectRange={setSelection}
          />
        </div>

        {/* Selected Date Detail Panel */}
        {selection && (
          <div className="w-full md:w-96 border-l border-border-primary bg-surface-secondary flex flex-col h-full shrink-0">
            <div className="p-4 border-b border-border-primary flex items-center justify-between">
              <h3 className="font-semibold text-text-primary">
                {selection.mode === 'day'
                  ? format(selection.date!, 'EEEE, MMMM do')
                  : `Week of ${format(selection.start!, 'MMM do')}`}
              </h3>
              <button
                type="button"
                onClick={() => setSelection(null)}
                className="p-1 text-text-tertiary hover:text-text-primary rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedTasks.length > 0 ? (
                <TaskListView
                  title=""
                  tasks={selectedTasks}
                  projects={projects}
                  onToggleTask={onToggleTask}
                  onDeleteTask={onDeleteTask}
                  onSelectTask={onSelectTask}
                  isEmbedded={true}
                  isReadOnly={true}
                  defaultGrouped={false}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mb-3">
                    <History className="w-6 h-6 text-text-muted" />
                  </div>
                  <p className="text-sm font-medium text-text-secondary">No tasks logged</p>
                  <p className="text-xs text-text-tertiary mt-1">
                    You didn't complete any tasks on this date.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
