import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Project } from '../types';

interface SettingsViewProps {
  onExportData: () => void;
  onImportDataTrigger: () => void;
}

export default function SettingsView({ onExportData, onImportDataTrigger }: SettingsViewProps) {
  const { settings, toggleSetting, updateSetting } = useSettings();

  return (
    <div className="max-w-2xl mx-auto py-8 px-6">
      <div className="bg-[#0A0A0A] border border-[#27272A] rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">System Preferences</h2>
          <p className="text-xs text-[#8E9192] mt-1">Onyx default hardware battery saving metrics.</p>
        </div>

        <div className="space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[#141313] border border-[#27272A] rounded-lg">
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wide font-mono">Light Theme</h4>
              <p className="text-[10px] text-[#8E9192] mt-0.5">Switch to a bright, high-contrast interface.</p>
            </div>
            <button
              onClick={() => updateSetting('theme', settings.theme === 'dark' ? 'light' : 'dark')}
              className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors duration-200 ${
                settings.theme === 'light' ? 'bg-white' : 'bg-[#27272A]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full transition-all duration-200 ${
                settings.theme === 'light' ? 'bg-black ml-auto' : 'bg-[#8E9192] ml-0'
              }`} />
            </button>
          </div>

          {/* OLED Black Mode Toggle */}
          <div className={`flex items-center justify-between p-3.5 bg-[#141313] border border-[#27272A] rounded-lg transition-opacity ${settings.theme === 'light' ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wide font-mono">OLED Black Mode</h4>
              <p className="text-[10px] text-[#8E9192] mt-0.5">Force completely black pixel rendering.</p>
            </div>
            <button
              onClick={() => toggleSetting('oledBlackMode')}
              disabled={settings.theme === 'light'}
              className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors duration-200 ${
                settings.oledBlackMode ? 'bg-white' : 'bg-[#27272A]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full transition-all duration-200 ${
                settings.oledBlackMode ? 'bg-black ml-auto' : 'bg-[#8E9192] ml-0'
              }`} />
            </button>
          </div>

          {/* Sound Alerts Toggle */}
          <div className="flex items-center justify-between p-3.5 bg-[#141313] border border-[#27272A]/80 rounded-lg">
            <div>
              <h4 className="text-xs font-bold text-[#C4C7C8] uppercase tracking-wide font-mono">Sound Alerts</h4>
              <p className="text-[10px] text-[#8E9192] mt-0.5">Strategic alarm alerts upon sprint completions.</p>
            </div>
            <button
              onClick={() => toggleSetting('soundAlerts')}
              className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors duration-200 ${
                settings.soundAlerts ? 'bg-white' : 'bg-[#27272A]'
              }`}
            >
              <div className={`w-4 h-4 rounded-full transition-all duration-200 ${
                settings.soundAlerts ? 'bg-black ml-auto' : 'bg-[#8E9192] ml-0'
              }`} />
            </button>
          </div>

          {/* Pomodoro Timer Configuration */}
          <div className="p-4 bg-[#141313] border border-[#27272A]/80 rounded-lg space-y-3">
            <div>
              <h4 className="text-xs font-bold text-[#C4C7C8] uppercase tracking-wide font-mono">Pomodoro Timer Settings</h4>
              <p className="text-[10px] text-[#8E9192] mt-0.5">Customize sprint durations, rest periods, and break intervals.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-[#0A0A0A] border border-[#27272A] p-2.5 rounded-lg">
                <label className="text-[10px] text-[#8E9192] uppercase font-mono block mb-1">Work Duration</label>
                <select
                  className="w-full bg-black border border-[#27272A] text-xs font-bold text-white rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono cursor-pointer"
                  value={settings.pomodoroWorkDuration || 25}
                  onChange={(e) => updateSetting('pomodoroWorkDuration', Number(e.target.value))}
                >
                  {[15, 20, 25, 30, 45, 60].map((mins) => (
                    <option key={mins} value={mins}>{mins} mins</option>
                  ))}
                </select>
              </div>
              <div className="bg-[#0A0A0A] border border-[#27272A] p-2.5 rounded-lg">
                <label className="text-[10px] text-[#8E9192] uppercase font-mono block mb-1">Short Break</label>
                <select
                  className="w-full bg-black border border-[#27272A] text-xs font-bold text-white rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono cursor-pointer"
                  value={settings.pomodoroShortBreak || 5}
                  onChange={(e) => updateSetting('pomodoroShortBreak', Number(e.target.value))}
                >
                  {[3, 5, 10, 15].map((mins) => (
                    <option key={mins} value={mins}>{mins} mins</option>
                  ))}
                </select>
              </div>
              <div className="bg-[#0A0A0A] border border-[#27272A] p-2.5 rounded-lg">
                <label className="text-[10px] text-[#8E9192] uppercase font-mono block mb-1">Long Break</label>
                <select
                  className="w-full bg-black border border-[#27272A] text-xs font-bold text-white rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono cursor-pointer"
                  value={settings.pomodoroLongBreak || 15}
                  onChange={(e) => updateSetting('pomodoroLongBreak', Number(e.target.value))}
                >
                  {[10, 15, 20, 30].map((mins) => (
                    <option key={mins} value={mins}>{mins} mins</option>
                  ))}
                </select>
              </div>
              <div className="bg-[#0A0A0A] border border-[#27272A] p-2.5 rounded-lg">
                <label className="text-[10px] text-[#8E9192] uppercase font-mono block mb-1">Long Break Interval</label>
                <select
                  className="w-full bg-black border border-[#27272A] text-xs font-bold text-white rounded px-2 py-1.5 focus:outline-none focus:border-white font-mono cursor-pointer"
                  value={settings.pomodoroLongBreakInterval || 4}
                  onChange={(e) => updateSetting('pomodoroLongBreakInterval', Number(e.target.value))}
                >
                  {[2, 3, 4, 5, 6].map((cnt) => (
                    <option key={cnt} value={cnt}>{cnt} sessions</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Backup Frequency */}
          <div className="flex items-center justify-between p-3.5 bg-[#141313] border border-[#27272A]/80 rounded-lg">
            <div>
              <h4 className="text-xs font-bold text-[#C4C7C8] uppercase tracking-wide font-mono">Local Background Backups</h4>
              <p className="text-[10px] text-[#8E9192] mt-0.5">Automated safety net directly to OS AppData.</p>
            </div>
            <select
              className="bg-black border border-[#27272A] text-[10px] uppercase font-bold text-[#C4C7C8] rounded px-3 py-1.5 focus:outline-none focus:border-white cursor-pointer tracking-wider font-mono"
              value={settings.backupFrequency}
              onChange={(e) => updateSetting('backupFrequency', e.target.value as any)}
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Never">Never</option>
            </select>
          </div>

          {/* Data Export / Import */}
          <div className="flex items-center justify-between p-3.5 bg-[#141313] border border-[#27272A]/80 rounded-lg">
            <div>
              <h4 className="text-xs font-bold text-[#C4C7C8] uppercase tracking-wide font-mono">Workspace Data</h4>
              <p className="text-[10px] text-[#8E9192] mt-0.5">Securely backup or restore local databases.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onExportData}
                className="bg-black border border-[#27272A] hover:bg-[#1C1B1B] hover:text-white transition-colors text-[10px] uppercase font-bold text-[#8E9192] rounded px-3 py-1.5 cursor-pointer tracking-wider font-mono"
              >
                Export
              </button>
              <button
                onClick={onImportDataTrigger}
                className="bg-black border border-[#27272A] hover:bg-[#1C1B1B] hover:text-white transition-colors text-[10px] uppercase font-bold text-[#8E9192] rounded px-3 py-1.5 cursor-pointer tracking-wider font-mono"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
