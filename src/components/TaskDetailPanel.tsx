import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DayPicker } from 'react-day-picker';
import { format, addMonths } from 'date-fns';
import {
  X,
  CheckCircle2,
  FolderOpen,
  Calendar as CalendarIcon,
  Flag,
  Tag,
  Clock,
  Maximize2,
  Plus,
  Trash2,
  Check,
  Square,
  CheckSquare,
  Timer,
  Repeat,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Rocket
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Task, Project, SubTask, RecurrenceRule, RecurrenceFrequency, Sprint } from '../types';

const getRecurrenceLabel = (rule?: RecurrenceRule) => {
  if (!rule) return 'None';
  if (rule.frequency === 'daily') return rule.interval && rule.interval > 1 ? `Every ${rule.interval} days` : 'Daily';
  if (rule.frequency === 'weekdays') return 'Weekdays (Mon-Fri)';
  if (rule.frequency === 'weekly') {
    if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
      const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const days = rule.daysOfWeek.map(d => names[d]).join(', ');
      return rule.interval && rule.interval > 1 ? `Every ${rule.interval} wks on ${days}` : `Weekly on ${days}`;
    }
    return rule.interval && rule.interval > 1 ? `Every ${rule.interval} weeks` : 'Weekly';
  }
  if (rule.frequency === 'monthly') return rule.interval && rule.interval > 1 ? `Every ${rule.interval} months` : 'Monthly';
  if (rule.frequency === 'yearly') return rule.interval && rule.interval > 1 ? `Every ${rule.interval} years` : 'Yearly';
  if (rule.frequency === 'custom') return `Every ${rule.interval || 1} days`;
  return 'None';
};

const formatMinutes = (mins?: number): string => {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const formatDateStr = (d: Date): string => {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getPresetDates = () => {
  const now = new Date();
  const today = formatDateStr(now);

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(now.getDate() + 1);
  const tomorrow = formatDateStr(tomorrowDate);

  const satDate = new Date(now);
  const daysUntilSat = (6 - now.getDay() + 7) % 7 || 7;
  satDate.setDate(now.getDate() + daysUntilSat);
  const thisSaturday = formatDateStr(satDate);

  const monDate = new Date(now);
  const daysUntilMon = (1 - now.getDay() + 7) % 7 || 7;
  monDate.setDate(now.getDate() + daysUntilMon);
  const nextMonday = formatDateStr(monDate);

  const weekDate = new Date(now);
  weekDate.setDate(now.getDate() + 7);
  const nextWeek = formatDateStr(weekDate);

  return [
    { label: 'Today', date: today, sub: 'Later today' },
    { label: 'Tomorrow', date: tomorrow, sub: tomorrowDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) },
    { label: 'This Weekend', date: thisSaturday, sub: satDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) },
    { label: 'Next Week', date: nextMonday, sub: monDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) },
    { label: 'In 1 Week', date: nextWeek, sub: weekDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) },
  ];
};

const formatDisplayDate = (dateStr?: string) => {
  if (!dateStr || dateStr.trim() === '') return 'Unscheduled';
  const today = formatDateStr(new Date());
  if (dateStr === today) return 'Today';
  const tomDate = new Date();
  tomDate.setDate(tomDate.getDate() + 1);
  if (dateStr === formatDateStr(tomDate)) return 'Tomorrow';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  } catch (_) {}
  return dateStr;
};

interface TaskDetailPanelProps {
  task: Task | null;
  projects: Project[];
  sprints?: Sprint[];
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TaskDetailPanel({
  task,
  projects,
  sprints,
  onClose,
  onUpdateTask,
  onDeleteTask
}: TaskDetailPanelProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [newLabelText, setNewLabelText] = useState('');
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [activePropertyEdit, setActivePropertyEdit] = useState<string | null>(null);
  const [isCustomRecurrence, setIsCustomRecurrence] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date>(new Date());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (task) {
      setEditedTask({
        ...task,
        labels: task.labels || ['Work'],
        reminders: task.reminders || ['Add Reminders'],
        subtasks: task.subtasks || []
      });
      if (task.dueDate) {
        const parsed = new Date(task.dueDate + 'T00:00:00');
        if (!isNaN(parsed.getTime())) setPickerMonth(parsed);
      } else {
        setPickerMonth(new Date());
      }
    } else {
      setEditedTask(null);
    }
  }, [task]);

  if (!task || !editedTask) return null;

  const handleFieldChange = (field: keyof Task, value: any) => {
    const updated = { ...editedTask, [field]: value };
    setEditedTask(updated);
    onUpdateTask(updated);
  };

  const handleAddSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubTaskTitle.trim()) return;
    const newSub: SubTask = {
      id: `sub_${Date.now()}`,
      title: newSubTaskTitle.trim(),
      completed: false
    };
    const updatedSubtasks = [...(editedTask.subtasks || []), newSub];
    handleFieldChange('subtasks', updatedSubtasks);
    setNewSubTaskTitle('');
  };

  const handleToggleSubTask = (subId: string) => {
    const updatedSubtasks = (editedTask.subtasks || []).map(st =>
      st.id === subId ? { ...st, completed: !st.completed } : st
    );
    handleFieldChange('subtasks', updatedSubtasks);
  };

  const handleDeleteSubTask = (subId: string) => {
    const updatedSubtasks = (editedTask.subtasks || []).filter(st => st.id !== subId);
    handleFieldChange('subtasks', updatedSubtasks);
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;

    const updatedSubtasks = Array.from(editedTask.subtasks || []);
    const [reorderedItem] = updatedSubtasks.splice(sourceIndex, 1);
    updatedSubtasks.splice(destinationIndex, 0, reorderedItem);

    handleFieldChange('subtasks', updatedSubtasks);
  };

  const handleAddLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelText.trim()) return;
    const currentLabels = editedTask.labels || [];
    if (!currentLabels.includes(newLabelText.trim())) {
      handleFieldChange('labels', [...currentLabels, newLabelText.trim()]);
    }
    setNewLabelText('');
    setIsAddingLabel(false);
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    const updatedLabels = (editedTask.labels || []).filter(l => l !== labelToRemove);
    handleFieldChange('labels', updatedLabels);
  };

  const currentProject = projects.find(p => p.id === editedTask.projectId);
  const projectSprints = sprints ? sprints.filter(s => s.projectId === editedTask.projectId) : [];
  const currentSprint = projectSprints.find(s => s.id === editedTask.sprintId);
  const subtasksList = editedTask.subtasks || [];
  const completedSubtasksCount = subtasksList.filter(s => s.completed).length;

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'Critical': return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'High': return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
      case 'Medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'Low': return 'text-zinc-400 border-zinc-500/30 bg-zinc-500/10';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] overflow-hidden pointer-events-none flex justify-end">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
        />

        {/* Side Drawer Panel */}
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full max-w-lg h-full bg-[#0A0A0A] border-l border-[#27272A] shadow-2xl flex flex-col pointer-events-auto z-10 text-white font-sans overflow-hidden"
        >
          {/* Top Navbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#27272A]/80 bg-[#0A0A0A] shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#8E9192] uppercase bg-[#141313] px-2 py-1 rounded border border-[#27272A]">
                Task Details
              </span>
              <span className={`text-[10px] font-mono font-bold tracking-wider px-2 py-1 rounded border ${
                editedTask.completed ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              }`}>
                {editedTask.status}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsDeleteConfirmOpen(true)}
                title="Delete Task"
                className="p-2 text-[#8E9192] hover:text-red-400 hover:bg-[#141313] rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                title="Close Panel"
                className="p-2 text-[#8E9192] hover:text-white hover:bg-[#141313] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Main Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-thin">
            
            {/* Title Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#8E9192] uppercase tracking-wider font-mono">
                Title
              </label>
              <div className="bg-[#141313] border border-[#27272A] rounded-xl px-4 py-3 focus-within:border-white/40 transition-all shadow-inner">
                <input
                  type="text"
                  value={editedTask.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="Task title..."
                  className="w-full bg-transparent border-none text-white font-semibold text-lg focus:outline-none placeholder:text-[#8E9192]/60"
                />
              </div>
            </div>

            {/* Properties Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#8E9192] uppercase tracking-wider font-mono">
                Properties
              </h3>

              <div className="grid grid-cols-2 gap-3">
                
                {/* Status Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  aria-label={`Status: ${editedTask.status}. Click or press Enter to change.`}
                  aria-expanded={activePropertyEdit === 'status'}
                  aria-haspopup="menu"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActivePropertyEdit(activePropertyEdit === 'status' ? null : 'status');
                    }
                  }}
                  onClick={() => setActivePropertyEdit(activePropertyEdit === 'status' ? null : 'status')}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <CheckCircle2 className={`w-5 h-5 mt-0.5 shrink-0 transition-colors ${
                    editedTask.completed ? 'text-green-400' : 'text-[#8E9192] group-hover:text-white'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wide font-mono">Status</div>
                    <div className="text-xs text-[#8E9192] font-medium truncate mt-0.5">{editedTask.status}</div>
                  </div>

                  {activePropertyEdit === 'status' && (
                    <div 
                      role="menu"
                      aria-label="Select Status"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setActivePropertyEdit(null);
                        }
                      }}
                      className="absolute left-0 top-full mt-1.5 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2 z-50 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150"
                    >
                      {(['To Do', 'In Progress', 'Done'] as Task['status'][]).map(s => (
                        <button
                          key={s}
                          role="menuitem"
                          onClick={() => { 
                            handleFieldChange('status', s); 
                            handleFieldChange('completed', s === 'Done'); 
                            setActivePropertyEdit(null); 
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            editedTask.status === s ? 'bg-white/10 text-white font-semibold' : 'hover:bg-[#141313] text-[#C4C7C8] hover:text-white'
                          }`}
                        >
                          <span>{s}</span>
                          {s === 'Done' && <Check className="w-3.5 h-3.5 text-green-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Project Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  aria-label={`Project: ${currentProject ? currentProject.name : 'No Project'}. Click or press Enter to change.`}
                  aria-expanded={activePropertyEdit === 'project'}
                  aria-haspopup="menu"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActivePropertyEdit(activePropertyEdit === 'project' ? null : 'project');
                    }
                  }}
                  onClick={() => setActivePropertyEdit(activePropertyEdit === 'project' ? null : 'project')}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <FolderOpen className="w-5 h-5 mt-0.5 shrink-0 text-[#8E9192] group-hover:text-white transition-colors" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wide font-mono">Project</div>
                    <div className="text-xs text-[#8E9192] font-medium truncate mt-0.5">
                      {currentProject ? currentProject.name : 'No Project'}
                    </div>
                  </div>

                  {activePropertyEdit === 'project' && (
                    <div 
                      role="menu"
                      aria-label="Select Project"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setActivePropertyEdit(null);
                        }
                      }}
                      className="absolute left-0 top-full mt-1.5 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2 z-50 shadow-2xl space-y-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                    >
                      <button
                        role="menuitem"
                        onClick={() => { handleFieldChange('projectId', null); setActivePropertyEdit(null); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          !editedTask.projectId ? 'bg-white/10 text-white font-semibold' : 'hover:bg-[#141313] text-[#8E9192] hover:text-white'
                        }`}
                      >
                        No Project
                      </button>
                      {projects.filter(p => p.category !== 'Completed').map(p => (
                        <button
                          key={p.id}
                          role="menuitem"
                          onClick={() => { handleFieldChange('projectId', p.id); setActivePropertyEdit(null); }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors truncate cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            editedTask.projectId === p.id ? 'bg-white/10 text-white font-semibold' : 'hover:bg-[#141313] text-[#C4C7C8] hover:text-white'
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date / Due Date Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  aria-label={`Due Date: ${formatDisplayDate(editedTask.dueDate)}. Click or press Enter to edit.`}
                  aria-expanded={activePropertyEdit === 'date'}
                  aria-haspopup="dialog"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (activePropertyEdit === 'date') {
                        setActivePropertyEdit(null);
                      } else {
                        setActivePropertyEdit('date');
                        if (editedTask.dueDate) {
                          const parsed = new Date(editedTask.dueDate + 'T00:00:00');
                          if (!isNaN(parsed.getTime())) setPickerMonth(parsed);
                        } else {
                          setPickerMonth(new Date());
                        }
                      }
                    }
                  }}
                  onClick={() => {
                    if (activePropertyEdit === 'date') {
                      setActivePropertyEdit(null);
                    } else {
                      setActivePropertyEdit('date');
                      if (editedTask.dueDate) {
                        const parsed = new Date(editedTask.dueDate + 'T00:00:00');
                        if (!isNaN(parsed.getTime())) setPickerMonth(parsed);
                      } else {
                        setPickerMonth(new Date());
                      }
                    }
                  }}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <CalendarIcon className="w-5 h-5 mt-0.5 shrink-0 text-[#8E9192] group-hover:text-white transition-colors" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wide font-mono">Date</div>
                    <div className="text-xs text-[#8E9192] font-medium truncate mt-0.5 flex items-center gap-1.5">
                      <span className={editedTask.dueDate && editedTask.dueDate < formatDateStr(new Date()) && !editedTask.completed ? 'text-red-400 font-semibold' : 'text-white'}>
                        {formatDisplayDate(editedTask.dueDate)}
                      </span>
                      {editedTask.dueDate && (
                        <span className="text-[10px] text-[#8E9192]/60 font-mono">({editedTask.dueDate})</span>
                      )}
                    </div>
                  </div>

                  {activePropertyEdit === 'date' && (
                    <>
                      <div 
                        className="fixed inset-0 z-[9998] cursor-default" 
                        onClick={() => setActivePropertyEdit(null)} 
                      />
                      <div 
                        role="dialog"
                        aria-label="Select Due Date"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') {
                            e.stopPropagation();
                            setActivePropertyEdit(null);
                          }
                        }}
                        className="absolute left-0 top-full mt-1.5 w-[340px] min-w-[340px] bg-[#0A0A0A] border border-[#27272A] rounded-xl p-3.5 z-[9999] shadow-2xl space-y-3 font-sans max-h-[80vh] overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-150"
                      >
                        {/* Quick Presets */}
                        <div className="space-y-1">
                          <div className="text-[10px] text-[#8E9192] uppercase font-mono font-bold tracking-wider mb-1.5">Quick Schedule</div>
                          {getPresetDates().map((preset) => {
                            const isSelected = editedTask.dueDate === preset.date;
                            return (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  handleFieldChange('dueDate', preset.date);
                                  setActivePropertyEdit(null);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                                  isSelected ? 'bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30' : 'text-[#C4C7C8] hover:text-white hover:bg-[#141313]'
                                }`}
                              >
                                <span className="font-medium">{preset.label}</span>
                                <span className="text-[10px] font-mono text-[#8E9192]">{preset.sub}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Interactive Calendar DatePicker */}
                        <div className="pt-2 border-t border-[#27272A]">
                          <div className="flex items-center justify-between mb-2 px-1">
                            <span className="text-xs font-bold text-white tracking-wide">
                              {format(pickerMonth, 'MMMM yyyy')}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPickerMonth(prev => addMonths(prev, -1))}
                                className="w-6 h-6 rounded-md border border-[#27272A] bg-[#141313] hover:bg-[#201F1F] hover:border-white text-[#8E9192] hover:text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                                title="Previous Month"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setPickerMonth(prev => addMonths(prev, 1))}
                                className="w-6 h-6 rounded-md border border-[#27272A] bg-[#141313] hover:bg-[#201F1F] hover:border-white text-[#8E9192] hover:text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                                title="Next Month"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <DayPicker
                            mode="single"
                            required
                            selected={editedTask.dueDate ? new Date(editedTask.dueDate + 'T00:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                handleFieldChange('dueDate', formatDateStr(date));
                              }
                              setActivePropertyEdit(null);
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
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-[#27272A] flex items-center justify-between gap-2">
                        {editedTask.dueDate ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleFieldChange('dueDate', '');
                              setActivePropertyEdit(null);
                            }}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Clear Date</span>
                          </button>
                        ) : (
                          <div />
                        )}
                        <button
                          type="button"
                          onClick={() => setActivePropertyEdit(null)}
                          className="bg-white hover:bg-white/90 text-black font-bold text-[11px] px-3 py-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white ml-auto cursor-pointer"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </>
                  )}
                </div>

                {/* Recurrence Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  aria-label={`Recurrence: ${getRecurrenceLabel(editedTask.recurrence)}. Click or press Enter to change.`}
                  aria-expanded={activePropertyEdit === 'recurrence'}
                  aria-haspopup="dialog"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActivePropertyEdit(activePropertyEdit === 'recurrence' ? null : 'recurrence');
                      setIsCustomRecurrence(false);
                    }
                  }}
                  onClick={() => {
                    setActivePropertyEdit(activePropertyEdit === 'recurrence' ? null : 'recurrence');
                    setIsCustomRecurrence(false);
                  }}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <Repeat className="w-5 h-5 mt-0.5 shrink-0 text-[#8E9192] group-hover:text-white transition-colors" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wide font-mono">Recurrence</div>
                    <div className="text-xs text-[#8E9192] font-medium truncate mt-0.5">
                      {getRecurrenceLabel(editedTask.recurrence)}
                    </div>
                  </div>

                  {activePropertyEdit === 'recurrence' && (
                    <div 
                      role="dialog"
                      aria-label="Recurrence Picker"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setActivePropertyEdit(null);
                        }
                      }}
                      className="absolute left-0 top-full mt-1.5 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2.5 z-50 shadow-2xl space-y-1.5 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                    >
                      {!isCustomRecurrence ? (
                        <>
                          <button
                            onClick={() => { handleFieldChange('recurrence', undefined); setActivePropertyEdit(null); }}
                            className={`w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[#141313] transition-colors flex items-center justify-between ${!editedTask.recurrence ? 'text-white bg-white/10' : 'text-[#8E9192] hover:text-white'}`}
                          >
                            <span>None</span>
                            {!editedTask.recurrence && <Check className="w-3 h-3 text-white" />}
                          </button>
                          {[
                            { label: 'Daily', rule: { frequency: 'daily' as const, interval: 1 } },
                            { label: 'Weekdays (Mon-Fri)', rule: { frequency: 'weekdays' as const } },
                            { label: 'Weekly', rule: { frequency: 'weekly' as const, interval: 1 } },
                            { label: 'Monthly', rule: { frequency: 'monthly' as const, interval: 1 } },
                            { label: 'Yearly', rule: { frequency: 'yearly' as const, interval: 1 } },
                          ].map(preset => {
                            const isSelected = editedTask.recurrence?.frequency === preset.rule.frequency && (editedTask.recurrence?.interval || 1) === 1 && !editedTask.recurrence?.daysOfWeek;
                            return (
                              <button
                                key={preset.label}
                                onClick={() => { handleFieldChange('recurrence', preset.rule); setActivePropertyEdit(null); }}
                                className={`w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[#141313] transition-colors flex items-center justify-between ${isSelected ? 'text-white bg-white/10' : 'text-[#8E9192] hover:text-white'}`}
                              >
                                <span>{preset.label}</span>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => setIsCustomRecurrence(true)}
                            className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[#141313] text-blue-400 hover:text-blue-300 transition-colors border-t border-[#27272A] mt-1 pt-2 font-semibold"
                          >
                            Custom...
                          </button>
                        </>
                      ) : (
                        <div className="space-y-2 p-1">
                          <div className="text-[10px] font-mono font-bold text-[#8E9192] uppercase">Custom Recurrence</div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-[#8E9192]">Every</span>
                            <input
                              type="number"
                              min="1"
                              value={editedTask.recurrence?.interval || 1}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                handleFieldChange('recurrence', {
                                  ...(editedTask.recurrence || { frequency: 'daily' }),
                                  interval: val
                                });
                              }}
                              className="w-12 bg-[#141313] border border-[#27272A] text-xs text-white rounded px-2 py-1 text-center focus:outline-none focus:border-white"
                            />
                            <select
                              value={editedTask.recurrence?.frequency || 'daily'}
                              onChange={(e) => {
                                const freq = e.target.value as RecurrenceFrequency;
                                handleFieldChange('recurrence', {
                                  ...(editedTask.recurrence || { interval: 1 }),
                                  frequency: freq,
                                  daysOfWeek: freq === 'weekly' ? [1] : undefined
                                });
                              }}
                              className="bg-[#141313] border border-[#27272A] text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-white flex-1"
                            >
                              <option value="daily">days</option>
                              <option value="weekly">weeks</option>
                              <option value="monthly">months</option>
                              <option value="yearly">years</option>
                            </select>
                          </div>

                          {editedTask.recurrence?.frequency === 'weekly' && (
                            <div className="space-y-1 pt-1">
                              <div className="text-[10px] text-[#8E9192]">On days:</div>
                              <div className="grid grid-cols-7 gap-1">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, dayIdx) => {
                                  const days = editedTask.recurrence?.daysOfWeek || [];
                                  const isSelected = days.includes(dayIdx);
                                  return (
                                    <button
                                      key={dayIdx}
                                      type="button"
                                      onClick={() => {
                                        const newDays = isSelected
                                          ? days.filter(d => d !== dayIdx)
                                          : [...days, dayIdx];
                                        handleFieldChange('recurrence', {
                                          ...editedTask.recurrence,
                                          frequency: 'weekly',
                                          daysOfWeek: newDays.length > 0 ? newDays : [dayIdx]
                                        });
                                      }}
                                      className={`py-1 text-[10px] font-mono font-bold rounded border transition-all text-center ${
                                        isSelected
                                          ? 'bg-blue-500 text-white border-blue-400'
                                          : 'bg-[#141313] text-[#8E9192] border-[#27272A] hover:text-white'
                                      }`}
                                    >
                                      {dayChar}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setActivePropertyEdit(null)}
                              className="bg-white text-black font-bold text-[10px] px-3 py-1 rounded hover:bg-white/90"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Priority Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  aria-label={`Priority: ${editedTask.priority}. Click or press Enter to change.`}
                  aria-expanded={activePropertyEdit === 'priority'}
                  aria-haspopup="menu"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActivePropertyEdit(activePropertyEdit === 'priority' ? null : 'priority');
                    }
                  }}
                  onClick={() => setActivePropertyEdit(activePropertyEdit === 'priority' ? null : 'priority')}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <Flag className="w-5 h-5 mt-0.5 shrink-0 text-[#8E9192] group-hover:text-white transition-colors" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wide font-mono">Priority</div>
                    <div className="text-xs text-[#8E9192] font-medium truncate mt-0.5 flex items-center gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${getPriorityColor(editedTask.priority)}`}>
                        {editedTask.priority}
                      </span>
                    </div>
                  </div>

                  {activePropertyEdit === 'priority' && (
                    <div 
                      role="menu"
                      aria-label="Select Priority"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setActivePropertyEdit(null);
                        }
                      }}
                      className="absolute left-0 top-full mt-1.5 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2 z-50 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150"
                    >
                      {(['Critical', 'High', 'Medium', 'Low'] as Task['priority'][]).map(p => (
                        <button
                          key={p}
                          role="menuitem"
                          onClick={() => { handleFieldChange('priority', p); setActivePropertyEdit(null); }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                            editedTask.priority === p ? 'bg-white/10 text-white font-semibold' : 'hover:bg-[#141313] text-[#C4C7C8] hover:text-white'
                          }`}
                        >
                          <span>{p}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono border ${getPriorityColor(p)}`}>{p}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sprint Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  aria-label={`Sprint: ${currentSprint ? currentSprint.name : 'Backlog (Unassigned)'}. Click or press Enter to change.`}
                  aria-expanded={activePropertyEdit === 'sprint'}
                  aria-haspopup="menu"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActivePropertyEdit(activePropertyEdit === 'sprint' ? null : 'sprint');
                    }
                  }}
                  onClick={() => setActivePropertyEdit(activePropertyEdit === 'sprint' ? null : 'sprint')}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <Rocket className="w-5 h-5 mt-0.5 shrink-0 text-[#8E9192] group-hover:text-white transition-colors" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wide font-mono">Sprint</div>
                    <div className="text-xs text-[#8E9192] font-medium truncate mt-0.5">
                      {currentSprint ? `${currentSprint.name} (${currentSprint.status})` : 'Backlog (Unassigned)'}
                    </div>
                  </div>

                  {activePropertyEdit === 'sprint' && (
                    <div 
                      role="menu"
                      aria-label="Select Sprint"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.stopPropagation();
                          setActivePropertyEdit(null);
                        }
                      }}
                      className="absolute left-0 top-full mt-1.5 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2 z-50 shadow-2xl space-y-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
                    >
                      <button
                        role="menuitem"
                        onClick={() => { handleFieldChange('sprintId', null); setActivePropertyEdit(null); }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                          !editedTask.sprintId ? 'bg-white/10 text-white font-semibold' : 'hover:bg-[#141313] text-[#8E9192] hover:text-white'
                        }`}
                      >
                        Backlog (Unassigned)
                      </button>
                      {projectSprints.map(s => (
                        <button
                          key={s.id}
                          role="menuitem"
                          onClick={() => { handleFieldChange('sprintId', s.id); setActivePropertyEdit(null); }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors truncate cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center justify-between ${
                            editedTask.sprintId === s.id ? 'bg-white/10 text-white font-semibold' : 'hover:bg-[#141313] text-[#C4C7C8] hover:text-white'
                          }`}
                        >
                          <span className="truncate">{s.name}</span>
                          <span className="text-[9px] font-mono opacity-70 ml-1">{s.status}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Labels Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  aria-label="Manage Labels. Click or press Enter to add or remove labels."
                  aria-expanded={isAddingLabel}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setIsAddingLabel(!isAddingLabel);
                    }
                  }}
                  onClick={() => setIsAddingLabel(!isAddingLabel)}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <Tag className="w-5 h-5 mt-0.5 shrink-0 text-[#8E9192] group-hover:text-white transition-colors" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wide font-mono">Labels</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(editedTask.labels && editedTask.labels.length > 0 ? editedTask.labels : ['Work']).map((lbl, idx) => (
                        <span 
                          key={idx}
                          role="button"
                          tabIndex={0}
                          aria-label={`Remove label ${lbl}`}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleRemoveLabel(lbl); } }}
                          onClick={(e) => { e.stopPropagation(); handleRemoveLabel(lbl); }}
                          title="Click to remove"
                          className="text-[10px] bg-black px-1.5 py-0.5 rounded border border-[#27272A] text-[#8E9192] hover:text-red-400 hover:border-red-400/40 transition-colors cursor-pointer"
                        >
                          {lbl} ×
                        </span>
                      ))}
                    </div>
                  </div>

                  {isAddingLabel && (
                    <form 
                      role="dialog"
                      aria-label="Add Label"
                      onSubmit={handleAddLabel}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setIsAddingLabel(false); } }}
                      className="absolute left-0 top-full mt-1.5 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2 z-50 shadow-2xl flex gap-1 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <input
                        type="text"
                        placeholder="New label..."
                        value={newLabelText}
                        onChange={(e) => setNewLabelText(e.target.value)}
                        aria-label="New label name"
                        className="w-full bg-[#141313] border border-[#27272A] text-xs text-white rounded p-1.5 focus:outline-none focus:border-white"
                        autoFocus
                      />
                      <button type="submit" className="bg-white text-black font-bold text-[10px] px-2 rounded hover:bg-white/90 focus:outline-none focus:ring-1 focus:ring-white">
                        Add
                      </button>
                    </form>
                  )}
                </div>

                {/* Reminders Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  aria-label="Toggle Reminder"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const current = editedTask.reminders?.[0] === '10m before' ? 'Add Reminders' : '10m before';
                      handleFieldChange('reminders', [current]);
                    }
                  }}
                  onClick={() => {
                    const current = editedTask.reminders?.[0] === '10m before' ? 'Add Reminders' : '10m before';
                    handleFieldChange('reminders', [current]);
                  }}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all group focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <Clock className="w-5 h-5 mt-0.5 shrink-0 text-[#8E9192] group-hover:text-white transition-colors" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wide font-mono">Reminders</div>
                    <div className="text-xs text-[#8E9192] font-medium truncate mt-0.5">
                      {editedTask.reminders?.[0] || 'Add Reminders'}
                    </div>
                  </div>
                </div>

                {/* Time Effort Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  aria-label={`Time Effort: ${formatMinutes(editedTask.timeEffort)}. Click or press Enter to edit.`}
                  aria-expanded={activePropertyEdit === 'effort'}
                  aria-haspopup="dialog"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActivePropertyEdit(activePropertyEdit === 'effort' ? null : 'effort');
                    }
                  }}
                  onClick={() => setActivePropertyEdit(activePropertyEdit === 'effort' ? null : 'effort')}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <Timer className="w-5 h-5 mt-0.5 shrink-0 text-[#8E9192] group-hover:text-white transition-colors" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wide font-mono">Time Effort</div>
                    <div className="text-xs text-[#8E9192] font-medium truncate mt-0.5">
                      {formatMinutes(editedTask.timeEffort)}
                    </div>
                  </div>

                  {activePropertyEdit === 'effort' && (
                    <div 
                      role="dialog"
                      aria-label="Set Time Effort"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setActivePropertyEdit(null); } }}
                      className="absolute left-0 top-full mt-1.5 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2.5 z-50 shadow-2xl space-y-2 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="text-[10px] text-[#8E9192] uppercase font-mono font-bold">Quick Presets</div>
                      <div className="grid grid-cols-3 gap-1">
                        {[15, 30, 45, 60, 120, 240].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => { handleFieldChange('timeEffort', m); setActivePropertyEdit(null); }}
                            className="px-2 py-1 bg-[#141313] hover:bg-white hover:text-black rounded text-[11px] font-mono transition-colors text-white text-center border border-[#27272A] cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {formatMinutes(m)}
                          </button>
                        ))}
                      </div>
                      <div className="pt-1 border-t border-[#27272A] flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          placeholder="Mins..."
                          value={editedTask.timeEffort || ''}
                          onChange={(e) => handleFieldChange('timeEffort', parseInt(e.target.value) || 0)}
                          aria-label="Custom effort in minutes"
                          className="w-full bg-[#141313] border border-[#27272A] text-xs text-white rounded p-1 focus:outline-none focus:border-white"
                        />
                        <span className="text-[10px] text-[#8E9192] shrink-0 font-mono">mins</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Spent Card */}
                <div 
                  role="button"
                  tabIndex={0}
                  aria-label={`Time Spent: ${formatMinutes(editedTask.timeSpent)}. Click or press Enter to edit.`}
                  aria-expanded={activePropertyEdit === 'spent'}
                  aria-haspopup="dialog"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setActivePropertyEdit(activePropertyEdit === 'spent' ? null : 'spent');
                    }
                  }}
                  onClick={() => setActivePropertyEdit(activePropertyEdit === 'spent' ? null : 'spent')}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                >
                  <Clock className="w-5 h-5 mt-0.5 shrink-0 text-[#8E9192] group-hover:text-white transition-colors" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wide font-mono">Time Spent</div>
                    <div className="text-xs text-[#8E9192] font-medium truncate mt-0.5">
                      {formatMinutes(editedTask.timeSpent)}
                    </div>
                  </div>

                  {activePropertyEdit === 'spent' && (
                    <div 
                      role="dialog"
                      aria-label="Log Time Spent"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); setActivePropertyEdit(null); } }}
                      className="absolute left-0 top-full mt-1.5 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2.5 z-50 shadow-2xl space-y-2 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="text-[10px] text-[#8E9192] uppercase font-mono font-bold">Quick Log</div>
                      <div className="grid grid-cols-3 gap-1">
                        {[15, 30, 60].map(addM => (
                          <button
                            key={addM}
                            type="button"
                            onClick={() => { handleFieldChange('timeSpent', (editedTask.timeSpent || 0) + addM); }}
                            className="px-2 py-1 bg-[#141313] hover:bg-white hover:text-black rounded text-[11px] font-mono transition-colors text-white text-center border border-[#27272A] cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            +{addM}m
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between items-center gap-1.5 pt-1 border-t border-[#27272A]">
                        <input
                          type="number"
                          min="0"
                          placeholder="Mins..."
                          value={editedTask.timeSpent || ''}
                          onChange={(e) => handleFieldChange('timeSpent', parseInt(e.target.value) || 0)}
                          className="w-full bg-[#141313] border border-[#27272A] text-xs text-white rounded p-1 focus:outline-none focus:border-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleFieldChange('timeSpent', 0)}
                          className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/30 rounded text-[10px] font-mono hover:bg-red-500/20"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {((editedTask.timeEffort && editedTask.timeEffort > 0) || (editedTask.timeSpent && editedTask.timeSpent > 0)) && (
                <div className="bg-[#141313] border border-[#27272A] rounded-xl p-3.5 space-y-2 mt-3">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="text-[#8E9192] uppercase font-bold text-[10px]">Time Progress</span>
                    <span className="text-white font-bold">
                      {formatMinutes(editedTask.timeSpent)} / {formatMinutes(editedTask.timeEffort || 0)}
                      {editedTask.timeEffort && editedTask.timeEffort > 0 ? ` (${Math.round(((editedTask.timeSpent || 0) / editedTask.timeEffort) * 100)}%)` : ''}
                    </span>
                  </div>
                  <div className="w-full bg-black h-2 rounded-full overflow-hidden border border-[#27272A]">
                    <div 
                      className={`h-full transition-all duration-300 ${
                        editedTask.timeEffort && (editedTask.timeSpent || 0) > editedTask.timeEffort
                          ? 'bg-orange-500'
                          : 'bg-green-400'
                      }`}
                      style={{ width: `${Math.min(100, editedTask.timeEffort ? Math.round(((editedTask.timeSpent || 0) / editedTask.timeEffort) * 100) : 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#8E9192] uppercase tracking-wider font-mono">
                  Description
                </h3>
                <button title="Expand Description" className="text-[#8E9192] hover:text-white transition-colors">
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="bg-[#141313] border border-[#27272A] rounded-xl p-3 focus-within:border-white/40 transition-all shadow-inner">
                <textarea
                  rows={4}
                  value={editedTask.description || ''}
                  onChange={(e) => handleFieldChange('description', e.target.value)}
                  placeholder="Add a detailed description, notes, or links..."
                  className="w-full bg-transparent border-none text-xs text-white focus:outline-none resize-none placeholder:text-[#8E9192]/60 leading-relaxed"
                />
              </div>
            </div>

            {/* Sub-tasks Section */}
            <div className="space-y-3 pb-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-[#8E9192] uppercase tracking-wider font-mono">
                    Sub-tasks
                  </h3>
                  {subtasksList.length > 0 && (
                    <span className="text-[10px] font-mono font-bold bg-[#141313] px-2 py-0.5 rounded border border-[#27272A] text-[#8E9192]">
                      {completedSubtasksCount}/{subtasksList.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Progress bar if subtasks exist */}
              {subtasksList.length > 0 && (
                <div className="w-full bg-[#141313] h-1.5 rounded-full overflow-hidden border border-[#27272A]/40">
                  <div 
                    className="bg-white h-full transition-all duration-300"
                    style={{ width: `${Math.round((completedSubtasksCount / subtasksList.length) * 100)}%` }}
                  />
                </div>
              )}

              {/* Subtasks List */}
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="subtasks">
                  {(provided, snapshot) => (
                    <div 
                      className={`space-y-2 min-h-[10px] rounded-lg transition-colors ${
                        snapshot.isDraggingOver ? 'bg-[#141313]/50 border border-white/20 p-1.5' : ''
                      }`}
                      {...provided.droppableProps} 
                      ref={provided.innerRef}
                    >
                      {subtasksList.map((st, index) => (
                        // @ts-ignore
                        <Draggable key={st.id} draggableId={st.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center justify-between p-2.5 bg-[#141313] border rounded-lg group transition-all cursor-grab active:cursor-grabbing select-none ${
                                snapshot.isDragging
                                  ? 'ring-1 ring-white/30 shadow-lg z-50 border-white/20 !bg-[#201F1F]'
                                  : 'border-[#27272A] hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                                <button
                                  onClick={() => handleToggleSubTask(st.id)}
                                  className="text-[#8E9192] hover:text-white transition-colors shrink-0 cursor-pointer"
                                >
                                  {st.completed ? (
                                    <CheckSquare className="w-4 h-4 text-white" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                                <span className={`text-xs font-medium truncate ${st.completed ? 'line-through text-[#8E9192]' : 'text-white'}`}>
                                  {st.title}
                                </span>
                              </div>

                              <button
                                onClick={() => handleDeleteSubTask(st.id)}
                                className="text-[#8E9192] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-pointer"
                                title="Delete sub-task"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>

              {/* Add Sub-task form */}
              <form onSubmit={handleAddSubTask} className="flex items-center gap-2 pt-1">
                <div className="flex-1 flex items-center gap-2 bg-[#141313] border border-[#27272A] rounded-lg px-3 py-2 focus-within:border-white/40 transition-all">
                  <Plus className="w-4 h-4 text-[#8E9192] shrink-0" />
                  <input
                    type="text"
                    value={newSubTaskTitle}
                    onChange={(e) => setNewSubTaskTitle(e.target.value)}
                    placeholder="Add a sub-task..."
                    className="w-full bg-transparent border-none text-xs text-white focus:outline-none placeholder:text-[#8E9192]/60"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newSubTaskTitle.trim()}
                  className="bg-white hover:bg-white/90 text-black font-bold text-xs px-3.5 py-2 rounded-lg disabled:opacity-40 transition-all shrink-0 cursor-pointer"
                >
                  Add
                </button>
              </form>
            </div>

          </div>

          {/* Custom Modal Confirmation for Deleting Task */}
          {isDeleteConfirmOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999999] flex items-center justify-center p-4 pointer-events-auto">
              <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl w-full max-w-md p-6 relative shadow-2xl">
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="absolute right-4 top-4 hover:bg-[#141313] p-1.5 rounded-lg text-[#8E9192] hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3 text-red-400 mb-3">
                  <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h3 className="text-md font-bold uppercase tracking-wider font-mono text-white">
                    Delete Task
                  </h3>
                </div>

                <p className="text-xs text-[#C4C7C8] leading-relaxed mb-6">
                  Are you sure you want to permanently delete <strong className="text-white font-semibold font-mono">"{editedTask.title}"</strong>? This action cannot be undone.
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    className="bg-black text-[#C4C7C8] border border-[#27272A] font-medium text-xs px-4 py-2 rounded-lg hover:bg-[#141313] hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteConfirmOpen(false);
                      onDeleteTask(editedTask.id);
                      onClose();
                    }}
                    className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Yes, Delete Task
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
