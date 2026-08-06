interface AppearanceSettingsProps {
  theme: string;
  oledBlackMode: boolean;
  updateSetting: (key: string, value: string | boolean | number) => void;
  toggleSetting: (key: 'oledBlackMode') => void;
}

export default function AppearanceSettings({
  theme,
  oledBlackMode,
  updateSetting,
  toggleSetting,
}: AppearanceSettingsProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider font-mono">
          Appearance
        </h2>
        <p className="text-xs text-text-muted mt-1">Customize the look and feel.</p>
      </div>

      <div className="flex items-center justify-between p-3.5 bg-surface-secondary border border-border-primary rounded-lg">
        <div>
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide font-mono">
            Theme
          </h4>
          <p className="text-[10px] text-text-muted mt-0.5">
            Choose light, dark, or system default.
          </p>
        </div>
        <div className="bg-surface-primary border border-border-primary rounded-lg">
          <select
            value={theme}
            onChange={(e) => updateSetting('theme', e.target.value)}
            className="bg-transparent border-none text-xs font-bold text-text-primary rounded px-3 py-1.5 focus:outline-none font-mono cursor-pointer"
          >
            <option value="dark">Dark Mode</option>
            <option value="light">Light Mode</option>
            <option value="system">System Default</option>
          </select>
        </div>
      </div>

      <div
        className={`flex items-center justify-between p-3.5 bg-surface-secondary border border-border-primary rounded-lg transition-opacity ${
          theme === 'light' ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <div>
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wide font-mono">
            OLED Black Mode
          </h4>
          <p className="text-[10px] text-text-muted mt-0.5">
            Force completely black pixel rendering.
          </p>
        </div>
        <button
          onClick={() => toggleSetting('oledBlackMode')}
          disabled={theme === 'light'}
          className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors duration-200 ${
            oledBlackMode
              ? 'bg-interactive-primary'
              : 'bg-surface-primary border border-border-primary'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              oledBlackMode ? 'bg-interactive-primary-text translate-x-5' : 'bg-text-muted translate-x-0'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
