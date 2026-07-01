import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { getLevelByFortune } from '@/utils/fortune';
import type { FortuneLevel } from '@/data/fortune-levels';

const STORAGE_KEY = 'haoshi_fortune_store';

export interface FortuneTransaction {
  id: string;
  type: 'earn' | 'spend' | 'transfer' | 'award' | 'penalty';
  amount: number;
  description: string;
  relatedId?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface DailyStats {
  date: string;
  count: number;
  fortune: number;
}

export interface StreakInfo {
  currentStreak: number;
  lastRecordDate: string;
  highestStreak: number;
}

interface FortuneState {
  totalFortune: number;
  highestFortune: number;
  availableFortune: number;
  frozenFortune: number; // 公益悬赏冻结的福气
  transactions: FortuneTransaction[];
  dailyStats: DailyStats;
  streak: StreakInfo;
  highestTitle: FortuneLevel;
  currentTitle: FortuneLevel;

  addFortune: (amount: number, description: string, relatedId?: string, circleId?: string) => void;
  spendFortune: (amount: number, description: string, relatedId?: string) => boolean;
  transferFortune: (amount: number, toUserId: string, description: string) => boolean;
  recordKindness: () => void;
  canEarnToday: () => boolean;
  getDailyRemaining: () => number;
  resetIfNeeded: () => void;
  loadFromStorage: () => void;
  saveToStorage: () => void;
  // 公益悬赏相关：冻结/解冻/划转/获得奖励
  freezeFortune: (amount: number, description: string, relatedId?: string) => boolean;
  unfreezeFortune: (amount: number, description: string, relatedId?: string) => boolean;
  transferFrozenFortune: (amount: number, description: string, relatedId?: string) => boolean;
  earnCharityReward: (amount: number, description: string, relatedId?: string) => void;
}

const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getYesterday = (): string => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

const calculateStreak = (lastRecordDate: string, currentStreak: number): number => {
  const today = getToday();
  const yesterday = getYesterday();

  if (lastRecordDate === today) {
    return currentStreak;
  }
  if (lastRecordDate === yesterday) {
    return currentStreak;
  }
  return 0;
};

const initialState = {
  totalFortune: 0,
  highestFortune: 0,
  availableFortune: 0,
  frozenFortune: 0,
  transactions: [] as FortuneTransaction[],
  dailyStats: { date: getToday(), count: 0, fortune: 0 },
  streak: { currentStreak: 0, lastRecordDate: '', highestStreak: 0 },
};

export const useFortuneStore = create<FortuneState>((set, get) => ({
  ...initialState,
  highestTitle: getLevelByFortune(0),
  currentTitle: getLevelByFortune(0),

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const today = getToday();
        const dailyStats = parsed.dailyStats?.date === today
          ? parsed.dailyStats
          : { date: today, count: 0, fortune: 0 };

        const streak = calculateStreak(
          parsed.streak?.lastRecordDate || '',
          parsed.streak?.currentStreak || 0
        );
        const newStreak = {
          currentStreak: streak,
          lastRecordDate: parsed.streak?.lastRecordDate || '',
          highestStreak: parsed.streak?.highestStreak || 0,
        };

        set({
          ...parsed,
          frozenFortune: parsed.frozenFortune || 0,
          dailyStats,
          streak: newStreak,
          highestTitle: getLevelByFortune(parsed.highestFortune || 0),
          currentTitle: getLevelByFortune(parsed.totalFortune || 0),
        });
      }
    } catch (e) {
      console.error('[FortuneStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        totalFortune: state.totalFortune,
        highestFortune: state.highestFortune,
        availableFortune: state.availableFortune,
        frozenFortune: state.frozenFortune,
        transactions: state.transactions.slice(-100),
        dailyStats: state.dailyStats,
        streak: state.streak,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[FortuneStore] Save to storage failed:', e);
    }
  },

  resetIfNeeded: () => {
    const today = getToday();
    const { dailyStats, streak } = get();
    if (dailyStats.date !== today) {
      set({ dailyStats: { date: today, count: 0, fortune: 0 } });
    }
    const calculatedStreak = calculateStreak(streak.lastRecordDate, streak.currentStreak);
    if (calculatedStreak !== streak.currentStreak) {
      set({ streak: { ...streak, currentStreak: calculatedStreak } });
    }
  },

  canEarnToday: () => {
    const { dailyStats } = get();
    return dailyStats.count < 5 && dailyStats.fortune < 60;
  },

  getDailyRemaining: () => {
    const { dailyStats } = get();
    return Math.max(0, 60 - dailyStats.fortune);
  },

  addFortune: (amount, description, relatedId, circleId) => {
    const state = get();
    const today = getToday();
    let dailyStats = state.dailyStats;
    if (dailyStats.date !== today) {
      dailyStats = { date: today, count: 0, fortune: 0 };
    }

    if (dailyStats.count >= 5 || dailyStats.fortune >= 60) {
      return;
    }

    // 圈子贡献加成：如果关联了善行圈，福气值 x1.2
    const bonusMultiplier = circleId ? 1.2 : 1.0;
    const rawAmount = Math.floor(amount * bonusMultiplier);
    const actualAmount = Math.min(rawAmount, 60 - dailyStats.fortune, 30);
    if (actualAmount <= 0) return;

    const desc = circleId ? `${description}（圈子加成x1.2）` : description;

    const newTotal = state.totalFortune + actualAmount;
    const newAvailable = state.availableFortune + actualAmount;
    const newHighest = Math.max(state.highestFortune, newTotal);

    const transaction: FortuneTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'earn',
      amount: actualAmount,
      description: desc,
      relatedId,
      balanceAfter: newAvailable,
      createdAt: new Date().toISOString(),
    };

    set({
      totalFortune: newTotal,
      highestFortune: newHighest,
      availableFortune: newAvailable,
      transactions: [...state.transactions, transaction],
      dailyStats: {
        date: today,
        count: dailyStats.count + 1,
        fortune: dailyStats.fortune + actualAmount,
      },
      highestTitle: getLevelByFortune(newHighest),
      currentTitle: getLevelByFortune(newTotal),
    });

    get().saveToStorage();
  },

  spendFortune: (amount, description, relatedId) => {
    const state = get();
    if (state.availableFortune < amount) {
      return false;
    }

    const newAvailable = state.availableFortune - amount;
    const transaction: FortuneTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'spend',
      amount: -amount,
      description,
      relatedId,
      balanceAfter: newAvailable,
      createdAt: new Date().toISOString(),
    };

    set({
      availableFortune: newAvailable,
      transactions: [...state.transactions, transaction],
    });

    get().saveToStorage();
    return true;
  },

  transferFortune: (amount, toUserId, description) => {
    const state = get();
    if (state.availableFortune < amount) {
      return false;
    }

    const newAvailable = state.availableFortune - amount;
    const transaction: FortuneTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'transfer',
      amount: -amount,
      description: `${description}（转给${toUserId}）`,
      balanceAfter: newAvailable,
      createdAt: new Date().toISOString(),
    };

    set({
      availableFortune: newAvailable,
      transactions: [...state.transactions, transaction],
    });

    get().saveToStorage();
    return true;
  },

  recordKindness: () => {
    const state = get();
    const today = getToday();
    const yesterday = getYesterday();

    let newStreak: StreakInfo;
    if (state.streak.lastRecordDate === today) {
      newStreak = state.streak;
    } else if (state.streak.lastRecordDate === yesterday) {
      newStreak = {
        currentStreak: state.streak.currentStreak + 1,
        lastRecordDate: today,
        highestStreak: Math.max(state.streak.highestStreak, state.streak.currentStreak + 1),
      };
    } else {
      newStreak = {
        currentStreak: 1,
        lastRecordDate: today,
        highestStreak: Math.max(state.streak.highestStreak, 1),
      };
    }

    set({ streak: newStreak });
    get().saveToStorage();
  },

  // 公益悬赏：冻结福气（从可用中扣除，进入冻结池）
  freezeFortune: (amount, description, relatedId) => {
    const state = get();
    if (state.availableFortune < amount) {
      return false;
    }
    const newAvailable = state.availableFortune - amount;
    const newFrozen = state.frozenFortune + amount;
    const transaction: FortuneTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'spend',
      amount: -amount,
      description: `福气冻结·${description}`,
      relatedId,
      balanceAfter: newAvailable,
      createdAt: new Date().toISOString(),
    };
    set({
      availableFortune: newAvailable,
      frozenFortune: newFrozen,
      transactions: [...state.transactions, transaction],
    });
    get().saveToStorage();
    return true;
  },

  // 公益悬赏：解冻福气（冻结池退回可用，用于取消/超时）
  unfreezeFortune: (amount, description, relatedId) => {
    const state = get();
    if (state.frozenFortune < amount) {
      return false;
    }
    const newFrozen = state.frozenFortune - amount;
    const newAvailable = state.availableFortune + amount;
    const transaction: FortuneTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'award',
      amount,
      description: `福气解冻·${description}`,
      relatedId,
      balanceAfter: newAvailable,
      createdAt: new Date().toISOString(),
    };
    set({
      availableFortune: newAvailable,
      frozenFortune: newFrozen,
      transactions: [...state.transactions, transaction],
    });
    get().saveToStorage();
    return true;
  },

  // 公益悬赏：划转冻结福气给接单者（从冻结池扣除，不计入发布者可用）
  transferFrozenFortune: (amount, description, relatedId) => {
    const state = get();
    if (state.frozenFortune < amount) {
      return false;
    }
    const newFrozen = state.frozenFortune - amount;
    const transaction: FortuneTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'transfer',
      amount: -amount,
      description: `福气划转·${description}`,
      relatedId,
      balanceAfter: state.availableFortune,
      createdAt: new Date().toISOString(),
    };
    set({
      frozenFortune: newFrozen,
      transactions: [...state.transactions, transaction],
    });
    get().saveToStorage();
    return true;
  },

  // 公益悬赏：接单者获得福气奖励（不受每日善行上限限制）
  earnCharityReward: (amount, description, relatedId) => {
    const state = get();
    const newTotal = state.totalFortune + amount;
    const newAvailable = state.availableFortune + amount;
    const newHighest = Math.max(state.highestFortune, newTotal);
    const transaction: FortuneTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: 'award',
      amount,
      description: `公益奖励·${description}`,
      relatedId,
      balanceAfter: newAvailable,
      createdAt: new Date().toISOString(),
    };
    set({
      totalFortune: newTotal,
      highestFortune: newHighest,
      availableFortune: newAvailable,
      transactions: [...state.transactions, transaction],
      highestTitle: getLevelByFortune(newHighest),
      currentTitle: getLevelByFortune(newTotal),
    });
    get().saveToStorage();
  },
}));