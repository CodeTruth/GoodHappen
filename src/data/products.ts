// 温暖商城商品类型定义

// 商品权益类型
export type ProductCategory = 'virtual' | 'brand' | 'milestone' | 'annual';

// 商品接口
export interface Product {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  price: number; // 所需福气
  image: string;
  icon: string; // emoji 图标
  // 兑换所需最低称号等级（参考 utils/fortune.ts 中 TitleLevel）
  requiredTitleLevel: number;
  // 单用户限领次数（0 表示不限）
  limitPerUser: number;
  // 里程碑相关（仅 milestone 类型）
  milestone?: {
    days: number; // 累计达标天数
    label: string;
  };
  // 是否需要温暖故事入选者
  requireStorySelected?: boolean;
  // 是否为实体商品
  isPhysical: boolean;
  // 品牌名称（品牌权益）
  brandName?: string;
}

// Mock 商品数据
export const mockProducts: Product[] = [
  // ========== 虚拟权益（萤火及以上） ==========
  {
    id: 'virtual_sticker',
    name: '电子贴纸包',
    description: '温暖系列电子贴纸，记录每一份善意的小确幸',
    category: 'virtual',
    price: 10,
    image: 'https://picsum.photos/id/1080/300/300',
    icon: '🎨',
    requiredTitleLevel: 0, // 萤火及以上
    limitPerUser: 5,
    isPhysical: false,
  },
  {
    id: 'virtual_title',
    name: '限定称号·暖心使者',
    description: '专属限定称号，让你的善行被更多人看见',
    category: 'virtual',
    price: 30,
    image: 'https://picsum.photos/id/1059/300/300',
    icon: '👑',
    requiredTitleLevel: 0, // 萤火及以上
    limitPerUser: 1,
    isPhysical: false,
  },
  {
    id: 'virtual_skin',
    name: '专属温暖皮肤',
    description: '个性化界面皮肤，让你的好事发生独一无二',
    category: 'virtual',
    price: 50,
    image: 'https://picsum.photos/id/1062/300/300',
    icon: '✨',
    requiredTitleLevel: 0, // 萤火及以上
    limitPerUser: 1,
    isPhysical: false,
  },

  // ========== 品牌权益（暖阳及以上） ==========
  {
    id: 'brand_naixue_tea',
    name: '奈雪果茶券',
    description: '奈雪的茶·任意果茶一杯，到店出示福气码兑换',
    category: 'brand',
    price: 80,
    image: 'https://picsum.photos/id/1079/300/300',
    icon: '🥤',
    requiredTitleLevel: 3, // 暖阳及以上
    limitPerUser: 3,
    isPhysical: false,
    brandName: '奈雪的茶',
  },
  {
    id: 'brand_starbucks_latte',
    name: '星巴克拿铁券',
    description: '星巴克·大杯拿铁一杯，到店出示福气码兑换',
    category: 'brand',
    price: 100,
    image: 'https://picsum.photos/id/1069/300/300',
    icon: '☕',
    requiredTitleLevel: 3, // 暖阳及以上
    limitPerUser: 3,
    isPhysical: false,
    brandName: '星巴克',
  },
  {
    id: 'brand_handmade_soap',
    name: '手工皂礼盒',
    description: 'Patagonia 联名环保手工皂，温暖到家',
    category: 'brand',
    price: 200,
    image: 'https://picsum.photos/id/1084/300/300',
    icon: '🧼',
    requiredTitleLevel: 3, // 暖阳及以上
    limitPerUser: 1,
    isPhysical: true,
    brandName: 'Patagonia',
  },

  // ========== 里程碑权益（累计30天/100天/365天） ==========
  {
    id: 'milestone_30days',
    name: '30天·星巴克拿铁',
    description: '累计善行30天解锁，星巴克拿铁券一份',
    category: 'milestone',
    price: 100,
    image: 'https://picsum.photos/id/1069/300/300',
    icon: '🌟',
    requiredTitleLevel: 0,
    limitPerUser: 1,
    isPhysical: false,
    milestone: { days: 30, label: '坚持30天' },
    brandName: '星巴克',
  },
  {
    id: 'milestone_100days',
    name: '100天·温暖礼包',
    description: '累计善行100天解锁，专属温暖礼包（含限定徽章+贴纸）',
    category: 'milestone',
    price: 200,
    image: 'https://picsum.photos/id/1080/300/300',
    icon: '🎁',
    requiredTitleLevel: 0,
    limitPerUser: 1,
    isPhysical: true,
    milestone: { days: 100, label: '坚持100天' },
  },
  {
    id: 'milestone_365days',
    name: '365天·温暖年鉴',
    description: '累计善行365天解锁，年度温暖年鉴一本，记录你的温暖一年',
    category: 'milestone',
    price: 500,
    image: 'https://picsum.photos/id/1043/300/300',
    icon: '📖',
    requiredTitleLevel: 0,
    limitPerUser: 1,
    isPhysical: true,
    milestone: { days: 365, label: '坚持365天' },
  },

  // ========== 温暖年鉴（温暖故事入选者且皓月以上） ==========
  {
    id: 'annual_yearbook',
    name: '温暖年鉴·纸质版',
    description: '温暖故事入选者专属，皓月以上可兑换，纸质版年鉴收藏你的善行故事',
    category: 'annual',
    price: 200,
    image: 'https://picsum.photos/id/1043/300/300',
    icon: '📚',
    requiredTitleLevel: 8, // 皓月及以上
    limitPerUser: 1,
    isPhysical: true,
    requireStorySelected: true,
  },
];

// 获取所有商品
export const getProducts = (): Product[] => {
  return mockProducts;
};

// 按分类获取商品
export const getProductsByCategory = (category: ProductCategory): Product[] => {
  return mockProducts.filter(p => p.category === category);
};

// 根据 ID 获取商品
export const getProductById = (id: string): Product | undefined => {
  return mockProducts.find(p => p.id === id);
};

// 分类标签配置
export const categoryLabels: Record<ProductCategory, string> = {
  virtual: '虚拟权益',
  brand: '品牌权益',
  milestone: '里程碑权益',
  annual: '温暖年鉴',
};

// 分类描述
export const categoryDescriptions: Record<ProductCategory, string> = {
  virtual: '萤火及以上可兑换',
  brand: '暖阳及以上可兑换',
  milestone: '累计善行达标解锁',
  annual: '温暖故事入选者·皓月以上',
};
