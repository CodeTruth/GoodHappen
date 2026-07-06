import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Image, ScrollView, Input, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useCircleStore, CircleInfo, CircleAccessType } from '@/store/circle';
import { SEED_USERS } from '@/data/seed-data';
import { RECOMMENDED_CIRCLES } from '@/data/circle-mock';
import { useUserStore } from '@/store/user';
import { getCircleTypeConfig, CircleType } from '@/config/circle-types';

// 善行之星排行榜（前5名）
const MEDAL_ICONS = ['🥇', '🥈', '🥉'];

const CIRCLE_TYPE_OPTIONS: { key: CircleType; label: string; icon: string }[] = [
  { key: 'class', label: '班级', icon: '🏫' },
  { key: 'company', label: '企业', icon: '🏢' },
  { key: 'community', label: '社区', icon: '🏘️' },
  { key: 'friends', label: '朋友', icon: '👋' },
  { key: 'public', label: '公开', icon: '🌐' },
];

const CirclePage: React.FC = () => {
  const { circles, createCircle, loadFromStorage, inviteMember } = useCircleStore();
  const { userInfo } = useUserStore();

  const [activeTab, setActiveTab] = useState<'mine' | 'discover'>('mine');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // 创建表单
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<CircleType>('community');
  const [formDesc, setFormDesc] = useState('');
  const [formAccess, setFormAccess] = useState<CircleAccessType>('public');

  // 用户 ID
  const currentUserId = userInfo?.id || 'guest';

  useEffect(() => {
    loadFromStorage();
    // 自动迁移推荐圈子进 store
    migrateRecommendedCircles();
  }, []);

  // 把推荐圈子迁移到 store（按名称去重）
  const migrateRecommendedCircles = () => {
    const state = useCircleStore.getState();
    RECOMMENDED_CIRCLES.forEach(rec => {
      const exists = state.circles.find(c => c.name === rec.name);
      if (!exists) {
        createCircle({
          name: rec.name,
          type: 'public',
          accessType: 'public',
          description: rec.description,
          adminId: 'system',
          requireRealName: false,
        } as any);
      }
    });
  };

  // 我的圈子
  const myCircles = useMemo(() =>
    circles.filter(c =>
      c.members.some(m => m.userId === currentUserId) || c.adminId === currentUserId
    ), [circles, currentUserId]);

  // 发现圈子（公开且未加入）
  const discoverableCircles = useMemo(() =>
    circles.filter(c =>
      c.accessType === 'public' &&
      !c.members.some(m => m.userId === currentUserId) &&
      c.adminId !== currentUserId
    ), [circles, currentUserId]);

  // 本周善行之星排行
  const weeklyRanking = useMemo(() => {
    return [...SEED_USERS]
      .sort((a, b) => (b.kindnessCount || 0) - (a.kindnessCount || 0))
      .slice(0, 5)
      .map(u => ({
        id: u.id, name: u.name, avatar: u.avatar,
        region: u.region, kindnessCount: u.kindnessCount,
      }));
  }, []);

  const getCircleIcon = (type: string) => {
    const icons: Record<string, string> = {
      class: '🏫', company: '🏢', community: '🏘️', friends: '👋', public: '🌐'
    };
    return icons[type] || '👥';
  };

  const getCircleTypeName = (type: string) => {
    const names: Record<string, string> = {
      class: '班级', company: '企业', community: '社区', friends: '朋友', public: '公开'
    };
    return names[type] || '团体';
  };

  const handleCircleClick = (circleId: string) => {
    Taro.navigateTo({ url: `/pages/circleDetail/index?id=${circleId}` });
  };

  // 加入公开圈子
  const handleJoinCircle = (circle: CircleInfo) => {
    if (!userInfo?.id) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    inviteMember(circle.id, {
      userId: userInfo.id,
      userName: userInfo.nickname || '善行者',
      userAvatar: userInfo.avatar || '',
      role: 'member' as const,
    });
    Taro.showToast({ title: `已加入「${circle.name}」`, icon: 'success' });
  };

  // 创建圈子
  const handleCreate = () => {
    if (!formName.trim()) {
      Taro.showToast({ title: '请输入圈子名称', icon: 'none' });
      return;
    }
    if (!userInfo?.id) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }
    setCreating(true);
    const id = createCircle({
      name: formName.trim(),
      type: formType,
      accessType: formAccess,
      description: formDesc.trim(),
      adminId: userInfo.id,
      requireRealName: false,
      members: [{
        userId: userInfo.id,
        userName: userInfo.nickname || '创建者',
        userAvatar: userInfo.avatar || '',
        role: 'admin' as const,
        joinedAt: new Date().toISOString(),
        memberNumber: 1,
        isRealName: true,
      }],
    });
    Taro.showToast({ title: '圈子创建成功！', icon: 'success' });
    setShowCreate(false);
    setCreating(false);
    setFormName('');
    setFormDesc('');
    setActiveTab('mine');
    // 跳转到新圈子详情
    setTimeout(() => {
      Taro.navigateTo({ url: `/pages/circleDetail/index?id=${id}` });
    }, 800);
  };

  return (
    <View className={styles.page}>
      {/* 顶部 */}
      <View className={styles.header}>
        <Text className={styles.title}>善行圈</Text>
        <Text className={styles.subtitle}>团体善行，温暖聚合</Text>
      </View>

      {/* Tab 切换 */}
      <View className={styles.tabBar}>
        <View
          className={`${styles.tab} ${activeTab === 'mine' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('mine')}
        >
          <Text className={styles.tabText}>
            我的圈子{myCircles.length > 0 ? ` (${myCircles.length})` : ''}
          </Text>
        </View>
        <View
          className={`${styles.tab} ${activeTab === 'discover' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          <Text className={styles.tabText}>
            发现圈子{discoverableCircles.length > 0 ? ` (${discoverableCircles.length})` : ''}
          </Text>
        </View>
      </View>

      <ScrollView className={styles.body} scrollY>
        {/* ===== 我的圈子 ===== */}
        {activeTab === 'mine' && (
          <>
            {/* 本周善行之星 */}
            <View className={styles.rankingCard}>
              <View className={styles.rankingHeader}>
                <Text className={styles.rankingTitle}>⭐ 本周善行之星</Text>
                <Text className={styles.rankingSubtitle}>善行数量排行</Text>
              </View>
              {weeklyRanking.map((user, index) => (
                <View
                  key={user.id}
                  className={`${styles.rankingItem} ${index < 3 ? styles.rankingItemTop : ''}`}
                  onClick={() => Taro.navigateTo({ url: `/pages/detail/index?userId=${user.id}` })}
                >
                  <View className={styles.rankingPos}>
                    {index < 3
                      ? <Text className={styles.rankingMedal}>{MEDAL_ICONS[index]}</Text>
                      : <Text className={styles.rankingNum}>{index + 1}</Text>}
                  </View>
                  <Image className={styles.rankingAvatar} src={user.avatar} mode="aspectFill" />
                  <View className={styles.rankingInfo}>
                    <View className={styles.rankingNameRow}>
                      <Text className={styles.rankingName}>{user.name}</Text>
                      {index === 0 && <View className={styles.rankingBadge}><Text className={styles.rankingBadgeText}>本周善行之星</Text></View>}
                    </View>
                    <Text className={styles.rankingRegion}>{user.region}</Text>
                  </View>
                  <Text className={styles.rankingCount}>{user.kindnessCount} 件</Text>
                </View>
              ))}
            </View>

            {/* 圈子列表 */}
            {myCircles.length > 0 ? (
              <View className={styles.circleList}>
                {myCircles.map(circle => (
                  <View key={circle.id} className={styles.circleCard} onClick={() => handleCircleClick(circle.id)}>
                    <View className={styles.circleCardHead}>
                      <View className={styles.circleIconBox}>{getCircleIcon(circle.type)}</View>
                      <View className={styles.circleHeadInfo}>
                        <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
                          <Text className={styles.circleName}>{circle.name}</Text>
                          <Text className={styles.circleTypeTag}>{getCircleTypeName(circle.type)}</Text>
                        </View>
                        <Text className={styles.circleMembers}>{circle.members.length} 名成员</Text>
                      </View>
                    </View>
                    {circle.description && <Text className={styles.circleDesc}>{circle.description}</Text>}
                    <View className={styles.circleStats}>
                      <Text className={styles.statItem}>{circle.members.length} 名成员</Text>
                      <Text className={styles.statItem}>{circle.accessType === 'open' ? '班级码加入' : circle.accessType === 'closed' ? '邀请加入' : '公开加入'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className={styles.empty}>
                <Text className={styles.emptyIcon}>👥</Text>
                <Text className={styles.emptyTitle}>还没有加入任何圈子</Text>
                <Text className={styles.emptyDesc}>去发现页查找感兴趣的圈子，或创建一个自己的圈子</Text>
              </View>
            )}
          </>
        )}

        {/* ===== 发现圈子 ===== */}
        {activeTab === 'discover' && (
          <>
            {discoverableCircles.length > 0 ? (
              <View className={styles.circleList}>
                {discoverableCircles.map(circle => (
                  <View key={circle.id} className={styles.circleCard}>
                    <View className={styles.circleCardHead}>
                      <View className={styles.circleIconBox}>{getCircleIcon(circle.type)}</View>
                      <View className={styles.circleHeadInfo}>
                        <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx' }}>
                          <Text className={styles.circleName}>{circle.name}</Text>
                          <Text className={styles.circleTypeTag}>{getCircleTypeName(circle.type)}</Text>
                        </View>
                        <Text className={styles.circleMembers}>{circle.members.length} 名成员</Text>
                      </View>
                    </View>
                    {circle.description && <Text className={styles.circleDesc}>{circle.description}</Text>}
                    <View className={styles.discoverActions}>
                      <View className={styles.viewBtn} onClick={() => handleCircleClick(circle.id)}>
                        <Text className={styles.viewBtnText}>查看详情</Text>
                      </View>
                      <View className={styles.joinBtn} onClick={() => handleJoinCircle(circle)}>
                        <Text className={styles.joinBtnText}>+ 加入</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className={styles.empty}>
                <Text className={styles.emptyIcon}>🔍</Text>
                <Text className={styles.emptyTitle}>暂无公开圈子</Text>
                <Text className={styles.emptyDesc}>还没有人创建公开圈子，你可以创建第一个</Text>
              </View>
            )}
          </>
        )}

        {/* 底部留白 */}
        <View style={{ height: '160rpx' }} />
      </ScrollView>

      {/* 悬浮创建按钮 */}
      <View className={styles.fab} onClick={() => setShowCreate(true)}>
        <Text className={styles.fabIcon}>＋</Text>
        <Text className={styles.fabText}>创建圈子</Text>
      </View>

      {/* ===== 创建圈子弹窗 ===== */}
      {showCreate && (
        <View className={styles.modalOverlay} onClick={() => setShowCreate(false)}>
          <View className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>创建善行圈</Text>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>圈子名称</Text>
              <Input
                className={styles.formInput}
                placeholder='给你的圈子起个名字'
                value={formName}
                onInput={(e) => setFormName(e.detail.value)}
                maxlength={20}
              />
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>圈子类型</Text>
              <View className={styles.typeGrid}>
                {CIRCLE_TYPE_OPTIONS.map(opt => (
                  <View
                    key={opt.key}
                    className={`${styles.typeOption} ${formType === opt.key ? styles.typeOptionActive : ''}`}
                    onClick={() => setFormType(opt.key)}
                  >
                    <Text className={styles.typeOptionIcon}>{opt.icon}</Text>
                    <Text className={styles.typeOptionLabel}>{opt.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>加入方式</Text>
              <View className={styles.accessRow}>
                <View
                  className={`${styles.accessBtn} ${formAccess === 'public' ? styles.accessBtnActive : ''}`}
                  onClick={() => setFormAccess('public')}
                >
                  <Text className={styles.accessBtnText}>🌐 公开加入</Text>
                  <Text className={styles.accessBtnHint}>所有人可见，可自由加入</Text>
                </View>
                <View
                  className={`${styles.accessBtn} ${formAccess === 'open' ? styles.accessBtnActive : ''}`}
                  onClick={() => setFormAccess('open')}
                >
                  <Text className={styles.accessBtnText}>🔑 班级码加入</Text>
                  <Text className={styles.accessBtnHint}>凭班级码加入</Text>
                </View>
                <View
                  className={`${styles.accessBtn} ${formAccess === 'closed' ? styles.accessBtnActive : ''}`}
                  onClick={() => setFormAccess('closed')}
                >
                  <Text className={styles.accessBtnText}>🔒 邀请加入</Text>
                  <Text className={styles.accessBtnHint}>仅通过邀请加入</Text>
                </View>
              </View>
            </View>

            <View className={styles.formGroup}>
              <Text className={styles.formLabel}>圈子简介（选填）</Text>
              <Textarea
                className={styles.formTextarea}
                placeholder='介绍一下这个圈子的主题...'
                value={formDesc}
                onInput={(e) => setFormDesc(e.detail.value)}
                maxlength={200}
              />
            </View>

            <View className={styles.modalActions}>
              <View className={styles.modalCancel} onClick={() => setShowCreate(false)}>
                <Text className={styles.modalCancelText}>取消</Text>
              </View>
              <View
                className={`${styles.modalConfirm} ${creating ? styles.modalConfirmDisabled : ''}`}
                onClick={creating ? undefined : handleCreate}
              >
                <Text className={styles.modalConfirmText}>{creating ? '创建中...' : '创建'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default CirclePage;
