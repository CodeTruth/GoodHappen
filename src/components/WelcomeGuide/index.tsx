import React, { useState } from 'react';
import { View, Text, Swiper, SwiperItem } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

interface WelcomeGuideProps {
  visible: boolean;
  onClose: () => void;
}

const GUIDE_STEPS = [
  {
    // ===== 第1页：Slogan =====
    icon: '🌟',
    headline: '好事发生',
    slogan: '让每一件善行，\n被看见、被记录、被奖励。',
    sub: '降低行善门槛，消除善行顾虑，给每一份善意正反馈。',
    bg: 'linear-gradient(135deg, #C4956A 0%, #E8C9A0 100%)',
  },
  {
    // ===== 第2页：全方位善行保护 =====
    headline: '全方位善行保护',
    sub: '从行善前到行善后，每个环节都有保障',
    features: [
      { icon: '💬', label: 'AI善行顾问', desc: '行善前风险评估' },
      { icon: '📹', label: '网络见证', desc: '录像录音GPS存证' },
      { icon: '🛡️', label: '善行保护', desc: '一键SOS紧急求助' },
      { icon: '⚖️', label: '法律援助', desc: '专业律师兜底' },
      { icon: '🏥', label: '善行保险', desc: '赔付保障无后顾' },
      { icon: '✨', label: '福气回报', desc: '善行兑换商品折扣' },
    ],
    bg: 'linear-gradient(135deg, #34A853 0%, #5BBF7A 100%)',
  },
];

const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ visible, onClose }) => {
  const [current, setCurrent] = useState(0);

  if (!visible) return null;

  const isLast = current === GUIDE_STEPS.length - 1;
  const step = GUIDE_STEPS[current];

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
              {idx === 0 ? (
                /* ===== 第1页：Slogan ===== */
                <>
                  <Text className={styles.sloganIcon}>{s.icon}</Text>
                  <Text className={styles.sloganHeadline}>{s.headline}</Text>
                  <Text className={styles.sloganText}>{s.slogan}</Text>
                  <View className={styles.sloganDivider} />
                  <Text className={styles.sloganSub}>{s.sub}</Text>
                </>
              ) : (
                /* ===== 第2页：功能特性 ===== */
                <>
                  <Text className={styles.stepHeadline}>{s.headline}</Text>
                  <Text className={styles.stepSub}>{s.sub}</Text>
                  <View className={styles.featureGrid}>
                    {s.features.map((f, fidx) => (
                      <View key={fidx} className={styles.featureItem}>
                        <View className={styles.featureIconWrap}>
                          <Text className={styles.featureIcon}>{f.icon}</Text>
                        </View>
                        <Text className={styles.featureLabel}>{f.label}</Text>
                        <Text className={styles.featureDesc}>{f.desc}</Text>
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
              {isLast ? '开始体验' : '了解更多'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default WelcomeGuide;
