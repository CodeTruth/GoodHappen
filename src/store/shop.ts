import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { useFortuneStore } from './fortune';

const STORAGE_KEY = 'haoshi_shop_store';

// 本地定义（原 @/data/products 已移除）
const getProductById = (_id: string): any => undefined;

// 兑换记录
export interface RedemptionRecord {
  id: string;
  productId: string;
  productName: string;
  cost: number; // 花费福气
  fortuneCode: string; // 福气码（到店出示）
  status: 'pending' | 'used' | 'expired';
  createdAt: string;
  usedAt?: string;
}

interface ShopState {
  redemptions: RedemptionRecord[];

  // 兑换商品（核心原则：花费可用福气，不影响称号）
  redeem: (productId: string) => { success: boolean; message: string; fortuneCode?: string };
  // 标记兑换码已使用
  markAsUsed: (redemptionId: string) => void;
  // 获取某商品的已兑换次数
  getProductRedeemedCount: (productId: string) => number;
  // 获取用户所有兑换记录
  getRedemptions: () => RedemptionRecord[];
  // 检查是否可兑换
  canRedeem: (productId: string, userTitleLevel: number, userStreakDays: number, isStorySelected: boolean) => { canRedeem: boolean; reason?: string };
  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// 生成福气码（到店出示）
const generateFortuneCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const useShopStore = create<ShopState>((set, get) => ({
  redemptions: [],

  canRedeem: (productId, userTitleLevel, userStreakDays, isStorySelected) => {
    const product = getProductById(productId);
    if (!product) {
      return { canRedeem: false, reason: '商品不存在' };
    }

    // 检查称号等级
    if (userTitleLevel < product.requiredTitleLevel) {
      return { canRedeem: false, reason: `需要称号等级 ${product.requiredTitleLevel} 及以上` };
    }

    // 检查里程碑达标天数
    if (product.milestone && userStreakDays < product.milestone.days) {
      return { canRedeem: false, reason: `需累计善行 ${product.milestone.days} 天` };
    }

    // 检查温暖故事入选
    if (product.requireStorySelected && !isStorySelected) {
      return { canRedeem: false, reason: '需为温暖故事入选者' };
    }

    // 检查限领次数
    if (product.limitPerUser > 0) {
      const redeemed = get().getProductRedeemedCount(productId);
      if (redeemed >= product.limitPerUser) {
        return { canRedeem: false, reason: '已达限领次数' };
      }
    }

    // 检查福气是否充足
    const { availableFortune } = useFortuneStore.getState();
    if (availableFortune < product.price) {
      return { canRedeem: false, reason: `还差 ${product.price - availableFortune} 福气` };
    }

    return { canRedeem: true };
  },

  redeem: (productId) => {
    const product = getProductById(productId);
    if (!product) {
      return { success: false, message: '商品不存在' };
    }

    // 检查福气是否充足（核心原则：只花费可用福气，不影响累计福气/称号）
    const fortuneStore = useFortuneStore.getState();
    if (fortuneStore.availableFortune < product.price) {
      const diff = product.price - fortuneStore.availableFortune;
      return { success: false, message: `还差 ${diff} 福气` };
    }

    // 检查限领次数
    if (product.limitPerUser > 0) {
      const redeemed = get().getProductRedeemedCount(productId);
      if (redeemed >= product.limitPerUser) {
        return { success: false, message: '已达限领次数' };
      }
    }

    // 扣减可用福气（不影响 totalFortune，因此不影响称号）
    const spendSuccess = fortuneStore.spendFortune(
      product.price,
      `兑换「${product.name}」`,
      productId
    );

    if (!spendSuccess) {
      return { success: false, message: '福气不足' };
    }

    // 生成兑换记录
    const fortuneCode = generateFortuneCode();
    const record: RedemptionRecord = {
      id: `rd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      productId,
      productName: product.name,
      cost: product.price,
      fortuneCode,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    set(state => ({
      redemptions: [...state.redemptions, record],
    }));

    get().saveToStorage();
    return { success: true, message: '兑换成功', fortuneCode };
  },

  markAsUsed: (redemptionId) => {
    set(state => ({
      redemptions: state.redemptions.map(r =>
        r.id === redemptionId
          ? { ...r, status: 'used', usedAt: new Date().toISOString() }
          : r
      ),
    }));
    get().saveToStorage();
  },

  getProductRedeemedCount: (productId) => {
    return get().redemptions.filter(r => r.productId === productId).length;
  },

  getRedemptions: () => {
    return get().redemptions;
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({ redemptions: parsed.redemptions || [] });
      }
    } catch (e) {
      console.error('[ShopStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        redemptions: state.redemptions.slice(-100),
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[ShopStore] Save to storage failed:', e);
    }
  },
}));
