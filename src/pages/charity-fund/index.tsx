import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useFortuneStore } from '@/store/fortune';
import { useCharityFundStore } from '@/store/charityFund';
import { useUserStore } from '@/store/user';
import { FundFlow } from '@/data/charityFund';
import styles from './index.module.scss';

// 资金流向状态映射
const FLOW_STATUS_MAP: Record<FundFlow['status'], { label: string; color: string }> = {
  in_transit: { label: '中转中', color: '#FAAD14' },
  delivered: { label: '已送达', color: '#165dff' },
  confirmed: { label: '已确认', color: '#52C41A' },
};

// 节点类型图标
const NODE_ICON: Record<string, string> = {
  source: '💝',
  organization: '🏢',
  recipient: '❤️',
};

const CharityFundPage: React.FC = () => {
  const { availableFortune, loadFromStorage: loadFortune } = useFortuneStore();
  const {
    organizations,
    reports,
    getMyDonations,
    getMyFundFlows,
    loadFromStorage: loadCharityFund,
  } = useCharityFundStore();
  const { loadFromStorage: loadUser } = useUserStore();

  const [activeTab, setActiveTab] = useState<'flow' | 'organizations' | 'reports'>('flow');
  const [selectedFlow, setSelectedFlow] = useState<FundFlow | null>(null);

  useEffect(() => {
    loadFortune();
    loadCharityFund();
    loadUser();
  }, []);

  // 我的捐赠记录
  const myDonations = useMemo(() => getMyDonations(), [getMyDonations]);
  // 我的资金流向
  const myFlows = useMemo(() => getMyFundFlows(), [getMyFundFlows]);

  // 格式化金额
  const formatMoney = (amount: number): string => `¥${amount.toLocaleString('zh-CN')}`;

  // 格式化日期
  const formatDate = (iso: string): string => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('zh-CN');
  };

  // 跳转到受助人页面
  const handleGoRecipients = () => {
    Taro.navigateTo({ url: '/pages/recipients/index' });
  };

  // 跳转到领取流程页面
  const handleGoClaimFlow = () => {
    Taro.navigateTo({ url: '/pages/claim-flow/index' });
  };

  // 查看资金流向详情
  const handleFlowClick = (flow: FundFlow) => {
    setSelectedFlow(flow);
  };

  // 关闭详情弹窗
  const handleCloseDetail = () => {
    setSelectedFlow(null);
  };

  // 统计总捐赠金额
  const totalDonated = useMemo(() => {
    return myDonations.reduce((sum, d) => sum + d.moneyAmount, 0);
  }, [myDonations]);

  // 统计帮助人数
  const helpedCount = useMemo(() => {
    const ids = new Set(myDonations.map(d => d.recipientId).filter(Boolean));
    return ids.size;
  }, [myDonations]);

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>慈善善款</Text>
        <Text className={styles.headerSubtitle}>
          福气兑换善款，温暖精准送达{'\n'}
          每一笔流向全链路透明可追溯
        </Text>
        <View className={styles.fortuneCard}>
          <View className={styles.fortuneItem}>
            <Text className={styles.fortuneValue}>{availableFortune}</Text>
            <Text className={styles.fortuneLabel}>可用福气</Text>
          </View>
          <View className={styles.fortuneDivider} />
          <View className={styles.fortuneItem}>
            <Text className={styles.fortuneValue}>{formatMoney(totalDonated)}</Text>
            <Text className={styles.fortuneLabel}>累计捐赠</Text>
          </View>
          <View className={styles.fortuneDivider} />
          <View className={styles.fortuneItem}>
            <Text className={styles.fortuneValue}>{helpedCount}</Text>
            <Text className={styles.fortuneLabel}>帮助人数</Text>
          </View>
        </View>
      </View>

      {/* 资金流向说明 */}
      <View className={styles.flowChart}>
        <Text className={styles.flowChartTitle}>资金流向</Text>
        <View className={styles.flowChartFlow}>
          <View className={styles.flowChartNode}>
            <Text className={styles.flowChartIcon}>💝</Text>
            <Text className={styles.flowChartLabel}>温暖基金</Text>
            <Text className={styles.flowChartDesc}>福气兑换</Text>
          </View>
          <Text className={styles.flowChartArrow}>→</Text>
          <View className={styles.flowChartNode}>
            <Text className={styles.flowChartIcon}>🏢</Text>
            <Text className={styles.flowChartLabel}>公益组织</Text>
            <Text className={styles.flowChartDesc}>合规中转</Text>
          </View>
          <Text className={styles.flowChartArrow}>→</Text>
          <View className={styles.flowChartNode}>
            <Text className={styles.flowChartIcon}>❤️</Text>
            <Text className={styles.flowChartLabel}>受助人</Text>
            <Text className={styles.flowChartDesc}>温暖送达</Text>
          </View>
        </View>
      </View>

      {/* 标签切换 */}
      <View className={styles.tabs}>
        <Text
          className={classnames(styles.tab, activeTab === 'flow' && styles.active)}
          onClick={() => setActiveTab('flow')}
        >
          我的捐赠
        </Text>
        <Text
          className={classnames(styles.tab, activeTab === 'organizations' && styles.active)}
          onClick={() => setActiveTab('organizations')}
        >
          合作组织
        </Text>
        <Text
          className={classnames(styles.tab, activeTab === 'reports' && styles.active)}
          onClick={() => setActiveTab('reports')}
        >
          财务公示
        </Text>
      </View>

      {/* 我的捐赠记录 */}
      {activeTab === 'flow' && (
        <View className={styles.section}>
          {myFlows.length > 0 ? (
            myFlows.map((flow) => {
              const statusInfo = FLOW_STATUS_MAP[flow.status];
              return (
                <View
                  key={flow.id}
                  className={styles.flowCard}
                  onClick={() => handleFlowClick(flow)}
                >
                  <View className={styles.flowCardHeader}>
                    <View className={styles.flowAmount}>
                      <Text className={styles.flowAmountValue}>{formatMoney(flow.amount)}</Text>
                      <Text className={styles.flowAmountLabel}>善款</Text>
                    </View>
                    <View
                      className={styles.flowStatus}
                      style={{ background: `${statusInfo.color}1A`, color: statusInfo.color }}
                    >
                      <Text className={styles.flowStatusText}>{statusInfo.label}</Text>
                    </View>
                  </View>
                  <View className={styles.flowPath}>
                    <Text className={styles.flowPathText}>
                      {flow.sourceDescription}
                    </Text>
                    <Text className={styles.flowPathArrow}>→</Text>
                    <Text className={styles.flowPathText}>{flow.organizationName}</Text>
                    <Text className={styles.flowPathArrow}>→</Text>
                    <Text className={styles.flowPathText}>{flow.recipientAlias}</Text>
                  </View>
                  <View className={styles.flowFooter}>
                    <Text className={styles.flowDate}>{formatDate(flow.createdAt)}</Text>
                    <Text className={styles.flowDetailHint}>查看全链路 ›</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View className={styles.empty}>
              <Text className={styles.emptyIcon}>🌱</Text>
              <Text className={styles.emptyText}>还没有捐赠记录</Text>
              <Text className={styles.emptySubText}>兑换福气，让温暖流向需要的人</Text>
            </View>
          )}

          {/* 兑换入口 */}
          <View className={styles.donateBtn} onClick={handleGoRecipients}>
            <Text className={styles.donateBtnText}>福气兑换善款</Text>
          </View>

          {/* 领取流程入口 */}
          {myFlows.length > 0 && (
            <View className={styles.claimBtn} onClick={handleGoClaimFlow}>
              <Text className={styles.claimBtnText}>查看善款领取进度 ›</Text>
            </View>
          )}
        </View>
      )}

      {/* 合作公益组织 */}
      {activeTab === 'organizations' && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>合规公益组织</Text>
          {organizations.map((org) => (
            <View key={org.id} className={styles.orgCard}>
              <View className={styles.orgHeader}>
                <Text className={styles.orgIcon}>🏢</Text>
                <View className={styles.orgInfo}>
                  <Text className={styles.orgName}>{org.name}</Text>
                  <Text className={styles.orgLicense}>公募资质：{org.license}</Text>
                </View>
                {org.isVerified && (
                  <View className={styles.verifiedTag}>
                    <Text className={styles.verifiedText}>✓ 已认证</Text>
                  </View>
                )}
              </View>
              <Text className={styles.orgDesc}>{org.description}</Text>
              <View className={styles.orgStats}>
                <View className={styles.orgStat}>
                  <Text className={styles.orgStatValue}>{formatMoney(org.totalReceived)}</Text>
                  <Text className={styles.orgStatLabel}>累计接收</Text>
                </View>
                <View className={styles.orgStatDivider} />
                <View className={styles.orgStat}>
                  <Text className={styles.orgStatValue}>{org.totalBeneficiaries}</Text>
                  <Text className={styles.orgStatLabel}>帮扶人数</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 季度财务公示 */}
      {activeTab === 'reports' && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>季度财务公示</Text>
          {reports.map((report) => (
            <View key={report.quarter} className={styles.reportCard}>
              <View className={styles.reportHeader}>
                <Text className={styles.reportQuarter}>{report.quarter}</Text>
                <Text className={styles.reportDate}>{formatDate(report.publishedAt)}</Text>
              </View>
              <Text className={styles.reportTitle}>{report.title}</Text>
              <View className={styles.reportStats}>
                <View className={styles.reportStat}>
                  <Text className={styles.reportStatValue}>{formatMoney(report.totalDonation)}</Text>
                  <Text className={styles.reportStatLabel}>善款总额</Text>
                </View>
                <View className={styles.reportStat}>
                  <Text className={styles.reportStatValue}>{report.totalBeneficiaries}</Text>
                  <Text className={styles.reportStatLabel}>受益人数</Text>
                </View>
                <View className={styles.reportStat}>
                  <Text className={styles.reportStatValue}>{report.totalFlow}</Text>
                  <Text className={styles.reportStatLabel}>资金流向</Text>
                </View>
              </View>
              <View className={styles.reportHighlights}>
                {report.highlights.map((h, idx) => (
                  <View key={idx} className={styles.highlightItem}>
                    <Text className={styles.highlightIcon}>✨</Text>
                    <Text className={styles.highlightText}>{h}</Text>
                  </View>
                ))}
              </View>
              <View className={styles.reportOrgs}>
                <Text className={styles.reportOrgsLabel}>参与组织：</Text>
                <Text className={styles.reportOrgsValue}>{report.organizations.join('、')}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 底部说明 */}
      <View className={styles.footerNote}>
        <Text className={styles.footerText}>
          所有善款通过合规公益组织中转，不直接对个人{'\n'}
          资金流向全链路透明，季度公示可追溯{'\n'}
          1福气 = ¥1善款（由温暖基金兑付）
        </Text>
      </View>

      {/* 资金流向详情弹窗 */}
      {selectedFlow && (
        <View className={styles.detailMask} onClick={handleCloseDetail}>
          <View className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>资金全链路</Text>
              <Text className={styles.detailClose} onClick={handleCloseDetail}>✕</Text>
            </View>
            <View className={styles.detailAmount}>
              <Text className={styles.detailAmountValue}>{formatMoney(selectedFlow.amount)}</Text>
              <Text className={styles.detailAmountLabel}>善款金额</Text>
            </View>
            <View className={styles.detailFlow}>
              {selectedFlow.flowNodes.map((node, idx) => (
                <View key={idx} className={styles.detailFlowNode}>
                  <View className={styles.nodeLeft}>
                    <Text className={styles.nodeIcon}>{NODE_ICON[node.type]}</Text>
                    {idx < selectedFlow.flowNodes.length - 1 && (
                      <View className={styles.nodeLine} />
                    )}
                  </View>
                  <View className={styles.nodeContent}>
                    <Text className={styles.nodeName}>{node.name}</Text>
                    <Text className={styles.nodeDesc}>{node.description}</Text>
                    {node.amount !== undefined && (
                      <Text className={styles.nodeAmount}>{formatMoney(node.amount)}</Text>
                    )}
                    <Text className={styles.nodeTime}>{formatDate(node.timestamp)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default CharityFundPage;
