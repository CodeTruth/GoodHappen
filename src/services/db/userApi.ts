/**
 * 用户相关 CRUD 操作
 * 表：profiles（对应 Supabase Auth 的 users 表扩展）
 */

import { dbClient } from './client';
import type { DbUser, DbPagination, DbOrderBy } from './schema';

const TABLE = 'profiles';

// ============================================
// 查询
// ============================================

/**
 * 根据用户 ID 获取用户资料
 * @param userId 用户 ID
 * @returns DbUser | null
 */
export const getUserProfile = async (userId: string): Promise<DbUser | null> => {
  if (!userId) {
    console.warn('[userApi] getUserProfile called with empty userId');
    return null;
  }
  return dbClient.selectOne<DbUser>(TABLE, { id: userId });
};

/**
 * 根据手机号查找用户
 * @param phone 手机号
 * @returns DbUser | null
 */
export const getUserByPhone = async (phone: string): Promise<DbUser | null> => {
  if (!phone) return null;
  return dbClient.selectOne<DbUser>(TABLE, { phone });
};

/**
 * 批量获取用户资料
 * @param userIds 用户 ID 数组
 * @returns DbUser[]
 */
export const getUsersByIds = async (userIds: string[]): Promise<DbUser[]> => {
  if (!userIds || userIds.length === 0) return [];
  const { data } = await dbClient.selectMany<DbUser>(TABLE, {
    inFilters: { id: userIds },
  });
  return data;
};

/**
 * 获取用户列表（支持分页和排序）
 * @param options 分页和排序选项
 * @returns { data: DbUser[]; count: number | null }
 */
export const getUserList = async (options?: {
  pagination?: DbPagination;
  orderBy?: DbOrderBy;
}): Promise<{ data: DbUser[]; count: number | null }> => {
  return dbClient.selectMany<DbUser>(TABLE, {
    orderBy: options?.orderBy,
    pagination: options?.pagination,
  });
};

/**
 * 搜索用户（按昵称模糊匹配）
 * 注意：Supabase 不直接支持 like 的通用封装，此处使用原始客户端
 * @param keyword 关键词
 * @param limit 限制数量
 * @returns DbUser[]
 */
export const searchUsersByName = async (keyword: string, limit: number = 20): Promise<DbUser[]> => {
  if (!dbClient.isAvailable()) return [];
  if (!keyword || keyword.trim().length === 0) return [];

  try {
    const { data, error } = await dbClient.raw
      .from(TABLE)
      .select('*')
      .ilike('name', `%${keyword}%`)
      .limit(limit);

    if (error) {
      console.error(`[DB_ERROR] searchUsersByName | table=${TABLE} | msg=${error.message}`);
      return [];
    }

    return (data as DbUser[]) || [];
  } catch (e) {
    console.error(`[DB_ERROR] searchUsersByName | table=${TABLE} | msg=${e instanceof Error ? e.message : String(e)}`);
    return [];
  }
};

// ============================================
// 写入
// ============================================

/**
 * 创建用户资料
 * @param data 用户资料数据
 * @returns DbUser | null
 */
export const createUserProfile = async (data: Omit<DbUser, 'id' | 'created_at'> & { id: string }): Promise<DbUser | null> => {
  if (!data.id) {
    console.warn('[userApi] createUserProfile called without id');
    return null;
  }
  return dbClient.insertOne<DbUser>(TABLE, {
    ...data,
    created_at: new Date().toISOString(),
  });
};

/**
 * 更新用户资料
 * @param userId 用户 ID
 * @param data 部分更新数据
 * @returns DbUser | null
 */
export const updateUserProfile = async (
  userId: string,
  data: Partial<Omit<DbUser, 'id' | 'created_at'>>
): Promise<DbUser | null> => {
  if (!userId) {
    console.warn('[userApi] updateUserProfile called with empty userId');
    return null;
  }
  return dbClient.updateOne<DbUser>(TABLE, userId, {
    ...data,
    updated_at: new Date().toISOString(),
  });
};

/**
 * 更新用户福气值
 * @param userId 用户 ID
 * @param delta 变动值（正数增加，负数减少）
 * @returns DbUser | null
 */
export const updateUserBlessingValue = async (userId: string, delta: number): Promise<DbUser | null> => {
  if (!userId) return null;

  const user = await getUserProfile(userId);
  if (!user) return null;

  return updateUserProfile(userId, {
    blessing_value: Math.max(0, (user.blessing_value || 0) + delta),
  });
};

/**
 * 增加用户善行计数
 * @param userId 用户 ID
 * @param delta 变动值（默认 +1）
 * @returns DbUser | null
 */
export const incrementKindnessCount = async (userId: string, delta: number = 1): Promise<DbUser | null> => {
  if (!userId) return null;

  const user = await getUserProfile(userId);
  if (!user) return null;

  return updateUserProfile(userId, {
    kindness_count: Math.max(0, (user.kindness_count || 0) + delta),
  });
};

/**
 * 增加用户见证计数
 * @param userId 用户 ID
 * @param delta 变动值（默认 +1）
 * @returns DbUser | null
 */
export const incrementWitnessCount = async (userId: string, delta: number = 1): Promise<DbUser | null> => {
  if (!userId) return null;

  const user = await getUserProfile(userId);
  if (!user) return null;

  return updateUserProfile(userId, {
    witness_count: Math.max(0, (user.witness_count || 0) + delta),
  });
};

/**
 * 添加用户徽章
 * @param userId 用户 ID
 * @param badge 徽章标识
 * @returns DbUser | null
 */
export const addUserBadge = async (userId: string, badge: string): Promise<DbUser | null> => {
  if (!userId || !badge) return null;

  const user = await getUserProfile(userId);
  if (!user) return null;

  const badges = user.badges || [];
  if (badges.includes(badge)) return user;

  return updateUserProfile(userId, {
    badges: [...badges, badge],
  });
};

/**
 * 删除用户资料
 * @param userId 用户 ID
 * @returns boolean
 */
export const deleteUserProfile = async (userId: string): Promise<boolean> => {
  if (!userId) return false;
  return dbClient.deleteOne(TABLE, userId);
};
