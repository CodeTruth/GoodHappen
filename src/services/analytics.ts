import Taro from '@tarojs/taro';

// 埋点事件缓存 Key
const EVENT_CACHE_KEY = 'haoshi_analytics_event_cache';
// 批量上报阈值（累积超过该条数则上报）
const BATCH_UPLOAD_THRESHOLD = 20;
// 上报间隔（毫秒）：每60秒尝试上报一次
const UPLOAD_INTERVAL = 60 * 1000;
// 最大缓存事件数（防止无限增长）
const MAX_CACHE_SIZE = 500;

// 埋点事件名称类型
export type AnalyticsEventName =
  | 'page_view'           // 页面浏览
  | 'button_click'        // 按钮点击
  | 'kindness_publish'    // 善行发布
  | 'kindness_like'       // 善行点赞
  | 'kindness_comment'    // 善行评论
  | 'challenge_join'      // 挑战加入
  | 'charity_accept'      // 公益接单
  | 'share_poster'        // 分享海报
  | 'ai_response_view';   // AI回应查看

// 埋点事件结构
export interface AnalyticsEvent {
  // 事件唯一ID
  id: string;
  // 事件名称
  name: AnalyticsEventName;
  // 事件参数
  params: Record<string, unknown>;
  // 事件发生时间
  timestamp: string;
  // 用户ID（如有）
  userId?: string;
  // 设备ID
  deviceId?: string;
}

// 上报结果
interface UploadResult {
  success: boolean;
  uploadedCount: number;
  error?: string;
}

// 生成事件ID
const generateEventId = (): string => {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

// 获取设备ID（模拟，实际项目中从设备信息获取）
const getDeviceId = (): string => {
  try {
    let deviceId = Taro.getStorageSync('haoshi_device_id');
    if (!deviceId) {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      Taro.setStorageSync('haoshi_device_id', deviceId);
    }
    return deviceId;
  } catch {
    return 'dev_unknown';
  }
};

// 从本地缓存读取事件队列
export const loadEventCache = (): AnalyticsEvent[] => {
  try {
    const data = Taro.getStorageSync(EVENT_CACHE_KEY);
    if (data) {
      return JSON.parse(data) as AnalyticsEvent[];
    }
  } catch (e) {
    console.error('[Analytics] 加载事件缓存失败:', e);
  }
  return [];
};

// 保存事件队列到本地缓存
const saveEventCache = (events: AnalyticsEvent[]): void => {
  try {
    // 限制最大缓存数，超出则丢弃最早的事件
    const trimmed = events.slice(-MAX_CACHE_SIZE);
    Taro.setStorageSync(EVENT_CACHE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('[Analytics] 保存事件缓存失败:', e);
  }
};

// 追加事件到缓存
const appendEventToCache = (event: AnalyticsEvent): void => {
  const cache = loadEventCache();
  cache.push(event);
  saveEventCache(cache);
};

// 清空已上报的事件
const clearUploadedEvents = (count: number): void => {
  const cache = loadEventCache();
  const remaining = cache.slice(count);
  saveEventCache(remaining);
};

// 使用 Taro.reportEvent 上报（微信小程序原生埋点）
const reportViaTaro = (event: AnalyticsEvent): boolean => {
  try {
    // Taro.reportEvent 是微信小程序的数据上报API
    // 实际项目中需在微信公众平台配置事件
    if (typeof Taro.reportEvent === 'function') {
      const result = (Taro as any).reportEvent(event.name, event.params);
      // H5 环境中 reportEvent 由 temporarilyNotSupport 包装，返回 rejected Promise
      if (result && typeof result.catch === 'function') {
        result.catch(() => { /* H5 不支持 reportEvent，静默忽略 */ });
      }
      return true;
    }
    return false;
  } catch (e) {
    console.warn('[Analytics] Taro.reportEvent 调用失败:', e);
    return false;
  }
};

// 批量上报到服务端（模拟）
const uploadToServer = async (events: AnalyticsEvent[]): Promise<UploadResult> => {
  try {
    // 实际项目中调用服务端接口批量上报
    // 这里模拟网络请求
    console.log('[Analytics] 批量上报事件:', {
      count: events.length,
      events: events.slice(0, 3).map((e) => ({ name: e.name, timestamp: e.timestamp })),
    });

    // 模拟网络延迟
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 模拟90%成功率
    if (Math.random() < 0.1) {
      throw new Error('模拟网络错误');
    }

    return { success: true, uploadedCount: events.length };
  } catch (error) {
    console.error('[Analytics] 批量上报失败:', error);
    return { success: false, uploadedCount: 0, error: String(error) };
  }
};

// 记录单个事件（写入本地缓存，不立即上报）
export const trackEvent = (
  name: AnalyticsEventName,
  params: Record<string, unknown> = {},
  userId?: string
): void => {
  const event: AnalyticsEvent = {
    id: generateEventId(),
    name,
    params,
    timestamp: new Date().toISOString(),
    userId,
    deviceId: getDeviceId(),
  };

  // 写入本地缓存
  appendEventToCache(event);

  // 尝试通过 Taro.reportEvent 实时上报（如果可用）
  reportViaTaro(event);

  // 如果缓存超过阈值，触发批量上报
  const cache = loadEventCache();
  if (cache.length >= BATCH_UPLOAD_THRESHOLD) {
    flushEvents().catch((e) => {
      console.warn('[Analytics] 自动批量上报失败:', e);
    });
  }
};

// 批量上报所有缓存事件
export const flushEvents = async (): Promise<UploadResult> => {
  const cache = loadEventCache();
  if (cache.length === 0) {
    return { success: true, uploadedCount: 0 };
  }

  const result = await uploadToServer(cache);

  if (result.success) {
    // 上报成功，清空已上报事件
    clearUploadedEvents(result.uploadedCount);
    console.log('[Analytics] 批量上报成功:', result.uploadedCount);
  }

  return result;
};

// 获取当前缓存事件数
export const getPendingEventCount = (): number => {
  return loadEventCache().length;
};

// 定时上报器：启动后每隔一段时间尝试上报
let uploadTimer: ReturnType<typeof setInterval> | null = null;

export const startAutoUpload = (): void => {
  if (uploadTimer) return;
  uploadTimer = setInterval(() => {
    flushEvents().catch((e) => {
      console.warn('[Analytics] 定时上报失败:', e);
    });
  }, UPLOAD_INTERVAL);
  console.log('[Analytics] 自动上报已启动，间隔:', UPLOAD_INTERVAL, 'ms');
};

export const stopAutoUpload = (): void => {
  if (uploadTimer) {
    clearInterval(uploadTimer);
    uploadTimer = null;
    console.log('[Analytics] 自动上报已停止');
  }
};

// 应用启动时调用：记录DAU、启动自动上报
export const initAnalytics = (userId?: string): void => {
  // 记录启动事件
  trackEvent('page_view', { page: 'app_launch' }, userId);
  // 启动自动上报
  startAutoUpload();
};

// 应用退出/隐藏时调用：立即上报所有缓存
export const flushOnExit = async (): Promise<void> => {
  await flushEvents();
  stopAutoUpload();
};
