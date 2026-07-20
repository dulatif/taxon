import React from 'react';

interface GeneralSettingsProps {
  pomodoroWorkDuration: number;
  pomodoroShortBreak: number;
  pomodoroLongBreak: number;
  pomodoroLongBreakInterval: number;
  backupFrequency: string;
  updateSetting: (key: any, value: any) => void;
  onExportData: () => void;
  onImportDataTrigger: () => void;
}

export default function GeneralSettings({
  pomodoroWorkDuration,
  pomodoroShortBreak,
  pomodoroLongBreak,
  pomodoroLongBreakInterval,
  backupFrequency,
  updateSetting,
  onExportData,
  onImportDataTrigger,
}: GeneralSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
          General Preferences
        </h2>
        <p className="text-xs text-text-muted mt-1">Configure your main workspace behaviors.</p>
      </div>

      {/* Pomodoro Timer Configuration */}
      <div className="p-4 bg-surface-secondary border border-border-primary/80 rounded-lg space-y-3">
        <div>
          <h4 className="text-xs font-bold text-[#C4C7C8] uppercase tracking-wide font-mono">
            Pomodoro Timer Settings
          </h4>
          <p className="text-[10px] text-text-muted mt-0.5">
            Customize sprint durations, rest periods, and break intervals.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-surface-primary border border-border-primary p-2.5 rounded-lg">
            <label className="text-[10px] text-text-muted uppercase font-mono block mb-1">
              Work Duration
            </label>
            <select
              className="w-full bg-surface-secondary border border-border-primary text-xs font-bold text-text-primary rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono cursor-pointer"
              value={pomodoroWorkDuration || 25}
              onChange={(e) => updateSetting('pomodoroWorkDuration', Number(e.target.value))}
            >
              {[15, 20, 25, 30, 45, 60].map((mins) => (
                <option key={mins} value={mins}>
                  {mins} mins
                </option>
              ))}
            </select>
          </div>
          <div className="bg-surface-primary border border-border-primary p-2.5 rounded-lg">
            <label className="text-[10px] text-text-muted uppercase font-mono block mb-1">
              Short Break
            </label>
            <select
              className="w-full bg-surface-secondary border border-border-primary text-xs font-bold text-text-primary rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono cursor-pointer"
              value={pomodoroShortBreak || 5}
              onChange={(e) => updateSetting('pomodoroShortBreak', Number(e.target.value))}
            >
              {[3, 5, 10, 15].map((mins) => (
                <option key={mins} value={mins}>
                  {mins} mins
                </option>
              ))}
            </select>
          </div>
          <div className="bg-surface-primary border border-border-primary p-2.5 rounded-lg">
            <label className="text-[10px] text-text-muted uppercase font-mono block mb-1">
              Long Break
            </label>
            <select
              className="w-full bg-surface-secondary border border-border-primary text-xs font-bold text-text-primary rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono cursor-pointer"
              value={pomodoroLongBreak || 15}
              onChange={(e) => updateSetting('pomodoroLongBreak', Number(e.target.value))}
            >
              {[10, 15, 20, 30].map((mins) => (
                <option key={mins} value={mins}>
                  {mins} mins
                </option>
              ))}
            </select>
          </div>
          <div className="bg-surface-primary border border-border-primary p-2.5 rounded-lg">
            <label className="text-[10px] text-text-muted uppercase font-mono block mb-1">
              Long Break Interval
            </label>
            <select
              className="w-full bg-surface-secondary border border-border-primary text-xs font-bold text-text-primary rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono cursor-pointer"
              value={pomodoroLongBreakInterval || 4}
              onChange={(e) => updateSetting('pomodoroLongBreakInterval', Number(e.target.value))}
            >
              {[2, 3, 4, 5, 6].map((cnt) => (
                <option key={cnt} value={cnt}>
                  {cnt} sessions
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Backup Frequency */}
      <div className="flex items-center justify-between p-3.5 bg-surface-secondary border border-border-primary/80 rounded-lg">
        <div>
          <h4 className="text-xs font-bold text-[#C4C7C8] uppercase tracking-wide font-mono">
            Local Background Backups
          </h4>
          <p className="text-[10px] text-text-muted mt-0.5">
            Automated safety net directly to OS AppData.
          </p>
        </div>
        <select
          className="bg-surface-primary border border-border-primary text-[10px] uppercase font-bold text-[#C4C7C8] rounded px-3 py-1.5 focus:outline-none focus:border-white cursor-pointer tracking-wider font-mono"
          value={backupFrequency}
          onChange={(e) => updateSetting('backupFrequency', e.target.value)}
        >
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Never">Never</option>
        </select>
      </div>

      {/* Data Export / Import */}
      <div className="flex items-center justify-between p-3.5 bg-surface-secondary border border-border-primary/80 rounded-lg">
        <div>
          <h4 className="text-xs font-bold text-[#C4C7C8] uppercase tracking-wide font-mono">
            Workspace Data
          </h4>
          <p className="text-[10px] text-text-muted mt-0.5">
            Securely backup or restore local databases.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportData}
            className="bg-surface-primary border border-border-primary hover:bg-surface-hover hover:text-white transition-colors text-[10px] uppercase font-bold text-text-muted rounded px-3 py-1.5 cursor-pointer tracking-wider font-mono"
          >
            Export
          </button>
          <button
            onClick={onImportDataTrigger}
            className="bg-surface-primary border border-border-primary hover:bg-surface-hover hover:text-white transition-colors text-[10px] uppercase font-bold text-text-muted rounded px-3 py-1.5 cursor-pointer tracking-wider font-mono"
          >
            Import
          </button>
        </div>
      </div>
    </div>
  );
}
