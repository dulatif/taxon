import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  Flag,
  FolderOpen,
  Repeat,
  Rocket,
  Tag,
  Trash2,
} from 'lucide-react';
import React, { useState } from 'react';
import DatePicker from '../../components/DatePicker/DatePicker';
import RecurrencePicker from '../../components/RecurrencePicker/RecurrencePicker';
import PropertyCard from '../../elements/PropertyCard';
import type { Project, Sprint, Task } from '../../types';
import { formatDateStr, formatDisplayDate, formatMinutes } from '../../utils/format-date';
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
  onChange: (field: keyof Task, value: any) => void;
}

export default function TaskPropertyGrid({
  task,
  projects,
  sprints,
  onChange,
}: TaskPropertyGridProps) {
  const [activePropertyEdit, setActivePropertyEdit] = useState<string | null>(null);
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');

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
          {(['To Do', 'In Progress', 'Done'] as Task['status'][]).map((s) => (
            <button
              key={s}
              onClick={() => {
                onChange('status', s);
                onChange('completed', s === 'Done');
                setActivePropertyEdit(null);
              }}
              className={`dropdown-item ${
                task.status === s ? 'bg-white/10 text-white font-semibold' : ''
              }`}
            >
              <span>{s}</span>
              {s === 'Done' && <Check className="w-3.5 h-3.5 text-green-400" />}
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
              className={`dropdown-item ${!task.projectId ? 'bg-white/10 text-white font-semibold' : ''}`}
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
                    task.projectId === p.id ? 'bg-white/10 text-white font-semibold' : ''
                  }`}
                >
                  {p.name}
                </button>
              ))}
          </div>
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
                task.priority === p ? 'bg-white/10 text-white font-semibold' : ''
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
              className={`dropdown-item ${!task.sprintId ? 'bg-white/10 text-white font-semibold' : ''}`}
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
                  task.sprintId === s.id ? 'bg-white/10 text-white font-semibold' : ''
                }`}
              >
                <span className="truncate">{s.name}</span>
                <span className="text-[9px] font-mono opacity-70 ml-1">{s.status}</span>
              </button>
            ))}
          </div>
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
                  className="text-[10px] bg-black px-1.5 py-0.5 rounded border border-border-primary text-text-muted hover:text-red-400 hover:border-red-400/40 transition-colors cursor-pointer"
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
      </div>

      {((task.timeEffort && task.timeEffort > 0) || (task.timeSpent && task.timeSpent > 0)) && (
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
          <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-border-primary">
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
