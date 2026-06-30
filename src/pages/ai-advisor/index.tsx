import { useState, useCallback, useRef, useEffect } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  consultAIAdvisor,
  ADVICE_LEVEL_CONFIG,
  type UserProfile,
  type EnvironmentContext,
  type SubjectInfo,
  type KindnessAction,
  type AIAdvisorResult,
} from '@/services/ai-kindness-advisor'
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

// ============================================
// 页面组件
// ============================================

export default function AIAdvisorPage() {
  const [step, setStep] = useState<PageStep>('idle')
  const [result, setResult] = useState<AIAdvisorResult | null>(null)

  // 引导状态
  const [countdown, setCountdown] = useState(3)
  const [guideText, setGuideText] = useState('')
  const [voiceText, setVoiceText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ===== 清理所有定时器 =====
  const clearAllTimers = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  }, [])

  // ===== 开始引导流程 =====
  const handleStart = useCallback(() => {
    clearAllTimers()
    setStep('guiding_camera')
    setCountdown(3)
    setGuideText('请将摄像头对准需要帮助的现场')
    setVoiceText('')
    setCameraReady(false)

    // 模拟摄像头初始化
    timeoutRef.current = setTimeout(() => {
      setCameraReady(true)
      // 开始3秒倒计时
      let count = 3
      timerRef.current = setInterval(() => {
        count -= 1
        setCountdown(count)
        if (count <= 0) {
          if (timerRef.current) clearInterval(timerRef.current)
          // 摄像头阶段完成，进入语音引导
          setStep('guiding_voice')
          setGuideText('请描述现场情况，例如"一位老人摔倒了"')
          setIsListening(true)

          // 模拟自动录音过程
          simulateAutoRecording()
        }
      }, 1000)
    }, 800)
  }, [clearAllTimers])

  // ===== 模拟自动录音（系统自动聆听，无需用户按住） =====
  const simulateAutoRecording = useCallback(() => {
    const phrases = [
      '看到',
      '看到一位',
      '看到一位老人',
      '看到一位老人摔倒',
      '看到一位老人摔倒在路边',
      '看到一位老人摔倒在路边，',
      '看到一位老人摔倒在路边，周围',
      '看到一位老人摔倒在路边，周围没什么人',
      '看到一位老人摔倒在路边，周围没什么人，似乎',
      '看到一位老人摔倒在路边，周围没什么人，似乎无法起身',
    ]

    let idx = 0
    timerRef.current = setInterval(() => {
      setVoiceText(phrases[idx] || phrases[phrases.length - 1])
      idx += 1
      if (idx >= phrases.length) {
        if (timerRef.current) clearInterval(timerRef.current)
        // 语音收集完成，短暂停顿后自动分析
        timeoutRef.current = setTimeout(() => {
          setIsListening(false)
          handleAutoAnalyze(phrases[phrases.length - 1])
        }, 600)
      }
    }, 250)
  }, [])

  // ===== 自动分析 =====
  const handleAutoAnalyze = useCallback((finalVoice: string) => {
    setStep('analyzing')
    setGuideText('AI正在综合评估...')

    // 模拟分析延迟
    timeoutRef.current = setTimeout(() => {
      const perceived = extractFromVoice(finalVoice)
      const cameraData = inferFromCamera()
      const merged = { ...perceived, ...cameraData }

      const userProfile: UserProfile = {
        physicalCondition: 'normal',
        experienceLevel: 'normal',
      }

      const env: EnvironmentContext = {
        timeOfDay: merged.timeOfDay,
        isWeekday: true,
        location: merged.isIsolated ? '偏僻路段' : '繁华街道',
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

      const advisorResult = consultAIAdvisor(userProfile, env, subject, action)
      setResult(advisorResult)
      setStep('result')
    }, 1800)
  }, [])

  // ===== 重新评估 =====
  const handleReset = useCallback(() => {
    clearAllTimers()
    setStep('idle')
    setResult(null)
    setVoiceText('')
    setCountdown(3)
    setCameraReady(false)
    setIsListening(false)
  }, [clearAllTimers])

  // ===== 底部按钮操作 =====
  const handleLevelAction = useCallback((level: string) => {
    switch (level) {
      case 'A': Taro.navigateTo({ url: '/pages/record/index' }); break
      case 'B': Taro.navigateTo({ url: '/pages/protection-mode/index' }); break
      case 'C': Taro.navigateTo({ url: '/pages/witness-network/index' }); break
      case 'D': Taro.makePhoneCall({ phoneNumber: '120' }); break
      case 'E': Taro.makePhoneCall({ phoneNumber: '110' }); break
    }
  }, [])

  // ===== 危险系数颜色 =====
  const getDangerGradient = (score: number): string => {
    if (score < 30) return 'linear-gradient(90deg, #52C41A 0%, #73D13D 100%)'
    if (score < 50) return 'linear-gradient(90deg, #73D13D 0%, #FAAD14 100%)'
    if (score < 70) return 'linear-gradient(90deg, #FAAD14 0%, #FF7A45 100%)'
    return 'linear-gradient(90deg, #FF7A45 0%, #F44336 100%)'
  }

  // ===== 页面卸载时清理 =====
  useEffect(() => {
    return () => clearAllTimers()
  }, [clearAllTimers])

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
            <View className={styles.cameraOverlay}>
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
              {cameraReady && (
                <View className={styles.recordingBadge}>
                  <View className={styles.recordingDot} />
                  <Text className={styles.recordingText}>正在感知</Text>
                </View>
              )}

              {/* 倒计时 */}
              {cameraReady && countdown > 0 && (
                <View className={styles.countdownOverlay}>
                  <Text className={styles.countdownNumber}>{countdown}</Text>
                </View>
              )}

              {/* 状态文字 */}
              <View className={styles.cameraStatus}>
                <Text className={styles.cameraStatusText}>
                  {cameraReady
                    ? countdown > 0
                      ? 'AI正在扫描环境...'
                      : '环境扫描完成 ✓'
                    : '正在启动摄像头...'}
                </Text>
              </View>
            </View>
          </View>

          {/* 已感知信息预览 */}
          {cameraReady && (
            <View className={styles.perceivedPreview}>
              <Text className={styles.perceivedPreviewTitle}>已感知环境信息</Text>
              <View className={styles.perceivedPreviewTags}>
                <View className={styles.perceivedPreviewTag}>
                  <Text className={styles.pptLabel}>时间</Text>
                  <Text className={styles.pptValue}>
                    {new Date().getHours() >= 6 && new Date().getHours() < 18 ? '白天' : '夜间'}
                  </Text>
                </View>
                <View className={styles.perceivedPreviewTag}>
                  <Text className={styles.pptLabel}>光线</Text>
                  <Text className={styles.pptValue}>检测中</Text>
                </View>
                <View className={styles.perceivedPreviewTag}>
                  <Text className={styles.pptLabel}>监控</Text>
                  <Text className={styles.pptValue}>检测中</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ===== 引导语音阶段 ===== */}
      {step === 'guiding_voice' && (
        <View className={styles.guideContainer}>
          {/* 引导语音气泡 */}
          <View className={styles.guideBubble}>
            <Text className={styles.guideBubbleIcon}>🤖</Text>
            <Text className={styles.guideBubbleText}>{guideText}</Text>
          </View>

          {/* 语音波形动画 */}
          <View className={styles.voiceWaveSection}>
            <View className={styles.voiceWaveContainer}>
              {Array.from({ length: 20 }).map((_, i) => (
                <View
                  key={i}
                  className={`${styles.voiceWaveBar} ${isListening ? styles.active : ''}`}
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    height: isListening ? `${Math.random() * 40 + 10}px` : '6px',
                  }}
                />
              ))}
            </View>
            <Text className={styles.voiceWaveStatus}>
              {isListening ? '正在聆听...' : '聆听完成'}
            </Text>
          </View>

          {/* 语音识别文本 */}
          <View className={styles.voiceTranscriptBox}>
            <Text className={styles.voiceTranscriptLabel}>识别内容</Text>
            <Text className={styles.voiceTranscriptText}>
              {voiceText || '等待语音输入...'}
              {isListening && <Text className={styles.voiceCursor}>|</Text>}
            </Text>
          </View>

          {/* 已感知信息 */}
          {voiceText && (
            <View className={styles.perceivedPreview}>
              <Text className={styles.perceivedPreviewTitle}>已感知信息</Text>
              <View className={styles.perceivedPreviewTags}>
                <View className={styles.perceivedPreviewTag}>
                  <Text className={styles.pptLabel}>场景</Text>
                  <Text className={styles.pptValue}>
                    {guessActionType(voiceText) === 'elder_help' ? '老人求助' :
                     guessActionType(voiceText) === 'traffic' ? '交通事故' :
                     guessActionType(voiceText) === 'rescue' ? '水域救援' : '现场情况'}
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
                onClick={() => handleLevelAction(result.adviceLevel)}
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

function inferFromCamera(): Partial<PerceivedData> {
  const nearbyPeople = Math.random() > 0.5 ? 5 : Math.random() > 0.5 ? 2 : 0
  const hasCCTV = Math.random() > 0.3
  const isIsolated = nearbyPeople <= 2 && Math.random() > 0.5
  return { nearbyPeople, isIsolated, hasCCTV }
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
