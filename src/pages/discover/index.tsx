import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import KindnessCard from '@/components/KindnessCard';
import WarmPartnerCard from '@/components/WarmPartnerCard';
import { getKindnessList } from '@/data/kindness';
import { useSocialStore } from '@/store/social';
import { useUserStore } from '@/store/user';
import { useKindnessStore } from '@/store/kindness';
import { WARM_PARTNERS } from '@/data/warm-partners';
import { Kindness } from '@/types/kindness';
import styles from './index.module.scss';

// 更新自定义 tabBar 选中状态（discover 在 tabBar 中的索引为 2）
const useUpdateTabBar = () => {
  useEffect(() => {
    try {
      const page = Taro.getCurrentInstance().page;
      if (page && Taro.getTabBar) {
        const tabbar = Taro.getTabBar<{ current: number }>(page);
        if (tabbar) tabbar.current = 2;
      }
    } catch { /* H5 不支持 */ }
  }, []);
};

// 温暖伙伴数据
const getWeeklyWarmPartners = () => WARM_PARTNERS;

// 广场Tab类型
type SquareTab = 'all' | 'self' | 'witness' | 'following' | 'recommend';

// 所有可用标签
const ALL_TAGS = ['助人', '环保', '见证', '公益', '邻里互助', '孝亲', '陪伴', '关怀', '工作', '亲子'];
// 所有可用地区（省级）
const ALL_REGIONS = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '南京市', '西安市', '重庆市'];

// ===== 快捷功能入口配置 =====
const QUICK_ENTRIES = [
  { icon: '🛡️', label: '善行保护', page: '/pages/protection-mode/index', color: '#1A73E8' },
  { icon: '💬', label: 'AI顾问', page: '/pages/ai-advisor/index', color: '#E67E22' },
  { icon: '🗺️', label: '温暖地图', page: '/pages/warmth-map/index', color: '#34A853' },
  { icon: '🏪', label: '福气商城', page: '/pages/shop/index', color: '#C4956A' },
  { icon: '👥', label: '善行圈', page: '/pages/circle/index', color: '#9B59B6' },
  { icon: '🏥', label: '善行保险', page: '/pages/insurance/index', color: '#E74C3C' },
  { icon: '⚖️', label: '法律援助', page: '/pages/legal-aid/index', color: '#3498DB' },
  { icon: '📊', label: '温暖统计', page: '/pages/warmth-stats/index', color: '#2ECC71' },
];

// Tab 配置
type TabConfig = { key: SquareTab; label: string; badge?: string };
const TABS: TabConfig[] = [
  { key: 'all', label: '全部' },
  { key: 'self', label: '善行' },
  { key: 'witness', label: '见证' },
  { key: 'following', label: '关注' },
  { key: 'recommend', label: '推荐' },
];

const DiscoverPage: React.FC = () => {
  useUpdateTabBar();

  const [activeTab, setActiveTab] = useState<SquareTab>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [onlyFollowing, setOnlyFollowing] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { followingIds, isFollowing, loadFromStorage: loadSocial } = useSocialStore();
  const { userInfo } = useUserStore();
  const { publishedList: userKindnessList, loadFromStorage: loadKindness } = useKindnessStore();

  useEffect(() => {
    loadSocial();
    loadKindness();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    const timer = setTimeout(() => {
      loadSocial();
      loadKindness();
      setRefreshing(false);
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 800);
    return () => clearTimeout(timer);
  }, [loadSocial, loadKindness]);

  const allKindness = useMemo(() => {
    const mockList = getKindnessList();
    const mockIds = new Set(mockList.map(k => k.id));
    const uniqueUserList = userKindnessList.filter(k => !mockIds.has(k.id));
    return [...uniqueUserList, ...mockList];
  }, [userKindnessList]);

  const warmPartners = useMemo(() => getWeeklyWarmPartners(), []);

  const sortByTimeDesc = (list: Kindness[]): Kindness[] => {
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  const filteredKindness = useMemo(() => {
    let result = [...allKindness];

    if (activeTab === 'self') {
      result = result.filter((item) => item.type === 'self');
    } else if (activeTab === 'witness') {
      result = result.filter((item) => item.type === 'witness');
    } else if (activeTab === 'following') {
      result = result.filter(
        (item) =>
          followingIds.includes(item.userId) &&
          (item.visibleScope === 'public' || item.visibleScope === 'followers')
      );
    } else if (activeTab === 'recommend') {
      const userRegion = userInfo?.region || '北京市';
      const userTags = userKindnessList.flatMap(k => k.tags);
      const tagCountMap = new Map<string, number>();
      userTags.forEach(tag => {
        tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
      });
      const preferredTags = [...tagCountMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0]);

      const scored = result.map((item) => {
        let score = 0;
        if (userKindnessList.length === 0 && item.type === 'witness') {
          score += 5;
        }
        const matchedTags = preferredTags.filter(tag => item.tags.includes(tag)).length;
        score += matchedTags * 3;
        const sameRegion = item.location?.includes(userRegion.slice(0, 2));
        if (sameRegion) score += 2;
        return { item, score };
      });

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime();
      });

      result = scored.map(s => s.item);
    }

    if (selectedTag) {
      result = result.filter((item) => item.tags.includes(selectedTag));
    }

    if (selectedRegion) {
      result = result.filter((item) =>
        item.location?.includes(selectedRegion.slice(0, 2))
      );
    }

    if (onlyFollowing) {
      result = result.filter((item) => isFollowing(item.userId));
    }

    return sortByTimeDesc(result);
  }, [allKindness, activeTab, selectedTag, selectedRegion, onlyFollowing, followingIds, isFollowing, userInfo, userKindnessList]);

  const handleTabChange = (tab: SquareTab) => {
    setActiveTab(tab);
    setSelectedTag('');
    setSelectedRegion('');
    setOnlyFollowing(false);
  };

  const handleCardClick = (kindnessId: string) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${kindnessId}` });
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTag(selectedTag === tag ? '' : tag);
  };

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(selectedRegion === region ? '' : region);
    setRegionPickerOpen(false);
  };

  const showFilterBar = activeTab === 'all' || activeTab === 'recommend';
  const showWarmPartners =
    (activeTab === 'all' || activeTab === 'recommend') &&
    !selectedTag && !selectedRegion && !onlyFollowing;

  return (
    <View className={styles.pageWrapper}>
      {/* ===== 顶部区域：搜索 + 功能入口（不随内容滚动） ===== */}
      <View className={styles.topArea}>
        {/* 搜索栏 */}
        <View
          className={styles.searchBar}
          onClick={() => Taro.navigateTo({ url: '/pages/search/index' })}
        >
          <Text className={styles.searchIcon}>🔍</Text>
          <Text className={styles.searchPlaceholder}>搜索善行、用户、话题...</Text>
        </View>

        {/* 快捷功能入口网格 */}
        <View className={styles.quickGrid}>
          {QUICK_ENTRIES.map((item) => (
            <View
              key={item.label}
              className={styles.quickItem}
              onClick={() => Taro.navigateTo({ url: item.page })}
            >
              <View
                className={styles.quickIconWrap}
                style={{ background: `${item.color}15`, borderColor: `${item.color}30` }}
              >
                <Text className={styles.quickIcon}>{item.icon}</Text>
              </View>
              <Text className={styles.quickLabel}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ===== 分类Tab（Sticky固定在内容区顶部） ===== */}
      <View className={styles.tabSticky}>
        <ScrollView className={styles.tabsScroll} scrollX enableFlex>
          <View className={styles.tabsInner}>
            {TABS.map((tab) => (
              <View
                key={tab.key}
                className={`${styles.tabItem} ${activeTab === tab.key ? styles.tabActive : ''}`}
                onClick={() => handleTabChange(tab.key)}
              >
                <Text className={styles.tabText}>{tab.label}</Text>
                {tab.badge && activeTab === tab.key && (
                  <Text className={styles.tabBadge}>{tab.badge}</Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* ===== 内容滚动区域 ===== */}
      <ScrollView
        className={styles.contentScroll}
        scrollY
        enableBackToTop
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
      >
        {/* 筛选栏 */}
        {showFilterBar && (
          <View className={styles.filterBar}>
            <ScrollView className={styles.tagFilter} scrollX enableFlex>
              <View className={styles.tagFilterInner}>
                <Text
                  className={`${styles.filterTag} ${!selectedTag ? styles.filterTagActive : ''}`}
                  onClick={() => setSelectedTag('')}
                >
                  全部
                </Text>
                {ALL_TAGS.map((tag) => (
                  <Text
                    key={tag}
                    className={`${styles.filterTag} ${selectedTag === tag ? styles.filterTagActive : ''}`}
                    onClick={() => handleTagSelect(tag)}
                  >
                    {tag}
                  </Text>
                ))}
              </View>
            </ScrollView>

            <View className={styles.filterActions}>
              <View
                className={styles.regionPicker}
                onClick={() => setRegionPickerOpen(!regionPickerOpen)}
              >
                <Text className={styles.regionPickerText}>
                  {selectedRegion || '地区'}
                </Text>
                <Text className={styles.regionPickerArrow}>
                  {regionPickerOpen ? '▲' : '▼'}
                </Text>
              </View>
              <View className={styles.followToggle}>
                <Text className={styles.followToggleText}>仅关注</Text>
                <Switch
                  checked={onlyFollowing}
                  onChange={(e) => setOnlyFollowing(e.detail.value)}
                  color="#C4956A"
                />
              </View>
            </View>

            {regionPickerOpen && (
              <View className={styles.regionDropdown}>
                {ALL_REGIONS.map((region) => (
                  <Text
                    key={region}
                    className={`${styles.regionOption} ${selectedRegion === region ? styles.regionOptionActive : ''}`}
                    onClick={() => handleRegionSelect(region)}
                  >
                    {region}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* 温暖伙伴 */}
        {showWarmPartners && warmPartners.length > 0 && (
          <View className={styles.warmPartnerSection}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>🤝 温暖伙伴</Text>
            </View>
            {warmPartners.map((partner) => (
              <WarmPartnerCard key={partner.brandName} data={partner} />
            ))}
          </View>
        )}

        {/* 善行列表 */}
        <View className={styles.kindnessList}>
          {filteredKindness.length > 0 ? (
            filteredKindness.map((kindness) => (
              <KindnessCard
                key={kindness.id}
                kindness={kindness}
                onClick={() => handleCardClick(kindness.id)}
              />
            ))
          ) : (
            <View className={styles.empty}>
              <Text className={styles.emptyIcon}>🌱</Text>
              <Text className={styles.emptyText}>
                {activeTab === 'following'
                  ? '还没有关注的人发布善行\n去关注更多温暖的人吧'
                  : '暂无匹配的内容\n试试调整筛选条件'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default DiscoverPage;
