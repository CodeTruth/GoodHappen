import Taro from '@tarojs/taro';
import { deepseekChat } from './ai';
import { useNotificationStore, sendSubscribeMessage } from '@/store/notification';
import { Kindness } from '@/types/kindness';

// 反思推送存储键
const REFLECTION_STORAGE_KEY = 'haoshi_reflection_history';

// 反思记录
export interface ReflectionRecord {
  id: string;
  date: string;             // YYYY-MM-DD
  kindnessCount: number;    // 当日善行数量
  summary: string;          // AI生成的反思内容
  isEmptyDay: boolean;      // 是否为空记录日
  createdAt: string;
}

// 获取今日日期字符串
const getToday = (): string => {
  return new Date().toISOString().split('T')[0];
};

// 从本地存储加载历史反思记录
const loadHistory = (): ReflectionRecord[] => {
  try {
    const data = Taro.getStorageSync(REFLECTION_STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as ReflectionRecord[];
    }
  } catch (e) {
    console.error('[Reflection] Load history failed:', e);
  }
  return [];
};

// 保存反思记录到本地存储
const saveHistory = (records: ReflectionRecord[]): void => {
  try {
    // 只保留最近30条
    const recent = records.slice(0, 30);
    Taro.setStorageSync(REFLECTION_STORAGE_KEY, JSON.stringify(recent));
  } catch (e) {
    console.error('[Reflection] Save history failed:', e);
  }
};

// 获取历史反思记录
export const getReflectionHistory = (): ReflectionRecord[] => {
  return loadHistory();
};

// 筛选今日的善行记录
export const getTodayKindnessList = (allKindness: Kindness[]): Kindness[] => {
  const today = getToday();
  return allKindness.filter((k) => {
    return k.createdAt.startsWith(today);
  });
};

// 生成反思内容（有记录场景）
const generateReflectionContent = async (kindnessList: Kindness[]): Promise<string> => {
  const count = kindnessList.length;
  // 拼接所有善行内容摘要
  const summaries = kindnessList.map((k, idx) => {
    const typeLabel = k.type === 'witness' ? '见证' : '善行';
    return `${idx + 1}. 【${typeLabel}】${k.content}`;
  }).join('\n');

  const systemPrompt = `你是一位温暖、富有洞察力的反思伙伴。请基于用户今天记录的善行瞬间，生成一段个性化的睡前反思。

要求：
1. 开头使用类似"今天，有${count}个瞬间被你记录了下来……"的句式
2. 中间部分要分析这些瞬间合在一起，描绘的是"一个什么样的人"
3. 结尾给用户一个温柔的睡前祝福
4. 语气温暖、真诚、不浮夸
5. 字数控制在150-250字之间
6. 不要使用emoji`;

  const userPrompt = `用户今天记录了${count}个温暖瞬间：

${summaries}

请生成一段睡前反思，开头使用"今天，有${count}个瞬间被你记录了下来……这些瞬间合在一起，说的是一个什么样的人？"的句式，分析这些瞬间背后是一个什么样的人。`;

  try {
    const response = await deepseekChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    return response;
  } catch (error) {
    console.error('[Reflection] Generate content failed:', error);
    // 失败时返回兜底内容
    return `今天，有${count}个瞬间被你记录了下来……这些瞬间合在一起，说的是一个温柔而坚定的人。愿你在今夜的梦里，也能感受到这份温暖。`;
  }
};

// 生成空记录提醒内容
const generateEmptyDayContent = (): string => {
  return '今天还没有记录温暖瞬间呢。不过没关系，有时候一天什么也不发生，本身就是一种平静的幸福。';
};

// 推送通知到所有渠道
const pushNotification = async (
  title: string,
  content: string,
  relatedId?: string
): Promise<void> => {
  const { settings, addNotification } = useNotificationStore.getState();

  // 站内通知
  if (settings.channels.includes('inApp')) {
    addNotification({
      category: 'warm',
      type: 'reflection',
      title,
      content,
      relatedId,
    });
  }

  // 微信订阅消息
  if (settings.channels.includes('subscribe')) {
    await sendSubscribeMessage(
      'reflection_template',
      {
        thing1: { value: title },
        thing2: { value: content.slice(0, 20) },
        time3: { value: new Date().toLocaleString('zh-CN') },
      },
      'pages/home/index'
    );
  }
};

// 检查是否应该推送（基于设置的时间）
export const shouldPushNow = (): boolean => {
  const { settings } = useNotificationStore.getState();
  if (!settings.reflectionEnabled) return false;

  const now = new Date();
  const [targetHour, targetMinute] = settings.reflectionTime.split(':').map(Number);
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // 在设定时间之后5分钟内触发
  const targetMinutes = targetHour * 60 + targetMinute;
  const currentMinutes = currentHour * 60 + currentMinute;
  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + 5;
};

// 检查今日是否已经推送过
export const hasPushedToday = (): boolean => {
  const today = getToday();
  const history = loadHistory();
  return history.some((r) => r.date === today);
};

// 执行睡前反思推送主流程
export const runReflectionPush = async (
  allKindness: Kindness[]
): Promise<ReflectionRecord | null> => {
  const { settings } = useNotificationStore.getState();

  // 检查开关
  if (!settings.reflectionEnabled) {
    console.log('[Reflection] 推送已关闭，跳过');
    return null;
  }

  // 检查今日是否已推送
  if (hasPushedToday()) {
    console.log('[Reflection] 今日已推送，跳过');
    return null;
  }

  const today = getToday();
  const todayKindness = getTodayKindnessList(allKindness);
  const isEmptyDay = todayKindness.length === 0;

  // 空记录日：检查是否开启空记录提醒
  if (isEmptyDay && !settings.emptyDayReminderEnabled) {
    console.log('[Reflection] 今日无记录且未开启空记录提醒，跳过');
    return null;
  }

  let summary: string;
  let title: string;

  if (isEmptyDay) {
    // 空记录场景
    summary = generateEmptyDayContent();
    title = '今日小提醒';
  } else {
    // 有记录场景：调用AI生成反思
    summary = await generateReflectionContent(todayKindness);
    title = `今日反思 · ${todayKindness.length}个温暖瞬间`;
  }

  // 推送通知
  await pushNotification(title, summary);

  // 保存反思记录
  const record: ReflectionRecord = {
    id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: today,
    kindnessCount: todayKindness.length,
    summary,
    isEmptyDay,
    createdAt: new Date().toISOString(),
  };

  const history = loadHistory();
  history.unshift(record);
  saveHistory(history);

  console.log('[Reflection] 推送完成:', record);
  return record;
};

// 手动触发反思（用于测试或用户主动点击）
export const triggerReflectionManually = async (
  allKindness: Kindness[]
): Promise<ReflectionRecord | null> => {
  // 手动触发时跳过时间检查和"今日已推送"检查
  const today = getToday();
  const todayKindness = getTodayKindnessList(allKindness);
  const isEmptyDay = todayKindness.length === 0;

  const { settings } = useNotificationStore.getState();
  if (isEmptyDay && !settings.emptyDayReminderEnabled) {
    return null;
  }

  let summary: string;
  let title: string;

  if (isEmptyDay) {
    summary = generateEmptyDayContent();
    title = '今日小提醒';
  } else {
    summary = await generateReflectionContent(todayKindness);
    title = `今日反思 · ${todayKindness.length}个温暖瞬间`;
  }

  await pushNotification(title, summary);

  const record: ReflectionRecord = {
    id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    date: today,
    kindnessCount: todayKindness.length,
    summary,
    isEmptyDay,
    createdAt: new Date().toISOString(),
  };

  // 替换今日已有的记录
  const history = loadHistory().filter((r) => r.date !== today);
  history.unshift(record);
  saveHistory(history);

  return record;
};
