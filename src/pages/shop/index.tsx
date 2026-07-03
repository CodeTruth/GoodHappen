import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useFortuneStore } from '@/store/fortune';
import { useShopStore } from '@/store/shop';
import { SHOP_PRODUCTS } from '@/data/shop-products';
import { FORTUNE_LEVELS } from '@/data/fortune-levels';
import styles from './index.module.scss';

// 本地定义（原 @/data/products 已移除，现从数据文件加载）
type ProductCategory = 'daily' | 'food' | 'culture' | 'experience' | 'charity' | 'virtual' | 'brand' | 'milestone' | 'annual';

interface Product {
  id: string;
  name: string;
  brandName?: string;
  description: string;
  category: ProductCategory;
  image: string;
  icon?: string;
  price: number;
  stock: number;
  cost?: number;
  limitPerUser?: number;
  requiredTitleLevel?: number;
  milestone?: string;
  requireStorySelected?: boolean;
}

const categoryLabels: Record<ProductCategory, string> = {
  daily: '日常好物',
  food: '美食饮品',
  culture: '文创周边',
  experience: '体验服务',
  charity: '公益捐赠',
  virtual: '虚拟权益',
  brand: '品牌权益',
  milestone: '里程碑',
  annual: '温暖年鉴',
};

const categoryDescriptions: Record<ProductCategory, string> = {
  daily: '实用的日常生活用品',
  food: '美味的食品和饮品',
  culture: '富有文化创意的周边产品',
  experience: '独特的体验和服务',
  charity: '用于公益捐赠的虚拟商品',
  virtual: '虚拟权益',
  brand: '品牌权益',
  milestone: '里程碑',
  annual: '温暖年鉴',
};

const getProducts = (): Product[] => SHOP_PRODUCTS as Product[];

const ShopPage: React.FC = () => {
  const { availableFortune, currentTitle, streak, loadFromStorage } = useFortuneStore();
  const { redeem, getRedemptions, getProductRedeemedCount, loadFromStorage: loadShop } = useShopStore();

  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [redemptionRecords, setRedemptionRecords] = useState(() => getRedemptions());

  useEffect(() => {
    loadFromStorage();
    loadShop();
    setRedemptionRecords(getRedemptions());
  }, []);

  // 所有商品
  const allProducts = useMemo(() => getProducts(), []);

  // 分类筛选
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'all') return allProducts;
    return allProducts.filter(p => p.category === activeCategory);
  }, [allProducts, activeCategory]);

  // 分类标签
  const categoryTabs: { key: ProductCategory | 'all'; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'virtual', label: '虚拟权益' },
    { key: 'brand', label: '品牌权益' },
    { key: 'milestone', label: '里程碑' },
    { key: 'annual', label: '温暖年鉴' },
  ];

  // 点击商品打开详情
  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
  };

  // 关闭详情弹窗
  const handleCloseDetail = () => {
    setSelectedProduct(null);
  };

  // 兑换商品
  const handleRedeem = (product: Product) => {
    const result = redeem(product.id);
    if (result.success) {
      Taro.showModal({
        title: '兑换成功',
        content: `福气码：${result.fortuneCode}\n请到店出示此码核销`,
        showCancel: false,
        confirmText: '我知道了',
      });
      setRedemptionRecords(getRedemptions());
      setSelectedProduct(null);
    } else {
      Taro.showToast({ title: result.message, icon: 'none' });
    }
  };

  // 判断商品是否可兑换
  const checkRedeemable = (product: Product): { canRedeem: boolean; reason?: string } => {
    // 称号等级不足
    if (product.requiredTitleLevel && currentTitle.level < product.requiredTitleLevel) {
      const requiredTitle = FORTUNE_LEVELS.find(t => t.level === product.requiredTitleLevel);
      return { canRedeem: false, reason: `需${requiredTitle?.name || '更高'}称号` };
    }
    // 里程碑天数不足
    if (product.milestone && typeof product.milestone === 'object' && 'days' in product.milestone && streak.highestStreak < (product.milestone as any).days) {
      return { canRedeem: false, reason: `需累计${(product.milestone as any).days}天` };
    }
    // 温暖故事入选
    if (product.requireStorySelected) {
      return { canRedeem: false, reason: '需温暖故事入选' };
    }
    // 限领次数
    if (product.limitPerUser && product.limitPerUser > 0) {
      const count = getProductRedeemedCount(product.id);
      if (count >= product.limitPerUser) {
        return { canRedeem: false, reason: '已达限领次数' };
      }
    }
    // 福气不足
    if (availableFortune < product.price) {
      return { canRedeem: false, reason: `还差${product.price - availableFortune}福气` };
    }
    return { canRedeem: true };
  };

  return (
    <View className={styles.container}>
      {/* 头部：福气余额 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>温暖商城</Text>
        <Text className={styles.headerSubtitle}>
          用福气兑换温暖好物{'\n'}花费可用福气，不影响你的称号
        </Text>
        <View className={styles.fortuneCard}>
          <View className={styles.fortuneItem}>
            <Text className={styles.fortuneValue}>{availableFortune}</Text>
            <Text className={styles.fortuneLabel}>可用福气</Text>
          </View>
          <View className={styles.fortuneDivider} />
          <View className={styles.fortuneItem}>
            <Text className={styles.fortuneValue}>{currentTitle.name}</Text>
            <Text className={styles.fortuneLabel}>当前称号</Text>
          </View>
          <View className={styles.fortuneDivider} />
          <View className={styles.fortuneItem}>
            <Text className={styles.fortuneValue}>{streak.highestStreak}</Text>
            <Text className={styles.fortuneLabel}>最长连续</Text>
          </View>
        </View>
      </View>

      {/* 分类切换 */}
      <ScrollView scrollX className={styles.tabs}>
        {categoryTabs.map((tab) => (
          <Text
            key={tab.key}
            className={classnames(styles.tab, activeCategory === tab.key && styles.active)}
            onClick={() => setActiveCategory(tab.key)}
          >
            {tab.label}
          </Text>
        ))}
      </ScrollView>

      {/* 商品列表 */}
      <View className={styles.productList}>
        {filteredProducts.map((product) => {
          const checkResult = checkRedeemable(product);
          const redeemedCount = getProductRedeemedCount(product.id);
          return (
            <View
              key={product.id}
              className={styles.productCard}
              onClick={() => handleProductClick(product)}
            >
              <Image src={product.image} className={styles.productImage} mode="aspectFill" />
              <View className={styles.productBody}>
                <View className={styles.productHeader}>
                  <Text className={styles.productIcon}>{product.icon}</Text>
                  <Text className={styles.productName}>{product.name}</Text>
                </View>
                <Text className={styles.productDesc}>{product.description}</Text>
                <View className={styles.productFooter}>
                  <View className={styles.priceTag}>
                    <Text className={styles.priceValue}>{product.price}</Text>
                    <Text className={styles.priceUnit}>福气</Text>
                  </View>
                  <View className={classnames(
                    styles.statusTag,
                    checkResult.canRedeem ? styles.statusOk : styles.statusLock
                  )}>
                    <Text className={styles.statusText}>
                      {checkResult.canRedeem ? '可兑换' : checkResult.reason}
                    </Text>
                  </View>
                </View>
                {product.limitPerUser && product.limitPerUser > 0 && (
                  <Text className={styles.limitText}>
                    限领{product.limitPerUser}次 · 已兑{redeemedCount}次
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* 兑换记录入口 */}
      {redemptionRecords.length > 0 && (
        <View className={styles.recordsSection}>
          <Text className={styles.recordsTitle}>我的兑换码</Text>
          {redemptionRecords.slice(-3).reverse().map((record) => (
            <View key={record.id} className={styles.recordItem}>
              <View className={styles.recordInfo}>
                <Text className={styles.recordName}>{record.productName}</Text>
                <Text className={styles.recordDate}>
                  {new Date(record.createdAt).toLocaleDateString('zh-CN')}
                </Text>
              </View>
              <View className={classnames(
                styles.codeBox,
                record.status === 'used' && styles.codeUsed
              )}>
                <Text className={styles.codeText}>{record.fortuneCode}</Text>
                <Text className={styles.codeStatus}>
                  {record.status === 'used' ? '已使用' : '待使用'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 底部说明 */}
      <View className={styles.footerNote}>
        <Text className={styles.footerText}>
          所有兑换花费可用福气，不影响累计福气与称号{'\n'}
          品牌权益由品牌方致敬提供，非促销行为
        </Text>
      </View>

      {/* 商品详情弹窗 */}
      {selectedProduct && (
        <View className={styles.detailMask} onClick={handleCloseDetail}>
          <View className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedProduct.image}
              className={styles.detailImage}
              mode="aspectFill"
            />
            <View className={styles.detailContent}>
              <View className={styles.detailHeader}>
                <Text className={styles.detailName}>{selectedProduct.name}</Text>
                <Text className={styles.detailClose} onClick={handleCloseDetail}>✕</Text>
              </View>
              <Text className={styles.detailDesc}>{selectedProduct.description}</Text>

              {/* 权益信息 */}
              <View className={styles.detailInfo}>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>分类</Text>
                  <Text className={styles.infoValue}>{categoryLabels[selectedProduct.category]}</Text>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>所需福气</Text>
                  <Text className={styles.infoValue}>{selectedProduct.price} 福气</Text>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>资格要求</Text>
                  <Text className={styles.infoValue}>{categoryDescriptions[selectedProduct.category]}</Text>
                </View>
                {selectedProduct.limitPerUser && selectedProduct.limitPerUser > 0 && (
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>限领次数</Text>
                    <Text className={styles.infoValue}>{selectedProduct.limitPerUser} 次</Text>
                  </View>
                )}
                {selectedProduct.brandName && (
                  <View className={styles.infoRow}>
                    <Text className={styles.infoLabel}>品牌致敬</Text>
                    <Text className={styles.infoValue}>{selectedProduct.brandName}</Text>
                  </View>
                )}
              </View>

              {/* 兑换按钮 */}
              {(() => {
                const checkResult = checkRedeemable(selectedProduct);
                return (
                  <View
                    className={classnames(
                      styles.redeemBtn,
                      !checkResult.canRedeem && styles.redeemBtnDisabled
                    )}
                    onClick={() => checkResult.canRedeem && handleRedeem(selectedProduct)}
                  >
                    <Text className={styles.redeemBtnText}>
                      {checkResult.canRedeem
                        ? `兑换（${selectedProduct.price}福气）`
                        : checkResult.reason}
                    </Text>
                  </View>
                );
              })()}
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default ShopPage;
