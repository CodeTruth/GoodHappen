import React, { useEffect, useMemo } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

// 本地定义（原 @/data/users 和 @/data/social 已移除）
const getCircles = () => [] as any[];
const mockUsers = [] as any[];

// 善行之星排行榜（前5名）
const MEDAL_ICONS = ['🥇', '🥈', '🥉'];

const CirclePage: React.FC = () => {
  // 更新自定义 tabBar 选中状态（H5环境中用useEffect替代useDidShow）
  useEffect(() => {
    try {
      const page = Taro.getCurrentInstance().page;
      if (page && Taro.getTabBar) {
        const tabbar = Taro.getTabBar<{ current: number }>(page);
        if (tabbar) { tabbar.current = 2; }
      }
    } catch { /* H5 环境不支持 getTabBar */ }
  }, []);

  const circles = getCircles();

  // 本周善行之星排行（按 kindnessCount 排序）
  const weeklyRanking = useMemo(() => {
    return [...mockUsers]
      .sort((a, b) => b.kindnessCount - a.kindnessCount)
      .slice(0, 5);
  }, []);

  const getCircleIcon = (type: string) => {
    const icons: Record<string, string> = {
      class: '🏫',
      company: '🏢',
      community: '🏘️'
    };
    return icons[type] || '👥';
  };

  const getCircleTypeName = (type: string) => {
    const names: Record<string, string> = {
      class: '班级',
      company: '企业',
      community: '社区'
    };
    return names[type] || '团体';
  };

  const handleCircleClick = (circleId: string) => {
    Taro.navigateTo({
      url: `/pages/circleDetail/index?id=${circleId}`
    });
  };

  return (
    <View className={styles.pageWrapper}>
    <View className={styles.container}>
      {/* 页面头部 */}
      <View className={styles.header}>
        <Text className={styles.title}>善行圈</Text>
        <Text className={styles.subtitle}>团体善行，温暖聚合</Text>
      </View>

      {/* ===== 本周善行之星排行榜 ===== */}
      <View className={styles.rankingCard}>
        <View className={styles.rankingHeader}>
          <Text className={styles.rankingTitle}>⭐ 本周善行之星</Text>
          <Text className={styles.rankingSubtitle}>善行数量排行</Text>
        </View>
        {weeklyRanking.map((user, index) => (
          <View
            key={user.id}
            className={`${styles.rankingItem} ${index < 3 ? styles.rankingItemTop : ''}`}
            onClick={() => Taro.navigateTo({
              url: `/pages/detail/index?userId=${user.id}`
            })}
          >
            <View className={styles.rankingPos}>
              {index < 3 ? (
                <Text className={styles.rankingMedal}>{MEDAL_ICONS[index]}</Text>
              ) : (
                <Text className={styles.rankingNum}>{index + 1}</Text>
              )}
            </View>
            <Image className={styles.rankingAvatar} src={user.avatar} mode="aspectFill" />
            <View className={styles.rankingInfo}>
              <View className={styles.rankingNameRow}>
                <Text className={styles.rankingName}>{user.name}</Text>
                {index === 0 && (
                  <View className={styles.rankingBadge}>
                    <Text className={styles.rankingBadgeText}>本周善行之星</Text>
                  </View>
                )}
              </View>
              <Text className={styles.rankingRegion}>{user.region}</Text>
            </View>
            <Text className={styles.rankingCount}>{user.kindnessCount} 件</Text>
          </View>
        ))}
      </View>

      {/* 善行圈列表 */}
      <View className={styles.circleList}>
        {circles.map((circle) => (
          <View key={circle.id} className={styles.circleCard} onClick={() => handleCircleClick(circle.id)}>
            <View className={styles.circleHeader}>
              <View className={styles.circleIcon}>
                <Text>{getCircleIcon(circle.type)}</Text>
              </View>
              <View className={styles.circleInfo}>
                <Text className={styles.circleName}>{circle.name}</Text>
                <Text className={styles.circleType}>{getCircleTypeName(circle.type)}</Text>
              </View>
            </View>

            {circle.description && (
              <Text className={styles.circleDesc}>{circle.description}</Text>
            )}

            <View className={styles.circleStats}>
              <View className={styles.stat}>
                <Text className={styles.statValue}>{circle.memberCount}</Text>
                <Text className={styles.statLabel}>成员</Text>
              </View>
              <View className={styles.stat}>
                <Text className={styles.statValue}>{circle.kindnessCount}</Text>
                <Text className={styles.statLabel}>善行</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
    </View>
  );
};

export default CirclePage;