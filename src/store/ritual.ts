import { create } from 'zustand';
import Taro from '@tarojs/taro';

const STORAGE_KEY = 'haoshi_ritual_settings';

export interface RitualState {
  enabled: boolean;       // 仪式开关：发布善行时是否播放仪式动画
  soundEnabled: boolean;  // 音效开关
  hapticEnabled: boolean; // 触觉反馈开关

  toggleRitual: () => void;
  toggleSound: () => void;
  toggleHaptic: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useRitualStore = create<RitualState>((set, get) => ({
  enabled: true,        // 默认开启仪式
  soundEnabled: true,   // 默认开启音效
  hapticEnabled: true,  // 默认开启触觉反馈

  toggleRitual: () => {
    set((state) => ({ enabled: !state.enabled }));
    get().saveToStorage();
  },

  toggleSound: () => {
    set((state) => ({ soundEnabled: !state.soundEnabled }));
    get().saveToStorage();
  },

  toggleHaptic: () => {
    set((state) => ({ hapticEnabled: !state.hapticEnabled }));
    get().saveToStorage();
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          enabled: parsed.enabled ?? true,
          soundEnabled: parsed.soundEnabled ?? true,
          hapticEnabled: parsed.hapticEnabled ?? true,
        });
      }
    } catch (e) {
      console.error('[RitualStore] Load failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({
        enabled: state.enabled,
        soundEnabled: state.soundEnabled,
        hapticEnabled: state.hapticEnabled,
      }));
    } catch (e) {
      console.error('[RitualStore] Save failed:', e);
    }
  },
}));
