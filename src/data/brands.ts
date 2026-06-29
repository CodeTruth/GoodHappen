// 品牌赞助体系类型定义

// 品牌赞助位置（七位置全地图）
export type BrandSlotId =
  | 'kindness_square'    // 善行广场
  | 'warmth_shop'        // 温暖商城
  | 'quarterly_release'  // 季度温暖发布
  | 'fund_disclosure'    // 温暖基金公示页
  | 'annual_ceremony'    // 年度温暖盛典
  | 'warmth_yearbook'    // 温暖年鉴
  | 'csr_report';        // 企业CSR数据报告

// 赞助位置频率
export type SlotFrequency = 'weekly' | 'quarterly' | 'yearly' | 'regular';

// 品牌赞助位置
export interface BrandSlot {
  id: BrandSlotId;
  name: string;
  description: string;
  frequency: SlotFrequency;
  frequencyLabel: string;
  icon: string;
}

// 品牌信息
export interface Brand {
  id: string;
  name: string;
  logo: string;
  description: string;
  // 品牌致敬的善行领域
  focusArea: string;
  // 赞助位置
  slots: BrandSlotId[];
  // 累计赞助金额
  totalSponsorship: number;
  // 合作开始时间
  partnerSince: string;
  // 品牌CSR链接（Mock）
  csrLink?: string;
}

// 五个核心表达原则
export const brandPrinciples: { title: string; description: string; icon: string }[] = [
  {
    title: '品牌是客人不是主人',
    description: '社区永远是主角，品牌以客人身份致敬温暖',
    icon: '🏠',
  },
  {
    title: '品牌在致敬不在促销',
    description: '所有露出都是对善行的致敬，绝非商业促销',
    icon: '🙏',
  },
  {
    title: '品牌在帮社区做事',
    description: '品牌赞助用于温暖基金，让善意落到实处',
    icon: '🤝',
  },
  {
    title: '数量频率受控',
    description: '严格限制品牌露出位置与频次，避免打扰用户',
    icon: '📏',
  },
  {
    title: '所有品牌收入公开',
    description: '品牌赞助金额与去向在温暖基金公示页公开',
    icon: '📊',
  },
];

// 七位置全地图
export const brandSlots: BrandSlot[] = [
  {
    id: 'kindness_square',
    name: '善行广场',
    description: '温暖伙伴卡片展示，每周轮换',
    frequency: 'weekly',
    frequencyLabel: '每周',
    icon: '🏛️',
  },
  {
    id: 'warmth_shop',
    name: '温暖商城',
    description: '品牌权益兑换区，每周更新',
    frequency: 'weekly',
    frequencyLabel: '每周',
    icon: '🛍️',
  },
  {
    id: 'quarterly_release',
    name: '季度温暖发布',
    description: '季度温暖故事发布时品牌致敬',
    frequency: 'quarterly',
    frequencyLabel: '每季',
    icon: '📅',
  },
  {
    id: 'fund_disclosure',
    name: '温暖基金公示页',
    description: '品牌赞助金额与分配去向公示',
    frequency: 'quarterly',
    frequencyLabel: '每季',
    icon: '💰',
  },
  {
    id: 'annual_ceremony',
    name: '年度温暖盛典',
    description: '年度温暖盛典品牌致敬时刻',
    frequency: 'yearly',
    frequencyLabel: '每年',
    icon: '🏆',
  },
  {
    id: 'warmth_yearbook',
    name: '温暖年鉴',
    description: '年度温暖年鉴品牌联名页',
    frequency: 'yearly',
    frequencyLabel: '每年',
    icon: '📖',
  },
  {
    id: 'csr_report',
    name: '企业CSR数据报告',
    description: '品牌 CSR 数据定期同步展示',
    frequency: 'regular',
    frequencyLabel: '定期',
    icon: '📈',
  },
];

// Mock 品牌数据
export const mockBrands: Brand[] = [
  {
    id: 'brand_starbucks',
    name: '星巴克',
    logo: 'https://picsum.photos/id/1069/200/200',
    description: '星巴克致敬每一位传递温暖的邻里伙伴，用一杯拿铁的温度，致敬善行的力量',
    focusArea: '邻里互助 · 城市温暖',
    slots: ['kindness_square', 'warmth_shop', 'quarterly_release', 'fund_disclosure', 'annual_ceremony'],
    totalSponsorship: 42000,
    partnerSince: '2024-01-15',
    csrLink: 'https://example.com/starbucks-csr',
  },
  {
    id: 'brand_naixue',
    name: '奈雪的茶',
    logo: 'https://picsum.photos/id/1079/200/200',
    description: '奈雪的茶致敬每一份温暖的陪伴，用一杯果茶的清甜，致敬善意的传递',
    focusArea: '陪伴关怀 · 温暖瞬间',
    slots: ['kindness_square', 'warmth_shop', 'quarterly_release', 'fund_disclosure'],
    totalSponsorship: 28000,
    partnerSince: '2024-02-10',
    csrLink: 'https://example.com/naixue-csr',
  },
  {
    id: 'brand_patagonia',
    name: 'Patagonia',
    logo: 'https://picsum.photos/id/1084/200/200',
    description: 'Patagonia 致敬每一位守护地球的善行者，用环保行动致敬自然的守护者',
    focusArea: '环保公益 · 地球守护',
    slots: ['kindness_square', 'warmth_shop', 'fund_disclosure', 'annual_ceremony', 'warmth_yearbook', 'csr_report'],
    totalSponsorship: 36000,
    partnerSince: '2024-04-22',
    csrLink: 'https://example.com/patagonia-csr',
  },
  {
    id: 'brand_luckin',
    name: '瑞幸咖啡',
    logo: 'https://picsum.photos/id/1080/200/200',
    description: '瑞幸咖啡致敬每一位城市善行者，用一杯咖啡的温度，致敬温暖的传递',
    focusArea: '城市温暖 · 善意随行',
    slots: ['kindness_square', 'warmth_shop', 'quarterly_release', 'fund_disclosure'],
    totalSponsorship: 25000,
    partnerSince: '2024-03-08',
    csrLink: 'https://example.com/luckin-csr',
  },
];

// 获取所有品牌
export const getBrands = (): Brand[] => {
  return mockBrands;
};

// 根据 ID 获取品牌
export const getBrandById = (id: string): Brand | undefined => {
  return mockBrands.find(b => b.id === id);
};

// 获取所有赞助位置
export const getBrandSlots = (): BrandSlot[] => {
  return brandSlots;
};

// 根据 ID 获取赞助位置
export const getSlotById = (id: BrandSlotId): BrandSlot | undefined => {
  return brandSlots.find(s => s.id === id);
};

// 获取某位置上的品牌
export const getBrandsBySlot = (slotId: BrandSlotId): Brand[] => {
  return mockBrands.filter(b => b.slots.includes(slotId));
};
