/**
 * AI 善行顾问服务
 *
 * 核心理念：做好事前先问AI
 * 综合评判自身情况、处境、环境、时间、对方情况、行善事项等，
 * 给出行动建议——不是劝阻行善，而是指导如何安全地行善
 *
 * 建议等级：
 * A. 直接帮助（安全）
 * B. 开启保护模式后帮助（需存证）
 * C. 寻找同伴一起帮助（力量不足）
 * D. 代为求助专业机构（超出能力）
 * E. 保持距离报警（高危）
 */

// ============================================
// 类型定义
// ============================================

/** 用户自身情况 */
export interface UserProfile {
  age?: number;                    // 年龄
  gender?: 'male' | 'female';     // 性别
  hasChildren?: boolean;           // 是否带孩子
  physicalCondition?: 'good' | 'normal' | 'weak' | 'disabled'; // 身体状况
  hasFirstAidCert?: boolean;       // 是否有急救证
  hasMartialArts?: boolean;         // 是否有武术基础
  experienceLevel?: 'experienced' | 'normal' | 'first_time'; // 善行经验
}

/** 当前环境 */
export interface EnvironmentContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' | 'late_night';
  isWeekday: boolean;
  weather?: 'sunny' | 'rainy' | 'snowy' | 'foggy';
  location: string;                // 地点描述
  nearbyPeople: number;            // 周围人数
  isIsolated: boolean;             // 是否偏僻
  hasCCTV: boolean;               // 是否有监控
  trafficLevel?: 'busy' | 'normal' | 'quiet'; // 交通情况
}

/** 对方情况 */
export interface SubjectInfo {
  age?: number;
  gender?: 'male' | 'female' | 'unknown';
  count: number;                    // 对方人数
  consciousness?: 'alert' | 'drowsy' | 'unconscious';
  behavior?: 'calm' | 'anxious' | 'aggressive' | 'unconscious';
  injury?: 'none' | 'minor' | 'moderate' | 'severe';
  hasCompanion?: boolean;          // 是否有同伴
}

/** 善行事项 */
export interface KindnessAction {
  type: string;                    // 善行类型
  description: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
}

/** 建议等级 */
export type AdviceLevel = 'A' | 'B' | 'C' | 'D' | 'E';

/** AI顾问建议 */
export interface AIAdvisorResult {
  adviceLevel: AdviceLevel;
  dangerScore: number;              // 0-100 危险系数
  confidence: number;               // 0-1 置信度

  // 标题和摘要
  title: string;
  summary: string;

  // 行动建议（按优先级排序）
  actions: AdvisorAction[];

  // 评估理由
  riskFactors: RiskFactor[];

  // 不建议直接帮助的原因（如果有）
  warnings: string[];

  // 附加建议
  tips: string[];

  // 推荐保护措施
  protectionMeasures: string[];
}

/** 具体行动建议 */
export interface AdvisorAction {
  level: AdviceLevel;
  action: string;                   // 行动描述
  reason: string;                   // 原因
  steps?: string[];                 // 具体步骤
  icon: string;
  urgent: boolean;
}

/** 风险因素 */
export interface RiskFactor {
  factor: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  weight: number;
}

/** 建议等级配置 */
export const ADVICE_LEVEL_CONFIG: Record<AdviceLevel, {
  label: string;
  color: string;
  icon: string;
  gradient: string;
  description: string;
}> = {
  A: {
    label: '可以安全帮助',
    color: '#4CAF50',
    icon: '✅',
    gradient: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
    description: '环境安全，风险很低，可以直接提供帮助。',
  },
  B: {
    label: '开启保护后帮助',
    color: '#FF9800',
    icon: '🛡️',
    gradient: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
    description: '有一定风险，建议先开启保护模式存证后再帮助。',
  },
  C: {
    label: '找同伴一起帮助',
    color: '#2196F3',
    icon: '👥',
    gradient: 'linear-gradient(135deg, #2196F3 0%, #64B5F6 100%)',
    description: '独自行动有风险，建议联系周围热心人一起帮助。',
  },
  D: {
    label: '求助专业机构',
    color: '#9C27B0',
    icon: '📞',
    gradient: 'linear-gradient(135deg, #9C27B0 0%, #CE93D8 100%)',
    description: '超出个人能力范围，请联系专业机构处理。',
  },
  E: {
    label: '保持距离报警',
    color: '#F44336',
    icon: '🚨',
    gradient: 'linear-gradient(135deg, #F44336 0%, #EF5350 100%)',
    description: '危险系数极高，保持安全距离并立即报警。',
  },
};

// ============================================
// AI 综合评估
// ============================================

/**
 * AI善行顾问 —— 综合评估
 */
export const consultAIAdvisor = (
  userProfile: UserProfile,
  environment: EnvironmentContext,
  subject: SubjectInfo,
  action: KindnessAction
): AIAdvisorResult => {
  const riskFactors = evaluateRiskFactors(userProfile, environment, subject, action);
  const dangerScore = calculateDangerScore(riskFactors);
  const adviceLevel = determineAdviceLevel(dangerScore, riskFactors, userProfile, environment, subject);
  const actions = generateActions(adviceLevel, action, environment, subject, userProfile);
  const warnings = generateWarnings(adviceLevel, riskFactors);
  const tips = generateTips(adviceLevel, action, environment);
  const protectionMeasures = generateProtectionMeasures(adviceLevel, action, environment);

  const levelConfig = ADVICE_LEVEL_CONFIG[adviceLevel];

  return {
    adviceLevel,
    dangerScore,
    confidence: Math.min(0.95, 0.6 + dangerScore / 200),
    title: levelConfig.icon + ' ' + levelConfig.label,
    summary: levelConfig.description,
    actions,
    riskFactors,
    warnings,
    tips,
    protectionMeasures,
  };
};

// ============================================
// 风险评估
// ============================================

function evaluateRiskFactors(
  user: UserProfile,
  env: EnvironmentContext,
  subject: SubjectInfo,
  action: KindnessAction
): RiskFactor[] {
  const factors: RiskFactor[] = [];

  // === 环境风险 ===

  // 时间
  if (env.timeOfDay === 'night' || env.timeOfDay === 'late_night') {
    factors.push({
      factor: '夜间/深夜',
      impact: 'high',
      description: `${env.timeOfDay === 'late_night' ? '深夜' : '夜间'}能见度低，求助不便`,
      weight: 15,
    });
  }

  // 偏僻
  if (env.isIsolated) {
    factors.push({
      factor: '偏僻地点',
      impact: 'high',
      description: '周围人少，缺乏目击者和帮助',
      weight: 18,
    });
  }

  // 天气
  if (env.weather === 'foggy') {
    factors.push({
      factor: '雾天',
      impact: 'medium',
      description: '能见度低，增加交通事故风险',
      weight: 8,
    });
  }

  // 无人
  if (env.nearbyPeople === 0) {
    factors.push({
      factor: '无旁人在场',
      impact: 'high',
      description: '没有目击者，容易被讹诈',
      weight: 16,
    });
  } else if (env.nearbyPeople <= 2) {
    factors.push({
      factor: '旁人较少',
      impact: 'medium',
      description: '周围人少，证据链薄弱',
      weight: 10,
    });
  }

  // 无监控
  if (!env.hasCCTV) {
    factors.push({
      factor: '无监控覆盖',
      impact: 'medium',
      description: '缺少第三方客观证据',
      weight: 8,
    });
  }

  // === 对方风险 ===

  // 多人
  if (subject.count > 1) {
    factors.push({
      factor: '对方多人',
      impact: 'high',
      description: `对方${subject.count}人，力量对比悬殊`,
      weight: 18,
    });
  }

  // 对方有攻击性
  if (subject.behavior === 'aggressive') {
    factors.push({
      factor: '对方行为激烈',
      impact: 'high',
      description: '对方有攻击性或情绪失控',
      weight: 20,
    });
  }

  // === 善行事项风险 ===

  // 紧急度
  if (action.urgency === 'critical') {
    factors.push({
      factor: '紧急救援',
      impact: 'high',
      description: '涉及生命安全，专业要求高',
      weight: 12,
    });
  }

  // === 用户自身风险 ===

  // 身体弱
  if (user.physicalCondition === 'weak' || user.physicalCondition === 'disabled') {
    factors.push({
      factor: '身体状况不佳',
      impact: 'high',
      description: '身体条件可能无法应对突发情况',
      weight: 14,
    });
  }

  // 带孩子
  if (user.hasChildren) {
    factors.push({
      factor: '携儿童同行',
      impact: 'high',
      description: '需要优先保护孩子安全',
      weight: 15,
    });
  }

  // 无经验
  if (user.experienceLevel === 'first_time') {
    factors.push({
      factor: '首次行善',
      impact: 'medium',
      description: '缺乏应对突发状况的经验',
      weight: 8,
    });
  }

  // 没有急救证但涉及急救
  if (!user.hasFirstAidCert && (action.type === 'medical' || action.type === 'rescue')) {
    factors.push({
      factor: '缺乏急救资质',
      impact: 'medium',
      description: '涉及急救但无专业资质，施救不当可能担责',
      weight: 10,
    });
  }

  return factors.sort((a, b) => b.weight - a.weight);
}

function calculateDangerScore(factors: RiskFactor[]): number {
  const total = factors.reduce((sum, f) => sum + f.weight, 0);
  return Math.min(100, total);
}

// ============================================
// 建议等级判断
// ============================================

function determineAdviceLevel(
  dangerScore: number,
  _factors: RiskFactor[],
  _user: UserProfile,
  env: EnvironmentContext,
  subject: SubjectInfo
): AdviceLevel {
  // 极高风险因素 → E
  if (subject.behavior === 'aggressive' && subject.count > 1) return 'E';
  if (subject.behavior === 'aggressive' && env.nearbyPeople === 0) return 'E';
  if (dangerScore >= 70) return 'E';

  // 高风险 → D
  if (dangerScore >= 55) return 'D';

  // 需要同伴 → C
  if (env.isIsolated && env.nearbyPeople === 0 && dangerScore >= 35) return 'C';
  if (subject.count > 1 && dangerScore >= 30) return 'C';

  // 需要保护 → B
  if (dangerScore >= 20) return 'B';

  // 安全 → A
  if (!env.isIsolated && env.nearbyPeople >= 5 && env.timeOfDay !== 'late_night') {
    return 'A';
  }

  // 默认B（宁可多一层保护）
  return 'B';
}

// ============================================
// 行动建议生成
// ============================================

function generateActions(
  level: AdviceLevel,
  action: KindnessAction,
  _env: EnvironmentContext,
  subject: SubjectInfo,
  _user: UserProfile
): AdvisorAction[] {
  const actions: AdvisorAction[] = [];

  switch (level) {
    case 'A':
      actions.push({
        level: 'A',
        action: '直接提供帮助',
        reason: '环境安全，风险很低，您可以放心帮助。',
        steps: [
          `快速评估${subject.consciousness === 'unconscious' ? '对方意识状态' : '对方需求'}`,
          '提供力所能及的帮助',
          '结束后记录善行，传递正能量',
        ],
        icon: '🤝',
        urgent: action.urgency === 'critical' || action.urgency === 'high',
      });
      break;

    case 'B':
      actions.push({
        level: 'B',
        action: '开启善行保护模式',
        reason: '有一定风险，先开启保护模式全程录像+录音+GPS存证。',
        steps: [
          '点击"开启保护模式"按钮',
          '等待GPS+摄像头+麦克风初始化',
          '确认保护中后，再提供帮助',
          '结束后关闭保护，证据自动保存',
        ],
        icon: '🛡️',
        urgent: true,
      });
      actions.push({
        level: 'B',
        action: '提供帮助',
        reason: '保护模式已开启，可以安全帮助。',
        icon: '🤝',
        urgent: false,
      });
      break;

    case 'C':
      actions.push({
        level: 'C',
        action: '联系附近热心人一起',
        reason: '独自行动有风险，联系平台附近的热心用户一起帮助更安全。',
        steps: [
          '打开平台"附近热心人"功能',
          '描述情况和位置',
          '等待至少1位热心人确认到场',
          '开启保护模式后一起行动',
        ],
        icon: '👥',
        urgent: true,
      });
      actions.push({
        level: 'C',
        action: '先远距离观察和言语安抚',
        reason: '在等待同伴期间，保持安全距离观察情况。',
        icon: '👁️',
        urgent: false,
      });
      break;

    case 'D':
      actions.push({
        level: 'D',
        action: '拨打专业求助电话',
        reason: '超出个人能力范围，专业机构能更好地处理。',
        steps: [
          getEmergencyPhone(action.type),
          '说明具体位置和情况',
          '在安全距离等待专业救援到来',
          '可录像记录现场作为辅助',
        ],
        icon: '📞',
        urgent: true,
      });
      if (action.urgency === 'critical' || action.urgency === 'high') {
        actions.push({
          level: 'D',
          action: '在能力范围内做最小干预',
          reason: '等待专业救援期间，可做力所能及的最小帮助。',
          steps: [
            '确保自身安全距离',
            '言语安抚对方',
            '引导周围人注意',
          ],
          icon: '🩺',
          urgent: false,
        });
      }
      break;

    case 'E':
      actions.push({
        level: 'E',
        action: '保持安全距离',
        reason: '当前环境极其危险，人身安全第一。',
        steps: [
          '立即退到安全距离（5米以上）',
          '不要靠近冲突中心',
        ],
        icon: '⚠️',
        urgent: true,
      });
      actions.push({
        level: 'E',
        action: '立即报警',
        reason: '需要专业人员介入处理。',
        steps: [
          '拨打110报警',
          '详细描述位置、人数、情况',
          '记录对方特征（在安全距离外录像）',
        ],
        icon: '🚨',
        urgent: true,
      });
      if (subject.consciousness !== 'unconscious') {
        actions.push({
          level: 'E',
          action: '呼喊周围人一起',
          reason: '人多有威慑力，也能分散注意力保护自己。',
          icon: '📢',
          urgent: true,
        });
      }
      break;
  }

  return actions;
}

function getEmergencyPhone(actionType: string): string {
  if (actionType === 'traffic') return '拨打122交警';
  if (actionType === 'medical' || actionType === 'rescue') return '拨打120急救';
  if (actionType === 'crime') return '拨打110报警';
  if (actionType === 'fire') return '拨打119消防';
  return '拨打110报警';
}

// ============================================
// 警告和建议
// ============================================

function generateWarnings(level: AdviceLevel, factors: RiskFactor[]): string[] {
  if (level === 'A') return [];

  const warnings: string[] = [];
  const highFactors = factors.filter(f => f.impact === 'high');

  if (level === 'E') {
    warnings.push('当前情况非常危险，请务必将自身安全放在第一位。');
  }

  highFactors.forEach(f => {
    warnings.push(`注意：${f.description}`);
  });

  if (level === 'D' || level === 'E') {
    warnings.push('不要直接接触对方，保持安全距离。');
  }

  return warnings;
}

function generateTips(level: AdviceLevel, _action: KindnessAction, env: EnvironmentContext): string[] {
  const tips: string[] = [];

  if (level === 'A' || level === 'B') {
    tips.push('帮助过程中保持微笑和友好态度');
    tips.push('结束后可以记录善行，传递正能量');
  }

  if (level === 'B') {
    tips.push('保护模式会自动存证，不用担心后续纠纷');
  }

  if (level === 'C') {
    tips.push('等待热心人到场后再一起行动更安全');
    tips.push('可以用平台消息协调集合地点');
  }

  if (level === 'D') {
    tips.push('专业救援到达前，在安全距离观察情况');
    tips.push('记住准确位置描述，帮助救援快速到达');
  }

  if (level === 'E') {
    tips.push('报警时保持冷静，说清楚地点和情况');
    tips.push('如果可能，在安全距离外用手机录像记录');
  }

  if (env.timeOfDay === 'night' || env.timeOfDay === 'late_night') {
    tips.push('注意周围环境，避免黑暗角落');
  }

  return tips;
}

function generateProtectionMeasures(
  level: AdviceLevel,
  action: KindnessAction,
  env: EnvironmentContext
): string[] {
  const measures: string[] = [];

  if (['B', 'C', 'D', 'E'].includes(level)) {
    measures.push('开启善行保护模式（全程录像+录音+GPS）');
  }

  if (['C', 'D', 'E'].includes(level)) {
    measures.push('拨打对应紧急电话（110/120/122/119）');
  }

  if (env.isIsolated || env.nearbyPeople <= 2) {
    measures.push('联系平台附近热心用户');
  }

  if (['D', 'E'].includes(level)) {
    measures.push('保持5米以上安全距离');
  }

  if (action.urgency === 'critical') {
    measures.push('设置定时安全确认（超时自动SOS）');
  }

  if (env.timeOfDay === 'night' || env.timeOfDay === 'late_night') {
    measures.push('打开手机闪光灯照明');
  }

  return measures;
}

// ============================================
// 快速评估（简化输入）
// ============================================

/** 快速评估预设场景 */
export const quickAssess = (
  scenario: string,
  _userDescription?: string
): AIAdvisorResult => {
  // 从场景描述中推断
  const env: EnvironmentContext = {
    timeOfDay: scenario.includes('夜') ? 'night' : 'afternoon',
    isWeekday: true,
    location: '当前位置',
    nearbyPeople: scenario.includes('无人') || scenario.includes('偏僻') ? 0 : scenario.includes('人多') ? 10 : 3,
    isIsolated: scenario.includes('偏僻') || scenario.includes('无人'),
    hasCCTV: !scenario.includes('偏僻'),
  };

  const subject: SubjectInfo = {
    count: scenario.includes('多人') ? 3 : 1,
    consciousness: scenario.includes('晕倒') ? 'unconscious' : scenario.includes('迷糊') ? 'drowsy' : 'alert',
    behavior: scenario.includes('打') || scenario.includes('暴力') || scenario.includes('激动') ? 'aggressive' : 'calm',
  };

  const action: KindnessAction = {
    type: guessActionType(scenario),
    description: scenario,
    urgency: scenario.includes('紧急') || scenario.includes('救命') ? 'critical' : 'medium',
  };

  const user: UserProfile = {
    physicalCondition: 'normal',
    experienceLevel: 'normal',
  };

  return consultAIAdvisor(user, env, subject, action);
};

// ============================================
// 完整上下文分析（增强版）
// ============================================

/** 完整分析上下文 */
export interface FullAnalysisContext {
  userProfile: UserProfile;
  environment: EnvironmentContext;
  subject: SubjectInfo;
  action: KindnessAction;
  realTimeData: {
    timestamp: string;
    gpsLocation: { latitude: number; longitude: number; address: string } | null;
    lightCondition: string;
    nearbyDescription: string;
  };
  userPersonalInfo: {
    nickname: string;
    age?: number;
    gender?: string;
    region?: string;
    fuqiLevel?: string;
  };
}

/**
 * AI善行顾问 —— 完整上下文综合评估（增强版）
 * 接收 FullAnalysisContext，输出更详细的分析结果
 */
export const consultAIAdvisorFull = (
  context: FullAnalysisContext
): AIAdvisorResult => {
  const { userProfile, environment, subject, action, realTimeData, userPersonalInfo } = context;

  // 使用增强版风险评估
  const riskFactors = evaluateRiskFactorsFull(context);
  const dangerScore = calculateDangerScore(riskFactors);
  const adviceLevel = determineAdviceLevelFull(dangerScore, riskFactors, context);

  // 使用增强版行动建议生成
  const actions = generateActionsFull(adviceLevel, action, environment, subject, userProfile, userPersonalInfo);
  const warnings = generateWarnings(adviceLevel, riskFactors);
  const tips = generateTipsFull(adviceLevel, action, environment, realTimeData);
  const protectionMeasures = generateProtectionMeasuresFull(adviceLevel, action, environment, realTimeData);

  const levelConfig = ADVICE_LEVEL_CONFIG[adviceLevel];

  // 构建增强摘要
  let enhancedSummary = levelConfig.description;
  if (realTimeData.gpsLocation) {
    enhancedSummary += ` 当前位置：${realTimeData.gpsLocation.address || '已定位'}。`;
  }
  if (userPersonalInfo.age && userPersonalInfo.age < 18) {
    enhancedSummary += ' 检测到未成年用户，已启用未成年人保护建议。';
  }

  return {
    adviceLevel,
    dangerScore,
    confidence: Math.min(0.95, 0.6 + dangerScore / 200),
    title: levelConfig.icon + ' ' + levelConfig.label,
    summary: enhancedSummary,
    actions,
    riskFactors,
    warnings,
    tips,
    protectionMeasures,
  };
};

// ============================================
// 增强版风险评估
// ============================================

function evaluateRiskFactorsFull(context: FullAnalysisContext): RiskFactor[] {
  const { user, env, subject, action, realTimeData } = {
    user: context.userProfile,
    env: context.environment,
    subject: context.subject,
    action: context.action,
    realTimeData: context.realTimeData,
  };

  // 先获取基础风险因素
  const factors = evaluateRiskFactors(user, env, subject, action);

  // === 基于实时GPS位置的风险 ===
  if (realTimeData.gpsLocation) {
    // 如果GPS显示在偏远位置（简单判断：地址中包含偏僻、郊区等关键词）
    const addr = realTimeData.gpsLocation.address || '';
    if (/偏僻|郊区|荒野|山区|乡下|农村|无人/.test(addr) && !factors.some(f => f.factor === '偏僻地点')) {
      factors.push({
        factor: 'GPS定位偏远',
        impact: 'high',
        description: 'GPS显示当前位置较为偏远，救援力量可能难以快速到达',
        weight: 12,
      });
    }
  }

  // === 基于时间因素的风险 ===
  try {
    const timestamp = new Date(realTimeData.timestamp);
    const hour = timestamp.getHours();

    // 深夜时段（0-5点）额外风险
    if ((hour >= 0 && hour < 5) && !factors.some(f => f.factor.includes('深夜') || f.factor.includes('夜间'))) {
      factors.push({
        factor: '深夜时段',
        impact: 'high',
        description: '深夜时段（0-5点），人迹罕至且求助资源有限',
        weight: 14,
      });
    }

    // 凌晨时段（5-6点）
    if (hour >= 5 && hour < 6) {
      factors.push({
        factor: '凌晨时段',
        impact: 'medium',
        description: '凌晨时分，周围人员稀少，视线不佳',
        weight: 8,
      });
    }
  } catch {
    // 时间解析失败，忽略
  }

  // === 基于光线条件的因素 ===
  if (realTimeData.lightCondition === 'dark' || realTimeData.lightCondition === '昏暗') {
    if (!factors.some(f => f.factor.includes('光线') || f.factor.includes('夜间') || f.factor.includes('深夜'))) {
      factors.push({
        factor: '光线不足',
        impact: 'medium',
        description: '环境光线较暗，不利于观察和判断情况',
        weight: 7,
      });
    }
  }

  return factors.sort((a, b) => b.weight - a.weight);
}

// ============================================
// 增强版建议等级判断
// ============================================

function determineAdviceLevelFull(
  dangerScore: number,
  _factors: RiskFactor[],
  context: FullAnalysisContext
): AdviceLevel {
  const { environment, subject, userPersonalInfo } = context;

  // 未成年人保护：如果用户未成年，自动提升一级谨慎度
  const isMinor = userPersonalInfo.age !== undefined && userPersonalInfo.age < 18;
  let adjustedScore = dangerScore;
  if (isMinor) {
    adjustedScore += 10; // 未成年用户增加10分风险权重
  }

  // 女性用户在夜间偏僻地点额外谨慎
  const isFemaleAtRiskEnv =
    userPersonalInfo.gender === 'female' &&
    (environment.timeOfDay === 'night' || environment.timeOfDay === 'late_night') &&
    (environment.isIsolated || environment.nearbyPeople <= 2);

  if (isFemaleAtRiskEnv) {
    adjustedScore += 8;
  }

  // 极高风险因素 → E
  if (subject.behavior === 'aggressive' && subject.count > 1) return 'E';
  if (subject.behavior === 'aggressive' && environment.nearbyPeople === 0) return 'E';
  if (adjustedScore >= 70) return 'E';

  // 高风险 → D
  if (adjustedScore >= 55) return 'D';

  // 需要同伴 → C
  if (environment.isIsolated && environment.nearbyPeople === 0 && adjustedScore >= 35) return 'C';
  if (subject.count > 1 && adjustedScore >= 30) return 'C';
  // 未成年用户独自在偏僻地点
  if (isMinor && environment.isIsolated) return 'C';

  // 需要保护 → B
  if (adjustedScore >= 20) return 'B';

  // 安全 → A
  if (!environment.isIsolated && environment.nearbyPeople >= 5 && environment.timeOfDay !== 'late_night') {
    return 'A';
  }

  // 默认B（宁可多一层保护）
  return 'B';
}

// ============================================
// 增强版行动建议生成
// ============================================

function generateActionsFull(
  level: AdviceLevel,
  action: KindnessAction,
  env: EnvironmentContext,
  subject: SubjectInfo,
  user: UserProfile,
  userPersonalInfo: FullAnalysisContext['userPersonalInfo']
): AdvisorAction[] {
  // 先获取基础行动建议
  const baseActions = generateActions(level, action, env, subject, user);
  const actions: AdvisorAction[] = [...baseActions];

  // 基于用户个人信息增加个性化建议
  const isMinor = userPersonalInfo.age !== undefined && userPersonalInfo.age < 18;
  const isElderly = userPersonalInfo.age !== undefined && userPersonalInfo.age >= 60;
  const isFemale = userPersonalInfo.gender === 'female';

  // 未成年用户：增加监护人联系建议
  if (isMinor && !actions.some(a => a.action.includes('监护人') || a.action.includes('家长'))) {
    actions.push({
      level,
      action: '联系监护人或家长',
      reason: '未成年用户应在成人指导下行善，建议先联系监护人告知情况。',
      icon: '👨‍👩‍👧',
      urgent: level === 'E' || level === 'D',
    });
  }

  // 老年用户：增加量力而行建议
  if (isElderly && !actions.some(a => a.action.includes('量力而行'))) {
    actions.splice(1, 0, {
      level,
      action: '量力而行，避免过度劳累',
      reason: `检测到用户年龄为${userPersonalInfo.age}岁，建议根据自身身体状况决定是否直接参与救助。`,
      icon: '💪',
      urgent: false,
    });
  }

  // 女性用户在夜间/偏僻环境：增加安全建议
  if (isFemale && (env.timeOfDay === 'night' || env.timeOfDay === 'late_night' || env.isIsolated)) {
    if (!actions.some(a => a.action.includes('安全距离') || a.action.includes('保护'))) {
      actions.push({
        level,
        action: '优先确保自身安全',
        reason: '夜间或偏僻环境中，女性用户应格外注意自身安全，优先选择呼叫帮助和远程协助。',
        icon: '🛡️',
        urgent: true,
      });
    }
  }

  // 新手用户：增加观察建议
  if (user.experienceLevel === 'first_time' && level !== 'A') {
    if (!actions.some(a => a.action.includes('观察'))) {
      actions.push({
        level,
        action: '先观察再行动',
        reason: '作为首次行善的用户，建议先在安全距离观察情况，不要贸然介入。',
        icon: '👁️',
        urgent: false,
      });
    }
  }

  return actions;
}

// ============================================
// 增强版小贴士
// ============================================

function generateTipsFull(
  level: AdviceLevel,
  action: KindnessAction,
  env: EnvironmentContext,
  realTimeData: FullAnalysisContext['realTimeData']
): string[] {
  const tips = generateTips(level, action, env);

  // 基于实时数据增加提示
  if (realTimeData.gpsLocation) {
    tips.push(`当前GPS已定位：${realTimeData.gpsLocation.address || `${realTimeData.gpsLocation.latitude.toFixed(4)}, ${realTimeData.gpsLocation.longitude.toFixed(4)}`}，可在求助时提供准确位置。`);
  }

  if (realTimeData.lightCondition === 'dark' || realTimeData.lightCondition === '昏暗') {
    tips.push('环境光线较暗，建议打开手机闪光灯照明，同时注意周围环境安全。');
  }

  return tips;
}

// ============================================
// 增强版保护措施
// ============================================

function generateProtectionMeasuresFull(
  level: AdviceLevel,
  action: KindnessAction,
  env: EnvironmentContext,
  realTimeData: FullAnalysisContext['realTimeData']
): string[] {
  const measures = generateProtectionMeasures(level, action, env);

  // 如果有GPS数据，建议分享位置
  if (realTimeData.gpsLocation && !measures.some(m => m.includes('位置') || m.includes('GPS'))) {
    measures.push('将当前GPS位置分享给紧急联系人');
  }

  return measures;
}

function guessActionType(scenario: string): string {
  if (/老人|扶|摔倒/.test(scenario)) return 'elder_help';
  if (/车|交通|撞/.test(scenario)) return 'traffic';
  if (/救|溺水|落水/.test(scenario)) return 'rescue';
  if (/打|冲突|暴力/.test(scenario)) return 'conflict';
  if (/晕|急救|心脏/.test(scenario)) return 'medical';
  if (/偷|抢/.test(scenario)) return 'crime';
  return 'general';
}
