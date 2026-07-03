import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Switch, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import KindnessCard from '@/components/KindnessCard';
import WarmPartnerCard from '@/components/WarmPartnerCard';
import { getKindnessList } from '@/data/kindness';
import { isRepresentative } from '@/services/risk-detection';

// 本地定义（原 @/data/social、@/data/daily-kindness、@/data/onboarding-tasks 已移除）
const getWeeklyWarmPartners = () => [] as any[];
const getTodaySuggestion = () => ({
  suggestion: '今天做一件力所能及的小事，比如帮邻居开门、给陌生人一个微笑。',
  persona: '苏东坡',
  quote: '勿以善小而不为',
  risk: null as any,
});
interface DailyTask {
  id: string;
  day: number;
  title: string;
  description: string;
  isCompleted: boolean;
}
const onboardingDailyTasks: DailyTask[] = [];
import { useSocialStore } from '@/store/social';
import { useUserStore } from '@/store/user';
import { useInteractionStore } from '@/store/interaction';
import { useKindnessStore } from '@/store/kindness';
import WelcomeGuide from '@/components/WelcomeGuide';
import { useNotificationStore } from '@/store/notification';
import { useCircleStore } from '@/store/circle';
import { useProtectionStore } from '@/store/protection';
import { useOnboardingStore } from '@/store/onboarding';
import { getExampleWall } from '@/services/moral-dashboard';
import { getCircleTypeConfig, CircleType } from '@/config/circle-types';
import { Kindness } from '@/types/kindness';
import styles from './index.module.scss';

// 广场Tab类型
type SquareTab = 'all' | 'self' | 'witness' | 'following' | 'recommend';

// 所有可用标签
const ALL_TAGS = ['助人', '环保', '见证', '公益', '邻里互助', '孝亲', '陪伴', '关怀', '工作', '亲子'];
// 所有可用地区（省级）
const ALL_REGIONS = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '武汉市', '南京市', '西安市', '重庆市'];

// ===== 子组件：本周圈子榜样（提取到外部避免每次渲染重新创建） =====
const CircleExampleCard = React.memo(() => {
  const { getCircleById } = useCircleStore();
  const [examples, setExamples] = useState<any[]>([]);

  useEffect(() => {
    // 获取所有圈子的榜样记录（取前3条）
    const allExamples: any[] = [];
    const circleIds = ['circle1', 'circle2', 'circle3'];
    circleIds.forEach((cid) => {
      const exs = getExampleWall(cid).slice(0, 1);
      const circle = getCircleById(cid);
      if (circle && exs.length > 0) {
        const typeConfig = getCircleTypeConfig((circle.type as CircleType) || 'public');
        allExamples.push({
          ...exs[0],
          circleName: circle.name,
          circleType: circle.type,
          exampleLabel: typeConfig.labels.example,
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
          onClick={() => Taro.switchTab({ url: '/pages/circle/index' })}
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

// ===== 子组件：平台善行数据概览 =====
const PlatformStatsBar = React.memo(() => (
  <View className={styles.statsBar}>
    <ScrollView scrollX enableFlex className={styles.statsScroll}>
      <View className={styles.statsInner}>
        <View className={styles.statItem}>
          <Text className={styles.statNumber}>12,847</Text>
          <Text className={styles.statLabel}>件善行被记录</Text>
        </View>
        <View className={styles.statDivider} />
        <View className={styles.statItem}>
          <Text className={styles.statNumber}>3,256</Text>
          <Text className={styles.statLabel}>人参与其中</Text>
        </View>
        <View className={styles.statDivider} />
        <View className={styles.statItem}>
          <Text className={styles.statNumber}>8</Text>
          <Text className={styles.statLabel}>位先贤守护</Text>
        </View>
        <View className={styles.statDivider} />
        <View className={styles.statItem}>
          <Text className={styles.statNumber}>156</Text>
          <Text className={styles.statLabel}>所学校在用</Text>
        </View>
      </View>
    </ScrollView>
  </View>
));

// ===== 子组件：Slogan Banner =====
const SloganBanner = React.memo(() => (
  <View className={styles.sloganBanner}>
    <Text className={styles.sloganText}>再小的善意也值得被看见</Text>
  </View>
));

// ===== 子组件：首次进入3步引导 =====
const FirstTimeGuide = React.memo(() => {
  const steps = [
    { icon: '👀', text: '发现身边温暖' },
    { icon: '✍️', text: '也可以见证别人的善行' },
    { icon: '🌱', text: '获得福气成长' },
  ];
  return (
    <View className={styles.guideSection}>
      <Text className={styles.guideTitle}>🚀 三步开启善行之旅</Text>
      <View className={styles.guideSteps}>
        {steps.map((step, index) => (
          <View
            key={index}
            className={styles.guideStep}
            onClick={() => Taro.navigateTo({ url: '/pages/record/index' })}
          >
            <Text className={styles.guideStepIcon}>{step.icon}</Text>
            <Text className={styles.guideStepText}>{step.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

// ===== 子组件：每日善行灵感 =====
const DailySuggestionCard = React.memo(() => {
  const suggestion = useMemo(() => getTodaySuggestion(), []);
  const [visible, setVisible] = useState(true);
  // 仅代表性建议才展示风险标签
  const showRisk = useMemo(() => {
    if (!suggestion.risk) return false;
    return isRepresentative(suggestion.suggestion, suggestion.risk).representative;
  }, [suggestion]);
  if (!visible) return null;
  return (
    <View className={styles.dailyCard}>
      <View className={styles.dailyHeader}>
        <Text className={styles.dailyIcon}>💡</Text>
        <Text className={styles.dailyTitle}>今日善行灵感</Text>
        {showRisk && suggestion.risk && (
          <View className={styles.dailyRiskTag} style={{ background: suggestion.risk.color }}>
            <Text className={styles.dailyRiskTagText}>{suggestion.risk.icon} {suggestion.risk.level === 'high' ? '高风险' : '注意'}</Text>
          </View>
        )}
        <Text className={styles.dailyClose} onClick={() => setVisible(false)}>✕</Text>
      </View>
      <Text className={styles.dailyContent}>{suggestion.suggestion}</Text>
      {showRisk && suggestion.risk && (
        <View className={styles.dailyRiskBanner}>
          <Text className={styles.dailyRiskAdvice}>💡 {suggestion.risk.advice[0]}</Text>
          <Text className={styles.dailyRiskShield}>🛡️ 做好事前开启保护模式，系统全程兜底</Text>
        </View>
      )}
      <Text className={styles.dailyQuote}>—— {suggestion.persona}：「{suggestion.quote}」</Text>
    </View>
  );
});

// ===== 子组件：新手任务进度条（仅 userKindnessList.length < 3 时显示） =====
const OnboardingProgressBar = React.memo(() => {
  const { loadFromStorage } = useOnboardingStore();
  const [tasksState, setTasksState] = useState<DailyTask[]>([]);

  useEffect(() => {
    loadFromStorage();
    // 从本地存储读取已完成状态
    try {
      const stored = Taro.getStorageSync('haoshi_onboarding_daily');
      if (stored) {
        const parsed = JSON.parse(stored);
        setTasksState(parsed);
      } else {
        setTasksState(onboardingDailyTasks);
      }
    } catch {
      setTasksState(onboardingDailyTasks);
    }
  }, []);

  // 计算已完成天数
  const completedCount = tasksState.filter(t => t.isCompleted).length;
  const totalDays = 3;
  const percent = (completedCount / totalDays) * 100;

  return (
    <View
      className={styles.onboardingProgress}
      onClick={() => Taro.navigateTo({ url: '/pages/onboarding/index' })}
    >
      <View className={styles.onboardingProgressTop}>
        <Text className={styles.onboardingProgressIcon}>🌱</Text>
        <Text className={styles.onboardingProgressTitle}>新手行善任务</Text>
        <Text className={styles.onboardingProgressArrow}>→</Text>
      </View>
      <View className={styles.onboardingProgressBody}>
        <Text className={styles.onboardingProgressText}>
          第{Math.min(completedCount + 1, totalDays)}天/共{totalDays}天
        </Text>
        <View className={styles.onboardingProgressBarTrack}>
          <View
            className={styles.onboardingProgressBarFill}
            style={{ width: `${percent}%` }}
          />
        </View>
        <Text className={styles.onboardingProgressCount}>
          {completedCount}/{totalDays}
        </Text>
      </View>
    </View>
  );
});

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
  const [refreshing, setRefreshing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

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

    // 新手引导判断
    const welcomeShown = Taro.getStorageSync('haoshi_welcome_shown');
    if (!welcomeShown) {
      setShowWelcome(true);
    }
  }, []);

  // 下拉刷新
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    const timer = setTimeout(() => {
      loadUser();
      loadSocial();
      loadInteraction();
      loadKindness();
      loadNotification();
      loadMockNotification();
      cleanupExpired();
      setRefreshing(false);
      Taro.showToast({ title: '已刷新', icon: 'success' });
    }, 800);
    return () => clearTimeout(timer);
  }, [loadUser, loadSocial, loadInteraction, loadKindness, loadNotification, loadMockNotification, cleanupExpired]);

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
      // 为你推荐：基于用户善行标签偏好 + 同地区 + 时间倒序
      const userRegion = userInfo?.region || '北京市';
      // 从用户已有的善行记录中提取标签偏好
      const userTags = userKindnessList.flatMap(k => k.tags);
      const tagCountMap = new Map<string, number>();
      userTags.forEach(tag => {
        tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
      });
      // 按出现频率排序的偏好标签
      const preferredTags = [...tagCountMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(e => e[0]);

      // 为每条内容计算推荐得分（同标签+3，同地区+2）
      const scored = result.map((item) => {
        let score = 0;
        // 新手用户未发布过善行时，优先展示witness类型善行
        if (userKindnessList.length === 0 && item.type === 'witness') {
          score += 5;
        }
        // 同标签匹配
        const matchedTags = preferredTags.filter(tag => item.tags.includes(tag)).length;
        score += matchedTags * 3;
        // 同地区匹配
        const sameRegion = item.location?.includes(userRegion.slice(0, 2));
        if (sameRegion) score += 2;
        return { item, score };
      });

      // 按得分从高到低排序，得分相同则按时间倒序
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
    <WelcomeGuide visible={showWelcome} onClose={() => setShowWelcome(false)} />
    <ScrollView
      className={styles.container}
      scrollY
      enableBackToTop
      refresherEnabled
      refresherTriggered={refreshing}
      onRefresherRefresh={handleRefresh}
    >
      {/* Slogan Banner */}
      <SloganBanner />

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

      {/* 平台善行数据概览 */}
      <PlatformStatsBar />

      {/* 事前保护快速入口 */}
      <View
        className={styles.protectionEntry}
        onClick={() => Taro.navigateTo({ url: '/pages/protection-mode/index' })}
      >
        <View className={styles.protectionEntryLeft}>
          <Text className={styles.protectionEntryIcon}>🛡️</Text>
          <View className={styles.protectionEntryText}>
            <Text className={styles.protectionEntryTitle}>做好事前，先开启保护</Text>
            <Text className={styles.protectionEntryDesc}>一键启动：全程录像+录音+GPS存证，遇纠纷系统兜底</Text>
          </View>
        </View>
        <Text className={styles.protectionEntryArrow}>→</Text>
      </View>

      {/* AI善行顾问入口 */}
      <View
        className={styles.advisorEntry}
        onClick={() => Taro.navigateTo({ url: '/pages/ai-advisor/index' })}
      >
        <View className={styles.advisorEntryLeft}>
          <Text className={styles.advisorEntryIcon}>🤖</Text>
          <View className={styles.advisorEntryText}>
            <Text className={styles.advisorEntryTitle}>做好事前，先问AI顾问</Text>
            <Text className={styles.advisorEntryDesc}>描述情况，AI综合评判后给出最佳行动方案</Text>
          </View>
        </View>
        <Text className={styles.advisorEntryArrow}>→</Text>
      </View>

      {/* 每日善行建议（置顶到筛选Tab上方） */}
      <DailySuggestionCard />

      {/* 新手行善任务进度条（仅未完成3天任务时显示） */}
      {userKindnessList.length < 3 && <OnboardingProgressBar />}

      {/* 任务4：AI顾问聊天式引导入口 */}
      <View
        className={styles.aiChatEntry}
        onClick={() => Taro.navigateTo({ url: '/pages/ai-advisor/index?mode=text' })}
      >
        <View className={styles.aiChatEntryLeft}>
          <View className={styles.aiChatEntryAvatar}>
            <Text className={styles.aiChatEntryAvatarIcon}>💬</Text>
          </View>
          <View className={styles.aiChatEntryText}>
            <Text className={styles.aiChatEntryTitle}>AI顾问</Text>
            <Text className={styles.aiChatEntryDesc}>有善行想法但不确定怎么做？和AI聊聊</Text>
          </View>
        </View>
        <View className={styles.aiChatEntryArrow}>
          <Text className={styles.aiChatEntryArrowIcon}>→</Text>
        </View>
      </View>

      {/* 首次进入3步引导 */}
      {userKindnessList.length === 0 && <FirstTimeGuide />}

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

      {/* 模拟体验保护流程入口 */}
      <View
        className={styles.demoEntry}
        onClick={() => Taro.navigateTo({ url: '/pages/protection-mode/index?demo=true' })}
      >
        <Text className={styles.demoEntryIcon}>🎮</Text>
        <View className={styles.demoEntryText}>
          <Text className={styles.demoEntryTitle}>模拟体验完整保护流程</Text>
          <Text className={styles.demoEntryDesc}>无需真实操作，一键模拟全程录像+录音+GPS存证流程</Text>
        </View>
        <Text className={styles.demoEntryArrow}>→</Text>
      </View>

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

    {/* 悬浮保护按钮 */}
    <View
      className={styles.floatingShield}
      onClick={() => Taro.navigateTo({ url: '/pages/protection-mode/index' })}
    >
      <Text className={styles.floatingShieldIcon}>🛡️</Text>
      <Text className={styles.floatingShieldLabel}>保护</Text>
    </View>
    </View>
  );
};

export default HomePage;
