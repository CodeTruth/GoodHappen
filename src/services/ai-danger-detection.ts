/**
 * AI 身心危险检测服务
 *
 * 核心理念：穿戴设备实时采集身心指标，送到大模型判断是否有危险
 * 不再只是简单的摔倒检测，而是综合判断用户的身心状态
 */

// ============================================
// 类型定义
// ============================================

/** 穿戴设备传感器数据 */
export interface WearableSensorData {
  timestamp: string;

  // 运动传感器
  accelerometer: {
    x: number;  // m/s²
    y: number;
    z: number;
    magnitude: number;  // 合加速度
  };
  gyroscope: {
    x: number;  // rad/s
    y: number;
    z: number;
  };

  // 生理指标
  heartRate: number;        // 心率 bpm
  heartRateVariability: number;  // 心率变异性 HRV
  bloodOxygen?: number;     // 血氧 SpO2

  // 环境传感器
  ambientNoise?: number;    // 环境噪音 dB
  lightLevel?: number;      // 光照强度 lux

  // 位置变化
  gpsSpeed?: number;        // GPS速度 m/s
  gpsHeading?: number;      // 方向变化率
}

/** 危险检测结果 */
export interface DangerDetectionResult {
  dangerous: boolean;
  confidence: number;       // 0-1
  category: DangerCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: DangerIndicator[];
  reasoning: string;        // AI判断理由
  recommendedAction: string;
}

/** 危险类别 */
export type DangerCategory =
  | 'none'           // 无危险
  | 'fall'           // 摔倒
  | 'chase'          // 被追赶/剧烈奔跑
  | 'fight'          // 肢体冲突/打斗
  | 'panic'          // 极度恐慌
  | 'trapped'        // 被困
  | 'medical'        // 突发疾病
  | 'assault';       // 被攻击

/** 危险指标 */
export interface DangerIndicator {
  type: string;
  value: number;
  threshold: number;
  triggered: boolean;
  description: string;
}

// ============================================
// 检测阈值配置
// ============================================

export const DANGER_THRESHOLDS = {
  // 运动相关
  FALL_IMPACT_G: 2.5,           // 摔倒冲击加速度阈值
  SUDDEN_SPRINT_SPEED: 5.5,     // 突然奔跑速度 m/s (约20km/h)
  SPRINT_DURATION_S: 10,        // 持续奔跑10秒
  FIGHT_IMPACT_G: 3.0,          // 打斗冲击阈值
  FIGHT_FREQUENCY_HZ: 2,        // 高频冲击频率

  // 心率相关
  PANIC_HEART_RATE: 140,        // 恐慌心率阈值
  PANIC_HRV_DROP: 30,           // HRV下降幅度 ms
  HEART_RATE_SPIKE_DELTA: 40,   // 心率突增幅度

  // 综合
  MULTI_INDICATOR_THRESHOLD: 3, // 多个指标同时异常的阈值
};

// ============================================
// 实时指标提取
// ============================================

/**
 * 从传感器数据中提取危险指标
 */
export const extractDangerIndicators = (data: WearableSensorData): DangerIndicator[] => {
  const indicators: DangerIndicator[] = [];
  const acc = data.accelerometer;

  // 1. 摔倒冲击
  indicators.push({
    type: '摔倒冲击',
    value: acc.magnitude,
    threshold: DANGER_THRESHOLDS.FALL_IMPACT_G * 9.8,
    triggered: acc.magnitude > DANGER_THRESHOLDS.FALL_IMPACT_G * 9.8,
    description: acc.magnitude > DANGER_THRESHOLDS.FALL_IMPACT_G * 9.8
      ? `检测到${(acc.magnitude / 9.8).toFixed(1)}g剧烈冲击，可能摔倒`
      : `加速度正常`,
  });

  // 2. 剧烈奔跑
  indicators.push({
    type: '剧烈奔跑',
    value: data.gpsSpeed || 0,
    threshold: DANGER_THRESHOLDS.SUDDEN_SPRINT_SPEED,
    triggered: (data.gpsSpeed || 0) > DANGER_THRESHOLDS.SUDDEN_SPRINT_SPEED,
    description: (data.gpsSpeed || 0) > DANGER_THRESHOLDS.SUDDEN_SPRINT_SPEED
      ? `GPS速度${data.gpsSpeed?.toFixed(1)}m/s，检测到剧烈奔跑`
      : `移动速度正常`,
  });

  // 3. 肢体冲突（高频冲击）
  const impactSeverity = acc.magnitude / 9.8;
  indicators.push({
    type: '肢体冲突',
    value: impactSeverity,
    threshold: DANGER_THRESHOLDS.FIGHT_IMPACT_G,
    triggered: impactSeverity > DANGER_THRESHOLDS.FIGHT_IMPACT_G,
    description: impactSeverity > DANGER_THRESHOLDS.FIGHT_IMPACT_G
      ? `检测到${impactSeverity.toFixed(1)}g高频冲击，可能存在肢体冲突`
      : `无异常冲击`,
  });

  // 4. 极度恐慌（心率飙升）
  indicators.push({
    type: '极度恐慌',
    value: data.heartRate,
    threshold: DANGER_THRESHOLDS.PANIC_HEART_RATE,
    triggered: data.heartRate > DANGER_THRESHOLDS.PANIC_HEART_RATE,
    description: data.heartRate > DANGER_THRESHOLDS.PANIC_HEART_RATE
      ? `心率飙升至${data.heartRate}bpm，检测到极度恐慌状态`
      : `心率正常`,
  });

  // 5. 心率变异性骤降（心理压力）
  indicators.push({
    type: '心理压力',
    value: data.heartRateVariability,
    threshold: DANGER_THRESHOLDS.PANIC_HRV_DROP,
    triggered: data.heartRateVariability < DANGER_THRESHOLDS.PANIC_HRV_DROP,
    description: data.heartRateVariability < DANGER_THRESHOLDS.PANIC_HRV_DROP
      ? `HRV降至${data.heartRateVariability}ms，心理压力极大`
      : `HRV正常`,
  });

  // 6. 环境噪音异常（争吵/打斗声音）
  if (data.ambientNoise !== undefined) {
    indicators.push({
      type: '环境噪音',
      value: data.ambientNoise,
      threshold: 85,
      triggered: data.ambientNoise > 85,
      description: data.ambientNoise > 85
        ? `环境噪音${data.ambientNoise}dB，可能存在争吵或打斗`
        : `环境安静`,
    });
  }

  return indicators;
};

// ============================================
// AI 危险判断（大模型）
// ============================================

/**
 * AI综合判断是否有危险
 * 模拟大模型对多维度身心指标的综合分析
 */
export const analyzeDangerWithAI = (
  data: WearableSensorData,
  historicalData?: WearableSensorData[]
): DangerDetectionResult => {
  const indicators = extractDangerIndicators(data);
  const triggeredCount = indicators.filter(i => i.triggered).length;

  // 构建给AI的上下文（模拟）
  const context = buildAIContext(data, indicators, historicalData);

  // 模拟大模型推理结果
  // 实际生产环境会调用云端大模型API
  return simulateAIReasoning(indicators, triggeredCount, context);
};

/**
 * 构建AI上下文
 */
const buildAIContext = (
  data: WearableSensorData,
  indicators: DangerIndicator[],
  historicalData?: WearableSensorData[]
): string => {
  const lines: string[] = [];
  lines.push(`时间: ${new Date(data.timestamp).toLocaleString('zh-CN')}`);
  lines.push(`心率: ${data.heartRate}bpm (静息基准约75bpm)`);
  lines.push(`HRV: ${data.heartRateVariability}ms`);
  lines.push(`加速度: ${data.accelerometer.magnitude.toFixed(2)}m/s²`);
  lines.push(`GPS速度: ${(data.gpsSpeed || 0).toFixed(1)}m/s`);

  if (historicalData && historicalData.length > 0) {
    const avgHr = historicalData.reduce((s, d) => s + d.heartRate, 0) / historicalData.length;
    lines.push(`历史平均心率: ${avgHr.toFixed(0)}bpm`);
  }

  lines.push('\n异常指标:');
  indicators.filter(i => i.triggered).forEach(i => {
    lines.push(`- ${i.type}: ${i.description}`);
  });

  return lines.join('\n');
};

/**
 * 模拟AI推理（实际生产环境调用大模型API）
 */
const simulateAIReasoning = (
  indicators: DangerIndicator[],
  triggeredCount: number,
  _context: string
): DangerDetectionResult => {
  // 规则引擎（作为大模型的前置过滤）
  const triggered = indicators.filter(i => i.triggered);

  // 严重级别判断
  let severity: DangerDetectionResult['severity'] = 'low';
  let category: DangerCategory = 'none';
  let confidence = 0;
  let reasoning = '';
  let action = '';

  // 摔倒：高加速度 + 后续无活动（这里简化，实际需连续数据）
  const fallTrigger = triggered.find(i => i.type === '摔倒冲击');
  if (fallTrigger) {
    severity = 'high';
    category = 'fall';
    confidence = 0.85;
    reasoning = '检测到剧烈冲击加速度，符合摔倒特征。建议立即确认用户状态。';
    action = '自动触发SOS，通知紧急联系人';
  }

  // 被追赶/剧烈奔跑：高速 + 心率飙升
  const sprintTrigger = triggered.find(i => i.type === '剧烈奔跑');
  const panicTrigger = triggered.find(i => i.type === '极度恐慌');
  if (sprintTrigger && panicTrigger) {
    severity = 'high';
    category = 'chase';
    confidence = 0.78;
    reasoning = '检测到高速移动伴随心率异常飙升，疑似被追赶或紧急逃离场景。';
    action = '建议自动触发SOS并共享实时位置';
  }

  // 肢体冲突：高频冲击 + 噪音
  const fightTrigger = triggered.find(i => i.type === '肢体冲突');
  const noiseTrigger = triggered.find(i => i.type === '环境噪音');
  if (fightTrigger && noiseTrigger) {
    severity = 'critical';
    category = 'fight';
    confidence = 0.9;
    reasoning = '高频冲击信号叠加高噪音环境，强烈提示肢体冲突场景。';
    action = '立即触发SOS，通知周围用户和紧急联系人';
  }

  // 极度恐慌：心率飙升 + HRV骤降
  const hrvTrigger = triggered.find(i => i.type === '心理压力');
  if (panicTrigger && hrvTrigger) {
    severity = 'medium';
    category = 'panic';
    confidence = 0.72;
    reasoning = '心率异常升高且HRV骤降，提示用户处于极度恐慌或高压状态。';
    action = '发送安抚提醒，准备SOS快捷触发';
  }

  // 多指标综合（没有单一强信号但多个弱信号）
  if (category === 'none' && triggeredCount >= DANGER_THRESHOLDS.MULTI_INDICATOR_THRESHOLD) {
    severity = 'medium';
    category = 'assault';
    confidence = 0.65;
    reasoning = `多个身心指标同时异常（${triggeredCount}项），虽无单一强信号，但综合判断存在风险。`;
    action = '提高警戒，推送安全确认提醒';
  }

  // 无危险
  if (category === 'none') {
    confidence = 0.95;
    reasoning = '所有身心指标均在正常范围内，无异常检测。';
    action = '持续监测中';
  }

  return {
    dangerous: category !== 'none',
    confidence,
    category,
    severity,
    indicators,
    reasoning,
    recommendedAction: action,
  };
};

// ============================================
// 批量分析（滑动窗口）
// ============================================

/**
 * 滑动窗口分析
 * 对连续传感器数据进行批量分析，提高判断准确性
 */
export const analyzeWindow = (
  dataWindow: WearableSensorData[],
  windowSize: number = 5
): DangerDetectionResult | null => {
  if (dataWindow.length < windowSize) return null;

  // 取最近 windowSize 条数据
  const recent = dataWindow.slice(-windowSize);

  // 计算聚合指标
  const avgHeartRate = recent.reduce((s, d) => s + d.heartRate, 0) / recent.length;
  const maxAccel = Math.max(...recent.map(d => d.accelerometer.magnitude));
  const avgHrv = recent.reduce((s, d) => s + d.heartRateVariability, 0) / recent.length;

  // 用聚合后的数据模拟一条"综合"传感器数据
  const aggregated: WearableSensorData = {
    ...recent[recent.length - 1],
    heartRate: avgHeartRate,
    heartRateVariability: avgHrv,
    accelerometer: {
      ...recent[recent.length - 1].accelerometer,
      magnitude: maxAccel,
    },
  };

  return analyzeDangerWithAI(aggregated, recent);
};

// ============================================
// 危险等级对应的颜色和图标
// ============================================

export const getDangerVisuals = (result: DangerDetectionResult) => {
  const severityMap: Record<string, { color: string; icon: string; label: string }> = {
    low: { color: '#4CAF50', icon: '✅', label: '安全' },
    medium: { color: '#FF9800', icon: '⚠️', label: '注意' },
    high: { color: '#F44336', icon: '🚨', label: '危险' },
    critical: { color: '#B71C1C', icon: '🔴', label: '紧急' },
  };
  return severityMap[result.severity] || severityMap.low;
};

export const getCategoryLabel = (category: DangerCategory): string => {
  const map: Record<DangerCategory, string> = {
    none: '无异常',
    fall: '摔倒',
    chase: '被追赶',
    fight: '肢体冲突',
    panic: '极度恐慌',
    trapped: '被困',
    medical: '突发疾病',
    assault: '被攻击',
  };
  return map[category] || '未知';
};
