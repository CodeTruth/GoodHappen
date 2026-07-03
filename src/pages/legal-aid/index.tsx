import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useProtectionStore, LEGAL_AID_PARTNERS, EVIDENCE_PRESERVATION_GUIDE, getFeeAdvanceRule } from '@/store/protection';
import { useFortuneStore } from '@/store/fortune';
import { useUserStore } from '@/store/user';
import styles from './index.module.scss';

// 模拟律师评价数据
const MOCK_LAWYER_REVIEWS = [
  { caseType: '民事纠纷', caseCount: 32, goodRate: 96, responseMinutes: 5 },
  { caseType: '合同纠纷', caseCount: 18, goodRate: 94, responseMinutes: 8 },
  { caseType: '侵权纠纷', caseCount: 27, goodRate: 97, responseMinutes: 3 },
];

// 模拟匹配原因
const MATCH_REASONS = [
  '擅长民事纠纷+本地律所+5分钟内响应',
  '深耕善行维权领域+10年执业经验+好评率96%',
  '同城律师+24小时在线+成功案例32起',
];

// 模拟预计费用范围
const FEE_RANGES: Record<string, string> = {
  legal_fee: '¥2,000 - ¥8,000',
  compensation: '¥5,000 - ¥50,000',
  consultation: '¥500 - ¥2,000',
};

/**
 * 法律援助绿色通道页面 - Phase 9 P2
 *
 * 功能：
 * 1. 一键求助：30分钟内合作律师回电（模拟）
 * 2. 证据保全指导：AI引导5件事
 * 3. 律师匹配：24小时内根据事件类型匹配本地律师（模拟），含匹配动画、匹配详情、费用范围、律师评价
 * 4. 代理费用：暖阳以上→温暖基金垫付首期；皓月以上→全额垫付
 * 5. 合作方列表
 */
const LegalAidPage: React.FC = () => {
  const {
    sosRecords,
    triggerSOS,
    matchLawyer,
    getLawyerMatchBySos,
    loadFromStorage,
  } = useProtectionStore();

  const { totalFortune, loadFromStorage: loadFortune } = useFortuneStore();
  const { isLoggedIn, loadFromStorage: loadUser } = useUserStore();

  const [triggering, setTriggering] = useState(false);
  const [matchingLawyer, setMatchingLawyer] = useState(false);
  const [matchComplete, setMatchComplete] = useState(false);
  const matchTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadFromStorage();
    loadFortune();
    loadUser();
  }, []);

  // 获取最新求助记录
  const latestSos = sosRecords[0];

  // 获取律师匹配结果
  const lawyerMatch = latestSos ? getLawyerMatchBySos(latestSos.id) : undefined;

  // 代理费用垫付规则
  const feeRule = useMemo(() => getFeeAdvanceRule(totalFortune), [totalFortune]);

  // 获取模拟律师评价
  const lawyerReview = useMemo(() => {
    return MOCK_LAWYER_REVIEWS[Math.floor(Math.random() * MOCK_LAWYER_REVIEWS.length)];
  }, [matchComplete]);

  // 获取模拟匹配原因
  const matchReason = useMemo(() => {
    return MATCH_REASONS[Math.floor(Math.random() * MATCH_REASONS.length)];
  }, [matchComplete]);

  // 获取模拟费用范围
  const feeRange = useMemo(() => {
    return FEE_RANGES.legal_fee;
  }, [matchComplete]);

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

  // 一键求助
  const handleSOS = async () => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 选择一条善行记录进行求助（模拟：使用最近一条）
    setTriggering(true);
    try {
      // 模拟：使用一个固定的善行记录 ID（实际应从善行列表选择）
      const mockRecordId = `kindness_${Date.now()}`;
      const result = await triggerSOS(mockRecordId, '我在做善行时被对方讹诈，请求法律援助');
      if (result.success) {
        Taro.showToast({ title: '律师将尽快联系您', icon: 'success' });
        // 自动触发律师匹配动画
        triggerLawyerMatchAnimation();
      } else {
        Taro.showToast({ title: result.message, icon: 'none' });
      }
    } catch (e) {
      Taro.showToast({ title: '求助失败，请重试', icon: 'none' });
    } finally {
      setTriggering(false);
    }
  };

  // 律师匹配动画
  const triggerLawyerMatchAnimation = () => {
    setMatchingLawyer(true);
    setMatchComplete(false);
    matchTimerRef.current = setTimeout(() => {
      setMatchingLawyer(false);
      setMatchComplete(true);
      // 3秒后隐藏匹配完成状态
      setTimeout(() => {
        setMatchComplete(false);
      }, 3000);
    }, 1500);
  };

  // 重新匹配律师
  const handleRematchLawyer = () => {
    if (!latestSos) return;
    // 先显示匹配动画，再执行实际匹配
    triggerLawyerMatchAnimation();
    matchLawyer(latestSos.id);
    setTimeout(() => {
      Taro.showToast({ title: '已重新匹配律师', icon: 'success' });
    }, 1600);
  };

  // 清理定时器
  useEffect(() => {
    return () => {
      if (matchTimerRef.current) {
        clearTimeout(matchTimerRef.current);
      }
    };
  }, []);

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>法律援助绿色通道</Text>
        <Text className={styles.headerSubtitle}>
          善行者不该独自面对误解{'\n'}
          我们与你站在一起
        </Text>
      </View>

      {/* 一键求助卡片 */}
      <View className={styles.sosCard}>
        <Text className={styles.sosTitle}>一键求助</Text>
        <Text className={styles.sosDesc}>
          遇到纠纷？点击下方按钮，30分钟内合作律师回电{'\n'}
          系统将自动锁定你的善行证据
        </Text>
        <View
          className={classnames(
            styles.sosButton,
            latestSos && styles.sosButtonTriggered
          )}
          onClick={!latestSos && !triggering ? handleSOS : undefined}
        >
          {triggering ? '正在锁定证据...' : latestSos ? '已发起求助' : '我被讹了 · 一键求助'}
        </View>

        {/* 求助状态 */}
        {latestSos && (
          <View className={styles.sosStatus}>
            <Text className={styles.sosStatusText}>证据已锁定</Text>
            <Text className={styles.sosStatusDesc}>
              求助时间：{formatTime(latestSos.triggeredAt)}{'\n'}
              你的善行记录已在争议发生前存入系统，非事后捏造{'\n'}
              匹配到 {latestSos.witnessMatchCount} 条见证记录
            </Text>
          </View>
        )}
      </View>

      {/* 律师匹配动画 */}
      {matchingLawyer && (
        <View className={styles.matchingCard}>
          <View className={styles.matchingAnimation}>
            <View className={styles.matchingDot1} />
            <View className={styles.matchingDot2} />
            <View className={styles.matchingDot3} />
          </View>
          <Text className={styles.matchingText}>正在匹配律师...</Text>
          <Text className={styles.matchingSubText}>正在根据案件类型、地区、专业领域为您匹配最合适的律师</Text>
        </View>
      )}

      {/* 律师匹配结果 */}
      {latestSos && lawyerMatch && !matchingLawyer && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>律师匹配 · 24小时内</Text>
          <View className={styles.lawyerCard}>
            <Image className={styles.lawyerAvatar} src={lawyerMatch.lawyerAvatar} mode='aspectFill' />
            <View className={styles.lawyerInfo}>
              <Text className={styles.lawyerName}>{lawyerMatch.lawyerName}</Text>
              <Text className={styles.lawyerFirm}>{lawyerMatch.lawFirm}</Text>
              <Text className={styles.lawyerSpecialty}>{lawyerMatch.specialty}</Text>
            </View>
            <Text className={styles.lawyerStatus}>已匹配</Text>
          </View>

          {/* 匹配详情 */}
          <View className={styles.matchDetailCard}>
            <Text className={styles.matchDetailTitle}>匹配详情</Text>
            <View className={styles.matchDetailRow}>
              <Text className={styles.matchDetailLabel}>匹配原因</Text>
              <Text className={styles.matchDetailValue}>{matchReason}</Text>
            </View>
            <View className={styles.matchDetailRow}>
              <Text className={styles.matchDetailLabel}>预计费用</Text>
              <Text className={styles.matchDetailValue}>{feeRange}</Text>
            </View>
            <View className={styles.matchDetailRow}>
              <Text className={styles.matchDetailLabel}>律师评价</Text>
              <Text className={styles.matchDetailValue}>
                已处理{lawyerReview.caseCount}起{lawyerReview.caseType}案件，好评率{lawyerReview.goodRate}%
              </Text>
            </View>
            <View className={styles.matchDetailRow}>
              <Text className={styles.matchDetailLabel}>预计回电</Text>
              <Text className={styles.matchDetailValue}>{formatTime(lawyerMatch.callbackExpectedAt)}</Text>
            </View>
            <View className={styles.matchDetailRow}>
              <Text className={styles.matchDetailLabel}>匹配时间</Text>
              <Text className={styles.matchDetailValue}>{formatTime(lawyerMatch.matchedAt)}</Text>
            </View>
          </View>

          {/* 律师评价卡片 */}
          <View className={styles.reviewCard}>
            <Text className={styles.reviewTitle}>律师综合评价</Text>
            <View className={styles.reviewStats}>
              <View className={styles.reviewStatItem}>
                <Text className={styles.reviewStatValue}>{lawyerReview.caseCount}</Text>
                <Text className={styles.reviewStatLabel}>处理案件</Text>
              </View>
              <View className={styles.reviewStatDivider} />
              <View className={styles.reviewStatItem}>
                <Text className={styles.reviewStatValue}>{lawyerReview.goodRate}%</Text>
                <Text className={styles.reviewStatLabel}>好评率</Text>
              </View>
              <View className={styles.reviewStatDivider} />
              <View className={styles.reviewStatItem}>
                <Text className={styles.reviewStatValue}>{lawyerReview.responseMinutes}min</Text>
                <Text className={styles.reviewStatLabel}>平均响应</Text>
              </View>
            </View>
          </View>

          <View
            className={classnames(styles.sosButton, styles.sosButtonTriggered)}
            style={{ marginTop: '16rpx', height: '64rpx', fontSize: '24rpx' }}
            onClick={handleRematchLawyer}
          >
            重新匹配律师
          </View>
        </View>
      )}

      {/* 证据保全指导 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>证据保全指导 · AI 引导 5 件事</Text>
        <View className={styles.guideList}>
          {EVIDENCE_PRESERVATION_GUIDE.map((guide) => (
            <View key={guide.step} className={styles.guideItem}>
              <View className={styles.guideStep}>{guide.step}</View>
              <View className={styles.guideContent}>
                <View className={styles.guideHeader}>
                  <Text className={styles.guideIcon}>{guide.icon}</Text>
                  <Text className={styles.guideItemTitle}>{guide.title}</Text>
                </View>
                <Text className={styles.guideDesc}>{guide.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 代理费用规则 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>代理费用 · 温暖基金垫付</Text>

        {/* 当前用户垫付状态 */}
        <View className={styles.advanceStatus}>
          <Text className={styles.advanceTitle}>
            你的当前等级：{feeRule.titleName}
          </Text>
          <Text className={styles.advanceDesc}>{feeRule.description}</Text>
        </View>

        {/* 费用规则列表 */}
        <View className={styles.feeRuleCard}>
          <Text className={styles.feeRuleTitle}>
            <Text className={styles.feeRuleHighlight}>皓月以上</Text> · 全额垫付
          </Text>
          <Text className={styles.feeRuleDesc}>
            温暖基金全额垫付代理费用，善行者无需承担任何法律费用
          </Text>
        </View>
        <View className={styles.feeRuleCard}>
          <Text className={styles.feeRuleTitle}>
            <Text className={styles.feeRuleHighlight}>暖阳以上</Text> · 垫付首期
          </Text>
          <Text className={styles.feeRuleDesc}>
            温暖基金垫付代理费用首期，后续根据案件结果协商
          </Text>
        </View>
        <View className={styles.feeRuleCard}>
          <Text className={styles.feeRuleTitle}>
            <Text className={styles.feeRuleHighlight}>暖阳以下</Text> · 法律援助
          </Text>
          <Text className={styles.feeRuleDesc}>
            可申请法律援助中心公益服务，累计善行至暖阳级别可获温暖基金垫付
          </Text>
        </View>
      </View>

      {/* 合作方列表 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>合作方列表</Text>
        {LEGAL_AID_PARTNERS.map((partner) => (
          <View key={partner.id} className={styles.partnerItem}>
            <Text className={styles.partnerIcon}>{partner.icon}</Text>
            <View className={styles.partnerInfo}>
              <Text className={styles.partnerName}>{partner.name}</Text>
              <Text className={styles.partnerType}>{partner.type}</Text>
              <Text className={styles.partnerDesc}>{partner.description}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 底部说明 */}
      <View className={styles.footerNote}>
        <Text className={styles.footerText}>
          法律援助绿色通道 7x24 小时在线{'\n'}
          所有善行者都值得被温柔以待{'\n'}
          善行有记录，维权有底气
        </Text>
      </View>
    </ScrollView>
  );
};

export default LegalAidPage;
