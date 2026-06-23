import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import {
  getNationalStats,
  getRegionalStats,
  getTopicStats,
  formatParticipantCount,
} from '@/data/warmthStats';
import styles from './index.module.scss';

const WarmthStatsPage: React.FC = () => {
  // 全国统计
  const nationalStats = useState(getNationalStats())[0];
  // 区域统计
  const regionalStats = useState(getRegionalStats())[0];
  // 话题统计
  const topicStats = useState(getTopicStats())[0];

  // 计算话题最大数量，用于进度条展示
  const maxTopicCount = useMemo(() => {
    return Math.max(...topicStats.map(t => t.count));
  }, [topicStats]);

  // 趋势图标映射
  const trendIcon = (trend: 'up' | 'stable' | 'down') => {
    if (trend === 'up') return '↗';
    if (trend === 'down') return '↘';
    return '→';
  };

  // 格式化大数字
  const formatNumber = (num: number): string => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toLocaleString('zh-CN');
  };

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 页面头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>温暖聚合</Text>
        <Text className={styles.headerSubtitle}>每一份善意，都在被看见</Text>
      </View>

      {/* 今日温暖亮点 */}
      <View className={styles.highlightCard}>
        <Text className={styles.highlightText}>
          今天，全国有{' '}
          <Text className={styles.highlightNumber}>
            {formatParticipantCount(nationalStats.todayParticipants)}
          </Text>
          {' '}人在传递温暖{' '}
          <Text className={styles.highlightSparkle}>✨</Text>
        </Text>
      </View>

      {/* 全国统计卡片 */}
      <View className={styles.statsGrid}>
        <View className={styles.statCard}>
          <Text className={styles.statLabel}>今日参与人数</Text>
          <Text className={styles.statValue}>
            {formatParticipantCount(nationalStats.todayParticipants)}
            <Text className={styles.statUnit}>人</Text>
          </Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statLabel}>今日善行总量</Text>
          <Text className={styles.statValue}>
            {formatNumber(nationalStats.todayKindnessCount)}
            <Text className={styles.statUnit}>件</Text>
          </Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statLabel}>本周累计温暖值</Text>
          <Text className={styles.statValue}>
            {formatNumber(nationalStats.weeklyFortune)}
          </Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statLabel}>本月温暖值</Text>
          <Text className={styles.statValue}>
            {formatNumber(nationalStats.monthlyFortune)}
          </Text>
        </View>
      </View>

      {/* 区域温暖列表 */}
      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>城市温暖</Text>
          <Text className={styles.sectionTip}>今日动态</Text>
        </View>
        <View className={styles.regionList}>
          {regionalStats.map((region) => (
            <View key={region.region} className={styles.regionItem}>
              <Text className={styles.regionName}>{region.region}</Text>
              <Text className={styles.regionDesc}>
                今天有{' '}
                <Text className={styles.regionCount}>
                  {formatParticipantCount(region.todayParticipants)}
                </Text>
                {' '}人在传递温暖 ✨
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 话题统计 */}
      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>温暖话题</Text>
          <Text className={styles.sectionTip}>本月热度</Text>
        </View>
        <View className={styles.topicList}>
          {topicStats.map((topic) => (
            <View key={topic.topic} className={styles.topicItem}>
              <Text className={styles.topicName}>#{topic.topic}</Text>
              <View className={styles.topicBarWrap}>
                <View
                  className={styles.topicBar}
                  style={{ width: `${(topic.count / maxTopicCount) * 100}%` }}
                />
              </View>
              <Text className={styles.topicCount}>{topic.count}件</Text>
              <Text
                className={classnames(
                  styles.topicTrend,
                  topic.trend === 'up' && styles.trendUp,
                  topic.trend === 'down' && styles.trendDown,
                  topic.trend === 'stable' && styles.trendStable
                )}
              >
                {trendIcon(topic.trend)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 隐私保护说明 */}
      <View className={styles.privacyNote}>
        <Text className={styles.privacyText}>
          🔒 本页仅统计审核通过且公开的善行。为保护隐私，参与人数不足10人的区域显示"温暖正在发生…"。
        </Text>
      </View>

      {/* 更新频率提示 */}
      <View className={styles.updateTip}>
        <View className={styles.updateDot} />
        <Text className={styles.updateText}>每5-30分钟批量刷新</Text>
      </View>
    </ScrollView>
  );
};

export default WarmthStatsPage;
