import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, Textarea, Switch, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useMoralTaskStore } from '@/store/moral-task';
import { useCircleStore } from '@/store/circle';
import { useUserStore } from '@/store/user';
import { getCircleTypeConfig, CircleType } from '@/config/circle-types';
import styles from './index.module.scss';

const CircleMoralTasksPage: React.FC = () => {
  const router = useRouter();
  const circleId = router.params.id || '';

  const { getTasksByCircle, addTask, getSubmissionsByTask, loadFromStorage } = useMoralTaskStore();
  const { getCircleById, hasPermission } = useCircleStore();
  const { userInfo } = useUserStore();

  // 获取圈子类型配置
  const circle = getCircleById(circleId);
  const circleType: CircleType = (circle?.type as CircleType) || 'public';
  const typeConfig = useMemo(() => getCircleTypeConfig(circleType), [circleType]);
  const categoryList = typeConfig.categories;

  const [tasks, setTasks] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 表单状态
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<string>(categoryList[0]?.key || 'custom');
  const [formRequireVideo, setFormRequireVideo] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (circleId) {
      const list = getTasksByCircle(circleId);
      // 计算每个任务的提交数
      const enriched = list.map((task) => {
        const subs = getSubmissionsByTask(task.id);
        return { ...task, submissionCount: subs.length };
      });
      setTasks(enriched);

      if (userInfo && circleId) {
        setIsAdmin(hasPermission(circleId, userInfo.id, 'create_checkin_task'));
      }
    }
  }, [circleId, userInfo]);

  const handleAddTask = () => {
    if (!formTitle.trim()) {
      Taro.showToast({ title: '请输入任务标题', icon: 'none' });
      return;
    }

    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + (7 - now.getDay()));

    addTask({
      circleId,
      title: formTitle.trim(),
      description: formDesc.trim(),
      category: formCategory,
      requireVideo: formRequireVideo,
      weekRange: {
        start: now.toISOString().split('T')[0],
        end: weekEnd.toISOString().split('T')[0],
      },
    });

    Taro.showToast({ title: '任务发布成功', icon: 'success' });
    setShowModal(false);
    resetForm();

    // 刷新列表
    const list = getTasksByCircle(circleId);
    const enriched = list.map((task) => {
      const subs = getSubmissionsByTask(task.id);
      return { ...task, submissionCount: subs.length };
    });
    setTasks(enriched);
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormCategory(categoryList[0]?.key || 'custom');
    setFormRequireVideo(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  if (!isAdmin) {
    return (
      <View className={styles.container}>
        <View className={styles.empty}>
          <Text className={styles.emptyIcon}>🔒</Text>
          <Text className={styles.emptyText}>仅{typeConfig.labels.admin}可管理{typeConfig.labels.task}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.container}>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.title}>本周{typeConfig.labels.task}</Text>
        <View className={styles.addBtn} onClick={() => setShowModal(true)}>
          <Text className={styles.addBtnText}>➕ 发布</Text>
        </View>
      </View>

      {/* 任务列表 */}
      <View className={styles.taskList}>
        {tasks.length > 0 ? (
          tasks.map((task) => {
            const catConfig = categoryList.find((c) => c.key === task.category) || categoryList[categoryList.length - 1];
            const totalMembers = getCircleById(circleId)?.members.filter((m) => m.role !== 'admin').length || 0;
            const progress = totalMembers > 0 ? Math.round((task.submissionCount / totalMembers) * 100) : 0;

            return (
              <View
                key={task.id}
                className={`${styles.taskCard} ${task.status === 'expired' ? styles.taskCardExpired : ''}`}
              >
                <View className={styles.taskAccent} style={{ background: catConfig?.color || '#C4956A' }} />
                <View className={styles.taskContent}>
                  <View className={styles.taskHeader}>
                    <Text className={styles.taskTitle}>
                      <Text>{catConfig?.icon || '✨'}</Text>
                      <Text> {task.title}</Text>
                    </Text>
                    <Text
                      className={`${styles.taskStatus} ${task.status === 'active' ? styles.taskStatusActive : styles.taskStatusExpired}`}
                    >
                      {task.status === 'active' ? '进行中' : '已过期'}
                    </Text>
                  </View>

                  <Text className={styles.taskDesc}>{task.description}</Text>

                  <View className={styles.taskMeta}>
                    <View className={styles.metaItem}>
                      <Text className={styles.metaIcon}>📅</Text>
                      <Text className={styles.metaText}>截止 {formatDate(task.weekRange.end)}</Text>
                    </View>
                    {typeConfig.showVideoOption && (
                      <View className={styles.metaItem}>
                        <Text className={styles.metaIcon}>📹</Text>
                        <Text className={styles.metaText}>{task.requireVideo ? '需视频' : '文字即可'}</Text>
                      </View>
                    )}
                    <View className={styles.metaItem}>
                      <Text className={styles.metaIcon}>🏷️</Text>
                      <Text className={styles.metaText}>{catConfig?.name || '其他'}</Text>
                    </View>
                  </View>

                  <View className={styles.taskFooter}>
                    <View className={styles.progress}>
                      <View className={styles.progressBar}>
                        <View className={styles.progressFill} style={{ width: `${progress}%` }} />
                      </View>
                      <Text className={styles.progressText}>
                        {task.submissionCount}/{totalMembers}
                      </Text>
                    </View>
                    <Text className={styles.viewBtn} onClick={() => {
                      Taro.showToast({ title: '查看提交列表', icon: 'none' });
                    }}>
                      查看提交
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>暂无{typeConfig.labels.task}</Text>
          </View>
        )}
      </View>

      {/* 发布任务弹窗 */}
      {showModal && (
        <View className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <View className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>发布{typeConfig.labels.task}</Text>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>{typeConfig.labels.taskShort}标题</Text>
              <Input
                className={styles.formInput}
                placeholder={`如：${typeConfig.categories[0]?.name || '完成一项善行'}`}
                value={formTitle}
                onInput={(e) => setFormTitle(e.detail.value)}
                maxlength={30}
              />
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>{typeConfig.labels.taskShort}描述</Text>
              <Textarea
                className={styles.formTextarea}
                placeholder="描述具体要求..."
                value={formDesc}
                onInput={(e) => setFormDesc(e.detail.value)}
                maxlength={100}
              />
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>类别</Text>
              <View className={styles.categoryList}>
                {categoryList.map((cat) => (
                  <Text
                    key={cat.key}
                    className={`${styles.categoryOption} ${formCategory === cat.key ? styles.categoryOptionActive : ''}`}
                    onClick={() => setFormCategory(cat.key)}
                  >
                    {cat.icon} {cat.name}
                  </Text>
                ))}
              </View>
            </View>

            {typeConfig.showVideoOption && (
              <View className={styles.formItem}>
                <View className={styles.switchRow}>
                  <Text className={styles.switchLabel}>是否要求拍摄视频</Text>
                  <Switch
                    checked={formRequireVideo}
                    onChange={(e) => setFormRequireVideo(e.detail.value)}
                    color="#C4956A"
                  />
                </View>
              </View>
            )}

            <View className={styles.submitBtn} onClick={handleAddTask}>
              <Text className={styles.submitBtnText}>发布{typeConfig.labels.taskShort}</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default CircleMoralTasksPage;
