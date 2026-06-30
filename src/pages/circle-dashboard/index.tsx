import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useCircleStore } from '@/store/circle';
import { useUserStore } from '@/store/user';
import { useMoralTaskStore } from '@/store/moral-task';
import { getRanking, getWeeklyReport, getExampleWall, getUnsubmittedStudents } from '@/services/moral-dashboard';
import { StudentRankingItem, WeeklyReportData, ExampleWallItem } from '@/services/moral-dashboard';
import { getCircleTypeConfig, CircleType } from '@/config/circle-types';
import { mockWeeklyReports } from '@/data/mock-moral-tasks';
import styles from './index.module.scss';

type TabType = 'ranking' | 'report' | 'examples';

const CircleDashboardPage: React.FC = () => {
  const router = useRouter();
  const circleId = router.params.id || '';

  const { getCircleById, hasPermission } = useCircleStore();
  const { userInfo } = useUserStore();

  // 圈子类型配置
  const circle = getCircleById(circleId);
  const circleType: CircleType = (circle?.type as CircleType) || 'public';
  const typeConfig = useMemo(() => getCircleTypeConfig(circleType), [circleType]);

  const TABS = useMemo(() => [
    { key: 'ranking' as TabType, label: `${typeConfig.labels.ranking}排行` },
    { key: 'report' as TabType, label: `${typeConfig.labels.taskShort}周报` },
    { key: 'examples' as TabType, label: `${typeConfig.labels.example}墙` },
  ], [typeConfig]);

  const [activeTab, setActiveTab] = useState<TabType>('ranking');
  const [isAdmin, setIsAdmin] = useState(false);

  // Tab1 数据
  const [ranking, setRanking] = useState<StudentRankingItem[]>([]);
  const [unsubmitted, setUnsubmitted] = useState<{ userId: string; userName: string; userAvatar: string }[]>([]);

  // Tab2 数据
  const [currentWeek, setCurrentWeek] = useState(25);
  const [report, setReport] = useState<WeeklyReportData | null>(null);

  // Tab3 数据
  const [examples, setExamples] = useState<ExampleWallItem[]>([]);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(25);

  // 分享卡片弹窗
  const [showShareCard, setShowShareCard] = useState(false);
  const [shareCardData, setShareCardData] = useState<{
    weekIndex: number;
    totalCount: number;
    participationRate: number;
    exampleCount: number;
    topUsers: { userName: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    if (circleId && userInfo) {
      setIsAdmin(hasPermission(circleId, userInfo.id, 'create_checkin_task'));
    }
  }, [circleId, userInfo]);

  useEffect(() => {
    if (!circleId) return;
    setRanking(getRanking(circleId));

    // 获取未提交学生（针对第一个活跃任务）
    const { getTasksByCircle } = require('@/store/moral-task').useMoralTaskStore.getState();
    const activeTasks = getTasksByCircle(circleId).filter((t: any) => t.status === 'active');
    if (activeTasks.length > 0) {
      setUnsubmitted(getUnsubmittedStudents(circleId, activeTasks[0].id));
    }
  }, [circleId]);

  useEffect(() => {
    if (!circleId) return;
    setReport(getWeeklyReport(circleId, currentWeek));
  }, [circleId, currentWeek]);

  useEffect(() => {
    if (!circleId) return;
    const weekReport = mockWeeklyReports.find((r) => r.weekIndex === selectedWeekIdx);
    if (weekReport) {
      setExamples(getExampleWall(circleId, weekReport.weekRange));
    }
  }, [circleId, selectedWeekIdx]);

  const circle = getCircleById(circleId);
  const totalMembers = circle?.members.filter((m) => m.role !== 'admin').length || 0;
  const submittedCount = totalMembers - unsubmitted.length;
  const participationRate = totalMembers > 0 ? Math.round((submittedCount / totalMembers) * 100) : 0;

  const handleStudentClick = (userId: string) => {
    Taro.navigateTo({ url: `/pages/student-profile/index?circleId=${circleId}&userId=${userId}` });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  if (!isAdmin) {
    return (
      <View className={styles.container}>
        <View className={styles.empty}>
          <Text className={styles.emptyIcon}>🔒</Text>
          <Text className={styles.emptyText}>仅班级管理员可查看德育看板</Text>
        </View>
      </View>
    );
  }

  // ===== Tab1: 完成度排行 =====
  const renderRanking = () => (
    <>
      {/* 头部卡片 */}
      <View className={styles.headerCard}>
        <Text className={styles.headerTitle}>{circle?.name || '班级'} · 本周参与率</Text>
        <Text className={styles.headerSubtitle}>
          {submittedCount}/{totalMembers} 人已提交
        </Text>
        <View className={styles.progressSection}>
          <View className={styles.progressBar}>
            <View className={styles.progressFill} style={{ width: `${participationRate}%` }} />
          </View>
          <Text className={styles.progressText}>{participationRate}%</Text>
        </View>
      </View>

      {/* 未提交提醒 */}
      {unsubmitted.length > 0 && (
        <View className={styles.warningBanner}>
          <Text className={styles.warningIcon}>⚠️</Text>
          <Text className={styles.warningText}>
            {unsubmitted.length}人未提交：{unsubmitted.map((u) => u.userName).join(' ')}
          </Text>
        </View>
      )}

      {/* 排行表 */}
      <View className={styles.rankingTable}>
        <View className={styles.tableHeader}>
          <Text className={`${styles.tableHeaderCell} ${styles.rankCell}`}>排名</Text>
          <Text className={`${styles.tableHeaderCell} ${styles.nameCell}`}>学生</Text>
          <Text className={`${styles.tableHeaderCell} ${styles.taskCell}`}>任务完成</Text>
          <Text className={`${styles.tableHeaderCell} ${styles.freeCell}`}>自由善行</Text>
          <Text className={`${styles.tableHeaderCell} ${styles.streakCell}`}>连续</Text>
        </View>
        {ranking.map((item) => (
          <View key={item.userId} className={styles.tableRow} onClick={() => handleStudentClick(item.userId)}>
            <Text className={`${styles.tableCell} ${styles.rankCell} ${item.rank <= 3 ? styles.rankTop : ''}`}>
              {item.rank}
            </Text>
            <View className={styles.nameCell}>
              <Image className={styles.nameAvatar} src={item.userAvatar} />
              <Text className={styles.nameText}>{item.userName}</Text>
            </View>
            <Text className={`${styles.tableCell} ${styles.taskCell}`}>
              {item.taskCompleted}/{item.totalTasks}
            </Text>
            <Text className={`${styles.tableCell} ${styles.freeCell}`}>{item.freeKindness}</Text>
            <View className={styles.streakCell}>
              <Text className={styles.streakIcon}>🔥</Text>
              <Text className={styles.streakText}>{item.streakDays}天</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );

  // ===== Tab2: 班级周报 =====
  const renderReport = () => {
    if (!report) return null;
    const categories = Object.entries(report.categoryDistribution)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    const maxCount = Math.max(...categories.map(([, count]) => count));

    // 近4周趋势
    const trendWeeks = mockWeeklyReports
      .filter((r) => r.circleId === circleId && r.weekIndex <= currentWeek)
      .slice(-4);

    return (
      <>
        {/* 周选择器 */}
        <View className={styles.weekHeader}>
          <View className={styles.weekNav}>
            <Text
              className={styles.weekNavBtn}
              onClick={() => setCurrentWeek((w) => Math.max(22, w - 1))}
            >
              ←
            </Text>
          </View>
          <Text className={styles.weekTitle}>第{report.weekIndex}周周报</Text>
          <View className={styles.weekNav}>
            <Text
              className={styles.weekNavBtn}
              onClick={() => setCurrentWeek((w) => Math.min(25, w + 1))}
            >
              →
            </Text>
          </View>
        </View>

        {/* 核心数据 */}
        <View className={styles.dataCards}>
          <View className={styles.dataCard}>
            <Text className={styles.dataCardValue}>{report.totalCount}</Text>
            <Text className={styles.dataCardLabel}>总善行数</Text>
            <Text className={`${styles.dataCardChange} ${report.weekOverWeekChange >= 0 ? styles.changeUp : styles.changeDown}`}>
              {report.weekOverWeekChange >= 0 ? '↑' : '↓'} {Math.abs(report.weekOverWeekChange)}%
            </Text>
          </View>
          <View className={styles.dataCard}>
            <Text className={styles.dataCardValue}>{report.participationRate}%</Text>
            <Text className={styles.dataCardLabel}>参与率</Text>
          </View>
        </View>

        {/* 分类占比 */}
        <View className={styles.sectionCard}>
          <Text className={styles.sectionTitle}>分类占比</Text>
          {categories.map(([cat, count]) => {
            const config = typeConfig.categories.find((c) => c.key === cat) || typeConfig.categories[0];
            const percentage = report.totalCount > 0 ? Math.round((count / report.totalCount) * 100) : 0;
            return (
              <View key={cat} className={styles.categoryBar}>
                <Text className={styles.categoryBarLabel}>
                  <Text>{config?.icon || '✨'}</Text>
                  <Text> {config?.name || cat}</Text>
                </Text>
                <View className={styles.categoryBarTrack}>
                  <View
                    className={styles.categoryBarFill}
                    style={{
                      width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%`,
                      background: config?.color || '#C4956A',
                    }}
                  />
                </View>
                <Text className={styles.categoryBarValue}>{percentage}%</Text>
              </View>
            );
          })}
        </View>

        {/* 参与率趋势 */}
        <View className={styles.sectionCard}>
          <Text className={styles.sectionTitle}>参与率趋势（近4周）</Text>
          <View className={styles.trendRow}>
            {trendWeeks.map((w) => (
              <View key={w.weekIndex} className={styles.trendItem}>
                <Text className={styles.trendWeek}>W{w.weekIndex}</Text>
                <Text className={`${styles.trendValue} ${w.weekIndex === currentWeek ? styles.trendUp : ''}`}>
                  {w.participationRate}%
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 善行之星 */}
        {ranking.length > 0 && (
          <View className={styles.starCard}>
            <Text className={styles.starIcon}>⭐</Text>
            <View className={styles.starContent}>
              <Text className={styles.starTitle}>本周善行之星：{ranking[0].userName}</Text>
              <Text className={styles.starDesc}>
                任务完成 {ranking[0].taskCompleted}/{ranking[0].totalTasks} · 自由善行 {ranking[0].freeKindness}条 · 榜样 {ranking[0].exampleCount}次
              </Text>
            </View>
          </View>
        )}

        {/* 操作按钮 */}
        <View className={styles.actionButtons}>
          <View
            className={styles.actionBtn}
            onClick={() => {
              if (!report) return;
              setShareCardData({
                weekIndex: report.weekIndex,
                totalCount: report.totalCount,
                participationRate: report.participationRate,
                exampleCount: report.exampleCount,
                topUsers: ranking.slice(0, 3).map((r) => ({ userName: r.userName, count: r.taskCompleted + r.freeKindness })),
              });
              setShowShareCard(true);
            }}
          >
            <Text className={styles.actionBtnText}>📄 生成周报海报</Text>
          </View>
          <View className={styles.actionBtn} onClick={() => Taro.showToast({ title: '已分享到领导', icon: 'success' })}>
            <Text className={styles.actionBtnText}>📤 分享给领导</Text>
          </View>
        </View>
      </>
    );
  };

  // ===== Tab3: 榜样墙 =====
  const renderExamples = () => {
    const weekOptions = mockWeeklyReports
      .filter((r) => r.circleId === circleId)
      .map((r) => ({ index: r.weekIndex, label: `第${r.weekIndex}周` }));

    return (
      <>
        {/* 周选择器 */}
        <ScrollView className={styles.weekSelector} scrollX>
          {weekOptions.map((w) => (
            <Text
              key={w.index}
              className={`${styles.weekChip} ${selectedWeekIdx === w.index ? styles.weekChipActive : ''}`}
              onClick={() => setSelectedWeekIdx(w.index)}
            >
              {w.label}
            </Text>
          ))}
        </ScrollView>

        {/* 榜样记录 */}
        {examples.length > 0 ? (
          examples.map((ex) => (
            <View key={ex.id} className={styles.exampleCard}>
              <View className={styles.exampleHeader}>
                <Image className={styles.exampleAvatar} src={ex.userAvatar} />
                <Text className={styles.exampleName}>{ex.userName}</Text>
                <Text className={styles.exampleBadge}>⭐ 榜样</Text>
              </View>
              <Text className={styles.exampleContent}>{ex.content}</Text>
              {ex.videoUrl && (
                <View className={styles.exampleVideo}>
                  <Text className={styles.exampleVideoHint}>🎬 视频记录</Text>
                </View>
              )}
              {ex.teacherComment && (
                <View className={styles.exampleComment}>
                  <Text className={styles.exampleCommentLabel}>👩‍🏫 老师评语</Text>
                  <Text className={styles.exampleCommentText}>{ex.teacherComment}</Text>
                </View>
              )}
              <View className={styles.exampleFooter}>
                <Text className={styles.exampleDate}>{formatDate(ex.createdAt)}</Text>
                <View
                  className={`${styles.likeBtn} ${(ex.likedBy || []).includes(userInfo?.id || '') ? styles.likeBtnActive : ''}`}
                  onClick={() => {
                    const { toggleLike } = useMoralTaskStore.getState();
                    const liked = toggleLike(ex.id, userInfo?.id || 'currentUser');
                    Taro.showToast({ title: liked ? '已点赞 ❤️' : '取消点赞', icon: 'none' });
                    // 刷新榜样墙数据
                    const weekReport = mockWeeklyReports.find((r) => r.weekIndex === selectedWeekIdx);
                    if (weekReport) {
                      setExamples(getExampleWall(circleId, weekReport.weekRange));
                    }
                  }}
                >
                  <Text className={styles.likeBtnIcon}>👍</Text>
                  <Text className={styles.likeBtnCount}>{ex.likes || 0}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>⭐</Text>
            <Text className={styles.emptyText}>本周暂无榜样记录</Text>
          </View>
        )}
      </>
    );
  };

  return (
    <View className={styles.container}>
      {/* Tab 切换栏 */}
      <View className={styles.tabBar}>
        {TABS.map((tab) => (
          <View
            key={tab.key}
            className={`${styles.tabItem} ${activeTab === tab.key ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text>{tab.label}</Text>
            {activeTab === tab.key && <View className={styles.tabIndicator} />}
          </View>
        ))}
      </View>

      {/* Tab 内容 */}
      <View className={styles.tabContent}>
        {activeTab === 'ranking' && renderRanking()}
        {activeTab === 'report' && renderReport()}
        {activeTab === 'examples' && renderExamples()}
      </View>

      {/* 分享卡片弹窗 */}
      {showShareCard && shareCardData && (
        <View className={styles.shareOverlay} onClick={() => setShowShareCard(false)}>
          <View className={styles.shareCard} onClick={(e) => e.stopPropagation()}>
            <View className={styles.shareHeader}>
              <Text className={styles.shareTitle}>📊 {circle?.name || '善行圈'}周报</Text>
              <Text className={styles.shareSubtitle}>第{shareCardData.weekIndex}周 · {typeConfig.labels.ranking}汇总</Text>
            </View>

            <View className={styles.shareStats}>
              <View className={styles.shareStatItem}>
                <Text className={styles.shareStatNum}>{shareCardData.totalCount}</Text>
                <Text className={styles.shareStatLabel}>总{typeConfig.labels.submit}</Text>
              </View>
              <View className={styles.shareStatItem}>
                <Text className={styles.shareStatNum}>{shareCardData.participationRate}%</Text>
                <Text className={styles.shareStatLabel}>参与率</Text>
              </View>
              <View className={styles.shareStatItem}>
                <Text className={styles.shareStatNum}>{shareCardData.exampleCount}</Text>
                <Text className={styles.shareStatLabel}>{typeConfig.labels.example}</Text>
              </View>
            </View>

            {shareCardData.topUsers.length > 0 && (
              <View className={styles.shareTopUsers}>
                <Text className={styles.shareTopTitle}>🏆 本周TOP3</Text>
                {shareCardData.topUsers.map((u, i) => (
                  <View key={i} className={styles.shareTopItem}>
                    <Text className={styles.shareTopRank}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</Text>
                    <Text className={styles.shareTopName}>{u.userName}</Text>
                    <Text className={styles.shareTopCount}>{u.count}条</Text>
                  </View>
                ))}
              </View>
            )}

            <View className={styles.shareFooter}>
              <Text className={styles.shareSlogan}>记录每一份善意，让世界更美好</Text>
              <Text className={styles.shareBrand}>—— 好事发生</Text>
            </View>

            <View className={styles.shareHint}>
              <Text className={styles.shareHintText}>👆 点击空白处关闭，长按保存截图</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default CircleDashboardPage;
