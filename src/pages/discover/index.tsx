import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/store/user';
import { useKindnessStore } from '@/store/kindness';
import { getActiveInspirations, getSelfCareTasks, getOrgTasks, type WeeklyInspiration } from '@/data/weekly-challenges';
import { CHALLENGES } from '@/data/challenge-data';
import styles from './index.module.scss';

function getLocalDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ============================================
// 连续天数工具
// ============================================

const STREAK_KEY = 'haoshi_streak_data';

interface StreakData {
  lastActiveDate: string;
  count: number;
  todayRecorded: number;
}

function loadStreak(): StreakData {
  try {
    const raw = Taro.getStorageSync(STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { lastActiveDate: '', count: 0, todayRecorded: 0 };
}

function saveStreak(data: StreakData) {
  Taro.setStorageSync(STREAK_KEY, JSON.stringify(data));
}

function getStreakStatus(): { displayCount: number; todayCompleted: number; isCheckedIn: boolean } {
  const data = loadStreak();
  const todayStr = getLocalDateStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);

  let displayCount = data.count;
  if (data.lastActiveDate !== todayStr && data.lastActiveDate !== yesterdayStr && data.lastActiveDate !== '') {
    displayCount = 0;
  }

  return {
    displayCount,
    todayCompleted: data.lastActiveDate === todayStr ? data.todayRecorded : 0,
    isCheckedIn: data.lastActiveDate === todayStr,
  };
}

function recordCompletion(): { count: number; todayRecorded: number } {
  const data = loadStreak();
  const todayStr = getLocalDateStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getLocalDateStr(yesterday);

  if (data.lastActiveDate === todayStr) {
    data.todayRecorded = (data.todayRecorded || 0) + 1;
  } else if (data.lastActiveDate === yesterdayStr) {
    data.count += 1;
    data.lastActiveDate = todayStr;
    data.todayRecorded = 1;
  } else {
    data.count = 1;
    data.lastActiveDate = todayStr;
    data.todayRecorded = 1;
  }

  saveStreak(data);
  return { count: data.count, todayRecorded: data.todayRecorded };
}

// ============================================
// 防灌水
// ============================================

const MAX_DAILY_RECORDS = 10;

function checkFloodControl(): string | null {
  const data = loadStreak();
  const today = getLocalDateStr();
  if (data.lastActiveDate !== today) return null;
  if ((data.todayRecorded || 0) >= MAX_DAILY_RECORDS) {
    return `每天最多记录 ${MAX_DAILY_RECORDS} 件善行，今天已完成。明天再继续吧 🌟`;
  }
  return null;
}

// ============================================
// 善行接力 模拟数据
// ============================================

interface RelayLink {
  id: string;
  name: string;
  avatar: string;
  content: string;
  time: string;
  relation: string;
}

const RELAY_CHAINS: RelayLink[][] = [
  [
    { id: 'r1', name: '小明', avatar: '😊', content: '下雨天看到快递员的电动车滑倒了，箱子散了一地，赶紧跑过去帮他扶起来、捡回包裹。他连声道谢的时候，我觉得举手之劳而已，但心里暖暖的。', time: '今天 09:30', relation: '发起' },
    { id: 'r2', name: '小红', avatar: '🌸', content: '看到楼下张奶奶拎着两大袋菜爬楼梯，腿都在抖，我赶紧接过来说我帮您。她笑得眼睛都眯起来了，还非要给我塞个橘子。被信任的感觉真好。', time: '今天 10:15', relation: '接棒' },
    { id: 'r3', name: '阿强', avatar: '🐕', content: '小区角落有只流浪猫缩在车底下，大热天的也不动。放了碗水和猫粮在旁边，躲远了一点看它小心翼翼地吃起来，尾巴还轻轻晃了。突然觉得生命好可爱。', time: '今天 11:20', relation: '接棒' },
    { id: 'r4', name: '??', avatar: '❓', content: '等你来接棒…', time: '', relation: '下一棒' },
  ],
  [
    { id: 's1', name: '李老师', avatar: '👨\u200D🏫', content: '给一个平时不怎么发言的学生的家长打了电话，专门表扬了孩子最近的进步。挂电话的时候能听出家长特别激动，其实孩子一直在努力，只是没人看到而已。', time: '昨天 18:00', relation: '发起' },
    { id: 's2', name: '王同学', avatar: '📚', content: '同桌对一道题死活想不通，急得直挠头。我画了张图给她讲了两遍，她突然眼睛一亮说"原来是这样啊！"那个瞬间比自己做出题还开心，知识分享出去居然会变多。', time: '昨天 20:30', relation: '接棒' },
    { id: 's3', name: '??', avatar: '❓', content: '等你来接棒…', time: '', relation: '下一棒' },
  ],
];

// ============================================
// 善行盲盒 任务池
// ============================================

const BLIND_BOX_TASKS: WeeklyInspiration[] = [
  { id: 'bb_001', emoji: '🎁', title: '神秘任务A', desc: '拆开后揭晓…', category: 'kindness', difficulty: 'easy', fortune: 10, participants: 0, quickContent: '', quickTags: ['惊喜'] },
  { id: 'bb_002', emoji: '🎁', title: '神秘任务B', desc: '拆开后揭晓…', category: 'kindness', difficulty: 'easy', fortune: 10, participants: 0, quickContent: '', quickTags: ['惊喜'] },
  { id: 'bb_003', emoji: '🎁', title: '神秘任务C', desc: '拆开后揭晓…', category: 'selfcare', difficulty: 'easy', fortune: 10, participants: 0, quickContent: '', quickTags: ['惊喜'] },
];

const BLIND_BOX_REAL: Record<string, WeeklyInspiration> = {
  bb_001: { id: 'bb_001', emoji: '🌳', title: '今天种一棵植物', desc: '种一盆小绿植或播一粒种子，照顾它成长', category: 'kindness', difficulty: 'easy', fortune: 15, participants: 234, quickContent: '🌳 今天种了一盆多肉，给它取了名字叫"小善"', quickTags: ['环保'] },
  bb_002: { id: 'bb_002', emoji: '📸', title: '拍一张陌生人的微笑', desc: '征得同意后，拍一张帮你的人微笑的照片', category: 'kindness', difficulty: 'medium', fortune: 20, participants: 89, quickContent: '📸 今天帮一位阿姨指路，她开心地笑了，我记录下了这个瞬间', quickTags: ['记录'] },
  bb_003: { id: 'bb_003', emoji: '🍵', title: '给自己泡一杯好茶', desc: '放慢节奏，认真泡一杯茶，什么都不想', category: 'selfcare', difficulty: 'easy', fortune: 10, participants: 312, quickContent: '🍵 今天泡了一杯普洱，坐在窗边看了20分钟云', quickTags: ['善待自己'] },
};

// ============================================
// 主组件
// ============================================

export default function DiscoverPage() {
  const { userInfo, loadFromStorage: loadUser } = useUserStore();
  const { publishedList, loadFromStorage: loadKindness } = useKindnessStore();

  const [streakDisplay, setStreakDisplay] = useState({ count: 0, today: 0, checkedIn: false });
  const [blindBoxOpened, setBlindBoxOpened] = useState<Record<string, boolean>>({});
  const [blindBoxRevealed, setBlindBoxRevealed] = useState<Record<string, WeeklyInspiration>>({});

  const refreshStreak = useCallback(() => {
    const s = getStreakStatus();
    setStreakDisplay({ count: s.displayCount, today: s.todayCompleted, checkedIn: s.isCheckedIn });
  }, []);

  useEffect(() => {
    loadUser();
    loadKindness();
    refreshStreak();
  }, []);

  // 本周灵感
  const activeInspirations = useMemo(() => getActiveInspirations(), []);
  const selfCareTasks = useMemo(() => getSelfCareTasks(), []);
  const orgTasks = useMemo(() => getOrgTasks(), []);

  // 今日已发布数
  const todayPublishedCount = useMemo(() => {
    const today = getLocalDateStr();
    const uid = userInfo?.id || 'currentUser';
    return publishedList.filter(k => k.userId === uid && k.createdAt.slice(0, 10) === today).length;
  }, [publishedList, userInfo]);

  // ===== 温暖时光机：去年今天 =====
  const timeMachineRecord = useMemo(() => {
    const now = new Date();
    const sameDateLastYear = getLocalDateStr(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()));
    const uid = userInfo?.id || 'currentUser';
    return publishedList.find(k => k.userId === uid && k.createdAt.startsWith(sameDateLastYear));
  }, [publishedList, userInfo]);

  // ===== 处理任务点击 =====
  const handleTaskClick = useCallback(async (task: WeeklyInspiration) => {
    const flood = checkFloodControl();
    if (flood) {
      Taro.showToast({ title: flood, icon: 'none', duration: 2500 });
      return;
    }
    const confirm = await Taro.showModal({
      title: `已完成「${task.title}」？`,
      content: `请确认你已经完成了这件事。\n\n${task.desc}\n\n完成后再记录，让每一份善意都真实可信。`,
      confirmText: '是的，我完成了',
      cancelText: '还没做',
    });
    if (!confirm.confirm) return;
    recordCompletion();
    refreshStreak();
    Taro.switchTab({
      url: `/pages/record/index`,
      success: () => {
        setTimeout(() => {
          Taro.setStorageSync('quick_record_data', {
            content: task.quickContent,
            tags: task.quickTags,
            fortune: task.fortune,
            source: task.category === 'selfcare' ? 'selfcare' : 'inspiration',
          });
        }, 300);
      },
    });
  }, [refreshStreak]);

  // ===== 拆开盲盒 =====
  const handleOpenBlindBox = useCallback((boxId: string) => {
    if (blindBoxOpened[boxId]) return;
    const real = BLIND_BOX_REAL[boxId];
    if (!real) return;
    setBlindBoxOpened(prev => ({ ...prev, [boxId]: true }));
    setTimeout(() => {
      setBlindBoxRevealed(prev => ({ ...prev, [boxId]: real }));
    }, 600);
  }, [blindBoxOpened]);

  // ===== 接力：接棒 =====
  const handleRelay = useCallback(async (chainIndex: number) => {
    const flood = checkFloodControl();
    if (flood) {
      Taro.showToast({ title: flood, icon: 'none', duration: 2500 });
      return;
    }
    const confirm = await Taro.showModal({
      title: '接棒善行接力',
      content: '接过这一棒，做一件类似的善事，让善意传递下去。',
      confirmText: '我要接棒',
      cancelText: '再看看',
    });
    if (!confirm.confirm) return;
    recordCompletion();
    refreshStreak();
    const chain = RELAY_CHAINS[chainIndex];
    const lastReal = chain.filter(l => l.relation !== '下一棒').pop();
    Taro.setStorageSync('quick_record_data', {
      content: `🏃 接力善行：${lastReal?.content || '做一件类似的善事'}`,
      tags: ['善行接力'],
      fortune: 10,
      source: 'relay',
    });
    Taro.showToast({ title: '接棒成功！去记录你的善行吧', icon: 'success' });
    setTimeout(() => Taro.switchTab({ url: '/pages/record/index' }), 800);
  }, [refreshStreak]);

  // ===== 渲染任务卡片 =====
  const renderTaskCard = (task: WeeklyInspiration) => {
    const isSelfCare = task.category === 'selfcare';
    const isOrg = task.category === 'org';
    const diffLabel = task.difficulty === 'easy' ? '简单' : task.difficulty === 'hard' ? '较难' : '中等';
    return (
      <View key={task.id} className={`${styles.taskCard} ${isSelfCare ? styles.taskCardSelfCare : ''} ${isOrg ? styles.taskCardOrg : ''}`} onClick={() => handleTaskClick(task)}>
        <View className={styles.taskCardEmoji}><Text>{task.emoji}</Text></View>
        <View className={styles.taskCardBody}>
          <View className={styles.taskCardHeader}>
            <Text className={styles.taskCardTitle}>{task.title}</Text>
            {isSelfCare && <Text className={styles.taskBadge}>善待自己</Text>}
            {isOrg && <View className={styles.taskBadgeOrg}><Text className={styles.taskBadgeOrgText}>✓ {task.orgType === 'community' ? '社区' : task.orgType === 'gov' ? '政府' : task.orgType === 'ngo' ? '公益' : '认证'}</Text></View>}
          </View>
          {isOrg && task.orgName && <Text className={styles.taskCardOrgName}>{task.orgName}</Text>}
          <Text className={styles.taskCardDesc}>{task.desc}</Text>
          <View className={styles.taskCardMeta}>
            <Text className={styles.taskCardDifficulty}>{diffLabel}</Text>
            <Text className={styles.taskCardFortune}>+{task.fortune}福气值</Text>
            <Text className={styles.taskCardParticipants}>{task.participants}人已做</Text>
          </View>
        </View>
        <View className={styles.taskCardAction}><Text className={styles.taskCardActionText}>去试试</Text></View>
      </View>
    );
  };

  return (
    <View className={styles.page}>
      <ScrollView className={styles.scrollView} scrollY enhanced showScrollbar={false}>
        {/* 连续天数 */}
        <View className={styles.streakSection}>
          <View className={styles.streakHeader}>
            <View className={styles.streakLeft}>
              <Text className={styles.streakFire}>🔥</Text>
              <View className={styles.streakInfo}>
                <Text className={styles.streakCount}>已连续行善 <Text className={styles.streakNum}>{streakDisplay.count}</Text> 天</Text>
                <Text className={styles.streakToday}>今日已完成 {streakDisplay.today} 件</Text>
              </View>
            </View>
          </View>
          <View className={styles.streakBar}>
            <View className={styles.streakBarFill} style={{ width: `${Math.min((streakDisplay.count / 30) * 100, 100)}%` }} />
          </View>
          {streakDisplay.count >= 1 && (
            <Text className={styles.streakTip}>
              {streakDisplay.count < 7 ? '再坚持几天，养成行善的习惯 💪'
                : streakDisplay.count < 30 ? '连续行善已超过一周，你真棒 🌟'
                : '全勤善行者！你已连续行善一个月 🏆'}
            </Text>
          )}
        </View>

        {/* ===== 善行盲盒 ===== */}
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>🎁 善行盲盒</Text>
            <Text className={styles.sectionSubtitle}>拆开惊喜，发现未知的温暖</Text>
          </View>
          <View className={styles.blindBoxRow}>
            {BLIND_BOX_TASKS.map(box => {
              const opened = blindBoxOpened[box.id];
              const revealed = blindBoxRevealed[box.id];
              return (
                <View
                  key={box.id}
                  className={`${styles.blindBox} ${opened ? styles.blindBoxOpened : ''}`}
                  onClick={() => !opened && handleOpenBlindBox(box.id)}
                >
                  {!opened && (
                    <>
                      <Text className={styles.blindBoxEmoji}>🎁</Text>
                      <Text className={styles.blindBoxLabel}>拆开</Text>
                    </>
                  )}
                  {opened && revealed && (
                    <>
                      <Text className={styles.blindBoxEmoji}>{revealed.emoji}</Text>
                      <Text className={styles.blindBoxLabel}>{revealed.title}</Text>
                      <View className={styles.blindBoxAction} onClick={(e) => { e.stopPropagation(); handleTaskClick(revealed); }}>
                        <Text className={styles.blindBoxActionText}>去完成</Text>
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ===== 善行接力 ===== */}
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>🏃 善行接力</Text>
            <Text className={styles.sectionSubtitle}>接过这一棒，让善意传递</Text>
          </View>
          <Text className={styles.sectionDesc}>
            看到别人的善行，接力做一件类似的事。善意会传染，从你开始。
          </Text>
          {RELAY_CHAINS.map((chain, ci) => (
            <View key={ci} className={styles.relayChain}>
              <View className={styles.relayLinks}>
                {chain.map((link, li) => (
                  <View key={link.id} className={styles.relayLink}>
                    <View className={`${styles.relayAvatar} ${link.relation === '下一棒' ? styles.relayAvatarNext : ''}`}>
                      <Text>{link.avatar}</Text>
                    </View>
                    <View className={styles.relayBody}>
                      <View className={styles.relayHeader}>
                        <Text className={styles.relayName}>{link.name}</Text>
                        <Text className={styles.relayRelation}>{link.relation}</Text>
                      </View>
                      <Text className={styles.relayContent}>{link.content}</Text>
                      {link.time && <Text className={styles.relayTime}>{link.time}</Text>}
                    </View>
                    {li < chain.length - 1 && <View className={styles.relayArrow}>↓</View>}
                  </View>
                ))}
              </View>
              <View className={styles.relayAction} onClick={() => handleRelay(ci)}>
                <Text className={styles.relayActionText}>🏃 我要接棒</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ===== 温暖时光机 ===== */}
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>⏳ 温暖时光机</Text>
            <Text className={styles.sectionSubtitle}>看看过去的你</Text>
          </View>
          {timeMachineRecord ? (
            <View className={styles.timeMachineCard} onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${timeMachineRecord.id}` })}>
              <View className={styles.timeMachineBadge}>
                <Text className={styles.timeMachineBadgeText}>📅 去年今天</Text>
              </View>
              <Text className={styles.timeMachineContent}>{timeMachineRecord.content}</Text>
              <View className={styles.timeMachineMeta}>
                <Text className={styles.timeMachineDate}>{timeMachineRecord.createdAt.slice(0, 10)}</Text>
                <Text className={styles.timeMachineTag}>{timeMachineRecord.tags[0] || '善行'}</Text>
              </View>
              <Text className={styles.timeMachinePrompt}>
                💡 今年的今天，你会做一件什么样的事呢？
              </Text>
            </View>
          ) : (
            <View className={styles.timeMachineEmpty}>
              <Text className={styles.timeMachineEmptyText}>📅 去年今天，你还没有记录善行</Text>
              <Text className={styles.timeMachineEmptySub}>从今天开始，明年的今天你会看到过去的自己</Text>
            </View>
          )}
        </View>

        {/* ===== 今日温暖灵感 ===== */}
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>💡 今日温暖灵感</Text>
            <Text className={styles.sectionSubtitle}>每周轮换 · 对他人行善</Text>
          </View>
          <Text className={styles.sectionDesc}>
            选一件小事，<Text className={styles.highlight}>先做，再做记录</Text>。善意不需要轰轰烈烈，从日常开始。
          </Text>
          <View className={styles.taskList}>
            {activeInspirations.map(renderTaskCard)}
          </View>
        </View>

        {/* ===== 认证机构任务 ===== */}
        {orgTasks.length > 0 && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>🏛️ 认证机构任务</Text>
              <Text className={styles.sectionSubtitle}>社区 · 政府 · 公益组织</Text>
            </View>
            <Text className={styles.sectionDesc}>
              这些任务由认证机构发布，有更大的社会影响力。参与后可获得<Text className={styles.highlight}>额外福气值奖励</Text>。
            </Text>
            <View className={styles.taskList}>
              {orgTasks.map(renderTaskCard)}
            </View>
          </View>
        )}

        {/* ===== 善待自己 ===== */}
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>🌱 善待自己</Text>
            <Text className={styles.sectionSubtitle}>善良先从对自己好开始</Text>
          </View>
          <Text className={styles.sectionDesc}>
            对自己好，也是一种善行。照顾好自己，才有更多能量温暖他人。
          </Text>
          <View className={styles.taskList}>
            {selfCareTasks.map(renderTaskCard)}
          </View>
        </View>

        {/* ===== 善行挑战赛 ===== */}
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>🏆 善行挑战赛</Text>
            <Text className={styles.sectionSubtitle}>完成挑战赢取专属奖励</Text>
          </View>
          <View className={styles.challengeList}>
            {CHALLENGES.filter(c => c.status === 'active').map(ch => (
              <View key={ch.id} className={styles.challengeCard}>
                <View className={styles.challengeHeader}>
                  <Text className={styles.challengeEmoji}>{ch.emoji}</Text>
                  <View className={styles.challengeBody}>
                    <Text className={styles.challengeTitle}>{ch.title}</Text>
                    <Text className={styles.challengeDesc}>{ch.desc}</Text>
                  </View>
                </View>
                <View className={styles.challengeFooter}>
                  <Text className={styles.challengeOrg}>{ch.orgName}</Text>
                  <Text className={styles.challengeParticipants}>{ch.participants}人参与</Text>
                </View>
                <View className={styles.challengeMeta}>
                  <Text className={styles.challengeReward}>🎁 {ch.reward}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ===== 更多 ===== */}
        <View className={styles.section}>
          <View className={styles.sectionHeader}>
            <Text className={styles.sectionTitle}>🌟 更多</Text>
            <Text className={styles.sectionSubtitle}>探索善行的更多可能</Text>
          </View>
          <View className={styles.moreGrid}>
            <View className={styles.moreCard} onClick={() => Taro.navigateTo({ url: '/pages/kindness-square/index' })}>
              <Text className={styles.moreIcon}>👥</Text>
              <Text className={styles.moreLabel}>善行广场</Text>
            </View>
            <View className={styles.moreCard} onClick={() => Taro.navigateTo({ url: '/pages/thank-wall/index' })}>
              <Text className={styles.moreIcon}>💌</Text>
              <Text className={styles.moreLabel}>匿名感谢墙</Text>
            </View>
            <View className={styles.moreCard} onClick={() => Taro.navigateTo({ url: '/pages/warmth-report/index' })}>
              <Text className={styles.moreIcon}>📊</Text>
              <Text className={styles.moreLabel}>温暖报告</Text>
            </View>
            <View className={styles.moreCard} onClick={() => Taro.navigateTo({ url: '/pages/future-letter/index' })}>
              <Text className={styles.moreIcon}>📮</Text>
              <Text className={styles.moreLabel}>给未来的信</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}