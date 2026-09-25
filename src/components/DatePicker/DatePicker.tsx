import { addMonths, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { formatDateStr, getPresetDates } from '../../utils/format-date';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  onClose: () => void;
  title?: string;
  unscheduledValue?: string;
  positionClass?: string;
}

export default function DatePicker({
  value,
  onChange,
  onClose,
  title = 'Quick Schedule',
  unscheduledValue = '',
  positionClass = 'left-0 top-full',
}: DatePickerProps) {
  const [pickerMonth, setPickerMonth] = useState<Date>(
    value && value !== 'unscheduled' ? new Date(value + 'T00:00:00') : new Date(),
  );

  const presets = [
    { label: 'Unscheduled', date: unscheduledValue, sub: 'No date assigned' },
    ...getPresetDates(),
  ];

  return (
    <>
      <div className="fixed inset-0 z-[9998] cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Select Due Date"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
        className={`absolute mt-1.5 w-[340px] min-w-[340px] bg-surface-primary border border-border-primary rounded-xl p-3.5 z-[9999] shadow-2xl space-y-3 font-sans max-h-[80vh] overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-150 ${positionClass}`}
      >
        {/* Quick Presets */}
        <div className="space-y-1">
          <div className="text-[10px] text-text-muted uppercase font-mono font-bold tracking-wider mb-1.5">
            {title}
          </div>
          {presets.map((preset) => {
            const isSelected =
              value === preset.date || (value === undefined && preset.date === 'unscheduled');
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onChange(preset.date);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                  isSelected
                    ? 'bg-blue-500/20 text-blue-400 font-semibold border border-blue-500/30'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                }`}
              >
                <span className="font-medium">{preset.label}</span>
                <span className="text-[10px] font-mono text-text-muted">{preset.sub}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Calendar DatePicker */}
        <div className="pt-2 border-t border-border-primary">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-bold text-text-primary tracking-wide">
              {format(pickerMonth, 'MMMM yyyy')}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPickerMonth((prev) => addMonths(prev, -1))}
                className="w-6 h-6 rounded-md border border-border-primary bg-surface-secondary hover:bg-surface-hover hover:border-white text-text-muted hover:text-text-primary flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                title="Previous Month"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPickerMonth((prev) => addMonths(prev, 1))}
                className="w-6 h-6 rounded-md border border-border-primary bg-surface-secondary hover:bg-surface-hover hover:border-white text-text-muted hover:text-text-primary flex items-center justify-center transition-all cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                title="Next Month"
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
              onClose();
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
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-border-primary flex items-center justify-between gap-2">
          {value ? (
            <button
              type="button"
              onClick={() => {
                onChange('');
                onClose();
              }}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded text-[11px] font-medium transition-colors flex items-center gap-1 focus:outline-none focus:ring-1 focus:ring-red-400 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Date</span>
            </button>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            className="bg-interactive-primary hover:bg-interactive-primary/90 text-interactive-primary-text font-bold text-[11px] px-3 py-1 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white ml-auto cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
