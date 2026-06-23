import Taro from '@tarojs/taro';
import { useAnalyticsStore } from '@/store/analytics';
import { useFortuneStore, FortuneTransaction } from '@/store/fortune';
import { useModerationStore } from '@/store/moderation';

// 告警存储 Key
const ALERTS_STORAGE_KEY = 'haoshi_monitoring_alerts';

// ============================================
// 告警类型定义
// ============================================

// 告警级别
export type AlertLevel = 'info' | 'warning' | 'critical';

// 告警类型
export type AlertType =
  | 'kindness_anomaly'       // 善行发布量异常波动（突降/突升）
  | 'fortune_concentration'  // 福气值异常集中（防刷监控）
  | 'moderation_rejection'   // AI审核拒绝率异常
  | 'api_latency';           // API响应延迟超阈值

// 告警记录
export interface AlertRecord {
  // 告警ID
  id: string;
  // 告警级别
  level: AlertLevel;
  // 告警类型
  type: AlertType;
  // 告警标题
  title: string;
  // 告警描述
  description: string;
  // 当前指标值
  metricValue: number;
  // 阈值
  threshold: number;
  // 偏差比例（异常波动类）
  deviation?: number;
  // 关联用户ID（防刷类）
  userId?: string;
  // 创建时间
  createdAt: string;
  // 是否已处理
  resolved: boolean;
  // 处理时间
  resolvedAt?: string;
  // 处理备注
  resolveNote?: string;
}

// ============================================
// 监控阈值配置
// ============================================

// 善行发布量异常波动阈值：与前7天平均值比较，偏差超过50%告警
const KINDNESS_ANOMALY_THRESHOLD = 0.5;
// 福气值异常集中阈值：同一用户1小时内获得福气超过100
const FORTUNE_CONCENTRATION_THRESHOLD = 100;
// 福气值异常集中时间窗口（1小时，毫秒）
const FORTUNE_CONCENTRATION_WINDOW = 60 * 60 * 1000;
// AI审核拒绝率阈值：超过30%告警
const MODERATION_REJECTION_THRESHOLD = 0.3;
// API响应延迟阈值：AI响应超过5秒告警（毫秒）
const API_LATENCY_THRESHOLD = 5000;

// 生成告警ID
const generateAlertId = (): string => {
  return `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

// ============================================
// 告警持久化
// ============================================

// 从本地存储加载告警记录
export const loadAlerts = (): AlertRecord[] => {
  try {
    const data = Taro.getStorageSync(ALERTS_STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as AlertRecord[];
    }
  } catch (e) {
    console.error('[Monitoring] 加载告警记录失败:', e);
  }
  return [];
};

// 保存告警记录到本地存储
const saveAlerts = (alerts: AlertRecord[]): void => {
  try {
    // 最多保留500条告警记录
    const trimmed = alerts.slice(0, 500);
    Taro.setStorageSync(ALERTS_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('[Monitoring] 保存告警记录失败:', e);
  }
};

// 添加告警记录
export const addAlert = (alert: Omit<AlertRecord, 'id' | 'createdAt' | 'resolved'>): AlertRecord => {
  const record: AlertRecord = {
    ...alert,
    id: generateAlertId(),
    createdAt: new Date().toISOString(),
    resolved: false,
  };
  const alerts = loadAlerts();
  alerts.unshift(record);
  saveAlerts(alerts);
  console.warn('[Monitoring] 新增告警:', record.level, record.title);
  return record;
};

// 处理告警（标记为已处理）
export const resolveAlert = (id: string, note?: string): boolean => {
  const alerts = loadAlerts();
  const target = alerts.find((a) => a.id === id);
  if (!target) return false;
  target.resolved = true;
  target.resolvedAt = new Date().toISOString();
  target.resolveNote = note;
  saveAlerts(alerts);
  return true;
};

// 批量处理告警
export const resolveAllAlerts = (note?: string): number => {
  const alerts = loadAlerts();
  let count = 0;
  const now = new Date().toISOString();
  for (const alert of alerts) {
    if (!alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = now;
      alert.resolveNote = note;
      count++;
    }
  }
  saveAlerts(alerts);
  return count;
};

// 获取告警列表（可按级别/状态筛选）
export const getAlerts = (filter?: {
  level?: AlertLevel;
  resolved?: boolean;
}): AlertRecord[] => {
  let alerts = loadAlerts();
  if (filter?.level) {
    alerts = alerts.filter((a) => a.level === filter.level);
  }
  if (filter?.resolved !== undefined) {
    alerts = alerts.filter((a) => a.resolved === filter.resolved);
  }
  return alerts;
};

// 获取未处理告警数
export const getUnresolvedCount = (): number => {
  return loadAlerts().filter((a) => !a.resolved).length;
};

// 获取告警级别统计
export const getAlertStats = (): {
  total: number;
  unresolved: number;
  critical: number;
  warning: number;
  info: number;
} => {
  const alerts = loadAlerts();
  return {
    total: alerts.length,
    unresolved: alerts.filter((a) => !a.resolved).length,
    critical: alerts.filter((a) => a.level === 'critical' && !a.resolved).length,
    warning: alerts.filter((a) => a.level === 'warning' && !a.resolved).length,
    info: alerts.filter((a) => a.level === 'info' && !a.resolved).length,
  };
};

// ============================================
// 监控检查函数
// ============================================

/**
 * 检查善行发布量异常波动
 * 与前7天平均值比较，偏差超过50%告警
 */
export const checkKindnessAnomaly = (): AlertRecord | null => {
  const { dailyMetrics, todayCounters } = useAnalyticsStore.getState();
  // 取最近7天的善行发布量（不含今天）
  const recent7Days = dailyMetrics.slice(-7);
  if (recent7Days.length < 3) {
    // 数据不足，跳过检查
    return null;
  }

  const avg = recent7Days.reduce((sum, m) => sum + m.kindnessCount, 0) / recent7Days.length;
  const todayCount = todayCounters.kindnessPublished;

  // 今日数据太少时不告警（避免凌晨误报）
  if (todayCount < 10 || avg < 10) return null;

  const deviation = (todayCount - avg) / avg;
  const absDeviation = Math.abs(deviation);

  if (absDeviation > KINDNESS_ANOMALY_THRESHOLD) {
    const isSurge = deviation > 0;
    const level: AlertLevel = absDeviation > 1.0 ? 'critical' : 'warning';
    return addAlert({
      level,
      type: 'kindness_anomaly',
      title: `善行发布量${isSurge ? '突升' : '突降'}`,
      description: `今日善行发布量${todayCount}条，前7天平均${Math.round(avg)}条，偏差${(deviation * 100).toFixed(1)}%`,
      metricValue: todayCount,
      threshold: avg,
      deviation,
    });
  }
  return null;
};

/**
 * 检查福气值异常集中（防刷监控）
 * 同一用户1小时内获得福气超过100 → 告警
 */
export const checkFortuneConcentration = (userId: string): AlertRecord | null => {
  const { transactions } = useFortuneStore.getState();
  const now = Date.now();
  const windowStart = now - FORTUNE_CONCENTRATION_WINDOW;

  // 筛选该用户1小时内的福气获得记录
  const recentEarnings = transactions.filter((t: FortuneTransaction) => {
    const txTime = new Date(t.createdAt).getTime();
    return (
      txTime >= windowStart &&
      t.amount > 0 &&
      (t.type === 'earn' || t.type === 'award')
    );
  });

  const totalEarned = recentEarnings.reduce((sum, t) => sum + t.amount, 0);

  if (totalEarned > FORTUNE_CONCENTRATION_THRESHOLD) {
    return addAlert({
      level: 'critical',
      type: 'fortune_concentration',
      title: '福气值异常集中（疑似刷量）',
      description: `用户${userId}在1小时内获得福气${totalEarned}点，超过阈值${FORTUNE_CONCENTRATION_THRESHOLD}，共${recentEarnings.length}笔交易`,
      metricValue: totalEarned,
      threshold: FORTUNE_CONCENTRATION_THRESHOLD,
      userId,
    });
  }
  return null;
};

/**
 * 检查AI审核拒绝率异常波动
 * 拒绝率超过30% → 告警
 */
export const checkModerationRejectionRate = (): AlertRecord | null => {
  const { tasks } = useModerationStore.getState();
  if (tasks.length < 5) {
    // 数据不足，跳过检查
    return null;
  }

  // 统计已审核的任务
  const reviewed = tasks.filter(
    (t) => t.status === 'approved' || t.status === 'rejected'
  );
  if (reviewed.length < 5) return null;

  const rejected = reviewed.filter((t) => t.status === 'rejected').length;
  const rejectionRate = rejected / reviewed.length;

  if (rejectionRate > MODERATION_REJECTION_THRESHOLD) {
    return addAlert({
      level: rejectionRate > 0.5 ? 'critical' : 'warning',
      type: 'moderation_rejection',
      title: 'AI审核拒绝率异常',
      description: `当前审核拒绝率${(rejectionRate * 100).toFixed(1)}%（${rejected}/${reviewed.length}），超过阈值${MODERATION_REJECTION_THRESHOLD * 100}%`,
      metricValue: rejectionRate,
      threshold: MODERATION_REJECTION_THRESHOLD,
    });
  }
  return null;
};

/**
 * 记录API响应延迟并检查阈值
 * AI响应超过5秒 → 告警
 */
export const recordApiLatency = (
  apiName: string,
  duration: number
): AlertRecord | null => {
  if (duration > API_LATENCY_THRESHOLD) {
    return addAlert({
      level: duration > 10000 ? 'critical' : 'warning',
      type: 'api_latency',
      title: `API响应延迟超阈值：${apiName}`,
      description: `${apiName}响应耗时${(duration / 1000).toFixed(2)}秒，超过阈值${API_LATENCY_THRESHOLD / 1000}秒`,
      metricValue: duration,
      threshold: API_LATENCY_THRESHOLD,
    });
  }
  return null;
};

/**
 * 执行全部监控检查
 * 返回本次检查新增的告警列表
 */
export const runAllChecks = (): AlertRecord[] => {
  const newAlerts: AlertRecord[] = [];

  const anomaly = checkKindnessAnomaly();
  if (anomaly) newAlerts.push(anomaly);

  const rejection = checkModerationRejectionRate();
  if (rejection) newAlerts.push(rejection);

  return newAlerts;
};

// ============================================
// Mock 告警数据（首次使用时加载）
// ============================================

export const loadMockAlerts = (): void => {
  const existing = loadAlerts();
  if (existing.length > 0) return;

  const now = Date.now();
  const mockAlerts: Omit<AlertRecord, 'id' | 'createdAt' | 'resolved'>[] = [
    {
      level: 'critical',
      type: 'fortune_concentration',
      title: '福气值异常集中（疑似刷量）',
      description: '用户user_abc123在1小时内获得福气156点，超过阈值100，共12笔交易',
      metricValue: 156,
      threshold: 100,
      userId: 'user_abc123',
    },
    {
      level: 'warning',
      type: 'kindness_anomaly',
      title: '善行发布量突降',
      description: '今日善行发布量85条，前7天平均210条，偏差-59.5%',
      metricValue: 85,
      threshold: 210,
      deviation: -0.595,
    },
    {
      level: 'warning',
      type: 'moderation_rejection',
      title: 'AI审核拒绝率异常',
      description: '当前审核拒绝率35.0%（7/20），超过阈值30%',
      metricValue: 0.35,
      threshold: 0.3,
    },
    {
      level: 'info',
      type: 'api_latency',
      title: 'API响应延迟超阈值：deepseekChat',
      description: 'deepseekChat响应耗时6.20秒，超过阈值5秒',
      metricValue: 6200,
      threshold: 5000,
    },
    {
      level: 'info',
      type: 'kindness_anomaly',
      title: '善行发布量突升',
      description: '昨日善行发布量380条，前7天平均195条，偏差94.9%',
      metricValue: 380,
      threshold: 195,
      deviation: 0.949,
    },
  ];

  // 生成不同时间的告警
  for (let i = 0; i < mockAlerts.length; i++) {
    const alert: AlertRecord = {
      ...mockAlerts[i],
      id: `alert_mock_${i + 1}`,
      createdAt: new Date(now - i * 3600 * 1000 * 3).toISOString(), // 每隔3小时
      resolved: i >= 3, // 前两条未处理
    };
    existing.push(alert);
  }

  saveAlerts(existing);
  console.log('[Monitoring] 已加载Mock告警数据:', mockAlerts.length, '条');
};
