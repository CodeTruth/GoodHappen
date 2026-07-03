/**
 * 种子数据加载服务
 * 首次启动时将种子数据注入到各 Store 中，提供真实的演示数据
 */

import Taro from '@tarojs/taro';
import {
  SEED_USERS,
  SEED_KINDNESS_LIST,
  SEED_CIRCLE,
  SEED_CHECKINS,
  SEED_FORTUNE_RECORDS,
} from '@/data/seed-data';
import type { SeedKindness, SeedUser } from '@/data/seed-data';
import { Kindness } from '@/types/kindness';
import { useKindnessStore } from '@/store/kindness';
import { useCircleStore } from '@/store/circle';
import { useCheckinStore } from '@/store/checkin';
import { useFortuneStore } from '@/store/fortune';
import { useInteractionStore } from '@/store/interaction';

const SEED_LOADED_KEY = 'haoshi_seed_loaded_v2';

/** 检查种子数据是否已加载过 */
export const isSeedLoaded = (): boolean => {
  return Taro.getStorageSync(SEED_LOADED_KEY) === 'true';
};

/** 标记种子数据已加载 */
const markSeedLoaded = (): void => {
  Taro.setStorageSync(SEED_LOADED_KEY, 'true');
};

/** 将中文品类转换为 CheckinCategory */
const toCheckinCategory = (c: string): 'warm' | 'growth' | 'positive' => {
  const map: Record<string, 'warm' | 'growth' | 'positive'> = {
    '温暖的事': 'warm',
    '成长的事': 'growth',
    '正能量的事': 'positive',
  };
  return map[c] || 'warm';
};

/** 将种子善行转换为 Kindness */
const toKindness = (s: SeedKindness): Kindness => ({
  id: s.id,
  userId: s.userId,
  userName: s.userName,
  userAvatar: s.userAvatar,
  content: s.content,
  type: s.type,
  tags: s.tags,
  images: s.images,
  video: s.video ?? undefined,
  location: s.location ?? undefined,
  visibleScope: s.visibleScope,
  circleId: s.circleId ?? undefined,
  aiResponse: undefined,
  credibilityScore: s.credibilityScore,
  blessingValue: s.blessingValue,
  isAnonymous: s.isAnonymous,
  createdAt: s.createdAt,
  likes: s.likes,
  comments: s.comments,
});

/** 生成模拟互动数据 */
const generateInteractions = (kindnessList: readonly SeedKindness[]): void => {
  const is = useInteractionStore.getState();
  const newLikes: Record<string, any[]> = { ...is.likes };
  const newComments: Record<string, any[]> = { ...is.comments };

  const commentTexts = [
    '太温暖了！', '为你的善行点赞！', '这个世界因为有你而更美好',
    '正能量满满！', '好人一生平安', '向你学习！',
    '这才是真正的少年榜样', '感动到我了', '默默做好事的人最帅',
    '希望能有更多人像你一样',
  ];

  kindnessList.forEach((k) => {
    if (k.likes > 0 && k.comments > 0) {
      const likeUsers = SEED_USERS
        .filter((u) => u.id !== k.userId)
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(k.likes, 20));

      newLikes[k.id] = likeUsers.map((u) => ({
        kindnessId: k.id,
        userId: u.id,
        createdAt: k.createdAt,
      }));

      const commentUsers = SEED_USERS
        .filter((u) => u.id !== k.userId)
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(k.comments, 10));

      newComments[k.id] = commentUsers.map((u, i) => ({
        id: `${k.id}_comment_${i}`,
        kindnessId: k.id,
        userId: u.id,
        userName: u.name,
        userAvatar: u.avatar,
        content: commentTexts[i % commentTexts.length],
        createdAt: new Date(
          new Date(k.createdAt).getTime() + (i + 1) * 3600000
        ).toISOString(),
      }));
    }
  });

  useInteractionStore.setState({
    likes: { ...is.likes, ...newLikes },
    comments: { ...is.comments, ...newComments },
  });
  useInteractionStore.getState().saveToStorage();
};

/**
 * 加载种子数据到所有 Store
 */
export const loadSeedData = async (): Promise<void> => {
  if (isSeedLoaded()) {
    console.log('[SeedData] Already loaded, skipping.');
    return;
  }

  console.log('[SeedData] Loading seed data...');
  const startTime = Date.now();

  try {
    // 1. 注入善行记录
    const ks = useKindnessStore.getState();
    const existingIds = new Set(ks.publishedList.map((k) => k.id));
    const newKindness: Kindness[] = [];
    SEED_KINDNESS_LIST.forEach((s) => {
      if (!existingIds.has(s.id)) {
        newKindness.push(toKindness(s));
      }
    });

    if (newKindness.length > 0) {
      useKindnessStore.setState({
        publishedList: [...newKindness, ...ks.publishedList],
      });
      useKindnessStore.getState().saveToStorage();
    }

    // 2. 注入善行圈
    const cs = useCircleStore.getState();
    const existingCircleIds = new Set(cs.circles.map((c) => c.id));
    if (!existingCircleIds.has(SEED_CIRCLE.id)) {
      const members = SEED_USERS.slice(0, 51).map((u, idx) => ({
        id: `cm_${SEED_CIRCLE.id}_${u.id}`,
        userId: u.id,
        userName: u.name,
        userAvatar: u.avatar,
        role: u.id === 'user_051' ? 'admin' as const : 'member' as const,
        joinedAt: SEED_CIRCLE.createdAt,
        memberNumber: idx + 1,
        lastCheckinDate: undefined,
        isRealName: false,
        kindnessCount: Math.floor(Math.random() * 10) + 1,
      }));

      useCircleStore.setState({
        circles: [
          ...cs.circles,
          {
            id: SEED_CIRCLE.id,
            name: SEED_CIRCLE.name,
            type: 'class' as const,
            accessType: 'open' as const,
            description: SEED_CIRCLE.description,
            adminId: SEED_CIRCLE.creatorId,
            createdAt: SEED_CIRCLE.createdAt,
            classCode: 'SUN2024',
            requireRealName: false,
            members,
          },
        ],
      });
      useCircleStore.getState().saveToStorage();
    }

    // 3. 注入签到记录
    const cis = useCheckinStore.getState();
    const existingCheckinIds = new Set(cis.records.map((r) => r.id));
    const newCheckins: any[] = [];
    SEED_CHECKINS.forEach((c) => {
      if (!existingCheckinIds.has(c.id)) {
        const user = SEED_USERS.find((u) => u.id === c.userId);
        newCheckins.push({
          id: c.id,
          userId: c.userId,
          userName: user?.name || '用户',
          userAvatar: user?.avatar || '',
          circleId: undefined,
          category: toCheckinCategory(c.category),
          subcategory: c.subcategory,
          contentType: 'text',
          content: c.content,
          images: [],
          visibility: 'public',
          streakDays: c.streakDays,
          createdAt: c.createdAt,
          date: c.date,
        });
      }
    });
    if (newCheckins.length > 0) {
      useCheckinStore.setState({
        records: [...newCheckins, ...cis.records],
      });
      useCheckinStore.getState().saveToStorage();
    }

    // 4. 注入福气值交易记录
    const fs = useFortuneStore.getState();
    const existingFortuneIds = new Set(fs.transactions.map((t) => t.id));
    const newFortuneRecords: any[] = [];
    SEED_FORTUNE_RECORDS.forEach((f) => {
      if (!existingFortuneIds.has(f.id)) {
        newFortuneRecords.push({
          id: f.id,
          type: f.type,
          amount: f.amount,
          description: f.description,
          relatedId: f.relatedId || '',
          balanceAfter: f.balanceAfter,
          createdAt: f.createdAt,
        });
      }
    });
    if (newFortuneRecords.length > 0) {
      const totalNewFortune = newFortuneRecords.reduce((sum, r) => sum + r.amount, 0);
      useFortuneStore.setState({
        totalFortune: fs.totalFortune + totalNewFortune,
        highestFortune: Math.max(fs.highestFortune, fs.totalFortune + totalNewFortune),
        transactions: [...newFortuneRecords, ...fs.transactions],
      });
      useFortuneStore.getState().saveToStorage();
    }

    // 5. 生成互动数据
    generateInteractions(SEED_KINDNESS_LIST);

    markSeedLoaded();

    const elapsed = Date.now() - startTime;
    console.log(
      `[SeedData] Loaded in ${elapsed}ms: ${SEED_USERS.length} users, ${newKindness.length} kindness, 1 circle, ${newCheckins.length} checkins, ${newFortuneRecords.length} fortune records`
    );
  } catch (e) {
    console.error('[SeedData] Failed to load seed data:', e);
  }
};

/** 重置种子数据（调试用） */
export const resetSeedData = async (): Promise<void> => {
  Taro.removeStorageSync(SEED_LOADED_KEY);
  await loadSeedData();
};

/** 获取种子用户信息 */
export const getSeedUser = (userId: string): SeedUser | undefined => {
  return SEED_USERS.find((u) => u.id === userId);
};

/** 获取善行圈成员列表 */
export const getCircleMembers = (circleId: string): SeedUser[] => {
  if (circleId === 'circle_sunshine_2024') {
    return SEED_USERS.slice(0, 51);
  }
  return [];
};
