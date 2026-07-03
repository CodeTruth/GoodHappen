import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, ScrollView, Image, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useAdminStore } from '@/store/admin';
import { useModerationStore } from '@/store/moderation';
import type { AdminReviewTask, AdminReviewStatus } from '@/store/admin';
import styles from './index.module.scss';

// 审核队列标签
type QueueTab = 'pending' | 'reviewing' | 'approved' | 'returned' | 'rejected' | 'all';

const QUEUE_TABS: Array<{ key: QueueTab; name: string }> = [
  { key: 'pending', name: '待审核' },
  { key: 'reviewing', name: '审核中' },
  { key: 'approved', name: '已通过' },
  { key: 'returned', name: '已退回' },
  { key: 'rejected', name: '已拒绝' },
  { key: 'all', name: '全部' },
];

// 状态文案映射
const STATUS_TEXT: Record<AdminReviewStatus, string> = {
  pending: '待审核',
  reviewing: '审核中',
  approved: '已通过',
  returned: '已退回',
  rejected: '已拒绝',
};

// 状态样式映射
const STATUS_STYLE: Record<AdminReviewStatus, string> = {
  pending: styles.statusPending,
  reviewing: styles.statusReviewing,
  approved: styles.statusApproved,
  returned: styles.statusReturned,
  rejected: styles.statusRejected,
};

const AdminReviewPage: React.FC = () => {
  const {
    reviewTasks,
    approveReviewTask,
    returnReviewTask,
    rejectReviewTask,
    batchApprove,
    batchReject,
    loadFromStorage,
  } = useAdminStore();

  // 同步加载已有 moderation store 数据
  const { tasks: moderationTasks, loadFromStorage: loadModeration } = useModerationStore();

  const [activeTab, setActiveTab] = useState<QueueTab>('pending');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBatchBar, setShowBatchBar] = useState(false);
  const [detailTask, setDetailTask] = useState<AdminReviewTask | null>(null);
  const [showReasonInput, setShowReasonInput] = useState<'return' | 'reject' | null>(null);
  const [reasonText, setReasonText] = useState('');

  useEffect(() => {
    loadFromStorage();
    loadModeration();
  }, []);

  // 各状态任务数量统计
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      pending: 0,
      reviewing: 0,
      approved: 0,
      returned: 0,
      rejected: 0,
      all: reviewTasks.length,
    };
    reviewTasks.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [reviewTasks]);

  // 合并 moderation store 的数据（使用已有 moderation.ts 中的数据）
  const mergedTasks = useMemo(() => {
    // 将 moderation store 中的任务映射为 admin 格式（仅补充 admin store 中不存在的）
    const existingIds = new Set(reviewTasks.map((t) => t.id));
    const extraTasks: AdminReviewTask[] = moderationTasks
      .filter((t) => !existingIds.has(t.id))
      .map((t) => ({
        id: t.id,
        contentId: t.contentId,
        content: t.content,
        tags: [],
        userId: 'unknown',
        userName: '未知用户',
        userAvatar: '',
        userRegion: '未知',
        aiResult: t.aiResult,
        aiConfidence: t.aiConfidence,
        aiReason: t.aiReason,
        status: t.status === 'pending' ? 'pending' : t.status === 'reviewing' ? 'reviewing' : 'approved',
        reviewer: t.reviewer,
        reviewedAt: t.reviewedAt,
        reviewNote: t.reviewNote,
        createdAt: t.createdAt,
        kindnessType: 'self' as const,
        blessingValue: 0,
      }));
    return [...reviewTasks, ...extraTasks];
  }, [reviewTasks, moderationTasks]);

  // 筛选后的任务列表
  const filteredTasks = useMemo(() => {
    let result = mergedTasks;
    // 按状态筛选
    if (activeTab !== 'all') {
      result = result.filter((t) => t.status === activeTab);
    }
    // 按关键词搜索（用户名或内容）
    if (searchKeyword.trim()) {
      const kw = searchKeyword.trim().toLowerCase();
      result = result.filter(
        (t) =>
          t.userName.toLowerCase().includes(kw) ||
          t.content.toLowerCase().includes(kw) ||
          t.userId.toLowerCase().includes(kw)
      );
    }
    // 按时间倒序排列
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [mergedTasks, activeTab, searchKeyword]);

  // 切换选中状态
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // 全选当前列表
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTasks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTasks.map((t) => t.id));
    }
  };

  // 切换批量模式
  const handleToggleBatch = () => {
    setShowBatchBar(!showBatchBar);
    if (showBatchBar) {
      setSelectedIds([]);
    }
  };

  // 批量通过
  const handleBatchApprove = () => {
    if (selectedIds.length === 0) {
      Taro.showToast({ title: '请先选择任务', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '批量通过',
      content: `确定批量通过 ${selectedIds.length} 条审核任务吗？`,
      success: (res) => {
        if (res.confirm) {
          batchApprove(selectedIds, '当前管理员');
          Taro.showToast({ title: `已通过 ${selectedIds.length} 条`, icon: 'success' });
          setSelectedIds([]);
          setShowBatchBar(false);
        }
      },
    });
  };

  // 批量拒绝
  const handleBatchReject = () => {
    if (selectedIds.length === 0) {
      Taro.showToast({ title: '请先选择任务', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '批量拒绝',
      content: `确定批量拒绝 ${selectedIds.length} 条审核任务吗？`,
      // editable/placeholderText 是微信小程序扩展属性，Taro 类型定义未包含
      editable: true,
      placeholderText: '请输入拒绝原因',
      success: (res) => {
        if (res.confirm) {
          const reason = (res as { content?: string }).content || '批量拒绝';
          batchReject(selectedIds, '当前管理员', reason);
          Taro.showToast({ title: `已拒绝 ${selectedIds.length} 条`, icon: 'success' });
          setSelectedIds([]);
          setShowBatchBar(false);
        }
      },
    } as any);
  };

  // 单条通过
  const handleApprove = (task: AdminReviewTask) => {
    Taro.showModal({
      title: '确认通过',
      content: '确定通过该审核任务吗？',
      success: (res) => {
        if (res.confirm) {
          approveReviewTask(task.id, '当前管理员', '审核通过');
          Taro.showToast({ title: '已通过', icon: 'success' });
          setDetailTask(null);
        }
      },
    });
  };

  // 单条退回
  const handleReturn = (task: AdminReviewTask) => {
    if (!reasonText.trim()) {
      Taro.showToast({ title: '请填写退回原因', icon: 'none' });
      return;
    }
    returnReviewTask(task.id, '当前管理员', reasonText.trim());
    Taro.showToast({ title: '已退回', icon: 'success' });
    setDetailTask(null);
    setShowReasonInput(null);
    setReasonText('');
  };

  // 单条拒绝
  const handleReject = (task: AdminReviewTask) => {
    if (!reasonText.trim()) {
      Taro.showToast({ title: '请填写拒绝原因', icon: 'none' });
      return;
    }
    rejectReviewTask(task.id, '当前管理员', reasonText.trim());
    Taro.showToast({ title: '已拒绝', icon: 'success' });
    setDetailTask(null);
    setShowReasonInput(null);
    setReasonText('');
  };

  // 打开详情
  const handleOpenDetail = (task: AdminReviewTask) => {
    setDetailTask(task);
    setShowReasonInput(null);
    setReasonText('');
  };

  // 格式化时间
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 30) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <View className={styles.container}>
      {/* 顶部统计头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>内容审核管理</Text>
        <Text className={styles.headerDesc}>审核用户善行内容，处置违规行为</Text>
        <View className={styles.headerStats}>
          <View className={styles.headerStat}>
            <Text className={styles.headerStatValue}>{statusCounts.pending}</Text>
            <Text className={styles.headerStatLabel}>待审核</Text>
          </View>
          <View className={styles.headerStat}>
            <Text className={styles.headerStatValue}>{statusCounts.reviewing}</Text>
            <Text className={styles.headerStatLabel}>审核中</Text>
          </View>
          <View className={styles.headerStat}>
            <Text className={styles.headerStatValue}>{statusCounts.all}</Text>
            <Text className={styles.headerStatLabel}>总任务</Text>
          </View>
        </View>
      </View>

      {/* 搜索栏 */}
      <View className={styles.searchBar}>
        <Input
          className={styles.searchInput}
          placeholder="搜索用户名/内容/用户ID"
          value={searchKeyword}
          onInput={(e) => setSearchKeyword(e.detail.value)}
        />
        <View
          className={styles.searchBtn}
          onClick={handleToggleBatch}
        >
          <Text className={styles.searchBtnText}>{showBatchBar ? '取消批量' : '批量操作'}</Text>
        </View>
      </View>

      {/* 状态标签栏 */}
      <ScrollView scrollX className={styles.tabBar} enhanced showScrollbar={false}>
        {QUEUE_TABS.map((tab) => (
          <View
            key={tab.key}
            className={classnames(styles.tabItem, activeTab === tab.key && styles.active)}
            onClick={() => setActiveTab(tab.key)}
          >
            <Text className={styles.tabText}>{tab.name}</Text>
            <Text className={styles.tabBadge}>{statusCounts[tab.key] || 0}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 批量操作栏 */}
      {showBatchBar && (
        <View className={styles.batchBar}>
          <View className={styles.batchInfo}>
            <View
              className={classnames(styles.batchCheckbox, selectedIds.length === filteredTasks.length && filteredTasks.length > 0 && styles.batchCheckboxChecked)}
              onClick={toggleSelectAll}
            />
            <Text className={styles.batchCheckboxText}>
              已选 {selectedIds.length}/{filteredTasks.length} 条
            </Text>
          </View>
          <View className={styles.batchActions}>
            <View className={classnames(styles.batchBtn, styles.batchApprove)} onClick={handleBatchApprove}>
              <Text className={styles.batchBtnText}>批量通过</Text>
            </View>
            <View className={classnames(styles.batchBtn, styles.batchReject)} onClick={handleBatchReject}>
              <Text className={styles.batchBtnText}>批量拒绝</Text>
            </View>
          </View>
        </View>
      )}

      {/* 任务列表 */}
      <View className={styles.content}>
        {filteredTasks.length === 0 ? (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>📋</Text>
            <Text className={styles.emptyText}>暂无审核任务</Text>
          </View>
        ) : (
          filteredTasks.map((task) => (
            <View key={task.id} className={styles.taskCard}>
              <View className={styles.taskCardHeader}>
                {showBatchBar && (
                  <View
                    className={classnames(styles.taskCheckbox, selectedIds.includes(task.id) && styles.checked)}
                    onClick={() => toggleSelect(task.id)}
                  >
                    {selectedIds.includes(task.id) && <Text style={{ color: '#fff', fontSize: '20rpx' }}>✓</Text>}
                  </View>
                )}
                <View className={styles.taskUserInfo}>
                  <Text className={styles.taskUserName}>{task.userName}</Text>
                  <Text className={styles.taskUserMeta}>
                    {task.userRegion} · {task.kindnessType === 'self' ? '自己做的' : '见证的'} · {formatTime(task.createdAt)}
                  </Text>
                </View>
                <View className={classnames(styles.statusTag, STATUS_STYLE[task.status])}>
                  <Text>{STATUS_TEXT[task.status]}</Text>
                </View>
              </View>

              <Text className={styles.taskContent}>{task.content}</Text>

              {task.images && task.images.length > 0 && (
                <View className={styles.taskImages}>
                  {task.images.map((img, idx) => (
                    <Image
                      key={idx}
                      className={styles.taskImage}
                      src={img}
                      mode="aspectFill"
                      onError={(e) => console.error('[AdminReview] Image load error:', e)}
                    />
                  ))}
                </View>
              )}

              {task.tags.length > 0 && (
                <View className={styles.taskTags}>
                  {task.tags.map((tag, idx) => (
                    <Text key={idx} className={styles.taskTag}>{tag}</Text>
                  ))}
                </View>
              )}

              {/* AI 审核结果 */}
              <View className={styles.aiResult}>
                <View className={styles.aiResultHeader}>
                  <Text className={styles.aiResultTitle}>✨ AI初审结果</Text>
                  <Text className={styles.aiConfidence}>置信度: {(task.aiConfidence * 100).toFixed(0)}%</Text>
                </View>
                <Text className={styles.aiReason}>
                  {task.aiResult === 'rejected' ? '建议拒绝' : '建议修改'}：{task.aiReason || '无'}
                </Text>
              </View>

              {/* 操作按钮（仅待审核/审核中显示） */}
              {(task.status === 'pending' || task.status === 'reviewing') && !showBatchBar && (
                <View className={styles.taskActions}>
                  <View
                    className={classnames(styles.actionBtn, styles.actionApprove)}
                    onClick={() => handleApprove(task)}
                  >
                    <Text className={styles.actionBtnText}>通过</Text>
                  </View>
                  <View
                    className={classnames(styles.actionBtn, styles.actionReturn)}
                    onClick={() => {
                      setDetailTask(task);
                      setShowReasonInput('return');
                    }}
                  >
                    <Text className={styles.actionBtnText}>退回</Text>
                  </View>
                  <View
                    className={classnames(styles.actionBtn, styles.actionReject)}
                    onClick={() => {
                      setDetailTask(task);
                      setShowReasonInput('reject');
                    }}
                  >
                    <Text className={styles.actionBtnText}>拒绝</Text>
                  </View>
                  <View
                    className={classnames(styles.actionBtn, styles.actionDetail)}
                    onClick={() => handleOpenDetail(task)}
                  >
                    <Text className={styles.actionDetailText}>详情</Text>
                  </View>
                </View>
              )}

              {/* 已处理任务显示详情按钮 */}
              {task.status !== 'pending' && task.status !== 'reviewing' && !showBatchBar && (
                <View className={styles.taskActions}>
                  <View
                    className={classnames(styles.actionBtn, styles.actionDetail)}
                    onClick={() => handleOpenDetail(task)}
                  >
                    <Text className={styles.actionDetailText}>查看详情</Text>
                  </View>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* 详情弹窗 */}
      {detailTask && (
        <View className={styles.detailMask} onClick={() => { setDetailTask(null); setShowReasonInput(null); }}>
          <View className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>审核详情</Text>
              <Text className={styles.detailClose} onClick={() => { setDetailTask(null); setShowReasonInput(null); }}>✕</Text>
            </View>

            <View className={styles.detailBody}>
              {/* 用户信息 */}
              <View className={styles.detailSection}>
                <Text className={styles.detailSectionTitle}>用户信息</Text>
                <View className={styles.detailUserInfo}>
                  {detailTask.userAvatar && (
                    <Image className={styles.detailAvatar} src={detailTask.userAvatar} mode="aspectFill" />
                  )}
                  <View>
                    <Text className={styles.detailUserName}>{detailTask.userName}</Text>
                    <Text className={styles.detailUserMeta}>
                      ID: {detailTask.userId} · {detailTask.userRegion}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 善行内容 */}
              <View className={styles.detailSection}>
                <Text className={styles.detailSectionTitle}>善行内容</Text>
                <Text className={styles.detailContent}>{detailTask.content}</Text>
                {detailTask.images && detailTask.images.length > 0 && (
                  <View className={styles.taskImages}>
                    {detailTask.images.map((img, idx) => (
                      <Image
                        key={idx}
                        className={styles.taskImage}
                        src={img}
                        mode="aspectFill"
                      />
                    ))}
                  </View>
                )}
                {detailTask.tags.length > 0 && (
                  <View className={styles.taskTags}>
                    {detailTask.tags.map((tag, idx) => (
                      <Text key={idx} className={styles.taskTag}>{tag}</Text>
                    ))}
                  </View>
                )}
              </View>

              {/* AI 审核结果 */}
              <View className={styles.detailSection}>
                <Text className={styles.detailSectionTitle}>AI审核结果</Text>
                <View className={styles.aiResult}>
                  <View className={styles.aiResultHeader}>
                    <Text className={styles.aiResultTitle}>
                      ✨ {detailTask.aiResult === 'rejected' ? '建议拒绝' : '建议修改'}
                    </Text>
                    <Text className={styles.aiConfidence}>
                      置信度: {(detailTask.aiConfidence * 100).toFixed(0)}%
                    </Text>
                  </View>
                  <Text className={styles.aiReason}>{detailTask.aiReason || '无'}</Text>
                </View>
              </View>

              {/* 审核信息 */}
              {detailTask.reviewer && (
                <View className={styles.detailSection}>
                  <Text className={styles.detailSectionTitle}>审核信息</Text>
                  <View className={styles.detailUserInfo}>
                    <View>
                      <Text className={styles.detailUserName}>审核人: {detailTask.reviewer}</Text>
                      <Text className={styles.detailUserMeta}>
                        审核时间: {detailTask.reviewedAt ? formatTime(detailTask.reviewedAt) : '无'}
                      </Text>
                      {detailTask.reviewNote && (
                        <Text className={styles.detailUserMeta}>备注: {detailTask.reviewNote}</Text>
                      )}
                      {detailTask.returnReason && (
                        <Text className={styles.detailUserMeta}>原因: {detailTask.returnReason}</Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* 退回/拒绝原因输入 */}
              {showReasonInput && (
                <View className={styles.detailSection}>
                  <Text className={styles.detailSectionTitle}>
                    {showReasonInput === 'return' ? '退回原因' : '拒绝原因'}
                  </Text>
                  <Textarea
                    className={styles.reasonInput}
                    placeholder={showReasonInput === 'return' ? '请填写退回原因，将通知用户修改后重新提交' : '请填写拒绝原因，将通知用户'}
                    value={reasonText}
                    onInput={(e) => setReasonText(e.detail.value)}
                    maxlength={200}
                  />
                </View>
              )}
            </View>

            {/* 底部操作按钮 */}
            {(detailTask.status === 'pending' || detailTask.status === 'reviewing') && (
              <View className={styles.detailFooter}>
                {showReasonInput ? (
                  <>
                    <View
                      className={classnames(styles.actionBtn, styles.actionDetail)}
                      onClick={() => { setShowReasonInput(null); setReasonText(''); }}
                    >
                      <Text className={styles.actionDetailText}>取消</Text>
                    </View>
                    <View
                      className={classnames(
                        styles.actionBtn,
                        showReasonInput === 'return' ? styles.actionReturn : styles.actionReject
                      )}
                      onClick={() => {
                        if (showReasonInput === 'return') handleReturn(detailTask);
                        else handleReject(detailTask);
                      }}
                    >
                      <Text className={styles.actionBtnText}>
                        确认{showReasonInput === 'return' ? '退回' : '拒绝'}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View
                      className={classnames(styles.actionBtn, styles.actionApprove)}
                      onClick={() => handleApprove(detailTask)}
                    >
                      <Text className={styles.actionBtnText}>通过</Text>
                    </View>
                    <View
                      className={classnames(styles.actionBtn, styles.actionReturn)}
                      onClick={() => setShowReasonInput('return')}
                    >
                      <Text className={styles.actionBtnText}>退回</Text>
                    </View>
                    <View
                      className={classnames(styles.actionBtn, styles.actionReject)}
                      onClick={() => setShowReasonInput('reject')}
                    >
                      <Text className={styles.actionBtnText}>拒绝</Text>
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

export default AdminReviewPage;
