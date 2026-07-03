// ============================================
// 新手行善任务流（3天引导）数据定义
// ============================================

export interface DailyTask {
  id: string;
  day: number;
  title: string;
  description: string;
  icon: string;
  rewardFortune: number;
  isCompleted: boolean;
}

// 3天新手引导任务
export const onboardingDailyTasks: DailyTask[] = [
  {
    id: 'day1',
    day: 1,
    title: '见证温暖',
    description: '你今天看到有人做了好事吗？记录下这一刻',
    icon: '👀',
    rewardFortune: 50,
    isCompleted: false,
  },
  {
    id: 'day2',
    day: 2,
    title: '善行设想',
    description: '你有什么想做的善事？写下来',
    icon: '💭',
    rewardFortune: 30,
    isCompleted: false,
  },
  {
    id: 'day3',
    day: 3,
    title: '帮个小忙',
    description: '帮身边人做一件小事，记录下来',
    icon: '🤝',
    rewardFortune: 80,
    isCompleted: false,
  },
];