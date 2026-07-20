export interface SettingsState {
  theme: 'dark' | 'light' | 'system';
  oledBlackMode: boolean;
  soundAlerts: boolean;
  backupFrequency: 'Daily' | 'Weekly' | 'Never';
  pomodoroWorkDuration: number;
  pomodoroShortBreak: number;
  pomodoroLongBreak: number;
  pomodoroLongBreakInterval: number;
}
