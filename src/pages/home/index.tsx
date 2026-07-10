import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  // 分步加载 Store — 首屏优先加载关键数据
  useEffect(() => {
    // 第1批：关键数据，立即加载
    loadUser();
    loadAnalytics();

    // 第2批：非关键数据，延迟加载
    const t1 = setTimeout(() => {
      loadKindness();
    }, 200);
    const t2 = setTimeout(() => {
      loadNotification();
      loadMockNotification();
      cleanupExpired();
    }, 500);

    // 初始化统计数据
    setRealtimeCount(getRealtimeActiveCount());
    setDisplayedStats({
      total: getTotalKindnessCount() || 128643,
      today: getTodayKindnessCount() || 12,
      fortune: useFortuneStore.getState().availableFortune || 280,
    });

    const welcomeShown = Taro.getStorageSync('haoshi_welcome_shown');
    if (!welcomeShown) setShowWelcome(true);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // 实时人数更新（长间隔，不影响性能）
  useEffect(() => {
    const timer = setInterval(() => {
      setRealtimeCount(getRealtimeActiveCount());
    }, 30000); // 从10秒改为30秒
    return () => clearInterval(timer);
  }, [getRealtimeActiveCount]);

  // 数字增长动画 — 改用合并更新，减少渲染次数
  const growthTimersRef = useRef<ReturnType<typeof setInterval>[]>([]);
  useEffect(() => {
    // 改为每次整体更新，减少单属性setState次数
    const interval = setInterval(() => {
      setDisplayedStats((prev) => ({
        total: prev.total + (Math.floor(Math.random() * 3) + 1),
        today: prev.today + (Math.random() > 0.6 ? 1 : 0),
        fortune: prev.fortune + (Math.floor(Math.random() * 2) + 1),
      }));
    }, 8000);
    growthTimersRef.current.push(interval as any);
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      growthTimersRef.current.forEach((t: any) => clearInterval(t));
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
  const wheelRotateRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const touchStartAngleRef = useRef(0);
  const rotationAtTouchStartRef = useRef(0);
  const velocityHistoryRef = useRef<{ time: number; angle: number }[]>([]);
  const animFrameRef = useRef<number>(0);
  const velocityRef = useRef(0);
  const currentRotationRef = useRef(0);
  const isTouchingRef = useRef(false);

  // 用 translateX/Y 定位（不用 rotate），保证卡片内容始终正向
  const CARD_POSITIONS = [
    'translateY(-100px)',   // i=0 上方
    'translateX(100px)',    // i=1 右方
    'translateY(100px)',    // i=2 下方
    'translateX(-100px)',   // i=3 左方
  ];

  // 统一更新转盘 transform — 用 ref 替代 querySelector
  const updateWheelTransform = useCallback((rot: number, highlightIdx: number) => {
    const rotateEl = wheelRotateRef.current;
    if (!rotateEl) return;
    rotateEl.style.transform = `rotate(${rot}deg)`;

    const cards = cardRefs.current;
    cards.forEach((card, i) => {
      if (!card) return;
      const isActive = highlightIdx === i;
      const scale = isActive ? 1.15 : 0.9;
      card.style.transform = `${CARD_POSITIONS[i]} rotate(${-rot}deg) scale(${scale})`;
    });
  }, []);

  // 控制 transition
  const setWheelTransition = useCallback((enable: boolean) => {
    const rotateEl = wheelRotateRef.current;
    if (!rotateEl) return;
    const transition = enable ? 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none';
    rotateEl.style.transition = transition;
    const cards = cardRefs.current;
    cards.forEach(card => {
      if (card) card.style.transition = transition;
    });
  }, []);

  useEffect(() => {
    updateWheelTransform(rotation, highlightedIndex);
  }, [rotation, highlightedIndex, updateWheelTransform]);

  // touchmove 节流：只在 requestAnimationFrame 中更新，避免过度渲染
  const touchMovePendingRef = useRef(false);
  const lastTouchMoveRef = useRef<{ clientX: number; clientY: number } | null>(null);

  // 计算触摸点相对圆心的角度
  const getAngleFromCenter = useCallback((clientX: number, clientY: number) => {
    if (wheelContainerRef.current) {
      const rect = wheelContainerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
    }
    return 0;
  }, []);

  // 规范化角度到 [-180, 180]
  const normalizeDelta = useCallback((delta: number) => {
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return delta;
  }, []);

  // 节流后的触摸移动处理
  const processTouchMove = useCallback(() => {
    touchMovePendingRef.current = false;
    const touch = lastTouchMoveRef.current;
    if (!touch) return;
    lastTouchMoveRef.current = null;

    const currentAngle = getAngleFromCenter(touch.clientX, touch.clientY);
    const delta = normalizeDelta(currentAngle - touchStartAngleRef.current);
    const newRotation = rotationAtTouchStartRef.current + delta;
    setRotation(newRotation);
    currentRotationRef.current = newRotation;
    const now = Date.now();
    velocityHistoryRef.current.push({ time: now, angle: newRotation });
    if (velocityHistoryRef.current.length > 5) {
      velocityHistoryRef.current.shift();
    }
  }, [getAngleFromCenter, normalizeDelta]);

  // touchstart: 记录起始角度和当前旋转角度
  const handleTouchStart = (e: any) => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    setIsAnimating(true);
    isTouchingRef.current = true;
    setWheelTransition(false); // 拖拽时关闭 transition，避免滞后
    const touch = e.touches[0];
    touchStartAngleRef.current = getAngleFromCenter(touch.clientX, touch.clientY);
    rotationAtTouchStartRef.current = rotation;
    velocityHistoryRef.current = [];
    velocityRef.current = 0;
  };

  // touchmove: 节流处理，不直接更新 state
  const handleTouchMove = (e: any) => {
    e.preventDefault();
    const touch = e.touches[0];
    lastTouchMoveRef.current = { clientX: touch.clientX, clientY: touch.clientY };
    if (!touchMovePendingRef.current) {
      touchMovePendingRef.current = true;
      requestAnimationFrame(processTouchMove);
    }
  };

  // touchend: 计算惯性，开始动画
  const handleTouchEnd = () => {
    isTouchingRef.current = false;
    // 处理残留的 touchmove
    if (touchMovePendingRef.current) {
      touchMovePendingRef.current = false;
      const touch = lastTouchMoveRef.current;
      if (touch) {
        const currentAngle = getAngleFromCenter(touch.clientX, touch.clientY);
        const delta = normalizeDelta(currentAngle - touchStartAngleRef.current);
        const newRotation = rotationAtTouchStartRef.current + delta;
        currentRotationRef.current = newRotation;
        const now = Date.now();
        velocityHistoryRef.current.push({ time: now, angle: newRotation });
        if (velocityHistoryRef.current.length > 5) velocityHistoryRef.current.shift();
      }
    }
    lastTouchMoveRef.current = null;
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
    isTouchingRef.current = true;
    setWheelTransition(false); // 拖拽时关闭 transition
    touchStartAngleRef.current = getAngleFromCenter(e.clientX, e.clientY);
    rotationAtTouchStartRef.current = rotation;
    velocityHistoryRef.current = [];
    velocityRef.current = 0;
    // 绑定 mousemove 和 mouseup 到 window
    const onMouseMove = (ev: any) => {
      lastTouchMoveRef.current = { clientX: ev.clientX, clientY: ev.clientY };
      if (!touchMovePendingRef.current) {
        touchMovePendingRef.current = true;
        requestAnimationFrame(processTouchMove);
      }
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      isTouchingRef.current = false;
      if (touchMovePendingRef.current) {
        touchMovePendingRef.current = false;
        const touch = lastTouchMoveRef.current;
        if (touch) {
          const currentAngle = getAngleFromCenter(touch.clientX, touch.clientY);
          const delta = normalizeDelta(currentAngle - touchStartAngleRef.current);
          const newRotation = rotationAtTouchStartRef.current + delta;
          currentRotationRef.current = newRotation;
          const now = Date.now();
          velocityHistoryRef.current.push({ time: now, angle: newRotation });
          if (velocityHistoryRef.current.length > 5) velocityHistoryRef.current.shift();
        }
      }
      lastTouchMoveRef.current = null;
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

  // 点击卡片 — 直接跳转，不再旋转
  const handleWheelCardClick = (index: number) => {
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
              <Text className={styles.headerSlogan}>放心行善，身后有光</Text>
              <View className={styles.headerLive}>
                <View className={styles.liveDot} />
                <Text className={styles.liveText}>当前 {realtimeCount} 人正在行善</Text>
              </View>
            </View>
            <View className={styles.headerStats}>
              <View className={styles.headerStatItem}>
                <Text className={styles.headerStatIcon}>🌍</Text>
                <Text className={styles.headerStatValue}>{formatNumber(displayedStats.total)}</Text>
                <Text className={styles.headerStatLabel}>全网善行</Text>
                <Text className={styles.headerStatSub}>次温暖传递</Text>
              </View>
              <View className={styles.headerStatDivider} />
              <View className={styles.headerStatItem}>
                <Text className={styles.headerStatIcon}>📅</Text>
                <Text className={styles.headerStatValue}>{formatNumber(displayedStats.today)}</Text>
                <Text className={styles.headerStatLabel}>本日行善</Text>
                <Text className={styles.headerStatSub}>次善行记录</Text>
              </View>
              <View className={styles.headerStatDivider} />
              <View className={styles.headerStatItem}>
                <Text className={styles.headerStatIcon}>✨</Text>
                <Text className={styles.headerStatValue}>{formatNumber(displayedStats.fortune)}</Text>
                <Text className={styles.headerStatLabel}>福气值</Text>
                <Text className={styles.headerStatSub}>Lv.{Math.floor(displayedStats.fortune / 100) + 1}</Text>
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
                    style={{ background: item.gradient } as React.CSSProperties}
                    onClick={() => handleWheelCardClick(i)}
                  >
                    <span className={styles.wheelCardIcon}>{item.icon}</span>
                    <span className={styles.wheelCardTitle}>{item.title}</span>
                    <span className={styles.wheelCardDesc}>{item.desc}</span>
                  </div>
                );
              })}
            </div>

            {/* 中心星光（不旋转） */}
            <div className={styles.wheelCenter}>
              <span className={styles.wheelCenterText}>✨</span>
            </div>
          </View>

        </View>
      </ScrollView>
    </View>
  );
};

export default HomePage;