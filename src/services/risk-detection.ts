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
 *
 * 基于内置风险规则库，对用户输入的文本进行关键词匹配，
 * 自动识别高风险善行场景（如扶老助残、交通救助、见义勇为、水域救援等）
 * 和中等风险场景（如医疗急救、纠纷调解、财物帮助等）。
 *
 * 匹配策略：遍历规则库，找到第一个匹配的关键词即返回对应的风险场景。
 * 多条规则同时命中时，返回优先匹配到的第一条。
 *
 * @param text - 待检测的文本内容（善行描述）
 * @returns 匹配到的风险场景（RiskScenario），包含风险等级、分类、匹配关键词、保护建议等；
 *          若未匹配到任何风险规则或文本过短（<5字），返回 null
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

// ============================================
// 代表性判断（P4增强：不是每条记录都弹提醒）
// ============================================

/** 曲折度关键词 —— 表明善行过程有波折、有教训 */
const TWIST_INDICATORS = [
  '犹豫', '纠结', '害怕', '紧张', '担心', '本来不想',
  '差点', '幸好', '后来', '结果', '没想到', '没想到',
  '被误解', '被怀疑', '被讹', '被质疑', '被围观',
  '有人拍照', '有人录视频', '路人围观', '围观',
  '报警', '警察来了', '120', '救护车', '去医院',
  '家人来了', '家属', '老伴', '子女',
  '反悔', '翻脸', '不承认', '倒打一耙',
  '纠缠', '后续', '处理', '解决了',
];

/** 典型性关键词 —— 表明这是常见高频善行场景 */
const TYPICAL_INDICATORS = [
  '扶老人', '老人摔倒', '过马路', '老人',
  '交通事故', '车祸', '撞人', '肇事',
  '救人', '溺水', '落水',
  '小偷', '抢劫', '见义勇为',
  '晕倒', '急救', '心肺复苏',
];

/**
 * 判断一条善行是否具有"代表性"
 * 只有有代表性、有曲折经历的善行才展示事前学习卡片
 * 避免每条记录都弹提醒导致用户麻木
 *
 * 判断维度：
 * 1. 高风险场景：默认有代表性（场景本身值得学习防护要点）
 * 2. 中风险场景：需要"曲折度"或"典型性"达标才展示
 *    - 曲折度：文本中包含"犹豫、害怕、差点、被误解、被讹"等经历波折的关键词
 *    - 典型性：文本中包含"扶老人、交通事故、救人、见义勇为"等高频场景关键词
 *    - 阈值：曲折关键词>=2 或 典型关键词>=2 或 总分>=4（曲折*2 + 典型*1）
 *
 * @param text - 善行记录文本内容
 * @param scenario - 风险检测结果（由 detectRisk 返回），若为 null 则直接返回不具代表性
 * @returns 判断结果对象：
 *   - representative: 是否具有代表性（true 则展示事前学习卡片）
 *   - reason: 判定理由（用于展示给用户的提示语）
 *   - twistScore: 曲折度得分（文本中曲折关键词的匹配数量）
 */
export const isRepresentative = (
  text: string,
  scenario: RiskScenario | null
): { representative: boolean; reason: string; twistScore: number } => {
  if (!scenario) {
    return { representative: false, reason: '', twistScore: 0 };
  }

  const lowerText = text.toLowerCase();

  // 高风险场景默认有代表性（即使描述简短，场景本身就值得学习）
  if (scenario.level === 'high') {
    const twistCount = TWIST_INDICATORS.filter(k => lowerText.includes(k)).length;
    return {
      representative: true,
      reason: twistCount > 0 ? '经历曲折，有经验教训' : '高风险场景，值得学习防护要点',
      twistScore: twistCount,
    };
  }

  // 中风险场景：需要"曲折度"或"典型性"达标才展示
  const twistCount = TWIST_INDICATORS.filter(k => lowerText.includes(k)).length;
  const typicalCount = TYPICAL_INDICATORS.filter(k => lowerText.includes(k)).length;
  const totalScore = twistCount * 2 + typicalCount;

  // 阈值：曲折关键词≥2 或 典型关键词≥2 或 总分≥4
  if (totalScore >= 4) {
    return {
      representative: true,
      reason: twistCount >= 2 ? '经历曲折，有经验教训值得学习' : '典型高频场景，建议提前了解',
      twistScore: twistCount,
    };
  }

  return { representative: false, reason: '', twistScore: twistCount };
};

/**
 * 生成事前学习摘要（展示在学习卡片中）
 * 根据曲折度和风险场景生成简短引导语
 */
export const generateLearnSummary = (
  scenario: RiskScenario,
  twistScore: number
): string => {
  if (twistScore >= 3) {
    return `这位善行者的经历有不少波折，后来者做类似善行时建议提前做好准备。`;
  }
  if (twistScore >= 1) {
    return `这位善行者遇到了一些意外情况。如果您也想做类似的事，建议提前了解保护要点：`;
  }
  return `这是一件"${scenario.category}"类的善行。如果您也想做类似的事，建议提前了解以下保护要点：`;
};
