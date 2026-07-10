/**
 * 本周温暖灵感 — 每周更新一组轻量级小温暖
 * 不是任务，只是给你一些今天可以做的温暖小事的灵感
 */

export interface WeeklyInspiration {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  difficulty: 'easy' | 'medium';       // easy = 随手就能做
  fortune: number;                     // 记录时获得的福气值
  participants: number;                // 本周记录人数（mock）
  quickContent: string;                // 一键发布时的预设内容
  quickTags: string[];                 // 预设标签
}

/** 根据当前周数从灵感池中选取3条 */
export function getActiveInspirations(): WeeklyInspiration[] {
  const weekNum = getWeekNumber();
  const pool = CHALLENGE_POOL;
  // 每周展示3个，轮换
  const offset = (weekNum * 3) % pool.length;
  return [pool[offset % pool.length], pool[(offset + 1) % pool.length], pool[(offset + 2) % pool.length]];
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

const CHALLENGE_POOL: WeeklyChallenge[] = [
  {
    id: 'ch_001',
    emoji: '🚌',
    title: '让出一个座位',
    desc: '今天坐公交/地铁时，给需要的人让个座',
    difficulty: 'easy',
    fortune: 8,
    participants: 234,
    quickContent: '🚌 今天在车上给需要的人让了座，对方说了声谢谢，心里暖暖的',
    quickTags: ['助人'],
  },
  {
    id: 'ch_002',
    emoji: '😊',
    title: '对服务员说谢谢',
    desc: '点餐或收快递时，认真说一声谢谢，看着对方眼睛',
    difficulty: 'easy',
    fortune: 5,
    participants: 578,
    quickContent: '😊 今天认真对快递员说了声谢谢，他愣了一下然后笑了',
    quickTags: ['关怀'],
  },
  {
    id: 'ch_003',
    emoji: '📱',
    title: '给家人打个电话',
    desc: '不找借口，今天给爸妈/亲人打个电话，随便聊聊',
    difficulty: 'easy',
    fortune: 10,
    participants: 189,
    quickContent: '📱 今天给爸妈打了个电话，聊了20分钟，妈妈叮嘱我要按时吃饭',
    quickTags: ['孝亲', '陪伴'],
  },
  {
    id: 'ch_004',
    emoji: '🗑️',
    title: '捡起一个垃圾',
    desc: '路上看到垃圾，弯腰捡起来扔进垃圾桶',
    difficulty: 'easy',
    fortune: 6,
    participants: 342,
    quickContent: '🗑️ 路上看到有人扔的饮料瓶，顺手捡起来扔进了垃圾桶',
    quickTags: ['环保'],
  },
  {
    id: 'ch_005',
    emoji: '☕',
    title: '请同事喝杯水',
    desc: '帮旁边的同事接一杯水，或者买杯咖啡',
    difficulty: 'easy',
    fortune: 7,
    participants: 156,
    quickContent: '☕ 今天帮旁边的同事接了杯热水，他说"谢谢"的时候觉得工作氛围好了一些',
    quickTags: ['关怀', '工作'],
  },
  {
    id: 'ch_006',
    emoji: '🚶',
    title: '放慢脚步等一下',
    desc: '走在前面时，帮后面的人留一下门',
    difficulty: 'easy',
    fortune: 5,
    participants: 467,
    quickContent: '🚶 进电梯时帮后面赶来的邻居留了一下门，他笑着说谢谢',
    quickTags: ['助人'],
  },
  {
    id: 'ch_007',
    emoji: '💬',
    title: '夸一个身边的人',
    desc: '认真找到一个优点，当面夸奖对方',
    difficulty: 'easy',
    fortune: 8,
    participants: 298,
    quickContent: '💬 今天夸了同事今天的衣服很好看，她开心了一整天，我也跟着心情好了',
    quickTags: ['关怀'],
  },
  {
    id: 'ch_008',
    emoji: '🐾',
    title: '给流浪动物留口水',
    desc: '出门时带一小杯水放在路边，给流浪猫狗留一口',
    difficulty: 'easy',
    fortune: 6,
    participants: 201,
    quickContent: '🐾 今天出门带了一小杯水放在路边，晚上回来发现水被喝光了',
    quickTags: ['关怀', '环保'],
  },
  {
    id: 'ch_009',
    emoji: '📚',
    title: '分享一本好书',
    desc: '把最近读过的一本好书推荐给一个朋友',
    difficulty: 'medium',
    fortune: 10,
    participants: 134,
    quickContent: '📚 今天把最近读的一本书推荐给了朋友，我们约好了下周一起讨论',
    quickTags: ['陪伴'],
  },
  {
    id: 'ch_010',
    emoji: '🎵',
    title: '分享一首好歌',
    desc: '把正在听的歌发给一个你觉得会喜欢的朋友',
    difficulty: 'easy',
    fortune: 5,
    participants: 412,
    quickContent: '🎵 今天听到一首特别好听的歌，第一时间分享给了好朋友',
    quickTags: ['关怀'],
  },
  {
    id: 'ch_011',
    emoji: '🌿',
    title: '浇一盆花',
    desc: '给家里的植物浇水，或者帮同事照顾一下桌上的绿植',
    difficulty: 'easy',
    fortune: 4,
    participants: 321,
    quickContent: '🌿 今天帮同事浇了桌上的绿植，它好像又长高了一点点',
    quickTags: ['关怀'],
  },
  {
    id: 'ch_012',
    emoji: '🌙',
    title: '今天早睡30分钟',
    desc: '照顾好自己的身体，也是对家人的一种善意',
    difficulty: 'medium',
    fortune: 8,
    participants: 267,
    quickContent: '🌙 今天比平时早睡了30分钟，明天早上应该精神好很多',
    quickTags: ['孝亲'],
  },
];

/** 快速记录模板 — 一键发布预设场景 */
export interface QuickRecordTemplate {
  id: string;
  emoji: string;
  label: string;
  content: string;
  tags: string[];
}

export function getQuickTemplates(): QuickRecordTemplate[] {
  return QUICK_TEMPLATES;
}

const QUICK_TEMPLATES: QuickRecordTemplate[] = [
  { id: 'qt_001', emoji: '🚌', label: '让了座', content: '🚌 今天给需要的人让了座', tags: ['助人'] },
  { id: 'qt_002', emoji: '😊', label: '说了谢谢', content: '😊 今天认真对服务人员说了声谢谢', tags: ['关怀'] },
  { id: 'qt_003', emoji: '🗑️', label: '捡了垃圾', content: '🗑️ 路上顺手捡了个垃圾扔进垃圾桶', tags: ['环保'] },
  { id: 'qt_004', emoji: '🚪', label: '留了门', content: '🚪 进门时帮后面的人留了一下门', tags: ['助人'] },
  { id: 'qt_005', emoji: '💬', label: '夸了人', content: '💬 今天真诚地夸了身边一个人', tags: ['关怀'] },
  { id: 'qt_006', emoji: '📱', label: '打了电话', content: '📱 今天给家人打了个电话', tags: ['孝亲', '陪伴'] },
  { id: 'qt_007', emoji: '🤝', label: '帮了忙', content: '🤝 今天帮身边的人做了一件小事', tags: ['助人'] },
  { id: 'qt_008', emoji: '☕', label: '请了杯水', content: '☕ 今天帮同事接了杯水/买了杯咖啡', tags: ['关怀'] },
];
