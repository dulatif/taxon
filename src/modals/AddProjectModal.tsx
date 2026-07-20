import React, { useState } from 'react';
import { X, Plus, ArrowLeft, CalendarIcon, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DayPicker } from 'react-day-picker';
import { format, addMonths } from 'date-fns';
import { Project } from '../types';
import { PROJECT_CATEGORIES } from '../constants/categories';;

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
    return d.toISOString().split('T')[0];
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
    new Set(availableCategories.length > 0 ? availableCategories : PROJECT_CATEGORIES)
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
            className="relative bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6 max-w-md w-full shadow-2xl z-10"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                Initialize Project Board
              </h3>
              <button onClick={onClose} className="text-[#8E9192] hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] mb-1.5 font-mono">
                  Project Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Core System Refactor"
                  className="bg-black border border-[#27272A] text-xs text-white rounded-lg p-2.5 w-full focus:outline-none focus:border-white focus:ring-0"
                  value={projName}
                  onChange={(e) => onChangeName(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] mb-1.5 font-mono">
                  Executive Summary
                </label>
                <textarea
                  placeholder="Summarize key features, scopes, or launch schedules..."
                  className="bg-black border border-[#27272A] text-xs text-white rounded-lg p-2.5 w-full h-24 focus:outline-none focus:border-white focus:ring-0"
                  value={projDesc}
                  onChange={(e) => onChangeDesc(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] mb-1.5 font-mono">
                    Due Date
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                    className="bg-black border border-[#27272A] text-xs text-white rounded-lg p-2.5 w-full focus:outline-none focus:border-white focus:ring-0 flex items-center justify-between cursor-pointer"
                  >
                    {projDueDate ? (
                      <span className="font-semibold">{formatDisplayDate(projDueDate)}</span>
                    ) : (
                      <span className="text-[#8E9192]">Set due date...</span>
                    )}
                    <CalendarIcon className="w-4 h-4 text-[#8E9192]" />
                  </button>

                  {isDatePickerOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-[9998]" 
                        onClick={() => setIsDatePickerOpen(false)} 
                      />
                      <div className="absolute left-0 top-[calc(100%+8px)] w-[340px] bg-[#0A0A0A] border border-[#27272A] rounded-xl p-3.5 z-[9999] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <span className="text-xs font-bold text-white tracking-wide">
                            {format(pickerMonth, 'MMMM yyyy')}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPickerMonth(prev => addMonths(prev, -1))}
                              className="w-6 h-6 rounded-md border border-[#27272A] bg-[#141313] hover:bg-[#201F1F] hover:border-white text-[#8E9192] hover:text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPickerMonth(prev => addMonths(prev, 1))}
                              className="w-6 h-6 rounded-md border border-[#27272A] bg-[#141313] hover:bg-[#201F1F] hover:border-white text-[#8E9192] hover:text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                          <div className="pt-2 mt-2 border-t border-[#27272A] flex justify-end">
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
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-[#8E9192] font-mono">
                      Category Tag
                    </label>
                    {isCustomMode && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomMode(false);
                          onChangeCategory('Engineering');
                        }}
                        className="text-[10px] text-[#8E9192] hover:text-white flex items-center gap-1 font-mono transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="w-3 h-3" /> Select from list
                      </button>
                    )}
                  </div>

                  {isCustomMode ? (
                    <input
                      type="text"
                      placeholder="Type custom category name (e.g. AI Research)..."
                      className="bg-black border border-white/40 text-xs text-white rounded-lg p-2.5 w-full focus:outline-none focus:border-white focus:ring-0"
                      value={projCategory}
                      onChange={(e) => onChangeCategory(e.target.value)}
                    />
                  ) : (
                    <select
                      className="bg-black border border-[#27272A] text-xs text-[#C4C7C8] rounded-lg p-2.5 w-full focus:outline-none focus:border-white cursor-pointer"
                      value={allPooledCategories.includes(projCategory) ? projCategory : '__custom__'}
                      onChange={handleCategorySelect}
                    >
                      {allPooledCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option disabled value="">───</option>
                      <option value="__custom__">+ Add Custom Category...</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold text-[#8E9192] hover:text-white px-3 py-2 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!projName.trim()}
                  className="bg-white text-black font-bold text-xs px-4 py-2 rounded-lg hover:bg-white/90 disabled:opacity-40 transition-colors"
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
