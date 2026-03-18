import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface UserSettings {
  softDeadlineOffset: number;
  enableNotifications: boolean;
  theme: 'dark';
  geminiApiKey: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  softDeadlineOffset: 3,
  enableNotifications: false,
  theme: 'dark',
  geminiApiKey: '',
};

export const useSettingsStore = () => {
  const [settings, setSettings] = useLocalStorage<UserSettings>('justlife_settings', DEFAULT_SETTINGS);

  const updateSettings = useCallback((partial: Partial<UserSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, [setSettings]);

  return {
    settings,
    updateSettings
  };
};
