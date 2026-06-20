import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SettingsState } from '../types';
import { DEFAULT_SETTINGS } from '../data';

const STORAGE_KEY = 'axon_tasking_settings';

interface SettingsContextValue {
  settings: SettingsState;
  updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  toggleSetting: (key: keyof SettingsState) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Persist settings to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // TAXON-120: Apply/remove OLED Black Mode CSS class on <body>
  useEffect(() => {
    if (settings.oledBlackMode) {
      document.body.classList.add('oled-black');
    } else {
      document.body.classList.remove('oled-black');
    }
  }, [settings.oledBlackMode]);

  const updateSetting = useCallback(<K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleSetting = useCallback((key: keyof SettingsState) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, toggleSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
