/**
 * 善行兜底保护系统 Store - Phase 9
 *
 * 集中管理：
 * 1. 事前存证（P1）：善行证据包
 * 2. 一键求助（P1）："我被讹了" 记录
 * 3. 善行保险（P3）：触发条件、保额、理赔
 * 4. 善行见证网络（P4）：见证记录与匹配
 */

import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { useFortuneStore } from '@/store/fortune';
import { getTitleByFortune } from '@/utils/fortune';
import {
  EvidencePackage,
  SOSRecord,
  WitnessRecord,
  WitnessMatch,
  GPSInfo,
  MediaAsset,
  createEvidencePackage,
  triggerSOS,
  scanWitnessNetwork,
  matchWitnessEvidence,
  notifyWitnesses,
  genId,
  getCurrentGPS,
} from '@/services/evidence';

const STORAGE_KEY = 'haoshi_protection_store';

// ============================================
// 善行保险相关常量（P3）
// ============================================

/** 触发条件：累计 30 天善行记录 */
export const INSURANCE_QUALIFY_DAYS = 30;
/** 法律费用上限 */
export const LEGAL_FEE_LIMIT = 50000;
/** 赔偿金上限 */
export const COMPENSATION_LIMIT = 100000;
/** 保费来源：人均 ¥2/月以下（由平台温暖基金提取） */
export const PREMIUM_PER_PERSON_MONTHLY = 2;

// ============================================
// 类型定义
// ============================================

/** 善行保险状态 */
export interface InsuranceState {
  active: boolean;              // 是否已生效
  activatedAt: string;          // 生效时间
  qualifiedDays: number;        // 累计善行天数
  legalFeeCoverage: number;     // 法律费用保额
  compensationCoverage: number; // 赔偿金保额
}

/** 理赔记录 */
export interface ClaimRecord {
  id: string;
  sosRecordId: string;          // 关联的求助记录
  recordId: string;             // 关联的善行记录
  type: 'legal_fee' | 'compensation';
  amount: number;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'paid';
  reason: string;
  evidenceHash: string;         // 证据包哈希
  witnessChainFormed: boolean;  // 是否有见证证据链
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

/** 律师匹配记录（P2 法律援助） */
export interface LawyerMatch {
  id: string;
  sosRecordId: string;
  lawyerName: string;
  lawyerAvatar: string;
  lawFirm: string;
  specialty: string;
  matchedAt: string;
  callbackExpectedAt: string;   // 预计回电时间
  status: 'matched' | 'callbacked' | 'consulting';
}

interface ProtectionStoreState {
  // 事前存证
  evidencePackages: EvidencePackage[];
  // 求助记录
  sosRecords: SOSRecord[];
  // 善行保险
  insurance: InsuranceState;
  // 理赔记录
  claims: ClaimRecord[];
  // 律师匹配
  lawyerMatches: LawyerMatch[];
  // 见证记录
  witnessRecords: WitnessRecord[];
  // 见证匹配结果
  witnessMatches: WitnessMatch[];

  // ===== 事前存证（P1）=====
  /** 为善行记录创建存证 */
  createEvidence: (recordId: string, content: string, gps: GPSInfo, mediaAssets?: MediaAsset[]) => EvidencePackage;
  /** 获取善行记录的存证 */
  getEvidenceByRecordId: (recordId: string) => EvidencePackage | undefined;
  /** 一键求助：我被讹了 */
  triggerSOS: (recordId: string, description: string) => Promise<{ success: boolean; message: string; sosRecord?: SOSRecord }>;

  // ===== 善行保险（P3）=====
  /** 检查保险资格 */
  checkInsuranceEligibility: () => { qualified: boolean; reason?: string; daysRemaining?: number };
  /** 激活善行保险 */
  activateInsurance: () => void;
  /** 获取保险状态 */
  getInsuranceStatus: () => InsuranceState;
  /** 提交理赔申请 */
  submitClaim: (sosRecordId: string, type: 'legal_fee' | 'compensation', amount: number, reason: string) => { success: boolean; message: string; claimId?: string };
  /** 获取理赔记录 */
  getClaimsBySosRecord: (sosRecordId: string) => ClaimRecord[];

  // ===== 善行见证网络（P4）=====
  /** 扫描见证网络 */
  scanWitnesses: (sosRecordId: string) => { success: boolean; matchCount: number; matchResult?: WitnessMatch };
  /** 获取见证匹配结果 */
  getWitnessMatchBySos: (sosRecordId: string) => WitnessMatch | undefined;
  /** 获取被标记为善意证据的见证记录 */
  getNotifiedWitnesses: () => WitnessRecord[];

  // ===== 律师匹配（P2）=====
  /** 匹配律师（模拟） */
  matchLawyer: (sosRecordId: string) => LawyerMatch;
  /** 获取律师匹配结果 */
  getLawyerMatchBySos: (sosRecordId: string) => LawyerMatch | undefined;

  // ===== 持久化 =====
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// ============================================
// Mock 数据
// ============================================

/** Mock 见证记录 - 来自独立用户 */
const mockWitnessRecords: WitnessRecord[] = [
  {
    id: 'wit_001',
    witnessUserId: 'user_w1',
    witnessUserName: '路过的暖阳',
    witnessUserAvatar: 'https://picsum.photos/id/100/200/200',
    recordId: 'wit_rec_001',
    timestamp: '2024-06-22T10:25:00Z',
    gps: {
      latitude: 39.9045,
      longitude: 116.4078,
      address: '北京市朝阳区·善行地点附近',
      accuracy: 15,
    },
    description: '看到一个年轻人扶老人过马路，老人看起来很感激，年轻人很有耐心。',
    matched: false,
    notified: false,
    badgeGranted: false,
  },
  {
    id: 'wit_002',
    witnessUserId: 'user_w2',
    witnessUserName: '晨练的旁观者',
    witnessUserAvatar: 'https://picsum.photos/id/200/200/200',
    recordId: 'wit_rec_002',
    timestamp: '2024-06-22T10:35:00Z',
    gps: {
      latitude: 39.9048,
      longitude: 116.4071,
      address: '北京市朝阳区·路口对面',
      accuracy: 20,
    },
    description: '当时在晨练，看到那位善行者帮老人提东西，画面很温馨。',
    matched: false,
    notified: false,
    badgeGranted: false,
  },
  {
    id: 'wit_003',
    witnessUserId: 'user_w3',
    witnessUserName: '便利店店员',
    witnessUserAvatar: 'https://picsum.photos/id/300/200/200',
    recordId: 'wit_rec_003',
    timestamp: '2024-06-22T10:40:00Z',
    gps: {
      latitude: 39.9050,
      longitude: 116.4080,
      address: '北京市朝阳区·便利店门口',
      accuracy: 10,
    },
    description: '我在店里看到外面的善行，年轻人扶着老人慢慢走。',
    matched: false,
    notified: false,
    badgeGranted: false,
  },
];

/** Mock 律师列表 */
const mockLawyers = [
  {
    lawyerName: '张明律师',
    lawyerAvatar: 'https://picsum.photos/id/1011/200/200',
    lawFirm: '北京正义律师事务所',
    specialty: '民事纠纷·善行维权',
  },
  {
    lawyerName: '李华律师',
    lawyerAvatar: 'https://picsum.photos/id/1012/200/200',
    lawFirm: '上海公益法律服务中心',
    specialty: '交通事故·人身损害',
  },
  {
    lawyerName: '王强律师',
    lawyerAvatar: 'https://picsum.photos/id/1013/200/200',
    lawFirm: '广州温暖法律诊所',
    specialty: '讹诈反诉·名誉保护',
  },
];

// ============================================
// 初始状态
// ============================================

const initialInsurance: InsuranceState = {
  active: false,
  activatedAt: '',
  qualifiedDays: 0,
  legalFeeCoverage: LEGAL_FEE_LIMIT,
  compensationCoverage: COMPENSATION_LIMIT,
};

// ============================================
// Store 实现
// ============================================

export const useProtectionStore = create<ProtectionStoreState>((set, get) => ({
  evidencePackages: [],
  sosRecords: [],
  insurance: { ...initialInsurance },
  claims: [],
  lawyerMatches: [],
  witnessRecords: [...mockWitnessRecords],
  witnessMatches: [],

  // ============================================
  // 事前存证（P1）
  // ============================================

  /** 为善行记录创建存证 */
  createEvidence: (recordId, content, gps, mediaAssets = []) => {
    const pkg = createEvidencePackage(recordId, content, gps, mediaAssets);
    set((state) => ({
      evidencePackages: [...state.evidencePackages, pkg],
    }));
    get().saveToStorage();
    return pkg;
  },

  /** 获取善行记录的存证 */
  getEvidenceByRecordId: (recordId) => {
    return get().evidencePackages.find(p => p.recordId === recordId);
  },

  /** 一键求助：我被讹了 */
  triggerSOS: async (recordId, description) => {
    const evidence = get().getEvidenceByRecordId(recordId);
    if (!evidence) {
      return { success: false, message: '未找到该善行记录的存证' };
    }

    // 获取当前位置
    const currentLocation = await getCurrentGPS();

    // 锁定证据包，生成求助记录
    const { sosRecord, sealedPackage } = triggerSOS(evidence, currentLocation, description);

    // 更新证据包为锁定状态
    set((state) => ({
      evidencePackages: state.evidencePackages.map(p =>
        p.recordId === recordId ? sealedPackage : p
      ),
      sosRecords: [sosRecord, ...state.sosRecords],
    }));

    // 自动触发见证网络扫描
    get().scanWitnesses(sosRecord.id);

    // 自动匹配律师
    get().matchLawyer(sosRecord.id);

    get().saveToStorage();
    return { success: true, message: '证据已锁定，律师将尽快联系您', sosRecord };
  },

  // ============================================
  // 善行保险（P3）
  // ============================================

  /** 检查保险资格 */
  checkInsuranceEligibility: () => {
    const fortuneStore = useFortuneStore.getState();
    // 累计善行天数 = 连续打卡天数（streak）或 earn 类型交易覆盖的天数
    const earnTransactions = fortuneStore.transactions.filter(t => t.type === 'earn');
    // 统计不同的日期数
    const uniqueDates = new Set(earnTransactions.map(t => t.createdAt.split('T')[0]));
    const qualifiedDays = uniqueDates.size;

    // 同步更新保险状态
    set((state) => ({
      insurance: { ...state.insurance, qualifiedDays },
    }));

    if (qualifiedDays >= INSURANCE_QUALIFY_DAYS) {
      // 自动激活
      if (!get().insurance.active) {
        get().activateInsurance();
      }
      return { qualified: true };
    }

    return {
      qualified: false,
      reason: `需累计 ${INSURANCE_QUALIFY_DAYS} 天善行记录才能获得善行保护`,
      daysRemaining: INSURANCE_QUALIFY_DAYS - qualifiedDays,
    };
  },

  /** 激活善行保险 */
  activateInsurance: () => {
    set((state) => ({
      insurance: {
        ...state.insurance,
        active: true,
        activatedAt: new Date().toISOString(),
        legalFeeCoverage: LEGAL_FEE_LIMIT,
        compensationCoverage: COMPENSATION_LIMIT,
      },
    }));
    get().saveToStorage();
  },

  /** 获取保险状态 */
  getInsuranceStatus: () => get().insurance,

  /** 提交理赔申请 */
  submitClaim: (sosRecordId, type, amount, reason) => {
    const { insurance } = get();
    if (!insurance.active) {
      return { success: false, message: '善行保护尚未生效' };
    }

    const sosRecord = get().sosRecords.find(s => s.id === sosRecordId);
    if (!sosRecord) {
      return { success: false, message: '未找到求助记录' };
    }

    const evidence = get().getEvidenceByRecordId(sosRecord.recordId);
    if (!evidence) {
      return { success: false, message: '未找到善行存证' };
    }

    // 赔付条件校验：善行记录时间戳和争议事件时间吻合
    // 关键：善行记录必须在争议发生前存入（preExisting=true）
    if (!evidence.preExisting) {
      return { success: false, message: '善行记录在争议发生后才创建，不符合赔付条件' };
    }

    // 校验金额上限
    const limit = type === 'legal_fee' ? LEGAL_FEE_LIMIT : COMPENSATION_LIMIT;
    if (amount > limit) {
      return { success: false, message: `赔付金额超过上限（¥${limit.toLocaleString('zh-CN')}）` };
    }

    // 检查是否有见证证据链或第三方证据
    const witnessMatch = get().getWitnessMatchBySos(sosRecordId);
    const witnessChainFormed = witnessMatch?.evidenceChainFormed || false;

    const claim: ClaimRecord = {
      id: genId('claim'),
      sosRecordId,
      recordId: sosRecord.recordId,
      type,
      amount,
      status: 'under_review',
      reason,
      evidenceHash: evidence.hash,
      witnessChainFormed,
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      claims: [claim, ...state.claims],
    }));

    get().saveToStorage();
    return {
      success: true,
      message: witnessChainFormed
        ? '理赔申请已提交，见证证据链已形成，将优先审核'
        : '理赔申请已提交，等待审核（需第三方证据或最终判决）',
      claimId: claim.id,
    };
  },

  /** 获取理赔记录 */
  getClaimsBySosRecord: (sosRecordId) => {
    return get().claims.filter(c => c.sosRecordId === sosRecordId);
  },

  // ============================================
  // 善行见证网络（P4）
  // ============================================

  /** 扫描见证网络 */
  scanWitnesses: (sosRecordId) => {
    const sosRecord = get().sosRecords.find(s => s.id === sosRecordId);
    if (!sosRecord) {
      return { success: false, matchCount: 0 };
    }

    const primaryEvidence = get().getEvidenceByRecordId(sosRecord.recordId);
    if (!primaryEvidence) {
      return { success: false, matchCount: 0 };
    }

    // 扫描匹配的见证记录
    const allWitnesses = get().witnessRecords;
    const matchedWitnesses = scanWitnessNetwork(sosRecord, primaryEvidence, allWitnesses);

    // 匹配证据链
    const matchResult = matchWitnessEvidence(sosRecord, primaryEvidence, matchedWitnesses);

    // 通知见证者并授予徽章
    const { notified } = notifyWitnesses(matchedWitnesses);

    // 更新见证记录状态
    set((state) => ({
      witnessRecords: state.witnessRecords.map(w => {
        const notifiedWit = notified.find(n => n.id === w.id);
        return notifiedWit || w;
      }),
      witnessMatches: [
        matchResult,
        ...state.witnessMatches.filter(m => m.sosRecordId !== sosRecordId),
      ],
      // 更新求助记录的见证匹配数
      sosRecords: state.sosRecords.map(s =>
        s.id === sosRecordId
          ? { ...s, witnessMatchCount: matchedWitnesses.length }
          : s
      ),
    }));

    get().saveToStorage();
    return {
      success: true,
      matchCount: matchedWitnesses.length,
      matchResult,
    };
  },

  /** 获取见证匹配结果 */
  getWitnessMatchBySos: (sosRecordId) => {
    return get().witnessMatches.find(m => m.sosRecordId === sosRecordId);
  },

  /** 获取被标记为善意证据的见证记录 */
  getNotifiedWitnesses: () => {
    return get().witnessRecords.filter(w => w.notified);
  },

  // ============================================
  // 律师匹配（P2）
  // ============================================

  /** 匹配律师（模拟） */
  matchLawyer: (sosRecordId) => {
    const now = new Date();
    const callbackTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 分钟内回电

    // 随机选择一位律师
    const lawyer = mockLawyers[Math.floor(Math.random() * mockLawyers.length)];

    const match: LawyerMatch = {
      id: genId('lawyer'),
      sosRecordId,
      lawyerName: lawyer.lawyerName,
      lawyerAvatar: lawyer.lawyerAvatar,
      lawFirm: lawyer.lawFirm,
      specialty: lawyer.specialty,
      matchedAt: now.toISOString(),
      callbackExpectedAt: callbackTime.toISOString(),
      status: 'matched',
    };

    set((state) => ({
      lawyerMatches: [
        match,
        ...state.lawyerMatches.filter(l => l.sosRecordId !== sosRecordId),
      ],
      // 更新求助记录状态
      sosRecords: state.sosRecords.map(s =>
        s.id === sosRecordId
          ? { ...s, status: 'lawyer_matched' }
          : s
      ),
    }));

    get().saveToStorage();
    return match;
  },

  /** 获取律师匹配结果 */
  getLawyerMatchBySos: (sosRecordId) => {
    return get().lawyerMatches.find(l => l.sosRecordId === sosRecordId);
  },

  // ============================================
  // 持久化
  // ============================================

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          evidencePackages: parsed.evidencePackages || [],
          sosRecords: parsed.sosRecords || [],
          insurance: parsed.insurance || { ...initialInsurance },
          claims: parsed.claims || [],
          lawyerMatches: parsed.lawyerMatches || [],
          witnessRecords: parsed.witnessRecords || [...mockWitnessRecords],
          witnessMatches: parsed.witnessMatches || [],
        });
      }
      // 加载后检查保险资格
      get().checkInsuranceEligibility();
    } catch (e) {
      console.error('[ProtectionStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const state = get();
      const data = {
        evidencePackages: state.evidencePackages,
        sosRecords: state.sosRecords,
        insurance: state.insurance,
        claims: state.claims,
        lawyerMatches: state.lawyerMatches,
        witnessRecords: state.witnessRecords,
        witnessMatches: state.witnessMatches,
      };
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('[ProtectionStore] Save to storage failed:', e);
    }
  },
}));

// ============================================
// 辅助导出：根据福气值判断代理费用垫付比例（P2）
// ============================================

/** 代理费用垫付规则 */
export interface FeeAdvanceRule {
  titleLevel: number;
  titleName: string;
  advanceRatio: number; // 垫付比例 0-1
  description: string;
}

/**
 * 根据用户福气值获取代理费用垫付规则
 * - 暖阳以上（level≥3）→ 温暖基金垫付首期
 * - 皓月以上（level≥8）→ 全额垫付
 */
export const getFeeAdvanceRule = (totalFortune: number): FeeAdvanceRule => {
  const title = getTitleByFortune(totalFortune);

  if (title.level >= 8) {
    // 皓月以上 → 全额垫付
    return {
      titleLevel: title.level,
      titleName: title.name,
      advanceRatio: 1.0,
      description: '皓月以上善行者，温暖基金全额垫付代理费用',
    };
  }

  if (title.level >= 3) {
    // 暖阳以上 → 垫付首期
    return {
      titleLevel: title.level,
      titleName: title.name,
      advanceRatio: 0.5,
      description: '暖阳以上善行者，温暖基金垫付代理费用首期',
    };
  }

  // 暖阳以下 → 暂不垫付，可申请法律援助
  return {
    titleLevel: title.level,
    titleName: title.name,
    advanceRatio: 0,
    description: '可申请法律援助中心公益服务，累计善行至暖阳级别可获温暖基金垫付',
  };
};

/** 法律援助合作方列表 */
export const LEGAL_AID_PARTNERS = [
  {
    id: 'partner_1',
    name: '北京市法律援助中心',
    type: '政府机构',
    description: '官方法律援助机构，提供免费法律咨询与代理',
    icon: '⚖️',
  },
  {
    id: 'partner_2',
    name: '中国政法大学公益法律诊所',
    type: '大学法学院',
    description: '法学院师生公益法律诊所，提供专业法律指导',
    icon: '🎓',
  },
  {
    id: 'partner_3',
    name: '正义律师事务所 CSR 项目',
    type: '律所CSR',
    description: '律所企业社会责任项目，每年提供 100 小时公益法律服务',
    icon: '🏛️',
  },
  {
    id: 'partner_4',
    name: '温暖法律志愿者联盟',
    type: '公益组织',
    description: '由 200+ 执业律师组成的公益志愿者联盟',
    icon: '🤝',
  },
];

/** 证据保全指导 5 件事 */
export const EVIDENCE_PRESERVATION_GUIDE = [
  {
    step: 1,
    title: '拍摄周围环境',
    description: '360° 拍摄事发地点的全景，包括路标、建筑物等可识别标志',
    icon: '📷',
  },
  {
    step: 2,
    title: '拍摄对方状态',
    description: '客观记录对方身体状态与现场情况，避免主观判断',
    icon: '👁️',
  },
  {
    step: 3,
    title: '寻找目击者留微信',
    description: '请周围目击者留下联系方式，独立证言是关键证据',
    icon: '👤',
  },
  {
    step: 4,
    title: '开启手机录音',
    description: '全程录音，记录与对方及周围人的对话内容',
    icon: '🎙️',
  },
  {
    step: 5,
    title: '不要删除定位记录',
    description: '保留手机定位历史、运动轨迹等电子证据',
    icon: '📍',
  },
];
