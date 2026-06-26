import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { Kindness } from '@/types/kindness';

const STORAGE_KEY = 'haoshi_kindness_store';

interface KindnessState {
  // 用户发布的善行列表
  publishedList: Kindness[];

  // 添加一条新发布的善行
  addKindness: (kindness: Kindness) => void;

  // 更新已有善行（如 AI 回复生成后更新 aiResponse）
  updateKindness: (id: string, updates: Partial<Kindness>) => void;

  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useKindnessStore = create<KindnessState>((set, get) => ({
  publishedList: [],

  addKindness: (kindness) => {
    set((state) => {
      // 如果已存在同 ID 的善行，替换而不是重复添加
      const exists = state.publishedList.findIndex(k => k.id === kindness.id);
      if (exists !== -1) {
        const updated = [...state.publishedList];
        updated[exists] = kindness;
        return { publishedList: updated };
      }
      return { publishedList: [kindness, ...state.publishedList] };
    });
    get().saveToStorage();
  },

  updateKindness: (id, updates) => {
    set((state) => ({
      publishedList: state.publishedList.map(k =>
        k.id === id ? { ...k, ...updates } : k
      ),
    }));
    get().saveToStorage();
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          publishedList: parsed.publishedList || [],
        });
      }
    } catch (e) {
      console.error('[KindnessStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        publishedList: state.publishedList,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[KindnessStore] Save to storage failed:', e);
    }
  },
}));
