import React, { useState, useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/store/user';
import { useKindnessStore } from '@/store/kindness';
import { useNotificationStore } from '@/store/notification';
import WelcomeGuide from '@/components/WelcomeGuide';
import styles from './index.module.scss';

// ===== 三大行动卡片 =====
const HOME_ACTIONS = [
  {
    id: 'protection',
    icon: '🛡️',
    title: '正在行善',
    subtitle: '立刻保护',
    desc: '一键启动录像+录音+GPS全程存证',
    gradient: 'linear-gradient(135deg, #1A73E8 0%, #4A90D9 100%)',
    shadow: 'rgba(26, 115, 232, 0.4)',
    page: '/pages/protection-mode/index',
  },
  {
    id: 'witness',
    icon: '👁️',
    title: '看到温暖',
    subtitle: '我要见证',
    desc: '记录别人做的好事，让善意被看见',
    gradient: 'linear-gradient(135deg, #34A853 0%, #5BBF7A 100%)',
    shadow: 'rgba(52, 168, 83, 0.4)',
    page: '/pages/record/index?mode=witness',
  },
  {
    id: 'advisor',
    icon: '💬',
    title: '犹豫不决',
    subtitle: '问问AI',
    desc: '先问问AI有没有危险，再放心行动',
    gradient: 'linear-gradient(135deg, #E67E22 0%, #F0A050 100%)',
    shadow: 'rgba(230, 126, 34, 0.4)',
    page: '/pages/ai-advisor/index',
  },
];

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
  const { loadFromStorage: loadUser } = useUserStore();
  const { loadFromStorage: loadKindness } = useKindnessStore();
  const { loadFromStorage: loadNotification, loadMockData: loadMockNotification, cleanupExpired } = useNotificationStore();

  useEffect(() => {
    loadUser();
    loadKindness();
    loadNotification();
    loadMockNotification();
    cleanupExpired();

    const welcomeShown = Taro.getStorageSync('haoshi_welcome_shown');
    if (!welcomeShown) setShowWelcome(true);
  }, []);

  const handleAction = (action: typeof HOME_ACTIONS[0]) => {
    Taro.navigateTo({ url: action.page });
  };

  return (
    <View className={styles.page}>
      <WelcomeGuide visible={showWelcome} onClose={() => setShowWelcome(false)} />

      {/* Slogan — 极简 */}
      <View className={styles.slogan}>
        <Text className={styles.sloganEmoji}>✨</Text>
        <Text className={styles.sloganText}>让每一件善行都被看见</Text>
      </View>

      {/* 三大行动卡片 */}
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

      {/* 底部点缀 — 看一眼发现入口 */}
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