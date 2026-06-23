import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { useFortuneStore } from '@/store/fortune';

const STORAGE_KEY = 'haoshi_invite_store';

// ============================================
// Phase 10 - I1 邀请系统 Store
// ============================================

// 邀请奖励配置
const INVITE_REWARD = 20; // 双方各获得20福气

// 邀请记录
export interface InviteRecord {
  id: string;
  inviteeId: string;        // 被邀请人ID
  inviteeName: string;      // 被邀请人昵称
  inviteeAvatar: string;    // 被邀请人头像
  invitedAt: string;        // 邀请时间
  rewardClaimed: boolean;   // 是否已领取奖励
  status: 'pending' | 'completed'; // 状态：待完成/已完成
}

interface InviteState {
  // 用户唯一邀请码
  inviteCode: string;
  // 邀请记录列表
  inviteRecords: InviteRecord[];
  // 累计邀请人数
  totalInvited: number;
  // 累计获得的邀请奖励
  totalReward: number;

  // 生成邀请码（首次进入时）
  generateInviteCode: () => string;
  // 通过邀请码注册（mock：模拟好友通过邀请码注册）
  simulateInviteRegister: (code: string) => boolean;
  // 获取邀请统计
  getInviteStats: () => { total: number; completed: number; reward: number };
  // 复制邀请码
  copyInviteCode: () => void;
  // 生成邀请海报文案
  generateInviteText: () => string;
  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// 生成8位邀请码
const generateCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Mock 被邀请人数据
const mockInvitees = [
  { id: 'invitee_1', name: '温暖传递者', avatar: 'https://picsum.photos/id/64/200/200' },
  { id: 'invitee_2', name: '善心人士', avatar: 'https://picsum.photos/id/91/200/200' },
  { id: 'invitee_3', name: '小确幸', avatar: 'https://picsum.photos/id/177/200/200' },
  { id: 'invitee_4', name: '阳光少年', avatar: 'https://picsum.photos/id/338/200/200' },
  { id: 'invitee_5', name: '暖心人', avatar: 'https://picsum.photos/id/1027/200/200' },
];

export const useInviteStore = create<InviteState>((set, get) => ({
  inviteCode: '',
  inviteRecords: [],
  totalInvited: 0,
  totalReward: 0,

  // 生成邀请码
  generateInviteCode: () => {
    const state = get();
    if (state.inviteCode) return state.inviteCode;
    const code = generateCode();
    set({ inviteCode: code });
    get().saveToStorage();
    return code;
  },

  // 模拟好友通过邀请码注册
  simulateInviteRegister: (code) => {
    const state = get();
    // 验证邀请码格式（mock：任意8位字符都视为有效）
    if (!code || code.length !== 8) {
      Taro.showToast({ title: '邀请码格式错误', icon: 'none' });
      return false;
    }

    // 随机选一个 mock 被邀请人
    const usedIds = state.inviteRecords.map(r => r.inviteeId);
    const available = mockInvitees.filter(m => !usedIds.includes(m.id));
    if (available.length === 0) {
      Taro.showToast({ title: '暂无更多模拟好友', icon: 'none' });
      return false;
    }
    const invitee = available[Math.floor(Math.random() * available.length)];

    const newRecord: InviteRecord = {
      id: `invite_${Date.now()}`,
      inviteeId: invitee.id,
      inviteeName: invitee.name,
      inviteeAvatar: invitee.avatar,
      invitedAt: new Date().toISOString(),
      rewardClaimed: true,
      status: 'completed',
    };

    set({
      inviteRecords: [newRecord, ...state.inviteRecords],
      totalInvited: state.totalInvited + 1,
      totalReward: state.totalReward + INVITE_REWARD,
    });

    // 双方各获得福气奖励
    const fortuneStore = useFortuneStore.getState();
    fortuneStore.addFortune(INVITE_REWARD, `邀请好友奖励：${invitee.name}`);

    get().saveToStorage();
    Taro.showToast({ title: `+${INVITE_REWARD}福气`, icon: 'success' });
    return true;
  },

  // 获取邀请统计
  getInviteStats: () => {
    const { inviteRecords, totalReward } = get();
    return {
      total: inviteRecords.length,
      completed: inviteRecords.filter(r => r.status === 'completed').length,
      reward: totalReward,
    };
  },

  // 复制邀请码
  copyInviteCode: () => {
    const code = get().inviteCode;
    if (!code) return;
    Taro.setClipboardData({
      data: code,
      success: () => {
        Taro.showToast({ title: '邀请码已复制', icon: 'success' });
      },
    });
  },

  // 生成邀请海报文案
  generateInviteText: () => {
    const state = get();
    return `我在「好事发生」记录生活中的温暖瞬间，邀请你一起加入！\n\n邀请码：${state.inviteCode}\n\n通过邀请码注册，双方各获得 ${INVITE_REWARD} 福气奖励 ✨`;
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          inviteCode: parsed.inviteCode || '',
          inviteRecords: parsed.inviteRecords || [],
          totalInvited: parsed.totalInvited || 0,
          totalReward: parsed.totalReward || 0,
        });
      }
      // 如果没有邀请码，自动生成
      if (!get().inviteCode) {
        get().generateInviteCode();
      }
    } catch (e) {
      console.error('[InviteStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        inviteCode: state.inviteCode,
        inviteRecords: state.inviteRecords,
        totalInvited: state.totalInvited,
        totalReward: state.totalReward,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[InviteStore] Save to storage failed:', e);
    }
  },
}));

// 导出邀请奖励常量
export { INVITE_REWARD };
