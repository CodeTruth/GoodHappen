import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  useNotificationStore,
  NotificationCategory,
  NotificationItem,
} from '@/store/notification';
import styles from './index.module.scss';

// 消息分类配置
const CATEGORY_CONFIG: {
  key: NotificationCategory;
  label: string;
  icon: string;
}[] = [
  { key: 'interaction', label: '互动消息', icon: '💬' },
  { key: 'system', label: '系统消息', icon: '⚙️' },
  { key: 'charity', label: '公益消息', icon: '🤝' },
  { key: 'warm', label: '温暖消息', icon: '🌙' },
];

const NotificationsPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('interaction');
  const [showSettings, setShowSettings] = useState(false);

  const {
    notifications,
    settings,
    loadFromStorage,
    loadMockData,
    cleanupExpired,
    markAsRead,
    markCategoryAsRead,
    removeNotification,
    getCategoryUnreadCount,
    getCategoryNotifications,
    updateSettings,
    isDndActive,
    getTemplate,
  } = useNotificationStore();

  // 初始化
  useEffect(() => {
    loadFromStorage();
    loadMockData();
    cleanupExpired();
  }, []);

  // 当前分类的消息列表
  const currentList = useMemo(() => {
    return getCategoryNotifications(activeCategory);
  }, [notifications, activeCategory, getCategoryNotifications]);

  // 各分类未读数
  const unreadCounts = useMemo(() => {
    return {
      interaction: getCategoryUnreadCount('interaction'),
      system: getCategoryUnreadCount('system'),
      charity: getCategoryUnreadCount('charity'),
      warm: getCategoryUnreadCount('warm'),
    };
  }, [notifications, getCategoryUnreadCount]);

  // 总未读数
  const totalUnread = useMemo(() => {
    return Object.values(unreadCounts).reduce((sum, n) => sum + n, 0);
  }, [unreadCounts]);

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 判断消息是否可关闭
  const isClosable = (item: NotificationItem): boolean => {
    const template = getTemplate(item.type);
    return item.closable ?? template.closable;
  };

  const handleItemClick = (item: NotificationItem) => {
    if (!item.read) {
      markAsRead(item.id);
    }
    // 如果有关联ID，跳转到详情
    if (item.relatedId && (item.type === 'like' || item.type === 'comment' || item.type === 'mention' || item.type === 'matched' || item.type === 'moderation' || item.type === 'good_deed_witnessed')) {
      Taro.navigateTo({ url: `/pages/detail/index?id=${item.relatedId}` });
    } else if (item.type === 'ai_response' && item.relatedId) {
      // AI回应通知跳转到对话页
      Taro.navigateTo({ url: `/pages/ai-chat/index?characterId=${item.relatedId}` });
    } else if (item.type === 'level_up') {
      // 等级升级通知跳转到我的页查看等级
      Taro.switchTab({ url: '/pages/mine/index' });
    }
  };

  const handleMarkAllRead = () => {
    markCategoryAsRead(activeCategory);
    Taro.showToast({ title: '已全部标记为已读', icon: 'success' });
  };

  const handleDelete = (item: NotificationItem) => {
    if (!isClosable(item)) {
      Taro.showToast({ title: '公益消息不可删除', icon: 'none' });
      return;
    }
    const ok = removeNotification(item.id);
    if (ok) {
      Taro.showToast({ title: '已删除', icon: 'success' });
    }
  };

  const handleDndToggle = (value: boolean) => {
    updateSettings({ dndEnabled: value });
  };

  const handleDndCharityExceptionToggle = (value: boolean) => {
    updateSettings({ dndCharityException: value });
  };

  const handleAppPushToggle = (value: boolean) => {
    updateSettings({ appPushEnabled: value });
  };

  const handleEmailToggle = (value: boolean) => {
    updateSettings({ emailEnabled: value });
  };

  const dndActive = isDndActive();

  return (
    <View className={styles.container}>
      {/* 顶部操作栏 */}
      <View className={styles.topBar}>
        <Text className={styles.topBarTitle}>
          消息{totalUnread > 0 ? ` · ${totalUnread}条未读` : ''}
        </Text>
        <View className={styles.topBarActions}>
          <Text
            className={styles.topBarAction}
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? '返回消息' : '⚙️ 设置'}
          </Text>
        </View>
      </View>

      {/* 免打扰状态提示 */}
      {dndActive && (
        <View className={styles.dndBanner}>
          <Text className={styles.dndBannerText}>
            🔇 免打扰时段（{settings.dndStart}-{settings.dndEnd}）
            {settings.dndCharityException ? '，公益接单消息例外' : '，新消息不会提醒'}
          </Text>
        </View>
      )}

      {/* 设置面板 */}
      {showSettings ? (
        <ScrollView className={styles.settingsScroll} scrollY>
          <View className={styles.settingsPanel}>
            <Text className={styles.settingsTitle}>推送渠道</Text>
            <View className={styles.settingItem}>
              <View className={styles.settingInfo}>
                <Text className={styles.settingLabel}>App推送</Text>
                <Text className={styles.settingDesc}>接收App内推送提醒（模拟）</Text>
              </View>
              <Switch
                checked={settings.appPushEnabled}
                onChange={(e) => handleAppPushToggle(e.detail.value)}
                color="#FF6B6B"
              />
            </View>
            <View className={styles.settingItem}>
              <View className={styles.settingInfo}>
                <Text className={styles.settingLabel}>邮件通知</Text>
                <Text className={styles.settingDesc}>重要消息通过邮件通知（可选）</Text>
              </View>
              <Switch
                checked={settings.emailEnabled}
                onChange={(e) => handleEmailToggle(e.detail.value)}
                color="#FF6B6B"
              />
            </View>

            <Text className={styles.settingsTitle}>免打扰设置</Text>
            <View className={styles.settingItem}>
              <View className={styles.settingInfo}>
                <Text className={styles.settingLabel}>开启免打扰</Text>
                <Text className={styles.settingDesc}>
                  在指定时段内不接收消息提醒
                </Text>
              </View>
              <Switch
                checked={settings.dndEnabled}
                onChange={(e) => handleDndToggle(e.detail.value)}
                color="#FF6B6B"
              />
            </View>
            {settings.dndEnabled && (
              <>
                <View className={styles.timeRange}>
                  <View className={styles.timePicker}>
                    <Text className={styles.timeLabel}>开始时间</Text>
                    <Text className={styles.timeValue}>{settings.dndStart}</Text>
                  </View>
                  <Text className={styles.timeSeparator}>至</Text>
                  <View className={styles.timePicker}>
                    <Text className={styles.timeLabel}>结束时间</Text>
                    <Text className={styles.timeValue}>{settings.dndEnd}</Text>
                  </View>
                </View>
                <View className={styles.settingItem}>
                  <View className={styles.settingInfo}>
                    <Text className={styles.settingLabel}>公益接单例外</Text>
                    <Text className={styles.settingDesc}>
                      免打扰时段仍接收公益接单/超时/完成消息
                    </Text>
                  </View>
                  <Switch
                    checked={settings.dndCharityException}
                    onChange={(e) => handleDndCharityExceptionToggle(e.detail.value)}
                    color="#FF6B6B"
                  />
                </View>
              </>
            )}
            <View className={styles.settingTip}>
              <Text className={styles.settingTipText}>
                💡 消息默认保留90天，超期自动清理。公益消息不可删除。
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <>
          {/* 分类Tab */}
          <ScrollView className={styles.categoryTabs} scrollX enableFlex>
            <View className={styles.categoryTabsInner}>
              {CATEGORY_CONFIG.map((cat) => (
                <View
                  key={cat.key}
                  className={`${styles.categoryTab} ${activeCategory === cat.key ? styles.categoryTabActive : ''}`}
                  onClick={() => setActiveCategory(cat.key)}
                >
                  <Text className={styles.categoryIcon}>{cat.icon}</Text>
                  <Text className={styles.categoryLabel}>{cat.label}</Text>
                  {unreadCounts[cat.key] > 0 && (
                    <View className={styles.unreadDot}>
                      <Text className={styles.unreadDotText}>
                        {unreadCounts[cat.key] > 99 ? '99+' : unreadCounts[cat.key]}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* 全部已读按钮 */}
          {unreadCounts[activeCategory] > 0 && (
            <View className={styles.actionBar}>
              <Text className={styles.actionBarText}>
                {unreadCounts[activeCategory]}条未读
              </Text>
              <Text className={styles.actionBtn} onClick={handleMarkAllRead}>
                全部已读
              </Text>
            </View>
          )}

          {/* 消息列表 */}
          <ScrollView className={styles.messageList} scrollY enableBackToTop>
            {currentList.length > 0 ? (
              currentList.map((item) => {
                const template = getTemplate(item.type);
                const closable = isClosable(item);
                return (
                  <View
                    key={item.id}
                    className={`${styles.messageItem} ${!item.read ? styles.messageUnread : ''}`}
                    onClick={() => handleItemClick(item)}
                  >
                    {/* 左侧主题色条（消息模板配色） */}
                    <View className={styles.messageAccent} style={{ background: template.accentColor }} />
                    <View className={styles.messageIcon}>
                      <Text className={styles.iconText}>
                        {template.icon}
                      </Text>
                    </View>
                    <View className={styles.messageBody}>
                      <View className={styles.messageHeader}>
                        <Text className={styles.messageTitle}>{item.title}</Text>
                        <Text className={styles.messageTime}>{formatTime(item.createdAt)}</Text>
                      </View>
                      <Text className={styles.messageContent}>{item.content}</Text>
                      {/* 公益消息不可删除提示 */}
                      {!closable && (
                        <View className={styles.unclosableTag}>
                          <Text className={styles.unclosableTagText}>不可删除</Text>
                        </View>
                      )}
                    </View>
                    <View className={styles.messageActions}>
                      {!item.read && <View className={styles.unreadIndicator} />}
                      {closable && (
                        <Text className={styles.deleteBtn} onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item);
                        }}>
                          删除
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <View className={styles.empty}>
                <Text className={styles.emptyIcon}>📭</Text>
                <Text className={styles.emptyText}>暂无消息</Text>
              </View>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
};

export default NotificationsPage;
