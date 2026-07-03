import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { useFortuneStore } from '@/store/fortune';
import { SEED_USERS } from '@/data/seed-data';

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

// ============================================
// 任务2：邀请奖励阶梯升级
// ============================================

// 里程碑定义
export interface InviteMilestone {
  invitesNeeded: number;    // 需要邀请人数
  reward: number;           // 福气奖励
  label: string;            // 里程碑名称
  type: 'fortune' | 'title'; // 奖励类型：福气/称号
  titleName?: string;       // 称号名称（type=title时）
  achieved: boolean;        // 是否已达成
  achievedAt?: string;      // 达成时间
}

const MILESTONE_DEFS = [
  { invitesNeeded: 1, reward: 20, label: '邀请1人', type: 'fortune' as const },
  { invitesNeeded: 3, reward: 50, label: '邀请3人', type: 'fortune' as const },
  { invitesNeeded: 10, reward: 0, label: '邀请10人', type: 'title' as const, titleName: '善行大使' },
];

interface InviteState {
  // 用户唯一邀请码
  inviteCode: string;
  // 邀请记录列表
  inviteRecords: InviteRecord[];
  // 累计邀请人数
  totalInvited: number;
  // 累计获得的邀请奖励
  totalReward: number;
  // 已达成的里程碑（记录达成状态，防止重复发放）
  achievedMilestones: number[]; // 存储已达成里程碑的 invitesNeeded 值

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
  // 获取邀请里程碑列表及当前进度
  getInviteMilestones: () => InviteMilestone[];
  // 获取下一个未达成的里程碑
  getNextMilestone: () => InviteMilestone | null;
  // 检查里程碑（内部方法）
  checkMilestones: (total: number) => void;
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



export const useInviteStore = create<InviteState>((set, get) => ({
  inviteCode: '',
  inviteRecords: [],
  totalInvited: 0,
  totalReward: 0,
  achievedMilestones: [],

  // 生成邀请码
  generateInviteCode: () => {
    const state = get();
    if (state.inviteCode) return state.inviteCode;
    const code = generateCode();
    set({ inviteCode: code });
    get().saveToStorage();
    return code;
  },

  // 模拟好友通过邀请码注册（从种子数据中选取未使用的用户）
  simulateInviteRegister: (code) => {
    const state = get();
    // 验证邀请码格式（任意8位字符都视为有效）
    if (!code || code.length !== 8) {
      Taro.showToast({ title: '邀请码格式错误', icon: 'none' });
      return false;
    }

    // 从种子数据中选取一个未邀请过的用户
    const usedIds = state.inviteRecords.map(r => r.inviteeId);
    const available = SEED_USERS.filter(u => !usedIds.includes(u.id));
    if (available.length === 0) {
      Taro.showToast({ title: '暂无更多可邀请用户', icon: 'none' });
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

    const newTotalInvited = state.totalInvited + 1;
    const newTotalReward = state.totalReward + INVITE_REWARD;

    set({
      inviteRecords: [newRecord, ...state.inviteRecords],
      totalInvited: newTotalInvited,
      totalReward: newTotalReward,
    });

    // 双方各获得福气奖励
    const fortuneStore = useFortuneStore.getState();
    fortuneStore.addFortune(INVITE_REWARD, `邀请好友奖励：${invitee.name}`);

    // 给被邀请人发放奖励
    fortuneStore.addFortune(INVITE_REWARD, '受邀注册奖励', 'invite_received');

    // 检查里程碑达成
    get().checkMilestones(newTotalInvited);

    get().saveToStorage();
    Taro.showToast({ title: `+${INVITE_REWARD}福气`, icon: 'success' });
    return true;
  },

  // 检查并发放里程碑奖励
  checkMilestones: (totalInvited: number) => {
    const { achievedMilestones } = get();
    const fortuneStore = useFortuneStore.getState();

    MILESTONE_DEFS.forEach(milestone => {
      // 已达到邀请人数门槛且尚未领取
      if (totalInvited >= milestone.invitesNeeded && !achievedMilestones.includes(milestone.invitesNeeded)) {
        // 记录已达成
        set({ achievedMilestones: [...achievedMilestones, milestone.invitesNeeded] });

        if (milestone.type === 'fortune') {
          // 发放福气奖励
          fortuneStore.addFortune(milestone.reward, `邀请里程碑：${milestone.label}`);
          Taro.showToast({ title: `里程碑达成！+${milestone.reward}福气`, icon: 'success' });
        } else if (milestone.type === 'title') {
          // 解锁称号
          Taro.showModal({
            title: '🏆 称号解锁！',
            content: `恭喜你邀请达到 ${milestone.invitesNeeded} 人，解锁专属称号「${milestone.titleName}」！`,
            showCancel: false,
          });
        }
      }
    });
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

  // 获取邀请里程碑列表
  getInviteMilestones: () => {
    const { achievedMilestones } = get();
    return MILESTONE_DEFS.map(m => ({
      ...m,
      achieved: achievedMilestones.includes(m.invitesNeeded),
      achievedAt: undefined,
    }));
  },

  // 获取下一个未达成的里程碑
  getNextMilestone: () => {
    const { achievedMilestones } = get();
    const next = MILESTONE_DEFS.find(m => !achievedMilestones.includes(m.invitesNeeded));
    if (!next) return null;
    return {
      ...next,
      achieved: false,
      achievedAt: undefined,
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
          achievedMilestones: parsed.achievedMilestones || [],
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
        achievedMilestones: state.achievedMilestones,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[InviteStore] Save to storage failed:', e);
    }
  },
}));

// 导出邀请奖励常量
export { INVITE_REWARD };