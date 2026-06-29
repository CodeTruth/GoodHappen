export interface FortuneLevel {
  level: number;          // 等级编号 1-10
  name: string;           // 等级名称
  icon: string;           // 表情图标
  minFortune: number;     // 所需最低福气值
  color: string;          // 主题色
  description: string;    // 等级描述
  privilege: string;      // 特权说明
}

export const FORTUNE_LEVELS: FortuneLevel[] = [
  {
    level: 1,
    name: '微光初现',
    icon: '🕯️',
    minFortune: 0,
    color: '#9E8E7E',
    description: '一点善意，如烛火初燃',
    privilege: '每日可记录5件善行',
  },
  {
    level: 2,
    name: '星火燎原',
    icon: '✨',
    minFortune: 50,
    color: '#C4956A',
    description: '星星之火，可以燎原',
    privilege: '解锁善行圈分享',
  },
  {
    level: 3,
    name: '暖阳初升',
    icon: '🌅',
    minFortune: 150,
    color: '#D4A76A',
    description: '温暖如晨光，照亮一方',
    privilege: '解锁专属称号',
  },
  {
    level: 4,
    name: '春风化雨',
    icon: '🌧️',
    minFortune: 300,
    color: '#7B9E87',
    description: '润物无声，泽被四方',
    privilege: '每日福气上限提升至80',
  },
  {
    level: 5,
    name: '灯火万家',
    icon: '🏮',
    minFortune: 500,
    color: '#D4534A',
    description: '万家灯火，因你而明',
    privilege: '解锁温暖伙伴匹配',
  },
  {
    level: 6,
    name: '厚德载物',
    icon: '🏔️',
    minFortune: 800,
    color: '#8B6914',
    description: '地势坤，君子以厚德载物',
    privilege: '解锁AI人物深度对话',
  },
  {
    level: 7,
    name: '上善若水',
    icon: '💧',
    minFortune: 1200,
    color: '#4A90A4',
    description: '水善利万物而不争',
    privilege: '解锁年度善行报告',
  },
  {
    level: 8,
    name: '大爱无疆',
    icon: '🌏',
    minFortune: 1800,
    color: '#C4956A',
    description: '爱无边界，善行天下',
    privilege: '解锁公益悬赏发布',
  },
  {
    level: 9,
    name: '慈航普度',
    icon: '🛕',
    minFortune: 2500,
    color: '#D4534A',
    description: '慈悲为怀，普度众生',
    privilege: '获得"善行大使"认证标识',
  },
  {
    level: 10,
    name: '功德圆满',
    icon: '🌟',
    minFortune: 3500,
    color: '#B8860B',
    description: '积善成德，功到自然成',
    privilege: '解锁全部功能，进入名人堂',
  },
];

/**
 * 根据福气值获取当前等级
 */
export function getLevelByFortune(fortune: number): FortuneLevel {
  for (let i = FORTUNE_LEVELS.length - 1; i >= 0; i--) {
    if (fortune >= FORTUNE_LEVELS[i].minFortune) {
      return FORTUNE_LEVELS[i];
    }
  }
  return FORTUNE_LEVELS[0];
}

/**
 * 获取下一级信息及进度
 */
export function getLevelProgress(fortune: number): {
  current: FortuneLevel;
  next: FortuneLevel | null;
  progress: number; // 0-100
  remaining: number;
} {
  const current = getLevelByFortune(fortune);
  const currentIndex = FORTUNE_LEVELS.findIndex(l => l.level === current.level);
  const next = currentIndex < FORTUNE_LEVELS.length - 1
    ? FORTUNE_LEVELS[currentIndex + 1]
    : null;

  if (!next) {
    return { current, next: null, progress: 100, remaining: 0 };
  }

  const range = next.minFortune - current.minFortune;
  const earned = fortune - current.minFortune;
  const progress = Math.min(100, Math.floor((earned / range) * 100));

  return {
    current,
    next,
    progress,
    remaining: next.minFortune - fortune,
  };
}
