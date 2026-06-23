import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import { Brand, getSlotById } from '@/data/brands';
import styles from './index.module.scss';

interface BrandCardProps {
  brand: Brand;
  // 当前所在位置（用于展示致敬场景）
  slotId?: string;
  onClick?: () => void;
}

const BrandCard: React.FC<BrandCardProps> = ({ brand, slotId, onClick }) => {
  // 当前位置信息
  const slot = slotId ? getSlotById(slotId as any) : undefined;

  // 格式化金额
  const formatMoney = (amount: number): string => {
    if (amount >= 10000) {
      return `${(amount / 10000).toFixed(1)}万`;
    }
    return amount.toLocaleString('zh-CN');
  };

  return (
    <View className={styles.card} onClick={onClick}>
      {/* 品牌头部 */}
      <View className={styles.header}>
        <Image
          src={brand.logo}
          className={styles.logo}
          mode="aspectFill"
        />
        <View className={styles.brandInfo}>
          <Text className={styles.brandName}>{brand.name}</Text>
          <Text className={styles.focusArea}>{brand.focusArea}</Text>
        </View>
        {/* 致敬标识：品牌是客人不是主人 */}
        <View className={styles.tributeTag}>
          <Text className={styles.tributeText}>致敬</Text>
        </View>
      </View>

      {/* 品牌致敬文案 */}
      <Text className={styles.description}>{brand.description}</Text>

      {/* 赞助位置标签 */}
      <View className={styles.slots}>
        {brand.slots.slice(0, 3).map((slotIdItem) => {
          const s = getSlotById(slotIdItem as any);
          if (!s) return null;
          return (
            <View key={slotIdItem} className={styles.slotTag}>
              <Text className={styles.slotIcon}>{s.icon}</Text>
              <Text className={styles.slotName}>{s.name}</Text>
            </View>
          );
        })}
        {brand.slots.length > 3 && (
          <View className={styles.slotTag}>
            <Text className={styles.slotMore}>+{brand.slots.length - 3}</Text>
          </View>
        )}
      </View>

      {/* 底部信息 */}
      <View className={styles.footer}>
        <View className={styles.footerItem}>
          <Text className={styles.footerLabel}>累计致敬</Text>
          <Text className={styles.footerValue}>¥{formatMoney(brand.totalSponsorship)}</Text>
        </View>
        {slot && (
          <View className={styles.footerItem}>
            <Text className={styles.footerLabel}>当前场景</Text>
            <Text className={styles.footerValue}>{slot.name}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default BrandCard;
