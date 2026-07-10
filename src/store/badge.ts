import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { BADGE_DEFINITIONS, BadgeDefinition, getBadgeById } from '@/data/badges';

const STORAGE_KEY = 'haoshi_badge_store';

export interface UnlockedBadge {
  badgeId: string;
  unlockedAt: string;
}

export interface BadgeProgress {
  badgeId: string;
  current: number;
  target: number;
}

interface BadgeState {
  /** 已解锁徽章列表 */
  unlocked: UnlockedBadge[];
  /** 徽章进度 */
  progress: Record<string, number>;

  // Actions
  loadFromStorage: () => void;
  saveToStorage: () => void;

  /** 检查并解锁所有符合条件的徽章，返回新解锁的徽章列表 */
  checkAndUnlock: (context: BadgeContext) => BadgeDefinition[];
  /** 更新指定徽章的进度 */
  updateProgress: (badgeId: string, value: number) => void;
  /** 获取徽章状态 */
  getBadgeState: (badgeId: string) => 'locked' | 'in_progress' | 'unlocked';
  /** 获取分类已解锁数量 */
  getCategoryUnlockedCount: (category: string) => number;
  /** 总徽章数 */
  totalCount: number;
}

export interface BadgeContext {
  /** 善行总数 */
  totalKindness: number;
  /** 连续天数 */
  streakDays: number;
  /** 福气值 */
  fortune: number;
  /** 加入的圈子数 */
  circleCount: number;
  /** 获得的评论数 */
  commentCount: number;
  /** 获得的点赞数 */
  likeCount: number;
  /** 是否发布过带位置的善行 */
  hasLocationKindness: boolean;
  /** 是否发布过匿名善行 */
  hasAnonymousKindness: boolean;
  /** 是否在深夜发布过 */
  hasNightKindness: boolean;
  /** 完成的本周灵感数 */
  completedInspirations: number;
}

export const useBadgeStore = create<BadgeState>((set, get) => ({
  unlocked: [],
  progress: {},
  totalCount: BADGE_DEFINITIONS.length,

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          unlocked: parsed.unlocked || [],
          progress: parsed.progress || {},
        });
      }
    } catch (e) {
      console.error('[BadgeStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        unlocked: state.unlocked,
        progress: state.progress,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[BadgeStore] Save to storage failed:', e);
    }
  },

  checkAndUnlock: (context: BadgeContext) => {
    const { unlocked, progress } = get();
    const unlockedIds = new Set(unlocked.map(u => u.badgeId));
    const newUnlocked: BadgeDefinition[] = [];
    const newProgress: Record<string, number> = { ...progress };

    // 根据context计算每个徽章的当前进度
    for (const badge of BADGE_DEFINITIONS) {
      if (unlockedIds.has(badge.id)) continue;

      let current = 0;

      switch (badge.id) {
        case 'first_kindness':
          current = context.totalKindness;
          break;
        case 'kindness_10':
          current = context.totalKindness;
          break;
        case 'kindness_50':
          current = context.totalKindness;
          break;
        case 'kindness_100':
          current = context.totalKindness;
          break;
        case 'streak_3':
          current = context.streakDays;
          break;
        case 'streak_7':
          current = context.streakDays;
          break;
        case 'streak_21':
          current = context.streakDays;
          break;
        case 'join_circle':
          current = context.circleCount;
          break;
        case 'comment_5':
          current = context.commentCount;
          break;
        case 'likes_10':
          current = context.likeCount;
          break;
        case 'inspiration_all':
          current = context.completedInspirations;
          break;
        case 'fortune_500':
          current = context.fortune;
          break;
        case 'night_kindness':
          current = context.hasNightKindness ? 1 : 0;
          break;
        case 'anonymous_kindness':
          current = context.hasAnonymousKindness ? 1 : 0;
          break;
        case 'kindness_location':
          current = context.hasLocationKindness ? 1 : 0;
          break;
      }

      newProgress[badge.id] = current;

      if (current >= badge.target) {
        const unlockedBadge: UnlockedBadge = {
          badgeId: badge.id,
          unlockedAt: new Date().toISOString(),
        };
        newUnlocked.push(badge);
      }
    }

    if (newUnlocked.length > 0) {
      set({
        unlocked: [...unlocked, ...newUnlocked.map(b => ({
          badgeId: b.id,
          unlockedAt: new Date().toISOString(),
        }))],
        progress: newProgress,
      });
      get().saveToStorage();
    } else {
      set({ progress: newProgress });
      get().saveToStorage();
    }

    return newUnlocked;
  },

  updateProgress: (badgeId: string, value: number) => {
    set(state => ({
      progress: { ...state.progress, [badgeId]: value },
    }));
    get().saveToStorage();
  },

  getBadgeState: (badgeId: string) => {
    const { unlocked, progress } = get();
    if (unlocked.some(u => u.badgeId === badgeId)) return 'unlocked';
    const def = getBadgeById(badgeId);
    if (!def) return 'locked';
    const cur = progress[badgeId] || 0;
    if (cur > 0) return 'in_progress';
    return 'locked';
  },

  getCategoryUnlockedCount: (category: string) => {
    const { unlocked } = get();
    return unlocked.filter(u => {
      const def = getBadgeById(u.badgeId);
      return def?.category === category;
    }).length;
  },
}));
