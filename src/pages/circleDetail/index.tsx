import React, { useEffect, useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useCircleStore, ROLE_NAMES, ACCESS_TYPE_NAMES } from '@/store/circle';
import { useCheckinStore, CATEGORY_INFO } from '@/store/checkin';
import { useUserStore } from '@/store/user';
import { useMoralTaskStore } from '@/store/moral-task';
import styles from './index.module.scss';

const CircleDetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.params;
  const [circle, setCircle] = useState<any>(null);
  const [urgentTasks, setUrgentTasks] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const {
    getCircleById,
    hasPermission,
    loadFromStorage: loadCircleFromStorage,
  } = useCircleStore();
  const { getCircleCheckins, loadFromStorage: loadCheckinFromStorage } = useCheckinStore();
  const { userInfo, loadFromStorage: loadUserFromStorage } = useUserStore();
  const { tasks, getSubmissionsByUser } = useMoralTaskStore();

  useEffect(() => {
    loadCircleFromStorage();
    loadCheckinFromStorage();
    loadUserFromStorage();
    if (id) {
      const data = getCircleById(id);
      if (data) {
        setCircle(data);
      } else {
        Taro.showToast({
          title: '善行圈不存在',
          icon: 'none'
        });
      }
    }
  }, [id]);

  // 检测即将到期的任务
  useEffect(() => {
    if (!id || !userInfo) return;
    const userId = userInfo.id || 'currentUser';
    const now = new Date();
    const activeTasks = tasks.filter((t) => t.circleId === id && t.status === 'active');
    const urgent: any[] = [];
    activeTasks.forEach((task) => {
      const endDate = new Date(task.weekRange.end);
      const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      // 3天内截止且用户未提交
      if (diffDays >= 0 && diffDays <= 3) {
        const userSubs = getSubmissionsByUser(userId, id).filter((s) => s.taskId === task.id);
        if (userSubs.length === 0) {
          urgent.push({ ...task, diffDays });
        }
      }
    });
    setUrgentTasks(urgent);
  }, [id, tasks, userInfo]);

  if (!circle) {
    return (
      <View className={styles.container}>
        <View className={styles.loading}>
          <Text className={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  // 权限检查
  const canViewSummary = userInfo && id
    ? hasPermission(id, userInfo.id, 'view_circle_summary')
    : false;
  const currentRole = userInfo && id
    ? useCircleStore.getState().getMemberRole(id, userInfo.id)
    : null;

  // 获取团体打卡记录
  const circleCheckins = id ? getCircleCheckins(id) : [];

  // 跳转到打卡页面
  const handleGoCheckin = () => {
    Taro.navigateTo({
      url: `/pages/checkin/index?circleId=${id}`
    });
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

  return (
    <View className={styles.container}>
      {/* 善行圈信息 */}
      <View className={styles.header}>
        <Text className={styles.circleName}>{circle.name}</Text>
        {circle.description && (
          <Text className={styles.circleDesc}>{circle.description}</Text>
        )}
        {/* 团体类型标签 */}
        <View className={styles.circleTags}>
          <View className={styles.circleTag}>
            <Text className={styles.circleTagText}>{ACCESS_TYPE_NAMES[circle.accessType]}</Text>
          </View>
          {currentRole && (
            <View className={styles.circleTag}>
              <Text className={styles.circleTagText}>{ROLE_NAMES[currentRole]}</Text>
            </View>
          )}
        </View>
        <View className={styles.circleStats}>
          <View className={styles.stat}>
            <Text className={styles.statValue}>{circle.members.length}</Text>
            <Text className={styles.statLabel}>成员</Text>
          </View>
          <View className={styles.stat}>
            <Text className={styles.statValue}>{circleCheckins.length}</Text>
            <Text className={styles.statLabel}>善行</Text>
          </View>
        </View>
      </View>

      {/* 即将到期任务提醒 */}
      {urgentTasks.length > 0 && (
        <View className={styles.urgentBanner}>
          <Text className={styles.urgentBannerTitle}>⏰ 任务提醒</Text>
          {urgentTasks.map((task) => (
            <View
              key={task.id}
              className={styles.urgentTaskItem}
              onClick={() => {
                Taro.navigateTo({ url: `/pages/record/index?circleId=${id}&taskId=${task.id}` });
              }}
            >
              <Text className={styles.urgentTaskName}>{task.title}</Text>
              <Text className={styles.urgentTaskMeta}>
                {task.diffDays === 0 ? '今天截止' : `还剩${task.diffDays}天`}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* 快捷操作 - 按角色显示不同入口 */}
      <View className={styles.actionBar}>
        {canViewSummary ? (
          <>
            {/* 老师端入口 */}
            <View className={styles.actionBtn} onClick={handleGoCheckin}>
              <Text className={styles.actionIcon}>📝</Text>
              <Text className={styles.actionText}>善行打卡</Text>
            </View>
            <View className={styles.actionBtn} onClick={() => Taro.navigateTo({ url: `/pages/circle-moral-tasks/index?id=${id}` })}>
              <Text className={styles.actionIcon}>📋</Text>
              <Text className={styles.actionText}>任务管理</Text>
            </View>
            <View className={styles.actionBtn} onClick={() => Taro.navigateTo({ url: `/pages/circle-dashboard/index?id=${id}` })}>
              <Text className={styles.actionIcon}>📊</Text>
              <Text className={styles.actionText}>德育看板</Text>
            </View>
            <View className={styles.actionBtn} onClick={() => setShowInviteModal(true)}>
              <Text className={styles.actionIcon}>💌</Text>
              <Text className={styles.actionText}>邀请成员</Text>
            </View>
          </>
        ) : (
          <>
            {/* 学生端入口 */}
            <View className={styles.actionBtn} onClick={() => {
              Taro.navigateTo({
                url: `/pages/record/index?circleId=${id}`,
              });
            }}>
              <Text className={styles.actionIcon}>📝</Text>
              <Text className={styles.actionText}>提交善行</Text>
            </View>
            <View className={styles.actionBtn} onClick={() => Taro.navigateTo({ url: `/pages/student-profile/index?circleId=${id}` })}>
              <Text className={styles.actionIcon}>📖</Text>
              <Text className={styles.actionText}>我的档案</Text>
            </View>
            {circle?.accessType === 'open' && (
              <View className={styles.actionBtn} onClick={() => setShowInviteModal(true)}>
                <Text className={styles.actionIcon}>💌</Text>
                <Text className={styles.actionText}>邀请好友</Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* 团体动态流 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>团体动态</Text>
        {circleCheckins.length === 0 ? (
          <View className={styles.empty}>
            <Text className={styles.emptyText}>还没有动态，快来发布第一条吧～</Text>
          </View>
        ) : (
          circleCheckins.slice(0, 20).map(checkin => (
            <View key={checkin.id} className={styles.feedItem}>
              <View className={styles.feedHeader}>
                <Text className={styles.feedUser}>{checkin.userName}</Text>
                <Text className={styles.feedCategory}>
                  {CATEGORY_INFO[checkin.category].icon} {checkin.subcategory}
                </Text>
              </View>
              <Text className={styles.feedContent}>{checkin.content}</Text>
              {checkin.streakDays > 1 && (
                <Text className={styles.feedStreak}>🔥 连续{checkin.streakDays}天</Text>
              )}
              <Text className={styles.feedTime}>{formatTime(checkin.createdAt)}</Text>
            </View>
          ))
        )}
      </View>

      {/* 邀请弹窗 */}
      {showInviteModal && circle && (
        <View className={styles.inviteOverlay} onClick={() => setShowInviteModal(false)}>
          <View className={styles.inviteCard} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.inviteTitle}>💌 邀请加入</Text>
            <Text className={styles.inviteCircleName}>{circle.name}</Text>
            <Text className={styles.inviteDesc}>{circle.description || '一起来记录善行吧～'}</Text>

            {circle.accessType === 'open' && circle.classCode && (
              <View className={styles.inviteCodeBox}>
                <Text className={styles.inviteCodeLabel}>班级码</Text>
                <Text className={styles.inviteCode}>{circle.classCode}</Text>
              </View>
            )}

            <View className={styles.inviteMethod}>
              <Text className={styles.inviteMethodText}>
                {circle.accessType === 'open'
                  ? '通过班级码即可加入'
                  : circle.accessType === 'closed'
                    ? '需管理员邀请加入'
                    : '公开圈子，可直接浏览'}
              </Text>
            </View>

            <View
              className={styles.inviteCopyBtn}
              onClick={() => {
                const text = `邀请你加入「${circle.name}」${circle.accessType === 'open' ? `，班级码：${circle.classCode}` : ''}，一起来记录善行吧！——好事发生`;
                Taro.setClipboardData({ data: text });
              }}
            >
              <Text className={styles.inviteCopyBtnText}>📋 复制邀请信息</Text>
            </View>

            <Text className={styles.inviteHint}>点击空白处关闭</Text>
          </View>
        </View>
      )}
    </View>
  );
};

export default CircleDetailPage;
