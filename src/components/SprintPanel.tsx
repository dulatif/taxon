import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import SprintFormModal from '../sections/Sprint/SprintFormModal';
import SprintHeader from '../sections/Sprint/SprintHeader';
import SprintList from '../sections/Sprint/SprintList';
import SprintProgress from '../sections/Sprint/SprintProgress';
import type { Sprint, Task } from '../types';

interface SprintPanelProps {
  projectId: string;
  sprints: Sprint[];
  tasks: Task[];
  onCreateSprint: (
    projectId: string,
    name: string,
    startDate: string,
    endDate: string,
    goal?: string,
  ) => void;
  onEditSprint: (sprintId: string, updates: Partial<Sprint>) => void;
  onCompleteSprintTrigger: (sprint: Sprint) => void;
  onDeleteSprint: (sprintId: string) => void;
  selectedSprintId: string | 'all' | 'backlog';
  onSelectSprint: (sprintId: string | 'all' | 'backlog') => void;
}

export default function SprintPanel({
  projectId,
  sprints,
  tasks,
  onCreateSprint,
  onEditSprint,
  onCompleteSprintTrigger,
  onDeleteSprint,
  selectedSprintId,
  onSelectSprint,
}: SprintPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);

  // Form states for creation
  const getTodayStr = () => new Date().toISOString().substring(0, 10);
  const getTwoWeeksStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().substring(0, 10);
  };

  const projectSprints = sprints.filter((s) => s.projectId === projectId);
  const [newName, setNewName] = useState(`Sprint ${projectSprints.length + 1}`);
  const [newStartDate, setNewStartDate] = useState(getTodayStr());
  const [newEndDate, setNewEndDate] = useState(getTwoWeeksStr());
  const [newGoal, setNewGoal] = useState('');

  // Form states for edit
  const [editName, setEditName] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editGoal, setEditGoal] = useState('');
  const [editStatus, setEditStatus] = useState<Sprint['status']>('Planned');

  const activeSprint = projectSprints.find((s) => s.status === 'Active');
  const plannedSprints = projectSprints.filter((s) => s.status === 'Planned');
  const completedSprints = projectSprints.filter((s) => s.status === 'Completed');

  const getSprintStats = (sprintId: string) => {
    const sTasks = tasks.filter((t) => t.sprintId === sprintId);
    const completed = sTasks.filter((t) => t.completed).length;
    const total = sTasks.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percentage };
  };

  const handleStartCreate = () => {
    setNewName(`Sprint ${projectSprints.length + 1}`);
    setNewStartDate(getTodayStr());
    setNewEndDate(getTwoWeeksStr());
    setNewGoal('');
    setIsCreating(true);
    setIsExpanded(true);
  };

  const handleSaveNewSprint = () => {
    if (!newName.trim()) return;
    onCreateSprint(projectId, newName, newStartDate, newEndDate, newGoal);
    setIsCreating(false);
  };

  const handleStartEdit = (sprint: Sprint) => {
    setEditName(sprint.name);
    setEditStartDate(sprint.startDate);
    setEditEndDate(sprint.endDate);
    setEditGoal(sprint.goal || '');
    setEditStatus(sprint.status);
    setEditingSprintId(sprint.id);
  };

  const handleSaveEdit = (sprintId: string) => {
    if (!editName.trim()) return;
    onEditSprint(sprintId, {
      name: editName.trim(),
      startDate: editStartDate,
      endDate: editEndDate,
      goal: editGoal.trim() || undefined,
      status: editStatus,
    });
    setEditingSprintId(null);
  };

  return (
    <div
      className={`mb-6 bg-surface-primary border border-border-primary rounded-xl shadow-sm transition-all relative ${
        isExpanded ? 'z-40 overflow-visible' : 'overflow-hidden'
      }`}
    >
      <SprintHeader
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
        activeSprint={activeSprint}
        totalSprints={projectSprints.length}
        onNewSprint={handleStartCreate}
      />

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            style={{ overflow: isExpanded ? 'visible' : 'hidden' }}
            className="p-4 space-y-4 relative z-40"
          >
            <AnimatePresence>
              {isCreating && (
                <SprintFormModal
                  isEdit={false}
                  name={newName}
                  startDate={newStartDate}
                  endDate={newEndDate}
                  goal={newGoal}
                  setName={(v) => setNewName(v)}
                  setStartDate={(v) => setNewStartDate(v)}
                  setEndDate={(v) => setNewEndDate(v)}
                  setGoal={(v) => setNewGoal(v)}
                  onClose={() => setIsCreating(false)}
                  onSubmit={handleSaveNewSprint}
                />
              )}
            </AnimatePresence>

            {activeSprint ? (
              <SprintProgress
                sprint={activeSprint}
                stats={getSprintStats(activeSprint.id)}
                isSelected={selectedSprintId === activeSprint.id}
                onSelect={() =>
                  onSelectSprint(selectedSprintId === activeSprint.id ? 'all' : activeSprint.id)
                }
                onEdit={() => handleStartEdit(activeSprint)}
                onComplete={() => onCompleteSprintTrigger(activeSprint)}
              />
            ) : (
              <div className="bg-surface-secondary border border-border-primary rounded-xl p-4 text-center">
                <p className="text-xs font-mono text-text-muted">
                  No active sprint right now. Start a planned sprint below or create a new sprint.
                </p>
              </div>
            )}

            {editingSprintId && (
              <SprintFormModal
                isEdit={true}
                name={editName}
                startDate={editStartDate}
                endDate={editEndDate}
                goal={editGoal}
                status={editStatus}
                setName={(v) => setEditName(v)}
                setStartDate={(v) => setEditStartDate(v)}
                setEndDate={(v) => setEditEndDate(v)}
                setGoal={(v) => setEditGoal(v)}
                setStatus={(v) => setEditStatus(v)}
                onClose={() => setEditingSprintId(null)}
                onSubmit={() => handleSaveEdit(editingSprintId)}
              />
            )}

            <SprintList
              plannedSprints={plannedSprints}
              completedSprints={completedSprints}
              selectedSprintId={selectedSprintId}
              getSprintStats={getSprintStats}
              onSelectSprint={onSelectSprint}
              onEditSprint={onEditSprint}
              onStartEdit={handleStartEdit}
              onDeleteSprint={onDeleteSprint}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
