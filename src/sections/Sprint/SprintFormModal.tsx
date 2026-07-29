import { Edit3, Sparkles, X } from 'lucide-react';
import { motion } from 'motion/react';
import CustomSelect from '../../components/CustomSelect';
import type { Sprint } from '../../types';
import SprintDatePicker from './SprintDatePicker';

interface SprintFormModalProps {
  isEdit: boolean;
  name: string;
  startDate: string;
  endDate: string;
  goal: string;
  status?: Sprint['status'];
  setName: (v: string) => void;
  setStartDate: (v: string) => void;
  setEndDate: (v: string) => void;
  setGoal: (v: string) => void;
  setStatus?: (v: Sprint['status']) => void;
  onClose: () => void;
  onSubmit: (e?: React.FormEvent) => void;
}

export default function SprintFormModal({
  isEdit,
  name,
  startDate,
  endDate,
  goal,
  status,
  setName,
  setStartDate,
  setEndDate,
  setGoal,
  setStatus,
  onClose,
  onSubmit,
}: SprintFormModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  const statusOptions: { value: Sprint['status']; label: string }[] = [
    { value: 'Planned', label: 'Planned' },
    { value: 'Active', label: 'Active' },
    { value: 'Completed', label: 'Completed' },
  ];

  return (
    <motion.form
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onSubmit={handleSubmit}
      className={`bg-surface-secondary border rounded-lg p-4 space-y-3 shadow-lg relative z-50 ${
        isEdit ? 'border-interactive-primary shadow-xl' : 'border-interactive-primary/50'
      }`}
    >
      <div className="flex items-center justify-between border-b border-border-primary pb-2">
        <span className="text-xs font-bold font-mono text-text-primary flex items-center gap-1.5">
          {isEdit ? (
            <Edit3 className="w-3.5 h-3.5 text-interactive-primary" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-interactive-primary" />
          )}
          {isEdit ? 'Edit Sprint' : 'Create New Sprint'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className={`grid grid-cols-1 ${isEdit ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3`}>
        <div>
          <label className="block text-[11px] font-mono text-text-muted mb-1">
            {isEdit ? 'Name' : 'Sprint Name'}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sprint 1"
            className="w-full bg-surface-primary border border-border-primary rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-interactive-primary"
            required
          />
        </div>

        {isEdit && setStatus && status && (
          <div>
            <label className="block text-[11px] font-mono text-text-muted mb-1">Status</label>
            <CustomSelect
              value={status}
              onChange={(v) => setStatus(v as Sprint['status'])}
              options={statusOptions}
              buttonClassName="w-full justify-between"
              size="sm"
            />
          </div>
        )}

        <SprintDatePicker label="Start Date" value={startDate} onChange={setStartDate} />
        <SprintDatePicker label="End Date" value={endDate} onChange={setEndDate} />
      </div>

      <div>
        <label className="block text-[11px] font-mono text-text-muted mb-1">
          {isEdit ? 'Goal' : 'Sprint Goal (Optional)'}
        </label>
        <input
          type="text"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={isEdit ? '' : 'What is the main objective of this sprint?'}
          className="w-full bg-surface-primary border border-border-primary rounded px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-interactive-primary"
        />
      </div>

      <div className={`flex justify-end gap-2 ${isEdit ? 'pt-2' : 'pt-1'}`}>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs font-mono text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-1.5 text-xs font-mono font-bold bg-interactive-primary hover:bg-interactive-primary-hover text-interactive-primary-text rounded transition-colors cursor-pointer shadow-md shadow-interactive-primary/20"
        >
          {isEdit ? 'Save Changes' : 'Create & Save'}
        </button>
      </div>
    </motion.form>
  );
}
