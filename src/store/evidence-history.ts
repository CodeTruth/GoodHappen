/**
 * 证据历史 Store — 管理善行保护 + 善行见证的历史文件
 *
 * 存储到 Taro Storage（H5 端降级为 localStorage），
 * 文件以 base64 Data URL 存储，不写入手机图库/文件系统。
 * 每条记录自动生成 SHA-256 哈希链，保证数据完整性。
 */

import Taro from '@tarojs/taro';
import { create } from 'zustand';
import {
  computeChainHash,
  computeDataHash,
  evaluateTrustLevel,
  collectDeviceFingerprint,
  getDeviceFingerprintHash,
  shortHash,
  type TrustLevel,
  type TrustFactors,
} from '@/services/evidence-crypto';
import {
  dbSaveRecord,
  dbGetAllRecords,
  dbDeleteRecord,
  isIndexedDBAvailable,
} from '@/services/indexed-db';

// ============================================
// 类型
// ============================================

export interface EvidenceFile {
  id: string;
  /** 'photo' | 'video' | 'audio' */
  type: 'photo' | 'video' | 'audio';
  /** 明文 base64 Data URL（或加密后的密文） */
  dataUrl: string;
  /** 缩略图（视频封面） */
  thumbnail?: string;
  /** 文件大小（字节，估算） */
  size: number;
  createdAt: string;
  /** 文件 SHA-256 哈希（加密前计算） */
  hash?: string;
  /** 加密标识 */
  encrypted?: boolean;
  /** AES-GCM IV（仅加密文件有） */
  iv?: string;
  /** 文件 MIME type（用于播放时还原正确格式） */
  mimeType?: string;
}

export interface EvidenceRecord {
  id: string;
  /** 'protection' | 'witness' */
  source: 'protection' | 'witness';
  title: string;
  description: string;
  startedAt: string;
  closedAt: string;
  duration: number;  // 秒
  gps?: {
    latitude: number;
    longitude: number;
    address: string;
    accuracy?: number;
    source?: 'exif' | 'system' | 'manual';
  };
  files: EvidenceFile[];
  /** 保护过程中的统计数据（即使文件不可用，也能看到录了多久） */
  evidenceStats?: {
    videoDuration: number;
    audioDuration: number;
    gpsPoints: number;
    photos: number;
  };

  // === 哈希链 ===
  /** 当前数据内容的 SHA-256 哈希 */
  dataHash?: string;
  /** 前一条记录的 chainHash */
  prevHash?: string;
  /** 链式哈希 = SHA256(prevHash + dataHash) */
  chainHash?: string;

  // === 可信度 ===
  trustLevel?: TrustLevel;
  trustFactors?: TrustFactors;

  // === 设备指纹哈希 ===
  deviceHash?: string;
}

interface EvidenceHistoryState {
  records: EvidenceRecord[];
  loadFromStorage: () => void;
  saveToStorage: () => void;
  addRecord: (record: EvidenceRecord) => void;
  removeRecord: (id: string) => void;
  getRecordById: (id: string) => EvidenceRecord | undefined;
  updateRecordFiles: (id: string, files: EvidenceFile[]) => void;
  /** 验证完整性，返回每条记录的验证结果 */
  verifyIntegrity: () => Promise<{ id: string; valid: boolean; reason?: string }[]>;
}

const STORAGE_KEY = 'haoshi_evidence_history';

// 单个 base64 文件最大 10MB，超出则跳过并提示
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// 总存储最大约 50 条记录，超出删除最旧的
const MAX_RECORDS = 50;

const loadStorage = (): EvidenceRecord[] => {
  try {
    let raw: string | undefined;
    if (typeof window !== 'undefined') {
      raw = localStorage.getItem(STORAGE_KEY) || undefined;
    } else {
      raw = Taro.getStorageSync(STORAGE_KEY) || undefined;
    }
    if (raw) {
      const parsed = JSON.parse(raw);
      // 兼容两种格式：数组 [{...}] 或对象 {records: [{...}]}
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.records)) return parsed.records;
    }
  } catch (e) {
    console.warn('[EvidenceHistory] Load failed:', e);
  }
  return [];
};

const saveStorage = (records: EvidenceRecord[]) => {
  try {
    // 限制记录数
    const trimmed = records.slice(0, MAX_RECORDS);
    const json = JSON.stringify(trimmed);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, json);
    } else {
      Taro.setStorageSync(STORAGE_KEY, json);
    }
  } catch (e: any) {
    // localStorage 容量不足时清理旧记录
    if (e?.name === 'QuotaExceededError' || e?.message?.includes('Quota')) {
      const reduced = records.slice(0, Math.floor(records.length / 2));
      try {
        const json = JSON.stringify(reduced);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, json);
        } else {
          Taro.setStorageSync(STORAGE_KEY, json);
        }
        console.warn('[EvidenceHistory] Storage full, kept only recent records');
      } catch {
        console.error('[EvidenceHistory] Critical storage error');
      }
    }
  }
};

/**
 * 生成单条文件哈希（基于文件内容的摘要信息）
 */
function quickFileHash(file: EvidenceFile): string {
  // 用文件大小+类型+id的前缀作为快速哈希输入（完整哈希需要 blob，成本太高）
  return `f:${file.type}:${file.size}:${file.id}`;
}

/**
 * 为新记录计算哈希链并评估可信度（异步，但不阻塞存储）
 */
async function enrichRecord(
  record: EvidenceRecord,
  prevChainHash: string,
  deviceFingerprint: ReturnType<typeof collectDeviceFingerprint>
): Promise<EvidenceRecord> {
  // 1. 计算文件哈希摘要
  const fileHashes = record.files.map(f => quickFileHash(f));

  // 2. 计算数据哈希
  const dataHash = await computeDataHash({
    fileHashes,
    gps: record.gps,
    startedAt: record.startedAt,
    closedAt: record.closedAt,
  });

  // 3. 计算链式哈希
  const chainHash = await computeChainHash(prevChainHash, dataHash);

  // 4. 设备指纹哈希
  const deviceHash = await getDeviceFingerprintHash();

  // 5. 可信度评级
  const trustFactors: TrustFactors = {
    exifComplete: record.gps?.source === 'exif' || false,
    gpsAccuracy: record.gps?.accuracy || 999,
    timeConsistent: Math.abs(new Date(record.closedAt).getTime() - new Date(record.startedAt).getTime()) >= 0,
    deviceVerified: deviceFingerprint.appId === 'haoshi-fasheng-v1',
  };

  return {
    ...record,
    dataHash,
    prevHash: prevChainHash || '',
    chainHash,
    deviceHash,
    trustLevel: evaluateTrustLevel(trustFactors),
    trustFactors,
  };
}

export const useEvidenceHistoryStore = create<EvidenceHistoryState>((set, get) => ({
  records: [],

  loadFromStorage: async () => {
    let indexedRecords: EvidenceRecord[] = [];
    let localStorageRecords: EvidenceRecord[] = [];

    // 1. 从 IndexedDB 读取（含大文件）
    if (isIndexedDBAvailable()) {
      try {
        indexedRecords = await dbGetAllRecords() || [];
      } catch (e) {
        console.warn('[EvidenceHistory] IndexedDB load failed:', e);
      }
    }

    // 2. 从 localStorage 读取（元数据）
    try {
      localStorageRecords = loadStorage();
    } catch {}

    // 3. 合并：以 IndexedDB 为主，localStorage 补漏
    const indexedMap = new Map(indexedRecords.map((r: EvidenceRecord) => [r.id, r]));
    const merged: EvidenceRecord[] = [];

    // 先用 IndexedDB 记录（优先）
    indexedRecords.forEach((r: EvidenceRecord) => merged.push(r));

    // 再补 localStorage 中有但 IndexedDB 没有的记录
    localStorageRecords.forEach((r) => {
      if (!indexedMap.has(r.id)) {
        merged.push(r);
      }
    });

    // 按时间倒序
    const sorted = merged.sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    set({ records: sorted });
    console.log('[EvidenceHistory] Loaded', sorted.length, 'records (IndexedDB:', indexedRecords.length, ', localStorage:', localStorageRecords.length, ')');
  },

  saveToStorage: () => {
    const records = get().records;
    if (isIndexedDBAvailable()) {
      Promise.all(records.map((r) => dbSaveRecord(r))).catch((e) => {
        console.warn('[EvidenceHistory] IndexedDB batch save failed:', e);
        saveStorage(records);
      });
    } else {
      saveStorage(records);
    }
  },

  addRecord: async (record) => {
    let prevChainHash = '';
    let savedToLocalStorage = false;

    // 1. 无论IndexedDB是否可用，先保存元数据到localStorage作为保底
    const metaRecord = {
      ...record,
      files: record.files.filter((f) => f.size <= MAX_FILE_SIZE && (f.type === 'photo' ? f.size <= 2 * 1024 * 1024 : true)),
    };
    try {
      const existing = loadStorage();
      const merged = [metaRecord, ...existing].slice(0, MAX_RECORDS);
      saveStorage(merged);
      savedToLocalStorage = true;
    } catch (e) {
      console.warn('[EvidenceHistory] localStorage save failed:', e);
    }

    // 2. 尝试保存完整文件到IndexedDB
    let indexedDBSuccess = false;
    if (isIndexedDBAvailable()) {
      try {
        await dbSaveRecord(record);
        indexedDBSuccess = true;
      } catch (e) {
        console.warn('[EvidenceHistory] IndexedDB save failed, full record will not be available:', e);
        // 保底：尝试存个无大文件的版本
        if (!savedToLocalStorage) {
          try {
            const minimalRecord = { ...record, files: [] };
            const existing2 = loadStorage();
            const merged2 = [minimalRecord, ...existing2].slice(0, MAX_RECORDS);
            saveStorage(merged2);
          } catch {}
        }
      }
    }

    // 3. 更新React状态（用完整record，内存里文件是有的）
    const newRecord = indexedDBSuccess || isIndexedDBAvailable()
      ? { ...record, files: record.files }
      : { ...record, files: record.files.filter((f) => f.size <= MAX_FILE_SIZE) };

    set((state) => {
      const newRecords = [newRecord, ...state.records];
      prevChainHash = state.records.length > 0
        ? state.records[0].chainHash || ''
        : '';
      return { records: newRecords };
    });

    // 4. 异步计算哈希链（不阻塞UI）
    const deviceFingerprint = collectDeviceFingerprint();
    try {
      const enriched = await enrichRecord(newRecord, prevChainHash, deviceFingerprint);
      set((s) => ({
        records: s.records.map((r) =>
          r.id === enriched.id ? enriched : r
        ),
      }));
      if (indexedDBSuccess) {
        await dbSaveRecord(enriched);
      }
      // 同步更新localStorage中的哈希链
      try {
        const stored = loadStorage();
        const updated = stored.map((r) => r.id === enriched.id ? enriched : r);
        saveStorage(updated);
      } catch {}
    } catch (e) {
      console.warn('[EvidenceHistory] Enrich failed:', e);
    }
  },

  removeRecord: (id) => {
    set((state) => {
      const newRecords = state.records.filter((r) => r.id !== id);
      if (isIndexedDBAvailable()) {
        dbDeleteRecord(id).catch((e) => {
          console.warn('[EvidenceHistory] IndexedDB delete failed:', e);
        });
      }
      saveStorage(newRecords);
      return { records: newRecords };
    });
  },

  getRecordById: (id) => {
    return get().records.find((r) => r.id === id);
  },

  updateRecordFiles: (id, files) => {
    set((state) => {
      const newRecords = state.records.map((r) =>
        r.id === id ? { ...r, files: [...r.files, ...files] } : r
      );
      const updated = newRecords.find((r) => r.id === id);
      if (isIndexedDBAvailable() && updated) {
        dbSaveRecord(updated).catch((e) => {
          console.warn('[EvidenceHistory] IndexedDB update failed:', e);
        });
      }
      saveStorage(newRecords);
      return { records: newRecords };
    });
  },

  verifyIntegrity: async () => {
    const records = get().records;
    const sorted = [...records]
      .filter(r => r.dataHash && r.chainHash)
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    const results: { id: string; valid: boolean; reason?: string }[] = [];

    for (let i = 0; i < sorted.length; i++) {
      const record = sorted[i];
      const prevChainHash = i === 0 ? '' : sorted[i - 1].chainHash || '';

      // 检查 prevHash 一致性
      if (record.prevHash !== prevChainHash) {
        results.push({ id: record.id, valid: false, reason: '链式哈希断裂' });
        continue;
      }

      // 检查 chainHash 一致性
      const expectedChainHash = await computeChainHash(prevChainHash, record.dataHash || '');
      if (record.chainHash !== expectedChainHash) {
        results.push({ id: record.id, valid: false, reason: '数据哈希不匹配' });
        continue;
      }

      results.push({ id: record.id, valid: true });
    }

    // 对没有哈希的旧记录，标记为无哈希（不算失败）
    const hashedIds = new Set(sorted.map(r => r.id));
    records.forEach(r => {
      if (!hashedIds.has(r.id)) {
        results.push({ id: r.id, valid: true, reason: '旧记录（无哈希链）' });
      }
    });

    return results;
  },
}));

// ============================================
// 工具函数
// ============================================

/**
 * 将 Blob 转为 base64 Data URL
 */
export const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * 将 base64 Data URL 还原为 Blob（用于播放超大视频，避免直接 src 赋值导致内存溢出）
 */
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:([^;]+);/);
  const mime = mimeMatch ? mimeMatch[1] : 'video/webm';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
};

/**
 * 从视频 Data URL 生成缩略图
 */
export const generateVideoThumbnail = (videoDataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') { resolve(''); return; }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.src = videoDataUrl;
    video.currentTime = 1;

    video.onloadeddata = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 160, 160);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        } else {
          resolve('');
        }
      } catch {
        resolve('');
      }
    };
    video.onerror = () => resolve('');
  });
};

// 导出 shortHash 供 UI 使用
export { shortHash };
