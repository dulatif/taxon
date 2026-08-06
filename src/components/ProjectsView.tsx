import { ArrowUpRight, CheckCircle, Clock, Grid2X2, Kanban, Plus, Settings } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PROJECT_CATEGORIES } from '../constants/categories';
import { getCategoryStyle } from '../services/category-color';
import type { Project, Sprint, Task } from '../types';

import KanbanView from './KanbanView';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  categories?: string[];
  sprints?: Sprint[];
  onAssignTaskToSprint?: (taskId: string, sprintId: string | null) => void;
  onProjectSelect: (id: string) => void;
  onViewChange: (view: string) => void;
  onAddProjectClick: () => void;
  onManageCategoriesClick?: () => void;
  onMoveTaskStatus: (taskId: string, newStatus: Task['status']) => void;
  onAddTaskToProject: (
    taskTitle: string,
    projectId: string,
    sprintId?: string | null,
  ) => Task | void;
  onSelectTask?: (task: Task) => void;
}

export default function ProjectsView({
  projects,
  tasks,

  onProjectSelect,
  onViewChange,
  onAddProjectClick,
  onManageCategoriesClick,
  onMoveTaskStatus,
  onAddTaskToProject,
  onSelectTask,
  sprints,
  onAssignTaskToSprint,
}: ProjectsViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Local active count calculator
  const activeProjectsCount = projects.filter((p) => p.category !== 'Completed').length;

  // Available category tabs dynamically built strictly from projects that exist (hiding empty tags)
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(projects.map((p) => p.category))).filter(Boolean);
    cats.sort((a, b) => {
      const idxA = (PROJECT_CATEGORIES as readonly string[]).indexOf(a);
      const idxB = (PROJECT_CATEGORIES as readonly string[]).indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return ['All', ...cats];
  }, [projects]);

  // Reset selected category if its projects are all deleted/moved
  useEffect(() => {
    if (!availableCategories.includes(selectedCategory)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCategory('All');
    }
  }, [availableCategories, selectedCategory]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (selectedCategory === 'All') {
      list = projects.filter((p) => p.category !== 'Completed');
    } else {
      list = projects.filter((p) => p.category === selectedCategory);
    }
    // Sort projects based on assigned project category tag, then project name
    return [...list].sort((a, b) => {
      const idxA = (PROJECT_CATEGORIES as readonly string[]).indexOf(a.category);
      const idxB = (PROJECT_CATEGORIES as readonly string[]).indexOf(b.category);
      let catComp: number;
      if (idxA !== -1 && idxB !== -1) catComp = idxA - idxB;
      else if (idxA !== -1) catComp = -1;
      else if (idxB !== -1) catComp = 1;
      else catComp = a.category.localeCompare(b.category);

      if (catComp !== 0) return catComp;
      return a.name.localeCompare(b.name);
    });
  }, [projects, selectedCategory]);

  const handleProjectCardClick = (id: string) => {
    onProjectSelect(id);
    onViewChange('project-details');
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl w-full mx-auto flex flex-col h-full overflow-hidden">
      {/* View Mode & Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">
            Projects
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Managing {projects.length} workspace projects ({activeProjectsCount} active).
          </p>
        </div>

        {/* High-Contrast Toggles and Actions */}
        <div className="flex items-center gap-3">
          <div className="bg-surface-secondary border border-border-primary rounded-lg p-0.5 flex">
            <button
              onClick={() => setViewMode('grid')}
              id="toggle-projects-grid"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-surface-hover text-text-primary border border-border-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Grid2X2 className="w-3.5 h-3.5" />
              <span>Grid View</span>
            </button>
            <button
              id="toggle-projects-kanban"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-surface-hover text-text-primary border border-border-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board View</span>
            </button>
          </div>

          <button
            onClick={onAddProjectClick}
            id="btn-projects-new-project"
            className="bg-interactive-primary hover:bg-interactive-hover text-interactive-primary-text text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar border-b border-border-primary/40 shrink-0">
        {availableCategories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const count =
            cat === 'All' ? activeProjectsCount : projects.filter((p) => p.category === cat).length;
          const style = cat === 'All' ? null : getCategoryStyle(cat);

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono tracking-tight transition-all inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-interactive-primary text-interactive-primary-text font-bold shadow-md'
                  : 'bg-surface-secondary text-text-muted hover:text-text-primary border border-border-primary/80 hover:border-white/20'
              }`}
            >
              {style && (
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 self-center ${isSelected ? 'bg-interactive-primary-text' : style.dot}`}
                />
              )}
              <span className="self-center leading-tight">{cat}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono self-center leading-tight ${isSelected ? 'bg-surface-primary/20 text-interactive-primary-text' : 'bg-surface-secondary text-text-muted'}`}
              >
                {count}
              </span>
            </button>
          );
        })}
        {onManageCategoriesClick && (
          <button
            onClick={onManageCategoriesClick}
            className="ml-auto px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text-primary bg-surface-secondary border border-border-primary hover:border-white/30 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            title="Manage Category Tags"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Manage Tags</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-1">
          {filteredProjects.map((project) => {
            const isCompleted = project.category === 'Completed';
            const projectTasks = tasks.filter((t) => t.projectId === project.id);
            const completedCount = projectTasks.filter((t) => t.completed).length;
            const progressValue =
              projectTasks.length > 0
                ? Math.round((completedCount / projectTasks.length) * 100)
                : project.progress;
            const catStyle = getCategoryStyle(project.category);

            return (
              <div
                key={project.id}
                id={`project-card-${project.id}`}
                onClick={() => handleProjectCardClick(project.id)}
                className={`p-4 flex flex-col justify-between group hover:bg-surface-hover border border-border-primary hover:border-white/20 transition-all duration-300 min-h-[160px] rounded-xl cursor-pointer ${
                  isCompleted ? 'bg-surface-secondary/40 opacity-70' : 'bg-surface-secondary'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider leading-tight font-mono border ${catStyle.border} ${catStyle.bg} ${catStyle.text}`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 self-center ${catStyle.dot}`}
                      />
                      <span className="self-center">{project.category}</span>
                    </span>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-text-primary" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-text-primary transition-colors" />
                    )}
                  </div>

                  <h2
                    className={`text-lg font-bold text-text-primary mb-2 tracking-tight ${isCompleted ? 'line-through decoration-border-primary' : ''}`}
                  >
                    {project.name}
                  </h2>
                  <p className="text-xs text-text-muted leading-relaxed mb-3 block truncate">
                    {project.description}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2 text-[10px] font-mono tracking-wider">
                    <span className="text-text-muted">Progress</span>
                    <span className="text-text-primary font-bold">{progressValue}%</span>
                  </div>
                  <div className="w-full bg-surface-hover h-1.5 rounded-full overflow-hidden border border-border-primary/30">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-interactive-primary/60' : 'bg-interactive-primary'}`}
                      style={{ width: `${progressValue}%` }}
                    ></div>
                  </div>
                  {!isCompleted && project.dueDate && (
                    <div className="flex items-center gap-1 mt-3 text-[9px] text-text-muted font-mono">
                      <Clock className="w-3 h-3" />
                      <span>
                        Due on{' '}
                        {new Date(project.dueDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          <KanbanView
            projects={filteredProjects}
            tasks={tasks}
            sprints={sprints}
            onMoveTaskStatus={onMoveTaskStatus}
            onAddTaskToProject={onAddTaskToProject}
            onSelectTask={onSelectTask}
            onAssignTaskToSprint={onAssignTaskToSprint}
          />
        </div>
      )}
    </div>
  );
}
