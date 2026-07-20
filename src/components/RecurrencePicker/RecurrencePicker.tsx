import { Check } from 'lucide-react';
import React, { useState } from 'react';
import { RecurrenceFrequency, RecurrenceRule } from '../../types';

interface RecurrencePickerProps {
  value?: RecurrenceRule;
  onChange: (rule?: RecurrenceRule) => void;
  onClose: () => void;
}

export default function RecurrencePicker({ value, onChange, onClose }: RecurrencePickerProps) {
  const [isCustomRecurrence, setIsCustomRecurrence] = useState(false);

  return (
    <>
      <div className="fixed inset-0 z-[9998] cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-label="Recurrence Picker"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onClose();
          }
        }}
        className="absolute left-0 top-full mt-1.5 w-full bg-surface-primary border border-border-primary rounded-xl p-2.5 z-[9999] shadow-2xl space-y-1.5 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
      >
        {!isCustomRecurrence ? (
          <>
            <button
              onClick={() => {
                onChange(undefined);
                onClose();
              }}
              className={`w-full text-left px-3 py-1.5 rounded text-xs hover:bg-surface-secondary transition-colors flex items-center justify-between ${!value ? 'text-text-primary bg-white/10' : 'text-text-secondary hover:text-text-primary'}`}
            >
              <span>None</span>
              {!value && <Check className="w-3 h-3 text-text-primary" />}
            </button>
            {[
              { label: 'Daily', rule: { frequency: 'daily' as const, interval: 1 } },
              {
                label: 'Weekdays (Mon-Fri)',
                rule: { frequency: 'weekdays' as const },
              },
              {
                label: 'Weekly',
                rule: { frequency: 'weekly' as const, interval: 1 },
              },
              {
                label: 'Monthly',
                rule: { frequency: 'monthly' as const, interval: 1 },
              },
              {
                label: 'Yearly',
                rule: { frequency: 'yearly' as const, interval: 1 },
              },
            ].map((preset) => {
              const isSelected =
                value?.frequency === preset.rule.frequency &&
                (value?.interval || 1) === 1 &&
                !value?.daysOfWeek;
              return (
                <button
                  key={preset.label}
                  onClick={() => {
                    onChange(preset.rule);
                    onClose();
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded text-xs hover:bg-surface-secondary transition-colors flex items-center justify-between ${isSelected ? 'text-text-primary bg-white/10' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  <span>{preset.label}</span>
                  {isSelected && <Check className="w-3 h-3 text-text-primary" />}
                </button>
              );
            })}
            <button
              onClick={() => setIsCustomRecurrence(true)}
              className="w-full text-left px-3 py-1.5 rounded text-xs hover:bg-surface-secondary text-blue-400 hover:text-blue-300 transition-colors border-t border-border-primary mt-1 pt-2 font-semibold cursor-pointer"
            >
              Custom...
            </button>
          </>
        ) : (
          <div className="space-y-2 p-1">
            <div className="text-[10px] font-mono font-bold text-text-muted uppercase">
              Custom Recurrence
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-muted">Every</span>
              <input
                type="number"
                min="1"
                value={value?.interval || 1}
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 1);
                  onChange({
                    ...(value || { frequency: 'daily' }),
                    interval: val,
                  });
                }}
                className="w-12 bg-surface-secondary border border-border-primary text-xs text-text-primary rounded px-2 py-1 text-center focus:outline-none focus:border-white"
              />
              <select
                value={value?.frequency || 'daily'}
                onChange={(e) => {
                  const freq = e.target.value as RecurrenceFrequency;
                  onChange({
                    ...(value || { interval: 1 }),
                    frequency: freq,
                    daysOfWeek: freq === 'weekly' ? [1] : undefined,
                  });
                }}
                className="bg-surface-secondary border border-border-primary text-xs text-text-primary rounded px-2 py-1 focus:outline-none focus:border-white flex-1"
              >
                <option value="daily">days</option>
                <option value="weekly">weeks</option>
                <option value="monthly">months</option>
                <option value="yearly">years</option>
              </select>
            </div>

            {value?.frequency === 'weekly' && (
              <div className="space-y-1 pt-1">
                <div className="text-[10px] text-text-muted">On days:</div>
                <div className="grid grid-cols-7 gap-1">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, dayIdx) => {
                    const days = value?.daysOfWeek || [];
                    const isSelected = days.includes(dayIdx);
                    return (
                      <button
                        key={dayIdx}
                        type="button"
                        onClick={() => {
                          const newDays = isSelected
                            ? days.filter((d) => d !== dayIdx)
                            : [...days, dayIdx];
                          onChange({
                            ...value,
                            frequency: 'weekly',
                            daysOfWeek: newDays.length > 0 ? newDays : [dayIdx],
                          });
                        }}
                        className={`py-1 text-[10px] font-mono font-bold rounded border transition-all text-center cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500 text-white border-blue-400'
                            : 'bg-surface-secondary text-text-muted border-border-primary hover:text-white'
                        }`}
                      >
                        {dayChar}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="bg-interactive-primary text-interactive-primary-text font-bold text-[10px] px-3 py-1 rounded hover:bg-interactive-primary/90 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
