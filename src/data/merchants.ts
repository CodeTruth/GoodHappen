// 商家福气联盟类型定义

// 商家权益类型
export type BenefitType = 'discount' | 'gift' | 'event' | 'cooperation';

// 商家权益
export interface MerchantBenefit {
  id: string;
  type: BenefitType;
  name: string;
  description: string;
  cost: number; // 所需福气
  // 所需称号等级（参考 utils/fortune.ts 中 TitleLevel）
  requiredTitleLevel: number;
  requiredTitleLabel: string;
  icon: string;
}

// 商家信息
export interface Merchant {
  id: string;
  name: string;
  logo: string;
  category: string; // 商家类别
  address: string;
  // 距离（米）
  distance: number;
  // 经纬度（简化展示）
  location: { lat: number; lng: number };
  phone: string;
  // 营业时间
  businessHours: string;
  // 提供的权益
  benefits: MerchantBenefit[];
  // 是否为年度温暖用户专属
  isAnnualExclusive?: boolean;
}

// 权益类型标签
export const benefitTypeLabels: Record<BenefitType, { label: string; icon: string }> = {
  discount: { label: '到店折扣', icon: '💰' },
  gift: { label: '到店赠品', icon: '🎁' },
  event: { label: '限时活动', icon: '🎫' },
  cooperation: { label: '社区联名', icon: '🏛️' },
};

// Mock 商家数据
export const mockMerchants: Merchant[] = [
  {
    id: 'merchant_starbucks_1',
    name: '星巴克·人民广场店',
    logo: 'https://picsum.photos/id/1069/200/200',
    category: '咖啡',
    address: '上海市黄浦区人民广场100号',
    distance: 320,
    location: { lat: 31.2336, lng: 121.4691 },
    phone: '021-68888001',
    businessHours: '07:00 - 22:00',
    benefits: [
      {
        id: 'ben_starbucks_discount',
        type: 'discount',
        name: '全单9折',
        description: '到店出示福气码，全单享9折优惠一次',
        cost: 50,
        requiredTitleLevel: 0,
        requiredTitleLabel: '萤火以上',
        icon: '💰',
      },
      {
        id: 'ben_starbucks_latte',
        type: 'gift',
        name: '星巴克拿铁',
        description: '到店出示福气码，免费兑换大杯拿铁一杯',
        cost: 100,
        requiredTitleLevel: 3,
        requiredTitleLabel: '暖阳以上',
        icon: '☕',
      },
      {
        id: 'ben_starbucks_event',
        type: 'event',
        name: '咖啡品鉴会邀请',
        description: '专属咖啡品鉴会邀请，与咖啡师面对面交流',
        cost: 300,
        requiredTitleLevel: 7,
        requiredTitleLabel: '春风以上',
        icon: '🎫',
      },
    ],
  },
  {
    id: 'merchant_naixue_1',
    name: '奈雪的茶·南京西路店',
    logo: 'https://picsum.photos/id/1079/200/200',
    category: '茶饮',
    address: '上海市静安区南京西路1788号',
    distance: 580,
    location: { lat: 31.2297, lng: 121.4544 },
    phone: '021-68888002',
    businessHours: '10:00 - 22:00',
    benefits: [
      {
        id: 'ben_naixue_discount',
        type: 'discount',
        name: '全单9折',
        description: '到店出示福气码，全单享9折优惠一次',
        cost: 50,
        requiredTitleLevel: 0,
        requiredTitleLabel: '萤火以上',
        icon: '💰',
      },
      {
        id: 'ben_naixue_tea',
        type: 'gift',
        name: '奈雪果茶',
        description: '到店出示福气码，免费兑换任意果茶一杯',
        cost: 100,
        requiredTitleLevel: 3,
        requiredTitleLabel: '暖阳以上',
        icon: '🥤',
      },
    ],
  },
  {
    id: 'merchant_patagonia_1',
    name: 'Patagonia·户外概念店',
    logo: 'https://picsum.photos/id/1084/200/200',
    category: '户外',
    address: '上海市徐汇区淮海中路1325号',
    distance: 1200,
    location: { lat: 31.2152, lng: 121.4365 },
    phone: '021-68888003',
    businessHours: '10:00 - 21:00',
    benefits: [
      {
        id: 'ben_patagonia_discount',
        type: 'discount',
        name: '环保商品9折',
        description: '到店出示福气码，环保系列商品享9折一次',
        cost: 50,
        requiredTitleLevel: 0,
        requiredTitleLabel: '萤火以上',
        icon: '💰',
      },
      {
        id: 'ben_patagonia_workshop',
        type: 'event',
        name: '环保工作坊邀请',
        description: '专属环保工作坊邀请，参与旧衣改造与环保讲座',
        cost: 300,
        requiredTitleLevel: 7,
        requiredTitleLabel: '春风以上',
        icon: '🌱',
      },
      {
        id: 'ben_patagonia_wall',
        type: 'cooperation',
        name: '名字印在温暖墙',
        description: '年度温暖用户专属，名字将印在门店温暖墙上',
        cost: 500,
        requiredTitleLevel: 8,
        requiredTitleLabel: '年度温暖用户',
        icon: '🏛️',
      },
    ],
    isAnnualExclusive: true,
  },
  {
    id: 'merchant_breakfast_1',
    name: '温暖早餐铺',
    logo: 'https://picsum.photos/id/312/200/200',
    category: '餐饮',
    address: '上海市浦东新区世纪大道200号',
    distance: 850,
    location: { lat: 31.2304, lng: 121.5394 },
    phone: '021-68888004',
    businessHours: '05:00 - 11:00',
    benefits: [
      {
        id: 'ben_breakfast_discount',
        type: 'discount',
        name: '早餐全单8折',
        description: '到店出示福气码，早餐全单享8折优惠一次',
        cost: 50,
        requiredTitleLevel: 0,
        requiredTitleLabel: '萤火以上',
        icon: '💰',
      },
      {
        id: 'ben_breakfast_gift',
        type: 'gift',
        name: '免费豆浆一杯',
        description: '到店出示福气码，免费兑换豆浆一杯',
        cost: 100,
        requiredTitleLevel: 3,
        requiredTitleLabel: '暖阳以上',
        icon: '🥛',
      },
    ],
  },
  {
    id: 'merchant_bookstore_1',
    name: '温暖书屋',
    logo: 'https://picsum.photos/id/1043/200/200',
    category: '书店',
    address: '上海市长宁区愚园路1203号',
    distance: 1500,
    location: { lat: 31.2205, lng: 121.4221 },
    phone: '021-68888005',
    businessHours: '09:00 - 21:00',
    benefits: [
      {
        id: 'ben_bookstore_discount',
        type: 'discount',
        name: '图书8.5折',
        description: '到店出示福气码，图书享8.5折优惠一次',
        cost: 50,
        requiredTitleLevel: 0,
        requiredTitleLabel: '萤火以上',
        icon: '💰',
      },
      {
        id: 'ben_bookstore_event',
        type: 'event',
        name: '读书分享会邀请',
        description: '专属读书分享会邀请，与作者面对面交流',
        cost: 300,
        requiredTitleLevel: 7,
        requiredTitleLabel: '春风以上',
        icon: '📚',
      },
    ],
  },
];

// 获取所有商家
export const getMerchants = (): Merchant[] => {
  return mockMerchants;
};

// 根据 ID 获取商家
export const getMerchantById = (id: string): Merchant | undefined => {
  return mockMerchants.find(m => m.id === id);
};

// 按距离排序
export const getMerchantsByDistance = (): Merchant[] => {
  return [...mockMerchants].sort((a, b) => a.distance - b.distance);
};

// 按权益类型筛选
export const getMerchantsByBenefitType = (type: BenefitType): Merchant[] => {
  return mockMerchants.filter(m => m.benefits.some(b => b.type === type));
};

// 格式化距离
export const formatDistance = (distance: number): string => {
  if (distance < 1000) {
    return `${distance}m`;
  }
  return `${(distance / 1000).toFixed(1)}km`;
};
