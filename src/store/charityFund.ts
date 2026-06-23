import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { useFortuneStore } from '@/store/fortune';
import { useUserStore } from '@/store/user';
import {
  mockOrganizations,
  mockRecipients,
  mockFundFlows,
  mockDonations,
  mockCharityReports,
  mockCharityTasks,
  mockClaimFlows,
  FORTUNE_TO_MONEY_RATE,
  CharityOrganization,
  Recipient,
  FundFlow,
  DonationRecord,
  CharityQuarterlyReport,
  CharityTask,
  ClaimFlow,
  TaskLevel,
  TaskStatus,
  TaskSource,
  ClaimStep,
  ClaimStepInfo,
} from '@/data/charityFund';

// ClaimStepInfo 仅用于类型导出，避免未使用告警
export type { ClaimStepInfo };

const STORAGE_KEY = 'haoshi_charity_fund_store';

// 操作结果
interface ActionResult {
  success: boolean;
  message: string;
}

// 任务状态机合法转换
const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['in_progress', 'cancelled' as TaskStatus],
  in_progress: ['completed'],
  completed: ['verified'],
  verified: [],
};

// 任务状态映射
export const TASK_STATUS_MAP: Record<TaskStatus, { label: string; color: string }> = {
  pending: { label: '待开始', color: '#999999' },
  in_progress: { label: '进行中', color: '#165dff' },
  completed: { label: '已完成', color: '#FAAD14' },
  verified: { label: '已验证', color: '#52C41A' },
};

// 任务等级映射
export const TASK_LEVEL_MAP: Record<TaskLevel, { label: string; desc: string; color: string; range: string }> = {
  L1: { label: '日常微善', desc: '日常生活中的小善举', color: '#52C41A', range: '1-10福气' },
  L2: { label: '社区贡献', desc: '为社区和邻里贡献力量', color: '#FAAD14', range: '10-50福气' },
  L3: { label: '公益行动', desc: '参与正式公益行动', color: '#FF6B6B', range: '50+福气' },
};

// 领取流程步骤顺序
export const CLAIM_STEP_ORDER: ClaimStep[] = [
  'applied',
  'reviewing',
  'approved',
  'distributing',
  'delivered',
  'confirmed',
  'published',
];

// 领取流程步骤映射
export const CLAIM_STEP_MAP: Record<ClaimStep, { label: string; desc: string }> = {
  applied: { label: '申请领取', desc: '受助人或公益组织代为申请' },
  reviewing: { label: '资格审核', desc: '公益组织审核 + 平台复核' },
  approved: { label: '审核通过', desc: '善款发放审批完成' },
  distributing: { label: '善款发放', desc: '通过公益组织中转，不直接对个人' },
  delivered: { label: '善款送达', desc: '公益组织将善款送达受助人' },
  confirmed: { label: '领取确认', desc: '受助人确认收到 + 拍照/视频反馈' },
  published: { label: '公示反馈', desc: '善款使用情况公示，保护隐私' },
};

interface CharityFundState {
  // 数据
  organizations: CharityOrganization[];
  recipients: Recipient[];
  fundFlows: FundFlow[];
  donations: DonationRecord[];
  reports: CharityQuarterlyReport[];
  tasks: CharityTask[];
  claimFlows: ClaimFlow[];

  // 资金对接：福气兑换善款
  donateFortune: (fortuneAmount: number, recipientId?: string, organizationId?: string) => ActionResult;

  // 善行任务管理
  startTask: (taskId: string) => ActionResult;
  completeTask: (taskId: string, proofImages: string[]) => ActionResult;
  verifyTask: (taskId: string, approved: boolean, comment?: string) => ActionResult;
  proposeTask: (title: string, description: string, level: TaskLevel, category: string) => ActionResult;

  // 查询
  getOrganizationById: (id: string) => CharityOrganization | undefined;
  getRecipientById: (id: string) => Recipient | undefined;
  getRecipientsByType: (type: Recipient['type']) => Recipient[];
  getActiveRecipients: () => Recipient[];
  getFundFlowById: (id: string) => FundFlow | undefined;
  getMyDonations: () => DonationRecord[];
  getMyFundFlows: () => FundFlow[];
  getFundFlowsByRecipient: (recipientId: string) => FundFlow[];
  getTaskById: (id: string) => CharityTask | undefined;
  getTasksByLevel: (level: TaskLevel) => CharityTask[];
  getClaimFlowById: (id: string) => ClaimFlow | undefined;
  getClaimFlowsByRecipient: (recipientId: string) => ClaimFlow[];
  getMyClaimFlows: () => ClaimFlow[];

  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// 生成唯一 ID
const genId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

// 校验任务状态转换是否合法
const isValidTaskTransition = (from: TaskStatus, to: TaskStatus): boolean => {
  return TASK_TRANSITIONS[from]?.includes(to) ?? false;
};

export const useCharityFundStore = create<CharityFundState>((set, get) => ({
  organizations: [...mockOrganizations],
  recipients: [...mockRecipients],
  fundFlows: [...mockFundFlows],
  donations: [...mockDonations],
  reports: [...mockCharityReports],
  tasks: [...mockCharityTasks],
  claimFlows: [...mockClaimFlows],

  // 福气兑换善款
  donateFortune: (fortuneAmount, recipientId, organizationId) => {
    if (fortuneAmount <= 0) {
      return { success: false, message: '兑换福气需大于0' };
    }

    // 校验受助人（如指定），并从中推断公益组织
    let recipient: Recipient | undefined;
    if (recipientId) {
      recipient = get().recipients.find(r => r.id === recipientId);
      if (!recipient) {
        return { success: false, message: '受助人不存在' };
      }
      if (recipient.status !== 'active') {
        return { success: false, message: '该受助人当前不接受捐赠' };
      }
      // 若未指定公益组织，则从受助人推断
      if (!organizationId) {
        organizationId = recipient.organizationId;
      }
    }

    // 校验公益组织
    const resolvedOrgId = organizationId || recipient?.organizationId;
    const org = get().organizations.find(o => o.id === resolvedOrgId);
    if (!org) {
      return { success: false, message: '公益组织不存在' };
    }
    const finalOrgId = org.id;

    // 扣减福气
    const fortuneStore = useFortuneStore.getState();
    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';
    const userName = userStore.userInfo?.name || '温暖小太阳';

    const spent = fortuneStore.spendFortune(
      fortuneAmount,
      `福气兑换善款·${recipient ? recipient.alias : org.shortName}`,
      ''
    );
    if (!spent) {
      return { success: false, message: `可用福气不足（当前${fortuneStore.availableFortune}）` };
    }

    // 计算善款金额
    const moneyAmount = fortuneAmount * FORTUNE_TO_MONEY_RATE;

    // 创建资金流向
    const now = new Date().toISOString();
    const flowId = genId('flow');
    const targetRecipient = recipient || get().getActiveRecipients()[0];

    if (!targetRecipient) {
      // 回退福气
      fortuneStore.addFortune(fortuneAmount, '兑换失败退回', '');
      return { success: false, message: '暂无可捐赠的受助人' };
    }

    const newFlow: FundFlow = {
      id: flowId,
      amount: moneyAmount,
      source: 'user_donation',
      sourceDescription: `${userName}的福气兑换`,
      organizationId: finalOrgId,
      organizationName: org.name,
      recipientId: targetRecipient.id,
      recipientAlias: targetRecipient.alias,
      flowNodes: [
        {
          type: 'source',
          name: userName,
          description: '福气兑换善款',
          amount: moneyAmount,
          timestamp: now,
        },
        {
          type: 'organization',
          name: org.name,
          description: '善款中转确认中',
          amount: moneyAmount,
          timestamp: now,
        },
      ],
      status: 'in_transit',
      createdAt: now,
    };

    // 创建捐赠记录
    const donation: DonationRecord = {
      id: genId('don'),
      userId,
      fortuneAmount,
      moneyAmount,
      flowId,
      recipientId: targetRecipient.id,
      organizationId: finalOrgId,
      createdAt: now,
    };

    // 更新受助人已获金额
    const updatedRecipients = get().recipients.map(r =>
      r.id === targetRecipient.id
        ? { ...r, receivedAmount: Math.min(r.requiredAmount, r.receivedAmount + moneyAmount) }
        : r
    );

    // 更新公益组织累计接收
    const updatedOrgs = get().organizations.map(o =>
      o.id === finalOrgId
        ? { ...o, totalReceived: o.totalReceived + moneyAmount }
        : o
    );

    set({
      fundFlows: [newFlow, ...get().fundFlows],
      donations: [donation, ...get().donations],
      recipients: updatedRecipients,
      organizations: updatedOrgs,
    });

    get().saveToStorage();
    return {
      success: true,
      message: `成功兑换${moneyAmount}元善款，将用于帮助${targetRecipient.alias}`,
    };
  },

  // 开始任务
  startTask: (taskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) {
      return { success: false, message: '任务不存在' };
    }

    if (!isValidTaskTransition(task.status, 'in_progress')) {
      return { success: false, message: `当前状态「${TASK_STATUS_MAP[task.status].label}」不可开始` };
    }

    set({
      tasks: get().tasks.map(t =>
        t.id === taskId
          ? { ...t, status: 'in_progress' as TaskStatus, startedAt: new Date().toISOString() }
          : t
      ),
    });

    get().saveToStorage();
    return { success: true, message: '任务已开始，加油完成它' };
  },

  // 完成任务（提交证明）
  completeTask: (taskId, proofImages) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) {
      return { success: false, message: '任务不存在' };
    }

    if (!isValidTaskTransition(task.status, 'completed')) {
      return { success: false, message: `当前状态「${TASK_STATUS_MAP[task.status].label}」不可完成` };
    }

    if (task.proofRequired && proofImages.length === 0) {
      return { success: false, message: '请上传拍照/视频证明' };
    }

    set({
      tasks: get().tasks.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: 'completed' as TaskStatus,
              completedAt: new Date().toISOString(),
              proofImages: proofImages.length > 0 ? proofImages : undefined,
              aiReviewResult: 'passed', // Mock: AI 初审通过
              manualReviewResult: 'pending',
            }
          : t
      ),
    });

    get().saveToStorage();
    return { success: true, message: '任务已提交，等待人工复审' };
  },

  // 验证任务（人工复审）
  verifyTask: (taskId, approved, comment) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) {
      return { success: false, message: '任务不存在' };
    }

    if (task.status !== 'completed') {
      return { success: false, message: '仅已完成任务可复审' };
    }

    if (approved) {
      // 验证通过 → 发放福气奖励
      const fortuneStore = useFortuneStore.getState();
      fortuneStore.earnCharityReward(
        task.fortuneReward,
        `善行任务·${task.title}`,
        taskId
      );

      set({
        tasks: get().tasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                status: 'verified' as TaskStatus,
                verifiedAt: new Date().toISOString(),
                manualReviewResult: 'approved',
                reviewComment: comment || '审核通过',
              }
            : t
        ),
      });

      get().saveToStorage();
      return { success: true, message: `验证通过，获得${task.fortuneReward}福气奖励` };
    } else {
      // 驳回 → 退回进行中
      set({
        tasks: get().tasks.map(t =>
          t.id === taskId
            ? {
                ...t,
                status: 'in_progress' as TaskStatus,
                manualReviewResult: 'rejected',
                reviewComment: comment || '证明材料不足，请补充',
              }
            : t
        ),
      });

      get().saveToStorage();
      return { success: false, message: comment || '证明材料不足，请补充后重新提交' };
    }
  },

  // 用户提议任务（需审核）
  proposeTask: (title, description, level, category) => {
    if (title.length < 5 || title.length > 30) {
      return { success: false, message: '标题需在5-30字之间' };
    }
    if (!description.trim()) {
      return { success: false, message: '请填写任务描述' };
    }

    const fortuneRange = level === 'L1' ? 5 : level === 'L2' ? 25 : 60;
    const newTask: CharityTask = {
      id: genId('task'),
      title,
      description,
      level,
      fortuneReward: fortuneRange,
      source: 'user_proposal' as TaskSource,
      category,
      status: 'pending' as TaskStatus,
      proofRequired: true,
      estimatedTime: '待评估',
      participants: 0,
      createdAt: new Date().toISOString(),
    };

    set({ tasks: [newTask, ...get().tasks] });
    get().saveToStorage();
    return { success: true, message: '任务已提交，等待审核' };
  },

  // 查询方法
  getOrganizationById: (id) => get().organizations.find(o => o.id === id),
  getRecipientById: (id) => get().recipients.find(r => r.id === id),
  getRecipientsByType: (type) => get().recipients.filter(r => r.type === type && r.status !== 'archived'),
  getActiveRecipients: () => get().recipients.filter(r => r.status === 'active'),
  getFundFlowById: (id) => get().fundFlows.find(f => f.id === id),

  getMyDonations: () => {
    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';
    return get().donations.filter(d => d.userId === userId);
  },

  getMyFundFlows: () => {
    const userStore = useUserStore.getState();
    const userId = userStore.userInfo?.id || 'currentUser';
    const userDonations = get().donations.filter(d => d.userId === userId);
    const flowIds = userDonations.map(d => d.flowId);
    return get().fundFlows.filter(f => flowIds.includes(f.id));
  },

  getFundFlowsByRecipient: (recipientId) =>
    get().fundFlows.filter(f => f.recipientId === recipientId),

  getTaskById: (id) => get().tasks.find(t => t.id === id),
  getTasksByLevel: (level) => get().tasks.filter(t => t.level === level),

  getClaimFlowById: (id) => get().claimFlows.find(c => c.id === id),
  getClaimFlowsByRecipient: (recipientId) =>
    get().claimFlows.filter(c => c.recipientId === recipientId),

  getMyClaimFlows: () => {
    // 用户兑换的福气对应的善款领取进度
    const myDonations = get().getMyDonations();
    const recipientIds = new Set(myDonations.map(d => d.recipientId).filter(Boolean) as string[]);
    return get().claimFlows.filter(c => recipientIds.has(c.recipientId));
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // 合并 mock 数据与本地存储（本地存储优先）
        const mockTaskIds = new Set(mockCharityTasks.map(t => t.id));
        const localTasks = (parsed.tasks || []).filter((t: CharityTask) => !mockTaskIds.has(t.id));
        const overriddenMockTasks = mockCharityTasks.map(mockTask => {
          const local = (parsed.tasks || []).find((t: CharityTask) => t.id === mockTask.id);
          return local || mockTask;
        });

        const mockFlowIds = new Set(mockFundFlows.map(f => f.id));
        const localFlows = (parsed.fundFlows || []).filter((f: FundFlow) => !mockFlowIds.has(f.id));
        const overriddenMockFlows = mockFundFlows.map(mockFlow => {
          const local = (parsed.fundFlows || []).find((f: FundFlow) => f.id === mockFlow.id);
          return local || mockFlow;
        });

        set({
          organizations: parsed.organizations || mockOrganizations,
          recipients: parsed.recipients || mockRecipients,
          fundFlows: [...overriddenMockFlows, ...localFlows],
          donations: parsed.donations || mockDonations,
          reports: parsed.reports || mockCharityReports,
          tasks: [...overriddenMockTasks, ...localTasks],
          claimFlows: parsed.claimFlows || mockClaimFlows,
        });
      }
    } catch (e) {
      console.error('[CharityFundStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        organizations: state.organizations,
        recipients: state.recipients,
        fundFlows: state.fundFlows,
        donations: state.donations,
        reports: state.reports,
        tasks: state.tasks,
        claimFlows: state.claimFlows,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[CharityFundStore] Save to storage failed:', e);
    }
  },
}));
