import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DayPicker } from 'react-day-picker';
import { format, addMonths } from 'date-fns';
import { 
  Rocket, ChevronDown, ChevronUp, Plus, Calendar, Target, CheckCircle2, 
  Play, Edit3, Trash2, X, Check, Clock, Layers, Sparkles, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Sprint, Task } from '../types';

interface SprintDatePickerProps {
  label: string;
  value: string;
  onChange: (dateStr: string) => void;
}

const SprintDatePicker: React.FC<SprintDatePickerProps> = ({ label, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date>(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  const formatDateStr = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return 'Select date';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return format(d, 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`relative ${isOpen ? 'z-[9999]' : 'z-10'}`}>
      <label className="block text-[11px] font-mono text-[#8E9192] mb-1">{label}</label>
      <button
        type="button"
        onClick={() => {
          if (!isOpen && value) {
            const d = new Date(value + 'T00:00:00');
            if (!isNaN(d.getTime())) setPickerMonth(d);
          }
          setIsOpen(!isOpen);
        }}
        className="w-full bg-[#0A0A0A] border border-[#27272A] hover:border-white/30 rounded px-2.5 py-1.5 text-xs text-white flex items-center justify-between transition-colors cursor-pointer focus:outline-none focus:border-[#3B82F6]"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Calendar className="w-3.5 h-3.5 text-[#3B82F6] shrink-0" />
          <span>{formatDisplayDate(value)}</span>
        </span>
        <span className="text-[10px] font-mono text-[#8E9192] shrink-0 ml-1">{value}</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[9998] cursor-default" 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            role="dialog"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-1.5 w-[310px] bg-[#0A0A0A] border border-[#27272A] rounded-xl p-3 z-[9999] shadow-2xl font-sans animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between mb-2 px-1 border-b border-[#27272A] pb-2">
              <span className="text-xs font-bold text-white tracking-wide">
                {format(pickerMonth, 'MMMM yyyy')}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPickerMonth(prev => addMonths(prev, -1))}
                  className="w-6 h-6 rounded-md border border-[#27272A] bg-[#141313] hover:bg-[#201F1F] hover:border-white text-[#8E9192] hover:text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPickerMonth(prev => addMonths(prev, 1))}
                  className="w-6 h-6 rounded-md border border-[#27272A] bg-[#141313] hover:bg-[#201F1F] hover:border-white text-[#8E9192] hover:text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <DayPicker
              mode="single"
              required
              selected={value ? new Date(value + 'T00:00:00') : undefined}
              onSelect={(date) => {
                if (date) {
                  onChange(formatDateStr(date));
                }
                setIsOpen(false);
              }}
              month={pickerMonth}
              onMonthChange={setPickerMonth}
              hideNavigation={true}
            classNames={{
              root: 'taxon-calendar',
              months: 'taxon-months',
              month: 'taxon-month',
              month_caption: 'taxon-caption',
              nav: 'taxon-nav',
              button_previous: 'taxon-nav-button',
              button_next: 'taxon-nav-button',
              month_grid: 'taxon-table',
              weekdays: 'taxon-head-row',
              weekday: 'taxon-head-cell',
              week: 'taxon-row',
              day: 'taxon-cell',
              day_button: 'taxon-day',
              selected: 'taxon-day-selected',
              today: 'taxon-day-today',
              outside: 'taxon-day-outside',
            }}
          />

          <div className="flex justify-end border-t border-[#27272A] pt-2 mt-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-mono text-[#8E9192] hover:text-white px-2 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </>
    )}
  </div>
  );
};

interface SprintPanelProps {
  projectId: string;
  sprints: Sprint[];
  tasks: Task[];
  onCreateSprint: (projectId: string, name: string, startDate: string, endDate: string, goal?: string) => void;
  onEditSprint: (sprintId: string, updates: Partial<Sprint>) => void;
  onCompleteSprintTrigger: (sprint: Sprint) => void;
  onDeleteSprint: (sprintId: string) => void;
  selectedSprintId: string | 'all' | 'backlog';
  onSelectSprint: (sprintId: string | 'all' | 'backlog') => void;
}

export default function SprintPanel({
  projectId,
  sprints,
  tasks,
  onCreateSprint,
  onEditSprint,
  onCompleteSprintTrigger,
  onDeleteSprint,
  selectedSprintId,
  onSelectSprint,
}: SprintPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);

  // Form states for creation
  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const getTwoWeeksStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  };

  const projectSprints = sprints.filter(s => s.projectId === projectId);
  const [newName, setNewName] = useState(`Sprint ${projectSprints.length + 1}`);
  const [newStartDate, setNewStartDate] = useState(getTodayStr());
  const [newEndDate, setNewEndDate] = useState(getTwoWeeksStr());
  const [newGoal, setNewGoal] = useState('');

  // Form states for edit
  const [editName, setEditName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editStatus, setEditStatus] = useState<Sprint['status']>('Planned');

  const activeSprint = projectSprints.find(s => s.status === 'Active');
  const plannedSprints = projectSprints.filter(s => s.status === 'Planned');
  const completedSprints = projectSprints.filter(s => s.status === 'Completed');

  const getSprintStats = (sprintId: string) => {
    const sTasks = tasks.filter(t => t.sprintId === sprintId);
    const completed = sTasks.filter(t => t.completed).length;
    const total = sTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  };

  const handleStartCreate = () => {
    setNewName(`Sprint ${projectSprints.length + 1}`);
    setNewStartDate(getTodayStr());
    setNewEndDate(getTwoWeeksStr());
    setNewGoal('');
    setIsCreating(true);
    setIsExpanded(true);
  };

  const handleSaveNewSprint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onCreateSprint(projectId, newName, newStartDate, newEndDate, newGoal);
    setIsCreating(false);
  };

  const handleStartEdit = (sprint: Sprint) => {
    setEditName(sprint.name);
    setEditStartDate(sprint.startDate);
    setEditEndDate(sprint.endDate);
    setEditGoal(sprint.goal || '');
    setEditStatus(sprint.status);
    setEditingSprintId(sprint.id);
  };

  const handleSaveEdit = (sprintId: string) => {
    if (!editName.trim()) return;
    onEditSprint(sprintId, {
      name: editName.trim(),
      startDate: editStartDate,
      endDate: editEndDate,
      goal: editGoal.trim() || undefined,
      status: editStatus,
    });
    setEditingSprintId(null);
  };

  const formatDateRange = (start: string, end: string) => {
    try {
      const sDate = new Date(start + 'T00:00:00');
      const eDate = new Date(end + 'T00:00:00');
      const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
      return `${sDate.toLocaleDateString('en-US', options)} – ${eDate.toLocaleDateString('en-US', options)}`;
    } catch (_) {
      return `${start} — ${end}`;
    }
  };

  return (
    <div className={`mb-6 bg-[#0A0A0A] border border-[#27272A] rounded-xl shadow-sm transition-all relative ${isExpanded ? 'z-40 overflow-visible' : 'overflow-hidden'}`}>
      {/* Header Bar */}
      <div className={`flex items-center justify-between px-4 py-3 bg-[#141313]/60 border-b border-[#27272A]/80 transition-all ${isExpanded ? 'rounded-t-xl' : 'rounded-xl border-b-0'}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider text-[#8E9192] hover:text-white transition-colors cursor-pointer group"
        >
          <div className="w-6 h-6 bg-[#27272A] group-hover:bg-[#3B82F6]/20 rounded flex items-center justify-center transition-colors">
            <Rocket className="w-3.5 h-3.5 text-[#3B82F6]" />
          </div>
          <span>Sprints & Iterations</span>
          <span className="ml-1 px-2 py-0.5 rounded text-[10px] bg-[#27272A] text-white">
            {activeSprint ? `Active: ${activeSprint.name}` : `${projectSprints.length} Sprints`}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4 ml-1 text-[#8E9192]" /> : <ChevronDown className="w-4 h-4 ml-1 text-[#8E9192]" />}
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30 text-xs font-semibold font-mono transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Sprint</span>
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: isExpanded ? 'visible' : 'hidden' }}
            className="p-4 space-y-4 relative z-40"
          >
            {/* Inline Creation Form */}
            <AnimatePresence>
              {isCreating && (
                <motion.form
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  onSubmit={handleSaveNewSprint}
                  className="bg-[#141313] border border-[#3B82F6]/50 rounded-lg p-4 space-y-3 shadow-lg relative z-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#3B82F6]" />
                      Create New Sprint
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="text-[#8E9192] hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-[#8E9192] mb-1">Sprint Name</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="e.g. Sprint 1"
                        className="w-full bg-[#0A0A0A] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
                        required
                      />
                    </div>
                    <SprintDatePicker
                      label="Start Date"
                      value={newStartDate}
                      onChange={setNewStartDate}
                    />
                    <SprintDatePicker
                      label="End Date"
                      value={newEndDate}
                      onChange={setNewEndDate}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#8E9192] mb-1">Sprint Goal (Optional)</label>
                    <input
                      type="text"
                      value={newGoal}
                      onChange={e => setNewGoal(e.target.value)}
                      placeholder="What is the main objective of this sprint?"
                      className="w-full bg-[#0A0A0A] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#3B82F6]"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3 py-1.5 text-xs font-mono text-[#8E9192] hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 text-xs font-mono font-bold bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded transition-colors cursor-pointer shadow-md shadow-[#3B82F6]/20"
                    >
                      Create & Save
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Active Sprint Section */}
            {activeSprint ? (
              (() => {
                const stats = getSprintStats(activeSprint.id);
                const isSelected = selectedSprintId === activeSprint.id;
                return (
                  <div 
                    onClick={() => onSelectSprint(isSelected ? 'all' : activeSprint.id)}
                    className={`relative rounded-xl border p-4 transition-all cursor-pointer ${isSelected ? 'bg-[#141313] border-[#3B82F6] shadow-lg shadow-[#3B82F6]/10' : 'bg-[#141313] border-[#3B82F6]/40 hover:border-[#3B82F6]/60'}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
                          ACTIVE SPRINT
                        </span>
                        <h4 className="text-sm font-bold text-white tracking-wide font-mono hover:text-[#3B82F6] transition-colors flex items-center gap-1.5">
                          {activeSprint.name}
                        </h4>
                        <span className="text-xs font-mono text-[#8E9192] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-[#8E9192]" />
                          {formatDateRange(activeSprint.startDate, activeSprint.endDate)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectSprint(isSelected ? 'all' : activeSprint.id);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${isSelected ? 'bg-[#3B82F6] text-white font-bold' : 'bg-[#27272A] text-[#8E9192] hover:text-white'}`}
                        >
                          {isSelected ? 'Filtered' : 'Filter Tasks'}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(activeSprint);
                          }}
                          className="p-1.5 rounded bg-[#27272A]/60 hover:bg-[#27272A] text-[#8E9192] hover:text-white transition-colors cursor-pointer"
                          title="Edit Sprint"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onCompleteSprintTrigger(activeSprint);
                          }}
                          className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/10"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Complete
                        </button>
                      </div>
                    </div>

                    {/* Goal if exists */}
                    {activeSprint.goal && (
                      <div className="flex items-start gap-2 text-xs text-[#E4E4E7] bg-[#0A0A0A]/80 border border-[#27272A] rounded-lg p-2.5 mb-3">
                        <Target className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span><strong className="text-amber-400/90 font-mono">Sprint Goal:</strong> {activeSprint.goal}</span>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-[#8E9192]">Progress ({stats.completed}/{stats.total} Tasks)</span>
                        <span className="text-[#60A5FA] font-bold">{stats.percentage}%</span>
                      </div>
                      <div className="w-full h-2 bg-[#27272A] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#3B82F6] to-cyan-400 transition-all duration-500" 
                          style={{ width: `${stats.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="bg-[#141313] border border-[#27272A] rounded-xl p-4 text-center">
                <p className="text-xs font-mono text-[#8E9192]">
                  No active sprint right now. Start a planned sprint below or create a new sprint.
                </p>
              </div>
            )}

            {/* Inline Edit Form Modal / Area */}
            {editingSprintId && (
              <div className="bg-[#141313] border border-[#3B82F6] rounded-lg p-4 space-y-3 shadow-xl relative z-50">
                <div className="flex items-center justify-between border-b border-[#27272A] pb-2">
                  <span className="text-xs font-bold font-mono text-white flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-[#3B82F6]" />
                    Edit Sprint
                  </span>
                  <button onClick={() => setEditingSprintId(null)} className="text-[#8E9192] hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-[#8E9192] mb-1">Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-[#8E9192] mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={e => setEditStatus(e.target.value as Sprint['status'])}
                      className="w-full bg-[#0A0A0A] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="Planned">Planned</option>
                      <option value="Active">Active</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <SprintDatePicker
                    label="Start Date"
                    value={editStartDate}
                    onChange={setEditStartDate}
                  />
                  <SprintDatePicker
                    label="End Date"
                    value={editEndDate}
                    onChange={setEditEndDate}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-[#8E9192] mb-1">Goal</label>
                  <input
                    type="text"
                    value={editGoal}
                    onChange={e => setEditGoal(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingSprintId(null)}
                    className="px-3 py-1.5 text-xs font-mono text-[#8E9192] hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(editingSprintId)}
                    className="px-4 py-1.5 text-xs font-mono font-bold bg-[#3B82F6] hover:bg-[#2563EB] text-white rounded transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Planned & Completed List */}
            {(plannedSprints.length > 0 || completedSprints.length > 0) && (
              <div className="space-y-2 pt-2 border-t border-[#27272A]/60">
                <span className="text-[11px] font-mono text-[#8E9192] uppercase tracking-wider block mb-1">
                  Other Sprints ({plannedSprints.length + completedSprints.length})
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {/* Planned Sprints */}
                  {plannedSprints.map(sprint => {
                    const stats = getSprintStats(sprint.id);
                    const isSelected = selectedSprintId === sprint.id;
                    return (
                      <div
                        key={sprint.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono transition-all ${isSelected ? 'bg-[#141313] border-[#3B82F6]' : 'bg-[#141313]/50 border-[#27272A] hover:border-[#8E9192]'}`}
                      >
                        <div 
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                          onClick={() => onSelectSprint(isSelected ? 'all' : sprint.id)}
                        >
                          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-white block truncate">{sprint.name}</span>
                            <span className="text-[10px] text-[#8E9192]">{formatDateRange(sprint.startDate, sprint.endDate)} • {stats.total} tasks</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => onEditSprint(sprint.id, { status: 'Active' })}
                            className="px-2 py-1 rounded bg-[#3B82F6]/10 hover:bg-[#3B82F6]/20 text-[#60A5FA] border border-[#3B82F6]/30 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                            title="Activate this sprint"
                          >
                            <Play className="w-2.5 h-2.5 fill-current" />
                            Start
                          </button>
                          <button
                            onClick={() => handleStartEdit(sprint)}
                            className="p-1.5 rounded hover:bg-[#27272A] text-[#8E9192] hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteSprint(sprint.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-[#8E9192] hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Completed Sprints */}
                  {completedSprints.map(sprint => {
                    const stats = getSprintStats(sprint.id);
                    const isSelected = selectedSprintId === sprint.id;
                    return (
                      <div
                        key={sprint.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-mono opacity-75 hover:opacity-100 transition-all ${isSelected ? 'bg-[#141313] border-[#3B82F6] opacity-100' : 'bg-[#0A0A0A] border-[#27272A] hover:border-[#8E9192]'}`}
                      >
                        <div 
                          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                          onClick={() => onSelectSprint(isSelected ? 'all' : sprint.id)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <div className="truncate">
                            <span className="font-semibold text-[#8E9192] line-through block truncate">{sprint.name}</span>
                            <span className="text-[10px] text-[#8E9192]">{formatDateRange(sprint.startDate, sprint.endDate)} • {stats.completed}/{stats.total} done</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <button
                            onClick={() => handleStartEdit(sprint)}
                            className="p-1.5 rounded hover:bg-[#27272A] text-[#8E9192] hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteSprint(sprint.id)}
                            className="p-1.5 rounded hover:bg-red-500/10 text-[#8E9192] hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
