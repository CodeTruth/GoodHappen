import { User, Circle } from '@/types/user';

// Mock用户数据
export const mockCurrentUser: User = {
  id: 'currentUser',
  name: '温暖小太阳',
  avatar: 'https://picsum.photos/id/64/200/200',
  bio: '记录生活中的温暖瞬间',
  blessingValue: 156,
  kindnessCount: 12,
  witnessCount: 8,
  badges: ['温暖传播者', '善行新星'],
  circles: ['circle1', 'circle2'],
  createdAt: '2024-01-15T00:00:00Z'
};

// Mock善行圈数据
export const mockCircles: Circle[] = [
  {
    id: 'circle1',
    name: '三年二班善行圈',
    type: 'class',
    description: '记录班级里的每一个温暖瞬间',
    memberCount: 45,
    kindnessCount: 128,
    adminId: 'admin1',
    createdAt: '2024-02-01T00:00:00Z'
  },
  {
    id: 'circle2',
    name: '科技公司善行圈',
    type: 'company',
    description: '让善意在职场传递',
    memberCount: 320,
    kindnessCount: 892,
    adminId: 'admin2',
    createdAt: '2024-01-20T00:00:00Z'
  },
  {
    id: 'circle3',
    name: '阳光社区善行圈',
    type: 'community',
    description: '邻里互助，温暖社区',
    memberCount: 156,
    kindnessCount: 456,
    adminId: 'admin3',
    createdAt: '2024-03-01T00:00:00Z'
  }
];

// 获取当前用户
export const getCurrentUser = (): User => {
  return mockCurrentUser;
};

// 获取善行圈列表
export const getCircles = (): Circle[] => {
  return mockCircles;
};

// 根据ID获取善行圈
export const getCircleById = (id: string): Circle | undefined => {
  return mockCircles.find(item => item.id === id);
};