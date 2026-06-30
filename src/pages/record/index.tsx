import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { useRitualStore } from '@/store/ritual';
import { useMoralTaskStore } from '@/store/moral-task';
import { CATEGORY_CONFIG } from '@/data/mock-moral-tasks';
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

// 任务选择器子组件
const TaskSelectorContent: React.FC<{
  circleId: string;
  selectedTaskId: string;
  onSelect: (taskId: string) => void;
}> = ({ circleId, selectedTaskId, onSelect }) => {
  const { getActiveTasksByCircle } = useMoralTaskStore();
  const tasks = getActiveTasksByCircle(circleId);

  if (tasks.length === 0) {
    return <Text className={styles.taskEmpty}>暂无本周德育任务</Text>;
  }

  return (
    <View className={styles.taskSelectorList}>
      {tasks.map((task) => {
        const catConfig = CATEGORY_CONFIG[task.category];
        return (
          <View
            key={task.id}
            className={`${styles.taskOption} ${selectedTaskId === task.id ? styles.taskOptionActive : ''}`}
            onClick={() => onSelect(selectedTaskId === task.id ? '' : task.id)}
          >
            <Text className={styles.taskOptionIcon}>{catConfig.icon}</Text>
            <View className={styles.taskOptionInfo}>
              <Text className={styles.taskOptionTitle}>{task.title}</Text>
              <Text className={styles.taskOptionMeta}>
                {catConfig.name} · {task.requireVideo ? '需视频' : '文字即可'} · 截止{task.weekRange.end.slice(5)}
              </Text>
            </View>
            <Text className={styles.taskOptionCheck}>{selectedTaskId === task.id ? '✓' : ''}</Text>
          </View>
        );
      })}
      <View
        className={`${styles.taskOption} ${selectedTaskId === '' ? styles.taskOptionActive : ''}`}
        onClick={() => onSelect('')}
      >
        <Text className={styles.taskOptionIcon}>✨</Text>
        <View className={styles.taskOptionInfo}>
          <Text className={styles.taskOptionTitle}>自由记录（不关联任务）</Text>
          <Text className={styles.taskOptionMeta}>记录额外的善行</Text>
        </View>
        <Text className={styles.taskOptionCheck}>{selectedTaskId === '' ? '✓' : ''}</Text>
      </View>
    </View>
  );
};

const RecordPage: React.FC = () => {
  // 更新自定义 tabBar 选中状态（H5环境中用useEffect替代useDidShow）
  useEffect(() => {
    try {
      const page = Taro.getCurrentInstance().page;
      if (page && Taro.getTabBar) {
        const tabbar = Taro.getTabBar<{ current: number }>(page);
        if (tabbar) { tabbar.current = 1; }
      }
    } catch { /* H5 环境不支持 getTabBar */ }
  }, []);

  const [recordType, setRecordType] = useState<'self' | 'witness'>('self');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [visibleScope, setVisibleScope] = useState<'private' | 'public' | 'followers' | 'circle'>('public');
  // N2 团体可见时选择的团体ID
  const [selectedCircleId, setSelectedCircleId] = useState<string>('');
  // 关联德育任务
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [phase, setPhase] = useState<FeedbackPhase>('input');
  const [fortune, setFortune] = useState(0);
  const [aiContent, setAiContent] = useState('');
  const [aiPersonaName, setAiPersonaName] = useState('');
  const [aiResponses, setAiResponses] = useState<AIResponseType[]>([]); // 多人回复
  const [isStreaming, setIsStreaming] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  // ====== 善行发布存储 ======
  const { addKindness: addPublishedKindness, publishedList } = useKindnessStore();

  // 仪式开关
  const { enabled: ritualEnabled } = useRitualStore();

  const weeklyCount = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    return publishedList.filter(k => new Date(k.createdAt) >= weekStart).length || 0;
  }, [publishedList]);

  // ====== 媒体类型切换（任务1）======
  // 使用 Set 存储已选择的媒体类型，支持多选组合
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<Set<MediaType>>(new Set(['text']));

  const toggleMediaType = (type: MediaType) => {
    const newSet = new Set(selectedMediaTypes);
    if (newSet.has(type)) {
      if (newSet.size > 1) {
        newSet.delete(type);
      }
    } else {
      newSet.add(type);
    }
    setSelectedMediaTypes(newSet);
  };

  // ====== 语音录制状态（任务1）======
  const [isRecording, setIsRecording] = useState(false);
  const [voicePath, setVoicePath] = useState<string>('');
  const [voiceText, setVoiceText] = useState<string>('');
  const [recordDuration, setRecordDuration] = useState(0);
  const recorderManagerRef = useRef<RecorderManager | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const aiAbortedRef = useRef(false);
  const fortuneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      const manager = Taro.getRecorderManager();
      // H5 环境中 getRecorderManager 由 temporarilyNotSupport 包装，返回 rejected Promise
      if (manager && typeof manager.catch === 'function') {
        manager.catch(() => { /* H5 不支持录音 */ });
        recorderManagerRef.current = null;
      } else {
        recorderManagerRef.current = manager;
      }
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
      // 清理录音回调
      if (recorderManagerRef.current) {
        try {
          if (typeof recorderManagerRef.current.offStop === 'function') {
            recorderManagerRef.current.offStop();
          }
          if (typeof recorderManagerRef.current.offError === 'function') {
            recorderManagerRef.current.offError();
          }
        } catch { /* 忽略清理异常 */ }
      }
      clearAllTimers();
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
    const duration = 800;
    const steps = 30;
    const interval = duration / steps;
    let current = 0;
    const inc = target / steps;
    if (fortuneIntervalRef.current) {
      clearInterval(fortuneIntervalRef.current);
    }
    const timer = setInterval(() => {
      current += inc;
      if (current >= target) {
        setFortuneDisplay(target);
        clearInterval(timer);
        fortuneIntervalRef.current = null;
      } else {
        setFortuneDisplay(Math.floor(current));
      }
    }, interval);
    fortuneIntervalRef.current = timer;
  };

  // ====== 任务3：反馈动效时序控制 ======
  const runFeedbackSequence = (fortuneValue: number) => {
    // 清理旧定时器
    clearAllTimers();

    setFeedbackStep('hidden');
    setFortuneDisplay(0);
    setFloatVisible(false);

    const addTimer = (fn: () => void, delay: number) => {
      const id = setTimeout(fn, delay);
      feedbackTimersRef.current.push(id);
      return id;
    };

    if (!ritualEnabled) {
      // 仪式关闭：极简反馈，直接显示结果
      addTimer(() => {
        setFeedbackStep('done');
        setFortuneDisplay(fortuneValue);
        setFloatVisible(false);
      }, 300);
      return;
    }

    // 仪式开启：完整40秒仪式流程
    addTimer(() => { setFeedbackStep('success'); }, 500);
    addTimer(() => {
      setFeedbackStep('fortune_float');
      setFloatVisible(true);
      runFortuneRollAnimation(fortuneValue);
    }, 800);
    addTimer(() => { setFeedbackStep('weekly_text'); }, 1000);
    addTimer(() => { setFeedbackStep('ai_card'); }, 1500);
    addTimer(() => { setFeedbackStep('ai_streaming'); }, 2500);
  };

  // 清理所有定时器
  const clearAllTimers = () => {
    feedbackTimersRef.current.forEach(clearTimeout);
    feedbackTimersRef.current = [];
    if (fortuneIntervalRef.current) {
      clearInterval(fortuneIntervalRef.current);
      fortuneIntervalRef.current = null;
    }
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
        const publishedId = `kindness_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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

      // 如果关联了德育任务，同时创建任务提交记录
      if (selectedTaskId && selectedCircleId) {
        const { addSubmission } = useMoralTaskStore.getState();
        addSubmission({
          taskId: selectedTaskId,
          userId: userInfo?.id || 'currentUser',
          userName: userInfo?.name || '我',
          userAvatar: userInfo?.avatar || '',
          circleId: selectedCircleId,
          content: content || voiceText || '',
          videoUrl: videoPath || undefined,
          imageUrl: images.length > 0 ? images[0] : undefined,
        });
      }

      // 进入反馈阶段，启动严格时序动画
      setPhase('feedback');
      runFeedbackSequence(fortuneResult.total);

      // 等待 AI 卡片出现后再开始流式输出（仪式关闭时立即开始）
      setTimeout(async () => {
        setIsStreaming(true);
        setAiResponses([]);
        aiAbortedRef.current = false;
        await generateMultiAIResponseStream(
          content || voiceText || '记录一件善事',
          recordType === 'witness',
          {
            firstPersonaStart: () => {
              if (aiAbortedRef.current) return;
              setShowPlaceholder(true);
            },
            firstChunk: (chunk) => {
              if (aiAbortedRef.current) return;
              setShowPlaceholder(false);
              setAiContent(prev => prev + chunk);
            },
            firstComplete: (fullContent, persona) => {
              if (aiAbortedRef.current) return;
              setShowPlaceholder(false);
              setAiContent(fullContent);
              setAiPersonaName(persona.name);
            },
            secondComplete: (fullContent, persona) => {
              if (aiAbortedRef.current) return;
              // 第二位名人回复到达，加入列表
              setAiResponses(prev => [...prev, {
                persona: persona.id,
                personaName: persona.name,
                content: fullContent,
                createdAt: new Date().toISOString(),
              }]);
            },
            allComplete: (responses) => {
              if (aiAbortedRef.current) return;
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
              if (aiAbortedRef.current) return;
              setShowPlaceholder(false);
              setAiContent('AI小伙伴今天有点忙，但你的温暖已经被记住了 ✨');
              setIsStreaming(false);
              setFeedbackStep('done');
            }
          }
        );

      }, ritualEnabled ? 1500 : 0); // 仪式开启时等待1.5s，关闭时立即开始

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
    aiAbortedRef.current = true;
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
    setSelectedTaskId('');
    setShowTaskSelector(false);
    setSelectedMediaTypes(new Set(['text']));
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
            {/* 任务1：媒体类型切换入口（支持多选组合） */}
            <View className={styles.formItem}>
              <Text className={styles.label}>记录方式（可多选）</Text>
              <View className={styles.mediaSelector}>
                <View
                  className={`${styles.mediaOption} ${selectedMediaTypes.has('text') ? styles.active : ''}`}
                  onClick={() => toggleMediaType('text')}
                >
                  <Text className={styles.mediaIcon}>📝</Text>
                  <Text className={styles.mediaText}>文字</Text>
                </View>
                <View
                  className={`${styles.mediaOption} ${selectedMediaTypes.has('voice') ? styles.active : ''}`}
                  onClick={() => toggleMediaType('voice')}
                >
                  <Text className={styles.mediaIcon}>🎤</Text>
                  <Text className={styles.mediaText}>语音</Text>
                </View>
                <View
                  className={`${styles.mediaOption} ${selectedMediaTypes.has('video') ? styles.active : ''}`}
                  onClick={() => toggleMediaType('video')}
                >
                  <Text className={styles.mediaIcon}>🎬</Text>
                  <Text className={styles.mediaText}>视频</Text>
                </View>
              </View>
              <Text className={styles.mediaHint}>支持文字+图片+视频组合发布</Text>
            </View>

            {/* 文字输入（始终可用，语音/视频时可作为补充） */}
            <View className={styles.formItem}>
              <Text className={styles.label}>内容</Text>
              <Textarea
                className={styles.textarea}
                placeholder={selectedMediaTypes.has('voice') ? '语音转文字内容（可编辑）...' : '记录下这个温暖的瞬间...'}
                value={content}
                onInput={(e) => setContent(e.detail.value)}
                maxlength={500}
                showConfirmBar={false}
              />
              {content.trim().length > 0 && content.trim().length < 10 && (
                <Text className={styles.lengthHint}>💡 多写几句吧，说说具体做了什么、感受如何？（建议20字以上）</Text>
              )}
            </View>

            {/* 任务1：语音录制区域（选择语音时显示） */}
            {selectedMediaTypes.has('voice') && (
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

            {/* 任务1：视频上传区域（选择视频时显示） */}
            {selectedMediaTypes.has('video') && (
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

                {/* 关联德育任务（仅在选择了班级圈时显示） */}
                {visibleScope === 'circle' && selectedCircleId && (
                  <View className={styles.taskSelector}>
                    <View className={styles.taskSelectorHeader} onClick={() => setShowTaskSelector(!showTaskSelector)}>
                      <Text className={styles.taskSelectorTitle}>
                        {selectedTaskId ? '📋 已关联任务' : '📋 关联本周德育任务（可选）'}
                      </Text>
                      <Text className={styles.taskSelectorToggle}>{showTaskSelector ? '▲' : '▼'}</Text>
                    </View>
                    {showTaskSelector && (
                      <TaskSelectorContent
                        circleId={selectedCircleId}
                        selectedTaskId={selectedTaskId}
                        onSelect={setSelectedTaskId}
                      />
                    )}
                    {selectedTaskId && (
                      <Text className={styles.taskSelectedHint}>
                        已关联：{useMoralTaskStore.getState().getTasksByCircle(selectedCircleId).find(t => t.id === selectedTaskId)?.title || ''}
                        {useMoralTaskStore.getState().getTasksByCircle(selectedCircleId).find(t => t.id === selectedTaskId)?.requireVideo && ' · 需视频'}
                      </Text>
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
          <View className={styles.loadingIcon}>🖋️</View>
          <Text className={styles.loadingText}>墨落纸上，温暖正在成形...</Text>
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
              {/* 第一位名人：流式呈现，可点击进入对话 */}
              <View
                className={styles.aiCard}
                onClick={() => {
                  // 找到第一位AI的人物ID（从aiPersonaName反查或通过其他方式）
                  // 这里使用一个简化的方式：从 kindness store 或已知数据中查找
                  // 实际应通过回调获取，这里先使用一个通用跳转
                  const firstPersonaId = aiResponses[0]?.persona || 'sudongpo';
                  Taro.navigateTo({
                    url: `/pages/ai-chat/index?persona=${firstPersonaId}&mode=free`
                  });
                }}
              >
                <View className={styles.aiHeader}>
                  <Text className={styles.aiPersona}>
                    🏛️ {aiPersonaName || '先贤'}回应
                    {isStreaming && <Text className={styles.streamingDot}>...</Text>}
                  </Text>
                  <Text className={styles.aiHint}>💬 点击继续对话</Text>
                </View>
                <Text className={styles.aiContent}>
                  {feedbackStep === 'ai_card'
                    ? '古人提笔，墨香渐起…'
                    : (showPlaceholder && !aiContent ? '古人提笔，墨香渐起...' : aiContent)}
                  {isStreaming && <Text className={styles.cursor}>|</Text>}
                </Text>
              </View>
              {/* 第二位名人：完成后出现，可点击进入对话 */}
              {aiResponses.map((resp, idx) => (
                <View
                  key={resp.persona}
                  className={`${styles.aiCard} ${styles.aiCardSecond}`}
                  onClick={() => {
                    Taro.navigateTo({
                      url: `/pages/ai-chat/index?persona=${resp.persona}&mode=free`
                    });
                  }}
                >
                  <View className={styles.aiHeader}>
                    <Text className={styles.aiPersona}>
                      📜 {resp.personaName}也回应
                    </Text>
                    <Text className={styles.aiHint}>💬 点击继续对话</Text>
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
