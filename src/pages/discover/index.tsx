import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import KindnessCard from '@/components/KindnessCard';
import { getKindnessList } from '@/data/kindness';
import { useKindnessStore } from '@/store/kindness';
import styles from './index.module.scss';

const DiscoverPage: React.FC = () => {
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const { publishedList: userKindnessList, loadFromStorage: loadKindness } = useKindnessStore();

  useEffect(() => {
    loadKindness();
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadKindness();
    setTimeout(() => {
      setRefreshing(false);
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 500);
  }, [loadKindness]);

  const ALL_TAGS = ['助人', '环保', '见证', '公益', '邻里互助', '孝亲', '陪伴', '关怀', '工作', '亲子'];

  const allKindness = useMemo(() => {
    const mockList = getKindnessList();
    const mockIds = new Set(mockList.map(k => k.id));
    return [...userKindnessList.filter(k => !mockIds.has(k.id)), ...mockList];
  }, [userKindnessList]);

  const filteredKindness = useMemo(() => {
    let result = [...allKindness];
    if (selectedTag) result = result.filter(i => i.tags.includes(selectedTag));
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allKindness, selectedTag]);

  const [displayCount, setDisplayCount] = useState(5);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    setDisplayCount(5);
    setHasMore(true);
  }, [selectedTag]);

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
      <ScrollView
        className={styles.scrollView}
        scrollY
        enhanced
        showScrollbar={false}
        refresherEnabled
        refresherTriggered={refreshing}
        onRefresherRefresh={handleRefresh}
        lowerThreshold={100}
        onScrollToLower={handleScrollToLower}
      >
        {/* 筛选栏 */}
        <View className={styles.filterBar}>
          <ScrollView className={styles.tagFilter} scrollX enableFlex>
            <View style={{ flexDirection: 'row', gap: '16rpx', padding: '20rpx 24rpx' }}>
              <Text
                className={`${styles.filterTag} ${!selectedTag ? styles.filterTagActive : ''}`}
                onClick={() => setSelectedTag('')}
              >
                全部
              </Text>
              {ALL_TAGS.map(tag => (
                <Text
                  key={tag}
                  className={`${styles.filterTag} ${selectedTag === tag ? styles.filterTagActive : ''}`}
                  onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                >
                  {tag}
                </Text>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* 统计 */}
        <View style={{ padding: '0 24rpx 16rpx', opacity: 0.6 }}>
          <Text style={{ fontSize: '24rpx', color: '#999' }}>
            共 {filteredKindness.length} 条善行 · 筛选: {selectedTag || '全部'}
          </Text>
        </View>

        {/* 善行列表 */}
        <View style={{ padding: '0 24rpx' }}>
          {filteredKindness.length > 0 ? (
            <>
              {filteredKindness.slice(0, displayCount).map(k => (
                <KindnessCard
                  key={k.id}
                  kindness={k}
                  onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${k.id}` })}
                />
              ))}
              {hasMore && filteredKindness.length > displayCount && (
                <View style={{ padding: '32rpx 0', textAlign: 'center' }}>
                  <Text style={{ fontSize: '24rpx', color: '#999' }}>下滑加载更多 ✨</Text>
                </View>
              )}
            </>
          ) : (
            <View style={{ padding: '120rpx 0', textAlign: 'center' }}>
              <Text style={{ fontSize: '64rpx' }}>🌱</Text>
              <Text style={{ fontSize: '28rpx', color: '#999', marginTop: '16rpx' }}>
                暂无匹配的内容{'\n'}试试调整筛选条件
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default DiscoverPage;
