import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { useFortuneStore } from '@/store/fortune';
import { useUserStore, checkIsMinor } from '@/store/user';
import { mockCharityNeeds } from '@/data/charity';
import {
  CharityNeed,
  CharityStatus,
  CharityType,
  CharityRating,
  CharityRecord,
  RatingRole,
} from '@/types/charity';

const STORAGE_KEY = 'haoshi_charity_store';

// 福气悬赏规则常量
const REWARD_SINGLE_MAX = 50;   // 单笔上限 50
const REWARD_DAILY_MAX = 100;   // 单日转出上限 100
const REWARD_MONTHLY_MAX = 500; // 单月转出上限 500
const EXPIRY_HOURS = 24;        // 期望完成时间后 24 小时未确认 → 自动过期

// 发布需求入参
export interface PublishNeedParams {
  title: string;
  description: string;
  type: CharityType;
  expectedTime: string;
  reward: number;
  contact?: string;
}

// 操作结果
interface ActionResult {
  success: boolean;
  message: string;
}

// 资格检查结果
interface QualificationResult {
  qualified: boolean;
  reason?: string;
}

interface CharityState {
  needs: CharityNeed[];
  // 福气悬赏转出统计
  dailyRewardOut: { date: string; amount: number };
  monthlyRewardOut: { month: string; amount: number };

  // 需求发布与状态机
  publishNeed: (params: PublishNeedParams) => ActionResult;
  acceptNeed: (needId: string) => ActionResult;
  startService: (needId: string) => ActionResult;
  completeService: (needId: string) => ActionResult;
  cancelNeed: (needId: string) => ActionResult;
  cancelAcceptance: (needId: string) => ActionResult;
  rateNeed: (needId: string, score: number, comment: string) => ActionResult;
  checkExpiry: () => void;

  // 资格检查
  canAccept: () => QualificationResult;
  canPublishReward: () => QualificationResult;
  getKindnessCount: () => number;

  // 查询
  getNeedById: (id: string) => CharityNeed | undefined;
  getOpenNeeds: () => CharityNeed[];
  getMyPublishedNeeds: () => CharityNeed[];
  getMyAcceptedNeeds: () => CharityNeed[];
  getCharityRecord: (userId: string) => CharityRecord;
  getMyRatingForNeed: (needId: string) => CharityRating | undefined;

  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// 获取当前日期
const getToday = (): string => new Date().toISOString().split('T')[0];

// 获取当前月份
const getMonth = (): string => new Date().toISOString().slice(0, 7);

// 生成唯一 ID
const genId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// 联系方式脱敏：保留前3后4，中间用****代替
export const maskContact = (contact: string): string => {
  if (!contact || contact.length < 7) return contact;
  return contact.slice(0, 3) + '****' + contact.slice(-4);
};

// 状态机合法转换映射
const VALID_TRANSITIONS: Record<CharityStatus, CharityStatus[]> = {
  open: ['accepted', 'cancelled', 'expired'],
  accepted: ['in_progress', 'open', 'cancelled', 'expired'],
  in_progress: ['completed', 'expired'],
  completed: [],
  expired: [],
  cancelled: [],
};

// 校验状态转换是否合法
const isValidTransition = (from: CharityStatus, to: CharityStatus): boolean => {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
};

// 初始化统计数据
const initDailyReward = { date: getToday(), amount: 0 };
const initMonthlyReward = { month: getMonth(), amount: 0 };

export const useCharityStore = create<CharityState>((set, get) => ({
  needs: [...mockCharityNeeds],
  dailyRewardOut: { ...initDailyReward },
  monthlyRewardOut: { ...initMonthlyReward },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // 合并 mock 数据与本地存储（本地存储优先，但保留 mock 中未覆盖的项）
        const mockIds = new Set(mockCharityNeeds.map(n => n.id));
        const localNeeds = (parsed.needs || []).filter((n: CharityNeed) => !mockIds.has(n.id));
        const overriddenMock = mockCharityNeeds.map(mockNeed => {
          const local = (parsed.needs || []).find((n: CharityNeed) => n.id === mockNeed.id);
          return local || mockNeed;
        });
        set({
          needs: [...overriddenMock, ...localNeeds],
          dailyRewardOut: parsed.dailyRewardOut?.date === getToday()
            ? parsed.dailyRewardOut
            : { ...initDailyReward },
          monthlyRewardOut: parsed.monthlyRewardOut?.month === getMonth()
            ? parsed.monthlyRewardOut
            : { ...initMonthlyReward },
        });
      }
    } catch (e) {
      console.error('[CharityStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        needs: state.needs,
        dailyRewardOut: state.dailyRewardOut,
        monthlyRewardOut: state.monthlyRewardOut,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[CharityStore] Save to storage failed:', e);
    }
  },

  // 获取当前用户累计善行数
  getKindnessCount: () => {
    const fortuneStore = useFortuneStore.getState();
    // 优先使用 fortune store 中的 earn 类型交易数
    const earnCount = fortuneStore.transactions.filter(t => t.type === 'earn').length;
    // 兼容 userInfo 中的 kindnessCount
    const userStore = useUserStore.getState();
    const userInfoCount = userStore.userInfo?.kindnessCount || 0;
    return Math.max(earnCount, userInfoCount);
  },

  // 检查是否可以发布带悬赏的需求
  canPublishReward: () => {
    const kindnessCount = get().getKindnessCount();
    if (kindnessCount < 5) {
      return {
        qualified: false,
        reason: `需累计至少5件善行才能发布悬赏（当前${kindnessCount}件）`,
      };
    }
    return { qualified: true };
  },

  // 检查是否有接单资格
  canAccept: () => {
    const userStore = useUserStore.getState();

    // 1. 未成年用户无接单资格
    if (checkIsMinor(userStore.userInfo?.birthYear)) {
      return { qualified: false, reason: '未成年用户暂无接单资格' };
    }

    // 2. 账号状态正常（需登录）
    if (!userStore.isLoggedIn) {
      return { qualified: false, reason: '请先登录' };
    }

    // 3. 累计善行数 ≥ 5件
    const kindnessCount = get().getKindnessCount();
    if (kindnessCount < 5) {
      return {
        qualified: false,
        reason: `需累计至少5件善行才能接单（当前${kindnessCount}件）`,
      };
    }

    // 4. 完成率 ≥ 60% & 5. 好评率 ≥ 80%（基于历史接单记录）
    const userId = userStore.userInfo?.id || 'currentUser';
    const record = get().getCharityRecord(userId);
    if (record.totalCount > 0) {
      if (record.completionRate < 60) {
        return {
          qualified: false,
          reason: `完成率需≥60%（当前${record.completionRate.toFixed(0)}%）`,
        };
      }
      if (record.positiveRate < 80) {
        return {
          qualified: false,
          reason: `好评率需≥80%（当前${record.positiveRate.toFixed(0)}%）`,
        };
      }
    }

    return { qualified: true };
  },

  // 发布需求
  publishNeed: (params) => {
    const { title, description, type, expectedTime, reward, contact } = params;

    // 校验标题长度 5-30 字
    if (title.length < 5 || title.length > 30) {
      return { success: false, message: '标题需在5-30字之间' };
    }

    // 校验描述非空
    if (!description.trim()) {
      return { success: false, message: '请填写需求描述' };
    }

    // 校验期望完成时间
    const expectedDate = new Date(expectedTime);
    if (isNaN(expectedDate.getTime())) {
      return { success: false, message: '请选择有效的期望完成时间' };
    }
    if (expectedDate.getTime() < Date.now()) {
      return { success: false, message: '期望完成时间需晚于当前时间' };
    }

    // 校验福气悬赏
    if (reward < 0 || reward > REWARD_SINGLE_MAX) {
      return { success: false, message: `福气悬赏需在0~${REWARD_SINGLE_MAX}之间` };
    }

    // 有悬赏时检查资格与额度
    if (reward > 0) {
      // 需≥5件善行才能发布悬赏
      const qualCheck = get().canPublishReward();
      if (!qualCheck.qualified) {
        return { success: false, message: qualCheck.reason || '无悬赏资格' };
      }

      const fortuneStore = useFortuneStore.getState();
      // 不得超过当前可用福气
      if (fortuneStore.availableFortune < reward) {
        return {
          success: false,
          message: `可用福气不足（当前${fortuneStore.availableFortune}，需${reward}）`,
        };
      }

      // 单日转出上限
      const today = getToday();
      const dailyOut = get().dailyRewardOut.date === today
        ? get().dailyRewardOut.amount
        : 0;
      if (dailyOut + reward > REWARD_DAILY_MAX) {
        return {
          success: false,
          message: `单日悬赏转出上限${REWARD_DAILY_MAX}（今日已转出${dailyOut}）`,
        };
      }

      // 单月转出上限
      const month = getMonth();
      const monthlyOut = get().monthlyRewardOut.month === month
        ? get().monthlyRewardOut.amount
        : 0;
      if (monthlyOut + reward > REWARD_MONTHLY_MAX) {
        return {
          success: false,
          message: `单月悬赏转出上限${REWARD_MONTHLY_MAX}（本月已转出${monthlyOut}）`,
        };
      }

      // 冻结福气
      const frozen = fortuneStore.freezeFortune(reward, `悬赏·${title}`, '');
      if (!frozen) {
        return { success: false, message: '福气冻结失败' };
      }
    }

    // 获取当前用户信息
    const userStore = useUserStore.getState();
    const userInfo = userStore.userInfo;
    const publisherId = userInfo?.id || 'currentUser';
    const publisherName = userInfo?.name || '温暖小太阳';
    const publisherAvatar = userInfo?.avatar || 'https://picsum.photos/id/64/200/200';

    // 创建需求
    const newNeed: CharityNeed = {
      id: genId('need'),
      publisherId,
      publisherName,
      publisherAvatar,
      title,
      description,
      type,
      expectedTime,
      reward,
      contact: contact ? maskContact(contact) : '',
      status: 'open',
      createdAt: new Date().toISOString(),
      ratings: [],
    };

    set((state) => ({
      needs: [newNeed, ...state.needs],
      // 更新转出统计
      dailyRewardOut: reward > 0
        ? { date: getToday(), amount: (state.dailyRewardOut.date === getToday() ? state.dailyRewardOut.amount : 0) + reward }
        : state.dailyRewardOut,
      monthlyRewardOut: reward > 0
        ? { month: getMonth(), amount: (state.monthlyRewardOut.month === getMonth() ? state.monthlyRewardOut.amount : 0) + reward }
        : state.monthlyRewardOut,
    }));

    get().saveToStorage();
    return { success: true, message: '需求发布成功' };
  },

  // 接单
  acceptNeed: (needId) => {
    const need = get().needs.find(n => n.id === needId);
    if (!need) {
      return { success: false, message: '需求不存在' };
    }

    // 状态校验
    if (!isValidTransition(need.status, 'accepted')) {
      return { success: false, message: `当前状态「${need.status}」不可接单` };
    }

    // 不能接自己发布的需求
    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';
    if (need.publisherId === userId) {
      return { success: false, message: '不能接自己发布的需求' };
    }

    // 接单资格检查
    const qualCheck = get().canAccept();
    if (!qualCheck.qualified) {
      return { success: false, message: qualCheck.reason || '无接单资格' };
    }

    const accepterName = userStore.userInfo?.name || '温暖小太阳';
    const accepterAvatar = userStore.userInfo?.avatar || 'https://picsum.photos/id/64/200/200';

    set((state) => ({
      needs: state.needs.map(n =>
        n.id === needId
          ? {
              ...n,
              status: 'accepted' as CharityStatus,
              accepterId: userId,
              accepterName,
              accepterAvatar,
              acceptedAt: new Date().toISOString(),
            }
          : n
      ),
    }));

    get().saveToStorage();
    return { success: true, message: '接单成功' };
  },

  // 开始服务
  startService: (needId) => {
    const need = get().needs.find(n => n.id === needId);
    if (!need) {
      return { success: false, message: '需求不存在' };
    }

    if (!isValidTransition(need.status, 'in_progress')) {
      return { success: false, message: `当前状态「${need.status}」不可开始服务` };
    }

    // 仅接单者可开始服务
    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';
    if (need.accepterId !== userId) {
      return { success: false, message: '仅接单者可开始服务' };
    }

    set((state) => ({
      needs: state.needs.map(n =>
        n.id === needId
          ? {
              ...n,
              status: 'in_progress' as CharityStatus,
              startedAt: new Date().toISOString(),
            }
          : n
      ),
    }));

    get().saveToStorage();
    return { success: true, message: '服务已开始' };
  },

  // 完成服务 → 福气自动划转
  completeService: (needId) => {
    const need = get().needs.find(n => n.id === needId);
    if (!need) {
      return { success: false, message: '需求不存在' };
    }

    if (!isValidTransition(need.status, 'completed')) {
      return { success: false, message: `当前状态「${need.status}」不可完成` };
    }

    // 接单者或发布者均可标记完成（双方确认）
    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';
    if (need.accepterId !== userId && need.publisherId !== userId) {
      return { success: false, message: '仅当事人可确认完成' };
    }

    // 福气自动划转
    if (need.reward > 0) {
      const fortuneStore = useFortuneStore.getState();
      // 从冻结池划转给接单者
      fortuneStore.transferFrozenFortune(need.reward, `完成·${need.title}`, needId);
      // 如果接单者是当前用户，则获得福气奖励
      if (need.accepterId === userId) {
        fortuneStore.earnCharityReward(need.reward, `接单奖励·${need.title}`, needId);
      }
    }

    set((state) => ({
      needs: state.needs.map(n =>
        n.id === needId
          ? {
              ...n,
              status: 'completed' as CharityStatus,
              completedAt: new Date().toISOString(),
            }
          : n
      ),
    }));

    get().saveToStorage();
    return { success: true, message: '服务已完成，福气已划转' };
  },

  // 取消需求（发布者操作）→ 福气解冻退回
  cancelNeed: (needId) => {
    const need = get().needs.find(n => n.id === needId);
    if (!need) {
      return { success: false, message: '需求不存在' };
    }

    if (!isValidTransition(need.status, 'cancelled')) {
      return { success: false, message: `当前状态「${need.status}」不可取消` };
    }

    // 仅发布者可取消
    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';
    if (need.publisherId !== userId) {
      return { success: false, message: '仅发布者可取消需求' };
    }

    // 福气解冻退回
    if (need.reward > 0) {
      const fortuneStore = useFortuneStore.getState();
      fortuneStore.unfreezeFortune(need.reward, `取消退回·${need.title}`, needId);
    }

    set((state) => ({
      needs: state.needs.map(n =>
        n.id === needId
          ? {
              ...n,
              status: 'cancelled' as CharityStatus,
              cancelledAt: new Date().toISOString(),
            }
          : n
      ),
    }));

    get().saveToStorage();
    return { success: true, message: '需求已取消，福气已退回' };
  },

  // 接单者放弃接单（accepted → open，福气不解冻因为需求还在）
  cancelAcceptance: (needId) => {
    const need = get().needs.find(n => n.id === needId);
    if (!need) {
      return { success: false, message: '需求不存在' };
    }

    if (!isValidTransition(need.status, 'open')) {
      return { success: false, message: `当前状态「${need.status}」不可退回` };
    }

    // 仅接单者可放弃
    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';
    if (need.accepterId !== userId) {
      return { success: false, message: '仅接单者可放弃接单' };
    }

    set((state) => ({
      needs: state.needs.map(n =>
        n.id === needId
          ? {
              ...n,
              status: 'open' as CharityStatus,
              accepterId: undefined,
              accepterName: undefined,
              accepterAvatar: undefined,
              acceptedAt: undefined,
            }
          : n
      ),
    }));

    get().saveToStorage();
    return { success: true, message: '已退回需求' };
  },

  // 双方互评
  rateNeed: (needId, score, comment) => {
    const need = get().needs.find(n => n.id === needId);
    if (!need) {
      return { success: false, message: '需求不存在' };
    }

    if (need.status !== 'completed') {
      return { success: false, message: '仅已完成的需求可评价' };
    }

    if (score < 1 || score > 5) {
      return { success: false, message: '评分需在1-5星之间' };
    }

    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';

    // 判断评价角色
    let role: RatingRole;
    if (need.publisherId === userId) {
      role = 'publisher_to_accepter';
    } else if (need.accepterId === userId) {
      role = 'accepter_to_publisher';
    } else {
      return { success: false, message: '仅当事人可评价' };
    }

    // 检查是否已评价
    const existingRating = need.ratings.find(r => r.role === role);
    if (existingRating) {
      return { success: false, message: '您已评价过此需求' };
    }

    const rating: CharityRating = {
      role,
      score,
      comment: comment.trim(),
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      needs: state.needs.map(n =>
        n.id === needId
          ? { ...n, ratings: [...n.ratings, rating] }
          : n
      ),
    }));

    get().saveToStorage();
    return { success: true, message: '评价成功' };
  },

  // 超时检查：期望完成时间后24小时未确认完成 → 自动过期
  checkExpiry: () => {
    const now = Date.now();
    let changed = false;

    const updatedNeeds = get().needs.map(n => {
      // 仅对未完成的需求检查
      if (n.status === 'open' || n.status === 'accepted' || n.status === 'in_progress') {
        const expectedTime = new Date(n.expectedTime).getTime();
        const deadline = expectedTime + EXPIRY_HOURS * 60 * 60 * 1000;
        if (now > deadline) {
          changed = true;
          // 福气解冻退回给发布者
          if (n.reward > 0) {
            const fortuneStore = useFortuneStore.getState();
            fortuneStore.unfreezeFortune(n.reward, `超时退回·${n.title}`, n.id);
          }
          return {
            ...n,
            status: 'expired' as CharityStatus,
            expiredAt: new Date().toISOString(),
          };
        }
      }
      return n;
    });

    if (changed) {
      set({ needs: updatedNeeds });
      get().saveToStorage();
    }
  },

  // 查询方法
  getNeedById: (id) => get().needs.find(n => n.id === id),

  getOpenNeeds: () => {
    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';
    return get().needs.filter(n => n.status === 'open' && n.publisherId !== userId);
  },

  getMyPublishedNeeds: () => {
    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';
    return get().needs.filter(n => n.publisherId === userId);
  },

  getMyAcceptedNeeds: () => {
    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';
    return get().needs.filter(n => n.accepterId === userId);
  },

  // 获取公益履历
  getCharityRecord: (userId) => {
    const needs = get().needs;
    // 该用户作为接单者的所有需求
    const acceptedNeeds = needs.filter(n => n.accepterId === userId);

    const totalCount = acceptedNeeds.length;
    const completedNeeds = acceptedNeeds.filter(n => n.status === 'completed');
    const completedCount = completedNeeds.length;
    const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 100;

    // 好评率：接单者收到的评价中 ≥4 星的占比
    const ratingsReceived = completedNeeds.flatMap(n =>
      n.ratings.filter(r => r.role === 'publisher_to_accepter')
    );
    const positiveCount = ratingsReceived.filter(r => r.score >= 4).length;
    const positiveRate = ratingsReceived.length > 0
      ? (positiveCount / ratingsReceived.length) * 100
      : 100;

    const totalReward = completedNeeds.reduce((sum, n) => sum + n.reward, 0);

    const records = completedNeeds
      .map(n => {
        const rating = n.ratings.find(r => r.role === 'publisher_to_accepter');
        return {
          needId: n.id,
          title: n.title,
          type: n.type,
          completedAt: n.completedAt || '',
          reward: n.reward,
          ratingScore: rating?.score,
          ratingComment: rating?.comment,
        };
      })
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    return {
      totalCount,
      completedCount,
      completionRate,
      positiveRate,
      totalReward,
      records,
    };
  },

  // 获取当前用户对某需求的评价
  getMyRatingForNeed: (needId) => {
    const need = get().needs.find(n => n.id === needId);
    if (!need) return undefined;

    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';

    let role: RatingRole;
    if (need.publisherId === userId) {
      role = 'publisher_to_accepter';
    } else if (need.accepterId === userId) {
      role = 'accepter_to_publisher';
    } else {
      return undefined;
    }

    return need.ratings.find(r => r.role === role);
  },
}));
