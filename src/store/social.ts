import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { useNotificationStore } from './notification';

const STORAGE_KEY = 'haoshi_social_store';

// 关注关系
export interface FollowRelation {
  // 关注者ID
  followerId: string;
  // 被关注者ID
  followingId: string;
  // 关注时间
  createdAt: string;
}

// 关注通知设置（每个被关注用户可单独设置是否通知）
export interface FollowNotifySetting {
  userId: string;
  // 被关注者发布新善行时是否站内通知
  notifyOnNewKindness: boolean;
}

interface SocialState {
  // 当前用户ID（默认模拟用户）
  currentUserId: string;
  // 关注列表（我关注的人）
  followingIds: string[];
  // 粉丝列表（关注我的人）
  followerIds: string[];
  // 关注关系记录
  relations: FollowRelation[];
  // 每个被关注用户的通知开关
  notifySettings: FollowNotifySetting[];

  // 关注用户
  follow: (userId: string) => void;
  // 取消关注
  unfollow: (userId: string) => void;
  // 判断是否已关注
  isFollowing: (userId: string) => boolean;
  // 判断是否被关注（粉丝关系）
  isFollowedBy: (userId: string) => boolean;
  // 判断是否互相关注
  isMutualFollowing: (userId: string) => boolean;
  // 获取关注列表
  getFollowingList: () => string[];
  // 获取粉丝列表
  getFollowerList: () => string[];
  // 更新某个用户的通知开关
  updateNotifySetting: (userId: string, notifyOnNewKindness: boolean) => void;
  // 获取某个用户的通知开关
  getNotifySetting: (userId: string) => boolean;
  // 通知被关注者发布了新善行（触发站内通知）
  notifyFollowersNewKindness: (authorId: string, authorName: string, kindnessId: string, content: string) => void;
  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useSocialStore = create<SocialState>((set, get) => ({
  currentUserId: 'currentUser',
  followingIds: ['user1', 'user4'],
  followerIds: ['user2', 'user5'],
  relations: [
    { followerId: 'currentUser', followingId: 'user1', createdAt: '2024-06-20T10:00:00Z' },
    { followerId: 'currentUser', followingId: 'user4', createdAt: '2024-06-21T14:00:00Z' },
    { followerId: 'user2', followingId: 'currentUser', createdAt: '2024-06-19T08:00:00Z' },
    { followerId: 'user5', followingId: 'currentUser', createdAt: '2024-06-22T09:00:00Z' },
  ],
  notifySettings: [
    { userId: 'user1', notifyOnNewKindness: true },
    { userId: 'user4', notifyOnNewKindness: false },
  ],

  follow: (userId) => {
    const state = get();
    if (userId === state.currentUserId) {
      console.warn('[SocialStore] 不能关注自己');
      return;
    }
    if (state.followingIds.includes(userId)) {
      console.warn('[SocialStore] 已关注该用户');
      return;
    }
    const newRelation: FollowRelation = {
      followerId: state.currentUserId,
      followingId: userId,
      createdAt: new Date().toISOString(),
    };
    set({
      followingIds: [...state.followingIds, userId],
      relations: [...state.relations, newRelation],
      notifySettings: [...state.notifySettings, { userId, notifyOnNewKindness: true }],
    });
    get().saveToStorage();
    console.log('[SocialStore] 关注成功:', userId);
  },

  unfollow: (userId) => {
    const state = get();
    set({
      followingIds: state.followingIds.filter((id) => id !== userId),
      relations: state.relations.filter(
        (r) => !(r.followerId === state.currentUserId && r.followingId === userId)
      ),
      notifySettings: state.notifySettings.filter((s) => s.userId !== userId),
    });
    get().saveToStorage();
    console.log('[SocialStore] 取消关注:', userId);
  },

  isFollowing: (userId) => {
    return get().followingIds.includes(userId);
  },

  isFollowedBy: (userId) => {
    return get().followerIds.includes(userId);
  },

  isMutualFollowing: (userId) => {
    const state = get();
    return state.followingIds.includes(userId) && state.followerIds.includes(userId);
  },

  getFollowingList: () => get().followingIds,

  getFollowerList: () => get().followerIds,

  updateNotifySetting: (userId, notifyOnNewKindness) => {
    const state = get();
    const existing = state.notifySettings.find((s) => s.userId === userId);
    if (existing) {
      set({
        notifySettings: state.notifySettings.map((s) =>
          s.userId === userId ? { ...s, notifyOnNewKindness } : s
        ),
      });
    } else {
      set({
        notifySettings: [...state.notifySettings, { userId, notifyOnNewKindness }],
      });
    }
    get().saveToStorage();
  },

  getNotifySetting: (userId) => {
    const setting = get().notifySettings.find((s) => s.userId === userId);
    return setting ? setting.notifyOnNewKindness : true;
  },

  notifyFollowersNewKindness: (authorId, authorName, kindnessId, content) => {
    // 通知所有关注了该作者且开启了通知的用户
    const state = get();
    const followers = state.relations
      .filter((r) => r.followingId === authorId)
      .map((r) => r.followerId);

    followers.forEach((followerId) => {
      const shouldNotify = state.getNotifySetting(authorId);
      if (shouldNotify && followerId === state.currentUserId) {
        // 当前用户收到通知
        useNotificationStore.getState().addNotification({
          category: 'interaction',
          type: 'follow',
          title: '关注的人发布了新善行',
          content: `${authorName} 发布了新善行：${content.slice(0, 30)}...`,
          relatedId: kindnessId,
        });
      }
    });
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          currentUserId: parsed.currentUserId || 'currentUser',
          followingIds: parsed.followingIds || [],
          followerIds: parsed.followerIds || [],
          relations: parsed.relations || [],
          notifySettings: parsed.notifySettings || [],
        });
      }
    } catch (e) {
      console.error('[SocialStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        currentUserId: state.currentUserId,
        followingIds: state.followingIds,
        followerIds: state.followerIds,
        relations: state.relations,
        notifySettings: state.notifySettings,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[SocialStore] Save to storage failed:', e);
    }
  },
}));
