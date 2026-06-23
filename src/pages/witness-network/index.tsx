import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useProtectionStore } from '@/store/protection';
import { WITNESS_MATCH_CONFIG } from '@/services/evidence';
import { useUserStore } from '@/store/user';
import styles from './index.module.scss';

/**
 * 善行见证网络页面 - Phase 9 P4
 *
 * 功能：
 * 1. 展示见证网络匹配结果
 * 2. 显示时间差、GPS 半径、描述吻合度
 * 3. 显示独立证据链是否形成
 * 4. 展示见证者列表与"温暖见证人"徽章
 * 5. 见证者收到通知状态
 */
const WitnessNetworkPage: React.FC = () => {
  const {
    sosRecords,
    witnessRecords,
    scanWitnesses,
    getWitnessMatchBySos,
    getNotifiedWitnesses,
    loadFromStorage,
  } = useProtectionStore();

  const { loadFromStorage: loadUser } = useUserStore();

  const [activeSosId, setActiveSosId] = useState<string>('');

  useEffect(() => {
    loadFromStorage();
    loadUser();
  }, []);

  // 默认选中最新求助记录
  useEffect(() => {
    if (sosRecords.length > 0 && !activeSosId) {
      setActiveSosId(sosRecords[0].id);
    }
  }, [sosRecords, activeSosId]);

  // 当前求助记录
  const currentSos = sosRecords.find(s => s.id === activeSosId) || sosRecords[0];

  // 见证匹配结果
  const matchResult = currentSos ? getWitnessMatchBySos(currentSos.id) : undefined;

  // 匹配的见证记录
  const matchedWitnesses = useMemo(() => {
    if (!matchResult) return [];
    return witnessRecords.filter(w => matchResult.witnessRecordIds.includes(w.id));
  }, [matchResult, witnessRecords]);

  // 已通知的见证者（获得徽章的）
  const notifiedWitnesses = getNotifiedWitnesses();

  // 格式化时间
  const formatTime = (iso: string): string => {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 重新扫描
  const handleRescan = () => {
    if (!currentSos) {
      Taro.showToast({ title: '请先发起求助', icon: 'none' });
      return;
    }
    const result = scanWitnesses(currentSos.id);
    if (result.success) {
      Taro.showToast({
        title: `匹配到 ${result.matchCount} 条见证记录`,
        icon: 'success',
      });
    } else {
      Taro.showToast({ title: '扫描失败', icon: 'none' });
    }
  };

  // 是否有空状态
  const hasNoData = !currentSos || !matchResult;

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>善行见证网络</Text>
        <Text className={styles.headerSubtitle}>
          分布式目击，独立证据链{'\n'}
          让真相不再孤单
        </Text>
      </View>

      {/* 见证网络说明 */}
      <View className={styles.infoCard}>
        <Text className={styles.infoTitle}>🌐 见证网络如何工作</Text>
        <Text className={styles.infoText}>
          当善行者点击"我被讹了"，系统会自动扫描：{'\n'}
          · 事发时间 ±{WITNESS_MATCH_CONFIG.TIME_WINDOW_MINUTES} 分钟内的见证记录{'\n'}
          · 地点半径 {WITNESS_MATCH_CONFIG.LOCATION_RADIUS_METERS}m 内的独立用户{'\n'}
          · {WITNESS_MATCH_CONFIG.MIN_WITNESS_FOR_CHAIN} 条以上独立记录 → 形成证据链{'\n'}
          见证者将收到通知并获得"温暖见证人"徽章
        </Text>
      </View>

      {hasNoData ? (
        /* 空状态 */
        <View className={styles.empty}>
          <Text className={styles.emptyIcon}>🔍</Text>
          <Text className={styles.emptyTitle}>暂无见证匹配</Text>
          <Text className={styles.emptyDesc}>
            发起"我被讹了"求助后{'\n'}
            系统将自动扫描见证网络
          </Text>
        </View>
      ) : (
        <>
          {/* 求助记录切换 */}
          {sosRecords.length > 1 && (
            <ScrollView scrollX style={{ padding: '0 32rpx', marginBottom: '16rpx', whiteSpace: 'nowrap' }}>
              {sosRecords.map((sos) => (
                <Text
                  key={sos.id}
                  style={{
                    display: 'inline-block',
                    padding: '12rpx 24rpx',
                    borderRadius: '48rpx',
                    marginRight: '16rpx',
                    fontSize: '24rpx',
                    background: activeSosId === sos.id ? '#FF6B6B' : '#f2f3f5',
                    color: activeSosId === sos.id ? '#fff' : '#666',
                  }}
                  onClick={() => setActiveSosId(sos.id)}
                >
                  {formatTime(sos.triggeredAt)}
                </Text>
              ))}
            </ScrollView>
          )}

          {/* 匹配结果概览 */}
          <View className={styles.overviewCard}>
            <Text className={styles.overviewTitle}>匹配结果概览</Text>
            <View className={styles.overviewStats}>
              <View className={styles.overviewStat}>
                <Text className={styles.overviewStatValue}>{currentSos.witnessMatchCount}</Text>
                <Text className={styles.overviewStatLabel}>见证记录</Text>
              </View>
              <View className={styles.overviewStat}>
                <Text className={styles.overviewStatValue}>{matchResult.timeDiffMinutes}</Text>
                <Text className={styles.overviewStatLabel}>时间差(分)</Text>
              </View>
              <View className={styles.overviewStat}>
                <Text className={styles.overviewStatValue}>{matchResult.gpsRadiusMeters}</Text>
                <Text className={styles.overviewStatLabel}>GPS半径(米)</Text>
              </View>
              <View className={styles.overviewStat}>
                <Text className={styles.overviewStatValue}>
                  {(matchResult.descriptionMatchScore * 100).toFixed(0)}%
                </Text>
                <Text className={styles.overviewStatLabel}>描述吻合</Text>
              </View>
            </View>

            {/* 证据链状态 */}
            <View
              className={classnames(
                styles.chainStatus,
                matchResult.evidenceChainFormed ? styles.chainFormed : styles.chainNotFormed
              )}
            >
              <Text className={styles.chainIcon}>
                {matchResult.evidenceChainFormed ? '🔗' : '⚠️'}
              </Text>
              <View className={styles.chainContent}>
                <Text
                  className={classnames(
                    styles.chainTitle,
                    matchResult.evidenceChainFormed
                      ? styles.chainTitleFormed
                      : styles.chainTitleNotFormed
                  )}
                >
                  {matchResult.evidenceChainFormed
                    ? '✓ 独立证据链已形成'
                    : '证据链未形成'}
                </Text>
                <Text className={styles.chainDesc}>
                  {matchResult.evidenceChainFormed
                    ? `${matchResult.witnessRecordIds.length} 条独立见证记录已匹配，时间差、GPS 半径、描述吻合度均达标`
                    : `需至少 ${WITNESS_MATCH_CONFIG.MIN_WITNESS_FOR_CHAIN} 条独立见证记录才能形成证据链（当前 ${matchResult.witnessRecordIds.length} 条）`}
                </Text>
              </View>
            </View>
          </View>

          {/* 匹配参数详情 */}
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>匹配参数</Text>
            <View className={styles.matchParams}>
              <View className={styles.paramItem}>
                <Text className={styles.paramLabel}>时间窗口</Text>
                <Text className={styles.paramValue}>
                  ±{WITNESS_MATCH_CONFIG.TIME_WINDOW_MINUTES} 分钟
                </Text>
              </View>
              <View className={styles.paramItem}>
                <Text className={styles.paramLabel}>地点半径</Text>
                <Text className={styles.paramValue}>
                  {WITNESS_MATCH_CONFIG.LOCATION_RADIUS_METERS} 米
                </Text>
              </View>
              <View className={styles.paramItem}>
                <Text className={styles.paramLabel}>实际时间差</Text>
                <Text className={styles.paramValue}>
                  {matchResult.timeDiffMinutes} 分钟
                </Text>
              </View>
              <View className={styles.paramItem}>
                <Text className={styles.paramLabel}>实际 GPS 半径</Text>
                <Text className={styles.paramValue}>
                  {matchResult.gpsRadiusMeters} 米
                </Text>
              </View>
              <View className={styles.paramItem}>
                <Text className={styles.paramLabel}>描述吻合度</Text>
                <Text className={styles.paramValue}>
                  {(matchResult.descriptionMatchScore * 100).toFixed(0)}%
                </Text>
              </View>
            </View>
          </View>

          {/* 见证者列表 */}
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>见证者列表</Text>
            {matchedWitnesses.length > 0 ? (
              matchedWitnesses.map((witness) => (
                <View key={witness.id} className={styles.witnessItem}>
                  <Image className={styles.witnessAvatar} src={witness.witnessUserAvatar} mode='aspectFill' />
                  <View className={styles.witnessInfo}>
                    <View className={styles.witnessHeader}>
                      <Text className={styles.witnessName}>{witness.witnessUserName}</Text>
                      {witness.badgeGranted && (
                        <Text className={styles.witnessBadge}>温暖见证人</Text>
                      )}
                    </View>
                    <Text className={styles.witnessDesc}>{witness.description}</Text>
                    <Text className={styles.witnessMeta}>
                      见证时间：{formatTime(witness.timestamp)}{'\n'}
                      见证地点：{witness.gps.address}
                    </Text>
                  </View>
                </View>
              ))
            ) : (
              <View className={styles.empty}>
                <Text className={styles.emptyDesc}>暂无匹配的见证记录</Text>
              </View>
            )}

            {/* 通知状态 */}
            {matchedWitnesses.length > 0 && (
              <View className={styles.notifyStatus}>
                <Text className={styles.notifyIcon}>🔔</Text>
                <Text className={styles.notifyText}>
                  {matchedWitnesses.length} 位见证者已收到通知："你的一条见证记录被标记为善意证据"
                  {'\n'}并获得了"温暖见证人"徽章
                </Text>
              </View>
            )}
          </View>

          {/* 重新扫描按钮 */}
          <View style={{ padding: '0 32rpx' }}>
            <View className={styles.actionButton} onClick={handleRescan}>
              重新扫描见证网络
            </View>
          </View>
        </>
      )}

      {/* 已获徽章的见证者 */}
      {notifiedWitnesses.length > 0 && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>🏅 温暖见证人</Text>
          <Text className={styles.chainDesc} style={{ marginBottom: '16rpx', display: 'block' }}>
            以下见证者的记录被标记为善意证据，获得了"温暖见证人"徽章
          </Text>
          {notifiedWitnesses.map((witness) => (
            <View key={witness.id} className={styles.witnessItem}>
              <Image className={styles.witnessAvatar} src={witness.witnessUserAvatar} mode='aspectFill' />
              <View className={styles.witnessInfo}>
                <View className={styles.witnessHeader}>
                  <Text className={styles.witnessName}>{witness.witnessUserName}</Text>
                  <Text className={styles.witnessBadge}>温暖见证人</Text>
                </View>
                <Text className={styles.witnessDesc}>{witness.description}</Text>
                <Text className={styles.witnessMeta}>
                  见证时间：{formatTime(witness.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 底部说明 */}
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
