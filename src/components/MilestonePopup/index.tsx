import React, { useEffect, useRef } from 'react';
import { View, Text } from '@tarojs/components';
import { useMilestoneStore } from '@/store/milestone';
import styles from './index.module.scss';

// 里程碑弹窗组件
// - 3秒自动消失 + 手动关闭
// - 庆祝动画（缩放 + 粒子）
// - 不排名，只标记"你达成了"
const MilestonePopup: React.FC = () => {
  const { pending, dismiss } = useMilestoneStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pending) return;
    // 3秒自动消失
    timerRef.current = setTimeout(() => {
      dismiss();
    }, 3000);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [pending, dismiss]);

  if (!pending) return null;

  return (
    <View className={styles.mask} onClick={dismiss}>
      {/* 粒子效果（6个粒子向外飞散） */}
      <View className={styles.particles}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <View key={i} className={styles.particle} style={{ animationDelay: `${i * 0.05}s` }} />
        ))}
      </View>

      <View className={styles.popup} catchMove>
        <View className={styles.iconWrap}>
          <Text className={styles.icon}>{pending.icon}</Text>
        </View>
        <Text className={styles.title}>{pending.title}</Text>
        <Text className={styles.desc}>{pending.desc}</Text>
        <View className={styles.badge}>
          <Text className={styles.badgeText}>你达成了</Text>
        </View>
        <View className={styles.closeHint}>
          <Text className={styles.closeText}>点击任意处关闭</Text>
        </View>
      </View>
    </View>
  );
};

export default MilestonePopup;
