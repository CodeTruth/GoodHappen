/**
 * SOS 防滥用 + 智能触发服务
 *
 * 核心能力：
 * 1. 多方式SOS触发（快捷/定时/语音/摔倒/三连击）
 * 2. 押金防滥用机制（预扣→确认→退还/扣除）
 * 3. 定时安全确认（设置预计完成时间，超时自动SOS）
 * 4. 智能验证（AI判断SOS真实性）
 */

// ============================================
// 类型定义
// ============================================

/** SOS触发方式 */
export type SOSSource =
  | 'protection_mode'    // 保护模式中触发
  | 'quick_button'       // 快捷按钮（无需先开保护）
  | 'safety_timeout'     // 定时安全确认超时
  | 'voice_trigger'      // 语音关键词触发
  | 'fall_detection'     // 摔倒检测（穿戴设备）
  | 'watch_triple_tap'   // 手表三连击
  | 'auto_emergency';    // 系统自动检测

/** 通知目标类型 */
export type NotifyTargetType = 'emergency_contact' | 'nearby_user';

/** SOS通知记录 */
export interface SOSNotification {
  targetType: NotifyTargetType;
  targetId: string;
  targetName: string;
  notifiedAt: string;
  cost: number;                 // 通知费用（紧急联系人0元，周围用户收费）
}

/** SOS事件 */
export interface SOSEvent {
  id: string;
  source: SOSSource;
  triggeredAt: string;
  userId: string;
  userName: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  status: 'pending_confirm' | 'confirmed' | 'false_alarm' | 'expired';
  depositAmount: number;        // 押金金额
  depositStatus: 'held' | 'refunded' | 'deducted';
  confirmDeadline: string;      // 确认截止时间
  confirmedAt?: string;
  confirmEvidence?: SOSConfirmEvidence;
  aiVerdict?: 'real' | 'suspicious' | 'unknown'; // AI初步判断
  // 分级通知（P4增强）
  notifications: SOSNotification[];
  totalNotifyCost: number;      // 通知总费用
  // 行善顾问 + 保护模式上下文
  sceneContext?: SOSSceneContext;
  protectionEvidence?: SOSProtectionEvidence;
}

/** SOS确认证据 */
export interface SOSConfirmEvidence {
  hasPhoto: boolean;
  hasVideo: boolean;
  hasPoliceReport: boolean;
  hasWitness: boolean;
  hasHospitalRecord: boolean;
  description: string;
  uploadedAt: string;
}

/** AI善行顾问评估的上下文（SOS触发时自动携带） */
export interface SOSSceneContext {
  /** AI顾问评估等级 */
  adviceLevel?: string;
  /** AI顾问评估的危险系数 */
  dangerScore?: number;
  /** 场景描述（用户语音/摄像头感知的内容） */
  sceneDescription?: string;
  /** 受助人描述 */
  subjectDescription?: string;
  /** 受助人数量 */
  subjectCount?: number;
  /** 受助人状态 */
  subjectStatus?: string;
  /** 行善类型 */
  actionType?: string;
  /** 建议采取的措施 */
  recommendedActions?: string[];
  /** 评估时间 */
  assessedAt?: string;
}

/** 保护模式收集到的证据摘要（SOS触发时自动携带） */
export interface SOSProtectionEvidence {
  /** 保护模式会话ID */
  sessionId?: string;
  /** 保护时长（秒） */
  duration?: number;
  /** 录像时长（秒） */
  videoDuration?: number;
  /** 录音时长（秒） */
  audioDuration?: number;
  /** GPS轨迹点数 */
  gpsPoints?: number;
  /** 拍照数 */
  photos?: number;
  /** 最后已知位置 */
  lastKnownLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
    updatedAt: string;
  };
  /** 是否正在录像 */
  isRecording?: boolean;
  /** 是否正在录音 */
  isAudioRecording?: boolean;
  /** 紧急联系人数量 */
  emergencyContactCount?: number;
}

/** 定时安全确认任务 */
export interface SafetyCheckTask {
  id: string;
  userId: string;
  startedAt: string;
  expectedEndAt: string;        // 预计完成时间
  extendedAt?: string;          // 延长后的时间
  status: 'active' | 'extended' | 'completed' | 'timeout_sos';
  activityDescription: string;  // 善行描述
  sosEventId?: string;          // 超时后触发的SOS事件ID
}

// ============================================
// 配置常量
// ============================================

export const SOS_CONFIG = {
  // 押金
  DEPOSIT_AMOUNT: 50,              // 每次SOS预扣50元
  CONFIRM_WINDOW_HOURS: 24,        // 24小时确认窗口
  REFUND_FULL: true,               // 真实SOS全额退还

  // 分级通知费用（P4增强）
  NOTIFY_COST: {
    EMERGENCY_CONTACT: 0,          // 紧急联系人：免费（信任关系）
    NEARBY_USER: 10,               // 周围好事发生用户：¥10/人（防止滥用损害热心人）
  },
  MAX_NEARBY_NOTIFY: 5,            // 最多通知5位周围用户

  // 定时安全确认
  SAFETY_CHECK_DEFAULT_MINUTES: 30, // 默认30分钟
  SAFETY_CHECK_MAX_MINUTES: 120,    // 最长120分钟
  EXTENSION_MINUTES: 15,            // 每次延长15分钟
  EXTENSION_MAX_COUNT: 3,           // 最多延长3次

  // 语音触发
  VOICE_TRIGGER_KEYWORDS: ['救命', '我被讹了', '救我', '报警', '出事了'],
  VOICE_TRIGGER_CONFIDENCE: 0.8,    // 置信度阈值

  // 摔倒检测
  FALL_IMPACT_THRESHOLD: 2.5,       // 加速度阈值(g)
  FALL_INACTIVITY_SECONDS: 5,       // 摔倒后5秒无活动触发

  // 通知
  AUTO_NOTIFY_CONTACTS: true,       // 自动通知紧急联系人
  AUTO_UPLOAD_EVIDENCE: true,       // 自动上传证据到云端
};

// ============================================
// SOS事件管理
// ============================================

let _sosEvents: SOSEvent[] = [];
let _safetyTasks: SafetyCheckTask[] = [];
let _sosListeners: Array<(events: SOSEvent[]) => void> = [];
let _safetyListeners: Array<(tasks: SafetyCheckTask[]) => void> = [];

/**
 * 触发SOS（带押金预扣）
 */
/**
 * 执行分级通知
 * 紧急联系人免费，周围好事发生用户收费
 */
const executeTieredNotifications = (
  _eventId: string,
  emergencyContacts: { id: string; name: string }[] = [],
  nearbyUsers: { id: string; name: string }[] = []
): { notifications: SOSNotification[]; totalCost: number; summary: string } => {
  const now = new Date().toISOString();
  const notifications: SOSNotification[] = [];
  let totalCost = 0;

  // 1. 通知紧急联系人（免费）
  emergencyContacts.forEach(contact => {
    notifications.push({
      targetType: 'emergency_contact',
      targetId: contact.id,
      targetName: contact.name,
      notifiedAt: now,
      cost: SOS_CONFIG.NOTIFY_COST.EMERGENCY_CONTACT,
    });
  });

  // 2. 通知周围好事发生用户（收费，防止滥用损害热心人）
  const limitedNearby = nearbyUsers.slice(0, SOS_CONFIG.MAX_NEARBY_NOTIFY);
  limitedNearby.forEach(user => {
    const cost = SOS_CONFIG.NOTIFY_COST.NEARBY_USER;
    notifications.push({
      targetType: 'nearby_user',
      targetId: user.id,
      targetName: user.name,
      notifiedAt: now,
      cost,
    });
    totalCost += cost;
  });

  const summary = [
    `已通知 ${emergencyContacts.length} 位紧急联系人（免费）`,
    totalCost > 0
      ? `已通知 ${limitedNearby.length} 位附近热心用户（¥${totalCost}）`
      : '未通知附近用户',
  ].join('，');

  return { notifications, totalCost, summary };
};

/**
 * 触发SOS（带押金预扣 + 分级通知 + 场景上下文）
 */
export const triggerSOSWithGuard = (
  source: SOSSource,
  userId: string,
  userName: string,
  location?: { latitude: number; longitude: number; address: string; },
  emergencyContacts: { id: string; name: string }[] = [],
  nearbyUsers: { id: string; name: string }[] = [],
  sceneContext?: SOSSceneContext,
  protectionEvidence?: SOSProtectionEvidence
): { event: SOSEvent; message: string } => {
  const now = new Date();
  const confirmDeadline = new Date(now.getTime() + SOS_CONFIG.CONFIRM_WINDOW_HOURS * 60 * 60 * 1000);

  // 执行分级通知
  const { notifications, totalCost, summary } = executeTieredNotifications(
    `sos_${Date.now()}`,
    emergencyContacts,
    nearbyUsers
  );

  const event: SOSEvent = {
    id: `sos_${Date.now()}`,
    source,
    triggeredAt: now.toISOString(),
    userId,
    userName,
    location,
    status: 'pending_confirm',
    depositAmount: SOS_CONFIG.DEPOSIT_AMOUNT,
    depositStatus: 'held',
    confirmDeadline: confirmDeadline.toISOString(),
    notifications,
    totalNotifyCost: totalCost,
    // 自动携带行善顾问评估和保护模式证据
    sceneContext,
    protectionEvidence,
  };

  _sosEvents = [event, ..._sosEvents];
  _notifySOSListeners();

  // 启动确认倒计时
  _startConfirmCountdown(event.id);

  const sourceLabels: Record<SOSSource, string> = {
    protection_mode: '保护模式中',
    quick_button: '快捷按钮',
    safety_timeout: '安全确认超时',
    voice_trigger: '语音触发',
    fall_detection: '摔倒检测',
    watch_triple_tap: '手表三连击',
    auto_emergency: '自动检测',
  };

  return {
    event,
    message: [
      `🆘 SOS已触发（${sourceLabels[source]}）`,
      '',
      summary,
      '',
      // 附带场景上下文摘要
      sceneContext?.sceneDescription ? `📍 现场情况：${sceneContext.sceneDescription}` : '',
      sceneContext?.subjectDescription ? `👤 受助人：${sceneContext.subjectDescription}` : '',
      protectionEvidence ? `🛡️ 保护模式已运行${Math.floor((protectionEvidence.duration || 0) / 60)}分${(protectionEvidence.duration || 0) % 60}秒（录像${Math.floor((protectionEvidence.videoDuration || 0) / 60)}分${(protectionEvidence.videoDuration || 0) % 60}秒 · 录音${Math.floor((protectionEvidence.audioDuration || 0) / 60)}分${(protectionEvidence.audioDuration || 0) % 60}秒 · GPS${protectionEvidence.gpsPoints || 0}个点 · 照片${protectionEvidence.photos || 0}张）` : '',
      '',
      `押金 ¥${SOS_CONFIG.DEPOSIT_AMOUNT} 已预扣，请在${SOS_CONFIG.CONFIRM_WINDOW_HOURS}小时内提交确认。`,
      totalCost > 0 ? `通知费用 ¥${totalCost} 将从押金中扣除。` : '',
    ].filter(Boolean).join('\n'),
  };
};

/**
 * 提交SOS确认证据
 * 用户提交照片/视频/报警回执等证明SOS真实性
 */
export const submitSOSConfirmation = (
  sosEventId: string,
  evidence: Omit<SOSConfirmEvidence, 'uploadedAt'>
): { success: boolean; message: string; event?: SOSEvent } => {
  const eventIndex = _sosEvents.findIndex(e => e.id === sosEventId);
  if (eventIndex === -1) {
    return { success: false, message: '未找到SOS事件' };
  }

  const event = _sosEvents[eventIndex];
  if (event.status !== 'pending_confirm') {
    return { success: false, message: '该SOS事件已处理，无法再次确认' };
  }

  const now = new Date().toISOString();

  // AI简单判断证据充分性
  const evidenceScore = (
    (evidence.hasPhoto ? 1 : 0) +
    (evidence.hasVideo ? 2 : 0) +
    (evidence.hasPoliceReport ? 3 : 0) +
    (evidence.hasWitness ? 1 : 0) +
    (evidence.hasHospitalRecord ? 2 : 0)
  );

  const aiVerdict: SOSEvent['aiVerdict'] = evidenceScore >= 3 ? 'real' : evidenceScore >= 1 ? 'unknown' : 'suspicious';

  // 更新事件
  const updatedEvent: SOSEvent = {
    ...event,
    status: 'confirmed',
    confirmedAt: now,
    confirmEvidence: { ...evidence, uploadedAt: now },
    aiVerdict,
    depositStatus: 'refunded',
  };

  _sosEvents = [
    ..._sosEvents.slice(0, eventIndex),
    updatedEvent,
    ..._sosEvents.slice(eventIndex + 1),
  ];

  _notifySOSListeners();

  return {
    success: true,
    message: aiVerdict === 'real'
      ? `✅ SOS已确认真实。押金 ¥${event.depositAmount} 已全额退还。感谢您的信任。`
      : `⏳ SOS已收到确认，正在审核中。押金 ¥${event.depositAmount} 将在审核通过后退还。`,
    event: updatedEvent,
  };
};

/**
 * 标记SOS为误报（用户主动取消）
 */
export const markSOSAsFalseAlarm = (sosEventId: string): { success: boolean; message: string } => {
  const eventIndex = _sosEvents.findIndex(e => e.id === sosEventId);
  if (eventIndex === -1) {
    return { success: false, message: '未找到SOS事件' };
  }

  const event = _sosEvents[eventIndex];
  if (event.status !== 'pending_confirm') {
    return { success: false, message: '该SOS事件已处理' };
  }

  const updatedEvent: SOSEvent = {
    ...event,
    status: 'false_alarm',
    depositStatus: 'deducted',
  };

  _sosEvents = [
    ..._sosEvents.slice(0, eventIndex),
    updatedEvent,
    ..._sosEvents.slice(eventIndex + 1),
  ];

  _notifySOSListeners();

  return {
    success: true,
    message: `⚠️ 已标记为误报。押金 ¥${event.depositAmount} 将作为平台运营成本扣除。频繁误报将影响您的信用评分。`,
  };
};

/**
 * 获取SOS事件列表
 */
export const getSOSEvents = (userId?: string): SOSEvent[] => {
  if (userId) {
    return _sosEvents.filter(e => e.userId === userId);
  }
  return [..._sosEvents];
};

// ============================================
// 定时安全确认
// ============================================

/**
 * 创建定时安全确认任务
 * 用户设置预计完成善行的时间，超时自动SOS
 */
export const createSafetyCheck = (
  userId: string,
  activityDescription: string,
  durationMinutes: number = SOS_CONFIG.SAFETY_CHECK_DEFAULT_MINUTES
): SafetyCheckTask => {
  const now = new Date();
  const expectedEnd = new Date(now.getTime() + durationMinutes * 60 * 1000);

  const task: SafetyCheckTask = {
    id: `sc_${Date.now()}`,
    userId,
    startedAt: now.toISOString(),
    expectedEndAt: expectedEnd.toISOString(),
    status: 'active',
    activityDescription,
  };

  _safetyTasks = [task, ..._safetyTasks];
  _notifySafetyListeners();

  // 启动超时检测
  _startSafetyTimeout(task.id);

  return task;
};

/**
 * 延长安全确认时间
 */
export const extendSafetyCheck = (taskId: string): { success: boolean; message: string; task?: SafetyCheckTask } => {
  const taskIndex = _safetyTasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    return { success: false, message: '未找到安全确认任务' };
  }

  const task = _safetyTasks[taskIndex];
  if (task.status !== 'active' && task.status !== 'extended') {
    return { success: false, message: '该任务已结束' };
  }

  const extendCount = task.extendedAt ? task.extendedAt.split(',').length : 0;
  if (extendCount >= SOS_CONFIG.EXTENSION_MAX_COUNT) {
    return { success: false, message: `已达到最大延长次数（${SOS_CONFIG.EXTENSION_MAX_COUNT}次）` };
  }

  const newEnd = new Date(new Date(task.expectedEndAt).getTime() + SOS_CONFIG.EXTENSION_MINUTES * 60 * 1000);

  const updatedTask: SafetyCheckTask = {
    ...task,
    expectedEndAt: newEnd.toISOString(),
    extendedAt: task.extendedAt ? `${task.extendedAt},${new Date().toISOString()}` : new Date().toISOString(),
    status: 'extended',
  };

  _safetyTasks = [
    ..._safetyTasks.slice(0, taskIndex),
    updatedTask,
    ..._safetyTasks.slice(taskIndex + 1),
  ];

  _notifySafetyListeners();

  return {
    success: true,
    message: `已延长${SOS_CONFIG.EXTENSION_MINUTES}分钟，请在${newEnd.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}前完成`,
    task: updatedTask,
  };
};

/**
 * 完成安全确认（用户主动标记已完成）
 */
export const completeSafetyCheck = (taskId: string): { success: boolean; message: string } => {
  const taskIndex = _safetyTasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    return { success: false, message: '未找到安全确认任务' };
  }

  const task = _safetyTasks[taskIndex];
  if (task.status === 'timeout_sos') {
    return { success: false, message: '该任务已超时并自动触发SOS' };
  }

  const updatedTask: SafetyCheckTask = {
    ...task,
    status: 'completed',
  };

  _safetyTasks = [
    ..._safetyTasks.slice(0, taskIndex),
    updatedTask,
    ..._safetyTasks.slice(taskIndex + 1),
  ];

  _notifySafetyListeners();

  return { success: true, message: '✅ 安全确认完成，任务已关闭' };
};

/**
 * 获取安全确认任务
 */
export const getSafetyTasks = (userId?: string): SafetyCheckTask[] => {
  if (userId) {
    return _safetyTasks.filter(t => t.userId === userId);
  }
  return [..._safetyTasks];
};

// ============================================
// 内部定时器
// ============================================

function _startConfirmCountdown(sosEventId: string) {
  const event = _sosEvents.find(e => e.id === sosEventId);
  if (!event) return;

  const deadline = new Date(event.confirmDeadline).getTime();
  const now = Date.now();
  const delay = deadline - now;

  if (delay <= 0) {
    _expireSOS(sosEventId);
    return;
  }

  setTimeout(() => {
    const current = _sosEvents.find(e => e.id === sosEventId);
    if (current && current.status === 'pending_confirm') {
      _expireSOS(sosEventId);
    }
  }, delay);
}

function _expireSOS(sosEventId: string) {
  const eventIndex = _sosEvents.findIndex(e => e.id === sosEventId);
  if (eventIndex === -1) return;

  const event = _sosEvents[eventIndex];
  if (event.status !== 'pending_confirm') return;

  _sosEvents = [
    ..._sosEvents.slice(0, eventIndex),
    { ...event, status: 'expired', depositStatus: 'deducted' },
    ..._sosEvents.slice(eventIndex + 1),
  ];

  _notifySOSListeners();
}

function _startSafetyTimeout(taskId: string) {
  const task = _safetyTasks.find(t => t.id === taskId);
  if (!task) return;

  const deadline = new Date(task.expectedEndAt).getTime();
  const delay = deadline - Date.now();

  if (delay <= 0) {
    _triggerSafetyTimeoutSOS(taskId);
    return;
  }

  setTimeout(() => {
    const current = _safetyTasks.find(t => t.id === taskId);
    if (current && (current.status === 'active' || current.status === 'extended')) {
      _triggerSafetyTimeoutSOS(taskId);
    }
  }, delay);
}

function _triggerSafetyTimeoutSOS(taskId: string) {
  const taskIndex = _safetyTasks.findIndex(t => t.id === taskId);
  if (taskIndex === -1) return;

  const task = _safetyTasks[taskIndex];

  // 触发自动SOS
  const sosResult = triggerSOSWithGuard(
    'safety_timeout',
    task.userId,
    '用户',
    undefined
  );

  const updatedTask: SafetyCheckTask = {
    ...task,
    status: 'timeout_sos',
    sosEventId: sosResult.event.id,
  };

  _safetyTasks = [
    ..._safetyTasks.slice(0, taskIndex),
    updatedTask,
    ..._safetyTasks.slice(taskIndex + 1),
  ];

  _notifySafetyListeners();
}

// ============================================
// 监听器
// ============================================

export const onSOSEventsChange = (listener: (events: SOSEvent[]) => void) => {
  _sosListeners.push(listener);
  return () => { _sosListeners = _sosListeners.filter(l => l !== listener); };
};

export const onSafetyTasksChange = (listener: (tasks: SafetyCheckTask[]) => void) => {
  _safetyListeners.push(listener);
  return () => { _safetyListeners = _safetyListeners.filter(l => l !== listener); };
};

function _notifySOSListeners() {
  _sosListeners.forEach(l => l([..._sosEvents]));
}

function _notifySafetyListeners() {
  _safetyListeners.forEach(l => l([..._safetyTasks]));
}

// ============================================
// 统计
// ============================================

/**
 * 获取用户SOS统计
 */
export const getUserSOSStats = (userId: string): {
  total: number;
  confirmed: number;
  falseAlarm: number;
  expired: number;
  depositHeld: number;
  depositRefunded: number;
  depositDeducted: number;
} => {
  const userEvents = _sosEvents.filter(e => e.userId === userId);
  return {
    total: userEvents.length,
    confirmed: userEvents.filter(e => e.status === 'confirmed').length,
    falseAlarm: userEvents.filter(e => e.status === 'false_alarm').length,
    expired: userEvents.filter(e => e.status === 'expired').length,
    depositHeld: userEvents.filter(e => e.depositStatus === 'held').reduce((sum, e) => sum + e.depositAmount, 0),
    depositRefunded: userEvents.filter(e => e.depositStatus === 'refunded').reduce((sum, e) => sum + e.depositAmount, 0),
    depositDeducted: userEvents.filter(e => e.depositStatus === 'deducted').reduce((sum, e) => sum + e.depositAmount, 0),
  };
};
