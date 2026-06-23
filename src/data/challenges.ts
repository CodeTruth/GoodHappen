// ============================================
// Phase 10 - H1 挑战系统 Mock 数据
// ============================================

// 挑战类型
export type ChallengeType = 'theme' | 'personal' | 'team';

// 挑战状态
export type ChallengeStatus = 'ongoing' | 'completed' | 'expired';

// 主题挑战（系统预设）
export interface ThemeChallenge {
  id: string;
  type: 'theme';
  title: string;            // 挑战标题，如"温暖7天挑战"
  description: string;      // 挑战描述
  icon: string;             // 图标 emoji
  coverColor: string;       // 卡片渐变起始色
  coverColorEnd: string;    // 卡片渐变结束色
  targetDays: number;       // 目标天数
  badge: string;            // 完成后获得的徽章名称
  startDate: string;        // 开始日期
  endDate: string;          // 结束日期
  participantCount: number; // 参与人数
}

// 个人挑战（用户自定义）
export interface PersonalChallenge {
  id: string;
  type: 'personal';
  title: string;
  description?: string;
  icon: string;
  targetDays: number;       // 目标天数
  targetCount: number;      // 目标善行数
  completedDays: number;    // 已完成天数
  completedCount: number;   // 已完成善行数
  startDate: string;
  endDate?: string;
  status: ChallengeStatus;
  isCustom: boolean;        // 是否用户自定义
  badge?: string;
}

// 队伍成员
export interface TeamMember {
  userId: string;
  name: string;
  avatar: string;
  contribution: number;     // 个人贡献数
  joinedAt: string;
}

// 组队挑战
export interface TeamChallenge {
  id: string;
  type: 'team';
  title: string;
  description: string;
  icon: string;
  coverColor: string;
  coverColorEnd: string;
  targetCount: number;       // 队伍总目标数
  teamTotalCount: number;    // 队伍当前总进度
  members: TeamMember[];
  captainId: string;         // 队长ID
  inviteCode: string;        // 邀请码
  startDate: string;
  endDate: string;
  badge: string;
  maxMembers: number;
}

// 用户挑战参与记录
export interface UserChallengeProgress {
  challengeId: string;
  userId: string;
  completedDays: number;
  completedCount: number;
  lastRecordDate: string;    // 最后记录日期
  joinedAt: string;
  status: ChallengeStatus;
  earnedBadge?: boolean;     // 是否已获得徽章
}

// ============================================
// Mock 主题挑战
// ============================================
export const mockThemeChallenges: ThemeChallenge[] = [
  {
    id: 'theme_warm_7',
    type: 'theme',
    title: '温暖7天挑战',
    description: '连续7天，每天记录一件温暖的小事，让善意成为习惯',
    icon: '🔥',
    coverColor: '#FF6B6B',
    coverColorEnd: '#FFA07A',
    targetDays: 7,
    badge: '温暖火种',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    participantCount: 1280,
  },
  {
    id: 'theme_help_21',
    type: 'theme',
    title: '助人21天',
    description: '21天养成助人习惯，从身边小事开始改变世界',
    icon: '🤝',
    coverColor: '#52C41A',
    coverColorEnd: '#95DE64',
    targetDays: 21,
    badge: '助人使者',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    participantCount: 856,
  },
  {
    id: 'theme_env_14',
    type: 'theme',
    title: '环保14天',
    description: '14天环保行动，为地球做点小事',
    icon: '🌱',
    coverColor: '#13C2C2',
    coverColorEnd: '#5CDBD3',
    targetDays: 14,
    badge: '绿色守护者',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    participantCount: 642,
  },
  {
    id: 'theme_gratitude_30',
    type: 'theme',
    title: '感恩30天',
    description: '30天感恩日记，发现生活中的美好',
    icon: '✨',
    coverColor: '#FAAD14',
    coverColorEnd: '#FFD666',
    targetDays: 30,
    badge: '感恩之心',
    startDate: '2026-06-01',
    endDate: '2026-12-31',
    participantCount: 423,
  },
];

// ============================================
// Mock 个人挑战（用户已加入的）
// ============================================
export const mockPersonalChallenges: PersonalChallenge[] = [
  {
    id: 'personal_1',
    type: 'personal',
    title: '每日一善',
    description: '坚持每天做一件善事',
    icon: '🌟',
    targetDays: 30,
    targetCount: 30,
    completedDays: 12,
    completedCount: 12,
    startDate: '2026-06-10',
    status: 'ongoing',
    isCustom: false,
    badge: '善行使者',
  },
  {
    id: 'personal_2',
    type: 'personal',
    title: '陪伴家人',
    description: '每周陪伴家人至少3次',
    icon: '❤️',
    targetDays: 60,
    targetCount: 24,
    completedDays: 20,
    completedCount: 8,
    startDate: '2026-05-15',
    status: 'ongoing',
    isCustom: true,
    badge: '家庭暖阳',
  },
];

// ============================================
// Mock 组队挑战
// ============================================
export const mockTeamChallenges: TeamChallenge[] = [
  {
    id: 'team_1',
    type: 'team',
    title: '5人温暖小队',
    description: '5人小队共同完成50件善行，共享温暖',
    icon: '👥',
    coverColor: '#FF6B6B',
    coverColorEnd: '#FFA07A',
    targetCount: 50,
    teamTotalCount: 28,
    members: [
      { userId: 'currentUser', name: '温暖小太阳', avatar: 'https://picsum.photos/id/64/200/200', contribution: 8, joinedAt: '2026-06-15T00:00:00Z' },
      { userId: 'user2', name: '城市观察者', avatar: 'https://picsum.photos/id/91/200/200', contribution: 6, joinedAt: '2026-06-15T00:00:00Z' },
      { userId: 'user3', name: '环保小卫士', avatar: 'https://picsum.photos/id/177/200/200', contribution: 7, joinedAt: '2026-06-15T00:00:00Z' },
      { userId: 'user4', name: '暖心传递者', avatar: 'https://picsum.photos/id/338/200/200', contribution: 4, joinedAt: '2026-06-16T00:00:00Z' },
      { userId: 'user5', name: '善意记录员', avatar: 'https://picsum.photos/id/1027/200/200', contribution: 3, joinedAt: '2026-06-17T00:00:00Z' },
    ],
    captainId: 'currentUser',
    inviteCode: 'WARM28AB',
    startDate: '2026-06-15',
    endDate: '2026-07-15',
    badge: '温暖小队',
    maxMembers: 5,
  },
];

// ============================================
// 系统预设个人挑战模板
// ============================================
export const personalChallengeTemplates: Omit<PersonalChallenge, 'id' | 'completedDays' | 'completedCount' | 'startDate' | 'status'>[] = [
  {
    type: 'personal',
    title: '每日一善',
    description: '坚持每天做一件善事',
    icon: '🌟',
    targetDays: 30,
    targetCount: 30,
    isCustom: false,
    badge: '善行使者',
  },
  {
    type: 'personal',
    title: '阅读打卡',
    description: '每天阅读30分钟',
    icon: '📚',
    targetDays: 21,
    targetCount: 21,
    isCustom: false,
    badge: '阅读达人',
  },
  {
    type: 'personal',
    title: '运动坚持',
    description: '每天运动20分钟',
    icon: '🏃',
    targetDays: 30,
    targetCount: 30,
    isCustom: false,
    badge: '活力之星',
  },
  {
    type: 'personal',
    title: '感恩日记',
    description: '每天记录3件感恩的事',
    icon: '🙏',
    targetDays: 14,
    targetCount: 14,
    isCustom: false,
    badge: '感恩之心',
  },
];

// 获取主题挑战列表
export const getThemeChallenges = (): ThemeChallenge[] => mockThemeChallenges;

// 获取个人挑战列表
export const getPersonalChallenges = (): PersonalChallenge[] => mockPersonalChallenges;

// 获取组队挑战列表
export const getTeamChallenges = (): TeamChallenge[] => mockTeamChallenges;

// 生成邀请码
export const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};
