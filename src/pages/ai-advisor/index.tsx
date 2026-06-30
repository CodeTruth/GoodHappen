import React, { useState, useCallback, useRef } from 'react'
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

type PageStep = 'idle' | 'sensing' | 'analyzing' | 'result'

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
  // 页面步骤
  const [step, setStep] = useState<PageStep>('idle')
  const [result, setResult] = useState<AIAdvisorResult | null>(null)

  // 感知状态
  const [isRecording, setIsRecording] = useState(false)
  const [voiceText, setVoiceText] = useState('')
  const [perceivedDots, setPerceivedDots] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ===== 开始感知 =====
  const handleStartSensing = useCallback(() => {
    setStep('sensing')
    setVoiceText('')
    setPerceivedDots(0)
  }, [])

  // ===== 按住说话 =====
  const handleVoiceStart = useCallback(() => {
    setIsRecording(true)
    // 模拟语音输入过程
    timerRef.current = setInterval(() => {
      setVoiceText((prev) => {
        const phrases = [
          '看到',
          '看到一位',
          '看到一位老人',
          '看到一位老人摔倒',
          '看到一位老人摔倒在路边',
          '看到一位老人摔倒在路边，',
          '看到一位老人摔倒在路边，似乎',
          '看到一位老人摔倒在路边，似乎无法',
          '看到一位老人摔倒在路边，似乎无法起身',
        ]
        const idx = Math.min(phrases.length - 1, Math.floor(prev.length / 3) + 1)
        return phrases[idx] || phrases[phrases.length - 1]
      })
    }, 300)
  }, [])

  const handleVoiceEnd = useCallback(() => {
    setIsRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    // 模拟语音识别完成
    setVoiceText('看到一位老人摔倒在路边，似乎无法起身')
  }, [])

  // ===== AI 分析 =====
  const handleAnalyze = useCallback(() => {
    const finalVoice = voiceText.trim() || '看到一位老人摔倒在路边，似乎无法起身'

    setStep('analyzing')

    // 模拟分析延迟
    setTimeout(() => {
      // 从语音描述中自动提取信息
      const perceived = extractFromVoice(finalVoice)
      // 从摄像头感知中自动推断（模拟）
      const cameraData = inferFromCamera()
      // 合并感知数据
      const merged = { ...perceived, ...cameraData }

      // 自动生成参数
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
    }, 1500)
  }, [voiceText])

  // ===== 重新评估 =====
  const handleReset = useCallback(() => {
    setStep('idle')
    setResult(null)
    setVoiceText('')
    setPerceivedDots(0)
    setIsRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // ===== 底部按钮操作 =====
  const handleLevelAction = useCallback((level: string) => {
    switch (level) {
      case 'A':
        Taro.navigateTo({ url: '/pages/record/index' })
        break
      case 'B':
        Taro.navigateTo({ url: '/pages/protection-mode/index' })
        break
      case 'C':
        Taro.navigateTo({ url: '/pages/witness-network/index' })
        break
      case 'D':
        Taro.makePhoneCall({ phoneNumber: '120' })
        break
      case 'E':
        Taro.makePhoneCall({ phoneNumber: '110' })
        break
    }
  }, [])

  // ===== 危险系数颜色 =====
  const getDangerColor = (score: number): string => {
    if (score < 30) return '#52C41A'
    if (score < 50) return '#FAAD14'
    if (score < 70) return '#FF7A45'
    return '#F44336'
  }

  const getDangerGradient = (score: number): string => {
    if (score < 30) return 'linear-gradient(90deg, #52C41A 0%, #73D13D 100%)'
    if (score < 50) return 'linear-gradient(90deg, #73D13D 0%, #FAAD14 100%)'
    if (score < 70) return 'linear-gradient(90deg, #FAAD14 0%, #FF7A45 100%)'
    return 'linear-gradient(90deg, #FF7A45 0%, #F44336 100%)'
  }

  // ===== 感知中动画点 =====
  React.useEffect(() => {
    if (step !== 'sensing') return
    const interval = setInterval(() => {
      setPerceivedDots((prev) => (prev + 1) % 4)
    }, 500)
    return () => clearInterval(interval)
  }, [step])

  // ============================================
  // 渲染
  // ============================================

  return (
    <View className={styles.pageWrapper}>
      {/* ===== 初始状态：大圆形按钮 ===== */}
      {step === 'idle' && (
        <View className={styles.idleContainer}>
          <View className={styles.idleInner}>
            <View className={styles.idleIcon}>🔮</View>
            <View className={styles.idleTitle}>AI 善行顾问</View>
            <View className={styles.idleDesc}>
              打开摄像头和麦克风，让AI感知周围环境，智能分析最佳行善方案
            </View>
            <View
              className={styles.startBtn}
              onClick={handleStartSensing}
            >
              <Text className={styles.startBtnIcon}>📷</Text>
              <Text className={styles.startBtnText}>打开摄像头和麦克风</Text>
            </View>
          </View>
        </View>
      )}

      {/* ===== 感知中状态 ===== */}
      {step === 'sensing' && (
        <View className={styles.sensingContainer}>
          {/* 摄像头预览区域 */}
          <View className={styles.cameraPreview}>
            <View className={styles.cameraOverlay}>
              <View className={styles.cameraGrid}>
                <View className={styles.cameraGridLineH} />
                <View className={styles.cameraGridLineH} />
                <View className={styles.cameraGridLineV} />
                <View className={styles.cameraGridLineV} />
              </View>
              <View className={`${styles.cameraCorner} ${styles.cameraCornerTL}`} />
              <View className={`${styles.cameraCorner} ${styles.cameraCornerTR}`} />
              <View className={`${styles.cameraCorner} ${styles.cameraCornerBL}`} />
              <View className={`${styles.cameraCorner} ${styles.cameraCornerBR}`} />
              <View className={styles.recordingBadge}>
                <View className={styles.recordingDot} />
                <Text className={styles.recordingText}>录制中</Text>
              </View>
              <View className={styles.cameraStatus}>
                <Text className={styles.cameraStatusText}>
                  AI正在感知环境{'.'.repeat(perceivedDots + 1)}
                </Text>
              </View>
            </View>
          </View>

          {/* 语音识别区域 */}
          <View className={styles.voiceSection}>
            <View className={styles.voiceLabel}>按住说话描述场景</View>
            {voiceText ? (
              <View className={styles.voiceTextBox}>
                <Text className={styles.voiceText}>{voiceText}</Text>
              </View>
            ) : (
              <View className={styles.voiceHint}>
                <Text>请描述你看到的场景，例如"看到一位老人摔倒"</Text>
              </View>
            )}
            <View
              className={`${styles.voiceBtn} ${isRecording ? styles.recording : ''}`}
              onTouchStart={handleVoiceStart}
              onTouchEnd={handleVoiceEnd}
            >
              <Text className={styles.voiceBtnIcon}>🎙️</Text>
              <Text className={styles.voiceBtnText}>
                {isRecording ? '正在聆听...' : '按住说话'}
              </Text>
            </View>
          </View>

          {/* 感知信息 */}
          <View className={styles.perceivedSection}>
            <View className={styles.perceivedTitle}>已感知信息</View>
            <View className={styles.perceivedTags}>
              <View className={styles.perceivedTag}>
                <Text className={styles.perceivedTagLabel}>场景</Text>
                <Text className={styles.perceivedTagValue}>
                  {voiceText ? guessActionType(voiceText) === 'elder_help' ? '老人求助' : '现场情况' : '...'}
                </Text>
              </View>
              <View className={styles.perceivedTag}>
                <Text className={styles.perceivedTagLabel}>时间</Text>
                <Text className={styles.perceivedTagValue}>
                  {new Date().getHours() >= 6 && new Date().getHours() < 18 ? '白天' : '晚上'}
                </Text>
              </View>
              <View className={styles.perceivedTag}>
                <Text className={styles.perceivedTagLabel}>人数</Text>
                <Text className={styles.perceivedTagValue}>自动推断</Text>
              </View>
              <View className={styles.perceivedTag}>
                <Text className={styles.perceivedTagLabel}>监控</Text>
                <Text className={styles.perceivedTagValue}>检测中</Text>
              </View>
            </View>
          </View>

          {/* AI分析按钮 */}
          <View
            className={styles.analyzeBtn}
            onClick={handleAnalyze}
          >
            <Text className={styles.analyzeBtnIcon}>🔍</Text>
            <Text>AI 分析</Text>
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
                        <View key={sIdx} className={styles.stepItem}>
                          {step}
                        </View>
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

/** 从语音描述中提取信息 */
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
    nearbyPeople: 0, // 由摄像头推断
    subjectCount,
    subjectBehavior,
    subjectConsciousness,
    isIsolated: false, // 由摄像头推断
    hasCCTV: false, // 由摄像头推断
  }
}

/** 从摄像头感知推断环境（模拟） */
function inferFromCamera(): Partial<PerceivedData> {
  // 模拟周围人数推断（随机但偏向合理值）
  const nearbyPeople = Math.random() > 0.5 ? 5 : Math.random() > 0.5 ? 2 : 0

  // 模拟是否有监控（城市环境大概率有）
  const hasCCTV = Math.random() > 0.3

  // 模拟是否偏僻
  const isIsolated = nearbyPeople <= 2 && Math.random() > 0.5

  return {
    nearbyPeople,
    isIsolated,
    hasCCTV,
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
