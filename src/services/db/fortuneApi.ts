/**
 * 福气值相关 CRUD 操作
 * 表：fortune_records
 */

import { dbClient } from './client';
import type { DbFortuneRecord, DbPagination, DbOrderBy } from './schema';

const TABLE = 'fortune_records';

// ============================================
// 查询
// ============================================

/**
 * 获取用户的福气值交易记录
 * @param userId 用户 ID
 * @param options 分页和排序选项
 * @returns { data: DbFortuneRecord[]; count: number | null }
 */
export const getFortuneRecords = async (
  userId: string,
  options?: {
    type?: DbFortuneRecord['type'];
    pagination?: DbPagination;
    orderBy?: DbOrderBy;
  }
): Promise<{ data: DbFortuneRecord[]; count: number | null }> => {
  if (!userId) {
    console.warn('[fortuneApi] getFortuneRecords called with empty userId');
    return { data: [], count: null };
  }

  const filters: Record<string, unknown> = { user_id: userId };
  if (options?.type) filters.type = options.type;

  return dbClient.selectMany<DbFortuneRecord>(TABLE, {
    filters,
    orderBy: options?.orderBy,
    pagination: options?.pagination,
  });
};

/**
 * 获取单条交易记录
 * @param id 交易 ID
 * @returns DbFortuneRecord | null
 */
export const getFortuneRecordById = async (id: string): Promise<DbFortuneRecord | null> => {
  if (!id) return null;
  return dbClient.selectOne<DbFortuneRecord>(TABLE, { id });
};

/**
 * 获取用户最新的福气值余额
 * 通过查询最新一条交易记录的 balance_after
 * @param userId 用户 ID
 * @returns number | null
 */
export const getUserFortune = async (userId: string): Promise<number | null> => {
  if (!userId) return null;

  if (!dbClient.isAvailable()) return null;

  try {
    const { data, error } = await dbClient.raw
      .from(TABLE)
      .select('balance_after')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      // 没有记录则余额为 0
      if ((error as { code?: string }).code === 'PGRST116') {
        return 0;
      }
      console.error(`[DB_ERROR] getUserFortune | table=${TABLE} | msg=${error.message}`);
      return null;
    }

    return (data as { balance_after: number })?.balance_after ?? 0;
  } catch (e) {
    console.error(`[DB_ERROR] getUserFortune | table=${TABLE} | msg=${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
};

/**
 * 获取用户指定类型的福气值汇总
 * @param userId 用户 ID
 * @param type 交易类型
 * @returns 该类型的总变动值
 */
export const getFortuneSumByType = async (
  userId: string,
  type: DbFortuneRecord['type']
): Promise<number | null> => {
  if (!userId || !type) return null;

  if (!dbClient.isAvailable()) return null;

  try {
    const { data, error } = await dbClient.raw
      .from(TABLE)
      .select('amount')
      .eq('user_id', userId)
      .eq('type', type);

    if (error) {
      console.error(`[DB_ERROR] getFortuneSumByType | table=${TABLE} | msg=${error.message}`);
      return null;
    }

    const records = (data as Array<{ amount: number }>) || [];
    return records.reduce((sum, r) => sum + (r.amount || 0), 0);
  } catch (e) {
    console.error(`[DB_ERROR] getFortuneSumByType | table=${TABLE} | msg=${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
};

// ============================================
// 写入
// ============================================

/**
 * 添加福气值交易记录
 * @param data 交易数据（不含 id 和 created_at）
 * @returns DbFortuneRecord | null
 */
export const addFortuneRecord = async (
  data: Omit<DbFortuneRecord, 'id' | 'created_at'>
): Promise<DbFortuneRecord | null> => {
  if (!data.user_id) {
    console.warn('[fortuneApi] addFortuneRecord called without user_id');
    return null;
  }

  return dbClient.insertOne<DbFortuneRecord>(TABLE, {
    ...data,
    created_at: new Date().toISOString(),
  });
};

/**
 * 用户获得福气值（earn）
 * @param userId 用户 ID
 * @param amount 金额（正数）
 * @param description 描述
 * @param relatedId 关联记录 ID（如善行 ID）
 * @param circleId 关联圈子 ID（圈子加成）
 * @returns DbFortuneRecord | null
 */
export const earnFortune = async (
  userId: string,
  amount: number,
  description: string,
  relatedId?: string,
  circleId?: string
): Promise<DbFortuneRecord | null> => {
  if (!userId || amount <= 0) return null;

  const currentBalance = await getUserFortune(userId);
  if (currentBalance === null) return null;

  return addFortuneRecord({
    user_id: userId,
    type: 'earn',
    amount,
    description,
    related_id: relatedId,
    balance_after: currentBalance + amount,
    circle_id: circleId,
  });
};

/**
 * 用户消费福气值（spend）
 * @param userId 用户 ID
 * @param amount 金额（正数）
 * @param description 描述
 * @param relatedId 关联记录 ID
 * @returns DbFortuneRecord | null
 */
export const spendFortune = async (
  userId: string,
  amount: number,
  description: string,
  relatedId?: string
): Promise<DbFortuneRecord | null> => {
  if (!userId || amount <= 0) return null;

  const currentBalance = await getUserFortune(userId);
  if (currentBalance === null) return null;
  if (currentBalance < amount) {
    console.warn('[fortuneApi] spendFortune: insufficient balance');
    return null;
  }

  return addFortuneRecord({
    user_id: userId,
    type: 'spend',
    amount: -amount,
    description,
    related_id: relatedId,
    balance_after: currentBalance - amount,
  });
};

/**
 * 转移福气值给另一个用户
 * @param fromUserId 转出用户 ID
 * @param toUserId 转入用户 ID
 * @param amount 金额
 * @param description 描述
 * @returns 两条交易记录或 null
 */
export const transferFortune = async (
  fromUserId: string,
  toUserId: string,
  amount: number,
  description: string
): Promise<{ fromRecord: DbFortuneRecord | null; toRecord: DbFortuneRecord | null }> => {
  if (!fromUserId || !toUserId || amount <= 0) {
    return { fromRecord: null, toRecord: null };
  }

  const fromBalance = await getUserFortune(fromUserId);
  const toBalance = await getUserFortune(toUserId);

  if (fromBalance === null || toBalance === null) {
    return { fromRecord: null, toRecord: null };
  }
  if (fromBalance < amount) {
    console.warn('[fortuneApi] transferFortune: insufficient balance');
    return { fromRecord: null, toRecord: null };
  }

  const fromRecord = await addFortuneRecord({
    user_id: fromUserId,
    type: 'transfer',
    amount: -amount,
    description: `转给 ${toUserId}: ${description}`,
    balance_after: fromBalance - amount,
  });

  const toRecord = await addFortuneRecord({
    user_id: toUserId,
    type: 'transfer',
    amount,
    description: `来自 ${fromUserId}: ${description}`,
    balance_after: toBalance + amount,
  });

  return { fromRecord, toRecord };
};

/**
 * 授予福气值奖励（award）
 * @param userId 用户 ID
 * @param amount 金额
 * @param description 描述
 * @param relatedId 关联记录 ID
 * @returns DbFortuneRecord | null
 */
export const awardFortune = async (
  userId: string,
  amount: number,
  description: string,
  relatedId?: string
): Promise<DbFortuneRecord | null> => {
  if (!userId || amount <= 0) return null;

  const currentBalance = await getUserFortune(userId);
  if (currentBalance === null) return null;

  return addFortuneRecord({
    user_id: userId,
    type: 'award',
    amount,
    description,
    related_id: relatedId,
    balance_after: currentBalance + amount,
  });
};

/**
 * 扣除福气值惩罚（penalty）
 * @param userId 用户 ID
 * @param amount 金额
 * @param description 描述
 * @param relatedId 关联记录 ID
 * @returns DbFortuneRecord | null
 */
export const penaltyFortune = async (
  userId: string,
  amount: number,
  description: string,
  relatedId?: string
): Promise<DbFortuneRecord | null> => {
  if (!userId || amount <= 0) return null;

  const currentBalance = await getUserFortune(userId);
  if (currentBalance === null) return null;

  return addFortuneRecord({
    user_id: userId,
    type: 'penalty',
    amount: -amount,
    description,
    related_id: relatedId,
    balance_after: Math.max(0, currentBalance - amount),
  });
};
