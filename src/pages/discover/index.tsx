import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import KindnessCard from '@/components/KindnessCard';
import WarmPartnerCard from '@/components/WarmPartnerCard';
import { getKindnessList } from '@/data/kindness';
import { WARM_PARTNERS } from '@/data/warm-partners';
import { RECOMMENDED_CIRCLES } from '@/data/circle-mock';
import { useSocialStore } from '@/store/social';
import { useUserStore } from '@/store/user';
import { useKindnessStore } from '@/store/kindness';
import { useCircleStore } from '@/store/circle';
import { useFortuneStore } from '@/store/fortune';
import { Kindness } from '@/types/kindness';
import styles from './index.module.scss';

// 更新自定义 tabBar 选中状态
type SquareTab = 'kindness' | 'circle' | 'mine';
const CONTENT_TABS: { key: SquareTab; label: string }[] = [
  { key: 'kindness', label: '善行' },
  { key: 'circle', label: '善行圈' },
  { key: 'mine', label: '我的' },
];

// ===== 快捷功能入口配置（我的Tab中使用） =====
const MY_ENTRIES = [
  { icon: '🏥', label: '善行保险', page: '/pages/insurance/index', color: '#E74C3C' },
  { icon: '⚖️', label: '法律援助', page: '/pages/legal-aid/index', color: '#3498DB' },
  { icon: '🗺️', label: '温暖地图', page: '/pages/warmth-map/index', color: '#34A853' },
  { icon: '🏪', label: '福气商城', page: '/pages/shop/index', color: '#C4956A' },
  { icon: '📜', label: 'AI对话', page: '/pages/ai-chat/index', color: '#D4534A' },
  { icon: '📊', label: '年度报告', page: '/pages/annual-report/index', color: '#2ECC71' },
  { icon: '🎁', label: '邀请好友', page: '/pages/invite/index', color: '#E67E22' },
  { icon: '📋', label: '更多功能', page: '/pages/mine/index', color: '#95A5A6' },
];

const DiscoverPage: React.FC = () => {
  useEffect(() => {
    try {
      const page = Taro.getCurrentInstance().page;
      if (page && Taro.getTabBar) {
        const tabbar = Taro.getTabBar<{ current: number }>(page);
        if (tabbar) tabbar.current = 2;
      }
    } catch { /* H5 不支持 */ }
  }, []);

  const [activeTab, setActiveTab] = useState<SquareTab>('kindness');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [onlyFollowing, setOnlyFollowing] = useState(false);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { followingIds, isFollowing, loadFromStorage: loadSocial } = useSocialStore();
  const { userInfo, totalKindness, streakDays } = useUserStore();
  const { publishedList: userKindnessList, loadFromStorage: loadKindness } = useKindnessStore();
  const { circles, getCurrentUserCircles, loadFromStorage: loadCircle } = useCircleStore();
  const { totalFortune } = useFortuneStore();

  useEffect(() => {
    loadSocial();
    loadKindness();
    loadCircle();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      loadSocial();
      loadKindness();
      loadCircle();
      setRefreshing(false);
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 800);
  }, [loadSocial, loadKindness, loadCircle]);

  // ===== 善行Tab数据 =====
  const ALL_TAGS = ['助人', '环保', '见证', '公益', '邻里互助', '孝亲', '陪伴', '关怀', '工作', '亲子'];
  const ALL_REGIONS = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '南京市', '西安市', '重庆市'];

  const allKindness = useMemo(() => {
    const mockList = getKindnessList();
    const mockIds = new Set(mockList.map(k => k.id));
    return [...userKindnessList.filter(k => !mockIds.has(k.id)), ...mockList];
  }, [userKindnessList]);

  const filteredKindness = useMemo(() => {
    let result = [...allKindness];
    if (selectedTag) result = result.filter(i => i.tags.includes(selectedTag));
    if (selectedRegion) result = result.filter(i => i.location?.includes(selectedRegion.slice(0, 2)));
    if (onlyFollowing) result = result.filter(i => isFollowing(i.userId));
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allKindness, selectedTag, selectedRegion, onlyFollowing, isFollowing]);

  // ===== 善行圈Tab数据 =====
  const myCircles = useMemo(() => {
    const userId = userInfo?.id || 'guest';
    return getCurrentUserCircles(userId);
  }, [circles, userInfo, getCurrentUserCircles]);

  // ===== 渲染：善行Tab =====
  const renderKindnessTab = () => (
    <>
      {/* 筛选栏 */}
      <View className={styles.filterBar}>
        <ScrollView className={styles.tagFilter} scrollX enableFlex>
          <View className={styles.tagFilterInner}>
            <Text className={`${styles.filterTag} ${!selectedTag ? styles.filterTagActive : ''}`} onClick={() => setSelectedTag('')}>全部</Text>
            {ALL_TAGS.map(tag => (
              <Text key={tag} className={`${styles.filterTag} ${selectedTag === tag ? styles.filterTagActive : ''}`} onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}>{tag}</Text>
            ))}
          </View>
        </ScrollView>
        <View className={styles.filterActions}>
          <View className={styles.regionPicker} onClick={() => setRegionPickerOpen(!regionPickerOpen)}>
            <Text className={styles.regionPickerText}>{selectedRegion || '地区'}</Text>
            <Text className={styles.regionPickerArrow}>{regionPickerOpen ? '▲' : '▼'}</Text>
          </View>
          <View className={styles.followToggle}>
            <Text className={styles.followToggleText}>仅关注</Text>
            <Switch checked={onlyFollowing} onChange={(e) => setOnlyFollowing(e.detail.value)} color="#C4956A" />
          </View>
        </View>
        {regionPickerOpen && (
          <View className={styles.regionDropdown}>
            {ALL_REGIONS.map(region => (
              <Text key={region} className={`${styles.regionOption} ${selectedRegion === region ? styles.regionOptionActive : ''}`} onClick={() => { setSelectedRegion(selectedRegion === region ? '' : region); setRegionPickerOpen(false); }}>{region}</Text>
            ))}
          </View>
        )}
      </View>

      {/* 温暖伙伴 */}
      {!selectedTag && !selectedRegion && !onlyFollowing && WARM_PARTNERS.length > 0 && (
        <View className={styles.warmPartnerSection}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>🤝 温暖伙伴</Text>
          </View>
          {WARM_PARTNERS.map(p => <WarmPartnerCard key={p.brandName} data={p} />)}
        </View>
      )}

      {/* 善行列表 */}
      <View className={styles.kindnessList}>
        {filteredKindness.length > 0 ? (
          filteredKindness.map(k => (
            <KindnessCard key={k.id} kindness={k} onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${k.id}` })} />
          ))
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>🌱</Text>
            <Text className={styles.emptyText}>暂无匹配的内容{'\n'}试试调整筛选条件</Text>
          </View>
        )}
      </View>
    </>
  );

  // ===== 渲染：善行圈Tab =====
  const renderCircleTab = () => (
    <>
      {/* 我加入的圈子 */}
      {myCircles.length > 0 && (
        <View className={styles.circleSection}>
          <Text className={styles.sectionTitle}>👥 我加入的圈子</Text>
          {myCircles.map(c => (
            <View key={c.id} className={styles.circleCard} onClick={() => Taro.navigateTo({ url: `/pages/circle/index` })}>
              <View className={styles.circleIconWrap} style={{ background: '#C4956A20' }}>
                <Text className={styles.circleIcon}>👥</Text>
              </View>
              <View className={styles.circleInfo}>
                <Text className={styles.circleName}>{c.name}</Text>
                <Text className={styles.circleMeta}>{c.members.length} 人 · {c.type === 'public' ? '公共' : c.type === 'open' ? '开放' : '封闭'}</Text>
              </View>
              <Text className={styles.circleArrow}>→</Text>
            </View>
          ))}
        </View>
      )}

      {/* 推荐圈子 */}
      <View className={styles.circleSection}>
        <Text className={styles.sectionTitle}>✨ 推荐圈子</Text>
        {RECOMMENDED_CIRCLES.map(c => (
          <View key={c.id} className={styles.circleCard} onClick={() => Taro.navigateTo({ url: `/pages/circle/index` })}>
            <View className={styles.circleIconWrap} style={{ background: `${c.color}20` }}>
              <Text className={styles.circleIcon}>{c.icon}</Text>
            </View>
            <View className={styles.circleInfo}>
              <Text className={styles.circleName}>{c.name}</Text>
              <Text className={styles.circleMeta}>{c.memberCount} 人 · {c.type}</Text>
              <Text className={styles.circleDesc}>{c.description}</Text>
            </View>
            <Text className={styles.circleArrow}>→</Text>
          </View>
        ))}
      </View>

      {/* 创建圈子入口 */}
      <View className={styles.createCircleBtn} onClick={() => Taro.navigateTo({ url: '/pages/circle/index' })}>
        <Text className={styles.createCircleText}>+ 创建或加入更多圈子</Text>
      </View>
    </>
  );

  // ===== 渲染：我的Tab =====
  const renderMineTab = () => (
    <>
      {/* 用户信息卡片 */}
      <View className={styles.userCard}>
        <View className={styles.userHeader}>
          <View className={styles.userAvatar}>
            <Text className={styles.userAvatarText}>{userInfo?.nickname?.[0] || '👤'}</Text>
          </View>
          <View className={styles.userInfo}>
            <Text className={styles.userName}>{userInfo?.nickname || '访客'}</Text>
            <Text className={styles.userLevel}>连续善行 {streakDays || 0} 天</Text>
          </View>
        </View>
        <View className={styles.userStats}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{totalFortune}</Text>
            <Text className={styles.statLabel}>福气值</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{totalKindness || userKindnessList.length}</Text>
            <Text className={styles.statLabel}>善行数</Text>
          </View>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{followingIds.length}</Text>
            <Text className={styles.statLabel}>关注</Text>
          </View>
        </View>
      </View>

      {/* 功能入口 */}
      <View className={styles.myGrid}>
        {MY_ENTRIES.map(item => (
          <View key={item.label} className={styles.myItem} onClick={() => Taro.navigateTo({ url: item.page })}>
            <View className={styles.myIconWrap} style={{ background: `${item.color}15` }}>
              <Text className={styles.myIcon}>{item.icon}</Text>
            </View>
            <Text className={styles.myLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* 最近善行 */}
      {userKindnessList.length > 0 && (
        <View className={styles.recentSection}>
          <Text className={styles.sectionTitle}>📝 我的最近善行</Text>
          {userKindnessList.slice(0, 3).map(k => (
            <KindnessCard key={k.id} kindness={k} onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${k.id}` })} />
          ))}
        </View>
      )}
    </>
  );

  return (
    <View className={styles.pageWrapper}>
      {/* 搜索栏 */}
      <View className={styles.searchBar} onClick={() => Taro.navigateTo({ url: '/pages/search/index' })}>
        <Text className={styles.searchIcon}>🔍</Text>
        <Text className={styles.searchPlaceholder}>搜索善行、用户、话题...</Text>
      </View>

      {/* 内容滚动区域 */}
      <ScrollView
        className={styles.contentScroll}
        scrollY
        enableBackToTop
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
      >
        {activeTab === 'kindness' && renderKindnessTab()}
        {activeTab === 'circle' && renderCircleTab()}
        {activeTab === 'mine' && renderMineTab()}
      </ScrollView>

      {/* 底部固定分类Tab */}
      <View className={styles.bottomTabs}>
        {/* 左侧Tab：善行 */}
        <View
          className={`${styles.bottomTabItem} ${activeTab === 'kindness' ? styles.bottomTabActive : ''}`}
          onClick={() => { setActiveTab('kindness'); setSelectedTag(''); setSelectedRegion(''); setOnlyFollowing(false); }}
        >
          <Text className={styles.bottomTabText}>善行</Text>
          {activeTab === 'kindness' && <View className={styles.bottomTabLine} />}
        </View>

        {/* 左侧Tab：善行圈 */}
        <View
          className={`${styles.bottomTabItem} ${activeTab === 'circle' ? styles.bottomTabActive : ''}`}
          onClick={() => { setActiveTab('circle'); setSelectedTag(''); setSelectedRegion(''); setOnlyFollowing(false); }}
        >
          <Text className={styles.bottomTabText}>善行圈</Text>
          {activeTab === 'circle' && <View className={styles.bottomTabLine} />}
        </View>

        {/* 中间大+号：发布记录 */}
        <View
          className={styles.publishBtn}
          onClick={() => Taro.navigateTo({ url: '/pages/record/index' })}
        >
          <Text className={styles.publishBtnIcon}>+</Text>
        </View>

        {/* 右侧Tab：我的 */}
        <View
          className={`${styles.bottomTabItem} ${activeTab === 'mine' ? styles.bottomTabActive : ''}`}
          onClick={() => { setActiveTab('mine'); setSelectedTag(''); setSelectedRegion(''); setOnlyFollowing(false); }}
        >
          <Text className={styles.bottomTabText}>我的</Text>
          {activeTab === 'mine' && <View className={styles.bottomTabLine} />}
        </View>
      </View>
    </View>
  );
};

export default DiscoverPage;
