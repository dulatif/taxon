import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  CheckCircle,
  Clock, 
  Grid2X2, 
  Kanban,
  Plus
} from 'lucide-react';
import { Project, Task } from '../types';
import KanbanView from './KanbanView';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  onProjectSelect: (id: string) => void;
  onViewChange: (view: string) => void;
  onAddProjectClick: () => void;
  onMoveTaskStatus: (taskId: string, newStatus: Task['status']) => void;
  onAddTaskToProject: (taskTitle: string, projectId: string) => void;
}

export default function ProjectsView({
  projects,
  tasks,
  onProjectSelect,
  onViewChange,
  onAddProjectClick,
  onMoveTaskStatus,
  onAddTaskToProject,
}: ProjectsViewProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'kanban'>('grid');
  
  // Local active count calculator
  const activeProjectsCount = projects.filter(p => p.category !== 'Completed').length;

  const handleProjectCardClick = (id: string) => {
    onProjectSelect(id);
    onViewChange('project-details');
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl w-full mx-auto flex flex-col h-full overflow-hidden">
      
      {/* View Mode & Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
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
            className="bg-white hover:bg-white/90 text-black text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pr-1">
          {projects.map((project) => {
            const isCompleted = project.category === 'Completed';
            const projectTasks = tasks.filter(t => t.projectId === project.id);
            const completedCount = projectTasks.filter(t => t.completed).length;
            const progressValue = projectTasks.length > 0 
              ? Math.round((completedCount / projectTasks.length) * 100)
              : project.progress;

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
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider leading-none font-mono ${
                      isCompleted 
                        ? 'bg-white text-black' 
                        : 'bg-[#141313] text-[#A1A1AA] border border-[#27272A]'
                    }`}>
                      {project.category}
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
            projects={projects}
            tasks={tasks}
            onMoveTaskStatus={onMoveTaskStatus}
            onAddTaskToProject={onAddTaskToProject}
          />
        </div>
      )}
    </div>
  );
}
