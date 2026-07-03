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

// 初始为空，种子数据由 seed-data.ts 在首次启动时注入

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
  circles: [],
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
