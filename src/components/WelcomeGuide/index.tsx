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
    title: '让每一件善行\n都被看见',
    desc: '好事发生，用AI记录温暖\n让善意被回应、被传承',
    icon: '🌟',
    bg: 'linear-gradient(135deg, #C4956A 0%, #D4A76A 100%)',
  },
  {
    title: 'AI先贤为你\n点赞喝彩',
    desc: '苏东坡、李白等8位历史人物\n以角色口吻回应你的善行',
    icon: '📜',
    bg: 'linear-gradient(135deg, #D4534A 0%, #E87B73 100%)',
  },
  {
    title: '福气值成长\n善有善报',
    desc: '每件善行积累福气值\n10级等级，可视化成长轨迹',
    icon: '✨',
    bg: 'linear-gradient(135deg, #7B9E87 0%, #A5C4AD 100%)',
  },
  {
    title: '善行圈·德育\n让学校更温暖',
    desc: '老师发布任务，学生提交善行\n班级看板、榜样墙、个人档案',
    icon: '🏫',
    bg: 'linear-gradient(135deg, #4A90A4 0%, #6CB8D0 100%)',
  },
];

const WelcomeGuide: React.FC<WelcomeGuideProps> = ({ visible, onClose }) => {
  const [current, setCurrent] = useState(0);

  if (!visible) return null;

  const isLast = current === GUIDE_STEPS.length - 1;

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
        {GUIDE_STEPS.map((step, idx) => (
          <SwiperItem key={idx}>
            <View className={styles.slide} style={{ background: step.bg }}>
              <Text className={styles.slideIcon}>{step.icon}</Text>
              <Text className={styles.slideTitle}>{step.title}</Text>
              <Text className={styles.slideDesc}>{step.desc}</Text>
            </View>
          </SwiperItem>
        ))}
      </Swiper>

      {/* 底部操作区 */}
      <View className={styles.bottom}>
        {/* 指示器 */}
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
            <Text className={styles.nextBtnText}>{isLast ? '开始善行之旅' : '下一步'}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default WelcomeGuide;
