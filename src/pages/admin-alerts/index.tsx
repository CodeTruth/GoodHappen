import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  AlertRecord,
  AlertLevel,
  loadAlerts,
  loadMockAlerts,
  resolveAlert,
  resolveAllAlerts,
  runAllChecks,
  getAlertStats,
} from '@/services/monitoring';
import styles from './index.module.scss';

// 告警级别配置
const LEVEL_CONFIG: Record<AlertLevel, { label: string; color: string; icon: string }> = {
  critical: { label: '严重', color: '#FF4D4F', icon: '🔴' },
  warning: { label: '警告', color: '#FAAD14', icon: '🟡' },
  info: { label: '提示', color: '#165dff', icon: '🔵' },
};

// 告警类型标签
const TYPE_LABELS: Record<string, string> = {
  kindness_anomaly: '善行量异常',
  fortune_concentration: '福气防刷',
  moderation_rejection: '审核拒绝率',
  api_latency: 'API延迟',
};

type FilterLevel = 'all' | AlertLevel;
type FilterStatus = 'all' | 'unresolved' | 'resolved';

const AdminAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('unresolved');
  const [useMock, setUseMock] = useState<boolean>(true);

  // 加载告警数据
  const refreshAlerts = useCallback(() => {
    if (!useMock) {
      runAllChecks();
    }
    setAlerts(loadAlerts());
  }, [useMock]);

  // 初始化
  useEffect(() => {
    if (useMock) {
      loadMockAlerts();
    }
    refreshAlerts();
  }, []);

  // 当 useMock 变化时重新加载
  useEffect(() => {
    if (!useMock) {
      runAllChecks();
      setAlerts(loadAlerts());
    }
  }, [useMock]);

  // 切换到真实监控
  const handleSwitchToReal = useCallback(() => {
    Taro.showModal({
      title: '切换到真实监控',
      content: '将执行真实监控检查，是否继续？',
      success: (res) => {
        if (res.confirm) {
          setUseMock(false);
        }
      },
    });
  }, []);

  // 切换到模拟数据
  const handleSwitchToMock = useCallback(() => {
    loadMockAlerts();
    setUseMock(true);
    setAlerts(loadAlerts());
    Taro.showToast({ title: '已切换到模拟数据', icon: 'success' });
  }, []);

  // 统计信息
  const stats = useMemo(() => {
    return getAlertStats();
  }, [alerts]);

  // 筛选后的告警列表
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (filterLevel !== 'all' && a.level !== filterLevel) return false;
      if (filterStatus === 'unresolved' && a.resolved) return false;
      if (filterStatus === 'resolved' && !a.resolved) return false;
      return true;
    });
  }, [alerts, filterLevel, filterStatus]);

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 处理告警
  const handleResolve = (id: string) => {
    Taro.showModal({
      title: '处理告警',
      content: '确认将该告警标记为已处理？',
      success: (res) => {
        if (res.confirm) {
          resolveAlert(id, '手动处理');
          refreshAlerts();
          Taro.showToast({ title: '已处理', icon: 'success' });
        }
      },
    });
  };

  // 全部处理
  const handleResolveAll = () => {
    Taro.showModal({
      title: '全部处理',
      content: `确认将${stats.unresolved}条未处理告警全部标记为已处理？`,
      success: (res) => {
        if (res.confirm) {
          const count = resolveAllAlerts('批量处理');
          refreshAlerts();
          Taro.showToast({ title: `已处理${count}条`, icon: 'success' });
        }
      },
    });
  };

  // 执行监控检查
  const handleRunChecks = () => {
    const newAlerts = runAllChecks();
    refreshAlerts();
    if (newAlerts.length > 0) {
      Taro.showToast({ title: `发现${newAlerts.length}条新告警`, icon: 'none' });
    } else {
      Taro.showToast({ title: '检查完成，无新告警', icon: 'success' });
    }
  };

  return (
    <View className={styles.container}>
      {/* 模式状态标签 */}
      <View className={styles.modeBanner}>
        <View className={`${styles.modeTag} ${useMock ? styles.modeTagMock : styles.modeTagReal}`}>
          <Text className={styles.modeTagText}>
            {useMock ? '当前模式：模拟数据' : '当前模式：真实监控'}
          </Text>
        </View>
        {useMock ? (
          <Text className={styles.modeSwitchBtn} onClick={handleSwitchToReal}>
            切换到真实监控
          </Text>
        ) : (
          <Text className={styles.modeSwitchBtn} onClick={handleSwitchToMock}>
            切换到模拟数据
          </Text>
        )}
      </View>

      {/* 统计概览 */}
      <View className={styles.statsGrid}>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>{stats.unresolved}</Text>
          <Text className={styles.statLabel}>未处理</Text>
        </View>
        <View className={`${styles.statCard} ${styles.statCritical}`}>
          <Text className={styles.statValue}>{stats.critical}</Text>
          <Text className={styles.statLabel}>严重</Text>
        </View>
        <View className={`${styles.statCard} ${styles.statWarning}`}>
          <Text className={styles.statValue}>{stats.warning}</Text>
          <Text className={styles.statLabel}>警告</Text>
        </View>
        <View className={`${styles.statCard} ${styles.statInfo}`}>
          <Text className={styles.statValue}>{stats.info}</Text>
          <Text className={styles.statLabel}>提示</Text>
        </View>
      </View>

      {/* 操作栏 */}
      <View className={styles.actionBar}>
        <Text className={styles.actionBtn} onClick={handleRunChecks}>
          🔍 执行检查
        </Text>
        {stats.unresolved > 0 && (
          <Text className={styles.actionBtn} onClick={handleResolveAll}>
            ✅ 全部处理
          </Text>
        )}
      </View>

      {/* 状态筛选 */}
      <View className={styles.filterRow}>
        <View className={styles.filterGroup}>
          <Text
            className={`${styles.filterChip} ${filterStatus === 'unresolved' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus('unresolved')}
          >
            未处理
          </Text>
          <Text
            className={`${styles.filterChip} ${filterStatus === 'resolved' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus('resolved')}
          >
            已处理
          </Text>
          <Text
            className={`${styles.filterChip} ${filterStatus === 'all' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            全部
          </Text>
        </View>
      </View>

      {/* 级别筛选 */}
      <View className={styles.filterRow}>
        <View className={styles.filterGroup}>
          <Text
            className={`${styles.filterChip} ${filterLevel === 'all' ? styles.filterChipActive : ''}`}
            onClick={() => setFilterLevel('all')}
          >
            全部级别
          </Text>
          <Text
            className={`${styles.filterChip} ${filterLevel === 'critical' ? styles.filterChipCritical : ''}`}
            onClick={() => setFilterLevel('critical')}
          >
            🔴 严重
          </Text>
          <Text
            className={`${styles.filterChip} ${filterLevel === 'warning' ? styles.filterChipWarning : ''}`}
            onClick={() => setFilterLevel('warning')}
          >
            🟡 警告
          </Text>
          <Text
            className={`${styles.filterChip} ${filterLevel === 'info' ? styles.filterChipInfo : ''}`}
            onClick={() => setFilterLevel('info')}
          >
            🔵 提示
          </Text>
        </View>
      </View>

      {/* 告警列表 */}
      <ScrollView className={styles.alertList} scrollY enableBackToTop>
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => {
            const config = LEVEL_CONFIG[alert.level];
            return (
              <View
                key={alert.id}
                className={`${styles.alertCard} ${styles[`level_${alert.level}`]} ${alert.resolved ? styles.alertResolved : ''}`}
              >
                {/* 左侧级别色条 */}
                <View className={styles.alertAccent} style={{ background: config.color }} />
                <View className={styles.alertBody}>
                  <View className={styles.alertHeader}>
                    <View className={styles.alertTitleRow}>
                      <Text className={styles.alertIcon}>{config.icon}</Text>
                      <Text className={styles.alertTitle}>{alert.title}</Text>
                    </View>
                    <Text className={styles.alertTime}>{formatTime(alert.createdAt)}</Text>
                  </View>
                  <Text className={styles.alertDesc}>{alert.description}</Text>
                  <View className={styles.alertMeta}>
                    <View className={styles.alertTag}>
                      <Text className={styles.alertTagText}>{TYPE_LABELS[alert.type] || alert.type}</Text>
                    </View>
                    <View className={`${styles.alertTag} ${styles.levelTag}`} style={{ background: `${config.color}15`, color: config.color }}>
                      <Text className={styles.alertTagText} style={{ color: config.color }}>{config.label}</Text>
                    </View>
                    {alert.userId && (
                      <View className={styles.alertTag}>
                        <Text className={styles.alertTagText}>用户: {alert.userId}</Text>
                      </View>
                    )}
                    {alert.resolved && (
                      <View className={`${styles.alertTag} ${styles.resolvedTag}`}>
                        <Text className={styles.alertTagText}>已处理</Text>
                      </View>
                    )}
                  </View>
                  {!alert.resolved && (
                    <View className={styles.alertActions}>
                      <Text
                        className={styles.resolveBtn}
                        onClick={() => handleResolve(alert.id)}
                      >
                        标记为已处理
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>✅</Text>
            <Text className={styles.emptyText}>暂无告警</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default AdminAlertsPage;
