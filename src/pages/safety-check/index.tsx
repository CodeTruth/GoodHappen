import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  SafetyCheckTask,
  SOS_CONFIG,
  createSafetyCheck,
  extendSafetyCheck,
  completeSafetyCheck,
  getSafetyTasks,
  onSafetyTasksChange,
} from '@/services/sos-guard';
import styles from './index.module.scss';

export default function SafetyCheckPage() {
  const [tasks, setTasks] = useState<SafetyCheckTask[]>([]);
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState(30);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setTasks(getSafetyTasks('current_user'));
    const unsubscribe = onSafetyTasksChange((t) => {
      setTasks(t.filter((task) => task.userId === 'current_user'));
    });
    return unsubscribe;
  }, []);

  const handleCreate = useCallback(() => {
    if (!activity.trim()) {
      Taro.showToast({ title: '请描述您的善行活动', icon: 'none' });
      return;
    }
    createSafetyCheck('current_user', activity, duration);
    setActivity('');
    setDuration(30);
    setShowForm(false);
    Taro.showToast({ title: '安全确认已启动', icon: 'success' });
  }, [activity, duration]);

  const getStatusLabel = (status: SafetyCheckTask['status']) => {
    const map: Record<string, string> = {
      active: '进行中',
      extended: '已延长',
      completed: '已完成',
      timeout_sos: '已超时触发SOS',
    };
    return map[status] || status;
  };

  const getStatusColor = (status: SafetyCheckTask['status']) => {
    const map: Record<string, string> = {
      active: '#4CAF50',
      extended: '#FF9800',
      completed: '#9E9E9E',
      timeout_sos: '#F44336',
    };
    return map[status] || '#9E9E9E';
  };

  return (
    <View className={styles.pageWrapper}>
      <View className={styles.container}>
        <Text className={styles.title}>⏱️ 定时安全确认</Text>
        <Text className={styles.subtitle}>
          设置预计完成时间，超时未确认将自动触发SOS
        </Text>

        {/* 新建任务按钮 */}
        {!showForm && (
          <View className={styles.createBtn} onClick={() => setShowForm(true)}>
            <Text className={styles.createBtnText}>+ 新建安全确认</Text>
          </View>
        )}

        {/* 新建表单 */}
        {showForm && (
          <View className={styles.formCard}>
            <Text className={styles.formLabel}>善行活动描述</Text>
            <Input
              className={styles.formInput}
              placeholder="例如：扶老人过马路、交通事故现场帮忙..."
              value={activity}
              onInput={(e: any) => setActivity(e.detail.value)}
              maxlength={100}
            />

            <Text className={styles.formLabel}>预计完成时间（分钟）</Text>
            <View className={styles.durationPicker}>
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <View
                  key={m}
                  className={`${styles.durationOption} ${duration === m ? styles.durationActive : ''}`}
                  onClick={() => setDuration(m)}
                >
                  <Text className={styles.durationText}>{m}分</Text>
                </View>
              ))}
            </View>

            <View className={styles.formActions}>
              <View className={styles.cancelBtn} onClick={() => setShowForm(false)}>
                <Text>取消</Text>
              </View>
              <View className={styles.submitBtn} onClick={handleCreate}>
                <Text>开始确认</Text>
              </View>
            </View>
          </View>
        )}

        {/* 任务列表 */}
        <View className={styles.taskList}>
          <Text className={styles.sectionTitle}>当前任务</Text>
          {tasks.length === 0 && (
            <Text className={styles.emptyText}>暂无安全确认任务</Text>
          )}
          {tasks.map((task) => (
            <View key={task.id} className={styles.taskCard}>
              <View className={styles.taskHeader}>
                <Text className={styles.taskDesc}>{task.activityDescription}</Text>
                <View
                  className={styles.taskStatusTag}
                  style={{ background: getStatusColor(task.status) }}
                >
                  <Text className={styles.taskStatusText}>{getStatusLabel(task.status)}</Text>
                </View>
              </View>
              <Text className={styles.taskTime}>
                预计完成：{new Date(task.expectedEndAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {(task.status === 'active' || task.status === 'extended') && (
                <View className={styles.taskActions}>
                  <View
                    className={styles.taskActionBtn}
                    onClick={() => {
                      const result = extendSafetyCheck(task.id);
                      Taro.showToast({ title: result.message, icon: result.success ? 'success' : 'none' });
                    }}
                  >
                    <Text>+15分钟</Text>
                  </View>
                  <View
                    className={styles.taskActionBtnPrimary}
                    onClick={() => {
                      const result = completeSafetyCheck(task.id);
                      Taro.showToast({ title: result.message, icon: result.success ? 'success' : 'none' });
                    }}
                  >
                    <Text>✓ 已完成</Text>
                  </View>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* 说明 */}
        <View className={styles.infoCard}>
          <Text className={styles.infoTitle}>💡 如何使用</Text>
          <Text className={styles.infoText}>
            1. 做好事前，创建安全确认任务，设置预计完成时间{'\n'}
            2. 系统开始倒计时，期间可延长或提前完成{'\n'}
            3. 超时未确认，系统将自动触发SOS并通知紧急联系人{'\n'}
            4. 适用于：扶老人、交通事故、水域救援等高风险善行
          </Text>
        </View>
      </View>
    </View>
  );
}
