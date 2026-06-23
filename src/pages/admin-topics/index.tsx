import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, ScrollView, Textarea, Slider } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useAdminStore } from '@/store/admin';
import type { AdminTopic, TopicStatus } from '@/data/admin';
import styles from './index.module.scss';

// 筛选标签
type FilterTab = 'all' | TopicStatus;

const FILTER_TABS: Array<{ key: FilterTab; name: string }> = [
  { key: 'all', name: '全部' },
  { key: 'online', name: '已上线' },
  { key: 'offline', name: '已下线' },
];

// 可选颜色
const TOPIC_COLORS = ['#FF6B6B', '#FFA07A', '#52C41A', '#FAAD14', '#165DFF', '#722ED1', '#13C2C2', '#EB2F96'];

// 表单数据类型
interface TopicFormData {
  name: string;
  description: string;
  color: string;
  sortWeight: number;
}

const AdminTopicsPage: React.FC = () => {
  const {
    topics,
    createTopic,
    updateTopic,
    onlineTopic,
    offlineTopic,
    loadFromStorage,
  } = useAdminStore();

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  // 创建/编辑弹窗
  const [showForm, setShowForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState<AdminTopic | null>(null);
  // 表单数据
  const [formData, setFormData] = useState<TopicFormData>({
    name: '',
    description: '',
    color: TOPIC_COLORS[0],
    sortWeight: 50,
  });

  useEffect(() => {
    loadFromStorage();
  }, []);

  // 各状态话题数量统计
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: topics.length, online: 0, offline: 0 };
    topics.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [topics]);

  // 筛选后的话题列表（按权重降序）
  const filteredTopics = useMemo(() => {
    let result = topics;
    if (activeFilter !== 'all') {
      result = result.filter((t) => t.status === activeFilter);
    }
    return result.sort((a, b) => b.sortWeight - a.sortWeight);
  }, [topics, activeFilter]);

  // 打开创建表单
  const handleOpenCreate = () => {
    setEditingTopic(null);
    setFormData({
      name: '',
      description: '',
      color: TOPIC_COLORS[0],
      sortWeight: 50,
    });
    setShowForm(true);
  };

  // 打开编辑表单
  const handleOpenEdit = (topic: AdminTopic) => {
    setEditingTopic(topic);
    setFormData({
      name: topic.name,
      description: topic.description,
      color: topic.color,
      sortWeight: topic.sortWeight,
    });
    setShowForm(true);
  };

  // 提交表单
  const handleSubmit = () => {
    // 表单校验
    if (!formData.name.trim()) {
      Taro.showToast({ title: '请填写话题名称', icon: 'none' });
      return;
    }
    if (!formData.description.trim()) {
      Taro.showToast({ title: '请填写话题描述', icon: 'none' });
      return;
    }
    if (formData.name.trim().length > 20) {
      Taro.showToast({ title: '话题名称不超过20字', icon: 'none' });
      return;
    }
    if (formData.description.trim().length > 100) {
      Taro.showToast({ title: '话题描述不超过100字', icon: 'none' });
      return;
    }

    if (editingTopic) {
      // 编辑模式
      updateTopic(editingTopic.id, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        sortWeight: formData.sortWeight,
      });
      Taro.showToast({ title: '话题已更新', icon: 'success' });
    } else {
      // 创建模式
      createTopic({
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color,
        sortWeight: formData.sortWeight,
        status: 'online',
        creatorId: 'admin_current',
        creatorName: '当前管理员',
      });
      Taro.showToast({ title: '话题已创建', icon: 'success' });
    }
    setShowForm(false);
    setEditingTopic(null);
  };

  // 上线/下线切换
  const handleToggleStatus = (topic: AdminTopic) => {
    const action = topic.status === 'online' ? '下线' : '上线';
    Taro.showModal({
      title: `${action}确认`,
      content: `确定${action}话题"${topic.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          if (topic.status === 'online') {
            offlineTopic(topic.id);
          } else {
            onlineTopic(topic.id);
          }
          Taro.showToast({ title: `已${action}`, icon: 'success' });
        }
      },
    });
  };

  // 格式化时间
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <View className={styles.container}>
      {/* 顶部头部 */}
      <View className={styles.header}>
        <View className={styles.headerRow}>
          <View>
            <Text className={styles.headerTitle}>话题管理</Text>
            <Text className={styles.headerDesc}>创建/编辑/上下线话题</Text>
          </View>
          <View className={styles.createBtn} onClick={handleOpenCreate}>
            <Text className={styles.createBtnText}>+ 创建</Text>
          </View>
        </View>
        <View className={styles.headerStats}>
          <View className={styles.headerStat}>
            <Text className={styles.headerStatValue}>{statusCounts.all}</Text>
            <Text className={styles.headerStatLabel}>总话题</Text>
          </View>
          <View className={styles.headerStat}>
            <Text className={styles.headerStatValue}>{statusCounts.online}</Text>
            <Text className={styles.headerStatLabel}>已上线</Text>
          </View>
          <View className={styles.headerStat}>
            <Text className={styles.headerStatValue}>{statusCounts.offline}</Text>
            <Text className={styles.headerStatLabel}>已下线</Text>
          </View>
        </View>
      </View>

      {/* 筛选标签栏 */}
      <ScrollView scrollX className={styles.filterBar} enhanced showScrollbar={false}>
        {FILTER_TABS.map((tab) => (
          <View
            key={tab.key}
            className={classnames(styles.filterItem, activeFilter === tab.key && styles.active)}
            onClick={() => setActiveFilter(tab.key)}
          >
            <Text className={styles.filterText}>{tab.name} ({statusCounts[tab.key] || 0})</Text>
          </View>
        ))}
      </ScrollView>

      {/* 话题列表 */}
      <View className={styles.content}>
        {filteredTopics.length === 0 ? (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>💬</Text>
            <Text className={styles.emptyText}>暂无话题</Text>
          </View>
        ) : (
          filteredTopics.map((topic) => (
            <View
              key={topic.id}
              className={styles.topicCard}
              style={{ borderLeftColor: topic.color }}
            >
              <View className={styles.topicHeader}>
                <View className={styles.topicInfo}>
                  <Text className={styles.topicName}>{topic.name}</Text>
                  <Text className={styles.topicMeta}>
                    创建者: {topic.creatorName} · {formatTime(topic.createdAt)}
                  </Text>
                </View>
                <View className={classnames(styles.statusTag, topic.status === 'online' ? styles.statusOnline : styles.statusOffline)}>
                  <Text>{topic.status === 'online' ? '已上线' : '已下线'}</Text>
                </View>
              </View>

              <Text className={styles.topicDesc}>{topic.description}</Text>

              <View className={styles.topicStats}>
                <View className={styles.topicStat}>
                  <Text className={styles.topicStatValue}>{topic.kindnessCount}</Text>
                  <Text className={styles.topicStatLabel}>善行数</Text>
                </View>
                <View className={styles.topicStat}>
                  <Text className={styles.topicStatValue}>{topic.sortWeight}</Text>
                  <Text className={styles.topicStatLabel}>权重</Text>
                </View>
                <View className={styles.topicStat}>
                  <Text className={styles.topicStatValue}>{formatTime(topic.updatedAt)}</Text>
                  <Text className={styles.topicStatLabel}>更新</Text>
                </View>
              </View>

              <View className={styles.topicActions}>
                <View
                  className={classnames(styles.actionBtn, styles.actionEdit)}
                  onClick={() => handleOpenEdit(topic)}
                >
                  <Text className={styles.actionBtnText}>编辑</Text>
                </View>
                {topic.status === 'online' ? (
                  <View
                    className={classnames(styles.actionBtn, styles.actionOffline)}
                    onClick={() => handleToggleStatus(topic)}
                  >
                    <Text className={styles.actionBtnText}>下线</Text>
                  </View>
                ) : (
                  <View
                    className={classnames(styles.actionBtn, styles.actionOnline)}
                    onClick={() => handleToggleStatus(topic)}
                  >
                    <Text className={styles.actionBtnText}>上线</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* 创建/编辑表单弹窗 */}
      {showForm && (
        <View className={styles.formMask} onClick={() => setShowForm(false)}>
          <View className={styles.formPanel} onClick={(e) => e.stopPropagation()}>
            <View className={styles.formHeader}>
              <Text className={styles.formTitle}>{editingTopic ? '编辑话题' : '创建话题'}</Text>
              <Text className={styles.formClose} onClick={() => setShowForm(false)}>✕</Text>
            </View>

            <View className={styles.formBody}>
              {/* 话题名称 */}
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  话题名称<Text className={styles.formRequired}>*</Text>
                </Text>
                <Input
                  className={styles.formInput}
                  placeholder="请输入话题名称（不超过20字）"
                  value={formData.name}
                  onInput={(e) => setFormData({ ...formData, name: e.detail.value })}
                  maxlength={20}
                />
                <Text className={styles.formHint}>{formData.name.length}/20 字</Text>
              </View>

              {/* 话题描述 */}
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>
                  话题描述<Text className={styles.formRequired}>*</Text>
                </Text>
                <Textarea
                  className={styles.formTextarea}
                  placeholder="请输入话题描述（不超过100字）"
                  value={formData.description}
                  onInput={(e) => setFormData({ ...formData, description: e.detail.value })}
                  maxlength={100}
                />
                <Text className={styles.formHint}>{formData.description.length}/100 字</Text>
              </View>

              {/* 标签颜色 */}
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>标签颜色</Text>
                <View className={styles.colorPicker}>
                  {TOPIC_COLORS.map((color) => (
                    <View
                      key={color}
                      className={classnames(styles.colorOption, formData.color === color && styles.selected)}
                      style={{ background: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </View>
                <Text className={styles.formHint}>选择话题在列表中显示的颜色标签</Text>
              </View>

              {/* 排序权重 */}
              <View className={styles.formGroup}>
                <Text className={styles.formLabel}>排序权重</Text>
                <Slider
                  className={styles.weightSlider}
                  min={0}
                  max={100}
                  step={10}
                  value={formData.sortWeight}
                  onChanging={(e) => setFormData({ ...formData, sortWeight: e.detail.value })}
                  onChange={(e) => setFormData({ ...formData, sortWeight: e.detail.value })}
                  activeColor="#FF6B6B"
                  backgroundColor="#E8E8E8"
                  blockColor="#FF6B6B"
                />
                <Text className={styles.weightValue}>权重: {formData.sortWeight}（数值越大越靠前）</Text>
              </View>
            </View>

            {/* 底部操作 */}
            <View className={styles.formFooter}>
              <View
                className={classnames(styles.formBtn, styles.formBtnCancel)}
                onClick={() => setShowForm(false)}
              >
                <Text className={styles.formBtnCancelText}>取消</Text>
              </View>
              <View
                className={classnames(styles.formBtn, styles.formBtnSubmit)}
                onClick={handleSubmit}
              >
                <Text className={styles.formBtnSubmitText}>{editingTopic ? '保存' : '创建'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default AdminTopicsPage;
