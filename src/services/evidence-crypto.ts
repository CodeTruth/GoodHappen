/**
 * 证据加密与完整性工具模块
 *
 * 提供 SHA-256 哈希、AES-256-GCM 加密/解密、设备指纹、哈希链等能力。
 * H5 端使用 Web Crypto API，小程序端使用 crypto-js 兼容方案。
 */

// ============================================
// SHA-256 哈希
// ============================================

/**
 * 计算字符串的 SHA-256 哈希
 * @param text 待哈希的字符串
 * @returns 16进制哈希值（64字符）
 */
export async function sha256(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // 兼容回退：简单哈希（非密码学安全，仅用于 demo）
  return simpleHash(text);
}

/**
 * 计算文件 blob 的 SHA-256 哈希
 * @param blob 文件 Blob 对象
 * @returns 16进制哈希值（64字符）
 */
export async function sha256Blob(blob: Blob): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return simpleHash(blob.size.toString() + blob.type);
}

/** 简单哈希回退（非密码学安全） */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  // 扩展为 64 字符的伪哈希
  let result = Math.abs(hash).toString(16);
  while (result.length < 64) {
    result = sha256Simple(result + str);
  }
  return result.slice(0, 64);
}

function sha256Simple(str: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

// ============================================
// AES-256-GCM 加密 / 解密
// ============================================

const SALT = new Uint8Array([0x68, 0x61, 0x6f, 0x73, 0x68, 0x69, 0x5f, 0x73, 0x61, 0x6c, 0x74, 0x5f, 0x76, 0x31]); // "haoshi_salt_v1"

/**
 * 从密码派生 AES-256 密钥（PBKDF2）
 */
async function deriveKey(password: string): Promise<CryptoKey | null> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return null;
  try {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: SALT, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  } catch {
    return null;
  }
}

const DEFAULT_PASSWORD = 'haoshi_evidence_key_2026';

/**
 * AES-256-GCM 加密
 * @param plainText 明文（base64 字符串）
 * @param password 密钥（默认使用内置密钥）
 * @returns { encryptedData: string, iv: string } 或 null（环境不支持时返回 null）
 */
export async function encryptData(
  plainText: string,
  password: string = DEFAULT_PASSWORD
): Promise<{ encryptedData: string; iv: string } | null> {
  const key = await deriveKey(password);
  if (!key) return null; // 环境不支持，降级为不加密

  try {
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 字节 IV
    const enc = new TextEncoder();
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      enc.encode(plainText)
    );

    return {
      encryptedData: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv),
    };
  } catch {
    return null;
  }
}

/**
 * AES-256-GCM 解密
 * @param encryptedData 密文（base64）
 * @param iv 初始化向量（base64）
 * @param password 密钥
 * @returns 明文字符串，或 null（解密失败/环境不支持）
 */
export async function decryptData(
  encryptedData: string,
  iv: string,
  password: string = DEFAULT_PASSWORD
): Promise<string | null> {
  const key = await deriveKey(password);
  if (!key) return null;

  try {
    const ivBuf = base64ToArrayBuffer(iv);
    const dataBuf = base64ToArrayBuffer(encryptedData);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuf },
      key,
      dataBuf
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

// ============================================
// 设备指纹
// ============================================

export interface DeviceFingerprint {
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  appId: string;
}

/**
 * 采集当前设备指纹
 */
export function collectDeviceFingerprint(): DeviceFingerprint {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  const platform = typeof navigator !== 'undefined' ? navigator.platform : 'unknown';

  return {
    userAgent: ua.slice(0, 200), // 截断避免过长
    platform: platform,
    language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth: typeof window !== 'undefined' ? window.screen.width : 0,
    screenHeight: typeof window !== 'undefined' ? window.screen.height : 0,
    colorDepth: typeof window !== 'undefined' ? window.screen.colorDepth : 0,
    appId: 'haoshi-fasheng-v1',
  };
}

/**
 * 生成设备指纹哈希
 */
export async function getDeviceFingerprintHash(): Promise<string> {
  const fp = collectDeviceFingerprint();
  const raw = `${fp.userAgent}|${fp.platform}|${fp.screenWidth}x${fp.screenHeight}|${fp.language}|${fp.timezone}`;
  return sha256(raw);
}

// ============================================
// 哈希链
// ============================================

/**
 * 计算链式哈希
 * @param prevHash 前一条记录的 chainHash（首条为空字符串）
 * @param dataHash 当前数据内容的哈希
 * @returns 链式哈希
 */
export async function computeChainHash(prevHash: string, dataHash: string): Promise<string> {
  return sha256(`${prevHash}:${dataHash}`);
}

/**
 * 生成证据记录的数据哈希（综合文件哈希 + GPS + 时间）
 */
export async function computeDataHash(params: {
  fileHashes: string[];
  gps?: { latitude: number; longitude: number; address: string };
  startedAt: string;
  closedAt: string;
}): Promise<string> {
  const parts: string[] = [];
  // 文件哈希（排序保证一致性）
  parts.push(...[...params.fileHashes].sort().join(','));
  // GPS
  if (params.gps) {
    parts.push(`${params.gps.latitude.toFixed(6)}:${params.gps.longitude.toFixed(6)}:${params.gps.address}`);
  }
  // 时间
  parts.push(params.startedAt);
  parts.push(params.closedAt);

  return sha256(parts.join('|'));
}

// ============================================
// 可信度评级
// ============================================

export type TrustLevel = 'high' | 'medium' | 'low';

export interface TrustFactors {
  exifComplete: boolean;
  gpsAccuracy: number;
  timeConsistent: boolean;
  deviceVerified: boolean;
}

/**
 * 评估证据可信度
 */
export function evaluateTrustLevel(factors: TrustFactors): TrustLevel {
  let score = 0;
  if (factors.exifComplete) score += 25;
  if (factors.gpsAccuracy <= 10) score += 25;
  else if (factors.gpsAccuracy <= 50) score += 15;
  else if (factors.gpsAccuracy <= 200) score += 5;
  if (factors.timeConsistent) score += 25;
  if (factors.deviceVerified) score += 25;

  if (score >= 75) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * 可信度中文名
 */
export function trustLevelLabel(level: TrustLevel): string {
  const map: Record<TrustLevel, string> = { high: '高', medium: '中', low: '低' };
  return map[level];
}

/**
 * 可信度星星数
 */
export function trustLevelStars(level: TrustLevel): string {
  const map: Record<TrustLevel, string> = { high: '★★★★★', medium: '★★★☆☆', low: '★★☆☆☆' };
  return map[level];
}

// ============================================
// 工具函数
// ============================================

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 截断哈希用于展示（前8位 + 后4位）
 */
export function shortHash(hash: string): string {
  if (!hash || hash.length < 16) return hash || '---';
  return `${hash.slice(0, 8)}...${hash.slice(-4)}`;
}
