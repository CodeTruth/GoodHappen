import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getCircles } from '@/data/users';
import styles from './index.module.scss';

const CirclePage: React.FC = () => {
  const circles = getCircles();

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

  const handleCreateCircle = () => {
    Taro.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  };

  const handleCircleClick = (circleId: string) => {
    Taro.navigateTo({
      url: `/pages/circleDetail/index?id=${circleId}`
    });
  };

  return (
    <View className={styles.container}>
      {/* 页面头部 */}
      <View className={styles.header}>
        <Text className={styles.title}>善行圈</Text>
        <Text className={styles.subtitle}>团体善行，温暖聚合</Text>
      </View>

      {/* 创建按钮 */}
      <View className={styles.createBtn} onClick={handleCreateCircle}>
        <Text className={styles.createIcon}>➕</Text>
        <Text className={styles.createText}>创建善行圈</Text>
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
  );
};

export default CirclePage;