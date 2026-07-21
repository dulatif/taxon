interface NotificationSettingsProps {
  soundAlerts: boolean;
  toggleSetting: (key: 'soundAlerts') => void;
}

export default function NotificationSettings({
  soundAlerts,
  toggleSetting,
}: NotificationSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
          Notifications
        </h2>
        <p className="text-xs text-text-muted mt-1">Manage system alerts and sounds.</p>
      </div>

      <div className="flex items-center justify-between p-3.5 bg-surface-secondary border border-border-primary/80 rounded-lg">
        <div>
          <h4 className="text-xs font-bold text-[#C4C7C8] uppercase tracking-wide font-mono">
            Sound Alerts
          </h4>
          <p className="text-[10px] text-text-muted mt-0.5">
            Strategic alarm alerts upon sprint completions.
          </p>
        </div>
        <button
          onClick={() => toggleSetting('soundAlerts')}
          className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors duration-200 ${
            soundAlerts
              ? 'bg-interactive-primary'
              : 'bg-surface-primary border border-border-primary'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              soundAlerts ? 'bg-interactive-primary-text ml-auto' : 'bg-text-muted ml-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
