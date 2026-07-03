import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useFortuneStore } from '@/store/fortune';
import { useKindnessStore } from '@/store/kindness';
import { useUserStore, checkIsMinor } from '@/store/user';

import AnimatedNumber from '@/components/AnimatedNumber';
import styles from './index.module.scss';

// 本地定义（原 @/data/users、@/data/fortune-levels 已移除）
const getCurrentUser = () => ({
  name: '访客',
  avatar: '',
  region: '',
  bio: '',
  badges: [] as string[],
});
const getLevelProgress = (_totalFortune: number) => ({
  current: { level: 0, name: '新手', min: 0, icon: '⭐', description: '初入善行之路' },
  next: { level: 1, name: '初学者', min: 100, icon: '⭐' },
  progress: 0,
  remaining: 100,
});

const MinePage: React.FC = () => {
  // 更新自定义 tabBar 选中状态（H5环境中用useEffect替代useDidShow）
  useEffect(() => {
    try {
      const page = Taro.getCurrentInstance().page;
      if (page && Taro.getTabBar) {
        const tabbar = Taro.getTabBar<{ current: number }>(page);
        if (tabbar) { tabbar.current = 3; }
      }
    } catch { /* H5 环境不支持 getTabBar */ }
  }, []);

  // 兼容旧代码：未登录时使用 mock 数据展示
  const mockUser = getCurrentUser();
  const {
    totalFortune,
    availableFortune,
    highestTitle,
    currentTitle,
    streak,
    transactions,
    loadFromStorage,
    resetIfNeeded,
  } = useFortuneStore();

  // 善行数据
  const { publishedList, loadFromStorage: loadKindnessFromStorage } = useKindnessStore();

  // 善行影响力统计
  const impactStats = useMemo(() => {
    const totalKindness = publishedList.length;
    // 估算：每次善行平均帮助 2 人
    const peopleHelped = totalKindness * 2;
    // 估算：每次善行减少约 0.5kg 碳排放
    const carbonReduction = Math.round(totalKindness * 0.5 * 10) / 10;
    return { totalKindness, peopleHelped, carbonReduction };
  }, [publishedList]);

  // 用户体系（Phase 5）
  const { isLoggedIn, userInfo, logout, loadFromStorage: loadUserFromStorage } = useUserStore();

  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadFromStorage();
    resetIfNeeded();
    loadUserFromStorage();
    loadKindnessFromStorage();
  }, []);

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
        navigateTimerRef.current = null;
      }
    };
  }, []);

  // 展示用户信息：已登录用 store 数据，未登录用 mock 数据
  const displayName = isLoggedIn && userInfo ? userInfo.name : mockUser.name;
  const displayAvatar = isLoggedIn && userInfo ? userInfo.avatar : mockUser.avatar;
  const displayBio = isLoggedIn && userInfo ? (userInfo.bio || '点击编辑个人简介') : mockUser.bio;
  const displayBadges = isLoggedIn && userInfo ? userInfo.badges : mockUser.badges;
  const isMinor = checkIsMinor(userInfo?.birthYear);

  // 跳转登录页
  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  // 退出登录
  const handleLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout();
          useFortuneStore.setState({
            totalFortune: 0,
            highestFortune: 0,
            availableFortune: 0,
            frozenFortune: 0,
            transactions: [],
            dailyStats: { date: new Date().toISOString().split('T')[0], count: 0, fortune: 0 },
            streak: { currentStreak: 0, lastRecordDate: '', highestStreak: 0 },
          });
          Taro.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  };

  // 需要登录才能访问的菜单项
  const requireAuthAction = (url: string) => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      navigateTimerRef.current = setTimeout(() => {
        Taro.navigateTo({ url: '/pages/login/index' });
      }, 1000);
      return;
    }
    Taro.navigateTo({ url });
  };

  const menuItems = [
    { icon: '🔔', text: '消息通知', action: () => Taro.navigateTo({ url: '/pages/notifications/index' }) },
    { icon: '🤝', text: '公益履历', action: () => requireAuthAction('/pages/charity-record/index') },
    { icon: '📢', text: '发布公益需求', action: () => requireAuthAction('/pages/charity-publish/index') },
    { icon: '💰', text: '福气流水', action: () => Taro.showToast({ title: `共${transactions.length}条记录`, icon: 'none' }) },
    { icon: '👥', text: '我的善行圈', action: () => Taro.navigateTo({ url: '/pages/circle/index' }) },
    { icon: '👤', text: '编辑资料', action: () => requireAuthAction('/pages/profile-edit/index') },
    { icon: '🔒', text: '隐私设置', action: () => requireAuthAction('/pages/privacy-settings/index') },
    { icon: '🛡️', text: '账号安全', action: () => requireAuthAction('/pages/account-security/index') },
  ];

  const protectionItems = [
    { icon: '⚖️', text: '法律援助', action: () => Taro.navigateTo({ url: '/pages/legal-aid/index' }) },
    { icon: '📸', text: '善行见证', action: () => Taro.navigateTo({ url: '/pages/witness-network/index' }) },
    { icon: '🏥', text: '善行保险', action: () => Taro.navigateTo({ url: '/pages/insurance/index' }) },
    { icon: '📋', text: '理赔流程', action: () => Taro.navigateTo({ url: '/pages/claim-flow/index' }) },
  ];

  const statsItems = [
    { icon: '📊', text: '温暖统计', action: () => Taro.navigateTo({ url: '/pages/warmth-stats/index' }) },
    { icon: '📈', text: '我的统计', action: () => Taro.navigateTo({ url: '/pages/my-stats/index' }) },
    { icon: '🗺️', text: '温暖地图', action: () => Taro.navigateTo({ url: '/pages/warmth-map/index' }) },
    { icon: '📖', text: '温暖故事', action: () => Taro.navigateTo({ url: '/pages/warmth-stories/index' }) },
  ];

  const otherItems = [
    { icon: '✅', text: '每日签到', action: () => Taro.navigateTo({ url: '/pages/checkin/index' }) },
    { icon: '🏆', text: '善行挑战', action: () => Taro.navigateTo({ url: '/pages/challenges/index' }) },
    { icon: '🎁', text: '温暖商城', action: () => Taro.navigateTo({ url: '/pages/shop/index' }) },
    { icon: '💝', text: '温暖基金', action: () => Taro.navigateTo({ url: '/pages/warmth-fund/index' }) },
    { icon: '🏪', text: '合作商户', action: () => Taro.navigateTo({ url: '/pages/merchant-list/index' }) },
    { icon: '👫', text: '公益基金', action: () => Taro.navigateTo({ url: '/pages/charity-fund/index' }) },
    { icon: '🙋', text: '受助者', action: () => Taro.navigateTo({ url: '/pages/recipients/index' }) },
    { icon: '📝', text: '公益任务', action: () => Taro.navigateTo({ url: '/pages/charity-tasks/index' }) },
    { icon: '🎟️', text: '邀请好友', action: () => Taro.navigateTo({ url: '/pages/invite/index' }) },
    { icon: '📅', text: '年度报告', action: () => Taro.navigateTo({ url: '/pages/annual-report/index' }) },
  ];

  // 福气等级进度
  const levelProgress = getLevelProgress(totalFortune);

  return (
    <View className={styles.pageWrapper}>
    <View className={styles.container}>
      {/* 头部用户信息 */}
      <View className={styles.header}>
        <View className={styles.userInfo}>
          <Image
            src={displayAvatar}
            className={styles.avatar}
            mode="aspectFill"
          />
          <View className={styles.info}>
            <View className={styles.nameRow}>
              <Text className={styles.name}>{displayName}</Text>
              {isMinor && isLoggedIn && (
                <Text className={styles.minorBadge}>未成年</Text>
              )}
            </View>
            <Text className={styles.bio}>{displayBio}</Text>
          </View>
          {/* 登录/退出按钮 */}
          {!isLoggedIn ? (
            <View className={styles.loginBtn} onClick={handleLogin}>
              <Text className={styles.loginBtnText}>登录</Text>
            </View>
          ) : (
            <View className={styles.logoutBtn} onClick={handleLogout}>
              <Text className={styles.logoutBtnText}>退出</Text>
            </View>
          )}
        </View>

        {/* 称号展示 */}
        <View className={styles.titleSection}>
          <View className={styles.currentTitle}>
            <Text className={styles.titleName}>{currentTitle.name}</Text>
            <Text className={styles.titleDesc}>{currentTitle.description}</Text>
          </View>
          {highestTitle.level > currentTitle.level && (
            <View className={styles.highestTitleBadge}>
              <Text className={styles.highestTitleText}>
                历史最高：{highestTitle.name}
              </Text>
            </View>
          )}
        </View>

        {/* 双轨制福气统计 */}
        <View className={styles.stats}>
          <View className={styles.stat}>
            <Text className={styles.statValue}>{totalFortune}</Text>
            <Text className={styles.statLabel}>累计福气</Text>
          </View>
          <View className={styles.stat}>
            <Text className={styles.statValue}>{availableFortune}</Text>
            <Text className={styles.statLabel}>可用福气</Text>
          </View>
          <View className={styles.stat}>
            <Text className={styles.statValue}>{streak.currentStreak}</Text>
            <Text className={styles.statLabel}>连续天数</Text>
          </View>
        </View>

        {/* 福气等级 */}
        {levelProgress && (
          <View className={styles.levelSection}>
            <View className={styles.levelHeader}>
              <View className={styles.levelBadgeLarge}>
                <Text className={styles.levelIconLarge}>{levelProgress.current.icon}</Text>
              </View>
              <View className={styles.levelInfo}>
                <Text className={styles.levelNameLarge}>{levelProgress.current.name}</Text>
                <Text className={styles.levelDesc}>{levelProgress.current.description}</Text>
              </View>
            </View>
            <View className={styles.progressSection}>
              <View className={styles.levelBadge}>
                <Text className={styles.levelIcon}>{levelProgress.current.icon}</Text>
                <Text className={styles.levelName}>{levelProgress.current.name}</Text>
              </View>
              <View className={styles.progressTrack}>
                <View
                  className={styles.progressFill}
                  style={{ width: `${levelProgress.progress}%` }}
                />
              </View>
              <View className={styles.levelNext}>
                <Text className={styles.levelNextIcon}>{levelProgress.next?.icon || '👑'}</Text>
                <Text className={styles.levelNextName}>{levelProgress.next?.name || '已满级'}</Text>
              </View>
            </View>
            <Text className={styles.progressText}>
              距下一等级还需 {levelProgress.remaining} 福气值
            </Text>
          </View>
        )}
      </View>

      {/* 善行影响力 */}
      <View className={styles.impactSection}>
        <Text className={styles.impactTitle}>善行影响力</Text>
        <View className={styles.impactGrid}>
          <View className={styles.impactItem}>
            <AnimatedNumber value={impactStats.totalKindness} suffix=" 次" className={styles.impactValue} />
            <Text className={styles.impactLabel}>总善行</Text>
          </View>
          <View className={styles.impactItem}>
            <AnimatedNumber value={impactStats.peopleHelped} suffix=" 人" className={styles.impactValue} />
            <Text className={styles.impactLabel}>帮助了</Text>
          </View>
          <View className={styles.impactItem}>
            <AnimatedNumber value={impactStats.carbonReduction} suffix=" kg" className={styles.impactValue} formatter={(v) => v.toFixed(1)} />
            <Text className={styles.impactLabel}>减少碳排放</Text>
          </View>
          <View className={styles.impactItem}>
            <AnimatedNumber value={totalFortune} suffix="" className={styles.impactValue} />
            <Text className={styles.impactLabel}>累计福气</Text>
          </View>
        </View>
      </View>

      {/* 连续记录信息 */}
      <View className={styles.streakCard}>
        <Text className={styles.streakIcon}>🔥</Text>
        <View className={styles.streakInfo}>
          <Text className={styles.streakNumber}>{streak.currentStreak}</Text>
          <Text className={styles.streakLabel}>天连续善行</Text>
        </View>
        <View className={styles.streakBest}>
          <Text className={styles.streakBestText}>历史最长: {streak.highestStreak}天</Text>
        </View>
      </View>

      {/* 徽章 */}
      <View className={styles.badges}>
        <Text className={styles.sectionTitle}>我的徽章</Text>
        <View className={styles.badgeList}>
          {displayBadges.map((badge, index) => (
            <View key={index} className={styles.badge}>
              <Text className={styles.badgeText}>🏆 {badge}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 善行保障 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>🛡️ 善行保障</Text>
        <View className={styles.gridMenu}>
          {protectionItems.map((item, index) => (
            <View key={index} className={styles.gridItem} onClick={item.action}>
              <Text className={styles.gridIcon}>{item.icon}</Text>
              <Text className={styles.gridText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 温暖数据 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>📊 温暖数据</Text>
        <View className={styles.gridMenu}>
          {statsItems.map((item, index) => (
            <View key={index} className={styles.gridItem} onClick={item.action}>
              <Text className={styles.gridIcon}>{item.icon}</Text>
              <Text className={styles.gridText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 更多功能 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>🎯 更多功能</Text>
        <View className={styles.gridMenu}>
          {otherItems.map((item, index) => (
            <View key={index} className={styles.gridItem} onClick={item.action}>
              <Text className={styles.gridIcon}>{item.icon}</Text>
              <Text className={styles.gridText}>{item.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 菜单 */}
      <View className={styles.menu}>
        {menuItems.map((item, index) => (
          <View key={index} className={styles.menuItem} onClick={item.action}>
            <Text className={styles.menuIcon}>{item.icon}</Text>
            <Text className={styles.menuText}>{item.text}</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        ))}
      </View>

      {/* 版本信息 */}
      <View className={styles.version}>
        <Text>好事发生 v1.0.0</Text>
      </View>
    </View>
    </View>
  );
};

export default MinePage;