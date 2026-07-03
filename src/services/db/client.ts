/**
 * Supabase 客户端封装
 * 提供统一错误处理、fallback 机制和通用 CRUD 方法
 */

import { supabase, isSupabaseAvailable } from '@/services/supabase';
import type { PostgrestError } from '@supabase/supabase-js';
import type { DbPagination, DbOrderBy } from './schema';

// ============================================
// 错误处理工具
// ============================================

/** 统一错误日志格式 */
const logDbError = (operation: string, table: string, error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[DB_ERROR] ${operation} | table=${table} | msg=${message}`);
};

/** 构建 Supabase 不可用的统一错误 */
const supabaseUnavailableError = (): Error => {
  return new Error('Supabase 不可用，请检查环境变量配置');
};

// ============================================
// 通用 CRUD 封装
// ============================================

async function selectOne<T>(
  table: string,
  filters: Record<string, unknown>
): Promise<T | null> {
  if (!isSupabaseAvailable()) {
    return null;
  }

  try {
    let query = supabase.from(table).select('*');
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data, error } = await query.single();

    if (error) {
      // 没有记录不算错误
      if ((error as PostgrestError).code === 'PGRST116') {
        return null;
      }
      logDbError('selectOne', table, error);
      return null;
    }

    return (data as T) || null;
  } catch (e) {
    logDbError('selectOne', table, e);
    return null;
  }
}

async function selectMany<T>(
  table: string,
  options?: {
    filters?: Record<string, unknown>;
    inFilters?: Record<string, unknown[]>;
    orderBy?: DbOrderBy;
    pagination?: DbPagination;
  }
): Promise<{ data: T[]; count: number | null }> {
  if (!isSupabaseAvailable()) {
    return { data: [], count: null };
  }

  try {
    let query = supabase.from(table).select('*', { count: 'exact' });

    // 等值过滤
    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    // in 过滤
    if (options?.inFilters) {
      Object.entries(options.inFilters).forEach(([key, values]) => {
        if (Array.isArray(values) && values.length > 0) {
          query = query.in(key, values);
        }
      });
    }

    // 排序
    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? false,
      });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    // 分页
    if (options?.pagination) {
      const page = Math.max(1, options.pagination.page || 1);
      const pageSize = Math.min(100, Math.max(1, options.pagination.pageSize || 20));
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    if (error) {
      logDbError('selectMany', table, error);
      return { data: [], count: null };
    }

    return { data: (data as T[]) || [], count };
  } catch (e) {
    logDbError('selectMany', table, e);
    return { data: [], count: null };
  }
}

async function insertOne<T>(table: string, data: Record<string, unknown>): Promise<T | null> {
  if (!isSupabaseAvailable()) {
    return null;
  }

  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data as never)
      .select()
      .single();

    if (error) {
      logDbError('insertOne', table, error);
      return null;
    }

    return (result as T) || null;
  } catch (e) {
    logDbError('insertOne', table, e);
    return null;
  }
}

async function insertMany<T>(table: string, data: Record<string, unknown>[]): Promise<T[] | null> {
  if (!isSupabaseAvailable()) {
    return null;
  }

  try {
    const { data: result, error } = await supabase
      .from(table)
      .insert(data as never)
      .select();

    if (error) {
      logDbError('insertMany', table, error);
      return null;
    }

    return (result as T[]) || null;
  } catch (e) {
    logDbError('insertMany', table, e);
    return null;
  }
}

async function updateOne<T>(
  table: string,
  id: string,
  data: Record<string, unknown>
): Promise<T | null> {
  if (!isSupabaseAvailable()) {
    return null;
  }

  try {
    const { data: result, error } = await supabase
      .from(table)
      .update(data as never)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logDbError('updateOne', table, error);
      return null;
    }

    return (result as T) || null;
  } catch (e) {
    logDbError('updateOne', table, e);
    return null;
  }
}

async function updateWhere<T>(
  table: string,
  filters: Record<string, unknown>,
  data: Record<string, unknown>
): Promise<T[] | null> {
  if (!isSupabaseAvailable()) {
    return null;
  }

  try {
    let query = supabase.from(table).update(data as never);
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { data: result, error } = await query.select();

    if (error) {
      logDbError('updateWhere', table, error);
      return null;
    }

    return (result as T[]) || null;
  } catch (e) {
    logDbError('updateWhere', table, e);
    return null;
  }
}

async function deleteOne(table: string, id: string): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    return false;
  }

  try {
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      logDbError('deleteOne', table, error);
      return false;
    }

    return true;
  } catch (e) {
    logDbError('deleteOne', table, e);
    return false;
  }
}

async function deleteWhere(table: string, filters: Record<string, unknown>): Promise<boolean> {
  if (!isSupabaseAvailable()) {
    return false;
  }

  try {
    let query = supabase.from(table).delete();
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });

    const { error } = await query;

    if (error) {
      logDbError('deleteWhere', table, error);
      return false;
    }

    return true;
  } catch (e) {
    logDbError('deleteWhere', table, e);
    return false;
  }
}

async function count(table: string, filters?: Record<string, unknown>): Promise<number | null> {
  if (!isSupabaseAvailable()) {
    return null;
  }

  try {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { count, error } = await query;

    if (error) {
      logDbError('count', table, error);
      return null;
    }

    return count;
  } catch (e) {
    logDbError('count', table, e);
    return null;
  }
}

async function rpc<T>(functionName: string, params?: Record<string, unknown>): Promise<T | null> {
  if (!isSupabaseAvailable()) {
    return null;
  }

  try {
    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      logDbError('rpc', functionName, error);
      return null;
    }

    return (data as T) || null;
  } catch (e) {
    logDbError('rpc', functionName, e);
    return null;
  }
}

// ============================================
// 导出 dbClient
// ============================================

export const dbClient = {
  /** 查询单条记录 */
  selectOne,
  /** 查询多条记录 */
  selectMany,
  /** 插入单条记录 */
  insertOne,
  /** 插入多条记录 */
  insertMany,
  /** 更新单条记录（按 id） */
  updateOne,
  /** 按条件更新 */
  updateWhere,
  /** 删除单条记录（按 id） */
  deleteOne,
  /** 按条件删除 */
  deleteWhere,
  /** 计数 */
  count,
  /** 调用 RPC 函数 */
  rpc,
  /** 检查 Supabase 是否可用 */
  isAvailable: isSupabaseAvailable,
  /** 获取原始 supabase 客户端（高级场景使用） */
  get raw() {
    return supabase;
  },
  /** 获取统一错误 */
  get unavailableError() {
    return supabaseUnavailableError();
  },
};
