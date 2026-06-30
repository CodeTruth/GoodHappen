// 善行圈类型配置系统
// 所有圈子共享任务+看板+档案能力，根据类型切换文案和类别

export type CircleType = 'class' | 'company' | 'community' | 'friends' | 'public';

// 任务类别配置（每种类型的任务类别不同）
export interface TaskCategoryConfig {
  key: string;
  name: string;
  icon: string;
  color: string;
}

interface CircleTypeConfig {
  // 称谓系统
  labels: {
    admin: string;           // 管理员称谓：老师/负责人/群主/社长
    member: string;          // 成员称谓：学生/员工/居民/朋友
    task: string;            // 任务称谓：德育任务/CSR任务/社区活动/互助任务
    taskShort: string;       // 简称：任务/活动
    dashboard: string;       // 看板称谓：德育看板/CSR看板/社区看板
    profile: string;         // 档案称谓：德育档案/CSR档案/公益档案
    ranking: string;         // 排行称谓：完成度/参与度/活跃度
    example: string;         // 榜样称谓：榜样/标兵/之星
    submit: string;          // 提交称谓：提交善行/参与活动/响应号召
  };
  // 任务类别
  categories: TaskCategoryConfig[];
  // 是否显示视频要求开关
  showVideoOption: boolean;
  // 是否要求实名
  requireRealNameDefault: boolean;
  // 圈子描述模板
  descriptionTemplate: string;
}

export const CIRCLE_TYPE_CONFIG: Record<CircleType, CircleTypeConfig> = {
  class: {
    labels: {
      admin: '老师',
      member: '学生',
      task: '德育任务',
      taskShort: '任务',
      dashboard: '德育看板',
      profile: '德育档案',
      ranking: '完成度',
      example: '榜样',
      submit: '提交善行',
    },
    categories: [
      { key: 'housework', name: '家务劳动', icon: '🏠', color: '#FF6B6B' },
      { key: 'help_others', name: '助人为乐', icon: '🤝', color: '#52C41A' },
      { key: 'environmental', name: '环保行动', icon: '🌿', color: '#13C2C2' },
      { key: 'respect_elders', name: '尊老爱幼', icon: '👴', color: '#FAAD14' },
      { key: 'reading', name: '阅读学习', icon: '📚', color: '#722ED1' },
      { key: 'custom', name: '自定义', icon: '✨', color: '#C4956A' },
    ],
    showVideoOption: true,
    requireRealNameDefault: true,
    descriptionTemplate: '记录班级里的每一个温暖瞬间',
  },
  company: {
    labels: {
      admin: '负责人',
      member: '员工',
      task: 'CSR任务',
      taskShort: '任务',
      dashboard: 'CSR看板',
      profile: 'CSR档案',
      ranking: '参与度',
      example: '标兵',
      submit: '参与活动',
    },
    categories: [
      { key: 'charity', name: '公益慈善', icon: '❤️', color: '#FF6B6B' },
      { key: 'environmental', name: '绿色环保', icon: '🌿', color: '#52C41A' },
      { key: 'volunteer', name: '志愿服务', icon: '🤝', color: '#13C2C2' },
      { key: 'innovation', name: '创新贡献', icon: '💡', color: '#FAAD14' },
      { key: 'team', name: '团队协作', icon: '👥', color: '#722ED1' },
      { key: 'custom', name: '自定义', icon: '✨', color: '#C4956A' },
    ],
    showVideoOption: false,
    requireRealNameDefault: true,
    descriptionTemplate: '企业向善，记录每一份社会责任',
  },
  community: {
    labels: {
      admin: '社长',
      member: '居民',
      task: '社区活动',
      taskShort: '活动',
      dashboard: '社区看板',
      profile: '公益档案',
      ranking: '活跃度',
      example: '之星',
      submit: '响应号召',
    },
    categories: [
      { key: 'environmental', name: '环保行动', icon: '🌿', color: '#52C41A' },
      { key: 'elderly', name: '敬老助老', icon: '👴', color: '#FAAD14' },
      { key: 'neighbor', name: '邻里互助', icon: '🤝', color: '#13C2C2' },
      { key: 'culture', name: '文化传承', icon: '📖', color: '#722ED1' },
      { key: 'safety', name: '安全守护', icon: '🛡️', color: '#FF6B6B' },
      { key: 'custom', name: '自定义', icon: '✨', color: '#C4956A' },
    ],
    showVideoOption: false,
    requireRealNameDefault: false,
    descriptionTemplate: '邻里守望，共建温暖社区',
  },
  friends: {
    labels: {
      admin: '群主',
      member: '朋友',
      task: '互助任务',
      taskShort: '互助',
      dashboard: '互助看板',
      profile: '温暖档案',
      ranking: '活跃度',
      example: '暖心之星',
      submit: '记录温暖',
    },
    categories: [
      { key: 'help', name: '及时帮助', icon: '🆘', color: '#FF6B6B' },
      { key: 'accompany', name: '陪伴支持', icon: '💕', color: '#FAAD14' },
      { key: 'share', name: '好物分享', icon: '🎁', color: '#52C41A' },
      { key: 'encourage', name: '鼓励打气', icon: '💪', color: '#13C2C2' },
      { key: 'memory', name: '美好回忆', icon: '📸', color: '#722ED1' },
      { key: 'custom', name: '自定义', icon: '✨', color: '#C4956A' },
    ],
    showVideoOption: false,
    requireRealNameDefault: false,
    descriptionTemplate: '朋友之间，记录每一份温暖',
  },
  public: {
    labels: {
      admin: '管理员',
      member: '成员',
      task: '公益任务',
      taskShort: '任务',
      dashboard: '公益看板',
      profile: '公益档案',
      ranking: '参与度',
      example: '公益之星',
      submit: '参与善行',
    },
    categories: [
      { key: 'charity', name: '慈善公益', icon: '❤️', color: '#FF6B6B' },
      { key: 'environmental', name: '环境保护', icon: '🌿', color: '#52C41A' },
      { key: 'education', name: '教育助学', icon: '📚', color: '#722ED1' },
      { key: 'health', name: '健康关爱', icon: '🏥', color: '#13C2C2' },
      { key: 'culture', name: '文化传承', icon: '🏛️', color: '#FAAD14' },
      { key: 'custom', name: '自定义', icon: '✨', color: '#C4956A' },
    ],
    showVideoOption: false,
    requireRealNameDefault: false,
    descriptionTemplate: '汇聚每一份善意，让世界更美好',
  },
};

// 根据圈子类型获取配置
export const getCircleTypeConfig = (type: CircleType) => CIRCLE_TYPE_CONFIG[type] || CIRCLE_TYPE_CONFIG.public;

// 统一称谓转换：把德育相关的文案替换为对应类型的文案
export const adaptLabel = (type: CircleType, text: string): string => {
  const config = getCircleTypeConfig(type);
  const labels = config.labels;

  // 按长度降序匹配，避免短词先替换导致长词无法匹配
  const replacements = Object.entries(labels).sort((a, b) => b[1].length - a[1].length);

  let result = text;
  replacements.forEach(([key, value]) => {
    // 替换常见的德育专属文案为通用文案
    const patterns: Record<string, string[]> = {
      admin: ['老师'],
      member: ['学生'],
      task: ['德育任务'],
      taskShort: ['任务'],
      dashboard: ['德育看板'],
      profile: ['德育档案', '档案'],
      ranking: ['完成度'],
      example: ['榜样'],
      submit: ['提交善行', '记录善行'],
    };

    const keys = patterns[key] || [value];
    keys.forEach((pattern) => {
      result = result.replace(new RegExp(pattern, 'g'), value);
    });
  });

  return result;
};
