import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, ScrollView, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useAdminStore } from '@/store/admin';
import type { ConfigCategory, ConfigItem } from '@/data/admin';
import styles from './index.module.scss';

// 配置分类
const CATEGORIES: Array<{ key: ConfigCategory; name: string; icon: string }> = [
  { key: 'fortune', name: '福气系统', icon: '✨' },
  { key: 'title', name: '称号体系', icon: '🏆' },
  { key: 'ai', name: 'AI参数', icon: '🤖' },
  { key: 'moderation', name: '审核参数', icon: '📋' },
  { key: 'aggregation', name: '聚合统计', icon: '📊' },
];

const AdminConfigPage: React.FC = () => {
  const {
    configItems,
    configHistory,
    updateConfig,
    resetConfig,
    getConfigsByCategory,
    getConfigHistory,
    loadFromStorage,
  } = useAdminStore();

  const [activeCategory, setActiveCategory] = useState<ConfigCategory>('fortune');
  // 编辑中的配置值（key -> 当前输入值）
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  // 修改原因弹窗
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [reasonConfig, setReasonConfig] = useState<ConfigItem | null>(null);
  const [reasonText, setReasonText] = useState('');

  useEffect(() => {
    loadFromStorage();
  }, []);

  // 当前分类的配置项
  const currentConfigs = useMemo(() => {
    return getConfigsByCategory(activeCategory);
  }, [getConfigsByCategory, activeCategory, configItems]);

  // 配置历史（最近10条）
  const recentHistory = useMemo(() => {
    return getConfigHistory(10);
  }, [getConfigHistory, configHistory]);

  // 获取配置项的显示值
  const getDisplayValue = (item: ConfigItem): string => {
    if (editValues[item.key] !== undefined) return editValues[item.key];
    return String(item.value);
  };

  // 更新编辑中的值
  const handleEditValue = (key: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [key]: value }));
  };

  // 切换开关
  const handleToggleSwitch = (item: ConfigItem) => {
    const newValue = !item.value;
    setReasonConfig(item);
    setReasonText(`开关切换为${newValue ? '开启' : '关闭'}`);
    // 直接保存，不弹原因框
    const success = updateConfig(item.key, newValue, '当前管理员', `开关切换为${newValue ? '开启' : '关闭'}`);
    if (success) {
      Taro.showToast({ title: '已保存', icon: 'success' });
    } else {
      Taro.showToast({ title: '保存失败', icon: 'none' });
    }
  };

  // 选择下拉项
  const handleSelectOption = (item: ConfigItem) => {
    if (!item.options) return;
    Taro.showActionSheet({
      itemList: item.options,
      success: (res) => {
        const newValue = item.options![res.tapIndex];
        const success = updateConfig(item.key, newValue, '当前管理员', `选择选项: ${newValue}`);
        if (success) {
          Taro.showToast({ title: '已保存', icon: 'success' });
        }
      },
    });
  };

  // 点击保存（数字/字符串类型，弹出原因输入）
  const handleSave = (item: ConfigItem) => {
    const editValue = editValues[item.key];
    if (editValue === undefined) {
      Taro.showToast({ title: '请先修改值', icon: 'none' });
      return;
    }
    // 类型转换和校验
    let newValue: number | string | boolean;
    if (item.type === 'number') {
      newValue = Number(editValue);
      if (isNaN(newValue)) {
        Taro.showToast({ title: '请输入有效数字', icon: 'none' });
        return;
      }
      if (item.min !== undefined && newValue < item.min) {
        Taro.showToast({ title: `最小值为${item.min}`, icon: 'none' });
        return;
      }
      if (item.max !== undefined && newValue > item.max) {
        Taro.showToast({ title: `最大值为${item.max}`, icon: 'none' });
        return;
      }
    } else {
      newValue = editValue;
    }
    // 弹出原因输入框
    setReasonConfig(item);
    setReasonText('');
    setShowReasonModal(true);
  };

  // 确认保存（带原因）
  const handleConfirmSave = () => {
    if (!reasonConfig) return;
    const editValue = editValues[reasonConfig.key];
    if (editValue === undefined) return;
    let newValue: number | string | boolean;
    if (reasonConfig.type === 'number') {
      newValue = Number(editValue);
    } else {
      newValue = editValue;
    }
    const success = updateConfig(reasonConfig.key, newValue, '当前管理员', reasonText.trim() || '无');
    if (success) {
      Taro.showToast({ title: '已保存并生效', icon: 'success' });
      // 清除编辑状态
      setEditValues((prev) => {
        const next = { ...prev };
        delete next[reasonConfig.key];
        return next;
      });
    } else {
      Taro.showToast({ title: '保存失败，取值超出范围', icon: 'none' });
    }
    setShowReasonModal(false);
    setReasonConfig(null);
    setReasonText('');
  };

  // 重置为默认值
  const handleReset = (item: ConfigItem) => {
    Taro.showModal({
      title: '重置确认',
      content: `确定将"${item.label}"重置为默认值(${item.defaultValue})吗？`,
      success: (res) => {
        if (res.confirm) {
          resetConfig(item.key, '当前管理员');
          Taro.showToast({ title: '已重置', icon: 'success' });
          // 清除编辑状态
          setEditValues((prev) => {
            const next = { ...prev };
            delete next[item.key];
            return next;
          });
        }
      },
    });
  };

  // 格式化时间
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View className={styles.container}>
      {/* 顶部头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>配置中心</Text>
        <Text className={styles.headerDesc}>全量参数可后台修改，修改即时生效</Text>
      </View>

      {/* 分类标签栏 */}
      <ScrollView scrollX className={styles.categoryBar} enhanced showScrollbar={false}>
        {CATEGORIES.map((cat) => (
          <View
            key={cat.key}
            className={classnames(styles.categoryItem, activeCategory === cat.key && styles.active)}
            onClick={() => setActiveCategory(cat.key)}
          >
            <Text className={styles.categoryText}>{cat.icon} {cat.name}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 内容区域 */}
      <View className={styles.content}>
        {/* 配置项列表 */}
        {currentConfigs.map((item) => (
          <View key={item.key} className={styles.configCard}>
            <View className={styles.configHeader}>
              <Text className={styles.configLabel}>{item.label}</Text>
              <Text className={styles.configKey}>{item.key}</Text>
            </View>
            <Text className={styles.configDesc}>{item.description}</Text>

            {/* 配置值控制区 */}
            {item.type === 'number' && (
              <>
                <View className={styles.configControl}>
                  <Input
                    className={styles.configInput}
                    type="digit"
                    value={getDisplayValue(item)}
                    onInput={(e) => handleEditValue(item.key, e.detail.value)}
                    placeholder="请输入数值"
                  />
                  {item.unit && <Text className={styles.configUnit}>{item.unit}</Text>}
                </View>
                {item.min !== undefined && item.max !== undefined && (
                  <Text className={styles.configRange}>
                    取值范围: {item.min} ~ {item.max} {item.unit || ''}
                  </Text>
                )}
              </>
            )}

            {item.type === 'string' && (
              <View className={styles.configControl}>
                <Input
                  className={styles.configInput}
                  value={getDisplayValue(item)}
                  onInput={(e) => handleEditValue(item.key, e.detail.value)}
                  placeholder="请输入文本"
                />
              </View>
            )}

            {item.type === 'boolean' && (
              <View className={styles.configControl}>
                <Text className={styles.configValue}>{item.value ? '已开启' : '已关闭'}</Text>
                <View
                  className={classnames(styles.configSwitch, item.value && styles.on)}
                  onClick={() => handleToggleSwitch(item)}
                >
                  <View className={classnames(styles.configSwitchThumb, item.value && styles.configSwitchThumbOn)} />
                </View>
              </View>
            )}

            {item.type === 'select' && (
              <View className={styles.configControl}>
                <View className={styles.configSelect} onClick={() => handleSelectOption(item)}>
                  <Text className={styles.configSelectText}>{String(item.value)}</Text>
                  <Text className={styles.configSelectArrow}>▼</Text>
                </View>
              </View>
            )}

            {/* 操作按钮（数字和字符串类型显示保存/重置） */}
            {(item.type === 'number' || item.type === 'string') && (
              <View className={styles.configActions}>
                <View
                  className={classnames(styles.configBtn, styles.configBtnSave)}
                  onClick={() => handleSave(item)}
                >
                  <Text className={styles.configBtnSaveText}>保存生效</Text>
                </View>
                <View
                  className={classnames(styles.configBtn, styles.configBtnReset)}
                  onClick={() => handleReset(item)}
                >
                  <Text className={styles.configBtnResetText}>重置默认</Text>
                </View>
              </View>
            )}
          </View>
        ))}

        {/* 修改历史记录 */}
        <View className={styles.historySection}>
          <Text className={styles.historyTitle}>📝 修改历史记录</Text>
          {recentHistory.length === 0 ? (
            <View className={styles.empty}>
              <Text className={styles.emptyText}>暂无修改记录</Text>
            </View>
          ) : (
            recentHistory.map((hist) => (
              <View key={hist.id} className={styles.historyItem}>
                <Text className={styles.historyLabel}>{hist.label}</Text>
                <Text className={styles.historyChange}>
                  {String(hist.oldValue)} → {String(hist.newValue)}
                </Text>
                <Text className={styles.historyMeta}>
                  {hist.operator} · {formatTime(hist.operatedAt)}
                </Text>
                {hist.reason && (
                  <Text className={styles.historyReason}>原因: {hist.reason}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </View>

      {/* 修改原因输入弹窗 */}
      {showReasonModal && reasonConfig && (
        <View className={styles.reasonMask} onClick={() => setShowReasonModal(false)}>
          <View className={styles.reasonPanel} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.reasonTitle}>修改原因</Text>
            <Text className={styles.configDesc}>
              配置项: {reasonConfig.label}（{reasonConfig.key}）
            </Text>
            <Textarea
              className={styles.reasonInput}
              placeholder="请填写修改原因（选填，会记录到历史）"
              value={reasonText}
              onInput={(e) => setReasonText(e.detail.value)}
              maxlength={100}
            />
            <View className={styles.reasonActions}>
              <View
                className={classnames(styles.configBtn, styles.configBtnReset)}
                onClick={() => setShowReasonModal(false)}
              >
                <Text className={styles.configBtnResetText}>取消</Text>
              </View>
              <View
                className={classnames(styles.configBtn, styles.configBtnSave)}
                onClick={handleConfirmSave}
              >
                <Text className={styles.configBtnSaveText}>确认保存</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default AdminConfigPage;
