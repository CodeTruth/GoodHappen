import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { safeNavigateBack } from '@/utils/navigate-back';
import { useUserStore } from '@/store/user';
import { useKindnessStore } from '@/store/kindness';
import styles from './index.module.scss';

export default function WarmthReportPage() {
  const { userInfo } = useUserStore();
  const { publishedList } = useKindnessStore();

  const uid = userInfo?.id || 'currentUser';
  const now = new Date();
  const thisMonth = now.toISOString().slice(0, 7);

  // ===== 月度统计 =====
  const stats = useMemo(() => {
    const myRecords = publishedList.filter(k => k.userId === uid && k.createdAt.startsWith(thisMonth));

    const totalKindness = myRecords.length;
    const totalLikes = myRecords.reduce((sum, k) => sum + (k.likes || 0), 0);
    const totalWitness = myRecords.filter(k => k.type === 'witness').length;
    const tags = myRecords.flatMap(k => k.tags);
    const tagCount: Record<string, number> = {};
    tags.forEach(t => { tagCount[t] = (tagCount[t] || 0) + 1; });
    const topTags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // 善行信用分（模拟算法）
    const blessingScore = Math.min(950, 550 + totalKindness * 15 + totalLikes * 3 + totalWitness * 10 + (userInfo?.blessingValue || 0) * 0.1);
    const scoreLevel = blessingScore >= 900 ? '卓越' : blessingScore >= 750 ? '优秀' : blessingScore >= 600 ? '良好' : '成长中';
    const scoreColor = blessingScore >= 900 ? '#059669' : blessingScore >= 750 ? '#2563EB' : blessingScore >= 600 ? '#F59E0B' : '#9CA3AF';

    // 月度天数
    const activeDays = new Set(myRecords.map(k => k.createdAt.slice(0, 10))).size;

    // 累计
    const allMyRecords = publishedList.filter(k => k.userId === uid);
    const totalAllTime = allMyRecords.length;

    return { totalKindness, totalLikes, totalWitness, topTags, blessingScore: Math.round(blessingScore), scoreLevel, scoreColor, activeDays, totalAllTime };
  }, [publishedList, userInfo, uid, thisMonth]);

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <View className={styles.backBtn} onClick={() => safeNavigateBack()}><Text>←</Text></View>
        <Text className={styles.headerTitle}>温暖报告</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView className={styles.body} scrollY enhanced showScrollbar={false}>
        {/* 善行信用分 */}
        <View className={styles.scoreSection}>
          <Text className={styles.scoreLabel}>你的善行信用分</Text>
          <Text className={styles.scoreValue} style={{ color: stats.scoreColor }}>{stats.blessingScore}</Text>
          <Text className={styles.scoreLevel}>{stats.scoreLevel}</Text>
          <Text className={styles.scoreDesc}>基于善行记录、社会影响力、连续活跃度综合评估</Text>
        </View>

        {/* 月份 */}
        <Text className={styles.monthTitle}>{thisMonth} 月度报告</Text>

        {/* 数据卡片 */}
        <View className={styles.statsGrid}>
          <View className={styles.statCard}>
            <Text className={styles.statNum}>{stats.totalKindness}</Text>
            <Text className={styles.statLabel}>本月善行</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statNum}>{stats.activeDays}</Text>
            <Text className={styles.statLabel}>活跃天数</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statNum}>{stats.totalLikes}</Text>
            <Text className={styles.statLabel}>收到点赞</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statNum}>{stats.totalAllTime}</Text>
            <Text className={styles.statLabel}>累计善行</Text>
          </View>
        </View>

        {/* 标签云 */}
        {stats.topTags.length > 0 && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>你的善行关键词</Text>
            <View className={styles.tagCloud}>
              {stats.topTags.map(([tag, count]) => (
                <View key={tag} className={styles.tagItem}>
                  <Text className={styles.tagText}>#{tag}</Text>
                  <Text className={styles.tagCount}>{count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 信用分说明 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>信用分说明</Text>
          <View className={styles.explainCard}>
            <View className={styles.explainRow}>
              <Text className={styles.explainDot}>●</Text>
              <Text className={styles.explainText}>每次善行记录 +15分</Text>
            </View>
            <View className={styles.explainRow}>
              <Text className={styles.explainDot}>●</Text>
              <Text className={styles.explainText}>每收到一个点赞 +3分</Text>
            </View>
            <View className={styles.explainRow}>
              <Text className={styles.explainDot}>●</Text>
              <Text className={styles.explainText}>每次见证记录 +10分</Text>
            </View>
            <View className={styles.explainRow}>
              <Text className={styles.explainDot}>●</Text>
              <Text className={styles.explainText}>福气值转化加成（福气值 x 0.1）</Text>
            </View>
            <Text className={styles.explainNote}>未来可对接企业招聘ESG数据，展示你的社会贡献</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}