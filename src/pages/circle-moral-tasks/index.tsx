import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, Textarea, Switch, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useMoralTaskStore } from '@/store/moral-task';
import { useCircleStore } from '@/store/circle';
import { useUserStore } from '@/store/user';
import { getCircleTypeConfig, CircleType } from '@/config/circle-types';
import { generateImprovementSuggestion } from '@/services/ai-circle';
import styles from './index.module.scss';

interface TaskTemplate {
  title: string;
  description: string;
  category: string;
}

const QUICK_TEMPLATES: Record<CircleType, TaskTemplate[]> = {
  class: [
    { title: '帮父母做家务', description: '洗碗、扫地、整理房间、洗衣服等均可，请拍摄视频记录', category: 'housework' },
    { title: '主动帮助同学', description: '帮助同学解决学习困难、分享文具、一起打扫卫生等', category: 'help_others' },
    { title: '环保小行动', description: '垃圾分类、节约用水用电、爱护花草树木等', category: 'environmental' },
    { title: '阅读分享', description: '阅读一本好书，写下读后感或与同学分享', category: 'reading' },
  ],
  company: [
    { title: '社区义工日', description: '前往社区敬老院陪伴老人，协助日常活动，记录服务时长', category: 'charity' },
    { title: '绿色办公倡议', description: '推行无纸化办公、节约用电、自带水杯，提交绿色办公小贴士', category: 'environmental' },
    { title: '跨部门协作', description: '与其他部门同事合作完成一项公益或创新项目', category: 'team' },
    { title: '志愿服务', description: '参与公司组织的志愿服务活动，记录服务心得', category: 'volunteer' },
  ],
  community: [
    { title: '楼道清洁日', description: '清理所住楼道垃圾、擦拭扶手和门窗', category: 'environmental' },
    { title: '关爱独居老人', description: '定期探访社区独居老人，陪聊天、帮忙买菜或代取快递', category: 'elderly' },
    { title: '邻里互助', description: '在互助群中响应邻居需求，或出借闲置物品', category: 'neighbor' },
    { title: '安全巡查', description: '巡查楼道消防隐患、检查公共设施安全', category: 'safety' },
  ],
  friends: [
    { title: '互助打卡', description: '本周为朋友做一件力所能及的事，可以是帮搬家、带饭、修电脑等', category: 'help' },
    { title: '陪伴时光', description: '陪伴朋友度过重要时刻或低落时期，一起吃饭、散步、聊天均可', category: 'accompany' },
    { title: '好物分享', description: '分享自己觉得好用的物品或美食给朋友', category: 'share' },
    { title: '美好回忆', description: '记录和朋友的一次美好聚会或旅行，配照片和文字感言', category: 'memory' },
  ],
  public: [
    { title: '公益捐赠', description: '捐赠闲置物品或参与公益募捐活动', category: 'charity' },
    { title: '环保行动', description: '参与垃圾分类宣传、植树造林等环保活动', category: 'environmental' },
    { title: '助学支教', description: '为贫困地区学生捐赠书籍或参与线上支教', category: 'education' },
    { title: '健康关爱', description: '参与社区健康宣传或为有需要的人提供健康帮助', category: 'health' },
  ],
};

const CircleMoralTasksPage: React.FC = () => {
  const router = useRouter();
  const circleId = router.params.id || '';

  const { getTasksByCircle, addTask, getSubmissionsByTask, getSubmissionsByCircle, loadFromStorage } = useMoralTaskStore();
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

  // 提交列表弹窗
  const [showSubmissions, setShowSubmissions] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskSubmissions, setTaskSubmissions] = useState<any[]>([]);

  // AI 建议
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const [aiSuggestTarget, setAiSuggestTarget] = useState<string | null>(null);

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
      category: formCategory as string,
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
                      const subs = getSubmissionsByCircle(circleId).filter((s) => s.taskId === task.id);
                      setSelectedTask(task);
                      setTaskSubmissions(subs);
                      setShowSubmissions(true);
                    }}>
                      查看提交 ({task.submissionCount})
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

            {/* 快捷模板 */}
            <View className={styles.formItem}>
              <Text className={styles.formLabel}>⚡ 快捷模板</Text>
              <View className={styles.templateList}>
                {QUICK_TEMPLATES[circleType]?.map((tmpl, idx) => (
                  <View
                    key={idx}
                    className={styles.templateTag}
                    onClick={() => {
                      setFormTitle(tmpl.title);
                      setFormDesc(tmpl.description);
                      setFormCategory(tmpl.category);
                    }}
                  >
                    <Text className={styles.templateTagText}>{tmpl.title}</Text>
                  </View>
                ))}
              </View>
            </View>

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

      {/* 提交列表弹窗 */}
      {showSubmissions && selectedTask && (
        <View className={styles.modalOverlay} onClick={() => setShowSubmissions(false)}>
          <View className={styles.modalPanel} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>{selectedTask.title} - 提交列表</Text>
            <ScrollView scrollY style={{ maxHeight: '60vh' }}>
              {taskSubmissions.length > 0 ? (
                taskSubmissions.map((sub) => (
                  <View key={sub.id} className={styles.submissionItem}>
                    <View className={styles.submissionHeader}>
                      <Text className={styles.submissionUser}>{sub.userName}</Text>
                      <View className={styles.submissionTags}>
                        {sub.isExample && <Text className={styles.submissionTagExample}>⭐ 榜样</Text>}
                        {sub.needsRevision && <Text className={styles.submissionTagRevise}>📝 需修改</Text>}
                        <Text className={styles.submissionDate}>{sub.createdAt.split('T')[0]}</Text>
                      </View>
                    </View>
                    <Text className={styles.submissionContent}>{sub.content}</Text>

                    {/* 老师操作区 */}
                    <View className={styles.teacherActions}>
                      <View
                        className={`${styles.teacherActionBtn} ${sub.isExample ? styles.teacherActionBtnActive : ''}`}
                        onClick={() => {
                          const { markExample } = useMoralTaskStore.getState();
                          markExample(sub.id, !sub.isExample);
                          // 刷新列表
                          const subs = getSubmissionsByCircle(circleId).filter((s) => s.taskId === selectedTask.id);
                          setTaskSubmissions(subs);
                          Taro.showToast({ title: sub.isExample ? '取消榜样标记' : '已标记为榜样', icon: 'success' });
                        }}
                      >
                        <Text className={styles.teacherActionBtnText}>⭐ 榜样</Text>
                      </View>
                      <View
                        className={`${styles.teacherActionBtn} ${sub.needsRevision ? styles.teacherActionBtnWarn : ''}`}
                        onClick={() => {
                          const { markNeedsRevision } = useMoralTaskStore.getState();
                          markNeedsRevision(sub.id);
                          const subs = getSubmissionsByCircle(circleId).filter((s) => s.taskId === selectedTask.id);
                          setTaskSubmissions(subs);
                          Taro.showToast({ title: '已标记需修改', icon: 'none' });
                        }}
                      >
                        <Text className={styles.teacherActionBtnText}>📝 需修改</Text>
                      </View>
                    </View>

                    {/* AI 改进建议 */}
                    {aiSuggestTarget === sub.id && aiSuggestion ? (
                      <View className={styles.aiSuggestBox}>
                        <Text className={styles.aiSuggestLabel}>🤖 AI 建议</Text>
                        <Text className={styles.aiSuggestText}>{aiSuggestion}</Text>
                      </View>
                    ) : (
                      <View
                        className={styles.aiSuggestBtn}
                        onClick={async () => {
                          if (aiSuggestLoading) return;
                          setAiSuggestTarget(sub.id);
                          setAiSuggestLoading(true);
                          try {
                            const suggestion = await generateImprovementSuggestion(
                              sub.content,
                              selectedTask.title,
                              selectedTask.description
                            );
                            setAiSuggestion(suggestion);
                          } catch (e) {
                            Taro.showToast({ title: '生成失败', icon: 'none' });
                          } finally {
                            setAiSuggestLoading(false);
                          }
                        }}
                      >
                        <Text className={styles.aiSuggestBtnText}>
                          {aiSuggestLoading && aiSuggestTarget === sub.id ? '思考中...' : '🤖 AI 改进建议'}
                        </Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <Text className={styles.emptyText}>暂无提交</Text>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

export default CircleMoralTasksPage;
