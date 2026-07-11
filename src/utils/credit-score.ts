/** \u4fe1\u7528\u5206\u7ef4\u5ea6\u914d\u7f6e */
export interface CreditScoreDimensions {
  fortune: number;      // \u798f\u6c14\u503c\u8d21\u732e 0-200
  consistency: number;  // \u8fde\u7eed\u5929\u6570 0-200
  diversity: number;    // \u5584\u884c\u591a\u6837\u6027 0-150
  witness: number;      // \u89c1\u8bc1/\u88ab\u611f\u8c22 0-200
  challenge: number;    // \u6311\u6218\u8d5b\u53c2\u4e0e 0-150
  social: number;       // \u793e\u4ea4\u4e92\u52a8 0-100
}

/** \u4fe1\u7528\u5206\u7b49\u7ea7 */
export type CreditScoreLevel = 'D' | 'C' | 'B' | 'A' | 'S';

/** \u4fe1\u7528\u5206\u8be6\u60c5 */
export interface CreditScoreDetail {
  total: number;
  level: CreditScoreLevel;
  levelName: string;
  levelIcon: string;
  dimensions: CreditScoreDimensions;
  trend: 'up' | 'stable' | 'down';
}

/** \u7b49\u7ea7\u914d\u7f6e\u6570\u7ec4 */
export interface CreditLevelConfig {
  level: CreditScoreLevel;
  name: string;
  title: string;
  icon: string;
  minScore: number;
  color: string;
  gradient: [string, string];
}

/** \u7b49\u7ea7\u914d\u7f6e */
export const CREDIT_LEVELS: CreditLevelConfig[] = [
  {
    level: 'S',
    name: '\u5584\u884c\u4f20\u5947',
    title: '\u4f20\u5947\u4e0d\u706d\uff0c\u5149\u7167\u4e07\u4e16',
    icon: '\ud83c\udf1f',
    minScore: 900,
    color: '#FFD700',
    gradient: ['#FFD700', '#FFA500'],
  },
  {
    level: 'A',
    name: '\u5584\u884c\u5927\u4f7f',
    title: '\u5927\u4f7f\u4e4b\u5fd7\uff0c\u5584\u884c\u5929\u4e0b',
    icon: '\ud83d\udc51',
    minScore: 700,
    color: '#C4956A',
    gradient: ['#C4956A', '#D4A76A'],
  },
  {
    level: 'B',
    name: '\u5584\u884c\u5148\u950b',
    title: '\u52c7\u4e8e\u5148\u884c\uff0c\u4ee5\u5584\u4e3a\u8363',
    icon: '\u2b50',
    minScore: 500,
    color: '#6BAF7B',
    gradient: ['#6BAF7B', '#8FC99A'],
  },
  {
    level: 'C',
    name: '\u6e29\u6696\u4e4b\u661f',
    title: '\u661f\u706b\u71ce\u539f\uff0c\u6e29\u6696\u4eba\u95f4',
    icon: '\ud83c\udf1f',
    minScore: 300,
    color: '#5B9BD5',
    gradient: ['#5B9BD5', '#7CB9E8'],
  },
  {
    level: 'D',
    name: '\u4fe1\u7528\u5584\u8005',
    title: '\u521d\u5fc3\u4e0d\u6539\uff0c\u5584\u884c\u4ece\u4eca\u5929\u5f00\u59cb',
    icon: '\ud83c\udf3f',
    minScore: 0,
    color: '#9E9E9E',
    gradient: ['#9E9E9E', '#BDBDBD'],
  },
];

/** \u8ba1\u7b97\u4fe1\u7528\u5206\u7684\u53c2\u6570 */
export interface CreditScoreParams {
  /** \u7d2f\u8ba1\u798f\u6c14\u503c */
  totalFortune: number;
  /** \u5f53\u524d\u8fde\u7eed\u5929\u6570 */
  currentStreak: number;
  /** \u4e0d\u540c\u6807\u7b7e\u7684\u6570\u91cf\uff08\u5584\u884c\u591a\u6837\u6027\uff09 */
  uniqueTagCount: number;
  /** \u88ab\u89c1\u8bc1/\u88ab\u611f\u8c22\u6b21\u6570 */
  witnessCount: number;
  /** \u53c2\u4e0e\u6311\u6218\u8d5b\u6b21\u6570 */
  challengeCount: number;
  /** \u793e\u4ea4\u4e92\u52a8\u6b21\u6570\uff08\u63a5\u529b/\u5708/\u611f\u8c22\u5899\uff09 */
  socialCount: number;
  /** \u4e0a\u6b21\u4fe1\u7528\u5206\uff08\u7528\u4e8e\u8ba1\u7b97\u8d8b\u52bf\uff0c\u53ef\u9009\uff09 */
  previousScore?: number;
}

/** \u8ba1\u7b97\u4fe1\u7528\u5206 */
export function calculateCreditScore(params: CreditScoreParams): CreditScoreDetail {
  const {
    totalFortune,
    currentStreak,
    uniqueTagCount,
    witnessCount,
    challengeCount,
    socialCount,
    previousScore,
  } = params;

  // \u798f\u6c14\u503c\u8d21\u732e: \u798f\u6c14\u503c/3500*200\uff0c\u4e0a\u9650200
  const fortune = Math.min(200, Math.round((totalFortune / 3500) * 200));

  // \u8fde\u7eed\u5929\u6570: \u8fde\u7eed\u5929\u6570/30*200\uff0c\u4e0a\u9650200
  const consistency = Math.min(200, Math.round((currentStreak / 30) * 200));

  // \u5584\u884c\u591a\u6837\u6027: \u4e0d\u540c\u6807\u7b7e\u6570/10*150\uff0c\u4e0a\u9650150
  const diversity = Math.min(150, Math.round((uniqueTagCount / 10) * 150));

  // \u89c1\u8bc1/\u88ab\u611f\u8c22: witnessCount/20*200\uff0c\u4e0a\u9650200
  const witness = Math.min(200, Math.round((witnessCount / 20) * 200));

  // \u6311\u6218\u8d5b\u53c2\u4e0e: challengeCount/10*150\uff0c\u4e0a\u9650150
  const challenge = Math.min(150, Math.round((challengeCount / 10) * 150));

  // \u793e\u4ea4\u4e92\u52a8: socialCount/30*100\uff0c\u4e0a\u9650100
  const social = Math.min(100, Math.round((socialCount / 30) * 100));

  const dimensions: CreditScoreDimensions = {
    fortune,
    consistency,
    diversity,
    witness,
    challenge,
    social,
  };

  const total = fortune + consistency + diversity + witness + challenge + social;

  // \u786e\u5b9a\u7b49\u7ea7
  let levelConfig = CREDIT_LEVELS[CREDIT_LEVELS.length - 1]; // D
  for (const cfg of CREDIT_LEVELS) {
    if (total >= cfg.minScore) {
      levelConfig = cfg;
      break;
    }
  }

  // \u8ba1\u7b97\u8d8b\u52bf
  let trend: 'up' | 'stable' | 'down' = 'stable';
  if (previousScore !== undefined && previousScore > 0) {
    const diff = total - previousScore;
    if (diff > 10) trend = 'up';
    else if (diff < -10) trend = 'down';
  }

  return {
    total,
    level: levelConfig.level,
    levelName: levelConfig.name,
    levelIcon: levelConfig.icon,
    dimensions,
    trend,
  };
}

/** \u83b7\u53d6\u7ef4\u5ea6\u7684\u6700\u5927\u5206\u503c */
export const DIMENSION_MAX: Record<keyof CreditScoreDimensions, number> = {
  fortune: 200,
  consistency: 200,
  diversity: 150,
  witness: 200,
  challenge: 150,
  social: 100,
};

/** \u7ef4\u5ea6\u4e2d\u6587\u540d\u79f0 */
export const DIMENSION_LABELS: Record<keyof CreditScoreDimensions, string> = {
  fortune: '\u798f\u6c14\u79ef\u7d2f',
  consistency: '\u6301\u7eed\u575a\u6301',
  diversity: '\u5584\u884c\u591a\u5143',
  witness: '\u89c1\u8bc1\u8ba4\u53ef',
  challenge: '\u6311\u6218\u7a81\u7834',
  social: '\u793e\u4ea4\u5f71\u54cd',
};

/** \u7ef4\u5ea6\u8bf4\u660e\u6587\u5b57 */
export const DIMENSION_DESCRIPTIONS: Record<keyof CreditScoreDimensions, string> = {
  fortune: '\u57fa\u4e8e\u7d2f\u8ba1\u798f\u6c14\u503c\u8ba1\u7b97\uff0c\u53cd\u6620\u5584\u884c\u7684\u6574\u4f53\u91cf\u7ea7',
  consistency: '\u57fa\u4e8e\u8fde\u7eed\u5929\u6570\u8ba1\u7b97\uff0c\u5956\u52b1\u6301\u7eed\u884c\u52a8',
  diversity: '\u57fa\u4e8e\u4e0d\u540c\u5584\u884c\u6807\u7b7e\u6570\u8ba1\u7b97\uff0c\u9f13\u52b1\u591a\u5143\u53c2\u4e0e',
  witness: '\u57fa\u4e8e\u88ab\u89c1\u8bc1\u548c\u611f\u8c22\u6b21\u6570\u8ba1\u7b97\uff0c\u53cd\u6620\u793e\u4f1a\u8ba4\u53ef',
  challenge: '\u57fa\u4e8e\u6311\u6218\u8d5b\u53c2\u4e0e\u6b21\u6570\u8ba1\u7b97\uff0c\u9f13\u52b1\u7a81\u7834\u81ea\u6211',
  social: '\u57fa\u4e8e\u63a5\u529b\u3001\u5708\u53c2\u4e0e\u3001\u611f\u8c22\u5899\u7b49\u793e\u4ea4\u4e92\u52a8\u8ba1\u7b97',
};

/** \u63d0\u5347\u5efa\u8bae\u6a21\u677f */
const SUGGESTION_TEMPLATES: Record<keyof CreditScoreDimensions, string[]> = {
  fortune: [
    '\u591a\u8bb0\u5f55\u5584\u884c\uff0c\u6bcf\u6761\u5584\u884c\u90fd\u80fd\u7d2f\u79ef\u798f\u6c14\u503c',
    '\u5c1d\u8bd5\u5305\u542b\u56fe\u7247\u6216\u89c6\u9891\u7684\u5584\u884c\u8bb0\u5f55\uff0c\u53ef\u83b7\u5f97\u66f4\u591a\u798f\u6c14',
  ],
  consistency: [
    '\u575a\u6301\u6bcf\u5929\u8bb0\u5f55\u5584\u884c\uff0c\u8fde\u7eed\u5929\u6570\u8d8a\u591a\u5206\u6570\u8d8a\u9ad8',
    '\u8bbe\u7f6e\u6bcf\u65e5\u63d0\u9192\uff0c\u517b\u6210\u65e5\u884c\u4e00\u5584\u7684\u4e60\u60ef',
  ],
  diversity: [
    '\u5c1d\u8bd5\u4e0d\u540c\u7c7b\u578b\u7684\u5584\u884c\uff0c\u5982\u73af\u4fdd\u3001\u5fd7\u613f\u670d\u52a1\u3001\u4eb2\u60c5\u5173\u6000\u7b49',
    '\u63a2\u7d22\u65b0\u7684\u5584\u884c\u6807\u7b7e\uff0c\u8ba9\u4f60\u7684\u5584\u884c\u66f4\u52a0\u4e30\u5bcc\u591a\u5f69',
  ],
  witness: [
    '\u9080\u8bf7\u670b\u53cb\u89c1\u8bc1\u4f60\u7684\u5584\u884c\uff0c\u63d0\u5347\u793e\u4f1a\u8ba4\u53ef\u5ea6',
    '\u5728\u5584\u884c\u5708\u4e2d\u5206\u4eab\u5584\u884c\u6545\u4e8b\uff0c\u83b7\u53d6\u66f4\u591a\u611f\u8c22',
  ],
  challenge: [
    '\u53c2\u4e0e\u5584\u884c\u6311\u6218\u8d5b\uff0c\u5b8c\u6210\u6311\u6218\u53ef\u83b7\u5f97\u989d\u5916\u52a0\u5206',
    '\u5173\u6ce8\u6bcf\u5468\u65b0\u6311\u6218\u4e3b\u9898\uff0c\u6311\u6218\u81ea\u6211\u7a81\u7834\u6781\u9650',
  ],
  social: [
    '\u53c2\u4e0e\u5584\u884c\u63a5\u529b\uff0c\u4e0e\u670b\u53cb\u4e00\u8d77\u4f20\u9012\u5584\u610f',
    '\u5728\u611f\u8c22\u5899\u4e0a\u8868\u8fbe\u611f\u8c22\uff0c\u589e\u5f3a\u793e\u533a\u4e92\u52a8',
  ],
};

/** \u6839\u636e\u4fe1\u7528\u5206\u8be6\u60c5\u751f\u6210\u63d0\u5347\u5efa\u8bae */
export function getImprovementSuggestions(detail: CreditScoreDetail): string[] {
  const { dimensions } = detail;
  const entries = Object.entries(dimensions) as [keyof CreditScoreDimensions, number][];

  // \u627e\u5230\u6700\u4f4e\u5206\u7684\u7ef4\u5ea6
  entries.sort((a, b) => {
    const aRatio = a[1] / DIMENSION_MAX[a[0]];
    const bRatio = b[1] / DIMENSION_MAX[b[0]];
    return aRatio - bRatio;
  });

  const suggestions: string[] = [];
  for (const [dim, score] of entries) {
    const ratio = score / DIMENSION_MAX[dim];
    if (ratio < 0.5 && suggestions.length < 2) {
      const templates = SUGGESTION_TEMPLATES[dim];
      suggestions.push(templates[0]);
    } else if (ratio < 0.8 && suggestions.length < 2) {
      const templates = SUGGESTION_TEMPLATES[dim];
      suggestions.push(templates[1]);
    }
    if (suggestions.length >= 2) break;
  }

  if (suggestions.length === 0) {
    suggestions.push('\u4f60\u7684\u5404\u9879\u7ef4\u5ea6\u8868\u73b0\u4f18\u79c0\uff0c\u7ee7\u7eed\u4fdd\u6301\uff01');
  }

  return suggestions;
}