import React, { useEffect, useRef, useMemo, useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useFortuneStore } from '@/store/fortune';
import { useKindnessStore } from '@/store/kindness';
import { useUserStore, checkIsMinor } from '@/store/user';
import { useBadgeStore } from '@/store/badge';
import { useCircleStore } from '@/store/circle';
import { useInteractionStore } from '@/store/interaction';
import { calculateCreditScore, CREDIT_LEVELS } from '@/utils/credit-score';
import { getLevelProgress } from '@/data/fortune-levels';
import { BADGE_DEFINITIONS, BadgeDefinition, getCategoryName } from '@/data/badges';
import type { BadgeCategory } from '@/data/badges';

import AnimatedNumber from '@/components/AnimatedNumber';
import styles from './index.module.scss';

// 本地定义（原 @/data/users、@/data/fortune-levels 已移除）
const getCurrentUser = () => ({
  name: '访客',
  avatar: '',
  region: '',
  bio: '',
  badges: [] as string[],
});

/** 新解锁徽章弹窗 */
const BadgeUnlockPopup: React.FC<{
  badges: BadgeDefinition[];
  onClose: () => void;
}> = ({ badges, onClose }) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (badges.length === 0) return;
    setShow(true);
  }, [badges]);

  if (!show || badges.length === 0) return null;

  const badge = badges[currentIdx];
  const isLast = currentIdx >= badges.length - 1;

  return (
    <View className={styles.badgePopupOverlay} onClick={onClose}>
      <View className={styles.badgePopupCard} onClick={(e) => e.stopPropagation()}>
        <Text className={styles.badgePopupStars}>✨ 🎉 ✨</Text>
        <View
          className={styles.badgePopupIcon}
          style={{ background: `${badge.color}15`, borderColor: badge.color }}
        >
          <Text className={styles.badgePopupEmoji}>{badge.emoji}</Text>
        </View>
        <Text className={styles.badgePopupTitle}>新徽章解锁！</Text>
        <Text className={styles.badgePopupName} style={{ color: badge.color }}>
          {badge.name}
        </Text>
        <Text className={styles.badgePopupDesc}>{badge.desc}</Text>
        <View
          className={styles.badgePopupRarity}
          style={{ background: `${badge.color}20`, color: badge.color }}
        >
          <Text>{badge.rarityLabel}</Text>
        </View>
        {!isLast ? (
          <View
            className={styles.badgePopupNext}
            onClick={() => setCurrentIdx(currentIdx + 1)}
          >
            <Text className={styles.badgePopupNextText}>
              下一个 ({currentIdx + 2}/{badges.length})
            </Text>
          </View>
        ) : (
          <View className={styles.badgePopupBtn} onClick={onClose}>
            <Text className={styles.badgePopupBtnText}>太棒了！</Text>
          </View>
        )}
        <Text className={styles.badgePopupCount}>
          {currentIdx + 1} / {badges.length}
        </Text>
      </View>
    </View>
  );
};

/** 单个徽章卡片 */
const BadgeCard: React.FC<{
  badge: BadgeDefinition;
  state: 'locked' | 'in_progress' | 'unlocked';
  progress: number;
}> = ({ badge, state, progress }) => {
  const progressPercent = badge.progressTemplate
    ? Math.min(100, Math.floor((progress / badge.target) * 100))
    : state === 'unlocked' ? 100 : 0;

  return (
    <View
      className={`${styles.badgeCard} ${state === 'unlocked' ? styles.badgeCardUnlocked : ''} ${state === 'locked' ? styles.badgeCardLocked : ''}`}
    >
      <View
        className={styles.badgeIconWrap}
        style={{
          background: state === 'unlocked' ? `${badge.color}20` : 'rgba(0,0,0,0.04)',
          borderColor: state === 'unlocked' ? badge.color : 'rgba(0,0,0,0.08)',
          opacity: state === 'locked' ? 0.4 : 1,
        }}
      >
        <Text className={styles.badgeEmoji}>{state === 'locked' ? '🔒' : badge.emoji}</Text>
      </View>
      <Text
        className={styles.badgeName}
        style={{ opacity: state === 'locked' ? 0.4 : 1 }}
      >
        {state === 'locked' ? '???' : badge.name}
      </Text>
      {state === 'in_progress' && (
        <View className={styles.badgeProgress}>
          <View className={styles.badgeProgressTrack}>
            <View
              className={styles.badgeProgressFill}
              style={{ width: `${progressPercent}%`, background: badge.color }}
            />
          </View>
          <Text className={styles.badgeProgressText}>{progress}/{badge.target}</Text>
        </View>
      )}
      {state === 'unlocked' && (
        <View className={styles.badgeRarityTag} style={{ background: `${badge.color}20`, color: badge.color }}>
          <Text>{badge.rarityLabel}</Text>
        </View>
      )}
    </View>
  );
};

const MinePage: React.FC = () => {
  useEffect(() => {
    try {
      const page = Taro.getCurrentInstance().page;
      if (page && Taro.getTabBar) {
        const tabbar = Taro.getTabBar<{ current: number }>(page);
        if (tabbar) { tabbar.current = 4; }
      }
    } catch { /* H5 环境不支持 getTabBar */ }
  }, []);

  const mockUser = getCurrentUser();
  const {
    totalFortune,
    availableFortune,
    highestTitle,
    currentTitle,
    streak,
    transactions,
    loadFromStorage,
    resetIfNeeded,
  } = useFortuneStore();

  const { publishedList, loadFromStorage: loadKindnessFromStorage } = useKindnessStore();
  const { isLoggedIn, userInfo, logout, loadFromStorage: loadUserFromStorage } = useUserStore();
  const { unlocked: badgeUnlocked, progress: badgeProgress, checkAndUnlock, loadFromStorage: loadBadgeFromStorage } = useBadgeStore();
  const { circles, loadFromStorage: loadCircleFromStorage } = useCircleStore();
  const { comments, likes, loadFromStorage: loadInteractionFromStorage } = useInteractionStore();

  // 新解锁徽章弹窗
  const [newBadges, setNewBadges] = useState<BadgeDefinition[]>([]);
  const hasCheckedRef = useRef(false);

  // 善行影响力统计
  const impactStats = useMemo(() => {
    const totalKindness = publishedList.length;
    const peopleHelped = totalKindness * 2;
    const carbonReduction = Math.round(totalKindness * 0.5 * 10) / 10;
    return { totalKindness, peopleHelped, carbonReduction };
  }, [publishedList]);

  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadFromStorage();
    resetIfNeeded();
    loadUserFromStorage();
    loadKindnessFromStorage();
    loadBadgeFromStorage();
    loadCircleFromStorage();
    loadInteractionFromStorage();
  }, []);

  // 每次进入页面检查徽章
  useEffect(() => {
    if (hasCheckedRef.current) return;
    // 等数据加载完成
    const uid = userInfo?.id || 'currentUser';
    setTimeout(() => {
      const ks = useKindnessStore.getState();
      const fs = useFortuneStore.getState();
      const cs = useCircleStore.getState();
      const is = useInteractionStore.getState();

      // 计算用户加入的圈子数
      const userCircleIds = new Set<string>();
      cs.circles.forEach(c => {
        if (c.members.some(m => m.userId === uid) || c.adminId === uid) {
          userCircleIds.add(c.id);
        }
      });

      // 计算用户的评论数（当前用户的评论）
      let userCommentCount = 0;
      Object.values(is.comments).forEach(clist => {
        clist.forEach(c => {
          if (c.userId === uid) userCommentCount++;
        });
      });

      // 计算用户的点赞数（善行被点赞总数）
      let totalLikes = 0;
      ks.publishedList.forEach(k => {
        if (k.userId === uid) {
          totalLikes += k.likes || 0;
        }
      });

      // 检查是否有深夜善行
      const hasNightKindness = ks.publishedList.some(k => {
        if (k.userId !== uid) return false;
        const hour = new Date(k.createdAt).getHours();
        return hour >= 22 || hour < 6;
      });

      // 检查是否有匿名善行
      const hasAnonymousKindness = ks.publishedList.some(k => k.userId === uid && k.isAnonymous);

      // 检查是否有带位置的善行
      const hasLocationKindness = ks.publishedList.some(k => k.userId === uid && !!k.location);

      // 完成的本周灵感数（简化：用publishedList中来自inspiration的记录数近似）
      const completedInspirations = 0; // 需要追踪来源，暂时设为0

      const newlyUnlocked = useBadgeStore.getState().checkAndUnlock({
        totalKindness: ks.publishedList.filter(k => k.userId === uid).length,
        streakDays: fs.streak.currentStreak,
        fortune: fs.totalFortune,
        circleCount: userCircleIds.size,
        commentCount: userCommentCount,
        likeCount: totalLikes,
        hasLocationKindness,
        hasAnonymousKindness,
        hasNightKindness,
        completedInspirations,
      });

      if (newlyUnlocked.length > 0) {
        setNewBadges(newlyUnlocked);
      }
      hasCheckedRef.current = true;
    }, 800);
  }, [userInfo?.id]);

  // 按分类组织徽章
  const badgeCategories: { category: BadgeCategory; label: string; badges: BadgeDefinition[] }[] = useMemo(() => {
    const cats: BadgeCategory[] = ['milestone', 'streak', 'social', 'special'];
    return cats.map(cat => ({
      category: cat,
      label: getCategoryName(cat),
      badges: BADGE_DEFINITIONS.filter(b => b.category === cat),
    }));
  }, []);

  const unlockedBadgeIds = useMemo(() => new Set(badgeUnlocked.map(u => u.badgeId)), [badgeUnlocked]);

  const displayName = isLoggedIn && userInfo ? userInfo.name : mockUser.name;
  const displayAvatar = isLoggedIn && userInfo ? userInfo.avatar : mockUser.avatar;
  const displayBio = isLoggedIn && userInfo ? (userInfo.bio || '点击编辑个人简介') : mockUser.bio;
  const displayBadges = isLoggedIn && userInfo ? userInfo.badges : mockUser.badges;
  const isMinor = checkIsMinor(userInfo?.birthYear);

  const handleLogin = () => {
    Taro.navigateTo({ url: '/pages/login/index' });
  };

  const handleLogout = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          logout();
          useFortuneStore.setState({
            totalFortune: 0,
            highestFortune: 0,
            availableFortune: 0,
            frozenFortune: 0,
            transactions: [],
            dailyStats: { date: new Date().toISOString().split('T')[0], count: 0, fortune: 0 },
            streak: { currentStreak: 0, lastRecordDate: '', highestStreak: 0 },
          });
          Taro.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  };

  const requireAuthAction = (url: string) => {
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      navigateTimerRef.current = setTimeout(() => {
        Taro.navigateTo({ url: '/pages/login/index' });
      }, 1000);
      return;
    }
    Taro.navigateTo({ url });
  };

  useEffect(() => {
    return () => {
      if (navigateTimerRef.current) {
        clearTimeout(navigateTimerRef.current);
        navigateTimerRef.current = null;
      }
    };
  }, []);

  const menuItems = [
    { icon: '🔔', text: '消息通知', action: () => Taro.navigateTo({ url: '/pages/notifications/index' }) },
    { icon: '🤝', text: '公益履历', action: () => requireAuthAction('/pages/charity-record/index') },
    { icon: '📢', text: '发布公益需求', action: () => requireAuthAction('/pages/charity-publish/index') },
    { icon: '💰', text: '福气流水', action: () => Taro.showToast({ title: `共${transactions.length}条记录`, icon: 'none' }) },
    { icon: '👥', text: '我的善行圈', action: () => Taro.navigateTo({ url: '/pages/circle/index' }) },
    { icon: '👤', text: '编辑资料', action: () => requireAuthAction('/pages/profile-edit/index') },
    { icon: '🔒', text: '隐私设置', action: () => requireAuthAction('/pages/privacy-settings/index') },
    { icon: '🛡️', text: '账号安全', action: () => requireAuthAction('/pages/account-security/index') },
  ];

  const protectionItems = [
    { icon: '🤖', text: '善行顾问', action: () => Taro.navigateTo({ url: '/pages/ai-advisor/index' }) },
    { icon: '📂', text: '证据历史', action: () => Taro.navigateTo({ url: '/pages/evidence-history/index' }) },
    { icon: '⚖️', text: '法律援助', action: () => Taro.navigateTo({ url: '/pages/legal-aid/index' }) },
    { icon: '📸', text: '善行见证', action: () => Taro.navigateTo({ url: '/pages/witness-network/index' }) },
    { icon: '🏥', text: '善行保险', action: () => Taro.navigateTo({ url: '/pages/insurance/index' }) },
    { icon: '📋', text: '理赔流程', action: () => Taro.navigateTo({ url: '/pages/claim-flow/index' }) },
  ];

  const statsItems = [
    { icon: '📊', text: '温暖统计', action: () => Taro.navigateTo({ url: '/pages/warmth-stats/index' }) },
    { icon: '📈', text: '我的统计', action: () => Taro.navigateTo({ url: '/pages/my-stats/index' }) },
    { icon: '🗺️', text: '温暖地图', action: () => Taro.navigateTo({ url: '/pages/warmth-map/index' }) },
    { icon: '📖', text: '温暖故事', action: () => Taro.navigateTo({ url: '/pages/warmth-stories/index' }) },
  ];

  const otherItems = [
    { icon: '✅', text: '每日签到', action: () => Taro.navigateTo({ url: '/pages/checkin/index' }) },
    { icon: '🏆', text: '善行挑战', action: () => Taro.navigateTo({ url: '/pages/challenges/index' }) },
    { icon: '🌟', text: '善行广场', action: () => Taro.navigateTo({ url: '/pages/kindness-square/index' }) },
    { icon: '🎁', text: '温暖商城', action: () => Taro.navigateTo({ url: '/pages/shop/index' }) },
    { icon: '💝', text: '温暖基金', action: () => Taro.navigateTo({ url: '/pages/warmth-fund/index' }) },
    { icon: '🏪', text: '合作商户', action: () => Taro.navigateTo({ url: '/pages/merchant-list/index' }) },
    { icon: '👫', text: '公益基金', action: () => Taro.navigateTo({ url: '/pages/charity-fund/index' }) },
    { icon: '🙋', text: '受助者', action: () => Taro.navigateTo({ url: '/pages/recipients/index' }) },
    { icon: '📝', text: '公益任务', action: () => Taro.navigateTo({ url: '/pages/charity-tasks/index' }) },
    { icon: '🎟️', text: '邀请好友', action: () => Taro.navigateTo({ url: '/pages/invite/index' }) },
    { icon: '📅', text: '年度报告', action: () => Taro.navigateTo({ url: '/pages/annual-report/index' }) },
  ];

  const levelProgress = getLevelProgress(totalFortune);

  return (
    <View className={styles.pageWrapper}>
      {/* 新徽章解锁弹窗 */}
      <BadgeUnlockPopup
        badges={newBadges}
        onClose={() => setNewBadges([])}
      />

      <View className={styles.container}>
        {/* 头部用户信息 */}
        <View className={styles.header}>
          <View className={styles.userInfo}>
            <Image
              src={displayAvatar}
              className={styles.avatar}
              mode="aspectFill"
            />
            <View className={styles.info}>
              <View className={styles.nameRow}>
                <Text className={styles.name}>{displayName}</Text>
                {isMinor && isLoggedIn && (
                  <Text className={styles.minorBadge}>未成年</Text>
                )}
              </View>
              <Text className={styles.bio}>{displayBio}</Text>
            </View>
            {!isLoggedIn ? (
              <View className={styles.loginBtn} onClick={handleLogin}>
                <Text className={styles.loginBtnText}>登录</Text>
              </View>
            ) : (
              <View className={styles.logoutBtn} onClick={handleLogout}>
                <Text className={styles.logoutBtnText}>退出</Text>
              </View>
            )}
          </View>

          <View className={styles.titleSection}>
            <View className={styles.currentTitle}>
              <Text className={styles.titleName}>{currentTitle.name}</Text>
              <Text className={styles.titleDesc}>{currentTitle.description}</Text>
            </View>
            {highestTitle.level > currentTitle.level && (
              <View className={styles.highestTitleBadge}>
                <Text className={styles.highestTitleText}>
                  历史最高：{highestTitle.name}
                </Text>
              </View>
            )}
          </View>

          <View className={styles.stats}>
            <View className={styles.stat}>
              <Text className={styles.statValue}>{totalFortune}</Text>
              <Text className={styles.statLabel}>累计福气</Text>
            </View>
            <View className={styles.stat}>
              <Text className={styles.statValue}>{availableFortune}</Text>
              <Text className={styles.statLabel}>可用福气</Text>
            </View>
            <View className={styles.stat}>
              <Text className={styles.statValue}>{streak.currentStreak}</Text>
              <Text className={styles.statLabel}>连续天数</Text>
            </View>
          </View>

          {levelProgress && (
            <View className={styles.levelSection}>
              <View className={styles.levelHeader}>
                <View className={styles.levelBadgeLarge}>
                  <Text className={styles.levelIconLarge}>{levelProgress.current.icon}</Text>
                </View>
                <View className={styles.levelInfo}>
                  <Text className={styles.levelNameLarge}>{levelProgress.current.name}</Text>
                  <Text className={styles.levelDesc}>{levelProgress.current.description}</Text>
                </View>
              </View>
              <View className={styles.progressSection}>
                <View className={styles.levelBadge}>
                  <Text className={styles.levelIcon}>{levelProgress.current.icon}</Text>
                  <Text className={styles.levelName}>{levelProgress.current.name}</Text>
                </View>
                <View className={styles.progressTrack}>
                  <View
                    className={styles.progressFill}
                    style={{ width: `${levelProgress.progress}%` }}
                  />
                </View>
                <View className={styles.levelNext}>
                  <Text className={styles.levelNextIcon}>{levelProgress.next?.icon || '👑'}</Text>
                  <Text className={styles.levelNextName}>{levelProgress.next?.name || '已满级'}</Text>
                </View>
              </View>
              <Text className={styles.progressText}>
                距下一等级还需 {levelProgress.remaining} 福气值
              </Text>
            </View>
          )}
        </View>

        {/* 善行影响力 */}
        <View className={styles.impactSection}>
          <Text className={styles.impactTitle}>善行影响力</Text>
          <View className={styles.impactGrid}>
            <View className={styles.impactItem}>
              <AnimatedNumber value={impactStats.totalKindness} suffix=" 次" className={styles.impactValue} />
              <Text className={styles.impactLabel}>总善行</Text>
            </View>
            <View className={styles.impactItem}>
              <AnimatedNumber value={impactStats.peopleHelped} suffix=" 人" className={styles.impactValue} />
              <Text className={styles.impactLabel}>帮助了</Text>
            </View>
            <View className={styles.impactItem}>
              <AnimatedNumber value={impactStats.carbonReduction} suffix=" kg" className={styles.impactValue} formatter={(v) => v.toFixed(1)} />
              <Text className={styles.impactLabel}>减少碳排放</Text>
            </View>
            <View className={styles.impactItem}>
              <AnimatedNumber value={totalFortune} suffix="" className={styles.impactValue} />
              <Text className={styles.impactLabel}>累计福气</Text>
            </View>
          </View>
        </View>

        {/* 连续记录信息 */}
        <View className={styles.streakCard}>
          <Text className={styles.streakIcon}>🔥</Text>
          <View className={styles.streakInfo}>
            <Text className={styles.streakNumber}>{streak.currentStreak}</Text>
            <Text className={styles.streakLabel}>天连续善行</Text>
          </View>
          <View className={styles.streakBest}>
            <Text className={styles.streakBestText}>历史最长: {streak.highestStreak}天</Text>
          </View>
        </View>

        {/* 善行信用分入口卡片 */}
        {(() => {
          const allTags = new Set<string>();
          publishedList.forEach((k) => { if (k.tags) k.tags.forEach((t) => allTags.add(t)); });
          const credit = calculateCreditScore({
            totalFortune,
            currentStreak: streak.currentStreak,
            uniqueTagCount: allTags.size,
            witnessCount: publishedList.reduce((s, k) => s + (k.likes || 0), 0),
            challengeCount: 0,
            socialCount: circles.length * 3,
          });
          const lvlCfg = CREDIT_LEVELS.find((l) => l.level === credit.level) || CREDIT_LEVELS[4];
          return (
            <View
              className={styles.creditScoreCard}
              onClick={() => Taro.navigateTo({ url: '/pages/credit-score/index' })}
            >
              <View className={styles.creditScoreLeft}>
                <Text className={styles.creditScoreIcon}>{lvlCfg.icon}</Text>
                <View className={styles.creditScoreInfo}>
                  <Text className={styles.creditScoreLabel}>{'\u5584\u884c\u4fe1\u7528\u5206'}</Text>
                  <Text className={styles.creditScoreLevelText}>
                    {credit.levelName} \u00b7 {lvlCfg.title}
                  </Text>
                </View>
              </View>
              <View className={styles.creditScoreRight}>
                <Text className={styles.creditScoreValue}>{credit.total}</Text>
                <Text className={styles.creditScoreMax}>{'/1000'}</Text>
                <Text className={styles.creditScoreArrow}>{'\u203a'}</Text>
              </View>
            </View>
          );
        })()}

        {/* ===== 新徽章墙 ===== */}
        <View className={styles.badgeWall}>
          <View className={styles.badgeWallHeader}>
            <Text className={styles.sectionTitle}>🏆 善行徽章</Text>
            <Text className={styles.badgeWallCount}>
              {badgeUnlocked.length}/{BADGE_DEFINITIONS.length}
            </Text>
          </View>

          {badgeCategories.map(cat => {
            const catUnlocked = cat.badges.filter(b => unlockedBadgeIds.has(b.id)).length;
            return (
              <View key={cat.category} className={styles.badgeCategory}>
                <View className={styles.badgeCategoryHeader}>
                  <Text className={styles.badgeCategoryLabel}>{cat.label}</Text>
                  <Text className={styles.badgeCategoryCount}>{catUnlocked}/{cat.badges.length}</Text>
                </View>
                <View className={styles.badgeGrid}>
                  {cat.badges.map(badge => {
                    const state = unlockedBadgeIds.has(badge.id)
                      ? 'unlocked'
                      : (badgeProgress[badge.id] || 0) > 0
                        ? 'in_progress'
                        : 'locked';
                    return (
                      <BadgeCard
                        key={badge.id}
                        badge={badge}
                        state={state}
                        progress={badgeProgress[badge.id] || 0}
                      />
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {/* 善行保障 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>🛡️ 善行保障</Text>
          <View className={styles.gridMenu}>
            {protectionItems.map((item, index) => (
              <View key={index} className={styles.gridItem} onClick={item.action}>
                <Text className={styles.gridIcon}>{item.icon}</Text>
                <Text className={styles.gridText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 温暖数据 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>📊 温暖数据</Text>
          <View className={styles.gridMenu}>
            {statsItems.map((item, index) => (
              <View key={index} className={styles.gridItem} onClick={item.action}>
                <Text className={styles.gridIcon}>{item.icon}</Text>
                <Text className={styles.gridText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 更多功能 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>🎯 更多功能</Text>
          <View className={styles.gridMenu}>
            {otherItems.map((item, index) => (
              <View key={index} className={styles.gridItem} onClick={item.action}>
                <Text className={styles.gridIcon}>{item.icon}</Text>
                <Text className={styles.gridText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 菜单 */}
        <View className={styles.menu}>
          {menuItems.map((item, index) => (
            <View key={index} className={styles.menuItem} onClick={item.action}>
              <Text className={styles.menuIcon}>{item.icon}</Text>
              <Text className={styles.menuText}>{item.text}</Text>
              <Text className={styles.menuArrow}>›</Text>
            </View>
          ))}
        </View>

        {/* 版本信息 */}
        <View className={styles.version}>
          <Text>好事发生 v1.0.0</Text>
        </View>
      </View>
    </View>
  );
};

export default MinePage;
