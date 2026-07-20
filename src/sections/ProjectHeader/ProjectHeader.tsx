import { CalendarIcon, CheckCircle, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getCategoryStyle } from '../../services/category-color';
import type { Project } from '../../types';
import { formatDisplayDate } from '../../utils/format-date';

interface ProjectHeaderProps {
  project: Project;
  availableCategories: string[];
  calculatedProgress: number;
  onEditProject: (
    projectId: string,
    name: string,
    description: string,
    category?: string,
    dueDate?: string,
  ) => void;
  onCompleteProject: (projectId: string) => void;
  onDeleteProjectClick: () => void;
}

export default function ProjectHeader({
  project,
  availableCategories,
  calculatedProgress,
  onEditProject,
  onCompleteProject,
  onDeleteProjectClick,
}: ProjectHeaderProps) {
  const [isEditingProj, setIsEditingProj] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description);
  const [editCategory, setEditCategory] = useState(project.category);
  const [editDueDate] = useState(project.dueDate || '');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);

  const handleSaveProjectEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onEditProject(project.id, editName, editDesc, editCategory, editDueDate);
    setIsEditingProj(false);
  };

  return (
    <section className="space-y-6 bg-surface-secondary border border-border-primary p-6 rounded-xl relative">
      {isEditingProj ? (
        <form onSubmit={handleSaveProjectEdit} className="space-y-4">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="bg-black text-text-primary border border-border-primary text-xl font-bold rounded p-2 w-full focus:outline-none focus:border-white"
            required
          />
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            className="bg-black text-text-secondary border border-border-primary text-sm rounded p-2 w-full h-20 focus:outline-none focus:border-white"
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono mb-1">
                Due Date
              </label>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="bg-black border border-border-primary text-xs text-text-primary rounded p-2 w-full focus:outline-none focus:border-white flex items-center justify-between cursor-pointer"
              >
                {editDueDate ? (
                  <span className="font-semibold">{formatDisplayDate(editDueDate)}</span>
                ) : (
                  <span className="text-text-muted">Set due date...</span>
                )}
                <CalendarIcon className="w-4 h-4 text-text-muted" />
              </button>
            </div>

            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono mb-1">
                Category
              </label>
              {isCustomCategoryMode ? (
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="Custom Category"
                  className="bg-black border border-border-primary text-xs text-text-primary rounded p-2 w-full focus:outline-none focus:border-white"
                  autoFocus
                />
              ) : (
                <select
                  value={editCategory}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomCategoryMode(true);
                      setEditCategory('');
                    } else {
                      setEditCategory(e.target.value);
                    }
                  }}
                  className="bg-black border border-border-primary text-xs text-text-primary rounded p-2 w-full focus:outline-none focus:border-white appearance-none"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ Custom Category</option>
                </select>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditingProj(false)}
              className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold bg-interactive-primary text-interactive-primary-text rounded-lg hover:bg-interactive-primary/90 transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="flex justify-between items-start">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 text-xs font-bold font-mono tracking-wider uppercase border rounded shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] ${getCategoryStyle(
                    project.category,
                  )}`}
                >
                  {project.category}
                </span>
                {project.dueDate && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-text-muted bg-surface-secondary border border-border-primary px-2.5 py-1 rounded shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {formatDisplayDate(project.dueDate)}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
                {project.name}
              </h1>
              <p className="text-text-secondary text-sm max-w-2xl leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingProj(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-surface-secondary border border-border-primary hover:border-white/20 text-text-muted hover:text-text-primary rounded-lg transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </button>
                {project.category !== 'Completed' && (
                  <button
                    onClick={() => onCompleteProject(project.id)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 hover:text-green-300 rounded-lg transition-all shadow-[inset_0_1px_1px_rgba(74,222,128,0.2)] cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" /> Complete
                  </button>
                )}
                <button
                  onClick={onDeleteProjectClick}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-all shadow-[inset_0_1px_1px_rgba(248,113,113,0.2)] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono">
                Project Progress
              </span>
              <span className="text-xs font-bold text-text-primary">{calculatedProgress}%</span>
            </div>
            <div className="w-full bg-surface-secondary border border-border-primary h-2 rounded-full overflow-hidden shadow-inner">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                style={{ width: `${calculatedProgress}%` }}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
