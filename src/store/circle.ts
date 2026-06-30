import { create } from 'zustand';
import Taro from '@tarojs/taro';

const STORAGE_KEY = 'haoshi_circle_store';

// ============================================
// 三级角色权限系统（N1）
// ============================================

// 角色类型：成员、组长、团体管理员
export type CircleRole = 'member' | 'groupLeader' | 'admin';

// 团体类型：开放团体（班级码验证）、封闭团体（管理员邀请）、公共团体（只读）
export type CircleAccessType = 'open' | 'closed' | 'public';

// 权限类型
export type Permission =
  | 'publish_kindness'        // 发布善行
  | 'set_visibility'          // 设置可见范围
  | 'view_circle_feed'        // 查看团体动态流
  | 'view_circle_summary'     // 查看团体汇总表
  | 'create_checkin_task'     // 自定义打卡任务
  | 'invite_members'          // 邀请成员
  | 'audit_members'           // 审核成员
  | 'view_attention_list'     // 查看需关注列表
  | 'delete_content'          // 删除不当内容
  | 'dissolve_circle'         // 解散团体
  | 'export_data';            // 导出数据

// 权限矩阵：每个角色拥有的权限
export const ROLE_PERMISSIONS: Record<CircleRole, Permission[]> = {
  // 成员：发布善行、设置可见范围、查看团体动态流
  member: [
    'publish_kindness',
    'set_visibility',
    'view_circle_feed',
  ],
  // 组长：成员权限 + 查看团体汇总表
  groupLeader: [
    'publish_kindness',
    'set_visibility',
    'view_circle_feed',
    'view_circle_summary',
  ],
  // 管理员：组长权限 + 自定义打卡任务、邀请/审核成员、查看需关注列表、删除不当内容、解散团体、导出数据
  admin: [
    'publish_kindness',
    'set_visibility',
    'view_circle_feed',
    'view_circle_summary',
    'create_checkin_task',
    'invite_members',
    'audit_members',
    'view_attention_list',
    'delete_content',
    'dissolve_circle',
    'export_data',
  ],
};

// 角色中文名
export const ROLE_NAMES: Record<CircleRole, string> = {
  member: '成员',
  groupLeader: '组长',
  admin: '团体管理员',
};

// 团体类型中文名
export const ACCESS_TYPE_NAMES: Record<CircleAccessType, string> = {
  open: '开放团体',
  closed: '封闭团体',
  public: '公共团体',
};

// 团体成员
export interface CircleMember {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  role: CircleRole;
  joinedAt: string;
  // 成员编号（用于月度汇总表按编号排列）
  memberNumber: number;
  // 最近一次打卡时间（用于需关注列表）
  lastCheckinDate?: string;
  // 是否实名
  isRealName: boolean;
}

// 团体扩展信息
export interface CircleInfo {
  id: string;
  name: string;
  type: 'class' | 'company' | 'community' | 'friends' | 'public';
  accessType: CircleAccessType;
  description?: string;
  adminId: string;
  createdAt: string;
  // 班级码（开放团体）
  classCode?: string;
  // 是否需要实名
  requireRealName: boolean;
  // 成员列表
  members: CircleMember[];
  // 待审核成员列表
  pendingMembers?: Array<{
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    appliedAt: string;
  }>;
}

// Mock 团体数据
const mockCircles: CircleInfo[] = [
  {
    id: 'circle1',
    name: '三年二班善行圈',
    type: 'class',
    accessType: 'open',
    description: '记录班级里的每一个温暖瞬间',
    adminId: 'admin1',
    createdAt: '2024-02-01T00:00:00Z',
    classCode: 'CLS202402',
    requireRealName: true,
    members: [
      {
        id: 'm1',
        userId: 'currentUser',
        userName: '温暖小太阳',
        userAvatar: 'https://picsum.photos/id/64/200/200',
        role: 'admin',
        joinedAt: '2024-02-01T00:00:00Z',
        memberNumber: 1,
        lastCheckinDate: '2026-06-22',
        isRealName: true,
      },
      {
        id: 'm2',
        userId: 'u2',
        userName: '小明',
        userAvatar: 'https://picsum.photos/id/65/200/200',
        role: 'groupLeader',
        joinedAt: '2024-02-02T00:00:00Z',
        memberNumber: 2,
        lastCheckinDate: '2026-06-21',
        isRealName: true,
      },
      {
        id: 'm3',
        userId: 'u3',
        userName: '小红',
        userAvatar: 'https://picsum.photos/id/66/200/200',
        role: 'member',
        joinedAt: '2024-02-03T00:00:00Z',
        memberNumber: 3,
        lastCheckinDate: '2026-06-20',
        isRealName: true,
      },
      {
        id: 'm4',
        userId: 'u4',
        userName: '小华',
        userAvatar: 'https://picsum.photos/id/67/200/200',
        role: 'member',
        joinedAt: '2024-02-04T00:00:00Z',
        memberNumber: 4,
        lastCheckinDate: '2026-06-10',
        isRealName: true,
      },
      {
        id: 'm5',
        userId: 'u5',
        userName: '小芳',
        userAvatar: 'https://picsum.photos/id/68/200/200',
        role: 'member',
        joinedAt: '2024-02-05T00:00:00Z',
        memberNumber: 5,
        lastCheckinDate: '2026-06-05',
        isRealName: true,
      },
    ],
    pendingMembers: [
      {
        id: 'p1',
        userId: 'u9',
        userName: '小新',
        userAvatar: 'https://picsum.photos/id/69/200/200',
        appliedAt: '2026-06-20T10:00:00Z',
      },
    ],
  },
  {
    id: 'circle2',
    name: '科技公司善行圈',
    type: 'company',
    accessType: 'closed',
    description: '让善意在职场传递',
    adminId: 'admin2',
    createdAt: '2024-01-20T00:00:00Z',
    requireRealName: true,
    members: [
      {
        id: 'm6',
        userId: 'currentUser',
        userName: '温暖小太阳',
        userAvatar: 'https://picsum.photos/id/64/200/200',
        role: 'member',
        joinedAt: '2024-01-21T00:00:00Z',
        memberNumber: 1,
        lastCheckinDate: '2026-06-22',
        isRealName: true,
      },
      {
        id: 'm20',
        userId: 'u20',
        userName: '技术部小张',
        userAvatar: 'https://picsum.photos/id/70/200/200',
        role: 'groupLeader',
        joinedAt: '2024-01-22T00:00:00Z',
        memberNumber: 2,
        lastCheckinDate: '2026-06-25',
        isRealName: true,
      },
      {
        id: 'm21',
        userId: 'u21',
        userName: '市场部小李',
        userAvatar: 'https://picsum.photos/id/71/200/200',
        role: 'member',
        joinedAt: '2024-01-23T00:00:00Z',
        memberNumber: 3,
        lastCheckinDate: '2026-06-24',
        isRealName: true,
      },
      {
        id: 'm22',
        userId: 'u22',
        userName: '运营部小王',
        userAvatar: 'https://picsum.photos/id/72/200/200',
        role: 'member',
        joinedAt: '2024-01-24T00:00:00Z',
        memberNumber: 4,
        lastCheckinDate: '2026-06-23',
        isRealName: true,
      },
      {
        id: 'm23',
        userId: 'u23',
        userName: '产品部小陈',
        userAvatar: 'https://picsum.photos/id/73/200/200',
        role: 'member',
        joinedAt: '2024-01-25T00:00:00Z',
        memberNumber: 5,
        lastCheckinDate: '2026-06-20',
        isRealName: true,
      },
      {
        id: 'm24',
        userId: 'u24',
        userName: '人事部小刘',
        userAvatar: 'https://picsum.photos/id/74/200/200',
        role: 'member',
        joinedAt: '2024-01-26T00:00:00Z',
        memberNumber: 6,
        lastCheckinDate: '2026-06-18',
        isRealName: true,
      },
    ],
  },
  {
    id: 'circle3',
    name: '阳光社区善行圈',
    type: 'community',
    accessType: 'open',
    description: '邻里互助，温暖社区',
    adminId: 'admin3',
    createdAt: '2024-03-01T00:00:00Z',
    requireRealName: false,
    members: [
      {
        id: 'm7',
        userId: 'currentUser',
        userName: '温暖小太阳',
        userAvatar: 'https://picsum.photos/id/64/200/200',
        role: 'groupLeader',
        joinedAt: '2024-03-02T00:00:00Z',
        memberNumber: 1,
        lastCheckinDate: '2026-06-22',
        isRealName: false,
      },
      {
        id: 'm30',
        userId: 'u30',
        userName: '1号楼张阿姨',
        userAvatar: 'https://picsum.photos/id/75/200/200',
        role: 'groupLeader',
        joinedAt: '2024-03-03T00:00:00Z',
        memberNumber: 2,
        lastCheckinDate: '2026-06-26',
        isRealName: false,
      },
      {
        id: 'm31',
        userId: 'u31',
        userName: '2号楼李大爷',
        userAvatar: 'https://picsum.photos/id/76/200/200',
        role: 'member',
        joinedAt: '2024-03-04T00:00:00Z',
        memberNumber: 3,
        lastCheckinDate: '2026-06-25',
        isRealName: false,
      },
      {
        id: 'm32',
        userId: 'u32',
        userName: '3号楼王阿姨',
        userAvatar: 'https://picsum.photos/id/77/200/200',
        role: 'member',
        joinedAt: '2024-03-05T00:00:00Z',
        memberNumber: 4,
        lastCheckinDate: '2026-06-24',
        isRealName: false,
      },
      {
        id: 'm33',
        userId: 'u33',
        userName: '1号楼赵叔叔',
        userAvatar: 'https://picsum.photos/id/78/200/200',
        role: 'member',
        joinedAt: '2024-03-06T00:00:00Z',
        memberNumber: 5,
        lastCheckinDate: '2026-06-22',
        isRealName: false,
      },
      {
        id: 'm34',
        userId: 'u34',
        userName: '2号楼孙奶奶',
        userAvatar: 'https://picsum.photos/id/79/200/200',
        role: 'member',
        joinedAt: '2024-03-07T00:00:00Z',
        memberNumber: 6,
        lastCheckinDate: '2026-06-20',
        isRealName: false,
      },
    ],
  },
  {
    id: 'circle4',
    name: '老友记善行圈',
    type: 'friends',
    accessType: 'closed',
    description: '朋友之间，记录每一份温暖',
    adminId: 'currentUser',
    createdAt: '2024-05-01T00:00:00Z',
    requireRealName: false,
    members: [
      {
        id: 'm40',
        userId: 'currentUser',
        userName: '温暖小太阳',
        userAvatar: 'https://picsum.photos/id/64/200/200',
        role: 'admin',
        joinedAt: '2024-05-01T00:00:00Z',
        memberNumber: 1,
        lastCheckinDate: '2026-06-22',
        isRealName: false,
      },
      {
        id: 'm41',
        userId: 'u41',
        userName: '阿杰',
        userAvatar: 'https://picsum.photos/id/80/200/200',
        role: 'member',
        joinedAt: '2024-05-02T00:00:00Z',
        memberNumber: 2,
        lastCheckinDate: '2026-06-25',
        isRealName: false,
      },
      {
        id: 'm42',
        userId: 'u42',
        userName: '小美',
        userAvatar: 'https://picsum.photos/id/81/200/200',
        role: 'member',
        joinedAt: '2024-05-03T00:00:00Z',
        memberNumber: 3,
        lastCheckinDate: '2026-06-24',
        isRealName: false,
      },
      {
        id: 'm43',
        userId: 'u43',
        userName: '大伟',
        userAvatar: 'https://picsum.photos/id/82/200/200',
        role: 'member',
        joinedAt: '2024-05-04T00:00:00Z',
        memberNumber: 4,
        lastCheckinDate: '2026-06-23',
        isRealName: false,
      },
      {
        id: 'm44',
        userId: 'u44',
        userName: '小丽',
        userAvatar: 'https://picsum.photos/id/83/200/200',
        role: 'member',
        joinedAt: '2024-05-05T00:00:00Z',
        memberNumber: 5,
        lastCheckinDate: '2026-06-21',
        isRealName: false,
      },
    ],
  },
];

interface CircleState {
  circles: CircleInfo[];
  currentCircleId: string | null;

  // 权限相关
  hasPermission: (circleId: string, userId: string, permission: Permission) => boolean;
  getMemberRole: (circleId: string, userId: string) => CircleRole | null;
  getCurrentUserCircles: (userId: string) => CircleInfo[];

  // 团体操作
  getCircleById: (id: string) => CircleInfo | undefined;
  setCurrentCircle: (id: string) => void;
  createCircle: (circle: Omit<CircleInfo, 'id' | 'createdAt' | 'members'>) => string;
  dissolveCircle: (circleId: string, userId: string) => boolean;

  // 成员管理
  inviteMember: (circleId: string, member: Omit<CircleMember, 'id' | 'joinedAt' | 'memberNumber'>) => void;
  auditMember: (circleId: string, pendingId: string, approved: boolean) => void;
  removeMember: (circleId: string, memberId: string) => void;
  updateMemberRole: (circleId: string, memberId: string, role: CircleRole) => void;
  getAttentionList: (circleId: string) => CircleMember[]; // 连续7天未打卡

  // 内容管理
  deleteContent: (circleId: string, contentId: string) => void;

  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// 检查用户是否拥有某权限
const checkPermission = (
  circles: CircleInfo[],
  circleId: string,
  userId: string,
  permission: Permission
): boolean => {
  const circle = circles.find(c => c.id === circleId);
  if (!circle) return false;

  // 公共团体：只读，无任何写权限
  if (circle.accessType === 'public') {
    return permission === 'view_circle_feed';
  }

  const member = circle.members.find(m => m.userId === userId);
  if (!member) return false;

  return ROLE_PERMISSIONS[member.role].includes(permission);
};

export const useCircleStore = create<CircleState>((set, get) => ({
  circles: mockCircles,
  currentCircleId: null,

  hasPermission: (circleId, userId, permission) => {
    return checkPermission(get().circles, circleId, userId, permission);
  },

  getMemberRole: (circleId, userId) => {
    const circle = get().circles.find(c => c.id === circleId);
    if (!circle) return null;
    const member = circle.members.find(m => m.userId === userId);
    return member?.role || null;
  },

  getCurrentUserCircles: (userId) => {
    return get().circles.filter(c =>
      c.members.some(m => m.userId === userId)
    );
  },

  getCircleById: (id) => {
    return get().circles.find(c => c.id === id);
  },

  setCurrentCircle: (id) => {
    set({ currentCircleId: id });
  },

  createCircle: (circle) => {
    const id = `circle_${Date.now()}`;
    const newCircle: CircleInfo = {
      ...circle,
      id,
      createdAt: new Date().toISOString(),
      members: [],
    };
    set(state => ({ circles: [...state.circles, newCircle] }));
    get().saveToStorage();
    return id;
  },

  dissolveCircle: (circleId, userId) => {
    // 仅管理员可解散
    if (!checkPermission(get().circles, circleId, userId, 'dissolve_circle')) {
      Taro.showToast({ title: '无权限解散团体', icon: 'none' });
      return false;
    }
    set(state => ({
      circles: state.circles.filter(c => c.id !== circleId)
    }));
    get().saveToStorage();
    return true;
  },

  inviteMember: (circleId, member) => {
    set(state => ({
      circles: state.circles.map(c => {
        if (c.id !== circleId) return c;
        const newMember: CircleMember = {
          ...member,
          id: `m_${Date.now()}`,
          joinedAt: new Date().toISOString(),
          memberNumber: c.members.length + 1,
        };
        return { ...c, members: [...c.members, newMember] };
      })
    }));
    get().saveToStorage();
  },

  auditMember: (circleId, pendingId, approved) => {
    set(state => ({
      circles: state.circles.map(c => {
        if (c.id !== circleId) return c;
        const pending = c.pendingMembers?.find(p => p.id === pendingId);
        if (!pending) return c;
        const newPending = c.pendingMembers?.filter(p => p.id !== pendingId) || [];
        if (approved) {
          const newMember: CircleMember = {
            id: `m_${Date.now()}`,
            userId: pending.userId,
            userName: pending.userName,
            userAvatar: pending.userAvatar,
            role: 'member',
            joinedAt: new Date().toISOString(),
            memberNumber: c.members.length + 1,
            isRealName: c.requireRealName,
          };
          return {
            ...c,
            members: [...c.members, newMember],
            pendingMembers: newPending,
          };
        }
        return { ...c, pendingMembers: newPending };
      })
    }));
    get().saveToStorage();
  },

  removeMember: (circleId, memberId) => {
    set(state => ({
      circles: state.circles.map(c => {
        if (c.id !== circleId) return c;
        return { ...c, members: c.members.filter(m => m.id !== memberId) };
      })
    }));
    get().saveToStorage();
  },

  updateMemberRole: (circleId, memberId, role) => {
    set(state => ({
      circles: state.circles.map(c => {
        if (c.id !== circleId) return c;
        return {
          ...c,
          members: c.members.map(m =>
            m.id === memberId ? { ...m, role } : m
          )
        };
      })
    }));
    get().saveToStorage();
  },

  // 获取连续7天未打卡的成员列表
  getAttentionList: (circleId) => {
    const circle = get().circles.find(c => c.id === circleId);
    if (!circle) return [];
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    return circle.members.filter(m => {
      if (m.role === 'admin') return false; // 管理员不纳入提醒
      if (!m.lastCheckinDate) return true;
      return m.lastCheckinDate < sevenDaysAgoStr;
    });
  },

  deleteContent: (circleId, contentId) => {
    // 实际应调用 kindness store 删除对应内容
    console.log('[CircleStore] Delete content:', circleId, contentId);
    Taro.showToast({ title: '内容已删除', icon: 'success' });
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.circles && parsed.circles.length > 0) {
          set({ circles: parsed.circles });
        }
      }
    } catch (e) {
      console.error('[CircleStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const { circles } = get();
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({ circles }));
    } catch (e) {
      console.error('[CircleStore] Save to storage failed:', e);
    }
  },
}));
