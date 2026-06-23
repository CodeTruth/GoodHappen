import { create } from 'zustand';
import Taro from '@tarojs/taro';
import {
  mockAdminUsers,
  mockAdminTopics,
  mockAdminReviewTasks,
  mockConfigItems,
  mockConfigHistory,
  mockDashboardData,
  mockDashboardTrend,
  mockViolationRecords,
  mockFortuneFlows,
  type AdminUser,
  type AdminTopic,
  type AdminReviewTask,
  type AdminReviewStatus,
  type ConfigItem,
  type ConfigHistory,
  type ConfigCategory,
  type TimeRange,
  type DashboardMetric,
  type DashboardTrend,
  type AccountStatus,
  type UserMarkType,
  type ViolationRecord,
  type FortuneFlow,
} from '@/data/admin';

const STORAGE_KEY = 'haoshi_admin_store';

// ============================================
// 管理后台 Store 类型定义
// ============================================
interface AdminState {
  // 审核任务
  reviewTasks: AdminReviewTask[];
  // 用户管理
  users: AdminUser[];
  // 话题管理
  topics: AdminTopic[];
  // 配置项
  configItems: ConfigItem[];
  // 配置历史
  configHistory: ConfigHistory[];
  // 违规记录
  violationRecords: ViolationRecord[];
  // 福气流水
  fortuneFlows: FortuneFlow[];

  // ========== 审核操作 ==========
  // 通过审核
  approveReviewTask: (id: string, reviewer: string, note?: string) => void;
  // 退回审核（需填写退回原因）
  returnReviewTask: (id: string, reviewer: string, returnReason: string, note?: string) => void;
  // 拒绝审核（需填写拒绝原因）
  rejectReviewTask: (id: string, reviewer: string, reason: string, note?: string) => void;
  // 开始复审
  startReview: (id: string, reviewer: string) => void;
  // 批量通过
  batchApprove: (ids: string[], reviewer: string) => void;
  // 批量拒绝
  batchReject: (ids: string[], reviewer: string, reason: string) => void;
  // 获取指定状态的审核任务
  getReviewTasksByStatus: (status: AdminReviewStatus | 'all') => AdminReviewTask[];
  // 获取审核任务详情
  getReviewTaskById: (id: string) => AdminReviewTask | undefined;

  // ========== 用户管理操作 ==========
  // 封禁用户
  banUser: (userId: string, reason: string, duration: number) => void;
  // 解封用户
  unbanUser: (userId: string) => void;
  // 标记用户
  markUser: (userId: string, markType: UserMarkType) => void;
  // 获取用户详情
  getUserById: (userId: string) => AdminUser | undefined;
  // 获取用户善行历史（模拟）
  getUserKindnessHistory: (userId: string) => AdminReviewTask[];
  // 获取用户福气流水
  getUserFortuneFlows: (userId: string) => FortuneFlow[];
  // 获取用户违规记录
  getUserViolations: (userId: string) => ViolationRecord[];

  // ========== 话题管理操作 ==========
  // 创建话题
  createTopic: (topic: Omit<AdminTopic, 'id' | 'createdAt' | 'updatedAt' | 'kindnessCount'>) => string;
  // 编辑话题
  updateTopic: (id: string, updates: Partial<Pick<AdminTopic, 'name' | 'description' | 'color' | 'sortWeight'>>) => void;
  // 上线话题
  onlineTopic: (id: string) => void;
  // 下线话题
  offlineTopic: (id: string) => void;
  // 获取话题详情
  getTopicById: (id: string) => AdminTopic | undefined;

  // ========== 配置管理操作 ==========
  // 更新配置项
  updateConfig: (key: string, value: number | string | boolean, operator: string, reason?: string) => boolean;
  // 重置配置项为默认值
  resetConfig: (key: string, operator: string) => void;
  // 获取配置项
  getConfigByKey: (key: string) => ConfigItem | undefined;
  // 按分类获取配置项
  getConfigsByCategory: (category: ConfigCategory) => ConfigItem[];
  // 获取配置历史
  getConfigHistory: (limit?: number) => ConfigHistory[];

  // ========== 看板数据 ==========
  // 获取看板指标
  getDashboardMetric: (range: TimeRange) => DashboardMetric;
  // 获取看板趋势
  getDashboardTrend: (range: TimeRange) => DashboardTrend;

  // ========== 持久化 ==========
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// 生成唯一ID
const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

// 校验配置项取值范围
const validateConfigValue = (item: ConfigItem, value: number | string | boolean): boolean => {
  if (item.type === 'number') {
    const numValue = Number(value);
    if (isNaN(numValue)) return false;
    if (item.min !== undefined && numValue < item.min) return false;
    if (item.max !== undefined && numValue > item.max) return false;
    return true;
  }
  if (item.type === 'select') {
    return item.options?.includes(String(value)) || false;
  }
  if (item.type === 'boolean') {
    return typeof value === 'boolean';
  }
  return true;
};

export const useAdminStore = create<AdminState>((set, get) => ({
  reviewTasks: mockAdminReviewTasks,
  users: mockAdminUsers,
  topics: mockAdminTopics,
  configItems: mockConfigItems,
  configHistory: mockConfigHistory,
  violationRecords: mockViolationRecords,
  fortuneFlows: mockFortuneFlows,

  // ========== 审核操作 ==========
  approveReviewTask: (id, reviewer, note) => {
    set((state) => ({
      reviewTasks: state.reviewTasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'approved' as AdminReviewStatus,
              reviewer,
              reviewedAt: new Date().toISOString(),
              reviewNote: note,
            }
          : t
      ),
    }));
    get().saveToStorage();
    console.log('[AdminStore] 审核通过:', id, reviewer);
  },

  returnReviewTask: (id, reviewer, returnReason, note) => {
    set((state) => ({
      reviewTasks: state.reviewTasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'returned' as AdminReviewStatus,
              reviewer,
              reviewedAt: new Date().toISOString(),
              reviewNote: note,
              returnReason,
            }
          : t
      ),
    }));
    get().saveToStorage();
    console.log('[AdminStore] 审核退回:', id, reviewer, returnReason);
  },

  rejectReviewTask: (id, reviewer, reason, note) => {
    set((state) => ({
      reviewTasks: state.reviewTasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'rejected' as AdminReviewStatus,
              reviewer,
              reviewedAt: new Date().toISOString(),
              reviewNote: note || reason,
              returnReason: reason,
            }
          : t
      ),
    }));
    get().saveToStorage();
    console.log('[AdminStore] 审核拒绝:', id, reviewer, reason);
  },

  startReview: (id, reviewer) => {
    set((state) => ({
      reviewTasks: state.reviewTasks.map((t) =>
        t.id === id && t.status === 'pending'
          ? { ...t, status: 'reviewing' as AdminReviewStatus, reviewer }
          : t
      ),
    }));
    get().saveToStorage();
  },

  batchApprove: (ids, reviewer) => {
    set((state) => ({
      reviewTasks: state.reviewTasks.map((t) =>
        ids.includes(t.id) && (t.status === 'pending' || t.status === 'reviewing')
          ? {
              ...t,
              status: 'approved' as AdminReviewStatus,
              reviewer,
              reviewedAt: new Date().toISOString(),
              reviewNote: '批量通过',
            }
          : t
      ),
    }));
    get().saveToStorage();
    console.log('[AdminStore] 批量通过:', ids.length, '条');
  },

  batchReject: (ids, reviewer, reason) => {
    set((state) => ({
      reviewTasks: state.reviewTasks.map((t) =>
        ids.includes(t.id) && (t.status === 'pending' || t.status === 'reviewing')
          ? {
              ...t,
              status: 'rejected' as AdminReviewStatus,
              reviewer,
              reviewedAt: new Date().toISOString(),
              reviewNote: reason,
              returnReason: reason,
            }
          : t
      ),
    }));
    get().saveToStorage();
    console.log('[AdminStore] 批量拒绝:', ids.length, '条');
  },

  getReviewTasksByStatus: (status) => {
    if (status === 'all') return get().reviewTasks;
    return get().reviewTasks.filter((t) => t.status === status);
  },

  getReviewTaskById: (id) => {
    return get().reviewTasks.find((t) => t.id === id);
  },

  // ========== 用户管理操作 ==========
  banUser: (userId, reason, duration) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              accountStatus: 'banned' as AccountStatus,
              bannedAt: new Date().toISOString(),
              bannedReason: reason,
              bannedDuration: duration,
              violationCount: u.violationCount + 1,
            }
          : u
      ),
    }));
    // 添加违规记录
    const user = get().getUserById(userId);
    if (user) {
      const penaltyMap: Record<number, ViolationRecord['penalty']> = {
        0: 'ban_permanent',
        3: 'ban_3d',
        7: 'ban_7d',
      };
      const newRecord: ViolationRecord = {
        id: generateId('v'),
        userId,
        userName: user.name,
        type: 'other',
        description: reason,
        penalty: penaltyMap[duration] || 'ban_7d',
        createdAt: new Date().toISOString(),
        operator: '当前管理员',
      };
      set((state) => ({
        violationRecords: [newRecord, ...state.violationRecords],
      }));
    }
    get().saveToStorage();
    console.log('[AdminStore] 封禁用户:', userId, reason, duration);
  },

  unbanUser: (userId) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId
          ? {
              ...u,
              accountStatus: 'active' as AccountStatus,
              bannedAt: undefined,
              bannedReason: undefined,
              bannedDuration: undefined,
            }
          : u
      ),
    }));
    get().saveToStorage();
    console.log('[AdminStore] 解封用户:', userId);
  },

  markUser: (userId, markType) => {
    set((state) => ({
      users: state.users.map((u) =>
        u.id === userId ? { ...u, markType } : u
      ),
    }));
    get().saveToStorage();
    console.log('[AdminStore] 标记用户:', userId, markType);
  },

  getUserById: (userId) => {
    return get().users.find((u) => u.id === userId);
  },

  getUserKindnessHistory: (userId) => {
    return get().reviewTasks.filter((t) => t.userId === userId);
  },

  getUserFortuneFlows: (userId) => {
    return get().fortuneFlows.filter((f) => f.userId === userId);
  },

  getUserViolations: (userId) => {
    return get().violationRecords.filter((v) => v.userId === userId);
  },

  // ========== 话题管理操作 ==========
  createTopic: (topic) => {
    const id = generateId('topic');
    const now = new Date().toISOString();
    const newTopic: AdminTopic = {
      ...topic,
      id,
      kindnessCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({ topics: [...state.topics, newTopic] }));
    get().saveToStorage();
    console.log('[AdminStore] 创建话题:', id, topic.name);
    return id;
  },

  updateTopic: (id, updates) => {
    set((state) => ({
      topics: state.topics.map((t) =>
        t.id === id
          ? { ...t, ...updates, updatedAt: new Date().toISOString() }
          : t
      ),
    }));
    get().saveToStorage();
    console.log('[AdminStore] 编辑话题:', id);
  },

  onlineTopic: (id) => {
    set((state) => ({
      topics: state.topics.map((t) =>
        t.id === id
          ? { ...t, status: 'online', updatedAt: new Date().toISOString() }
          : t
      ),
    }));
    get().saveToStorage();
    console.log('[AdminStore] 上线话题:', id);
  },

  offlineTopic: (id) => {
    set((state) => ({
      topics: state.topics.map((t) =>
        t.id === id
          ? { ...t, status: 'offline', updatedAt: new Date().toISOString() }
          : t
      ),
    }));
    get().saveToStorage();
    console.log('[AdminStore] 下线话题:', id);
  },

  getTopicById: (id) => {
    return get().topics.find((t) => t.id === id);
  },

  // ========== 配置管理操作 ==========
  updateConfig: (key, value, operator, reason) => {
    const item = get().configItems.find((c) => c.key === key);
    if (!item) {
      console.error('[AdminStore] 配置项不存在:', key);
      return false;
    }
    if (!validateConfigValue(item, value)) {
      console.error('[AdminStore] 配置项取值超出范围:', key, value);
      return false;
    }
    const oldValue = item.value;
    set((state) => ({
      configItems: state.configItems.map((c) =>
        c.key === key ? { ...c, value } : c
      ),
      configHistory: [
        {
          id: generateId('hist'),
          key,
          label: item.label,
          oldValue,
          newValue: value,
          operator,
          operatedAt: new Date().toISOString(),
          reason,
        },
        ...state.configHistory,
      ],
    }));
    get().saveToStorage();
    console.log('[AdminStore] 更新配置:', key, oldValue, '->', value);
    return true;
  },

  resetConfig: (key, operator) => {
    const item = get().configItems.find((c) => c.key === key);
    if (!item) return;
    const oldValue = item.value;
    set((state) => ({
      configItems: state.configItems.map((c) =>
        c.key === key ? { ...c, value: c.defaultValue } : c
      ),
      configHistory: [
        {
          id: generateId('hist'),
          key,
          label: item.label,
          oldValue,
          newValue: item.defaultValue,
          operator,
          operatedAt: new Date().toISOString(),
          reason: '重置为默认值',
        },
        ...state.configHistory,
      ],
    }));
    get().saveToStorage();
    console.log('[AdminStore] 重置配置:', key);
  },

  getConfigByKey: (key) => {
    return get().configItems.find((c) => c.key === key);
  },

  getConfigsByCategory: (category) => {
    return get().configItems.filter((c) => c.category === category);
  },

  getConfigHistory: (limit) => {
    const history = get().configHistory;
    return limit ? history.slice(0, limit) : history;
  },

  // ========== 看板数据 ==========
  getDashboardMetric: (range) => {
    return mockDashboardData[range];
  },

  getDashboardTrend: (range) => {
    return mockDashboardTrend[range];
  },

  // ========== 持久化 ==========
  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          reviewTasks: parsed.reviewTasks || mockAdminReviewTasks,
          users: parsed.users || mockAdminUsers,
          topics: parsed.topics || mockAdminTopics,
          configItems: parsed.configItems || mockConfigItems,
          configHistory: parsed.configHistory || mockConfigHistory,
          violationRecords: parsed.violationRecords || mockViolationRecords,
          fortuneFlows: parsed.fortuneFlows || mockFortuneFlows,
        });
      }
    } catch (e) {
      console.error('[AdminStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        reviewTasks: state.reviewTasks.slice(0, 200),
        users: state.users,
        topics: state.topics,
        configItems: state.configItems,
        configHistory: state.configHistory.slice(0, 100),
        violationRecords: state.violationRecords.slice(0, 200),
        fortuneFlows: state.fortuneFlows,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[AdminStore] Save to storage failed:', e);
    }
  },
}));
