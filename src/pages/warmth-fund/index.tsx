import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import { useFundStore, FundSourceType } from '@/store/fund';
import styles from './index.module.scss';

// 资金来源标签配置
const sourceLabels: Record<FundSourceType, { label: string; icon: string }> = {
  brand: { label: '品牌温暖赞助', icon: '🏢' },
  donation: { label: '匿名用户捐赠', icon: '💝' },
  competition: { label: 'TRAE大赛奖金', icon: '🏆' },
};

const WarmthFundPage: React.FC = () => {
  const { getReports, getIncomesByQuarter, getAllocationsByQuarter, loadFromStorage } = useFundStore();
  const reports = useState(getReports())[0];

  // 默认展示最新季度
  const [activeQuarter, setActiveQuarter] = useState(reports[0]?.quarter || '');

  useEffect(() => {
    loadFromStorage();
  }, []);

  // 当前季度报告
  const currentReport = useMemo(() => {
    return reports.find(r => r.quarter === activeQuarter) || reports[0];
  }, [reports, activeQuarter]);

  // 当前季度收入
  const quarterIncomes = useMemo(() => {
    if (!activeQuarter) return [];
    return getIncomesByQuarter(activeQuarter);
  }, [activeQuarter, getIncomesByQuarter]);

  // 当前季度分配
  const quarterAllocations = useMemo(() => {
    if (!activeQuarter) return [];
    return getAllocationsByQuarter(activeQuarter);
  }, [activeQuarter, getAllocationsByQuarter]);

  // 按来源汇总收入
  const incomeBySource = useMemo(() => {
    const grouped: Record<string, number> = {};
    quarterIncomes.forEach(inc => {
      grouped[inc.source] = (grouped[inc.source] || 0) + inc.amount;
    });
    return grouped;
  }, [quarterIncomes]);

  // 温暖基金总额
  const warmthFundTotal = useMemo(() => {
    return quarterAllocations
      .filter(a => a.category === 'warmth_fund')
      .reduce((sum, a) => sum + a.amount, 0);
  }, [quarterAllocations]);

  // 平台运营总额
  const platformOperationTotal = useMemo(() => {
    return quarterAllocations
      .filter(a => a.category === 'platform_operation')
      .reduce((sum, a) => sum + a.amount, 0);
  }, [quarterAllocations]);

  // 格式化金额
  const formatMoney = (amount: number): string => {
    return `¥${amount.toLocaleString('zh-CN')}`;
  };

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>温暖基金</Text>
        <Text className={styles.headerSubtitle}>
          品牌赞助与社区捐赠的统一资金池{'\n'}
          分配比例公开，季度财务公示
        </Text>
      </View>

      {/* 分配规则说明 */}
      <View className={styles.ruleCard}>
        <Text className={styles.ruleTitle}>分配规则</Text>
        <View className={styles.ruleFlow}>
          <View className={styles.ruleItem}>
            <Text className={styles.ruleIcon}>💰</Text>
            <Text className={styles.ruleLabel}>品牌赞助</Text>
            <Text className={styles.ruleAmount}>¥10,000</Text>
          </View>
          <Text className={styles.ruleArrow}>→</Text>
          <View className={styles.ruleItem}>
            <Text className={styles.ruleIcon}>❤️</Text>
            <Text className={styles.ruleLabel}>温暖基金</Text>
            <Text className={styles.ruleAmount}>¥7,000</Text>
            <Text className={styles.rulePercent}>70%</Text>
          </View>
          <Text className={styles.ruleArrow}>+</Text>
          <View className={styles.ruleItem}>
            <Text className={styles.ruleIcon}>⚙️</Text>
            <Text className={styles.ruleLabel}>平台运营</Text>
            <Text className={styles.ruleAmount}>¥3,000</Text>
            <Text className={styles.rulePercent}>30%</Text>
          </View>
        </View>
      </View>

      {/* 季度切换 */}
      <ScrollView scrollX className={styles.tabs}>
        {reports.map((report) => (
          <Text
            key={report.quarter}
            className={classnames(
              styles.tab,
              activeQuarter === report.quarter && styles.active
            )}
            onClick={() => setActiveQuarter(report.quarter)}
          >
            {report.quarter}
          </Text>
        ))}
      </ScrollView>

      {/* 季度报告概览 */}
      {currentReport && (
        <View className={styles.reportCard}>
          <Text className={styles.reportTitle}>{currentReport.title}</Text>
          <View className={styles.reportStats}>
            <View className={styles.reportStat}>
              <Text className={styles.reportStatValue}>{formatMoney(currentReport.totalIncome)}</Text>
              <Text className={styles.reportStatLabel}>总收入</Text>
            </View>
            <View className={styles.reportStat}>
              <Text className={styles.reportStatValue}>{currentReport.beneficiaries}</Text>
              <Text className={styles.reportStatLabel}>受益人数</Text>
            </View>
            <View className={styles.reportStat}>
              <Text className={styles.reportStatValue}>{currentReport.warmthActions}</Text>
              <Text className={styles.reportStatLabel}>温暖行动</Text>
            </View>
          </View>
          <View className={styles.highlightBox}>
            <Text className={styles.highlightIcon}>✨</Text>
            <Text className={styles.highlightText}>{currentReport.highlight}</Text>
          </View>
        </View>
      )}

      {/* 收入来源 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>收入来源</Text>
        {quarterIncomes.length > 0 ? (
          quarterIncomes.map((income) => {
            const sourceInfo = sourceLabels[income.source];
            return (
              <View key={income.id} className={styles.incomeItem}>
                <Text className={styles.incomeIcon}>{sourceInfo.icon}</Text>
                <View className={styles.incomeInfo}>
                  <Text className={styles.incomeName}>{income.sourceName}</Text>
                  <Text className={styles.incomeDesc}>{income.description}</Text>
                  <Text className={styles.incomeDate}>{income.date}</Text>
                </View>
                <Text className={styles.incomeAmount}>{formatMoney(income.amount)}</Text>
              </View>
            );
          })
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyText}>本季度暂无收入记录</Text>
          </View>
        )}
      </View>

      {/* 收入来源占比 */}
      {Object.keys(incomeBySource).length > 0 && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>收入来源占比</Text>
          <View className={styles.sourceBars}>
            {Object.entries(incomeBySource).map(([source, amount]) => {
              const sourceInfo = sourceLabels[source as FundSourceType];
              const percent = currentReport ? (amount / currentReport.totalIncome) * 100 : 0;
              return (
                <View key={source} className={styles.sourceBar}>
                  <View className={styles.sourceBarHeader}>
                    <Text className={styles.sourceBarLabel}>
                      {sourceInfo.icon} {sourceInfo.label}
                    </Text>
                    <Text className={styles.sourceBarAmount}>
                      {formatMoney(amount)} · {percent.toFixed(1)}%
                    </Text>
                  </View>
                  <View className={styles.barWrap}>
                    <View
                      className={styles.barFill}
                      style={{ width: `${percent}%` }}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 分配去向 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>分配去向</Text>
        <View className={styles.allocationSummary}>
          <View className={styles.allocationCard}>
            <View className={styles.allocationHeader}>
              <Text className={styles.allocationIcon}>❤️</Text>
              <Text className={styles.allocationName}>温暖基金</Text>
            </View>
            <Text className={styles.allocationAmount}>{formatMoney(warmthFundTotal)}</Text>
            <Text className={styles.allocationPercent}>70%</Text>
            <Text className={styles.allocationDesc}>用于温暖行动、礼包发放、商家补贴</Text>
          </View>
          <View className={styles.allocationCard}>
            <View className={styles.allocationHeader}>
              <Text className={styles.allocationIcon}>⚙️</Text>
              <Text className={styles.allocationName}>平台运营</Text>
            </View>
            <Text className={styles.allocationAmount}>{formatMoney(platformOperationTotal)}</Text>
            <Text className={styles.allocationPercent}>30%</Text>
            <Text className={styles.allocationDesc}>用于服务器、审核、客服等基础运营</Text>
          </View>
        </View>
      </View>

      {/* 人数波动应对说明 */}
      <View className={styles.strategyCard}>
        <Text className={styles.strategyTitle}>人数波动应对机制</Text>
        <View className={styles.strategyItem}>
          <Text className={styles.strategyIcon}>📈</Text>
          <View className={styles.strategyContent}>
            <Text className={styles.strategyLabel}>达标人数少</Text>
            <Text className={styles.strategyDesc}>每人回馈更多，确保温暖落到实处</Text>
          </View>
        </View>
        <View className={styles.strategyItem}>
          <Text className={styles.strategyIcon}>🎉</Text>
          <View className={styles.strategyContent}>
            <Text className={styles.strategyLabel}>达标人数多</Text>
            <Text className={styles.strategyDesc}>切换集体仪式，让温暖惠及更多人</Text>
          </View>
        </View>
      </View>

      {/* 底部说明 */}
      <View className={styles.footerNote}>
        <Text className={styles.footerText}>
          温暖基金每季度更新一次{'\n'}
          所有收入来源与分配去向均公开透明{'\n'}
          公示日期：{currentReport ? new Date(currentReport.publishedAt).toLocaleDateString('zh-CN') : '-'}
        </Text>
      </View>
    </ScrollView>
  );
};

export default WarmthFundPage;
