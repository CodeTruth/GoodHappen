import { create } from 'zustand';
import Taro from '@tarojs/taro';

const STORAGE_KEY = 'haoshi_moderation_store';

// AI初审结果
export type AIResult = 'needs_modification' | 'rejected';

// 复审状态
export type ModerationStatus = 'pending' | 'reviewing' | 'approved' | 'rejected';

// 复审任务
export interface ModerationTask {
  id: string;
  // 关联的内容ID（善行记录ID）
  contentId: string;
  // 待复审的内容
  content: string;
  // AI初审结果
  aiResult: AIResult;
  // AI置信度（0-1）
  aiConfidence: number;
  // AI给出的理由
  aiReason?: string;
  // 当前复审状态
  status: ModerationStatus;
  // 复审人（模拟）
  reviewer?: string;
  // 复审时间
  reviewedAt?: string;
  // 复审备注
  reviewNote?: string;
  // 创建时间
  createdAt: string;
}

interface ModerationState {
  // 复审任务队列
  tasks: ModerationTask[];

  // 添加复审任务
  addTask: (task: Omit<ModerationTask, 'id' | 'status' | 'createdAt'>) => string;
  // 开始复审（标记为reviewing）
  startReview: (id: string, reviewer: string) => void;
  // 通过复审
  approveTask: (id: string, reviewer: string, note?: string) => void;
  // 拒绝复审
  rejectTask: (id: string, reviewer: string, note?: string) => void;
  // 获取待复审任务
  getPendingTasks: () => ModerationTask[];
  // 获取指定任务
  getTaskById: (id: string) => ModerationTask | undefined;
  // 获取指定内容的复审任务
  getTaskByContentId: (contentId: string) => ModerationTask | undefined;
  // 删除任务
  removeTask: (id: string) => void;
  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// 生成唯一ID
const generateId = (): string => {
  return `mod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const useModerationStore = create<ModerationState>((set, get) => ({
  tasks: [],

  addTask: (task) => {
    const id = generateId();
    const newTask: ModerationTask = {
      ...task,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      tasks: [newTask, ...state.tasks],
    }));
    get().saveToStorage();
    return id;
  },

  startReview: (id, reviewer) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id && t.status === 'pending'
          ? { ...t, status: 'reviewing', reviewer }
          : t
      ),
    }));
    get().saveToStorage();
  },

  approveTask: (id, reviewer, note) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'approved' as ModerationStatus,
              reviewer,
              reviewedAt: new Date().toISOString(),
              reviewNote: note,
            }
          : t
      ),
    }));
    get().saveToStorage();
  },

  rejectTask: (id, reviewer, note) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: 'rejected' as ModerationStatus,
              reviewer,
              reviewedAt: new Date().toISOString(),
              reviewNote: note,
            }
          : t
      ),
    }));
    get().saveToStorage();
  },

  getPendingTasks: () => {
    return get().tasks.filter((t) => t.status === 'pending' || t.status === 'reviewing');
  },

  getTaskById: (id) => {
    return get().tasks.find((t) => t.id === id);
  },

  getTaskByContentId: (contentId) => {
    return get().tasks.find((t) => t.contentId === contentId);
  },

  removeTask: (id) => {
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
    }));
    get().saveToStorage();
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({ tasks: parsed.tasks || [] });
      }
    } catch (e) {
      console.error('[ModerationStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      // 只保留最近200条
      const data = {
        tasks: state.tasks.slice(0, 200),
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[ModerationStore] Save to storage failed:', e);
    }
  },
}));
