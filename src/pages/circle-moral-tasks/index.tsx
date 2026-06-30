import React, { useState, useEffect } from 'react';
import { View, Text, Input, Textarea, Switch, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useMoralTaskStore } from '@/store/moral-task';
import { useCircleStore } from '@/store/circle';
import { useUserStore } from '@/store/user';
import { CATEGORY_CONFIG, MoralCategory } from '@/data/mock-moral-tasks';
import styles from './index.module.scss';

const CATEGORY_KEYS: MoralCategory[] = ['housework', 'help_others', 'environmental', 'respect_elders', 'reading', 'custom'];

const CircleMoralTasksPage: React.FC = () => {
  const router = useRouter();
  const circleId = router.params.id || '';

  const { getTasksByCircle, addTask, getSubmissionsByTask, loadFromStorage } = useMoralTaskStore();
  const { getCircleById, hasPermission } = useCircleStore();
  const { userInfo } = useUserStore();

  const [tasks, setTasks] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // 表单状态
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<MoralCategory>('housework');
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
    setFormCategory('housework');
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
          <Text className={styles.emptyText}>仅班级管理员可管理德育任务</Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.container}>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.title}>本周德育任务</Text>
        <View className={styles.addBtn} onClick={() => setShowModal(true)}>
          <Text className={styles.addBtnText}>➕ 发布</Text>
        </View>
      </View>

      {/* 任务列表 */}
      <View className={styles.taskList}>
        {tasks.length > 0 ? (
          tasks.map((task) => {
            const catConfig = CATEGORY_CONFIG[task.category];
            const totalMembers = getCircleById(circleId)?.members.filter((m) => m.role !== 'admin').length || 0;
            const progress = totalMembers > 0 ? Math.round((task.submissionCount / totalMembers) * 100) : 0;

            return (
              <View
                key={task.id}
                className={`${styles.taskCard} ${task.status === 'expired' ? styles.taskCardExpired : ''}`}
              >
                <View className={styles.taskAccent} style={{ background: catConfig.color }} />
                <View className={styles.taskContent}>
                  <View className={styles.taskHeader}>
                    <Text className={styles.taskTitle}>
                      <Text>{catConfig.icon}</Text>
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
                    <View className={styles.metaItem}>
                      <Text className={styles.metaIcon}>📹</Text>
                      <Text className={styles.metaText}>{task.requireVideo ? '需视频' : '文字即可'}</Text>
                    </View>
                    <View className={styles.metaItem}>
                      <Text className={styles.metaIcon}>🏷️</Text>
                      <Text className={styles.metaText}>{catConfig.name}</Text>
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
            <Text className={styles.emptyText}>暂无德育任务</Text>
          </View>
        )}
      </View>

      {/* 发布任务弹窗 */}
      {showModal && (
        <View className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <View className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>发布德育任务</Text>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>任务标题</Text>
              <Input
                className={styles.formInput}
                placeholder="如：帮父母做家务"
                value={formTitle}
                onInput={(e) => setFormTitle(e.detail.value)}
                maxlength={30}
              />
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>任务描述</Text>
              <Textarea
                className={styles.formTextarea}
                placeholder="描述具体要求..."
                value={formDesc}
                onInput={(e) => setFormDesc(e.detail.value)}
                maxlength={100}
              />
            </View>

            <View className={styles.formItem}>
              <Text className={styles.formLabel}>善行类别</Text>
              <View className={styles.categoryList}>
                {CATEGORY_KEYS.map((cat) => (
                  <Text
                    key={cat}
                    className={`${styles.categoryOption} ${formCategory === cat ? styles.categoryOptionActive : ''}`}
                    onClick={() => setFormCategory(cat)}
                  >
                    {CATEGORY_CONFIG[cat].icon} {CATEGORY_CONFIG[cat].name}
                  </Text>
                ))}
              </View>
            </View>

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

            <View className={styles.submitBtn} onClick={handleAddTask}>
              <Text className={styles.submitBtnText}>发布任务</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default CircleMoralTasksPage;
