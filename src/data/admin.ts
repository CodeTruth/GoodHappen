// ============================================
// Phase 11 管理后台 Mock 数据
// ============================================

// 账号状态
export type AccountStatus = 'active' | 'banned' | 'marked';

// 用户标记类型
export type UserMarkType = 'normal' | 'vip' | 'suspect' | 'verified';

// 管理后台用户信息（扩展自基础 User）
export interface AdminUser {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  blessingValue: number;
  kindnessCount: number;
  witnessCount: number;
  badges: string[];
  circles: string[];
  createdAt: string;
  // 管理后台扩展字段
  accountStatus: AccountStatus;
  markType: UserMarkType;
  violationCount: number;
  lastActiveAt: string;
  region: string;
  phone?: string;
  // 封禁信息
  bannedAt?: string;
  bannedReason?: string;
  bannedDuration?: number; // 天数，0表示永久
}

// 话题状态
export type TopicStatus = 'online' | 'offline';

// 话题信息
export interface AdminTopic {
  id: string;
  name: string;
  description: string;
  kindnessCount: number;
  status: TopicStatus;
  createdAt: string;
  updatedAt: string;
  // 创建者
  creatorId: string;
  creatorName: string;
  // 排序权重
  sortWeight: number;
  // 标签颜色
  color: string;
}

// 审核状态扩展（包含退回状态）
export type AdminReviewStatus = 'pending' | 'reviewing' | 'approved' | 'returned' | 'rejected';

// 审核任务扩展（关联用户信息和善行内容）
export interface AdminReviewTask {
  id: string;
  contentId: string;
  content: string;
  images?: string[];
  tags: string[];
  // 用户信息
  userId: string;
  userName: string;
  userAvatar: string;
  userRegion: string;
  // AI 审核结果
  aiResult: 'needs_modification' | 'rejected';
  aiConfidence: number;
  aiReason?: string;
  // 复审状态
  status: AdminReviewStatus;
  reviewer?: string;
  reviewedAt?: string;
  reviewNote?: string;
  // 退回原因
  returnReason?: string;
  // 时间
  createdAt: string;
  // 善行类型
  kindnessType: 'self' | 'witness';
  blessingValue: number;
}

// 配置分类
export type ConfigCategory = 'fortune' | 'title' | 'ai' | 'moderation' | 'aggregation';

// 配置项类型
export type ConfigValueType = 'number' | 'string' | 'boolean' | 'select';

// 配置项定义
export interface ConfigItem {
  key: string;
  label: string;
  category: ConfigCategory;
  value: number | string | boolean;
  defaultValue: number | string | boolean;
  type: ConfigValueType;
  // 取值范围（数字类型）
  min?: number;
  max?: number;
  // 下拉选项（select 类型）
  options?: string[];
  // 单位
  unit?: string;
  // 描述
  description: string;
}

// 配置修改历史
export interface ConfigHistory {
  id: string;
  key: string;
  label: string;
  oldValue: number | string | boolean;
  newValue: number | string | boolean;
  operator: string;
  operatedAt: string;
  reason?: string;
}

// 时间范围
export type TimeRange = 'today' | 'week' | 'month' | 'quarter';

// 看板指标
export interface DashboardMetric {
  // DAU 日活
  dau: number;
  // MAU 月活
  mau: number;
  // 新增用户
  newUsers: number;
  // 善行发布量
  kindnessCount: number;
  // 挑战参与率（百分比）
  challengeParticipationRate: number;
  // 公益接单完成率（百分比）
  charityCompletionRate: number;
  // 总用户数
  totalUsers: number;
  // 总善行数
  totalKindness: number;
}

// 趋势数据点
export interface TrendPoint {
  label: string;
  value: number;
}

// 看板趋势数据
export interface DashboardTrend {
  // 用户增长趋势
  userGrowth: TrendPoint[];
  // 善行发布趋势
  kindnessTrend: TrendPoint[];
  // 品类分布
  categoryDistribution: TrendPoint[];
}

// ============================================
// Mock 用户数据
// ============================================
export const mockAdminUsers: AdminUser[] = [
  {
    id: 'user1',
    name: '温暖小太阳',
    avatar: 'https://picsum.photos/id/64/200/200',
    bio: '记录生活中的温暖瞬间',
    blessingValue: 156,
    kindnessCount: 12,
    witnessCount: 8,
    badges: ['温暖传播者', '善行新星'],
    circles: ['circle1', 'circle2'],
    createdAt: '2024-01-15T00:00:00Z',
    accountStatus: 'active',
    markType: 'vip',
    violationCount: 0,
    lastActiveAt: '2026-06-22T10:30:00Z',
    region: '北京市朝阳区',
    phone: '138****8888',
  },
  {
    id: 'user2',
    name: '城市观察者',
    avatar: 'https://picsum.photos/id/91/200/200',
    bio: '用心观察城市的温度',
    blessingValue: 289,
    kindnessCount: 24,
    witnessCount: 15,
    badges: ['善行榜样'],
    circles: ['circle2'],
    createdAt: '2024-02-20T00:00:00Z',
    accountStatus: 'active',
    markType: 'verified',
    violationCount: 0,
    lastActiveAt: '2026-06-22T09:15:00Z',
    region: '上海市浦东新区',
  },
  {
    id: 'user3',
    name: '环保小卫士',
    avatar: 'https://picsum.photos/id/177/200/200',
    bio: '爱护环境，从点滴做起',
    blessingValue: 98,
    kindnessCount: 8,
    witnessCount: 3,
    badges: ['环保先锋'],
    circles: ['circle1'],
    createdAt: '2024-03-10T00:00:00Z',
    accountStatus: 'active',
    markType: 'normal',
    violationCount: 0,
    lastActiveAt: '2026-06-22T08:45:00Z',
    region: '广州市天河区',
  },
  {
    id: 'user4',
    name: '暖心传递者',
    avatar: 'https://picsum.photos/id/338/200/200',
    bio: '让善意在职场传递',
    blessingValue: 412,
    kindnessCount: 35,
    witnessCount: 12,
    badges: ['善行榜样', '温暖传播者'],
    circles: ['circle2'],
    createdAt: '2024-01-25T00:00:00Z',
    accountStatus: 'banned',
    markType: 'suspect',
    violationCount: 3,
    lastActiveAt: '2026-06-20T22:30:00Z',
    region: '深圳市南山区',
    bannedAt: '2026-06-21T10:00:00Z',
    bannedReason: '发布虚假善行内容，多次违规',
    bannedDuration: 7,
  },
  {
    id: 'user5',
    name: '善意记录员',
    avatar: 'https://picsum.photos/id/1027/200/200',
    bio: '记录每一个温暖瞬间',
    blessingValue: 67,
    kindnessCount: 6,
    witnessCount: 4,
    badges: [],
    circles: ['circle3'],
    createdAt: '2024-04-05T00:00:00Z',
    accountStatus: 'active',
    markType: 'normal',
    violationCount: 1,
    lastActiveAt: '2026-06-21T20:15:00Z',
    region: '杭州市西湖区',
  },
  {
    id: 'user6',
    name: '日常行善者',
    avatar: 'https://picsum.photos/id/65/200/200',
    bio: '日行一善，持之以恒',
    blessingValue: 523,
    kindnessCount: 42,
    witnessCount: 18,
    badges: ['善行榜样', '日行一善'],
    circles: ['circle1', 'circle3'],
    createdAt: '2024-01-18T00:00:00Z',
    accountStatus: 'active',
    markType: 'vip',
    violationCount: 0,
    lastActiveAt: '2026-06-21T18:00:00Z',
    region: '成都市武侯区',
  },
  {
    id: 'user7',
    name: '城市温暖',
    avatar: 'https://picsum.photos/id/66/200/200',
    bio: '发现城市里的温暖',
    blessingValue: 134,
    kindnessCount: 11,
    witnessCount: 9,
    badges: [],
    circles: ['circle3'],
    createdAt: '2024-03-22T00:00:00Z',
    accountStatus: 'marked',
    markType: 'suspect',
    violationCount: 2,
    lastActiveAt: '2026-06-21T16:30:00Z',
    region: '武汉市江汉区',
  },
  {
    id: 'user8',
    name: '孝心满满',
    avatar: 'https://picsum.photos/id/67/200/200',
    bio: '百善孝为先',
    blessingValue: 345,
    kindnessCount: 28,
    witnessCount: 5,
    badges: ['孝心榜样'],
    circles: ['circle1'],
    createdAt: '2024-02-14T00:00:00Z',
    accountStatus: 'active',
    markType: 'verified',
    violationCount: 0,
    lastActiveAt: '2026-06-21T14:00:00Z',
    region: '南京市鼓楼区',
  },
  {
    id: 'user9',
    name: '善意传播者',
    avatar: 'https://picsum.photos/id/68/200/200',
    bio: '传播每一份善意',
    blessingValue: 78,
    kindnessCount: 7,
    witnessCount: 6,
    badges: [],
    circles: ['circle2'],
    createdAt: '2024-05-01T00:00:00Z',
    accountStatus: 'active',
    markType: 'normal',
    violationCount: 0,
    lastActiveAt: '2026-06-21T12:00:00Z',
    region: '西安市雁塔区',
  },
  {
    id: 'user10',
    name: '温暖日常',
    avatar: 'https://picsum.photos/id/69/200/200',
    bio: '日常小事也有温度',
    blessingValue: 201,
    kindnessCount: 18,
    witnessCount: 7,
    badges: ['温暖传播者'],
    circles: ['circle3'],
    createdAt: '2024-04-18T00:00:00Z',
    accountStatus: 'banned',
    markType: 'suspect',
    violationCount: 5,
    lastActiveAt: '2026-06-18T10:00:00Z',
    region: '重庆市渝中区',
    bannedAt: '2026-06-19T15:00:00Z',
    bannedReason: '恶意刷福气值，发布广告内容',
    bannedDuration: 0,
  },
  {
    id: 'user11',
    name: '阳光少年',
    avatar: 'https://picsum.photos/id/91/200/200',
    bio: '青春有温度',
    blessingValue: 156,
    kindnessCount: 14,
    witnessCount: 3,
    badges: ['善行新星'],
    circles: ['circle1'],
    createdAt: '2024-05-20T00:00:00Z',
    accountStatus: 'active',
    markType: 'normal',
    violationCount: 0,
    lastActiveAt: '2026-06-22T11:00:00Z',
    region: '北京市海淀区',
  },
  {
    id: 'user12',
    name: '邻里守望',
    avatar: 'https://picsum.photos/id/177/200/200',
    bio: '邻里互助，温暖社区',
    blessingValue: 312,
    kindnessCount: 26,
    witnessCount: 11,
    badges: ['社区榜样'],
    circles: ['circle3'],
    createdAt: '2024-02-28T00:00:00Z',
    accountStatus: 'active',
    markType: 'vip',
    violationCount: 0,
    lastActiveAt: '2026-06-22T08:00:00Z',
    region: '成都市锦江区',
  },
];

// ============================================
// Mock 话题数据
// ============================================
export const mockAdminTopics: AdminTopic[] = [
  {
    id: 'topic1',
    name: '日行一善',
    description: '每天记录一件善事，让善意成为习惯',
    kindnessCount: 1280,
    status: 'online',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2026-06-15T10:00:00Z',
    creatorId: 'admin1',
    creatorName: '系统管理员',
    sortWeight: 100,
    color: '#FF6B6B',
  },
  {
    id: 'topic2',
    name: '邻里互助',
    description: '记录社区里的温暖瞬间，邻里守望相助',
    kindnessCount: 856,
    status: 'online',
    createdAt: '2024-02-05T00:00:00Z',
    updatedAt: '2026-06-10T14:00:00Z',
    creatorId: 'admin1',
    creatorName: '系统管理员',
    sortWeight: 90,
    color: '#FFA07A',
  },
  {
    id: 'topic3',
    name: '环保行动',
    description: '从身边小事做起，共同守护地球家园',
    kindnessCount: 642,
    status: 'online',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2026-06-08T09:30:00Z',
    creatorId: 'admin2',
    creatorName: '运营管理员',
    sortWeight: 80,
    color: '#52C41A',
  },
  {
    id: 'topic4',
    name: '孝亲陪伴',
    description: '百善孝为先，记录与父母的温暖时光',
    kindnessCount: 423,
    status: 'online',
    createdAt: '2024-03-15T00:00:00Z',
    updatedAt: '2026-06-05T16:00:00Z',
    creatorId: 'admin1',
    creatorName: '系统管理员',
    sortWeight: 70,
    color: '#FAAD14',
  },
  {
    id: 'topic5',
    name: '志愿服务',
    description: '用专业技能服务社会，传递爱心',
    kindnessCount: 389,
    status: 'offline',
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2026-05-28T11:00:00Z',
    creatorId: 'admin2',
    creatorName: '运营管理员',
    sortWeight: 60,
    color: '#165DFF',
  },
  {
    id: 'topic6',
    name: '关爱弱势',
    description: '关注弱势群体，让爱无障碍传递',
    kindnessCount: 215,
    status: 'offline',
    createdAt: '2024-04-20T00:00:00Z',
    updatedAt: '2026-05-20T13:00:00Z',
    creatorId: 'admin1',
    creatorName: '系统管理员',
    sortWeight: 50,
    color: '#722ED1',
  },
  {
    id: 'topic7',
    name: '职场善意',
    description: '在职场中传递温暖，让工作更有温度',
    kindnessCount: 178,
    status: 'online',
    createdAt: '2024-05-10T00:00:00Z',
    updatedAt: '2026-06-01T15:00:00Z',
    creatorId: 'admin2',
    creatorName: '运营管理员',
    sortWeight: 40,
    color: '#13C2C2',
  },
  {
    id: 'topic8',
    name: '动物保护',
    description: '关爱流浪动物，给它们一个温暖的家',
    kindnessCount: 96,
    status: 'online',
    createdAt: '2024-05-25T00:00:00Z',
    updatedAt: '2026-06-12T10:00:00Z',
    creatorId: 'admin1',
    creatorName: '系统管理员',
    sortWeight: 30,
    color: '#EB2F96',
  },
];

// ============================================
// Mock 审核任务数据
// ============================================
export const mockAdminReviewTasks: AdminReviewTask[] = [
  {
    id: 'mod_1',
    contentId: 'k_1001',
    content: '今天帮楼下独居的张奶奶提了两大袋菜上楼，她一直拉着我的手说谢谢，还非要给我塞两个苹果。其实只是举手之劳，但看到她脸上的笑容，我觉得今天特别有意义。',
    images: ['https://picsum.photos/id/292/300/300'],
    tags: ['助人', '邻里互助'],
    userId: 'user1',
    userName: '温暖小太阳',
    userAvatar: 'https://picsum.photos/id/64/200/200',
    userRegion: '北京市朝阳区',
    aiResult: 'needs_modification',
    aiConfidence: 0.85,
    aiReason: '内容含图片但未标注拍摄时间，建议补充时间信息以提升可信度',
    status: 'pending',
    createdAt: '2026-06-22T10:30:00Z',
    kindnessType: 'self',
    blessingValue: 12,
  },
  {
    id: 'mod_2',
    contentId: 'k_1002',
    content: '地铁上看到一个女孩给孕妇让座，孕妇一直在说谢谢，女孩笑着说"没事，我年轻站得住"。那一刻觉得这个世界真温暖。',
    images: ['https://picsum.photos/id/312/300/300'],
    tags: ['见证', '助人'],
    userId: 'user2',
    userName: '城市观察者',
    userAvatar: 'https://picsum.photos/id/91/200/200',
    userRegion: '上海市浦东新区',
    aiResult: 'needs_modification',
    aiConfidence: 0.72,
    aiReason: '见证类内容，建议补充更多场景细节',
    status: 'pending',
    createdAt: '2026-06-22T09:15:00Z',
    kindnessType: 'witness',
    blessingValue: 0,
  },
  {
    id: 'mod_3',
    contentId: 'k_1003',
    content: '今天在公园散步，看到地上有垃圾，顺手捡起来扔进了垃圾桶。虽然只是小事，但希望每个人都能爱护环境。',
    images: ['https://picsum.photos/id/401/300/300'],
    tags: ['环保', '公益'],
    userId: 'user3',
    userName: '环保小卫士',
    userAvatar: 'https://picsum.photos/id/177/200/200',
    userRegion: '广州市天河区',
    aiResult: 'needs_modification',
    aiConfidence: 0.68,
    aiReason: '内容较短，建议补充更多细节描述',
    status: 'pending',
    createdAt: '2026-06-22T08:45:00Z',
    kindnessType: 'self',
    blessingValue: 8,
  },
  {
    id: 'mod_4',
    contentId: 'k_1004',
    content: '帮同事加班改方案，虽然自己也很累，但看到他如释重负的表情，觉得一切都值得。',
    images: ['https://picsum.photos/id/431/300/300'],
    tags: ['助人', '工作'],
    userId: 'user4',
    userName: '暖心传递者',
    userAvatar: 'https://picsum.photos/id/338/200/200',
    userRegion: '深圳市南山区',
    aiResult: 'rejected',
    aiConfidence: 0.45,
    aiReason: '用户历史违规较多，内容可信度较低，建议人工复核',
    status: 'pending',
    createdAt: '2026-06-21T22:30:00Z',
    kindnessType: 'self',
    blessingValue: 10,
  },
  {
    id: 'mod_5',
    contentId: 'k_1005',
    content: '看到社区志愿者在给老人免费理发，他们用自己的专业技能帮助需要的人，这种善行特别有意义。',
    images: ['https://picsum.photos/id/1080/300/300'],
    tags: ['见证', '公益', '助人'],
    userId: 'user9',
    userName: '善意传播者',
    userAvatar: 'https://picsum.photos/id/68/200/200',
    userRegion: '西安市雁塔区',
    aiResult: 'needs_modification',
    aiConfidence: 0.91,
    aiReason: '内容质量较高，建议通过',
    status: 'reviewing',
    createdAt: '2026-06-21T12:00:00Z',
    reviewer: '管理员小李',
    kindnessType: 'witness',
    blessingValue: 0,
  },
  {
    id: 'mod_6',
    contentId: 'k_1006',
    content: '今天陪妈妈去医院检查，虽然排队很久，但能陪在她身边，我觉得很安心。父母年纪大了，需要我们的陪伴。',
    images: ['https://picsum.photos/id/835/300/300'],
    tags: ['孝亲', '陪伴'],
    userId: 'user8',
    userName: '孝心满满',
    userAvatar: 'https://picsum.photos/id/67/200/200',
    userRegion: '南京市鼓楼区',
    aiResult: 'needs_modification',
    aiConfidence: 0.88,
    aiReason: '内容真实感人，建议通过',
    status: 'approved',
    createdAt: '2026-06-21T14:00:00Z',
    reviewer: '管理员小王',
    reviewedAt: '2026-06-21T15:00:00Z',
    reviewNote: '内容真实，通过审核',
    kindnessType: 'self',
    blessingValue: 15,
  },
  {
    id: 'mod_7',
    contentId: 'k_1007',
    content: '今天给外卖小哥送了一瓶水，他说这是他今天收到的第一份关心。',
    images: ['https://picsum.photos/id/580/300/300'],
    tags: ['助人', '关怀'],
    userId: 'user6',
    userName: '日常行善者',
    userAvatar: 'https://picsum.photos/id/65/200/200',
    userRegion: '成都市武侯区',
    aiResult: 'needs_modification',
    aiConfidence: 0.76,
    aiReason: '内容较短，建议补充更多细节',
    status: 'returned',
    createdAt: '2026-06-21T18:00:00Z',
    reviewer: '管理员小李',
    reviewedAt: '2026-06-21T19:00:00Z',
    reviewNote: '内容过短，建议补充更多细节后重新提交',
    returnReason: '内容描述不够详细，请补充当时的场景和感受',
    kindnessType: 'self',
    blessingValue: 11,
  },
  {
    id: 'mod_8',
    contentId: 'k_1008',
    content: '今天做了件大好事，帮了很多人，获得了无数赞美。',
    tags: ['助人'],
    userId: 'user4',
    userName: '暖心传递者',
    userAvatar: 'https://picsum.photos/id/338/200/200',
    userRegion: '深圳市南山区',
    aiResult: 'rejected',
    aiConfidence: 0.32,
    aiReason: '内容空泛无细节，疑似刷福气值，建议拒绝',
    status: 'rejected',
    createdAt: '2026-06-20T16:00:00Z',
    reviewer: '管理员小王',
    reviewedAt: '2026-06-20T17:00:00Z',
    reviewNote: '内容无实际细节，拒绝通过',
    kindnessType: 'self',
    blessingValue: 0,
  },
  {
    id: 'mod_9',
    contentId: 'k_1009',
    content: '看到路边有个小朋友在帮妈妈推婴儿车，虽然只是个小动作，但那个画面特别温馨。',
    images: ['https://picsum.photos/id/570/300/300'],
    tags: ['见证', '亲子'],
    userId: 'user5',
    userName: '善意记录员',
    userAvatar: 'https://picsum.photos/id/1027/200/200',
    userRegion: '杭州市西湖区',
    aiResult: 'needs_modification',
    aiConfidence: 0.82,
    aiReason: '内容温馨，建议通过',
    status: 'pending',
    createdAt: '2026-06-21T20:15:00Z',
    kindnessType: 'witness',
    blessingValue: 0,
  },
  {
    id: 'mod_10',
    contentId: 'k_1010',
    content: '今天帮邻居照看了一会儿孩子，她去办事的时候孩子没人带。虽然有点手忙脚乱，但看到孩子天真的笑容，一切都值得。',
    images: ['https://picsum.photos/id/326/300/300'],
    tags: ['助人', '邻里互助'],
    userId: 'user10',
    userName: '温暖日常',
    userAvatar: 'https://picsum.photos/id/69/200/200',
    userRegion: '重庆市渝中区',
    aiResult: 'rejected',
    aiConfidence: 0.28,
    aiReason: '用户已被封禁，内容疑似违规',
    status: 'pending',
    createdAt: '2026-06-18T10:00:00Z',
    kindnessType: 'self',
    blessingValue: 13,
  },
];

// ============================================
// Mock 配置项默认值
// ============================================
export const mockConfigItems: ConfigItem[] = [
  // 福气系统
  {
    key: 'fortune.daily_max_count',
    label: '每日善行上限次数',
    category: 'fortune',
    value: 5,
    defaultValue: 5,
    type: 'number',
    min: 1,
    max: 20,
    unit: '次',
    description: '用户每天最多可记录的善行次数',
  },
  {
    key: 'fortune.daily_max_value',
    label: '每日福气上限',
    category: 'fortune',
    value: 60,
    defaultValue: 60,
    type: 'number',
    min: 10,
    max: 200,
    unit: '福气',
    description: '用户每天最多可获得的福气值',
  },
  {
    key: 'fortune.single_max_value',
    label: '单条善行福气上限',
    category: 'fortune',
    value: 30,
    defaultValue: 30,
    type: 'number',
    min: 5,
    max: 100,
    unit: '福气',
    description: '单条善行最多可获得的福气值',
  },
  {
    key: 'fortune.like_bonus_threshold',
    label: '点赞加成阈值',
    category: 'fortune',
    value: 3,
    defaultValue: 3,
    type: 'number',
    min: 1,
    max: 20,
    unit: '个赞',
    description: '每获得N个点赞可加1点福气',
  },
  {
    key: 'fortune.like_bonus_max',
    label: '点赞加成上限',
    category: 'fortune',
    value: 5,
    defaultValue: 5,
    type: 'number',
    min: 0,
    max: 20,
    unit: '福气',
    description: '点赞加成福气值的上限',
  },
  // 称号体系
  {
    key: 'title.level1_min',
    label: '微光称号门槛',
    category: 'title',
    value: 200,
    defaultValue: 200,
    type: 'number',
    min: 50,
    max: 500,
    unit: '福气',
    description: '达到此福气值可解锁"微光"称号',
  },
  {
    key: 'title.level3_min',
    label: '暖阳称号门槛',
    category: 'title',
    value: 1000,
    defaultValue: 1000,
    type: 'number',
    min: 500,
    max: 3000,
    unit: '福气',
    description: '达到此福气值可解锁"暖阳"称号',
  },
  {
    key: 'title.level5_min',
    label: '善行榜样称号门槛',
    category: 'title',
    value: 5000,
    defaultValue: 5000,
    type: 'number',
    min: 2000,
    max: 10000,
    unit: '福气',
    description: '达到此福气值可解锁"善行榜样"称号',
  },
  {
    key: 'title.level8_min',
    label: '皓月称号门槛',
    category: 'title',
    value: 50000,
    defaultValue: 50000,
    type: 'number',
    min: 20000,
    max: 100000,
    unit: '福气',
    description: '达到此福气值可解锁"皓月"称号',
  },
  // AI 参数
  {
    key: 'ai.confidence_threshold',
    label: 'AI置信度阈值',
    category: 'ai',
    value: 0.7,
    defaultValue: 0.7,
    type: 'number',
    min: 0.3,
    max: 0.95,
    description: 'AI审核置信度低于此值将进入人工复审',
  },
  {
    key: 'ai.auto_approve_enabled',
    label: '自动通过开关',
    category: 'ai',
    value: false,
    defaultValue: false,
    type: 'boolean',
    description: '开启后高置信度内容将自动通过',
  },
  {
    key: 'ai.auto_approve_threshold',
    label: '自动通过阈值',
    category: 'ai',
    value: 0.9,
    defaultValue: 0.9,
    type: 'number',
    min: 0.8,
    max: 0.99,
    description: '高于此置信度的内容自动通过',
  },
  {
    key: 'ai.persona_default',
    label: '默认AI人格',
    category: 'ai',
    value: 'sudongpo',
    defaultValue: 'sudongpo',
    type: 'select',
    options: ['sudongpo', 'confucius', 'libai', 'dufu', 'zhuangzi', 'liqingzhao', 'taoyuanming', 'wangwei'],
    description: '新用户默认匹配的AI人格',
  },
  // 审核参数
  {
    key: 'moderation.queue_max_size',
    label: '审核队列上限',
    category: 'moderation',
    value: 200,
    defaultValue: 200,
    type: 'number',
    min: 50,
    max: 1000,
    unit: '条',
    description: '审核队列最多保留的任务数量',
  },
  {
    key: 'moderation.review_timeout',
    label: '审核超时时间',
    category: 'moderation',
    value: 48,
    defaultValue: 48,
    type: 'number',
    min: 1,
    max: 168,
    unit: '小时',
    description: '审核任务超时自动升级的时间',
  },
  {
    key: 'moderation.auto_return_days',
    label: '退回重提期限',
    category: 'moderation',
    value: 3,
    defaultValue: 3,
    type: 'number',
    min: 1,
    max: 14,
    unit: '天',
    description: '退回的内容需在N天内重新提交',
  },
  // 聚合统计
  {
    key: 'aggregation.min_sample_size',
    label: '聚合最小样本量',
    category: 'aggregation',
    value: 5,
    defaultValue: 5,
    type: 'number',
    min: 3,
    max: 50,
    unit: '人',
    description: '聚合统计显示的最小样本量，低于此值不显示',
  },
  {
    key: 'aggregation.update_interval',
    label: '聚合更新间隔',
    category: 'aggregation',
    value: 24,
    defaultValue: 24,
    type: 'number',
    min: 1,
    max: 72,
    unit: '小时',
    description: '聚合统计数据更新间隔',
  },
  {
    key: 'aggregation.heatmap_max_level',
    label: '热力图最大等级',
    category: 'aggregation',
    value: 4,
    defaultValue: 4,
    type: 'number',
    min: 3,
    max: 6,
    description: '热力图颜色深度的最大等级',
  },
];

// ============================================
// Mock 配置修改历史
// ============================================
export const mockConfigHistory: ConfigHistory[] = [
  {
    id: 'hist_1',
    key: 'fortune.daily_max_count',
    label: '每日善行上限次数',
    oldValue: 3,
    newValue: 5,
    operator: '系统管理员',
    operatedAt: '2026-06-15T10:00:00Z',
    reason: '用户反馈每日3次太少，调整为5次',
  },
  {
    id: 'hist_2',
    key: 'ai.confidence_threshold',
    label: 'AI置信度阈值',
    oldValue: 0.6,
    newValue: 0.7,
    operator: '管理员小李',
    operatedAt: '2026-06-12T14:30:00Z',
    reason: '提高阈值以减少误判',
  },
  {
    id: 'hist_3',
    key: 'fortune.single_max_value',
    label: '单条善行福气上限',
    oldValue: 20,
    newValue: 30,
    operator: '系统管理员',
    operatedAt: '2026-06-10T09:15:00Z',
    reason: '鼓励用户发布更优质内容',
  },
  {
    id: 'hist_4',
    key: 'moderation.review_timeout',
    label: '审核超时时间',
    oldValue: 24,
    newValue: 48,
    operator: '管理员小王',
    operatedAt: '2026-06-05T16:00:00Z',
    reason: '审核压力较大，延长超时时间',
  },
  {
    id: 'hist_5',
    key: 'title.level5_min',
    label: '善行榜样称号门槛',
    oldValue: 3000,
    newValue: 5000,
    operator: '系统管理员',
    operatedAt: '2026-06-01T11:00:00Z',
    reason: '提升称号含金量',
  },
];

// ============================================
// Mock 看板数据
// ============================================
const generateDashboardData = (range: TimeRange): DashboardMetric => {
  const baseMap: Record<TimeRange, Partial<DashboardMetric>> = {
    today: { dau: 1256, newUsers: 89, kindnessCount: 342 },
    week: { dau: 8542, newUsers: 567, kindnessCount: 2156 },
    month: { dau: 23456, newUsers: 2340, kindnessCount: 8765 },
    quarter: { dau: 56789, newUsers: 7890, kindnessCount: 23456 },
  };
  const base = baseMap[range];
  return {
    ...base,
    mau: 45678,
    challengeParticipationRate: range === 'today' ? 68 : range === 'week' ? 72 : range === 'month' ? 75 : 78,
    charityCompletionRate: range === 'today' ? 82 : range === 'week' ? 85 : range === 'month' ? 87 : 89,
    totalUsers: 56789,
    totalKindness: 234567,
  } as DashboardMetric;
};

const generateTrendData = (range: TimeRange): DashboardTrend => {
  const pointCount = range === 'today' ? 12 : range === 'week' ? 7 : range === 'month' ? 30 : 12;
  const userGrowth: TrendPoint[] = [];
  const kindnessTrend: TrendPoint[] = [];

  for (let i = 0; i < pointCount; i++) {
    if (range === 'today') {
      userGrowth.push({ label: `${i * 2}:00`, value: Math.floor(50 + Math.random() * 200) });
      kindnessTrend.push({ label: `${i * 2}:00`, value: Math.floor(10 + Math.random() * 50) });
    } else if (range === 'week') {
      const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      userGrowth.push({ label: days[i], value: Math.floor(800 + Math.random() * 500) });
      kindnessTrend.push({ label: days[i], value: Math.floor(200 + Math.random() * 150) });
    } else if (range === 'month') {
      userGrowth.push({ label: `${i + 1}日`, value: Math.floor(500 + Math.random() * 800) });
      kindnessTrend.push({ label: `${i + 1}日`, value: Math.floor(150 + Math.random() * 300) });
    } else {
      userGrowth.push({ label: `第${i + 1}周`, value: Math.floor(3000 + Math.random() * 2000) });
      kindnessTrend.push({ label: `第${i + 1}周`, value: Math.floor(800 + Math.random() * 600) });
    }
  }

  return {
    userGrowth,
    kindnessTrend,
    categoryDistribution: [
      { label: '助人', value: 4523 },
      { label: '环保', value: 2156 },
      { label: '公益', value: 1876 },
      { label: '孝亲', value: 1542 },
      { label: '邻里互助', value: 1289 },
      { label: '见证', value: 987 },
    ],
  };
};

export const mockDashboardData: Record<TimeRange, DashboardMetric> = {
  today: generateDashboardData('today'),
  week: generateDashboardData('week'),
  month: generateDashboardData('month'),
  quarter: generateDashboardData('quarter'),
};

export const mockDashboardTrend: Record<TimeRange, DashboardTrend> = {
  today: generateTrendData('today'),
  week: generateTrendData('week'),
  month: generateTrendData('month'),
  quarter: generateTrendData('quarter'),
};

// 违规记录
export interface ViolationRecord {
  id: string;
  userId: string;
  userName: string;
  type: 'spam' | 'fake' | 'abuse' | 'ad' | 'other';
  description: string;
  penalty: 'warning' | 'deduct' | 'ban_3d' | 'ban_7d' | 'ban_permanent';
  createdAt: string;
  operator: string;
}

export const mockViolationRecords: ViolationRecord[] = [
  {
    id: 'v_1',
    userId: 'user4',
    userName: '暖心传递者',
    type: 'fake',
    description: '发布虚假善行内容，图片与描述不符',
    penalty: 'ban_7d',
    createdAt: '2026-06-21T10:00:00Z',
    operator: '管理员小王',
  },
  {
    id: 'v_2',
    userId: 'user4',
    userName: '暖心传递者',
    type: 'spam',
    description: '短时间内重复发布无意义内容',
    penalty: 'warning',
    createdAt: '2026-06-18T15:00:00Z',
    operator: '管理员小李',
  },
  {
    id: 'v_3',
    userId: 'user10',
    userName: '温暖日常',
    type: 'ad',
    description: '发布广告内容，恶意刷福气值',
    penalty: 'ban_permanent',
    createdAt: '2026-06-19T15:00:00Z',
    operator: '管理员小王',
  },
  {
    id: 'v_4',
    userId: 'user7',
    userName: '城市温暖',
    type: 'fake',
    description: '使用网络图片冒充自己的善行',
    penalty: 'deduct',
    createdAt: '2026-06-15T11:00:00Z',
    operator: '管理员小李',
  },
  {
    id: 'v_5',
    userId: 'user5',
    userName: '善意记录员',
    type: 'spam',
    description: '发布内容过短，疑似刷量',
    penalty: 'warning',
    createdAt: '2026-06-10T14:00:00Z',
    operator: '系统',
  },
];

// 福气流水（用户详情用）
export interface FortuneFlow {
  id: string;
  userId: string;
  type: 'earn' | 'spend' | 'transfer' | 'award' | 'penalty';
  amount: number;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

export const mockFortuneFlows: FortuneFlow[] = [
  { id: 'f_1', userId: 'user1', type: 'earn', amount: 12, description: '记录善行·帮邻居提菜', balanceAfter: 156, createdAt: '2026-06-22T10:30:00Z' },
  { id: 'f_2', userId: 'user1', type: 'award', amount: 5, description: '获得点赞加成', balanceAfter: 144, createdAt: '2026-06-21T18:00:00Z' },
  { id: 'f_3', userId: 'user1', type: 'earn', amount: 10, description: '记录善行·给外卖小哥送水', balanceAfter: 139, createdAt: '2026-06-21T15:00:00Z' },
  { id: 'f_4', userId: 'user1', type: 'spend', amount: -20, description: '兑换温暖好物·环保袋', balanceAfter: 129, createdAt: '2026-06-20T12:00:00Z' },
  { id: 'f_5', userId: 'user1', type: 'earn', amount: 15, description: '记录善行·陪妈妈去医院', balanceAfter: 149, createdAt: '2026-06-19T14:00:00Z' },
];
