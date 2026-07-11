import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/store/user';
import { useKindnessStore } from '@/store/kindness';
import { getActiveInspirations, getOrgTasks, type WeeklyInspiration } from '@/data/weekly-challenges';
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
    { id: 's1', name: '李老师', avatar: '👨‍🏫', content: '给一个平时不怎么发言的学生的家长打了电话，专门表扬了孩子最近的进步。挂电话的时候能听出家长特别激动，其实孩子一直在努力，只是没人看到而已。', time: '昨天 18:00', relation: '发起' },
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
  // 任务详情弹窗
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailType, setDetailType] = useState<'task' | 'challenge' | null>(null);
  const [detailData, setDetailData] = useState<any>(null);

  // 模拟 AI 感谢墙匹配：根据时间、地点、关键词匹配善行记录
  const runAIMatch = useCallback(() => {
    const results: Record<string, typeof THANK_NOTES[number]> = {};
    THANK_NOTES.forEach(note => {
      if (note.kindnessId || note.matchStatus === 'linked' || note.matchStatus === 'skipped') return;
      let bestScore = 0;
      let bestMatch: typeof note.matchedKindness;
      publishedList.forEach(k => {
        let score = 0;
        const kDate = k.createdAt.slice(5, 10);
        if (note.time.includes(kDate) || note.time.includes('今天') || note.time.includes('小时') || note.time.includes('分钟前')) score += 30;
        if (note.location && k.location && note.location.includes(k.location.slice(0, 2))) score += 25;
        if (k.tags) {
          k.tags.forEach(tag => {
            if (note.content.includes(tag)) score += 15;
          });
        }
        const contentWords = ['帮', '捡', '推', '送', '找', '带', '搀扶', '帮忙', '指路', '抱'];
        contentWords.forEach(w => {
          if (k.content.includes(w) && note.content.includes(w)) score += 10;
        });
        if (score > bestScore && score >= 40) {
          bestScore = score;
          bestMatch = { id: k.id, author: k.userName || '匿名', content: k.content.slice(0, 40) + '...', date: k.createdAt.slice(5, 10), matchScore: score };
        }
      });
      if (bestMatch) {
        results[note.id] = { ...note, matchStatus: 'matched', matchedKindness: bestMatch };
      }
    });
    if (Object.keys(results).length > 0) {
      setMatchedNotes(prev => ({ ...prev, ...results }));
      Taro.showToast({ title: `匹配到 ${Object.keys(results).length} 条`, icon: 'none' });
    } else {
      Taro.showToast({ title: '暂无新匹配', icon: 'none' });
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
      Taro.showToast({ title: '已关联善行记录', icon: 'success' });
    }
  }, []);
  const TABS = ['推荐', '善行接力', '任务广场', '感谢墙'] as const;

  // 本周灵感
  const activeInspirations = useMemo(() => getActiveInspirations(), []);

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
  const openDetail = useCallback((type: 'task' | 'challenge', data: any) => {
    setDetailType(type);
    setDetailData(data);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setDetailType(null);
    setDetailData(null);
  }, []);

  const acceptTask = useCallback(async () => {
    if (!detailData) return;
    closeDetail();
    const isChallenge = detailType === 'challenge';
    const title = isChallenge ? detailData.title : detailData.title;
    const confirm = await Taro.showModal({
      title: `领取「${title}」`,
      content: isChallenge
        ? '报名挑战后，你需要在目标天数内坚持完成。完成后记得回来提交证明哦！'
        : '领取任务后，请按照要求完成并回来提交证明。每一份真实的善意都会被记录。',
      confirmText: '去记录',
      cancelText: '稍后再说',
    });
    if (!confirm.confirm) return;
    Taro.navigateTo({
      url: `/pages/record/index?presetTitle=${encodeURIComponent(title)}&presetTags=${encodeURIComponent(isChallenge ? '善行挑战' : '任务')}`,
    });
  }, [detailData, detailType, closeDetail]);

  const renderTaskCard = (task: WeeklyInspiration) => {
    const isSelfCare = task.category === 'selfcare';
    const isOrg = task.category === 'org';
    const diffLabel = task.difficulty === 'easy' ? '简单' : task.difficulty === 'hard' ? '较难' : '中等';
    return (
      <View key={task.id} className={`${styles.taskCard} ${isSelfCare ? styles.taskCardSelfCare : ''} ${isOrg ? styles.taskCardOrg : ''}`} onClick={() => openDetail('task', task)}>
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
              <Text className={styles.sectionTitle}>{'🎁 善行盲盒'}</Text>
              <Text className={styles.sectionSubtitle}>拆开惊喜，发现未知的温暖</Text>
            </View>
            <View className={styles.blindBoxRow}>
              {dailyBoxes.map(box => {
                const opened = blindBoxOpened[box.id];
                const revealed = blindBoxRevealed[box.id];
                return (
                  <View key={box.id} className={`${styles.blindBox} ${opened ? styles.blindBoxOpened : ''}`} onClick={() => !opened && handleOpenBlindBox(box.id)}>
                    {!opened && (<><Text className={styles.blindBoxEmoji}>{'🎁'}</Text><Text className={styles.blindBoxLabel}>拆开</Text></>)}
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
              <Text className={styles.sectionTitle}>{'⏳ 温暖时光机'}</Text>
              <Text className={styles.sectionSubtitle}>看看过去的你</Text>
            </View>
            {timeMachineRecord ? (
              <View className={styles.timeMachineCard} onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${timeMachineRecord.id}` })}>
                <View className={styles.timeMachineBadge}><Text className={styles.timeMachineBadgeText}>{'📅 去年今天'}</Text></View>
                <Text className={styles.timeMachineContent}>{timeMachineRecord.content}</Text>
                <View className={styles.timeMachineMeta}>
                  <Text className={styles.timeMachineDate}>{timeMachineRecord.createdAt.slice(0, 10)}</Text>
                  <Text className={styles.timeMachineTag}>{timeMachineRecord.tags[0] || '善行'}</Text>
                </View>
                <Text className={styles.timeMachinePrompt}>{'💡 今年的今天，你会做一件什么样的事呢？'}</Text>
              </View>
            ) : (
              <View className={styles.timeMachineEmpty}>
                <Text className={styles.timeMachineEmptyText}>{'📅 去年今天，你还没有记录善行'}</Text>
                <Text className={styles.timeMachineEmptySub}>从今天开始，明年的今天你会看到过去的自己</Text>
              </View>
            )}
          </View>
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'🌟 更多'}</Text>
              <Text className={styles.sectionSubtitle}>探索善行的更多可能</Text>
            </View>
            <View className={styles.moreGrid}>
              <View className={styles.moreCard} onClick={() => Taro.navigateTo({ url: '/pages/kindness-square/index' })}><Text className={styles.moreIcon}>{'👥'}</Text><Text className={styles.moreLabel}>善行广场</Text></View>
              <View className={styles.moreCard} onClick={() => Taro.navigateTo({ url: '/pages/warmth-map/index' })}><Text className={styles.moreIcon}>{'🌍'}</Text><Text className={styles.moreLabel}>温暖地图</Text></View>
              <View className={styles.moreCard} onClick={() => Taro.navigateTo({ url: '/pages/future-letter/index' })}><Text className={styles.moreIcon}>{'📩'}</Text><Text className={styles.moreLabel}>给未来的信</Text></View>
            </View>
          </View>
        </>)}

        {/* ===== Tab: 善行接力 ===== */}
        {activeTab === 1 && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'🏅 善行接力'}</Text>
              <Text className={styles.sectionSubtitle}>接过这一棒，让善意传递</Text>
            </View>
            <Text className={styles.sectionDesc}>看到别人的善行，接力做一件类似的事。善意会传染，从你开始。</Text>
            {RELAY_CHAINS.map((chain, ci) => (
              <View key={ci} className={styles.relayChain}>
                <View className={styles.relayLinks}>
                  {chain.map((link, li) => (
                    <View key={link.id} className={styles.relayLink}>
                      <View className={`${styles.relayAvatar} ${link.relation === '下一棒' ? styles.relayAvatarNext : ''}`}><Text>{link.avatar}</Text></View>
                      <View className={styles.relayBody}>
                        <View className={styles.relayHeader}><Text className={styles.relayName}>{link.name}</Text><Text className={styles.relayRelation}>{link.relation}</Text></View>
                        <Text className={styles.relayContent}>{link.content}</Text>
                        {link.time && <Text className={styles.relayTime}>{link.time}</Text>}
                      </View>
                      {li < chain.length - 1 && <View className={styles.relayArrow}>{'↓'}</View>}
                    </View>
                  ))}
                </View>
                <View className={styles.relayAction} onClick={() => handleRelay(ci)}><Text className={styles.relayActionText}>{'🏅 我要接棒'}</Text></View>
              </View>
            ))}
          </View>
        )}

        {/* ===== Tab: 任务广场 ===== */}
        {activeTab === 2 && (<>
          {orgTasks.length > 0 && (
            <View className={styles.section}>
              <View className={styles.sectionHeader}>
                <Text className={styles.sectionTitle}>{'🏛️ 认证机构任务'}</Text>
                <Text className={styles.sectionSubtitle}>社区 · 政府 · 公益组织</Text>
              </View>
              <Text className={styles.sectionDesc}>这些任务由认证机构发布，有更大的社会影响力。参与后可获得<Text className={styles.highlight}>额外福气值奖励</Text>。</Text>
              <View className={styles.taskList}>{orgTasks.map(renderTaskCard)}</View>
            </View>
          )}
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'💡 今日温暖灵感'}</Text>
              <Text className={styles.sectionSubtitle}>每周轮换 · 对他人行善</Text>
            </View>
            <Text className={styles.sectionDesc}>选一件小事，<Text className={styles.highlight}>先做，再做记录</Text>。善意不需要轰轰烈烈，从日常开始。</Text>
            <View className={styles.taskList}>{activeInspirations.map(renderTaskCard)}</View>
          </View>
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'🏆 善行挑战赛'}</Text>
              <Text className={styles.sectionSubtitle}>完成挑战赢取专属奖励</Text>
            </View>
            <View className={styles.challengeList}>
              {CHALLENGES.filter(c => c.status === 'active').map(ch => (
                <View key={ch.id} className={styles.challengeCard} onClick={() => openDetail('challenge', ch)}>
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
                  <View className={styles.challengeMeta}><Text className={styles.challengeReward}>{'🎁'} {ch.reward}</Text></View>
                </View>
              ))}
            </View>
          </View>
        </>)}

        {/* ===== Tab: 感谢墙 ===== */}
        {activeTab === 3 && (
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>{'💌 感谢墙'}</Text>
              <Text className={styles.sectionSubtitle}>每一份善意，都值得被看见</Text>
            </View>
            <View className={styles.aiMatchBar} onClick={runAIMatch}>
              <Text className={styles.aiMatchIcon}>{'🤖'}</Text>
              <Text className={styles.aiMatchText}>AI 智能匹配感谢→善行</Text>
              <Text className={styles.aiMatchHint}>{'根据时间·地点·关键词匹配'}</Text>
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
                      <Text className={styles.matchLabel}>{'🤖 AI匹配'}</Text>
                      <Text className={styles.matchDesc}>"{m.matchedKindness.content}"</Text>
                      <Text className={styles.matchMeta}>{m.matchedKindness.author} · {m.matchedKindness.date} · 匹配度 {m.matchedKindness.matchScore}%</Text>
                      <View className={styles.matchActions}>
                        <View className={styles.matchBtnConfirm} onClick={() => handleMatchAction(note.id, 'linked')}>
                          <Text className={styles.matchBtnConfirmText}>{'✅ 确认关联'}</Text>
                        </View>
                        <View className={styles.matchBtnSkip} onClick={() => handleMatchAction(note.id, 'skipped')}>
                          <Text className={styles.matchBtnSkipText}>{'❌ 不是我'}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {m && m.matchStatus === 'linked' && m.matchedKindness && (
                    <View className={styles.matchBannerLinked} onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${m.matchedKindness!.id}` })}>
                      <Text className={styles.matchLabel}>{'✅ 已关联善行记录'}</Text>
                      <Text className={styles.matchDesc}>{m.matchedKindness.author} · {m.matchedKindness.date}</Text>
                    </View>
                  )}

                  {m && m.matchStatus === 'skipped' && (
                    <View className={styles.matchBannerSkipped}>
                      <Text className={styles.matchLabelSkipped}>{'已跳过'}</Text>
                    </View>
                  )}

                  <View className={styles.thankFooter}>
                    <View className={styles.thankLikes}>
                      <Text className={styles.thankLikeIcon}>{'❤️'}</Text>
                      <Text className={styles.thankLikeCount}>{note.likes}</Text>
                    </View>
                    {note.kindnessId ? (
                      <View className={styles.thankReplyBtn} onClick={() => Taro.navigateTo({ url: `/pages/detail/index?id=${note.kindnessId}` })}>
                        <Text className={styles.thankReplyText}>{'📄 查看善行'}</Text>
                      </View>
                    ) : (
                      <View className={styles.thankReplyBtn}>
                        <Text className={styles.thankReplyText}>{note.replied ? '✔ 已回应' : '感谢他/她'}</Text>
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

      {/* ===== 任务/挑战详情弹窗 ===== */}
      {detailOpen && detailData && (
        <View className={styles.detailOverlay} onClick={closeDetail}>
          <View className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailEmoji}>{detailData.emoji}</Text>
              <Text className={styles.detailTitle}>{detailData.title}</Text>
              <View className={styles.detailClose} onClick={closeDetail}><Text>✕</Text></View>
            </View>
            <ScrollView scrollY className={styles.detailBody}>
              <Text className={styles.detailDesc}>{detailData.desc}</Text>
              {detailType === 'task' && detailData.orgName && (
                <View className={styles.detailOrg}>
                  <Text className={styles.detailOrgLabel}>主办方</Text>
                  <Text className={styles.detailOrgName}>{detailData.orgName}</Text>
                  {detailData.orgType && (
                    <Text className={styles.detailOrgBadge}>
                      {detailData.orgType === 'community' ? '社区' : detailData.orgType === 'gov' ? '政府' : detailData.orgType === 'ngo' ? '公益组织' : '认证机构'}
                    </Text>
                  )}
                </View>
              )}
              {detailType === 'challenge' && (
                <View className={styles.detailMetaBox}>
                  <View className={styles.detailMetaRow}>
                    <Text className={styles.detailMetaLabel}>主办方</Text>
                    <Text className={styles.detailMetaValue}>{detailData.orgName}</Text>
                  </View>
                  <View className={styles.detailMetaRow}>
                    <Text className={styles.detailMetaLabel}>时间</Text>
                    <Text className={styles.detailMetaValue}>{detailData.startDate} ~ {detailData.endDate}</Text>
                  </View>
                  <View className={styles.detailMetaRow}>
                    <Text className={styles.detailMetaLabel}>目标</Text>
                    <Text className={styles.detailMetaValue}>连续 {detailData.targetDays} 天</Text>
                  </View>
                </View>
              )}
              <View className={styles.detailStats}>
                <View className={styles.detailStat}>
                  <Text className={styles.detailStatNum}>{detailData.participants || 0}</Text>
                  <Text className={styles.detailStatLabel}>人已参与</Text>
                </View>
                {detailType === 'task' && (
                  <View className={styles.detailStat}>
                    <Text className={styles.detailStatNum}>+{detailData.fortune}</Text>
                    <Text className={styles.detailStatLabel}>福气值</Text>
                  </View>
                )}
                {detailType === 'challenge' && (
                  <View className={styles.detailStat}>
                    <Text className={styles.detailStatNum}>{detailData.reward}</Text>
                    <Text className={styles.detailStatLabel}>挑战奖励</Text>
                  </View>
                )}
              </View>
              <View className={styles.detailRule}>
                <Text className={styles.detailRuleTitle}>参与规则</Text>
                <Text className={styles.detailRuleItem}>1. 领取任务后按要求完成</Text>
                <Text className={styles.detailRuleItem}>2. 完成后在「记录善行」中提交证明</Text>
                <Text className={styles.detailRuleItem}>3. 审核通过后即可获得奖励</Text>
                <Text className={styles.detailRuleItem}>4. 恶意刷任务将被取消资格</Text>
              </View>
              <View className={styles.detailContact}>
                <Text className={styles.detailContactTitle}>有问题？</Text>
                <Text className={styles.detailContactText}>领取后可在「记录善行」中提交时@主办方，或联系客服反馈。</Text>
              </View>
            </ScrollView>
            <View className={styles.detailFooter}>
              <View className={styles.detailBtnSecondary} onClick={closeDetail}>
                <Text className={styles.detailBtnSecondaryText}>再看看</Text>
              </View>
              <View className={styles.detailBtnPrimary} onClick={acceptTask}>
                <Text className={styles.detailBtnPrimaryText}>{detailType === 'challenge' ? '报名挑战' : '领取任务'}</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}