import React, { useState, useEffect } from 'react';
import { View, Text, Image, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useCircleStore } from '@/store/circle';
import { useUserStore } from '@/store/user';
import { useMoralTaskStore } from '@/store/moral-task';
import { getStudentProfile } from '@/services/moral-dashboard';
import { StudentMoralProfile } from '@/services/moral-dashboard';
import { CATEGORY_CONFIG } from '@/data/mock-moral-tasks';
import styles from './index.module.scss';

const StudentProfilePage: React.FC = () => {
  const router = useRouter();
  const circleId = router.params.circleId || '';
  const urlUserId = router.params.userId || '';

  const { getCircleById, hasPermission } = useCircleStore();
  const { userInfo } = useUserStore();
  const { markExample, addTeacherComment, getSubmissionById } = useMoralTaskStore();

  const [profile, setProfile] = useState<StudentMoralProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSelf, setIsSelf] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentingId, setCommentingId] = useState<string | null>(null);

  const currentUserId = userInfo?.id || 'currentUser';
  const targetUserId = urlUserId || currentUserId;

  useEffect(() => {
    if (circleId && userInfo) {
      setIsAdmin(hasPermission(circleId, userInfo.id, 'create_checkin_task'));
      setIsSelf(targetUserId === currentUserId);
    }
  }, [circleId, userInfo, targetUserId]);

  useEffect(() => {
    if (!circleId || !targetUserId) return;
    setProfile(getStudentProfile(targetUserId, circleId));
  }, [circleId, targetUserId]);

  const circle = getCircleById(circleId);

  const handleMarkExample = (submissionId: string, current: boolean) => {
    markExample(submissionId, !current);
    // 刷新
    setProfile(getStudentProfile(targetUserId, circleId));
    Taro.showToast({ title: !current ? '已标记为榜样' : '已取消榜样标记', icon: 'success' });
  };

  const handleAddComment = (submissionId: string) => {
    if (!commentInput.trim()) {
      Taro.showToast({ title: '请输入评语', icon: 'none' });
      return;
    }
    addTeacherComment(submissionId, commentInput.trim());
    setCommentInput('');
    setCommentingId(null);
    // 刷新
    setProfile(getStudentProfile(targetUserId, circleId));
    Taro.showToast({ title: '评语已保存', icon: 'success' });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  if (!profile) {
    return (
      <View className={styles.container}>
        <View className={styles.empty}>
          <Text className={styles.emptyIcon}>📖</Text>
          <Text className={styles.emptyText}>加载中...</Text>
        </View>
      </View>
    );
  }

  const maxCategoryCount = Math.max(...profile.categoryDistribution.map((c) => c.count), 1);

  return (
    <View className={styles.container}>
      {/* 顶部档案卡 */}
      <View className={styles.profileCard}>
        <Image className={styles.profileAvatar} src={profile.userAvatar} />
        <Text className={styles.profileName}>{profile.userName}</Text>
        <Text className={styles.profileClass}>{circle?.name || '班级'} · 学号 {targetUserId.slice(-2)}</Text>
      </View>

      {/* 本学期数据概览 */}
      <View className={styles.statsGrid}>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>{profile.currentSemester.totalCount}</Text>
          <Text className={styles.statLabel}>善行总数</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>{profile.currentSemester.streakDays}</Text>
          <Text className={styles.statLabel}>连续打卡</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>{profile.currentSemester.taskCompletionRate}%</Text>
          <Text className={styles.statLabel}>任务完成率</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>{profile.currentSemester.exampleCount}</Text>
          <Text className={styles.statLabel}>榜样次数</Text>
        </View>
      </View>

      {/* 分类分布 */}
      {profile.categoryDistribution.length > 0 && (
        <View className={styles.sectionCard}>
          <Text className={styles.sectionTitle}>善行分类分布</Text>
          {profile.categoryDistribution.map((cat) => {
            const config = CATEGORY_CONFIG[cat.category];
            return (
              <View key={cat.category} className={styles.categoryBar}>
                <Text className={styles.categoryBarLabel}>
                  <Text>{config.icon}</Text>
                  <Text> {cat.name}</Text>
                </Text>
                <View className={styles.categoryBarTrack}>
                  <View
                    className={styles.categoryBarFill}
                    style={{
                      width: `${maxCategoryCount > 0 ? (cat.count / maxCategoryCount) * 100 : 0}%`,
                      background: config.color,
                    }}
                  />
                </View>
                <Text className={styles.categoryBarValue}>{cat.percentage}%</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* 跨学期累积 */}
      {profile.semesterProfiles.length > 0 && (
        <View className={styles.sectionCard}>
          <Text className={styles.sectionTitle}>跨学期累积</Text>
          <View className={styles.semesterList}>
            {profile.semesterProfiles.map((sem) => (
              <View key={sem.semester} className={styles.semesterItem}>
                <View className={styles.semesterInfo}>
                  <Text className={styles.semesterName}>{sem.semester}</Text>
                  <Text className={styles.semesterYear}>{sem.yearLabel}</Text>
                </View>
                <View className={styles.semesterStats}>
                  <View className={styles.semesterStat}>
                    <Text className={styles.semesterStatValue}>{sem.totalCount}</Text>
                    <Text className={styles.semesterStatLabel}>条</Text>
                  </View>
                  <View className={styles.semesterStat}>
                    <Text className={styles.semesterStatValue}>{sem.exampleCount}</Text>
                    <Text className={styles.semesterStatLabel}>榜样</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 善行时间线 */}
      <View className={styles.sectionCard}>
        <Text className={styles.sectionTitle}>善行时间线</Text>
        {profile.timeline.length > 0 ? (
          <View className={styles.timeline}>
            {profile.timeline.map((item) => (
              <View key={item.id} className={styles.timelineItem}>
                <View
                  className={`${styles.timelineDot} ${item.isExample ? styles.timelineDotExample : ''}`}
                >
                  {item.isExample && <Text className={styles.timelineDotIcon}>⭐</Text>}
                </View>
                <Text className={styles.timelineDate}>{formatDate(item.date)}</Text>
                <View
                  className={`${styles.timelineCard} ${item.isExample ? styles.timelineCardExample : ''}`}
                >
                  {item.taskTitle && <Text className={styles.timelineTaskTag}>📋 {item.taskTitle}</Text>}
                  <Text className={styles.timelineContent}>{item.content}</Text>
                  {item.videoUrl && (
                    <View className={styles.timelineVideo}>
                      <Text className={styles.timelineVideoHint}>🎬 视频记录</Text>
                    </View>
                  )}
                  {item.teacherComment && (
                    <View className={styles.timelineComment}>
                      <Text className={styles.timelineCommentLabel}>👩‍🏫 老师评语</Text>
                      <Text className={styles.timelineCommentText}>{item.teacherComment}</Text>
                    </View>
                  )}
                  {/* 老师操作 */}
                  {isAdmin && (
                    <View className={styles.timelineActions}>
                      <Text
                        className={`${styles.timelineAction} ${item.isExample ? styles.timelineActionMarked : ''}`}
                        onClick={() => handleMarkExample(item.id, item.isExample)}
                      >
                        {item.isExample ? '⭐ 已榜样' : '标记榜样'}
                      </Text>
                      {commentingId === item.id ? (
                        <View style={{ display: 'flex', flexDirection: 'row', gap: '8rpx', flex: 1 }}>
                          <Input
                            style={{ flex: 1, height: '48rpx', background: '#f5f5f5', borderRadius: '8rpx', padding: '0 12rpx', fontSize: '24rpx' }}
                            placeholder="输入评语..."
                            value={commentInput}
                            onInput={(e) => setCommentInput(e.detail.value)}
                          />
                          <Text className={styles.timelineAction} onClick={() => handleAddComment(item.id)}>
                            保存
                          </Text>
                          <Text className={styles.timelineAction} onClick={() => { setCommentingId(null); setCommentInput(''); }}>
                            取消
                          </Text>
                        </View>
                      ) : (
                        <Text className={styles.timelineAction} onClick={() => setCommentingId(item.id)}>
                          💬 写评语
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>📝</Text>
            <Text className={styles.emptyText}>暂无善行记录</Text>
          </View>
        )}
      </View>

      {/* 底部操作（仅老师端） */}
      {isAdmin && (
        <View className={styles.footerActions}>
          <View className={styles.footerBtn} onClick={() => Taro.showToast({ title: '档案海报已生成', icon: 'success' })}>
            <Text className={styles.footerBtnText}>📄 生成档案海报</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default StudentProfilePage;
