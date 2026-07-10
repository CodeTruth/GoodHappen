/**
 * 善行徽章体系
 * 借鉴"帮个忙"项目的成就体系设计
 */

export type BadgeCategory = 'milestone' | 'streak' | 'social' | 'special';

export interface BadgeDefinition {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  category: BadgeCategory;
  /** 解锁条件描述（给用户看的） */
  conditionText: string;
  /** 进度描述模板，{current}/{target} */
  progressTemplate?: string;
  /** 目标值 */
  target: number;
  /** 稀有度等级 1-5 */
  rarity: 1 | 2 | 3 | 4 | 5;
  /** 稀有度颜色 */
  color: string;
  /** 稀有度标签 */
  rarityLabel: string;
}

/** 所有徽章定义 */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ===== 里程碑类 =====
  {
    id: 'first_kindness',
    name: '初行善',
    emoji: '🌱',
    desc: '完成第一次善行记录',
    category: 'milestone',
    conditionText: '首次记录善行',
    target: 1,
    rarity: 1,
    color: '#9E8E7E',
    rarityLabel: '普通',
  },
  {
    id: 'kindness_10',
    name: '善行先锋',
    emoji: '💪',
    desc: '累计完成10次善行记录',
    category: 'milestone',
    conditionText: '累计记录10次善行',
    progressTemplate: '{current}/10',
    target: 10,
    rarity: 2,
    color: '#C4956A',
    rarityLabel: '稀有',
  },
  {
    id: 'kindness_50',
    name: '百善行者',
    emoji: '🌟',
    desc: '累计完成50次善行记录',
    category: 'milestone',
    conditionText: '累计记录50次善行',
    progressTemplate: '{current}/50',
    target: 50,
    rarity: 4,
    color: '#B8860B',
    rarityLabel: '史诗',
  },
  {
    id: 'kindness_100',
    name: '善行大师',
    emoji: '👑',
    desc: '累计完成100次善行记录',
    category: 'milestone',
    conditionText: '累计记录100次善行',
    progressTemplate: '{current}/100',
    target: 100,
    rarity: 5,
    color: '#D4534A',
    rarityLabel: '传说',
  },

  // ===== 连续打卡类 =====
  {
    id: 'streak_3',
    name: '三日之暖',
    emoji: '🔥',
    desc: '连续3天记录善行',
    category: 'streak',
    conditionText: '连续3天行善',
    progressTemplate: '{current}/3',
    target: 3,
    rarity: 1,
    color: '#9E8E7E',
    rarityLabel: '普通',
  },
  {
    id: 'streak_7',
    name: '善行周记',
    emoji: '🔥🔥',
    desc: '连续7天记录善行',
    category: 'streak',
    conditionText: '连续7天行善',
    progressTemplate: '{current}/7',
    target: 7,
    rarity: 2,
    color: '#C4956A',
    rarityLabel: '稀有',
  },
  {
    id: 'streak_21',
    name: '善行成习',
    emoji: '🌈',
    desc: '连续21天记录善行',
    category: 'streak',
    conditionText: '连续21天行善',
    progressTemplate: '{current}/21',
    target: 21,
    rarity: 4,
    color: '#D4A76A',
    rarityLabel: '史诗',
  },

  // ===== 社交类 =====
  {
    id: 'join_circle',
    name: '圈中之人',
    emoji: '👥',
    desc: '加入第一个善行圈',
    category: 'social',
    conditionText: '加入1个善行圈',
    target: 1,
    rarity: 1,
    color: '#9E8E7E',
    rarityLabel: '普通',
  },
  {
    id: 'comment_5',
    name: '温暖评论家',
    emoji: '💬',
    desc: '给5条善行写下暖心评论',
    category: 'social',
    conditionText: '评论5条善行',
    progressTemplate: '{current}/5',
    target: 5,
    rarity: 2,
    color: '#7B9E87',
    rarityLabel: '稀有',
  },
  {
    id: 'likes_10',
    name: '温暖传播者',
    emoji: '🤝',
    desc: '你的善行获得10个点赞',
    category: 'social',
    conditionText: '获得10个点赞',
    progressTemplate: '{current}/10',
    target: 10,
    rarity: 2,
    color: '#D4A356',
    rarityLabel: '稀有',
  },
  {
    id: 'inspiration_all',
    name: '灵感达人',
    emoji: '🎯',
    desc: '完成本周全部温暖灵感',
    category: 'social',
    conditionText: '完成本周3个灵感',
    progressTemplate: '{current}/3',
    target: 3,
    rarity: 3,
    color: '#8B5CF6',
    rarityLabel: '精英',
  },

  // ===== 特殊类 =====
  {
    id: 'fortune_500',
    name: '福气之星',
    emoji: '💎',
    desc: '累计福气值达到500',
    category: 'special',
    conditionText: '福气值达到500',
    progressTemplate: '{current}/500',
    target: 500,
    rarity: 3,
    color: '#B8860B',
    rarityLabel: '精英',
  },
  {
    id: 'night_kindness',
    name: '深夜微光',
    emoji: '🌙',
    desc: '在深夜（22:00-6:00）记录善行',
    category: 'special',
    conditionText: '在深夜时段记录善行',
    target: 1,
    rarity: 2,
    color: '#4A90A4',
    rarityLabel: '稀有',
  },
  {
    id: 'anonymous_kindness',
    name: '无名善者',
    emoji: '🛡️',
    desc: '匿名记录一次善行',
    category: 'special',
    conditionText: '匿名行善1次',
    target: 1,
    rarity: 1,
    color: '#9E8E7E',
    rarityLabel: '普通',
  },
  {
    id: 'kindness_location',
    name: '邻里之星',
    emoji: '🗺️',
    desc: '发布过带位置信息的善行',
    category: 'special',
    conditionText: '记录带有位置的善行',
    target: 1,
    rarity: 1,
    color: '#7B9E87',
    rarityLabel: '普通',
  },
];

/** 根据ID获取徽章定义 */
export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find(b => b.id === id);
}

/** 获取分类名称 */
export function getCategoryName(category: BadgeCategory): string {
  const names: Record<BadgeCategory, string> = {
    milestone: '成长里程碑',
    streak: '坚持之光',
    social: '温暖连接',
    special: '特别成就',
  };
  return names[category];
}
