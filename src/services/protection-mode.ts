/**
 * 善行保护模式 — 核心状态机服务
 *
 * 核心理念："做任何事前先保护好自己"
 * 一键启动 → 全程录像+GPS追踪+录音存证 → 紧急SOS → 事后证据链
 *
 * 支持设备：
 * - 手机端：完整功能（录像+录音+GPS+一键SOS）
 * - 手表/手环端：极简模式（SOS+震动+GPS+简短录音）
 */

// ============================================
// 类型定义
// ============================================

/** 保护模式状态 */
export type ProtectionModeStatus =
  | 'idle'        // 未启动
  | 'starting'    // 启动中（初始化GPS、摄像头、麦克风）
  | 'active'      // 保护中（录像+录音+GPS追踪）
  | 'paused'      // 暂停（保留GPS，暂停录像/录音）
  | 'sos'         // 紧急求助已触发
  | 'closed';     // 已关闭（生成证据包）

/** 设备类型 */
export type DeviceType = 'phone' | 'watch' | 'band';

/** 保护会话 */
export interface ProtectionSession {
  id: string;
  status: ProtectionModeStatus;
  deviceType: DeviceType;
  startedAt: string;
  closedAt?: string;
  duration: number;               // 持续时间（秒）

  // 实时数据
  currentGps?: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy: number;
    updatedAt: string;
  };
  isRecording: boolean;           // 是否正在录像
  isAudioRecording: boolean;      // 是否正在录音
  gpsTrackPoints: number;         // GPS轨迹点数

  // 紧急联系人
  emergencyContacts: EmergencyContact[];

  // 证据收集
  evidenceCollected: {
    videoDuration: number;         // 录像时长（秒）
    audioDuration: number;        // 录音时长（秒）
    gpsPoints: number;            // GPS点数
    photos: number;                // 拍照数
  };

  // SOS 信息
  sosTriggeredAt?: string;
  sosReason?: string;

  // 穿戴设备特有
  watchVibrateCount?: number;     // 震动提醒次数
  watchBatteryLevel?: number;     // 手表电量
}

/** 紧急联系人 */
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relation: string;               // 家人/朋友/同事
  notified: boolean;
}

/** 保护模式配置 */
export const PROTECTION_MODE_CONFIG = {
  // GPS
  GPS_TRACK_INTERVAL_MS: 5000,        // GPS追踪间隔 5秒
  GPS_MIN_ACCURACY: 20,                // GPS精度阈值 20米

  // 录像
  VIDEO_MAX_DURATION_MINUTES: 60,      // 最长录像 60分钟
  VIDEO_RESOLUTION: '720p',             // 录像分辨率
  VIDEO_AUTO_SAVE_INTERVAL_S: 30,      // 每30秒自动保存片段

  // 录音
  AUDIO_MAX_DURATION_MINUTES: 60,      // 最长录音 60分钟

  // SOS
  SOS_AUTO_TRIGGER_DELAY_S: 10,       // 紧急检测后自动触发延迟 10秒
  SOS_COUNTDOWN_S: 5,                  // SOS倒计时 5秒

  // 穿戴设备
  WATCH_VIBRATE_PATTERN: [200, 100, 200, 100, 200], // 震动模式(ms)
  WATCH_SOS_LONG_PRESS_MS: 3000,      // 长按3秒触发SOS
  WATCH_GPS_INTERVAL_MS: 10000,        // 手表GPS间隔 10秒

  // 电池保护
  LOW_BATTERY_THRESHOLD: 20,           // 低电量阈值 20%
  LOW_BATTERY_MODE: 'gps-only',        // 低电量模式：仅保留GPS
};

// ============================================
// 状态机
// ============================================

/** 合法状态转换 */
const VALID_TRANSITIONS: Record<ProtectionModeStatus, ProtectionModeStatus[]> = {
  idle: ['starting'],
  starting: ['active', 'closed'],
  active: ['paused', 'sos', 'closed'],
  paused: ['active', 'closed'],
  sos: ['closed'],
  closed: ['idle'],
};

/**
 * 检查状态转换是否合法
 */
export const canTransition = (
  from: ProtectionModeStatus,
  to: ProtectionModeStatus
): boolean => {
  return VALID_TRANSITIONS[from]?.includes(to) || false;
};

/**
 * 获取状态中文标签
 */
export const getStatusLabel = (status: ProtectionModeStatus): string => {
  const map: Record<ProtectionModeStatus, string> = {
    idle: '未启动',
    starting: '启动中...',
    active: '保护中',
    paused: '已暂停',
    sos: '紧急求助',
    closed: '已结束',
  };
  return map[status];
};

/**
 * 获取状态对应的颜色
 */
export const getStatusColor = (status: ProtectionModeStatus): string => {
  const map: Record<ProtectionModeStatus, string> = {
    idle: '#9E9E9E',
    starting: '#FFA726',
    active: '#4CAF50',
    paused: '#FF9800',
    sos: '#F44336',
    closed: '#78909C',
  };
  return map[status];
};

// ============================================
// 会话管理
// ============================================

let _currentSession: ProtectionSession | null = null;
let _gpsTimer: ReturnType<typeof setInterval> | null = null;
let _durationTimer: ReturnType<typeof setInterval> | null = null;
let _sessionListeners: Array<(session: ProtectionSession | null) => void> = [];

/**
 * 创建新会话
 */
export const createSession = (
  deviceType: DeviceType = 'phone',
  emergencyContacts: EmergencyContact[] = []
): ProtectionSession => {
  const now = new Date().toISOString();
  const session: ProtectionSession = {
    id: `pm_${Date.now()}`,
    status: 'starting',
    deviceType,
    startedAt: now,
    duration: 0,
    isRecording: false,
    isAudioRecording: false,
    gpsTrackPoints: 0,
    emergencyContacts,
    evidenceCollected: {
      videoDuration: 0,
      audioDuration: 0,
      gpsPoints: 0,
      photos: 0,
    },
  };

  _currentSession = session;
  _notifyListeners();

  // 模拟启动过程
  setTimeout(() => {
    if (_currentSession?.id === session.id && _currentSession.status === 'starting') {
      _currentSession = {
        ..._currentSession,
        status: 'active',
        isRecording: deviceType === 'phone',
        isAudioRecording: true,
        currentGps: {
          latitude: 39.9045,
          longitude: 116.4078,
          address: '当前位置（模拟）',
          accuracy: 10,
          updatedAt: new Date().toISOString(),
        },
      };
      _startTracking();
      _notifyListeners();
    }
  }, 1500);

  return session;
};

/**
 * 暂停保护
 */
export const pauseSession = (): ProtectionSession | null => {
  if (!_currentSession || !canTransition(_currentSession.status, 'paused')) return null;
  _currentSession = {
    ..._currentSession,
    status: 'paused',
    isRecording: false,
    isAudioRecording: false,
  };
  _notifyListeners();
  return _currentSession;
};

/**
 * 恢复保护
 */
export const resumeSession = (): ProtectionSession | null => {
  if (!_currentSession || !canTransition(_currentSession.status, 'active')) return null;
  _currentSession = {
    ..._currentSession,
    status: 'active',
    isRecording: _currentSession.deviceType === 'phone',
    isAudioRecording: true,
  };
  _notifyListeners();
  return _currentSession;
};

/**
 * 触发紧急求助
 */
export const triggerSOS = (reason?: string): ProtectionSession | null => {
  if (!_currentSession) return null;
  _currentSession = {
    ..._currentSession,
    status: 'sos',
    sosTriggeredAt: new Date().toISOString(),
    sosReason: reason || '善行者手动触发紧急求助',
  };
  // 通知紧急联系人
  _currentSession.emergencyContacts = _currentSession.emergencyContacts.map(c => ({
    ...c,
    notified: true,
  }));
  _notifyListeners();
  return _currentSession;
};

/**
 * 关闭保护模式（生成证据包）
 */
export const closeSession = (): ProtectionSession | null => {
  if (!_currentSession) return null;
  _stopTracking();
  _currentSession = {
    ..._currentSession,
    status: 'closed',
    closedAt: new Date().toISOString(),
    isRecording: false,
    isAudioRecording: false,
  };
  const closed = { ..._currentSession };
  _notifyListeners();
  return closed;
};

/**
 * 获取当前会话
 */
export const getCurrentSession = (): ProtectionSession | null => {
  return _currentSession;
};

/**
 * 拍照（保护期间快速取证）
 */
export const takeProtectionPhoto = (): ProtectionSession | null => {
  if (!_currentSession || _currentSession.status !== 'active') return null;
  _currentSession = {
    ..._currentSession,
    evidenceCollected: {
      ..._currentSession.evidenceCollected,
      photos: _currentSession.evidenceCollected.photos + 1,
    },
  };
  _notifyListeners();
  return _currentSession;
};

// ============================================
// 内部追踪
// ============================================

function _startTracking() {
  // GPS追踪
  _gpsTimer = setInterval(() => {
    if (!_currentSession || _currentSession.status === 'closed') {
      _stopTracking();
      return;
    }
    if (_currentSession.status === 'active' || _currentSession.status === 'sos') {
      _currentSession = {
        ..._currentSession,
        gpsTrackPoints: _currentSession.gpsTrackPoints + 1,
        evidenceCollected: {
          ..._currentSession.evidenceCollected,
          gpsPoints: _currentSession.evidenceCollected.gpsPoints + 1,
        },
        currentGps: {
          ...(_currentSession.currentGps || {}),
          updatedAt: new Date().toISOString(),
        },
      };
    }
  }, PROTECTION_MODE_CONFIG.GPS_TRACK_INTERVAL_MS);

  // 时长计时
  _durationTimer = setInterval(() => {
    if (!_currentSession || _currentSession.status === 'closed') {
      _stopTracking();
      return;
    }
    if (_currentSession.status === 'active' || _currentSession.status === 'sos') {
      _currentSession = {
        ..._currentSession,
        duration: _currentSession.duration + 1,
        evidenceCollected: {
          ..._currentSession.evidenceCollected,
          videoDuration: _currentSession.isRecording
            ? _currentSession.evidenceCollected.videoDuration + 1
            : _currentSession.evidenceCollected.videoDuration,
          audioDuration: _currentSession.isAudioRecording
            ? _currentSession.evidenceCollected.audioDuration + 1
            : _currentSession.evidenceCollected.audioDuration,
        },
      };
    }
  }, 1000);

  _notifyListeners();
}

function _stopTracking() {
  if (_gpsTimer) { clearInterval(_gpsTimer); _gpsTimer = null; }
  if (_durationTimer) { clearInterval(_durationTimer); _durationTimer = null; }
}

// ============================================
// 监听器
// ============================================

/**
 * 监听会话变化（用于页面实时更新）
 */
export const onSessionChange = (listener: (session: ProtectionSession | null) => void) => {
  _sessionListeners.push(listener);
  return () => {
    _sessionListeners = _sessionListeners.filter(l => l !== listener);
  };
};

function _notifyListeners() {
  _sessionListeners.forEach(l => l(_currentSession ? { ..._currentSession } : null));
}

// ============================================
// 穿戴设备适配
// ============================================

/** 手表端极简操作 */
export const getWatchActions = (status: ProtectionModeStatus) => {
  switch (status) {
    case 'idle':
      return [
        { label: '长按启动', action: 'start', icon: '🛡️' },
        { label: '快速SOS', action: 'quick-sos', icon: '🆘' },
      ];
    case 'active':
      return [
        { label: '拍照取证', action: 'photo', icon: '📸' },
        { label: '紧急SOS', action: 'sos', icon: '🆘' },
        { label: '暂停', action: 'pause', icon: '⏸️' },
      ];
    case 'paused':
      return [
        { label: '继续', action: 'resume', icon: '▶️' },
        { label: '结束', action: 'close', icon: '⏹️' },
      ];
    case 'sos':
      return [
        { label: '拍照取证', action: 'photo', icon: '📸' },
        { label: '结束并保存', action: 'close', icon: '⏹️' },
      ];
    default:
      return [];
  }
};

/**
 * 格式化时长 mm:ss
 */
export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
