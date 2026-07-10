import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getActiveInspirations, type WeeklyInspiration } from '@/data/weekly-challenges';
import { useSocialStore } from '@/store/social';
import { useFortuneStore } from '@/store/fortune';
import styles from './index.module.scss';

const DiscoverPage: React.FC = () => {
  // Tab 页面：设置 tabBar 选中索引
  useEffect(() => {
    try {
      const page = Taro.getCurrentInstance().page;
      if (page && Taro.getTabBar) {
        const tabbar = Taro.getTabBar<{ current: number }>(page);
        if (tabbar) tabbar.current = 1;
      }
    } catch { /* H5 不支持 */ }
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const [completedChallenges, setCompletedChallenges] = useState<Set<string>>(new Set());

  const { loadFromStorage: loadSocial } = useSocialStore();
  const { totalFortune } = useFortuneStore();

  // 本周灵感数据
  const inspirations = useMemo(() => getActiveInspirations(), []);

  // 已完成挑战持久化
  useEffect(() => {
    try {
      const saved = Taro.getStorageSync('haoshi_completed_challenges');
      if (saved) setCompletedChallenges(new Set(JSON.parse(saved)));
    } catch {}
  }, []);

  const saveCompletedChallenges = useCallback((ids: Set<string>) => {
    setCompletedChallenges(ids);
    try { Taro.setStorageSync('haoshi_completed_challenges', JSON.stringify([...ids])); } catch {}
  }, []);

  // 加载 store
  useEffect(() => {
    loadSocial();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSocial();
    setRefreshing(false);
    Taro.showToast({ title: '已刷新', icon: 'success' });
  }, [loadSocial]);

  // ===== 记录这个温暖瞬间 → 跳转记录页预填 =====
  const handleRecordInspiration = (inspiration: WeeklyInspiration) => {
    const ids = new Set(completedChallenges);
    ids.add(inspiration.id);
    saveCompletedChallenges(ids);
    Taro.showToast({ title: `+${inspiration.fortune} 福气`, icon: 'success' });
    // 跳转记录页并预填内容
    const params = encodeURIComponent(JSON.stringify({
      content: inspiration.quickContent,
      tags: inspiration.quickTags,
    }));
    Taro.navigateTo({ url: `/pages/record/index?from=inspiration&preset=${params}` });
  };

  // ===== 渲染：本周温暖灵感 =====
  const renderInspirations = () => (
    <View className={styles.challengeSection}>
      <View className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>💡 本周温暖灵感</Text>
        <Text className={styles.sectionSubtitle}>不是任务，只是一些今天可以做的温暖小事</Text>
      </View>
      <View className={styles.challengeList}>
        {inspirations.map((item) => {
          const done = completedChallenges.has(item.id);
          return (
            <View
              key={item.id}
              className={`${styles.challengeCard} ${done ? styles.challengeCardDone : ''}`}
            >
              <View className={styles.challengeLeft}>
                <Text className={styles.challengeEmoji}>{item.emoji}</Text>
              </View>
              <View className={styles.challengeBody}>
                <Text className={styles.challengeTitle}>{item.title}</Text>
                <Text className={styles.challengeDesc}>{item.desc}</Text>
                <View className={styles.challengeMeta}>
                  <Text className={styles.challengeParticipants}>{item.participants}人记录过</Text>
                  <Text className={styles.challengeFortune}>+{item.fortune}福气</Text>
                </View>
              </View>
              <View
                className={`${styles.challengeBtn} ${done ? styles.challengeBtnDone : ''}`}
                onClick={() => !done && handleRecordInspiration(item)}
              >
                <Text className={styles.challengeBtnText}>
                  {done ? '✓ 已记录' : '记一笔'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );

  // ===== 渲染：身边的温暖 =====
  const renderNearbyWarmth = () => (
    <View className={styles.helpSection}>
      <View className={styles.sectionHeader}>
        <Text className={styles.sectionTitle}>🌱 身边的温暖</Text>
        <Text className={styles.sectionSubtitle}>今天可以这样做，让身边暖一点</Text>
      </View>
      <View className={styles.helpList}>
        {NEARBY_HELP_ITEMS.map((item) => (
          <View
            key={item.id}
            className={styles.helpCard}
            onClick={() => {
              Taro.navigateTo({
                url: `/pages/record/index?from=challenge&preset=${encodeURIComponent(JSON.stringify({ content: `🤝 ${item.helpAction}`, tags: ['助人', '邻里互助'] }))}`,
              });
            }}
          >
            <View className={styles.helpCardLeft}>
              <Text className={styles.helpEmoji}>{item.emoji}</Text>
            </View>
            <View className={styles.helpCardBody}>
              <Text className={styles.helpTitle}>{item.title}</Text>
              <Text className={styles.helpDesc}>{item.desc}</Text>
              <View className={styles.helpMeta}>
                <Text className={styles.helpDistance}>{item.distance}</Text>
                <Text className={styles.helpTime}>{item.time}</Text>
              </View>
            </View>
            <View className={styles.helpActionBtn}>
              <Text className={styles.helpActionText}>我能帮</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View className={styles.pageWrapper}>
      {/* 搜索栏 */}
      <View className={styles.searchBar} onClick={() => Taro.navigateTo({ url: '/pages/search/index' })}>
        <Text className={styles.searchIcon}>🔍</Text>
        <Text className={styles.searchPlaceholder}>搜索善行、用户、话题...</Text>
      </View>

      {/* 善行广场引导 */}
      <View
        className={styles.squareGuide}
        onClick={() => Taro.navigateTo({ url: '/pages/kindness-square/index' })}
      >
        <Text className={styles.squareGuideText}>
          🌟 想看看大家做了什么？去 善行广场 →
        </Text>
      </View>

      {/* 内容滚动区域 */}
      <ScrollView
        className={styles.contentScroll}
        scrollY
        enableBackToTop
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
      >
        {renderInspirations()}
        {renderNearbyWarmth()}
      </ScrollView>
    </View>
  );
};

/** mock：附近需要帮忙的数据 */
const NEARBY_HELP_ITEMS = [
  {
    id: 'nh_001',
    emoji: '📦',
    title: '帮邻居搬快递上楼',
    desc: '家住6楼没有电梯，有个大件快递搬不动',
    distance: '200m',
    time: '10分钟前',
    helpAction: '帮邻居搬了大件快递上楼，对方很感激非要请我喝水',
  },
  {
    id: 'nh_002',
    emoji: '🐱',
    title: '帮忙找走丢的猫',
    desc: '小区里一只橘猫走丢了，主人很着急',
    distance: '500m',
    time: '30分钟前',
    helpAction: '帮忙在小区里找了走丢的橘猫，发了照片到业主群',
  },
  {
    id: 'nh_003',
    emoji: '🎓',
    title: '辅导小学数学题',
    desc: '邻居家的孩子三年级数学不会，家长不在家',
    distance: '100m',
    time: '1小时前',
    helpAction: '帮邻居家的孩子讲解了三年级数学题，他终于听懂了',
  },
  {
    id: 'nh_004',
    emoji: '🛒',
    title: '帮老人拎菜回家',
    desc: '菜市场遇到阿姨买了很多菜，拎不动',
    distance: '800m',
    time: '2小时前',
    helpAction: '在菜市场帮阿姨拎了一大袋菜送回家，她一直说谢谢',
  },
];

export default DiscoverPage;
