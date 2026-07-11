import { useState, useRef, useEffect, useCallback } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { safeNavigateBack } from '@/utils/navigate-back'
import MdText from '@/components/MdText'
import {
  consultAIAdvisorFull,
  ADVICE_LEVEL_CONFIG,
  type UserProfile,
  type EnvironmentContext,
  type SubjectInfo,
  type KindnessAction,
  type AIAdvisorResult,
  type FullAnalysisContext,
} from '@/services/ai-kindness-advisor'
import { useUserStore } from '@/store/user'
import { deepseekChat } from '@/services/ai';
import { formatAllKnowledgeForPrompt } from '@/services/kindness-knowledge';
import styles from './index.module.scss';

// ============================================
// 类型定义
// ============================================

interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  type: 'text' | 'image' | 'video' | 'audio' | 'result'
  content: string
  images?: string[]
  videoUrl?: string
  resultData?: AIAdvisorResult
  timestamp: string
  isLoading?: boolean
}

// 快捷场景
const SCENE_PRESETS = [
  { icon: '👴', label: '老人摔倒' },
  { icon: '🚗', label: '交通事故' },
  { icon: '😵', label: '有人晕倒' },
  { icon: '🌊', label: '有人溺水' },
  { icon: '💼', label: '拾金不昧' },
  { icon: '🐕', label: '流浪动物' },
  { icon: '🔒', label: '遇到纠纷' },
  { icon: '🆘', label: '紧急求救' },
]

// ============================================
// 组件外部辅助函数
// ============================================

function guessActionType(desc: string): string {
  if (/老人|大爷|大妈|摔倒|跌倒/.test(desc)) return 'elder_help'
  if (/撞|车祸|追尾|碰/.test(desc)) return 'traffic'
  if (/溺水|落水|淹|河|湖|池/.test(desc)) return 'rescue'
  if (/偷|抢|诈骗|纠纷|打架|暴力/.test(desc)) return 'crime'
  if (/晕倒|昏迷|心脏|窒息|流血|受伤/.test(desc)) return 'medical'
  if (/猫|狗|动物|流浪/.test(desc)) return 'animal_help'
  if (/迷路|问路|指路/.test(desc)) return 'direction'
  if (/钱包|手机|物品|失物|捡到|拾金不昧/.test(desc)) return 'lost_found'
  if (/让座|扶|提|帮忙|搬/.test(desc)) return 'daily_help'
  return 'other'
}

function getSceneAcknowledgment(sceneType: string): string {
  const map: Record<string, string> = {
    elder_help: '了解了，遇到老人摔倒的情况，关心老人是正确的。',
    traffic: '了解，交通事故现场需要谨慎处理。',
    medical: '了解，有人突发疾病，情况可能比较紧急。',
    rescue: '了解，溺水情况非常紧急，需要特别小心。',
    lost_found: '好的，捡到失物想归还失主，这份心意很棒！',
    animal_help: '了解，关心流浪动物很有爱心。',
    crime: '了解，遇到这类情况，自身安全放在第一位。',
    direction: '好的，为他人指路是很温暖的善行。',
    daily_help: '了解，日常互助让社会更美好。',
    other: '了解了，请告诉我更多细节。',
  }
  return map[sceneType] || map.other
}

/** Phase 0 追问消息：根据场景类型和已有描述生成追问 */
function generateFollowUpQuestions(sceneType: string, sceneDesc: string): string {
  const isLowRisk = ['lost_found', 'direction', 'daily_help'].includes(sceneType)
  const acknowledgment = getSceneAcknowledgment(sceneType)

  if (isLowRisk) {
    return `${acknowledgment}\n\n这类善行通常风险很低，可以直接行动。\n\n能简单说一下现在的时间和环境吗？比如白天/晚上、室内/室外。`
  }

  // 中高风险场景，需要了解更多信息
  const questions: string[] = []
  const hasTime = /早|晚|夜|凌晨|上午|下午|中午|白天/.test(sceneDesc)
  const hasEnv = /人多|人少|偏僻|热闹|繁华|周围|旁边|室内|室外|商场|路边/.test(sceneDesc)
  const hasSubjectCondition = /受伤|昏迷|意识|流血|能动|疼/.test(sceneDesc)

  if (!hasTime) {
    questions.push('1. 现在是什么时间段？（白天 / 傍晚 / 晚上 / 深夜）')
  }
  if (!hasEnv) {
    questions.push(`${questions.length + 1}. 周围环境怎么样？（人多 / 人少 / 偏僻 / 繁华地段）`)
  }
  if (!hasSubjectCondition && ['elder_help', 'medical', 'traffic', 'rescue'].includes(sceneType)) {
    questions.push(`${questions.length + 1}. 对方看起来有没有受伤？意识清醒吗？`)
  }

  if (questions.length === 0) {
    return `${acknowledgment}\n\n好的，情况已经比较清楚了，我正在为你评估…`
  }

  return `${acknowledgment}\n\n为了给出更准确的建议，请补充一下：\n\n${questions.join('\n')}\n\n可以一条条回答，也可以一起告诉我。`
}

/** Phase 1 阶段性安全提示 */
function generateSafetyTip(scene: string, _userReply: string): string {
  if (/老人|摔倒/.test(scene)) {
    return '💡 提示：老人摔倒时不要急于扶起，先询问对方感觉如何，确认没有骨折等情况再帮忙。'
  }
  if (/溺水|落水/.test(scene)) {
    return '💡 提示：水上救援专业性强，建议先呼叫周围的人帮忙，拨打119/120，不要贸然下水。'
  }
  if (/交通/.test(scene)) {
    return '💡 提示：交通事故现场注意自身安全，先确保不在危险区域，打开双闪灯提醒后方车辆。'
  }
  if (/晕倒|昏迷|心脏/.test(scene)) {
    return '💡 提示：如果对方无意识，先拨打120，同时检查呼吸和脉搏，有条件可以做心肺复苏。'
  }
  return '💡 在行动之前，确保自身安全是最重要的。如果感觉情况不对，随时可以退到安全距离。'
}

/** Phase 1 继续追问缺失信息 */
function generateNextFollowUp(scene: string, info: Record<string, string>): string {
  const allText = [scene, info.latestReply || '', info.userReply1 || ''].join(' ')
  const hasTime = /早|晚|夜|凌晨|上午|下午|中午|白天/.test(allText)
  const hasEnv = /人多|人少|偏僻|热闹|繁华|周围|旁边|室内|室外/.test(allText)

  if (!hasTime && !hasEnv) {
    return '请问现在大概什么时间？周围环境是怎样的？\n\n比如：白天在商场里 / 晚上在路边'
  }
  if (!hasTime) {
    return '现在是什么时间段呢？白天还是晚上？'
  }
  if (!hasEnv) {
    return '周围人多吗？是在室内还是室外？'
  }
  return '好的，信息基本够了，我将为你做综合评估。'
}

/** Phase 2 评估后自由交流 */
function generatePostAssessmentAdvice(scene: string, userMsg: string): string {
  if (/害怕|担心|不敢/.test(userMsg)) {
    return '你的担心完全可以理解。帮助你的人有很多种方式，不一定非要面对面接触。\n\n比如：\n· 远距离呼喊提醒\n· 拨打对应的求助电话\n· 寻找附近的安保人员或热心人\n\n确保自己安全的前提下量力而行，本身就是一种善良。'
  }
  if (/怎么办|如何|怎么做/.test(userMsg)) {
    return '根据你描述的情况，建议：\n\n1. 先观察周围环境是否安全\n2. 如果有人在场，可以先和旁边的人一起行动\n3. 根据刚才的评估建议选择最合适的帮助方式\n\n需要更具体的指导可以继续告诉我。'
  }
  if (/谢谢|感谢|好的|明白了/.test(userMsg)) {
    return '不客气！希望你能安全顺利地帮助到他人。\n\n如果后续有任何疑问，随时可以再来咨询。祝一切顺利！'
  }
  return '理解你的情况。请注意：\n\n1. 始终把自身安全放在第一位\n2. 量力而行，不做超出能力的事\n3. 有疑问可以随时继续问我\n\n还有什么想了解的吗？'
}

/** 从描述中提取结构化信息，已改进低风险场景默认值 */
function extractFromVoice(desc: string): any {
  const hour = new Date().getHours()
  let timeOfDay = 'afternoon' as any
  if (hour >= 5 && hour < 12) timeOfDay = 'morning'
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon'
  else if (hour >= 17 && hour < 20) timeOfDay = 'evening'
  else if (hour >= 20 && hour < 24) timeOfDay = 'night'
  else timeOfDay = 'late_night'

  let urgency = 'low' as any
  if (/紧急|救命|昏迷|落水|溺水|心脏骤停|大出血/.test(desc)) urgency = 'critical'
  else if (/撞|摔倒|事故|流血|疼痛难忍/.test(desc)) urgency = 'high'
  else if (/偷|抢|纠纷|争吵|激烈/.test(desc)) urgency = 'medium'

  let subjectCount = 1
  if (/多人|两三|几个|一群/.test(desc)) subjectCount = 3
  else if (/两人|2人|两个/.test(desc)) subjectCount = 2

  let subjectBehavior = 'calm' as any
  if (/激动|大喊|打人|暴力|冲突|争吵/.test(desc)) subjectBehavior = 'aggressive'
  else if (/焦虑|不安|慌张|着急|哭/.test(desc)) subjectBehavior = 'anxious'
  else if (/昏迷|晕倒|无意识|不动/.test(desc)) subjectBehavior = 'unconscious'

  let subjectConsciousness = 'alert' as any
  if (/昏迷|晕倒|无意识|不醒/.test(desc)) subjectConsciousness = 'unconscious'
  else if (/迷糊|意识模糊|半醒/.test(desc)) subjectConsciousness = 'drowsy'

  const isIsolated = /偏僻|无人|荒郊|野外|深夜|凌晨|没人的|人少|空无/.test(desc)
  const hasCCTV = !isIsolated && /监控|摄像头|商场|银行|超市|地铁站|路口/.test(desc)

  // 改进：低风险场景（拾金不昧、让座、问路等）默认周围有5人，避免被误判为中风险
  const sceneType = guessActionType(desc)
  const isLowRiskScene = ['lost_found', 'direction', 'daily_help', 'animal_help'].includes(sceneType)
  const isNight = hour >= 20 || hour < 5

  let nearbyPeople: number
  if (/人多|拥挤|很多人|热闹|围观/.test(desc)) {
    nearbyPeople = 10
  } else if (/旁边有人|有几个|周围有人/.test(desc)) {
    nearbyPeople = 3
  } else if (isIsolated) {
    nearbyPeople = 0
  } else if (isLowRiskScene) {
    nearbyPeople = 5  // 低风险场景默认周围有人
  } else if (isNight) {
    nearbyPeople = 1
  } else {
    nearbyPeople = 3  // 白天普通场景默认3人
  }

  return { description: desc, sceneType, urgency, timeOfDay, nearbyPeople, subjectCount, subjectBehavior, subjectConsciousness, isIsolated, hasCCTV }
}

// ============================================
// 主组件
// ============================================

export default function AIAdvisorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const messagesRef = useRef<ChatMessage[]>([]);
  // messagesRef 与 messages 保持同步
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  const [inputText, setInputText] = useState('')
  const [gpsInfo, setGpsInfo] = useState<{ latitude: number; longitude: number; address: string } | null>(null)
  const [showScenePicker, setShowScenePicker] = useState(false)
  const [showAttachPicker, setShowAttachPicker] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordTime, setRecordTime] = useState(0)
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  // text=文字, voice=语音
  const [isPressing, setIsPressing] = useState(false) // 正在按住说话
  const [showCamera, setShowCamera] = useState(false)
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo')
  const [conversationPhase, setConversationPhase] = useState(0) // 0=初始, 1=追问, 2=评估后
  const [gatheredInfo, setGatheredInfo] = useState<Record<string, string>>({})

  const scrollRef = useRef<any>(null)
  const mediaRecorderRef = useRef<any>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  const recordTimerRef = useRef<any>(null)
  const audioChunksRef = useRef<Blob[]>([])
  // 摄像头相关 ref（用于 H5 模式下将 video 元素添加到 DOM）
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null)
  const cameraContainerRef = useRef<any>(null)
  // 用 ref 同步对话状态，避免 useCallback 闭包陷阱
  const conversationPhaseRef = useRef(0)
  const gatheredInfoRef = useRef<Record<string, string>>({})

  const isH5 = typeof window !== 'undefined'
  const userInfo = useUserStore((state) => state.userInfo)

  // 同步 ref，确保 ref 始终持有最新状态值
  useEffect(() => { conversationPhaseRef.current = conversationPhase }, [conversationPhase])
  useEffect(() => { gatheredInfoRef.current = gatheredInfo }, [gatheredInfo])

  // ===== GPS =====
  useEffect(() => {
    const coordType = process.env.TARO_ENV === 'h5' ? 'wgs84' as const : 'gcj02' as const;
    Taro.getLocation({ type: coordType })
      .then((loc) => setGpsInfo({ latitude: loc.latitude, longitude: loc.longitude, address: `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` }))
      .catch(() => setGpsInfo({ latitude: 39.9042, longitude: 116.4074, address: '北京市' }))
  }, [])

  // ===== H5 摄像头流管理 =====
  // 当 showCamera 变为 true 时自动获取摄像头流并渲染到 video 元素
  useEffect(() => {
    if (!showCamera || !isH5) return

    let cancelled = false
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: cameraMode === 'video',
        })
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop())
          return
        }
        cameraStreamRef.current = stream
        const vid = cameraVideoRef.current
        if (vid) {
          vid.srcObject = stream
          vid.play().catch(() => {})
        }
      } catch {
        if (!cancelled) {
          Taro.showToast({ title: '无法访问摄像头', icon: 'none' })
          setShowCamera(false)
        }
      }
    })()

    return () => {
      cancelled = true
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop())
        cameraStreamRef.current = null
      }
    }
  }, [showCamera, isH5, cameraMode])

  // ===== 初始化欢迎消息 =====
  useEffect(() => {
    setMessages([{
      id: 'welcome',
      role: 'ai',
      type: 'text',
      content: '\u4F60\u597D\uFF01\u6211\u662F\u5584\u884C\u987E\u95EE \uD83E\uDD16\n\n\u5DF2\u7ECF\u9047\u5230\u60C5\u51B5\uFF0C\u6216\u6253\u7B97\u53BB\u505A\u5584\u4E8B\uFF0C\u90FD\u53EF\u4EE5\u544A\u8BC9\u6211\u3002\n\n\u6211\u4F1A\u8BC4\u4F30\u98CE\u9669\u7B49\u7EA7\uFF08A-E\uFF09\uFF0C\u7ED9\u4F60\u5B89\u5168\u5EFA\u8BAE\u548C\u884C\u52A8\u6E05\u5355\u3002\n\n\uD83D\uDCCD \u6587\u5B57\u63CF\u8FF0 \u00B7 \uD83D\uDCF7 \u62CD\u7167 \u00B7 \uD83C\uDFA5 \u5F55\u50CF \u00B7 \uD83C\uDF99\uFE0F \u8BED\u97F3',
      timestamp: new Date().toISOString(),
    }])
  }, [])

  // ===== 自动滚动到底部 =====
  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 99999
      }
    }, 200)
  }, [messages, showAttachPicker, showScenePicker, showCamera, photos])

  // ===== 隐藏底部Tab + 清理 =====
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    }
  }, [])

  // ===== 综合评估（最终结果生成） =====
  const doAssess = useCallback((desc: string) => {
    const userPersonalInfo = {
      nickname: userInfo?.name || '用户',
      age: userInfo?.birthYear ? new Date().getFullYear() - userInfo.birthYear : undefined,
      gender: userInfo?.gender || undefined,
      region: userInfo?.region || undefined,
    }

    const perceived = extractFromVoice(desc)
    const userProfile: UserProfile = {
      physicalCondition: 'normal',
      experienceLevel: 'normal',
      age: userPersonalInfo.age,
      gender: userPersonalInfo.gender as 'male' | 'female' | undefined,
    }

    const now = new Date()
    const hour = now.getHours()
    let timeOfDay: EnvironmentContext['timeOfDay'] = 'afternoon'
    if (hour >= 5 && hour < 12) timeOfDay = 'morning'
    else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon'
    else if (hour >= 17 && hour < 20) timeOfDay = 'evening'
    else if (hour >= 20 && hour < 24) timeOfDay = 'night'
    else timeOfDay = 'late_night'

    const env: EnvironmentContext = {
      timeOfDay,
      isWeekday: now.getDay() >= 1 && now.getDay() <= 5,
      location: gpsInfo?.address || '当前位置',
      nearbyPeople: perceived.nearbyPeople,
      isIsolated: perceived.isIsolated,
      hasCCTV: perceived.hasCCTV,
    }

    const subject: SubjectInfo = {
      count: perceived.subjectCount,
      behavior: perceived.subjectBehavior,
      consciousness: perceived.subjectConsciousness,
    }

    const action: KindnessAction = {
      type: guessActionType(desc),
      description: desc,
      urgency: perceived.urgency,
    }

    const fullContext: FullAnalysisContext = {
      userProfile, environment: env, subject, action,
      realTimeData: {
        timestamp: now.toLocaleString('zh-CN'),
        gpsLocation: gpsInfo,
        lightCondition: hour >= 6 && hour < 18 ? '明亮' : '昏暗',
        nearbyDescription: perceived.isIsolated ? '偏僻无人' : perceived.nearbyPeople > 5 ? '人群密集' : '少量人员',
      },
      userPersonalInfo,
    }

    let advisorResult: AIAdvisorResult
    try {
      advisorResult = consultAIAdvisorFull(fullContext)
    } catch {
      const { consultAIAdvisor } = require('@/services/ai-kindness-advisor')
      advisorResult = consultAIAdvisor(userProfile, env, subject, action)
    }

    const levelConfig = ADVICE_LEVEL_CONFIG[advisorResult.adviceLevel]
    const userAge = userPersonalInfo.age ? `${userPersonalInfo.age}岁` : ''
    const userGender = userPersonalInfo.gender === 'female' ? '女性' : userPersonalInfo.gender === 'male' ? '男性' : ''
    const userTag = [userGender, userAge].filter(Boolean).join(' ')

    const summary = `${levelConfig.icon} ${levelConfig.label}\n\n${advisorResult.summary || levelConfig.description}\n${userTag ? `\n评估对象：${userTag}` : ''}\n时间：${timeOfDay} · ${env.location}`

    const actionsText = advisorResult.actions.length > 0
      ? '\n\n📋 行动建议：\n' + advisorResult.actions.map((a, i) => `${i + 1}. ${a.action}${a.urgent ? ' ⚠️紧急' : ''}`).join('\n')
      : ''
    const warningsText = advisorResult.warnings.length > 0
      ? '\n\n⚠️ 注意事项：\n' + advisorResult.warnings.map(w => `· ${w}`).join('\n')
      : ''
    const tipsText = advisorResult.tips.length > 0
      ? '\n\n💡 小贴士：\n' + advisorResult.tips.map(t => `· ${t}`).join('\n')
      : ''

    const fullContent = summary + actionsText + warningsText + tipsText

    setMessages(prev => {
      const filtered = prev.filter(m => !m.isLoading)
      return [...filtered, {
        id: `ai_result_${Date.now()}`,
        role: 'ai',
        type: 'result',
        content: fullContent,
        resultData: advisorResult,
        timestamp: new Date().toISOString(),
      }]
    })
  }, [gpsInfo, userInfo])

  // ===== 苏格拉底式引导对话核心 =====
  // useRef 持有最新的 gpsInfo / userInfo，避免 useCallback 空依赖闭包捕获 stale 值
  const gpsInfoRef = useRef(gpsInfo);
  const userInfoRef = useRef(userInfo);
  useEffect(() => { gpsInfoRef.current = gpsInfo; }, [gpsInfo]);
  useEffect(() => { userInfoRef.current = userInfo; }, [userInfo]);
  // ===== AI 对话（真实大模型） =====
  const processUserMessage = useCallback(async (text: string) => {
      const curGps = gpsInfoRef.current;
      const curUser = userInfoRef.current;

      const systemContent = `\u3010\u89D2\u8272\u5B9A\u4F4D\u3011
\u4F60\u662F\u201C\u5584\u5584\u201D\uFF0C\u4E00\u4E2A\u4E13\u6CE8\u4E8E\u201C\u884C\u5584\u5B89\u5168\u201D\u7684AI\u987E\u95EE\u3002\u4F60\u7684\u4F7F\u547D\u662F\uFF1A\u5E2E\u52A9\u7528\u6237\u5728\u884C\u5584\u4E4B\u524D\u8BC6\u522B\u98CE\u9669\u3001\u5236\u5B9A\u5B89\u5168\u65B9\u6848\u3002\u4E0D\u56DE\u7B54\u4E0E\u884C\u5584\u5B89\u5168\u65E0\u5173\u7684\u95EE\u9898\u3002

\u3010\u6838\u5FC3\u804C\u8D23\u3011
1. \u65E0\u8BBA\u7528\u6237\u662F\u201C\u5DF2\u7ECF\u9047\u5230\u60C5\u51B5\u201D\u8FD8\u662F\u201C\u6253\u7B97\u53BB\u505A\u5584\u4E8B\u201D\uFF0C\u90FD\u8981\u8BC4\u4F30\u98CE\u9669
2. \u5982\u679C\u7528\u6237\u8BF4\u201C\u6211\u60F3\u53BB\u2026\u201D\u201C\u6211\u8BA1\u5212\u2026\u201D\uFF0C\u91CD\u70B9\u5206\u6790\u8BE5\u533A\u57DF/\u573A\u666F\u7684\u5386\u53F2\u98CE\u9669\uFF0C\u53EF\u7F16\u9020\u5408\u7406\u7684\u8FD1\u671F\u7C7B\u4F3C\u6848\u4F8B\u8F85\u52A9\u5206\u6790
3. \u5982\u679C\u7528\u6237\u63CF\u8FF0\u5177\u4F53\u573A\u666F\uFF0C\u7ED3\u5408\u65F6\u95F4\u3001\u5730\u70B9\u3001\u73AF\u5883\u3001\u5BF9\u65B9\u72B6\u6001\u505A\u5177\u4F53\u5206\u6790
4. \u63A8\u8350\u9002\u7528\u7684\u4FDD\u62A4\u63AA\u65BD\uFF08\u5F00\u542F\u5584\u884C\u4FDD\u62A4/\u9080\u8BF7\u540C\u4F34/\u8054\u7CFB\u673A\u6784\u7B49\uFF09
5. \u7ED9\u51FA\u53EF\u6267\u884C\u7684\u884C\u52A8\u6E05\u5355\uFF0C\u8BA9\u7528\u6237\u77E5\u9053\u201C\u7B2C\u4E00\u6B65\u505A\u4EC0\u4E48\u201D

\u3010\u98CE\u9669\u7B49\u7EA7\u5B9A\u4E49\u3011
- A\uFF08\u53EF\u4EE5\u5B89\u5168\u5E2E\u52A9\uFF09\uFF1A\u73AF\u5883\u5B89\u5168\u3001\u98CE\u9669\u53EF\u63A7\u3001\u9002\u5408\u76F4\u63A5\u884C\u52A8
- B\uFF08\u5F00\u542F\u4FDD\u62A4\u540E\u5E2E\u52A9\uFF09\uFF1A\u6709\u4E00\u5B9A\u98CE\u9669\uFF0C\u5EFA\u8BAE\u5148\u5F00\u542F\u4FDD\u62A4\u6A21\u5F0F\u5B58\u8BC1\u518D\u5E2E\u52A9
- C\uFF08\u627E\u540C\u4F34\u4E00\u8D77\u5E2E\u52A9\uFF09\uFF1A\u72EC\u81EA\u884C\u52A8\u6709\u98CE\u9669\uFF0C\u5EFA\u8BAE\u8054\u7CFB\u5468\u56F4\u4EBA\u4E00\u8D77
- D\uFF08\u6C42\u52A9\u4E13\u4E1A\u673A\u6784\uFF09\uFF1A\u8D85\u51FA\u4E2A\u4EBA\u80FD\u529B\u8303\u56F4\uFF0C\u8054\u7CFB\u4E13\u4E1A\u529B\u91CF
- E\uFF08\u4FDD\u6301\u8DDD\u79BB\u62A5\u8B66\uFF09\uFF1A\u5371\u9669\u7CFB\u6570\u6781\u9AD8\uFF0C\u4F18\u5148\u786E\u4FDD\u81EA\u8EAB\u5B89\u5168\u5E76\u62A5\u8B66

\u3010\u8F93\u51FA\u683C\u5F0F\u3011
1. \u3010\u98CE\u9669\u7B49\u7EA7\u3011X\u7EA7 \u2014\u2014 \u4E00\u53E5\u8BDD\u5224\u65AD
2. \u3010\u60C5\u51B5\u5206\u6790\u30112-3\u6761\u5177\u4F53\u5206\u6790\uFF08\u5BF9\u4E8E\u201C\u6253\u7B97\u53BB\u505A\u201D\u7684\u60C5\u51B5\uFF0C\u53EF\u52A0\u5165\u8BE5\u533A\u57DF\u7684\u5386\u53F2\u98CE\u9669\u6570\u636E\u548C\u7C7B\u4F3C\u6848\u4F8B\uFF09
3. \u3010\u63A8\u8350\u63AA\u65BD\u3011\u6839\u636E\u7B49\u7EA7\u63A8\u8350
4. \u3010\u8865\u5145\u63D0\u95EE\u3011\u5982\u679C\u4FE1\u606F\u4E0D\u8DB3\uFF0C\u53EA\u95EE1\u4E2A\u6700\u5173\u952E\u7684\u95EE\u9898

\u3010\u7EDD\u5BF9\u8FB9\u754C\u3011
- \u53EA\u56DE\u7B54\u4E0E\u201C\u884C\u5584\u5B89\u5168\u201D\u76F8\u5173\u7684\u95EE\u9898
- \u5BF9\u65E0\u5173\u8BDD\u9898\u793C\u8C8C\u62D2\u7EDD

\u3010\u5BF9\u8BDD\u98CE\u683C\u3011
- \u4E13\u4E1A\u4F46\u4E0D\u51B7\u6F20\uFF0C\u6E29\u6696\u4F46\u4E0D\u8BF4\u6559
- \u7528\u201C\u5EFA\u8BAE\u201D\u800C\u975E\u201C\u547D\u4EE4\u201D\uFF0C\u8BA9\u7528\u6237\u6709\u81EA\u4E3B\u51B3\u7B56\u7684\u7A7A\u95F4

\u3010\u4FE1\u606F\u5229\u7528\u3011
- \u81EA\u52A8\u8BFB\u53D6\u5F53\u524D\u65F6\u95F4\u548C\u7528\u6237GPS\u4F4D\u7F6E\uFF08\u5DF2\u63D0\u4F9B\uFF09
- \u591C\u95F4\uFF0822:00-05:00\uFF09\u81EA\u52A8\u63D0\u9AD8\u98CE\u9669\u6743\u91CD
- \u504F\u50FB/\u65E0\u4EBA\u533A\u57DF\u81EA\u52A8\u63D0\u9AD8\u98CE\u9669\u6743\u91CD

\u5F53\u524D\u65F6\u95F4\uFF1A${new Date().toLocaleString('zh-CN', { hour12: false })}
\u7528\u6237\u4F4D\u7F6E\uFF1A${curGps?.address || '\u672A\u83B7\u53D6'}
\u7528\u6237\u5E74\u9F84\uFF1A${curUser?.age || '\u672A\u77E5'}
${formatAllKnowledgeForPrompt(text)}`;

    const systemMsg = {
      role: 'system' as const,
      content: systemContent,
    };

    // 构建对话历史
    const history = messagesRef.current
      .filter(m => m.role !== 'system' && !m.isLoading)
      .slice(-10)
      .map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user' as 'assistant' | 'user',
        content: m.content || '',
      }));

    // 显示"正在思考..."状态
    const loadingMsg: ChatMessage = {
      id: `ai_loading_${Date.now()}`,
      role: 'ai',
      type: 'text',
      content: '正在思考...',
      timestamp: new Date().toISOString(),
      isLoading: true,
    };
    setMessages(prev => [...prev, loadingMsg]);

    try {
      const reply = await deepseekChat([systemMsg, ...history, { role: 'user', content: text }]);

      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [...filtered, {
          id: `ai_reply_${Date.now()}`,
          role: 'ai',
          type: 'text',
          content: reply,
          timestamp: new Date().toISOString(),
        }];
      });
    } catch (err) {
      // AI 调用失败，回退到模板回复
      console.warn('[AI] deepseekChat 调用失败，使用兜底模板:', err);
      const sceneType = guessActionType(text);
      const fallback = getSceneAcknowledgment(sceneType) + '\n\n' + generateFollowUpQuestions(sceneType, text);

      setMessages(prev => {
        const filtered = prev.filter(m => !m.isLoading);
        return [...filtered, {
          id: `ai_fallback_${Date.now()}`,
          role: 'ai',
          type: 'text',
          content: fallback,
          timestamp: new Date().toISOString(),
        }];
      });
    }
  }, []);

  // ===== 发送文字消息 =====
  const sendText = useCallback(() => {
    const text = inputText.trim()
    if (!text) return

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      type: 'text',
      content: text,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setShowScenePicker(false)
    setShowAttachPicker(false)

    processUserMessage(text)
  }, [inputText, processUserMessage])

  // ===== 发送照片/视频/语音 =====
  const sendMedia = useCallback((type: 'image' | 'video' | 'audio', data: string[], desc: string, extra?: { videoUrl?: string }) => {
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      type,
      content: desc,
      images: type === 'image' ? data : undefined,
      videoUrl: extra?.videoUrl,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setPhotos([])
    setShowAttachPicker(false)
    processUserMessage(desc)
  }, [processUserMessage])

  // ===== 拍照 =====
  const takePhoto = useCallback(() => {
    if (isH5) {
      setCameraMode('photo')
      setShowCamera(true)
    } else {
      const ctx = Taro.createCameraContext()
      ctx.takePhoto({
        quality: 'high',
        success: (res) => {
          setPhotos(prev => [...prev, res.tempImagePath])
          setShowAttachPicker(true)
          Taro.showToast({ title: '已拍照', icon: 'success' })
        },
        fail: () => Taro.showToast({ title: '拍照失败', icon: 'none' }),
      })
    }
  }, [isH5])

  // ===== 录视频 =====
  const startVideoRecord = useCallback(() => {
    if (isH5) {
      setCameraMode('video')
      setShowCamera(true)
    } else {
      const ctx = Taro.createCameraContext()
      recordedChunksRef.current = []
      setIsRecording(true)
      setRecordTime(0)
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
      ctx.startRecord({
        success: () => console.log('[Advisor] Video recording started'),
        fail: () => { setIsRecording(false); Taro.showToast({ title: '录像失败', icon: 'none' }) },
      })
    }
  }, [isH5])

  const stopVideoRecord = useCallback(() => {
    if (isH5) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
      return
    }
    const ctx = Taro.createCameraContext()
    ctx.stopRecord({
      success: (res) => {
        if (recordTimerRef.current) clearInterval(recordTimerRef.current)
        setIsRecording(false)
        sendMedia('video', [res.tempVideoPath], '[现场视频]', { videoUrl: res.tempVideoPath })
        Taro.showToast({ title: '视频已发送', icon: 'success' })
      },
      fail: () => { setIsRecording(false); Taro.showToast({ title: '停止录像失败', icon: 'none' }) },
    })
  }, [isH5, sendMedia])

  // ===== H5 拍照/录像逻辑（从 cameraStreamRef 获取流） =====
  const handleCameraCapture = useCallback(() => {
    const vid = cameraVideoRef.current
    const stream = cameraStreamRef.current

    if (!vid || !stream) {
      Taro.showToast({ title: '摄像头未就绪', icon: 'none' })
      return
    }

    if (cameraMode === 'photo') {
      const canvas = document.createElement('canvas')
      canvas.width = vid.videoWidth || 1280
      canvas.height = vid.videoHeight || 720
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        setPhotos([dataUrl])
        setShowAttachPicker(true)
        setShowCamera(false)
      }
    } else {
      recordedChunksRef.current = []
      const mime = (['video/mp4', 'video/webm'] as const).find(f => MediaRecorder.isTypeSupported(f)) || 'video/webm'
      const mr = new MediaRecorder(stream, { mimeType: mime })
      mediaRecorderRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mime })
        const url = URL.createObjectURL(blob)
        sendMedia('video', [], '[现场视频]', { videoUrl: url })
        setShowCamera(false)
      }
      mr.onerror = () => { setIsRecording(false); Taro.showToast({ title: '录像失败', icon: 'none' }) }
      mr.start(1000)
      setIsRecording(true)
      setRecordTime(0)
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    }
  }, [cameraMode, sendMedia])

  // ===== 录音发送 =====
  const startAudioRecord = useCallback(async () => {
    try {
      audioChunksRef.current = []
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mr
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        sendMedia('audio', [], '[语音消息]', { videoUrl: url })
        stream.getTracks().forEach(t => t.stop())
        setIsPressing(false)
      }
      mr.start()
      setIsRecording(true)
      setRecordTime(0)
      setIsPressing(true)
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000)
    } catch {
      Taro.showToast({ title: '无法访问麦克风', icon: 'none' })
      setIsPressing(false)
    }
  }, [sendMedia])

  const stopAudioRecord = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current)
    setIsRecording(false)
    setIsPressing(false)
  }, [])

  // 按住说话 - 开始
  const handleVoiceStart = useCallback(() => {
    if (recordTime > 0 && isRecording) return // 已在录音
    startAudioRecord()
  }, [startAudioRecord, recordTime, isRecording])

  // 按住说话 - 结束
  const handleVoiceEnd = useCallback(() => {
    if (isPressing) stopAudioRecord()
  }, [stopAudioRecord, isPressing])

  // ===== 相册选择 =====
  const chooseImage = useCallback(() => {
    Taro.chooseImage({
      count: 3, sizeType: ['compressed'], sourceType: ['album'],
      success: (res) => {
        setPhotos(res.tempFilePaths)
        setShowAttachPicker(true)
      },
    })
  }, [])

  // ===== 结果操作 =====
  const handleResultAction = useCallback((level: string, scene: string) => {
    switch (level) {
      case 'A': Taro.navigateTo({ url: `/pages/record/index?from=advisor&level=A&scene=${encodeURIComponent(scene)}` }); break
      case 'B': Taro.navigateTo({ url: `/pages/protection-mode/index?from=advisor&level=B&scene=${encodeURIComponent(scene)}` }); break
      case 'C': Taro.navigateTo({ url: '/pages/witness-network/index?from=advisor&level=C' }); break
      case 'D': Taro.makePhoneCall({ phoneNumber: '120' }); break
      case 'E': Taro.makePhoneCall({ phoneNumber: '110' }); break
    }
  }, [])

  // ===== 格式化时间 =====
  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60), sec = s % 60
    return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`
  }

  // ===== 渲染消息 =====
  const renderMessage = (msg: ChatMessage) => {
    const isAI = msg.role === 'ai'

    if (msg.isLoading) {
      return (
        <View key={msg.id} className={`${styles.msgRow} ${styles.msgLeft}`}>
          <View className={styles.msgAvatar}>🤖</View>
          <View className={styles.msgBubble}>
            <View className={styles.typingDots}>
              <View className={styles.typingDot} /><View className={styles.typingDot} /><View className={styles.typingDot} />
            </View>
          </View>
        </View>
      )
    }

    return (
      <View key={msg.id} className={`${styles.msgRow} ${isAI ? styles.msgLeft : styles.msgRight}`}>
        {isAI && <View className={styles.msgAvatar}>🤖</View>}
        <View className={`${styles.msgBubble} ${isAI ? styles.bubbleAI : styles.bubbleUser}`}>
          {msg.type === 'image' && msg.images && (
            <View className={styles.msgImages}>
              {msg.images.map((img, i) => (
                <Image key={i} className={styles.msgImage} src={img} mode="aspectFill" />
              ))}
            </View>
          )}
          {msg.type === 'video' && (
            <View className={styles.msgVideo}>
              <Text className={styles.msgVideoIcon}>🎥</Text>
              <Text className={styles.msgVideoText}>现场视频</Text>
            </View>
          )}
          {msg.type === 'audio' && (
            <View className={styles.msgAudio}>
              <Text className={styles.msgAudioIcon}>🎤</Text>
              <Text className={styles.msgAudioText}>语音消息</Text>
            </View>
          )}
          {msg.type === 'result' && msg.resultData ? (
            <View className={styles.resultBlock}>
              <View className={styles.resultLevelCard}>
                <Text className={styles.resultLevelIcon}>{ADVICE_LEVEL_CONFIG[msg.resultData.adviceLevel].icon}</Text>
                <Text className={styles.resultLevelLabel}>{ADVICE_LEVEL_CONFIG[msg.resultData.adviceLevel].label}</Text>
              </View>
              <View className={styles.resultDangerBar}>
                <View className={styles.resultDangerFill} style={{ width: `${msg.resultData.dangerScore}%`, background: msg.resultData.dangerScore < 30 ? '#4CAF50' : msg.resultData.dangerScore < 50 ? '#FF9800' : msg.resultData.dangerScore < 70 ? '#FF5722' : '#F44336' }} />
              </View>
              <Text className={styles.resultDangerLabel}>危险系数 {msg.resultData.dangerScore}/100</Text>
              <Text className={styles.resultSummary}>{msg.resultData.summary || ADVICE_LEVEL_CONFIG[msg.resultData.adviceLevel].description}</Text>
              {msg.resultData.actions.length > 0 && (
                <View className={styles.resultActions}>
                  {msg.resultData.actions.map((a, i) => (
                    <View key={i} className={`${styles.resultAction} ${a.urgent ? styles.resultActionUrgent : ''}`}>
                      <Text className={styles.resultActionIcon}>{a.icon}</Text>
                      <Text className={styles.resultActionText}>{a.action}</Text>
                    </View>
                  ))}
                </View>
              )}
              <View className={styles.resultButtons}>
                <View className={styles.resultBtn} onClick={() => handleResultAction(msg.resultData!.adviceLevel, msg.resultData!.summary || '')}>
                  <Text>
                    {msg.resultData!.adviceLevel === 'A' && '🤝 去帮助'}
                    {msg.resultData!.adviceLevel === 'B' && '🛡️ 开启保护模式'}
                    {msg.resultData!.adviceLevel === 'C' && '👥 联系附近热心人'}
                    {msg.resultData!.adviceLevel === 'D' && '📞 拨打专业电话'}
                    {msg.resultData!.adviceLevel === 'E' && '🚨 拨打110'}
                  </Text>
                </View>
                {msg.resultData!.warnings.length > 0 && (
                  <View className={styles.resultWarn}>
                    {msg.resultData!.warnings.map((w, idx) => (<Text key={idx} className={styles.resultWarnItem}>⚠️ {w}</Text>))}
                  </View>
                )}
              </View>
            </View>
          ) : (
            <MdText className={styles.msgText} content={msg.content} />
          )}
        </View>
        {!isAI && <View className={styles.msgAvatar}>😊</View>}
      </View>
    )
  }

  // ===== 从场景列表填充并发送 =====
  const handleSelectScene = useCallback((label: string) => {
    setInputText(label)
    setShowScenePicker(false)
    // 重置对话阶段（新场景从 phase 0 开始）
    setConversationPhase(0)
    conversationPhaseRef.current = 0
    setGatheredInfo({})
    gatheredInfoRef.current = {}

    const presets: Record<string, string> = {
      '老人摔倒': '看到一位老人摔倒在路边，需要帮助',
      '交通事故': '看到路口发生了交通事故',
      '有人晕倒': '看到有人突然晕倒了',
      '有人溺水': '看到有人落水需要救援',
      '拾金不昧': '捡到了丢失的物品',
      '流浪动物': '看到受伤的流浪动物',
      '遇到纠纷': '看到有人在争吵',
      '紧急求救': '遇到了紧急情况',
    }
    const desc = presets[label] || label

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      type: 'text',
      content: desc,
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    processUserMessage(desc)
  }, [processUserMessage])

  return (
    <View className={styles.page}>
      {/* 摄像头全屏（H5拍照/录像） */}
      {showCamera && isH5 && (
        <View className={styles.cameraFull}>
          {/* 真实的视频预览元素，解决黑屏问题 */}
          <video
            ref={cameraVideoRef}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            autoPlay
            playsInline
            muted
          />
          <View className={styles.cameraFullTop}>
            <View className={styles.cameraFullBack} onClick={() => {
              setShowCamera(false)
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop()
              }
              setIsRecording(false)
              if (recordTimerRef.current) clearInterval(recordTimerRef.current)
              // 清理摄像头流
              if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach(t => t.stop())
                cameraStreamRef.current = null
              }
            }}>
              <Text>✕ 关闭</Text>
            </View>
            {isRecording && (
              <View className={styles.cameraFullRecordBadge}>
                <View className={styles.recDot} />
                <Text>{fmtTime(recordTime)}</Text>
              </View>
            )}
          </View>
          <View className={styles.cameraFullHint}>
            <Text>{cameraMode === 'photo' ? '对准现场，点击下方按钮拍照' : '对准现场，点击按钮开始录像'}</Text>
          </View>
          <View className={styles.cameraFullBottom}>
            {cameraMode === 'photo' ? (
              <View className={styles.cameraFullBtn} onClick={handleCameraCapture}>
                <View className={styles.cameraFullBtnInner} />
              </View>
            ) : (
              <View
                className={`${styles.cameraFullBtn} ${isRecording ? styles.cameraFullBtnRecording : ''}`}
                onClick={isRecording ? stopVideoRecord : handleCameraCapture}
              >
                <View className={`${isRecording ? styles.cameraFullBtnStop : styles.cameraFullBtnInner}`} />
              </View>
            )}
          </View>
        </View>
      )}

      {/* 顶部栏 */}
      <View className={styles.topBar}>
        <Text className={styles.backBtn} onClick={() => safeNavigateBack()}>←</Text>
        <View className={styles.topAvatar}>🤖</View>
        <View className={styles.topInfo}>
          <Text className={styles.topTitle}>善行顾问</Text>
          <View className={styles.topStatus}>
            <View className={styles.topStatusDot} />
            <Text className={styles.topStatusText}>AI在线</Text>
          </View>
        </View>
        <View className={styles.topOnlineBadge}>
          <Text className={styles.topOnlineIcon}>📡</Text>
          <Text className={styles.topOnlineText}>{gpsInfo?.address?.slice(0, 8) || '定位中'}</Text>
        </View>
      </View>

      {/* 消息列表 */}
      <ScrollView className={styles.chatArea} scrollY scrollWithAnimation ref={scrollRef} enhanced showScrollbar={false}>
        <View className={styles.chatList}>
          {messages.map(msg => renderMessage(msg))}
        </View>
      </ScrollView>

      {/* 照片预览 */}
      {photos.length > 0 && showAttachPicker && (
        <View className={styles.photoPreviewBar}>
          <ScrollView scrollX className={styles.photoPreviewScroll}>
            {photos.map((p, i) => (
              <View key={i} className={styles.photoPreviewItem}>
                <Image className={styles.photoPreviewImg} src={p} mode="aspectFill" />
                <Text className={styles.photoPreviewRemove} onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}>×</Text>
              </View>
            ))}
          </ScrollView>
          <View className={styles.photoSendBtn} onClick={() => sendMedia('image', photos, '[现场照片]')}>
            <Text>发送</Text>
          </View>
        </View>
      )}

      {/* 场景选择面板 */}
      {showScenePicker && (
        <View className={styles.scenePickerPanel}>
          <View className={styles.scenePickerGrid}>
            {SCENE_PRESETS.map((s, i) => (
              <View key={i} className={styles.scenePickerItem} onClick={() => handleSelectScene(s.label)}>
                <Text className={styles.scenePickerIcon}>{s.icon}</Text>
                <Text className={styles.scenePickerLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 附件面板 */}
      {showAttachPicker && photos.length === 0 && (
        <View className={styles.attachPanel}>
          <View className={styles.attachItem} onClick={takePhoto}>
            <View className={styles.attachIconWrap} style={{ background: '#3B82F6' }}>
              <Text className={styles.attachIcon}>📷</Text>
            </View>
            <Text className={styles.attachLabel}>拍照</Text>
          </View>
          <View className={styles.attachItem} onClick={startVideoRecord}>
            <View className={styles.attachIconWrap} style={{ background: '#EF4444' }}>
              <Text className={styles.attachIcon}>🎥</Text>
            </View>
            <Text className={styles.attachLabel}>视频</Text>
          </View>
          <View className={styles.attachItem} onClick={startAudioRecord}>
            <View className={styles.attachIconWrap} style={{ background: '#F59E0B' }}>
              <Text className={styles.attachIcon}>🎤</Text>
            </View>
            <Text className={styles.attachLabel}>语音</Text>
          </View>
          <View className={styles.attachItem} onClick={chooseImage}>
            <View className={styles.attachIconWrap} style={{ background: '#8B5CF6' }}>
              <Text className={styles.attachIcon}>🖼️</Text>
            </View>
            <Text className={styles.attachLabel}>相册</Text>
          </View>
        </View>
      )}

      {/* 录音中状态 */}
      {isRecording && !showCamera && (
        <View className={styles.recordingBar}>
          <View className={styles.recordingIndicator}>
            <View className={styles.recordingDot} />
            <Text className={styles.recordingTime}>{fmtTime(recordTime)}</Text>
          </View>
          <Text className={styles.recordingHint}>正在录音，点击停止发送</Text>
          <View className={styles.recordingStopBtn} onClick={stopAudioRecord}>
            <Text>停止</Text>
          </View>
        </View>
      )}

      {/* 底部输入栏 */}
      <View className={styles.inputBar}>
        {/* 语音/文字切换按钮 */}
        <View className={styles.inputBtn} onClick={() => setInputMode(inputMode === 'text' ? 'voice' : 'text')}>
          <Text className={styles.inputBtnIcon}>{inputMode === 'text' ? '🎤' : '⌨️'}</Text>
        </View>

        {inputMode === 'text' ? (
          <>
            <View className={styles.inputBtn} onClick={() => { setShowAttachPicker(!showAttachPicker); setShowScenePicker(false) }}>
              <Text className={styles.inputBtnIcon}>{showAttachPicker ? '✕' : '➕'}</Text>
            </View>
            <View className={styles.inputBtn} onClick={() => { setShowScenePicker(!showScenePicker); setShowAttachPicker(false) }}>
              <Text className={styles.inputBtnIcon}>{showScenePicker ? '✕' : '📋'}</Text>
            </View>
            <View className={styles.inputWrap}>
              <textarea
                className={styles.textInput}
                value={inputText}
                placeholder="描述情况或选择场景..."
                placeholderClassName={styles.inputPlaceholder}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={200}
                rows={1}
              />
            </View>
            <View className={`${styles.sendBtn} ${inputText.trim() ? styles.sendBtnActive : ''}`} onClick={sendText}>
              <Text className={styles.sendBtnIcon}>↑</Text>
            </View>
          </>
        ) : (
          /* 语音模式 — 按住说话 */
          <>
            <View
              className={`${styles.voiceBtn} ${isPressing ? styles.voiceBtnPressing : ''}`}
              onTouchStart={handleVoiceStart}
              onTouchEnd={handleVoiceEnd}
              onTouchCancel={handleVoiceEnd}
              onMouseDown={handleVoiceStart}
              onMouseUp={handleVoiceEnd}
              onMouseLeave={handleVoiceEnd}
            >
              <Text className={styles.voiceBtnText}>
                {isPressing ? `${fmtTime(recordTime)} 松开发送` : '按住 说话'}
              </Text>
            </View>
            <View className={styles.inputBtn} onClick={() => { setShowScenePicker(!showScenePicker); setShowAttachPicker(false) }}>
              <Text className={styles.inputBtnIcon}>{showScenePicker ? '✕' : '📋'}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  )
}
