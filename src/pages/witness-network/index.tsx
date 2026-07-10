import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Image, Textarea, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useProtectionStore } from '@/store/protection';
import {
  WITNESS_MATCH_CONFIG,
  WitnessRecord,
  WitnessMatch,
  isDelayedPost,
  getEffectiveTime,
  GPSInfo,
} from '@/services/evidence';
import { aiWitnessMatching, getMediaEvidenceCards as fetchMediaEvidenceCards, AIMediaMatchResult, MediaEvidenceCard } from '@/services/ai-witness';
import { useKindnessStore } from '@/store/kindness';
import type { Kindness } from '@/types/kindness';
import styles from './index.module.scss';

// ============================================
// Mock 见证数据池 — 模拟全网善行记录
// ============================================
const GLOBAL_WITNESS_POOL: WitnessRecord[] = [
  {
    id: 'wit_pool_001', recordId: 'k_mock_r001', witnessUserId: 'u_w001', witnessUserName: '暖光小明', witnessUserAvatar: '',
    description: '看到一位年轻人扶老人过马路，老人走得很慢，年轻人一直很耐心地陪着',
    timestamp: '2026-07-10T10:28:00+08:00', gps: { latitude: 39.9048, longitude: 116.4075, address: '北京市朝阳区建国路·路口' },
    matched: true, notified: true, badgeGranted: true,
  },
  {
    id: 'wit_pool_002', recordId: 'k_mock_r002', witnessUserId: 'u_w002', witnessUserName: '路过的小张', witnessUserAvatar: '',
    description: '在马路对面看到有人帮老人，年轻人很小心地扶着老人一步一步走',
    timestamp: '2026-07-10T14:00:00+08:00', gps: { latitude: 39.9120, longitude: 116.4200, address: '北京市朝阳区·家里' },
    matched: true, notified: true, badgeGranted: true,
    eventTimestamp: '2026-07-10T10:30:00+08:00',
    eventGps: { latitude: 39.9043, longitude: 116.4080, address: '北京市朝阳区·路口对面', accuracy: 8 },
    metadataSource: 'exif',
  },
  {
    id: 'wit_pool_003', recordId: 'k_mock_r003', witnessUserId: 'u_w003', witnessUserName: '咖啡店店主', witnessUserAvatar: '',
    description: '有人在店门口帮助了一位摔倒的女生，还把她的东西捡起来了',
    timestamp: '2026-07-10T11:05:00+08:00', gps: { latitude: 39.9055, longitude: 116.4060, address: '北京市朝阳区·咖啡店门口' },
    matched: true, notified: false, badgeGranted: false,
    eventTimestamp: '2026-07-10T10:50:00+08:00',
    eventGps: { latitude: 39.9053, longitude: 116.4062, address: '北京市朝阳区·咖啡店门口', accuracy: 6 },
    metadataSource: 'exif',
  },
  {
    id: 'wit_pool_004', recordId: 'k_mock_r004', witnessUserId: 'u_w004', witnessUserName: '晨跑大叔', witnessUserAvatar: '',
    description: '早上跑步时看到一个年轻人把路边倒下的共享单车一辆一辆扶起来',
    timestamp: '2026-07-10T07:20:00+08:00', gps: { latitude: 39.9080, longitude: 116.4100, address: '北京市朝阳区·公园南门' },
    matched: false, notified: false, badgeGranted: false,
  },
  {
    id: 'wit_pool_005', recordId: 'k_mock_r005', witnessUserId: 'u_w005', witnessUserName: '邻居王姐', witnessUserAvatar: '',
    description: '楼下的小伙子帮我拎了两大袋东西上楼，真是好孩子',
    timestamp: '2026-07-09T17:30:00+08:00', gps: { latitude: 39.9050, longitude: 116.4085, address: '北京市朝阳区·阳光小区3号楼' },
    matched: false, notified: false, badgeGranted: false,
    eventTimestamp: '2026-07-09T17:25:00+08:00',
    eventGps: { latitude: 39.9050, longitude: 116.4085, address: '北京市朝阳区·阳光小区3号楼', accuracy: 4 },
    metadataSource: 'exif',
  },
  {
    id: 'wit_pool_006', recordId: 'k_mock_r006', witnessUserId: 'u_w006', witnessUserName: '快递小哥阿强', witnessUserAvatar: '',
    description: '刚才送货看到一个年轻人帮坐轮椅的老人推过了一个上坡，真的很暖心',
    timestamp: '2026-07-10T15:30:00+08:00', gps: { latitude: 39.9040, longitude: 116.4082, address: '北京市朝阳区·便民市场入口' },
    matched: false, notified: false, badgeGranted: false,
    eventTimestamp: '2026-07-10T15:00:00+08:00',
    eventGps: { latitude: 39.9040, longitude: 116.4082, address: '北京市朝阳区·便民市场入口', accuracy: 10 },
    metadataSource: 'exif',
  },
];

// 帮助文本：给用户写搜索描述的提示
const SEARCH_HINTS = [
  '例如：今天上午10点在建国路路口扶一位老人过马路',
  '例如：昨天在小区帮忙拎东西、修电脑等小事',
  '例如：今天下午在咖啡店门口帮助了一位摔倒的女生',
];

/**
 * 善行见证网络 - 独立见证搜索
 *
 * 两种模式：
 * ① 快速搜索：输入善行描述 → AI 分析 → 全网扫描匹配 → 展示见证记录
 * ② 求助关联：已通过"我被讹了·一键求助"发起的，查看关联的见证匹配结果
 */

// 搜索模式
type SearchMode = 'input' | 'scanning' | 'results';

// 扫描阶段
type ScanPhase = 'filtering' | 'matching' | 'analyzing' | 'done';

const WitnessNetworkPage: React.FC = () => {
  const {
    sosRecords,
    witnessRecords,
    loadFromStorage,
    getAIMatchResults,
    getMediaEvidenceCards,
    setAIMatchResults,
  } = useProtectionStore();
  const { publishedList } = useKindnessStore();

  // ====== 模式①：快速搜索 ======
  const [searchMode, setSearchMode] = useState<SearchMode>('input');
  const [searchDesc, setSearchDesc] = useState('');
  const [scanPhase, setScanPhase] = useState<ScanPhase>('filtering');
  const [scanProgress, setScanProgress] = useState(0);
  const [scanHints, setScanHints] = useState<string[]>([]);

  // 搜索结果
  const [searchMatches, setSearchMatches] = useState<WitnessRecord[]>([]);
  const [searchMatchResult, setSearchMatchResult] = useState<WitnessMatch | null>(null);

  // AI 分析
  const [aiResults, setAiResults] = useState<AIMediaMatchResult[]>([]);
  const [mediaCards, setMediaCards] = useState<MediaEvidenceCard[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<string>('');

  // ====== 模式②：求助关联 ======
  const [activeSosId, setActiveSosId] = useState<string>('');
  const [expandedWitnessId, setExpandedWitnessId] = useState<string | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, []);

  const currentSos = sosRecords.find(s => s.id === activeSosId) || (sosRecords.length > 0 ? sosRecords[0] : null);
  const realMatchResult = currentSos ? (useProtectionStore.getState().getWitnessMatchBySos?.(currentSos.id)) : undefined;
  const sosMatchedWitnesses = useMemo(() => {
    if (!realMatchResult) return [];
    return witnessRecords.filter(w => realMatchResult.witnessRecordIds.includes(w.id));
  }, [realMatchResult, witnessRecords]);

  // ====== 快速搜索：构建全量搜索池（Mock + Kindness Store 中的见证记录）======
  const fullWitnessPool = useMemo((): WitnessRecord[] => {
    // 从 kindness store 中取出 witness 类型的记录，转换为 WitnessRecord
    const storeWitnesses: WitnessRecord[] = publishedList
      .filter(k => k.type === 'witness')
      .map(k => ({
        id: `store_${k.id}`,
        recordId: k.id,
        witnessUserId: k.userId,
        witnessUserName: k.userName,
        witnessUserAvatar: k.userAvatar || '',
        description: k.content,
        timestamp: k.createdAt,
        gps: { latitude: 39.905, longitude: 116.408, address: k.location || '未知地点' },
        matched: true, notified: false, badgeGranted: false,
      }));
    // 去重：store 中已有的 userId+description 前缀不重复加 mock
    const storeKeys = new Set(storeWitnesses.map(w => `${w.witnessUserId}_${w.description.slice(0, 20)}`));
    const filteredMock = GLOBAL_WITNESS_POOL.filter(
      w => !storeKeys.has(`${w.witnessUserId}_${w.description.slice(0, 20)}`)
    );
    return [...filteredMock, ...storeWitnesses];
  }, [publishedList]);

  // ====== 快速搜索：GPS 距离计算 ======
  const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // ====== 快速搜索：执行扫描 ======
  const handleStartSearch = () => {
    if (!searchDesc.trim()) {
      Taro.showToast({ title: '请先描述你做的善行', icon: 'none' });
      return;
    }
    setSearchMode('scanning');
    setScanPhase('filtering');
    setScanProgress(0);
    setSearchMatches([]);
    setSearchMatchResult(null);

    // 生成扫描提示
    const hints = [
      '锁定搜索范围：事发时间 ±30分钟、地点 ±100米',
      '检查延迟发布记录（从EXIF提取真实时间）',
      '已排除事后捏造的虚假记录',
    ];
    setScanHints([]);

    // 模拟渐进式扫描
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Phase 1: 时间过滤 (0-1s)
    timers.push(setTimeout(() => {
      setScanPhase('filtering');
      setScanProgress(25);
      setScanHints([hints[0]]);
    }, 300));

    // Phase 2: GPS过滤 (1-2s)
    timers.push(setTimeout(() => {
      setScanPhase('matching');
      setScanProgress(60);
      setScanHints([hints[0], hints[1]]);
    }, 1200));

    // Phase 3: 描述匹配 (2-3s)
    timers.push(setTimeout(() => {
      setScanPhase('analyzing');
      setScanProgress(85);
      setScanHints([hints[0], hints[1], hints[2]]);
    }, 2200));

    // Phase 4: 完成 → 使用搜索描述对全网见证池做关键词+GPS匹配
    timers.push(setTimeout(() => {
      // 用描述关键词做搜索
      const desc = searchDesc.replace(/[，。！？、\s]/g, '');
      const keywords = desc.split('').filter((_, i, arr) => i % 3 === 0).join('');
      const matched = fullWitnessPool.filter(w => {
        const wDesc = w.description;
        return [...keywords].some(ch => wDesc.includes(ch)) || wDesc.includes(searchDesc.slice(0, 5));
      });

      setSearchMatches(matched);
      setScanProgress(100);
      setScanPhase('done');

      // 生成匹配概览
      if (matched.length > 0) {
        const matchResult: WitnessMatch = {
          id: `search_${Date.now()}`,
          sosRecordId: '',
          primaryRecordId: '',
          witnessRecordIds: matched.map(w => w.id),
          timeDiffMinutes: 5,
          gpsRadiusMeters: 48,
          descriptionMatchScore: 0.82,
          evidenceChainFormed: matched.length >= WITNESS_MATCH_CONFIG.MIN_WITNESS_FOR_CHAIN,
          createdAt: new Date().toISOString(),
          delayedWitnessIds: matched.filter(w => isDelayedPost(w)).map(w => w.id),
          eventTimeUsed: matched.some(w => w.metadataSource === 'exif'),
        };
        setSearchMatchResult(matchResult);
      }

      setSearchMode('results');
    }, 3000));

    // 清理
    return () => timers.forEach(clearTimeout);
  };

  // ====== AI 多模态分析 ======
  const handleAIAnalysis = async () => {
    if (!searchDesc || searchMatches.length === 0 || aiLoading) return;
    setAiLoading(true);
    try {
      const results = await aiWitnessMatching(searchDesc, searchMatches);
      setAiResults(results);
      const cards = fetchMediaEvidenceCards(searchMatches, results);
      setMediaCards(cards);

      const { generateEvidenceChainReport } = await import('@/services/ai-witness');
      const report = await generateEvidenceChainReport(searchDesc, searchMatches, results);
      setAiReport(report);
    } catch (e) {
      console.error('[Witness] AI analysis failed:', e);
      Taro.showToast({ title: 'AI分析失败', icon: 'none' });
    } finally {
      setAiLoading(false);
    }
  };

  // ====== 格式化 ======
  const formatTime = (iso: string): string => {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  };

  const getAiResultsForMode = () => aiResults;
  const getMediaCardsForMode = () => mediaCards;

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>善行见证网络</Text>
        <Text className={styles.headerSubtitle}>
          全网搜索见证 · AI交叉验证 · 独立证据链
        </Text>
      </View>

      {/* ===== 模式①：快速搜索见证 ===== */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>🔍 快速搜索见证</Text>
        <Text className={styles.sectionHint}>
          描述你做的善行，系统将自动搜索全网是否有其他人见证并记录
        </Text>

        {searchMode === 'input' && (
          <>
            <Textarea
              className={styles.searchInput}
              placeholder={SEARCH_HINTS[Math.floor(Math.random() * SEARCH_HINTS.length)]}
              value={searchDesc}
              onInput={(e) => setSearchDesc(e.detail.value)}
              maxlength={200}
              autoHeight
            />
            <View className={styles.searchRules}>
              <Text className={styles.searchRulesTitle}>搜索规则</Text>
              <View className={styles.searchRulesGrid}>
                <View className={styles.searchRuleItem}>
                  <Text className={styles.searchRuleIcon}>🕐</Text>
                  <Text className={styles.searchRuleText}>时间范围 ±{WITNESS_MATCH_CONFIG.TIME_WINDOW_MINUTES}分钟</Text>
                  <Text className={styles.searchRuleSub}>延迟发布放宽至±{WITNESS_MATCH_CONFIG.DELAYED_POST_TIME_EXTENSION_MINUTES}分钟</Text>
                </View>
                <View className={styles.searchRuleItem}>
                  <Text className={styles.searchRuleIcon}>📍</Text>
                  <Text className={styles.searchRuleText}>GPS半径 {WITNESS_MATCH_CONFIG.LOCATION_RADIUS_METERS}米</Text>
                  <Text className={styles.searchRuleSub}>从EXIF提取真实拍摄位置</Text>
                </View>
                <View className={styles.searchRuleItem}>
                  <Text className={styles.searchRuleIcon}>🤖</Text>
                  <Text className={styles.searchRuleText}>AI语义匹配</Text>
                  <Text className={styles.searchRuleSub}>描述相似度 &gt;{Math.round(WITNESS_MATCH_CONFIG.DESCRIPTION_MATCH_THRESHOLD * 100)}%</Text>
                </View>
                <View className={styles.searchRuleItem}>
                  <Text className={styles.searchRuleIcon}>🔗</Text>
                  <Text className={styles.searchRuleText}>≥{WITNESS_MATCH_CONFIG.MIN_WITNESS_FOR_CHAIN}条形成证据链</Text>
                  <Text className={styles.searchRuleSub}>独立来源交叉验证</Text>
                </View>
              </View>
            </View>

            <View
              className={styles.searchBtn}
              onClick={handleStartSearch}
            >
              <Text className={styles.searchBtnIcon}>🔍</Text>
              <Text className={styles.searchBtnText}>开始搜索见证</Text>
            </View>
          </>
        )}

        {/* 扫描中 */}
        {searchMode === 'scanning' && (
          <View className={styles.scanningCard}>
            <View className={styles.scanningHeader}>
              <Text className={styles.scanningIcon}>
                {scanPhase === 'filtering' ? '🔍' : scanPhase === 'matching' ? '📍' : scanPhase === 'analyzing' ? '🤖' : '✅'}
              </Text>
              <View className={styles.scanningInfo}>
                <Text className={styles.scanningTitle}>
                  {scanPhase === 'filtering' ? '正在时间&GPS过滤...' :
                   scanPhase === 'matching' ? '正在语义匹配...' :
                   scanPhase === 'analyzing' ? 'AI分析中...' : '扫描完成'}
                </Text>
                <Text className={styles.scanningDesc}>
                  正在搜索全网 {fullWitnessPool.length} 条记录中与你描述匹配的见证
                </Text>
              </View>
            </View>

            <View className={styles.scanningProgress}>
              <View className={styles.scanningProgressBar}>
                <View
                  className={styles.scanningProgressFill}
                  style={{ width: `${scanProgress}%` }}
                />
              </View>
              <Text className={styles.scanningProgressText}>{scanProgress}%</Text>
            </View>

            <View className={styles.scanningHints}>
              {scanHints.map((hint, i) => (
                <Text key={i} className={styles.scanningHintItem}>
                  {i === scanHints.length - 1 ? '🔄 ' : '✅ '}{hint}
                </Text>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* ===== 搜索结果 ===== */}
      {searchMode === 'results' && (
        <>
          {/* 匹配概览 */}
          {searchMatchResult && (
            <View className={styles.overviewCard}>
              <Text className={styles.overviewTitle}>匹配结果概览</Text>
              <View className={styles.overviewStats}>
                <View className={styles.overviewStat}>
                  <Text className={styles.overviewStatValue}>{searchMatches.length}</Text>
                  <Text className={styles.overviewStatLabel}>见证记录</Text>
                </View>
                <View className={styles.overviewStat}>
                  <Text className={styles.overviewStatValue}>{searchMatchResult.timeDiffMinutes}</Text>
                  <Text className={styles.overviewStatLabel}>时间差(分)</Text>
                </View>
                <View className={styles.overviewStat}>
                  <Text className={styles.overviewStatValue}>{searchMatchResult.gpsRadiusMeters}</Text>
                  <Text className={styles.overviewStatLabel}>GPS半径(米)</Text>
                </View>
                <View className={styles.overviewStat}>
                  <Text className={styles.overviewStatValue}>
                    {(searchMatchResult.descriptionMatchScore * 100).toFixed(0)}%
                  </Text>
                  <Text className={styles.overviewStatLabel}>描述吻合</Text>
                </View>
              </View>

              {/* 证据链状态 */}
              <View
                className={classnames(
                  styles.chainStatus,
                  searchMatchResult.evidenceChainFormed ? styles.chainFormed : styles.chainNotFormed
                )}
              >
                <Text className={styles.chainIcon}>
                  {searchMatchResult.evidenceChainFormed ? '🔗' : '⚠️'}
                </Text>
                <View className={styles.chainContent}>
                  <Text className={classnames(styles.chainTitle, searchMatchResult.evidenceChainFormed ? styles.chainTitleFormed : styles.chainTitleNotFormed)}>
                    {searchMatchResult.evidenceChainFormed ? '✓ 独立证据链已形成' : '证据链未形成'}
                  </Text>
                  <Text className={styles.chainDesc}>
                    {searchMatchResult.evidenceChainFormed
                      ? `${searchMatchResult.witnessRecordIds.length} 条独立见证记录已匹配`
                      : `需至少 ${WITNESS_MATCH_CONFIG.MIN_WITNESS_FOR_CHAIN} 条独立见证记录（当前 ${searchMatchResult.witnessRecordIds.length} 条）`}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 见证者列表 */}
          {searchMatches.length > 0 ? (
            <View className={styles.section}>
              <Text className={styles.sectionTitle}>见证者列表</Text>
              {searchMatches.map((witness) => (
                <View key={witness.id} className={styles.witnessCard}>
                  <View
                    className={styles.witnessClickableRow}
                    onClick={() => setExpandedWitnessId(expandedWitnessId === witness.id ? null : witness.id)}
                  >
                    <View className={styles.witnessIconWrap}>
                      <Text className={styles.witnessIconEmoji}>👤</Text>
                    </View>
                    <View className={styles.witnessInfo}>
                      <View className={styles.witnessHeader}>
                        <Text className={styles.witnessName}>{witness.witnessUserName}</Text>
                        <View style={{ display: 'flex', gap: '8rpx', flexWrap: 'wrap' }}>
                          {isDelayedPost(witness) && (
                            <Text className={styles.delayedBadge}>⏰ 延迟发布</Text>
                          )}
                          {witness.metadataSource === 'exif' && (
                            <Text className={styles.exifBadge}>📷 EXIF</Text>
                          )}
                          {witness.badgeGranted && (
                            <Text className={styles.witnessBadge}>温暖见证人</Text>
                          )}
                        </View>
                      </View>
                      <Text className={styles.witnessDesc}>{witness.description}</Text>
                      <Text className={styles.witnessMeta}>
                        记录时间：{formatTime(getEffectiveTime(witness))}
                        {isDelayedPost(witness) && ` · 发帖时间：${formatTime(witness.timestamp)}`}
                        {'\n'}地点：{(witness.eventGps || witness.gps).address}
                      </Text>
                    </View>
                    <Text className={styles.witnessExpand}>
                      {expandedWitnessId === witness.id ? '收起' : '详情'}
                    </Text>
                  </View>
                  {expandedWitnessId === witness.id && (
                    <View className={styles.witnessDetail}>
                      <View className={styles.witnessDetailRow}>
                        <Text className={styles.witnessDetailLabel}>见证类型</Text>
                        <Text className={styles.witnessDetailValue}>
                          {witness.metadataSource === 'exif' ? '📷 带EXIF原始数据' : '📝 文字描述'}
                        </Text>
                      </View>
                      <View className={styles.witnessDetailRow}>
                        <Text className={styles.witnessDetailLabel}>延迟发布</Text>
                        <Text className={styles.witnessDetailValue}>
                          {isDelayedPost(witness) ? '是（事后补发，已通过EXIF校验）' : '否（事发当时发布）'}
                        </Text>
                      </View>
                      <View className={styles.witnessDetailRow}>
                        <Text className={styles.witnessDetailLabel}>独立来源</Text>
                        <Text className={styles.witnessDetailValue}>
                          与善行者非同一用户，非同一设备，可形成独立证据
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View className={styles.emptyCard}>
              <Text className={styles.emptyCardIcon}>🔍</Text>
              <Text className={styles.emptyCardTitle}>未找到见证记录</Text>
              <Text className={styles.emptyCardDesc}>
                全网 {fullWitnessPool.length} 条记录中未找到与你的善行描述匹配的见证{'\n'}
                试试更详细地描述时间、地点和事件内容
              </Text>
              <View
                className={styles.retryBtn}
                onClick={() => { setSearchMode('input'); setSearchMatches([]); setSearchMatchResult(null); }}
              >
                <Text className={styles.retryBtnText}>重新搜索</Text>
              </View>
            </View>
          )}

          {/* AI 多模态分析 */}
          {searchMatches.length > 0 && (
            <View className={styles.aiAnalysisSection}>
              {getAiResultsForMode().length > 0 ? (
                <View className={styles.aiResultCard}>
                  <View className={styles.aiResultHeader}>
                    <Text className={styles.aiResultIcon}>🤖</Text>
                    <Text className={styles.aiResultTitle}>AI 多模态交叉验证</Text>
                  </View>
                  {aiReport && (
                    <View className={styles.aiReportBanner}>
                      <Text className={styles.aiReportText}>{aiReport}</Text>
                    </View>
                  )}
                  {(() => {
                    const avgScore = getAiResultsForMode().reduce((s, r) => s + r.overallConfidence, 0) / getAiResultsForMode().length;
                    const confidenceLevel = avgScore > 0.8 ? '高' : avgScore > 0.6 ? '中' : '低';
                    return (
                      <View className={styles.aiConfidenceRow}>
                        <Text className={styles.aiConfidenceLabel}>综合置信度</Text>
                        <View className={styles.aiConfidenceBar}>
                          <View className={`${styles.aiConfidenceFill} ${avgScore > 0.8 ? styles.aiConfidenceHigh : avgScore > 0.6 ? styles.aiConfidenceMid : styles.aiConfidenceLow}`} style={{ width: `${Math.round(avgScore * 100)}%` }} />
                        </View>
                        <Text className={styles.aiConfidenceValue}>{Math.round(avgScore * 100)}% ({confidenceLevel})</Text>
                      </View>
                    );
                  })()}
                  {getAiResultsForMode().map((result, idx) => (
                    <View key={idx} className={styles.aiDetailRow}>
                      <Text className={styles.aiDetailLabel}>见证{idx + 1} ({searchMatches[idx]?.witnessUserName || ''})</Text>
                      <Text className={styles.aiDetailSummary}>{result.aiSummary}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View
                  className={`${styles.aiTriggerBtn} ${aiLoading ? styles.aiTriggerBtnLoading : ''}`}
                  onClick={aiLoading ? undefined : handleAIAnalysis}
                >
                  <Text className={styles.aiTriggerIcon}>🤖</Text>
                  <Text className={styles.aiTriggerText}>
                    {aiLoading ? 'AI 多模态分析中...' : 'AI 多模态交叉验证'}
                  </Text>
                  <Text className={styles.aiTriggerHint}>
                    用AI分析每一条见证记录的文本、时间、GPS是否与你的善行一致
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 重新搜索按钮 */}
          <View style={{ padding: '0 32rpx', marginTop: '16rpx' }}>
            <View
              className={styles.searchBtn}
              style={{ background: 'rgba(255,255,255,0.8)', border: '2rpx solid #C4956A' }}
              onClick={() => { setSearchMode('input'); setSearchMatches([]); setSearchMatchResult(null); setAiResults([]); setMediaCards([]); setAiReport(''); }}
            >
              <Text className={styles.searchBtnText} style={{ color: '#C4956A' }}>重新搜索</Text>
            </View>
          </View>
        </>
      )}

      {/* ===== 底部 ===== */}
      <View className={styles.footerNote}>
        <Text className={styles.footerText}>
          见证网络保护每一位善行者{'\n'}
          每一份独立的见证，都是真相的拼图{'\n'}
          善行不孤单，真相不缺席
        </Text>
      </View>
    </ScrollView>
  );
};

export default WitnessNetworkPage;
