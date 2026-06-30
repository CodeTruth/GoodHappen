import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import classnames from 'classnames';
import { useProtectionStore } from '@/store/protection';
import {
  EvidenceReport,
  ReportTarget,
  REPORT_TEMPLATES,
  generateEvidenceReport,
  generateTextReport,
  copyReportToClipboard,
} from '@/services/evidence-report';
import styles from './index.module.scss';

/**
 * 证据报告预览页面
 *
 * 功能：
 * 1. 根据 sosRecordId 生成证据报告
 * 2. 支持切换机构模板（police/traffic/court/insurance/general）
 * 3. 展示报告完整内容
 * 4. 支持复制报告文本和分享
 */

const TARGET_TABS: { key: ReportTarget; label: string }[] = [
  { key: 'police', label: '公安机关' },
  { key: 'traffic', label: '交警部门' },
  { key: 'court', label: '人民法院' },
  { key: 'insurance', label: '保险公司' },
  { key: 'general', label: '通用' },
];

const EvidenceReportPage: React.FC = () => {
  const router = useRouter();
  const { id: sosRecordId } = router.params || {};

  const {
    sosRecords,
    witnessRecords,
    evidencePackages,
    witnessMatches,
    collectionRequests,
    getEvidenceByRecordId,
    getWitnessMatchBySos,
    getCollectionBySos,
  } = useProtectionStore();

  const [target, setTarget] = useState<ReportTarget>('general');
  const [report, setReport] = useState<EvidenceReport | null>(null);
  const [copying, setCopying] = useState(false);

  // 查找当前 SOS 记录
  const sosRecord = useMemo(() => {
    if (!sosRecordId) return undefined;
    return sosRecords.find((s) => s.id === sosRecordId);
  }, [sosRecords, sosRecordId]);

  // 查找证据包
  const evidencePackage = useMemo(() => {
    if (!sosRecord) return undefined;
    // 优先使用 store 方法，否则在 evidencePackages 中查找
    const pkg = getEvidenceByRecordId(sosRecord.recordId);
    if (pkg) return pkg;
    return evidencePackages.find((p) => p.recordId === sosRecord.recordId);
  }, [sosRecord, getEvidenceByRecordId, evidencePackages]);

  // 查找见证匹配
  const witnessMatch = useMemo(() => {
    if (!sosRecordId) return undefined;
    const match = getWitnessMatchBySos(sosRecordId);
    if (match) return match;
    return witnessMatches.find((m) => m.sosRecordId === sosRecordId);
  }, [sosRecordId, getWitnessMatchBySos, witnessMatches]);

  // 查找征集请求
  const collectionRequest = useMemo(() => {
    if (!sosRecordId) return undefined;
    const req = getCollectionBySos(sosRecordId);
    if (req) return req;
    return collectionRequests.find((r) => r.sosRecordId === sosRecordId);
  }, [sosRecordId, getCollectionBySos, collectionRequests]);

  // 生成报告
  useEffect(() => {
    if (!sosRecord || !evidencePackage) {
      setReport(null);
      return;
    }
    const generated = generateEvidenceReport(
      sosRecord,
      evidencePackage,
      witnessMatch,
      witnessRecords,
      collectionRequest,
      target,
      '善行者'
    );
    setReport(generated);
  }, [sosRecord, evidencePackage, witnessMatch, witnessRecords, collectionRequest, target]);

  // 格式化日期时间
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

  // 复制报告
  const handleCopy = async () => {
    if (!report || copying) return;
    setCopying(true);
    const text = generateTextReport(report);
    const success = await copyReportToClipboard(text);
    setCopying(false);
    if (success) {
      Taro.showToast({ title: '报告已复制到剪贴板', icon: 'success' });
    } else {
      Taro.showToast({ title: '复制失败', icon: 'none' });
    }
  };

  // 分享报告
  const handleShare = () => {
    Taro.showShareMenu({
      withShareTicket: true,
    });
  };

  // 时间线图标
  const getTimelineIcon = (type: string): string => {
    switch (type) {
      case 'kindness':
        return '🤝';
      case 'witness':
        return '👁';
      case 'sos':
        return '🆘';
      case 'evidence':
        return '📋';
      default:
        return '•';
    }
  };

  // 证据类型标签
  const getEvidenceTypeLabel = (type: string): string => {
    switch (type) {
      case 'kindness':
        return '善行存证';
      case 'gps':
        return 'GPS定位';
      case 'witness':
        return '见证记录';
      case 'media':
        return '媒体证据';
      case 'timeline':
        return '时间线';
      default:
        return '其他';
    }
  };

  if (!sosRecordId) {
    return (
      <View className={styles.emptyContainer}>
        <Text className={styles.emptyIcon}>📄</Text>
        <Text className={styles.emptyTitle}>缺少记录ID</Text>
        <Text className={styles.emptyDesc}>请从求助记录页面进入查看证据报告</Text>
      </View>
    );
  }

  if (!sosRecord || !evidencePackage) {
    return (
      <View className={styles.emptyContainer}>
        <Text className={styles.emptyIcon}>📄</Text>
        <Text className={styles.emptyTitle}>暂无报告数据</Text>
        <Text className={styles.emptyDesc}>
          未找到对应的求助记录或证据包{'\n'}
          请确认记录存在后重试
        </Text>
      </View>
    );
  }

  const template = REPORT_TEMPLATES[target];

  return (
    <View className={styles.page}>
      <ScrollView className={styles.container} scrollY enableBackToTop>
        {/* 头部 */}
        <View className={styles.header}>
          <Text className={styles.headerTitle}>证据报告</Text>
          <Text className={styles.headerSubtitle}>
            {template.name} · {template.title}
          </Text>
        </View>

        {/* 机构模板切换 */}
        <View className={styles.tabBar}>
          <ScrollView scrollX enableFlex className={styles.tabScroll}>
            <View className={styles.tabInner}>
              {TARGET_TABS.map((tab) => (
                <View
                  key={tab.key}
                  className={classnames(
                    styles.tabItem,
                    target === tab.key && styles.tabItemActive
                  )}
                  onClick={() => setTarget(tab.key)}
                >
                  <Text
                    className={classnames(
                      styles.tabItemText,
                      target === tab.key && styles.tabItemTextActive
                    )}
                  >
                    {tab.label}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {report && (
          <>
            {/* 报告头部信息 */}
            <View className={styles.reportCard}>
              <Text className={styles.reportTitle}>{report.title}</Text>
              <Text className={styles.reportMeta}>报告编号：{report.reportHash}</Text>
              <Text className={styles.reportMeta}>
                生成时间：{formatDateTime(report.generatedAt)}
              </Text>
              <Text className={styles.reportMeta}>提交机构：{template.name}</Text>
              <View className={styles.reportDivider} />
              <Text className={styles.reportHeaderText}>{template.header}</Text>
            </View>

            {/* 当事人信息 */}
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>一、当事人信息</Text>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>当事人</Text>
                <Text className={styles.infoValue}>{report.party.name}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>联系方式</Text>
                <Text className={styles.infoValue}>{report.party.contact}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>事件描述</Text>
                <Text className={styles.infoValue}>{report.party.description}</Text>
              </View>
            </View>

            {/* 事件概述 */}
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>二、事件概述</Text>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>事发时间</Text>
                <Text className={styles.infoValue}>
                  {formatDateTime(report.incident.time)}
                </Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>事发地点</Text>
                <Text className={styles.infoValue}>{report.incident.location}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>GPS定位</Text>
                <Text className={styles.infoValue}>
                  纬度 {report.incident.gps.latitude.toFixed(6)} 经度{' '}
                  {report.incident.gps.longitude.toFixed(6)}
                </Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.infoLabel}>事件经过</Text>
                <Text className={styles.infoValue}>{report.incident.description}</Text>
              </View>
            </View>

            {/* 证据链 */}
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>三、证据链</Text>
              {report.evidenceChain.map((item, index) => (
                <View key={index} className={styles.evidenceItem}>
                  <View className={styles.evidenceHeader}>
                    <Text className={styles.evidenceNumber}>{index + 1}</Text>
                    <Text className={styles.evidenceType}>
                      {getEvidenceTypeLabel(item.type)}
                    </Text>
                    <Text className={styles.evidenceTitle}>{item.title}</Text>
                  </View>
                  <Text className={styles.evidenceContent}>{item.content}</Text>
                  <View className={styles.evidenceMetaRow}>
                    <Text className={styles.evidenceMeta}>
                      {formatDateTime(item.timestamp)}
                    </Text>
                    {item.location && (
                      <Text className={styles.evidenceMeta}>{item.location}</Text>
                    )}
                  </View>
                  {item.source && (
                    <Text className={styles.evidenceSource}>来源：{item.source}</Text>
                  )}
                  {typeof item.confidence === 'number' && (
                    <Text className={styles.evidenceConfidence}>
                      可信度：{(item.confidence * 100).toFixed(0)}%
                    </Text>
                  )}
                </View>
              ))}
            </View>

            {/* 时间线 */}
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>四、事件时间线</Text>
              <View className={styles.timeline}>
                {report.timeline.map((event, index) => (
                  <View key={index} className={styles.timelineItem}>
                    <View className={styles.timelineDot}>
                      <Text className={styles.timelineIcon}>
                        {getTimelineIcon(event.type)}
                      </Text>
                    </View>
                    <View className={styles.timelineContent}>
                      <Text className={styles.timelineTime}>
                        {formatDateTime(event.time)}
                      </Text>
                      <Text className={styles.timelineEvent}>{event.event}</Text>
                      {event.detail && (
                        <Text className={styles.timelineDetail}>{event.detail}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 见证人 */}
            {report.witnesses.length > 0 && (
              <View className={styles.section}>
                <Text className={styles.sectionTitle}>五、见证人信息</Text>
                {report.witnesses.map((w, index) => (
                  <View key={index} className={styles.witnessCard}>
                    <View className={styles.witnessHeader}>
                      <Text className={styles.witnessName}>
                        见证人 {index + 1}：{w.name}
                      </Text>
                      <Text className={styles.witnessRelation}>{w.relation}</Text>
                    </View>
                    <Text className={styles.witnessStatement}>{w.statement}</Text>
                    <Text className={styles.witnessConfidence}>
                      匹配度：{(w.confidence * 100).toFixed(0)}%
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* 媒体证据清单 */}
            {report.mediaList.length > 0 && (
              <View className={styles.section}>
                <Text className={styles.sectionTitle}>六、媒体证据清单</Text>
                {report.mediaList.map((m, index) => (
                  <View key={index} className={styles.mediaItem}>
                    <Text className={styles.mediaType}>
                      {index + 1}. {m.type}
                    </Text>
                    <Text className={styles.mediaDesc}>{m.description}</Text>
                    <Text className={styles.mediaTime}>
                      时间：{formatDateTime(m.timestamp)}
                    </Text>
                    {m.hash && (
                      <Text className={styles.mediaHash}>存证哈希：{m.hash}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {/* 结论 */}
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>七、结论</Text>
              <View className={styles.conclusionBox}>
                <Text className={styles.conclusionText}>{report.conclusion}</Text>
              </View>
            </View>

            {/* 附件清单 */}
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>附件清单</Text>
              {report.attachments.map((a, index) => (
                <View key={index} className={styles.attachmentItem}>
                  <Text className={styles.attachmentNumber}>{index + 1}</Text>
                  <Text className={styles.attachmentName}>{a}</Text>
                </View>
              ))}
            </View>

            {/* 报告尾部 */}
            <View className={styles.reportFooter}>
              <Text className={styles.reportFooterText}>{template.footer}</Text>
              <Text className={styles.reportFooterMeta}>
                生成平台：{report.platform}
              </Text>
              <Text className={styles.reportFooterMeta}>
                报告哈希：{report.reportHash}
              </Text>
            </View>

            {/* 底部留白，避免被固定栏遮挡 */}
            <View className={styles.bottomSpacer} />
          </>
        )}
      </ScrollView>

      {/* 底部固定操作栏 */}
      <View className={styles.actionBar}>
        <View
          className={classnames(styles.actionBtn, styles.actionBtnPrimary)}
          onClick={handleCopy}
        >
          <Text className={styles.actionBtnIcon}>📋</Text>
          <Text className={styles.actionBtnText}>
            {copying ? '复制中...' : '复制报告文本'}
          </Text>
        </View>
        <View
          className={classnames(styles.actionBtn, styles.actionBtnSecondary)}
          onClick={handleShare}
        >
          <Text className={styles.actionBtnIcon}>📤</Text>
          <Text className={styles.actionBtnText}>分享报告</Text>
        </View>
      </View>
    </View>
  );
};

export default EvidenceReportPage;
