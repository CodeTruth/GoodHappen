import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/store/user';
import { useKindnessStore } from '@/store/kindness';
import { useNotificationStore } from '@/store/notification';
import { useAnalyticsStore } from '@/store/analytics';
import { useFortuneStore } from '@/store/fortune';
import WelcomeGuide from '@/components/WelcomeGuide';
import styles from './index.module.scss';

const formatNumber = (num: number): string => {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  return num.toLocaleString('zh-CN');
};

const WHEEL_ITEMS = [
  { icon: '🤖', title: '善行顾问', desc: 'AI研判风险', url: '/pages/ai-advisor/index', gradient: 'linear-gradient(160deg, #8B5CF6 0%, #7C3AED 30%, #6D28D9 70%, #5B21B6 100%)' },
  { icon: '👁️', title: '善行见证', desc: '见证温暖', url: '/pages/witness-record/index', gradient: 'linear-gradient(160deg, #22C55E 0%, #16A34A 30%, #15803D 70%, #14532D 100%)' },
  { icon: '⚖️', title: '善行守护', desc: '维权援助', url: '/pages/kindness-guard/index', gradient: 'linear-gradient(160deg, #D4A356 0%, #C4956A 50%, #B8860B 100%)' },
  { icon: '🛡️', title: '善行保护', desc: '全程守护', url: '/pages/protection-mode/index', gradient: 'linear-gradient(160deg, #3B82F6 0%, #2563EB 30%, #1D4ED8 70%, #1E3A8A 100%)' },
];

const HomePage: React.FC = () => {
  useEffect(() => {
    try {
      const page = Taro.getCurrentInstance().page;
      if (page && Taro.getTabBar) {
        const tabbar = Taro.getTabBar<{ current: number }>(page);
        if (tabbar) tabbar.current = 0;
      }
    } catch { /* H5 不支持 */ }
  }, []);

  const [showWelcome, setShowWelcome] = useState(false);
  const [realtimeCount, setRealtimeCount] = useState(0);
  const [displayedStats, setDisplayedStats] = useState({
    total: 128643,
    today: 12,
    fortune: 280,
  });

  const userInfo = useUserStore((s) => s.userInfo);
  const { loadFromStorage: loadUser } = useUserStore();
  const { loadFromStorage: loadKindness } = useKindnessStore();
  const { loadFromStorage: loadNotification, loadMockData: loadMockNotification, cleanupExpired } = useNotificationStore();
  const {
    loadFromStorage: loadAnalytics,
    getTotalKindnessCount,
    getTodayKindnessCount,
    getRealtimeActiveCount,
  } = useAnalyticsStore();

  useEffect(() => {
    loadUser();
    loadKindness();
    loadNotification();
    loadMockNotification();
    cleanupExpired();
    loadAnalytics();

    const welcomeShown = Taro.getStorageSync('haoshi_welcome_shown');
    if (!welcomeShown) setShowWelcome(true);

    setRealtimeCount(getRealtimeActiveCount());
    setDisplayedStats({
      total: getTotalKindnessCount() || 128643,
      today: getTodayKindnessCount() || 12,
      fortune: useFortuneStore.getState().availableFortune || 280,
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setRealtimeCount(getRealtimeActiveCount());
    }, 10000);
    return () => clearInterval(timer);
  }, [getRealtimeActiveCount]);

  const growthTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const configs = [
      { key: 'total', interval: 3000 },
      { key: 'today', interval: 12000 },
      { key: 'fortune', interval: 15000 },
    ];
    configs.forEach((config) => {
      const grow = () => {
        const t = setTimeout(() => {
          setDisplayedStats((prev) => ({
            ...prev,
            [config.key]: prev[config.key as keyof typeof prev] + (Math.floor(Math.random() * 3) + 1),
          }));
          grow();
        }, config.interval + Math.random() * 3000);
        growthTimersRef.current.push(t);
      };
      grow();
    });
    return () => {
      growthTimersRef.current.forEach(clearTimeout);
      growthTimersRef.current = [];
    };
  }, []);

  // ===== SOS 操作 =====
  const handleSOS = (action: string) => {
    switch (action) {
      case 'police':
        Taro.makePhoneCall({ phoneNumber: '110' });
        break;
      case 'ambulance':
        Taro.makePhoneCall({ phoneNumber: '120' });
        break;
      case 'contact':
        handleEmergencyContact();
        break;
      case 'nearby':
        handleNearbyHelp();
        break;
    }
  };

  const handleEmergencyContact = () => {
    const contacts = userInfo?.emergencyContacts;
    if (contacts && contacts.length > 0) {
      Taro.showActionSheet({
        itemList: contacts.map((c) => `${c.name || '联系人'} ${c.phone}`),
        success: (res) => {
          Taro.makePhoneCall({ phoneNumber: contacts[res.tapIndex]?.phone || '' });
        },
      });
    } else {
      Taro.showModal({
        title: '暂无紧急联系人',
        content: '快去「我的」页面设置紧急联系人吧',
        confirmText: '去设置',
        success: ({ confirm }) => {
          if (confirm) Taro.switchTab({ url: '/pages/mine/index' });
        },
      });
    }
  };

  const handleNearbyHelp = () => {
    Taro.showModal({
      title: '向附近用户求助',
      content: '系统将向您附近的好事发生用户发送求助通知，需要获取您的位置信息',
      confirmText: '发送求助',
      success: ({ confirm }) => {
        if (confirm) {
          // H5环境使用 wgs84（浏览器原生坐标系），小程序环境用 gcj02
          const coordType = process.env.TARO_ENV === 'h5' ? 'wgs84' as const : 'gcj02' as const;
          Taro.getLocation({ type: coordType })
            .then(() => {
              Taro.showToast({ title: '求助已发送，请保持手机畅通', icon: 'success', duration: 3000 });
            })
            .catch((err) => {
              const msg = String(err?.errMsg || err?.message || '');
              if (msg.includes('auth deny') || msg.includes('denied') || msg.includes('permission')) {
                Taro.showModal({
                  title: '需要定位权限',
                  content: '请在手机「设置」中允许本应用获取位置信息',
                  showCancel: false,
                  confirmText: '知道了',
                });
              } else {
                Taro.showToast({ title: '定位失败，请确认已开启GPS并授权定位', icon: 'none', duration: 3000 });
              }
            });
        }
      },
    });
  };

  // ===== 善行守护转盘 =====
  const [rotation, setRotation] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const wheelContainerRef = useRef<any>(null);
  const wheelRotateRef = useRef<any>(null);
  const cardRefs = useRef<(any | null)[]>([]);
  const touchStartAngleRef = useRef(0);
  const rotationAtTouchStartRef = useRef(0);
  const velocityHistoryRef = useRef<{ time: number; angle: number }[]>([]);
  const animFrameRef = useRef<number>(0);
  const velocityRef = useRef(0);
  const currentRotationRef = useRef(0);

  // 用 translateX/Y 定位（不用 rotate），保证卡片内容始终正向
  const CARD_POSITIONS = [
    'translateY(-100px)',   // i=0 上方
    'translateX(100px)',    // i=1 右方
    'translateY(100px)',    // i=2 下方
    'translateX(-100px)',   // i=3 左方
  ];

  // 统一更新转盘 transform
  const updateWheelTransform = (rot: number, highlightIdx: number) => {
    if (typeof document === 'undefined') return;
    const rotateEl = document.querySelector('[class*="wheelRotate"]') as HTMLElement | null;
    if (rotateEl) rotateEl.style.transform = `rotate(${rot}deg)`;
    const cards = document.querySelectorAll('[class*="wheelCard___R_QDI"]') as NodeListOf<HTMLElement>;
    cards.forEach((card, i) => {
      const isActive = highlightIdx === i;
      const scale = isActive ? 1.15 : 0.9;
      card.style.transform = `${CARD_POSITIONS[i]} rotate(${-rot}deg) scale(${scale})`;
    });
  };

  // 控制 transition：拖拽时关闭，snap/点击时开启
  const setWheelTransition = (enable: boolean) => {
    if (typeof document === 'undefined') return;
    const rotateEl = document.querySelector('[class*="wheelRotate"]') as HTMLElement | null;
    const cards = document.querySelectorAll('[class*="wheelCard___R_QDI"]') as NodeListOf<HTMLElement>;
    const transition = enable ? 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none';
    if (rotateEl) rotateEl.style.transition = transition;
    cards.forEach(card => card.style.transition = transition);
  };

  useEffect(() => {
    updateWheelTransform(rotation, highlightedIndex);
  }, [rotation, highlightedIndex]);

  // 计算触摸点相对圆心的角度
  const getAngleFromCenter = (clientX: number, clientY: number) => {
    if (wheelContainerRef.current) {
      const rect = wheelContainerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    }
    return 0;
  };

  // 规范化角度到 [-180, 180]
  const normalizeDelta = (delta: number) => {
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return delta;
  };

  // touchstart: 记录起始角度和当前旋转角度
  const handleTouchStart = (e: any) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    setIsAnimating(true);
    setWheelTransition(false); // 拖拽时关闭 transition，避免滞后
    const touch = e.touches[0];
    touchStartAngleRef.current = getAngleFromCenter(touch.clientX, touch.clientY);
    rotationAtTouchStartRef.current = rotation;
    velocityHistoryRef.current = [];
    velocityRef.current = 0;
  };

  // touchmove: 计算角度差，更新旋转
  const handleTouchMove = (e: any) => {
    const touch = e.touches[0];
    const currentAngle = getAngleFromCenter(touch.clientX, touch.clientY);
    const delta = normalizeDelta(currentAngle - touchStartAngleRef.current);
    const newRotation = rotationAtTouchStartRef.current + delta;
    setRotation(newRotation);
    currentRotationRef.current = newRotation;
    // 记录角速度历史（最近5个点）
    const now = Date.now();
    velocityHistoryRef.current.push({ time: now, angle: newRotation });
    if (velocityHistoryRef.current.length > 5) {
      velocityHistoryRef.current.shift();
    }
  };

  // touchend: 计算惯性，开始动画
  const handleTouchEnd = () => {
    const history = velocityHistoryRef.current;
    if (history.length >= 2) {
      const first = history[0];
      const last = history[history.length - 1];
      const dt = (last.time - first.time) / 1000; // 秒
      if (dt > 0) {
        velocityRef.current = (last.angle - first.angle) / dt; // deg/s
      }
    }
    startInertiaAnimation();
  };

  // H5 mouse 事件支持
  const handleMouseDown = (e: any) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    setIsAnimating(true);
    setWheelTransition(false); // 拖拽时关闭 transition
    touchStartAngleRef.current = getAngleFromCenter(e.clientX, e.clientY);
    rotationAtTouchStartRef.current = rotation;
    velocityHistoryRef.current = [];
    velocityRef.current = 0;
    // 绑定 mousemove 和 mouseup 到 window
    const onMouseMove = (ev: any) => {
      const currentAngle = getAngleFromCenter(ev.clientX, ev.clientY);
      const delta = normalizeDelta(currentAngle - touchStartAngleRef.current);
      const newRotation = rotationAtTouchStartRef.current + delta;
      setRotation(newRotation);
      currentRotationRef.current = newRotation;
      const now = Date.now();
      velocityHistoryRef.current.push({ time: now, angle: newRotation });
      if (velocityHistoryRef.current.length > 5) {
        velocityHistoryRef.current.shift();
      }
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      const history = velocityHistoryRef.current;
      if (history.length >= 2) {
        const first = history[0];
        const last = history[history.length - 1];
        const dt = (last.time - first.time) / 1000;
        if (dt > 0) {
          velocityRef.current = (last.angle - first.angle) / dt;
        }
      }
      startInertiaAnimation();
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // 惯性动画
  const startInertiaAnimation = () => {
    setIsAnimating(true);
    const friction = 0.95;
    let currentRot = currentRotationRef.current;
    let vel = velocityRef.current;
    let lastTime = Date.now();

    const animate = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      vel *= friction;
      currentRot += vel * dt;

      if (Math.abs(vel) < 0.5) {
        snapToNearest(currentRot);
        return;
      }

      setRotation(currentRot);
      currentRotationRef.current = currentRot;
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
  };

  // snap 吸附到最近的 90 度倍数
  const snapToNearest = (currentRot: number) => {
    const snapped = Math.round(currentRot / 90) * 90;
    setWheelTransition(true); // snap 时开启 transition，平滑吸附
    setRotation(snapped);
    currentRotationRef.current = snapped;
    // 更新高亮索引
    const normalizedAngle = ((snapped % 360) + 360) % 360;
    // rotation=0 时 12 点是索引 0；rotation=-90 时 12 点是索引 1
    const idx = ((Math.round(-snapped / 90) % 4) + 4) % 4;
    setHighlightedIndex(idx);
    setTimeout(() => setIsAnimating(false), 450);
  };

  // 点击卡片
  const handleWheelCardClick = (index: number) => {
    if (isAnimating) return;
    if (index !== highlightedIndex) {
      // 旋转到该卡片：计算需要旋转的角度差
      const targetRotation = -index * 90;
      const currentSnapped = Math.round(rotation / 90) * 90;
      let diff = targetRotation - currentSnapped;
      // 选择最短路径
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      setIsAnimating(true);
      const snapped = currentSnapped + diff;
      // 用 requestAnimationFrame 做平滑旋转动画
      const startRot = currentSnapped;
      const totalDelta = snapped - startRot;
      const duration = 400; // ms
      const startTime = Date.now();

      const animateRotate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out 缓动
        const eased = 1 - Math.pow(1 - progress, 3);
        const cur = startRot + totalDelta * eased;
        setRotation(cur);
        currentRotationRef.current = cur;

        if (progress < 1) {
          animFrameRef.current = requestAnimationFrame(animateRotate);
        } else {
          setRotation(snapped);
          currentRotationRef.current = snapped;
          setHighlightedIndex(index);
          setTimeout(() => setIsAnimating(false), 350);
        }
      };
      animFrameRef.current = requestAnimationFrame(animateRotate);
      return;
    }
    // 高亮卡片直接跳转
    Taro.navigateTo({ url: WHEEL_ITEMS[index].url });
  };

  // 组件卸载清理
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <View className={styles.pageWrapper}>
      <ScrollView className={styles.contentScroll} scrollY enableBackToTop>
        <View className={styles.page}>
          <WelcomeGuide visible={showWelcome} onClose={() => setShowWelcome(false)} />

          {/* 顶部信息区：Slogan + 实时人数 + 统计数据 */}
          <View className={styles.headerBar}>
            <View className={styles.headerTop}>
              <Text className={styles.headerSlogan}>让每一次善行都被守护</Text>
              <View className={styles.headerLive}>
                <View className={styles.liveDot} />
                <Text className={styles.liveText}>当前 {realtimeCount} 人正在行善</Text>
              </View>
            </View>
            <View className={styles.headerStats}>
              <View className={styles.headerStatItem}>
                <Text className={styles.headerStatValue}>{formatNumber(displayedStats.total)}</Text>
                <Text className={styles.headerStatLabel}>我的累计善行</Text>
              </View>
              <View className={styles.headerStatDivider} />
              <View className={styles.headerStatItem}>
                <Text className={styles.headerStatValue}>{formatNumber(displayedStats.today)}</Text>
                <Text className={styles.headerStatLabel}>我的今日善行</Text>
              </View>
              <View className={styles.headerStatDivider} />
              <View className={styles.headerStatItem}>
                <Text className={styles.headerStatValue}>{formatNumber(displayedStats.fortune)}</Text>
                <Text className={styles.headerStatLabel}>我的福气值</Text>
              </View>
            </View>
          </View>

          {/* ===== 善行守护转盘 ===== */}
          <View
            className={styles.wheelContainer}
            ref={wheelContainerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
          >
            {/* 转盘背景圆盘 */}
            <View className={styles.wheelDisc} />
            <View className={styles.wheelRing} />

            {/* 分隔线（4条，间隔90度）*/}
            {[0, 90, 180, 270].map((deg) => (
              <View
                key={deg}
                className={styles.wheelDivider}
                style={{ transform: `rotate(${deg}deg)` }}
              />
            ))}

            {/* 旋转容器 — 用原生div绕过Taro对transform的拦截 */}
            <div
              className={styles.wheelRotate}
              ref={wheelRotateRef}
            >
              {WHEEL_ITEMS.map((item, i) => {
                const isActive = highlightedIndex === i;
                return (
                  <div
                    key={i}
                    className={`${styles.wheelCard} ${isActive ? styles.wheelCardActive : ''}`}
                    ref={(el) => { cardRefs.current[i] = el }}
                    style={{ background: item.gradient }}
                    onClick={() => handleWheelCardClick(i)}
                  >
                    <span className={styles.wheelCardIcon}>{item.icon}</span>
                    <span className={styles.wheelCardTitle}>{item.title}</span>
                    <span className={styles.wheelCardDesc}>{item.desc}</span>
                  </div>
                );
              })}
            </div>

            {/* 中心善字（不旋转） */}
            <div className={styles.wheelCenter}>
              <span className={styles.wheelCenterText}>善</span>
            </div>
          </View>

          {/* ===== SOS 紧急求助面板 ===== */}
          <View className={styles.sosSection}>
            <View className={styles.sosGrid}>
              <View className={styles.sosItem} onClick={() => handleSOS('police')}>
                <View className={`${styles.sosIconWrap} ${styles.sosIconRed}`}>
                  <Text className={styles.sosItemIcon}>🚔</Text>
                </View>
                <Text className={styles.sosItemLabel}>报警 110</Text>
              </View>

              <View className={styles.sosItem} onClick={() => handleSOS('ambulance')}>
                <View className={`${styles.sosIconWrap} ${styles.sosIconRed}`}>
                  <Text className={styles.sosItemIcon}>🚑</Text>
                </View>
                <Text className={styles.sosItemLabel}>急救 120</Text>
              </View>

              <View className={styles.sosItem} onClick={() => handleSOS('contact')}>
                <View className={`${styles.sosIconWrap} ${styles.sosIconOrange}`}>
                  <Text className={styles.sosItemIcon}>👤</Text>
                </View>
                <Text className={styles.sosItemLabel}>紧急联系人</Text>
              </View>

              <View className={styles.sosItem} onClick={() => handleSOS('nearby')}>
                <View className={`${styles.sosIconWrap} ${styles.sosIconOrange}`}>
                  <Text className={styles.sosItemIcon}>📍</Text>
                </View>
                <Text className={styles.sosItemLabel}>附近求助</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default HomePage;