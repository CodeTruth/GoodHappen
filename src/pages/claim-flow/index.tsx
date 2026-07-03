import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import { useCharityFundStore, CLAIM_STEP_MAP, CLAIM_STEP_ORDER, ClaimFlow, ClaimStepKey } from '@/store/charityFund';
import styles from './index.module.scss';

// 步骤图标映射
const STEP_ICON: Record<ClaimStepKey, string> = {
  applied: '📝',
  reviewing: '🔍',
  approved: '✓',
  distributing: '💸',
  delivered: '📦',
  confirmed: '❤️',
  published: '📢',
};

const ClaimFlowPage: React.FC = () => {
  const {
    claimFlows,
    getMyClaimFlows,
    loadFromStorage,
  } = useCharityFundStore();

  const [activeTab, setActiveTab] = useState<'mine' | 'all'>('mine');
  const [selectedFlow, setSelectedFlow] = useState<ClaimFlow | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, []);

  // 我的领取流程（与用户捐赠相关的）
  const myClaimFlows = useMemo(() => getMyClaimFlows(), [getMyClaimFlows, claimFlows]);

  // 当前展示列表
  const displayFlows = activeTab === 'mine' ? myClaimFlows : claimFlows;

  // 格式化金额
  const formatMoney = (amount: number): string => `¥${amount.toLocaleString('zh-CN')}`;

  // 格式化日期时间
  const formatDateTime = (iso: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    return `${d.toLocaleDateString('zh-CN')} ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  };

  // 获取当前步骤索引
  const getCurrentStepIndex = (flow: ClaimFlow): number => {
    return CLAIM_STEP_ORDER.indexOf(flow.currentStep);
  };

  // 获取步骤进度百分比
  const getProgress = (flow: ClaimFlow): number => {
    const idx = getCurrentStepIndex(flow);
    return Math.round(((idx + 1) / CLAIM_STEP_ORDER.length) * 100);
  };

  // 点击查看详情
  const handleFlowClick = (flow: ClaimFlow) => {
    setSelectedFlow(flow);
  };

  // 关闭详情
  const handleCloseDetail = () => {
    setSelectedFlow(null);
  };

  // 统计信息
  const stats = useMemo(() => {
    const total = myClaimFlows.length;
    const confirmed = myClaimFlows.filter(f => f.currentStep === 'confirmed' || f.currentStep === 'published').length;
    const inProgress = myClaimFlows.filter(f =>
      f.currentStep !== 'confirmed' && f.currentStep !== 'published'
    ).length;
    const totalAmount = myClaimFlows.reduce((sum, f) => sum + (f.amount || 0), 0);
    return { total, confirmed, inProgress, totalAmount };
  }, [myClaimFlows]);

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>善款领取流程</Text>
        <Text className={styles.headerSubtitle}>
          每笔善款的完整生命周期{'\n'}
          透明可追溯，保护受助人隐私
        </Text>
        <View className={styles.statsCard}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{formatMoney(stats.totalAmount)}</Text>
            <Text className={styles.statLabel}>关联善款</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.confirmed}</Text>
            <Text className={styles.statLabel}>已确认</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{stats.inProgress}</Text>
            <Text className={styles.statLabel}>进行中</Text>
          </View>
        </View>
      </View>

      {/* 流程说明 */}
      <View className={styles.flowGuide}>
        <Text className={styles.flowGuideTitle}>领取流程</Text>
        <View className={styles.flowSteps}>
          {CLAIM_STEP_ORDER.map((step, idx) => {
            const info = CLAIM_STEP_MAP[step];
            return (
              <View key={step} className={styles.flowStepItem}>
                <View className={styles.flowStepLeft}>
                  <View className={styles.flowStepIcon}>
                    <Text className={styles.flowStepIconText}>{STEP_ICON[step]}</Text>
                  </View>
                  {idx < CLAIM_STEP_ORDER.length - 1 && (
                    <View className={styles.flowStepLine} />
                  )}
                </View>
                <View className={styles.flowStepContent}>
                  <Text className={styles.flowStepLabel}>{info.label}</Text>
                  <Text className={styles.flowStepDesc}>{info.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      {/* 标签切换 */}
      <View className={styles.tabs}>
        <Text
          className={classnames(styles.tab, activeTab === 'mine' && styles.active)}
          onClick={() => setActiveTab('mine')}
        >
          我的关联（{myClaimFlows.length}）
        </Text>
        <Text
          className={classnames(styles.tab, activeTab === 'all' && styles.active)}
          onClick={() => setActiveTab('all')}
        >
          全部公示（{claimFlows.length}）
        </Text>
      </View>

      {/* 领取流程列表 */}
      <View className={styles.flowList}>
        {displayFlows.length > 0 ? (
          displayFlows.map((flow) => {
            const progress = getProgress(flow);
            const currentStepInfo = CLAIM_STEP_MAP[flow.currentStep];
            const isCompleted = flow.currentStep === 'confirmed' || flow.currentStep === 'published';
            return (
              <View
                key={flow.id}
                className={styles.flowCard}
                onClick={() => handleFlowClick(flow)}
              >
                {/* 卡片头部 */}
                <View className={styles.cardHeader}>
                  <View className={styles.recipientInfo}>
                    <Text className={styles.recipientIcon}>❤️</Text>
                    <View className={styles.recipientText}>
                      <Text className={styles.recipientAlias}>{flow.recipientAlias}</Text>
                      <Text className={styles.recipientOrg}>{flow.organizationName}</Text>
                    </View>
                  </View>
                  <Text className={styles.flowAmount}>{formatMoney(flow.amount || 0)}</Text>
                </View>

                {/* 进度条 */}
                <View className={styles.progressSection}>
                  <View className={styles.progressHeader}>
                    <Text className={styles.progressCurrentStep}>
                      当前：{currentStepInfo.label}
                    </Text>
                    <Text className={styles.progressPercent}>{progress}%</Text>
                  </View>
                  <View className={styles.progressBar}>
                    <View
                      className={classnames(
                        styles.progressFill,
                        isCompleted && styles.progressFillDone
                      )}
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                </View>

                {/* 时间信息 */}
                <View className={styles.timeInfo}>
                  <Text className={styles.timeText}>
                    申请于 {formatDateTime(flow.createdAt)}
                  </Text>
                  <Text className={styles.timeText}>
                    更新于 {formatDateTime(flow.updatedAt || '')}
                  </Text>
                </View>

                {/* 状态标签 */}
                <View className={styles.cardFooter}>
                  <View
                    className={classnames(
                      styles.statusBadge,
                      isCompleted ? styles.statusBadgeDone : styles.statusBadgeActive
                    )}
                  >
                    <Text className={styles.statusBadgeText}>
                      {isCompleted ? '✓ 已完成' : '● 进行中'}
                    </Text>
                  </View>
                  <Text className={styles.detailHint}>查看详情 ›</Text>
                </View>
              </View>
            );
          })
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>🌱</Text>
            <Text className={styles.emptyText}>
              {activeTab === 'mine' ? '暂无关联的领取流程' : '暂无公示记录'}
            </Text>
            <Text className={styles.emptySubText}>
              {activeTab === 'mine' ? '兑换福气后将自动关联' : '请稍后再来查看'}
            </Text>
          </View>
        )}
      </View>

      {/* 透明度报告说明 */}
      <View className={styles.transparencyCard}>
        <Text className={styles.transparencyTitle}>透明度报告</Text>
        <View className={styles.transparencyItem}>
          <Text className={styles.transparencyIcon}>🔒</Text>
          <View className={styles.transparencyContent}>
            <Text className={styles.transparencyLabel}>隐私保护</Text>
            <Text className={styles.transparencyDesc}>受助人信息脱敏，照片模糊处理</Text>
          </View>
        </View>
        <View className={styles.transparencyItem}>
          <Text className={styles.transparencyIcon}>🏢</Text>
          <View className={styles.transparencyContent}>
            <Text className={styles.transparencyLabel}>组织中转</Text>
            <Text className={styles.transparencyDesc}>善款通过公益组织中转，不直接对个人</Text>
          </View>
        </View>
        <View className={styles.transparencyItem}>
          <Text className={styles.transparencyIcon}>📋</Text>
          <View className={styles.transparencyContent}>
            <Text className={styles.transparencyLabel}>全链路追踪</Text>
            <Text className={styles.transparencyDesc}>每步有状态追踪和时间戳</Text>
          </View>
        </View>
        <View className={styles.transparencyItem}>
          <Text className={styles.transparencyIcon}>📢</Text>
          <View className={styles.transparencyContent}>
            <Text className={styles.transparencyLabel}>公示反馈</Text>
            <Text className={styles.transparencyDesc}>善款使用情况公示，接受监督</Text>
          </View>
        </View>
      </View>

      {/* 底部说明 */}
      <View className={styles.footerNote}>
        <Text className={styles.footerText}>
          每笔善款都有完整的生命周期记录{'\n'}
          申请 → 审核 → 发放 → 确认 → 公示{'\n'}
          确保每一份温暖都落到实处
        </Text>
      </View>

      {/* 详情弹窗 */}
      {selectedFlow && (
        <View className={styles.detailMask} onClick={handleCloseDetail}>
          <View className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>善款领取详情</Text>
              <Text className={styles.detailClose} onClick={handleCloseDetail}>✕</Text>
            </View>

            <ScrollView scrollY className={styles.detailBody}>
              {/* 概览信息 */}
              <View className={styles.detailOverview}>
                <View className={styles.overviewRow}>
                  <Text className={styles.overviewLabel}>受助人</Text>
                  <Text className={styles.overviewValue}>{selectedFlow.recipientAlias}</Text>
                </View>
                <View className={styles.overviewRow}>
                  <Text className={styles.overviewLabel}>公益组织</Text>
                  <Text className={styles.overviewValue}>{selectedFlow.organizationName}</Text>
                </View>
                <View className={styles.overviewRow}>
                  <Text className={styles.overviewLabel}>领取金额</Text>
                  <Text className={styles.overviewValueHighlight}>
                    {formatMoney(selectedFlow.amount || 0)}
                  </Text>
                </View>
                <View className={styles.overviewRow}>
                  <Text className={styles.overviewLabel}>申请人</Text>
                  <Text className={styles.overviewValue}>
                    {selectedFlow.applicantType === 'organization' ? '公益组织代领' : '受助人自领'}
                  </Text>
                </View>
              </View>

              {/* 流程时间线 */}
              <View className={styles.timeline}>
                <Text className={styles.timelineTitle}>流程时间线</Text>
                {selectedFlow.steps.map((stepInfo, idx) => {
                  const stepConfig = CLAIM_STEP_MAP[stepInfo.step];
                  return (
                    <View key={stepInfo.step} className={styles.timelineItem}>
                      <View className={styles.timelineLeft}>
                        <View
                          className={classnames(
                            styles.timelineIcon,
                            stepInfo.status === 'done' && styles.timelineIconDone,
                            stepInfo.status === 'current' && styles.timelineIconCurrent,
                            stepInfo.status === 'pending' && styles.timelineIconPending
                          )}
                        >
                          <Text className={styles.timelineIconText}>
                            {stepInfo.status === 'done' ? '✓' : STEP_ICON[stepInfo.step]}
                          </Text>
                        </View>
                        {idx < selectedFlow.steps.length - 1 && (
                          <View
                            className={classnames(
                              styles.timelineLine,
                              stepInfo.status === 'done' && styles.timelineLineDone
                            )}
                          />
                        )}
                      </View>
                      <View className={styles.timelineContent}>
                        <View className={styles.timelineHeader}>
                          <Text
                            className={classnames(
                              styles.timelineLabel,
                              stepInfo.status === 'pending' && styles.timelineLabelPending
                            )}
                          >
                            {stepConfig.label}
                          </Text>
                          {stepInfo.status === 'current' && (
                            <View className={styles.currentBadge}>
                              <Text className={styles.currentBadgeText}>当前</Text>
                            </View>
                          )}
                        </View>
                        <Text className={styles.timelineDesc}>{stepConfig.desc}</Text>
                        {stepInfo.operator && (
                          <Text className={styles.timelineOperator}>
                            操作人：{stepInfo.operator}
                          </Text>
                        )}
                        {stepInfo.note && (
                          <View className={styles.timelineNote}>
                            <Text className={styles.timelineNoteText}>{stepInfo.note}</Text>
                          </View>
                        )}
                        {stepInfo.timestamp && (
                          <Text className={styles.timelineTime}>
                            {formatDateTime(stepInfo.timestamp)}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default ClaimFlowPage;
