import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import AppearanceSettings from '../sections/Settings/AppearanceSettings';
import GeneralSettings from '../sections/Settings/GeneralSettings';
import NotificationSettings from '../sections/Settings/NotificationSettings';
import type { SettingsTab } from '../sections/Settings/SettingsSidebar';
import SettingsSidebar from '../sections/Settings/SettingsSidebar';

interface SettingsViewProps {
  onExportData: () => void;
  onImportDataTrigger: () => void;
}

export default function SettingsView({ onExportData, onImportDataTrigger }: SettingsViewProps) {
  const { settings, toggleSetting, updateSetting } = useSettings();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="bg-surface-primary border border-border-primary rounded-xl p-6 flex min-h-[400px]">
        <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 pl-6">
          {activeTab === 'general' && (
            <GeneralSettings
              pomodoroWorkDuration={settings.pomodoroWorkDuration}
              pomodoroShortBreak={settings.pomodoroShortBreak}
              pomodoroLongBreak={settings.pomodoroLongBreak}
              pomodoroLongBreakInterval={settings.pomodoroLongBreakInterval}
              pomodoroAutoStartBreaks={settings.pomodoroAutoStartBreaks}
              pomodoroAutoStartPomodoros={settings.pomodoroAutoStartPomodoros}
              backupFrequency={settings.backupFrequency}
              updateSetting={updateSetting}
              toggleSetting={toggleSetting}
              onExportData={onExportData}
              onImportDataTrigger={onImportDataTrigger}
            />
          )}

          {activeTab === 'appearance' && (
            <AppearanceSettings
              theme={settings.theme}
              oledBlackMode={settings.oledBlackMode}
              updateSetting={
                updateSetting as (key: string, value: string | boolean | number) => void
              }
              toggleSetting={toggleSetting}
            />
          )}

          {activeTab === 'notifications' && (
            <NotificationSettings
              soundAlerts={settings.soundAlerts}
              toggleSetting={toggleSetting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
