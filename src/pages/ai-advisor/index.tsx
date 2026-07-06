import { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, ScrollView, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
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
import styles from './index.module.scss'

// ============================================
// 类型定义
// ============================================

type PageStep = 'idle' | 'guiding_camera' | 'guiding_voice' | 'analyzing' | 'result'

/** 模拟感知提取的数据 */
interface PerceivedData {
  description: string
  sceneType: string
  urgency: KindnessAction['urgency']
  timeOfDay: EnvironmentContext['timeOfDay']
  nearbyPeople: number
  subjectCount: number
  subjectBehavior: SubjectInfo['behavior']
  subjectConsciousness: SubjectInfo['consciousness']
  isIsolated: boolean
  hasCCTV: boolean
}

/** 收集的环境数据 */
interface CollectedEnvData {
  time: string
  location: string
  gps: { latitude: number; longitude: number; address: string } | null
  lightCondition: string
}

// ============================================
// 页面组件
// ============================================

export default function AIAdvisorPage() {
  const [step, setStep] = useState<PageStep>('idle')
  const [result, setResult] = useState<AIAdvisorResult | null>(null)

  // 引导状态
  const [guideText, setGuideText] = useState('')
  const [voiceText, setVoiceText] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  // 用户主动输入的补充描述（用于无法实时采集的场景，如"明天见网友"）
  const [userInput, setUserInput] = useState('')
  const [showTextInput, setShowTextInput] = useState(false)

  // 摄像头相关状态
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [collectedEnvData, setCollectedEnvData] = useState<CollectedEnvData>({
    time: '',
    location: '',
    gps: null,
    lightCondition: '',
  })

  // 录音相关状态
  const [isRecordingAudio, setIsRecordingAudio] = useState(false)
  const [audioChunks, setAudioChunks] = useState<Blob[]>([])
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)

  const userInfo = useUserStore((state) => state.userInfo)

  // ===== 清理所有定时器 =====
  const clearAllTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    if (scanTimerRef.current) { clearInterval(scanTimerRef.current); scanTimerRef.current = null }
  }, [])

  // ===== 停止摄像头流 =====
  const stopCameraStream = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop())
      setCameraStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [cameraStream])

  // ===== 停止录音 =====
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecordingAudio(false)
  }, [])

  // 常用场景快捷选项
  const SCENE_PRESETS = [
    { icon: '👴', label: '老人摔倒', text: '看到一位老人摔倒在路边，周围没什么人，似乎无法起身' },
    { icon: '🚗', label: '交通事故', text: '看到路口有两辆车相撞，有人受伤流血，情况紧急' },
    { icon: '🌊', label: '有人溺水', text: '看到有人在河里挣扎，喊救命，周围没有救生设备' },
    { icon: '💼', label: '拾金不昧', text: '在地铁座位上捡到一个钱包，里面有身份证和现金' },
    { icon: '😵', label: '有人晕倒', text: '看到一位女士突然晕倒在商场里，脸色苍白' },
    { icon: '🐕', label: '流浪动物', text: '看到一只受伤的流浪猫在路边，腿好像断了' },
  ]

  // ===== 开始引导流程（实时感知模式） =====
  const handleStart = useCallback(async () => {
    clearAllTimers()
    stopCameraStream()
    stopRecording()
    setAudioBlob(null)
    setAudioChunks([])
    setStep('guiding_camera')
    setGuideText('请将摄像头对准需要帮助的现场')
    setVoiceText('')
    setCameraReady(false)
    setUserInput('')
    setIsScanning(false)
    setScanProgress(0)
    setCameraStream(null)
    setCollectedEnvData({ time: '', location: '', gps: null, lightCondition: '' })

    // 获取GPS位置
    let gpsLocation: { latitude: number; longitude: number; address: string } | null = null
    try {
      const locRes = await Taro.getLocation({ type: 'gcj02' })
      gpsLocation = {
        latitude: locRes.latitude,
        longitude: locRes.longitude,
        address: `${locRes.latitude.toFixed(4)}, ${locRes.longitude.toFixed(4)}`,
      }
    } catch (e) {
      console.warn('[AIAdvisor] GPS获取失败，使用默认值:', e)
      gpsLocation = { latitude: 39.9042, longitude: 116.4074, address: '北京市' }
    }

    const now = new Date()
    const timeStr = now.toLocaleString('zh-CN')
    const hour = now.getHours()
    const lightCondition = hour >= 6 && hour < 18 ? '明亮' : '昏暗'

    setCollectedEnvData({
      time: timeStr,
      location: gpsLocation?.address || '未知位置',
      gps: gpsLocation,
      lightCondition,
    })

    // 初始化摄像头（H5环境）
    const isH5 = typeof window !== 'undefined'
    if (isH5 && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        })
        setCameraStream(stream)
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch((err) => {
            console.warn('[AIAdvisor] Video play failed:', err)
          })
        }
        setCameraReady(true)
        setGuideText('摄像头已就绪，请点击"开始扫描"')
      } catch (err) {
        console.warn('[AIAdvisor] Camera init failed:', err)
        // 降级：显示模拟UI
        setCameraReady(true)
        setGuideText('无法访问摄像头，请直接描述现场情况')
      }
    } else {
      setCameraReady(true)
      setGuideText('当前环境不支持摄像头，请直接描述现场情况')
    }
  }, [clearAllTimers, stopCameraStream, stopRecording])

  // ===== 开始扫描 =====
  const handleStartScan = useCallback(() => {
    setIsScanning(true)
    setScanProgress(0)
    setGuideText('请缓慢转动手机，扫描周围环境')

    scanTimerRef.current = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 100) {
          if (scanTimerRef.current) {
            clearInterval(scanTimerRef.current)
            scanTimerRef.current = null
          }
          setGuideText('扫描完成！请点击"完成扫描"')
          setIsScanning(false)
          return 100
        }
        return prev + 1
      })
    }, 200)
  }, [])

  // ===== 完成扫描 =====
  const handleFinishScan = useCallback(() => {
    if (scanTimerRef.current) {
      clearInterval(scanTimerRef.current)
      scanTimerRef.current = null
    }
    stopCameraStream()
    setStep('guiding_voice')
    setGuideText('请描述现场情况，或使用语音输入')
    setIsScanning(false)
  }, [stopCameraStream])

  // ===== 重新扫描 =====
  const handleRescan = useCallback(() => {
    stopRecording()
    setAudioBlob(null)
    setVoiceText('')
    setUserInput('')
    handleStart()
  }, [handleStart, stopRecording])

  // ===== 开始录音 =====
  const handleStartRecording = useCallback(async () => {
    const isH5 = typeof window !== 'undefined'
    if (!isH5 || !navigator.mediaDevices?.getUserMedia) {
      Taro.showToast({ title: '当前环境不支持录音', icon: 'none' })
      return
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(audioStream)
      mediaRecorderRef.current = mediaRecorder
      const chunks: Blob[] = []
      setAudioChunks([])

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        setAudioChunks(chunks)
        const blob = new Blob(chunks, { type: 'audio/webm' })
        setAudioBlob(blob)
        audioStream.getTracks().forEach((t) => t.stop())
      }

      mediaRecorder.start()
      setIsRecordingAudio(true)
    } catch (err) {
      console.warn('[AIAdvisor] Audio recording failed:', err)
      Taro.showToast({ title: '录音启动失败', icon: 'none' })
    }
  }, [])

  // ===== 停止录音 =====
  const handleStopRecording = useCallback(() => {
    stopRecording()
  }, [stopRecording])

  // ===== 选择快捷场景 =====
  const handleSelectScene = useCallback((text: string) => {
    setVoiceText(text)
    setUserInput(text)
  }, [])

  // ===== 用户手动开始分析 =====
  const handleManualAnalyze = useCallback(() => {
    const text = userInput.trim() || voiceText.trim()
    if (!text) {
      Taro.showToast({ title: '请先描述现场情况', icon: 'none' })
      return
    }
    setVoiceText(text)
    handleAutoAnalyze(text)
  }, [userInput, voiceText])

  // ===== 自动分析 =====
  const handleAutoAnalyze = useCallback((finalVoice: string) => {
    setStep('analyzing')
    setGuideText('AI正在综合评估...')

    // 构建用户个人信息
    const userPersonalInfo = {
      nickname: userInfo?.name || '用户',
      age: userInfo?.birthYear ? new Date().getFullYear() - userInfo.birthYear : undefined,
      gender: userInfo?.gender || undefined,
      region: userInfo?.region || undefined,
      fuqiLevel: userInfo?.blessingValue ? `福气值${userInfo.blessingValue}` : undefined,
    }

    timeoutRef.current = setTimeout(() => {
      const perceived = extractFromVoice(finalVoice)
      const cameraData = inferFromCamera(finalVoice)
      const merged = { ...perceived, ...cameraData }

      const userProfile: UserProfile = {
        physicalCondition: 'normal',
        experienceLevel: 'normal',
        age: userPersonalInfo.age,
        gender: userPersonalInfo.gender as 'male' | 'female' | undefined,
      }

      const env: EnvironmentContext = {
        timeOfDay: merged.timeOfDay,
        isWeekday: true,
        location: collectedEnvData.location || (merged.isIsolated ? '偏僻路段' : '繁华街道'),
        nearbyPeople: merged.nearbyPeople,
        isIsolated: merged.isIsolated,
        hasCCTV: merged.hasCCTV,
      }

      const subject: SubjectInfo = {
        count: merged.subjectCount,
        behavior: merged.subjectBehavior,
        consciousness: merged.subjectConsciousness,
      }

      const action: KindnessAction = {
        type: guessActionType(finalVoice),
        description: finalVoice,
        urgency: merged.urgency,
      }

      // 构建完整上下文，使用增强版AI分析
      const fullContext: FullAnalysisContext = {
        userProfile,
        environment: env,
        subject,
        action,
        realTimeData: {
          timestamp: collectedEnvData.time || new Date().toLocaleString('zh-CN'),
          gpsLocation: collectedEnvData.gps,
          lightCondition: collectedEnvData.lightCondition || '未知',
          nearbyDescription: merged.isIsolated ? '偏僻无人' : merged.nearbyPeople > 5 ? '人群密集' : '少量人员',
        },
        userPersonalInfo,
      }

      const advisorResult = consultAIAdvisorFull(fullContext)
      setResult(advisorResult)
      setStep('result')
    }, 1800)
  }, [collectedEnvData, userInfo])

  // ===== 用户描述场景模式（用于无法实时采集的场景） =====
  const handleTextInputStart = useCallback(() => {
    if (!userInput.trim()) {
      Taro.showToast({ title: '请描述您计划中的善行场景', icon: 'none' })
      return
    }
    setVoiceText(userInput.trim())
    setStep('analyzing')
    setGuideText('AI正在综合评估...')
    handleAutoAnalyze(userInput.trim())
  }, [userInput, handleAutoAnalyze])

  // ===== 重新评估 =====
  const handleReset = useCallback(() => {
    clearAllTimers()
    stopCameraStream()
    stopRecording()
    setStep('idle')
    setResult(null)
    setVoiceText('')
    setCameraReady(false)
    setUserInput('')
    setIsScanning(false)
    setScanProgress(0)
    setCameraStream(null)
    setAudioBlob(null)
    setAudioChunks([])
    setCollectedEnvData({ time: '', location: '', gps: null, lightCondition: '' })
  }, [clearAllTimers, stopCameraStream, stopRecording])

  // ===== 底部按钮操作 =====
  const handleLevelAction = useCallback((level: string, scene: string) => {
    const encodedScene = encodeURIComponent(scene)
    const resultData = result
    const encodedResult = resultData ? encodeURIComponent(JSON.stringify({
      al: resultData.adviceLevel,
      ds: resultData.dangerScore,
      at: resultData.actions.map(a => a.action).join('|'),
    })) : ''

    switch (level) {
      case 'A':
        Taro.navigateTo({ url: `/pages/record/index?from=advisor&level=A&scene=${encodedScene}` })
        break
      case 'B':
        Taro.navigateTo({ url: `/pages/protection-mode/index?from=advisor&level=B&scene=${encodedScene}&adv=${encodedResult}` })
        break
      case 'C':
        Taro.navigateTo({ url: `/pages/witness-network/index?from=advisor&level=C` })
        break
      case 'D':
        Taro.makePhoneCall({ phoneNumber: '120' })
        setTimeout(() => {
          Taro.navigateTo({ url: `/pages/record/index?from=advisor&level=D&scene=${encodedScene}` })
        }, 800)
        break
      case 'E':
        Taro.makePhoneCall({ phoneNumber: '110' })
        setTimeout(() => {
          Taro.navigateTo({ url: `/pages/record/index?from=advisor&level=E&scene=${encodedScene}` })
        }, 800)
        break
    }
  }, [result])

  // ===== 危险系数颜色 =====
  const getDangerGradient = (score: number): string => {
    if (score < 30) return 'linear-gradient(90deg, #52C41A 0%, #73D13D 100%)'
    if (score < 50) return 'linear-gradient(90deg, #73D13D 0%, #FAAD14 100%)'
    if (score < 70) return 'linear-gradient(90deg, #FAAD14 0%, #FF7A45 100%)'
    return 'linear-gradient(90deg, #FF7A45 0%, #F44336 100%)'
  }

  // ===== 处理从首页聊天入口跳转（mode=text 直接显示文字输入模式） =====
  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params
    if (params?.mode === 'text') {
      setShowTextInput(true)
    }
  }, [])

  // ===== 页面卸载时清理 =====
  useEffect(() => {
    return () => {
      clearAllTimers()
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current)
        scanTimerRef.current = null
      }
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop())
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [clearAllTimers, cameraStream])

  // ============================================
  // 渲染
  // ============================================

  return (
    <View className={styles.pageWrapper}>
      {/* ===== 初始状态 ===== */}
      {step === 'idle' && (
        <View className={styles.idleContainer}>
          <View className={styles.idleInner}>
            <View className={styles.idleIcon}>🔮</View>
            <View className={styles.idleTitle}>AI 善行顾问</View>
            <View className={styles.idleDesc}>
              打开摄像头和麦克风，AI自动感知现场，智能分析最佳行善方案
            </View>
            <View className={styles.idleFeatures}>
              <View className={styles.idleFeature}>
                <Text className={styles.idleFeatureIcon}>📷</Text>
                <Text className={styles.idleFeatureText}>自动感知现场环境</Text>
              </View>
              <View className={styles.idleFeature}>
                <Text className={styles.idleFeatureIcon}>🎙️</Text>
                <Text className={styles.idleFeatureText}>语音描述自动识别</Text>
              </View>
              <View className={styles.idleFeature}>
                <Text className={styles.idleFeatureIcon}>🤖</Text>
                <Text className={styles.idleFeatureText}>AI综合评估风险</Text>
              </View>
            </View>
            <View className={styles.startBtn} onClick={handleStart}>
              <Text className={styles.startBtnIcon}>🔮</Text>
              <Text className={styles.startBtnText}>开始AI评估</Text>
            </View>

            {/* 文字描述入口：用于无法实时采集的场景 */}
            <View className={styles.textInputToggle} onClick={() => setShowTextInput(!showTextInput)}>
              <Text className={styles.textInputToggleText}>
                {showTextInput ? '收起' : '计划中的善行？直接描述场景'}
              </Text>
            </View>
            {showTextInput && (
              <View className={styles.textInputCard}>
                <Textarea
                  className={styles.textInputArea}
                  placeholder='描述您计划中的善行场景，例如：明天要去见网友，对方是异性，约在商场见面，想评估一下风险'
                  placeholderClass={styles.textInputPlaceholder}
                  value={userInput}
                  onInput={(e) => setUserInput(e.detail.value)}
                  maxlength={300}
                  autoHeight
                />
                <View className={styles.textInputBtn} onClick={handleTextInputStart}>
                  <Text className={styles.textInputBtnText}>描述场景并评估</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ===== 引导摄像头阶段 ===== */}
      {step === 'guiding_camera' && (
        <View className={styles.guideContainer}>
          {/* 引导语音气泡 */}
          <View className={styles.guideBubble}>
            <Text className={styles.guideBubbleIcon}>🤖</Text>
            <Text className={styles.guideBubbleText}>{guideText}</Text>
          </View>

          {/* 摄像头预览区域 */}
          <View className={styles.cameraPreview}>
            {/* 真实视频元素 */}
            {/* @ts-ignore - H5环境下使用原生video标签 */}
            <video
              ref={(el: HTMLVideoElement | null) => { videoRef.current = el }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: cameraStream ? 'block' : 'none',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1,
              }}
              autoPlay
              playsInline
              muted
            />

            {/* 降级：无摄像头流时显示模拟背景 */}
            {!cameraStream && (
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#1a1a2e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1,
                }}
              >
                <Text style={{ color: '#888', fontSize: 14 }}>
                  {cameraReady ? '摄像头未启用' : '正在启动摄像头...'}
                </Text>
              </View>
            )}

            <View className={styles.cameraOverlay} style={{ zIndex: 2, position: 'relative' }}>
              {/* 取景网格 */}
              <View className={styles.cameraGrid}>
                <View className={styles.cameraGridLineH} />
                <View className={styles.cameraGridLineH} />
                <View className={styles.cameraGridLineV} />
                <View className={styles.cameraGridLineV} />
              </View>
              {/* 四角取景框 */}
              <View className={`${styles.cameraCorner} ${styles.cameraCornerTL}`} />
              <View className={`${styles.cameraCorner} ${styles.cameraCornerTR}`} />
              <View className={`${styles.cameraCorner} ${styles.cameraCornerBL}`} />
              <View className={`${styles.cameraCorner} ${styles.cameraCornerBR}`} />

              {/* 录制中标记 */}
              {cameraReady && isScanning && (
                <View className={styles.recordingBadge}>
                  <View className={styles.recordingDot} />
                  <Text className={styles.recordingText}>正在扫描</Text>
                </View>
              )}

              {/* 扫描完成标记 */}
              {cameraReady && !isScanning && scanProgress >= 100 && (
                <View className={styles.recordingBadge}>
                  <Text className={styles.recordingText}>扫描完成 ✓</Text>
                </View>
              )}

              {/* 扫描进度显示 */}
              {cameraReady && isScanning && (
                <View className={styles.countdownOverlay}>
                  <Text className={styles.countdownNumber}>{Math.floor(scanProgress)}%</Text>
                </View>
              )}

              {/* 状态文字 */}
              <View className={styles.cameraStatus}>
                <Text className={styles.cameraStatusText}>
                  {!cameraReady
                    ? '正在启动摄像头...'
                    : isScanning
                      ? '请缓慢转动手机扫描环境...'
                      : scanProgress >= 100
                        ? '环境扫描完成 ✓'
                        : '摄像头已就绪'}
                </Text>
              </View>
            </View>
          </View>

          {/* 扫描进度条 */}
          {isScanning && (
            <View
              style={{
                width: '90%',
                margin: '12px auto',
                height: 4,
                background: '#e0e0e0',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${scanProgress}%`,
                  height: '100%',
                  background: '#4CAF50',
                  transition: 'width 0.2s linear',
                }}
              />
            </View>
          )}

          {/* 引导动画：旋转箭头 */}
          {isScanning && (
            <View
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8,
                gap: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 24,
                  animation: 'spin 2s linear infinite',
                  display: 'inline-block',
                }}
              >
                🔄
              </Text>
              <Text style={{ color: '#666', fontSize: 14 }}>请缓慢转动手机</Text>
            </View>
          )}

          {/* 操作按钮 */}
          <View style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cameraReady && !isScanning && scanProgress < 100 && (
              <View className={styles.analyzeBtn} onClick={handleStartScan}>
                <Text className={styles.analyzeBtnText}>🔍 开始扫描</Text>
              </View>
            )}
            {cameraReady && !isScanning && scanProgress >= 100 && (
              <View className={styles.analyzeBtn} onClick={handleFinishScan}>
                <Text className={styles.analyzeBtnText}>✅ 完成扫描</Text>
              </View>
            )}
          </View>

          {/* 已感知信息预览 */}
          {cameraReady && (
            <View className={styles.perceivedPreview}>
              <Text className={styles.perceivedPreviewTitle}>已感知环境信息</Text>
              <View className={styles.perceivedPreviewTags}>
                <View className={styles.perceivedPreviewTag}>
                  <Text className={styles.pptLabel}>时间</Text>
                  <Text className={styles.pptValue}>{collectedEnvData.time || '获取中...'}</Text>
                </View>
                <View className={styles.perceivedPreviewTag}>
                  <Text className={styles.pptLabel}>地点</Text>
                  <Text className={styles.pptValue}>{collectedEnvData.location || '定位中...'}</Text>
                </View>
                <View className={styles.perceivedPreviewTag}>
                  <Text className={styles.pptLabel}>光线</Text>
                  <Text className={styles.pptValue}>{collectedEnvData.lightCondition || '检测中...'}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ===== 引导语音/输入阶段 ===== */}
      {step === 'guiding_voice' && (
        <View className={styles.guideContainer}>
          {/* 引导语音气泡 */}
          <View className={styles.guideBubble}>
            <Text className={styles.guideBubbleIcon}>🤖</Text>
            <Text className={styles.guideBubbleText}>{guideText}</Text>
          </View>

          {/* 重新扫描按钮 */}
          <View style={{ padding: '0 20px 12px', display: 'flex', justifyContent: 'center' }}>
            <View
              style={{
                padding: '8px 16px',
                background: '#f5f5f5',
                borderRadius: 16,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
              onClick={handleRescan}
            >
              <Text style={{ fontSize: 14, color: '#666' }}>📷 重新扫描环境</Text>
            </View>
          </View>

          {/* 场景快捷选择 */}
          <View className={styles.scenePresetSection}>
            <Text className={styles.scenePresetTitle}>常见场景（点击快速填入）</Text>
            <View className={styles.scenePresetGrid}>
              {SCENE_PRESETS.map((scene, idx) => (
                <View
                  key={idx}
                  className={`${styles.scenePresetItem} ${voiceText === scene.text ? styles.scenePresetActive : ''}`}
                  onClick={() => handleSelectScene(scene.text)}
                >
                  <Text className={styles.scenePresetIcon}>{scene.icon}</Text>
                  <Text className={styles.scenePresetLabel}>{scene.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 手动输入框 */}
          <View className={styles.manualInputCard}>
            <Text className={styles.manualInputLabel}>或手动描述现场情况</Text>
            <Textarea
              className={styles.manualInputArea}
              placeholder='例如：看到一位老人摔倒在路边，周围没什么人...'
              placeholderClass={styles.manualInputPlaceholder}
              value={userInput}
              onInput={(e) => {
                setUserInput(e.detail.value)
                setVoiceText(e.detail.value)
              }}
              maxlength={200}
              autoHeight
            />
          </View>

          {/* 录音按钮（按住说话） */}
          <View style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: isRecordingAudio ? '#f44336' : '#4CAF50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              {...({
                onTouchStart: handleStartRecording,
                onTouchEnd: handleStopRecording,
                onMouseDown: handleStartRecording,
                onMouseUp: handleStopRecording,
                onMouseLeave: handleStopRecording,
              } as any)}
            >
              <Text style={{ fontSize: 28, color: '#fff' }}>{isRecordingAudio ? '⏹️' : '🎙️'}</Text>
            </View>
            <Text style={{ fontSize: 12, color: '#999' }}>
              {isRecordingAudio ? '松开结束录音' : '按住说话'}
            </Text>
            {audioBlob && (
              <Text style={{ fontSize: 14, color: '#4CAF50' }}>
                ✅ 已录制音频 ({audioChunks.length} 段)
              </Text>
            )}
          </View>

          {/* 已感知信息预览 */}
          {voiceText && (
            <View className={styles.perceivedPreview}>
              <Text className={styles.perceivedPreviewTitle}>已感知信息</Text>
              <View className={styles.perceivedPreviewTags}>
                <View className={styles.perceivedPreviewTag}>
                  <Text className={styles.pptLabel}>场景</Text>
                  <Text className={styles.pptValue}>
                    {guessActionType(voiceText) === 'elder_help' ? '老人求助' :
                     guessActionType(voiceText) === 'traffic' ? '交通事故' :
                     guessActionType(voiceText) === 'rescue' ? '水域救援' :
                     guessActionType(voiceText) === 'conflict' ? '冲突纠纷' :
                     guessActionType(voiceText) === 'medical' ? '医疗急救' :
                     guessActionType(voiceText) === 'crime' ? '违法犯罪' : '现场情况'}
                  </Text>
                </View>
                <View className={styles.perceivedPreviewTag}>
                  <Text className={styles.pptLabel}>紧急度</Text>
                  <Text className={styles.pptValue}>
                    {/紧急|救命|昏迷|落水/.test(voiceText) ? '紧急' :
                     /撞|摔倒|事故|流血/.test(voiceText) ? '高' : '中'}
                  </Text>
                </View>
                <View className={styles.perceivedPreviewTag}>
                  <Text className={styles.pptLabel}>人数</Text>
                  <Text className={styles.pptValue}>
                    {/多人|两三|几个|一群/.test(voiceText) ? '多人' : '1人'}
                  </Text>
                </View>
                <View className={styles.perceivedPreviewTag}>
                  <Text className={styles.pptLabel}>状态</Text>
                  <Text className={styles.pptValue}>
                    {/昏迷|晕倒|无意识/.test(voiceText) ? '昏迷' :
                     /激动|大喊|暴力/.test(voiceText) ? '激动' :
                     /焦虑|不安|慌张/.test(voiceText) ? '焦虑' : '平静'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 开始分析按钮 */}
          <View className={styles.analyzeBtn} onClick={handleManualAnalyze}>
            <Text className={styles.analyzeBtnText}>🔮 开始分析</Text>
          </View>
        </View>
      )}

      {/* ===== 分析中状态 ===== */}
      {step === 'analyzing' && (
        <View className={styles.analyzingContainer}>
          <View className={styles.analyzingCard}>
            <View className={styles.analyzingWave}>
              <View className={styles.waveCircle} />
              <View className={styles.waveCircle} />
              <View className={styles.waveCircle} />
            </View>
            <View className={styles.analyzingTitle}>AI 正在分析场景...</View>
            <View className={styles.analyzingSteps}>
              <View className={styles.analyzingStep}>
                <Text className={styles.analyzingStepIcon}>✅</Text>
                <Text className={styles.analyzingStepText}>提取语音信息</Text>
              </View>
              <View className={styles.analyzingStep}>
                <Text className={styles.analyzingStepIcon}>✅</Text>
                <Text className={styles.analyzingStepText}>分析环境画面</Text>
              </View>
              <View className={styles.analyzingStep}>
                <Text className={styles.analyzingStepIcon}>🔄</Text>
                <Text className={styles.analyzingStepText}>综合评估风险</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ===== 结果展示 ===== */}
      {step === 'result' && result && (
        <View className={styles.resultContainer}>
          <ScrollView scrollY className={styles.container}>
            {/* 建议等级卡片 */}
            <View
              className={styles.levelCard}
              style={{ background: ADVICE_LEVEL_CONFIG[result.adviceLevel].gradient }}
            >
              <View className={styles.levelHeader}>
                <Text className={styles.levelIcon}>
                  {ADVICE_LEVEL_CONFIG[result.adviceLevel].icon}
                </Text>
                <Text className={styles.levelLabel}>
                  {ADVICE_LEVEL_CONFIG[result.adviceLevel].label}
                </Text>
              </View>

              {/* 危险系数 */}
              <View className={styles.dangerSection}>
                <View className={styles.dangerLabel}>
                  危险系数：{result.dangerScore}/100
                </View>
                <View className={styles.dangerBarBg}>
                  <View
                    className={styles.dangerBarFill}
                    style={{
                      width: `${result.dangerScore}%`,
                      background: getDangerGradient(result.dangerScore),
                    }}
                  />
                </View>
              </View>

              {/* 摘要 */}
              <View className={styles.summaryText}>{result.summary}</View>
            </View>

            {/* 行动建议 */}
            <View className={`${styles.sectionCard} ${styles.fadeIn}`}>
              <View className={styles.sectionCardTitle}>
                <Text className={styles.sectionCardTitleIcon}>📋</Text>
                <Text>行动建议</Text>
              </View>
              {result.actions.map((action, index) => (
                <View
                  key={index}
                  className={`${styles.actionItem} ${action.urgent ? styles.urgent : ''}`}
                >
                  <View className={styles.actionHeader}>
                    <Text className={styles.actionIcon}>{action.icon}</Text>
                    <View className={styles.actionContent}>
                      <View className={styles.actionTitle}>
                        {action.action}
                        {action.urgent && (
                          <Text className={styles.urgentTag}>紧急</Text>
                        )}
                      </View>
                      <Text className={styles.actionReason}>{action.reason}</Text>
                    </View>
                  </View>
                  {action.steps && action.steps.length > 0 && (
                    <View className={styles.actionSteps}>
                      {action.steps.map((step, sIdx) => (
                        <View key={sIdx} className={styles.stepItem}>{step}</View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* 风险因素 */}
            {result.riskFactors.length > 0 && (
              <View className={`${styles.sectionCard} ${styles.fadeIn}`}>
                <View className={styles.sectionCardTitle}>
                  <Text className={styles.sectionCardTitleIcon}>⚠️</Text>
                  <Text>风险因素</Text>
                </View>
                {result.riskFactors.map((factor, index) => (
                  <View key={index} className={styles.riskItem}>
                    <View className={styles.riskLeft}>
                      <Text className={`${styles.riskImpact} ${styles[factor.impact]}`}>
                        {factor.impact === 'high' ? '高' : factor.impact === 'medium' ? '中' : '低'}
                      </Text>
                      <View className={styles.riskFactorName}>{factor.factor}</View>
                    </View>
                    <View className={styles.riskRight}>
                      <Text className={styles.riskDesc}>{factor.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* 注意事项 */}
            {result.warnings.length > 0 && (
              <View className={`${styles.warningCard} ${styles.fadeIn}`}>
                <View className={styles.warningTitle}>
                  <Text className={styles.warningTitleIcon}>⚠️</Text>
                  <Text>注意事项</Text>
                </View>
                {result.warnings.map((w, idx) => (
                  <View key={idx} className={styles.warningItem}>{w}</View>
                ))}
              </View>
            )}

            {/* 小贴士 */}
            {result.tips.length > 0 && (
              <View className={`${styles.tipsCard} ${styles.fadeIn}`}>
                <View className={styles.tipsTitle}>
                  <Text className={styles.tipsTitleIcon}>💡</Text>
                  <Text>小贴士</Text>
                </View>
                {result.tips.map((tip, idx) => (
                  <View key={idx} className={styles.tipsItem}>{tip}</View>
                ))}
              </View>
            )}

            {/* 推荐保护措施 */}
            {result.protectionMeasures.length > 0 && (
              <View className={`${styles.protectionCard} ${styles.fadeIn}`}>
                <View className={styles.protectionTitle}>
                  <Text className={styles.protectionTitleIcon}>🛡️</Text>
                  <Text>推荐保护措施</Text>
                </View>
                {result.protectionMeasures.map((m, idx) => (
                  <View key={idx} className={styles.protectionItem}>{m}</View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* 底部操作栏 */}
          <View className={styles.bottomBar}>
            <View className={styles.bottomBtnGroup}>
              <View
                className={`${styles.bottomBtn} ${styles.primaryBtn}`}
                onClick={() => handleLevelAction(result.adviceLevel, voiceText)}
              >
                <Text>
                  {result.adviceLevel === 'A' && '🤝 去帮助'}
                  {result.adviceLevel === 'B' && '🛡️ 开启保护模式'}
                  {result.adviceLevel === 'C' && '👥 联系附近热心人'}
                  {result.adviceLevel === 'D' && '📞 拨打求助电话'}
                  {result.adviceLevel === 'E' && '🚨 立即报警'}
                </Text>
              </View>
              <View
                className={`${styles.bottomBtn} ${styles.secondaryBtn}`}
                onClick={handleReset}
              >
                <Text>重新评估</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

// ============================================
// 辅助函数
// ============================================

function extractFromVoice(desc: string): PerceivedData {
  const hour = new Date().getHours()
  let timeOfDay: EnvironmentContext['timeOfDay'] = 'afternoon'
  if (hour >= 5 && hour < 12) timeOfDay = 'morning'
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon'
  else if (hour >= 17 && hour < 20) timeOfDay = 'evening'
  else if (hour >= 20 && hour < 24) timeOfDay = 'night'
  else timeOfDay = 'late_night'

  let urgency: KindnessAction['urgency'] = 'low'
  if (/紧急|救命|昏迷|落水|溺水|心脏骤停|大出血/.test(desc)) urgency = 'critical'
  else if (/撞|摔倒|事故|流血|疼痛难忍/.test(desc)) urgency = 'high'
  else if (/偷|抢|纠纷|争吵|激烈/.test(desc)) urgency = 'medium'

  let subjectCount = 1
  if (/多人|两三|几个|一群/.test(desc)) subjectCount = 3
  else if (/两人|2人|两个/.test(desc)) subjectCount = 2

  let subjectBehavior: SubjectInfo['behavior'] = 'calm'
  if (/激动|大喊|打人|暴力|冲突|争吵/.test(desc)) subjectBehavior = 'aggressive'
  else if (/焦虑|不安|慌张|着急|哭/.test(desc)) subjectBehavior = 'anxious'
  else if (/昏迷|晕倒|无意识|不动/.test(desc)) subjectBehavior = 'unconscious'

  let subjectConsciousness: SubjectInfo['consciousness'] = 'alert'
  if (/昏迷|晕倒|无意识|不省人事/.test(desc)) subjectConsciousness = 'unconscious'
  else if (/迷糊|昏沉|迷迷糊糊/.test(desc)) subjectConsciousness = 'drowsy'

  return {
    description: desc,
    sceneType: guessActionType(desc),
    urgency,
    timeOfDay,
    nearbyPeople: 0,
    subjectCount,
    subjectBehavior,
    subjectConsciousness,
    isIsolated: false,
    hasCCTV: false,
  }
}

function inferFromCamera(desc: string): Partial<PerceivedData> {
  // 基于输入文本的确定性映射：使用关键词分析替代 Math.random()
  if (/偏僻|无人|少人|夜晚|荒凉|偏僻路段|人烟稀少/.test(desc)) {
    return { nearbyPeople: 0, isIsolated: true, hasCCTV: false }
  }
  if (/人多|繁华|商场|街道|市中心|人群|热闹|闹市/.test(desc)) {
    return { nearbyPeople: 10, isIsolated: false, hasCCTV: true }
  }
  // 默认情况：根据文本中有无"监控|camera|摄像头"判断
  return {
    nearbyPeople: 3,
    isIsolated: false,
    hasCCTV: /监控|camera|摄像头/.test(desc),
  }
}

function guessActionType(desc: string): string {
  if (/老人|扶|摔倒/.test(desc)) return 'elder_help'
  if (/车|交通|撞/.test(desc)) return 'traffic'
  if (/救|溺水|落水|水域/.test(desc)) return 'rescue'
  if (/打|冲突|暴力|纠纷/.test(desc)) return 'conflict'
  if (/晕|急救|心脏/.test(desc)) return 'medical'
  if (/偷|抢/.test(desc)) return 'crime'
  return 'general'
}
