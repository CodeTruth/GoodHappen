import { CredibilityLevel } from '@/services/kindness';
import { FORTUNE_LEVELS, FortuneLevel } from '@/data/fortune-levels';

interface FortuneCalculationInput {
  content: string;
  type: 'self' | 'witness';
  tags: string[];
  imageCount: number;
  hasVideo: boolean;
  credibilityLevel: CredibilityLevel;
  streakDays: number;
  likes: number;
  comments: number;
}

interface FortuneResult {
  baseScore: number;
  typeMultiplier: number;
  trustMultiplier: number;
  streakMultiplier: number;
  bonusLikes: number;
  bonusComments: number;
  total: number;
}

const BASE_SCORES = {
  textShort: 5,
  textLong: 8,
  textWithImages1_3: 8,
  textWithImages4_9: 10,
  textWithVideo: 10,
  emojiShort: 3
};

const TYPE_MULTIPLIERS: Record<string, number> = {
  '扶老助残': 1.2,
  '志愿服务': 1.15,
  '环保': 1.1,
  '动物保护': 1.1,
  '捐款': 1.0,
  '捐物': 1.0,
  '日常小善': 1.0,
  '让座': 1.0,
  '指路': 1.0,
  '拾金不昧': 1.0,
  '孝亲': 1.0,
  '助人': 1.0,
  '公益': 1.0,
  '邻里互助': 1.0,
  '关怀': 1.0,
  '工作': 1.0,
  '亲子': 1.0
};

const TRUST_MULTIPLIERS: Record<CredibilityLevel, number> = {
  high: 1.2,
  medium: 1.0,
  low: 0.5,
  suspicious: 0
};

const STREAK_MULTIPLIERS = [
  { minDays: 1, maxDays: 6, multiplier: 1.0 },
  { minDays: 7, maxDays: 13, multiplier: 1.05 },
  { minDays: 14, maxDays: 29, multiplier: 1.1 },
  { minDays: 30, maxDays: Infinity, multiplier: 1.15 }
];

const SINGLE_MAX_FORTUNE = 30;
const LIKE_BONUS_THRESHOLD = 3;
const COMMENT_BONUS_THRESHOLD = 2;
const LIKE_BONUS_MAX = 5;
const COMMENT_BONUS_MAX = 3;

export const calculateFortune = (input: FortuneCalculationInput): FortuneResult => {
  if (input.type === 'witness') {
    return {
      baseScore: 0,
      typeMultiplier: 1.0,
      trustMultiplier: 1.0,
      streakMultiplier: 1.0,
      bonusLikes: 0,
      bonusComments: 0,
      total: 0
    };
  }

  if (input.credibilityLevel === 'suspicious') {
    return {
      baseScore: 0,
      typeMultiplier: 0,
      trustMultiplier: 0,
      streakMultiplier: 0,
      bonusLikes: 0,
      bonusComments: 0,
      total: 0
    };
  }

  const contentLength = input.content.length;
  let baseScore = BASE_SCORES.textShort;

  if (input.hasVideo) {
    baseScore = BASE_SCORES.textWithVideo;
  } else if (input.imageCount >= 4) {
    baseScore = BASE_SCORES.textWithImages4_9;
  } else if (input.imageCount >= 1) {
    baseScore = BASE_SCORES.textWithImages1_3;
  } else if (contentLength >= 50) {
    baseScore = BASE_SCORES.textLong;
  } else if (contentLength < 20 && /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/u.test(input.content)) {
    baseScore = BASE_SCORES.emojiShort;
  }

  let typeMultiplier = 0.9;
  for (const tag of input.tags) {
    const multiplier = TYPE_MULTIPLIERS[tag];
    if (multiplier && multiplier > typeMultiplier) {
      typeMultiplier = multiplier;
    }
  }

  const trustMultiplier = TRUST_MULTIPLIERS[input.credibilityLevel];

  let streakMultiplier = 1.0;
  for (const range of STREAK_MULTIPLIERS) {
    if (input.streakDays >= range.minDays && input.streakDays <= range.maxDays) {
      streakMultiplier = range.multiplier;
      break;
    }
  }

  const bonusLikes = Math.min(
    Math.floor(input.likes / LIKE_BONUS_THRESHOLD),
    LIKE_BONUS_MAX
  );

  const bonusComments = Math.min(
    Math.floor(input.comments / COMMENT_BONUS_THRESHOLD),
    COMMENT_BONUS_MAX
  );

  const calculatedFortune = Math.round(
    baseScore * typeMultiplier * trustMultiplier * streakMultiplier
  ) + bonusLikes + bonusComments;

  const total = Math.max(0, Math.min(SINGLE_MAX_FORTUNE, calculatedFortune));

  return {
    baseScore,
    typeMultiplier,
    trustMultiplier,
    streakMultiplier,
    bonusLikes,
    bonusComments,
    total
  };
};

export type TitleLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Title {
  level: TitleLevel;
  name: string;
  minFortune: number;
  description: string;
}

export const TITLES: Title[] = [
  { level: 0, name: '萤火', minFortune: 0, description: '一点微光，也是力量' },
  { level: 1, name: '微光', minFortune: 200, description: '微光成炬，温暖彼此' },
  { level: 2, name: '日行一善', minFortune: 500, description: '持之以恒，善成习惯' },
  { level: 3, name: '暖阳', minFortune: 1000, description: '如冬日暖阳，照见善意' },
  { level: 4, name: '仁者爱人', minFortune: 2000, description: '心怀仁德，乐于助人' },
  { level: 5, name: '善行榜样', minFortune: 5000, description: '善行可学，榜样在身边' },
  { level: 6, name: '星火', minFortune: 10000, description: '星星之火，可以燎原' },
  { level: 7, name: '春风', minFortune: 20000, description: '春风化雨，润物无声' },
  { level: 8, name: '皓月', minFortune: 50000, description: '皎皎如月，照见初心' }
];

export const getTitleByFortune = (totalFortune: number): string => {
  let title = FORTUNE_LEVELS[0].name;
  for (const level of FORTUNE_LEVELS) {
    if (totalFortune >= level.minFortune) {
      title = level.name;
    }
  }
  return title;
};

/**
 * 根据福气值获取完整等级对象（包含等级、颜色、图标等信息）
 */
export const getLevelByFortune = (totalFortune: number): FortuneLevel => {
  let level = FORTUNE_LEVELS[0];
  for (const l of FORTUNE_LEVELS) {
    if (totalFortune >= l.minFortune) {
      level = l;
    }
  }
  return level;
};