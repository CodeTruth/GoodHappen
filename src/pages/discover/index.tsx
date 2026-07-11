import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/store/user';
import { useKindnessStore } from '@/store/kindness';
import { getActiveInspirations, getSelfCareTasks, getOrgTasks, type WeeklyInspiration } from '@/data/weekly-challenges';
import { CHALLENGES } from '@/data/challenge-data';
import { THANK_NOTES } from '@/data/thank-wall-data';
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
// 善行盲盒 任务池（每天从池中随机选3个）
// ============================================

const BLIND_BOX_POOL: WeeklyInspiration[] = [
  { id: 'bb_001', emoji: '🌳', title: '种一棵植物', desc: '种一盆小绿植或播一粒种子，照顾它成长', category: 'kindness', difficulty: 'easy', fortune: 15, participants: 234, quickContent: '🌳 今天种了一盆多肉，给它取了名字叫"小善"', quickTags: ['环保'] },
  { id: 'bb_002', emoji: '📸', title: '拍一张微笑', desc: '征得同意后，拍一张帮助你的人微笑的照片', category: 'kindness', difficulty: 'medium', fortune: 20, participants: 89, quickContent: '📸 帮一位阿姨指路，她开心地笑了，我记录下了这个瞬间', quickTags: ['记录'] },
  { id: 'bb_003', emoji: '🍵', title: '泡一杯好茶', desc: '放慢节奏，认真泡一杯茶，什么都不想', category: 'selfcare', difficulty: 'easy', fortune: 10, participants: 312, quickContent: '🍵 泡了一杯普洱，坐在窗边看了20分钟云', quickTags: ['善待自己'] },
  { id: 'bb_004', emoji: '💌', title: '给一个人写便签', desc: '写一张暖心便签，贴在同事/同学的桌上', category: 'kindness', difficulty: 'easy', fortune: 12, participants: 156, quickContent: '💌 给同桌留了一张"你今天也很棒"的便签', quickTags: ['关怀'] },
  { id: 'bb_005', emoji: '🧹', title: '随手捡垃圾', desc: '路上看到垃圾，随手捡起来扔进垃圾桶', category: 'kindness', difficulty: 'easy', fortune: 8, participants: 445, quickContent: '🧹 下班路上捡了3个塑料瓶，路过的阿姨对我竖大拇指', quickTags: ['环保'] },
  { id: 'bb_006', emoji: '🎵', title: '分享一首歌', desc: '把让你心情变好的歌分享给一个朋友', category: 'kindness', difficulty: 'easy', fortune: 8, participants: 267, quickContent: '🎵 给心情不好的室友分享了一首《晴天》，她听完笑了', quickTags: ['分享'] },
  { id: 'bb_007', emoji: '📖', title: '读10页书', desc: '放下手机，安静地读10页纸质书', category: 'selfcare', difficulty: 'easy', fortune: 10, participants: 523, quickContent: '📖 读了《小王子》第三章，"真正重要的东西用眼睛是看不见的"', quickTags: ['善待自己'] },
  { id: 'bb_008', emoji: '☀️', title: '晒10分钟太阳', desc: '找个有阳光的地方，什么都不做，晒10分钟', category: 'selfcare', difficulty: 'easy', fortune: 10, participants: 389, quickContent: '☀️ 中午在公园长椅上晒了10分钟太阳，整个人都暖洋洋的', quickTags: ['善待自己'] },
  { id: 'bb_009', emoji: '🤝', title: '主动跟人打招呼', desc: '对今天遇到的第一个人真诚地微笑说你好', category: 'kindness', difficulty: 'easy', fortune: 8, participants: 178, quickContent: '🤝 进电梯对邻居笑着说早，她也回了我一个微笑', quickTags: ['友善'] },
  { id: 'bb_010', emoji: '🎨', title: '画一幅画', desc: '随便画点什么，不用画好，享受过程', category: 'selfcare', difficulty: 'easy', fortune: 10, participants: 201, quickContent: '🎨 画了窗外的那棵树，虽然画得歪歪扭扭但很开心', quickTags: ['善待自己'] },
];

function getDailyBlindBoxes(): WeeklyInspiration[] {
  const today = getLocalDateStr();
  const shuffled = [...BLIND_BOX_POOL].sort((a, b) => {
    const ha = hashCode(today + a.id);
    const hb = hashCode(today + b.id);
    return ha - hb;
  });
  return shuffled.slice(0, 3);
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

// ============================================
// 主组件
// ============================================

export default function DiscoverPage() {
  const { userInfo, loadFromStorage: loadUser } = useUserStore();
  const { publishedList, loadFromStorage: loadKindness } = useKindnessStore();

  const [streakDisplay, setStreakDisplay] = useState({ count: 0, today: 0, checkedIn: false });
  const [blindBoxOpened, setBlindBoxOpened] = useState<Record<string, boolean>>({});
  const [blindBoxRevealed, setBlindBoxRevealed] = useState<Record<string, WeeklyInspiration>>({});
  const dailyBoxes = useMemo(() => getDailyBlindBoxes(), []);

  const refreshStreak = useCallback(() => {
    const s = getStreakStatus();
    setStreakDisplay({ count: s.displayCount, today: s.todayCompleted, checkedIn: s.isCheckedIn });
  }, []);

  useEffect(() => {
    loadUser();
    loadKindness();
    refreshStreak();
  }, []);

  const [activeTab, setActiveTab] = useState(0);
  const [matchedNotes, setMatchedNotes] = useState<Record<string, typeof THANK_NOTES[number]>>({});

  // \u6A21\u62DF AI \u611F\u8C22\u5899\u5339\u914D\uFF1A\u6839\u636E\u65F6\u95F4\u3001\u5730\u70B9\u3001\u5173\u952E\u8BCD\u5339\u914D\u5584\u884C\u8BB0\u5F55
  const runAIMatch = useCallback(() => {
    const results: Record<string, typeof THANK_NOTES[number]> = {};
    THANK_NOTES.forEach(note => {
      if (note.kindnessId || note.matchStatus === 'linked' || note.matchStatus === 'skipped') return;
      let bestScore = 0;
      let bestMatch: typeof note.matchedKindness;
      publishedList.forEach(k => {
        let score = 0;
        const kDate = k.createdAt.slice(5, 10);
        if (note.time.includes(kDate) || note.time.includes('\u4ECA\u5929') || note.time.includes('\u5C0F\u65F6') || note.time.includes('\u5206\u949F\u524D')) score += 30;
        if (note.location && k.location && note.location.includes(k.location.slice(0, 2))) score += 25;
        if (k.tags) {
          k.tags.forEach(tag => {
            if (note.content.includes(tag)) score += 15;
          });
        }
        const contentWords = ['\u5E2E', '\u6361', '\u63A8', '\u9001', '\u627E', '\u5E26', '\u6434\u6276', '\u5E2E\u5FD9', '\u6307\u8DEF', '\u62B1'];
        contentWords.forEach(w => {
          if (k.content.includes(w) && note.content.includes(w)) score += 10;
        });
        if (score > bestScore && score >= 40) {
          bestScore = score;
          bestMatch = { id: k.id, author: k.userName || '\u533F\u540D', content: k.content.slice(0, 40) + '...', date: k.createdAt.slice(5, 10), matchScore: score };
        }
      });
      if (bestMatch) {
        results[note.id] = { ...note, matchStatus: 'matched', matchedKindness: bestMatch };
      }
    });
    if (Object.keys(results).length > 0) {
      setMatchedNotes(prev => ({ ...prev, ...results }));
      Taro.showToast({ title: `\u5339\u914D\u5230 ${Object.keys(results).length} \u6761`, icon: 'none' });
    } else {
      Taro.showToast({ title: '\u6682\u65E0\u65B0\u5339\u914D', icon: 'none' });
    }
  }, [publishedList]);

  const handleMatchAction = useCallback((noteId: string, action: 'linked' | 'skipped') => {
    setMatchedNotes(prev => {
      const next = { ...prev };
      if (next[noteId]) {
        next[noteId] = { ...next[noteId], matchStatus: action };
      }
      return next;
    });
    if (action === 'linked') {
      Taro.showToast({ title: '\u5DF2\u5173\u8054\u5584\u884C\u8BB0\u5F55', icon: 'success' });
    }
  }, []);
  const TABS = ['\u63A8\u8350', '\u5584\u884C\u63A5\u529B', '\u4EFB\u52A1\u5E7F\u573A', '\u611F\u8C22\u5899'] as const;

  // 本周灵感
  const activeInspirations = useMemo(() => getActiveInspirations(), []);
  const selfCareTasks = useMemo(() => getSelfCareTasks().slice(0, 1), []);
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
    const real = dailyBoxes.find(b => b.id === boxId);
    if (!real) return;
    setBlindBoxOpened(prev => ({ ...prev, [boxId]: true }));
    setTimeout(() => {
      setBlindBoxRevealed(prev => ({ ...prev, [boxId]: real }));
    }, 600);
  }, [blindBoxOpened, dailyBoxes]);

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

        {/* ===== Tab 栏 ===== */}
        <View className={styles.tabBar}>
          {TABS.map((tab, i) => (
            <View
              key={i}
              className={`${styles.tabItem} ${activeTab === i ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab(i)}
            >
              <Text className={`${styles.tabText} ${activeTab === i ? styles.tabTextActive : ''}`}>{tab}</Text>
            </View>
          ))}
        </View>

        {/* ===== Tab: 推荐 ===== */}
        {activeTab === 0 && (<>
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'\uD83C\uDF81 \u5584\u884C\u76F2\u76D2'}</Text>
              <Text className={styles.sectionSubtitle}>拆开惊喜，发现未知的温暖</Text>
            </View>
            <View className={styles.blindBoxRow}>
              {dailyBoxes.map(box => {
                const opened = blindBoxOpened[box.id];
                const revealed = blindBoxRevealed[box.id];
                return (
                  <View key={box.id} className={`${styles.blindBox} ${opened ? styles.blindBoxOpened : ''}`} onClick={() => !opened && handleOpenBlindBox(box.id)}>
                    {!opened && (<><Text className={styles.blindBoxEmoji}>{'\uD83C\uDF81'}</Text><Text className={styles.blindBoxLabel}>拆开</Text></>)}
                    {opened && revealed && (<>
                      <Text className={styles.blindBoxEmoji}>{revealed.emoji}</Text>
                      <Text className={styles.blindBoxLabel}>{revealed.title}</Text>
                      <View className={styles.blindBoxAction} onClick={(e) => { e.stopPropagation(); handleTaskClick(revealed); }}><Text className={styles.blindBoxActionText}>去完成</Text></View>
                    </>)}
                  </View>
                );
              })}
            </View>
          </View>
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'\u23F3 \u6E29\u6696\u65F6\u5149\u673A'}</Text>
              <Text className={styles.sectionSubtitle}>看看过去的你</Text>
            </View>
            {timeMachineRecord ? (
              <View className={styles.timeMachineCard} onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${timeMachineRecord.id}` })}>
                <View className={styles.timeMachineBadge}><Text className={styles.timeMachineBadgeText}>{'\uD83D\uDCC5 \u53BB\u5E74\u4ECA\u5929'}</Text></View>
                <Text className={styles.timeMachineContent}>{timeMachineRecord.content}</Text>
                <View className={styles.timeMachineMeta}>
                  <Text className={styles.timeMachineDate}>{timeMachineRecord.createdAt.slice(0, 10)}</Text>
                  <Text className={styles.timeMachineTag}>{timeMachineRecord.tags[0] || '善行'}</Text>
                </View>
                <Text className={styles.timeMachinePrompt}>{'\uD83D\uDCA1 \u4ECA\u5E74\u7684\u4ECA\u5929\uFF0C\u4F60\u4F1A\u505A\u4E00\u4EF6\u4EC0\u4E48\u6837\u7684\u4E8B\u5462\uFF1F'}</Text>
              </View>
            ) : (
              <View className={styles.timeMachineEmpty}>
                <Text className={styles.timeMachineEmptyText}>{'\uD83D\uDCC5 \u53BB\u5E74\u4ECA\u5929\uFF0C\u4F60\u8FD8\u6CA1\u6709\u8BB0\u5F55\u5584\u884C'}</Text>
                <Text className={styles.timeMachineEmptySub}>从今天开始，明年的今天你会看到过去的自己</Text>
              </View>
            )}
          </View>
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'\uD83C\uDF1F \u66F4\u591A'}</Text>
              <Text className={styles.sectionSubtitle}>探索善行的更多可能</Text>
            </View>
            <View className={styles.moreGrid}>
              <View className={styles.moreCard} onClick={() => Taro.navigateTo({ url: '/pages/kindness-square/index' })}><Text className={styles.moreIcon}>{'\uD83D\uDC65'}</Text><Text className={styles.moreLabel}>善行广场</Text></View>
              <View className={styles.moreCard} onClick={() => Taro.navigateTo({ url: '/pages/warmth-map/index' })}><Text className={styles.moreIcon}>{'\uD83C\uDF0D'}</Text><Text className={styles.moreLabel}>温暖地图</Text></View>
              <View className={styles.moreCard} onClick={() => Taro.navigateTo({ url: '/pages/future-letter/index' })}><Text className={styles.moreIcon}>{'\uD83D\uDCE7'}</Text><Text className={styles.moreLabel}>给未来的信</Text></View>
            </View>
          </View>
        </>)}

        {/* ===== Tab: 善行接力 ===== */}
        {activeTab === 1 && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'\uD83C\uDFC3 \u5584\u884C\u63A5\u529B'}</Text>
              <Text className={styles.sectionSubtitle}>接过这一棒，让善意传递</Text>
            </View>
            <Text className={styles.sectionDesc}>看到别人的善行，接力做一件类似的事。善意会传染，从你开始。</Text>
            {RELAY_CHAINS.map((chain, ci) => (
              <View key={ci} className={styles.relayChain}>
                <View className={styles.relayLinks}>
                  {chain.map((link, li) => (
                    <View key={link.id} className={styles.relayLink}>
                      <View className={`${styles.relayAvatar} ${link.relation === '\u4E0B\u4E00\u68D2' ? styles.relayAvatarNext : ''}`}><Text>{link.avatar}</Text></View>
                      <View className={styles.relayBody}>
                        <View className={styles.relayHeader}><Text className={styles.relayName}>{link.name}</Text><Text className={styles.relayRelation}>{link.relation}</Text></View>
                        <Text className={styles.relayContent}>{link.content}</Text>
                        {link.time && <Text className={styles.relayTime}>{link.time}</Text>}
                      </View>
                      {li < chain.length - 1 && <View className={styles.relayArrow}>{'\u2193'}</View>}
                    </View>
                  ))}
                </View>
                <View className={styles.relayAction} onClick={() => handleRelay(ci)}><Text className={styles.relayActionText}>{'\uD83C\uDFC3 \u6211\u8981\u63A5\u68D2'}</Text></View>
              </View>
            ))}
          </View>
        )}

        {/* ===== Tab: 任务广场 ===== */}
        {activeTab === 2 && (<>
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'\uD83D\uDCA1 \u4ECA\u65E5\u6E29\u6696\u7075\u611F'}</Text>
              <Text className={styles.sectionSubtitle}>每周轮换 · 对他人行善</Text>
            </View>
            <Text className={styles.sectionDesc}>选一件小事，<Text className={styles.highlight}>先做，再做记录</Text>。善意不需要轰轰烈烈，从日常开始。</Text>
            <View className={styles.taskList}>{activeInspirations.map(renderTaskCard)}</View>
          </View>
          {orgTasks.length > 0 && (
            <View className={styles.section}>
              <View className={styles.sectionHeader}>
                <Text className={styles.sectionTitle}>{'\uD83C\uDFDB\uFE0F \u8BA4\u8BC1\u673A\u6784\u4EFB\u52A1'}</Text>
                <Text className={styles.sectionSubtitle}>社区 · 政府 · 公益组织</Text>
              </View>
              <Text className={styles.sectionDesc}>这些任务由认证机构发布，有更大的社会影响力。参与后可获得<Text className={styles.highlight}>额外福气值奖励</Text>。</Text>
              <View className={styles.taskList}>{orgTasks.map(renderTaskCard)}</View>
            </View>
          )}
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'\uD83C\uDF31 \u5584\u5F85\u81EA\u5DF1'}</Text>
              <Text className={styles.sectionSubtitle}>善良先从对自己好开始</Text>
            </View>
            <Text className={styles.sectionDesc}>对自己好，也是一种善行。照顾好自己，才有更多能量温暖他人。</Text>
            <View className={styles.taskList}>{selfCareTasks.map(renderTaskCard)}</View>
          </View>
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'\uD83C\uDFC6 \u5584\u884C\u6311\u6218\u8D5B'}</Text>
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
                  <View className={styles.challengeMeta}><Text className={styles.challengeReward}>{'\uD83C\uDF81'} {ch.reward}</Text></View>
                </View>
              ))}
            </View>
          </View>
        </>)}

        {/* ===== Tab: 感谢墙 ===== */}
        {activeTab === 3 && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'\uD83D\uDC8C \u611F\u8C22\u5899'}</Text>
              <Text className={styles.sectionSubtitle}>每一份善意，都值得被看见</Text>
            </View>
            <View className={styles.aiMatchBar} onClick={runAIMatch}>
              <Text className={styles.aiMatchIcon}>{'\uD83E\uDD16'}</Text>
              <Text className={styles.aiMatchText}>AI \u667A\u80FD\u5339\u914D\u611F\u8C22\u2192\u5584\u884C</Text>
              <Text className={styles.aiMatchHint}>{'\u6839\u636E\u65F6\u95F4\u00B7\u5730\u70B9\u00B7\u5173\u952E\u8BCD\u5339\u914D'}</Text>
            </View>
            {THANK_NOTES.map(note => {
              const m = matchedNotes[note.id];
              return (
                <View key={note.id} className={styles.thankCard}>
                  <View className={styles.thankHeader}>
                    <View className={styles.thankAvatar}><Text>{note.from[0]}</Text></View>
                    <View className={styles.thankMeta}>
                      <Text className={styles.thankName}>{note.from}</Text>
                      <View style={{ flexDirection: 'row', gap: '12rpx', alignItems: 'center' }}>
                        <Text className={styles.thankTime}>{note.time}</Text>
                        {note.location && <Text className={styles.thankTime}>{note.location}</Text>}
                      </View>
                    </View>
                  </View>
                  <Text className={styles.thankContent}>{note.content}</Text>

                  {m && m.matchStatus === 'matched' && m.matchedKindness && (
                    <View className={styles.matchBanner}>
                      <Text className={styles.matchLabel}>{'\uD83E\uDD16 AI\u5339\u914D'}</Text>
                      <Text className={styles.matchDesc}>"{m.matchedKindness.content}"</Text>
                      <Text className={styles.matchMeta}>{m.matchedKindness.author} \u00B7 {m.matchedKindness.date} \u00B7 \u5339\u914D\u5EA6 {m.matchedKindness.matchScore}%</Text>
                      <View className={styles.matchActions}>
                        <View className={styles.matchBtnConfirm} onClick={() => handleMatchAction(note.id, 'linked')}>
                          <Text className={styles.matchBtnConfirmText}>{'\u2705 \u786E\u8BA4\u5173\u8054'}</Text>
                        </View>
                        <View className={styles.matchBtnSkip} onClick={() => handleMatchAction(note.id, 'skipped')}>
                          <Text className={styles.matchBtnSkipText}>{'\u274C \u4E0D\u662F\u6211'}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {m && m.matchStatus === 'linked' && m.matchedKindness && (
                    <View className={styles.matchBannerLinked} onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${m.matchedKindness!.id}` })}>
                      <Text className={styles.matchLabel}>{'\u2705 \u5DF2\u5173\u8054\u5584\u884C\u8BB0\u5F55'}</Text>
                      <Text className={styles.matchDesc}>{m.matchedKindness.author} \u00B7 {m.matchedKindness.date}</Text>
                    </View>
                  )}

                  {m && m.matchStatus === 'skipped' && (
                    <View className={styles.matchBannerSkipped}>
                      <Text className={styles.matchLabelSkipped}>{'\u5DF2\u8DF3\u8FC7'}</Text>
                    </View>
                  )}

                  <View className={styles.thankFooter}>
                    <View className={styles.thankLikes}>
                      <Text className={styles.thankLikeIcon}>{'\u2764\uFE0F'}</Text>
                      <Text className={styles.thankLikeCount}>{note.likes}</Text>
                    </View>
                    {note.kindnessId ? (
                      <View className={styles.thankReplyBtn} onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${note.kindnessId}` })}>
                        <Text className={styles.thankReplyText}>{'\uD83D\uDCC4 \u67E5\u770B\u5584\u884C'}</Text>
                      </View>
                    ) : (
                      <View className={styles.thankReplyBtn}>
                        <Text className={styles.thankReplyText}>{note.replied ? '\u2714 \u5DF2\u56DE\u5E94' : '\u611F\u8C22\u4ED6/\u5979'}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}