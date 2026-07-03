/**
 * 善行记录相关 CRUD 操作
 * 表：kindness_records
 */

import { dbClient } from './client';
import type { DbKindness, DbPagination, DbOrderBy } from './schema';

const TABLE = 'kindness_records';

// ============================================
// 查询
// ============================================

/**
 * 根据 ID 获取单条善行记录
 * @param id 记录 ID
 * @returns DbKindness | null
 */
export const getKindnessById = async (id: string): Promise<DbKindness | null> => {
  if (!id) {
    console.warn('[kindnessApi] getKindnessById called with empty id');
    return null;
  }
  return dbClient.selectOne<DbKindness>(TABLE, { id });
};

/**
 * 查询善行列表（支持多种过滤条件）
 * @param filters 过滤条件
 * @param pagination 分页参数
 * @param orderBy 排序参数
 * @returns { data: DbKindness[]; count: number | null }
 */
export const getKindnessList = async (
  filters?: {
    userId?: string;
    type?: 'self' | 'witness';
    circleId?: string;
    visibleScope?: string;
    isAnonymous?: boolean;
    tag?: string;
  },
  pagination?: DbPagination,
  orderBy?: DbOrderBy
): Promise<{ data: DbKindness[]; count: number | null }> => {
  const dbFilters: Record<string, unknown> = {};

  if (filters?.userId) dbFilters.user_id = filters.userId;
  if (filters?.type) dbFilters.type = filters.type;
  if (filters?.circleId) dbFilters.circle_id = filters.circleId;
  if (filters?.visibleScope) dbFilters.visible_scope = filters.visibleScope;
  if (filters?.isAnonymous !== undefined) dbFilters.is_anonymous = filters.isAnonymous;

  // 标签过滤使用原始客户端（contains 操作）
  if (filters?.tag) {
    if (!dbClient.isAvailable()) return { data: [], count: null };
    try {
      const { data, error, count } = await dbClient.raw
        .from(TABLE)
        .select('*', { count: 'exact' })
        .contains('tags', [filters.tag])
        .order(orderBy?.column || 'created_at', { ascending: orderBy?.ascending ?? false })
        .range(
          ((pagination?.page || 1) - 1) * (pagination?.pageSize || 20),
          ((pagination?.page || 1) - 1) * (pagination?.pageSize || 20) + (pagination?.pageSize || 20) - 1
        );

      if (error) {
        console.error(`[DB_ERROR] getKindnessList(tag) | table=${TABLE} | msg=${error.message}`);
        return { data: [], count: null };
      }
      return { data: (data as DbKindness[]) || [], count };
    } catch (e) {
      console.error(`[DB_ERROR] getKindnessList(tag) | table=${TABLE} | msg=${e instanceof Error ? e.message : String(e)}`);
      return { data: [], count: null };
    }
  }

  return dbClient.selectMany<DbKindness>(TABLE, {
    filters: Object.keys(dbFilters).length > 0 ? dbFilters : undefined,
    orderBy,
    pagination,
  });
};

/**
 * 获取用户的所有善行记录
 * @param userId 用户 ID
 * @param pagination 分页参数
 * @returns { data: DbKindness[]; count: number | null }
 */
export const getUserKindnessList = async (
  userId: string,
  pagination?: DbPagination
): Promise<{ data: DbKindness[]; count: number | null }> => {
  if (!userId) return { data: [], count: null };
  return getKindnessList({ userId }, pagination);
};

/**
 * 获取圈子的善行记录
 * @param circleId 圈子 ID
 * @param pagination 分页参数
 * @returns { data: DbKindness[]; count: number | null }
 */
export const getCircleKindnessList = async (
  circleId: string,
  pagination?: DbPagination
): Promise<{ data: DbKindness[]; count: number | null }> => {
  if (!circleId) return { data: [], count: null };
  return getKindnessList({ circleId }, pagination);
};

// ============================================
// 写入
// ============================================

/**
 * 创建善行记录
 * @param data 善行数据（不含 id 和 created_at）
 * @returns DbKindness | null
 */
export const createKindness = async (
  data: Omit<DbKindness, 'id' | 'created_at' | 'likes' | 'comments'>
): Promise<DbKindness | null> => {
  if (!data.user_id) {
    console.warn('[kindnessApi] createKindness called without user_id');
    return null;
  }

  return dbClient.insertOne<DbKindness>(TABLE, {
    ...data,
    likes: 0,
    comments: 0,
    created_at: new Date().toISOString(),
  });
};

/**
 * 更新善行记录
 * @param id 记录 ID
 * @param data 部分更新数据
 * @returns DbKindness | null
 */
export const updateKindness = async (
  id: string,
  data: Partial<Omit<DbKindness, 'id' | 'created_at'>>
): Promise<DbKindness | null> => {
  if (!id) {
    console.warn('[kindnessApi] updateKindness called with empty id');
    return null;
  }
  return dbClient.updateOne<DbKindness>(TABLE, id, data);
};

/**
 * 删除善行记录
 * @param id 记录 ID
 * @returns boolean
 */
export const deleteKindness = async (id: string): Promise<boolean> => {
  if (!id) {
    console.warn('[kindnessApi] deleteKindness called with empty id');
    return false;
  }
  return dbClient.deleteOne(TABLE, id);
};

// ============================================
// 计数与聚合
// ============================================

/**
 * 获取用户善行数量
 * @param userId 用户 ID
 * @returns number | null
 */
export const getUserKindnessCount = async (userId: string): Promise<number | null> => {
  if (!userId) return null;
  return dbClient.count(TABLE, { user_id: userId });
};

/**
 * 增加点赞数
 * @param id 记录 ID
 * @param delta 变动值（默认 +1）
 * @returns DbKindness | null
 */
export const incrementLikes = async (id: string, delta: number = 1): Promise<DbKindness | null> => {
  if (!id) return null;

  const record = await getKindnessById(id);
  if (!record) return null;

  return updateKindness(id, {
    likes: Math.max(0, (record.likes || 0) + delta),
  });
};

/**
 * 增加评论数
 * @param id 记录 ID
 * @param delta 变动值（默认 +1）
 * @returns DbKindness | null
 */
export const incrementComments = async (id: string, delta: number = 1): Promise<DbKindness | null> => {
  if (!id) return null;

  const record = await getKindnessById(id);
  if (!record) return null;

  return updateKindness(id, {
    comments: Math.max(0, (record.comments || 0) + delta),
  });
};
