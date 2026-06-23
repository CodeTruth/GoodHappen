// 温暖聚合统计类型定义

export interface NationalStats {
  todayParticipants: number; // 今日参与人数
  todayKindnessCount: number; // 今日善行总量
  weeklyFortune: number; // 本周累计温暖值
  monthlyFortune: number; // 本月温暖值
  lastUpdate: string; // 最后更新时间
}

export interface RegionalStats {
  region: string; // 区域名称（省份/城市）
  todayParticipants: number; // 今日参与人数
  todayKindnessCount: number; // 今日善行总量
  weeklyFortune: number; // 本周温暖值
}

export interface TopicStats {
  topic: string; // 话题名称
  count: number; // 善行数量
  fortune: number; // 温暖值
  trend: 'up' | 'stable' | 'down'; // 趋势
}

// Mock 全国统计数据
export const mockNationalStats: NationalStats = {
  todayParticipants: 12856,
  todayKindnessCount: 3421,
  weeklyFortune: 45680,
  monthlyFortune: 198320,
  lastUpdate: '2024-06-22T10:30:00Z'
};

// Mock 区域统计数据
export const mockRegionalStats: RegionalStats[] = [
  { region: '成都', todayParticipants: 328, todayKindnessCount: 96, weeklyFortune: 2340 },
  { region: '北京', todayParticipants: 512, todayKindnessCount: 145, weeklyFortune: 3680 },
  { region: '上海', todayParticipants: 478, todayKindnessCount: 132, weeklyFortune: 3120 },
  { region: '广州', todayParticipants: 389, todayKindnessCount: 108, weeklyFortune: 2780 },
  { region: '深圳', todayParticipants: 421, todayKindnessCount: 119, weeklyFortune: 3010 },
  { region: '杭州', todayParticipants: 256, todayKindnessCount: 78, weeklyFortune: 1980 },
  { region: '武汉', todayParticipants: 198, todayKindnessCount: 62, weeklyFortune: 1560 },
  { region: '西安', todayParticipants: 167, todayKindnessCount: 51, weeklyFortune: 1320 }
];

// Mock 话题统计数据
export const mockTopicStats: TopicStats[] = [
  { topic: '助人', count: 1280, fortune: 15360, trend: 'up' },
  { topic: '邻里互助', count: 892, fortune: 10704, trend: 'up' },
  { topic: '环保', count: 654, fortune: 7848, trend: 'stable' },
  { topic: '陪伴', count: 523, fortune: 6276, trend: 'up' },
  { topic: '志愿服务', count: 412, fortune: 4944, trend: 'down' },
  { topic: '动物保护', count: 287, fortune: 3444, trend: 'stable' },
  { topic: '孝亲', count: 256, fortune: 3072, trend: 'up' },
  { topic: '公益', count: 198, fortune: 2376, trend: 'stable' }
];

// 获取全国统计
export const getNationalStats = (): NationalStats => {
  return mockNationalStats;
};

// 获取区域统计
export const getRegionalStats = (): RegionalStats[] => {
  return mockRegionalStats;
};

// 获取话题统计
export const getTopicStats = (): TopicStats[] => {
  return mockTopicStats;
};

// 隐私保护：参与人数 < 10 时的展示文案
export const formatParticipantCount = (count: number): string => {
  if (count < 10) {
    return '温暖正在发生…';
  }
  return `${count}`;
};
