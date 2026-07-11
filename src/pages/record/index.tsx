import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, Textarea, Image } from '@tarojs/components';
import Taro, { RecorderManager, useRouter } from '@tarojs/taro';
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
import { useProtectionStore } from '@/store/protection';
import { useBadgeStore } from '@/store/badge';
import { getCurrentGPS, MediaAsset } from '@/services/evidence';
import { clearLastClosedSession } from '@/services/protection-mode';
import { CircleType, getCircleTypeConfig } from '@/config/circle-types';
// import { PERSONAS } from '@/services/ai'; // 不再需要直接引用人设列表
import { Kindness } from '@/types/kindness';
import { detectRisk, RiskScenario } from '@/services/risk-detection';
import MilestonePopup from '@/components/MilestonePopup';
import SharePoster from '@/components/SharePoster';
import { WITNESS_TEMPLATES } from '@/data/witness-templates';
import styles from './index.module.scss';

// 快速记录模板（内联，避免循环依赖）
const QUICK_TEMPLATES_DISPLAY = [
  { id: 'qt_001', emoji: '🚌', label: '让了座', content: '🚌 今天给需要的人让了座', tags: ['助人'] },
  { id: 'qt_002', emoji: '😊', label: '说了谢谢', content: '😊 今天认真对服务人员说了声谢谢', tags: ['关怀'] },
  { id: 'qt_003', emoji: '🗑️', label: '捡了垃圾', content: '🗑️ 路上顺手捡了个垃圾扔进垃圾桶', tags: ['环保'] },
  { id: 'qt_004', emoji: '🚪', label: '留了门', content: '🚪 进门时帮后面的人留了一下门', tags: ['助人'] },
  { id: 'qt_005', emoji: '💬', label: '夸了人', content: '💬 今天真诚地夸了身边一个人', tags: ['关怀'] },
  { id: 'qt_006', emoji: '📱', label: '打了电话', content: '📱 今天给家人打了个电话', tags: ['孝亲', '陪伴'] },
  { id: 'qt_007', emoji: '🤝', label: '帮了忙', content: '🤝 今天帮身边的人做了一件小事', tags: ['助人'] },
  { id: 'qt_008', emoji: '☕', label: '请了杯水', content: '☕ 今天帮同事接了杯水/买了杯咖啡', tags: ['关怀'] },
];

// 先贤语录库
const SAGE_QUOTES = [
  { persona: 'sudongpo', name: '苏东坡', quote: '但愿人长久，千里共婵娟。' },
  { persona: 'confucius', name: '孔子', quote: '己所不欲，勿施于人。' },
  { persona: 'libai', name: '李白', quote: '天生我材必有用，千金散尽还复来。' },
  { persona: 'dufu', name: '杜甫', quote: '安得广厦千万间，大庇天下寒士俱欢颜。' },
  { persona: 'zhuangzi', name: '庄子', quote: '天地有大美而不言。' },
  { persona: 'liqingzhao', name: '李清照', quote: '生当作人杰，死亦为鬼雄。' },
  { persona: 'taoyuanming', name: '陶渊明', quote: '采菊东篱下，悠然见南山。' },
  { persona: 'wangwei', name: '王维', quote: '行到水穷处，坐看云起时。' },
];

// 反馈阶段：输入 → 提交中 → 反馈
type FeedbackPhase = 'input' | 'submitting' | 'feedback';

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
  const { getCircleById } = useCircleStore();
  const tasks = getActiveTasksByCircle(circleId);

  // 获取圈子类型配置
  const circle = getCircleById(circleId);
  const circleType: CircleType = (circle?.type as CircleType) || 'public';
  const typeConfig = getCircleTypeConfig(circleType);
  const categoryMap: Record<string, typeof typeConfig.categories[0]> = {};
  typeConfig.categories.forEach((c) => { categoryMap[c.key] = c; });

  if (tasks.length === 0) {
    return <Text className={styles.taskEmpty}>暂无本周{typeConfig.labels.task}</Text>;
  }

  return (
    <View className={styles.taskSelectorList}>
      {tasks.map((task) => {
        const catConfig = categoryMap[task.category] || typeConfig.categories[0];
        return (
          <View
            key={task.id}
            className={`${styles.taskOption} ${selectedTaskId === task.id ? styles.taskOptionActive : ''}`}
            onClick={() => onSelect(selectedTaskId === task.id ? '' : task.id)}
          >
            <Text className={styles.taskOptionIcon}>{catConfig?.icon || '✨'}</Text>
            <View className={styles.taskOptionInfo}>
              <Text className={styles.taskOptionTitle}>{task.title}</Text>
              <Text className={styles.taskOptionMeta}>
                {catConfig?.name || '其他'} · {task.requireVideo ? '需视频' : '文字即可'} · 截止{task.weekRange?.end.slice(5) || ''}
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
          <Text className={styles.taskOptionTitle}>自由记录（不关联{typeConfig.labels.taskShort}）</Text>
          <Text className={styles.taskOptionMeta}>记录额外的{typeConfig.labels.taskShort}</Text>
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
        if (tabbar) { tabbar.current = 2; }
      }
    } catch { /* H5 环境不支持 getTabBar */ }
  }, []);

  // 从详情页「我要见证」按钮跳转时，自动切换到见证模式
  const router = useRouter();
  useEffect(() => {
    if (router.params.mode === 'witness') {
      setRecordType('witness');
      setVisibleScope('public');
    }
  }, []);

  const [recordType, setRecordType] = useState<'self' | 'witness'>('self');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [visibleScope, setVisibleScope] = useState<'private' | 'public' | 'followers' | 'circle'>('public');
  // N2 团体可见时选择的团体ID
  const [selectedCircleId, setSelectedCircleId] = useState<string>('');
  // 关联德育任务
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  // 匿名行善
  const [isAnonymous, setIsAnonymous] = useState(false);
  // 首次善行匿名提示
  const [showAnonymousTip, setShowAnonymousTip] = useState(false);
  // 完成发布后是否显示分享按钮
  const [showSharePoster, setShowSharePoster] = useState(false);
  // 风险检测
  const [riskScenario, setRiskScenario] = useState<RiskScenario | null>(null);
  const [phase, setPhase] = useState<FeedbackPhase>('input');
  const [fortune, setFortune] = useState(0);
  const [aiContent, setAiContent] = useState('');
  const [aiPersonaName, setAiPersonaName] = useState('');
  const [aiResponses, setAiResponses] = useState<AIResponseType[]>([]); // 多人回复
  const [isStreaming, setIsStreaming] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  // 随机先贤语录（避免每次渲染随机变化）
  const [randomQuote] = useState(() => SAGE_QUOTES[Math.floor(Math.random() * SAGE_QUOTES.length)]);

  // ====== 善行发布存储 ======
  const { addKindness: addPublishedKindness, publishedList } = useKindnessStore();

  // 仪式开关
  const { enabled: ritualEnabled } = useRitualStore();

  const weeklyCount = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
    return publishedList.filter(k => new Date(k.createdAt) >= weekStart).length || 0;
  }, [publishedList]);

  // ====== 语音录制状态（任务1）======
  const [isRecording, setIsRecording] = useState(false);
  const [voicePath, setVoicePath] = useState<string>('');
  const [voiceText, setVoiceText] = useState<string>('');
  const [recordDuration, setRecordDuration] = useState(0);
  const recorderManagerRef = useRef<RecorderManager | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showScopePicker, setShowScopePicker] = useState(false);
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
  // 庆祝彩纸
  const [showConfetti, setShowConfetti] = useState(false);

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

  // 首次善行默认开启匿名模式
  useEffect(() => {
    if (publishedList.length === 0 && !isAnonymous) {
      setIsAnonymous(true);
      setShowAnonymousTip(true);
      // 3秒后自动隐藏提示
      const t = setTimeout(() => setShowAnonymousTip(false), 3000);
      return () => clearTimeout(t);
    }
  }, [publishedList]);

  // 从URL参数读取外部上下文（AI顾问 / 保护模式 / 挑战预设）
  const [fromSource, setFromSource] = useState('');
  const [protectionMeta, setProtectionMeta] = useState<{
    duration: number; video: number; audio: number; gps: number; photos: number;
  } | null>(null);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params;
    if (!params) return;
    const from = params.from || '';
    const scene = params.scene ? decodeURIComponent(params.scene) : '';
    setFromSource(from);

    // 挑战/求助跳转来：预填内容和标签
    if (from === 'challenge' && params.preset) {
      try {
        const preset = JSON.parse(decodeURIComponent(params.preset));
        if (preset.content) setContent(preset.content);
        if (preset.tags && Array.isArray(preset.tags)) setSelectedTags(preset.tags);
      } catch {}
    }

    if (from === 'advisor' && scene) {
      setContent(scene);
      const risk = detectRisk(scene);
      if (risk) setRiskScenario(risk);
    }

    if (from === 'protection') {
      const duration = parseInt(params.duration || '0', 10);
      const video = parseInt(params.video || '0', 10);
      const audio = parseInt(params.audio || '0', 10);
      const gps = parseInt(params.gps || '0', 10);
      const photos = parseInt(params.photos || '0', 10);
      setProtectionMeta({ duration, video, audio, gps, photos });
      const autoContent = scene
        ? `【保护模式记录】${scene}（保护时长${Math.floor(duration / 60)}分${duration % 60}秒）`
        : `【保护模式记录】全程保护时长${Math.floor(duration / 60)}分${duration % 60}秒，已自动存证。`;
      setContent(autoContent);
    }
  }, []);

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
      const mgr = manager as any;
      if (mgr && typeof mgr.catch === 'function') {
        mgr.catch(() => { /* H5 不支持录音 */ });
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

    // 监听从保护记录选择回传
    const onEvidencePick = (e: any) => {
      const record = e.detail;
      if (!record?.files) return;
      record.files.forEach((f: any) => {
        if (f.type === 'photo' && f.dataUrl) {
          setImages(prev => prev.length < 9 ? [...prev, f.dataUrl] : prev);
        } else if (f.type === 'video' && f.dataUrl) {
          setVideoPath(f.dataUrl);
          setVideoThumb(f.thumbnail || f.dataUrl);
        } else if (f.type === 'audio' && f.dataUrl) {
          // 音频以文件形式暂存到图片列表（显示为占位）
          setImages(prev => prev.length < 9 ? [...prev, f.dataUrl] : prev);
        }
      });
      // 如果记录有描述，追加到内容
      if (record.description && !content) {
        setContent(record.description);
      }
      Taro.showToast({ title: '已添加保护记录的文件', icon: 'success' });
    };
    window.addEventListener('evidencePick', onEvidencePick);

    return () => {
      window.removeEventListener('evidencePick', onEvidencePick);
      stopAutoSave();
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
      }
      // 清理录音回调
      if (recorderManagerRef.current) {
        try {
          const rm = recorderManagerRef.current as any;
          if (typeof rm.offStop === 'function') {
            rm.offStop();
          }
          if (typeof rm.offError === 'function') {
            rm.offError();
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
    isAnonymous,
  }), [content, recordType, selectedTags, images, videoPath, videoThumb, voicePath, voiceText, visibleScope, selectedCircleId, isAnonymous]);

  // 启动草稿自动保存（内容有变化时）
  useEffect(() => {
    if (phase !== 'input') return;
    startAutoSave(getFormData);
    return () => {
      stopAutoSave();
    };
  }, [phase, getFormData, startAutoSave, stopAutoSave]);

  // 风险检测：内容变化时实时分析
  useEffect(() => {
    if (phase !== 'input') {
      setRiskScenario(null);
      return;
    }
    const scenario = detectRisk(content);
    setRiskScenario(scenario);
  }, [content, phase]);

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

  // 选择任意文件（文档、音频等）
  const handleChooseFile = () => {
    Taro.chooseMessageFile({
      count: 5,
      type: 'file',
      success: (res) => {
        res.tempFiles.forEach(file => {
          // 如果是图片，加入图片列表
          if (/^image\//.test(file.type || '')) {
            setImages(prev => prev.length < 9 ? [...prev, file.path] : prev);
          }
          // 如果是视频且还没选视频
          else if (/^video\//.test(file.type || '') && !videoPath) {
            setVideoPath(file.path);
            setVideoThumb(file.path);
          }
          // 其他文件：暂存为图片位置的占位（后续上传时处理）
          else {
            // 非图片视频文件，显示在图片区域用文件名占位
            // Taro H5 环境下直接用 path
            setImages(prev => {
              if (prev.length >= 9) return prev;
              return [...prev, file.path];
            });
          }
        });
      },
    });
  };

  // 从善行保护记录选择
  const handlePickFromHistory = () => {
    Taro.navigateTo({ url: '/pages/evidence-history/index?mode=pick' });
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
      // 演示模式下跳过内容审核，直接通过
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
        // 演示模式下，needs_modification 也放行（仅 log 警告）
        console.warn('[Record] 演示模式：内容审核建议修改但已放行', moderationResult.reason);
      }

      const credibilityResult = await evaluateCredibility(content || voiceText || '记录一件善事');
      // 信誉评估结果不阻断发布，仅做后端标记

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
        addFortune(fortuneResult.total, '善行记录', content.slice(0, 20), visibleScope === 'circle' ? selectedCircleId : undefined);
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
        userName: isAnonymous ? '善行使者' : userName,
        userAvatar: isAnonymous ? '' : userAvatar,
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
        isAnonymous,
      };
      addPublishedKindness(newKindness);

      // 如果这条记录来自保护模式，清除已保存的保护会话
      if (fromSource === 'protection') {
        clearLastClosedSession();
      }

      // 创建善行存证（确保后续 SOS 触发时能找到存证）
      try {
        const protectionStore = useProtectionStore.getState();
        const gps = await getCurrentGPS();
        const mediaAssets: MediaAsset[] = images.map((url) => ({
          type: 'image',
          url,
          createdAt: new Date().toISOString(),
        }));
        if (videoPath) {
          mediaAssets.push({
            type: 'video' as const,
            url: videoPath,
            createdAt: new Date().toISOString(),
          });
        }
        if (voicePath) {
          mediaAssets.push({
            type: 'audio' as const,
            url: voicePath,
            createdAt: new Date().toISOString(),
          });
        }
        protectionStore.createEvidence(newKindness.id, content || voiceText || '', gps, mediaAssets);
      } catch (evidenceErr) {
        console.warn('[Record] Failed to create evidence:', evidenceErr);
      }

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
      setShowConfetti(true);
      // 3s后隐藏彩纸
      setTimeout(() => setShowConfetti(false), 3500);
      runFeedbackSequence(fortuneResult.total);

      // 徽章检查
      try {
        const badgeStore = useBadgeStore.getState();
        const fs = useFortuneStore.getState();
        const cs = useCircleStore.getState();
        const uid = userInfo?.id || 'currentUser';
        const userCircleCount = cs.circles.filter(c =>
          c.members.some(m => m.userId === uid) || c.adminId === uid
        ).length;
        const hour = new Date().getHours();
        const isNight = hour >= 22 || hour < 6;
        badgeStore.checkAndUnlock({
          totalKindness: publishedList.length + 1,
          streakDays: fs.streak.currentStreak,
          fortune: fs.totalFortune + fortuneResult.total,
          circleCount: userCircleCount,
          commentCount: 0,
          likeCount: 0,
          hasLocationKindness: !!userInfo?.region,
          hasAnonymousKindness: isAnonymous,
          hasNightKindness: isNight,
          completedInspirations: 0,
        });
      } catch {}

      // 等待 AI 卡片出现后再开始流式输出（仪式关闭时立即开始）
      const streamTimer = setTimeout(async () => {
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
      feedbackTimersRef.current.push(streamTimer);

      // 任务4：检查里程碑触发（善行数+1 后检查）
      if (recordType === 'self') {
        // 累计善行数 = 总福气 / 平均每件 ~ 估算，更准确应记录次数
        // 这里用 dailyStats.count + transactions 中 earn 类型数估算
        // 简化：用 totalFortune + fortuneResult.total 作为累计善行数指标
        // 实际应使用专门的计数器，这里用 transactions 长度近似
        const milestoneTimer = setTimeout(() => {
          checkAndTrigger(
            useFortuneStore.getState().transactions.filter(t => t.type === 'earn').length,
            useFortuneStore.getState().streak.currentStreak
          );
        }, 2000);
        feedbackTimersRef.current.push(milestoneTimer);
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
    clearCurrent();
    Taro.switchTab({
      url: '/pages/home/index'
    });
  };

  const handleShareToCircle = () => {
    Taro.navigateTo({
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
      {/* 任务1：分享海报组件 */}
      <SharePoster
        visible={showSharePoster}
        content={content || voiceText || ''}
        aiQuote={aiPersonaName ? `${aiPersonaName}：「${aiContent.slice(0, 60)}」` : (aiResponses[0]?.content?.slice(0, 60) ? `「${aiResponses[0].content.slice(0, 60)}」` : '温暖如你，世界因你而美好 ✨')}
        authorName={userInfo?.name || '善行使者'}
        kindnessId={`kindness_${Date.now()}`}
        tag={selectedTags[0] || ''}
        fortuneValue={fortune}
        onClose={() => setShowSharePoster(false)}
      />

      {phase === 'input' && (
        <>
          {/* 朋友圈极简顶栏 */}
          <View className={styles.wxHeader}>
            <Text className={styles.wxCancel} onClick={handleBack}>取消</Text>
            <View className={styles.wxPublish} onClick={handleSubmit}>
              <Text className={styles.wxPublishText}>发表</Text>
            </View>
          </View>

          {/* 直接输入 — 像朋友圈一样 */}
          <Textarea
            className={styles.wxTextarea}
            placeholder='记录下这个温暖的瞬间...'
            value={content}
            onInput={(e) => setContent(e.detail.value)}
            maxlength={500}
            showConfirmBar={false}
            autoHeight
          />

          {/* 图片九宫格 + 添加按钮 */}
          <View className={styles.wxImages}>
            {images.map((img, index) => (
              <View key={`img-${index}`} className={styles.wxImageWrap}>
                <Image src={img} className={styles.wxImage} mode="aspectFill" />
                <View className={styles.wxImageDel} onClick={() => handleDeleteImage(index)}>
                  <Text className={styles.wxImageDelIcon}>✕</Text>
                </View>
              </View>
            ))}
            {images.length < 9 && !videoPath && (
              <View className={styles.wxImageAdd} onClick={() => setShowFilePicker(true)}>
                <Text className={styles.wxImageAddIcon}>+</Text>
              </View>
            )}
            {videoPath && (
              <View className={styles.wxImageWrap}>
                <Image src={videoThumb} className={styles.wxImage} mode="aspectFill" />
                <View className={styles.wxVideoBadge}><Text className={styles.wxVideoBadgeText}>▶ 视频</Text></View>
                <View className={styles.wxImageDel} onClick={handleDeleteVideo}>
                  <Text className={styles.wxImageDelIcon}>✕</Text>
                </View>
              </View>
            )}
          </View>

          {/* 附件选择面板 — 从保护记录选择 */}
          {showFilePicker && (
            <View className={styles.wxPickerOverlay} onClick={() => setShowFilePicker(false)}>
              <View className={styles.wxPickerSheet} onClick={(e) => e.stopPropagation()}>
                <View className={styles.wxPickerHeader}>
                  <Text className={styles.wxPickerTitle}>添加附件</Text>
                  <Text className={styles.wxPickerClose} onClick={() => setShowFilePicker(false)}>✕</Text>
                </View>
                <View className={styles.wxPickerOptions}>
                  <View className={styles.wxPickerOption} onClick={() => { setShowFilePicker(false); handleChooseImage(); }}>
                    <Text className={styles.wxPickerOptionIcon}>📷</Text>
                    <View className={styles.wxPickerOptionBody}>
                      <Text className={styles.wxPickerOptionLabel}>拍照 / 从相册选择</Text>
                      <Text className={styles.wxPickerOptionHint}>照片，最多9张</Text>
                    </View>
                  </View>
                  <View className={styles.wxPickerOption} onClick={() => { setShowFilePicker(false); handleChooseVideo(); }}>
                    <Text className={styles.wxPickerOptionIcon}>🎬</Text>
                    <View className={styles.wxPickerOptionBody}>
                      <Text className={styles.wxPickerOptionLabel}>拍摄 / 选择视频</Text>
                      <Text className={styles.wxPickerOptionHint}>最长{VIDEO_MAX_DURATION}秒</Text>
                    </View>
                  </View>
                  <View className={styles.wxPickerOption} onClick={() => { setShowFilePicker(false); handleChooseFile(); }}>
                    <Text className={styles.wxPickerOptionIcon}>📎</Text>
                    <View className={styles.wxPickerOptionBody}>
                      <Text className={styles.wxPickerOptionLabel}>选择任意文件</Text>
                      <Text className={styles.wxPickerOptionHint}>文档、音频等</Text>
                    </View>
                  </View>
                  <View className={styles.wxPickerOption} onClick={() => { setShowFilePicker(false); handlePickFromHistory(); }}>
                    <Text className={styles.wxPickerOptionIcon}>🛡️</Text>
                    <View className={styles.wxPickerOptionBody}>
                      <Text className={styles.wxPickerOptionLabel}>从善行保护记录选择</Text>
                      <Text className={styles.wxPickerOptionHint}>之前保护/见证模式保存的音视频</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* 风险提示 — 仅在有风险时一行显示 */}
          {riskScenario && (
            <View className={styles.wxRisk} style={{ borderLeftColor: riskScenario.color }}>
              <Text className={styles.wxRiskText}>{riskScenario.icon} {riskScenario.category}</Text>
              <Text className={styles.wxRiskLink} onClick={() => Taro.navigateTo({ url: '/pages/protection-mode/index' })}>开启保护 →</Text>
            </View>
          )}

          {/* 更多设置 — 折叠列表，像朋友圈的"所在位置" */}
          <View className={styles.wxSettings}>
            <View className={styles.wxSettingRow}>
              <Text className={styles.wxSettingIcon}>📍</Text>
              <Text className={styles.wxSettingLabel}>{userInfo?.region || '当前位置'}</Text>
            </View>

            <View className={styles.wxSettingRow} onClick={() => setShowTagPicker(!showTagPicker)}>
              <Text className={styles.wxSettingIcon}>🏷️</Text>
              <Text className={styles.wxSettingLabel}>
                {selectedTags.length > 0 ? selectedTags.map(t => `#${t}`).join(' ') : '添加标签'}
              </Text>
              <Text className={styles.wxSettingArrow}>{showTagPicker ? '▲' : '›'}</Text>
            </View>

            {showTagPicker && (
              <View className={styles.wxTagPicker}>
                {tags.map((tag) => (
                  <View
                    key={tag}
                    className={`${styles.wxTag} ${selectedTags.includes(tag) ? styles.wxTagActive : ''}`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    <Text className={styles.wxTagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View className={styles.wxSettingRow} onClick={() => setShowScopePicker(!showScopePicker)}>
              <Text className={styles.wxSettingIcon}>👁️</Text>
              <Text className={styles.wxSettingLabel}>
                {visibleScope === 'private' ? '仅自己' : visibleScope === 'followers' ? '互相关注' : visibleScope === 'circle' ? '团体可见' : '所有人'}
                {isAnonymous && ' · 匿名'}
              </Text>
              <Text className={styles.wxSettingArrow}>{showScopePicker ? '▲' : '›'}</Text>
            </View>

            {showScopePicker && (
              <View className={styles.wxScopePicker}>
                {(!isMinor ? [{k:'public',l:'所有人'}, {k:'followers',l:'互相关注'}] : [{k:'followers',l:'互相关注'}] as const)
                  .concat(userCircles.length > 0 ? [{k:'circle' as const, l:'团体可见'}] : [])
                  .concat([{k:'private' as const, l:'仅自己'}])
                  .map(s => (
                    <View key={s.k} className={`${styles.wxScopeOption} ${visibleScope === s.k ? styles.wxScopeOptionActive : ''}`}
                      onClick={() => { setVisibleScope(s.k as any); if (s.k !== 'circle') setShowScopePicker(false); }}>
                      <Text className={styles.wxScopeOptionText}>{s.l}</Text>
                    </View>
                  ))}
                <View className={styles.wxAnonRow}>
                  <Text className={styles.wxAnonLabel}>🛡️ 匿名行善</Text>
                  <View className={`${styles.wxAnonSwitch} ${isAnonymous ? styles.wxAnonSwitchOn : ''}`}
                    onClick={() => setIsAnonymous(!isAnonymous)}>
                    <View className={styles.wxAnonSwitchThumb} />
                  </View>
                </View>
                {visibleScope === 'circle' && userCircles.length > 0 && (
                  <View className={styles.wxCircleList}>
                    {userCircles.map(c => (
                      <View key={c.id} className={`${styles.wxCircleOption} ${selectedCircleId === c.id ? styles.wxCircleOptionActive : ''}`}
                        onClick={() => { setSelectedCircleId(c.id); setShowScopePicker(false); }}>
                        <Text className={styles.wxCircleOptionText}>{c.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View className={styles.wxSettingRow}>
              <Text className={styles.wxSettingIcon}>{recordType === 'self' ? '✨' : '👀'}</Text>
              <Text className={styles.wxSettingLabel} onClick={() => setRecordType(recordType === 'self' ? 'witness' : 'self')}>
                {recordType === 'self' ? '记录我做的好事' : '记录我看到的好事'}
              </Text>
              <Text className={styles.wxSettingArrow}>切换</Text>
            </View>
          </View>

          {/* 快速模板 — 仅在空白时横滑显示 */}
          {content.trim().length === 0 && images.length === 0 && (
            <View className={styles.wxQuickHint}>
              <Text className={styles.wxQuickHintText}>💡 快速记录</Text>
              <View className={styles.wxQuickScroll}>
                {QUICK_TEMPLATES_DISPLAY.map((tmpl) => (
                  <View key={tmpl.id} className={styles.wxQuickItem}
                    onClick={() => { setContent(tmpl.content); setSelectedTags(tmpl.tags); }}>
                    <Text className={styles.wxQuickEmoji}>{tmpl.emoji}</Text>
                    <Text className={styles.wxQuickLabel}>{tmpl.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {drafts.length > 0 && (
            <View className={styles.wxDraftBar} onClick={() => handleEditDraft(drafts[0].id)}>
              <Text className={styles.wxDraftText}>📝 {drafts.length}个草稿 · {drafts[0].content.slice(0, 20) || '[空草稿]'}</Text>
            </View>
          )}

          {showAnonymousTip && (
            <View className={styles.wxAnonymousTip}>
              <Text className={styles.wxAnonymousTipText}>💡 首次善行已开启匿名，让善意无负担</Text>
            </View>
          )}
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
          {/* 庆祝彩纸 */}
          {showConfetti && (
            <View className={styles.confettiContainer}>
              {['✨','🌟','💫','🎉','🎊','💖','⭐','🌸','🦋','🍀'].map((emoji, i) => (
                <Text
                  key={i}
                  className={styles.confettiPiece}
                  style={{
                    left: `${10 + (i % 8) * 10}%`,
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: `${2.5 + Math.random() * 1.5}s`,
                  }}
                >
                  {emoji}
                </Text>
              ))}
            </View>
          )}

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
                  : '见证善意，传递温暖'}
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
              {aiResponses.map((resp) => (
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
              <View className={styles.actionBtn} onClick={() => setShowSharePoster(true)}>
                <Text className={styles.actionText}>分享海报</Text>
              </View>
              <View className={styles.actionBtn} onClick={handleShareToCircle}>
                <Text className={styles.actionText}>分享到广场</Text>
              </View>
              <View className={`${styles.actionBtn} ${styles.actionBtnSecondary}`} onClick={handleBack}>
                <Text className={styles.actionText}>返回首页</Text>
              </View>
            </View>
          )}

          {/* 先贤随机语录 */}
          {feedbackStep === 'done' && (
            <View className={styles.sageQuoteCard}>
              <Text className={styles.sageQuotePersona}>📜 {randomQuote.name}</Text>
              <Text className={styles.sageQuoteText}>「{randomQuote.quote}」</Text>
            </View>
          )}
        </View>
      )}
    </View>
    </View>
  );
};

export default RecordPage;
