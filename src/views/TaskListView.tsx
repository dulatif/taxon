import {
  AlertCircle,
  ArrowUpDown,
  Calendar,
  Check,
  ChevronDown,
  Filter,
  Folder,
  SortAsc,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useEffect, useRef, useState } from 'react';
import TaskEmptyState from '../sections/TaskList/TaskEmptyState';
import TaskListGroup from '../sections/TaskList/TaskListGroup';
import TaskListHeader from '../sections/TaskList/TaskListHeader';
import TaskListItem from '../sections/TaskList/TaskListItem';
import type { Project, Task } from '../types';
import {
  DEFAULT_FILTERS,
  type DueDateRangeKey,
  filterTasks,
  groupTasksByProject,
  hasActiveFilters,
  PRIORITY_COLORS,
  type SortKey,
  sortTasks,
  type TaskFilters,
} from '../utils/taskFilters';

interface TaskListViewProps {
  key?: React.Key;
  title: string;
  tasks: Task[];
  projects: Project[];
  defaultGrouped?: boolean;
  isInboxView?: boolean;
  isRecurringView?: boolean;
  isEmbedded?: boolean;
  onAddTask?: (title: string) => void;
  addTaskPlaceholder?: string;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onSelectTask: (task: Task) => void;
}

// ---------------------------------------------------------------------------
// Dropdown popover wrapper
// ---------------------------------------------------------------------------
function FilterPopover({
  label,
  icon: Icon,
  active,
  children,
}: {
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
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
          active
            ? 'bg-white text-black border-white'
            : 'bg-surface-secondary text-text-muted border-border-primary hover:border-white/40 hover:text-white'
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
            className="absolute top-full left-0 mt-1.5 z-50 min-w-[180px] bg-surface-primary border border-border-primary rounded-xl shadow-2xl overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active filter chip
// ---------------------------------------------------------------------------
const FilterChip: React.FC<{ label: string; onRemove: () => void }> = ({ label, onRemove }) => {
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
      <button onClick={onRemove} className="hover:text-red-400 transition-colors cursor-pointer">
        <X className="w-2.5 h-2.5" />
      </button>
    </motion.span>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TaskListView({
  title,
  tasks,
  projects,
  defaultGrouped = true,
  isInboxView = false,
  isRecurringView = false,
  isEmbedded = false,
  onAddTask,
  addTaskPlaceholder = 'Add a new task...',
  onToggleTask,
  onDeleteTask,
  onSelectTask,
}: TaskListViewProps) {
  const isSimpleView = isInboxView || isRecurringView;
  const [filters, setFilters] = useState<TaskFilters>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortKey>('dueDate');
  const [groupByProject, setGroupByProject] = useState(defaultGrouped);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !onAddTask) return;
    onAddTask(newTaskTitle.trim());
    setNewTaskTitle('');
  };

  // Apply filter → sort
  const filteredTasks = sortTasks(filterTasks(tasks, filters), sortBy);

  // Build groups (or flat list)
  const groups = groupByProject ? groupTasksByProject(filteredTasks, projects) : null;

  // Collapsed group IDs — start with all collapsed (compact first-look)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => new Set());

  // Whenever groups change (filter/group-by toggle), initialise newly-seen IDs as collapsed
  const groupIds = groups?.map((g) => g.projectId ?? '__unassigned__') ?? [];
  useEffect(() => {
    if (groupIds.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCollapsedGroups((prev) => {
      // Only set IDs that aren't already tracked (preserve user overrides)
      const next = new Set(prev);
      let changed = false;
      groupIds.forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const PRIORITIES: Task['priority'][] = ['Critical', 'High', 'Medium', 'Low'];
  const STATUSES: Task['status'][] = ['To Do', 'In Progress', 'Done'];
  const DUE_DATE_OPTIONS: { key: DueDateRangeKey; label: string }[] = [
    { key: 'overdue', label: 'Overdue' },
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'custom', label: 'Custom Range' },
  ];

  const togglePriority = (p: Task['priority']) => {
    setFilters((f) => ({
      ...f,
      priority: f.priority.includes(p) ? f.priority.filter((x) => x !== p) : [...f.priority, p],
    }));
  };

  const toggleStatus = (s: Task['status']) => {
    setFilters((f) => ({
      ...f,
      status: f.status.includes(s) ? f.status.filter((x) => x !== s) : [...f.status, s],
    }));
  };

  const toggleProject = (id: string) => {
    setFilters((f) => ({
      ...f,
      projectIds: f.projectIds.includes(id)
        ? f.projectIds.filter((x) => x !== id)
        : [...f.projectIds, id],
    }));
  };

  const setDueDateRange = (key: DueDateRangeKey) => {
    setFilters((f) => ({
      ...f,
      dueDateRange: f.dueDateRange === key ? null : key,
      customFrom: key !== 'custom' ? '' : f.customFrom,
      customTo: key !== 'custom' ? '' : f.customTo,
    }));
  };

  const clearAllFilters = () => setFilters(DEFAULT_FILTERS);

  const cycleSortBy = () => {
    const order: SortKey[] = ['dueDate', 'priority', 'none'];
    const next = order[(order.indexOf(sortBy) + 1) % order.length];
    setSortBy(next as SortKey);
  };

  const sortLabel =
    sortBy === 'dueDate' ? 'Due Date' : sortBy === 'priority' ? 'Priority' : 'Default';

  // Build active chip descriptors
  const activeChips: { label: string; remove: () => void }[] = [
    ...filters.priority.map((p) => ({
      label: `Priority: ${p}`,
      remove: () => togglePriority(p),
    })),
    ...filters.status.map((s) => ({
      label: `Status: ${s}`,
      remove: () => toggleStatus(s),
    })),
    ...filters.projectIds.map((id) => {
      const proj = projects.find((p) => p.id === id);
      return {
        label: `Project: ${proj?.name ?? id}`,
        remove: () => toggleProject(id),
      };
    }),
    ...(filters.dueDateRange
      ? [
          {
            label: `Date: ${DUE_DATE_OPTIONS.find((o) => o.key === filters.dueDateRange)?.label ?? filters.dueDateRange}`,
            remove: () =>
              setFilters((f) => ({ ...f, dueDateRange: null, customFrom: '', customTo: '' })),
          },
        ]
      : []),
  ];

  return (
    <div className={isEmbedded ? 'w-full' : 'max-w-4xl mx-auto py-6 px-4 md:px-6'}>
      <div className="bg-surface-primary border border-border-primary rounded-xl overflow-hidden">
        {/* ── Header ── */}
        <TaskListHeader
          title={title}
          isSimpleView={isSimpleView}
          groupByProject={groupByProject}
          allExpanded={allExpanded}
          filteredTasksCount={filteredTasks.length}
          totalTasksCount={tasks.length}
          toggleAllGroups={toggleAllGroups}
          setGroupByProject={setGroupByProject}
        />

        {/* ── Filter / Sort Toolbar ── */}
        <div className="px-4 py-3 border-b border-border-primary/60 bg-surface-secondary space-y-2">
          {/* Row 1: buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort button */}
            <button
              onClick={cycleSortBy}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                sortBy !== 'none'
                  ? 'bg-white/10 text-white border-white/20'
                  : 'bg-surface-secondary text-text-muted border-border-primary hover:border-white/40 hover:text-white'
              }`}
            >
              {sortBy === 'none' ? (
                <ArrowUpDown className="w-3 h-3" />
              ) : (
                <SortAsc className="w-3 h-3" />
              )}
              Sort: {sortLabel}
            </button>

            {/* Priority filter */}
            <FilterPopover label="Priority" icon={AlertCircle} active={filters.priority.length > 0}>
              <div className="p-1.5 space-y-0.5">
                {PRIORITIES.map((p) => {
                  const c = PRIORITY_COLORS[p];
                  const on = filters.priority.includes(p);
                  return (
                    <button
                      key={p}
                      onClick={() => togglePriority(p)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors text-left cursor-pointer ${
                        on
                          ? 'bg-white/10 text-white'
                          : 'text-text-muted hover:bg-surface-hover hover:text-white'
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
            <FilterPopover label="Status" icon={Filter} active={filters.status.length > 0}>
              <div className="p-1.5 space-y-0.5">
                {STATUSES.map((s) => {
                  const on = filters.status.includes(s);
                  return (
                    <button
                      key={s}
                      onClick={() => toggleStatus(s)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors text-left cursor-pointer ${
                        on
                          ? 'bg-white/10 text-white'
                          : 'text-text-muted hover:bg-surface-hover hover:text-white'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full border ${
                          s === 'Done'
                            ? 'bg-green-500 border-green-400'
                            : s === 'In Progress'
                              ? 'bg-blue-500 border-blue-400'
                              : 'bg-surface-secondary border-border-primary'
                        }`}
                      />
                      {s}
                      {on && <Check className="w-3 h-3 ml-auto text-white" />}
                    </button>
                  );
                })}
              </div>
            </FilterPopover>

            {/* Project filter */}
            {!isSimpleView && (
              <FilterPopover label="Project" icon={Folder} active={filters.projectIds.length > 0}>
                <div className="p-1.5 space-y-0.5 max-h-48 overflow-y-auto">
                  {projects.map((proj) => {
                    const on = filters.projectIds.includes(proj.id);
                    return (
                      <button
                        key={proj.id}
                        onClick={() => toggleProject(proj.id)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors text-left cursor-pointer ${
                          on
                            ? 'bg-white/10 text-white'
                            : 'text-text-muted hover:bg-surface-hover hover:text-white'
                        }`}
                      >
                        <span className="w-2 h-2 rounded-sm bg-surface-secondary border border-border-primary" />
                        <span className="truncate max-w-[140px]">{proj.name}</span>
                        {on && <Check className="w-3 h-3 ml-auto shrink-0 text-white" />}
                      </button>
                    );
                  })}
                  {projects.length === 0 && (
                    <div className="px-2.5 py-2 text-[10px] text-text-muted">No projects yet</div>
                  )}
                </div>
              </FilterPopover>
            )}

            {/* Due date filter */}
            {!isSimpleView && (
              <FilterPopover
                label="Due Date"
                icon={Calendar}
                active={filters.dueDateRange !== null}
              >
                <div className="p-1.5 space-y-0.5">
                  {DUE_DATE_OPTIONS.map((opt) => {
                    const on = filters.dueDateRange === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setDueDateRange(opt.key)}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors text-left cursor-pointer ${
                          on
                            ? 'bg-white/10 text-white'
                            : 'text-text-muted hover:bg-surface-hover hover:text-white'
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
                        onChange={(e) => setFilters((f) => ({ ...f, customFrom: e.target.value }))}
                        className="w-full bg-surface-secondary border border-border-primary text-[10px] text-text-primary rounded px-2 py-1 focus:outline-none focus:border-white/40"
                      />
                      <input
                        type="date"
                        value={filters.customTo}
                        onChange={(e) => setFilters((f) => ({ ...f, customTo: e.target.value }))}
                        className="w-full bg-surface-secondary border border-border-primary text-[10px] text-text-primary rounded px-2 py-1 focus:outline-none focus:border-white/40"
                      />
                    </div>
                  )}
                </div>
              </FilterPopover>
            )}
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
                  className="text-[10px] text-text-muted hover:text-text-primary transition-colors font-semibold ml-1 underline underline-offset-2 cursor-pointer"
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
              <TaskEmptyState hasActiveFilters={hasActiveFilters(filters)} />
            ) : groupByProject && groups ? (
              <motion.div key="grouped" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {groups.map((group) => {
                  const gid = group.projectId ?? '__unassigned__';
                  return (
                    <TaskListGroup
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
              <motion.div
                key="flat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="divide-y divide-border-primary/40"
              >
                <AnimatePresence>
                  {filteredTasks.map((task, index) => (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      index={index}
                      onToggleTask={onToggleTask}
                      onDeleteTask={onDeleteTask}
                      onSelectTask={onSelectTask}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add Task Input (if provided) */}
          {onAddTask && (
            <div className="mt-2 pt-2 border-t border-border-primary/50">
              <form onSubmit={handleAddTaskSubmit}>
                <input
                  type="text"
                  placeholder={addTaskPlaceholder}
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none px-3 py-2 rounded hover:bg-surface-secondary/50 transition-colors"
                />
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
