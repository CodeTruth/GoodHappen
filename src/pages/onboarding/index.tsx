import React, { useEffect } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useOnboardingStore } from '@/store/onboarding';
import styles from './index.module.scss';

const OnboardingPage: React.FC = () => {
  const {
    tasks,
    allCompleted,
    completeTask,
    getProgress,
    dismissOnboarding,
    loadFromStorage,
  } = useOnboardingStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  const progress = getProgress();
  const progressPercent = progress.total > 0 ? (progress.completed / progress.total) * 100 : 0;

  // 点击任务卡片
  const handleTaskClick = (_taskId: string, completed: boolean, targetPath: string) => {
    if (completed) {
      Taro.showToast({ title: '任务已完成', icon: 'success' });
      return;
    }
    // 跳转到对应页面
    Taro.navigateTo({
      url: targetPath,
      fail: () => {
        // tabBar 页面需要用 switchTab
        Taro.switchTab({ url: targetPath }).catch(() => {
          Taro.showToast({ title: '页面跳转失败', icon: 'none' });
        });
      },
    });
  };

  // 关闭新手引导
  const handleDismiss = () => {
    dismissOnboarding();
    Taro.navigateBack({ fail: () => Taro.switchTab({ url: '/pages/home/index' }) });
  };

  // 体验一下（标记第一个任务为完成 - 仅用于演示，实际应由各业务页面触发）
  const handleTryDemo = (taskId: 'first_kindness' | 'choose_persona' | 'complete_profile' | 'like_square' | 'first_charity') => {
    completeTask(taskId);
  };

  return (
    <View className={styles.container}>
      {/* 欢迎卡片 */}
      <View className={styles.welcomeCard}>
        <Text className={styles.welcomeIcon}>🌱</Text>
        <Text className={styles.welcomeTitle}>欢迎来到好事发生</Text>
        <Text className={styles.welcomeDesc}>
          完成新手任务，快速上手温暖记录{'\n'}每完成一项都有福气奖励
        </Text>
      </View>

      {/* 进度卡片 */}
      <View className={styles.progressCard}>
        <View className={styles.progressHeader}>
          <Text className={styles.progressTitle}>任务进度</Text>
          <Text className={styles.progressReward}>
            已获得 {progress.reward} 福气
          </Text>
        </View>
        <View className={styles.progressBar}>
          <View className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </View>
        <View className={styles.progressMeta}>
          <Text>{progress.completed}/{progress.total} 已完成</Text>
          <Text>全部完成额外获 50 福气</Text>
        </View>
      </View>

      {/* 全部完成提示 */}
      {allCompleted && (
        <View className={styles.allCompletedCard}>
          <Text className={styles.allCompletedIcon}>🎉</Text>
          <Text className={styles.allCompletedTitle}>恭喜！你已完成全部新手任务</Text>
          <Text className={styles.allCompletedDesc}>
            额外获得 50 福气奖励，继续记录温暖吧
          </Text>
        </View>
      )}

      {/* 任务列表 */}
      <View className={styles.taskList}>
        {tasks.map(task => (
          <View
            key={task.id}
            className={`${styles.taskCard} ${task.completed ? styles.completed : ''}`}
            onClick={() => handleTaskClick(task.id, task.completed, task.targetPath)}
          >
            <View className={styles.taskIcon}>
              <Text>{task.icon}</Text>
            </View>
            <View className={styles.taskInfo}>
              <Text className={styles.taskTitle}>{task.title}</Text>
              <Text className={styles.taskDesc}>{task.description}</Text>
              <Text className={styles.taskReward}>
                {task.completed ? '✓ 已完成' : `奖励 ${task.reward} 福气`}
              </Text>
            </View>
            <View className={styles.taskAction}>
              {task.completed ? (
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

      {/* 演示按钮：用于快速体验任务完成效果 */}
      {!allCompleted && (
        <View
          className={styles.footerBtn}
          style={{ background: '#fff', border: '2rpx solid #FF6B6B' }}
          onClick={() => {
            // 找到第一个未完成的任务并标记完成（演示用）
            const firstUncompleted = tasks.find(t => !t.completed);
            if (firstUncompleted) {
              handleTryDemo(firstUncompleted.id);
            }
          }}
        >
          <Text className={styles.footerBtnText} style={{ color: '#FF6B6B' }}>
            演示：标记下一任务完成
          </Text>
        </View>
      )}

      {/* 关闭按钮 */}
      <View className={styles.footerBtn} onClick={handleDismiss}>
        <Text className={styles.footerBtnText}>
          {allCompleted ? '完成引导' : '稍后再说'}
        </Text>
      </View>
    </View>
  );
};

export default OnboardingPage;
