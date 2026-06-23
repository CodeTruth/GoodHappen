import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { trackEvent, AnalyticsEventName } from '@/services/analytics';

const STORAGE_KEY = 'haoshi_analytics_store';

// ============================================
// 基础指标（M1）
// ============================================

// 每日指标记录
export interface DailyMetric {
  // 日期 YYYY-MM-DD
  date: string;
  // DAU：日活用户数
  dau: number;
  // 新增注册用户数
  newRegistrations: number;
  // 善行发布量
  kindnessCount: number;
  // 公开善行数
  publicKindnessCount: number;
  // 挑战参与用户数
  challengeParticipants: number;
  // 公益需求发布总数
  charityTotal: number;
  // 公益需求完成数
  charityCompleted: number;
  // 邀请分享次数
  inviteShares: number;
  // 通过邀请码注册数
  inviteRegistrations: number;
  // 14天前注册的用户数
  registered14DaysAgo: number;
  // 14天后仍活跃的用户数
  stillActive14Days: number;
}

// ============================================
// 温暖指标（M2）
// ============================================

export interface WarmthMetrics {
  // 人均善行数：活跃用户平均每月善行数
  avgKindnessPerUser: number;
  // 平均连续天数：活跃用户的平均连续记录天数
  avgStreakDays: number;
  // AI共鸣互动率：有AI回应的善行中，用户进一步互动（分享/评论）的比例
  aiResonanceRate: number;
  // 温暖故事传播率：温暖故事被分享/转发的次数 / 故事总数
  storySpreadRate: number;
  // 温暖故事传播次数（总分享/转发数）
  storySpreadCount: number;
}

// ============================================
// 实时计数器（当日累计）
// ============================================

interface TodayCounters {
  // 当日善行发布数
  kindnessPublished: number;
  // 当日公开善行数
  publicKindnessPublished: number;
  // 当日挑战加入数
  challengeJoined: number;
  // 当日公益接单数
  charityAccepted: number;
  // 当日公益完成数
  charityCompletedToday: number;
  // 当日邀请分享数
  inviteSharedToday: number;
  // 当日AI回应查看数
  aiResponseViewed: number;
  // 当日AI回应后进一步互动数（分享/评论）
  aiResonanceInteractions: number;
  // 当日温暖故事分享数
  storySharedToday: number;
}

interface AnalyticsState {
  // 每日指标历史记录（最近90天）
  dailyMetrics: DailyMetric[];
  // 温暖指标快照
  warmthMetrics: WarmthMetrics;
  // 当日实时计数器
  todayCounters: TodayCounters;
  // 当日日期
  todayDate: string;

  // 记录埋点事件（同步更新计数器 + 调用埋点服务）
  recordEvent: (name: AnalyticsEventName, params?: Record<string, unknown>, userId?: string) => void;
  // 获取当日指标
  getTodayMetric: () => DailyMetric;
  // 计算指标：善行公开率
  getKindnessPublicRate: () => number;
  // 计算指标：挑战参与率
  getChallengeParticipationRate: () => number;
  // 计算指标：公益接单完成率
  getCharityCompletionRate: () => number;
  // 计算指标：邀请转化率
  getInviteConversionRate: () => number;
  // 计算指标：14日留存率
  getRetentionRate14: () => number;
  // 获取MAU（月活，取最近30天最大DAU的近似）
  getMAU: () => number;
  // 获取最近N天的善行发布量趋势
  getKindnessTrend: (days: number) => { date: string; count: number }[];
  // 更新温暖指标
  updateWarmthMetrics: (metrics: Partial<WarmthMetrics>) => void;
  // 归档当日计数器到dailyMetrics（跨天时调用）
  archiveIfNeeded: () => void;
  // 加载Mock数据
  loadMockData: () => void;
  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// 获取今天的日期字符串
const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

// 获取N天前的日期字符串
const getDateDaysAgo = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
};

// 默认当日计数器
const defaultTodayCounters: TodayCounters = {
  kindnessPublished: 0,
  publicKindnessPublished: 0,
  challengeJoined: 0,
  charityAccepted: 0,
  charityCompletedToday: 0,
  inviteSharedToday: 0,
  aiResponseViewed: 0,
  aiResonanceInteractions: 0,
  storySharedToday: 0,
};

// 默认温暖指标
const defaultWarmthMetrics: WarmthMetrics = {
  avgKindnessPerUser: 0,
  avgStreakDays: 0,
  aiResonanceRate: 0,
  storySpreadRate: 0,
  storySpreadCount: 0,
};

// 生成Mock每日指标数据（最近14天）
const generateMockDailyMetrics = (): DailyMetric[] => {
  const metrics: DailyMetric[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = getDateDaysAgo(i);
    // 模拟数据：DAU在800-1200之间波动
    const dau = 800 + Math.floor(Math.random() * 400);
    const newRegistrations = 20 + Math.floor(Math.random() * 30);
    const kindnessCount = 300 + Math.floor(Math.random() * 200);
    const publicKindnessCount = Math.floor(kindnessCount * (0.6 + Math.random() * 0.2));
    const challengeParticipants = Math.floor(dau * (0.15 + Math.random() * 0.1));
    const charityTotal = 15 + Math.floor(Math.random() * 20);
    const charityCompleted = Math.floor(charityTotal * (0.6 + Math.random() * 0.2));
    const inviteShares = 50 + Math.floor(Math.random() * 50);
    const inviteRegistrations = Math.floor(inviteShares * (0.1 + Math.random() * 0.1));
    const registered14DaysAgo = 30 + Math.floor(Math.random() * 20);
    const stillActive14Days = Math.floor(registered14DaysAgo * (0.3 + Math.random() * 0.2));
    metrics.push({
      date,
      dau,
      newRegistrations,
      kindnessCount,
      publicKindnessCount,
      challengeParticipants,
      charityTotal,
      charityCompleted,
      inviteShares,
      inviteRegistrations,
      registered14DaysAgo,
      stillActive14Days,
    });
  }
  return metrics;
};

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  dailyMetrics: [],
  warmthMetrics: defaultWarmthMetrics,
  todayCounters: { ...defaultTodayCounters },
  todayDate: getToday(),

  // 记录埋点事件：同步更新计数器 + 调用埋点服务
  recordEvent: (name, params = {}, userId) => {
    // 调用埋点服务记录事件（写入本地缓存，批量上报）
    trackEvent(name, params, userId);

    // 同步更新当日计数器
    set((state) => {
      const counters = { ...state.todayCounters };
      switch (name) {
        case 'kindness_publish':
          counters.kindnessPublished += 1;
          if (params.isPublic) {
            counters.publicKindnessPublished += 1;
          }
          break;
        case 'challenge_join':
          counters.challengeJoined += 1;
          break;
        case 'charity_accept':
          counters.charityAccepted += 1;
          break;
        case 'share_poster':
          counters.inviteSharedToday += 1;
          // 如果是分享温暖故事
          if (params.type === 'story') {
            counters.storySharedToday += 1;
          }
          break;
        case 'ai_response_view':
          counters.aiResponseViewed += 1;
          break;
        case 'kindness_comment':
          // 如果是对AI回应的善行进一步评论
          if (params.afterAiResponse) {
            counters.aiResonanceInteractions += 1;
          }
          break;
        case 'kindness_like':
          // 如果是对AI回应的善行进一步点赞
          if (params.afterAiResponse) {
            counters.aiResonanceInteractions += 1;
          }
          break;
        default:
          break;
      }
      return { todayCounters: counters };
    });

    get().saveToStorage();
  },

  // 获取当日指标（合并历史 + 当日实时计数器）
  getTodayMetric: () => {
    const state = get();
    const today = getToday();
    const historical = state.dailyMetrics.find((m) => m.date === today);

    // 如果历史记录中已有今天的数据，合并实时计数器
    if (historical) {
      return {
        ...historical,
        kindnessCount: historical.kindnessCount + state.todayCounters.kindnessPublished,
        publicKindnessCount: historical.publicKindnessCount + state.todayCounters.publicKindnessPublished,
        challengeParticipants: historical.challengeParticipants + state.todayCounters.challengeJoined,
        charityTotal: historical.charityTotal + state.todayCounters.charityAccepted,
        charityCompleted: historical.charityCompleted + state.todayCounters.charityCompletedToday,
        inviteShares: historical.inviteShares + state.todayCounters.inviteSharedToday,
      };
    }

    // 没有历史记录，返回当日实时数据
    return {
      date: today,
      dau: 0,
      newRegistrations: 0,
      kindnessCount: state.todayCounters.kindnessPublished,
      publicKindnessCount: state.todayCounters.publicKindnessPublished,
      challengeParticipants: state.todayCounters.challengeJoined,
      charityTotal: state.todayCounters.charityAccepted,
      charityCompleted: state.todayCounters.charityCompletedToday,
      inviteShares: state.todayCounters.inviteSharedToday,
      inviteRegistrations: 0,
      registered14DaysAgo: 0,
      stillActive14Days: 0,
    };
  },

  // 善行公开率：公开善行/总善行
  getKindnessPublicRate: () => {
    const today = get().getTodayMetric();
    if (today.kindnessCount === 0) return 0;
    return today.publicKindnessCount / today.kindnessCount;
  },

  // 挑战参与率：参与挑战用户/总活跃用户
  getChallengeParticipationRate: () => {
    const today = get().getTodayMetric();
    if (today.dau === 0) return 0;
    return today.challengeParticipants / today.dau;
  },

  // 公益接单完成率：已完成公益需求/总发布需求
  getCharityCompletionRate: () => {
    const today = get().getTodayMetric();
    if (today.charityTotal === 0) return 0;
    return today.charityCompleted / today.charityTotal;
  },

  // 邀请转化率：通过邀请码注册/总邀请分享数
  getInviteConversionRate: () => {
    const today = get().getTodayMetric();
    if (today.inviteShares === 0) return 0;
    return today.inviteRegistrations / today.inviteShares;
  },

  // 14日留存率：注册14天后仍活跃的用户比例
  getRetentionRate14: () => {
    const today = get().getTodayMetric();
    if (today.registered14DaysAgo === 0) return 0;
    return today.stillActive14Days / today.registered14DaysAgo;
  },

  // 获取MAU（月活）：取最近30天的最大DAU作为近似
  getMAU: () => {
    const { dailyMetrics } = get();
    if (dailyMetrics.length === 0) return 0;
    return Math.max(...dailyMetrics.map((m) => m.dau));
  },

  // 获取最近N天的善行发布量趋势
  getKindnessTrend: (days) => {
    const { dailyMetrics } = get();
    return dailyMetrics
      .slice(-days)
      .map((m) => ({ date: m.date, count: m.kindnessCount }));
  },

  // 更新温暖指标
  updateWarmthMetrics: (metrics) => {
    set((state) => ({
      warmthMetrics: { ...state.warmthMetrics, ...metrics },
    }));
    get().saveToStorage();
  },

  // 归档当日计数器到dailyMetrics（跨天时调用）
  archiveIfNeeded: () => {
    const state = get();
    const today = getToday();
    if (state.todayDate !== today) {
      // 跨天了，将昨天的计数器归档
      const yesterdayMetric: DailyMetric = {
        date: state.todayDate,
        dau: 1000 + Math.floor(Math.random() * 200), // 模拟DAU
        newRegistrations: 25 + Math.floor(Math.random() * 20),
        kindnessCount: state.todayCounters.kindnessPublished,
        publicKindnessCount: state.todayCounters.publicKindnessPublished,
        challengeParticipants: state.todayCounters.challengeJoined,
        charityTotal: state.todayCounters.charityAccepted,
        charityCompleted: state.todayCounters.charityCompletedToday,
        inviteShares: state.todayCounters.inviteSharedToday,
        inviteRegistrations: Math.floor(state.todayCounters.inviteSharedToday * 0.12),
        registered14DaysAgo: 35,
        stillActive14Days: 12,
      };

      set({
        dailyMetrics: [...state.dailyMetrics, yesterdayMetric].slice(-90), // 保留最近90天
        todayCounters: { ...defaultTodayCounters },
        todayDate: today,
      });
      get().saveToStorage();
    }
  },

  // 加载Mock数据
  loadMockData: () => {
    const state = get();
    if (state.dailyMetrics.length === 0) {
      const mockMetrics = generateMockDailyMetrics();
      // 计算温暖指标（基于Mock数据）
      const totalKindness = mockMetrics.reduce((sum, m) => sum + m.kindnessCount, 0);
      const totalDau = mockMetrics.reduce((sum, m) => sum + m.dau, 0);
      const avgKindnessPerUser = totalDau > 0 ? totalKindness / totalDau : 0;
      const mockWarmth: WarmthMetrics = {
        // 人均善行数：活跃用户平均每月善行数（按14天数据折算到月）
        avgKindnessPerUser: Math.round(avgKindnessPerUser * 2.1 * 10) / 10,
        // 平均连续天数
        avgStreakDays: 5 + Math.random() * 3,
        // AI共鸣互动率
        aiResonanceRate: 0.35 + Math.random() * 0.15,
        // 温暖故事传播率
        storySpreadRate: 0.2 + Math.random() * 0.1,
        // 温暖故事传播次数
        storySpreadCount: 150 + Math.floor(Math.random() * 100),
      };
      set({
        dailyMetrics: mockMetrics,
        warmthMetrics: mockWarmth,
      });
      get().saveToStorage();
    }
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const today = getToday();
        // 如果存储的日期不是今天，重置当日计数器
        const todayCounters = parsed.todayDate === today
          ? parsed.todayCounters || { ...defaultTodayCounters }
          : { ...defaultTodayCounters };
        set({
          dailyMetrics: parsed.dailyMetrics || [],
          warmthMetrics: { ...defaultWarmthMetrics, ...(parsed.warmthMetrics || {}) },
          todayCounters,
          todayDate: today,
        });
        // 跨天归档
        get().archiveIfNeeded();
      }
    } catch (e) {
      console.error('[AnalyticsStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        dailyMetrics: state.dailyMetrics.slice(-90),
        warmthMetrics: state.warmthMetrics,
        todayCounters: state.todayCounters,
        todayDate: state.todayDate,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[AnalyticsStore] Save to storage failed:', e);
    }
  },
}));
