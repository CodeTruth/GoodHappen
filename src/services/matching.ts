import Taro from '@tarojs/taro';
import { deepseekChat } from './ai';
import { Kindness } from '@/types/kindness';
import { useNotificationStore, sendSubscribeMessage } from '@/store/notification';

// 匹配结果存储键
const MATCH_STORAGE_KEY = 'haoshi_match_results';

// 匹配结果
export interface MatchResult {
  sourceId: string;       // 见证记录ID（用户A发布的"见证"）
  targetId: string;       // 原始善行记录ID（用户B的记录）
  confidence: number;     // 综合置信度 0-1
  matchFactors: {
    timeMatch: boolean;             // 时间窗口匹配
    locationMatch: boolean;         // 地理位置匹配
    semanticSimilarity: number;     // 语义相似度 0-1
  };
  createdAt: string;
}

// 匹配配置
const TIME_WINDOW_MS = 60 * 60 * 1000;        // ±1小时
const LOCATION_WINDOW_METERS = 500;            // ±500米

// 简化版地理位置（实际项目中应使用经纬度）
interface GeoPoint {
  latitude?: number;
  longitude?: number;
  address?: string;
}

// 解析善行的地理位置（这里简化处理，实际应使用经纬度字段）
const parseLocation = (kindness: Kindness): GeoPoint => {
  // 实际项目中应从 kindness 中读取经纬度
  // 这里基于 location 字符串做简化匹配
  return {
    address: kindness.location,
  };
};

// 计算两个时间戳之间的差值（毫秒）
const getTimeDiff = (time1: string, time2: string): number => {
  const t1 = new Date(time1).getTime();
  const t2 = new Date(time2).getTime();
  return Math.abs(t1 - t2);
};

// 计算两个地理位置之间的距离（米）
// 简化版：基于地址字符串相似度估算
// 实际项目中应使用 Haversine 公式计算经纬度距离
const getLocationDistance = (loc1: GeoPoint, loc2: GeoPoint): number => {
  // 如果有经纬度，使用 Haversine 公式
  if (loc1.latitude && loc1.longitude && loc2.latitude && loc2.longitude) {
    return haversineDistance(
      loc1.latitude, loc1.longitude,
      loc2.latitude, loc2.longitude
    );
  }
  // 没有经纬度时，基于地址字符串相似度估算
  // 地址完全相同视为0米，部分相同视为较近距离
  if (loc1.address && loc2.address) {
    if (loc1.address === loc2.address) return 0;
    // 提取区级地址（如"北京市朝阳区" -> "朝阳区"）
    const extractDistrict = (addr: string): string => {
      const match = addr.match(/([^省]+区|[^省]+县|[^省]+市)/);
      return match ? match[1] : addr;
    };
    if (extractDistrict(loc1.address) === extractDistrict(loc2.address)) {
      return 200; // 同区视为200米内
    }
  }
  return Number.MAX_SAFE_INTEGER;
};

// Haversine 公式计算两点之间距离（米）
const haversineDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number => {
  const R = 6371000; // 地球半径（米）
  const toRad = (deg: number): number => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// 调用AI计算两条善行的语义相似度
const calculateSemanticSimilarity = async (
  content1: string,
  content2: string
): Promise<number> => {
  const systemPrompt = `你是一个语义分析专家。请判断以下两条善行记录是否描述的是同一事件或同一场景。

判断标准：
- 两条记录描述的是同一个具体事件（如都提到了"地铁上让座"），相似度高
- 两条记录描述的是同类事件但不是同一个，相似度中等
- 两条记录描述的是完全不同的事件，相似度低

请只返回一个0到1之间的数字，不要包含其他文字：
- 0.9-1.0：高度相似，很可能是同一事件
- 0.6-0.8：较相似，可能是同一事件
- 0.3-0.5：一般相似，可能是同类事件
- 0.0-0.2：不相似，是不同事件`;

  const userPrompt = `记录A：${content1}\n\n记录B：${content2}\n\n请返回相似度数字：`;

  try {
    const response = await deepseekChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]);
    const score = parseFloat(response.trim());
    if (isNaN(score)) {
      console.warn('[Matching] AI返回的相似度无法解析:', response);
      return 0.3;
    }
    return Math.max(0, Math.min(1, score));
  } catch (error) {
    console.error('[Matching] 计算语义相似度失败:', error);
    return 0.3;
  }
};

// 加载已保存的匹配结果
const loadMatchResults = (): MatchResult[] => {
  try {
    const data = Taro.getStorageSync(MATCH_STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as MatchResult[];
    }
  } catch (e) {
    console.error('[Matching] Load match results failed:', e);
  }
  return [];
};

// 保存匹配结果
const saveMatchResults = (results: MatchResult[]): void => {
  try {
    // 只保留最近100条
    const recent = results.slice(0, 100);
    Taro.setStorageSync(MATCH_STORAGE_KEY, JSON.stringify(recent));
  } catch (e) {
    console.error('[Matching] Save match results failed:', e);
  }
};

// 获取所有匹配结果
export const getMatchResults = (): MatchResult[] => {
  return loadMatchResults();
};

// 检查两条记录是否已经匹配过
const isAlreadyMatched = (
  results: MatchResult[],
  sourceId: string,
  targetId: string
): boolean => {
  return results.some(
    (r) =>
      (r.sourceId === sourceId && r.targetId === targetId) ||
      (r.sourceId === targetId && r.targetId === sourceId)
  );
};

// 推送"你可能被温暖到了"通知
const pushMatchNotification = async (
  source: Kindness,
  target: Kindness,
  confidence: number
): Promise<void> => {
  const { settings, addNotification } = useNotificationStore.getState();

  if (!settings.matchNotificationEnabled) return;

  const title = '你可能被温暖到了';
  const content = `有人记录了与你相似的善行瞬间（匹配度${Math.round(confidence * 100)}%），也许你的善意被看见了呢。`;

  // 站内通知
  if (settings.channels.includes('inApp')) {
    addNotification({
      category: 'warm',
      type: 'matched',
      title,
      content,
      relatedId: target.id,
    });
  }

  // 微信订阅消息
  if (settings.channels.includes('subscribe')) {
    await sendSubscribeMessage(
      'match_template',
      {
        thing1: { value: title },
        thing2: { value: content.slice(0, 20) },
        time3: { value: new Date().toLocaleString('zh-CN') },
      },
      `pages/detail/index?id=${target.id}`
    );
  }
};

// 匹配两条善行记录
export const matchTwoKindness = async (
  source: Kindness,
  target: Kindness
): Promise<MatchResult | null> => {
  // 时间匹配
  const timeDiff = getTimeDiff(source.createdAt, target.createdAt);
  const timeMatch = timeDiff <= TIME_WINDOW_MS;

  // 地理位置匹配
  const loc1 = parseLocation(source);
  const loc2 = parseLocation(target);
  const distance = getLocationDistance(loc1, loc2);
  const locationMatch = distance <= LOCATION_WINDOW_METERS;

  // 语义相似度
  const semanticSimilarity = await calculateSemanticSimilarity(
    source.content,
    target.content
  );

  // 至少要满足一个非语义条件才认为是有效匹配
  if (!timeMatch && !locationMatch) {
    return null;
  }

  // 综合置信度计算
  // 语义相似度权重50%，时间匹配25%，位置匹配25%
  const confidence = Math.min(
    1,
    semanticSimilarity * 0.5 +
    (timeMatch ? 0.25 : 0) +
    (locationMatch ? 0.25 : 0)
  );

  // 置信度阈值
  if (confidence < 0.5) {
    return null;
  }

  return {
    sourceId: source.id,
    targetId: target.id,
    confidence,
    matchFactors: {
      timeMatch,
      locationMatch,
      semanticSimilarity,
    },
    createdAt: new Date().toISOString(),
  };
};

// 批量匹配：在所有善行记录中寻找匹配对
export const runBatchMatching = async (
  allKindness: Kindness[]
): Promise<MatchResult[]> => {
  console.log('[Matching] 开始批量匹配，共', allKindness.length, '条记录');

  // 见证记录作为source，自己做的善行作为target
  const witnesses = allKindness.filter((k) => k.type === 'witness');
  const selfKindness = allKindness.filter((k) => k.type === 'self');

  if (witnesses.length === 0 || selfKindness.length === 0) {
    console.log('[Matching] 缺少见证记录或善行记录，跳过');
    return [];
  }

  const existingResults = loadMatchResults();
  const newResults: MatchResult[] = [];

  for (const witness of witnesses) {
    for (const self of selfKindness) {
      // 跳过同一用户的记录
      if (witness.userId === self.userId) continue;

      // 跳过已匹配过的
      if (isAlreadyMatched(existingResults, witness.id, self.id)) continue;
      if (isAlreadyMatched(newResults, witness.id, self.id)) continue;

      const result = await matchTwoKindness(witness, self);
      if (result) {
        newResults.push(result);
        // 推送通知
        await pushMatchNotification(witness, self, result.confidence);
      }
    }
  }

  // 合并并保存
  if (newResults.length > 0) {
    const allResults = [...newResults, ...existingResults];
    saveMatchResults(allResults);
    console.log('[Matching] 批量匹配完成，新增', newResults.length, '条匹配');
  } else {
    console.log('[Matching] 批量匹配完成，无新增匹配');
  }

  return newResults;
};

// 获取某条善行的所有匹配结果
export const getMatchesByKindnessId = (kindnessId: string): MatchResult[] => {
  const results = loadMatchResults();
  return results.filter(
    (r) => r.sourceId === kindnessId || r.targetId === kindnessId
  );
};

// 模拟每日凌晨批量运行
export const scheduleDailyBatchMatch = (
  allKindness: Kindness[]
): void => {
  // 实际项目中应使用云函数定时触发器
  // 这里模拟：检查今天是否已运行过，未运行则执行
  const today = new Date().toISOString().split('T')[0];
  const lastRunKey = 'haoshi_last_match_run';
  let lastRunDate = '';
  try {
    lastRunDate = Taro.getStorageSync(lastRunKey) || '';
  } catch (e) {
    console.error('[Matching] 读取上次运行日期失败:', e);
  }

  if (lastRunDate === today) {
    console.log('[Matching] 今日已运行批量匹配，跳过');
    return;
  }

  // 异步执行批量匹配
  runBatchMatching(allKindness).then(() => {
    try {
      Taro.setStorageSync(lastRunKey, today);
    } catch (e) {
      console.error('[Matching] 保存运行日期失败:', e);
    }
  }).catch((err) => {
    console.error('[Matching] 每日批量匹配失败:', err);
  });
};
