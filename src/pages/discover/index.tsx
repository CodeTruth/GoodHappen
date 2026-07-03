import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Switch, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import KindnessCard from '@/components/KindnessCard';
import WarmPartnerCard from '@/components/WarmPartnerCard';
import { getKindnessList } from '@/data/kindness';
import { useSocialStore } from '@/store/social';
import { useUserStore } from '@/store/user';
import { useKindnessStore } from '@/store/kindness';
import { useCircleStore } from '@/store/circle';
import { useProtectionStore } from '@/store/protection';
import { getExampleWall } from '@/services/moral-dashboard';
import { getCircleTypeConfig, CircleType } from '@/config/circle-types';
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

// ===== 子组件：本周圈子榜样 =====
const CircleExampleCard = React.memo(() => {
  const { getCircleById } = useCircleStore();
  const [examples, setExamples] = useState<any[]>([]);

  useEffect(() => {
    const allExamples: any[] = [];
    const circleIds = ['circle1', 'circle2', 'circle3'];
    circleIds.forEach((cid) => {
      const exs = getExampleWall(cid)?.slice(0, 1) ?? [];
      const circle = getCircleById(cid);
      if (circle && exs.length > 0) {
        const typeConfig = getCircleTypeConfig((circle.type as CircleType) || 'public');
        allExamples.push({
          ...exs[0],
          circleName: circle.name,
          circleType: circle.type,
          exampleLabel: typeConfig?.labels?.example ?? '榜样',
        });
      }
    });
    setExamples(allExamples.slice(0, 3));
  }, []);

  if (examples.length === 0) return null;

  return (
    <View className={styles.exampleSection}>
      <View className={styles.exampleHeader}>
        <Text className={styles.exampleTitle}>⭐ 本周圈子榜样</Text>
        <Text
          className={styles.exampleMore}
          onClick={() => Taro.navigateTo({ url: '/pages/circle/index' })}
        >
          查看全部 →
        </Text>
      </View>
      <ScrollView className={styles.exampleScroll} scrollX>
        {examples.map((ex) => (
          <View
            key={ex.id}
            className={styles.exampleCard}
            onClick={() => Taro.navigateTo({ url: `/pages/student-profile/index?circleId=${ex.circleId || 'circle1'}&userId=${ex.userId}` })}
          >
            <View className={styles.exampleCardHeader}>
              <Image className={styles.exampleAvatar} src={ex.userAvatar} />
              <View className={styles.exampleInfo}>
                <Text className={styles.exampleName}>{ex.userName}</Text>
                <Text className={styles.exampleCircle}>{ex.circleName}</Text>
              </View>
              <Text className={styles.exampleBadge}>{ex.exampleLabel}</Text>
            </View>
            <Text className={styles.exampleContent} numberOfLines={2}>{ex.content}</Text>
            {ex.teacherComment && (
              <Text className={styles.exampleComment}>👩‍🏫 {ex.teacherComment}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
});

// ===== 子组件：善行保护快捷入口 =====
const ProtectionCard = React.memo(() => {
  const { insurance, loadFromStorage: loadProtection } = useProtectionStore();
  useEffect(() => { loadProtection(); }, []);
  const isProtected = insurance?.active;
  return (
    <View className={styles.protectionCard}>
      <View className={styles.protectionHeader}>
        <Text className={styles.protectionTitle}>🛡️ 善行保护</Text>
        <Text
          className={styles.protectionMore}
          onClick={() => Taro.navigateTo({ url: '/pages/insurance/index' })}
        >
          详情 →
        </Text>
      </View>
      <View className={styles.protectionItems}>
        <View
          className={`${styles.protectionItem} ${isProtected ? styles.protectionItemActive : ''}`}
          onClick={() => Taro.navigateTo({ url: '/pages/insurance/index' })}
        >
          <Text className={styles.protectionItemIcon}>🏥</Text>
          <Text className={styles.protectionItemName}>善行保险</Text>
          <Text className={styles.protectionItemStatus}>{isProtected ? '已生效' : '未达标'}</Text>
        </View>
        <View
          className={styles.protectionItem}
          onClick={() => Taro.navigateTo({ url: '/pages/legal-aid/index' })}
        >
          <Text className={styles.protectionItemIcon}>⚖️</Text>
          <Text className={styles.protectionItemName}>法律援助</Text>
          <Text className={styles.protectionItemStatus}>绿色通道</Text>
        </View>
        <View
          className={styles.protectionItem}
          onClick={() => Taro.navigateTo({ url: '/pages/witness-network/index' })}
        >
          <Text className={styles.protectionItemIcon}>📸</Text>
          <Text className={styles.protectionItemName}>网络见证</Text>
          <Text className={styles.protectionItemStatus}>独立证据链</Text>
        </View>
      </View>
    </View>
  );
});

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

  // 初始化：加载持久化数据
  useEffect(() => {
    loadSocial();
    loadKindness();
  }, []);

  // 下拉刷新
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

  // 原始善行列表 = mock数据 + 用户本地发布的新善行（用户善行优先排列）
  const allKindness = useMemo(() => {
    const mockList = getKindnessList();
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
  }, [allKindness, activeTab, selectedTag, selectedRegion, onlyFollowing, followingIds, isFollowing, userInfo, userKindnessList]);

  const handleTabChange = (tab: SquareTab) => {
    setActiveTab(tab);
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
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
      >
        {/* 顶部标题 */}
        <View className={styles.header}>
          <View className={styles.headerLeft}>
            <Text className={styles.title}>发现</Text>
            <Text className={styles.subtitle}>探索身边的温暖与善意</Text>
          </View>
        </View>

        {/* 分类Tab */}
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
            {activeTab === 'witness' && (
              <Text className={styles.witnessTabBadge}>观察即参与</Text>
            )}
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

        {/* 本周圈子榜样推荐 */}
        <CircleExampleCard />

        {/* 善行保护入口 */}
        <ProtectionCard />

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
