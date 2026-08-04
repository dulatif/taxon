import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  FileCode2,
  Flag,
  Folder,
  FolderOpen,
  GitFork,
  Layers,
  Repeat,
  Rocket,
  Tag,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import DatePicker from '../../components/DatePicker/DatePicker';
import RecurrencePicker from '../../components/RecurrencePicker/RecurrencePicker';
import PropertyCard from '../../elements/PropertyCard';
import type { Project, Sprint, Task } from '../../types';
import {
  formatDateStr,
  formatDisplayDate,
  formatMinutes,
  getTodayStr,
} from '../../utils/format-date';
import { getRecurrenceLabel } from '../../utils/recurrence';

const getPriorityColor = (priority: Task['priority']) => {
  switch (priority) {
    case 'Critical':
      return 'text-red-400 border-red-400/30 bg-red-400/10';
    case 'High':
      return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
    case 'Medium':
      return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
    case 'Low':
      return 'text-text-muted border-border-primary bg-surface-secondary';
    default:
      return 'text-text-muted border-border-primary bg-surface-secondary';
  }
};

interface TaskPropertyGridProps {
  task: Task;
  projects: Project[];
  sprints: Sprint[];
  allTasks?: Task[];
  onChange: <K extends keyof Task>(field: K, value: Task[K]) => void;
}

export default function TaskPropertyGrid({
  task,
  projects,
  sprints,
  allTasks = [],
  onChange,
}: TaskPropertyGridProps) {
  const [activePropertyEdit, setActivePropertyEdit] = useState<string | null>(null);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileText, setNewFileText] = useState('');
  const [moduleGroupInput, setModuleGroupInput] = useState(task.moduleGroup || '');
  const [customDepInput, setCustomDepInput] = useState('');

  const currentProject = projects.find((p) => p.id === task.projectId);
  const projectSprints = sprints.filter(
    (s) => s.projectId === task.projectId && s.status !== 'Completed',
  );
  const currentSprint = sprints.find((s) => s.id === task.sprintId);

  const handleAddLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelText.trim()) return;
    const currentLabels = task.labels || [];
    if (!currentLabels.includes(newLabelText.trim())) {
      onChange('labels', [...currentLabels, newLabelText.trim()]);
    }
    setNewLabelText('');
    setIsAddingLabel(false);
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    const updatedLabels = (task.labels || []).filter((l) => l !== labelToRemove);
    onChange('labels', updatedLabels);
  };

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileText.trim()) return;
    const currentFiles = task.linkedFiles || [];
    if (!currentFiles.includes(newFileText.trim())) {
      onChange('linkedFiles', [...currentFiles, newFileText.trim()]);
    }
    setNewFileText('');
  };

  const existingModuleGroups = useMemo(() => {
    const groups = new Set<string>();
    for (const t of allTasks) {
      if (t.moduleGroup?.trim()) {
        groups.add(t.moduleGroup.trim());
      }
    }
    return Array.from(groups).sort();
  }, [allTasks]);

  const candidateDependencies = useMemo(() => {
    return allTasks.filter(
      (t) => !t.archived && t.id !== task.id && (!task.projectId || t.projectId === task.projectId),
    );
  }, [allTasks, task.id, task.projectId]);

  const getDependencyLabel = (depId: string) => {
    const found = allTasks.find(
      (t) =>
        t.id === depId ||
        t.id.slice(-6) === depId ||
        `TASK-${t.id.slice(-6)}` === depId ||
        `TASK-${t.id}` === depId,
    );
    return found ? `${found.title} (${found.id.slice(-6)})` : depId;
  };

  const handleToggleDependency = (depIdOrTask: Task) => {
    const current = task.dependsOn || [];
    const formattedId = `TASK-${depIdOrTask.id.slice(-6)}`;
    const isPresent = current.some(
      (d) => d === formattedId || d === depIdOrTask.id || d === depIdOrTask.id.slice(-6),
    );

    if (isPresent) {
      const updated = current.filter(
        (d) => d !== formattedId && d !== depIdOrTask.id && d !== depIdOrTask.id.slice(-6),
      );
      onChange('dependsOn', updated);
    } else {
      onChange('dependsOn', [...current, formattedId]);
    }
  };

  const handleRemoveDependency = (depToRemove: string) => {
    const updated = (task.dependsOn || []).filter((d) => d !== depToRemove);
    onChange('dependsOn', updated);
  };

  const handleAddCustomDependency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDepInput.trim()) return;
    const current = task.dependsOn || [];
    const val = customDepInput.trim();
    if (!current.includes(val)) {
      onChange('dependsOn', [...current, val]);
    }
    setCustomDepInput('');
  };

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider font-mono">
        Properties
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Status */}
        <PropertyCard
          icon={
            <CheckCircle2
              className={`w-5 h-5 transition-colors ${
                task.completed ? 'text-green-400' : 'text-text-muted group-hover:text-text-primary'
              }`}
            />
          }
          label="Status"
          value={task.status}
          isActive={activePropertyEdit === 'status'}
          onClick={() => setActivePropertyEdit(activePropertyEdit === 'status' ? null : 'status')}
        >
          {(['To Do', 'In Progress', 'Need to Test', 'Done'] as Task['status'][]).map((s) => (
            <button
              key={s}
              onClick={() => {
                const isDone = s === 'Done';
                onChange('status', s);
                onChange('completed', isDone);
                if (isDone && !task.dueDate) {
                  onChange('dueDate', getTodayStr());
                }
                setActivePropertyEdit(null);
              }}
              className={`dropdown-item ${
                task.status === s ? 'bg-surface-hover text-text-primary font-semibold' : ''
              }`}
            >
              <span>{s}</span>
            </button>
          ))}
        </PropertyCard>

        {/* Project */}
        <PropertyCard
          icon={<FolderOpen className="w-5 h-5" />}
          label="Project"
          value={currentProject ? currentProject.name : 'No Project'}
          isActive={activePropertyEdit === 'project'}
          onClick={() => setActivePropertyEdit(activePropertyEdit === 'project' ? null : 'project')}
        >
          <div className="max-h-48 overflow-y-auto">
            <button
              onClick={() => {
                onChange('projectId', null);
                setActivePropertyEdit(null);
              }}
              className={`dropdown-item ${!task.projectId ? 'bg-surface-hover text-text-primary font-semibold' : ''}`}
            >
              No Project
            </button>
            {projects
              .filter((p) => p.category !== 'Completed')
              .map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    onChange('projectId', p.id);
                    setActivePropertyEdit(null);
                  }}
                  className={`dropdown-item truncate ${
                    task.projectId === p.id
                      ? 'bg-surface-hover text-text-primary font-semibold'
                      : ''
                  }`}
                >
                  {p.name}
                </button>
              ))}
          </div>
        </PropertyCard>

        {/* Module Group (Workflow) */}
        <PropertyCard
          icon={<Layers className="w-5 h-5" />}
          label="Module Group"
          value={task.moduleGroup || 'Ungrouped'}
          isActive={activePropertyEdit === 'moduleGroup'}
          onClick={() =>
            setActivePropertyEdit(activePropertyEdit === 'moduleGroup' ? null : 'moduleGroup')
          }
        >
          {activePropertyEdit === 'moduleGroup' && (
            <div onClick={(e) => e.stopPropagation()} className="p-2 space-y-2">
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={moduleGroupInput}
                  onChange={(e) => setModuleGroupInput(e.target.value)}
                  placeholder="e.g. Auth, Frontend, CLI..."
                  className="w-full bg-surface-secondary border border-border-primary text-xs text-text-primary rounded px-2 py-1.5 focus:outline-none focus:border-white"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    onChange('moduleGroup', moduleGroupInput.trim() || undefined);
                    setActivePropertyEdit(null);
                  }}
                  className="bg-white text-black font-bold text-xs px-2.5 py-1.5 rounded cursor-pointer"
                >
                  Save
                </button>
                {task.moduleGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('moduleGroup', undefined);
                      setModuleGroupInput('');
                      setActivePropertyEdit(null);
                    }}
                    className="bg-red-500/10 text-red-400 border border-red-500/30 text-xs px-2 py-1.5 rounded hover:bg-red-500/20"
                    title="Clear Module"
                  >
                    Clear
                  </button>
                )}
              </div>

              {existingModuleGroups.length > 0 && (
                <div className="pt-1 border-t border-border-primary/60">
                  <div className="text-[10px] text-text-muted font-mono uppercase mb-1">
                    Existing Modules:
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                    {existingModuleGroups.map((group) => (
                      <button
                        key={group}
                        type="button"
                        onClick={() => {
                          onChange('moduleGroup', group);
                          setModuleGroupInput(group);
                          setActivePropertyEdit(null);
                        }}
                        className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                          task.moduleGroup === group
                            ? 'bg-primary text-primary-foreground border-primary font-semibold'
                            : 'bg-surface-secondary text-text-muted border-border-primary hover:text-text-primary'
                        }`}
                      >
                        {group}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </PropertyCard>

        {/* Depends On (Workflow DAG) */}
        <PropertyCard
          icon={<GitFork className="w-5 h-5" />}
          label="Depends On"
          value={
            task.dependsOn && task.dependsOn.length > 0
              ? `${task.dependsOn.length} dependency`
              : 'None (Root Task)'
          }
          isActive={activePropertyEdit === 'dependsOn'}
          onClick={() =>
            setActivePropertyEdit(activePropertyEdit === 'dependsOn' ? null : 'dependsOn')
          }
        >
          {activePropertyEdit === 'dependsOn' && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="p-2 space-y-2 max-h-60 overflow-y-auto"
            >
              {/* Active dependencies chips */}
              {task.dependsOn && task.dependsOn.length > 0 && (
                <div className="space-y-1">
                  <div className="text-[10px] text-text-muted font-mono uppercase">
                    Active Dependencies:
                  </div>
                  <div className="flex flex-col gap-1">
                    {task.dependsOn.map((dep) => (
                      <div
                        key={dep}
                        className="flex items-center justify-between gap-1 text-[11px] bg-surface-secondary px-2 py-1 rounded border border-border-primary text-text-secondary"
                      >
                        <span className="truncate">{getDependencyLabel(dep)}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDependency(dep)}
                          className="text-text-muted hover:text-red-400 p-0.5 text-xs"
                          title="Remove dependency"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Candidate tasks in project */}
              <div className="pt-1 border-t border-border-primary/60">
                <div className="text-[10px] text-text-muted font-mono uppercase mb-1">
                  Add Dependency:
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {candidateDependencies.map((cand) => {
                    const formattedId = `TASK-${cand.id.slice(-6)}`;
                    const isSelected = (task.dependsOn || []).some(
                      (d) => d === formattedId || d === cand.id || d === cand.id.slice(-6),
                    );
                    return (
                      <button
                        key={cand.id}
                        type="button"
                        onClick={() => handleToggleDependency(cand)}
                        className={`w-full text-left flex items-center justify-between p-1.5 rounded text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary/20 text-primary-foreground border border-primary/40'
                            : 'hover:bg-surface-hover text-text-muted hover:text-text-primary'
                        }`}
                      >
                        <span className="truncate flex-1">{cand.title}</span>
                        <span className="text-[10px] font-mono opacity-60 shrink-0 ml-1">
                          {cand.id.slice(-6)}
                        </span>
                      </button>
                    );
                  })}
                  {candidateDependencies.length === 0 && (
                    <div className="text-[10px] text-text-muted italic text-center p-2">
                      No other tasks in this project.
                    </div>
                  )}
                </div>
              </div>

              {/* Custom ID manual input */}
              <form onSubmit={handleAddCustomDependency} className="flex items-center gap-1.5 pt-1">
                <input
                  type="text"
                  value={customDepInput}
                  onChange={(e) => setCustomDepInput(e.target.value)}
                  placeholder="Or enter TASK-xxxxxx..."
                  className="w-full bg-surface-secondary border border-border-primary text-[10px] text-text-primary rounded px-2 py-1 focus:outline-none focus:border-white font-mono"
                />
                <button
                  type="submit"
                  disabled={!customDepInput.trim()}
                  className="bg-white text-black font-bold text-[10px] px-2.5 py-1 rounded disabled:opacity-50"
                >
                  Add
                </button>
              </form>
            </div>
          )}
        </PropertyCard>

        {/* Date */}
        <PropertyCard
          icon={<CalendarIcon className="w-5 h-5" />}
          label="Date"
          value={
            <div className="flex items-center gap-1.5">
              <span
                className={
                  task.dueDate && task.dueDate < formatDateStr(new Date()) && !task.completed
                    ? 'text-red-400 font-semibold'
                    : 'text-text-primary'
                }
              >
                {formatDisplayDate(task.dueDate)}
              </span>
              {task.dueDate && (
                <span className="text-[10px] text-text-muted/60 font-mono">({task.dueDate})</span>
              )}
            </div>
          }
          isActive={activePropertyEdit === 'date'}
          onClick={() => setActivePropertyEdit(activePropertyEdit === 'date' ? null : 'date')}
        >
          {activePropertyEdit === 'date' && (
            <DatePicker
              value={task.dueDate}
              onChange={(d) => onChange('dueDate', d)}
              onClose={() => setActivePropertyEdit(null)}
            />
          )}
        </PropertyCard>

        {/* Recurrence */}
        <PropertyCard
          icon={<Repeat className="w-5 h-5" />}
          label="Recurrence"
          value={getRecurrenceLabel(task.recurrence)}
          isActive={activePropertyEdit === 'recurrence'}
          onClick={() =>
            setActivePropertyEdit(activePropertyEdit === 'recurrence' ? null : 'recurrence')
          }
        >
          {activePropertyEdit === 'recurrence' && (
            <RecurrencePicker
              value={task.recurrence}
              onChange={(r) => {
                onChange('recurrence', r);
              }}
              onClose={() => setActivePropertyEdit(null)}
            />
          )}
        </PropertyCard>

        {/* Priority */}
        <PropertyCard
          icon={<Flag className="w-5 h-5" />}
          label="Priority"
          value={
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${getPriorityColor(
                task.priority,
              )}`}
            >
              {task.priority}
            </span>
          }
          isActive={activePropertyEdit === 'priority'}
          onClick={() =>
            setActivePropertyEdit(activePropertyEdit === 'priority' ? null : 'priority')
          }
        >
          {(['Critical', 'High', 'Medium', 'Low'] as Task['priority'][]).map((p) => (
            <button
              key={p}
              onClick={() => {
                onChange('priority', p);
                setActivePropertyEdit(null);
              }}
              className={`dropdown-item ${
                task.priority === p ? 'bg-surface-hover text-text-primary font-semibold' : ''
              }`}
            >
              <span>{p}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[8px] font-mono border ${getPriorityColor(p)}`}
              >
                {p}
              </span>
            </button>
          ))}
        </PropertyCard>

        {/* Sprint */}
        <PropertyCard
          icon={<Rocket className="w-5 h-5" />}
          label="Sprint"
          value={
            currentSprint
              ? `${currentSprint.name} (${currentSprint.status})`
              : 'Backlog (Unassigned)'
          }
          isActive={activePropertyEdit === 'sprint'}
          onClick={() => setActivePropertyEdit(activePropertyEdit === 'sprint' ? null : 'sprint')}
        >
          <div className="max-h-48 overflow-y-auto">
            <button
              onClick={() => {
                onChange('sprintId', null);
                setActivePropertyEdit(null);
              }}
              className={`dropdown-item ${!task.sprintId ? 'bg-surface-hover text-text-primary font-semibold' : ''}`}
            >
              Backlog (Unassigned)
            </button>
            {projectSprints.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  onChange('sprintId', s.id);
                  setActivePropertyEdit(null);
                }}
                className={`dropdown-item flex items-center justify-between ${
                  task.sprintId === s.id ? 'bg-surface-hover text-text-primary font-semibold' : ''
                }`}
              >
                <span className="truncate">{s.name}</span>
                <span className="text-[9px] font-mono opacity-70 ml-1">{s.status}</span>
              </button>
            ))}
          </div>
        </PropertyCard>

        {/* Workspace Path */}
        <PropertyCard
          icon={<Folder className="w-5 h-5" />}
          label="Workspace"
          value={task.workspacePath ? task.workspacePath.split('/').pop() : 'None Linked'}
          isActive={activePropertyEdit === 'workspace'}
          onClick={() =>
            setActivePropertyEdit(activePropertyEdit === 'workspace' ? null : 'workspace')
          }
        >
          <div className="max-h-48 overflow-y-auto">
            <button
              onClick={() => {
                onChange('workspacePath', undefined);
                setActivePropertyEdit(null);
              }}
              className={`dropdown-item ${!task.workspacePath ? 'bg-surface-hover text-text-primary font-semibold' : ''}`}
            >
              None Linked
            </button>
            {currentProject?.workspacePaths?.map((p) => (
              <button
                key={p}
                onClick={() => {
                  onChange('workspacePath', p);
                  setActivePropertyEdit(null);
                }}
                className={`dropdown-item truncate ${
                  task.workspacePath === p ? 'bg-surface-hover text-text-primary font-semibold' : ''
                }`}
                title={p}
              >
                {p.split('/').pop() || p}
              </button>
            ))}
            {(!currentProject?.workspacePaths || currentProject.workspacePaths.length === 0) && (
              <div className="p-2 text-xs text-text-muted italic text-center">
                Project has no workspaces. Add them in Project details.
              </div>
            )}
          </div>
        </PropertyCard>

        {/* Linked Files */}
        <PropertyCard
          icon={<FileCode2 className="w-5 h-5" />}
          label="Linked Files"
          value={
            task.linkedFiles && task.linkedFiles.length > 0
              ? `${task.linkedFiles.length} file(s)`
              : 'None Linked'
          }
          isActive={isAddingFile}
          onClick={() => setIsAddingFile(!isAddingFile)}
        >
          {isAddingFile && (
            <div onClick={(e) => e.stopPropagation()} className="p-1 space-y-2">
              {task.linkedFiles?.map((file, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <span
                    className="flex-1 text-[10px] bg-surface-primary px-1.5 py-1 rounded border border-border-primary text-text-secondary font-mono truncate"
                    title={file}
                  >
                    {file}
                  </span>
                  <button
                    onClick={() => {
                      const updated = (task.linkedFiles || []).filter((_, i) => i !== idx);
                      onChange('linkedFiles', updated);
                    }}
                    className="text-text-muted hover:text-red-400 p-1"
                  >
                    ×
                  </button>
                </div>
              ))}
              <form onSubmit={handleAddFile} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFileText}
                  onChange={(e) => setNewFileText(e.target.value)}
                  placeholder="src/components/..."
                  className="w-full bg-surface-secondary border border-border-primary text-[10px] text-text-primary rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!newFileText.trim()}
                  className="bg-white text-black font-bold text-[10px] px-3 py-1.5 rounded disabled:opacity-50"
                >
                  Add
                </button>
              </form>
            </div>
          )}
        </PropertyCard>

        {/* Labels */}
        <PropertyCard
          icon={<Tag className="w-5 h-5" />}
          label="Labels"
          value={
            <div className="flex flex-wrap gap-1">
              {(task.labels && task.labels.length > 0 ? task.labels : ['Work']).map((lbl, idx) => (
                <span
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveLabel(lbl);
                  }}
                  className="text-[10px] bg-surface-primary px-1.5 py-0.5 rounded border border-border-primary text-text-muted hover:text-red-400 hover:border-red-400/40 transition-colors cursor-pointer"
                >
                  {lbl} ×
                </span>
              ))}
            </div>
          }
          isActive={isAddingLabel}
          onClick={() => setIsAddingLabel(!isAddingLabel)}
        >
          {isAddingLabel && (
            <form
              onSubmit={handleAddLabel}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 p-1"
            >
              <input
                type="text"
                value={newLabelText}
                onChange={(e) => setNewLabelText(e.target.value)}
                placeholder="New label..."
                className="w-full bg-surface-secondary border border-border-primary text-xs text-text-primary rounded px-2 py-1.5 focus:outline-none focus:border-white"
                autoFocus
              />
              <button
                type="submit"
                disabled={!newLabelText.trim()}
                className="bg-white text-black font-bold text-[10px] px-3 py-1.5 rounded disabled:opacity-50"
              >
                Add
              </button>
            </form>
          )}
        </PropertyCard>

        {/* Reminders */}
        <PropertyCard
          icon={<Clock className="w-5 h-5" />}
          label="Reminders"
          value={
            task.reminders && task.reminders.length > 0 && task.reminders[0] !== 'Add Reminders'
              ? `${task.reminders.length} Set`
              : 'None'
          }
          isActive={activePropertyEdit === 'reminders'}
          onClick={() =>
            setActivePropertyEdit(activePropertyEdit === 'reminders' ? null : 'reminders')
          }
        >
          <div className="p-1">
            <div className="text-xs text-text-muted text-center p-2">Reminders coming soon!</div>
          </div>
        </PropertyCard>

        {/* Time Spent */}
        <PropertyCard
          icon={<Clock className="w-5 h-5" />}
          label="Time Spent"
          value={formatMinutes(task.timeSpent)}
          isActive={activePropertyEdit === 'spent'}
          onClick={() => setActivePropertyEdit(activePropertyEdit === 'spent' ? null : 'spent')}
        >
          <div className="p-1 space-y-2">
            <div className="text-[10px] text-text-muted uppercase font-mono font-bold">
              Quick Log
            </div>
            <div className="grid grid-cols-3 gap-1">
              {[15, 30, 60].map((addM) => (
                <button
                  key={addM}
                  type="button"
                  onClick={() => onChange('timeSpent', (task.timeSpent || 0) + addM)}
                  className="px-2 py-1 bg-surface-secondary hover:bg-white hover:text-black rounded text-[11px] font-mono transition-colors text-text-primary text-center border border-border-primary cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  +{addM}m
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center gap-1.5 pt-1 border-t border-border-primary">
              <input
                type="number"
                min="0"
                placeholder="Mins..."
                value={task.timeSpent || ''}
                onChange={(e) => onChange('timeSpent', parseInt(e.target.value) || 0)}
                className="w-full bg-surface-secondary border border-border-primary text-xs text-text-primary rounded p-1 focus:outline-none focus:border-white"
              />
              <button
                type="button"
                onClick={() => onChange('timeSpent', 0)}
                className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-[10px] font-mono hover:bg-red-500/20"
              >
                Reset
              </button>
            </div>
          </div>
        </PropertyCard>

        {/* Time Effort */}
        <PropertyCard
          icon={<Clock className="w-5 h-5" />}
          label="Time Effort"
          value={formatMinutes(task.timeEffort || 0)}
          isActive={activePropertyEdit === 'effort'}
          onClick={() => setActivePropertyEdit(activePropertyEdit === 'effort' ? null : 'effort')}
        >
          <div className="p-1 space-y-2">
            <div className="flex justify-between items-center gap-1.5 pt-1">
              <input
                type="number"
                min="0"
                placeholder="Mins..."
                value={task.timeEffort || ''}
                onChange={(e) => onChange('timeEffort', parseInt(e.target.value) || 0)}
                className="w-full bg-surface-secondary border border-border-primary text-xs text-text-primary rounded p-1 focus:outline-none focus:border-white"
              />
              <button
                type="button"
                onClick={() => onChange('timeEffort', 0)}
                className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-[10px] font-mono hover:bg-red-500/20"
              >
                Reset
              </button>
            </div>
          </div>
        </PropertyCard>
      </div>
      {((task.timeEffort || 0) > 0 || (task.timeSpent || 0) > 0) && (
        <div className="bg-surface-secondary border border-border-primary rounded-xl p-3.5 space-y-2 mt-3">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-text-muted uppercase font-bold text-[10px]">Time Progress</span>
            <span className="text-text-primary font-bold">
              {formatMinutes(task.timeSpent)} / {formatMinutes(task.timeEffort || 0)}
              {task.timeEffort && task.timeEffort > 0
                ? ` (${Math.round(((task.timeSpent || 0) / task.timeEffort) * 100)}%)`
                : ''}
            </span>
          </div>
          <div className="w-full bg-surface-primary h-2 rounded-full overflow-hidden border border-border-primary">
            <div
              className={`h-full transition-all duration-300 ${
                task.timeEffort && (task.timeSpent || 0) > task.timeEffort
                  ? 'bg-orange-500'
                  : 'bg-green-400'
              }`}
              style={{
                width: `${Math.min(
                  100,
                  task.timeEffort
                    ? Math.round(((task.timeSpent || 0) / task.timeEffort) * 100)
                    : 100,
                )}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
