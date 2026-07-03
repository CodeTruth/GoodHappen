import React, { useEffect, useMemo } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { onboardingDailyTasks, DailyTask } from '@/data/onboarding-tasks';
import { useOnboardingStore } from '@/store/onboarding';
import styles from './index.module.scss';

// 3天任务ID到 store 任务ID 的映射（统一数据模型）
const DAILY_TASK_ID_MAP: Record<string, string> = {
  day1: 'first_kindness',
  day2: 'choose_persona',
  day3: 'complete_profile',
};

const OnboardingPage: React.FC = () => {
  const { tasks: storeTasks, loadFromStorage } = useOnboardingStore();

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // 以 onboarding-tasks.ts 的3天任务为准，合并 store 中的完成状态
  const tasks: DailyTask[] = useMemo(() => {
    return onboardingDailyTasks.map(dailyTask => {
      const storeTaskId = DAILY_TASK_ID_MAP[dailyTask.id];
      const storeTask = storeTaskId ? storeTasks.find(t => t.id === storeTaskId) : null;
      return {
        ...dailyTask,
        isCompleted: storeTask?.completed || false,
      };
    });
  }, [storeTasks]);

  const completedCount = tasks.filter(t => t.isCompleted).length;
  const totalDays = 3;
  const progressPercent = (completedCount / totalDays) * 100;
  const allCompleted = completedCount === totalDays;

  // 点击任务卡片
  const handleTaskClick = (task: DailyTask) => {
    if (task.isCompleted) {
      Taro.showToast({ title: '今日任务已完成', icon: 'success' });
      return;
    }
    // 跳转到记录页，携带任务信息
    Taro.navigateTo({
      url: `/pages/record/index?onboardingTaskId=${task.id}&onboardingDay=${task.day}&onboardingDesc=${encodeURIComponent(task.description)}`,
    });
  };

  return (
    <View className={styles.container}>
      {/* 头部卡片 */}
      <View className={styles.welcomeCard}>
        <Text className={styles.welcomeIcon}>🌱</Text>
        <Text className={styles.welcomeTitle}>新手行善任务</Text>
        <Text className={styles.welcomeDesc}>
          3天引导，开启你的善行之旅{'\n'}每天一个小任务，温暖从今天开始
        </Text>
      </View>

      {/* 进度卡片 */}
      <View className={styles.progressCard}>
        <View className={styles.progressHeader}>
          <Text className={styles.progressTitle}>任务进度</Text>
          <Text className={styles.progressReward}>
            已完成 {completedCount}/{totalDays} 天
          </Text>
        </View>
        <View className={styles.progressBar}>
          <View className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </View>
        <View className={styles.progressMeta}>
          <Text>第{Math.min(completedCount + 1, totalDays)}天/共{totalDays}天</Text>
          <Text>全部完成可获得 160 福气</Text>
        </View>
      </View>

      {/* 全部完成提示 */}
      {allCompleted && (
        <View className={styles.allCompletedCard}>
          <Text className={styles.allCompletedIcon}>🎉</Text>
          <Text className={styles.allCompletedTitle}>恭喜完成全部新手行善任务！</Text>
          <Text className={styles.allCompletedDesc}>
            你已完成3天行善引导，继续在好事发生记录温暖吧
          </Text>
        </View>
      )}

      {/* 3天任务列表 */}
      <View className={styles.taskList}>
        {tasks.map(task => (
          <View
            key={task.id}
            className={`${styles.taskCard} ${task.isCompleted ? styles.completed : ''}`}
            onClick={() => handleTaskClick(task)}
          >
            <View className={styles.taskIconWrap}>
              <Text className={styles.taskIcon}>{task.icon}</Text>
            </View>
            <View className={styles.taskInfo}>
              <Text className={styles.taskDay}>第{task.day}天</Text>
              <Text className={styles.taskTitle}>{task.title}</Text>
              <Text className={styles.taskDesc}>{task.description}</Text>
              <Text className={styles.taskReward}>
                {task.isCompleted
                  ? '✓ 已完成'
                  : `奖励 ${task.rewardFortune} 福气`
                }
              </Text>
            </View>
            <View className={styles.taskAction}>
              {task.isCompleted ? (
                <View className={styles.taskCheck}>
                  <Text className={styles.taskCheckIcon}>✓</Text>
                </View>
              ) : (
                <Text className={styles.taskArrow}>›</Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* 底部提示 */}
      <View className={styles.footerTip}>
        <Text className={styles.footerTipText}>
          每天完成小任务，积累福气值，温暖自己也温暖他人
        </Text>
      </View>
    </View>
  );
};

export default OnboardingPage;
