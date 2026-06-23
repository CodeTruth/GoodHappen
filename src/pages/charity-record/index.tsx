import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCharityStore } from '@/store/charity';
import { useUserStore } from '@/store/user';
import { CHARITY_TYPE_MAP, CharityNeed } from '@/types/charity';
import RatingDialog from '@/components/RatingDialog';
import styles from './index.module.scss';

// 标签页：我接单的 / 我发布的
type Tab = 'accepted' | 'published';

const CharityRecordPage: React.FC = () => {
  const {
    getMyAcceptedNeeds,
    getMyPublishedNeeds,
    getCharityRecord,
    getMyRatingForNeed,
    loadFromStorage,
    checkExpiry,
  } = useCharityStore();
  const { userInfo, isLoggedIn, loadFromStorage: loadUser } = useUserStore();

  const [activeTab, setActiveTab] = useState<Tab>('accepted');
  const [ratingNeed, setRatingNeed] = useState<CharityNeed | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadFromStorage();
    loadUser();
    checkExpiry();
  }, []);

  // 当前用户 ID
  const userId = userInfo?.id || 'currentUser';

  // 公益履历统计（接单履历）
  const record = getCharityRecord(userId);

  // 我接单的需求 & 我发布的需求
  const acceptedNeeds = getMyAcceptedNeeds().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const publishedNeeds = getMyPublishedNeeds().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // 格式化日期
  const formatDate = (iso: string): string => {
    if (!iso) return '';
    const date = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 1) return '今天';
    if (days < 2) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 跳转发布页
  const handlePublish = () => {
    Taro.navigateTo({ url: '/pages/charity-publish/index' });
  };

  // 打开评价弹窗
  const handleRate = (need: CharityNeed) => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    setRatingNeed(need);
  };

  // 评价完成后刷新
  const handleRated = () => {
    setRefreshKey(k => k + 1);
  };

  // 渲染星级
  const renderStars = (score: number): string => {
    return '★'.repeat(score) + '☆'.repeat(5 - score);
  };

  // 当前展示列表
  const displayList = activeTab === 'accepted' ? acceptedNeeds : publishedNeeds;

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>公益履历</Text>
        <Text className={styles.headerSubtitle}>
          每一次互助，都是温暖故事的注脚
        </Text>
      </View>

      {/* 履历统计卡片 */}
      <View className={styles.statsCard}>
        <View className={styles.statsRow}>
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{record.completedCount}</Text>
            <Text className={styles.statLabel}>完成数</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{record.completionRate.toFixed(0)}%</Text>
            <Text className={styles.statLabel}>完成率</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{record.positiveRate.toFixed(0)}%</Text>
            <Text className={styles.statLabel}>好评率</Text>
          </View>
          <View className={styles.statDivider} />
          <View className={styles.statItem}>
            <Text className={styles.statValue}>{record.totalReward}</Text>
            <Text className={styles.statLabel}>累计福气</Text>
          </View>
        </View>
        {/* 公益履历标签 */}
        <View className={styles.recordTag}>
          <Text className={styles.recordTagIcon}>🌱</Text>
          <Text className={styles.recordTagText}>公益履历</Text>
          <Text className={styles.recordTagHint}>温暖故事选拔参考维度</Text>
        </View>
      </View>

      {/* 标签切换 */}
      <View className={styles.tabs}>
        <Text
          className={`${styles.tab} ${activeTab === 'accepted' ? styles.active : ''}`}
          onClick={() => setActiveTab('accepted')}
        >
          我接单的（{acceptedNeeds.length}）
        </Text>
        <Text
          className={`${styles.tab} ${activeTab === 'published' ? styles.active : ''}`}
          onClick={() => setActiveTab('published')}
        >
          我发布的（{publishedNeeds.length}）
        </Text>
      </View>

      {/* 需求列表 */}
      <View className={styles.needList} key={refreshKey}>
        {displayList.length > 0 ? (
          displayList.map((need) => {
            const typeConfig = CHARITY_TYPE_MAP[need.type];
            const myRating = getMyRatingForNeed(need.id);
            const isCompleted = need.status === 'completed';
            const canRate = isCompleted && !myRating;

            return (
              <View key={need.id} className={styles.needCard}>
                {/* 卡片头部 */}
                <View className={styles.cardHeader}>
                  <View className={styles.typeTag}>
                    <Text className={styles.typeIcon}>{typeConfig.icon}</Text>
                    <Text className={styles.typeLabel}>{typeConfig.label}</Text>
                  </View>
                  <Text
                    className={styles.statusTag}
                    style={{ color: getStatusColor(need.status) }}
                  >
                    {getStatusText(need.status)}
                  </Text>
                </View>

                {/* 标题 */}
                <Text className={styles.needTitle}>{need.title}</Text>

                {/* 描述 */}
                <Text className={styles.needDesc}>{need.description}</Text>

                {/* 福气悬赏 */}
                {need.reward > 0 && (
                  <View className={styles.rewardTag}>
                    <Text className={styles.rewardText}>悬赏 {need.reward} 福气</Text>
                  </View>
                )}

                {/* 时间信息 */}
                <View className={styles.timeInfo}>
                  {activeTab === 'accepted' ? (
                    <Text className={styles.timeText}>
                      {need.completedAt
                        ? `完成于 ${formatDate(need.completedAt)}`
                        : need.startedAt
                        ? `服务中 · ${formatDate(need.startedAt)}`
                        : need.acceptedAt
                        ? `接单于 ${formatDate(need.acceptedAt)}`
                        : ''}
                    </Text>
                  ) : (
                    <Text className={styles.timeText}>
                      {need.completedAt
                        ? `完成于 ${formatDate(need.completedAt)}`
                        : need.cancelledAt
                        ? `取消于 ${formatDate(need.cancelledAt)}`
                        : need.expiredAt
                        ? `超时于 ${formatDate(need.expiredAt)}`
                        : `发布于 ${formatDate(need.createdAt)}`}
                    </Text>
                  )}
                </View>

                {/* 评价信息 */}
                {isCompleted && myRating && (
                  <View className={styles.ratingInfo}>
                    <Text className={styles.ratingStars}>
                      {renderStars(myRating.score)}
                    </Text>
                    {myRating.comment && (
                      <Text className={styles.ratingComment}>“{myRating.comment}”</Text>
                    )}
                  </View>
                )}

                {/* 评价按钮 */}
                {canRate && (
                  <View className={styles.rateBtn} onClick={() => handleRate(need)}>
                    <Text className={styles.rateBtnText}>评价对方</Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>🌱</Text>
            <Text className={styles.emptyText}>
              {activeTab === 'accepted' ? '还没有接单记录' : '还没有发布过需求'}
            </Text>
            <Text className={styles.emptySubText}>让温暖从这里开始</Text>
          </View>
        )}
      </View>

      {/* 发布入口 */}
      <View className={styles.publishBtn} onClick={handlePublish}>
        <Text className={styles.publishText}>发布公益需求</Text>
      </View>

      {/* 评价弹窗 */}
      {ratingNeed && (
        <RatingDialog
          need={ratingNeed}
          visible={!!ratingNeed}
          onClose={() => setRatingNeed(null)}
          onRated={handleRated}
        />
      )}
    </ScrollView>
  );
};

// 状态文案
const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    open: '待接单',
    accepted: '已接单',
    in_progress: '服务中',
    completed: '已完成',
    expired: '已超时',
    cancelled: '已取消',
  };
  return map[status] || status;
};

// 状态颜色
const getStatusColor = (status: string): string => {
  const map: Record<string, string> = {
    open: '#FF6B6B',
    accepted: '#FAAD14',
    in_progress: '#165dff',
    completed: '#52C41A',
    expired: '#999999',
    cancelled: '#999999',
  };
  return map[status] || '#999999';
};

export default CharityRecordPage;
