import { create } from 'zustand';
import Taro from '@tarojs/taro';

const STORAGE_KEY = 'haoshi_checkin_store';
const TASKS_KEY = 'haoshi_checkin_tasks';

// ============================================
// N3 打卡系统
// ============================================

// 三类少年善行打卡品类
export type CheckinCategory = 'warm' | 'growth' | 'positive';

// 品类中文名和图标
export const CATEGORY_INFO: Record<CheckinCategory, { name: string; icon: string; color: string }> = {
  warm: { name: '温暖的事', icon: '🔥', color: '#FF6B6B' },
  growth: { name: '成长的事', icon: '🌱', color: '#52C41A' },
  positive: { name: '正能量的事', icon: '⚡', color: '#FAAD14' },
};

// 子分类
export const SUBCATEGORIES: Record<CheckinCategory, string[]> = {
  // 温暖的事：家务劳动/帮助同学/关心长辈/照顾小动物/对陌生人释放善意
  warm: ['家务劳动', '帮助同学', '关心长辈', '照顾小动物', '对陌生人释放善意'],
  // 成长的事：阅读打卡/学会新技能/克服恐惧/坚持成就/承认错误
  growth: ['阅读打卡', '学会新技能', '克服恐惧', '坚持成就', '承认错误'],
  // 正能量的事：运动/环保/节约/给他人鼓励/感恩表达
  positive: ['运动', '环保', '节约', '给他人鼓励', '感恩表达'],
};

// 内容载体类型
export type ContentType = 'text' | 'image' | 'video';

// 可见范围（复用 N2 三级可见范围）
export type CheckinVisibility = 'private' | 'circle' | 'public';

// 打卡记录
export interface CheckinRecord {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  circleId?: string; // 团体可见时所属团体
  category: CheckinCategory;
  subcategory: string;
  contentType: ContentType;
  content: string; // 文字内容
  images?: string[];
  video?: string;
  videoThumb?: string;
  aiSummary?: string; // AI自动摘要（视频/图片上传后生成）
  visibility: CheckinVisibility;
  streakDays: number; // 连续打卡天数
  createdAt: string;
  date: string; // YYYY-MM-DD，用于按日去重
}

// 打卡任务（管理员创建）
export interface CheckinTask {
  id: string;
  circleId: string; // 所属团体
  title: string; // 任务标题，如"每日阅读30分钟"
  description?: string;
  category: CheckinCategory;
  subcategory?: string;
  frequency: 'daily' | 'weekly' | 'custom'; // 频率
  customDays?: number; // 自定义频率（每N天一次）
  startDate: string; // 起始日期
  endDate?: string; // 结束日期（可选）
  isActive: boolean; // 是否启用
  createdBy: string; // 创建者用户ID
  createdAt: string;
  // 完成统计
  totalCompletions: number; // 总完成次数
  participantCount: number; // 参与人数
}

// Mock 打卡任务
const mockTasks: CheckinTask[] = [
  {
    id: 'task1',
    circleId: 'circle1',
    title: '每日阅读30分钟',
    description: '坚持每天阅读，让心灵成长',
    category: 'growth',
    subcategory: '阅读打卡',
    frequency: 'daily',
    startDate: '2026-06-01',
    isActive: true,
    createdBy: 'currentUser',
    createdAt: '2026-06-01T00:00:00Z',
    totalCompletions: 128,
    participantCount: 32,
  },
  {
    id: 'task2',
    circleId: 'circle1',
    title: '每日运动打卡',
    description: '运动让生活更美好',
    category: 'positive',
    subcategory: '运动',
    frequency: 'daily',
    startDate: '2026-06-01',
    isActive: true,
    createdBy: 'currentUser',
    createdAt: '2026-06-01T00:00:00Z',
    totalCompletions: 96,
    participantCount: 28,
  },
  {
    id: 'task3',
    circleId: 'circle1',
    title: '每周家务劳动',
    description: '帮助家人做力所能及的家务',
    category: 'warm',
    subcategory: '家务劳动',
    frequency: 'weekly',
    startDate: '2026-06-01',
    isActive: true,
    createdBy: 'currentUser',
    createdAt: '2026-06-01T00:00:00Z',
    totalCompletions: 45,
    participantCount: 35,
  },
];

// Mock 打卡记录
const mockRecords: CheckinRecord[] = [
  {
    id: 'ck1',
    userId: 'currentUser',
    userName: '温暖小太阳',
    userAvatar: 'https://picsum.photos/id/64/200/200',
    circleId: 'circle1',
    category: 'growth',
    subcategory: '阅读打卡',
    contentType: 'text',
    content: '今天阅读了《小王子》第三章，感受到了爱与责任的真谛',
    visibility: 'circle',
    streakDays: 7,
    createdAt: '2026-06-22T08:00:00Z',
    date: '2026-06-22',
  },
  {
    id: 'ck2',
    userId: 'u2',
    userName: '小明',
    userAvatar: 'https://picsum.photos/id/65/200/200',
    circleId: 'circle1',
    category: 'warm',
    subcategory: '家务劳动',
    contentType: 'image',
    content: '今天帮妈妈洗碗，妈妈很开心',
    images: ['https://picsum.photos/id/100/400/300'],
    aiSummary: '图中显示一位少年正在厨房洗碗，水龙头流水，碗碟整齐摆放',
    visibility: 'circle',
    streakDays: 3,
    createdAt: '2026-06-22T07:30:00Z',
    date: '2026-06-22',
  },
  {
    id: 'ck3',
    userId: 'u3',
    userName: '小红',
    userAvatar: 'https://picsum.photos/id/66/200/200',
    circleId: 'circle1',
    category: 'positive',
    subcategory: '运动',
    contentType: 'video',
    content: '今天跑了3公里，坚持就是胜利',
    video: 'https://example.com/video.mp4',
    videoThumb: 'https://picsum.photos/id/101/400/300',
    aiSummary: '视频中显示在公园晨跑，环境优美，跑步姿势标准',
    visibility: 'circle',
    streakDays: 5,
    createdAt: '2026-06-21T18:00:00Z',
    date: '2026-06-21',
  },
];

interface CheckinState {
  records: CheckinRecord[];
  tasks: CheckinTask[];

  // 打卡操作
  addCheckin: (record: Omit<CheckinRecord, 'id' | 'createdAt' | 'date' | 'streakDays'>) => string;
  getCheckinById: (id: string) => CheckinRecord | undefined;
  getUserCheckins: (userId: string) => CheckinRecord[];
  getCircleCheckins: (circleId: string) => CheckinRecord[];
  getTodayCheckin: (userId: string, category: CheckinCategory, subcategory: string) => CheckinRecord | undefined;
  getUserStreak: (userId: string, category?: CheckinCategory) => number;

  // AI 摘要（模拟）
  generateAISummary: (contentType: ContentType, mediaPath?: string, text?: string) => Promise<string>;

  // 任务管理（管理员）
  createTask: (task: Omit<CheckinTask, 'id' | 'createdAt' | 'totalCompletions' | 'participantCount'>) => string;
  updateTask: (taskId: string, updates: Partial<CheckinTask>) => void;
  closeTask: (taskId: string) => void;
  getCircleTasks: (circleId: string) => CheckinTask[];
  getTaskCompletionRate: (taskId: string) => number;

  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// 获取今天的日期字符串
const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

// 获取昨天的日期字符串
const getYesterday = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

// 计算连续打卡天数
const calculateStreak = (
  records: CheckinRecord[],
  userId: string,
  category?: CheckinCategory
): number => {
  const userRecords = records
    .filter(r => r.userId === userId && (!category || r.category === category))
    .sort((a, b) => b.date.localeCompare(a.date));

  if (userRecords.length === 0) return 0;

  const today = getToday();
  const yesterday = getYesterday();

  // 如果今天和昨天都没打卡，连续天数为0
  if (userRecords[0].date !== today && userRecords[0].date !== yesterday) {
    return 0;
  }

  let streak = 1;
  for (let i = 1; i < userRecords.length; i++) {
    const prev = new Date(userRecords[i - 1].date);
    const curr = new Date(userRecords[i].date);
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
    } else if (diff === 0) {
      // 同日多条记录，跳过继续
      continue;
    } else {
      break;
    }
  }
  return streak;
};

export const useCheckinStore = create<CheckinState>((set, get) => ({
  records: mockRecords,
  tasks: mockTasks,

  addCheckin: (record) => {
    const id = `ck_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const today = getToday();
    const streakDays = calculateStreak(get().records, record.userId, record.category);
    // 检查今天是否已有同品类打卡，避免 streakDays 虚增
    const hasTodayCheckin = get().records.some(
      r => r.userId === record.userId && r.date === today && r.category === record.category
    );

    const newRecord: CheckinRecord = {
      ...record,
      id,
      createdAt: new Date().toISOString(),
      date: today,
      streakDays: hasTodayCheckin ? streakDays : streakDays + 1,
    };

    set(state => ({ records: [newRecord, ...state.records] }));

    // 更新任务完成统计
    if (record.circleId) {
      const tasks = get().tasks;
      const matchingTask = tasks.find(t =>
        t.circleId === record.circleId &&
        t.category === record.category &&
        t.isActive &&
        (!t.subcategory || t.subcategory === record.subcategory)
      );
      if (matchingTask) {
        set(state => ({
          tasks: state.tasks.map(t =>
            t.id === matchingTask.id
              ? { ...t, totalCompletions: t.totalCompletions + 1 }
              : t
          )
        }));
      }
    }

    get().saveToStorage();
    return id;
  },

  getCheckinById: (id) => {
    return get().records.find(r => r.id === id);
  },

  getUserCheckins: (userId) => {
    return get().records
      .filter(r => r.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getCircleCheckins: (circleId) => {
    return get().records
      .filter(r => r.circleId === circleId && r.visibility === 'circle')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getTodayCheckin: (userId, category, subcategory) => {
    const today = getToday();
    return get().records.find(
      r => r.userId === userId &&
      r.date === today &&
      r.category === category &&
      r.subcategory === subcategory
    );
  },

  getUserStreak: (userId, category) => {
    return calculateStreak(get().records, userId, category);
  },

  // AI 自动摘要（模拟）：视频/图片上传后自动生成文字摘要
  generateAISummary: async (contentType, _mediaPath, text) => {
    // 模拟 AI 处理延迟
    await new Promise(resolve => setTimeout(resolve, 800));

    if (contentType === 'video') {
      const summaries = [
        '视频中记录了温暖的善行瞬间，画面清晰，情感真挚',
        '视频展示了善行过程，参与者态度认真，值得鼓励',
        '视频内容积极向上，记录了美好的成长时刻',
        '视频中可见少年正在认真完成打卡任务，环境明亮',
      ];
      return summaries[Math.floor(Math.random() * summaries.length)];
    }

    if (contentType === 'image') {
      const summaries = [
        '图片中可见温暖的善行场景，色彩明亮',
        '照片记录了善行瞬间，画面构图自然',
        '图片展示了善行成果，细节清晰可见',
        '照片中的场景充满正能量，氛围温馨',
      ];
      return summaries[Math.floor(Math.random() * summaries.length)];
    }

    // 文字内容：基于用户输入生成摘要
    if (text && text.length > 20) {
      return text.slice(0, 30) + '...';
    }
    return text || '记录了一件温暖的善事';
  },

  createTask: (task) => {
    const id = `task_${Date.now()}`;
    const newTask: CheckinTask = {
      ...task,
      id,
      createdAt: new Date().toISOString(),
      totalCompletions: 0,
      participantCount: 0,
    };
    set(state => ({ tasks: [...state.tasks, newTask] }));
    get().saveToStorage();
    return id;
  },

  updateTask: (taskId, updates) => {
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, ...updates } : t
      )
    }));
    get().saveToStorage();
  },

  closeTask: (taskId) => {
    set(state => ({
      tasks: state.tasks.map(t =>
        t.id === taskId ? { ...t, isActive: false } : t
      )
    }));
    get().saveToStorage();
  },

  getCircleTasks: (circleId) => {
    return get().tasks.filter(t => t.circleId === circleId);
  },

  getTaskCompletionRate: (taskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task || task.participantCount === 0) return 0;
    return Math.min(100, Math.round((task.totalCompletions / task.participantCount) * 100));
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.records) {
          set({ records: parsed.records });
        }
      }
      const tasksData = Taro.getStorageSync(TASKS_KEY);
      if (tasksData) {
        const parsed = JSON.parse(tasksData);
        if (parsed.tasks && parsed.tasks.length > 0) {
          set({ tasks: parsed.tasks });
        }
      }
    } catch (e) {
      console.error('[CheckinStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const { records, tasks } = get();
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({ records }));
      Taro.setStorageSync(TASKS_KEY, JSON.stringify({ tasks }));
    } catch (e) {
      console.error('[CheckinStore] Save to storage failed:', e);
    }
  },
}));
