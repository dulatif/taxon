import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import AppearanceSettings from '../sections/Settings/AppearanceSettings';
import GeneralSettings from '../sections/Settings/GeneralSettings';
import NotificationSettings from '../sections/Settings/NotificationSettings';
import SettingsSidebar, { SettingsTab } from '../sections/Settings/SettingsSidebar';

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
              backupFrequency={settings.backupFrequency}
              updateSetting={updateSetting}
              onExportData={onExportData}
              onImportDataTrigger={onImportDataTrigger}
            />
          )}

          {activeTab === 'appearance' && (
            <AppearanceSettings
              theme={settings.theme}
              oledBlackMode={settings.oledBlackMode}
              updateSetting={updateSetting}
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
