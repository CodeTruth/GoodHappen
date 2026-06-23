import { create } from 'zustand';
import Taro from '@tarojs/taro';
import {
  ThemeChallenge,
  PersonalChallenge,
  TeamChallenge,
  TeamMember,
  ChallengeStatus,
  personalChallengeTemplates,
  generateInviteCode,
  getThemeChallenges,
  getPersonalChallenges,
  getTeamChallenges,
} from '@/data/challenges';

const STORAGE_KEY = 'haoshi_challenge_store';

// ============================================
// Phase 10 - H1 挑战系统 Store
// ============================================

interface ChallengeState {
  // 主题挑战（系统预设）
  themeChallenges: ThemeChallenge[];
  // 个人挑战（用户加入/创建的）
  personalChallenges: PersonalChallenge[];
  // 组队挑战（用户参与的）
  teamChallenges: TeamChallenge[];
  // 当前用户ID（mock）
  currentUserId: string;

  // 主题挑战
  joinThemeChallenge: (challengeId: string) => void;
  getThemeChallengeProgress: (challengeId: string) => { completedDays: number; completedCount: number; status: ChallengeStatus };

  // 个人挑战
  createPersonalChallenge: (data: {
    title: string;
    description?: string;
    icon: string;
    targetDays: number;
    targetCount: number;
    isCustom: boolean;
    badge?: string;
  }) => string;
  recordPersonalChallenge: (challengeId: string) => void;
  deletePersonalChallenge: (challengeId: string) => void;

  // 组队挑战
  createTeamChallenge: (data: {
    title: string;
    description: string;
    icon: string;
    coverColor: string;
    coverColorEnd: string;
    targetCount: number;
    maxMembers: number;
    badge: string;
  }) => string;
  joinTeamByInviteCode: (code: string) => boolean;
  recordTeamContribution: (challengeId: string, userId: string) => void;
  getTeamChallenge: (id: string) => TeamChallenge | undefined;

  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const initialState = {
  themeChallenges: getThemeChallenges(),
  personalChallenges: getPersonalChallenges(),
  teamChallenges: getTeamChallenges(),
  currentUserId: 'currentUser',
};

export const useChallengeStore = create<ChallengeState>((set, get) => ({
  ...initialState,

  // 加入主题挑战（初始化进度记录）
  joinThemeChallenge: (challengeId) => {
    const state = get();
    // 这里仅做记录，实际进度通过 recordPersonalChallenge 等流程累计
    // 主题挑战的进度存储在 personalChallenges 中（转换为个人挑战）
    const theme = state.themeChallenges.find(t => t.id === challengeId);
    if (!theme) return;

    // 检查是否已加入
    const existing = state.personalChallenges.find(
      p => p.title === theme.title && p.startDate === theme.startDate
    );
    if (existing) {
      Taro.showToast({ title: '已加入该挑战', icon: 'none' });
      return;
    }

    const newChallenge: PersonalChallenge = {
      id: `personal_theme_${Date.now()}`,
      type: 'personal',
      title: theme.title,
      description: theme.description,
      icon: theme.icon,
      targetDays: theme.targetDays,
      targetCount: theme.targetDays,
      completedDays: 0,
      completedCount: 0,
      startDate: new Date().toISOString().split('T')[0],
      status: 'ongoing',
      isCustom: false,
      badge: theme.badge,
    };

    set({
      personalChallenges: [...state.personalChallenges, newChallenge],
    });
    get().saveToStorage();
    Taro.showToast({ title: '加入成功！', icon: 'success' });
  },

  // 获取主题挑战进度
  getThemeChallengeProgress: (challengeId) => {
    const state = get();
    const theme = state.themeChallenges.find(t => t.id === challengeId);
    if (!theme) return { completedDays: 0, completedCount: 0, status: 'ongoing' };
    const personal = state.personalChallenges.find(p => p.title === theme.title);
    if (!personal) return { completedDays: 0, completedCount: 0, status: 'ongoing' };
    return {
      completedDays: personal.completedDays,
      completedCount: personal.completedCount,
      status: personal.status,
    };
  },

  // 创建个人挑战
  createPersonalChallenge: (data) => {
    const state = get();
    const newChallenge: PersonalChallenge = {
      id: `personal_${Date.now()}`,
      type: 'personal',
      title: data.title,
      description: data.description,
      icon: data.icon,
      targetDays: data.targetDays,
      targetCount: data.targetCount,
      completedDays: 0,
      completedCount: 0,
      startDate: new Date().toISOString().split('T')[0],
      status: 'ongoing',
      isCustom: data.isCustom,
      badge: data.badge,
    };
    set({
      personalChallenges: [...state.personalChallenges, newChallenge],
    });
    get().saveToStorage();
    return newChallenge.id;
  },

  // 记录个人挑战完成一天
  recordPersonalChallenge: (challengeId) => {
    const state = get();
    const challenge = state.personalChallenges.find(c => c.id === challengeId);
    if (!challenge) return;
    if (challenge.status !== 'ongoing') return;

    // 防止同一天重复记录
    // 实际场景中由善行记录触发，此处简化处理
    const newCompletedDays = challenge.completedDays + 1;
    const newCompletedCount = challenge.completedCount + 1;
    const isCompleted = newCompletedDays >= challenge.targetDays || newCompletedCount >= challenge.targetCount;

    set({
      personalChallenges: state.personalChallenges.map(c =>
        c.id === challengeId
          ? {
              ...c,
              completedDays: newCompletedDays,
              completedCount: newCompletedCount,
              status: isCompleted ? 'completed' as ChallengeStatus : c.status,
            }
          : c
      ),
    });
    get().saveToStorage();

    if (isCompleted && challenge.badge) {
      Taro.showToast({ title: `获得徽章：${challenge.badge}`, icon: 'success' });
    }
  },

  // 删除个人挑战
  deletePersonalChallenge: (challengeId) => {
    const state = get();
    set({
      personalChallenges: state.personalChallenges.filter(c => c.id !== challengeId),
    });
    get().saveToStorage();
  },

  // 创建组队挑战
  createTeamChallenge: (data) => {
    const state = get();
    const currentUser = state.currentUserId;
    const captain: TeamMember = {
      userId: currentUser,
      name: '温暖小太阳',
      avatar: 'https://picsum.photos/id/64/200/200',
      contribution: 0,
      joinedAt: new Date().toISOString(),
    };
    const newTeam: TeamChallenge = {
      id: `team_${Date.now()}`,
      type: 'team',
      title: data.title,
      description: data.description,
      icon: data.icon,
      coverColor: data.coverColor,
      coverColorEnd: data.coverColorEnd,
      targetCount: data.targetCount,
      teamTotalCount: 0,
      members: [captain],
      captainId: currentUser,
      inviteCode: generateInviteCode(),
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      badge: data.badge,
      maxMembers: data.maxMembers,
    };
    set({
      teamChallenges: [...state.teamChallenges, newTeam],
    });
    get().saveToStorage();
    return newTeam.id;
  },

  // 通过邀请码加入队伍
  joinTeamByInviteCode: (code) => {
    const state = get();
    const team = state.teamChallenges.find(t => t.inviteCode.toUpperCase() === code.toUpperCase());
    if (!team) {
      Taro.showToast({ title: '邀请码无效', icon: 'none' });
      return false;
    }
    if (team.members.length >= team.maxMembers) {
      Taro.showToast({ title: '队伍已满员', icon: 'none' });
      return false;
    }
    if (team.members.some(m => m.userId === state.currentUserId)) {
      Taro.showToast({ title: '你已在队伍中', icon: 'none' });
      return false;
    }
    const newMember: TeamMember = {
      userId: state.currentUserId,
      name: '温暖小太阳',
      avatar: 'https://picsum.photos/id/64/200/200',
      contribution: 0,
      joinedAt: new Date().toISOString(),
    };
    set({
      teamChallenges: state.teamChallenges.map(t =>
        t.id === team.id
          ? { ...t, members: [...t.members, newMember] }
          : t
      ),
    });
    get().saveToStorage();
    Taro.showToast({ title: '加入队伍成功！', icon: 'success' });
    return true;
  },

  // 记录队伍贡献
  recordTeamContribution: (challengeId, userId) => {
    const state = get();
    set({
      teamChallenges: state.teamChallenges.map(t =>
        t.id === challengeId
          ? {
              ...t,
              teamTotalCount: t.teamTotalCount + 1,
              members: t.members.map(m =>
                m.userId === userId
                  ? { ...m, contribution: m.contribution + 1 }
                  : m
              ),
            }
          : t
      ),
    });
    get().saveToStorage();
  },

  // 获取组队挑战
  getTeamChallenge: (id) => {
    return get().teamChallenges.find(t => t.id === id);
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          // 主题挑战始终从 mock 加载（系统预设）
          themeChallenges: getThemeChallenges(),
          personalChallenges: parsed.personalChallenges || getPersonalChallenges(),
          teamChallenges: parsed.teamChallenges || getTeamChallenges(),
          currentUserId: parsed.currentUserId || 'currentUser',
        });
      }
    } catch (e) {
      console.error('[ChallengeStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        personalChallenges: state.personalChallenges,
        teamChallenges: state.teamChallenges,
        currentUserId: state.currentUserId,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[ChallengeStore] Save to storage failed:', e);
    }
  },
}));

// 导出预设模板供页面使用
export { personalChallengeTemplates };
