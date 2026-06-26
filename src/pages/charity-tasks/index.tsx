import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useCharityFundStore, TASK_LEVEL_MAP, TASK_STATUS_MAP } from '@/store/charityFund';
import { CharityTask, TaskLevel, TaskSource } from '@/data/charityFund';
import styles from './index.module.scss';

// 任务来源标签
const SOURCE_MAP: Record<TaskSource, { label: string; icon: string }> = {
  system: { label: '系统预设', icon: '⚙️' },
  organization: { label: '公益组织', icon: '🏢' },
  user_proposal: { label: '用户提议', icon: '💡' },
};

// 等级筛选标签
const levelTabs: { key: TaskLevel | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'L1', label: 'L1 日常微善' },
  { key: 'L2', label: 'L2 社区贡献' },
  { key: 'L3', label: 'L3 公益行动' },
];

const CharityTasksPage: React.FC = () => {
  const {
    tasks,
    startTask,
    completeTask,
    proposeTask,
    loadFromStorage,
  } = useCharityFundStore();

  const [activeLevel, setActiveLevel] = useState<TaskLevel | 'all'>('all');
  const [selectedTask, setSelectedTask] = useState<CharityTask | null>(null);
  const [showPropose, setShowPropose] = useState(false);

  // 提议任务表单
  const [proposeTitle, setProposeTitle] = useState('');
  const [proposeDesc, setProposeDesc] = useState('');
  const [proposeLevel, setProposeLevel] = useState<TaskLevel>('L1');
  const [proposeCategory, setProposeCategory] = useState('');

  useEffect(() => {
    loadFromStorage();
  }, []);

  // 按等级筛选
  const filteredTasks = useMemo(() => {
    if (activeLevel === 'all') return tasks;
    return tasks.filter(t => t.level === activeLevel);
  }, [tasks, activeLevel]);

  // 按等级分组统计
  const levelStats = useMemo(() => {
    const stats: Record<TaskLevel, { total: number; completed: number }> = {
      L1: { total: 0, completed: 0 },
      L2: { total: 0, completed: 0 },
      L3: { total: 0, completed: 0 },
    };
    tasks.forEach(t => {
      stats[t.level].total++;
      if (t.status === 'verified') stats[t.level].completed++;
    });
    return stats;
  }, [tasks]);

  // 点击任务
  const handleTaskClick = (task: CharityTask) => {
    setSelectedTask(task);
  };

  // 关闭详情
  const handleCloseDetail = () => {
    setSelectedTask(null);
  };

  // 开始任务
  const handleStartTask = (task: CharityTask) => {
    const result = startTask(task.id);
    if (result.success) {
      Taro.showToast({ title: result.message, icon: 'success' });
      setSelectedTask(null);
    } else {
      Taro.showToast({ title: result.message, icon: 'none' });
    }
  };

  // 完成任务（Mock：模拟上传证明）
  const handleCompleteTask = (task: CharityTask) => {
    // Mock: 模拟拍照上传
    const mockProof = [`https://picsum.photos/id/${Math.floor(Math.random() * 1000)}/400/300`];
    const result = completeTask(task.id, mockProof);
    if (result.success) {
      Taro.showModal({
        title: '提交成功',
        content: 'AI初审已通过，等待人工复审\n复审通过后将获得福气奖励',
        showCancel: false,
        confirmText: '我知道了',
      });
      setSelectedTask(null);
    } else {
      Taro.showToast({ title: result.message, icon: 'none' });
    }
  };

  // 打开提议弹窗
  const handleOpenPropose = () => {
    setShowPropose(true);
    setProposeTitle('');
    setProposeDesc('');
    setProposeLevel('L1');
    setProposeCategory('');
  };

  // 提交任务提议
  const handleProposeSubmit = () => {
    if (proposeTitle.length < 5 || proposeTitle.length > 30) {
      Taro.showToast({ title: '标题需在5-30字之间', icon: 'none' });
      return;
    }
    if (!proposeDesc.trim()) {
      Taro.showToast({ title: '请填写任务描述', icon: 'none' });
      return;
    }
    if (!proposeCategory.trim()) {
      Taro.showToast({ title: '请填写任务分类', icon: 'none' });
      return;
    }

    const result = proposeTask(proposeTitle, proposeDesc, proposeLevel, proposeCategory);
    if (result.success) {
      Taro.showToast({ title: result.message, icon: 'success' });
      setShowPropose(false);
    } else {
      Taro.showToast({ title: result.message, icon: 'none' });
    }
  };

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>善行任务</Text>
        <Text className={styles.headerSubtitle}>
          三级善行任务，从日常微善到公益行动{'\n'}
          完成任务获得福气，兑换温暖善款
        </Text>
      </View>

      {/* 等级概览 */}
      <View className={styles.levelOverview}>
        {(['L1', 'L2', 'L3'] as TaskLevel[]).map((level) => {
          const info = TASK_LEVEL_MAP[level];
          const stat = levelStats[level];
          return (
            <View
              key={level}
              className={styles.levelCard}
              onClick={() => setActiveLevel(level)}
            >
              <View className={styles.levelHeader} style={{ background: `${info.color}1A` }}>
                <Text className={styles.levelBadge} style={{ color: info.color }}>{level}</Text>
                <Text className={styles.levelName} style={{ color: info.color }}>{info.label}</Text>
              </View>
              <Text className={styles.levelDesc}>{info.desc}</Text>
              <Text className={styles.levelRange}>{info.range}</Text>
              <View className={styles.levelProgress}>
                <Text className={styles.levelProgressText}>
                  {stat.completed}/{stat.total}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* 等级筛选 */}
      <ScrollView scrollX className={styles.tabs}>
        {levelTabs.map((tab) => (
          <Text
            key={tab.key}
            className={classnames(styles.tab, activeLevel === tab.key && styles.active)}
            onClick={() => setActiveLevel(tab.key)}
          >
            {tab.label}
          </Text>
        ))}
      </ScrollView>

      {/* 任务列表 */}
      <View className={styles.taskList}>
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const levelInfo = TASK_LEVEL_MAP[task.level];
            const statusInfo = TASK_STATUS_MAP[task.status] || { label: '已取消', color: '#999' };
            const sourceInfo = SOURCE_MAP[task.source];
            return (
              <View
                key={task.id}
                className={styles.taskCard}
                onClick={() => handleTaskClick(task)}
              >
                {/* 卡片头部 */}
                <View className={styles.cardHeader}>
                  <View className={styles.levelTag} style={{ background: `${levelInfo.color}1A` }}>
                    <Text className={styles.levelTagText} style={{ color: levelInfo.color }}>
                      {task.level} · {levelInfo.label}
                    </Text>
                  </View>
                  <Text className={styles.statusTag} style={{ color: statusInfo.color }}>
                    {statusInfo.label}
                  </Text>
                </View>

                {/* 标题 */}
                <Text className={styles.taskTitle}>{task.title}</Text>
                <Text className={styles.taskDesc}>{task.description}</Text>

                {/* 示例 */}
                {task.examples && task.examples.length > 0 && (
                  <View className={styles.examples}>
                    {task.examples.map((ex, idx) => (
                      <Text key={idx} className={styles.exampleTag}>{ex}</Text>
                    ))}
                  </View>
                )}

                {/* 卡片底部 */}
                <View className={styles.cardFooter}>
                  <View className={styles.footerLeft}>
                    <View className={styles.rewardTag}>
                      <Text className={styles.rewardText}>+{task.fortuneReward}福气</Text>
                    </View>
                    <Text className={styles.metaText}>
                      {sourceInfo.icon} {sourceInfo.label} · {task.estimatedTime}
                    </Text>
                  </View>
                  <Text className={styles.participants}>{task.participants}人参与</Text>
                </View>

                {/* 验证信息 */}
                {task.status === 'completed' && (
                  <View className={styles.reviewInfo}>
                    <Text className={styles.reviewText}>
                      AI初审：{task.aiReviewResult === 'passed' ? '✓ 通过' : '✗ 未通过'}
                      {' · '}
                      人工复审：{task.manualReviewResult === 'approved'
                        ? '✓ 通过'
                        : task.manualReviewResult === 'rejected'
                        ? '✗ 驳回'
                        : '待复审'}
                    </Text>
                  </View>
                )}

                {task.status === 'verified' && task.reviewComment && (
                  <View className={styles.verifiedBox}>
                    <Text className={styles.verifiedIcon}>✓</Text>
                    <Text className={styles.verifiedText}>{task.reviewComment}</Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>🌱</Text>
            <Text className={styles.emptyText}>暂无该等级任务</Text>
          </View>
        )}
      </View>

      {/* 提议任务入口 */}
      <View className={styles.proposeBtn} onClick={handleOpenPropose}>
        <Text className={styles.proposeBtnText}>💡 提议善行任务</Text>
      </View>

      {/* 底部说明 */}
      <View className={styles.footerNote}>
        <Text className={styles.footerText}>
          任务来源：系统预设 / 公益组织 / 用户提议{'\n'}
          完成验证：拍照上传 + AI初审 + 人工复审{'\n'}
          状态流程：待开始 → 进行中 → 已完成 → 已验证
        </Text>
      </View>

      {/* 任务详情弹窗 */}
      {selectedTask && (
        <View className={styles.detailMask} onClick={handleCloseDetail}>
          <View className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>任务详情</Text>
              <Text className={styles.detailClose} onClick={handleCloseDetail}>✕</Text>
            </View>

            <View className={styles.detailContent}>
              {/* 等级与状态 */}
              <View className={styles.detailTags}>
                <View
                  className={styles.levelTag}
                  style={{ background: `${TASK_LEVEL_MAP[selectedTask.level].color}1A` }}
                >
                  <Text style={{ color: TASK_LEVEL_MAP[selectedTask.level].color }}>
                    {selectedTask.level} · {TASK_LEVEL_MAP[selectedTask.level].label}
                  </Text>
                </View>
                <Text style={{ color: (TASK_STATUS_MAP[selectedTask.status] || { label: '已取消', color: '#999' }).color }}>
                  {(TASK_STATUS_MAP[selectedTask.status] || { label: '已取消', color: '#999' }).label}
                </Text>
              </View>

              {/* 标题与描述 */}
              <Text className={styles.detailTaskTitle}>{selectedTask.title}</Text>
              <Text className={styles.detailTaskDesc}>{selectedTask.description}</Text>

              {/* 任务信息 */}
              <View className={styles.detailInfo}>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>福气奖励</Text>
                  <Text className={styles.infoValue}>{selectedTask.fortuneReward} 福气</Text>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>预计耗时</Text>
                  <Text className={styles.infoValue}>{selectedTask.estimatedTime}</Text>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>任务分类</Text>
                  <Text className={styles.infoValue}>{selectedTask.category}</Text>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>任务来源</Text>
                  <Text className={styles.infoValue}>
                    {SOURCE_MAP[selectedTask.source].icon} {SOURCE_MAP[selectedTask.source].label}
                  </Text>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>参与人数</Text>
                  <Text className={styles.infoValue}>{selectedTask.participants} 人</Text>
                </View>
                <View className={styles.infoRow}>
                  <Text className={styles.infoLabel}>证明要求</Text>
                  <Text className={styles.infoValue}>
                    {selectedTask.proofRequired ? '需拍照/视频上传' : '无需证明'}
                  </Text>
                </View>
              </View>

              {/* 验证流程说明 */}
              <View className={styles.verifyFlow}>
                <Text className={styles.verifyFlowTitle}>验证流程</Text>
                <View className={styles.verifyStep}>
                  <Text className={styles.verifyStepIcon}>📸</Text>
                  <Text className={styles.verifyStepText}>拍照/视频上传证明</Text>
                </View>
                <View className={styles.verifyStep}>
                  <Text className={styles.verifyStepIcon}>🤖</Text>
                  <Text className={styles.verifyStepText}>AI 初审（自动识别）</Text>
                </View>
                <View className={styles.verifyStep}>
                  <Text className={styles.verifyStepIcon}>👤</Text>
                  <Text className={styles.verifyStepText}>人工复审（工作日内完成）</Text>
                </View>
              </View>

              {/* 操作按钮 */}
              {selectedTask.status === 'pending' && (
                <View
                  className={styles.actionBtn}
                  onClick={() => handleStartTask(selectedTask)}
                >
                  <Text className={styles.actionBtnText}>开始任务</Text>
                </View>
              )}
              {selectedTask.status === 'in_progress' && (
                <View
                  className={styles.actionBtn}
                  onClick={() => handleCompleteTask(selectedTask)}
                >
                  <Text className={styles.actionBtnText}>拍照完成</Text>
                </View>
              )}
              {selectedTask.status === 'completed' && (
                <View className={styles.actionBtnDisabled}>
                  <Text className={styles.actionBtnTextDisabled}>等待人工复审中...</Text>
                </View>
              )}
              {selectedTask.status === 'verified' && (
                <View className={styles.actionBtnDone}>
                  <Text className={styles.actionBtnTextDone}>✓ 已验证完成</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* 提议任务弹窗 */}
      {showPropose && (
        <View className={styles.detailMask} onClick={() => setShowPropose(false)}>
          <View className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>提议善行任务</Text>
              <Text className={styles.detailClose} onClick={() => setShowPropose(false)}>✕</Text>
            </View>

            <View className={styles.detailContent}>
              <Text className={styles.proposeHint}>
                你的提议将提交审核，通过后可被所有用户参与
              </Text>

              {/* 标题输入 */}
              <View className={styles.inputGroup}>
                <Text className={styles.inputLabel}>任务标题（5-30字）</Text>
                <View className={styles.inputBox}>
                  <Input
                    className={styles.inputText}
                    placeholder="请输入任务标题"
                    value={proposeTitle}
                    onInput={(e) => setProposeTitle(e.detail.value)}
                    maxlength={30}
                  />
                </View>
              </View>

              {/* 描述输入 */}
              <View className={styles.inputGroup}>
                <Text className={styles.inputLabel}>任务描述</Text>
                <View className={styles.inputBox}>
                  <Input
                    className={styles.inputText}
                    placeholder="请输入任务描述"
                    value={proposeDesc}
                    onInput={(e) => setProposeDesc(e.detail.value)}
                  />
                </View>
              </View>

              {/* 分类输入 */}
              <View className={styles.inputGroup}>
                <Text className={styles.inputLabel}>任务分类</Text>
                <View className={styles.inputBox}>
                  <Input
                    className={styles.inputText}
                    placeholder="如：邻里互助"
                    value={proposeCategory}
                    onInput={(e) => setProposeCategory(e.detail.value)}
                  />
                </View>
              </View>

              {/* 等级选择 */}
              <View className={styles.inputGroup}>
                <Text className={styles.inputLabel}>任务等级</Text>
                <View className={styles.levelSelect}>
                  {(['L1', 'L2', 'L3'] as TaskLevel[]).map((level) => (
                    <View
                      key={level}
                      className={classnames(
                        styles.levelOption,
                        proposeLevel === level && styles.levelOptionActive
                      )}
                      onClick={() => setProposeLevel(level)}
                    >
                      <Text className={styles.levelOptionText}>{level}</Text>
                      <Text className={styles.levelOptionLabel}>{TASK_LEVEL_MAP[level].label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* 提交按钮 */}
              <View className={styles.actionBtn} onClick={handleProposeSubmit}>
                <Text className={styles.actionBtnText}>提交提议</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default CharityTasksPage;
