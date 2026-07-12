import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/store/user';
import styles from './index.module.scss';

// 本地定义（原 @/data/users、@/data/fortune-levels 已移除）
const getCurrentUser = () => ({
  name: '访客',
  avatar: '',
  region: '',
  bio: '',
  badges: [] as string[],
});

const MinePage: React.FC = () => {
  useEffect(() => {
    try {
      const page = Taro.getCurrentInstance().page;
      if (page && Taro.getTabBar) {
        const tabbar = Taro.getTabBar<{ current: number }>(page);
        if (tabbar) { tabbar.current = 2; }
      }
    } catch { /* H5 环境不支持 getTabBar */ }
  }, []);

  const mockUser = getCurrentUser();
  const { isLoggedIn, userInfo, logout, loadFromStorage: loadUserFromStorage } = useUserStore();

  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const displayName = isLoggedIn && userInfo ? userInfo.name : mockUser.name;
  const displayAvatar = isLoggedIn && userInfo ? userInfo.avatar : mockUser.avatar;
  const displayBio = isLoggedIn && userInfo ? (userInfo.bio || '点击编辑个人简介') : mockUser.bio;

  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' });
  };

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

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
        navigateTimerRef.current = null;
      }
    };
  }, []);

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
              </View>
              <Text className={styles.bio}>{displayBio}</Text>
            </View>
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

        </View>

        {/* 核心功能入口 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>🛡️ 核心功能</Text>
          <View className={styles.gridMenu}>
            <View className={styles.gridItem} onClick={() => Taro.navigateTo({ url: '/pages/evidence-history/index' })}>
              <Text className={styles.gridIcon}>📂</Text>
              <Text className={styles.gridText}>证据历史</Text>
            </View>
            <View className={styles.gridItem} onClick={() => Taro.navigateTo({ url: '/pages/ai-advisor/index' })}>
              <Text className={styles.gridIcon}>🤖</Text>
              <Text className={styles.gridText}>善行顾问</Text>
            </View>
            <View className={styles.gridItem} onClick={() => Taro.navigateTo({ url: '/pages/kindness-guard/index' })}>
              <Text className={styles.gridIcon}>⚖️</Text>
              <Text className={styles.gridText}>善行守护</Text>
            </View>
            <View className={styles.gridItem} onClick={() => Taro.navigateTo({ url: '/pages/protection-mode/index' })}>
              <Text className={styles.gridIcon}>🛡️</Text>
              <Text className={styles.gridText}>善行保护</Text>
            </View>
          </View>
        </View>

        {/* 设置菜单 */}
        <View className={styles.menu}>
          <View className={styles.menuItem} onClick={() => requireAuthAction('/pages/profile-edit/index')}>
            <Text className={styles.menuIcon}>👤</Text>
            <Text className={styles.menuText}>编辑资料</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.menuItem} onClick={() => requireAuthAction('/pages/privacy-settings/index')}>
            <Text className={styles.menuIcon}>🔒</Text>
            <Text className={styles.menuText}>隐私设置</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
          <View className={styles.menuItem} onClick={() => requireAuthAction('/pages/account-security/index')}>
            <Text className={styles.menuIcon}>🛡️</Text>
            <Text className={styles.menuText}>账号安全</Text>
            <Text className={styles.menuArrow}>›</Text>
          </View>
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
