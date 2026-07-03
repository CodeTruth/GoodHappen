import React, { useState, useEffect, useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useAdminStore } from '@/store/admin';
import type { TimeRange } from '@/store/admin';
import styles from './index.module.scss';

// 时间范围选项
const TIME_RANGES: Array<{ key: TimeRange; name: string }> = [
  { key: 'today', name: '今日' },
  { key: 'week', name: '本周' },
  { key: 'month', name: '本月' },
  { key: 'quarter', name: '本季度' },
];

// 饼图颜色
const PIE_COLORS = ['#FF6B6B', '#FFA07A', '#52C41A', '#FAAD14', '#165DFF', '#722ED1'];

const AdminDashboardPage: React.FC = () => {
  const { getDashboardMetric, getDashboardTrend, loadFromStorage } = useAdminStore();
  const [timeRange, setTimeRange] = useState<TimeRange>('week');

  useEffect(() => {
    loadFromStorage();
  }, []);

  // 当前时间范围的指标和趋势
  const metric = useMemo(() => getDashboardMetric(timeRange), [getDashboardMetric, timeRange]);
  const trend = useMemo(() => getDashboardTrend(timeRange), [getDashboardTrend, timeRange]);

  // 计算柱状图最大值（用于归一化）
  const userGrowth = trend.userGrowth || [];
  const kindnessTrend = trend.kindnessTrend || [];
  const categoryDistribution = trend.categoryDistribution || [];

  const userGrowthMax = useMemo(() => {
    return Math.max(...userGrowth.map((p) => p.value), 1);
  }, [userGrowth]);

  const kindnessTrendMax = useMemo(() => {
    return Math.max(...kindnessTrend.map((p) => p.value), 1);
  }, [kindnessTrend]);

  // 品类分布总和
  const categoryTotal = useMemo(() => {
    return categoryDistribution.reduce((sum, p) => sum + p.value, 0) || 1;
  }, [categoryDistribution]);

  // 生成饼图 conic-gradient 字符串
  const pieGradient = useMemo(() => {
    let cumulative = 0;
    const stops: string[] = [];
    categoryDistribution.forEach((item, idx) => {
      const percent = (item.value / categoryTotal) * 100;
      const color = PIE_COLORS[idx % PIE_COLORS.length];
      stops.push(`${color} ${cumulative}% ${cumulative + percent}%`);
      cumulative += percent;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [categoryDistribution, categoryTotal]);

  // 导出数据（模拟）
  const handleExport = () => {
    Taro.showActionSheet({
      itemList: ['导出为CSV', '导出为JSON', '导出为图片'],
      success: (res) => {
        const formats = ['CSV', 'JSON', '图片'];
        Taro.showToast({
          title: `${formats[res.tapIndex]}导出中...`,
          icon: 'loading',
          duration: 1500,
        });
        setTimeout(() => {
          Taro.showToast({
            title: `${formats[res.tapIndex]}导出成功（模拟）`,
            icon: 'success',
          });
          console.log('[AdminDashboard] 导出数据:', { timeRange, metric, trend });
        }, 1500);
      },
    });
  };

  // 格式化大数字
  const formatNumber = (num: number): string => {
    if (num >= 10000) return `${(num / 10000).toFixed(1)}万`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return String(num);
  };

  return (
    <View className={styles.container}>
      {/* 顶部头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>数据看板</Text>
        <Text className={styles.headerDesc}>实时监控平台运营数据</Text>
        {/* 时间范围选择 */}
        <View className={styles.rangeBar}>
          {TIME_RANGES.map((range) => (
            <View
              key={range.key}
              className={classnames(styles.rangeItem, timeRange === range.key && styles.active)}
              onClick={() => setTimeRange(range.key)}
            >
              <Text className={styles.rangeText}>{range.name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 内容区域 */}
      <View className={styles.content}>
        {/* 导出按钮 */}
        <View className={styles.exportBar}>
          <View className={styles.exportBtn} onClick={handleExport}>
            <Text className={styles.exportBtnText}>📥 导出数据</Text>
          </View>
        </View>

        {/* 关键指标卡片 */}
        <View className={styles.metricGrid}>
          <View className={classnames(styles.metricCard, styles.metricCardPrimary)}>
            <View className={styles.metricHeader}>
              <Text className={styles.metricIcon}>👥</Text>
              <Text className={styles.metricLabel}>DAU 日活</Text>
            </View>
            <Text className={styles.metricValue}>{formatNumber(metric.dau || 0)}</Text>
            <Text className={styles.metricSub}>日活跃用户数</Text>
          </View>
          <View className={classnames(styles.metricCard, styles.metricCardPrimary)}>
            <View className={styles.metricHeader}>
              <Text className={styles.metricIcon}>📊</Text>
              <Text className={styles.metricLabel}>MAU 月活</Text>
            </View>
            <Text className={styles.metricValue}>{formatNumber(metric.mau || 0)}</Text>
            <Text className={styles.metricSub}>月活跃用户数</Text>
          </View>
        </View>

        <View className={styles.metricGrid}>
          <View className={styles.metricCard}>
            <View className={styles.metricHeader}>
              <Text className={styles.metricIcon}>🆕</Text>
              <Text className={styles.metricLabel}>新增用户</Text>
            </View>
            <Text className={styles.metricValue}>{formatNumber(metric.newUsers)}</Text>
            <Text className={styles.metricSub}>{TIME_RANGES.find(r => r.key === timeRange)?.name}新增</Text>
          </View>
          <View className={styles.metricCard}>
            <View className={styles.metricHeader}>
              <Text className={styles.metricIcon}>📝</Text>
              <Text className={styles.metricLabel}>善行发布量</Text>
            </View>
            <Text className={styles.metricValue}>{formatNumber(metric.kindnessCount)}</Text>
            <Text className={styles.metricSub}>{TIME_RANGES.find(r => r.key === timeRange)?.name}发布</Text>
          </View>
        </View>

        <View className={styles.metricGrid}>
          <View className={styles.metricCard}>
            <View className={styles.metricHeader}>
              <Text className={styles.metricIcon}>🎯</Text>
              <Text className={styles.metricLabel}>挑战参与率</Text>
            </View>
            <Text className={styles.metricValue}>{metric.challengeParticipationRate}%</Text>
            <View className={styles.progressContainer}>
              <View className={styles.progressBar}>
                <View
                  className={classnames(styles.progressFill, styles.progressFillPrimary)}
                  style={{ width: `${metric.challengeParticipationRate}%` }}
                />
              </View>
            </View>
          </View>
          <View className={styles.metricCard}>
            <View className={styles.metricHeader}>
              <Text className={styles.metricIcon}>🤝</Text>
              <Text className={styles.metricLabel}>公益完成率</Text>
            </View>
            <Text className={styles.metricValue}>{metric.charityCompletionRate}%</Text>
            <View className={styles.progressContainer}>
              <View className={styles.progressBar}>
                <View
                  className={classnames(styles.progressFill, styles.progressFillSuccess)}
                  style={{ width: `${metric.charityCompletionRate}%` }}
                />
              </View>
            </View>
          </View>
        </View>

        <View className={styles.metricGrid}>
          <View className={styles.metricCard}>
            <View className={styles.metricHeader}>
              <Text className={styles.metricIcon}>📈</Text>
              <Text className={styles.metricLabel}>总用户数</Text>
            </View>
            <Text className={styles.metricValue}>{formatNumber(metric.totalUsers)}</Text>
            <Text className={styles.metricSub}>累计注册用户</Text>
          </View>
          <View className={styles.metricCard}>
            <View className={styles.metricHeader}>
              <Text className={styles.metricIcon}>💚</Text>
              <Text className={styles.metricLabel}>总善行数</Text>
            </View>
            <Text className={styles.metricValue}>{formatNumber(metric.totalKindness || 0)}</Text>
            <Text className={styles.metricSub}>累计善行记录</Text>
          </View>
        </View>

        {/* 用户增长趋势柱状图 */}
        <View className={styles.chartCard}>
          <Text className={styles.chartTitle}>📊 用户增长趋势</Text>
          <View className={styles.barChart}>
            {userGrowth.map((point, idx) => (
              <View key={idx} className={styles.barItem}>
                <Text className={styles.barValue}>{formatNumber(point.value)}</Text>
                <View
                  className={styles.barFill}
                  style={{ height: `${(point.value / userGrowthMax) * 80}%` }}
                />
                <Text className={styles.barLabel}>{point.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 善行发布趋势折线图（CSS实现） */}
        <View className={styles.chartCard}>
          <Text className={styles.chartTitle}>📈 善行发布趋势</Text>
          <View className={styles.lineChart}>
            <View className={styles.lineChartBars}>
              {kindnessTrend.map((point, idx) => {
                const heightPercent = (point.value / kindnessTrendMax) * 80;
                return (
                  <View key={idx} className={styles.lineBar}>
                    <Text className={styles.barValue}>{formatNumber(point.value)}</Text>
                    <View className={styles.lineDot} />
                    <View
                      className={styles.lineStem}
                      style={{ height: `${heightPercent}%` }}
                    />
                  </View>
                );
              })}
            </View>
          </View>
          <View className={styles.lineLabels}>
            {kindnessTrend.map((point, idx) => (
              <Text key={idx} className={styles.lineLabel}>{point.label}</Text>
            ))}
          </View>
        </View>

        {/* 品类分布饼图 */}
        <View className={styles.chartCard}>
          <Text className={styles.chartTitle}>🥧 善行品类分布</Text>
          <View className={styles.pieChartContainer}>
            <View className={styles.pieChart} style={{ background: pieGradient }}>
              <View className={styles.pieInner}>
                <Text className={styles.pieTotal}>{formatNumber(categoryTotal)}</Text>
                <Text className={styles.pieLabel}>总善行</Text>
              </View>
            </View>
            <View className={styles.pieLegend}>
              {categoryDistribution.map((item, idx) => (
                <View key={idx} className={styles.legendItem}>
                  <View
                    className={styles.legendDot}
                    style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <Text className={styles.legendText}>{item.label}</Text>
                  <Text className={styles.legendValue}>
                    {((item.value / categoryTotal) * 100).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default AdminDashboardPage;
