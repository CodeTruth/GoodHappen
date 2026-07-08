import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import styles from './index.module.scss'

const GUARD_ITEMS = [
  {
    icon: '🔗',
    title: '证据链报告',
    desc: '一键汇总保护模式证据，生成完整证据链',
    url: '/pages/evidence-report/index',
    color: '#2563EB',
    bg: 'rgba(37,99,235,0.08)',
    borderColor: 'rgba(37,99,235,0.15)',
  },
  {
    icon: '⚖️',
    title: '法律援助',
    desc: '专业法律咨询与援助指引',
    url: '/pages/legal-aid/index',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
    borderColor: 'rgba(124,58,237,0.15)',
  },
  {
    icon: '🛡️',
    title: '善行保险',
    desc: '行善意外保障，受伤可理赔',
    url: '/pages/insurance/index',
    color: '#16A34A',
    bg: 'rgba(22,163,74,0.08)',
    borderColor: 'rgba(22,163,74,0.15)',
  },
  {
    icon: '👁️',
    title: '网络见证',
    desc: 'AI搜索匹配事件见证资料',
    url: '/pages/witness-network/index',
    color: '#EA580C',
    bg: 'rgba(234,88,12,0.08)',
    borderColor: 'rgba(234,88,12,0.15)',
  },
  {
    icon: '📝',
    title: '一键诉状',
    desc: '基于证据链生成民事诉状草稿',
    url: '/pages/evidence-report/index?mode=lawsuit',
    color: '#DC2626',
    bg: 'rgba(220,38,38,0.08)',
    borderColor: 'rgba(220,38,38,0.15)',
  },
]

export default function KindnessGuardPage() {
  const handleItemClick = (url: string) => {
    Taro.navigateTo({ url })
  }

  return (
    <View className={styles.page}>
      {/* 顶部栏 */}
      <View className={styles.topBar}>
        <Text className={styles.backBtn} onClick={() => Taro.navigateBack()}>←</Text>
        <View className={styles.topInfo}>
          <Text className={styles.topTitle}>善行守护</Text>
          <Text className={styles.topSubtitle}>事后维权援助</Text>
        </View>
      </View>

      {/* 简介 */}
      <View className={styles.introCard}>
        <Text className={styles.introIcon}>🛡️</Text>
        <Text className={styles.introText}>
          行善后遇到纠纷？善行守护为你提供全方位维权支持
        </Text>
      </View>

      {/* 功能列表 */}
      <View className={styles.cardGrid}>
        {GUARD_ITEMS.map((item, i) => (
          <View
            key={i}
            className={styles.card}
            style={{ background: item.bg, borderColor: item.borderColor }}
            onClick={() => handleItemClick(item.url)}
          >
            <View className={styles.cardIconWrap} style={{ background: `${item.color}15` }}>
              <Text className={styles.cardIcon}>{item.icon}</Text>
            </View>
            <Text className={styles.cardTitle} style={{ color: item.color }}>{item.title}</Text>
            <Text className={styles.cardDesc}>{item.desc}</Text>
            <View className={styles.cardArrow} style={{ color: item.color }}>→</View>
          </View>
        ))}
      </View>

      {/* 底部提示 */}
      <View className={styles.footerTip}>
        <Text className={styles.footerTipText}>做好事不留名，但遇到不公我们守护你 💛</Text>
      </View>
    </View>
  )
}
