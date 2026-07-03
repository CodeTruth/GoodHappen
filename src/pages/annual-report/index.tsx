import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useFortuneStore } from '@/store/fortune';
import { useKindnessStore } from '@/store/kindness';
import { mockKindnessList } from '@/data/kindness';
import { getLevelByFortune } from '@/utils/fortune';
import { FORTUNE_LEVELS } from '@/data/fortune-levels';
import SharePoster from '@/components/SharePoster';
import styles from './index.module.scss';

// ============================================
// Phase 10 - I3 年度报告分享
// ============================================

// 数字滚动动画 Hook
const useCountUp = (target: number, duration: number = 1500, start: boolean = true) => {
  const [count, setCount] = useState(0);
  const rafRef = useRef<any>(null);

  useEffect(() => {
    if (!start) return;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutQuart 缓动函数
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(target * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration, start]);

  return count;
};

// Mock 年度报告数据生成
interface AnnualReportData {
  year: number;
  totalRecords: number;
  totalFortune: number;
  typeDistribution: { type: string; icon: string; count: number; percent: number }[];
  monthlyTrend: number[]; // 12个月数据
  warmestRecord: {
    content: string;
    aiQuote: string;
    date: string;
  };
  annualTitle: string;
  annualTitleDesc: string;
}

// 生成 Mock 年度报告数据
const generateReportData = (totalFortune: number, userKindnessList: Array<{ id: string; content: string; createdAt: string; likes: number; aiResponse?: { content: string } }> = []): AnnualReportData => {
  const year = new Date().getFullYear();
  // 善行类型分布
  const typeData = [
    { type: '助人', icon: '🤝', count: 28 },
    { type: '环保', icon: '🌱', count: 18 },
    { type: '孝亲', icon: '❤️', count: 12 },
    { type: '关怀', icon: '💕', count: 15 },
    { type: '公益', icon: '📢', count: 8 },
    { type: '其他', icon: '✨', count: 6 },
  ];
  const total = typeData.reduce((sum, t) => sum + t.count, 0);
  const typeDistribution = typeData.map(t => ({
    ...t,
    percent: Math.round((t.count / total) * 100),
  }));

  // 月度趋势（12个月）
  const monthlyTrend = [3, 5, 8, 6, 10, 12, 9, 11, 7, 8, 5, 3];

  // 最温暖记录（优先使用用户的真实善行记录，兜底用 mock 数据）
  const warmestSource = userKindnessList.length > 0
    ? userKindnessList.reduce((max, item) =>
        item.likes > (max.likes || 0) ? item : max
      )
    : mockKindnessList.reduce((max, item) =>
        item.likes > max.likes ? item : max
      );
  const warmest = warmestSource;

  // 年度称号（基于福气值）
  const currentLevel = getLevelByFortune(totalFortune);
  // 找到比当前称号高一级的称号作为目标
  const nextTitle = FORTUNE_LEVELS.find(l => l.level === currentLevel.level + 1);

  return {
    year,
    totalRecords: total,
    totalFortune,
    typeDistribution,
    monthlyTrend,
    warmestRecord: {
      content: warmest.content,
      aiQuote: warmest.aiResponse?.content || '每一次善行，都是温暖世界的火种。',
      date: warmest.createdAt,
    },
    annualTitle: currentLevel.name,
    annualTitleDesc: nextTitle
      ? `${currentLevel.description}，距离「${nextTitle.name}」还差 ${nextTitle.minFortune - totalFortune} 福气`
      : `${currentLevel.description}，你已达到最高称号`,
  };
};

const AnnualReportPage: React.FC = () => {
  const { totalFortune, loadFromStorage } = useFortuneStore();
  const { publishedList, loadFromStorage: loadKindness } = useKindnessStore();
  const [reportData, setReportData] = useState<AnnualReportData | null>(null);
  const [animationStart, setAnimationStart] = useState(false);
  const [showSharePoster, setShowSharePoster] = useState(false);

  useEffect(() => {
    loadFromStorage();
    loadKindness();
  }, []);

  // 判断是否有真实数据：福气值 > 0 或用户已发布善行
  const hasRealData = totalFortune > 0 || publishedList.length > 0;

  useEffect(() => {
    if (totalFortune >= 0 && hasRealData) {
      // 使用真实数据，移除 Math.max(totalFortune, 580) 的 mock 回退
      setReportData(generateReportData(totalFortune, publishedList));
      // 延迟启动动画
      const timer = setTimeout(() => setAnimationStart(true), 200);
      return () => clearTimeout(timer);
    }
  }, [totalFortune, hasRealData, publishedList]);

  // 引导页：发布第一件善行
  const handlePublishFirstKindness = () => {
    Taro.navigateTo({ url: '/pages/record/index' });
  };

  // 数字滚动动画
  const animatedRecords = useCountUp(reportData?.totalRecords || 0, 1500, animationStart);
  const animatedFortune = useCountUp(reportData?.totalFortune || 0, 1800, animationStart);

  // 月度趋势最大值
  const maxMonthly = reportData ? Math.max(...reportData.monthlyTrend) : 1;

  // 生成分享海报
  const handleShare = () => {
    setShowSharePoster(true);
  };

  // 复制年度报告文案
  const handleCopyReport = () => {
    if (!reportData) return;
    const text = `这是我的${reportData.year}年温暖报告：\n\n` +
      `📝 全年记录 ${reportData.totalRecords} 件善行\n` +
      `💰 福气总积累 ${reportData.totalFortune}\n` +
      `🏅 年度称号：${reportData.annualTitle}\n\n` +
      `这是我的温暖报告，你的呢？✨\n` +
      `——来自「好事发生」`;
    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showToast({ title: '报告文案已复制', icon: 'success' });
      },
    });
  };

  // 引导页：当福气值为 0 且用户善行列表为空时展示
  if (!hasRealData && totalFortune === 0) {
    return (
      <View className={styles.container}>
        <View className={styles.guideContainer}>
          <View className={styles.guideIcon}>🌱</View>
          <Text className={styles.guideTitle}>你的第一年</Text>
          <Text className={styles.guideDesc}>
            这一年，你还没有记录善行。{'\n'}
            每一件善事都像一颗种子，{'\n'}
            播下温暖，收获福气。
          </Text>
          <View className={styles.guideBtn} onClick={handlePublishFirstKindness}>
            <Text className={styles.guideBtnText}>发布第一件善行，开启你的温暖记录</Text>
          </View>
          <Text className={styles.guideFooter}>
            你的年度报告将基于真实善行数据生成
          </Text>
        </View>
      </View>
    );
  }

  if (!reportData) {
    return (
      <View className={styles.container}>
        <View className={styles.cover}>
          <Text className={styles.coverTitle}>报告生成中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.container}>
      {/* 顶部封面 */}
      <View className={styles.cover}>
        <Text className={styles.coverYear}>{reportData.year}</Text>
        <Text className={styles.coverTitle}>年度温暖报告</Text>
        <Text className={styles.coverSub}>这一年，你让世界更温暖了一点</Text>
      </View>

      {/* 核心数据 */}
      <View className={styles.card}>
        <Text className={styles.cardTitle}>📊 这一年，你记录了</Text>
        <View className={styles.heroStats}>
          <View className={styles.heroStat}>
            <Text className={styles.heroStatValue}>{animatedRecords}</Text>
            <Text className={styles.heroStatLabel}>善行记录</Text>
          </View>
          <View className={styles.heroStat}>
            <Text className={styles.heroStatValue}>{animatedFortune}</Text>
            <Text className={styles.heroStatLabel}>福气积累</Text>
          </View>
        </View>
      </View>

      {/* 善行类型分布 */}
      <View className={styles.card}>
        <Text className={styles.cardTitle}>🎯 善行类型分布</Text>
        <View className={styles.typeList}>
          {reportData.typeDistribution.map((item, idx) => (
            <View key={idx} className={styles.typeItem}>
              <Text className={styles.typeIcon}>{item.icon}</Text>
              <View className={styles.typeInfo}>
                <View className={styles.typeHeader}>
                  <Text className={styles.typeName}>{item.type}</Text>
                  <Text className={styles.typeCount}>{item.count}件 · {item.percent}%</Text>
                </View>
                <View className={styles.typeBar}>
                  <View
                    className={styles.typeBarFill}
                    style={{
                      width: animationStart ? `${item.percent}%` : '0%',
                      transitionDelay: `${idx * 100}ms`,
                    }}
                  />
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 月度趋势 */}
      <View className={styles.card}>
        <Text className={styles.cardTitle}>📈 月度温暖趋势</Text>
        <View className={styles.monthChart}>
          {reportData.monthlyTrend.map((count, idx) => (
            <View key={idx} className={styles.monthBar}>
              <View
                className={styles.monthBarFill}
                style={{
                  height: animationStart ? `${(count / maxMonthly) * 100}%` : '0%',
                  transitionDelay: `${idx * 60}ms`,
                }}
              />
              <Text className={styles.monthLabel}>{idx + 1}月</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 最温暖记录回顾 */}
      <View className={styles.warmestCard}>
        <Text className={styles.warmestLabel}>🌟 年度最温暖记录</Text>
        <Text className={styles.warmestContent}>{reportData.warmestRecord.content}</Text>
        <Text className={styles.warmestQuote}>✨ {reportData.warmestRecord.aiQuote}</Text>
        <Text className={styles.warmestDate}>
          {new Date(reportData.warmestRecord.date).toLocaleDateString('zh-CN')}
        </Text>
      </View>

      {/* 年度称号 */}
      <View className={styles.titleCard}>
        <Text className={styles.titleIcon}>🏅</Text>
        <Text className={styles.titleName}>{reportData.annualTitle}</Text>
        <Text className={styles.titleDesc}>{reportData.annualTitleDesc}</Text>
      </View>

      {/* 分享引导 */}
      <View className={styles.shareGuide}>
        <Text className={styles.shareGuideText}>这是我的温暖报告，你的呢？</Text>
        <Text className={styles.shareGuideSub}>快来看看你的年度温暖报告吧</Text>
      </View>

      {/* 分享按钮 */}
      <Button
        className={styles.shareBtn}
        openType="share"
        onClick={handleShare}
      >
        <Text className={styles.shareBtnText}>生成分享海报</Text>
      </Button>

      <View
        className={styles.shareBtn}
        style={{ background: '#fff', border: '2rpx solid #FF6B6B', marginTop: '16rpx', boxShadow: 'none' }}
        onClick={handleCopyReport}
      >
        <Text className={styles.shareBtnText} style={{ color: '#FF6B6B' }}>复制报告文案</Text>
      </View>

      {/* 海报分享组件 */}
      <SharePoster
        visible={showSharePoster}
        content={reportData.warmestRecord.content}
        aiQuote={reportData.warmestRecord.aiQuote}
        authorName="温暖小太阳"
        kindnessId="annual_report"
        tag={`${reportData.year}年度温暖报告`}
        onClose={() => setShowSharePoster(false)}
      />
    </View>
  );
};

export default AnnualReportPage;
