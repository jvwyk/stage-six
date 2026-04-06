import { create } from 'zustand';
import type { Settings } from '../data/types';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from '../utils/storage';

interface SettingsStore {
  settings: Settings;
  toggleSound: () => void;
  toggleAnimations: () => void;
  loadFromStorage: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,

  toggleSound: () => {
    const settings = { ...get().settings, soundEnabled: !get().settings.soundEnabled };
    saveSettings(settings);
    set({ settings });
  },

  toggleAnimations: () => {
    const settings = { ...get().settings, animationsEnabled: !get().settings.animationsEnabled };
    saveSettings(settings);
    set({ settings });
  },

  loadFromStorage: () => {
    set({ settings: loadSettings() });
  },
}));
