import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useFortuneStore } from '@/store/fortune';
import { useShopStore } from '@/store/shop';
import styles from './index.module.scss';

// 本地定义（原 @/data/merchants、@/data/fortune-levels 已移除）
type BenefitType = 'discount' | 'gift' | 'service' | 'experience' | 'event' | 'cooperation';

interface MerchantBenefit {
  id: string;
  name: string;
  type: BenefitType;
  title: string;
  description: string;
  fortuneCost: number;
  cost: number;
  icon: string;
  requiredTitleLevel?: number;
  requiredTitleLabel?: string;
}

interface Merchant {
  id: string;
  name: string;
  logo: string;
  category: string;
  address: string;
  distance: number;
  businessHours: string;
  isAnnualExclusive?: boolean;
  benefits: MerchantBenefit[];
}

const benefitTypeLabels: Record<BenefitType, { label: string; icon: string }> = {
  discount: { label: '折扣优惠', icon: '💰' },
  gift: { label: '实物礼品', icon: '🎁' },
  service: { label: '服务体验', icon: '🔧' },
  experience: { label: '体验活动', icon: '🎉' },
  event: { label: '限时活动', icon: '🎫' },
  cooperation: { label: '社区联名', icon: '🏛️' },
};

const getMerchantsByDistance = (): Merchant[] => [];
const formatDistance = (distance: number): string => `${distance}m`;

const FORTUNE_LEVELS: { level: number; name: string; min: number }[] = [];

// 权益类型筛选
type FilterType = 'all' | BenefitType;

const MerchantListPage: React.FC = () => {
  const { availableFortune, currentTitle, loadFromStorage } = useFortuneStore();
  const { redeem, loadFromStorage: loadShop } = useShopStore();

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [selectedBenefit, setSelectedBenefit] = useState<MerchantBenefit | null>(null);

  useEffect(() => {
    loadFromStorage();
    loadShop();
  }, []);

  // 按距离排序的商家列表
  const allMerchants = useMemo(() => getMerchantsByDistance(), []);

  // 按权益类型筛选
  const filteredMerchants = useMemo(() => {
    if (activeFilter === 'all') return allMerchants;
    return allMerchants.filter(m => m.benefits.some(b => b.type === activeFilter));
  }, [allMerchants, activeFilter]);

  // 筛选标签
  const filterTabs: { key: FilterType; label: string; icon: string }[] = [
    { key: 'all', label: '全部', icon: '📍' },
    { key: 'discount', label: '到店折扣', icon: '💰' },
    { key: 'gift', label: '到店赠品', icon: '🎁' },
    { key: 'event', label: '限时活动', icon: '🎫' },
    { key: 'cooperation', label: '社区联名', icon: '🏛️' },
  ];

  // 点击商家
  const handleMerchantClick = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setSelectedBenefit(null);
  };

  // 关闭弹窗
  const handleClose = () => {
    setSelectedMerchant(null);
    setSelectedBenefit(null);
  };

  // 选择权益
  const handleSelectBenefit = (benefit: MerchantBenefit) => {
    setSelectedBenefit(benefit);
  };

  // 兑换权益（生成福气码）
  const handleRedeemBenefit = (benefit: MerchantBenefit) => {
    // 检查称号等级
    if (benefit.requiredTitleLevel && currentTitle.level < benefit.requiredTitleLevel) {
      const requiredTitle = FORTUNE_LEVELS.find(t => t.level === benefit.requiredTitleLevel);
      Taro.showToast({ title: `需${requiredTitle?.name || '更高'}称号`, icon: 'none' });
      return;
    }
    // 检查福气
    if (availableFortune < benefit.cost) {
      Taro.showToast({ title: `还差${benefit.cost - availableFortune}福气`, icon: 'none' });
      return;
    }

    Taro.showModal({
      title: '确认兑换',
      content: `将扣除 ${benefit.cost} 福气\n兑换「${benefit.name}」\n到店出示福气码即可使用`,
      confirmText: '确认兑换',
      success: (res) => {
        if (res.confirm) {
          // 复用 shop store 的兑换逻辑（生成福气码）
          const productId = `merchant_${selectedMerchant?.id}_${benefit.id}`;
          const result = redeem(productId);
          if (result.success) {
            Taro.showModal({
              title: '兑换成功',
              content: `福气码：${result.fortuneCode}\n请到店出示此码核销\n商家：${selectedMerchant?.name}`,
              confirmText: '保存福气码',
              showCancel: false,
            });
            handleClose();
          } else {
            Taro.showToast({ title: result.message, icon: 'none' });
          }
        }
      },
    });
  };

  // 判断权益是否可兑换
  const checkBenefitRedeemable = (benefit: MerchantBenefit): { canRedeem: boolean; reason?: string } => {
    if (benefit.requiredTitleLevel && currentTitle.level < benefit.requiredTitleLevel) {
      return { canRedeem: false, reason: `需${benefit.requiredTitleLabel || '更高称号'}` };
    }
    if (availableFortune < benefit.cost) {
      return { canRedeem: false, reason: `还差${benefit.cost - availableFortune}福气` };
    }
    return { canRedeem: true };
  };

  return (
    <View className={styles.container}>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>商家福气联盟</Text>
        <Text className={styles.headerSubtitle}>
          线下商家为温暖用户致敬专属权益{'\n'}
          到店出示福气码，用福气换取温暖
        </Text>
        <View className={styles.fortuneBar}>
          <Text className={styles.fortuneText}>可用福气 {availableFortune}</Text>
          <Text className={styles.fortuneDivider}>·</Text>
          <Text className={styles.fortuneText}>当前称号 {currentTitle.name}</Text>
        </View>
      </View>

      {/* 权益类型筛选 */}
      <ScrollView scrollX className={styles.tabs}>
        {filterTabs.map((tab) => (
          <Text
            key={tab.key}
            className={classnames(styles.tab, activeFilter === tab.key && styles.active)}
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.icon} {tab.label}
          </Text>
        ))}
      </ScrollView>

      {/* 商家列表 */}
      <View className={styles.merchantList}>
        {filteredMerchants.map((merchant) => {
          // 找到该商家最低门槛的权益作为展示
          const minCostBenefit = merchant.benefits.reduce((min, b) => b.cost < min.cost ? b : min, merchant.benefits[0]);
          return (
            <View
              key={merchant.id}
              className={styles.merchantCard}
              onClick={() => handleMerchantClick(merchant)}
            >
              <Image src={merchant.logo} className={styles.merchantLogo} mode="aspectFill" />
              <View className={styles.merchantBody}>
                <View className={styles.merchantHeader}>
                  <Text className={styles.merchantName}>{merchant.name}</Text>
                  {merchant.isAnnualExclusive && (
                    <View className={styles.annualTag}>
                      <Text className={styles.annualText}>年度</Text>
                    </View>
                  )}
                </View>
                <Text className={styles.merchantCategory}>{merchant.category} · {merchant.address}</Text>
                <View className={styles.merchantFooter}>
                  <View className={styles.benefitPreview}>
                    <Text className={styles.benefitIcon}>{minCostBenefit.icon}</Text>
                    <Text className={styles.benefitName}>{minCostBenefit.name}</Text>
                    <Text className={styles.benefitCost}>{minCostBenefit.cost}福气</Text>
                  </View>
                  <Text className={styles.distance}>📍 {formatDistance(merchant.distance)}</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {/* 底部说明 */}
      <View className={styles.footerNote}>
        <Text className={styles.footerText}>
          权益由商家致敬提供，福气将进入温暖基金{'\n'}
          到店出示福气码核销，扣除相应福气
        </Text>
      </View>

      {/* 商家详情弹窗 */}
      {selectedMerchant && (
        <View className={styles.detailMask} onClick={handleClose}>
          <View className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
            {/* 商家头部 */}
            <View className={styles.detailHeader}>
              <Image src={selectedMerchant.logo} className={styles.detailLogo} mode="aspectFill" />
              <View className={styles.detailInfo}>
                <Text className={styles.detailName}>{selectedMerchant.name}</Text>
                <Text className={styles.detailCategory}>{selectedMerchant.category}</Text>
                <Text className={styles.detailAddress}>📍 {selectedMerchant.address}</Text>
                <Text className={styles.detailHours}>🕐 {selectedMerchant.businessHours}</Text>
                <Text className={styles.detailDistance}>距离 {formatDistance(selectedMerchant.distance)}</Text>
              </View>
              <Text className={styles.detailClose} onClick={handleClose}>✕</Text>
            </View>

            {/* 权益列表 */}
            <View className={styles.benefitSection}>
              <Text className={styles.benefitSectionTitle}>温暖权益</Text>
              {selectedMerchant.benefits.map((benefit) => {
                const typeInfo = benefitTypeLabels[benefit.type];
                const checkResult = checkBenefitRedeemable(benefit);
                return (
                  <View
                    key={benefit.id}
                    className={classnames(
                      styles.benefitItem,
                      selectedBenefit?.id === benefit.id && styles.benefitItemActive
                    )}
                    onClick={() => handleSelectBenefit(benefit)}
                  >
                    <View className={styles.benefitItemHeader}>
                      <Text className={styles.benefitItemIcon}>{benefit.icon}</Text>
                      <View className={styles.benefitItemInfo}>
                        <Text className={styles.benefitItemName}>{benefit.name}</Text>
                        <Text className={styles.benefitItemDesc}>{benefit.description}</Text>
                      </View>
                      <View className={styles.benefitItemPrice}>
                        <Text className={styles.benefitItemCost}>{benefit.cost}</Text>
                        <Text className={styles.benefitItemUnit}>福气</Text>
                      </View>
                    </View>
                    <View className={styles.benefitItemFooter}>
                      <View className={styles.benefitTypeTag}>
                        <Text className={styles.benefitTypeText}>{typeInfo.icon} {typeInfo.label}</Text>
                      </View>
                      <Text className={styles.benefitRequire}>{benefit.requiredTitleLabel}</Text>
                      <View className={classnames(
                        styles.benefitStatus,
                        checkResult.canRedeem ? styles.statusOk : styles.statusLock
                      )}>
                        <Text className={styles.benefitStatusText}>
                          {checkResult.canRedeem ? '可兑换' : checkResult.reason}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* 兑换按钮 */}
            {selectedBenefit && (
              <View className={styles.redeemSection}>
                <View
                  className={classnames(
                    styles.redeemBtn,
                    !checkBenefitRedeemable(selectedBenefit).canRedeem && styles.redeemBtnDisabled
                  )}
                  onClick={() => {
                    if (checkBenefitRedeemable(selectedBenefit).canRedeem) {
                      handleRedeemBenefit(selectedBenefit);
                    }
                  }}
                >
                  <Text className={styles.redeemBtnText}>
                    {checkBenefitRedeemable(selectedBenefit).canRedeem
                      ? `兑换「${selectedBenefit.name}」（${selectedBenefit.cost}福气）`
                      : checkBenefitRedeemable(selectedBenefit).reason}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default MerchantListPage;
