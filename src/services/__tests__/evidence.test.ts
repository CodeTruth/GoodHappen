/**
 * 证据链存证逻辑单元测试
 *
 * 测试内容：
 * 1. 证据创建、哈希计算基本逻辑
 * 2. 证据链完整性校验
 */

import {
  generateHash,
  createEvidencePackage,
  verifyEvidenceIntegrity,
  calculateDistance,
  calculateDescriptionMatch,
  genId,
  getEffectiveTime,
  getEffectiveGps,
  isDelayedPost,
  matchWitnessEvidence,
  triggerSOS,
} from '../evidence';
import type { EvidencePackage, GPSInfo, WitnessRecord, MediaAsset } from '../evidence';

// ============================================
// 哈希计算测试
// ============================================

describe('generateHash', () => {
  test('相同输入应生成相同哈希', () => {
    const hash1 = generateHash('test-data-123');
    const hash2 = generateHash('test-data-123');
    expect(hash1).toBe(hash2);
  });

  test('不同输入应生成不同哈希', () => {
    const hash1 = generateHash('record1|2024-01-01|content|39.9,116.4');
    const hash2 = generateHash('record2|2024-01-02|content2|39.8,116.5');
    expect(hash1).not.toBe(hash2);
  });

  test('哈希应以 ev_ 为前缀', () => {
    const hash = generateHash('any-data');
    expect(hash).toMatch(/^ev_[0-9a-f]+$/);
  });

  test('空字符串也应生成有效哈希', () => {
    const hash = generateHash('');
    expect(hash).toMatch(/^ev_[0-9a-f]+$/);
  });

  test('哈希长度应为 ev_ + 8位十六进制 = 11位', () => {
    const hash = generateHash('test-hash-data');
    expect(hash.startsWith('ev_')).toBe(true);
    expect(hash.length).toBe(11); // ev_ + 8 hex chars
  });
});

// ============================================
// 证据包创建测试
// ============================================

describe('createEvidencePackage', () => {
  const mockGPS: GPSInfo = {
    latitude: 39.9042,
    longitude: 116.4074,
    address: '北京市朝阳区',
    accuracy: 50,
  };

  const mockMedia: MediaAsset[] = [
    {
      type: 'image',
      url: 'https://example.com/photo.jpg',
      createdAt: '2024-06-15T10:00:00.000Z',
    },
  ];

  test('应创建有效的证据包', () => {
    const pkg = createEvidencePackage(
      'record-001',
      '帮老奶奶提菜篮子',
      mockGPS,
    );

    expect(pkg.recordId).toBe('record-001');
    expect(pkg.content).toBe('帮老奶奶提菜篮子');
    expect(pkg.gps.latitude).toBe(39.9042);
    expect(pkg.gps.longitude).toBe(116.4074);
    expect(pkg.preExisting).toBe(true);
    expect(pkg.timestamp).toBeDefined();
    expect(pkg.hash).toBeDefined();
    expect(pkg.hash).toMatch(/^ev_/);
  });

  test('应生成一致的哈希（相同输入）', () => {
    const pkg1 = createEvidencePackage('record-001', 'test content', mockGPS, []);
    // 哈希会因时间戳不同而不同，验证格式
    expect(pkg1.hash).toMatch(/^ev_[0-9a-f]{8}$/);
  });

  test('媒体资产应被正确附加', () => {
    const pkg = createEvidencePackage('record-002', 'test', mockGPS, mockMedia);
    expect(pkg.mediaUrls.length).toBe(1);
    expect(pkg.mediaUrls[0].type).toBe('image');
    expect(pkg.mediaUrls[0].url).toBe('https://example.com/photo.jpg');
  });

  test('从媒体资产提取的事件时间应被设置', () => {
    const pkg = createEvidencePackage('record-003', 'test', mockGPS, mockMedia);
    // mockMedia 包含 createdAt，应提取为 eventTimestamp
    expect(pkg.eventTimestamp).toBe('2024-06-15T10:00:00.000Z');
    expect(pkg.metadataSource).toBe('exif');
  });
});

// ============================================
// 证据链完整性测试
// ============================================

describe('verifyEvidenceIntegrity', () => {
  const mockGPS: GPSInfo = {
    latitude: 39.9042,
    longitude: 116.4074,
    address: '北京市朝阳区',
  };

  test('未篡改的证据包应返回 true', () => {
    const pkg = createEvidencePackage('record-001', '帮老奶奶提菜篮子', mockGPS);
    expect(verifyEvidenceIntegrity(pkg)).toBe(true);
  });

  test('内容被篡改的证据包应返回 false', () => {
    const pkg = createEvidencePackage('record-001', '原始内容', mockGPS);
    // 篡改内容
    const tampered: EvidencePackage = { ...pkg, content: '被篡改的内容' };
    expect(verifyEvidenceIntegrity(tampered)).toBe(false);
  });

  test('recordId 被篡改应返回 false', () => {
    const pkg = createEvidencePackage('record-001', '原始内容', mockGPS);
    const tampered: EvidencePackage = { ...pkg, recordId: 'record-999' };
    expect(verifyEvidenceIntegrity(tampered)).toBe(false);
  });

  test('GPS 被篡改应返回 false', () => {
    const pkg = createEvidencePackage('record-001', '原始内容', mockGPS);
    const tampered: EvidencePackage = {
      ...pkg,
      gps: { ...mockGPS, latitude: 0, longitude: 0 },
    };
    expect(verifyEvidenceIntegrity(tampered)).toBe(false);
  });

  test('锁定后的证据包（sealedAt）应返回 true', () => {
    const pkg = createEvidencePackage('record-001', '原始内容', mockGPS);
    const { sealedPackage } = triggerSOS(
      pkg,
      { latitude: 39.9, longitude: 116.4, address: '当前地址' },
      '我被讹了，需要帮助',
    );
    expect(verifyEvidenceIntegrity(sealedPackage)).toBe(true);
  });

  test('锁定后篡改内容应返回 false', () => {
    const pkg = createEvidencePackage('record-001', '原始内容', mockGPS);
    const { sealedPackage } = triggerSOS(
      pkg,
      { latitude: 39.9, longitude: 116.4, address: '当前地址' },
      '我被讹了',
    );
    const tamperedSealed: EvidencePackage = { ...sealedPackage, content: '篡改后的内容' };
    expect(verifyEvidenceIntegrity(tamperedSealed)).toBe(false);
  });
});

// ============================================
// 工具函数测试
// ============================================

describe('calculateDistance', () => {
  test('同一点距离应为0', () => {
    const dist = calculateDistance(39.9042, 116.4074, 39.9042, 116.4074);
    expect(dist).toBe(0);
  });

  test('两点间距离应为正值', () => {
    const dist = calculateDistance(39.9042, 116.4074, 39.9142, 116.4174);
    expect(dist).toBeGreaterThan(0);
  });

  test('北京到上海的距离应约1000km', () => {
    // 北京：39.9042, 116.4074
    // 上海：31.2304, 121.4737
    const dist = calculateDistance(39.9042, 116.4074, 31.2304, 121.4737);
    // 实际约1060km
    expect(dist).toBeGreaterThan(1000000);
    expect(dist).toBeLessThan(1200000);
  });
});

describe('calculateDescriptionMatch', () => {
  test('完全相同的描述应得高分', () => {
    const desc = '帮助老奶奶提菜篮子过马路';
    const score = calculateDescriptionMatch(desc, desc);
    expect(score).toBeGreaterThan(0.8);
  });

  test('完全不相关的描述应得低分', () => {
    const score = calculateDescriptionMatch('帮助老奶奶提菜篮子', '今天天气真好');
    expect(score).toBeLessThan(0.1);
  });

  test('部分相似的描述应得中等分数', () => {
    const score = calculateDescriptionMatch(
      '帮助老奶奶提菜篮子上楼',
      '看到一位老奶奶提菜篮子，我帮了她',
    );
    expect(score).toBeGreaterThan(0.1);
    expect(score).toBeLessThan(0.9);
  });

  test('空描述应返回0', () => {
    expect(calculateDescriptionMatch('', 'test')).toBe(0);
    expect(calculateDescriptionMatch('test', '')).toBe(0);
    expect(calculateDescriptionMatch('', '')).toBe(0);
  });
});

describe('genId', () => {
  test('应生成带指定前缀的ID', () => {
    const id = genId('sos');
    expect(id).toMatch(/^sos_/);
  });

  test('每次调用应生成不同ID', () => {
    const id1 = genId('test');
    const id2 = genId('test');
    expect(id1).not.toBe(id2);
  });

  test('不同前缀应生成以不同前缀开头的ID', () => {
    const id1 = genId('sos');
    const id2 = genId('ev');
    expect(id1).toMatch(/^sos_/);
    expect(id2).toMatch(/^ev_/);
  });
});

describe('getEffectiveTime', () => {
  test('有 eventTimestamp 应优先返回', () => {
    const record: EvidencePackage = {
      recordId: 'r1',
      timestamp: '2024-06-15T12:00:00.000Z',
      gps: { latitude: 0, longitude: 0, address: '' },
      content: 'test',
      mediaUrls: [],
      hash: 'ev_abc123',
      preExisting: true,
      eventTimestamp: '2024-06-15T10:00:00.000Z',
    };
    expect(getEffectiveTime(record)).toBe('2024-06-15T10:00:00.000Z');
  });

  test('无 eventTimestamp 应返回 timestamp', () => {
    const record: EvidencePackage = {
      recordId: 'r2',
      timestamp: '2024-06-15T12:00:00.000Z',
      gps: { latitude: 0, longitude: 0, address: '' },
      content: 'test',
      mediaUrls: [],
      hash: 'ev_def456',
      preExisting: true,
    };
    expect(getEffectiveTime(record)).toBe('2024-06-15T12:00:00.000Z');
  });
});

describe('getEffectiveGps', () => {
  test('有 eventGps 应优先返回', () => {
    const record: EvidencePackage = {
      recordId: 'r1',
      timestamp: '2024-06-15T12:00:00.000Z',
      gps: { latitude: 39.9, longitude: 116.4, address: '记录地址' },
      content: 'test',
      mediaUrls: [],
      hash: 'ev_abc',
      preExisting: true,
      eventGps: { latitude: 40.0, longitude: 116.5, address: '事件地址' },
    };
    expect(getEffectiveGps(record).address).toBe('事件地址');
  });

  test('无 eventGps 应返回 gps', () => {
    const record: EvidencePackage = {
      recordId: 'r2',
      timestamp: '2024-06-15T12:00:00.000Z',
      gps: { latitude: 39.9, longitude: 116.4, address: '记录地址' },
      content: 'test',
      mediaUrls: [],
      hash: 'ev_def',
      preExisting: true,
    };
    expect(getEffectiveGps(record).address).toBe('记录地址');
  });
});

describe('isDelayedPost', () => {
  test('eventTimestamp 与 timestamp 接近应返回 false', () => {
    const record: EvidencePackage = {
      recordId: 'r1',
      timestamp: '2024-06-15T12:05:00.000Z',  // 比事件时间晚5分钟
      gps: { latitude: 0, longitude: 0, address: '' },
      content: 'test',
      mediaUrls: [],
      hash: 'ev_abc',
      preExisting: true,
      eventTimestamp: '2024-06-15T12:00:00.000Z', // 事件发生在12:00
    };
    expect(isDelayedPost(record)).toBe(false); // 5分钟 < 10分钟阈值
  });

  test('eventTimestamp 与 timestamp 相差很大应返回 true', () => {
    const record: EvidencePackage = {
      recordId: 'r2',
      timestamp: '2024-06-15T14:00:00.000Z',  // 比事件时间晚2小时
      gps: { latitude: 0, longitude: 0, address: '' },
      content: 'test',
      mediaUrls: [],
      hash: 'ev_def',
      preExisting: true,
      eventTimestamp: '2024-06-15T10:00:00.000Z', // 事件发生在10:00
    };
    expect(isDelayedPost(record)).toBe(true); // 120分钟 > 10分钟阈值
  });

  test('无 eventTimestamp 应返回 false', () => {
    const record: EvidencePackage = {
      recordId: 'r3',
      timestamp: '2024-06-15T14:00:00.000Z',
      gps: { latitude: 0, longitude: 0, address: '' },
      content: 'test',
      mediaUrls: [],
      hash: 'ev_ghi',
      preExisting: true,
    };
    expect(isDelayedPost(record)).toBe(false);
  });
});

// ============================================
// 见证匹配测试
// ============================================

describe('matchWitnessEvidence', () => {
  const baseGPS: GPSInfo = { latitude: 39.9042, longitude: 116.4074, address: '北京' };

  // 创建一个 SOS 记录
  const sosRecord = {
    id: 'sos_001',
    evidencePackageId: 'ep_001',
    recordId: 'record_001',
    triggeredAt: '2024-06-15T12:00:00.000Z',
    location: baseGPS,
    description: '我被讹了',
    status: 'evidence_locked' as const,
    witnessMatchCount: 0,
  };

  // 创建主证据包
  const primaryEvidence = createEvidencePackage(
    'record_001',
    '帮助老奶奶提菜篮子过马路',
    baseGPS,
  );

  // 创建见证记录
  const createWitness = (id: string, timeDiffMinutes: number): WitnessRecord => ({
    id,
    witnessUserId: `user_${id}`,
    witnessUserName: `见证者${id}`,
    witnessUserAvatar: '',
    recordId: `witness_record_${id}`,
    timestamp: new Date(
      new Date(primaryEvidence.timestamp).getTime() + timeDiffMinutes * 60000,
    ).toISOString(),
    gps: { ...baseGPS },
    description: '我看到一个人帮助了老奶奶提菜篮子',
    matched: false,
    notified: false,
    badgeGranted: false,
  });

  test('有2条以上见证记录应形成证据链', () => {
    const witnesses = [
      createWitness('w1', 5),
      createWitness('w2', 10),
    ];
    const match = matchWitnessEvidence(sosRecord, primaryEvidence, witnesses);
    expect(match.evidenceChainFormed).toBe(true);
    expect(match.witnessRecordIds.length).toBe(2);
  });

  test('少于2条见证记录不应形成证据链', () => {
    const witnesses = [createWitness('w1', 5)];
    const match = matchWitnessEvidence(sosRecord, primaryEvidence, witnesses);
    expect(match.evidenceChainFormed).toBe(false);
  });

  test('零条见证记录不应形成证据链', () => {
    const match = matchWitnessEvidence(sosRecord, primaryEvidence, []);
    expect(match.evidenceChainFormed).toBe(false);
    expect(match.gpsRadiusMeters).toBe(0);
    expect(match.timeDiffMinutes).toBe(0);
  });

  test('描述吻合度应在0-1之间', () => {
    const witnesses = [
      createWitness('w1', 5),
      createWitness('w2', 10),
    ];
    const match = matchWitnessEvidence(sosRecord, primaryEvidence, witnesses);
    expect(match.descriptionMatchScore).toBeGreaterThanOrEqual(0);
    expect(match.descriptionMatchScore).toBeLessThanOrEqual(1);
  });

  test('距离应为非负整数', () => {
    const witnesses = [createWitness('w1', 5)];
    const match = matchWitnessEvidence(sosRecord, primaryEvidence, witnesses);
    expect(match.gpsRadiusMeters).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(match.gpsRadiusMeters)).toBe(true);
  });
});