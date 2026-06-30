import React, { useState, useEffect, useCallback } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import {
  ProtectionSession,
  ProtectionModeStatus,
  EmergencyContact,
  PROTECTION_MODE_CONFIG,
  createSession,
  pauseSession,
  resumeSession,
  triggerSOS,
  closeSession,
  getCurrentSession,
  takeProtectionPhoto,
  onSessionChange,
  formatDuration,
} from '@/services/protection-mode';
import styles from './index.module.scss';

// 模拟紧急联系人数据
const MOCK_CONTACTS: EmergencyContact[] = [
  { id: '1', name: '张妈妈', phone: '138****1234', relation: '家人', notified: false },
  { id: '2', name: '李朋友', phone: '139****5678', relation: '朋友', notified: false },
  { id: '3', name: '王同事', phone: '137****9012', relation: '同事', notified: false },
];

/** starting 阶段初始化进度项 */
interface InitStep {
  key: string;
  label: string;
  ready: boolean;
}

export default function ProtectionModePage() {
  const [session, setSession] = useState<ProtectionSession | null>(getCurrentSession());
  const [initSteps, setInitSteps] = useState<InitStep[]>([
    { key: 'gps', label: 'GPS定位中', ready: false },
    { key: 'camera', label: '摄像头就绪', ready: false },
    { key: 'mic', label: '麦克风就绪', ready: false },
  ]);
  const [sosCountdown, setSosCountdown] = useState(0);

  // 监听会话变化
  useEffect(() => {
    const unsubscribe = onSessionChange((s) => {
      setSession(s ? { ...s } : null);
    });
    return unsubscribe;
  }, []);

  // starting 状态下模拟初始化进度
  useEffect(() => {
    if (session?.status !== 'starting') {
      // 非starting时重置
      if (session?.status === 'idle' || session?.status === 'closed') {
        setInitSteps([
          { key: 'gps', label: 'GPS定位中', ready: false },
          { key: 'camera', label: '摄像头就绪', ready: false },
          { key: 'mic', label: '麦克风就绪', ready: false },
        ]);
      }
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => {
      setInitSteps(prev => prev.map(s => s.key === 'gps' ? { ...s, ready: true, label: 'GPS已连接' } : s));
    }, 400));
    timers.push(setTimeout(() => {
      setInitSteps(prev => prev.map(s => s.key === 'camera' ? { ...s, ready: true, label: '摄像头已就绪' } : s));
    }, 800));
    timers.push(setTimeout(() => {
      setInitSteps(prev => prev.map(s => s.key === 'mic' ? { ...s, ready: true, label: '麦克风已就绪' } : s));
    }, 1200));

    return () => timers.forEach(t => clearTimeout(t));
  }, [session?.status]);

  // SOS 倒计时
  useEffect(() => {
    if (session?.status !== 'sos') {
      setSosCountdown(0);
      return;
    }
    setSosCountdown(PROTECTION_MODE_CONFIG.SOS_COUNTDOWN_S);
    const timer = setInterval(() => {
      setSosCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [session?.status, session?.sosTriggeredAt]);

  // === 操作回调 ===

  /** 开启保护 */
  const handleStart = useCallback(() => {
    Taro.showModal({
      title: '善行保护模式',
      content: '启动后将自动录像、录音、GPS追踪，全程存证。确认开启？',
      confirmText: '确认开启',
      confirmColor: '#4CAF50',
      success: (res) => {
        if (res.confirm) {
          createSession('phone', MOCK_CONTACTS);
        }
      },
    });
  }, []);

  /** 拍照取证 */
  const handlePhoto = useCallback(() => {
    const result = takeProtectionPhoto();
    if (result) {
      Taro.showToast({ title: '拍照取证成功', icon: 'success' });
    }
  }, []);

  /** 暂停保护 */
  const handlePause = useCallback(() => {
    pauseSession();
  }, []);

  /** 恢复保护 */
  const handleResume = useCallback(() => {
    resumeSession();
  }, []);

  /** 紧急求助 */
  const handleSOS = useCallback(() => {
    Taro.showModal({
      title: '紧急求助',
      content: '将立即通知所有紧急联系人并发送您的位置信息，确认触发？',
      confirmText: '立即求助',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          triggerSOS('善行者手动触发紧急求助');
        }
      },
    });
  }, []);

  /** 结束保护 */
  const handleClose = useCallback(() => {
    Taro.showModal({
      title: '结束保护',
      content: '确认结束保护模式？所有证据将自动保存。',
      confirmText: '确认结束',
      success: (res) => {
        if (res.confirm) {
          closeSession();
        }
      },
    });
  }, []);

  /** 跳转记录善行 */
  const handleGoRecord = useCallback(() => {
    Taro.navigateTo({ url: '/pages/record/index' });
  }, []);

  /** 跳转保护详情 */
  const handleGoWitness = useCallback(() => {
    Taro.navigateTo({ url: '/pages/witness-network/index' });
  }, []);

  const status = session?.status || 'idle';

  // ============================================
  // 渲染：idle 状态
  // ============================================
  const renderIdle = () => (
    <View className={styles.idleSection}>
      <Text className={styles.shieldIcon}>{'\u{1F6E1}\uFE0F'}</Text>
      <Text className={styles.mainTitle}>善行保护模式</Text>
      <Text className={styles.subtitle}>做任何事前先保护好自己</Text>

      <View className={styles.descCard}>
        <Text className={styles.descText}>
          启动后系统将自动<Text className={styles.descHighlight}>录像、录音、GPS追踪</Text>，全程存证
        </Text>
      </View>

      <View className={styles.circleBtnWrap}>
        <View className={styles.circleBtnIdle} onClick={handleStart}>
          <Text className={styles.circleBtnIdleIcon}>{'\u{1F6E1}\uFE0F'}</Text>
          <Text className={styles.circleBtnIdleText}>一键开启保护</Text>
        </View>
      </View>

      <Text className={styles.btnHint}>点击即开始全程录像+录音+GPS定位</Text>
    </View>
  );

  // ============================================
  // 渲染：starting 状态
  // ============================================
  const renderStarting = () => (
    <View className={styles.idleSection}>
      <View className={styles.circleBtnWrap}>
        <View className={styles.circleBtnStarting}>
          <View className={styles.startingSpinner} />
          <Text className={styles.startingText}>初始化中...</Text>
        </View>
      </View>

      <View className={styles.initChecklist}>
        {initSteps.map((step) => (
          <View key={step.key} className={styles.initCheckItem}>
            <View className={`${styles.initCheckIcon} ${!step.ready ? styles.initCheckIconPending : ''}`}>
              {step.ready ? '\u2713' : ''}
            </View>
            <Text>{step.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // ============================================
  // 渲染：active 状态
  // ============================================
  const renderActive = () => {
    if (!session) return null;
    return (
      <View className={styles.idleSection}>
        <View className={styles.circleBtnWrap}>
          <View className={styles.circleBtnActive}>
            <Text className={styles.activeTimer}>{formatDuration(session.duration)}</Text>
            <Text className={styles.activeLabel}>保护中</Text>
          </View>
        </View>

        <View className={styles.dataGrid}>
          <View className={styles.dataCard}>
            <Text className={styles.dataIcon}>{'\u{1F4F9}'}</Text>
            <Text className={styles.dataValue}>{formatDuration(session.evidenceCollected.videoDuration)}</Text>
            <Text className={styles.dataLabel}>录像</Text>
          </View>
          <View className={styles.dataCard}>
            <Text className={styles.dataIcon}>{'\u{1F399}\uFE0F'}</Text>
            <Text className={styles.dataValue}>{formatDuration(session.evidenceCollected.audioDuration)}</Text>
            <Text className={styles.dataLabel}>录音</Text>
          </View>
          <View className={styles.dataCard}>
            <Text className={styles.dataIcon}>{'\u{1F4CD}'}</Text>
            <Text className={styles.dataValue}>{session.evidenceCollected.gpsPoints}个点</Text>
            <Text className={styles.dataLabel}>GPS</Text>
          </View>
          <View className={styles.dataCard}>
            <Text className={styles.dataIcon}>{'\u{1F4F8}'}</Text>
            <Text className={styles.dataValue}>{session.evidenceCollected.photos}张</Text>
            <Text className={styles.dataLabel}>拍照</Text>
          </View>
        </View>

        <View className={styles.actionBar}>
          <View className={`${styles.actionBtn} ${styles.actionBtnPhoto}`} onClick={handlePhoto}>
            <Text className={styles.actionBtnIcon}>{'\u{1F4F8}'}</Text>
            <Text className={styles.actionBtnText}>拍照取证</Text>
          </View>
          <View className={`${styles.actionBtn} ${styles.actionBtnPause}`} onClick={handlePause}>
            <Text className={styles.actionBtnIcon}>{'\u23F8\uFE0F'}</Text>
            <Text className={styles.actionBtnText}>暂停</Text>
          </View>
          <View className={`${styles.actionBtn} ${styles.actionBtnSOS}`} onClick={handleSOS}>
            <Text className={styles.actionBtnIcon}>{'\u{1F198}'}</Text>
            <Text className={styles.actionBtnText}>紧急求助</Text>
          </View>
        </View>
      </View>
    );
  };

  // ============================================
  // 渲染：paused 状态
  // ============================================
  const renderPaused = () => {
    if (!session) return null;
    return (
      <View className={styles.idleSection}>
        <View className={styles.circleBtnWrap}>
          <View className={styles.circleBtnPaused}>
            <Text className={styles.pausedTimer}>{formatDuration(session.duration)}</Text>
            <Text className={styles.pausedLabel}>已暂停</Text>
          </View>
        </View>

        <Text className={styles.btnHint}>保护已暂停，GPS仍在追踪</Text>

        <View className={styles.pausedBar}>
          <View className={`${styles.pausedBtn} ${styles.pausedBtnResume}`} onClick={handleResume}>
            <Text>{'\u25B6\uFE0F'} 继续</Text>
          </View>
          <View className={`${styles.pausedBtn} ${styles.pausedBtnClose}`} onClick={handleClose}>
            <Text>{'\u23F9\uFE0F'} 结束保护</Text>
          </View>
        </View>
      </View>
    );
  };

  // ============================================
  // 渲染：sos 状态
  // ============================================
  const renderSOS = () => {
    if (!session) return null;
    return (
      <View className={styles.sosOverlay}>
        <Text className={styles.sosIcon}>{'\u{1F198}'}</Text>
        <Text className={styles.sosTitle}>紧急求助已发送</Text>
        <Text className={styles.sosCountdown}>
          {sosCountdown > 0 ? `${sosCountdown}s 后可关闭` : '可安全关闭'}
        </Text>

        <View className={styles.sosContactList}>
          <Text className={styles.sosContactTitle}>紧急联系人已通知</Text>
          {session.emergencyContacts.map((contact) => (
            <View key={contact.id} className={styles.sosContactItem}>
              <Text className={styles.sosContactName}>{contact.name}</Text>
              <Text className={styles.sosContactPhone}>{contact.phone}</Text>
              <Text className={styles.sosContactNotified}>
                {contact.notified ? '已通知' : '通知中...'}
              </Text>
            </View>
          ))}
        </View>

        <View className={styles.sosActionBar}>
          <View className={`${styles.sosBtn} ${styles.sosBtnPhoto}`} onClick={handlePhoto}>
            <Text>{'\u{1F4F8}'} 拍照</Text>
          </View>
          <View className={`${styles.sosBtn} ${styles.sosBtnClose}`} onClick={handleClose}>
            <Text>{'\u23F9\uFE0F'} 结束并保存证据</Text>
          </View>
        </View>
      </View>
    );
  };

  // ============================================
  // 渲染：closed 状态
  // ============================================
  const renderClosed = () => {
    if (!session) return null;
    return (
      <View className={styles.closedSection}>
        <Text className={styles.closedIcon}>{'\u2705'}</Text>
        <Text className={styles.closedTitle}>保护已结束</Text>
        <View className={styles.closedSaved}>
          <Text>{'\u{1F512}'}</Text>
          <Text>证据已自动保存</Text>
        </View>

        <View className={styles.evidenceSummary}>
          <View className={styles.evidenceRow}>
            <Text className={styles.evidenceRowIcon}>{'\u{1F4F9}'}</Text>
            <Text className={styles.evidenceRowLabel}>录像时长</Text>
            <Text className={styles.evidenceRowValue}>{formatDuration(session.evidenceCollected.videoDuration)}</Text>
          </View>
          <View className={styles.evidenceRow}>
            <Text className={styles.evidenceRowIcon}>{'\u{1F399}\uFE0F'}</Text>
            <Text className={styles.evidenceRowLabel}>录音时长</Text>
            <Text className={styles.evidenceRowValue}>{formatDuration(session.evidenceCollected.audioDuration)}</Text>
          </View>
          <View className={styles.evidenceRow}>
            <Text className={styles.evidenceRowIcon}>{'\u{1F4CD}'}</Text>
            <Text className={styles.evidenceRowLabel}>GPS定位点</Text>
            <Text className={styles.evidenceRowValue}>{session.evidenceCollected.gpsPoints}个</Text>
          </View>
          <View className={styles.evidenceRow}>
            <Text className={styles.evidenceRowIcon}>{'\u{1F4F8}'}</Text>
            <Text className={styles.evidenceRowLabel}>取证照片</Text>
            <Text className={styles.evidenceRowValue}>{session.evidenceCollected.photos}张</Text>
          </View>
          <View className={`${styles.evidenceRow} ${styles.evidenceTotalRow}`}>
            <Text className={styles.evidenceRowIcon}>{'\u23F1\uFE0F'}</Text>
            <Text className={styles.evidenceRowLabel}>总持续时长</Text>
            <Text className={styles.evidenceRowValue}>{formatDuration(session.duration)}</Text>
          </View>
        </View>

        <View className={styles.closedBar}>
          <View className={`${styles.closedBtn} ${styles.closedBtnRecord}`} onClick={handleGoRecord}>
            <Text>{'\u{1F4DD}'} 记录善行</Text>
          </View>
          <View className={`${styles.closedBtn} ${styles.closedBtnDetail}`} onClick={handleGoWitness}>
            <Text>查看保护详情</Text>
          </View>
        </View>
      </View>
    );
  };

  // ============================================
  // 主渲染
  // ============================================
  const renderByStatus = () => {
    switch (status) {
      case 'idle':
        return renderIdle();
      case 'starting':
        return renderStarting();
      case 'active':
        return renderActive();
      case 'paused':
        return renderPaused();
      case 'sos':
        return renderSOS();
      case 'closed':
        return renderClosed();
      default:
        return renderIdle();
    }
  };

  return (
    <View className={styles.pageWrapper}>
      <View className={styles.container}>
        {renderByStatus()}
      </View>
    </View>
  );
}
