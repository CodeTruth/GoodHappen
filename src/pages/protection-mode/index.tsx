import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Camera } from '@tarojs/components';
import Taro from '@tarojs/taro';

const isH5 = typeof window !== 'undefined';

import {
  createSession,
  pauseSession,
  resumeSession,
  triggerSOS,
  closeSession,
  getCurrentSession,
  takeProtectionPhoto,
  onSessionChange,
  formatDuration,
  type ProtectionSession,
  type EmergencyContact,
  PROTECTION_MODE_CONFIG,
} from '@/services/protection-mode';
import {
  SOS_CONFIG,
  triggerSOSWithGuard,
  type SOSSceneContext,
  type SOSProtectionEvidence,
} from '@/services/sos-guard';
import { useUserStore } from '@/store/user';
import styles from './index.module.scss';

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

  // 从 userStore 读取紧急联系人
  const { userInfo } = useUserStore();
  const emergencyContacts: EmergencyContact[] = useMemo(() => {
    if (userInfo?.emergencyContacts && userInfo.emergencyContacts.length > 0) {
      return userInfo.emergencyContacts.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        relation: c.relation,
        notified: false,
      }));
    }
    return [];
  }, [userInfo]);

  // 来源信息：从AI顾问等页面跳转过来时携带的上下文
  const [sourceFrom, setSourceFrom] = useState('');
  const [sourceScene, setSourceScene] = useState('');
  const [advisorLevel, setAdvisorLevel] = useState('');
  const [advisorDangerScore, setAdvisorDangerScore] = useState(0);
  const [advisorActions, setAdvisorActions] = useState<string[]>([]);

  // 演示模式状态
  const [isDemo, setIsDemo] = useState(false);

  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraCtxRef = useRef<Taro.CameraContext | null>(null);
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [cameraReady, setCameraReady] = useState(false);

  // 读取跳转来源和演示模式参数
  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params;
    if (params?.from) setSourceFrom(params.from);
    if (params?.scene) setSourceScene(decodeURIComponent(params.scene));
    if (params?.demo === 'true') setIsDemo(true);
    // 读取AI顾问评估结果
    if (params?.adv) {
      try {
        const adv = JSON.parse(decodeURIComponent(params.adv));
        if (adv.al) setAdvisorLevel(adv.al);
        if (adv.ds) setAdvisorDangerScore(adv.ds);
        if (adv.at) setAdvisorActions(adv.at.split('|'));
      } catch (_e) {
        // 忽略解析错误
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (demoEndTimerRef.current) {
        clearTimeout(demoEndTimerRef.current);
        demoEndTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    Taro.useDidShow(() => {
      const current = getCurrentSession();
      if (!current) {
        setSession(null);
        setInitSteps([
          { key: 'gps', label: 'GPS定位中', ready: false },
          { key: 'camera', label: '摄像头就绪', ready: false },
          { key: 'mic', label: '麦克风就绪', ready: false },
        ]);
      }
    });
  }, []);

  // 演示模式：自动开始初始化（跳过确认弹窗）
  useEffect(() => {
    if (!isDemo) return;
    if (session?.status !== 'idle') return;

    // 模拟存在紧急联系人
    const timer = setTimeout(() => {
      handleStartDemo();
    }, 600);
    return () => clearTimeout(timer);
  }, [isDemo, session?.status]);

  // 演示模式：3分钟后自动结束
  useEffect(() => {
    if (!isDemo) return;
    if (session?.status !== 'active') return;

    demoEndTimerRef.current = setTimeout(() => {
      closeSession();
      Taro.showToast({ title: '演示结束（3分钟）', icon: 'none' });
    }, 3 * 60 * 1000);

    return () => {
      if (demoEndTimerRef.current) {
        clearTimeout(demoEndTimerRef.current);
        demoEndTimerRef.current = null;
      }
    };
  }, [isDemo, session?.status]);

  // 监听会话变化
  useEffect(() => {
    const unsubscribe = onSessionChange((s) => {
      setSession(s ? { ...s } : null);
    });
    return unsubscribe;
  }, []);

  // H5 端初始化摄像头
  useEffect(() => {
    if (!isH5) return;
    if (session?.status !== 'starting' && session?.status !== 'active') {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t: any) => t.stop());
      }
      return;
    }

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraReady(true);
          setInitSteps(prev => prev.map(s => s.key === 'camera' ? { ...s, ready: true, label: '摄像头已就绪' } : s));
        }
      } catch (err) {
        console.warn('[ProtectionMode] H5 camera init failed:', err);
      }
    };

    initCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t: any) => t.stop());
      }
    };
  }, [session?.status]);

  // 启动/停止录像
  useEffect(() => {
    if (!isH5) {
      if (!cameraCtxRef.current) cameraCtxRef.current = Taro.createCameraContext();
      if (session?.status === 'active') {
        cameraCtxRef.current.startRecord({
          success: () => console.log('[ProtectionMode] Video started'),
          fail: () => console.warn('[ProtectionMode] Video start failed'),
        });
      } else if (session?.status === 'closed' || session?.status === 'paused') {
        cameraCtxRef.current.stopRecord({
          success: (res) => console.log('[ProtectionMode] Video stopped:', res.tempVideoPath),
          fail: () => console.warn('[ProtectionMode] Video stop failed'),
        });
      }
    } else {
      if (session?.status === 'active') {
        const video = videoRef.current;
        if (video && video.srcObject) {
          try {
            recordedChunksRef.current = [];
            const mediaRecorder = new MediaRecorder(video.srcObject as MediaStream);
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = (e) => {
              if (e.data.size > 0) recordedChunksRef.current.push(e.data);
            };
            mediaRecorder.onstart = () => console.log('[ProtectionMode] H5 Video started');
            mediaRecorder.onstop = () => {
              const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
              console.log('[ProtectionMode] H5 Video stopped:', blob.size);
            };
            mediaRecorder.onerror = () => console.warn('[ProtectionMode] H5 Video error');
            mediaRecorder.start(1000);
          } catch (err) {
            console.warn('[ProtectionMode] H5 MediaRecorder not supported:', err);
          }
        }
      } else if (session?.status === 'closed' || session?.status === 'paused') {
        if (mediaRecorderRef.current) {
          try { mediaRecorderRef.current.stop(); mediaRecorderRef.current = null; }
          catch (err) { console.warn('[ProtectionMode] H5 Video stop error:', err); }
        }
      }
    }
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

  /** 演示模式：自动开启保护（跳过确认弹窗） */
  const handleStartDemo = useCallback(() => {
    // 为演示模式创建模拟紧急联系人
    const demoContacts = [
      { id: 'demo_1', name: '演示联系人（家长）', phone: '138****8888', relation: '家人', notified: false },
      { id: 'demo_2', name: '演示联系人（朋友）', phone: '139****9999', relation: '朋友', notified: false },
    ];
    createSession('phone', demoContacts);
  }, []);

  /** 开启保护 */
  const handleStart = useCallback(() => {
    if (isDemo) {
      handleStartDemo();
      return;
    }
    if (emergencyContacts.length === 0) {
      Taro.showToast({ title: '请先设置紧急联系人', icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '善行保护模式',
      content: '启动后将自动录像、录音、GPS追踪，全程存证。确认开启？',
      confirmText: '确认开启',
      confirmColor: '#4CAF50',
      success: (res) => {
        if (res.confirm) {
          createSession('phone', emergencyContacts);
        }
      },
    });
  }, [emergencyContacts, isDemo, handleStartDemo]);

  /** 拍照取证 */
  const handlePhoto = useCallback(() => {
    if (isH5) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) {
        Taro.showToast({ title: '拍照失败', icon: 'none' });
        return;
      }

      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        Taro.showToast({ title: '拍照失败', icon: 'none' });
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      console.log('[ProtectionMode] H5 photo captured:', dataUrl.length);
      const result = takeProtectionPhoto();
      if (result) {
        Taro.showToast({ title: '拍照取证成功', icon: 'success' });
      }
    } else {
      if (!cameraCtxRef.current) {
        cameraCtxRef.current = Taro.createCameraContext();
      }
      cameraCtxRef.current.takePhoto({
        quality: 'high',
        success: () => {
          const result = takeProtectionPhoto();
          if (result) {
            Taro.showToast({ title: '拍照取证成功', icon: 'success' });
          }
        },
        fail: () => {
          Taro.showToast({ title: '拍照失败', icon: 'none' });
        },
      });
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

  /** 紧急求助（带押金防滥用 + 自动携带保护证据） */
  const handleSOS = useCallback(() => {
    Taro.showModal({
      title: '🆘 紧急求助',
      content: `将立即通知所有紧急联系人并发送您的位置信息。\n\n⚠️ 防滥用机制：将预扣押金 ¥${SOS_CONFIG.DEPOSIT_AMOUNT}，请在${SOS_CONFIG.CONFIRM_WINDOW_HOURS}小时内提交确认证据（照片/视频/报警回执），确认真实后全额退还。`,
      confirmText: '确认求助',
      confirmColor: '#F44336',
      success: (res) => {
        if (res.confirm) {
          // 从保护模式session中提取证据摘要
          const protectionEvidence: SOSProtectionEvidence | undefined = session ? {
            sessionId: session.id,
            duration: session.duration,
            videoDuration: session.evidenceCollected.videoDuration,
            audioDuration: session.evidenceCollected.audioDuration,
            gpsPoints: session.evidenceCollected.gpsPoints,
            photos: session.evidenceCollected.photos,
            lastKnownLocation: session.currentGps,
            isRecording: session.isRecording,
            isAudioRecording: session.isAudioRecording,
            emergencyContactCount: session.emergencyContacts.length,
          } : undefined;

          // 从URL来源构建场景上下文（AI顾问评估结果 + 场景描述）
          // 智能推断 subjectCount：根据 advisorActions 或 sourceScene 判断涉及人数
          const inferSubjectCount = (): number => {
            const actionsText = advisorActions.join(' ');
            const sceneText = sourceScene;
            const combinedText = `${actionsText} ${sceneText}`;
            if (/上前|靠近|接触|搀扶|扶|拉|抱|推/.test(combinedText)) {
              return 2; // 有直接接触行为，涉及至少2人
            }
            return 1; // 默认：避让/远离/绕行或其他场景，保持1
          };

          const sceneContext: SOSSceneContext | undefined = sourceScene ? {
            adviceLevel: advisorLevel || undefined,
            dangerScore: advisorDangerScore || undefined,
            sceneDescription: sourceScene,
            subjectCount: inferSubjectCount(),
            actionType: sourceScene.includes('老人') ? 'elder_help' : sourceScene.includes('车') ? 'traffic' : 'general',
            recommendedActions: advisorActions.length > 0 ? advisorActions : undefined,
            assessedAt: new Date(session?.startedAt || Date.now()).toISOString(),
          } : undefined;

          // 使用带押金防滥用的SOS
          const result = triggerSOSWithGuard(
            'protection_mode',
            'current_user',
            '善行者',
            session?.currentGps
              ? {
                  latitude: session.currentGps.latitude,
                  longitude: session.currentGps.longitude,
                  address: session.currentGps.address,
                }
              : undefined,
            emergencyContacts.map(c => ({ id: c.id, name: c.name })),
            [],
            sceneContext,
            protectionEvidence
          );
          // 先触发保护模式的SOS状态
          triggerSOS(result.message);
        }
      },
    });
  }, [session, sourceScene, advisorLevel, advisorDangerScore, advisorActions]);

  /** 跳转记录善行（带上保护模式的证据信息） */
  const handleGoRecord = useCallback(() => {
    const params = new URLSearchParams();
    params.set('from', 'protection');
    if (session) {
      params.set('duration', String(session.duration));
      params.set('video', String(session.evidenceCollected.videoDuration));
      params.set('audio', String(session.evidenceCollected.audioDuration));
      params.set('gps', String(session.evidenceCollected.gpsPoints));
      params.set('photos', String(session.evidenceCollected.photos));
    }
    if (sourceScene) params.set('scene', encodeURIComponent(sourceScene));
    Taro.navigateTo({ url: `/pages/record/index?${params.toString()}` });
  }, [session, sourceScene]);

  /** 结束保护 */
  const handleClose = useCallback(() => {
    Taro.showModal({
      title: '结束保护',
      content: '确认结束保护模式？所有证据将自动保存。',
      confirmText: '确认结束',
      success: (res) => {
        if (res.confirm) {
          closeSession();
          // 如果来自AI顾问建议，自动引导到记录页
          if (sourceFrom === 'advisor') {
            closeTimerRef.current = setTimeout(() => {
              handleGoRecord();
            }, 600);
          }
        }
      },
    });
  }, [sourceFrom, handleGoRecord]);

  /** 跳转保护详情 */
  const handleGoWitness = useCallback(() => {
    Taro.navigateTo({ url: '/pages/witness-network/index' });
  }, []);

  /** 开始新保护 */
  const handleStartNew = useCallback(() => {
    setSession(null);
    setInitSteps([
      { key: 'gps', label: 'GPS定位中', ready: false },
      { key: 'camera', label: '摄像头就绪', ready: false },
      { key: 'mic', label: '麦克风就绪', ready: false },
    ]);
  }, []);

  const status = session?.status || 'idle';

  // ============================================
  // 渲染：idle 状态
  // ============================================
  const renderIdle = () => (
    <View className={styles.idleSection}>
      {isDemo && (
        <View className={styles.demoBadge}>
          <Text className={styles.demoBadgeIcon}>🎮</Text>
          <Text className={styles.demoBadgeText}>演示模式 - 自动演示保护流程</Text>
        </View>
      )}
      <Text className={styles.shieldIcon}>{'\u{1F6E1}\uFE0F'}</Text>
      <Text className={styles.mainTitle}>善行保护模式</Text>
      <Text className={styles.subtitle}>做任何事前先保护好自己</Text>

      {sourceScene && (
        <View className={styles.sceneHintCard}>
          <Text className={styles.sceneHintLabel}>🤖 AI顾问识别的场景</Text>
          <Text className={styles.sceneHintText}>{sourceScene}</Text>
        </View>
      )}

      <View className={styles.descCard}>
        <Text className={styles.descText}>
          {isDemo
            ? '演示模式下将模拟完整的保护流程：初始化 → 保护中 → 自动结束'
            : '启动后系统将自动录像、录音、GPS追踪，全程存证'
          }
        </Text>
      </View>

      {/* 紧急联系人提示 - 演示模式下隐藏 */}
      {!isDemo && emergencyContacts.length === 0 && (
        <View className={styles.contactHint} onClick={() => Taro.navigateTo({ url: '/pages/profile-edit/index' })}>
          <Text className={styles.contactHintIcon}>⚠️</Text>
          <View className={styles.contactHintText}>
            <Text className={styles.contactHintTitle}>请设置紧急联系人</Text>
            <Text className={styles.contactHintDesc}>保护模式需要至少一位紧急联系人才能启动 →</Text>
          </View>
        </View>
      )}

      <View className={styles.circleBtnWrap}>
        <View className={styles.circleBtnIdle} onClick={handleStart}>
          <Text className={styles.circleBtnIdleIcon}>{'\u{1F6E1}\uFE0F'}</Text>
          <Text className={styles.circleBtnIdleText}>
            {isDemo ? '自动开启演示中...' : sourceFrom === 'advisor' ? '确认开启保护' : '一键开启保护'}
          </Text>
        </View>
      </View>

      <Text className={styles.btnHint}>
        {isDemo
          ? '演示模式自动进行中，请稍候...'
          : sourceFrom === 'advisor' ? 'AI顾问建议：此场景需先保护再行善' : '点击即开始全程录像+录音+GPS定位'
        }
      </Text>

      {/* 定时安全确认入口 - 演示模式下隐藏 */}
      {!isDemo && (
        <View className={styles.safetyCheckEntry} onClick={() => Taro.navigateTo({ url: '/pages/safety-check/index' })}>
          <Text className={styles.safetyCheckIcon}>⏱️</Text>
          <View className={styles.safetyCheckText}>
            <Text className={styles.safetyCheckTitle}>定时安全确认</Text>
            <Text className={styles.safetyCheckDesc}>设置预计完成时间，超时自动SOS</Text>
          </View>
          <Text className={styles.safetyCheckArrow}>→</Text>
        </View>
      )}
    </View>
  );

  // ============================================
  // 渲染：starting 状态
  // ============================================
  const renderStarting = () => (
    <View className={styles.idleSection}>
      <View className={styles.cameraPreviewArea}>
        {isH5 ? (
          <>
            {cameraReady ? (
              <video
                ref={videoRef}
                className={styles.videoPreview}
                autoPlay
                playsInline
                muted
              />
            ) : (
              <View className={styles.cameraLoading}>
                <Text className={styles.cameraLoadingIcon}>📷</Text>
                <Text className={styles.cameraLoadingText}>正在打开摄像头...</Text>
              </View>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </>
        ) : (
          <Camera
            className={styles.cameraPreview}
            devicePosition="back"
            flash="auto"
            resolution="high"
            onReady={() => {
              cameraCtxRef.current = Taro.createCameraContext();
            }}
          />
        )}
        <View className={styles.cameraOverlay}>
          <View className={styles.circleBtnWrap}>
            <View className={styles.circleBtnStarting}>
              <View className={styles.startingSpinner} />
              <Text className={styles.startingText}>初始化中...</Text>
            </View>
          </View>
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
        {isDemo && (
          <View className={styles.demoBadge}>
            <Text className={styles.demoBadgeIcon}>🎮</Text>
            <Text className={styles.demoBadgeText}>演示模式 - 保护中（3分钟后自动结束）</Text>
          </View>
        )}

        <View className={styles.cameraPreviewArea}>
          {isH5 ? (
            <video
              ref={videoRef}
              className={styles.videoPreview}
              autoPlay
              playsInline
              muted
            />
          ) : (
            <Camera
              className={styles.cameraPreview}
              devicePosition="back"
              flash="auto"
              resolution="high"
              onReady={() => {
                cameraCtxRef.current = Taro.createCameraContext();
              }}
            />
          )}
          <View className={styles.cameraInfoOverlay}>
            <View className={styles.recordingIndicator}>
              <View className={styles.recordingDot} />
              <Text className={styles.recordingText}>REC</Text>
            </View>
            <Text className={styles.cameraTime}>{formatDuration(session.duration)}</Text>
          </View>
        </View>

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

        {isDemo && (
          <Text className={styles.demoHint}>演示模式：所有功能可正常点击体验，但不会实际调用设备</Text>
        )}
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
        {isDemo && (
          <View className={styles.demoBadge}>
            <Text className={styles.demoBadgeIcon}>{'\u{1F3AE}'}</Text>
            <Text className={styles.demoBadgeText}>演示模式 - 流程已结束</Text>
          </View>
        )}
        <Text className={styles.closedIcon}>{'\u2705'}</Text>
        <Text className={styles.closedTitle}>
          {isDemo ? '演示结束' : '保护已结束'}
        </Text>
        <View className={styles.closedSaved}>
          <Text>{'\u{1F512}'}</Text>
          <Text>{isDemo ? '演示流程已完整展示' : '证据已自动保存'}</Text>
        </View>

        {isDemo && (
          <View className={styles.demoSummary}>
            <Text className={styles.demoSummaryText}>
              演示模式已为您完整展示了保护模式的全流程：
              {'\n'}初始化 → GPS定位 → 录像/录音 → 数据监控 → 自动结束
              {'\n\n'}现在去记录一条善行，体验完整闭环吧！
            </Text>
          </View>
        )}

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
          <View className={`${styles.closedBtn} ${styles.closedBtnNew}`} onClick={handleStartNew}>
            <Text>{'\u{1F6E1}\uFE0F'} 开始新保护</Text>
          </View>
          <View className={`${styles.closedBtn} ${styles.closedBtnRecord}`} onClick={handleGoRecord}>
            <Text>{'\u{1F4DD}'} {isDemo ? '去记录善行' : '记录善行'}</Text>
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
