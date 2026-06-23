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

// Mock 季度财务报告数据
const mockReports: QuarterlyReport[] = [
  {
    quarter: '2024-Q1',
    title: '2024年第一季度温暖基金公示',
    totalIncome: 58000,
    totalWarmthFund: 40600,
    totalPlatformOperation: 17400,
    beneficiaries: 156,
    warmthActions: 42,
    highlight: '本季度联合星巴克、奈雪开展"温暖一杯"行动，为环卫工人送出1560杯热饮',
    publishedAt: '2024-04-10T00:00:00Z',
  },
  {
    quarter: '2024-Q2',
    title: '2024年第二季度温暖基金公示',
    totalIncome: 72000,
    totalWarmthFund: 50400,
    totalPlatformOperation: 21600,
    beneficiaries: 203,
    warmthActions: 58,
    highlight: '联合Patagonia开展"地球日"环保行动，200+志愿者参与河道清理',
    publishedAt: '2024-07-10T00:00:00Z',
  },
  {
    quarter: '2024-Q3',
    title: '2024年第三季度温暖基金公示',
    totalIncome: 65000,
    totalWarmthFund: 45500,
    totalPlatformOperation: 19500,
    beneficiaries: 178,
    warmthActions: 51,
    highlight: '开学季"温暖书包"行动，为山区儿童送出178套学习用品',
    publishedAt: '2024-10-10T00:00:00Z',
  },
  {
    quarter: '2024-Q4',
    title: '2024年第四季度温暖基金公示',
    totalIncome: 89000,
    totalWarmthFund: 62300,
    totalPlatformOperation: 26700,
    beneficiaries: 245,
    warmthActions: 67,
    highlight: '年终"温暖年鉴"行动，评选年度温暖故事20个，发放温暖礼包245份',
    publishedAt: '2025-01-10T00:00:00Z',
  },
];

// Mock 收入记录
const mockIncomes: FundIncome[] = [
  {
    id: 'inc_001',
    source: 'brand',
    sourceName: '星巴克温暖赞助',
    amount: 10000,
    date: '2024-01-15',
    quarter: '2024-Q1',
    description: '星巴克"温暖一杯"行动赞助',
  },
  {
    id: 'inc_002',
    source: 'brand',
    sourceName: '奈雪的茶温暖赞助',
    amount: 8000,
    date: '2024-02-10',
    quarter: '2024-Q1',
    description: '奈雪果茶温暖行动赞助',
  },
  {
    id: 'inc_003',
    source: 'donation',
    sourceName: '匿名温暖用户捐赠',
    amount: 25000,
    date: '2024-03-20',
    quarter: '2024-Q1',
    description: '社区匿名用户集体捐赠',
  },
  {
    id: 'inc_004',
    source: 'competition',
    sourceName: 'TRAE大赛奖金',
    amount: 15000,
    date: '2024-03-28',
    quarter: '2024-Q1',
    description: 'TRAE创新应用大赛奖金注入',
  },
  {
    id: 'inc_005',
    source: 'brand',
    sourceName: 'Patagonia环保赞助',
    amount: 12000,
    date: '2024-04-22',
    quarter: '2024-Q2',
    description: '地球日环保行动赞助',
  },
  {
    id: 'inc_006',
    source: 'donation',
    sourceName: '匿名温暖用户捐赠',
    amount: 45000,
    date: '2024-06-15',
    quarter: '2024-Q2',
    description: '社区匿名用户集体捐赠',
  },
  {
    id: 'inc_007',
    source: 'competition',
    sourceName: 'TRAE大赛奖金',
    amount: 15000,
    date: '2024-06-30',
    quarter: '2024-Q2',
    description: 'TRAE创新应用大赛奖金注入',
  },
];

// Mock 分配记录（基于收入自动生成 70% 温暖基金 + 30% 平台运营）
const mockAllocations: FundAllocation[] = [
  ...mockIncomes.map((income, idx): FundAllocation => ({
    id: `alloc_${String(idx + 1).padStart(3, '0')}`,
    category: 'warmth_fund',
    amount: Math.round(income.amount * 0.7),
    percentage: 70,
    description: `${income.sourceName} → 温暖基金`,
    relatedIncomeId: income.id,
  })),
  ...mockIncomes.map((income, idx): FundAllocation => ({
    id: `alloc_op_${String(idx + 1).padStart(3, '0')}`,
    category: 'platform_operation',
    amount: Math.round(income.amount * 0.3),
    percentage: 30,
    description: `${income.sourceName} → 平台运营`,
    relatedIncomeId: income.id,
  })),
];

export const useFundStore = create<FundState>((set, get) => ({
  incomes: mockIncomes,
  allocations: mockAllocations,
  reports: mockReports,

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
          incomes: parsed.incomes || mockIncomes,
          allocations: parsed.allocations || mockAllocations,
          reports: parsed.reports || mockReports,
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
