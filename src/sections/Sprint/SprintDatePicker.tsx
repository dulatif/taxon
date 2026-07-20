import { addMonths, format } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useState } from 'react';
import { DayPicker } from 'react-day-picker';

interface SprintDatePickerProps {
  label: string;
  value: string;
  onChange: (dateStr: string) => void;
}

export default function SprintDatePicker({ label, value, onChange }: SprintDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState<Date>(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  const formatDateStr = (d: Date): string => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDisplayDate = (dateStr: string): string => {
    if (!dateStr) return 'Select date';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return format(d, 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className={`relative ${isOpen ? 'z-[9999]' : 'z-10'}`}>
      <label className="block text-[11px] font-mono text-text-muted mb-1">{label}</label>
      <button
        type="button"
        onClick={() => {
          if (!isOpen && value) {
            const d = new Date(value + 'T00:00:00');
            if (!isNaN(d.getTime())) setPickerMonth(d);
          }
          setIsOpen(!isOpen);
        }}
        className="w-full bg-surface-primary border border-border-primary hover:border-white/30 rounded px-2.5 py-1.5 text-xs text-text-primary flex items-center justify-between transition-colors cursor-pointer focus:outline-none focus:border-interactive-primary"
      >
        <span className="flex items-center gap-1.5 truncate">
          <Calendar className="w-3.5 h-3.5 text-interactive-primary shrink-0" />
          <span>{formatDisplayDate(value)}</span>
        </span>
        <span className="text-[10px] font-mono text-text-muted shrink-0 ml-1">{value}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998] cursor-default" onClick={() => setIsOpen(false)} />
          <div
            role="dialog"
            aria-label={label}
            onClick={(e) => e.stopPropagation()}
            className="absolute left-0 top-full mt-1.5 w-[310px] bg-surface-primary border border-border-primary rounded-xl p-3 z-[9999] shadow-2xl font-sans animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between mb-2 px-1 border-b border-border-primary pb-2">
              <span className="text-xs font-bold text-text-primary tracking-wide">
                {format(pickerMonth, 'MMMM yyyy')}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPickerMonth((prev) => addMonths(prev, -1))}
                  className="w-6 h-6 rounded-md border border-border-primary bg-surface-secondary hover:bg-surface-hover hover:border-white text-text-muted hover:text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-interactive-primary"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setPickerMonth((prev) => addMonths(prev, 1))}
                  className="w-6 h-6 rounded-md border border-border-primary bg-surface-secondary hover:bg-surface-hover hover:border-white text-text-muted hover:text-white flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-interactive-primary"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <DayPicker
              mode="single"
              required
              selected={value ? new Date(value + 'T00:00:00') : undefined}
              onSelect={(date) => {
                if (date) {
                  onChange(formatDateStr(date));
                }
                setIsOpen(false);
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

            <div className="flex justify-end border-t border-border-primary pt-2 mt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-mono text-text-muted hover:text-white px-2 py-0.5 rounded hover:bg-white/5 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
