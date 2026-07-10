import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import KindnessCard from '@/components/KindnessCard';
import { getKindnessList } from '@/data/kindness';
import { useKindnessStore } from '@/store/kindness';
import { useSocialStore } from '@/store/social';
import styles from './index.module.scss';

const KindnessSquarePage: React.FC = () => {
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [onlyFollowing, setOnlyFollowing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { followingIds, isFollowing, loadFromStorage: loadSocial } = useSocialStore();
  const { publishedList: userKindnessList, loadFromStorage: loadKindness } = useKindnessStore();

  useEffect(() => {
    loadSocial();
    loadKindness();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSocial();
    loadKindness();
    setRefreshing(false);
    Taro.showToast({ title: '已刷新', icon: 'success' });
  }, [loadSocial, loadKindness]);

  const ALL_TAGS = ['助人', '环保', '见证', '公益', '邻里互助', '孝亲', '陪伴', '关怀', '工作', '亲子'];

  const allKindness = useMemo(() => {
    const mockList = getKindnessList();
    const mockIds = new Set(mockList.map(k => k.id));
    return [...userKindnessList.filter(k => !mockIds.has(k.id)), ...mockList];
  }, [userKindnessList]);

  const filteredKindness = useMemo(() => {
    let result = [...allKindness];
    if (selectedTag) result = result.filter(i => i.tags.includes(selectedTag));
    if (onlyFollowing) result = result.filter(i => isFollowing(i.userId));
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allKindness, selectedTag, onlyFollowing, isFollowing]);

  const [displayCount, setDisplayCount] = useState(5);
  const [hasMore, setHasMore] = useState(true);

  const handleScrollToLower = useCallback(() => {
    if (!hasMore) return;
    const nextCount = displayCount + 5;
    if (nextCount >= filteredKindness.length) {
      setDisplayCount(filteredKindness.length);
      setHasMore(false);
    } else {
      setDisplayCount(nextCount);
    }
  }, [displayCount, filteredKindness.length, hasMore]);

  return (
    <View className={styles.page}>
      {/* 顶部 */}
      <View className={styles.header}>
        <View className={styles.headerLeft} onClick={() => Taro.navigateBack()}>
          <Text className={styles.backArrow}>←</Text>
        </View>
        <Text className={styles.headerTitle}>🌟 善行广场</Text>
        <View className={styles.headerRight} />
      </View>

      <ScrollView
        className={styles.content}
        scrollY
        enableBackToTop
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
        lowerThreshold={100}
        onScrollToLower={handleScrollToLower}
      >
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
          <View className={styles.followToggle} onClick={() => setOnlyFollowing(!onlyFollowing)}>
            <Text className={`${styles.followToggleText} ${onlyFollowing ? styles.followToggleActive : ''}`}>
              {onlyFollowing ? '✓ 仅关注' : '仅关注'}
            </Text>
          </View>
        </View>

        {/* 统计 */}
        <View className={styles.statsBar}>
          <Text className={styles.statsText}>共 {filteredKindness.length} 条善行 · 筛选: {selectedTag || '全部'}</Text>
        </View>

        {/* 善行列表 */}
        <View className={styles.kindnessList}>
          {filteredKindness.length > 0 ? (
            <>
              {filteredKindness.slice(0, displayCount).map(k => (
                <KindnessCard key={k.id} kindness={k} onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${k.id}` })} />
              ))}
              {hasMore && filteredKindness.length > displayCount && (
                <View className={styles.loadMore}>
                  <Text className={styles.loadMoreText}>下滑加载更多 ✨</Text>
                </View>
              )}
            </>
          ) : (
            <View className={styles.empty}>
              <Text className={styles.emptyIcon}>🌱</Text>
              <Text className={styles.emptyText}>暂无匹配的内容{'\n'}试试调整筛选条件</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default KindnessSquarePage;
