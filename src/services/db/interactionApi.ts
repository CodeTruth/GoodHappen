/**
 * 互动相关 CRUD 操作
 * 表：interactions（点赞/评论）
 */

import { dbClient } from './client';
import type { DbInteraction, DbPagination } from './schema';

const TABLE = 'interactions';

// ============================================
// 点赞相关
// ============================================

/**
 * 切换点赞状态
 * 如果用户已点赞则取消点赞，未点赞则添加点赞
 * @param data 点赞数据
 * @returns { isLiked: boolean; record: DbInteraction | null }
 */
export const toggleLike = async (data: {
  kindnessId: string;
  userId: string;
  userName: string;
  userAvatar: string;
}): Promise<{ isLiked: boolean; record: DbInteraction | null }> => {
  const { kindnessId, userId, userName, userAvatar } = data;

  if (!kindnessId || !userId) {
    console.warn('[interactionApi] toggleLike called with empty kindnessId or userId');
    return { isLiked: false, record: null };
  }

  // 先查询是否已点赞
  const existing = await dbClient.selectOne<DbInteraction>(TABLE, {
    kindness_id: kindnessId,
    user_id: userId,
    type: 'like',
  });

  if (existing) {
    // 取消点赞
    const deleted = await dbClient.deleteOne(TABLE, existing.id);
    if (!deleted) {
      return { isLiked: true, record: existing };
    }
    return { isLiked: false, record: null };
  }

  // 添加点赞
  const record = await dbClient.insertOne<DbInteraction>(TABLE, {
    kindness_id: kindnessId,
    user_id: userId,
    user_name: userName,
    user_avatar: userAvatar,
    type: 'like',
    created_at: new Date().toISOString(),
  });

  return { isLiked: !!record, record };
};

/**
 * 检查用户是否已点赞
 * @param kindnessId 善行记录 ID
 * @param userId 用户 ID
 * @returns boolean
 */
export const hasLiked = async (kindnessId: string, userId: string): Promise<boolean> => {
  if (!kindnessId || !userId) return false;

  const record = await dbClient.selectOne<DbInteraction>(TABLE, {
    kindness_id: kindnessId,
    user_id: userId,
    type: 'like',
  });

  return !!record;
};

/**
 * 获取某条善行的点赞列表
 * @param kindnessId 善行记录 ID
 * @param pagination 分页参数
 * @returns { data: DbInteraction[]; count: number | null }
 */
export const getLikes = async (
  kindnessId: string,
  pagination?: DbPagination
): Promise<{ data: DbInteraction[]; count: number | null }> => {
  if (!kindnessId) return { data: [], count: null };

  return dbClient.selectMany<DbInteraction>(TABLE, {
    filters: { kindness_id: kindnessId, type: 'like' },
    orderBy: { column: 'created_at', ascending: false },
    pagination,
  });
};

/**
 * 获取某条善行的点赞数
 * @param kindnessId 善行记录 ID
 * @returns number | null
 */
export const getLikeCount = async (kindnessId: string): Promise<number | null> => {
  if (!kindnessId) return null;
  return dbClient.count(TABLE, { kindness_id: kindnessId, type: 'like' });
};

// ============================================
// 评论相关
// ============================================

/**
 * 添加评论
 * @param data 评论数据
 * @returns DbInteraction | null
 */
export const addComment = async (data: {
  kindnessId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  mentions?: string[];
}): Promise<DbInteraction | null> => {
  const { kindnessId, userId, userName, userAvatar, content, mentions } = data;

  if (!kindnessId || !userId || !content || content.trim().length === 0) {
    console.warn('[interactionApi] addComment called with invalid data');
    return null;
  }

  return dbClient.insertOne<DbInteraction>(TABLE, {
    kindness_id: kindnessId,
    user_id: userId,
    user_name: userName,
    user_avatar: userAvatar,
    type: 'comment',
    content: content.trim(),
    mentions: mentions || [],
    created_at: new Date().toISOString(),
  });
};

/**
 * 获取某条善行的评论列表
 * @param kindnessId 善行记录 ID
 * @param pagination 分页参数
 * @returns { data: DbInteraction[]; count: number | null }
 */
export const getComments = async (
  kindnessId: string,
  pagination?: DbPagination
): Promise<{ data: DbInteraction[]; count: number | null }> => {
  if (!kindnessId) return { data: [], count: null };

  return dbClient.selectMany<DbInteraction>(TABLE, {
    filters: { kindness_id: kindnessId, type: 'comment' },
    orderBy: { column: 'created_at', ascending: true },
    pagination,
  });
};

/**
 * 获取某条善行的评论数
 * @param kindnessId 善行记录 ID
 * @returns number | null
 */
export const getCommentCount = async (kindnessId: string): Promise<number | null> => {
  if (!kindnessId) return null;
  return dbClient.count(TABLE, { kindness_id: kindnessId, type: 'comment' });
};

/**
 * 删除评论
 * @param commentId 评论 ID
 * @returns boolean
 */
export const deleteComment = async (commentId: string): Promise<boolean> => {
  if (!commentId) return false;

  // 确保只删除评论类型
  if (!dbClient.isAvailable()) return false;

  try {
    const { error } = await dbClient.raw
      .from(TABLE)
      .delete()
      .eq('id', commentId)
      .eq('type', 'comment');

    if (error) {
      console.error(`[DB_ERROR] deleteComment | table=${TABLE} | msg=${error.message}`);
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[DB_ERROR] deleteComment | table=${TABLE} | msg=${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
};

// ============================================
// 通用查询
// ============================================

/**
 * 获取某条善行的所有互动（点赞+评论）
 * @param kindnessId 善行记录 ID
 * @param pagination 分页参数
 * @returns { data: DbInteraction[]; count: number | null }
 */
export const getInteractions = async (
  kindnessId: string,
  pagination?: DbPagination
): Promise<{ data: DbInteraction[]; count: number | null }> => {
  if (!kindnessId) return { data: [], count: null };

  return dbClient.selectMany<DbInteraction>(TABLE, {
    filters: { kindness_id: kindnessId },
    orderBy: { column: 'created_at', ascending: false },
    pagination,
  });
};

/**
 * 获取用户在某条善行的互动记录
 * @param kindnessId 善行记录 ID
 * @param userId 用户 ID
 * @returns DbInteraction[]
 */
export const getUserInteractions = async (
  kindnessId: string,
  userId: string
): Promise<DbInteraction[]> => {
  if (!kindnessId || !userId) return [];

  const { data } = await dbClient.selectMany<DbInteraction>(TABLE, {
    filters: { kindness_id: kindnessId, user_id: userId },
  });

  return data;
};
