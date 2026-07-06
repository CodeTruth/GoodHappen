/**
 * IndexedDB 封装 — 用于存储大体积证据文件（视频、音频）
 *
 * localStorage 通常只有 5-10MB，无法存放大视频。
 * IndexedDB 在浏览器中容量可达数百 MB，适合存储加密后的证据数据。
 */

const DB_NAME = 'haoshi_evidence_db';
const DB_VERSION = 2; // 升级到 2，确保所有客户端触发 onupgradeneeded
const STORE_NAME = 'evidence_records';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      // 安全检查：如果存储不存在，删除数据库并重新创建
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        console.warn('[IndexedDB] Store not found, deleting and recreating database');
        db.close();
        dbPromise = null;
        const deleteReq = window.indexedDB!.deleteDatabase(DB_NAME);
        deleteReq.onsuccess = () => {
          resolve(openDB());
        };
        deleteReq.onerror = () => reject(new Error('Failed to delete database'));
        return;
      }
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      // 删除旧存储（如果存在），重新创建
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    };
  });

  return dbPromise;
}

/** 保存单条记录 */
export async function dbSaveRecord(record: any): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** 获取单条记录 */
export async function dbGetRecord(id: string): Promise<any | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** 获取所有记录 */
export async function dbGetAllRecords(): Promise<any[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/** 删除单条记录 */
export async function dbDeleteRecord(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** 清空所有记录 */
export async function dbClearAll(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/** 检查 IndexedDB 是否可用 */
export function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.indexedDB;
}
