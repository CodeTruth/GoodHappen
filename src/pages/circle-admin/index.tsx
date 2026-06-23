import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useCircleStore, ROLE_NAMES } from '@/store/circle';
import {
  useCheckinStore,
  CheckinCategory,
  CATEGORY_INFO,
} from '@/store/checkin';
import { useUserStore } from '@/store/user';
import styles from './index.module.scss';

// 仪表盘标签页
type AdminTab = 'overview' | 'attention' | 'feed' | 'tasks' | 'monthly' | 'annual';

const TABS: Array<{ key: AdminTab; name: string; icon: string }> = [
  { key: 'overview', name: '团体概况', icon: '📊' },
  { key: 'attention', name: '需关注', icon: '💛' },
  { key: 'feed', name: '动态流', icon: '📰' },
  { key: 'tasks', name: '打卡管理', icon: '📋' },
  { key: 'monthly', name: '月度汇总', icon: '📈' },
  { key: 'annual', name: '年度报告', icon: '🎯' },
];

const CircleAdminPage: React.FC = () => {
  const router = useRouter();
  const { id: circleId } = router.params;
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  // 动态流品类筛选
  const [feedFilter, setFeedFilter] = useState<CheckinCategory | 'all'>('all');

  const {
    getCircleById,
    getAttentionList,
    hasPermission,
    loadFromStorage: loadCircleFromStorage,
  } = useCircleStore();
  const {
    getCircleCheckins,
    getCircleTasks,
    getTaskCompletionRate,
    closeTask,
    loadFromStorage: loadCheckinFromStorage,
  } = useCheckinStore();
  const { userInfo, loadFromStorage: loadUserFromStorage } = useUserStore();

  useEffect(() => {
    loadCircleFromStorage();
    loadCheckinFromStorage();
    loadUserFromStorage();
  }, []);

  const circle = circleId ? getCircleById(circleId) : undefined;
  const attentionList = circleId ? getAttentionList(circleId) : [];
  const circleCheckins = circleId ? getCircleCheckins(circleId) : [];
  const circleTasks = circleId ? getCircleTasks(circleId) : [];

  // 权限检查：仅管理员和组长可访问
  const canViewSummary = userInfo && circleId
    ? hasPermission(circleId, userInfo.id, 'view_circle_summary')
    : false;
  const canManageTasks = userInfo && circleId
    ? hasPermission(circleId, userInfo.id, 'create_checkin_task')
    : false;

  // 团体概况数据
  const overviewData = useMemo(() => {
    if (!circle) return null;
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCheckins = circleCheckins.filter(c => new Date(c.createdAt) >= weekAgo);

    // 品类分布
    const categoryCount: Record<CheckinCategory, number> = {
      warm: 0,
      growth: 0,
      positive: 0,
    };
    circleCheckins.forEach(c => {
      categoryCount[c.category]++;
    });
    const total = circleCheckins.length || 1;

    return {
      participantCount: circle.members.filter(m => m.lastCheckinDate).length,
      totalMembers: circle.members.length,
      weekCount: weekCheckins.length,
      categoryCount,
      categoryPercent: {
        warm: Math.round((categoryCount.warm / total) * 100),
        growth: Math.round((categoryCount.growth / total) * 100),
        positive: Math.round((categoryCount.positive / total) * 100),
      },
    };
  }, [circle, circleCheckins]);

  // 筛选后的动态流
  const filteredCheckins = useMemo(() => {
    if (feedFilter === 'all') return circleCheckins;
    return circleCheckins.filter(c => c.category === feedFilter);
  }, [circleCheckins, feedFilter]);

  // 月度汇总数据（按成员编号排列，不按数值排序！）
  const monthlyData = useMemo(() => {
    if (!circle) return [];
    // 按成员编号排列（不按数值排序）
    const sortedMembers = [...circle.members].sort((a, b) => a.memberNumber - b.memberNumber);
    return sortedMembers.map(member => {
      const memberCheckins = circleCheckins.filter(c => c.userId === member.userId);
      const warmCount = memberCheckins.filter(c => c.category === 'warm').length;
      const growthCount = memberCheckins.filter(c => c.category === 'growth').length;
      const positiveCount = memberCheckins.filter(c => c.category === 'positive').length;
      const maxCount = Math.max(warmCount, growthCount, positiveCount, 10); // 用于进度条归一化
      return {
        member,
        warmCount,
        growthCount,
        positiveCount,
        total: memberCheckins.length,
        warmPercent: Math.round((warmCount / maxCount) * 100),
        growthPercent: Math.round((growthCount / maxCount) * 100),
        positivePercent: Math.round((positiveCount / maxCount) * 100),
      };
    });
  }, [circle, circleCheckins]);

  // 班级总计（唯一公开数字）
  const classTotal = useMemo(() => {
    return circleCheckins.length;
  }, [circleCheckins]);

  // 年度成长报告：善行热力图数据
  const heatmapData = useMemo(() => {
    // 生成最近 365 天的热力图数据
    const days: Array<{ date: string; count: number; level: number }> = [];
    const now = new Date();
    for (let i = 364; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = circleCheckins.filter(c => c.date === dateStr).length;
      // 热力等级：0-4
      let level = 0;
      if (count > 0) level = 1;
      if (count >= 3) level = 2;
      if (count >= 6) level = 3;
      if (count >= 10) level = 4;
      days.push({ date: dateStr, count, level });
    }
    return days;
  }, [circleCheckins]);

  // 年度品类分布
  const annualCategoryData = useMemo(() => {
    const warm = circleCheckins.filter(c => c.category === 'warm').length;
    const growth = circleCheckins.filter(c => c.category === 'growth').length;
    const positive = circleCheckins.filter(c => c.category === 'positive').length;
    const total = warm + growth + positive || 1;
    return {
      warm,
      growth,
      positive,
      warmPercent: Math.round((warm / total) * 100),
      growthPercent: Math.round((growth / total) * 100),
      positivePercent: Math.round((positive / total) * 100),
    };
  }, [circleCheckins]);

  // 权限不足提示
  if (!circle) {
    return (
      <View className={styles.container}>
        <View className={styles.empty}>
          <Text className={styles.emptyText}>团体不存在</Text>
        </View>
      </View>
    );
  }

  if (!canViewSummary) {
    return (
      <View className={styles.container}>
        <View className={styles.empty}>
          <Text className={styles.emptyIcon}>🔒</Text>
          <Text className={styles.emptyText}>仅组长和管理员可查看团体管理</Text>
        </View>
      </View>
    );
  }

  // 处理私信关心
  const handleSendMessage = (memberName: string) => {
    Taro.showToast({
      title: `已发送关心消息给${memberName}`,
      icon: 'success',
    });
  };

  // 处理关闭任务
  const handleCloseTask = (taskId: string) => {
    Taro.showModal({
      title: '关闭任务',
      content: '确定关闭该打卡任务吗？关闭后成员将无法继续打卡',
      success: (res) => {
        if (res.confirm) {
          closeTask(taskId);
          Taro.showToast({ title: '任务已关闭', icon: 'success' });
        }
      }
    });
  };

  // 处理创建任务
  const handleCreateTask = () => {
    if (!canManageTasks) {
      Taro.showToast({ title: '仅管理员可创建任务', icon: 'none' });
      return;
    }
    Taro.showToast({ title: '任务创建功能开发中', icon: 'none' });
  };

  // 格式化时间
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    if (hours < 48) return '昨天';
    return date.toLocaleDateString('zh-CN');
  };

  // 热力图颜色
  const getHeatmapColor = (level: number): string => {
    const colors = ['#f2f3f5', '#FFE8E8', '#FFB3B3', '#FF8080', '#FF6B6B'];
    return colors[level] || colors[0];
  };

  return (
    <View className={styles.container}>
      {/* 团体信息头部 */}
      <View className={styles.header}>
        <Text className={styles.circleName}>{circle.name}</Text>
        <Text className={styles.circleDesc}>{circle.description}</Text>
        <View className={styles.headerStats}>
          <View className={styles.headerStat}>
            <Text className={styles.headerStatValue}>{circle.members.length}</Text>
            <Text className={styles.headerStatLabel}>总成员</Text>
          </View>
          <View className={styles.headerStat}>
            <Text className={styles.headerStatValue}>{circleCheckins.length}</Text>
            <Text className={styles.headerStatLabel}>总善行</Text>
          </View>
          <View className={styles.headerStat}>
            <Text className={styles.headerStatValue}>{circleTasks.length}</Text>
            <Text className={styles.headerStatLabel}>打卡任务</Text>
          </View>
        </View>
      </View>

      {/* 标签页导航 */}
      <ScrollView scrollX className={styles.tabNav} enhanced showScrollbar={false}>
        {TABS.map(tab => (
          <View
            key={tab.key}
            className={`${styles.tabItem} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text className={styles.tabIcon}>{tab.icon}</Text>
            <Text className={styles.tabName}>{tab.name}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 团体概况 */}
      {activeTab === 'overview' && overviewData && (
        <View className={styles.content}>
          <View className={styles.card}>
            <Text className={styles.cardTitle}>📊 团体概况</Text>
            <View className={styles.statsGrid}>
              <View className={styles.statBox}>
                <Text className={styles.statValue}>{overviewData.participantCount}/{overviewData.totalMembers}</Text>
                <Text className={styles.statLabel}>参与人数</Text>
              </View>
              <View className={styles.statBox}>
                <Text className={styles.statValue}>{overviewData.weekCount}</Text>
                <Text className={styles.statLabel}>本周善行</Text>
              </View>
            </View>
          </View>

          {/* 品类分布饼图（CSS 实现） */}
          <View className={styles.card}>
            <Text className={styles.cardTitle}>品类分布</Text>
            <View className={styles.pieChartContainer}>
              <View
                className={styles.pieChart}
                style={{
                  background: `conic-gradient(
                    ${CATEGORY_INFO.warm.color} 0% ${overviewData.categoryPercent.warm}%,
                    ${CATEGORY_INFO.growth.color} ${overviewData.categoryPercent.warm}% ${overviewData.categoryPercent.warm + overviewData.categoryPercent.growth}%,
                    ${CATEGORY_INFO.positive.color} ${overviewData.categoryPercent.warm + overviewData.categoryPercent.growth}% 100%
                  )`
                }}
              />
              <View className={styles.pieLegend}>
                <View className={styles.legendItem}>
                  <View className={styles.legendDot} style={{ background: CATEGORY_INFO.warm.color }} />
                  <Text className={styles.legendText}>{CATEGORY_INFO.warm.icon} 温暖的事</Text>
                  <Text className={styles.legendValue}>{overviewData.categoryCount.warm}</Text>
                </View>
                <View className={styles.legendItem}>
                  <View className={styles.legendDot} style={{ background: CATEGORY_INFO.growth.color }} />
                  <Text className={styles.legendText}>{CATEGORY_INFO.growth.icon} 成长的事</Text>
                  <Text className={styles.legendValue}>{overviewData.categoryCount.growth}</Text>
                </View>
                <View className={styles.legendItem}>
                  <View className={styles.legendDot} style={{ background: CATEGORY_INFO.positive.color }} />
                  <Text className={styles.legendText}>{CATEGORY_INFO.positive.icon} 正能量的事</Text>
                  <Text className={styles.legendValue}>{overviewData.categoryCount.positive}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* 需关注提醒 */}
      {activeTab === 'attention' && (
        <View className={styles.content}>
          <View className={styles.card}>
            <Text className={styles.cardTitle}>💛 需关注提醒</Text>
            <Text className={styles.cardDesc}>连续7天未打卡的成员，可以发条消息关心一下</Text>
            {attentionList.length === 0 ? (
              <View className={styles.empty}>
                <Text className={styles.emptyText}>大家都很好，无需关注 🎉</Text>
              </View>
            ) : (
              attentionList.map(member => (
                <View key={member.id} className={styles.attentionItem}>
                  <View className={styles.attentionInfo}>
                    <Text className={styles.attentionName}>{member.userName}</Text>
                    <Text className={styles.attentionMeta}>
                      编号 #{member.memberNumber} · {ROLE_NAMES[member.role]}
                    </Text>
                    <Text className={styles.attentionLast}>
                      上次打卡：{member.lastCheckinDate || '从未打卡'}
                    </Text>
                  </View>
                  <View
                    className={styles.attentionBtn}
                    onClick={() => handleSendMessage(member.userName)}
                  >
                    <Text className={styles.attentionBtnText}>💬 关心</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {/* 团体动态流 */}
      {activeTab === 'feed' && (
        <View className={styles.content}>
          <View className={styles.card}>
            <Text className={styles.cardTitle}>📰 团体动态流</Text>
            {/* 品类筛选 */}
            <ScrollView scrollX className={styles.filterBar} enhanced showScrollbar={false}>
              <View
                className={`${styles.filterTag} ${feedFilter === 'all' ? styles.active : ''}`}
                onClick={() => setFeedFilter('all')}
              >
                <Text className={styles.filterText}>全部</Text>
              </View>
              {(Object.keys(CATEGORY_INFO) as CheckinCategory[]).map(cat => (
                <View
                  key={cat}
                  className={`${styles.filterTag} ${feedFilter === cat ? styles.active : ''}`}
                  onClick={() => setFeedFilter(cat)}
                >
                  <Text className={styles.filterText}>
                    {CATEGORY_INFO[cat].icon} {CATEGORY_INFO[cat].name}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {filteredCheckins.length === 0 ? (
              <View className={styles.empty}>
                <Text className={styles.emptyText}>暂无动态</Text>
              </View>
            ) : (
              filteredCheckins.map(checkin => (
                <View key={checkin.id} className={styles.feedItem}>
                  <View className={styles.feedHeader}>
                    <Text className={styles.feedUser}>{checkin.userName}</Text>
                    <Text className={styles.feedCategory}>
                      {CATEGORY_INFO[checkin.category].icon} {checkin.subcategory}
                    </Text>
                  </View>
                  <Text className={styles.feedContent}>{checkin.content}</Text>
                  {checkin.aiSummary && (
                    <View className={styles.feedAISummary}>
                      <Text className={styles.feedAISummaryText}>✨ {checkin.aiSummary}</Text>
                    </View>
                  )}
                  <Text className={styles.feedTime}>{formatTime(checkin.createdAt)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}

      {/* 打卡管理 */}
      {activeTab === 'tasks' && (
        <View className={styles.content}>
          <View className={styles.card}>
            <View className={styles.cardHeader}>
              <Text className={styles.cardTitle}>📋 打卡任务管理</Text>
              {canManageTasks && (
                <View className={styles.createBtn} onClick={handleCreateTask}>
                  <Text className={styles.createBtnText}>+ 创建</Text>
                </View>
              )}
            </View>
            {circleTasks.length === 0 ? (
              <View className={styles.empty}>
                <Text className={styles.emptyText}>暂无打卡任务</Text>
              </View>
            ) : (
              circleTasks.map(task => {
                const rate = getTaskCompletionRate(task.id);
                return (
                  <View key={task.id} className={styles.taskItem}>
                    <View className={styles.taskHeader}>
                      <Text className={styles.taskTitle}>{task.title}</Text>
                      <View className={`${styles.taskStatus} ${task.isActive ? styles.active : styles.closed}`}>
                        <Text className={styles.taskStatusText}>
                          {task.isActive ? '进行中' : '已关闭'}
                        </Text>
                      </View>
                    </View>
                    {task.description && (
                      <Text className={styles.taskDesc}>{task.description}</Text>
                    )}
                    <View className={styles.taskMeta}>
                      <Text className={styles.taskCategory}>
                        {CATEGORY_INFO[task.category].icon} {CATEGORY_INFO[task.category].name}
                      </Text>
                      <Text className={styles.taskFreq}>
                        {task.frequency === 'daily' ? '每日' : task.frequency === 'weekly' ? '每周' : `每${task.customDays}天`}
                      </Text>
                    </View>
                    {/* 完成率进度条 */}
                    <View className={styles.completionBar}>
                      <View className={styles.completionInfo}>
                        <Text className={styles.completionLabel}>完成率</Text>
                        <Text className={styles.completionValue}>{rate}%</Text>
                      </View>
                      <View className={styles.progressBar}>
                        <View
                          className={styles.progressFill}
                          style={{ width: `${rate}%`, background: CATEGORY_INFO[task.category].color }}
                        />
                      </View>
                      <Text className={styles.completionDetail}>
                        {task.totalCompletions}次 / {task.participantCount}人
                      </Text>
                    </View>
                    {canManageTasks && task.isActive && (
                      <View className={styles.taskActions}>
                        <View
                          className={styles.taskActionBtn}
                          onClick={() => handleCloseTask(task.id)}
                        >
                          <Text className={styles.taskActionText}>关闭任务</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>
      )}

      {/* 月度汇总表 */}
      {activeTab === 'monthly' && (
        <View className={styles.content}>
          <View className={styles.card}>
            <Text className={styles.cardTitle}>📈 月度汇总表</Text>
            <Text className={styles.cardDesc}>按成员编号排列，品类用进度条展示</Text>

            {/* 表头 */}
            <View className={styles.tableHeader}>
              <Text className={styles.colNumber}>编号</Text>
              <Text className={styles.colName}>成员</Text>
              <Text className={styles.colCategory}>品类分布（进度条）</Text>
            </View>

            {/* 表体：按编号排列，不按数值排序！ */}
            {monthlyData.map(item => (
              <View key={item.member.id} className={styles.tableRow}>
                <Text className={styles.colNumber}>#{item.member.memberNumber}</Text>
                <Text className={styles.colName}>{item.member.userName}</Text>
                <View className={styles.colCategory}>
                  {/* 品类用进度条而非数字 */}
                  <View className={styles.categoryBar}>
                    <Text className={styles.categoryBarLabel}>{CATEGORY_INFO.warm.icon}</Text>
                    <View className={styles.barTrack}>
                      <View
                        className={styles.barFill}
                        style={{ width: `${item.warmPercent}%`, background: CATEGORY_INFO.warm.color }}
                      />
                    </View>
                  </View>
                  <View className={styles.categoryBar}>
                    <Text className={styles.categoryBarLabel}>{CATEGORY_INFO.growth.icon}</Text>
                    <View className={styles.barTrack}>
                      <View
                        className={styles.barFill}
                        style={{ width: `${item.growthPercent}%`, background: CATEGORY_INFO.growth.color }}
                      />
                    </View>
                  </View>
                  <View className={styles.categoryBar}>
                    <Text className={styles.categoryBarLabel}>{CATEGORY_INFO.positive.icon}</Text>
                    <View className={styles.barTrack}>
                      <View
                        className={styles.barFill}
                        style={{ width: `${item.positivePercent}%`, background: CATEGORY_INFO.positive.color }}
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}

            {/* 班级总计（唯一公开数字） */}
            <View className={styles.tableFooter}>
              <Text className={styles.footerLabel}>班级总计</Text>
              <Text className={styles.footerValue}>{classTotal} 件善行</Text>
            </View>
            <Text className={styles.footerHint}>注：班级总计是唯一公开数字，个人数据仅自己可见</Text>
          </View>
        </View>
      )}

      {/* 年度成长报告 */}
      {activeTab === 'annual' && (
        <View className={styles.content}>
          {/* 善行热力图 */}
          <View className={styles.card}>
            <Text className={styles.cardTitle}>🎯 善行热力图</Text>
            <Text className={styles.cardDesc}>过去一年的善行记录</Text>
            <View className={styles.heatmap}>
              {heatmapData.map((day, index) => (
                <View
                  key={index}
                  className={styles.heatmapCell}
                  style={{ background: getHeatmapColor(day.level) }}
                />
              ))}
            </View>
            <View className={styles.heatmapLegend}>
              <Text className={styles.heatmapLegendText}>少</Text>
              {[0, 1, 2, 3, 4].map(level => (
                <View
                  key={level}
                  className={styles.heatmapLegendCell}
                  style={{ background: getHeatmapColor(level) }}
                />
              ))}
              <Text className={styles.heatmapLegendText}>多</Text>
            </View>
          </View>

          {/* 品类分布环形图 */}
          <View className={styles.card}>
            <Text className={styles.cardTitle}>品类分布</Text>
            <View className={styles.ringChartContainer}>
              <View
                className={styles.ringChart}
                style={{
                  background: `conic-gradient(
                    ${CATEGORY_INFO.warm.color} 0% ${annualCategoryData.warmPercent}%,
                    ${CATEGORY_INFO.growth.color} ${annualCategoryData.warmPercent}% ${annualCategoryData.warmPercent + annualCategoryData.growthPercent}%,
                    ${CATEGORY_INFO.positive.color} ${annualCategoryData.warmPercent + annualCategoryData.growthPercent}% 100%
                  )`
                }}
              >
                <View className={styles.ringInner}>
                  <Text className={styles.ringTotal}>{circleCheckins.length}</Text>
                  <Text className={styles.ringLabel}>总善行</Text>
                </View>
              </View>
              <View className={styles.ringLegend}>
                <View className={styles.legendItem}>
                  <View className={styles.legendDot} style={{ background: CATEGORY_INFO.warm.color }} />
                  <Text className={styles.legendText}>{CATEGORY_INFO.warm.icon} 温暖</Text>
                  <Text className={styles.legendValue}>{annualCategoryData.warmPercent}%</Text>
                </View>
                <View className={styles.legendItem}>
                  <View className={styles.legendDot} style={{ background: CATEGORY_INFO.growth.color }} />
                  <Text className={styles.legendText}>{CATEGORY_INFO.growth.icon} 成长</Text>
                  <Text className={styles.legendValue}>{annualCategoryData.growthPercent}%</Text>
                </View>
                <View className={styles.legendItem}>
                  <View className={styles.legendDot} style={{ background: CATEGORY_INFO.positive.color }} />
                  <Text className={styles.legendText}>{CATEGORY_INFO.positive.icon} 正能量</Text>
                  <Text className={styles.legendValue}>{annualCategoryData.positivePercent}%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* AI 成长寄语 */}
          <View className={styles.card}>
            <View className={styles.aiMessageHeader}>
              <Text className={styles.aiMessageIcon}>✨</Text>
              <Text className={styles.aiMessageTitle}>AI 成长寄语</Text>
            </View>
            <Text className={styles.aiMessageContent}>
              过去的一年里，这个团体共同创造了 {circleCheckins.length} 件善行。每一次小小的善举，都在温暖着身边的人，也在滋养着自己的心灵。{CATEGORY_INFO.warm.icon}温暖的瞬间让爱传递，{CATEGORY_INFO.growth.icon}成长的脚步从未停歇，{CATEGORY_INFO.positive.icon}正能量的光芒照亮了每一个日子。愿这份善意继续传递，让世界因你们而更加美好。
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default CircleAdminPage;
