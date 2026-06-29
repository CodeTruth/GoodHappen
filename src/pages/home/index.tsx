import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import KindnessCard from '@/components/KindnessCard';
import WarmPartnerCard from '@/components/WarmPartnerCard';
import { getKindnessList } from '@/data/kindness';
import { getTodaySuggestion } from '@/data/daily-kindness';
import { getWeeklyWarmPartners } from '@/data/social';
import { useSocialStore } from '@/store/social';
import { useUserStore } from '@/store/user';
import { useInteractionStore } from '@/store/interaction';
import { useKindnessStore } from '@/store/kindness';
import CustomTabBar from '@/components/CustomTabBar';
import { useNotificationStore } from '@/store/notification';
import { Kindness } from '@/types/kindness';
import styles from './index.module.scss';

// 广场Tab类型
type SquareTab = 'all' | 'self' | 'witness' | 'following' | 'recommend';

// 所有可用标签
const ALL_TAGS = ['助人', '环保', '见证', '公益', '邻里互助', '孝亲', '陪伴', '关怀', '工作', '亲子'];
// 所有可用地区（省级）
const ALL_REGIONS = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '南京市', '西安市', '重庆市'];

const HomePage: React.FC = () => {
  // 更新自定义 tabBar 选中状态（H5环境中用useEffect替代useDidShow）
  useEffect(() => {
    try {
      const page = Taro.getCurrentInstance().page;
      if (page && Taro.getTabBar) {
        const tabbar = Taro.getTabBar<{ current: number }>(page);
        if (tabbar) {
          tabbar.current = 0;
        }
      }
    } catch { /* H5 环境不支持 getTabBar */ }
  }, []);

  const [activeTab, setActiveTab] = useState<SquareTab>('all');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [onlyFollowing, setOnlyFollowing] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);

  const { followingIds, isFollowing, loadFromStorage: loadSocial } = useSocialStore();
  const { userInfo, loadFromStorage: loadUser } = useUserStore();
  const { loadFromStorage: loadInteraction } = useInteractionStore();
  const { loadFromStorage: loadNotification, loadMockData: loadMockNotification, cleanupExpired } = useNotificationStore();
  const { publishedList: userKindnessList, loadFromStorage: loadKindness } = useKindnessStore();

  // 初始化：加载持久化数据
  useEffect(() => {
    loadUser();
    loadSocial();
    loadInteraction();
    loadKindness();
    loadNotification();
    loadMockNotification();
    cleanupExpired();
  }, []);

  // 原始善行列表 = mock数据 + 用户本地发布的新善行（用户善行优先排列）
  const allKindness = useMemo(() => {
    const mockList = getKindnessList();
    // 去重合并：如果用户善行ID已在mock中，用用户版本覆盖
    const mockIds = new Set(mockList.map(k => k.id));
    const uniqueUserList = userKindnessList.filter(k => !mockIds.has(k.id));
    return [...uniqueUserList, ...mockList];
  }, [userKindnessList]);

  // 温暖伙伴卡片（每周不超过2条，独立展示）
  const warmPartners = useMemo(() => getWeeklyWarmPartners(), []);

  // 按发布时间倒序排序
  const sortByTimeDesc = (list: Kindness[]): Kindness[] => {
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  // 筛选后的善行列表
  const filteredKindness = useMemo(() => {
    let result = [...allKindness];

    // 1. 按Tab筛选
    if (activeTab === 'self') {
      result = result.filter((item) => item.type === 'self');
    } else if (activeTab === 'witness') {
      result = result.filter((item) => item.type === 'witness');
    } else if (activeTab === 'following') {
      // 关注流：仅展示关注者的公开善行
      result = result.filter(
        (item) =>
          followingIds.includes(item.userId) &&
          (item.visibleScope === 'public' || item.visibleScope === 'followers')
      );
    } else if (activeTab === 'recommend') {
      // 为你推荐：基于用户类型偏好和地区（轻量推荐，不优化停留时间）
      const userRegion = userInfo?.region || '北京市';
      // 模拟用户偏好：偏好"self"类型
      const preferredType: 'self' | 'witness' = 'self';
      result = result.filter((item) => {
        // 同地区优先，或同类型偏好
        const sameRegion = item.location?.includes(userRegion.slice(0, 2));
        const sameType = item.type === preferredType;
        return sameRegion || sameType;
      });
    }

    // 2. 按标签筛选
    if (selectedTag) {
      result = result.filter((item) => item.tags.includes(selectedTag));
    }

    // 3. 按地区筛选
    if (selectedRegion) {
      result = result.filter((item) =>
        item.location?.includes(selectedRegion.slice(0, 2))
      );
    }

    // 4. 只看已关注用户
    if (onlyFollowing) {
      result = result.filter((item) => isFollowing(item.userId));
    }

    // 5. 默认按发布时间倒序
    return sortByTimeDesc(result);
  }, [allKindness, activeTab, selectedTag, selectedRegion, onlyFollowing, followingIds, isFollowing, userInfo]);

  const handleTabChange = (tab: SquareTab) => {
    setActiveTab(tab);
    // 切换Tab时重置筛选
    setSelectedTag('');
    setSelectedRegion('');
    setOnlyFollowing(false);
  };

  const handleCardClick = (kindnessId: string) => {
    Taro.navigateTo({
      url: `/pages/detail/index?id=${kindnessId}`
    });
  };

  const handleTagSelect = (tag: string) => {
    setSelectedTag(selectedTag === tag ? '' : tag);
  };

  const handleRegionSelect = (region: string) => {
    setSelectedRegion(selectedRegion === region ? '' : region);
    setRegionPickerOpen(false);
  };

  // 每日善行建议卡片（独立组件，避免重渲染）
  const DailyKindnessCard = React.memo(() => {
    const today = getTodaySuggestion();
    return (
      <View
        className={styles.dailyCard}
        onClick={() => Taro.navigateTo({ url: '/pages/record/index' })}
      >
        <View className={styles.dailyHeader}>
          <Text className={styles.dailyLabel}>📅 今日善行</Text>
          <Text className={styles.dailyDate}>{today.date}</Text>
        </View>
        <Text className={styles.dailySuggestion}>{today.suggestion}</Text>
        <View className={styles.dailyFooter}>
          <Text className={styles.dailyQuote}>"{today.quote}"</Text>
          <Text className={styles.dailyPersona}>—— {today.persona}</Text>
        </View>
      </View>
    );
  });

  // 是否显示筛选栏（"为你推荐"和"全部"显示）
  const showFilterBar = activeTab === 'all' || activeTab === 'recommend';

  // 是否显示温暖伙伴区域（仅在"全部"和"为你推荐"Tab显示，且无筛选条件时）
  const showWarmPartners =
    (activeTab === 'all' || activeTab === 'recommend') &&
    !selectedTag &&
    !selectedRegion &&
    !onlyFollowing;

  return (
    <View className={styles.pageWrapper}>
    <ScrollView
      className={styles.container}
      scrollY
      enableBackToTop
    >
      {/* 页面头部 */}
      <View className={styles.header}>
        <View className={styles.headerLeft}>
          <Text className={styles.title}>好事发生</Text>
          <Text className={styles.subtitle}>记录温暖，传递善意</Text>
        </View>
        <View
          className={styles.headerAction}
          onClick={() => Taro.navigateTo({ url: '/pages/search/index' })}
        >
          <Text className={styles.searchIcon}>🔍</Text>
        </View>
      </View>

      {/* 标签切换 */}
      <ScrollView className={styles.tabs} scrollX enableFlex>
        <View className={styles.tabsInner}>
          <Text
            className={`${styles.tab} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => handleTabChange('all')}
          >
            全部
          </Text>
          <Text
            className={`${styles.tab} ${activeTab === 'self' ? styles.active : ''}`}
            onClick={() => handleTabChange('self')}
          >
            善行记录
          </Text>
          <Text
            className={`${styles.tab} ${activeTab === 'witness' ? styles.active : ''}`}
            onClick={() => handleTabChange('witness')}
          >
            我见证的温暖
          </Text>
          <Text
            className={`${styles.tab} ${activeTab === 'following' ? styles.active : ''}`}
            onClick={() => handleTabChange('following')}
          >
            关注
          </Text>
          <Text
            className={`${styles.tab} ${activeTab === 'recommend' ? styles.active : ''}`}
            onClick={() => handleTabChange('recommend')}
          >
            为你推荐
          </Text>
        </View>
      </ScrollView>

      {/* 筛选栏 */}
      {showFilterBar && (
        <View className={styles.filterBar}>
          {/* 标签筛选（横向滚动） */}
          <ScrollView className={styles.tagFilter} scrollX enableFlex>
            <View className={styles.tagFilterInner}>
              <Text
                className={`${styles.filterTag} ${!selectedTag ? styles.filterTagActive : ''}`}
                onClick={() => setSelectedTag('')}
              >
                全部标签
              </Text>
              {ALL_TAGS.map((tag) => (
                <Text
                  key={tag}
                  className={`${styles.filterTag} ${selectedTag === tag ? styles.filterTagActive : ''}`}
                  onClick={() => handleTagSelect(tag)}
                >
                  #{tag}
                </Text>
              ))}
            </View>
          </ScrollView>

          {/* 地区筛选 + 只看关注 */}
          <View className={styles.filterActions}>
            <View
              className={styles.regionPicker}
              onClick={() => setRegionPickerOpen(!regionPickerOpen)}
            >
              <Text className={styles.regionPickerText}>
                {selectedRegion || '选择地区'}
              </Text>
              <Text className={styles.regionPickerArrow}>
                {regionPickerOpen ? '▲' : '▼'}
              </Text>
            </View>
            <View className={styles.followToggle}>
              <Text className={styles.followToggleText}>只看已关注</Text>
              <Switch
                checked={onlyFollowing}
                onChange={(e) => setOnlyFollowing(e.detail.value)}
                color="#FF6B6B"
              />
            </View>
          </View>

          {/* 地区选择下拉 */}
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

      {/* 温暖伙伴区域（独立展示，不与善行卡片混排） */}
      {showWarmPartners && warmPartners.length > 0 && (
        <View className={styles.warmPartnerSection}>
          {warmPartners.map((partner) => (
            <WarmPartnerCard key={partner.id} data={partner} />
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
    <CustomTabBar currentPath="pages/home/index" />
    </View>
  );
};

export default HomePage;
