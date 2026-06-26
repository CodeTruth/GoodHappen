import React, { useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useFortuneStore } from '@/store/fortune';
import { FortuneTransaction } from '@/store/fortune';
import styles from './index.module.scss';

// 善行类型分布项
interface TypeDistribution {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

// 月度趋势项
interface MonthlyTrend {
  month: string;
  count: number;
}

const MyStatsPage: React.FC = () => {
  const {
    totalFortune,
    transactions,
    streak,
    currentTitle,
    loadFromStorage,
    resetIfNeeded,
  } = useFortuneStore();

  useEffect(() => {
    loadFromStorage();
    resetIfNeeded();
  }, []);

  // 从交易记录中统计善行类型分布
  const typeDistribution: TypeDistribution[] = useMemo(() => {
    // 颜色池
    const colors = ['#FF6B6B', '#FFA07A', '#FFD93D', '#6BCB77', '#4D96FF', '#C780FA'];
    const typeMap: Record<string, number> = {};

    // 统计各类型数量
    transactions.forEach((tx: FortuneTransaction) => {
      if (tx.type === 'earn') {
        // 从描述中提取类型（Mock：按关键词分类）
        const desc = tx.description;
        let category = '日常小善';
        if (desc.includes('助人') || desc.includes('帮')) category = '助人';
        else if (desc.includes('环保') || desc.includes('捡')) category = '环保';
        else if (desc.includes('邻里') || desc.includes('邻居')) category = '邻里互助';
        else if (desc.includes('陪伴') || desc.includes('陪')) category = '陪伴';
        else if (desc.includes('孝') || desc.includes('父母')) category = '孝亲';

        typeMap[category] = (typeMap[category] || 0) + 1;
      }
    });

    const total = Object.values(typeMap).reduce((sum, n) => sum + n, 0);
    if (total === 0) return [];

    return Object.entries(typeMap).map(([type, count], index) => ({
      type,
      count,
      percentage: Math.round((count / total) * 100),
      color: colors[index % colors.length],
    }));
  }, [transactions]);

  // 生成月度趋势（最近6个月）
  const monthlyTrend: MonthlyTrend[] = useMemo(() => {
    const now = new Date();
    const months: MonthlyTrend[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const count = transactions.filter((tx: FortuneTransaction) => {
        if (tx.type !== 'earn') return false;
        return tx.createdAt.startsWith(yearMonth);
      }).length;
      months.push({
        month: `${d.getMonth() + 1}月`,
        count,
      });
    }
    return months;
  }, [transactions]);

  // 统计数据
  const weekCount = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return transactions.filter((tx: FortuneTransaction) =>
      tx.type === 'earn' && new Date(tx.createdAt) >= weekAgo
    ).length;
  }, [transactions]);

  const monthCount = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return transactions.filter((tx: FortuneTransaction) =>
      tx.type === 'earn' && new Date(tx.createdAt) >= monthStart
    ).length;
  }, [transactions]);

  const totalCount = useMemo(() => {
    return transactions.filter((tx: FortuneTransaction) => tx.type === 'earn').length;
  }, [transactions]);

  // 累计温暖人数（Mock：每条善行约温暖2人）
  const warmedPeopleCount = totalCount * 2;

  // 柱状图最大值
  const maxMonthCount = useMemo(() => {
    return Math.max(...monthlyTrend.map(m => m.count), 1);
  }, [monthlyTrend]);

  // 环形图 conic-gradient 字符串
  const donutGradient = useMemo(() => {
    if (typeDistribution.length === 0) return '#f2f3f5';
    let accumulated = 0;
    const stops = typeDistribution.map((item) => {
      const start = accumulated;
      accumulated += item.percentage;
      const end = accumulated;
      return `${item.color} ${start}% ${end}%`;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [typeDistribution]);

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <View className={styles.headerTop}>
          <Text className={styles.headerTitle}>我的温暖</Text>
          <View className={styles.privateBadge}>
            <Text className={styles.privateText}>🔒 仅自己可见</Text>
          </View>
        </View>
      </View>

      {/* 当前称号卡片 */}
      <View className={styles.titleCard}>
        <View className={styles.titleRow}>
          <Text className={styles.titleLabel}>当前称号</Text>
          <Text className={styles.titleName}>{currentTitle.name}</Text>
        </View>
        <Text className={styles.titleDesc}>{currentTitle.description}</Text>
      </View>

      {/* 统计数据网格 */}
      <View className={styles.statsSection}>
        <Text className={styles.sectionTitle}>善行统计</Text>
        <View className={styles.statsGrid}>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{weekCount}</Text>
            <Text className={styles.statLabel}>本周记录</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{monthCount}</Text>
            <Text className={styles.statLabel}>本月记录</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{totalCount}</Text>
            <Text className={styles.statLabel}>累计总件数</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{warmedPeopleCount}</Text>
            <Text className={styles.statLabel}>温暖人数</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{streak.currentStreak}</Text>
            <Text className={styles.statLabel}>连续天数</Text>
          </View>
          <View className={styles.statCard}>
            <Text className={styles.statValue}>{totalFortune}</Text>
            <Text className={styles.statLabel}>累计福气</Text>
          </View>
        </View>
      </View>

      {/* 善行类型分布（环形图） */}
      <View className={styles.chartCard}>
        <Text className={styles.chartTitle}>善行类型分布</Text>
        {typeDistribution.length > 0 ? (
          <View className={styles.donutWrap}>
            <View
              className={styles.donutChart}
              style={{ background: donutGradient }}
            >
              <View className={styles.donutCenter}>
                <Text className={styles.donutCenterValue}>{totalCount}</Text>
                <Text className={styles.donutCenterLabel}>总件数</Text>
              </View>
            </View>
            <View className={styles.donutLegend}>
              {typeDistribution.map((item) => (
                <View key={item.type} className={styles.legendItem}>
                  <View
                    className={styles.legendDot}
                    style={{ background: item.color }}
                  />
                  <Text className={styles.legendText}>{item.type}</Text>
                  <Text className={styles.legendPercent}>{item.percentage}%</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View className={styles.emptyTip}>
            <Text className={styles.emptyText}>记录善行后查看类型分布</Text>
          </View>
        )}
      </View>

      {/* 月度善行趋势（柱状图） */}
      <View className={styles.chartCard}>
        <Text className={styles.chartTitle}>月度善行趋势</Text>
        <View className={styles.barChart}>
          {monthlyTrend.map((item) => (
            <View key={item.month} className={styles.barItem}>
              <View
                className={styles.barFill}
                style={{ height: `${(item.count / maxMonthCount) * 180}rpx` }}
              />
              <Text className={styles.barLabel}>{item.month}</Text>
            </View>
          ))}
        </View>
      </View>

    </ScrollView>
  );
};

export default MyStatsPage;
