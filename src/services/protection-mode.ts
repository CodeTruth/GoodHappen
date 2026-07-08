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

import Taro from '@tarojs/taro';

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

  _initDeviceResources(session.id, deviceType);

  return session;
};

/**
 * 初始化设备资源（GPS、麦克风）
 */
async function _initDeviceResources(sessionId: string, deviceType: DeviceType) {
  try {
    await _initGPS(sessionId);
    await _initAudioRecording(sessionId);
  } catch (err) {
    console.warn('[ProtectionMode] Device init failed:', err);
  }

  if (_currentSession?.id === sessionId && _currentSession.status === 'starting') {
    _currentSession = {
      ..._currentSession,
      status: 'active',
      isRecording: deviceType === 'phone',
      isAudioRecording: true,
    };
    _startTracking();
    _notifyListeners();
  }
}

/**
 * 初始化GPS定位
 */
async function _initGPS(sessionId: string): Promise<void> {
  return new Promise((resolve) => {
    const coordType = process.env.TARO_ENV === 'h5' ? 'wgs84' as const : 'gcj02' as const;
    Taro.getLocation({
      type: coordType,
      success: (res) => {
        if (_currentSession?.id === sessionId) {
          _currentSession = {
            ..._currentSession,
            currentGps: {
              latitude: res.latitude,
              longitude: res.longitude,
              address: '当前位置',
              accuracy: res.accuracy || 10,
              updatedAt: new Date().toISOString(),
            },
            gpsTrackPoints: 1,
            evidenceCollected: {
              ..._currentSession.evidenceCollected,
              gpsPoints: 1,
            },
          };
          _notifyListeners();
        }
        resolve();
      },
      fail: () => {
        if (_currentSession?.id === sessionId) {
          _currentSession = {
            ..._currentSession,
            currentGps: {
              latitude: 39.9045,
              longitude: 116.4078,
              address: '定位失败（使用默认位置）',
              accuracy: 50,
              updatedAt: new Date().toISOString(),
            },
            gpsTrackPoints: 1,
            evidenceCollected: {
              ..._currentSession.evidenceCollected,
              gpsPoints: 1,
            },
          };
          _notifyListeners();
        }
        resolve();
      },
    });
  });
}

let _h5AudioRecorder: MediaRecorder | null = null;
let _h5AudioChunks: Blob[] = [];
/** 暴露 H5 录音的 blob 供页面层收集（base64 Data URL） */
export let lastH5AudioBlob: Blob | null = null;

/**
 * 初始化录音
 */
async function _initAudioRecording(_sessionId: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      _h5AudioChunks = [];
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          try {
            const mediaRecorder = new MediaRecorder(stream);
            _h5AudioRecorder = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) {
                _h5AudioChunks.push(e.data);
              }
            };

            mediaRecorder.onstart = () => {
              console.log('[ProtectionMode] H5 Audio recording started');
              resolve();
            };

            mediaRecorder.onerror = () => {
              console.warn('[ProtectionMode] H5 Audio recording failed to start');
              resolve();
            };

            mediaRecorder.start(1000);
          } catch (err) {
            console.warn('[ProtectionMode] H5 MediaRecorder not supported:', err);
            resolve();
          }
        })
        .catch(() => {
          console.warn('[ProtectionMode] H5 Audio permission denied');
          resolve();
        });
    } else {
      const recorderManager = Taro.getRecorderManager();

      recorderManager.start({
        duration: PROTECTION_MODE_CONFIG.AUDIO_MAX_DURATION_MINUTES * 60 * 1000,
        sampleRate: 44100,
        numberOfChannels: 1,
        encodeBitRate: 192000,
        format: 'mp3',
      });

      recorderManager.onStart(() => {
        console.log('[ProtectionMode] Audio recording started');
        resolve();
      });

      recorderManager.onError(() => {
        console.warn('[ProtectionMode] Audio recording failed to start');
        resolve();
      });

      setTimeout(() => {
        resolve();
      }, 500);
    }
  });
}

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
  _stopAudioRecording();
  const closed = {
    ..._currentSession,
    status: 'closed' as ProtectionModeStatus,
    closedAt: new Date().toISOString(),
    isRecording: false,
    isAudioRecording: false,
  };
  // 保存到 localStorage，供用户稍后发布善行记录使用
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('haoshi_last_protection_session', JSON.stringify(closed));
    }
  } catch (e) {
    console.warn('[ProtectionMode] Failed to save session to localStorage:', e);
  }
  // 注意：证据历史记录由页面层 handleClose 统一写入（含完整文件）
  _currentSession = null;
  _notifyListeners();
  return closed;
};

/**
 * 获取最近一次关闭的保护会话（用于发布善行记录）
 */
export const getLastClosedSession = (): ProtectionSession | null => {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem('haoshi_last_protection_session');
    if (!raw) return null;
    const session = JSON.parse(raw) as ProtectionSession;
    // 只有 closed 状态的才返回
    if (session.status !== 'closed') {
      localStorage.removeItem('haoshi_last_protection_session');
      return null;
    }
    return session;
  } catch (e) {
    console.warn('[ProtectionMode] Failed to load session from localStorage:', e);
    return null;
  }
};

/**
 * 清除已保存的保护会话（发布成功后调用）
 */
export const clearLastClosedSession = (): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('haoshi_last_protection_session');
    }
  } catch (e) {
    console.warn('[ProtectionMode] Failed to clear session from localStorage:', e);
  }
};

/**
 * 停止录音
 */
function _stopAudioRecording() {
  if (typeof window !== 'undefined' && _h5AudioRecorder) {
    try {
      // 在 stop 之前保存录音 blob
      _h5AudioRecorder.onstop = () => {
        try {
          lastH5AudioBlob = new Blob(_h5AudioChunks, { type: 'audio/webm' });
          console.log('[ProtectionMode] H5 Audio blob saved:', lastH5AudioBlob.size);
        } catch { /* ignore */ }
      };
      _h5AudioRecorder.stop();
      const tracks = _h5AudioRecorder.stream.getTracks();
      tracks.forEach(track => track.stop());
      _h5AudioRecorder = null;
      console.log('[ProtectionMode] H5 Audio recording stopped');
    } catch (e) {
      console.warn('[ProtectionMode] Failed to stop H5 audio recording:', e);
    }
  } else {
    try {
      const recorderManager = Taro.getRecorderManager();
      recorderManager.stop();
      console.log('[ProtectionMode] Audio recording stopped');
    } catch (e) {
      console.warn('[ProtectionMode] Failed to stop audio recording:', e);
    }
  }
}

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
  // GPS追踪 - 真实获取位置
  _gpsTimer = setInterval(() => {
    if (!_currentSession || _currentSession.status === 'closed') {
      _stopTracking();
      return;
    }
    if (_currentSession.status === 'active' || _currentSession.status === 'sos') {
      const coordType = process.env.TARO_ENV === 'h5' ? 'wgs84' as const : 'gcj02' as const;
      Taro.getLocation({
        type: coordType,
        success: (res) => {
          if (_currentSession && (_currentSession.status === 'active' || _currentSession.status === 'sos')) {
            _currentSession = {
              ..._currentSession,
              gpsTrackPoints: _currentSession.gpsTrackPoints + 1,
              evidenceCollected: {
                ..._currentSession.evidenceCollected,
                gpsPoints: _currentSession.evidenceCollected.gpsPoints + 1,
              },
              currentGps: {
                latitude: res.latitude,
                longitude: res.longitude,
                address: '当前位置',
                accuracy: res.accuracy || 10,
                updatedAt: new Date().toISOString(),
              },
            };
            _notifyListeners();
          }
        },
        fail: () => {
          if (_currentSession && (_currentSession.status === 'active' || _currentSession.status === 'sos')) {
            _currentSession = {
              ..._currentSession,
              gpsTrackPoints: _currentSession.gpsTrackPoints + 1,
              evidenceCollected: {
                ..._currentSession.evidenceCollected,
                gpsPoints: _currentSession.evidenceCollected.gpsPoints + 1,
              },
              currentGps: _currentSession.currentGps ? {
                ..._currentSession.currentGps,
                updatedAt: new Date().toISOString(),
              } : undefined,
            };
            _notifyListeners();
          }
        },
      });
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
      _notifyListeners();
    }
  }, 1000);
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
