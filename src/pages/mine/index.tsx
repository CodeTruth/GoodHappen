import React, { useEffect } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getCurrentUser } from '@/data/users';
import { useFortuneStore } from '@/store/fortune';
import { useUserStore, checkIsMinor } from '@/store/user';
import { TITLES } from '@/utils/fortune';
import styles from './index.module.scss';

const MinePage: React.FC = () => {
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

  // 用户体系（Phase 5）
  const { isLoggedIn, userInfo, logout, loadFromStorage: loadUserFromStorage } = useUserStore();

  useEffect(() => {
    loadFromStorage();
    resetIfNeeded();
    loadUserFromStorage();
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
          Taro.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  };

  // 需要登录才能访问的菜单项
  const requireAuthAction = (url: string) => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      setTimeout(() => {
        Taro.navigateTo({ url: '/pages/login/index' });
      }, 1000);
      return;
    }
    Taro.navigateTo({ url });
  };

  const menuItems = [
    { icon: '🔔', text: '消息通知', action: () => Taro.navigateTo({ url: '/pages/notifications/index' }) },
    { icon: '📜', text: '善行履历', action: () => Taro.showToast({ title: '功能开发中', icon: 'none' }) },
    { icon: '🤝', text: '公益履历', action: () => requireAuthAction('/pages/charity-record/index') },
    { icon: '📢', text: '发布公益需求', action: () => requireAuthAction('/pages/charity-publish/index') },
    { icon: '💰', text: '福气流水', action: () => Taro.showToast({ title: `共${transactions.length}条记录`, icon: 'none' }) },
    { icon: '👥', text: '我的善行圈', action: () => Taro.switchTab({ url: '/pages/circle/index' }) },
    { icon: '👤', text: '编辑资料', action: () => requireAuthAction('/pages/profile-edit/index') },
    { icon: '🔒', text: '隐私设置', action: () => requireAuthAction('/pages/privacy-settings/index') },
    { icon: '🛡️', text: '账号安全', action: () => requireAuthAction('/pages/account-security/index') },
    { icon: '❓', text: '帮助与反馈', action: () => Taro.showToast({ title: '功能开发中', icon: 'none' }) },
  ];

  const nextTitle = TITLES.find(t => t.minFortune > totalFortune);
  const progress = nextTitle
    ? ((totalFortune - currentTitle.minFortune) / (nextTitle.minFortune - currentTitle.minFortune)) * 100
    : 100;

  return (
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

        {/* 称号进度条 */}
        {nextTitle && (
          <View className={styles.progressSection}>
            <View className={styles.progressBar}>
              <View
                className={styles.progressFill}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </View>
            <Text className={styles.progressText}>
              距离「{nextTitle.name}」还差 {nextTitle.minFortune - totalFortune} 福气
            </Text>
          </View>
        )}
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
  );
};

export default MinePage;