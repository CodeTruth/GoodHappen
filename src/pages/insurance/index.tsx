import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import {
  useProtectionStore,
  INSURANCE_QUALIFY_DAYS,
  LEGAL_FEE_LIMIT,
  COMPENSATION_LIMIT,
  PREMIUM_PER_PERSON_MONTHLY,
} from '@/store/protection';
import { useFortuneStore } from '@/store/fortune';
import { useUserStore } from '@/store/user';
import styles from './index.module.scss';

/**
 * 善行保险页面 - Phase 9 P3
 *
 * 功能：
 * 1. 触发条件：累计30天善行记录 → 自动获得「善行保护」
 * 2. 保费来源：平台从品牌温暖基金提取（人均¥2/月以下）
 * 3. 保额：法律费用上限¥50,000 / 赔偿金上限¥100,000
 * 4. 赔付条件：善行记录时间戳和争议事件时间吻合 + 第三方证据或最终判决
 * 5. 不赔条件：善行记录在争议发生后才创建
 * 6. 展示"你的善行保护已生效"，一键理赔入口
 */
const InsurancePage: React.FC = () => {
  const {
    insurance,
    claims,
    sosRecords,
    checkInsuranceEligibility,
    submitClaim,
    loadFromStorage,
  } = useProtectionStore();

  const { loadFromStorage: loadFortune } = useFortuneStore();
  const { isLoggedIn, loadFromStorage: loadUser } = useUserStore();

  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claimType, setClaimType] = useState<'legal_fee' | 'compensation'>('legal_fee');
  const [claimAmount, setClaimAmount] = useState('');

  useEffect(() => {
    loadFromStorage();
    loadFortune();
    loadUser();
    // 检查保险资格
    checkInsuranceEligibility();
  }, []);

  // 格式化金额
  const formatMoney = (amount: number): string => `¥${amount.toLocaleString('zh-CN')}`;

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

  // 进度百分比
  const progressPercent = useMemo(() => {
    return Math.min(100, Math.round((insurance.qualifiedDays / INSURANCE_QUALIFY_DAYS) * 100));
  }, [insurance.qualifiedDays]);

  // 状态标签文本
  const statusLabel = useMemo(() => {
    if (insurance.active) return '已生效';
    if (insurance.qualifiedDays > 0) return '累积中';
    return '未开启';
  }, [insurance]);

  // 理赔状态映射
  const claimStatusMap: Record<string, { label: string; className: string }> = {
    pending: { label: '待审核', className: styles.claimStatusPending },
    under_review: { label: '审核中', className: styles.claimStatusReview },
    approved: { label: '已通过', className: styles.claimStatusApproved },
    rejected: { label: '已拒绝', className: styles.claimStatusPending },
    paid: { label: '已赔付', className: styles.claimStatusApproved },
  };

  // 理赔类型映射
  const claimTypeMap: Record<string, string> = {
    legal_fee: '法律费用',
    compensation: '赔偿金',
  };

  // 一键理赔
  const handleClaim = () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    if (!insurance.active) {
      Taro.showToast({ title: '善行保护尚未生效', icon: 'none' });
      return;
    }
    if (sosRecords.length === 0) {
      Taro.showToast({ title: '请先发起求助', icon: 'none' });
      return;
    }
    setClaimModalVisible(true);
  };

  // 提交理赔
  const handleSubmitClaim = () => {
    const amount = parseInt(claimAmount, 10);
    if (!amount || amount <= 0) {
      Taro.showToast({ title: '请输入有效金额', icon: 'none' });
      return;
    }

    const latestSos = sosRecords[0];
    const result = submitClaim(latestSos.id, claimType, amount, '善行保险理赔申请');
    if (result.success) {
      Taro.showToast({ title: result.message, icon: 'success' });
      setClaimModalVisible(false);
      setClaimAmount('');
    } else {
      Taro.showToast({ title: result.message, icon: 'none' });
    }
  };

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>善行保险</Text>
        <Text className={styles.headerSubtitle}>
          善行有底气，维权不孤单{'\n'}
          平台为善行者提供专属保护
        </Text>
      </View>

      {/* 保险状态卡片 */}
      <View
        className={classnames(
          styles.statusCard,
          insurance.active ? styles.statusActive : styles.statusInactive
        )}
      >
        <View className={styles.statusHeader}>
          <Text className={styles.statusIcon}>{insurance.active ? '🛡️' : '🔒'}</Text>
          <Text className={styles.statusTitle}>
            {insurance.active ? '你的善行保护已生效' : '善行保护未生效'}
          </Text>
          <Text
            className={classnames(
              styles.statusBadge,
              !insurance.active && styles.statusBadgeInactive
            )}
          >
            {statusLabel}
          </Text>
        </View>
        <Text className={styles.statusDesc}>
          {insurance.active
            ? `生效时间：${formatTime(insurance.activatedAt)}{'\n'}法律费用保额 ${formatMoney(LEGAL_FEE_LIMIT)} · 赔偿金保额 ${formatMoney(COMPENSATION_LIMIT)}`
            : `累计 ${INSURANCE_QUALIFY_DAYS} 天善行记录即可自动获得善行保护{'\n'}当前已累计 ${insurance.qualifiedDays} 天，还差 ${INSURANCE_QUALIFY_DAYS - insurance.qualifiedDays} 天`}
        </Text>

        {/* 进度条 */}
        {!insurance.active && (
          <View className={styles.statusProgress}>
            <Text className={styles.progressLabel}>善行累积进度</Text>
            <View className={styles.progressBar}>
              <View
                className={styles.progressFill}
                style={{ width: `${progressPercent}%` }}
              />
            </View>
            <View className={styles.progressInfo}>
              <Text className={styles.progressCurrent}>{insurance.qualifiedDays} 天</Text>
              <Text className={styles.progressTarget}>{INSURANCE_QUALIFY_DAYS} 天</Text>
            </View>
          </View>
        )}
      </View>

      {/* 保额展示 */}
      <View className={styles.coverageCard}>
        <Text className={styles.coverageTitle}>保障范围</Text>
        <View className={styles.coverageGrid}>
          <View className={styles.coverageItem}>
            <Text className={styles.coverageIcon}>⚖️</Text>
            <Text className={styles.coverageAmount}>{formatMoney(LEGAL_FEE_LIMIT)}</Text>
            <Text className={styles.coverageLabel}>法律费用上限</Text>
          </View>
          <View className={styles.coverageItem}>
            <Text className={styles.coverageIcon}>💰</Text>
            <Text className={styles.coverageAmount}>{formatMoney(COMPENSATION_LIMIT)}</Text>
            <Text className={styles.coverageLabel}>赔偿金上限</Text>
          </View>
        </View>
      </View>

      {/* 保费来源 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>保费来源</Text>
        <View className={styles.premiumInfo}>
          <Text className={styles.premiumIcon}>💝</Text>
          <View className={styles.premiumContent}>
            <Text className={styles.premiumLabel}>品牌温暖基金</Text>
            <Text className={styles.premiumDesc}>
              平台从品牌温暖基金提取，<Text className={styles.premiumHighlight}>人均 ¥{PREMIUM_PER_PERSON_MONTHLY}/月以下</Text>
              {'\n'}善行者无需支付任何保费
            </Text>
          </View>
        </View>
      </View>

      {/* 赔付条件 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>赔付条件</Text>
        <View className={styles.conditionItem}>
          <Text className={styles.conditionIcon}>✅</Text>
          <View className={styles.conditionContent}>
            <Text className={styles.conditionLabel}>时间吻合</Text>
            <Text className={styles.conditionDesc}>
              善行记录时间戳与争议事件时间吻合，证明善行发生在争议之前
            </Text>
          </View>
        </View>
        <View className={styles.conditionItem}>
          <Text className={styles.conditionIcon}>✅</Text>
          <View className={styles.conditionContent}>
            <Text className={styles.conditionLabel}>第三方证据</Text>
            <Text className={styles.conditionDesc}>
              有见证网络匹配的独立证据链，或最终法院判决支持善行者
            </Text>
          </View>
        </View>
        <View className={styles.conditionItem}>
          <Text className={styles.conditionIcon}>❌</Text>
          <View className={styles.conditionContent}>
            <Text className={styles.conditionLabel}>不赔条件</Text>
            <Text className={styles.conditionDesc}>
              善行记录在争议发生后才创建（系统会自动校验时间戳）
            </Text>
          </View>
        </View>
      </View>

      {/* 一键理赔入口 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>理赔申请</Text>
        <Text className={styles.statusDesc}>
          遇到纠纷？发起求助后可一键申请理赔{'\n'}
          系统将自动校验善行记录时间戳与证据链
        </Text>
        <View
          className={classnames(
            styles.claimButton,
            !insurance.active && styles.claimButtonDisabled
          )}
          onClick={handleClaim}
        >
          {insurance.active ? '一键理赔' : '善行保护未生效'}
        </View>
      </View>

      {/* 理赔记录 */}
      {claims.length > 0 && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>理赔记录</Text>
          {claims.map((claim) => {
            const statusInfo = claimStatusMap[claim.status] || claimStatusMap.pending;
            return (
              <View key={claim.id} className={styles.claimItem}>
                <View className={styles.claimHeader}>
                  <Text className={styles.claimType}>{claimTypeMap[claim.type]}</Text>
                  <Text className={classnames(styles.claimStatus, statusInfo.className)}>
                    {statusInfo.label}
                  </Text>
                </View>
                <Text className={styles.claimAmount}>{formatMoney(claim.amount)}</Text>
                <Text className={styles.claimReason}>{claim.reason}</Text>
                <Text className={styles.claimDate}>申请时间：{formatTime(claim.createdAt)}</Text>
                {claim.witnessChainFormed && (
                  <Text className={styles.claimEvidence}>✓ 已形成见证证据链</Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* 理赔弹窗 */}
      {claimModalVisible && (
        <View
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setClaimModalVisible(false)}
        >
          <View
            style={{
              width: '80%',
              background: '#fff',
              borderRadius: '16rpx',
              padding: '32rpx',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Text style={{ fontSize: '32rpx', fontWeight: 600, display: 'block', marginBottom: '24rpx' }}>
              理赔申请
            </Text>

            {/* 理赔类型选择 */}
            <Text style={{ fontSize: '24rpx', color: '#666', display: 'block', marginBottom: '16rpx' }}>
              理赔类型
            </Text>
            <View style={{ display: 'flex', gap: '16rpx', marginBottom: '24rpx' }}>
              <View
                style={{
                  flex: 1,
                  padding: '16rpx',
                  borderRadius: '8rpx',
                  textAlign: 'center',
                  fontSize: '24rpx',
                  background: claimType === 'legal_fee' ? '#FF6B6B' : '#f2f3f5',
                  color: claimType === 'legal_fee' ? '#fff' : '#666',
                }}
                onClick={() => setClaimType('legal_fee')}
              >
                法律费用
              </View>
              <View
                style={{
                  flex: 1,
                  padding: '16rpx',
                  borderRadius: '8rpx',
                  textAlign: 'center',
                  fontSize: '24rpx',
                  background: claimType === 'compensation' ? '#FF6B6B' : '#f2f3f5',
                  color: claimType === 'compensation' ? '#fff' : '#666',
                }}
                onClick={() => setClaimType('compensation')}
              >
                赔偿金
              </View>
            </View>

            {/* 金额输入 */}
            <Text style={{ fontSize: '24rpx', color: '#666', display: 'block', marginBottom: '16rpx' }}>
              申请金额（上限 {formatMoney(claimType === 'legal_fee' ? LEGAL_FEE_LIMIT : COMPENSATION_LIMIT)}）
            </Text>
            <Input
              style={{
                width: '100%',
                height: '80rpx',
                padding: '0 24rpx',
                border: '1rpx solid #E8E8E8',
                borderRadius: '8rpx',
                fontSize: '28rpx',
                marginBottom: '32rpx',
                boxSizing: 'border-box',
              }}
              type='number'
              placeholder='请输入金额'
              value={claimAmount}
              onInput={(e) => setClaimAmount(e.detail.value)}
            />

            <View
              style={{
                display: 'flex',
                gap: '16rpx',
              }}
            >
              <View
                style={{
                  flex: 1,
                  height: '80rpx',
                  borderRadius: '48rpx',
                  background: '#f2f3f5',
                  color: '#666',
                  fontSize: '28rpx',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={() => setClaimModalVisible(false)}
              >
                取消
              </View>
              <View
                style={{
                  flex: 1,
                  height: '80rpx',
                  borderRadius: '48rpx',
                  background: 'linear-gradient(135deg, #FF6B6B 0%, #FFA07A 100%)',
                  color: '#fff',
                  fontSize: '28rpx',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onClick={handleSubmitClaim}
              >
                提交申请
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 底部说明 */}
      <View className={styles.footerNote}>
        <Text className={styles.footerText}>
          善行保险由平台温暖基金提供{'\n'}
          保费来自品牌赞助，善行者无需付费{'\n'}
          每一份善行，都值得被守护
        </Text>
      </View>
    </ScrollView>
  );
};

export default InsurancePage;
