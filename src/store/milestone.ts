import { create } from 'zustand';
import Taro from '@tarojs/taro';

const MILESTONE_STORAGE_KEY = 'haoshi_milestones_triggered';

// 里程碑类型
export type MilestoneType =
  | 'first_kindness'        // 第1件善行
  | 'ten_kindness'          // 第10件
  | 'hundred_kindness'      // 第100件
  | 'streak_7'              // 连续7天
  | 'streak_30'             // 连续30天
  | 'streak_365';           // 连续365天

// 里程碑定义
export interface MilestoneDef {
  type: MilestoneType;
  title: string;
  desc: string;
  icon: string;
}

// 所有里程碑定义（不排名，只标记"你达成了"）
export const MILESTONES: MilestoneDef[] = [
  {
    type: 'first_kindness',
    title: '温暖的第一步',
    desc: '你记录了第一件善行，世界因你而温暖了一点。',
    icon: '🌱',
  },
  {
    type: 'ten_kindness',
    title: '温暖×10',
    desc: '10件善行，已是涓涓细流。',
    icon: '🌟',
  },
  {
    type: 'hundred_kindness',
    title: '温暖×100',
    desc: '100件善行，你已是身边的暖阳。',
    icon: '☀️',
  },
  {
    type: 'streak_7',
    title: '习惯初成',
    desc: '连续7天记录善行，习惯正在生根。',
    icon: '🔥',
  },
  {
    type: 'streak_30',
    title: '温暖已成日常',
    desc: '连续30天，善行已是你的日常。',
    icon: '🌸',
  },
  {
    type: 'streak_365',
    title: '一年又一年',
    desc: '连续365天，温暖已是你的底色。',
    icon: '🌙',
  },
];

interface MilestoneState {
  // 已触发的里程碑类型列表
  triggered: MilestoneType[];
  // 当前待展示的里程碑（一次只展示一个）
  pending: MilestoneDef | null;

  // 初始化加载已触发记录
  loadTriggered: () => void;
  // 检查并触发应达成的里程碑（传入累计善行数和当前连续天数）
  checkAndTrigger: (totalKindness: number, currentStreak: number) => void;
  // 标记已展示
  markShown: () => void;
  // 关闭当前弹窗
  dismiss: () => void;
  // 内部：触发某个里程碑
  trigger: (def: MilestoneDef) => void;
}

// 读取已触发记录
const readTriggered = (): MilestoneType[] => {
  try {
    const raw = Taro.getStorageSync(MILESTONE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[Milestone] readTriggered failed:', e);
    return [];
  }
};

// 写入已触发记录
const writeTriggered = (list: MilestoneType[]): void => {
  try {
    Taro.setStorageSync(MILESTONE_STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('[Milestone] writeTriggered failed:', e);
  }
};

export const useMilestoneStore = create<MilestoneState>((set, get) => ({
  triggered: [],
  pending: null,

  loadTriggered: () => {
    set({ triggered: readTriggered() });
  },

  trigger: (def) => {
    // 一次性事件：已触发过则不再触发
    if (get().triggered.includes(def.type)) return;
    const next = [...get().triggered, def.type];
    writeTriggered(next);
    set({ triggered: next, pending: def });
  },

  checkAndTrigger: (totalKindness, currentStreak) => {
    const triggered = get().triggered;
    // 优先级：从大到小检查，避免连续弹出多个
    // 善行数里程碑
    if (totalKindness >= 100 && !triggered.includes('hundred_kindness')) {
      const def = MILESTONES.find(m => m.type === 'hundred_kindness')!;
      get().trigger(def);
      return;
    }
    if (totalKindness >= 10 && !triggered.includes('ten_kindness')) {
      const def = MILESTONES.find(m => m.type === 'ten_kindness')!;
      get().trigger(def);
      return;
    }
    if (totalKindness >= 1 && !triggered.includes('first_kindness')) {
      const def = MILESTONES.find(m => m.type === 'first_kindness')!;
      get().trigger(def);
      return;
    }
    // 连续天数里程碑
    if (currentStreak >= 365 && !triggered.includes('streak_365')) {
      const def = MILESTONES.find(m => m.type === 'streak_365')!;
      get().trigger(def);
      return;
    }
    if (currentStreak >= 30 && !triggered.includes('streak_30')) {
      const def = MILESTONES.find(m => m.type === 'streak_30')!;
      get().trigger(def);
      return;
    }
    if (currentStreak >= 7 && !triggered.includes('streak_7')) {
      const def = MILESTONES.find(m => m.type === 'streak_7')!;
      get().trigger(def);
      return;
    }
  },

  markShown: () => {
    set({ pending: null });
  },

  dismiss: () => {
    set({ pending: null });
  },
}));
