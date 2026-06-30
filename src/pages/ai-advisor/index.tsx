import React, { useState, useCallback } from 'react'
import { View, Text, ScrollView, Input, Picker } from '@tarojs/components'
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
// 常量定义
// ============================================

type PageStep = 'form' | 'loading' | 'result'

/** 身体状况选项 */
const PHYSICAL_CONDITION_OPTIONS: { value: UserProfile['physicalCondition']; label: string }[] = [
  { value: 'good', label: '身体良好' },
  { value: 'normal', label: '一般' },
  { value: 'weak', label: '体弱' },
  { value: 'disabled', label: '残障' },
]

/** 快捷场景 */
const QUICK_SCENES = [
  '老人摔倒',
  '交通事故',
  '有人晕倒',
  '遇到小偷',
  '水域救援',
  '纠纷调解',
]

/** 环境选项 */
const TIME_OPTIONS = [
  { value: 'afternoon', label: '白天' },
  { value: 'night', label: '晚上' },
  { value: 'late_night', label: '深夜' },
]

const PEOPLE_OPTIONS = [
  { value: 0, label: '无人' },
  { value: 2, label: '较少' },
  { value: 5, label: '较多' },
  { value: 10, label: '很多人' },
]

const LOCATION_OPTIONS = [
  { value: 'busy', label: '繁华街道' },
  { value: 'community', label: '小区' },
  { value: 'isolated', label: '偏僻路段' },
]

const CCTV_OPTIONS = [
  { value: 'yes', label: '有' },
  { value: 'no', label: '没有' },
  { value: 'unknown', label: '不确定' },
]

/** 对方情况选项 */
const SUBJECT_COUNT_OPTIONS = [
  { value: 1, label: '1人' },
  { value: 3, label: '多人' },
]

const SUBJECT_BEHAVIOR_OPTIONS = [
  { value: 'calm', label: '平静' },
  { value: 'anxious', label: '焦虑' },
  { value: 'aggressive', label: '激动' },
  { value: 'unconscious', label: '昏迷' },
]

// ============================================
// 页面组件
// ============================================

export default function AIAdvisorPage() {
  // 页面步骤
  const [step, setStep] = useState<PageStep>('form')
  const [result, setResult] = useState<AIAdvisorResult | null>(null)

  // ===== 表单数据 =====
  const [description, setDescription] = useState('')
  const [activeScene, setActiveScene] = useState('')

  // 自身状况
  const [physicalCondition, setPhysicalCondition] = useState<UserProfile['physicalCondition']>('normal')

  // 环境
  const [timeOfDay, setTimeOfDay] = useState<string>('afternoon')
  const [nearbyPeople, setNearbyPeople] = useState<number>(5)
  const [locationType, setLocationType] = useState<string>('busy')
  const [cctvStatus, setCctvStatus] = useState<string>('yes')

  // 对方情况
  const [subjectCount, setSubjectCount] = useState<number>(1)
  const [subjectBehavior, setSubjectBehavior] = useState<string>('calm')

  // ===== Picker 相关 =====
  const [physicalPickerVisible, setPhysicalPickerVisible] = useState(false)
  const [physicalPickerRange] = useState(PHYSICAL_CONDITION_OPTIONS.map(o => o.label))
  const [physicalPickerIndex, setPhysicalPickerIndex] = useState(1) // 默认 '一般'

  // ===== 快捷场景点击 =====
  const handleQuickScene = useCallback((scene: string) => {
    setActiveScene(scene)
    setDescription(scene)
  }, [])

  // ===== Picker 变更 =====
  const handlePhysicalChange = useCallback((e: any) => {
    const index = e.detail.value as number
    setPhysicalPickerIndex(index)
    setPhysicalCondition(PHYSICAL_CONDITION_OPTIONS[index].value)
  }, [])

  // ===== AI 分析 =====
  const handleAnalyze = useCallback(() => {
    if (!description.trim()) {
      Taro.showToast({ title: '请描述你想做的善行', icon: 'none' })
      return
    }

    setStep('loading')

    // 模拟分析延迟
    setTimeout(() => {
      const userProfile: UserProfile = {
        physicalCondition,
        experienceLevel: 'normal',
      }

      const isIsolated = locationType === 'isolated'
      const hasCCTV = cctvStatus === 'yes'

      const env: EnvironmentContext = {
        timeOfDay: timeOfDay as EnvironmentContext['timeOfDay'],
        isWeekday: true,
        location: locationType === 'busy' ? '繁华街道' : locationType === 'community' ? '小区' : '偏僻路段',
        nearbyPeople,
        isIsolated,
        hasCCTV,
      }

      const subject: SubjectInfo = {
        count: subjectCount,
        behavior: subjectBehavior as SubjectInfo['behavior'],
        consciousness: subjectBehavior === 'unconscious' ? 'unconscious' : 'alert',
      }

      const action: KindnessAction = {
        type: guessActionType(description),
        description: description.trim(),
        urgency: guessUrgency(description),
      }

      const advisorResult = consultAIAdvisor(userProfile, env, subject, action)
      setResult(advisorResult)
      setStep('result')
    }, 1500)
  }, [description, physicalCondition, timeOfDay, nearbyPeople, locationType, cctvStatus, subjectCount, subjectBehavior])

  // ===== 重新评估 =====
  const handleReset = useCallback(() => {
    setStep('form')
    setResult(null)
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

  // ============================================
  // 渲染
  // ============================================

  return (
    <View className={styles.pageWrapper}>
      {step === 'form' && (
        <ScrollView scrollY className={styles.container}>
          {/* 引导卡片 */}
          <View className={`${styles.introCard} ${styles.fadeIn}`}>
            <View className={styles.introIcon}>🔮</View>
            <View className={styles.introTitle}>做好事前先问AI</View>
            <View className={styles.introDesc}>
              描述你想做的善行和周围环境，AI顾问将综合评判安全性，指导你如何安全地行善。
            </View>
          </View>

          {/* 善行描述 */}
          <View className={`${styles.formSection} ${styles.fadeIn}`}>
            <View className={styles.sectionTitle}>描述场景</View>
            <Input
              className={styles.descInput}
              placeholder='描述你想做的善行，如：看到老人摔倒在路边'
              value={description}
              onInput={(e: any) => {
                setDescription(e.detail.value)
                setActiveScene('')
              }}
            />

            {/* 快捷场景 */}
            <View className={styles.quickScenes}>
              <View className={styles.quickScenesLabel}>快捷场景</View>
              <ScrollView scrollX className={styles.quickScenesScroll}>
                <View className={styles.quickScenesInner}>
                  {QUICK_SCENES.map((scene) => (
                    <View
                      key={scene}
                      className={`${styles.quickSceneBtn} ${activeScene === scene ? styles.active : ''}`}
                      onClick={() => handleQuickScene(scene)}
                    >
                      {scene}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>

          {/* 自身状况 */}
          <View className={`${styles.formSection} ${styles.fadeIn}`}>
            <View className={styles.sectionTitle}>自身状况</View>
            <Picker
              mode='selector'
              range={physicalPickerRange}
              value={physicalPickerIndex}
              onChange={handlePhysicalChange}
            >
              <View className={styles.pickerRow}>
                <Text className={styles.pickerLabel}>身体状况</Text>
                <View style={{ display: 'flex', alignItems: 'center' }}>
                  <Text className={styles.pickerValue}>
                    {PHYSICAL_CONDITION_OPTIONS[physicalPickerIndex].label}
                  </Text>
                  <Text className={styles.pickerArrow}> ▾</Text>
                </View>
              </View>
            </Picker>
          </View>

          {/* 环境 */}
          <View className={`${styles.formSection} ${styles.fadeIn}`}>
            <View className={styles.sectionTitle}>环境信息</View>

            {/* 时间 */}
            <View className={styles.envOptions}>
              <View className={styles.envLabel}>时间</View>
              <View className={styles.envBtnGroup}>
                {TIME_OPTIONS.map((opt) => (
                  <View
                    key={opt.value}
                    className={`${styles.envBtn} ${timeOfDay === opt.value ? styles.active : ''}`}
                    onClick={() => setTimeOfDay(opt.value)}
                  >
                    {opt.label}
                  </View>
                ))}
              </View>
            </View>

            {/* 周围人数 */}
            <View className={styles.envOptions}>
              <View className={styles.envLabel}>周围人数</View>
              <View className={styles.envBtnGroup}>
                {PEOPLE_OPTIONS.map((opt) => (
                  <View
                    key={opt.value}
                    className={`${styles.envBtn} ${nearbyPeople === opt.value ? styles.active : ''}`}
                    onClick={() => setNearbyPeople(opt.value)}
                  >
                    {opt.label}
                  </View>
                ))}
              </View>
            </View>

            {/* 地点类型 */}
            <View className={styles.envOptions}>
              <View className={styles.envLabel}>地点类型</View>
              <View className={styles.envBtnGroup}>
                {LOCATION_OPTIONS.map((opt) => (
                  <View
                    key={opt.value}
                    className={`${styles.envBtn} ${locationType === opt.value ? styles.active : ''}`}
                    onClick={() => setLocationType(opt.value)}
                  >
                    {opt.label}
                  </View>
                ))}
              </View>
            </View>

            {/* 是否有监控 */}
            <View className={styles.envOptions}>
              <View className={styles.envLabel}>是否有监控</View>
              <View className={styles.envBtnGroup}>
                {CCTV_OPTIONS.map((opt) => (
                  <View
                    key={opt.value}
                    className={`${styles.envBtn} ${cctvStatus === opt.value ? styles.active : ''}`}
                    onClick={() => setCctvStatus(opt.value)}
                  >
                    {opt.label}
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* 对方情况 */}
          <View className={`${styles.formSection} ${styles.fadeIn}`}>
            <View className={styles.sectionTitle}>对方情况</View>

            <View className={styles.envOptions}>
              <View className={styles.envLabel}>对方人数</View>
              <View className={styles.envBtnGroup}>
                {SUBJECT_COUNT_OPTIONS.map((opt) => (
                  <View
                    key={opt.value}
                    className={`${styles.envBtn} ${subjectCount === opt.value ? styles.active : ''}`}
                    onClick={() => setSubjectCount(opt.value)}
                  >
                    {opt.label}
                  </View>
                ))}
              </View>
            </View>

            <View className={styles.envOptions}>
              <View className={styles.envLabel}>对方状态</View>
              <View className={styles.envBtnGroup}>
                {SUBJECT_BEHAVIOR_OPTIONS.map((opt) => (
                  <View
                    key={opt.value}
                    className={`${styles.envBtn} ${subjectBehavior === opt.value ? styles.active : ''}`}
                    onClick={() => setSubjectBehavior(opt.value)}
                  >
                    {opt.label}
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* AI分析按钮 */}
          <View
            className={`${styles.analyzeBtn} ${styles.fadeIn}`}
            onClick={handleAnalyze}
          >
            <Text className={styles.analyzeBtnIcon}>🔍</Text>
            <Text>AI 分析</Text>
          </View>
        </ScrollView>
      )}

      {step === 'loading' && (
        <View className={styles.loadingOverlay}>
          <View className={styles.loadingCard}>
            <View className={styles.loadingIcon}>🔮</View>
            <View className={styles.loadingText}>AI 正在分析场景...</View>
          </View>
        </View>
      )}

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

function guessActionType(desc: string): string {
  if (/老人|扶|摔倒/.test(desc)) return 'elder_help'
  if (/车|交通|撞/.test(desc)) return 'traffic'
  if (/救|溺水|落水|水域/.test(desc)) return 'rescue'
  if (/打|冲突|暴力|纠纷/.test(desc)) return 'conflict'
  if (/晕|急救|心脏/.test(desc)) return 'medical'
  if (/偷|抢/.test(desc)) return 'crime'
  return 'general'
}

function guessUrgency(desc: string): KindnessAction['urgency'] {
  if (/紧急|救命|昏迷|落水|溺水/.test(desc)) return 'critical'
  if (/撞|摔倒|事故/.test(desc)) return 'high'
  if (/偷|抢|纠纷/.test(desc)) return 'medium'
  return 'low'
}
