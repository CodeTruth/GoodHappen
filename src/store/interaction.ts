import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { validateComment, recordComment, extractMentions } from '@/utils/sensitive';

const STORAGE_KEY = 'haoshi_interaction_store';

// 评论数据结构
export interface Comment {
  id: string;
  kindnessId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  mentions: string[]; // @提及的用户名
  createdAt: string;
}

// 点赞记录
export interface LikeRecord {
  kindnessId: string;
  userId: string;
  createdAt: string;
}

interface InteractionState {
  // 点赞记录（按善行ID分组）
  likes: Record<string, LikeRecord[]>;
  // 评论记录（按善行ID分组）
  comments: Record<string, Comment[]>;
  // 当前用户ID
  currentUserId: string;

  // 点赞/取消点赞
  toggleLike: (kindnessId: string, userName: string, userAvatar: string) => boolean;
  // 判断是否已点赞
  hasLiked: (kindnessId: string) => boolean;
  // 获取点赞数
  getLikeCount: (kindnessId: string, baseCount: number) => number;
  // 获取点赞列表
  getLikeList: (kindnessId: string) => LikeRecord[];

  // 添加评论（含防刷校验）
  addComment: (
    kindnessId: string,
    content: string,
    userName: string,
    userAvatar: string
  ) => { success: boolean; reason?: string };
  // 获取评论列表
  getCommentList: (kindnessId: string) => Comment[];
  // 获取评论数
  getCommentCount: (kindnessId: string, baseCount: number) => number;

  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// 生成唯一ID
const generateId = (): string => {
  return `cmt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const useInteractionStore = create<InteractionState>((set, get) => ({
  currentUserId: 'currentUser',
  likes: {},
  comments: {},

  toggleLike: (kindnessId, _userName, _userAvatar) => {
    const state = get();
    const likeList = state.likes[kindnessId] || [];
    const existing = likeList.find((l) => l.userId === state.currentUserId);

    if (existing) {
      // 取消点赞
      set({
        likes: {
          ...state.likes,
          [kindnessId]: likeList.filter((l) => l.userId !== state.currentUserId),
        },
      });
      get().saveToStorage();
      return false;
    } else {
      // 点赞
      const newLike: LikeRecord = {
        kindnessId,
        userId: state.currentUserId,
        createdAt: new Date().toISOString(),
      };
      set({
        likes: {
          ...state.likes,
          [kindnessId]: [...likeList, newLike],
        },
      });
      get().saveToStorage();
      return true;
    }
  },

  hasLiked: (kindnessId) => {
    const state = get();
    const likeList = state.likes[kindnessId] || [];
    return likeList.some((l) => l.userId === state.currentUserId);
  },

  getLikeCount: (kindnessId, baseCount) => {
    const state = get();
    const likeList = state.likes[kindnessId] || [];
    const userLiked = likeList.some((l) => l.userId === state.currentUserId);
    // 基础数 + 当前用户点赞增量
    return baseCount + (userLiked ? 1 : 0);
  },

  getLikeList: (kindnessId) => {
    return get().likes[kindnessId] || [];
  },

  addComment: (kindnessId, content, userName, userAvatar) => {
    // 防刷校验
    const result = validateComment(content);
    if (!result.valid) {
      return { success: false, reason: result.reason };
    }

    const state = get();
    const mentions = extractMentions(content);
    const comment: Comment = {
      id: generateId(),
      kindnessId,
      userId: state.currentUserId,
      userName,
      userAvatar,
      content: content.trim(),
      mentions,
      createdAt: new Date().toISOString(),
    };

    const existingComments = state.comments[kindnessId] || [];
    set({
      comments: {
        ...state.comments,
        [kindnessId]: [...existingComments, comment],
      },
    });

    // 记录到最近评论列表（用于重复检测）
    recordComment(content);

    get().saveToStorage();
    return { success: true };
  },

  getCommentList: (kindnessId) => {
    return get().comments[kindnessId] || [];
  },

  getCommentCount: (kindnessId, baseCount) => {
    const state = get();
    const commentList = state.comments[kindnessId] || [];
    return baseCount + commentList.length;
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          currentUserId: parsed.currentUserId || 'currentUser',
          likes: parsed.likes || {},
          comments: parsed.comments || {},
        });
      }
    } catch (e) {
      console.error('[InteractionStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        currentUserId: state.currentUserId,
        likes: state.likes,
        comments: state.comments,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[InteractionStore] Save to storage failed:', e);
    }
  },
}));
