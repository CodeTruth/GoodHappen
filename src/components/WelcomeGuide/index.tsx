import React, { useState } from 'react';
import { View, Text, Swiper, SwiperItem } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

interface WelcomeGuideProps {
  visible: boolean;
  onClose: () => void;
}

interface Feature {
  icon: string;
  text: string;
}

interface GuideStep {
  headline: string;
  title: string;
  desc: string;
  features: Feature[];
  bg: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    headline: '欢迎来到',
    title: '好事发生',
    desc: '让每一件善行都被看见\n用AI记录温暖，让善意被回应、被传承',
    features: [],
    bg: 'linear-gradient(135deg, #C4956A 0%, #D4A76A 100%)',
  },
  {
    headline: '行善前犹豫？',
    title: 'AI顾问帮你评估',
    desc: '不确定安不安全？先问问AI',
    features: [
      { icon: '💬', text: 'AI善行顾问分析现场风险' },
      { icon: '📜', text: '8位历史人物给你智慧建议' },
      { icon: '🔮', text: '确认安全再行动，不做盲目英雄' },
    ],
    bg: 'linear-gradient(135deg, #E67E22 0%, #F0A050 100%)',
  },
  {
    headline: '行善中被讹？',
    title: '全程保护不留隐患',
    desc: '一键开启，全程自动存证',
    features: [
      { icon: '📹', text: '录像+录音+GPS自动存证' },
      { icon: '🆘', text: '一键SOS紧急求助' },
      { icon: '🛡️', text: '网络见证人实时围观' },
    ],
    bg: 'linear-gradient(135deg, #1A73E8 0%, #4A90D9 100%)',
  },
  {
    headline: '万一被讹不用怕',
    title: '法律保险全程兜底',
    desc: '我们为你的善良保驾护航',
    features: [
      { icon: '⚖️', text: '专业律师团队法律援助' },
      { icon: '📁', text: '完整证据链自动提交' },
      { icon: '🏥', text: '善行保险赔付兜底' },
    ],
    bg: 'linear-gradient(135deg, #D4534A 0%, #E87B73 100%)',
  },
  {
    headline: '善行有回报',
    title: '善良成为流通货币',
    desc: '每一份善意，都该被世界认可',
    features: [
      { icon: '✨', text: '记录善行积累福气值' },
      { icon: '🎫', text: '福气兑换折扣券、公益商品' },
      { icon: '🏆', text: '10级成长体系，可视化成就' },
    ],
    bg: 'linear-gradient(135deg, #34A853 0%, #5BBF7A 100%)',
  },
];

const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ visible, onClose }) => {
  const [current, setCurrent] = useState(0);

  if (!visible) return null;

  const isLast = current === GUIDE_STEPS.length - 1;
  const step = GUIDE_STEPS[current];
  const isSlogan = current === 0;

  const handleSkip = () => {
    Taro.setStorageSync('haoshi_welcome_shown', 'true');
    onClose();
  };

  const handleNext = () => {
    if (isLast) {
      handleSkip();
    } else {
      setCurrent(current + 1);
    }
  };

  return (
    <View className={styles.overlay}>
      <Swiper
        className={styles.swiper}
        current={current}
        onChange={(e) => setCurrent(e.detail.current)}
        circular={false}
      >
        {GUIDE_STEPS.map((s, idx) => (
          <SwiperItem key={idx}>
            <View className={styles.slide} style={{ background: s.bg }}>
              {/* Slogan 页特殊布局 */}
              {idx === 0 ? (
                <>
                  <Text className={styles.sloganIcon}>🌟</Text>
                  <Text className={styles.sloganHeadline}>{s.headline}</Text>
                  <Text className={styles.sloganTitle}>{s.title}</Text>
                  <Text className={styles.sloganDesc}>{s.desc}</Text>
                </>
              ) : (
                <>
                  <Text className={styles.stepHeadline}>{s.headline}</Text>
                  <Text className={styles.stepTitle}>{s.title}</Text>
                  <Text className={styles.stepDesc}>{s.desc}</Text>

                  {/* Feature 卡片 */}
                  <View className={styles.features}>
                    {s.features.map((f, fidx) => (
                      <View key={fidx} className={styles.featureCard}>
                        <Text className={styles.featureIcon}>{f.icon}</Text>
                        <Text className={styles.featureText}>{f.text}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </View>
          </SwiperItem>
        ))}
      </Swiper>

      {/* 底部操作区 */}
      <View className={styles.bottom}>
        <View className={styles.indicators}>
          {GUIDE_STEPS.map((_, idx) => (
            <View
              key={idx}
              className={`${styles.dot} ${idx === current ? styles.dotActive : ''}`}
            />
          ))}
        </View>

        <View className={styles.actions}>
          {!isLast && (
            <Text className={styles.skipBtn} onClick={handleSkip}>跳过</Text>
          )}
          <View className={styles.nextBtn} onClick={handleNext}>
            <Text className={styles.nextBtnText}>
              {isSlogan ? '了解如何保护善行者' : isLast ? '开始善行之旅' : '下一步'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default WelcomeGuide;
