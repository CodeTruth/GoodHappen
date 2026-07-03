import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { UserInfo, PrivacySettings, VisibilityScope } from '@/types/user';
import { DbUser } from '@/services/db/schema';
import { isSupabaseAvailable } from '@/services/supabase';
import { userApi } from '@/services/db';

const STORAGE_KEY = 'haoshi_user_store';
const PRIVACY_KEY = 'haoshi_privacy_settings';

/** 将前端 UserInfo 转换为数据库 DbUser */
const toDbUser = (u: UserInfo): Omit<DbUser, 'created_at'> => ({
  id: u.id,
  name: u.name,
  avatar: u.avatar,
  bio: u.bio,
  gender: u.gender,
  birth_year: u.birthYear ?? undefined,
  region: u.region,
  phone: u.phone,
  blessing_value: u.blessingValue,
  kindness_count: u.kindnessCount,
  witness_count: u.witnessCount,
  badges: u.badges,
  circles: u.circles,
  emergency_contacts: u.emergencyContacts,
});

/** 将数据库 DbUser 转换为前端 UserInfo */
const fromDbUser = (d: DbUser): UserInfo => ({
  id: d.id,
  name: d.name,
  avatar: d.avatar,
  bio: d.bio,
  gender: d.gender,
  birthYear: d.birth_year ?? null,
  region: d.region || '',
  phone: d.phone,
  blessingValue: d.blessing_value,
  kindnessCount: d.kindness_count,
  witnessCount: d.witness_count,
  badges: d.badges,
  circles: d.circles,
  createdAt: (d as any).created_at || new Date().toISOString(),
  emergencyContacts: d.emergency_contacts,
});

// 默认隐私设置（默认仅自己！）
const defaultPrivacySettings: PrivacySettings = {
  kindnessVisibility: 'private',
  anonymousStats: true,
  showTitle: true,
  allowMatching: true,
  notificationInteraction: true,
  notificationSystem: true,
  notificationWarm: true,
  notificationCharity: true,
};

// 判定是否未成年（<18岁）
export const checkIsMinor = (birthYear: number | null | undefined): boolean => {
  if (!birthYear) return false;
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear < 18;
};

interface UserState {
  isLoggedIn: boolean;
  token: string | null;
  userInfo: UserInfo | null;
  privacySettings: PrivacySettings;

  // 登录相关
  login: (token: string, userInfo: UserInfo) => void;
  logout: () => void;
  updateUserInfo: (info: Partial<UserInfo>) => void;

  // 隐私设置
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => void;
  resetPrivacySettings: () => void;

  // 未成年人保护（计算属性）
  isMinor: () => boolean;
  canJoinAnonymousStats: () => boolean;
  getAllowedVisibilityScopes: () => VisibilityScope[];
  canTakeCharityOrders: () => boolean;
  canRedeemPhysicalGoods: () => boolean;
  needsStrictReview: () => boolean;

  // 持久化
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  isLoggedIn: false,
  token: null,
  userInfo: null,
  privacySettings: { ...defaultPrivacySettings },

  login: (token, userInfo) => {
    set({ isLoggedIn: true, token, userInfo });
    // 登录后根据是否未成年调整隐私设置
    const minor = checkIsMinor(userInfo.birthYear);
    if (minor) {
      // 未成年保护：强制关闭匿名统计，可见范围不可为 public
      set((state) => ({
        privacySettings: {
          ...state.privacySettings,
          anonymousStats: false,
          kindnessVisibility: state.privacySettings.kindnessVisibility === 'public'
            ? 'followers'
            : state.privacySettings.kindnessVisibility,
        },
      }));
    }
    get().saveToStorage();
    // 同步用户资料到后端
    if (isSupabaseAvailable()) {
      userApi.createUserProfile(toDbUser(userInfo)).catch((e) => {
        console.warn('[UserStore] Failed to sync user profile to backend:', e);
      });
    }
    console.log('[UserStore] Login success, isMinor:', minor);
  },

  logout: async () => {
    // 先调用 Supabase 登出
    try {
      const { logoutFromSupabase } = await import('@/services/auth');
      await logoutFromSupabase();
    } catch (e) {
      console.error('[UserStore] Supabase logout failed:', e);
    }

    set({
      isLoggedIn: false,
      token: null,
      userInfo: null,
      privacySettings: { ...defaultPrivacySettings },
    });
    try {
      Taro.removeStorageSync(STORAGE_KEY);
      Taro.removeStorageSync(PRIVACY_KEY);
    } catch (e) {
      console.error('[UserStore] Remove storage failed:', e);
    }
    console.log('[UserStore] Logout success');
  },

  updateUserInfo: (info) => {
    const { userInfo } = get();
    if (!userInfo) {
      console.warn('[UserStore] updateUserInfo called but no userInfo');
      return;
    }
    const newUserInfo = { ...userInfo, ...info };
    set({ userInfo: newUserInfo });
    // 如果出生年份变化，重新校验未成年状态并调整隐私设置
    if (info.birthYear !== undefined) {
      const minor = checkIsMinor(newUserInfo.birthYear);
      if (minor) {
        set((state) => ({
          privacySettings: {
            ...state.privacySettings,
            anonymousStats: false,
            kindnessVisibility: state.privacySettings.kindnessVisibility === 'public'
              ? 'followers'
              : state.privacySettings.kindnessVisibility,
          },
        }));
      }
    }
    get().saveToStorage();
    // 同步更新到后端
    if (isSupabaseAvailable() && userInfo.id) {
      const dbUpdate: any = {};
      if (info.name !== undefined) dbUpdate.name = info.name;
      if (info.avatar !== undefined) dbUpdate.avatar = info.avatar;
      if (info.bio !== undefined) dbUpdate.bio = info.bio;
      if (info.gender !== undefined) dbUpdate.gender = info.gender;
      if (info.birthYear !== undefined) dbUpdate.birth_year = info.birthYear ?? undefined;
      if (info.region !== undefined) dbUpdate.region = info.region;
      if (info.phone !== undefined) dbUpdate.phone = info.phone;
      if (info.blessingValue !== undefined) dbUpdate.blessing_value = info.blessingValue;
      if (info.kindnessCount !== undefined) dbUpdate.kindness_count = info.kindnessCount;
      if (info.witnessCount !== undefined) dbUpdate.witness_count = info.witnessCount;
      if (info.badges !== undefined) dbUpdate.badges = info.badges;
      if (info.circles !== undefined) dbUpdate.circles = info.circles;
      if (info.emergencyContacts !== undefined) dbUpdate.emergency_contacts = info.emergencyContacts;
      if (Object.keys(dbUpdate).length > 0) {
        userApi.updateUserProfile(userInfo.id, dbUpdate).catch((e) => {
          console.warn('[UserStore] Failed to sync user info update to backend:', e);
        });
      }
    }
    console.log('[UserStore] UserInfo updated');
  },

  updatePrivacySettings: (settings) => {
    const state = get();
    const minor = checkIsMinor(state.userInfo?.birthYear);
    const newSettings = { ...state.privacySettings, ...settings };
    // 未成年保护：不可开启匿名统计
    if (minor) {
      newSettings.anonymousStats = false;
      // 不可选"所有人"
      if (newSettings.kindnessVisibility === 'public') {
        newSettings.kindnessVisibility = 'followers';
      }
    }
    set({ privacySettings: newSettings });
    get().saveToStorage();
    console.log('[UserStore] Privacy settings updated, isMinor:', minor);
  },

  resetPrivacySettings: () => {
    const minor = checkIsMinor(get().userInfo?.birthYear);
    const reset = { ...defaultPrivacySettings };
    if (minor) {
      reset.anonymousStats = false;
    }
    set({ privacySettings: reset });
    get().saveToStorage();
    console.log('[UserStore] Privacy settings reset');
  },

  isMinor: () => checkIsMinor(get().userInfo?.birthYear),

  canJoinAnonymousStats: () => {
    const minor = checkIsMinor(get().userInfo?.birthYear);
    if (minor) return false;
    return get().privacySettings.anonymousStats;
  },

  getAllowedVisibilityScopes: () => {
    const minor = checkIsMinor(get().userInfo?.birthYear);
    // 未成年用户隐藏"所有人"选项
    if (minor) {
      return ['private', 'followers'];
    }
    return ['private', 'followers', 'public'];
  },

  canTakeCharityOrders: () => {
    // 未成年用户无接单资格
    return !checkIsMinor(get().userInfo?.birthYear);
  },

  canRedeemPhysicalGoods: () => {
    // 未成年用户无法兑换实体商品
    return !checkIsMinor(get().userInfo?.birthYear);
  },

  needsStrictReview: () => {
    // 未成年用户内容审核加严
    return checkIsMinor(get().userInfo?.birthYear);
  },

  loadFromStorage: async () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          isLoggedIn: parsed.isLoggedIn || false,
          token: parsed.token || null,
          userInfo: parsed.userInfo || null,
        });
      }
      const privacyData = Taro.getStorageSync(PRIVACY_KEY);
      if (privacyData) {
        set({ privacySettings: JSON.parse(privacyData) });
      }
    } catch (e) {
      console.error('[UserStore] Load from storage failed:', e);
    }
    // 如果Supabase可用且用户已登录，从后端同步最新资料
    if (isSupabaseAvailable()) {
      const { userInfo } = get();
      if (userInfo?.id) {
        try {
          const remoteProfile = await userApi.getUserProfile(userInfo.id);
          if (remoteProfile) {
            set({ userInfo: fromDbUser(remoteProfile) });
            get().saveToStorage();
          }
        } catch (e) {
          console.warn('[UserStore] Failed to sync user profile from backend:', e);
        }
      }
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        isLoggedIn: state.isLoggedIn,
        token: state.token,
        userInfo: state.userInfo,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
      Taro.setStorageSync(PRIVACY_KEY, JSON.stringify(state.privacySettings));
    } catch (e) {
      console.error('[UserStore] Save to storage failed:', e);
    }
  },
}));
