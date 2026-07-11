import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowUpRight, 
  CheckCircle,
  Clock, 
  Grid2X2, 
  Kanban,
  Plus,
  Settings
} from 'lucide-react';
import { Project, Task, Sprint, getCategoryStyle, PROJECT_CATEGORIES } from '../types';
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
  onAddTaskToProject: (taskTitle: string, projectId: string, sprintId?: string | null) => Task | void;
  onSelectTask?: (task: Task) => void;
}

export default function ProjectsView({
  projects,
  tasks,
  categories,
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
  const activeProjectsCount = projects.filter(p => p.category !== 'Completed').length;

  // Available category tabs dynamically built strictly from projects that exist (hiding empty tags)
  const availableCategories = useMemo(() => {
    const cats = Array.from(new Set(projects.map(p => p.category))).filter(Boolean);
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
      setSelectedCategory('All');
    }
  }, [availableCategories, selectedCategory]);

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (selectedCategory !== 'All') {
      list = projects.filter(p => p.category === selectedCategory);
    }
    // Sort projects based on assigned project category tag, then project name
    return [...list].sort((a, b) => {
      const idxA = (PROJECT_CATEGORIES as readonly string[]).indexOf(a.category);
      const idxB = (PROJECT_CATEGORIES as readonly string[]).indexOf(b.category);
      let catComp = 0;
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
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Projects</h1>
          <p className="text-[#C4C7C8] text-sm mt-1">
            Managing {projects.length} workspace projects ({activeProjectsCount} active).
          </p>
        </div>

        {/* High-Contrast Toggles and Actions */}
        <div className="flex items-center gap-3">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-lg p-0.5 flex">
            <button
              onClick={() => setViewMode('grid')}
              id="toggle-projects-grid"
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[#201F1F] text-white border border-[#27272A]'
                  : 'text-[#8E9192] hover:text-white'
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
                  ? 'bg-[#201F1F] text-white border border-[#27272A]'
                  : 'text-[#8E9192] hover:text-white'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Board View</span>
            </button>
          </div>

          <button
            onClick={onAddProjectClick}
            id="btn-projects-new-project"
            className="bg-white hover:bg-white/90 text-black text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 no-scrollbar border-b border-[#27272A]/40 shrink-0">
        {availableCategories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const count = cat === 'All' ? projects.length : projects.filter(p => p.category === cat).length;
          const style = cat === 'All' ? null : getCategoryStyle(cat);
          
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono tracking-tight transition-all inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-white text-black font-bold shadow-md'
                  : 'bg-[#0A0A0A] text-[#8E9192] hover:text-white border border-[#27272A]/80 hover:border-white/20'
              }`}
            >
              {style && <span className={`w-1.5 h-1.5 rounded-full shrink-0 self-center ${isSelected ? 'bg-black' : style.dot}`} />}
              <span className="self-center leading-tight">{cat}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono self-center leading-tight ${isSelected ? 'bg-black/10 text-black' : 'bg-[#141313] text-[#8E9192]'}`}>
                {count}
              </span>
            </button>
          );
        })}
        {onManageCategoriesClick && (
          <button
            onClick={onManageCategoriesClick}
            className="ml-auto px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#8E9192] hover:text-white bg-[#0A0A0A] border border-[#27272A] hover:border-white/30 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
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
            const projectTasks = tasks.filter(t => t.projectId === project.id);
            const completedCount = projectTasks.filter(t => t.completed).length;
            const progressValue = projectTasks.length > 0 
              ? Math.round((completedCount / projectTasks.length) * 100)
              : project.progress;
            const catStyle = getCategoryStyle(project.category);

            return (
              <div
                key={project.id}
                id={`project-card-${project.id}`}
                onClick={() => handleProjectCardClick(project.id)}
                className={`p-6 flex flex-col justify-between group hover:bg-[#121212] border border-[#27272A] hover:border-white/20 transition-all duration-300 min-h-[220px] rounded-xl cursor-pointer ${
                  isCompleted ? 'bg-[#0A0A0A]/40 opacity-70' : 'bg-[#0A0A0A]'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider leading-tight font-mono border ${catStyle.border} ${catStyle.bg} ${catStyle.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 self-center ${catStyle.dot}`} />
                      <span className="self-center">{project.category}</span>
                    </span>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4 text-white" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-[#8E9192] group-hover:text-white transition-colors" />
                    )}
                  </div>

                  <h2 className={`text-lg font-bold text-white mb-2 tracking-tight ${isCompleted ? 'line-through decoration-[#8E9192]' : ''}`}>
                    {project.name}
                  </h2>
                  <p className="text-xs text-[#C4C7C8] leading-relaxed mb-6 block truncate">
                    {project.description}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2 text-[10px] font-mono tracking-wider">
                    <span className="text-[#8E9192]">Progress</span>
                    <span className="text-white font-bold">{progressValue}%</span>
                  </div>
                  <div className="w-full bg-[#121212] h-1.5 rounded-full overflow-hidden border border-[#27272A]/30">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-white/60' : 'bg-white'}`}
                      style={{ width: `${progressValue}%` }}
                    ></div>
                  </div>
                  {!isCompleted && project.dueDays > 0 && (
                    <div className="flex items-center gap-1 mt-3 text-[9px] text-[#8E9192] font-mono">
                      <Clock className="w-3 h-3" />
                      <span>Due in {project.dueDays} days</span>
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
