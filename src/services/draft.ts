import Taro from '@tarojs/taro';

// 草稿存储 key
const DRAFT_STORAGE_KEY = 'haoshi_drafts';
// 软删除草稿存储 key（用于恢复/审计）
const DELETED_DRAFT_STORAGE_KEY = 'haoshi_drafts_deleted';
// 发布后可编辑窗口（毫秒）：15分钟
export const EDIT_WINDOW_MS = 15 * 60 * 1000;

// 草稿类型定义
export interface Draft {
  id: string;
  content: string;
  recordType: 'self' | 'witness';
  tags: string[];
  images: string[];
  video?: string;
  videoThumb?: string;
  voice?: string;
  voiceText?: string;
  visibleScope: 'private' | 'public' | 'followers' | 'circle'; // N2 三级可见范围
  circleId?: string; // 团体可见时所属的团体ID
  // 已发布记录的 ID（若已发布）
  publishedId?: string;
  // 发布时间戳（用于判断编辑窗口）
  publishedAt?: number;
  createdAt: number;
  updatedAt: number;
  // 软删除标记
  deleted?: boolean;
}

// 内部工具：读取所有草稿
const readAll = (): Draft[] => {
  try {
    const raw = Taro.getStorageSync(DRAFT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Draft[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[Draft] readAll failed:', e);
    return [];
  }
};

// 内部工具：写入所有草稿
const writeAll = (drafts: Draft[]): void => {
  try {
    Taro.setStorageSync(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch (e) {
    console.error('[Draft] writeAll failed:', e);
  }
};

// 生成唯一 ID
const genId = (): string => {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

// 创建或更新草稿（自动判断新建/更新）
export const saveDraft = (input: Partial<Draft> & { id?: string }): Draft => {
  const drafts = readAll();
  const now = Date.now();

  if (input.id) {
    // 更新已有草稿
    const idx = drafts.findIndex(d => d.id === input.id);
    if (idx >= 0) {
      const updated: Draft = {
        ...drafts[idx],
        ...input,
        updatedAt: now,
      } as Draft;
      drafts[idx] = updated;
      writeAll(drafts);
      return updated;
    }
  }

  // 新建草稿
  const draft: Draft = {
    id: genId(),
    content: input.content || '',
    recordType: input.recordType || 'self',
    tags: input.tags || [],
    images: input.images || [],
    video: input.video,
    videoThumb: input.videoThumb,
    voice: input.voice,
    voiceText: input.voiceText,
    visibleScope: input.visibleScope || 'public',
    circleId: input.circleId,
    createdAt: now,
    updatedAt: now,
  };
  drafts.push(draft);
  writeAll(drafts);
  return draft;
};

// 获取单个草稿
export const getDraft = (id: string): Draft | null => {
  const drafts = readAll();
  return drafts.find(d => d.id === id && !d.deleted) || null;
};

// 获取所有未删除草稿（按更新时间倒序）
export const listDrafts = (): Draft[] => {
  const drafts = readAll();
  return drafts
    .filter(d => !d.deleted)
    .sort((a, b) => b.updatedAt - a.updatedAt);
};

// 软删除草稿
export const deleteDraft = (id: string): boolean => {
  const drafts = readAll();
  const idx = drafts.findIndex(d => d.id === id);
  if (idx < 0 || drafts[idx].deleted) return false;
  // 软删除：标记 deleted 并写入回收站
  drafts[idx].deleted = true;
  drafts[idx].updatedAt = Date.now();
  writeAll(drafts);

  // 同步到回收站（便于审计/恢复）
  try {
    const rawDel = Taro.getStorageSync(DELETED_DRAFT_STORAGE_KEY);
    const deleted = rawDel ? JSON.parse(rawDel) as Draft[] : [];
    deleted.push(drafts[idx]);
    Taro.setStorageSync(DELETED_DRAFT_STORAGE_KEY, JSON.stringify(deleted));
  } catch (e) {
    console.error('[Draft] deleteDraft push to recycle failed:', e);
  }
  return true;
};

// 硬删除草稿（彻底清除，用于清理过期回收站）
export const purgeDraft = (id: string): boolean => {
  const drafts = readAll();
  const next = drafts.filter(d => d.id !== id);
  writeAll(next);
  return next.length !== drafts.length;
};

// 标记草稿为已发布（开启 15 分钟编辑窗口）
export const markPublished = (id: string, publishedId: string): Draft | null => {
  const drafts = readAll();
  const idx = drafts.findIndex(d => d.id === id);
  if (idx < 0) return null;
  drafts[idx].publishedId = publishedId;
  drafts[idx].publishedAt = Date.now();
  drafts[idx].updatedAt = Date.now();
  writeAll(drafts);
  return drafts[idx];
};

// 判断草稿是否仍在可编辑窗口内
export const isWithinEditWindow = (draft: Draft): boolean => {
  if (!draft.publishedAt) return true;
  return Date.now() - draft.publishedAt < EDIT_WINDOW_MS;
};

// 获取可编辑剩余时间（秒）
export const getEditWindowRemaining = (draft: Draft): number => {
  if (!draft.publishedAt) return 0;
  const remaining = EDIT_WINDOW_MS - (Date.now() - draft.publishedAt);
  return Math.max(0, Math.floor(remaining / 1000));
};

// 清理所有已发布且超过编辑窗口的草稿
export const cleanExpiredDrafts = (): number => {
  const drafts = readAll();
  const now = Date.now();
  const remaining: Draft[] = [];
  let cleaned = 0;
  for (const d of drafts) {
    if (d.publishedAt && now - d.publishedAt >= EDIT_WINDOW_MS) {
      cleaned++;
      continue;
    }
    remaining.push(d);
  }
  if (cleaned > 0) writeAll(remaining);
  return cleaned;
};
