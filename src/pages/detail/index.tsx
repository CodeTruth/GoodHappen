import React, { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { getKindnessById } from '@/data/kindness';
import KindnessCard from '@/components/KindnessCard';
import styles from './index.module.scss';

const DetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.params;
  const [kindness, setKindness] = useState<any>(null);

  useEffect(() => {
    if (id) {
      const data = getKindnessById(id);
      if (data) {
        setKindness(data);
      } else {
        Taro.showToast({
          title: '善行不存在',
          icon: 'none'
        });
      }
    }
  }, [id]);

  if (!kindness) {
    return (
      <View className={styles.container}>
        <View className={styles.loading}>
          <Text className={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.container}>
      <KindnessCard kindness={kindness} showComment />
    </View>
  );
};

export default DetailPage;