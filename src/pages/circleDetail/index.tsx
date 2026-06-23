import React, { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useCircleStore, ROLE_NAMES, ACCESS_TYPE_NAMES } from '@/store/circle';
import { useCheckinStore, CATEGORY_INFO } from '@/store/checkin';
import { useUserStore } from '@/store/user';
import styles from './index.module.scss';

const CircleDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.params;
  const [circle, setCircle] = useState<any>(null);

  const {
    getCircleById,
    hasPermission,
    loadFromStorage: loadCircleFromStorage,
  } = useCircleStore();
  const { getCircleCheckins, loadFromStorage: loadCheckinFromStorage } = useCheckinStore();
  const { userInfo, loadFromStorage: loadUserFromStorage } = useUserStore();

  useEffect(() => {
    loadCircleFromStorage();
    loadCheckinFromStorage();
    loadUserFromStorage();
    if (id) {
      const data = getCircleById(id);
      if (data) {
        setCircle(data);
      } else {
        Taro.showToast({
          title: '善行圈不存在',
          icon: 'none'
        });
      }
    }
  }, [id]);

  if (!circle) {
    return (
      <View className={styles.container}>
        <View className={styles.loading}>
          <Text className={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  // 权限检查
  const canViewSummary = userInfo && id
    ? hasPermission(id, userInfo.id, 'view_circle_summary')
    : false;
  const currentRole = userInfo && id
    ? useCircleStore.getState().getMemberRole(id, userInfo.id)
    : null;

  // 获取团体打卡记录
  const circleCheckins = id ? getCircleCheckins(id) : [];

  // 跳转到打卡页面
  const handleGoCheckin = () => {
    Taro.navigateTo({
      url: `/pages/checkin/index?circleId=${id}`
    });
  };

  // 跳转到管理员仪表盘
  const handleGoAdmin = () => {
    Taro.navigateTo({
      url: `/pages/circle-admin/index?id=${id}`
    });
  };

  // 格式化时间
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    if (hours < 48) return '昨天';
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <View className={styles.container}>
      {/* 善行圈信息 */}
      <View className={styles.header}>
        <Text className={styles.circleName}>{circle.name}</Text>
        {circle.description && (
          <Text className={styles.circleDesc}>{circle.description}</Text>
        )}
        {/* 团体类型标签 */}
        <View className={styles.circleTags}>
          <View className={styles.circleTag}>
            <Text className={styles.circleTagText}>{ACCESS_TYPE_NAMES[circle.accessType]}</Text>
          </View>
          {currentRole && (
            <View className={styles.circleTag}>
              <Text className={styles.circleTagText}>{ROLE_NAMES[currentRole]}</Text>
            </View>
          )}
        </View>
        <View className={styles.circleStats}>
          <View className={styles.stat}>
            <Text className={styles.statValue}>{circle.members.length}</Text>
            <Text className={styles.statLabel}>成员</Text>
          </View>
          <View className={styles.stat}>
            <Text className={styles.statValue}>{circleCheckins.length}</Text>
            <Text className={styles.statLabel}>善行</Text>
          </View>
        </View>
      </View>

      {/* 快捷操作 */}
      <View className={styles.actionBar}>
        <View className={styles.actionBtn} onClick={handleGoCheckin}>
          <Text className={styles.actionIcon}>📝</Text>
          <Text className={styles.actionText}>善行打卡</Text>
        </View>
        {canViewSummary && (
          <View className={styles.actionBtn} onClick={handleGoAdmin}>
            <Text className={styles.actionIcon}>📊</Text>
            <Text className={styles.actionText}>团体管理</Text>
          </View>
        )}
      </View>

      {/* 团体动态流 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>团体动态</Text>
        {circleCheckins.length === 0 ? (
          <View className={styles.empty}>
            <Text className={styles.emptyText}>还没有动态，快来发布第一条吧～</Text>
          </View>
        ) : (
          circleCheckins.slice(0, 20).map(checkin => (
            <View key={checkin.id} className={styles.feedItem}>
              <View className={styles.feedHeader}>
                <Text className={styles.feedUser}>{checkin.userName}</Text>
                <Text className={styles.feedCategory}>
                  {CATEGORY_INFO[checkin.category].icon} {checkin.subcategory}
                </Text>
              </View>
              <Text className={styles.feedContent}>{checkin.content}</Text>
              {checkin.streakDays > 1 && (
                <Text className={styles.feedStreak}>🔥 连续{checkin.streakDays}天</Text>
              )}
              <Text className={styles.feedTime}>{formatTime(checkin.createdAt)}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

export default CircleDetailPage;
