// ============================================
// 慈善善行兑换系统 - Mock 数据
// 包含：公益组织 / 受助人 / 资金流向 / 捐赠记录 / 季度公示 / 善行任务 / 领取流程
// ============================================

// 受助人类型
export type RecipientType =
  | 'student'    // 困境学生
  | 'elderly'    // 独居老人
  | 'patient'    // 重病患者
  | 'disabled'   // 残障人士
  | 'emergency'; // 突发困难家庭

// 受助人类型映射
export const RECIPIENT_TYPE_MAP: Record<RecipientType, { label: string; icon: string; color: string }> = {
  student: { label: '困境学生', icon: '📚', color: '#165dff' },
  elderly: { label: '独居老人', icon: '👴', color: '#FAAD14' },
  patient: { label: '重病患者', icon: '🏥', color: '#FF4D4F' },
  disabled: { label: '残障人士', icon: '♿', color: '#722ED1' },
  emergency: { label: '突发困难', icon: '🏠', color: '#13C2C2' },
};

// 公益组织
export interface CharityOrganization {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  description: string;
  license: string; // 公募资质编号
  categories: RecipientType[];
  totalReceived: number; // 累计接收善款（元）
  totalBeneficiaries: number; // 累计帮扶人数
  isVerified: boolean;
  website: string;
}

// 受助人（脱敏处理）
export interface Recipient {
  id: string;
  alias: string; // 匿名化称呼 如"小雨同学"
  type: RecipientType;
  ageGroup: string; // 年龄段
  region: string; // 地区（脱敏）
  story: string; // 脱敏故事
  neededHelp: string; // 所需帮助
  requiredAmount: number; // 所需金额（元）
  receivedAmount: number; // 已获金额（元）
  organizationId: string;
  avatar: string; // 模糊处理头像
  status: 'active' | 'completed' | 'archived';
  feedback?: string; // "你的温暖正在帮助..."反馈
  createdAt: string;
}

// 资金流向节点
export interface FundFlowNode {
  type: 'source' | 'organization' | 'recipient';
  name: string;
  description: string;
  amount?: number;
  timestamp: string;
}

// 资金流向链路
export interface FundFlow {
  id: string;
  amount: number; // 金额（元）
  source: 'warmth_fund' | 'user_donation' | 'brand_sponsor';
  sourceDescription: string;
  organizationId: string;
  organizationName: string;
  recipientId: string;
  recipientAlias: string;
  flowNodes: FundFlowNode[];
  status: 'in_transit' | 'delivered' | 'confirmed';
  createdAt: string;
  completedAt?: string;
}

// 用户捐赠记录
export interface DonationRecord {
  id: string;
  userId: string;
  fortuneAmount: number; // 兑换的福气
  moneyAmount: number; // 对应善款金额（元）
  flowId: string; // 关联资金流向
  recipientId?: string; // 指定受助人
  organizationId: string;
  createdAt: string;
}

// 季度财务公示
export interface CharityQuarterlyReport {
  quarter: string;
  title: string;
  totalDonation: number; // 总捐赠善款（元）
  totalBeneficiaries: number; // 受益人数
  totalFlow: number; // 资金流向数
  organizations: string[]; // 参与公益组织
  highlights: string[]; // 季度亮点
  publishedAt: string;
}

// 善行任务等级
export type TaskLevel = 'L1' | 'L2' | 'L3';

// 善行任务状态
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'verified';

// 善行任务来源
export type TaskSource = 'system' | 'organization' | 'user_proposal';

// 善行任务
export interface CharityTask {
  id: string;
  title: string;
  description: string;
  level: TaskLevel;
  fortuneReward: number; // 福气奖励
  source: TaskSource;
  category: string; // 任务分类
  examples?: string[]; // 示例
  status: TaskStatus;
  proofRequired: boolean; // 是否需要拍照/视频
  estimatedTime: string; // 预计耗时
  participants: number; // 参与人数
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  verifiedAt?: string;
  proofImages?: string[];
  aiReviewResult?: 'pending' | 'passed' | 'rejected';
  manualReviewResult?: 'pending' | 'approved' | 'rejected';
  reviewComment?: string;
}

// 善款领取流程步骤
export type ClaimStep =
  | 'applied'       // 申请领取
  | 'reviewing'     // 资格审核
  | 'approved'      // 审核通过
  | 'distributing'  // 善款发放
  | 'delivered'     // 已发放
  | 'confirmed'     // 领取确认
  | 'published';    // 公示反馈

// 领取流程步骤信息
export interface ClaimStepInfo {
  step: ClaimStep;
  label: string;
  description: string;
  status: 'done' | 'current' | 'pending';
  timestamp?: string;
  operator?: string;
  note?: string;
}

// 善款领取流程
export interface ClaimFlow {
  id: string;
  recipientId: string;
  recipientAlias: string;
  organizationId: string;
  organizationName: string;
  amount: number; // 领取金额（元）
  applicantType: 'recipient' | 'organization'; // 申请人类型
  currentStep: ClaimStep;
  steps: ClaimStepInfo[];
  createdAt: string;
  updatedAt: string;
}

// 福气 → 善款兑换比例（1 福气 = 1 元）
export const FORTUNE_TO_MONEY_RATE = 1;

// ============================================
// Mock 公益组织数据
// ============================================
export const mockOrganizations: CharityOrganization[] = [
  {
    id: 'org_1',
    name: '中国扶贫基金会',
    shortName: '扶贫基金会',
    logo: 'https://picsum.photos/id/1011/200/200',
    description: '致力于帮扶困境群众，覆盖教育、健康、生计等多个领域',
    license: '基证字第1010号',
    categories: ['student', 'elderly', 'emergency'],
    totalReceived: 128600,
    totalBeneficiaries: 342,
    isVerified: true,
    website: 'www.cfpa.org.cn',
  },
  {
    id: 'org_2',
    name: '壹基金',
    shortName: '壹基金',
    logo: 'https://picsum.photos/id/1012/200/200',
    description: '尽我所能，人人公益，关注灾害救助与儿童关怀',
    license: '基证字第1020号',
    categories: ['student', 'patient', 'disabled'],
    totalReceived: 98400,
    totalBeneficiaries: 268,
    isVerified: true,
    website: 'www.onefoundation.cn',
  },
  {
    id: 'org_3',
    name: '中国残疾人福利基金会',
    shortName: '残障福利基金',
    logo: 'https://picsum.photos/id/1013/200/200',
    description: '为残障人士提供康复、教育、就业等全方位支持',
    license: '基证字第1030号',
    categories: ['disabled'],
    totalReceived: 56200,
    totalBeneficiaries: 156,
    isVerified: true,
    website: 'www.cdpf.org.cn',
  },
  {
    id: 'org_4',
    name: '中华少年儿童慈善救助基金会',
    shortName: '儿慈会',
    logo: 'https://picsum.photos/id/1014/200/200',
    description: '专注困境儿童救助，为孩子们撑起一片天',
    license: '基证字第1040号',
    categories: ['student', 'patient'],
    totalReceived: 73800,
    totalBeneficiaries: 198,
    isVerified: true,
    website: 'www.ccafc.org.cn',
  },
];

// ============================================
// Mock 受助人数据（脱敏处理）
// ============================================
export const mockRecipients: Recipient[] = [
  {
    id: 'rec_1',
    alias: '小雨同学',
    type: 'student',
    ageGroup: '8-12岁',
    region: '西南山区',
    story: '小雨父母在外打工，跟着年迈的奶奶生活。成绩优异，每天要走40分钟山路去上学，最大的愿望是有一套属于自己的课外书。',
    neededHelp: '学习用品与生活补助',
    requiredAmount: 2000,
    receivedAmount: 1200,
    organizationId: 'org_1',
    avatar: 'https://picsum.photos/id/1025/200/200?blur=5',
    status: 'active',
    feedback: '你的温暖正在帮助小雨同学离她的课外书更近一步',
    createdAt: '2024-05-10T00:00:00Z',
  },
  {
    id: 'rec_2',
    alias: '王奶奶',
    type: 'elderly',
    ageGroup: '70-80岁',
    region: '北方某城',
    story: '王奶奶独居多年，子女在外地工作。腿脚不便，日常买菜取药都困难，最期待有人能陪她说说话。',
    neededHelp: '生活照料与陪伴',
    requiredAmount: 1500,
    receivedAmount: 800,
    organizationId: 'org_1',
    avatar: 'https://picsum.photos/id/1027/200/200?blur=5',
    status: 'active',
    feedback: '你的温暖正在帮助王奶奶度过温暖的晚年',
    createdAt: '2024-05-12T00:00:00Z',
  },
  {
    id: 'rec_3',
    alias: '小李',
    type: 'patient',
    ageGroup: '30-40岁',
    region: '华东某市',
    story: '小李是一名普通工人，确诊重病后无法工作，家庭失去主要经济来源，治疗费用让全家陷入困境。',
    neededHelp: '医疗费用补助',
    requiredAmount: 5000,
    receivedAmount: 3200,
    organizationId: 'org_2',
    avatar: 'https://picsum.photos/id/1029/200/200?blur=5',
    status: 'active',
    feedback: '你的温暖正在帮助小李坚定战胜病痛的信心',
    createdAt: '2024-05-15T00:00:00Z',
  },
  {
    id: 'rec_4',
    alias: '阿明',
    type: 'disabled',
    ageGroup: '20-30岁',
    region: '华南某市',
    story: '阿明因意外失去双腿，但一直积极面对生活。希望学习一门手艺自食其力，需要康复训练和技能培训支持。',
    neededHelp: '康复与技能培训',
    requiredAmount: 3000,
    receivedAmount: 1800,
    organizationId: 'org_3',
    avatar: 'https://picsum.photos/id/1031/200/200?blur=5',
    status: 'active',
    feedback: '你的温暖正在帮助阿明重拾生活的勇气',
    createdAt: '2024-05-18T00:00:00Z',
  },
  {
    id: 'rec_5',
    alias: '张师傅一家',
    type: 'emergency',
    ageGroup: '全家',
    region: '华中某村',
    story: '张师傅家因突发火灾房屋受损严重，一家五口暂时借住亲友家，急需重建家园的资金支持。',
    neededHelp: '房屋修缮补助',
    requiredAmount: 8000,
    receivedAmount: 4500,
    organizationId: 'org_1',
    avatar: 'https://picsum.photos/id/1033/200/200?blur=5',
    status: 'active',
    feedback: '你的温暖正在帮助张师傅一家重建家园',
    createdAt: '2024-05-20T00:00:00Z',
  },
  {
    id: 'rec_6',
    alias: '小芳',
    type: 'student',
    ageGroup: '13-15岁',
    region: '西北山区',
    story: '小芳品学兼优，父亲因病丧失劳动能力，母亲打零工养家。她梦想考上好高中改变家庭命运。',
    neededHelp: '学费与生活费补助',
    requiredAmount: 3000,
    receivedAmount: 3000,
    organizationId: 'org_4',
    avatar: 'https://picsum.photos/id/1035/200/200?blur=5',
    status: 'completed',
    feedback: '感谢你的温暖，小芳已顺利入学高中',
    createdAt: '2024-04-01T00:00:00Z',
  },
  {
    id: 'rec_7',
    alias: '陈伯',
    type: 'elderly',
    ageGroup: '80岁以上',
    region: '南方某村',
    story: '陈伯无儿无女，独自生活在老旧房屋中。患有慢性病，需要长期服药，经济拮据。',
    neededHelp: '医疗与生活补助',
    requiredAmount: 2500,
    receivedAmount: 1500,
    organizationId: 'org_1',
    avatar: 'https://picsum.photos/id/1037/200/200?blur=5',
    status: 'active',
    feedback: '你的温暖正在帮助陈伯安度晚年',
    createdAt: '2024-05-22T00:00:00Z',
  },
];

// ============================================
// Mock 资金流向数据
// ============================================
export const mockFundFlows: FundFlow[] = [
  {
    id: 'flow_1',
    amount: 500,
    source: 'user_donation',
    sourceDescription: '温暖小太阳的福气兑换',
    organizationId: 'org_1',
    organizationName: '中国扶贫基金会',
    recipientId: 'rec_1',
    recipientAlias: '小雨同学',
    flowNodes: [
      {
        type: 'source',
        name: '温暖小太阳',
        description: '福气兑换善款',
        amount: 500,
        timestamp: '2024-06-01T10:00:00Z',
      },
      {
        type: 'organization',
        name: '中国扶贫基金会',
        description: '善款中转确认',
        amount: 500,
        timestamp: '2024-06-01T14:00:00Z',
      },
      {
        type: 'recipient',
        name: '小雨同学',
        description: '善款已送达，用于购买学习用品',
        amount: 500,
        timestamp: '2024-06-03T09:00:00Z',
      },
    ],
    status: 'confirmed',
    createdAt: '2024-06-01T10:00:00Z',
    completedAt: '2024-06-03T09:00:00Z',
  },
  {
    id: 'flow_2',
    amount: 300,
    source: 'user_donation',
    sourceDescription: '温暖小太阳的福气兑换',
    organizationId: 'org_2',
    organizationName: '壹基金',
    recipientId: 'rec_3',
    recipientAlias: '小李',
    flowNodes: [
      {
        type: 'source',
        name: '温暖小太阳',
        description: '福气兑换善款',
        amount: 300,
        timestamp: '2024-06-05T11:00:00Z',
      },
      {
        type: 'organization',
        name: '壹基金',
        description: '善款中转确认',
        amount: 300,
        timestamp: '2024-06-05T16:00:00Z',
      },
    ],
    status: 'in_transit',
    createdAt: '2024-06-05T11:00:00Z',
  },
  {
    id: 'flow_3',
    amount: 200,
    source: 'warmth_fund',
    sourceDescription: '温暖基金季度分配',
    organizationId: 'org_3',
    organizationName: '中国残疾人福利基金会',
    recipientId: 'rec_4',
    recipientAlias: '阿明',
    flowNodes: [
      {
        type: 'source',
        name: '温暖基金',
        description: '季度分配善款',
        amount: 200,
        timestamp: '2024-06-08T10:00:00Z',
      },
      {
        type: 'organization',
        name: '中国残疾人福利基金会',
        description: '善款中转确认',
        amount: 200,
        timestamp: '2024-06-08T15:00:00Z',
      },
      {
        type: 'recipient',
        name: '阿明',
        description: '善款已送达，用于康复训练',
        amount: 200,
        timestamp: '2024-06-10T09:00:00Z',
      },
    ],
    status: 'confirmed',
    createdAt: '2024-06-08T10:00:00Z',
    completedAt: '2024-06-10T09:00:00Z',
  },
];

// ============================================
// Mock 用户捐赠记录
// ============================================
export const mockDonations: DonationRecord[] = [
  {
    id: 'don_1',
    userId: 'currentUser',
    fortuneAmount: 500,
    moneyAmount: 500,
    flowId: 'flow_1',
    recipientId: 'rec_1',
    organizationId: 'org_1',
    createdAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'don_2',
    userId: 'currentUser',
    fortuneAmount: 300,
    moneyAmount: 300,
    flowId: 'flow_2',
    recipientId: 'rec_3',
    organizationId: 'org_2',
    createdAt: '2024-06-05T11:00:00Z',
  },
];

// ============================================
// Mock 季度财务公示
// ============================================
export const mockCharityReports: CharityQuarterlyReport[] = [
  {
    quarter: '2024-Q1',
    title: '2024年第一季度慈善善款公示',
    totalDonation: 38600,
    totalBeneficiaries: 86,
    totalFlow: 42,
    organizations: ['中国扶贫基金会', '壹基金', '儿慈会'],
    highlights: [
      '开学季为32名困境学生送上学费补助',
      '联合壹基金为12名重病患者提供医疗补助',
      '春节温暖礼包惠及42户困难家庭',
    ],
    publishedAt: '2024-04-08T00:00:00Z',
  },
  {
    quarter: '2024-Q2',
    title: '2024年第二季度慈善善款公示',
    totalDonation: 52400,
    totalBeneficiaries: 128,
    totalFlow: 67,
    organizations: ['中国扶贫基金会', '壹基金', '残障福利基金', '儿慈会'],
    highlights: [
      '新增对接中国残疾人福利基金会',
      '为8名残障人士提供康复培训支持',
      '张师傅一家房屋修缮善款已到位',
      '本季度用户福气兑换善款同比增长35%',
    ],
    publishedAt: '2024-07-08T00:00:00Z',
  },
];

// ============================================
// Mock 善行任务数据
// ============================================
export const mockCharityTasks: CharityTask[] = [
  // L1 日常微善
  {
    id: 'task_1',
    title: '为邻居取一次快递',
    description: '帮助行动不便的邻居或独居老人取一次快递并送上门',
    level: 'L1',
    fortuneReward: 5,
    source: 'system',
    category: '邻里互助',
    examples: ['帮楼下奶奶取快递', '帮邻居代收大件包裹'],
    status: 'pending',
    proofRequired: true,
    estimatedTime: '15分钟',
    participants: 128,
    createdAt: '2024-06-01T00:00:00Z',
  },
  {
    id: 'task_2',
    title: '给流浪猫喂食',
    description: '为社区流浪猫提供一次干净的食物和水',
    level: 'L1',
    fortuneReward: 3,
    source: 'system',
    category: '动物关怀',
    status: 'pending',
    proofRequired: true,
    estimatedTime: '10分钟',
    participants: 86,
    createdAt: '2024-06-02T00:00:00Z',
  },
  {
    id: 'task_3',
    title: '随手捡起路边垃圾',
    description: '外出时随手捡起路边的垃圾并分类投放',
    level: 'L1',
    fortuneReward: 2,
    source: 'system',
    category: '环境保护',
    status: 'pending',
    proofRequired: true,
    estimatedTime: '5分钟',
    participants: 215,
    createdAt: '2024-06-03T00:00:00Z',
  },
  // L2 社区贡献
  {
    id: 'task_4',
    title: '参与社区清洁',
    description: '参加社区组织的清洁活动，清理公共区域卫生',
    level: 'L2',
    fortuneReward: 25,
    source: 'organization',
    category: '社区服务',
    examples: ['社区周末大扫除', '楼道杂物清理'],
    status: 'pending',
    proofRequired: true,
    estimatedTime: '2小时',
    participants: 45,
    createdAt: '2024-06-04T00:00:00Z',
  },
  {
    id: 'task_5',
    title: '陪伴孤寡老人1小时',
    description: '到独居老人家中陪伴聊天、读报或协助日常事务',
    level: 'L2',
    fortuneReward: 30,
    source: 'organization',
    category: '老人关怀',
    status: 'in_progress',
    proofRequired: true,
    estimatedTime: '1小时',
    participants: 32,
    createdAt: '2024-06-05T00:00:00Z',
    startedAt: '2024-06-10T09:00:00Z',
  },
  {
    id: 'task_6',
    title: '为社区儿童辅导功课',
    description: '为困境家庭儿童提供一次功课辅导',
    level: 'L2',
    fortuneReward: 20,
    source: 'user_proposal',
    category: '教育支持',
    status: 'pending',
    proofRequired: true,
    estimatedTime: '1.5小时',
    participants: 18,
    createdAt: '2024-06-06T00:00:00Z',
  },
  // L3 公益行动
  {
    id: 'task_7',
    title: '参与一次志愿活动',
    description: '参加公益组织举办的正式志愿活动（如义卖、支教、探访等）',
    level: 'L3',
    fortuneReward: 60,
    source: 'organization',
    category: '志愿服务',
    examples: ['公益义卖', '山区支教', '敬老院探访'],
    status: 'pending',
    proofRequired: true,
    estimatedTime: '半天',
    participants: 56,
    createdAt: '2024-06-07T00:00:00Z',
  },
  {
    id: 'task_8',
    title: '捐赠闲置物品',
    description: '将闲置的衣物、书籍、玩具等捐赠给有需要的人',
    level: 'L3',
    fortuneReward: 50,
    source: 'system',
    category: '物资捐赠',
    status: 'completed',
    proofRequired: true,
    estimatedTime: '1小时',
    participants: 72,
    createdAt: '2024-06-08T00:00:00Z',
    startedAt: '2024-06-09T10:00:00Z',
    completedAt: '2024-06-09T12:00:00Z',
    proofImages: ['https://picsum.photos/id/1040/400/300'],
    aiReviewResult: 'passed',
    manualReviewResult: 'pending',
  },
  {
    id: 'task_9',
    title: '参与一次无偿献血',
    description: '前往献血点参与无偿献血，为社会贡献一份力量',
    level: 'L3',
    fortuneReward: 80,
    source: 'system',
    category: '医疗救助',
    status: 'verified',
    proofRequired: true,
    estimatedTime: '2小时',
    participants: 38,
    createdAt: '2024-06-09T00:00:00Z',
    startedAt: '2024-06-10T09:00:00Z',
    completedAt: '2024-06-10T11:00:00Z',
    verifiedAt: '2024-06-11T10:00:00Z',
    proofImages: ['https://picsum.photos/id/1041/400/300'],
    aiReviewResult: 'passed',
    manualReviewResult: 'approved',
    reviewComment: '献血证已核实，感谢您的善举',
  },
];

// ============================================
// Mock 善款领取流程数据
// ============================================
export const mockClaimFlows: ClaimFlow[] = [
  {
    id: 'claim_1',
    recipientId: 'rec_1',
    recipientAlias: '小雨同学',
    organizationId: 'org_1',
    organizationName: '中国扶贫基金会',
    amount: 1200,
    applicantType: 'organization',
    currentStep: 'confirmed',
    steps: [
      {
        step: 'applied',
        label: '申请领取',
        description: '公益组织代为申请善款领取',
        status: 'done',
        timestamp: '2024-06-01T10:00:00Z',
        operator: '中国扶贫基金会',
        note: '代小雨同学申请学习用品补助',
      },
      {
        step: 'reviewing',
        label: '资格审核',
        description: '公益组织审核 + 平台复核',
        status: 'done',
        timestamp: '2024-06-01T14:00:00Z',
        operator: '平台审核组',
        note: '受助人信息核实通过',
      },
      {
        step: 'approved',
        label: '审核通过',
        description: '善款发放审批完成',
        status: 'done',
        timestamp: '2024-06-01T16:00:00Z',
        operator: '平台审核组',
      },
      {
        step: 'distributing',
        label: '善款发放',
        description: '通过公益组织中转发放',
        status: 'done',
        timestamp: '2024-06-02T10:00:00Z',
        operator: '中国扶贫基金会',
        note: '善款已划转至公益组织账户',
      },
      {
        step: 'delivered',
        label: '善款送达',
        description: '公益组织将善款送达受助人',
        status: 'done',
        timestamp: '2024-06-03T09:00:00Z',
        operator: '中国扶贫基金会',
        note: '学习用品已采购并送达',
      },
      {
        step: 'confirmed',
        label: '领取确认',
        description: '受助人确认收到善款/物资',
        status: 'done',
        timestamp: '2024-06-03T10:00:00Z',
        operator: '小雨同学家属',
        note: '已收到学习用品，感谢大家',
      },
      {
        step: 'published',
        label: '公示反馈',
        description: '善款使用情况公示（脱敏）',
        status: 'current',
        note: '等待季度公示',
      },
    ],
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-03T10:00:00Z',
  },
  {
    id: 'claim_2',
    recipientId: 'rec_3',
    recipientAlias: '小李',
    organizationId: 'org_2',
    organizationName: '壹基金',
    amount: 3200,
    applicantType: 'organization',
    currentStep: 'distributing',
    steps: [
      {
        step: 'applied',
        label: '申请领取',
        description: '公益组织代为申请善款领取',
        status: 'done',
        timestamp: '2024-06-05T11:00:00Z',
        operator: '壹基金',
        note: '代小李申请医疗补助',
      },
      {
        step: 'reviewing',
        label: '资格审核',
        description: '公益组织审核 + 平台复核',
        status: 'done',
        timestamp: '2024-06-05T16:00:00Z',
        operator: '平台审核组',
        note: '病情证明已核实',
      },
      {
        step: 'approved',
        label: '审核通过',
        description: '善款发放审批完成',
        status: 'done',
        timestamp: '2024-06-06T10:00:00Z',
        operator: '平台审核组',
      },
      {
        step: 'distributing',
        label: '善款发放',
        description: '通过公益组织中转发放',
        status: 'current',
        timestamp: '2024-06-06T14:00:00Z',
        operator: '壹基金',
        note: '善款划转处理中',
      },
      {
        step: 'delivered',
        label: '善款送达',
        description: '公益组织将善款送达受助人',
        status: 'pending',
      },
      {
        step: 'confirmed',
        label: '领取确认',
        description: '受助人确认收到善款/物资',
        status: 'pending',
      },
      {
        step: 'published',
        label: '公示反馈',
        description: '善款使用情况公示（脱敏）',
        status: 'pending',
      },
    ],
    createdAt: '2024-06-05T11:00:00Z',
    updatedAt: '2024-06-06T14:00:00Z',
  },
  {
    id: 'claim_3',
    recipientId: 'rec_4',
    recipientAlias: '阿明',
    organizationId: 'org_3',
    organizationName: '中国残疾人福利基金会',
    amount: 1800,
    applicantType: 'organization',
    currentStep: 'confirmed',
    steps: [
      {
        step: 'applied',
        label: '申请领取',
        description: '公益组织代为申请善款领取',
        status: 'done',
        timestamp: '2024-06-08T10:00:00Z',
        operator: '中国残疾人福利基金会',
      },
      {
        step: 'reviewing',
        label: '资格审核',
        description: '公益组织审核 + 平台复核',
        status: 'done',
        timestamp: '2024-06-08T15:00:00Z',
        operator: '平台审核组',
      },
      {
        step: 'approved',
        label: '审核通过',
        description: '善款发放审批完成',
        status: 'done',
        timestamp: '2024-06-09T10:00:00Z',
        operator: '平台审核组',
      },
      {
        step: 'distributing',
        label: '善款发放',
        description: '通过公益组织中转发放',
        status: 'done',
        timestamp: '2024-06-09T14:00:00Z',
        operator: '中国残疾人福利基金会',
      },
      {
        step: 'delivered',
        label: '善款送达',
        description: '公益组织将善款送达受助人',
        status: 'done',
        timestamp: '2024-06-10T09:00:00Z',
        operator: '中国残疾人福利基金会',
        note: '康复训练费用已支付',
      },
      {
        step: 'confirmed',
        label: '领取确认',
        description: '受助人确认收到善款/物资',
        status: 'done',
        timestamp: '2024-06-10T10:00:00Z',
        operator: '阿明',
        note: '已开始康复训练，感谢支持',
      },
      {
        step: 'published',
        label: '公示反馈',
        description: '善款使用情况公示（脱敏）',
        status: 'current',
      },
    ],
    createdAt: '2024-06-08T10:00:00Z',
    updatedAt: '2024-06-10T10:00:00Z',
  },
];

// ============================================
// 查询辅助函数
// ============================================

// 获取所有公益组织
export const getOrganizations = (): CharityOrganization[] => mockOrganizations;

// 根据 ID 获取公益组织
export const getOrganizationById = (id: string): CharityOrganization | undefined =>
  mockOrganizations.find(o => o.id === id);

// 获取所有受助人
export const getRecipients = (): Recipient[] => mockRecipients;

// 根据 ID 获取受助人
export const getRecipientById = (id: string): Recipient | undefined =>
  mockRecipients.find(r => r.id === id);

// 按类型获取受助人
export const getRecipientsByType = (type: RecipientType): Recipient[] =>
  mockRecipients.filter(r => r.type === type && r.status !== 'archived');

// 获取活跃受助人
export const getActiveRecipients = (): Recipient[] =>
  mockRecipients.filter(r => r.status === 'active');

// 获取所有资金流向
export const getFundFlows = (): FundFlow[] => mockFundFlows;

// 获取用户相关的资金流向
export const getFundFlowsByUser = (userId: string): FundFlow[] => {
  const userDonations = mockDonations.filter(d => d.userId === userId);
  const flowIds = userDonations.map(d => d.flowId);
  return mockFundFlows.filter(f => flowIds.includes(f.id));
};

// 获取受助人相关的资金流向
export const getFundFlowsByRecipient = (recipientId: string): FundFlow[] =>
  mockFundFlows.filter(f => f.recipientId === recipientId);

// 获取所有捐赠记录
export const getDonations = (): DonationRecord[] => mockDonations;

// 获取用户捐赠记录
export const getDonationsByUser = (userId: string): DonationRecord[] =>
  mockDonations.filter(d => d.userId === userId);

// 获取所有季度报告
export const getCharityReports = (): CharityQuarterlyReport[] => mockCharityReports;

// 获取所有善行任务
export const getCharityTasks = (): CharityTask[] => mockCharityTasks;

// 按等级获取善行任务
export const getTasksByLevel = (level: TaskLevel): CharityTask[] =>
  mockCharityTasks.filter(t => t.level === level);

// 获取所有领取流程
export const getClaimFlows = (): ClaimFlow[] => mockClaimFlows;

// 根据 ID 获取领取流程
export const getClaimFlowById = (id: string): ClaimFlow | undefined =>
  mockClaimFlows.find(c => c.id === id);

// 获取受助人相关的领取流程
export const getClaimFlowsByRecipient = (recipientId: string): ClaimFlow[] =>
  mockClaimFlows.filter(c => c.recipientId === recipientId);
