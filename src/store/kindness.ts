import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { Kindness } from '@/types/kindness';
import { DbKindness } from '@/services/db/schema';
import { isSupabaseAvailable } from '@/services/supabase';
import { kindnessApi } from '@/services/db';

const STORAGE_KEY = 'haoshi_kindness_store';

/** 将前端 Kindness 转换为数据库 DbKindness */
const toDbKindness = (k: Kindness): Omit<DbKindness, 'id' | 'created_at' | 'likes' | 'comments'> => ({
  user_id: k.userId,
  user_name: k.userName,
  user_avatar: k.userAvatar,
  content: k.content,
  type: k.type,
  tags: k.tags,
  images: k.images,
  video: k.video,
  location: k.location,
  visible_scope: k.visibleScope,
  circle_id: k.circleId,
  ai_response: k.aiResponse as any,
  credibility_score: k.credibilityScore,
  blessing_value: k.blessingValue,
  is_anonymous: k.isAnonymous || false,
});

/** 将数据库 DbKindness 转换为前端 Kindness */
const fromDbKindness = (d: DbKindness): Kindness => ({
  id: d.id,
  userId: d.user_id,
  userName: d.user_name,
  userAvatar: d.user_avatar,
  content: d.content,
  type: d.type,
  tags: d.tags,
  images: d.images,
  video: d.video,
  location: d.location,
  visibleScope: d.visible_scope,
  circleId: d.circle_id,
  aiResponse: d.ai_response as any,
  credibilityScore: d.credibility_score,
  blessingValue: d.blessing_value,
  likes: d.likes,
  comments: d.comments,
  createdAt: d.created_at,
  isAnonymous: d.is_anonymous,
});

interface KindnessState {
  // 用户发布的善行列表
  publishedList: Kindness[];

  // 添加一条新发布的善行
  addKindness: (kindness: Kindness) => void;

  // 更新已有善行（如 AI 回复生成后更新 aiResponse）
  updateKindness: (id: string, updates: Partial<Kindness>) => void;

  // 持久化
  loadFromStorage: () => Promise<void>;
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
    // 同步到后端
    if (isSupabaseAvailable()) {
      kindnessApi.createKindness(toDbKindness(kindness)).catch((e) => {
        console.warn('[KindnessStore] Failed to sync kindness to backend:', e);
      });
    }
  },

  updateKindness: (id, updates) => {
    set((state) => ({
      publishedList: state.publishedList.map(k =>
        k.id === id ? { ...k, ...updates } : k
      ),
    }));
    get().saveToStorage();
    // 同步到后端
    if (isSupabaseAvailable()) {
      kindnessApi.updateKindness(id, updates).catch((e) => {
        console.warn('[KindnessStore] Failed to sync kindness update to backend:', e);
      });
    }
  },

  loadFromStorage: async () => {
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
    // 如果Supabase可用，从后端同步最新数据
    if (isSupabaseAvailable()) {
      try {
        const remoteResult = await kindnessApi.getKindnessList();
        if (remoteResult && remoteResult.data.length > 0) {
          set({ publishedList: remoteResult.data.map(fromDbKindness) });
          get().saveToStorage();
        }
      } catch (e) {
        console.warn('[KindnessStore] Failed to sync kindness list from backend:', e);
      }
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
