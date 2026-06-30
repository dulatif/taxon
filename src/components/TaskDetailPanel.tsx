import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Timer
} from 'lucide-react';
import { Task, Project, SubTask } from '../types';

const formatMinutes = (mins?: number): string => {
  if (!mins || mins <= 0) return '0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

interface TaskDetailPanelProps {
  task: Task | null;
  projects: Project[];
  onClose: () => void;
  onUpdateTask: (updatedTask: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export default function TaskDetailPanel({
  task,
  projects,
  onClose,
  onUpdateTask,
  onDeleteTask
}: TaskDetailPanelProps) {
  const [editedTask, setEditedTask] = useState<Task | null>(null);
  const [newSubTaskTitle, setNewSubTaskTitle] = useState('');
  const [newLabelText, setNewLabelText] = useState('');
  const [isAddingLabel, setIsAddingLabel] = useState(false);
  const [activePropertyEdit, setActivePropertyEdit] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setEditedTask({
        ...task,
        labels: task.labels || ['Work'],
        reminders: task.reminders || ['Add Reminders'],
        subtasks: task.subtasks || []
      });
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
                onClick={() => {
                  if (window.confirm('Delete this task?')) {
                    onDeleteTask(editedTask.id);
                    onClose();
                  }
                }}
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
                  onClick={() => setActivePropertyEdit(activePropertyEdit === 'status' ? null : 'status')}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group"
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
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2 z-50 shadow-2xl space-y-1"
                    >
                      {(['To Do', 'In Progress', 'Done'] as Task['status'][]).map(s => (
                        <button
                          key={s}
                          onClick={() => { 
                            handleFieldChange('status', s); 
                            handleFieldChange('completed', s === 'Done'); 
                            setActivePropertyEdit(null); 
                          }}
                          className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[#141313] text-white transition-colors flex items-center justify-between"
                        >
                          <span>{s}</span>
                          {s === 'Done' && <Check className="w-3 h-3 text-green-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Project Card */}
                <div 
                  onClick={() => setActivePropertyEdit(activePropertyEdit === 'project' ? null : 'project')}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group"
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
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2 z-50 shadow-2xl space-y-1 max-h-48 overflow-y-auto"
                    >
                      <button
                        onClick={() => { handleFieldChange('projectId', null); setActivePropertyEdit(null); }}
                        className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[#141313] text-[#8E9192] hover:text-white transition-colors"
                      >
                        No Project
                      </button>
                      {projects.filter(p => p.category !== 'Completed').map(p => (
                        <button
                          key={p.id}
                          onClick={() => { handleFieldChange('projectId', p.id); setActivePropertyEdit(null); }}
                          className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[#141313] text-white transition-colors truncate"
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date / Due Date Card */}
                <div 
                  onClick={() => setActivePropertyEdit(activePropertyEdit === 'date' ? null : 'date')}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group"
                >
                  <CalendarIcon className="w-5 h-5 mt-0.5 shrink-0 text-[#8E9192] group-hover:text-white transition-colors" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wide font-mono">Date</div>
                    <div className="text-xs text-[#8E9192] font-medium truncate mt-0.5">
                      {editedTask.dueDate || 'Jun 6, every day'}
                    </div>
                  </div>

                  {activePropertyEdit === 'date' && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-3 z-50 shadow-2xl"
                    >
                      <input
                        type="date"
                        value={editedTask.dueDate || ''}
                        onChange={(e) => { handleFieldChange('dueDate', e.target.value); setActivePropertyEdit(null); }}
                        className="w-full bg-[#141313] border border-[#27272A] text-xs text-white rounded p-2 focus:outline-none focus:border-white"
                      />
                    </div>
                  )}
                </div>

                {/* Priority Card */}
                <div 
                  onClick={() => setActivePropertyEdit(activePropertyEdit === 'priority' ? null : 'priority')}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group"
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
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2 z-50 shadow-2xl space-y-1"
                    >
                      {(['Critical', 'High', 'Medium', 'Low'] as Task['priority'][]).map(p => (
                        <button
                          key={p}
                          onClick={() => { handleFieldChange('priority', p); setActivePropertyEdit(null); }}
                          className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-[#141313] text-white flex items-center justify-between"
                        >
                          <span>{p}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[8px] font-mono border ${getPriorityColor(p)}`}>{p}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Labels Card */}
                <div 
                  onClick={() => setIsAddingLabel(!isAddingLabel)}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group"
                >
                  <Tag className="w-5 h-5 mt-0.5 shrink-0 text-[#8E9192] group-hover:text-white transition-colors" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-white uppercase tracking-wide font-mono">Labels</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(editedTask.labels && editedTask.labels.length > 0 ? editedTask.labels : ['Work']).map((lbl, idx) => (
                        <span 
                          key={idx}
                          onClick={(e) => { e.stopPropagation(); handleRemoveLabel(lbl); }}
                          title="Click to remove"
                          className="text-[10px] bg-black px-1.5 py-0.5 rounded border border-[#27272A] text-[#8E9192] hover:text-red-400 hover:border-red-400/40 transition-colors"
                        >
                          {lbl} ×
                        </span>
                      ))}
                    </div>
                  </div>

                  {isAddingLabel && (
                    <form 
                      onSubmit={handleAddLabel}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2 z-50 shadow-2xl flex gap-1"
                    >
                      <input
                        type="text"
                        placeholder="New label..."
                        value={newLabelText}
                        onChange={(e) => setNewLabelText(e.target.value)}
                        className="w-full bg-[#141313] border border-[#27272A] text-xs text-white rounded p-1.5 focus:outline-none focus:border-white"
                        autoFocus
                      />
                      <button type="submit" className="bg-white text-black font-bold text-[10px] px-2 rounded">
                        Add
                      </button>
                    </form>
                  )}
                </div>

                {/* Reminders Card */}
                <div 
                  onClick={() => {
                    const current = editedTask.reminders?.[0] === '10m before' ? 'Add Reminders' : '10m before';
                    handleFieldChange('reminders', [current]);
                  }}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all group"
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
                  onClick={() => setActivePropertyEdit(activePropertyEdit === 'effort' ? null : 'effort')}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group"
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
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2.5 z-50 shadow-2xl space-y-2"
                    >
                      <div className="text-[10px] text-[#8E9192] uppercase font-mono font-bold">Quick Presets</div>
                      <div className="grid grid-cols-3 gap-1">
                        {[15, 30, 45, 60, 120, 240].map(m => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => { handleFieldChange('timeEffort', m); setActivePropertyEdit(null); }}
                            className="px-2 py-1 bg-[#141313] hover:bg-white hover:text-black rounded text-[11px] font-mono transition-colors text-white text-center border border-[#27272A]"
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
                          className="w-full bg-[#141313] border border-[#27272A] text-xs text-white rounded p-1 focus:outline-none focus:border-white"
                        />
                        <span className="text-[10px] text-[#8E9192] shrink-0 font-mono">mins</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Time Spent Card */}
                <div 
                  onClick={() => setActivePropertyEdit(activePropertyEdit === 'spent' ? null : 'spent')}
                  className="bg-[#141313] hover:bg-[#1A1919] border border-[#27272A] hover:border-white/20 rounded-xl p-3.5 flex items-start gap-3 cursor-pointer transition-all relative group"
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
                      onClick={(e) => e.stopPropagation()}
                      className="absolute left-0 top-full mt-1 w-full bg-[#0A0A0A] border border-[#27272A] rounded-xl p-2.5 z-50 shadow-2xl space-y-2"
                    >
                      <div className="text-[10px] text-[#8E9192] uppercase font-mono font-bold">Quick Log</div>
                      <div className="grid grid-cols-3 gap-1">
                        {[15, 30, 60].map(addM => (
                          <button
                            key={addM}
                            type="button"
                            onClick={() => { handleFieldChange('timeSpent', (editedTask.timeSpent || 0) + addM); }}
                            className="px-2 py-1 bg-[#141313] hover:bg-white hover:text-black rounded text-[11px] font-mono transition-colors text-white text-center border border-[#27272A]"
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
              <div className="space-y-2">
                {subtasksList.map((st) => (
                  <div 
                    key={st.id}
                    className="flex items-center justify-between p-2.5 bg-[#141313] border border-[#27272A] rounded-lg group hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-2">
                      <button
                        onClick={() => handleToggleSubTask(st.id)}
                        className="text-[#8E9192] hover:text-white transition-colors shrink-0"
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
                      className="text-[#8E9192] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Delete sub-task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

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
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
