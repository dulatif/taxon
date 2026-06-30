import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, Trash2, ChevronDown, ChevronRight, ArrowUpDown, SortAsc, X, Filter, Calendar, Tag, Folder, AlertCircle, ChevronsUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, Project } from '../types';
import {
  TaskFilters,
  DEFAULT_FILTERS,
  SortKey,
  PRIORITY_COLORS,
  PRIORITY_ORDER,
  filterTasks,
  sortTasks,
  groupTasksByProject,
  hasActiveFilters,
  getDueDateLabel,
  DueDateRangeKey,
} from '../utils/taskFilters';

interface TaskListViewProps {
  title: string;
  tasks: Task[];
  projects: Project[];
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSelectTask: (task: Task) => void;
}

// ---------------------------------------------------------------------------
// Dropdown popover wrapper
// ---------------------------------------------------------------------------
function FilterPopover({ label, icon: Icon, active, children }: {
  label: string;
  icon: React.ElementType;
  active: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
          active
            ? 'bg-white text-black border-white'
            : 'bg-[#141313] text-[#A1A1AA] border-[#27272A] hover:border-white/40 hover:text-white'
        }`}
      >
        <Icon className="w-3 h-3" />
        {label}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full left-0 mt-1.5 z-50 min-w-[180px] bg-[#0A0A0A] border border-[#27272A] rounded-xl shadow-2xl overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Priority badge pill
// ---------------------------------------------------------------------------
function PriorityBadge({ priority }: { priority: Task['priority'] }) {
  const c = PRIORITY_COLORS[priority];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {priority}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Due date badge
// ---------------------------------------------------------------------------
function DueDateBadge({ dueDate }: { dueDate: string | undefined }) {
  const label = getDueDateLabel(dueDate);
  if (!label) return null;
  const isOverdue = label === 'Overdue';
  const isToday = label === 'Today';
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border ${
      isOverdue
        ? 'text-red-400 border-red-500/40 bg-red-500/10'
        : isToday
        ? 'text-yellow-400 border-yellow-500/40 bg-yellow-500/10'
        : 'text-[#8E9192] border-[#27272A] bg-black/30'
    }`}>
      <Calendar className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Active filter chip
// ---------------------------------------------------------------------------
function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.1 }}
      className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-[10px] font-semibold text-white"
    >
      {label}
      <button onClick={onRemove} className="hover:text-red-400 transition-colors">
        <X className="w-2.5 h-2.5" />
      </button>
    </motion.span>
  );
}

// ---------------------------------------------------------------------------
// Collapsible group section
// ---------------------------------------------------------------------------
function TaskGroup({
  groupName,
  tasks,
  collapsed,
  onToggle,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
}: {
  groupName: string;
  tasks: Task[];
  collapsed: boolean;
  onToggle: () => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSelectTask: (task: Task) => void;
}) {
  const done = tasks.filter(t => t.completed).length;

  return (
    <div className="mb-1">
      {/* Group header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-[#141313]/60 transition-colors group"
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5 text-[#8E9192]" />
          : <ChevronDown className="w-3.5 h-3.5 text-[#8E9192]" />
        }
        <Folder className="w-3.5 h-3.5 text-[#8E9192]" />
        <span className="text-xs font-bold text-[#A1A1AA] tracking-wide">{groupName}</span>
        <span className="text-[10px] font-mono bg-[#1a1a1a] border border-[#27272A] text-[#8E9192] px-1.5 py-0.5 rounded ml-auto">
          {done}/{tasks.length}
        </span>
      </button>

      {/* Group rows */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="divide-y divide-[#27272A]/40 pl-2">
              <AnimatePresence>
                {tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    transition={{ delay: index * 0.03 }}
                    className="py-3 flex items-center justify-between group hover:bg-[#141313]/50 px-2 rounded-lg transition-colors cursor-pointer"
                    onClick={() => onSelectTask(task)}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                        aria-label="Toggle Complete"
                        className="w-4 h-4 rounded border border-[#27272A] flex items-center justify-center shrink-0 hover:border-white transition-colors"
                      >
                        <Check className={`w-2.5 h-2.5 text-white transition-opacity ${task.completed ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                      </button>
                      <div className="min-w-0">
                        <span className={`text-xs font-semibold truncate block max-w-sm ${task.completed ? 'line-through text-[#8E9192]' : 'text-white'}`}>
                          {task.title}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <PriorityBadge priority={task.priority} />
                          <DueDateBadge dueDate={task.dueDate} />
                          {task.labels && task.labels.length > 0 && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-[#8E9192] bg-black/30 border border-[#27272A]/50 px-1.5 py-0.5 rounded">
                              <Tag className="w-2.5 h-2.5" />
                              {task.labels[0]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[9px] font-mono text-[#8E9192] bg-[#141313] border border-[#27272A]/40 px-1.5 py-0.5 rounded hidden group-hover:inline-flex items-center gap-1">
                        {task.duration || '25m'}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                        aria-label="Delete Task"
                        className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TaskListView({
  title,
  tasks,
  projects,
  onToggleTask,
  onDeleteTask,
  onSelectTask,
}: TaskListViewProps) {
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortKey>('dueDate');
  const [groupByProject, setGroupByProject] = useState(true);

  // Apply filter → sort
  const filteredTasks = sortTasks(filterTasks(tasks, filters), sortBy);

  // Build groups (or flat list)
  const groups = groupByProject ? groupTasksByProject(filteredTasks, projects) : null;

  // Collapsed group IDs — start with all collapsed (compact first-look)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());

  // Whenever groups change (filter/group-by toggle), initialise newly-seen IDs as collapsed
  const groupIds = useMemo(
    () => groups?.map(g => g.projectId ?? '__unassigned__') ?? [],
    [groups]
  );
  useEffect(() => {
    if (groupIds.length === 0) return;
    setCollapsedGroups(prev => {
      // Only set IDs that aren't already tracked (preserve user overrides)
      const next = new Set(prev);
      let changed = false;
      groupIds.forEach(id => {
        if (!next.has(id)) { next.add(id); changed = true; }
      });
      return changed ? next : prev;
    });
  }, [groupIds.join(',')]);

  const allExpanded = groupIds.length > 0 && collapsedGroups.size === 0;

  const toggleAllGroups = () => {
    if (allExpanded) {
      // Collapse all
      setCollapsedGroups(new Set(groupIds));
    } else {
      // Expand all
      setCollapsedGroups(new Set());
    }
  };

  const toggleGroup = (id: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const PRIORITIES: Task['priority'][] = ['Critical', 'High', 'Medium', 'Low'];
  const STATUSES: Task['status'][] = ['To Do', 'In Progress', 'Done'];
  const DUE_DATE_OPTIONS: { key: DueDateRangeKey; label: string }[] = [
    { key: 'overdue', label: 'Overdue' },
    { key: 'today',   label: 'Today' },
    { key: 'week',    label: 'This Week' },
    { key: 'month',   label: 'This Month' },
    { key: 'custom',  label: 'Custom Range' },
  ];

  const togglePriority = (p: Task['priority']) => {
    setFilters(f => ({
      ...f,
      priority: f.priority.includes(p) ? f.priority.filter(x => x !== p) : [...f.priority, p],
    }));
  };

  const toggleStatus = (s: Task['status']) => {
    setFilters(f => ({
      ...f,
      status: f.status.includes(s) ? f.status.filter(x => x !== s) : [...f.status, s],
    }));
  };

  const toggleProject = (id: string) => {
    setFilters(f => ({
      ...f,
      projectIds: f.projectIds.includes(id) ? f.projectIds.filter(x => x !== id) : [...f.projectIds, id],
    }));
  };

  const setDueDateRange = (key: DueDateRangeKey) => {
    setFilters(f => ({
      ...f,
      dueDateRange: f.dueDateRange === key ? null : key,
      customFrom: key !== 'custom' ? '' : f.customFrom,
      customTo: key !== 'custom' ? '' : f.customTo,
    }));
  };

  const clearAllFilters = () => setFilters(DEFAULT_FILTERS);

  const activeFilterCount = filters.priority.length + filters.status.length + filters.projectIds.length + (filters.dueDateRange ? 1 : 0);

  const cycleSortBy = () => {
    const order: SortKey[] = ['dueDate', 'priority', 'none'];
    const next = order[(order.indexOf(sortBy) + 1) % order.length];
    setSortBy(next);
  };

  const sortLabel = sortBy === 'dueDate' ? 'Due Date' : sortBy === 'priority' ? 'Priority' : 'Default';

  // Build active chip descriptors
  const activeChips: { label: string; remove: () => void }[] = [
    ...filters.priority.map(p => ({
      label: `Priority: ${p}`,
      remove: () => togglePriority(p),
    })),
    ...filters.status.map(s => ({
      label: `Status: ${s}`,
      remove: () => toggleStatus(s),
    })),
    ...filters.projectIds.map(id => {
      const proj = projects.find(p => p.id === id);
      return {
        label: `Project: ${proj?.name ?? id}`,
        remove: () => toggleProject(id),
      };
    }),
    ...(filters.dueDateRange
      ? [{
          label: `Date: ${DUE_DATE_OPTIONS.find(o => o.key === filters.dueDateRange)?.label ?? filters.dueDateRange}`,
          remove: () => setFilters(f => ({ ...f, dueDateRange: null, customFrom: '', customTo: '' })),
        }]
      : []),
  ];

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 md:px-6">
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#27272A] bg-[#141313]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-white font-mono leading-none">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {/* Expand / Collapse all — only shown when grouped */}
            {groupByProject && (
              <button
                onClick={toggleAllGroups}
                title={allExpanded ? 'Collapse all groups' : 'Expand all groups'}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition-all ${
                  allExpanded
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-transparent border-[#27272A] text-[#8E9192] hover:text-white hover:border-white/30'
                }`}
              >
                <ChevronsUpDown className="w-3 h-3" />
                {allExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            )}
            {/* Group toggle */}
            <button
              onClick={() => setGroupByProject(g => !g)}
              title={groupByProject ? 'Switch to flat list' : 'Group by project'}
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border transition-all ${
                groupByProject
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-transparent border-[#27272A] text-[#8E9192] hover:text-white hover:border-white/30'
              }`}
            >
              <Folder className="w-3 h-3" />
              {groupByProject ? 'Grouped' : 'Flat'}
            </button>
            <span className="text-[10px] font-mono font-bold bg-[#1a1a1a] border border-[#27272A] text-[#8E9192] px-2 py-0.5 rounded">
              {filteredTasks.length} / {tasks.length} Tasks
            </span>
          </div>
        </div>

        {/* ── Filter / Sort Toolbar ── */}
        <div className="px-4 py-3 border-b border-[#27272A]/60 bg-[#0D0D0D] space-y-2">
          {/* Row 1: buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort button */}
            <button
              onClick={cycleSortBy}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
                sortBy !== 'none'
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-[#141313] text-[#A1A1AA] border-[#27272A] hover:border-white/40 hover:text-white'
              }`}
            >
              {sortBy === 'none' ? <ArrowUpDown className="w-3 h-3" /> : <SortAsc className="w-3 h-3" />}
              Sort: {sortLabel}
            </button>

            {/* Priority filter */}
            <FilterPopover
              label="Priority"
              icon={AlertCircle}
              active={filters.priority.length > 0}
            >
              <div className="p-1.5 space-y-0.5">
                {PRIORITIES.map(p => {
                  const c = PRIORITY_COLORS[p];
                  const on = filters.priority.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePriority(p)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors text-left ${
                        on ? 'bg-white/10 text-white' : 'text-[#A1A1AA] hover:bg-[#141313] hover:text-white'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                      {p}
                      {on && <Check className="w-3 h-3 ml-auto text-white" />}
                    </button>
                  );
                })}
              </div>
            </FilterPopover>

            {/* Status filter */}
            <FilterPopover
              label="Status"
              icon={Filter}
              active={filters.status.length > 0}
            >
              <div className="p-1.5 space-y-0.5">
                {STATUSES.map(s => {
                  const on = filters.status.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors text-left ${
                        on ? 'bg-white/10 text-white' : 'text-[#A1A1AA] hover:bg-[#141313] hover:text-white'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full border ${
                        s === 'Done' ? 'bg-green-500 border-green-400' :
                        s === 'In Progress' ? 'bg-blue-500 border-blue-400' :
                        'bg-[#27272A] border-[#3f3f3f]'
                      }`} />
                      {s}
                      {on && <Check className="w-3 h-3 ml-auto text-white" />}
                    </button>
                  );
                })}
              </div>
            </FilterPopover>

            {/* Project filter */}
            <FilterPopover
              label="Project"
              icon={Folder}
              active={filters.projectIds.length > 0}
            >
              <div className="p-1.5 space-y-0.5 max-h-48 overflow-y-auto">
                {projects.map(proj => {
                  const on = filters.projectIds.includes(proj.id);
                  return (
                    <button
                      key={proj.id}
                      onClick={() => toggleProject(proj.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors text-left ${
                        on ? 'bg-white/10 text-white' : 'text-[#A1A1AA] hover:bg-[#141313] hover:text-white'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-sm bg-[#27272A] border border-[#3f3f3f]" />
                      <span className="truncate max-w-[140px]">{proj.name}</span>
                      {on && <Check className="w-3 h-3 ml-auto shrink-0 text-white" />}
                    </button>
                  );
                })}
                {projects.length === 0 && (
                  <div className="px-2.5 py-2 text-[10px] text-[#8E9192]">No projects yet</div>
                )}
              </div>
            </FilterPopover>

            {/* Due date filter */}
            <FilterPopover
              label="Due Date"
              icon={Calendar}
              active={filters.dueDateRange !== null}
            >
              <div className="p-1.5 space-y-0.5">
                {DUE_DATE_OPTIONS.map(opt => {
                  const on = filters.dueDateRange === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => setDueDateRange(opt.key)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors text-left ${
                        on ? 'bg-white/10 text-white' : 'text-[#A1A1AA] hover:bg-[#141313] hover:text-white'
                      }`}
                    >
                      {opt.label}
                      {on && <Check className="w-3 h-3 ml-auto text-white" />}
                    </button>
                  );
                })}
                {/* Custom range inputs */}
                {filters.dueDateRange === 'custom' && (
                  <div className="pt-1 px-1 space-y-1">
                    <input
                      type="date"
                      value={filters.customFrom}
                      onChange={e => setFilters(f => ({ ...f, customFrom: e.target.value }))}
                      className="w-full bg-[#141313] border border-[#27272A] text-[10px] text-white rounded px-2 py-1 focus:outline-none focus:border-white/40"
                    />
                    <input
                      type="date"
                      value={filters.customTo}
                      onChange={e => setFilters(f => ({ ...f, customTo: e.target.value }))}
                      className="w-full bg-[#141313] border border-[#27272A] text-[10px] text-white rounded px-2 py-1 focus:outline-none focus:border-white/40"
                    />
                  </div>
                )}
              </div>
            </FilterPopover>
          </div>

          {/* Row 2: active chips */}
          <AnimatePresence>
            {activeChips.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1.5 flex-wrap overflow-hidden"
              >
                {activeChips.map((chip, i) => (
                  <FilterChip key={i} label={chip.label} onRemove={chip.remove} />
                ))}
                <button
                  onClick={clearAllFilters}
                  className="text-[10px] text-[#8E9192] hover:text-white transition-colors font-semibold ml-1 underline underline-offset-2"
                >
                  Clear all
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Task List ── */}
        <div className="p-3">
          <AnimatePresence mode="wait">
            {filteredTasks.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 text-center text-xs text-[#8E9192]"
              >
                {hasActiveFilters(filters)
                  ? 'No tasks match the current filters.'
                  : 'No records match current parameters.'
                }
              </motion.div>
            ) : groupByProject && groups ? (
              <motion.div key="grouped" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {groups.map(group => {
                  const gid = group.projectId ?? '__unassigned__';
                  return (
                    <TaskGroup
                      key={gid}
                      groupName={group.projectName}
                      tasks={group.tasks}
                      collapsed={collapsedGroups.has(gid)}
                      onToggle={() => toggleGroup(gid)}
                      onToggleTask={onToggleTask}
                      onDeleteTask={onDeleteTask}
                      onSelectTask={onSelectTask}
                    />
                  );
                })}
              </motion.div>
            ) : (
              <motion.div key="flat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="divide-y divide-[#27272A]/40">
                <AnimatePresence>
                  {filteredTasks.map((task, index) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      transition={{ delay: index * 0.03 }}
                      className="py-3 flex items-center justify-between group hover:bg-[#141313]/50 px-2 rounded-lg transition-colors cursor-pointer"
                      onClick={() => onSelectTask(task)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleTask(task.id); }}
                          aria-label="Toggle Complete"
                          className="w-4 h-4 rounded border border-[#27272A] flex items-center justify-center shrink-0 hover:border-white transition-colors"
                        >
                          <Check className={`w-2.5 h-2.5 text-white transition-opacity ${task.completed ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
                        </button>
                        <div className="min-w-0">
                          <span className={`text-xs font-semibold truncate block max-w-sm ${task.completed ? 'line-through text-[#8E9192]' : 'text-white'}`}>
                            {task.title}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <PriorityBadge priority={task.priority} />
                            <DueDateBadge dueDate={task.dueDate} />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[9px] font-mono text-[#8E9192] bg-[#141313] border border-[#27272A]/40 px-1.5 py-0.5 rounded hidden group-hover:inline-flex">
                          {task.duration || '25m'}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                          aria-label="Delete Task"
                          className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}
