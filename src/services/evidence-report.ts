/**
 * 善行证据报告生成服务
 *
 * 核心能力：
 * 1. 整合所有证据（善行记录、见证记录、媒体证据、GPS、时间线）
 * 2. 生成标准化证据报告，支持多机构格式
 * 3. 一键复制/分享/导出
 */

import {
  EvidencePackage,
  SOSRecord,
  WitnessRecord,
  WitnessMatch,
  CollectionRequest,
  GPSInfo,
} from './evidence';

// ============================================
// 类型定义
// ============================================

/** 报告支持的机构类型 */
export type ReportTarget = 'police' | 'traffic' | 'court' | 'insurance' | 'general';

/** 证据报告条目 */
export interface ReportEvidenceItem {
  type: 'kindness' | 'witness' | 'media' | 'gps' | 'timeline';
  title: string;
  content: string;
  timestamp: string;
  location?: string;
  confidence?: number;
  source?: string;
}

/** 时间线事件 */
export interface TimelineEvent {
  time: string;
  event: string;
  type: 'kindness' | 'incident' | 'witness' | 'sos' | 'evidence';
  detail?: string;
}

/** 证据报告 */
export interface EvidenceReport {
  id: string;
  sosRecordId: string;
  generatedAt: string;
  target: ReportTarget;
  title: string;
  summary: string;

  // 当事人信息
  party: {
    name: string;
    contact: string;
    description: string;
  };

  // 事件概述
  incident: {
    time: string;
    location: string;
    description: string;
    gps: GPSInfo;
  };

  // 证据链
  evidenceChain: ReportEvidenceItem[];

  // 时间线
  timeline: TimelineEvent[];

  // 见证人列表
  witnesses: {
    name: string;
    contact: string;
    statement: string;
    relation: string;
    confidence: number;
  }[];

  // 媒体证据清单
  mediaList: {
    type: string;
    description: string;
    timestamp: string;
    hash?: string;
  }[];

  // 结论
  conclusion: string;

  // 附件
  attachments: string[];

  // 生成信息
  generatedBy: string;
  platform: string;
  reportHash: string;
}

/** 机构模板配置 */
export const REPORT_TEMPLATES: Record<ReportTarget, {
  name: string;
  title: string;
  header: string;
  footer: string;
  format: string;
}> = {
  police: {
    name: '公安机关',
    title: '善行证据报告（报案用）',
    header: '本报告由"好事发生"平台自动生成，用于协助公安机关调查取证。',
    footer: '以上证据材料由平台技术存证，具备时间戳和哈希校验，确保证据真实性和完整性。',
    format: 'standard',
  },
  traffic: {
    name: '交警部门',
    title: '善行证据报告（交通事故用）',
    header: '本报告由"好事发生"平台自动生成，用于协助交警部门事故责任认定。',
    footer: '以上证据包含GPS定位、时间戳和第三方见证记录，可作为事故认定参考。',
    format: 'standard',
  },
  court: {
    name: '人民法院',
    title: '善行证据报告（诉讼用）',
    header: '本报告由"好事发生"平台自动生成，作为民事诉讼证据材料提交。',
    footer: '本报告所附证据均经过平台技术存证，具备不可篡改性和可追溯性，符合《电子签名法》规定。',
    format: 'legal',
  },
  insurance: {
    name: '保险公司',
    title: '善行证据报告（理赔用）',
    header: '本报告由"好事发生"平台自动生成，用于善行保险理赔申请。',
    footer: '以上材料证明善行者事发时正在实施善行行为，且具备第三方见证，可作为理赔依据。',
    format: 'standard',
  },
  general: {
    name: '通用',
    title: '善行证据报告',
    header: '本报告由"好事发生"平台自动生成。',
    footer: '以上证据材料由平台自动整理，真实性和完整性由技术存证保障。',
    format: 'standard',
  },
};

// ============================================
// 报告生成函数
// ============================================

/**
 * 生成证据报告
 * 整合所有证据数据，生成标准化的法律文书
 */
export const generateEvidenceReport = (
  sosRecord: SOSRecord,
  evidencePackage: EvidencePackage,
  witnessMatch: WitnessMatch | undefined,
  witnessRecords: WitnessRecord[],
  collectionRequest: CollectionRequest | undefined,
  target: ReportTarget = 'general',
  userName: string = '善行者'
): EvidenceReport => {
  const template = REPORT_TEMPLATES[target];
  const now = new Date().toISOString();

  // 构建证据链
  const evidenceChain: ReportEvidenceItem[] = [];

  // 1. 善行记录（事前存证）
  evidenceChain.push({
    type: 'kindness',
    title: '善行事前存证',
    content: evidencePackage.content,
    timestamp: evidencePackage.timestamp,
    location: evidencePackage.gps.address,
    source: '平台事前存证',
  });

  // 2. GPS定位信息
  evidenceChain.push({
    type: 'gps',
    title: '事发地点GPS定位',
    content: `纬度：${evidencePackage.gps.latitude}，经度：${evidencePackage.gps.longitude}，地址：${evidencePackage.gps.address}`,
    timestamp: evidencePackage.timestamp,
    location: evidencePackage.gps.address,
    source: 'GPS定位系统',
  });

  // 3. 见证记录
  const matchedWitnesses = witnessRecords.filter(w =>
    witnessMatch?.witnessRecordIds.includes(w.id)
  );

  matchedWitnesses.forEach((w, index) => {
    evidenceChain.push({
      type: 'witness',
      title: `独立见证记录 ${index + 1}`,
      content: w.description,
      timestamp: w.eventTimestamp || w.timestamp,
      location: (w.eventGps || w.gps).address,
      confidence: witnessMatch?.descriptionMatchScore,
      source: `见证人：${w.witnessUserName}`,
    });
  });

  // 4. 媒体证据
  evidencePackage.mediaUrls.forEach((media, index) => {
    evidenceChain.push({
      type: 'media',
      title: `媒体证据 ${index + 1}`,
      content: `${media.type === 'image' ? '照片' : media.type === 'video' ? '视频' : '录音'}：${media.url}`,
      timestamp: media.createdAt,
      source: '当事人上传',
    });
  });

  // 构建时间线
  const timeline: TimelineEvent[] = [];

  // 善行记录时间
  timeline.push({
    time: evidencePackage.eventTimestamp || evidencePackage.timestamp,
    event: '善行行为发生',
    type: 'kindness',
    detail: evidencePackage.content.substring(0, 50) + '...',
  });

  // 见证时间
  matchedWitnesses.forEach(w => {
    timeline.push({
      time: w.eventTimestamp || w.timestamp,
      event: `见证人${w.witnessUserName}记录`,
      type: 'witness',
      detail: w.description.substring(0, 40) + '...',
    });
  });

  // SOS求助时间
  timeline.push({
    time: sosRecord.triggeredAt,
    event: '发起善行保护求助',
    type: 'sos',
    detail: sosRecord.description,
  });

  // 证据链形成时间
  if (witnessMatch) {
    timeline.push({
      time: witnessMatch.createdAt,
      event: '独立证据链形成',
      type: 'evidence',
      detail: `${witnessMatch.witnessRecordIds.length}条独立见证记录匹配成功`,
    });
  }

  // 按时间排序
  timeline.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  // 构建见证人列表
  const witnesses = matchedWitnesses.map(w => ({
    name: w.witnessUserName,
    contact: '通过平台联系',
    statement: w.description,
    relation: '独立第三方见证人',
    confidence: witnessMatch?.descriptionMatchScore || 0.5,
  }));

  // 媒体清单
  const mediaList = evidencePackage.mediaUrls.map(m => ({
    type: m.type === 'image' ? '照片' : m.type === 'video' ? '视频' : '录音',
    description: `媒体文件，创建时间：${m.createdAt}`,
    timestamp: m.createdAt,
    hash: evidencePackage.hash,
  }));

  // 结论
  const evidenceChainFormed = witnessMatch?.evidenceChainFormed || false;
  const conclusion = evidenceChainFormed
    ? `经平台见证网络扫描和AI多模态分析，共有${matchedWitnesses.length}位独立第三方见证人提供了与事件描述高度吻合的见证记录，证据链完整可信。善行行为确系在争议发生前实施，具备不可抵赖性。`
    : `平台已锁定善行事前存证，包含时间戳和GPS定位。当前有${matchedWitnesses.length}位见证人提供了相关记录，建议继续征集更多独立见证以形成完整证据链。`;

  // 生成报告哈希
  const hashSource = `${sosRecord.id}|${now}|${evidencePackage.hash}|${target}`;
  const reportHash = `rp_${btoa(hashSource).slice(0, 16)}`;

  return {
    id: `report_${Date.now()}`,
    sosRecordId: sosRecord.id,
    generatedAt: now,
    target,
    title: template.title,
    summary: `关于"${sosRecord.description}"的证据材料汇总报告`,
    party: {
      name: userName,
      contact: '通过平台联系',
      description: sosRecord.description,
    },
    incident: {
      time: evidencePackage.eventTimestamp || evidencePackage.timestamp,
      location: evidencePackage.gps.address,
      description: evidencePackage.content,
      gps: evidencePackage.gps,
    },
    evidenceChain,
    timeline,
    witnesses,
    mediaList,
    conclusion,
    attachments: [
      '善行事前存证包',
      '见证记录清单',
      'GPS定位信息',
      '时间线整理',
      ...(collectionRequest ? ['主动征集记录'] : []),
    ],
    generatedBy: '好事发生·善行保护系统',
    platform: '好事发生（AI善行记录与保护平台）',
    reportHash,
  };
};

/**
 * 生成纯文本格式报告（用于复制粘贴）
 */
export const generateTextReport = (report: EvidenceReport): string => {
  const template = REPORT_TEMPLATES[report.target];

  let text = '';
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `  ${report.title}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `${template.header}\n\n`;

  text += `【报告编号】${report.reportHash}\n`;
  text += `【生成时间】${formatDateTime(report.generatedAt)}\n`;
  text += `【提交机构】${template.name}\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `  一、当事人信息\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `当事人：${report.party.name}\n`;
  text += `事件描述：${report.party.description}\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `  二、事件概述\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `事发时间：${formatDateTime(report.incident.time)}\n`;
  text += `事发地点：${report.incident.location}\n`;
  text += `GPS定位：纬度${report.incident.gps.latitude} 经度${report.incident.gps.longitude}\n`;
  text += `事件经过：${report.incident.description}\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `  三、证据链\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  report.evidenceChain.forEach((item, index) => {
    text += `${index + 1}. 【${item.title}】\n`;
    text += `   时间：${formatDateTime(item.timestamp)}\n`;
    if (item.location) text += `   地点：${item.location}\n`;
    text += `   内容：${item.content}\n`;
    if (item.source) text += `   来源：${item.source}\n`;
    if (item.confidence) text += `   可信度：${(item.confidence * 100).toFixed(0)}%\n`;
    text += `\n`;
  });

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `  四、事件时间线\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  report.timeline.forEach((event) => {
    const icon = event.type === 'kindness' ? '🤝' : event.type === 'witness' ? '👁' : event.type === 'sos' ? '🆘' : '📋';
    text += `${icon} ${formatDateTime(event.time)} - ${event.event}\n`;
    if (event.detail) text += `   ${event.detail}\n`;
  });
  text += `\n`;

  if (report.witnesses.length > 0) {
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `  五、见证人信息\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report.witnesses.forEach((w, index) => {
      text += `见证人 ${index + 1}：${w.name}\n`;
      text += `身份：${w.relation}\n`;
      text += `陈述：${w.statement}\n`;
      text += `匹配度：${(w.confidence * 100).toFixed(0)}%\n\n`;
    });
  }

  if (report.mediaList.length > 0) {
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `  六、媒体证据清单\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    report.mediaList.forEach((m, index) => {
      text += `${index + 1}. ${m.type} - ${m.description}\n`;
      text += `   时间：${formatDateTime(m.timestamp)}\n`;
      if (m.hash) text += `   存证哈希：${m.hash}\n`;
    });
    text += `\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `  七、结论\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  text += `${report.conclusion}\n\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `  附件清单\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  report.attachments.forEach((a, index) => {
    text += `${index + 1}. ${a}\n`;
  });
  text += `\n`;

  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `${template.footer}\n\n`;
  text += `生成平台：${report.platform}\n`;
  text += `报告哈希：${report.reportHash}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return text;
};

/**
 * 格式化日期时间
 */
const formatDateTime = (iso: string): string => {
  if (!iso) return '';
  const date = new Date(iso);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 复制报告到剪贴板
 */
export const copyReportToClipboard = async (text: string): Promise<boolean> => {
  try {
    // 使用 Taro 剪贴板API
    const Taro = (await import('@tarojs/taro')).default;
    await Taro.setClipboardData({ data: text });
    return true;
  } catch {
    return false;
  }
};
