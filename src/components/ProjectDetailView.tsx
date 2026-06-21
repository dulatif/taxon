import React, { useState } from 'react';
import { 
  CheckCircle, 
  Clock, 
  Edit, 
  FolderOpen, 
  FileCode, 
  FileImage, 
  FileText,
  Plus, 
  ArrowLeft,
  SortAsc,
  Download,
  Trash2,
  Square,
  CheckSquare,
  ExternalLink
} from 'lucide-react';
import { Project, Task, DocumentFile } from '../types';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { stat } from '@tauri-apps/plugin-fs';
import { open as shellOpen } from '@tauri-apps/plugin-shell';

interface ProjectDetailViewProps {
  project: Project;
  tasks: Task[];
  files: DocumentFile[];
  onToggleTask: (id: string) => void;
  onAddTask: (title: string, projectId: string) => void;
  onDeleteTask: (id: string) => void;
  onCompleteProject: (projectId: string) => void;
  onEditProject: (projectId: string, name: string, description: string) => void;
  onDeleteProject: (projectId: string) => void;
  onAddFile: (projectId: string, name: string, size: string, type: DocumentFile['type']) => void;
  onDeleteFile: (id: string) => void;
  onBackToProjects: () => void;
}

export default function ProjectDetailView({
  project,
  tasks,
  files,
  onToggleTask,
  onAddTask,
  onDeleteTask,
  onCompleteProject,
  onEditProject,
  onDeleteProject,
  onAddFile,
  onDeleteFile,
  onBackToProjects,
}: ProjectDetailViewProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedSort, setSelectedSort] = useState<'default' | 'completed' | 'pending'>('default');
  
  // File addition triggers
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState<DocumentFile['type']>('code');
  const [isAddingFile, setIsAddingFile] = useState(false);

  // Editing Project
  const [isEditingProj, setIsEditingProj] = useState(false);
  const [editName, setEditName] = useState(project.name);
  const [editDesc, setEditDesc] = useState(project.description);

  // Filters tasks for this project
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const projectFiles = files.filter(f => f.projectId === project.id);

  const completedCount = projectTasks.filter(t => t.completed).length;
  const totalTasksCount = projectTasks.length;
  const calculatedProgress = totalTasksCount > 0 
    ? Math.round((completedCount / totalTasksCount) * 100) 
    : project.progress;

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    onAddTask(newTaskTitle, project.id);
    setNewTaskTitle('');
  };

  const handleNativeAddFile = async () => {
    try {
      const selected = await openDialog({
        multiple: false,
      });
      if (selected && typeof selected === 'string') {
        let sizeStr = 'Unknown';
        try {
          const fileStat = await stat(selected);
          const size = fileStat.size;
          sizeStr = size > 1024 * 1024 ? `${(size / (1024 * 1024)).toFixed(1)} MB` : `${Math.round(size / 1024)} KB`;
        } catch (e) {
          console.error('Stat error', e);
        }
        
        let determinedType: DocumentFile['type'] = 'code';
        if (selected.match(/\.(png|jpe?g|svg|webp|gif)$/i)) determinedType = 'image';
        else if (selected.match(/\.pdf$/i)) determinedType = 'pdf';
        
        // Store absolute path as name
        onAddFile(project.id, selected, sizeStr, determinedType);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveProjectEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onEditProject(project.id, editName, editDesc);
    setIsEditingProj(false);
  };

  // Sort logic for tasks
  const sortedTasks = [...projectTasks].sort((a, b) => {
    if (selectedSort === 'completed') {
      return (a.completed === b.completed) ? 0 : a.completed ? -1 : 1;
    }
    if (selectedSort === 'pending') {
      return (a.completed === b.completed) ? 0 : a.completed ? 1 : -1;
    }
    return 0; // default order
  });

  const getFileIcon = (type: DocumentFile['type']) => {
    switch (type) {
      case 'image':
        return <FileImage className="w-4 h-4 text-[#8E9192]" />;
      case 'code':
        return <FileCode className="w-4 h-4 text-[#8E9192]" />;
      default:
        return <FileText className="w-4 h-4 text-[#8E9192]" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 space-y-6">
      
      {/* Back button */}
      <button 
        onClick={onBackToProjects}
        className="flex items-center gap-2 text-xs font-semibold text-[#8E9192] hover:text-white transition-colors uppercase tracking-wider font-mono bg-[#141313] hover:bg-[#201F1F] px-3 py-1.5 rounded-lg border border-[#27272A] w-fit cursor-pointer"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>All projects</span>
      </button>

      {/* Project Header Description Block */}
      <section className="space-y-6 bg-[#0A0A0A] border border-[#27272A] p-6 rounded-xl relative">
        {isEditingProj ? (
          <form onSubmit={handleSaveProjectEdit} className="space-y-4">
            <input 
              type="text" 
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-black text-white border border-[#27272A] text-xl font-bold rounded p-2 w-full focus:outline-none focus:border-white"
              required
            />
            <textarea 
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="bg-black text-[#C4C7C8] border border-[#27272A] text-sm rounded p-2 w-full h-20 focus:outline-none focus:border-white"
            />
            <div className="flex gap-2 justify-end">
              <button 
                type="button" 
                onClick={() => setIsEditingProj(false)}
                className="text-xs text-[#8E9192] hover:text-white px-3 py-1.5"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="text-xs bg-white text-black font-bold px-4 py-1.5 rounded"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{project.name}</h1>
              <p className="text-[#C4C7C8] text-sm mt-2 max-w-2xl leading-relaxed">{project.description}</p>
            </div>
            
            <div className="flex gap-3 shrink-0">
              <button 
                onClick={() => {
                  setEditName(project.name);
                  setEditDesc(project.description);
                  setIsEditingProj(true);
                }}
                className="bg-black text-white border border-[#27272A] font-medium text-xs px-4 py-2 rounded-lg hover:bg-[#201F1F] transition-colors flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
              <button 
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${project.name}"? All associated tasks and files will be removed.`)) {
                    onDeleteProject(project.id);
                  }
                }}
                className="bg-black text-[#8E9192] border border-[#27272A] font-medium text-xs px-4 py-2 rounded-lg hover:bg-[#201F1F] hover:text-red-400 hover:border-red-400/30 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              {project.category !== 'Completed' && (
                <button 
                  onClick={() => onCompleteProject(project.id)}
                  className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-white/90 transition-opacity flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" /> Complete Project
                </button>
              )}
            </div>
          </div>
        )}

        {/* Unified progress track row */}
        <div className="pt-4 border-t border-[#27272A]/50">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-[#8E9192] uppercase tracking-wider font-mono font-bold">Progress</span>
              <span className="text-lg font-bold text-white font-mono">{calculatedProgress}%</span>
            </div>
            <div className="flex-1 max-w-md">
              <div className="w-full bg-[#141313] h-1.5 rounded-full overflow-hidden border border-[#27272A]/30">
                <div 
                  className="bg-white h-full rounded-full transition-all duration-500" 
                  style={{ width: `${calculatedProgress}%` }}
                ></div>
              </div>
            </div>
            {project.dueDays > 0 && (
              <div className="text-[10px] text-[#8E9192] uppercase tracking-widest font-mono shrink-0 font-bold bg-[#141313] px-2.5 py-1 rounded inline-block border border-[#27272A]/50">
                Due in {project.dueDays} days
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Grid Content: Tasks & Documents */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Task List Section */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                Tasks
              </h2>
              <button 
                onClick={() => {
                  const seq: ('default' | 'completed' | 'pending')[] = ['default', 'completed', 'pending'];
                  const nextIdx = (seq.indexOf(selectedSort) + 1) % seq.length;
                  setSelectedSort(seq[nextIdx]);
                }}
                className="flex items-center gap-1.5 text-[#8E9192] hover:text-white transition-colors text-xs uppercase tracking-wider font-mono"
              >
                <SortAsc className="w-3.5 h-3.5" />
                <span>Sort: {selectedSort}</span>
              </button>
            </div>

            {/* Checklist tasks container */}
            <ul className="divide-y divide-[#27272A]/40">
              {sortedTasks.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#8E9192]">
                  No tasks defined for this project. Use the field below to customize goals.
                </div>
              ) : (
                sortedTasks.map((task) => (
                  <li 
                    key={task.id} 
                    className="flex items-start justify-between py-3.5 hover:bg-[#141313]/40 p-2 rounded-lg transition-colors group"
                  >
                    <div className="flex items-start gap-4 flex-1 mr-4">
                      <button 
                        onClick={() => onToggleTask(task.id)}
                        className="shrink-0 mt-0.5 text-[#8E9192] hover:text-white transition-colors"
                      >
                        {task.completed ? (
                          <CheckSquare className="w-4 h-4 text-white" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold leading-relaxed text-white ${task.completed ? 'line-through text-[#8E9192]/80 decoration-[#27272A]' : ''}`}>
                          {task.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {task.duration && (
                        <span className="text-[9px] font-mono font-semibold bg-black px-1.5 py-0.5 rounded border border-[#27272A]/50 text-[#8E9192]">
                          {task.duration}
                        </span>
                      )}
                      <button 
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete task item"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </li>
                ))
              )}
            </ul>

            {/* inline input field for adding project specific tasks */}
            <form onSubmit={handleAddTaskSubmit} className="mt-4">
              <div className="flex items-center gap-3 px-3 py-2 bg-[#141313] border border-[#27272A]/80 rounded-lg focus-within:border-white/30 transition-all">
                <Plus className="w-4 h-4 text-[#8E9192]" />
                <input
                  type="text"
                  className="bg-transparent border-none focus:outline-none text-xs text-white placeholder:text-[#8E9192]/60 w-full"
                  placeholder="Add a new task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                />
                <button 
                  type="submit" 
                  disabled={!newTaskTitle.trim()}
                  className="bg-zinc-800 text-white hover:bg-zinc-700 text-[10px] font-bold px-2 py-1 rounded disabled:opacity-40"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Documents Columns section */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[#27272A]/50">
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-white" />
                Documents
              </h3>
              <button 
                onClick={handleNativeAddFile}
                className="text-[10px] text-white hover:underline uppercase tracking-wider font-mono"
              >
                + Add file
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#8E9192]/80 bg-black/40 p-2 rounded-md border border-[#27272A]/40 mb-1">
                <FolderOpen className="w-4 h-4" />
                <span className="text-xs font-semibold font-mono tracking-tight text-white">Source Files</span>
              </div>

              {projectFiles.length === 0 ? (
                <div className="py-8 text-center text-[11px] text-[#8E9192] font-mono italic">
                  No documents listed
                </div>
              ) : (
                <div className="ml-4 pl-4 border-l border-[#27272A]/50 space-y-2">
                  {projectFiles.map((file) => (
                    <div 
                      key={file.id} 
                      className="flex items-center justify-between p-2 hover:bg-[#121212] rounded transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getFileIcon(file.type)}
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate max-w-[150px]" title={file.name}>
                            {file.name.split(/[/\\]/).pop()}
                          </p>
                          <p className="text-[10px] text-[#8E9192] font-mono mt-0.5">{file.size}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={async () => {
                            try {
                              await shellOpen(file.name);
                            } catch(e) {
                              console.error('Failed to open file', e);
                            }
                          }}
                          className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-white" 
                          title="Open document"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => onDeleteFile(file.id)}
                          className="p-1 hover:bg-[#201F1F] rounded text-[#8E9192] hover:text-red-400"
                          title="Delete asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
