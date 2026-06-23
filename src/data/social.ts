// 社交相关 Mock 数据：用户列表、温暖伙伴卡片

export interface MockUser {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  region: string;
  kindnessCount: number;
  followerCount: number;
  followingCount: number;
}

// Mock 用户列表（用于关注机制演示）
export const mockUsers: MockUser[] = [
  {
    id: 'user1',
    name: '温暖小太阳',
    avatar: 'https://picsum.photos/id/64/200/200',
    bio: '每天做一件小事，让世界更温暖',
    region: '北京市朝阳区',
    kindnessCount: 128,
    followerCount: 356,
    followingCount: 89,
  },
  {
    id: 'user2',
    name: '城市观察者',
    avatar: 'https://picsum.photos/id/91/200/200',
    bio: '记录城市里每一个温暖瞬间',
    region: '上海市浦东新区',
    kindnessCount: 96,
    followerCount: 412,
    followingCount: 56,
  },
  {
    id: 'user3',
    name: '环保小卫士',
    avatar: 'https://picsum.photos/id/177/200/200',
    bio: '爱护环境，从身边小事做起',
    region: '广州市天河区',
    kindnessCount: 73,
    followerCount: 201,
    followingCount: 34,
  },
  {
    id: 'user4',
    name: '暖心传递者',
    avatar: 'https://picsum.photos/id/338/200/200',
    bio: '己欲立而立人，己欲达而达人',
    region: '深圳市南山区',
    kindnessCount: 156,
    followerCount: 523,
    followingCount: 67,
  },
  {
    id: 'user5',
    name: '善意记录员',
    avatar: 'https://picsum.photos/id/1027/200/200',
    bio: '用文字留住每一份善意',
    region: '杭州市西湖区',
    kindnessCount: 84,
    followerCount: 289,
    followingCount: 45,
  },
];

// 温暖伙伴卡片（品牌信息，每周不超过2条）
export interface WarmPartnerCard {
  id: string;
  brandName: string;
  brandLogo: string;
  title: string;
  content: string;
  link: string;
  publishedAt: string;
  weekKey: string; // 用于控制每周不超过2条
}

export const mockWarmPartners: WarmPartnerCard[] = [
  {
    id: 'wp1',
    brandName: '温暖咖啡',
    brandLogo: 'https://picsum.photos/id/225/100/100',
    title: '每杯咖啡，传递一份温暖',
    content: '本月每售出一杯咖啡，我们将捐赠1元给山区儿童图书角。一起来用一杯咖啡的温度，温暖更多孩子的心。',
    link: '/pages/warmth-stories/index',
    publishedAt: '2024-06-22T08:00:00Z',
    weekKey: '2024-W25',
  },
  {
    id: 'wp2',
    brandName: '善意书店',
    brandLogo: 'https://picsum.photos/id/24/100/100',
    title: '一本旧书，一份新希望',
    content: '闲置书籍捐赠计划开启中，寄出你的旧书，我们将送到偏远山区学校。让知识流动，让善意传递。',
    link: '/pages/warmth-stories/index',
    publishedAt: '2024-06-20T10:00:00Z',
    weekKey: '2024-W25',
  },
];

// 获取本周的温暖伙伴卡片（每周不超过2条）
export const getWeeklyWarmPartners = (): WarmPartnerCard[] => {
  return mockWarmPartners.slice(0, 2);
};

// 根据 ID 获取用户
export const getMockUserById = (userId: string): MockUser | undefined => {
  return mockUsers.find((u) => u.id === userId);
};
