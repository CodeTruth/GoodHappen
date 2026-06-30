/**
 * 善行风险检测服务
 *
 * 核心能力：根据用户输入的内容，自动检测高风险善行场景，
 * 并给出相应的保护建议，降低行善者被讹诈或卷入纠纷的风险。
 */

/** 风险等级 */
export type RiskLevel = 'low' | 'medium' | 'high';

/** 风险场景 */
export interface RiskScenario {
  level: RiskLevel;
  category: string;
  keywords: string[];
  matchedKeyword: string;
  advice: string[];
  icon: string;
  color: string;
}

/** 风险规则库 */
const RISK_RULES: Array<{
  category: string;
  keywords: string[];
  level: RiskLevel;
  advice: string[];
  icon: string;
  color: string;
}> = [
  {
    category: '扶老助残',
    keywords: ['扶老人', '扶老奶奶', '老人摔倒', '老人跌倒', '老人过马路', '搀扶老人', '老人晕倒', '扶起老人'],
    level: 'high',
    advice: [
      '建议先拍照/录像记录现场，再实施帮助',
      '开启手机定位，留存GPS证据',
      '尽量寻找目击者并留下联系方式',
      '可开启"善行保护模式"自动存证',
    ],
    icon: '👴',
    color: '#E07A5F',
  },
  {
    category: '交通救助',
    keywords: ['车祸', '交通事故', '撞人', '被撞', '闯红灯', '过马路', '扶车', '推车', '交通意外', '路障'],
    level: 'high',
    advice: [
      '交通场景风险较高，建议录像存证',
      '注意自身安全，避免二次事故',
      '拨打122报警并保留现场照片',
      '记录对方车牌号和联系方式',
    ],
    icon: '🚗',
    color: '#D4534A',
  },
  {
    category: '见义勇为',
    keywords: ['歹徒', '小偷', '抢劫', '抓贼', '制止', '见义勇为', '搏斗', '拦截', '追赶'],
    level: 'high',
    advice: [
      '人身安全优先，不建议单独对抗',
      '立即拨打110报警',
      '如必须介入，确保有目击者在场',
      '全程录像并开启实时定位共享',
    ],
    icon: '🦸',
    color: '#C0392B',
  },
  {
    category: '水域救援',
    keywords: ['救人', '溺水', '落水', '跳河', '池塘', '湖', '河', '游泳', '救上来'],
    level: 'high',
    advice: [
      '水域救援风险极高，优先呼叫专业救援',
      '不具备专业能力时，使用长杆/绳索等工具',
      '切勿盲目下水，确保自身安全',
      '拨打119/120并记录现场视频',
    ],
    icon: '🌊',
    color: '#2980B9',
  },
  {
    category: '医疗急救',
    keywords: ['晕倒', '昏迷', '心脏病', '急救', '人工呼吸', '心肺复苏', 'CPR', '抽搐', '流血'],
    level: 'medium',
    advice: [
      '立即拨打120急救电话',
      '如有急救知识可施救，同时请旁人录像',
      '保留施救过程记录，避免后续纠纷',
      '等待专业医护人员到来',
    ],
    icon: '🏥',
    color: '#E67E22',
  },
  {
    category: '纠纷调解',
    keywords: ['打架', '冲突', '吵架', '纠纷', '拉扯', '推搡', '争执', '吵闹', '动手'],
    level: 'medium',
    advice: [
      '保持中立，避免卷入冲突',
      '建议报警处理，不要私自调解',
      '全程录像并保留证据',
      '确保自身安全，远离冲突中心',
    ],
    icon: '⚠️',
    color: '#F39C12',
  },
  {
    category: '财物帮助',
    keywords: ['借钱', '垫付', '赔偿', '医药费', '赔钱', '赔偿损失', '补偿', '垫钱'],
    level: 'medium',
    advice: [
      '涉及财物时保留转账/支付记录',
      '让对方签署简单的书面说明',
      '拍照留存现场和相关票据',
      '建议通过平台"善行保险"进行后续理赔',
    ],
    icon: '💰',
    color: '#27AE60',
  },
];

/**
 * 检测文本中的风险场景
 */
export const detectRisk = (text: string): RiskScenario | null => {
  if (!text || text.trim().length < 5) return null;

  const lowerText = text.toLowerCase();

  for (const rule of RISK_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return {
          level: rule.level,
          category: rule.category,
          keywords: rule.keywords,
          matchedKeyword: keyword,
          advice: rule.advice,
          icon: rule.icon,
          color: rule.color,
        };
      }
    }
  }

  return null;
};

/**
 * 获取风险等级对应的中文标签
 */
export const getRiskLevelLabel = (level: RiskLevel): string => {
  const map: Record<RiskLevel, string> = {
    low: '低风险',
    medium: '中风险',
    high: '高风险',
  };
  return map[level];
};

/**
 * 获取保护建议摘要（用于弹窗标题）
 */
export const getProtectionAdviceSummary = (scenario: RiskScenario): string => {
  if (scenario.level === 'high') {
    return `检测到"${scenario.category}"高风险场景，系统建议您在行善前做好证据保护措施。`;
  }
  return `检测到"${scenario.category}"场景，建议您注意保护自身权益。`;
};
