import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useAdminStore } from '@/store/admin';
import type { AdminUser, AccountStatus, UserMarkType } from '@/data/admin';
import styles from './index.module.scss';

// 筛选标签
type FilterTab = 'all' | AccountStatus;

const FILTER_TABS: Array<{ key: FilterTab; name: string }> = [
  { key: 'all', name: '全部' },
  { key: 'active', name: '正常' },
  { key: 'banned', name: '已封禁' },
  { key: 'marked', name: '已标记' },
];

// 状态文案
const STATUS_TEXT: Record<AccountStatus, string> = {
  active: '正常',
  banned: '已封禁',
  marked: '已标记',
};

// 状态样式
const STATUS_STYLE: Record<AccountStatus, string> = {
  active: styles.statusActive,
  banned: styles.statusBanned,
  marked: styles.statusMarked,
};

// 标记文案
const MARK_TEXT: Record<UserMarkType, string> = {
  normal: '普通',
  vip: 'VIP',
  verified: '已认证',
  suspect: '可疑',
};

// 标记样式
const MARK_STYLE: Record<UserMarkType, string> = {
  normal: styles.markNormal,
  vip: styles.markVip,
  verified: styles.markVerified,
  suspect: styles.markSuspect,
};

const AdminUsersPage: React.FC = () => {
  const {
    users,
    banUser,
    unbanUser,
    markUser,
    getUserById,
    getUserKindnessHistory,
    getUserFortuneFlows,
    getUserViolations,
    loadFromStorage,
  } = useAdminStore();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    loadFromStorage();
  }, []);

  // 各状态用户数量统计
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: users.length, active: 0, banned: 0, marked: 0 };
    users.forEach((u) => {
      counts[u.accountStatus] = (counts[u.accountStatus] || 0) + 1;
    });
    return counts;
  }, [users]);

  // 筛选后的用户列表
  const filteredUsers = useMemo(() => {
    let result = users;
    if (activeFilter !== 'all') {
      result = result.filter((u) => u.accountStatus === activeFilter);
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(kw) ||
          u.id.toLowerCase().includes(kw) ||
          (u.region && u.region.toLowerCase().includes(kw))
      );
    }
    return result;
  }, [users, activeFilter, searchKeyword]);

  // 封禁用户（二次确认）
  const handleBan = (user: AdminUser) => {
    Taro.showActionSheet({
      itemList: ['封禁3天', '封禁7天', '永久封禁'],
      success: (res) => {
        const durations = [3, 7, 0];
        const duration = durations[res.tapIndex];
        const durationText = res.tapIndex === 2 ? '永久封禁' : `封禁${duration}天`;
        Taro.showModal({
          title: '二次确认',
          content: `确定对用户"${user.name}"执行${durationText}吗？此操作将影响用户正常使用。`,
          // editable/placeholderText 是微信小程序扩展属性，Taro 类型定义未包含
          editable: true,
          placeholderText: '请输入封禁原因',
          success: (modalRes) => {
            if (modalRes.confirm) {
              const reason = (modalRes as { content?: string }).content || '违反社区规则';
              banUser(user.id, reason, duration);
              Taro.showToast({ title: `${durationText}已执行`, icon: 'success' });
              if (detailUser && detailUser.id === user.id) {
                setDetailUser(getUserById(user.id) || null);
              }
            }
          },
        } as any);
      },
    });
  };

  // 解封用户（二次确认）
  const handleUnban = (user: AdminUser) => {
    Taro.showModal({
      title: '二次确认',
      content: `确定解封用户"${user.name}"吗？解封后用户可正常使用所有功能。`,
      success: (res) => {
        if (res.confirm) {
          unbanUser(user.id);
          Taro.showToast({ title: '已解封', icon: 'success' });
          if (detailUser && detailUser.id === user.id) {
            setDetailUser(getUserById(user.id) || null);
          }
        }
      },
    });
  };

  // 标记用户
  const handleMark = (user: AdminUser) => {
    Taro.showActionSheet({
      itemList: ['标记为VIP', '标记为已认证', '标记为可疑', '取消标记'],
      success: (res) => {
        const markTypes: UserMarkType[] = ['vip', 'verified', 'suspect', 'normal'];
        const markType = markTypes[res.tapIndex];
        markUser(user.id, markType);
        Taro.showToast({ title: '标记已更新', icon: 'success' });
        if (detailUser && detailUser.id === user.id) {
          setDetailUser(getUserById(user.id) || null);
        }
      },
    });
  };

  // 打开详情
  const handleOpenDetail = (user: AdminUser) => {
    setDetailUser(user);
  };

  // 格式化时间
  const formatTime = (dateStr: string): string => {
    if (!dateStr) return '无';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // 获取详情数据
  const detailKindnessHistory = detailUser ? getUserKindnessHistory(detailUser.id) : [];
  const detailFortuneFlows = detailUser ? getUserFortuneFlows(detailUser.id) : [];
  const detailViolations = detailUser ? getUserViolations(detailUser.id) : [];

  return (
    <View className={styles.container}>
      {/* 顶部统计头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>用户管理</Text>
        <Text className={styles.headerDesc}>管理用户账号状态，处置违规用户</Text>
        <View className={styles.headerStats}>
          <View className={styles.headerStat}>
            <Text className={styles.headerStatValue}>{statusCounts.all}</Text>
            <Text className={styles.headerStatLabel}>总用户</Text>
          </View>
          <View className={styles.headerStat}>
            <Text className={styles.headerStatValue}>{statusCounts.active}</Text>
            <Text className={styles.headerStatLabel}>正常</Text>
          </View>
          <View className={styles.headerStat}>
            <Text className={styles.headerStatValue}>{statusCounts.banned}</Text>
            <Text className={styles.headerStatLabel}>已封禁</Text>
          </View>
        </View>
      </View>

      {/* 搜索栏 */}
      <View className={styles.searchBar}>
        <Input
          className={styles.searchInput}
          placeholder="搜索昵称/用户ID/地区"
          value={searchKeyword}
          onInput={(e) => setSearchKeyword(e.detail.value)}
        />
      </View>

      {/* 筛选标签栏 */}
      <ScrollView scrollX className={styles.filterBar} enhanced showScrollbar={false}>
        {FILTER_TABS.map((tab) => (
          <View
            key={tab.key}
            className={classnames(styles.filterItem, activeFilter === tab.key && styles.active)}
            onClick={() => setActiveFilter(tab.key)}
          >
            <Text className={styles.filterText}>{tab.name} ({statusCounts[tab.key] || 0})</Text>
          </View>
        ))}
      </ScrollView>

      {/* 用户列表 */}
      <View className={styles.content}>
        {filteredUsers.length === 0 ? (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>👥</Text>
            <Text className={styles.emptyText}>暂无用户数据</Text>
          </View>
        ) : (
          filteredUsers.map((user) => (
            <View key={user.id} className={styles.userCard}>
              <View className={styles.userHeader}>
                <Image
                  className={styles.userAvatar}
                  src={user.avatar}
                  mode="aspectFill"
                  onError={(e) => console.error('[AdminUsers] Avatar load error:', e)}
                />
                <View className={styles.userInfo}>
                  <Text className={styles.userName}>
                    {user.name}
                    <Text className={classnames(styles.markTag, MARK_STYLE[user.markType])}>
                      {MARK_TEXT[user.markType]}
                    </Text>
                  </Text>
                  <Text className={styles.userMeta}>
                    {user.region} · 注册于 {formatTime(user.createdAt)}
                  </Text>
                </View>
                <View className={classnames(styles.statusTag, STATUS_STYLE[user.accountStatus])}>
                  <Text>{STATUS_TEXT[user.accountStatus]}</Text>
                </View>
              </View>

              <View className={styles.userStats}>
                <View className={styles.userStat}>
                  <Text className={styles.userStatValue}>{user.kindnessCount}</Text>
                  <Text className={styles.userStatLabel}>善行</Text>
                </View>
                <View className={styles.userStat}>
                  <Text className={styles.userStatValue}>{user.witnessCount}</Text>
                  <Text className={styles.userStatLabel}>见证</Text>
                </View>
                <View className={styles.userStat}>
                  <Text className={styles.userStatValue}>{user.blessingValue}</Text>
                  <Text className={styles.userStatLabel}>福气</Text>
                </View>
                <View className={styles.userStat}>
                  <Text className={styles.userStatValue}>{user.violationCount}</Text>
                  <Text className={styles.userStatLabel}>违规</Text>
                </View>
              </View>

              <View className={styles.userActions}>
                {user.accountStatus === 'banned' ? (
                  <View
                    className={classnames(styles.actionBtn, styles.actionUnban)}
                    onClick={() => handleUnban(user)}
                  >
                    <Text className={styles.actionBtnText}>解封</Text>
                  </View>
                ) : (
                  <View
                    className={classnames(styles.actionBtn, styles.actionBan)}
                    onClick={() => handleBan(user)}
                  >
                    <Text className={styles.actionBtnText}>封禁</Text>
                  </View>
                )}
                <View
                  className={classnames(styles.actionBtn, styles.actionMark)}
                  onClick={() => handleMark(user)}
                >
                  <Text className={styles.actionBtnText}>标记</Text>
                </View>
                <View
                  className={classnames(styles.actionBtn, styles.actionDetail)}
                  onClick={() => handleOpenDetail(user)}
                >
                  <Text className={styles.actionDetailText}>详情</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {/* 用户详情弹窗 */}
      {detailUser && (
        <View className={styles.detailMask} onClick={() => setDetailUser(null)}>
          <View className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>用户详情</Text>
              <Text className={styles.detailClose} onClick={() => setDetailUser(null)}>✕</Text>
            </View>

            <View className={styles.detailBody}>
              {/* 用户基本信息 */}
              <View className={styles.detailSection}>
                <Text className={styles.detailSectionTitle}>基本信息</Text>
                <View className={styles.detailUserCard}>
                  <Image
                    className={styles.detailAvatar}
                    src={detailUser.avatar}
                    mode="aspectFill"
                  />
                  <View>
                    <Text className={styles.detailUserName}>
                      {detailUser.name}
                      <Text className={classnames(styles.markTag, MARK_STYLE[detailUser.markType])}>
                        {MARK_TEXT[detailUser.markType]}
                      </Text>
                    </Text>
                    {detailUser.bio && (
                      <Text className={styles.detailUserBio}>{detailUser.bio}</Text>
                    )}
                    <Text className={styles.detailUserMeta}>
                      ID: {detailUser.id} · {detailUser.region}
                    </Text>
                    <Text className={styles.detailUserMeta}>
                      注册: {formatTime(detailUser.createdAt)}
                    </Text>
                    <Text className={styles.detailUserMeta}>
                      最后活跃: {formatTime(detailUser.lastActiveAt)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 封禁信息 */}
              {detailUser.accountStatus === 'banned' && detailUser.bannedReason && (
                <View className={styles.detailSection}>
                  <Text className={styles.detailSectionTitle}>封禁信息</Text>
                  <View className={styles.banInfo}>
                    <Text className={styles.banReason}>封禁原因: {detailUser.bannedReason}</Text>
                    <Text className={styles.banMeta}>
                      封禁时间: {formatTime(detailUser.bannedAt || '')}
                    </Text>
                    <Text className={styles.banMeta}>
                      封禁时长: {detailUser.bannedDuration === 0 ? '永久封禁' : `${detailUser.bannedDuration}天`}
                    </Text>
                  </View>
                </View>
              )}

              {/* 善行历史 */}
              <View className={styles.detailSection}>
                <Text className={styles.detailSectionTitle}>
                  善行历史 ({detailKindnessHistory.length})
                </Text>
                {detailKindnessHistory.length === 0 ? (
                  <Text className={styles.emptyText}>暂无善行记录</Text>
                ) : (
                  detailKindnessHistory.slice(0, 5).map((k) => (
                    <View key={k.id} className={styles.historyItem}>
                      <Text className={styles.historyContent}>{k.content}</Text>
                      <Text className={styles.historyMeta}>
                        {formatTime(k.createdAt)} · 福气+{k.blessingValue} · {k.status}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {/* 福气流水 */}
              <View className={styles.detailSection}>
                <Text className={styles.detailSectionTitle}>
                  福气流水 ({detailFortuneFlows.length})
                </Text>
                {detailFortuneFlows.length === 0 ? (
                  <Text className={styles.emptyText}>暂无福气流水</Text>
                ) : (
                  detailFortuneFlows.slice(0, 10).map((f) => (
                    <View key={f.id} className={styles.flowItem}>
                      <View className={styles.flowInfo}>
                        <Text className={styles.flowDesc}>{f.description}</Text>
                        <Text className={styles.flowTime}>{formatTime(f.createdAt)}</Text>
                      </View>
                      <Text className={classnames(styles.flowAmount, f.amount >= 0 ? styles.flowPositive : styles.flowNegative)}>
                        {f.amount >= 0 ? '+' : ''}{f.amount}
                      </Text>
                    </View>
                  ))
                )}
              </View>

              {/* 违规记录 */}
              <View className={styles.detailSection}>
                <Text className={styles.detailSectionTitle}>
                  违规记录 ({detailViolations.length})
                </Text>
                {detailViolations.length === 0 ? (
                  <Text className={styles.emptyText}>暂无违规记录</Text>
                ) : (
                  detailViolations.map((v) => (
                    <View key={v.id} className={styles.violationItem}>
                      <Text className={styles.violationDesc}>{v.description}</Text>
                      <Text className={styles.violationMeta}>
                        处罚: {v.penalty} · {formatTime(v.createdAt)} · 操作人: {v.operator}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* 底部操作 */}
            <View className={styles.detailFooter}>
              {detailUser.accountStatus === 'banned' ? (
                <View
                  className={classnames(styles.actionBtn, styles.actionUnban)}
                  onClick={() => handleUnban(detailUser)}
                >
                  <Text className={styles.actionBtnText}>解封用户</Text>
                </View>
              ) : (
                <View
                  className={classnames(styles.actionBtn, styles.actionBan)}
                  onClick={() => handleBan(detailUser)}
                >
                  <Text className={styles.actionBtnText}>封禁用户</Text>
                </View>
              )}
              <View
                className={classnames(styles.actionBtn, styles.actionMark)}
                onClick={() => handleMark(detailUser)}
              >
                <Text className={styles.actionBtnText}>标记用户</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default AdminUsersPage;
