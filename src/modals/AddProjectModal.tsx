import { addMonths, format } from 'date-fns';
import { ArrowLeft, CalendarIcon, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { PROJECT_CATEGORIES } from '../constants/categories';
import type { Project } from '../types';

interface AddProjectModalProps {
  isOpen: boolean;
  projName: string;
  projDesc: string;
  projCategory: Project['category'];
  projDueDate?: string;
  availableCategories?: string[];
  onChangeName: (v: string) => void;
  onChangeDesc: (v: string) => void;
  onChangeCategory: (v: Project['category']) => void;
  onChangeDueDate?: (v: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function AddProjectModal({
  isOpen,
  projName,
  projDesc,
  projCategory,
  projDueDate,
  availableCategories = [],
  onChangeName,
  onChangeDesc,
  onChangeCategory,
  onChangeDueDate,
  onClose,
  onSubmit,
}: AddProjectModalProps) {
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(new Date());

  const formatDateStr = (d: Date) => {
    return d.toISOString().substring(0, 10);
  };

  const formatDisplayDate = (dStr: string) => {
    try {
      return format(new Date(dStr + 'T00:00:00'), 'MMM d, yyyy');
    } catch {
      return dStr;
    }
  };

  // Use availableCategories if provided, otherwise fallback to PROJECT_CATEGORIES
  const allPooledCategories = Array.from(
    new Set(availableCategories.length > 0 ? availableCategories : PROJECT_CATEGORIES),
  ).filter(Boolean);

  const handleCategorySelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '__custom__') {
      setIsCustomMode(true);
      onChangeCategory('');
    } else {
      onChangeCategory(val);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-surface-secondary border border-border-primary rounded-xl p-6 max-w-md w-full shadow-2xl z-10"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
                Initialize Project Board
              </h3>
              <button
                onClick={onClose}
                className="text-text-muted hover:text-text-primary cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5 font-mono">
                  Project Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Core System Refactor"
                  className="bg-surface-primary border border-border-primary text-xs text-text-primary rounded-lg p-2.5 w-full focus:outline-none focus:border-border-focus focus:ring-0"
                  value={projName}
                  onChange={(e) => onChangeName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5 font-mono">
                  Executive Summary
                </label>
                <textarea
                  placeholder="Summarize key features, scopes, or launch schedules..."
                  className="bg-surface-primary border border-border-primary text-xs text-text-primary rounded-lg p-2.5 w-full h-24 focus:outline-none focus:border-border-focus focus:ring-0"
                  value={projDesc}
                  onChange={(e) => onChangeDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5 font-mono">
                    Due Date
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="bg-surface-primary border border-border-primary text-xs text-text-primary rounded-lg p-2.5 w-full focus:outline-none focus:border-border-focus focus:ring-0 flex items-center justify-between cursor-pointer"
                  >
                    {projDueDate ? (
                      <span className="font-semibold">{formatDisplayDate(projDueDate)}</span>
                    ) : (
                      <span className="text-text-muted">Set due date...</span>
                    )}
                    <CalendarIcon className="w-4 h-4 text-text-muted" />
                  </button>

                  {isDatePickerOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-[9998]"
                        onClick={() => setIsDatePickerOpen(false)}
                      />
                      <div className="absolute left-0 top-[calc(100%+8px)] w-[340px] bg-surface-secondary border border-border-primary rounded-xl p-3.5 z-[9999] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <span className="text-xs font-bold text-text-primary tracking-wide">
                            {format(pickerMonth, 'MMMM yyyy')}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPickerMonth((prev) => addMonths(prev, -1))}
                              className="w-6 h-6 rounded-md border border-border-primary bg-surface-primary hover:bg-surface-hover hover:border-border-focus text-text-muted hover:text-text-primary flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPickerMonth((prev) => addMonths(prev, 1))}
                              className="w-6 h-6 rounded-md border border-border-primary bg-surface-primary hover:bg-surface-hover hover:border-border-focus text-text-muted hover:text-text-primary flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <DayPicker
                          mode="single"
                          required
                          selected={projDueDate ? new Date(projDueDate + 'T00:00:00') : undefined}
                          onSelect={(date) => {
                            if (date && onChangeDueDate) {
                              onChangeDueDate(formatDateStr(date));
                            }
                            setIsDatePickerOpen(false);
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

                        {projDueDate && onChangeDueDate && (
                          <div className="pt-2 mt-2 border-t border-border-primary flex justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                onChangeDueDate('');
                                setIsDatePickerOpen(false);
                              }}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Clear Date</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                      Category Tag
                    </label>
                    {isCustomMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomMode(false);
                          onChangeCategory('Engineering');
                        }}
                        className="text-[10px] text-text-muted hover:text-text-primary flex items-center gap-1 font-mono transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" /> Select from list
                      </button>
                    )}
                  </div>

                  {isCustomMode ? (
                    <input
                      type="text"
                      placeholder="Type custom category name (e.g. AI Research)..."
                      className="bg-surface-primary border border-white/40 text-xs text-text-primary rounded-lg p-2.5 w-full focus:outline-none focus:border-border-focus focus:ring-0"
                      value={projCategory}
                      onChange={(e) => onChangeCategory(e.target.value)}
                    />
                  ) : (
                    <select
                      className="bg-surface-primary border border-border-primary text-xs text-text-muted rounded-lg p-2.5 w-full focus:outline-none focus:border-border-focus cursor-pointer"
                      value={
                        allPooledCategories.includes(projCategory) ? projCategory : '__custom__'
                      }
                      onChange={handleCategorySelect}
                    >
                      {allPooledCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option disabled value="">
                        ───
                      </option>
                      <option value="__custom__">+ Add Custom Category...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold text-text-muted hover:text-text-primary px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!projName.trim()}
                  className="bg-interactive-primary text-interactive-primary-text font-bold text-xs px-4 py-2 rounded-lg hover:bg-interactive-hover disabled:opacity-40 transition-colors"
                >
                  Create Board
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
