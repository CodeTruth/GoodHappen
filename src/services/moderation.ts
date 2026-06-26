import {
  moderateContent,
  evaluateCredibility,
  ModerationResponse,
  CredibilityResult,
} from './kindness';
import { useModerationStore, ModerationTask, AIResult } from '@/store/moderation';
import { useNotificationStore, sendSubscribeMessage } from '@/store/notification';

// 模拟复审定时器句柄，用于清理
const reviewTimers = new Map<string, ReturnType<typeof setTimeout>>();

// 高风险判定阈值
const HIGH_RISK_CONFIDENCE_THRESHOLD = 0.7;

// 模拟复审人列表
const SIMULATED_REVIEWERS = ['审核员小王', '审核员小李', '审核员小张', '审核员小陈'];

// 复审结果通知
const pushModerationNotification = async (
  task: ModerationTask,
  approved: boolean
): Promise<void> => {
  const { settings, addNotification } = useNotificationStore.getState();

  if (!settings.moderationNotificationEnabled) return;

  const title = approved ? '内容审核通过' : '内容未通过审核';
  const content = approved
    ? `你提交的内容已通过人工复审，现已对外展示。`
    : `你提交的内容未通过人工复审。${task.reviewNote || '如有疑问，可联系客服。'}`;

  // 站内通知
  if (settings.channels.includes('inApp')) {
    addNotification({
      category: 'system',
      type: 'moderation',
      title,
      content,
      relatedId: task.contentId,
    });
  }

  // 微信订阅消息
  if (settings.channels.includes('subscribe')) {
    await sendSubscribeMessage(
      'moderation_template',
      {
        thing1: { value: title },
        thing2: { value: content.slice(0, 20) },
        time3: { value: new Date().toLocaleString('zh-CN') },
      },
      `pages/detail/index?id=${task.contentId}`
    );
  }
};

// 综合AI初审：调用内容审核 + 真实性评估
export interface AIPreliminaryResult {
  moderation: ModerationResponse;
  credibility: CredibilityResult;
  // 是否高风险
  isHighRisk: boolean;
  // 高风险原因
  highRiskReason?: string;
}

// 执行AI初审
export const runAIPreliminaryReview = async (
  content: string
): Promise<AIPreliminaryResult> => {
  // 并行调用审核和真实性评估
  const [moderation, credibility] = await Promise.all([
    moderateContent(content),
    evaluateCredibility(content),
  ]);

  // 高风险判定：
  // 1. AI审核confidence < 0.7
  // 2. 疑似虚构（credibility level为suspicious）
  // 3. AI审核结果为rejected（明确违规）
  let isHighRisk = false;
  let highRiskReason: string | undefined;

  if (moderation.result === 'rejected') {
    isHighRisk = true;
    highRiskReason = `AI审核拒绝：${moderation.reason || '内容违规'}`;
  } else if (credibility.level === 'suspicious') {
    isHighRisk = true;
    highRiskReason = `疑似虚构：${credibility.reason || '内容真实性存疑'}`;
  } else if (credibility.score < HIGH_RISK_CONFIDENCE_THRESHOLD) {
    isHighRisk = true;
    highRiskReason = `AI置信度偏低（${credibility.score.toFixed(2)}）：${credibility.reason || ''}`;
  }

  return {
    moderation,
    credibility,
    isHighRisk,
    highRiskReason,
  };
};

// 提交内容到复审流程
// 返回 taskId（如果进入复审队列）或 null（如果直接通过）
export const submitForModeration = async (
  contentId: string,
  content: string
): Promise<{ taskId: string | null; aiResult: AIPreliminaryResult }> => {
  // 1. AI初审
  const aiResult = await runAIPreliminaryReview(content);

  // 2. 如果AI审核通过且非高风险，直接放行
  if (!aiResult.isHighRisk && aiResult.moderation.result === 'approved') {
    return { taskId: null, aiResult };
  }

  // 3. 高风险或需修改：进入人工复审队列
  const { addTask, getTaskByContentId } = useModerationStore.getState();

  // 如果该内容已有复审任务，不重复创建
  const existing = getTaskByContentId(contentId);
  if (existing && (existing.status === 'pending' || existing.status === 'reviewing')) {
    return { taskId: existing.id, aiResult };
  }

  // AI初审结果映射到复审任务的aiResult字段
  // needs_modification 或 rejected 都会进入复审队列
  const aiResultForTask: AIResult =
    aiResult.moderation.result === 'rejected' ? 'rejected' : 'needs_modification';

  const taskId = addTask({
    contentId,
    content,
    aiResult: aiResultForTask,
    aiConfidence: aiResult.credibility.score,
    aiReason: aiResult.highRiskReason || aiResult.moderation.reason,
  });

  console.log('[Moderation] 内容进入复审队列:', {
    contentId,
    taskId,
    aiResult: aiResultForTask,
    aiConfidence: aiResult.credibility.score,
    reason: aiResult.highRiskReason,
  });

  return { taskId, aiResult };
};

// 模拟人工复审（24小时内完成）
// 实际项目中由后台审核员手动操作，这里通过定时器模拟
export const simulateHumanReview = (taskId: string): void => {
  const { getTaskById, startReview, approveTask, rejectTask } = useModerationStore.getState();

  const task = getTaskById(taskId);
  if (!task || task.status !== 'pending') return;

  // 随机选择一个模拟审核员
  const reviewer = SIMULATED_REVIEWERS[Math.floor(Math.random() * SIMULATED_REVIEWERS.length)];

  // 标记为复审中
  startReview(taskId, reviewer);
  console.log('[Moderation] 开始人工复审:', { taskId, reviewer });

  // 幂等保护：同一任务不重复设置定时器
  if (reviewTimers.has(taskId)) return;
  // 模拟复审耗时：1-5秒（实际为24小时内）
  const reviewDelay = 1000 + Math.random() * 4000;

  const timer = setTimeout(() => {
    reviewTimers.delete(taskId);
    const currentTask = getTaskById(taskId);
    if (!currentTask || currentTask.status !== 'reviewing') return;

    // 模拟复审决策：
    // - AI置信度越低，被拒绝概率越高
    // - 但整体偏向通过（70%通过率）
    const rejectProbability = (1 - currentTask.aiConfidence) * 0.6 + 0.1;
    const isApproved = Math.random() > rejectProbability;

    if (isApproved) {
      approveTask(taskId, reviewer, '人工复审通过');
      console.log('[Moderation] 复审通过:', { taskId, reviewer });
      pushModerationNotification(currentTask, true);
    } else {
      const note = currentTask.aiReason || '内容不符合社区规范';
      rejectTask(taskId, reviewer, note);
      console.log('[Moderation] 复审拒绝:', { taskId, reviewer, note });
      pushModerationNotification(currentTask, false);
    }
  }, reviewDelay);
  reviewTimers.set(taskId, timer);
};

// 处理待复审队列：为所有pending任务启动模拟复审
export const processPendingReviewQueue = (): void => {
  const { getPendingTasks } = useModerationStore.getState();
  const pendingTasks = getPendingTasks();

  for (const task of pendingTasks) {
    if (task.status === 'pending') {
      simulateHumanReview(task.id);
    }
  }

  console.log('[Moderation] 处理待复审队列:', pendingTasks.length, '个任务');
};

// 检查内容是否在复审中
export const isContentUnderReview = (contentId: string): boolean => {
  const { getTaskByContentId } = useModerationStore.getState();
  const task = getTaskByContentId(contentId);
  if (!task) return false;
  return task.status === 'pending' || task.status === 'reviewing';
};

// 获取内容的复审状态
export const getContentModerationStatus = (
  contentId: string
): ModerationTask | undefined => {
  const { getTaskByContentId } = useModerationStore.getState();
  return getTaskByContentId(contentId);
};

// 手动复审接口（供真实审核员使用）
export const manualApprove = (
  taskId: string,
  reviewer: string,
  note?: string
): void => {
  const { getTaskById, approveTask } = useModerationStore.getState();
  const task = getTaskById(taskId);
  if (!task) return;

  approveTask(taskId, reviewer, note);
  pushModerationNotification(task, true);
  console.log('[Moderation] 手动复审通过:', { taskId, reviewer, note });
};

export const manualReject = (
  taskId: string,
  reviewer: string,
  note?: string
): void => {
  const { getTaskById, rejectTask } = useModerationStore.getState();
  const task = getTaskById(taskId);
  if (!task) return;

  rejectTask(taskId, reviewer, note);
  pushModerationNotification(task, false);
  console.log('[Moderation] 手动复审拒绝:', { taskId, reviewer, note });
};

// 获取复审队列统计
export const getModerationStats = (): {
  total: number;
  pending: number;
  reviewing: number;
  approved: number;
  rejected: number;
} => {
  const { tasks } = useModerationStore.getState();
  return {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    reviewing: tasks.filter((t) => t.status === 'reviewing').length,
    approved: tasks.filter((t) => t.status === 'approved').length,
    rejected: tasks.filter((t) => t.status === 'rejected').length,
  };
};
