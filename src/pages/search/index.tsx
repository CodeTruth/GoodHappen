import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { searchKindness, getHotSearchTags } from '@/services/search';
import { validateSearchKeyword } from '@/utils/sensitive';
import KindnessCard from '@/components/KindnessCard';
import { Kindness } from '@/types/kindness';
import styles from './index.module.scss';

// 搜索历史本地存储Key
const HISTORY_KEY = 'haoshi_search_history';
const MAX_HISTORY = 10;

const SearchPage: React.FC = () => {
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Kindness[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState('');
  const [activeRegion, setActiveRegion] = useState('');
  const [error, setError] = useState('');

  // 获取热门搜索标签
  const hotTags = useMemo(() => getHotSearchTags(), []);

  // 加载搜索历史
  useEffect(() => {
    try {
      const history = Taro.getStorageSync(HISTORY_KEY);
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (e) {
      console.error('[Search] Load history failed:', e);
    }
  }, []);

  // 保存搜索历史
  const saveHistory = (kw: string) => {
    const trimmed = kw.trim();
    if (!trimmed) return;
    const newHistory = [trimmed, ...searchHistory.filter((h) => h !== trimmed)].slice(0, MAX_HISTORY);
    setSearchHistory(newHistory);
    try {
      Taro.setStorageSync(HISTORY_KEY, JSON.stringify(newHistory));
    } catch (e) {
      console.error('[Search] Save history failed:', e);
    }
  };

  // 清空搜索历史
  const clearHistory = () => {
    setSearchHistory([]);
    Taro.removeStorageSync(HISTORY_KEY);
  };

  // 执行搜索
  const executeSearch = (kw: string, tag: string, region: string) => {
    setError('');

    // 敏感词过滤
    if (kw) {
      const result = validateSearchKeyword(kw);
      if (!result.valid) {
        setError(result.reason || '搜索内容不合规');
        Taro.showToast({ title: result.reason || '搜索内容不合规', icon: 'none' });
        return;
      }
    }

    // 如果只有标签没有关键词，用标签作为关键词搜索
    const searchKeyword = kw || tag;
    let results: Kindness[] = [];

    if (searchKeyword) {
      results = searchKindness({
        keyword: searchKeyword,
        sortBy: 'relevance',
      });
    }

    // 按地区筛选（保留原有地区筛选逻辑）
    if (region) {
      results = results.filter((item) =>
        item.location?.includes(region.slice(0, 2))
      );
    }

    setSearchResults(results);
    setHasSearched(true);

    // 保存搜索历史（仅在有关键词时）
    if (kw) {
      saveHistory(kw);
    }
  };

  const handleSearch = () => {
    executeSearch(keyword, activeTag, activeRegion);
  };

  const handleHistoryClick = (kw: string) => {
    setKeyword(kw);
    executeSearch(kw, activeTag, activeRegion);
  };

  const handleHotSearchClick = (kw: string) => {
    setKeyword(kw);
    executeSearch(kw, activeTag, activeRegion);
  };

  const handleTagClick = (tag: string) => {
    const newTag = activeTag === tag ? '' : tag;
    setActiveTag(newTag);
    if (keyword || newTag || activeRegion) {
      executeSearch(keyword, newTag, activeRegion);
    }
  };

  const handleInputChange = (e: any) => {
    setKeyword(e.detail.value);
    if (error) setError('');
  };

  const handleCardClick = (kindnessId: string) => {
    Taro.navigateTo({ url: `/pages/detail/index?id=${kindnessId}` });
  };

  const handleClear = () => {
    setKeyword('');
    setSearchResults([]);
    setHasSearched(false);
    setActiveTag('');
    setActiveRegion('');
    setError('');
  };

  return (
    <View className={styles.container}>
      {/* 搜索框 */}
      <View className={styles.searchBar}>
        <View className={styles.searchInputWrapper}>
          <Text className={styles.searchIcon}>🔍</Text>
          <Input
            className={styles.searchInput}
            type="text"
            placeholder="搜索善行内容、标签、地区…"
            value={keyword}
            onInput={handleInputChange}
            confirmType="search"
            onConfirm={handleSearch}
            maxlength={50}
          />
          {keyword && (
            <Text className={styles.clearIcon} onClick={handleClear}>
              ✕
            </Text>
          )}
        </View>
        <Text className={styles.searchBtn} onClick={handleSearch}>
          搜索
        </Text>
      </View>

      {/* 错误提示 */}
      {error && (
        <View className={styles.errorBanner}>
          <Text className={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* 搜索结果 */}
      {hasSearched ? (
        <View className={styles.resultSection}>
          {/* 筛选标签 */}
          <View className={styles.filterSection}>
            <ScrollView className={styles.tagScroll} scrollX enableFlex>
              <View className={styles.tagScrollInner}>
                {hotTags.map((tag) => (
                  <Text
                    key={tag}
                    className={`${styles.filterTag} ${activeTag === tag ? styles.filterTagActive : ''}`}
                    onClick={() => handleTagClick(tag)}
                  >
                    #{tag}
                  </Text>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* 结果统计 */}
          <Text className={styles.resultCount}>
            找到 {searchResults.length} 条结果
          </Text>

          {/* 结果列表 */}
          <View className={styles.resultList}>
            {searchResults.length > 0 ? (
              searchResults.map((kindness) => (
                <KindnessCard
                  key={kindness.id}
                  kindness={kindness}
                  onClick={() => handleCardClick(kindness.id)}
                />
              ))
            ) : (
              <View className={styles.empty}>
                <Text className={styles.emptyIcon}>🔍</Text>
                <Text className={styles.emptyText}>没有找到相关内容</Text>
                <Text className={styles.emptySubtext}>试试其他关键词吧</Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <ScrollView className={styles.suggestionSection} scrollY>
          {/* 搜索历史 */}
          {searchHistory.length > 0 && (
            <View className={styles.historySection}>
              <View className={styles.sectionHeader}>
                <Text className={styles.sectionTitle}>搜索历史</Text>
                <Text className={styles.clearBtn} onClick={clearHistory}>
                  清空
                </Text>
              </View>
              <View className={styles.historyList}>
                {searchHistory.map((kw, index) => (
                  <Text
                    key={index}
                    className={styles.historyItem}
                    onClick={() => handleHistoryClick(kw)}
                  >
                    {kw}
                  </Text>
                ))}
              </View>
            </View>
          )}

          {/* 热门搜索 */}
          <View className={styles.hotSection}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>🔥 热门搜索</Text>
            </View>
            <View className={styles.hotList}>
              {hotTags.slice(0, 10).map((keyword, index) => (
                <View
                  key={keyword}
                  className={styles.hotItem}
                  onClick={() => handleHotSearchClick(keyword)}
                >
                  <Text
                    className={`${styles.hotRank} ${index < 3 ? styles.hotRankTop : ''}`}
                  >
                    {index + 1}
                  </Text>
                  <Text className={styles.hotKeyword}>{keyword}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 快捷标签 */}
          <View className={styles.quickSection}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>快捷标签</Text>
            </View>
            <View className={styles.quickList}>
                {hotTags.map((tag) => (
                  <Text
                    key={tag}
                    className={styles.quickTag}
                    onClick={() => handleTagClick(tag)}
                  >
                    #{tag}
                  </Text>
                ))}
              </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default SearchPage;
