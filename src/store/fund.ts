import { create } from 'zustand';
import Taro from '@tarojs/taro';

const STORAGE_KEY = 'haoshi_fund_store';

// 资金来源类型
export type FundSourceType = 'brand' | 'donation' | 'competition';

// 资金收入记录
export interface FundIncome {
  id: string;
  source: FundSourceType;
  sourceName: string; // 来源名称
  amount: number; // 总金额
  date: string;
  quarter: string; // 季度标识 如 "2024-Q1"
  description: string;
}

// 资金分配记录
export interface FundAllocation {
  id: string;
  category: 'warmth_fund' | 'platform_operation'; // 温暖基金 / 平台运营
  amount: number;
  percentage: number; // 分配比例
  description: string;
  relatedIncomeId?: string;
}

// 季度财务公示
export interface QuarterlyReport {
  quarter: string; // 如 "2024-Q1"
  title: string;
  totalIncome: number;
  totalWarmthFund: number;
  totalPlatformOperation: number;
  beneficiaries: number; // 受益人数
  warmthActions: number; // 温暖行动数
  highlight: string; // 季度亮点
  publishedAt: string;
}

interface FundState {
  incomes: FundIncome[];
  allocations: FundAllocation[];
  reports: QuarterlyReport[];

  // 获取季度收入
  getIncomesByQuarter: (quarter: string) => FundIncome[];
  // 获取季度分配
  getAllocationsByQuarter: (quarter: string) => FundAllocation[];
  // 获取所有季度报告
  getReports: () => QuarterlyReport[];
  // 计算分配（品牌出¥10,000 → ¥7,000温暖基金 + ¥3,000平台运营）
  calculateAllocation: (totalAmount: number) => { warmthFund: number; platformOperation: number };
  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

export const useFundStore = create<FundState>((set, get) => ({
  incomes: [],
  allocations: [],
  reports: [],

  getIncomesByQuarter: (quarter) => {
    return get().incomes.filter(i => i.quarter === quarter);
  },

  getAllocationsByQuarter: (quarter) => {
    const quarterIncomes = get().incomes.filter(i => i.quarter === quarter);
    const incomeIds = quarterIncomes.map(i => i.id);
    return get().allocations.filter(a => a.relatedIncomeId && incomeIds.includes(a.relatedIncomeId));
  },

  getReports: () => {
    return get().reports;
  },

  calculateAllocation: (totalAmount) => {
    // 分配规则：品牌出¥10,000 → ¥7,000温暖基金 + ¥3,000平台运营
    return {
      warmthFund: Math.round(totalAmount * 0.7),
      platformOperation: Math.round(totalAmount * 0.3),
    };
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          incomes: parsed.incomes || [],
          allocations: parsed.allocations || [],
          reports: parsed.reports || [],
        });
      }
    } catch (e) {
      console.error('[FundStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        incomes: state.incomes,
        allocations: state.allocations,
        reports: state.reports,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[FundStore] Save to storage failed:', e);
    }
  },
}));
