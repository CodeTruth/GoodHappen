import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { useFortuneStore } from '@/store/fortune';

const STORAGE_KEY = 'haoshi_onboarding_store';

// ============================================
// Phase 10 - H2 新手引导任务 Store
// ============================================

// 新手任务ID
export type OnboardingTaskId =
  | 'first_kindness'      // 完成第一条善行记录
  | 'choose_persona'      // 选择偏好的AI人设
  | 'complete_profile'    // 完善个人资料
  | 'like_square'         // 浏览善行广场并点赞
  | 'first_charity';      // 完成第一单公益接单

// 新手任务定义
export interface OnboardingTask {
  id: OnboardingTaskId;
  title: string;          // 任务标题
  description: string;    // 任务描述
  icon: string;           // 图标
  reward: number;         // 单任务福气奖励
  targetPath: string;     // 跳转路径
  completed: boolean;     // 是否完成
  completedAt?: string;   // 完成时间
}

// 全部完成后的额外奖励
const ALL_COMPLETED_BONUS = 50;

// 默认新手任务列表
const defaultTasks: OnboardingTask[] = [
  {
    id: 'first_kindness',
    title: '记录第一件善行',
    description: '体验核心流程，记录今天发生的温暖小事',
    icon: '📝',
    reward: 10,
    targetPath: '/pages/record/index',
    completed: false,
  },
  {
    id: 'choose_persona',
    title: '选择AI人设',
    description: '建立个性化连接，挑选你喜欢的AI共鸣伙伴',
    icon: '🎭',
    reward: 5,
    targetPath: '/pages/profile-edit/index',
    completed: false,
  },
  {
    id: 'complete_profile',
    title: '完善个人资料',
    description: '填写昵称、头像和地区，提升社区归属感',
    icon: '👤',
    reward: 5,
    targetPath: '/pages/profile-edit/index',
    completed: false,
  },
  {
    id: 'like_square',
    title: '善行广场点赞',
    description: '浏览善行广场，为温暖瞬间点赞',
    icon: '❤️',
    reward: 5,
    targetPath: '/pages/circle/index',
    completed: false,
  },
  {
    id: 'first_charity',
    title: '完成公益接单',
    description: '体验公益互助，接下第一单公益需求',
    icon: '🤝',
    reward: 15,
    targetPath: '/pages/charity-record/index',
    completed: false,
  },
];

interface OnboardingState {
  // 是否首次打开（用于自动展示）
  isFirstOpen: boolean;
  // 是否已完成全部新手任务（不再自动展示）
  allCompleted: boolean;
  // 任务列表
  tasks: OnboardingTask[];

  // 标记任务完成
  completeTask: (taskId: OnboardingTaskId) => void;
  // 获取任务进度
  getProgress: () => { completed: number; total: number; reward: number };
  // 跳转到任务路径
  navigateToTask: (taskId: OnboardingTaskId) => void;
  // 关闭新手引导（不再自动展示）
  dismissOnboarding: () => void;
  // 检查并发送完成奖励
  checkAllCompleted: () => boolean;
  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  isFirstOpen: true,
  allCompleted: false,
  tasks: defaultTasks.map(t => ({ ...t })),

  // 标记任务完成
  completeTask: (taskId) => {
    const state = get();
    if (state.tasks.find(t => t.id === taskId)?.completed) return;

    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const updatedTasks = state.tasks.map(t =>
      t.id === taskId
        ? { ...t, completed: true, completedAt: new Date().toISOString() }
        : t
    );

    set({ tasks: updatedTasks });

    // 发放单任务福气奖励
    const fortuneStore = useFortuneStore.getState();
    fortuneStore.addFortune(task.reward, `新手任务完成：${task.title}`);

    get().saveToStorage();
    Taro.showToast({ title: `+${task.reward}福气`, icon: 'success' });

    // 检查是否全部完成
    get().checkAllCompleted();
  },

  // 获取任务进度
  getProgress: () => {
    const { tasks } = get();
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const reward = tasks.filter(t => t.completed).reduce((sum, t) => sum + t.reward, 0);
    return { completed, total, reward };
  },

  // 跳转到任务路径
  navigateToTask: (taskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;
    Taro.navigateTo({ url: task.targetPath });
  },

  // 关闭新手引导
  dismissOnboarding: () => {
    set({ isFirstOpen: false });
    get().saveToStorage();
  },

  // 检查是否全部完成
  checkAllCompleted: () => {
    const state = get();
    const allDone = state.tasks.every(t => t.completed);
    if (allDone && !state.allCompleted) {
      set({ allCompleted: true, isFirstOpen: false });
      // 发放额外福气奖励
      const fortuneStore = useFortuneStore.getState();
      fortuneStore.addFortune(ALL_COMPLETED_BONUS, '新手任务全部完成奖励');
      get().saveToStorage();
      Taro.showModal({
        title: '🎉 恭喜完成全部新手任务',
        content: `你已熟悉好事发生的核心玩法，额外获得 ${ALL_COMPLETED_BONUS} 福气奖励！`,
        showCancel: false,
      });
      return true;
    }
    return false;
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // 合并任务（保留最新的任务定义，但同步完成状态）
        const mergedTasks = defaultTasks.map(defaultTask => {
          const stored = parsed.tasks?.find((t: OnboardingTask) => t.id === defaultTask.id);
          return stored ? { ...defaultTask, completed: stored.completed, completedAt: stored.completedAt } : { ...defaultTask };
        });
        set({
          isFirstOpen: parsed.isFirstOpen !== false,
          allCompleted: parsed.allCompleted || false,
          tasks: mergedTasks,
        });
      }
    } catch (e) {
      console.error('[OnboardingStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        isFirstOpen: state.isFirstOpen,
        allCompleted: state.allCompleted,
        tasks: state.tasks,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[OnboardingStore] Save to storage failed:', e);
    }
  },
}));
