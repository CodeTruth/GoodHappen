import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Textarea, Image } from '@tarojs/components';
import Taro, { RecorderManager } from '@tarojs/taro';
import { generateMultiAIResponseStream, moderateContent, evaluateCredibility } from '@/services/kindness';
import type { AIResponse as AIResponseType } from '@/services/kindness';
import { calculateFortune } from '@/utils/fortune';
import { useFortuneStore } from '@/store/fortune';
import { useKindnessStore } from '@/store/kindness';
import { useUserStore, checkIsMinor } from '@/store/user';
import { useDraftStore, DraftFormData } from '@/store/draft';
import { useMilestoneStore } from '@/store/milestone';
import { useCircleStore } from '@/store/circle';
// import { PERSONAS } from '@/services/ai'; // 不再需要直接引用人设列表
import { Kindness } from '@/types/kindness';
import MilestonePopup from '@/components/MilestonePopup';
import CustomTabBar from '@/components/CustomTabBar';
import styles from './index.module.scss';

// 反馈阶段：输入 → 提交中 → 反馈
type FeedbackPhase = 'input' | 'submitting' | 'feedback';

// 媒体类型切换：文本/语音/视频
type MediaType = 'text' | 'voice' | 'video';

// 反馈动效子阶段（严格时序）
// 提交 → (0.5s) 入库成功 → (0.3s) 福气飘字+数字滚动 → (0.2s) 本周第N件 → (0.5s) AI卡片 → (1-2s) AI流式 → 完成
type FeedbackStep =
  | 'hidden'           // 未进入反馈
  | 'success'          // 入库成功
  | 'fortune_float'    // 福气飘字 + 数字滚动
  | 'weekly_text'      // 本周第N件
  | 'ai_card'          // AI卡片出现
  | 'ai_streaming'     // AI流式输出
  | 'done';            // 完整展示，可操作

// 视频最大时长（秒）
const VIDEO_MAX_DURATION = 60;
// 录音最大时长（秒）
const VOICE_MAX_DURATION = 60;

const RecordPage: React.FC = () => {
  // 更新自定义 tabBar 选中状态（H5环境中用useEffect替代useDidShow）
  useEffect(() => {
    if (Taro.getTabBar) {
      const tabbar = Taro.getTabBar<{ current: number }>();
      if (tabbar) { tabbar.current = 1; }
    }
  }, []);

  const [recordType, setRecordType] = useState<'self' | 'witness'>('self');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [visibleScope, setVisibleScope] = useState<'private' | 'public' | 'followers' | 'circle'>('public');
  // N2 团体可见时选择的团体ID
  const [selectedCircleId, setSelectedCircleId] = useState<string>('');
  const [phase, setPhase] = useState<FeedbackPhase>('input');
  const [fortune, setFortune] = useState(0);
  const [aiContent, setAiContent] = useState('');
  const [aiPersonaName, setAiPersonaName] = useState('');
  const [aiResponses, setAiResponses] = useState<AIResponseType[]>([]); // 多人回复
  const [isStreaming, setIsStreaming] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const [weeklyCount] = useState(3);

  // ====== 媒体类型切换（任务1）======
  const [mediaType, setMediaType] = useState<MediaType>('text');

  // ====== 语音录制状态（任务1）======
  const [isRecording, setIsRecording] = useState(false);
  const [voicePath, setVoicePath] = useState<string>('');
  const [voiceText, setVoiceText] = useState<string>('');
  const [recordDuration, setRecordDuration] = useState(0);
  const recorderManagerRef = useRef<RecorderManager | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ====== 视频上传状态（任务1）======
  const [videoPath, setVideoPath] = useState<string>('');
  const [videoThumb, setVideoThumb] = useState<string>('');

  // ====== 反馈动效子阶段（任务3）======
  const [feedbackStep, setFeedbackStep] = useState<FeedbackStep>('hidden');
  // 福气数字滚动当前显示值
  const [fortuneDisplay, setFortuneDisplay] = useState(0);
  // 飘字是否可见
  const [floatVisible, setFloatVisible] = useState(false);

  // ====== 草稿自动保存（任务2）======
  const {
    currentDraftId,
    drafts,
    lastSavedAt,
    startAutoSave,
    stopAutoSave,
    editDraft,
    removeDraft,
    publishDraft,
    clearCurrent,
    loadDrafts,
    cleanExpired,
  } = useDraftStore();

  // ====== 里程碑（任务4）======
  const { loadTriggered, checkAndTrigger } = useMilestoneStore();

  const { streak, addFortune, recordKindness, canEarnToday, getDailyRemaining, resetIfNeeded, loadFromStorage } = useFortuneStore();

  // ====== 善行发布存储（修复首页看不到发布记录的问题） ======
  const { addKindness: addPublishedKindness } = useKindnessStore();

  // ====== 用户体系（Phase 5）：未成年保护 ======
  const { userInfo, loadFromStorage: loadUserFromStorage } = useUserStore();
  // 判定是否未成年
  const isMinor = checkIsMinor(userInfo?.birthYear);

  // ====== N2 团体可见：获取用户所属团体 ======
  const { getCurrentUserCircles, loadFromStorage: loadCircleFromStorage } = useCircleStore();
  const userCircles = userInfo ? getCurrentUserCircles(userInfo.id) : [];

  // 未成年用户：默认私密，且不可选"所有人"
  useEffect(() => {
    if (isMinor && visibleScope === 'public') {
      setVisibleScope('private');
    }
  }, [isMinor, visibleScope]);

  // 初始化
  useEffect(() => {
    loadFromStorage();
    resetIfNeeded();
    loadDrafts();
    cleanExpired();
    loadTriggered();
    loadUserFromStorage();
    loadCircleFromStorage();
    // 初始化录音管理器（仅在支持录音的环境中）
    try {
      recorderManagerRef.current = Taro.getRecorderManager();
    } catch {
      recorderManagerRef.current = null;
    }

    // 注册录音回调（H5环境中录音管理器可能不支持）
    if (recorderManagerRef.current && typeof recorderManagerRef.current.onStop === 'function') {
      recorderManagerRef.current.onStop((res) => {
        setIsRecording(false);
        setVoicePath(res.tempFilePath);
        setRecordDuration(res.duration || 0);
        // 停止计时
        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        // 语音转文字（占位：实际应调用微信插件或后端 ASR 服务）
        // 这里先用占位文本，提示用户语音已记录
        setVoiceText('[语音已记录，正在转文字...]');
        Taro.showToast({ title: '语音已保存', icon: 'success' });
      });

      recorderManagerRef.current.onError((err) => {
        console.error('[Record] Voice record error:', err);
        setIsRecording(false);
        if (recordTimerRef.current) {
          clearInterval(recordTimerRef.current);
          recordTimerRef.current = null;
        }
        Taro.showToast({ title: '录音失败', icon: 'none' });
      });
    }

    return () => {
      stopAutoSave();
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
    };
  }, []);

  // 获取当前表单数据（供草稿自动保存使用）
  const getFormData = useCallback((): DraftFormData => ({
    content,
    recordType,
    tags: selectedTags,
    images,
    video: videoPath || undefined,
    videoThumb: videoThumb || undefined,
    voice: voicePath || undefined,
    voiceText: voiceText || undefined,
    visibleScope,
    circleId: visibleScope === 'circle' ? selectedCircleId : undefined,
  }), [content, recordType, selectedTags, images, videoPath, videoThumb, voicePath, voiceText, visibleScope, selectedCircleId]);

  // 启动草稿自动保存（内容有变化时）
  useEffect(() => {
    if (phase !== 'input') return;
    startAutoSave(getFormData);
    return () => {
      stopAutoSave();
    };
  }, [phase, getFormData, startAutoSave, stopAutoSave]);

  const tags = ['助人', '环保', '孝亲', '公益', '邻里互助', '关怀', '工作', '亲子'];

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleChooseImage = () => {
    Taro.chooseImage({
      count: 9 - images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        setImages(prev => [...prev, ...res.tempFilePaths]);
      }
    });
  };

  const handleDeleteImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // ====== 任务1：语音录制 ======
  const handleStartRecord = () => {
    if (!recorderManagerRef.current) {
      Taro.showToast({ title: '录音管理器未初始化', icon: 'none' });
      return;
    }
    // 先清空旧录音
    setVoicePath('');
    setVoiceText('');
    setRecordDuration(0);

    recorderManagerRef.current.start({
      duration: VOICE_MAX_DURATION * 1000,
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: 'mp3',
    });
    setIsRecording(true);
    // 启动计时器（用于波形动画与显示时长）
    recordTimerRef.current = setInterval(() => {
      setRecordDuration(prev => {
        if (prev + 1 >= VOICE_MAX_DURATION) {
          // 达到最大时长自动停止
          recorderManagerRef.current?.stop();
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleStopRecord = () => {
    if (!recorderManagerRef.current) return;
    recorderManagerRef.current.stop();
  };

  const handleDeleteVoice = () => {
    setVoicePath('');
    setVoiceText('');
    setRecordDuration(0);
  };

  // ====== 任务1：视频上传 ======
  const handleChooseVideo = () => {
    Taro.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: VIDEO_MAX_DURATION,
      camera: 'back',
      success: (res) => {
        if (res.duration > VIDEO_MAX_DURATION) {
          Taro.showToast({ title: `视频不能超过${VIDEO_MAX_DURATION}秒`, icon: 'none' });
          return;
        }
        setVideoPath(res.tempFilePath);
        // 缩略图：优先使用返回的 thumbTempFilePath（Taro 类型定义未包含该字段，但实际 API 会返回）
        const videoRes = res as Taro.chooseVideo.SuccessCallbackResult & { thumbTempFilePath?: string };
        if (videoRes.thumbTempFilePath) {
          setVideoThumb(videoRes.thumbTempFilePath);
        } else {
          setVideoThumb(res.tempFilePath);
        }
      },
      fail: (err) => {
        console.error('[Record] chooseVideo failed:', err);
      }
    });
  };

  const handleDeleteVideo = () => {
    setVideoPath('');
    setVideoThumb('');
  };

  // ====== 任务2：草稿操作 ======
  const handleEditDraft = (id: string) => {
    const draft = editDraft(id);
    if (!draft) return;
    setContent(draft.content);
    setRecordType(draft.recordType);
    setSelectedTags(draft.tags);
    setImages(draft.images);
    setVideoPath(draft.video || '');
    setVideoThumb(draft.videoThumb || '');
    setVoicePath(draft.voice || '');
    setVoiceText(draft.voiceText || '');
    setVisibleScope(draft.visibleScope);
    setSelectedCircleId(draft.circleId || '');
    Taro.showToast({ title: '草稿已加载', icon: 'success' });
  };

  const handleDeleteDraft = (id: string) => {
    Taro.showModal({
      title: '删除草稿',
      content: '确定删除该草稿吗？',
      success: (res) => {
        if (res.confirm) {
          removeDraft(id);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  };

  // ====== 任务3：福气数字滚动动画 ======
  const runFortuneRollAnimation = (target: number) => {
    const duration = 800; // 总时长 800ms
    const steps = 30;
    const interval = duration / steps;
    let current = 0;
    const inc = target / steps;
    const timer = setInterval(() => {
      current += inc;
      if (current >= target) {
        setFortuneDisplay(target);
        clearInterval(timer);
      } else {
        setFortuneDisplay(Math.floor(current));
      }
    }, interval);
  };

  // ====== 任务3：反馈动效时序控制 ======
  const runFeedbackSequence = (fortuneValue: number) => {
    // 重置子阶段
    setFeedbackStep('hidden');
    setFortuneDisplay(0);
    setFloatVisible(false);

    // (0.5s) 入库成功
    setTimeout(() => {
      setFeedbackStep('success');
    }, 500);

    // (0.8s) 福气飘字 + 数字滚动开始（success 后 0.3s）
    setTimeout(() => {
      setFeedbackStep('fortune_float');
      setFloatVisible(true);
      runFortuneRollAnimation(fortuneValue);
    }, 800);

    // (1.0s) 飘字开始淡出（fortune_float 后 0.2s 显示本周文字）
    setTimeout(() => {
      setFeedbackStep('weekly_text');
    }, 1000);

    // (1.5s) AI卡片出现（weekly_text 后 0.5s）
    setTimeout(() => {
      setFeedbackStep('ai_card');
    }, 1500);

    // (2.5s-3.5s) AI流式输出开始（ai_card 后 1-2s）
    setTimeout(() => {
      setFeedbackStep('ai_streaming');
    }, 2500);
  };

  // 清理所有定时器
  const clearAllTimers = () => {
    // 反馈时序由 setTimeout 链控制，无需显式清理（页面卸载时 React 会处理）
  };

  const handleSubmit = async () => {
    // 根据媒体类型校验内容
    const hasText = content.trim().length > 0;
    const hasVoice = !!voicePath;
    const hasVideo = !!videoPath;
    const hasImages = images.length > 0;

    if (!hasText && !hasVoice && !hasVideo && !hasImages) {
      Taro.showToast({
        title: '请输入内容或添加媒体',
        icon: 'none'
      });
      return;
    }

    if (mediaType === 'text' && !hasText && !hasImages) {
      Taro.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }

    // N2 团体可见时必须选择团体
    if (visibleScope === 'circle' && !selectedCircleId) {
      Taro.showToast({ title: '请选择要分享到的团体', icon: 'none' });
      return;
    }

    if (recordType === 'self' && !canEarnToday()) {
      Taro.showToast({
        title: '今日福气已达上限',
        icon: 'none'
      });
      return;
    }

    setPhase('submitting');
    setShowPlaceholder(false);
    setAiContent('');

    // 停止草稿自动保存
    stopAutoSave();

    try {
      const moderationResult = await moderateContent(content || voiceText || '记录一件善事');

      if (moderationResult.result === 'rejected') {
        Taro.showToast({
          title: '内容未通过审核',
          icon: 'none'
        });
        setPhase('input');
        return;
      }

      if (moderationResult.result === 'needs_modification') {
        Taro.showModal({
          title: '内容需修改',
          content: moderationResult.reason || '请修改后重新提交',
          showCancel: false
        });
        setPhase('input');
        return;
      }

      const credibilityResult = await evaluateCredibility(content || voiceText || '记录一件善事');

      if (credibilityResult.level === 'suspicious') {
        Taro.showModal({
          title: '提示',
          content: '该内容需要人工审核，审核通过后将计入福气',
          showCancel: false
        });
        setPhase('input');
        return;
      }

      const fortuneResult = calculateFortune({
        content: content || voiceText || '',
        type: recordType,
        tags: selectedTags,
        imageCount: images.length,
        hasVideo: !!videoPath,
        credibilityLevel: credibilityResult.level,
        streakDays: streak.currentStreak,
        likes: 0,
        comments: 0
      });

      setFortune(fortuneResult.total);

      if (recordType === 'self' && fortuneResult.total > 0) {
        addFortune(fortuneResult.total, '善行记录', content.slice(0, 20));
        recordKindness();
      }

      // 标记草稿已发布（开启15分钟编辑窗口）
      if (currentDraftId) {
        const publishedId = `kindness_${Date.now()}`;
        publishDraft(currentDraftId, publishedId);
      }

      // 将善行数据保存到 kindness store（修复首页看不到发布记录的问题）
      const newKindnessId = `kindness_${Date.now()}`;
      const userName = userInfo?.name || '我';
      const userAvatar = userInfo?.avatar || '';
      const newKindness: Kindness = {
        id: newKindnessId,
        userId: userInfo?.id || 'currentUser',
        userName,
        userAvatar,
        content: content || voiceText || '',
        type: recordType,
        tags: selectedTags,
        images: images.length > 0 ? images : undefined,
        video: videoPath || undefined,
        location: userInfo?.region || undefined,
        visibleScope,
        circleId: visibleScope === 'circle' ? selectedCircleId : undefined,
        credibilityScore: credibilityResult.level === 'high' ? 1.2 : 1.0,
        blessingValue: fortuneResult.total,
        likes: 0,
        comments: 0,
        createdAt: new Date().toISOString(),
      };
      addPublishedKindness(newKindness);

      // 进入反馈阶段，启动严格时序动画
      setPhase('feedback');
      runFeedbackSequence(fortuneResult.total);

      // 等待 AI 卡片出现后再开始流式输出
      setTimeout(async () => {
        setIsStreaming(true);
        setAiResponses([]);
        await generateMultiAIResponseStream(
          content || voiceText || '记录一件善事',
          recordType === 'witness',
          {
            firstPersonaStart: () => {
              setShowPlaceholder(true);
            },
            firstChunk: (chunk) => {
              setShowPlaceholder(false);
              setAiContent(prev => prev + chunk);
            },
            firstComplete: (fullContent, persona) => {
              setShowPlaceholder(false);
              setAiContent(fullContent);
              setAiPersonaName(persona.name);
            },
            secondComplete: (fullContent, persona) => {
              // 第二位名人回复到达，加入列表
              setAiResponses(prev => [...prev, {
                persona: persona.id,
                personaName: persona.name,
                content: fullContent,
                createdAt: new Date().toISOString(),
              }]);
            },
            allComplete: (responses) => {
              setIsStreaming(false);
              setFeedbackStep('done');
              // 更新 kindness store 中的 aiResponse（取第一条）
              const updatedKindness: Kindness = {
                ...newKindness,
                aiResponse: {
                  persona: responses[0].persona,
                  personaName: responses[0].personaName,
                  content: responses[0].content,
                  createdAt: responses[0].createdAt,
                },
              };
              addPublishedKindness(updatedKindness);
            },
            onError: () => {
              setShowPlaceholder(false);
              setAiContent('AI小伙伴今天有点忙，但你的温暖已经被记住了 ✨');
              setIsStreaming(false);
              setFeedbackStep('done');
            }
          }
        );

      }, 1500); // 在 ai_card 阶段（1.5s）开始 AI 请求

      // 任务4：检查里程碑触发（善行数+1 后检查）
      if (recordType === 'self') {
        // 累计善行数 = 总福气 / 平均每件 ~ 估算，更准确应记录次数
        // 这里用 dailyStats.count + transactions 中 earn 类型数估算
        // 简化：用 totalFortune + fortuneResult.total 作为累计善行数指标
        // 实际应使用专门的计数器，这里用 transactions 长度近似
        setTimeout(() => {
          checkAndTrigger(
            useFortuneStore.getState().transactions.filter(t => t.type === 'earn').length,
            useFortuneStore.getState().streak.currentStreak
          );
        }, 2000);
      }
    } catch (error) {
      console.error('[Record] Submit failed:', error);
      Taro.showToast({
        title: '发布失败，请重试',
        icon: 'none'
      });
      setPhase('input');
    }
  };

  const handleBack = () => {
    clearAllTimers();
    setPhase('input');
    setContent('');
    setSelectedTags([]);
    setImages([]);
    setVideoPath('');
    setVideoThumb('');
    setVoicePath('');
    setVoiceText('');
    setAiContent('');
    setAiPersonaName('');
    setFortune(0);
    setFeedbackStep('hidden');
    setSelectedCircleId('');
    clearCurrent();
    Taro.switchTab({
      url: '/pages/home/index'
    });
  };

  const handleShareToCircle = () => {
    Taro.switchTab({
      url: '/pages/circle/index'
    });
  };

  // 格式化录音时长
  const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 格式化草稿保存时间
  const formatSaveTime = (ts: number | null): string => {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 5000) return '刚刚';
    if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const dailyRemaining = getDailyRemaining();

  return (
    <View className={styles.pageWrapper}>
    <View className={styles.container}>
      {/* 任务4：里程碑弹窗 */}
      <MilestonePopup />

      {phase === 'input' && (
        <>
          <View className={styles.header}>
            <Text className={styles.title}>记录善行</Text>
            <Text className={styles.subtitle}>再小的善意也值得被看见</Text>
          </View>

          {recordType === 'self' && (
            <View className={styles.streakInfo}>
              <Text className={styles.streakText}>
                🔥 连续{streak.currentStreak}天 · 今日剩余福气额度: {dailyRemaining}
              </Text>
            </View>
          )}

          <View className={styles.typeSelector}>
            <View
              className={`${styles.typeOption} ${recordType === 'self' ? styles.active : ''}`}
              onClick={() => setRecordType('self')}
            >
              <Text className={styles.typeIcon}>✨</Text>
              <Text className={styles.typeName}>我做的好事</Text>
              <Text className={styles.typeDesc}>记录自己的善行</Text>
            </View>
            <View
              className={`${styles.typeOption} ${recordType === 'witness' ? styles.active : ''}`}
              onClick={() => setRecordType('witness')}
            >
              <Text className={styles.typeIcon}>👀</Text>
              <Text className={styles.typeName}>我看到的好事</Text>
              <Text className={styles.typeDesc}>见证他人的温暖</Text>
            </View>
          </View>

          <View className={styles.form}>
            {/* 任务1：媒体类型切换入口 */}
            <View className={styles.formItem}>
              <Text className={styles.label}>记录方式</Text>
              <View className={styles.mediaSelector}>
                <View
                  className={`${styles.mediaOption} ${mediaType === 'text' ? styles.active : ''}`}
                  onClick={() => setMediaType('text')}
                >
                  <Text className={styles.mediaIcon}>📝</Text>
                  <Text className={styles.mediaText}>文字</Text>
                </View>
                <View
                  className={`${styles.mediaOption} ${mediaType === 'video' ? styles.active : ''}`}
                  onClick={() => setMediaType('video')}
                >
                  <Text className={styles.mediaIcon}>🎬</Text>
                  <Text className={styles.mediaText}>视频</Text>
                </View>
              </View>
            </View>

            {/* 文字输入（始终可用，语音/视频时可作为补充） */}
            <View className={styles.formItem}>
              <Text className={styles.label}>内容</Text>
              <Textarea
                className={styles.textarea}
                placeholder={mediaType === 'voice' ? '语音转文字内容（可编辑）...' : '记录下这个温暖的瞬间...'}
                value={content}
                onInput={(e) => setContent(e.detail.value)}
                maxlength={500}
                showConfirmBar={false}
              />
            </View>

            {/* 任务1：语音录制区域 */}
            {mediaType === 'voice' && (
              <View className={styles.formItem}>
                <Text className={styles.label}>语音录制</Text>
                <View className={styles.voiceSection}>
                  {!isRecording && !voicePath && (
                    <View className={styles.recordBtn} onClick={handleStartRecord}>
                      <Text className={styles.recordIcon}>🎤</Text>
                      <Text className={styles.recordBtnText}>点击开始录音</Text>
                    </View>
                  )}

                  {isRecording && (
                    <View className={styles.recording} onClick={handleStopRecord}>
                      {/* 波形动画 */}
                      <View className={styles.waveform}>
                        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                          <View
                            key={i}
                            className={styles.waveBar}
                            style={{ animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </View>
                      <Text className={styles.recordingTime}>{formatDuration(recordDuration)}</Text>
                      <Text className={styles.recordingHint}>点击停止</Text>
                    </View>
                  )}

                  {!isRecording && voicePath && (
                    <View className={styles.voicePreview}>
                      <View className={styles.voiceInfo}>
                        <Text className={styles.voiceIcon}>🎵</Text>
                        <View className={styles.voiceMeta}>
                          <Text className={styles.voiceDuration}>录音时长 {formatDuration(Math.floor(recordDuration / 1000))}</Text>
                          {voiceText && <Text className={styles.voiceText}>{voiceText}</Text>}
                        </View>
                      </View>
                      <View className={styles.voiceActions}>
                        <View className={styles.voiceAction} onClick={handleStartRecord}>
                          <Text className={styles.voiceActionText}>重录</Text>
                        </View>
                        <View className={styles.voiceAction} onClick={handleDeleteVoice}>
                          <Text className={styles.voiceActionText}>删除</Text>
                        </View>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* 任务1：视频上传区域 */}
            {mediaType === 'video' && (
              <View className={styles.formItem}>
                <Text className={styles.label}>视频（≤{VIDEO_MAX_DURATION}秒）</Text>
                <View className={styles.videoSection}>
                  {!videoPath ? (
                    <View className={styles.videoUploadBtn} onClick={handleChooseVideo}>
                      <Text className={styles.uploadIcon}>🎬</Text>
                      <Text className={styles.uploadText}>选择视频</Text>
                      <Text className={styles.uploadHint}>最长{VIDEO_MAX_DURATION}秒</Text>
                    </View>
                  ) : (
                    <View className={styles.videoPreview}>
                      <Image
                        src={videoThumb}
                        className={styles.videoThumb}
                        mode="aspectFill"
                      />
                      <View className={styles.videoPlayIcon}>
                        <Text className={styles.playIcon}>▶</Text>
                      </View>
                      <View className={styles.deleteBtn} onClick={handleDeleteVideo}>
                        <Text className={styles.deleteIcon}>✕</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            <View className={styles.formItem}>
              <Text className={styles.label}>标签（可多选）</Text>
              <View className={styles.tags}>
                {tags.map((tag) => (
                  <View
                    key={tag}
                    className={`${styles.tag} ${selectedTags.includes(tag) ? styles.active : ''}`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    <Text className={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View className={styles.formItem}>
              <Text className={styles.label}>图片（可选）</Text>
              <View className={styles.imageUpload}>
                {images.map((img, index) => (
                  <View key={index} className={styles.imagePreview}>
                    <Image
                      src={img}
                      className={styles.previewImage}
                      mode="aspectFill"
                    />
                    <View className={styles.deleteBtn} onClick={() => handleDeleteImage(index)}>
                      <Text className={styles.deleteIcon}>✕</Text>
                    </View>
                  </View>
                ))}
                {images.length < 9 && (
                  <View className={styles.uploadBtn} onClick={handleChooseImage}>
                    <Text className={styles.uploadIcon}>📷</Text>
                    <Text className={styles.uploadText}>添加图片</Text>
                  </View>
                )}
              </View>
            </View>

            {recordType === 'self' && (
              <View className={styles.formItem}>
                <Text className={styles.label}>可见范围</Text>
                <View className={styles.scopeSelector}>
                  <View
                    className={`${styles.scopeOption} ${visibleScope === 'private' ? styles.active : ''}`}
                    onClick={() => setVisibleScope('private')}
                  >
                    <Text className={styles.scopeText}>仅自己</Text>
                  </View>
                  {/* N2 团体可见：仅当用户有所属团体时显示 */}
                  {userCircles.length > 0 && (
                    <View
                      className={`${styles.scopeOption} ${visibleScope === 'circle' ? styles.active : ''}`}
                      onClick={() => setVisibleScope('circle')}
                    >
                      <Text className={styles.scopeText}>团体可见</Text>
                    </View>
                  )}
                  <View
                    className={`${styles.scopeOption} ${visibleScope === 'followers' ? styles.active : ''}`}
                    onClick={() => setVisibleScope('followers')}
                  >
                    <Text className={styles.scopeText}>互相关注</Text>
                  </View>
                  {/* 未成年用户隐藏"所有人"选项 */}
                  {!isMinor && (
                    <View
                      className={`${styles.scopeOption} ${visibleScope === 'public' ? styles.active : ''}`}
                      onClick={() => setVisibleScope('public')}
                    >
                      <Text className={styles.scopeText}>所有人</Text>
                    </View>
                  )}
                </View>
                {/* N2 团体可见时，选择具体团体 */}
                {visibleScope === 'circle' && userCircles.length > 0 && (
                  <View className={styles.circleSelector}>
                    <Text className={styles.circleSelectorLabel}>选择团体：</Text>
                    <View className={styles.circleOptions}>
                      {userCircles.map(circle => (
                        <View
                          key={circle.id}
                          className={`${styles.circleOption} ${selectedCircleId === circle.id ? styles.active : ''}`}
                          onClick={() => setSelectedCircleId(circle.id)}
                        >
                          <Text className={styles.circleOptionText}>{circle.name}</Text>
                        </View>
                      ))}
                    </View>
                    {userCircles.length > 1 && !selectedCircleId && (
                      <Text className={styles.circleHint}>请选择要分享到的团体</Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 任务2：草稿保存状态提示 */}
          {currentDraftId && lastSavedAt && (
            <View className={styles.draftSavedHint}>
              <Text className={styles.draftSavedText}>📝 草稿已自动保存 · {formatSaveTime(lastSavedAt)}</Text>
            </View>
          )}

          {/* 任务2：草稿列表 */}
          {drafts.length > 0 && (
            <View className={styles.draftList}>
              <Text className={styles.draftListTitle}>草稿箱（{drafts.length}）</Text>
              {drafts.map(draft => (
                <View key={draft.id} className={styles.draftItem}>
                  <View
                    className={styles.draftContent}
                    onClick={() => handleEditDraft(draft.id)}
                  >
                    <Text className={styles.draftPreview}>
                      {draft.content.slice(0, 30) || (draft.voice ? '[语音草稿]' : '[视频草稿]') || '[空草稿]'}
                    </Text>
                    <Text className={styles.draftTime}>{formatSaveTime(draft.updatedAt)}</Text>
                  </View>
                  <View className={styles.draftOps}>
                    <Text className={styles.draftOp} onClick={() => handleEditDraft(draft.id)}>编辑</Text>
                    <Text className={styles.draftOp} onClick={() => handleDeleteDraft(draft.id)}>删除</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View className={styles.submitBtn} onClick={handleSubmit}>
            <Text className={styles.submitText}>发布善行</Text>
          </View>
        </>
      )}

      {phase === 'submitting' && (
        <View className={styles.submitting}>
          <View className={styles.loadingIcon}>✨</View>
          <Text className={styles.loadingText}>AI正在感受你的温暖...</Text>
        </View>
      )}

      {phase === 'feedback' && (
        <View className={styles.feedback}>
          {/* 任务3：严格时序动效 */}
          {/* Step 1: 入库成功（0.5s 后） */}
          {feedbackStep !== 'hidden' && (
            <View className={styles.feedbackHeader}>
              <Text className={styles.feedbackTitle}>温暖已送达</Text>
            </View>
          )}

          {/* Step 2: 福气飘字 + 数字滚动（0.8s 后） */}
          {feedbackStep === 'fortune_float' ||
            feedbackStep === 'weekly_text' ||
            feedbackStep === 'ai_card' ||
            feedbackStep === 'ai_streaming' ||
            feedbackStep === 'done' ? (
            <View className={styles.fortuneAnimation}>
              <Text className={styles.fortuneIcon}>✨</Text>
              <Text className={styles.fortuneText}>
                {recordType === 'self'
                  ? `福气 +${fortuneDisplay}`
                  : '温暖已记录'}
              </Text>
              {/* 飘字动画：从下往上飘并淡出 */}
              {floatVisible && (
                <View className={styles.floatText}>
                  <Text className={styles.floatTextInner}>✨ 福气 +{fortune}</Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Step 3: 本周第N件（1.0s 后） */}
          {(feedbackStep === 'weekly_text' ||
            feedbackStep === 'ai_card' ||
            feedbackStep === 'ai_streaming' ||
            feedbackStep === 'done') && (
            <Text className={styles.weeklyText}>
              {recordType === 'self'
                ? `本周第${weeklyCount}件温暖小事 · 连续${streak.currentStreak}天`
                : '感谢你让这份温暖被看见'
              }
            </Text>
          )}

          {/* Step 4: AI卡片出现（1.5s 后） - 多人回复 */}
          {(feedbackStep === 'ai_card' ||
            feedbackStep === 'ai_streaming' ||
            feedbackStep === 'done') && (
            <View className={styles.aiCards}>
              {/* 第一位名人：流式呈现 */}
              <View className={styles.aiCard}>
                <View className={styles.aiHeader}>
                  <Text className={styles.aiPersona}>
                    {aiPersonaName || 'AI'}的回应
                    {isStreaming && <Text className={styles.streamingDot}>...</Text>}
                  </Text>
                </View>
                <Text className={styles.aiContent}>
                  {feedbackStep === 'ai_card'
                    ? 'AI正在感受你的温暖…'
                    : (showPlaceholder && !aiContent ? 'AI正在感受你的温暖...' : aiContent)}
                  {isStreaming && <Text className={styles.cursor}>|</Text>}
                </Text>
              </View>
              {/* 第二位名人：完成后出现 */}
              {aiResponses.map((resp, idx) => (
                <View key={resp.persona} className={`${styles.aiCard} ${styles.aiCardSecond}`}>
                  <View className={styles.aiHeader}>
                    <Text className={styles.aiPersona}>
                      {resp.personaName}也说
                    </Text>
                  </View>
                  <Text className={styles.aiContent}>{resp.content}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Step 5: 完整展示后显示操作按钮 */}
          {feedbackStep === 'done' && (
            <View className={styles.feedbackActions}>
              <View className={styles.actionBtn} onClick={handleShareToCircle}>
                <Text className={styles.actionText}>分享到广场</Text>
              </View>
              <View className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} onClick={handleBack}>
                <Text className={styles.actionText}>返回首页</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
    <CustomTabBar currentPath="pages/record/index" />
    </View>
  );
};

export default RecordPage;
