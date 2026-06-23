import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { mockNotifications } from '@/data/notifications';

const STORAGE_KEY = 'haoshi_notification_store';

// 消息分类
export type NotificationCategory = 'interaction' | 'system' | 'charity' | 'warm';

// 通知类型
export type NotificationType =
  // 互动消息
  | 'like'             // 点赞（被温暖到）
  | 'comment'          // 评论
  | 'mention'          // @提及
  | 'follow'           // 关注
  // 系统消息
  | 'moderation'       // 审核结果
  | 'title'            // 称号变更
  | 'milestone'        // 里程碑
  // 公益消息
  | 'order'            // 接单
  | 'complete'         // 完成
  | 'timeout'          // 超时
  | 'cancel'           // 取消
  // 温暖消息
  | 'reflection'       // 睡前反思推送
  | 'matched'          // 善行匹配
  | 'story'            // 温暖故事
  | 'system';          // 通用系统通知

// 推送渠道：站内通知、App推送（模拟）、小程序订阅消息、邮件通知（可选）
export type PushChannel = 'inApp' | 'appPush' | 'subscribe' | 'email';

// 消息模板配置：不同类型消息使用不同模板和图标
export interface MessageTemplate {
  // 模板图标
  icon: string;
  // 模板标题前缀
  titlePrefix: string;
  // 订阅消息模板ID（模拟）
  subscribeTemplateId: string;
  // 是否可关闭（公益消息不可关闭）
  closable: boolean;
  // 模板主题色（用于消息左侧色条）
  accentColor: string;
}

// 消息模板映射表
export const MESSAGE_TEMPLATES: Record<NotificationType, MessageTemplate> = {
  // 互动消息
  like: { icon: '🤍', titlePrefix: '新的温暖', subscribeTemplateId: 'tpl_like', closable: true, accentColor: '#FF6B6B' },
  comment: { icon: '💬', titlePrefix: '新评论', subscribeTemplateId: 'tpl_comment', closable: true, accentColor: '#FFA07A' },
  mention: { icon: '@', titlePrefix: '有人@了你', subscribeTemplateId: 'tpl_mention', closable: true, accentColor: '#165dff' },
  follow: { icon: '👥', titlePrefix: '新粉丝', subscribeTemplateId: 'tpl_follow', closable: true, accentColor: '#52C41A' },
  // 系统消息
  moderation: { icon: '✅', titlePrefix: '审核结果', subscribeTemplateId: 'tpl_moderation', closable: true, accentColor: '#165dff' },
  title: { icon: '🏅', titlePrefix: '称号升级', subscribeTemplateId: 'tpl_title', closable: true, accentColor: '#FAAD14' },
  milestone: { icon: '🎯', titlePrefix: '里程碑达成', subscribeTemplateId: 'tpl_milestone', closable: true, accentColor: '#FF6B6B' },
  // 公益消息（不可关闭）
  order: { icon: '📋', titlePrefix: '公益接单', subscribeTemplateId: 'tpl_charity_order', closable: false, accentColor: '#FF6B6B' },
  complete: { icon: '🎉', titlePrefix: '任务完成', subscribeTemplateId: 'tpl_charity_complete', closable: false, accentColor: '#52C41A' },
  timeout: { icon: '⏰', titlePrefix: '任务超时', subscribeTemplateId: 'tpl_charity_timeout', closable: false, accentColor: '#FAAD14' },
  cancel: { icon: '❌', titlePrefix: '任务取消', subscribeTemplateId: 'tpl_charity_cancel', closable: false, accentColor: '#FF4D4F' },
  // 温暖消息
  reflection: { icon: '🌙', titlePrefix: '睡前反思', subscribeTemplateId: 'tpl_reflection', closable: true, accentColor: '#FFA07A' },
  matched: { icon: '✨', titlePrefix: '善行匹配', subscribeTemplateId: 'tpl_matched', closable: true, accentColor: '#FF6B6B' },
  story: { icon: '📖', titlePrefix: '温暖故事', subscribeTemplateId: 'tpl_story', closable: true, accentColor: '#FFA07A' },
  system: { icon: '📢', titlePrefix: '系统通知', subscribeTemplateId: 'tpl_system', closable: true, accentColor: '#999999' },
};

// 通知项
export interface NotificationItem {
  id: string;
  // 消息分类
  category: NotificationCategory;
  type: NotificationType;
  title: string;
  content: string;
  // 是否已读
  read: boolean;
  // 是否可关闭（公益消息不可关闭，优先取模板配置）
  closable?: boolean;
  // 关联的资源ID（如善行ID、复审任务ID等）
  relatedId?: string;
  // 创建时间
  createdAt: string;
}

// 推送设置
export interface PushSettings {
  // 睡前反思推送开关
  reflectionEnabled: boolean;
  // 未记录提醒开关
  emptyDayReminderEnabled: boolean;
  // 善行匹配通知开关
  matchNotificationEnabled: boolean;
  // 复审结果通知开关
  moderationNotificationEnabled: boolean;
  // 推送渠道
  channels: PushChannel[];
  // 推送时间（HH:mm格式，默认21:00）
  reflectionTime: string;
  // 免打扰时段开关
  dndEnabled: boolean;
  // 免打扰开始时间（HH:mm格式，默认22:00）
  dndStart: string;
  // 免打扰结束时间（HH:mm格式，默认08:00）
  dndEnd: string;
  // 免打扰时段公益接单类消息例外（仍可推送）
  dndCharityException: boolean;
  // App推送开关（模拟）
  appPushEnabled: boolean;
  // 邮件通知开关（可选）
  emailEnabled: boolean;
  // 邮箱地址（邮件通知用）
  emailAddress: string;
}

interface NotificationState {
  // 通知列表
  notifications: NotificationItem[];
  // 推送设置
  settings: PushSettings;

  // 添加通知（仅入站，不经过免打扰判断）
  addNotification: (notification: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>) => void;
  // 发送通知（经过免打扰判断 + 多渠道分发）
  sendNotification: (notification: Omit<NotificationItem, 'id' | 'read' | 'createdAt'>) => void;
  // 标记为已读
  markAsRead: (id: string) => void;
  // 全部标记为已读
  markAllAsRead: () => void;
  // 按分类全部标记为已读
  markCategoryAsRead: (category: NotificationCategory) => void;
  // 删除通知（公益消息不可关闭/删除）
  removeNotification: (id: string) => boolean;
  // 清空通知（保留不可关闭的公益消息）
  clearAll: () => void;
  // 获取未读数量
  getUnreadCount: () => number;
  // 获取分类未读数量
  getCategoryUnreadCount: (category: NotificationCategory) => number;
  // 获取分类消息列表
  getCategoryNotifications: (category: NotificationCategory) => NotificationItem[];
  // 判断当前是否处于免打扰时段
  isDndActive: () => boolean;
  // 判断指定类型消息在免打扰时段是否可推送（公益接单例外）
  canPushDuringDnd: (type: NotificationType) => boolean;
  // 获取消息模板
  getTemplate: (type: NotificationType) => MessageTemplate;
  // 更新推送设置
  updateSettings: (settings: Partial<PushSettings>) => void;
  // 加载 Mock 数据（首次使用时）
  loadMockData: () => void;
  // 清理超过90天的通知
  cleanupExpired: () => void;
  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// 默认推送设置
const defaultSettings: PushSettings = {
  reflectionEnabled: true,
  emptyDayReminderEnabled: true,
  matchNotificationEnabled: true,
  moderationNotificationEnabled: true,
  channels: ['inApp', 'appPush', 'subscribe'],
  reflectionTime: '21:00',
  dndEnabled: false,
  dndStart: '22:00',
  dndEnd: '08:00',
  // 免打扰时段公益接单类消息默认例外（仍可推送）
  dndCharityException: true,
  // App推送默认开启（模拟）
  appPushEnabled: true,
  // 邮件通知默认关闭（可选）
  emailEnabled: false,
  emailAddress: '',
};

// 生成唯一ID
const generateId = (): string => {
  return `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

// 消息保留天数
const RETENTION_DAYS = 90;

// 判断通知是否过期（超过90天）
const isExpired = (createdAt: string): boolean => {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const diffDays = (now - created) / (1000 * 60 * 60 * 24);
  return diffDays > RETENTION_DAYS;
};

// 将 HH:mm 时间字符串转换为分钟数
const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

// 发送微信小程序订阅消息（模拟）
export const sendSubscribeMessage = async (
  templateId: string,
  data: Record<string, { value: string }>,
  page?: string
): Promise<boolean> => {
  try {
    // 实际项目中调用 Taro.requestSubscribeMessage 后再调用服务端接口发送
    // 这里模拟发送逻辑，记录日志即可
    console.log('[Notification] 发送订阅消息:', {
      templateId,
      data,
      page,
      timestamp: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('[Notification] 发送订阅消息失败:', error);
    return false;
  }
};

// 发送App推送（模拟）
export const sendAppPush = async (
  title: string,
  content: string,
  extra?: Record<string, unknown>
): Promise<boolean> => {
  try {
    // 实际项目中调用服务端推送接口（如极光/友盟/自建推送）
    console.log('[Notification] 发送App推送:', {
      title,
      content,
      extra,
      timestamp: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('[Notification] 发送App推送失败:', error);
    return false;
  }
};

// 发送邮件通知（模拟）
export const sendEmailNotification = async (
  to: string,
  title: string,
  content: string
): Promise<boolean> => {
  try {
    if (!to) {
      console.warn('[Notification] 邮件地址为空，跳过发送');
      return false;
    }
    // 实际项目中调用服务端邮件发送接口
    console.log('[Notification] 发送邮件通知:', {
      to,
      title,
      content: content.slice(0, 50),
      timestamp: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('[Notification] 发送邮件通知失败:', error);
    return false;
  }
};

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  settings: defaultSettings,

  addNotification: (notification) => {
    // 从模板获取 closable 配置（公益消息不可关闭）
    const template = MESSAGE_TEMPLATES[notification.type] || MESSAGE_TEMPLATES.system;
    const item: NotificationItem = {
      ...notification,
      closable: notification.closable ?? template.closable,
      id: generateId(),
      read: false,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      // 最多保留200条，并过滤过期通知
      notifications: [item, ...state.notifications].filter((n) => !isExpired(n.createdAt)).slice(0, 200),
    }));
    get().saveToStorage();
  },

  // 发送通知：经过免打扰判断 + 多渠道分发
  sendNotification: (notification) => {
    const state = get();
    const { settings } = state;
    const template = MESSAGE_TEMPLATES[notification.type] || MESSAGE_TEMPLATES.system;

    // 免打扰判断：如果处于免打扰时段，且该类型不在例外中，则仅入站不推送
    const dndActive = get().isDndActive();
    const canPush = !dndActive || get().canPushDuringDnd(notification.type);

    // 始终入站（保证消息中心可见）
    get().addNotification(notification);

    if (!canPush) {
      console.log('[Notification] 免打扰时段，仅入站不推送:', notification.type);
      return;
    }

    // 多渠道分发
    const title = notification.title || template.titlePrefix;
    const content = notification.content;

    // 站内通知（已通过 addNotification 入站）
    if (settings.channels.includes('inApp')) {
      // 已入站，无需额外操作
    }

    // App推送（模拟）
    if (settings.channels.includes('appPush') && settings.appPushEnabled) {
      sendAppPush(title, content, { type: notification.type, relatedId: notification.relatedId });
    }

    // 微信小程序订阅消息
    if (settings.channels.includes('subscribe')) {
      sendSubscribeMessage(
        template.subscribeTemplateId,
        {
          thing1: { value: title },
          thing2: { value: content.slice(0, 20) },
          time3: { value: new Date().toLocaleString('zh-CN') },
        },
        notification.relatedId ? `pages/detail/index?id=${notification.relatedId}` : undefined
      );
    }

    // 邮件通知（可选）
    if (settings.channels.includes('email') && settings.emailEnabled && settings.emailAddress) {
      sendEmailNotification(settings.emailAddress, title, content);
    }
  },

  markAsRead: (id) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    }));
    get().saveToStorage();
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    }));
    get().saveToStorage();
  },

  markCategoryAsRead: (category) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.category === category ? { ...n, read: true } : n
      ),
    }));
    get().saveToStorage();
  },

  // 删除通知：公益消息不可关闭/删除，返回是否删除成功
  removeNotification: (id) => {
    const state = get();
    const target = state.notifications.find((n) => n.id === id);
    if (!target) return false;
    // 判断是否可关闭：优先取通知自身的 closable，再取模板配置
    const template = MESSAGE_TEMPLATES[target.type] || MESSAGE_TEMPLATES.system;
    const closable = target.closable ?? template.closable;
    if (!closable) {
      console.warn('[Notification] 公益消息不可关闭/删除:', target.type);
      return false;
    }
    set((st) => ({
      notifications: st.notifications.filter((n) => n.id !== id),
    }));
    get().saveToStorage();
    return true;
  },

  // 清空通知：保留不可关闭的公益消息
  clearAll: () => {
    set((state) => ({
      notifications: state.notifications.filter((n) => {
        const template = MESSAGE_TEMPLATES[n.type] || MESSAGE_TEMPLATES.system;
        const closable = n.closable ?? template.closable;
        return !closable; // 保留不可关闭的
      }),
    }));
    get().saveToStorage();
  },

  getUnreadCount: () => {
    return get().notifications.filter((n) => !n.read).length;
  },

  getCategoryUnreadCount: (category) => {
    return get().notifications.filter((n) => n.category === category && !n.read).length;
  },

  getCategoryNotifications: (category) => {
    return get()
      .notifications.filter((n) => n.category === category)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  isDndActive: () => {
    const { settings } = get();
    if (!settings.dndEnabled) return false;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = timeToMinutes(settings.dndStart);
    const endMinutes = timeToMinutes(settings.dndEnd);
    // 跨天场景（如22:00-08:00）
    if (startMinutes > endMinutes) {
      return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }
    // 同天场景
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  },

  // 判断指定类型消息在免打扰时段是否可推送（公益接单类消息可设例外）
  canPushDuringDnd: (type) => {
    const { settings } = get();
    if (!settings.dndEnabled) return true;
    // 公益接单类消息（order/timeout/complete/cancel）可设为例外
    if (settings.dndCharityException) {
      const charityTypes: NotificationType[] = ['order', 'timeout', 'complete', 'cancel'];
      if (charityTypes.includes(type)) {
        return true;
      }
    }
    return false;
  },

  // 获取消息模板
  getTemplate: (type) => {
    return MESSAGE_TEMPLATES[type] || MESSAGE_TEMPLATES.system;
  },

  updateSettings: (newSettings) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
    get().saveToStorage();
  },

  loadMockData: () => {
    const state = get();
    if (state.notifications.length === 0) {
      set({ notifications: [...mockNotifications] });
      get().saveToStorage();
    }
  },

  cleanupExpired: () => {
    set((state) => ({
      notifications: state.notifications.filter((n) => !isExpired(n.createdAt)),
    }));
    get().saveToStorage();
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const loadedNotifications = (parsed.notifications || []).filter(
          (n: NotificationItem) => !isExpired(n.createdAt)
        );
        set({
          notifications: loadedNotifications,
          settings: { ...defaultSettings, ...(parsed.settings || {}) },
        });
        // 如果清理后有变化，重新保存
        if (loadedNotifications.length !== (parsed.notifications || []).length) {
          get().saveToStorage();
        }
      }
    } catch (e) {
      console.error('[NotificationStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        notifications: state.notifications,
        settings: state.settings,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[NotificationStore] Save to storage failed:', e);
    }
  },
}));
