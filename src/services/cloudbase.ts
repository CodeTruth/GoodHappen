/**
 * CloudBase 后端服务 —— 接口预留
 * 
 * 当前为演示阶段，CloudBase SDK 未安装（@cloudbasejs/node-sdk 或 tcb-js-sdk）。
 * 此文件预留了完整的 CloudBase 集成接口，当 SDK 安装并配置环境变量后即可激活。
 * 
 * 激活步骤：
 * 1. npm install @cloudbasejs/node-sdk  (Node.js 后端)
 *    或 npm install tcb-js-sdk            (小程序端)
 * 2. 在 .env 中配置：
 *    CLOUDBASE_ENV_ID=你的环境ID
 *    CLOUDBASE_REGION=ap-shanghai
 */

// ============================================
// 环境变量声明
// ============================================
declare const CLOUDBASE_ENV_ID: string;
declare const CLOUDBASE_REGION: string;

// ============================================
// CloudBase 客户端状态
// ============================================

const cloudbaseEnvId = (typeof CLOUDBASE_ENV_ID !== 'undefined' && CLOUDBASE_ENV_ID)
  ? CLOUDBASE_ENV_ID
  : '';

const cloudbaseRegion = (typeof CLOUDBASE_REGION !== 'undefined' && CLOUDBASE_REGION)
  ? CLOUDBASE_REGION
  : 'ap-shanghai';

/** CloudBase SDK 是否已配置 */
export const isCloudBaseAvailable = (): boolean => {
  return !!cloudbaseEnvId;
};

/** CloudBase 配置信息（调试用） */
export const getCloudBaseConfig = () => ({
  envId: cloudbaseEnvId || '(未配置)',
  region: cloudbaseRegion,
  available: isCloudBaseAvailable(),
});

// ============================================
// 数据库操作接口（预留）
// ============================================

/**
 * CloudBase 数据库查询封装
 * 当 SDK 安装后，替换内部实现即可
 */
export const cloudbaseDb = {
  /** 查询单条记录 */
  async selectOne<T>(collection: string, id: string): Promise<T | null> {
    if (!isCloudBaseAvailable()) return null;
    console.warn('[CloudBase] SDK 未安装，数据库查询不可用:', collection, id);
    return null;
  },

  /** 查询多条记录 */
  async selectMany<T>(
    collection: string,
    options?: {
      filters?: Record<string, unknown>;
      orderBy?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<T[]> {
    if (!isCloudBaseAvailable()) return [];
    console.warn('[CloudBase] SDK 未安装，数据库查询不可用:', collection);
    return [];
  },

  /** 插入单条记录 */
  async insertOne<T>(collection: string, data: Record<string, unknown>): Promise<T | null> {
    if (!isCloudBaseAvailable()) return null;
    console.warn('[CloudBase] SDK 未安装，插入操作不可用:', collection);
    return null;
  },

  /** 更新记录 */
  async updateOne<T>(
    collection: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<T | null> {
    if (!isCloudBaseAvailable()) return null;
    console.warn('[CloudBase] SDK 未安装，更新操作不可用:', collection, id);
    return null;
  },

  /** 删除记录 */
  async deleteOne(collection: string, id: string): Promise<boolean> {
    if (!isCloudBaseAvailable()) return false;
    console.warn('[CloudBase] SDK 未安装，删除操作不可用:', collection, id);
    return false;
  },
};

// ============================================
// 存储接口（预留）
// ============================================

export const cloudbaseStorage = {
  /** 上传文件 */
  async upload(filePath: string, cloudPath: string): Promise<string | null> {
    if (!isCloudBaseAvailable()) return null;
    console.warn('[CloudBase] SDK 未安装，存储上传不可用');
    return null;
  },

  /** 获取临时下载链接 */
  async getTempURL(cloudPath: string): Promise<string | null> {
    if (!isCloudBaseAvailable()) return null;
    console.warn('[CloudBase] SDK 未安装，存储下载不可用');
    return null;
  },
};

// ============================================
// 云函数接口（预留）
// ============================================

export const cloudbaseFunctions = {
  /** 调用云函数 */
  async callFunction<T>(name: string, data?: Record<string, unknown>): Promise<T | null> {
    if (!isCloudBaseAvailable()) return null;
    console.warn('[CloudBase] SDK 未安装，云函数调用不可用:', name);
    return null;
  },
};

console.log(
  '[CloudBase] 服务初始化:',
  isCloudBaseAvailable()
    ? `已配置，环境ID: ${cloudbaseEnvId}`
    : '未配置（演示模式，使用本地 Store 作为数据源）'
);
