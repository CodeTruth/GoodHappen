import React, { useState, useMemo } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import classnames from 'classnames';
import { getWarmStories, WarmStory } from '@/data/stories';
import styles from './index.module.scss';

// 周期筛选类型
type Period = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'yearly';

const WarmthStoriesPage: React.FC = () => {
  const [activePeriod, setActivePeriod] = useState<Period>('yearly');
  const allStories = useState(getWarmStories())[0];

  // 周期标签配置
  const periodTabs: { key: Period; label: string }[] = [
    { key: 'Q1', label: '第一季度' },
    { key: 'Q2', label: '第二季度' },
    { key: 'Q3', label: '第三季度' },
    { key: 'Q4', label: '第四季度' },
    { key: 'yearly', label: '年度故事' },
  ];

  // 按周期筛选故事
  const filteredStories = useMemo(() => {
    return allStories.filter((story: WarmStory) => story.period === activePeriod);
  }, [allStories, activePeriod]);

  // 格式化温暖值
  const formatWarmth = (value: number): string => {
    if (value >= 10000) {
      return `${(value / 10000).toFixed(1)}万`;
    }
    return value.toLocaleString('zh-CN');
  };

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>温暖故事</Text>
        <Text className={styles.headerSubtitle}>
          每一个故事，都是真实发生的温暖
        </Text>
      </View>

      {/* 周期切换 */}
      <ScrollView scrollX className={styles.tabs}>
        {periodTabs.map((tab) => (
          <Text
            key={tab.key}
            className={classnames(
              styles.tab,
              activePeriod === tab.key && styles.active
            )}
            onClick={() => setActivePeriod(tab.key)}
          >
            {tab.label}
          </Text>
        ))}
      </ScrollView>

      {/* 故事列表 */}
      <View className={styles.storyList}>
        {filteredStories.length > 0 ? (
          filteredStories.map((story: WarmStory) => (
            <View key={story.id} className={styles.storyCard}>
              {/* 故事配图 */}
              <Image
                src={story.image}
                className={styles.storyImage}
                mode="aspectFill"
              />
              <View className={styles.storyBody}>
                {/* 善行类型标签 */}
                <View className={styles.storyTypeTag}>
                  <Text className={styles.storyTypeText}>#{story.kindnessType}</Text>
                </View>

                {/* 故事标题 */}
                <Text className={styles.storyTitle}>{story.title}</Text>

                {/* 善行内容摘要 */}
                <Text className={styles.storySummary}>{story.summary}</Text>

                {/* AI共鸣金句 */}
                <View className={styles.aiQuote}>
                  <View className={styles.aiQuoteHeader}>
                    <Text className={styles.aiQuoteIcon}>✨</Text>
                    <Text className={styles.aiQuotePersona}>
                      {story.aiPersonaName}的共鸣
                    </Text>
                  </View>
                  <Text className={styles.aiQuoteText}>{story.aiQuote}</Text>
                </View>

                {/* 发布者匿名展示 */}
                <View className={styles.publisher}>
                  <Text className={styles.publisherIcon}>📍</Text>
                  <Text className={styles.publisherText}>{story.publisher}</Text>
                  <Text className={styles.storyWarmth}>
                    温暖值 {formatWarmth(story.warmthValue)}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>🌱</Text>
            <Text className={styles.emptyText}>这个周期还在收集故事</Text>
            <Text className={styles.emptySubText}>温暖正在发生，敬请期待</Text>
          </View>
        )}
      </View>

      {/* 底部说明 */}
      <View className={styles.footerNote}>
        <Text className={styles.footerText}>
          这里没有排名，只有故事{'\n'}
          每一份善意都值得被讲述
        </Text>
      </View>
    </ScrollView>
  );
};

export default WarmthStoriesPage;
