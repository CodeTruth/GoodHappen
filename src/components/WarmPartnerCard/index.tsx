import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { WarmPartnerCard } from '@/data/social';
import styles from './index.module.scss';

interface WarmPartnerCardProps {
  data: WarmPartnerCard;
}

// 温暖伙伴卡片（品牌信息唯一可出现在广场的形式）
// 独立标识"🎁 温暖伙伴"，和善行内容卡片不混排
const WarmPartnerCardComponent: React.FC<WarmPartnerCardProps> = ({ data }) => {
  const handleClick = () => {
    if (data.link) {
      Taro.navigateTo({ url: data.link });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      {/* 独立标识 */}
      <View className={styles.badge}>
        <Text className={styles.badgeText}>🎁 温暖伙伴</Text>
      </View>

      {/* 品牌信息 */}
      <View className={styles.brandHeader}>
        <Image
          src={data.brandLogo}
          className={styles.brandLogo}
          mode="aspectFill"
        />
        <View className={styles.brandInfo}>
          <Text className={styles.brandName}>{data.brandName}</Text>
          <Text className={styles.brandTag}>品牌合作</Text>
        </View>
      </View>

      {/* 内容 */}
      <View className={styles.content}>
        <Text className={styles.title}>{data.title}</Text>
        <Text className={styles.textContent}>{data.content}</Text>
      </View>

      {/* 操作 */}
      <View className={styles.footer}>
        <Text className={styles.actionText}>了解更多 →</Text>
      </View>
    </View>
  );
};

export default WarmPartnerCardComponent;
