import { open } from '@tauri-apps/plugin-dialog';
import { CalendarIcon, CheckCircle, Edit, Folder, Pin, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import Button from '../../components/Button';
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
    workspacePaths?: string[],
  ) => void;
  onCompleteProject: (projectId: string) => void;
  onDeleteProjectClick: () => void;
  onTogglePinProject?: (projectId: string) => void;
}

export default function ProjectHeader({
  project,
  availableCategories,
  calculatedProgress,
  onEditProject,
  onCompleteProject,
  onDeleteProjectClick,
  onTogglePinProject,
}: ProjectHeaderProps) {
  const [isEditingProj, setIsEditingProj] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description);
  const [editCategory, setEditCategory] = useState(project.category);
  const [editDueDate, setEditDueDate] = useState(project.dueDate || '');
  const [editWorkspacePaths, setEditWorkspacePaths] = useState<string[]>(
    project.workspacePaths || [],
  );
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);

  const handleAddWorkspacePath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: true,
        title: 'Select Workspace Directories',
      });
      if (selected) {
        const pathsToAdd = Array.isArray(selected) ? selected : [selected];
        setEditWorkspacePaths((prev) => Array.from(new Set([...prev, ...pathsToAdd])));
      }
    } catch (err) {
      console.error('Failed to open directory dialog', err);
    }
  };

  const handleRemoveWorkspacePath = (pathToRemove: string) => {
    setEditWorkspacePaths((prev) => prev.filter((p) => p !== pathToRemove));
  };

  const handleSaveProjectEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onEditProject(project.id, editName, editDesc, editCategory, editDueDate, editWorkspacePaths);
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
            className="bg-surface-primary text-text-primary border border-border-primary text-xl font-bold rounded p-2 w-full focus:outline-none focus:border-white"
            required
          />
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            className="bg-surface-primary text-text-secondary border border-border-primary text-sm rounded p-2 w-full h-20 focus:outline-none focus:border-white"
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono mb-1">
                Due Date
              </label>
              <button
                type="button"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="bg-surface-primary border border-border-primary text-xs text-text-primary rounded p-2 w-full focus:outline-none focus:border-white flex items-center justify-between cursor-pointer"
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
                  className="bg-surface-primary border border-border-primary text-xs text-text-primary rounded p-2 w-full focus:outline-none focus:border-white"
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
                  className="bg-surface-primary border border-border-primary text-xs text-text-primary rounded p-2 w-full focus:outline-none focus:border-white appearance-none"
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                Workspace Repositories
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddWorkspacePath}
                className="text-interactive-primary p-0 h-auto inline text-[10px]"
              >
                <Plus className="w-3 h-3" /> Add Directory
              </Button>
            </div>
            {editWorkspacePaths.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {editWorkspacePaths.map((p) => (
                  <div
                    key={p}
                    className="flex items-center gap-1.5 bg-surface-primary border border-border-primary rounded px-2 py-1 text-xs text-text-secondary"
                  >
                    <Folder className="w-3 h-3 text-text-muted" />
                    <span className="truncate max-w-[200px]" title={p}>
                      {p.split('/').pop() || p}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWorkspacePath(p)}
                      className="text-text-muted hover:text-red-400 p-0.5 ml-1 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted italic">No workspace directories linked.</p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditingProj(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Changes
            </Button>
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
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
                  {project.name}
                </h1>
                {onTogglePinProject && (
                  <button
                    type="button"
                    onClick={() => onTogglePinProject(project.id)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      project.pinned
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                        : 'bg-surface-primary border-border-primary text-text-muted hover:text-amber-400 hover:border-amber-400/40'
                    }`}
                    title={project.pinned ? 'Unpin project from sidebar' : 'Pin project to sidebar'}
                  >
                    <Pin className={`w-4 h-4 ${project.pinned ? 'fill-current' : ''}`} />
                  </button>
                )}
              </div>
              <p className="text-text-secondary text-sm max-w-2xl leading-relaxed whitespace-pre-wrap">
                {project.description}
              </p>

              {project.workspacePaths && project.workspacePaths.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider font-mono mr-1">
                    Workspaces:
                  </span>
                  {project.workspacePaths.map((p) => (
                    <span
                      key={p}
                      title={p}
                      className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface-primary border border-border-primary/50 px-2 py-1 rounded shadow-sm"
                    >
                      <Folder className="w-3 h-3 text-text-muted" />
                      {p.split('/').pop() || p}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditName(project.name);
                    setEditDesc(project.description);
                    setEditCategory(project.category);
                    setEditDueDate(project.dueDate || '');
                    setEditWorkspacePaths(project.workspacePaths || []);
                    setIsCustomCategoryMode(false);
                    setIsEditingProj(true);
                  }}
                >
                  <Edit className="w-3.5 h-3.5" /> Edit
                </Button>
                {project.category !== 'Completed' && (
                  <Button variant="success" size="sm" onClick={() => onCompleteProject(project.id)}>
                    <CheckCircle className="w-4 h-4" /> Complete
                  </Button>
                )}
                <Button variant="danger" size="sm" onClick={onDeleteProjectClick}>
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
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
                className="bg-interactive-primary h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${calculatedProgress}%` }}
              />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
