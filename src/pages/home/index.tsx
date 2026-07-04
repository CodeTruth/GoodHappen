import React, { useState, useEffect, useRef } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/store/user';
import { useKindnessStore } from '@/store/kindness';
import { useNotificationStore } from '@/store/notification';
import { useAnalyticsStore } from '@/store/analytics';
import WelcomeGuide from '@/components/WelcomeGuide';
import styles from './index.module.scss';

const HOME_ACTIONS = [
  {
    id: 'protection',
    icon: '🛡️',
    title: '善行保护',
    subtitle: '立刻保护',
    desc: '一键启动录像+录音+GPS全程存证',
    gradient: 'linear-gradient(135deg, #1A73E8 0%, #4A90D9 100%)',
    shadow: 'rgba(26, 115, 232, 0.4)',
    page: '/pages/protection-mode/index',
  },
  {
    id: 'witness',
    icon: '👁️',
    title: '善行见证',
    subtitle: '我要见证',
    desc: '记录别人的善行，让善意被看见',
    gradient: 'linear-gradient(135deg, #34A853 0%, #5BBF7A 100%)',
    shadow: 'rgba(52, 168, 83, 0.4)',
    page: '/pages/witness-record/index',
  },
  {
    id: 'advisor',
    icon: '💬',
    title: '善行顾问',
    subtitle: '先保护自己',
    desc: '先让AI评估有没有危险，再放心行动',
    gradient: 'linear-gradient(135deg, #E67E22 0%, #F0A050 100%)',
    shadow: 'rgba(230, 126, 34, 0.4)',
    page: '/pages/ai-advisor/index',
  },
];

const STATS_CONFIG = [
  { key: 'total', icon: '📊', label: '平台累计善行', suffix: '次', growthInterval: 3000 },
  { key: 'today', icon: '👥', label: '今日善行', suffix: '人', growthInterval: 8000, max: 12000 },
  { key: 'protected', icon: '🛡️', label: '已保护善行', suffix: '人', growthInterval: 12000 },
  { key: 'witnessed', icon: '❤️', label: '被见证认可', suffix: '次', growthInterval: 2000 },
];

const formatNumber = (num: number): string => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  return num.toLocaleString('zh-CN');
};

const HomePage: React.FC = () => {
  useEffect(() => {
    try {
      const page = Taro.getCurrentInstance().page;
      if (page && Taro.getTabBar) {
        const tabbar = Taro.getTabBar<{ current: number }>(page);
        if (tabbar) tabbar.current = 0;
      }
    } catch { /* H5 不支持 */ }
  }, []);

  const [showWelcome, setShowWelcome] = useState(false);
  const [realtimeCount, setRealtimeCount] = useState(0);
  const [displayedStats, setDisplayedStats] = useState({
    total: 0,
    today: 0,
    protected: 0,
    witnessed: 0,
  });

  const { loadFromStorage: loadUser } = useUserStore();
  const { loadFromStorage: loadKindness } = useKindnessStore();
  const { loadFromStorage: loadNotification, loadMockData: loadMockNotification, cleanupExpired } = useNotificationStore();
  const {
    loadFromStorage: loadAnalytics,
    getTotalKindnessCount,
    getTodayActiveUsers,
    getProtectedUsersCount,
    getWitnessedCount,
    getRealtimeActiveCount,
  } = useAnalyticsStore();

  useEffect(() => {
    loadUser();
    loadKindness();
    loadNotification();
    loadMockNotification();
    cleanupExpired();
    loadAnalytics();

    const welcomeShown = Taro.getStorageSync('haoshi_welcome_shown');
    if (!welcomeShown) setShowWelcome(true);

    setRealtimeCount(getRealtimeActiveCount());

    const initialStats = {
      total: getTotalKindnessCount() || 128643,
      today: getTodayActiveUsers() || 3842,
      protected: getProtectedUsersCount() || 2156,
      witnessed: getWitnessedCount() || 45238,
    };
    setDisplayedStats(initialStats);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setRealtimeCount(getRealtimeActiveCount());
    }, 10000);
    return () => clearInterval(timer);
  }, [getRealtimeActiveCount]);

  useEffect(() => {
    STATS_CONFIG.forEach(config => {
      const scheduleGrowth = () => {
        const interval = config.growthInterval + Math.random() * 3000;
        setTimeout(() => {
          setDisplayedStats(prev => {
            const current = prev[config.key] || 0;
            const increment = Math.floor(Math.random() * 3) + 1;
            const newValue = config.max ? Math.min(current + increment, config.max) : current + increment;
            return { ...prev, [config.key]: newValue };
          });
          scheduleGrowth();
        }, interval);
      };
      scheduleGrowth();
    });
  }, []);

  const handleAction = (action: typeof HOME_ACTIONS[0]) => {
    Taro.navigateTo({ url: action.page });
  };

  return (
    <View className={styles.page}>
      <WelcomeGuide visible={showWelcome} onClose={() => setShowWelcome(false)} />

      <View className={styles.statsSection}>
        <View className={styles.statsGrid}>
          {STATS_CONFIG.map((stat, index) => (
            <View key={stat.key} className={styles.statCard} style={{ animationDelay: `${index * 0.1}s` }}>
              <View className={styles.statIcon}>{stat.icon}</View>
              <View className={styles.statContent}>
                <Text className={styles.statNumber}>{formatNumber(displayedStats[stat.key as keyof typeof displayedStats])}</Text>
                <Text className={styles.statLabel}>{stat.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View className={styles.realtimeBar}>
          <Text className={styles.realtimeIcon}>✨</Text>
          <Text className={styles.realtimeText}>当前有 </Text>
          <Text className={styles.realtimeNumber}>{realtimeCount}</Text>
          <Text className={styles.realtimeText}> 人行善中...</Text>
        </View>
      </View>

      <View className={styles.actions}>
        {HOME_ACTIONS.map((action) => (
          <View
            key={action.id}
            className={styles.actionCard}
            style={{ background: action.gradient, boxShadow: `0 12rpx 40rpx ${action.shadow}` }}
            onClick={() => handleAction(action)}
          >
            <View className={styles.actionCardTop}>
              <Text className={styles.actionCardIcon}>{action.icon}</Text>
              <View className={styles.actionCardText}>
                <Text className={styles.actionCardTitle}>{action.title}</Text>
                <Text className={styles.actionCardSubtitle}>{action.subtitle}</Text>
              </View>
              <Text className={styles.actionCardArrow}>→</Text>
            </View>
            <Text className={styles.actionCardDesc}>{action.desc}</Text>
          </View>
        ))}
      </View>

      <View className={styles.footer}>
        <Text className={styles.footerText}>
          看看别人做了什么好事
          <Text className={styles.footerLink} onClick={() => Taro.switchTab({ url: '/pages/discover/index' })}>
            去发现
          </Text>
        </Text>
      </View>
    </View>
  );
};

export default HomePage;
