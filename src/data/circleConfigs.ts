// ============================================
// N5 通用配置：团体类型默认配置
// ============================================
// 每种团体类型的差异仅在于默认配置
// 配置项：品类、管理员称谓、汇总周期、关注天数、加入方式、实名要求、CSR接入

import { CheckinCategory } from '@/store/checkin';

// 团体类型（扩展支持公共团体）
export type CircleType = 'class' | 'company' | 'community' | 'charity' | 'public';

// 加入方式
export type JoinType = 'classCode' | 'invite' | 'free' | 'apply';

// 汇总周期
export type SummaryCycle = 'semester' | 'quarterly' | 'annual' | 'monthly' | 'project';

// 品类配置：使用少年三品类 or 自定义
export type CategoryMode = 'teen' | 'custom';

// 团体默认配置
export interface CircleTypeConfig {
  // 团体类型
  type: CircleType;
  // 类型中文名
  typeName: string;
  // 类型图标
  icon: string;
  // 类型描述
  description: string;

  // 品类模式：少年三品类 or 自定义
  categoryMode: CategoryMode;
  // 默认品类（categoryMode 为 teen 时使用少年三品类）
  defaultCategories?: CheckinCategory[];
  // 自定义品类名称（categoryMode 为 custom 时使用）
  customCategories?: string[];

  // 管理员称谓
  adminTitle: string;
  // 组长称谓
  leaderTitle: string;

  // 汇总周期
  summaryCycle: SummaryCycle;
  // 汇总周期中文名
  summaryCycleName: string;

  // 需关注天数（连续N天未打卡需关注）
  attentionDays: number;

  // 加入方式
  joinType: JoinType;
  // 加入方式中文名
  joinTypeName: string;

  // 是否需要实名
  requireRealName: boolean;

  // 是否接入 CSR（企业社会责任）
  enableCSR: boolean;

  // 默认可见范围（新成员默认）
  defaultVisibility: 'private' | 'circle' | 'public';

  // 是否允许解散
  allowDissolve: boolean;

  // 最大成员数（0 表示不限）
  maxMembers: number;
}

// ============================================
// 四种团体类型的默认配置
// ============================================

export const CIRCLE_TYPE_CONFIGS: Record<CircleType, CircleTypeConfig> = {
  // 学校班级：少年三品类、老师、学期、7天、班级码、需实名
  class: {
    type: 'class',
    typeName: '学校班级',
    icon: '🏫',
    description: '面向学校班级的善行圈，记录学生成长',
    categoryMode: 'teen',
    defaultCategories: ['warm', 'growth', 'positive'],
    adminTitle: '老师',
    leaderTitle: '小组长',
    summaryCycle: 'semester',
    summaryCycleName: '学期',
    attentionDays: 7,
    joinType: 'classCode',
    joinTypeName: '班级码验证',
    requireRealName: true,
    enableCSR: false,
    defaultVisibility: 'circle',
    allowDissolve: true,
    maxMembers: 100,
  },

  // 企业部门：自定义、部门主管、季度/年度、14天、管理员邀请、需实名、接入CSR
  company: {
    type: 'company',
    typeName: '企业部门',
    icon: '🏢',
    description: '面向企业部门的善行圈，融入企业社会责任',
    categoryMode: 'custom',
    customCategories: ['志愿服务', '公益捐赠', '环保行动', '关爱同事', '专业技能'],
    adminTitle: '部门主管',
    leaderTitle: '团队负责人',
    summaryCycle: 'quarterly',
    summaryCycleName: '季度/年度',
    attentionDays: 14,
    joinType: 'invite',
    joinTypeName: '管理员邀请',
    requireRealName: true,
    enableCSR: true,
    defaultVisibility: 'circle',
    allowDissolve: true,
    maxMembers: 500,
  },

  // 社区：自定义、社区工作者、月度、30天、自由加入、不需实名
  community: {
    type: 'community',
    typeName: '社区',
    icon: '🏘️',
    description: '面向社区的善行圈，邻里互助温暖社区',
    categoryMode: 'custom',
    customCategories: ['邻里互助', '环境维护', '关爱老人', '社区活动', '志愿服务'],
    adminTitle: '社区工作者',
    leaderTitle: '楼栋长',
    summaryCycle: 'monthly',
    summaryCycleName: '月度',
    attentionDays: 30,
    joinType: 'free',
    joinTypeName: '自由加入',
    requireRealName: false,
    enableCSR: false,
    defaultVisibility: 'circle',
    allowDissolve: true,
    maxMembers: 1000,
  },

  // 公益组织：自定义、组织负责人、项目周期、自定义、申请审核、需实名、接入CSR
  charity: {
    type: 'charity',
    typeName: '公益组织',
    icon: '🤝',
    description: '面向公益组织的善行圈，记录公益项目',
    categoryMode: 'custom',
    customCategories: ['项目执行', '志愿服务', '公益捐赠', '环保行动', '关爱弱势'],
    adminTitle: '组织负责人',
    leaderTitle: '项目负责人',
    summaryCycle: 'project',
    summaryCycleName: '项目周期',
    attentionDays: 14, // 自定义
    joinType: 'apply',
    joinTypeName: '申请审核',
    requireRealName: true,
    enableCSR: true,
    defaultVisibility: 'public',
    allowDissolve: false, // 公益组织不可随意解散
    maxMembers: 2000,
  },

  // 公共团体（只读）
  public: {
    type: 'public',
    typeName: '公共团体',
    icon: '🌍',
    description: '全社会善行的公共展示空间（只读）',
    categoryMode: 'teen',
    defaultCategories: ['warm', 'growth', 'positive'],
    adminTitle: '系统',
    leaderTitle: '系统',
    summaryCycle: 'annual',
    summaryCycleName: '年度',
    attentionDays: 0,
    joinType: 'free',
    joinTypeName: '公开',
    requireRealName: false,
    enableCSR: false,
    defaultVisibility: 'public',
    allowDissolve: false,
    maxMembers: 0,
  },
};

// 获取团体类型配置
export const getCircleTypeConfig = (type: CircleType): CircleTypeConfig => {
  return CIRCLE_TYPE_CONFIGS[type] || CIRCLE_TYPE_CONFIGS.class;
};

// 获取所有团体类型配置列表
export const getCircleTypeList = (): CircleTypeConfig[] => {
  return Object.values(CIRCLE_TYPE_CONFIGS).filter(c => c.type !== 'public');
};

// 获取加入方式中文名
export const getJoinTypeName = (joinType: JoinType): string => {
  const names: Record<JoinType, string> = {
    classCode: '班级码验证',
    invite: '管理员邀请',
    free: '自由加入',
    apply: '申请审核',
  };
  return names[joinType] || '未知';
};

// 获取汇总周期中文名
export const getSummaryCycleName = (cycle: SummaryCycle): string => {
  const names: Record<SummaryCycle, string> = {
    semester: '学期',
    quarterly: '季度',
    annual: '年度',
    monthly: '月度',
    project: '项目周期',
  };
  return names[cycle] || '未知';
};
