/**
 * 本周温暖灵感 — 每周更新一组轻量级小温暖
 *
 * 任务来源三层架构：
 * 1. 系统任务（好事发生平台发布）— 默认展示
 * 2. 认证机构任务（社区/政府/公益组织等认证账号发布）— 需平台认证
 * 3. 个人不可发布 — 杜绝恶意滥用
 */

export type TaskCategory = 'kindness'   // 对他人行善
  | 'selfcare'                          // 善待自己
  | 'org';                              // 认证机构任务

export interface WeeklyInspiration {
  id: string;
  emoji: string;
  title: string;
  desc: string;
  category: TaskCategory;              // 分类
  difficulty: 'easy' | 'medium' | 'hard';
  fortune: number;
  participants: number;
  quickContent: string;
  quickTags: string[];
  // 认证机构任务专用字段
  orgName?: string;                    // 机构名称
  orgType?: 'community' | 'gov' | 'ngo' | 'school'; // 机构类型
}

/** 根据当前周数从灵感池中选取对他人行善类任务 */
export function getActiveInspirations(): WeeklyInspiration[] {
  const weekNum = getWeekNumber();
  const pool = CHALLENGE_POOL.filter(t => t.category === 'kindness');
  const offset = (weekNum * 3) % pool.length;
  return [pool[offset % pool.length], pool[(offset + 1) % pool.length], pool[(offset + 2) % pool.length]];
}

/** 每天展示的善待自己类任务（固定3条） */
export function getSelfCareTasks(): WeeklyInspiration[] {
  const pool = SELFCARE_POOL;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}

/** 获取认证机构任务（模拟：每天展示1-2条） */
export function getOrgTasks(): WeeklyInspiration[] {
  const pool = ORG_TASK_POOL;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - start.getTime()) / (7 * 86400000));
}

// ============================================
// 对他人行善 (18条，每周轮换3条)
// ============================================
const CHALLENGE_POOL: WeeklyInspiration[] = [
  {
    id: 'ch_001', emoji: '🚌', title: '让出一个座位',
    desc: '今天坐公交/地铁时，给需要的人让个座',
    category: 'kindness', difficulty: 'easy', fortune: 8, participants: 234,
    quickContent: '🚌 今天在车上给需要的人让了座，对方说了声谢谢，心里暖暖的',
    quickTags: ['助人'],
  },
  {
    id: 'ch_002', emoji: '😊', title: '对服务员说谢谢',
    desc: '点餐或收快递时，认真说一声谢谢，看着对方眼睛',
    category: 'kindness', difficulty: 'easy', fortune: 5, participants: 578,
    quickContent: '😊 今天认真对快递员说了声谢谢，他愣了一下然后笑了',
    quickTags: ['关怀'],
  },
  {
    id: 'ch_003', emoji: '📱', title: '给家人打个电话',
    desc: '不找借口，今天给爸妈/亲人打个电话，随便聊聊',
    category: 'kindness', difficulty: 'easy', fortune: 10, participants: 189,
    quickContent: '📱 今天给爸妈打了个电话，聊了20分钟，妈妈叮嘱我要按时吃饭',
    quickTags: ['孝亲', '陪伴'],
  },
  {
    id: 'ch_004', emoji: '🗑️', title: '捡起一个垃圾',
    desc: '路上看到垃圾，弯腰捡起来扔进垃圾桶',
    category: 'kindness', difficulty: 'easy', fortune: 6, participants: 342,
    quickContent: '🗑️ 路上看到有人扔的饮料瓶，顺手捡起来扔进了垃圾桶',
    quickTags: ['环保'],
  },
  {
    id: 'ch_005', emoji: '☕', title: '请同事喝杯水',
    desc: '帮旁边的同事接一杯水，或者买杯咖啡',
    category: 'kindness', difficulty: 'easy', fortune: 7, participants: 156,
    quickContent: '☕ 今天帮旁边的同事接了杯热水，他说"谢谢"的时候觉得工作氛围好了一些',
    quickTags: ['关怀', '工作'],
  },
  {
    id: 'ch_006', emoji: '🚪', title: '放慢脚步等一下',
    desc: '走在前面时，帮后面的人留一下门',
    category: 'kindness', difficulty: 'easy', fortune: 5, participants: 467,
    quickContent: '🚪 进电梯时帮后面赶来的邻居留了一下门，他笑着说谢谢',
    quickTags: ['助人'],
  },
  {
    id: 'ch_007', emoji: '💬', title: '夸一个身边的人',
    desc: '认真找到一个优点，当面夸奖对方',
    category: 'kindness', difficulty: 'easy', fortune: 8, participants: 298,
    quickContent: '💬 今天夸了同事今天的衣服很好看，她开心了一整天，我也跟着心情好了',
    quickTags: ['关怀'],
  },
  {
    id: 'ch_008', emoji: '🐾', title: '给流浪动物留口水',
    desc: '出门时带一小杯水放在路边，给流浪猫狗留一口',
    category: 'kindness', difficulty: 'easy', fortune: 6, participants: 201,
    quickContent: '🐾 今天出门带了一小杯水放在路边，晚上回来发现水被喝光了',
    quickTags: ['关怀', '环保'],
  },
  {
    id: 'ch_009', emoji: '📚', title: '分享一本好书',
    desc: '把最近读过的一本好书推荐给一个朋友',
    category: 'kindness', difficulty: 'medium', fortune: 10, participants: 134,
    quickContent: '📚 今天把最近读的一本书推荐给了朋友，我们约好了下周一起讨论',
    quickTags: ['陪伴'],
  },
  {
    id: 'ch_010', emoji: '🎵', title: '分享一首好歌',
    desc: '把正在听的歌发给一个你觉得会喜欢的朋友',
    category: 'kindness', difficulty: 'easy', fortune: 5, participants: 412,
    quickContent: '🎵 今天听到一首特别好听的歌，第一时间分享给了好朋友',
    quickTags: ['关怀'],
  },
  {
    id: 'ch_011', emoji: '🌿', title: '浇一盆花',
    desc: '给家里的植物浇水，或者帮同事照顾一下桌上的绿植',
    category: 'kindness', difficulty: 'easy', fortune: 4, participants: 321,
    quickContent: '🌿 今天帮同事浇了桌上的绿植，它好像又长高了一点点',
    quickTags: ['关怀'],
  },
  {
    id: 'ch_013', emoji: '🧹', title: '帮室友倒垃圾',
    desc: '看到垃圾桶满了，顺手换一下垃圾袋',
    category: 'kindness', difficulty: 'easy', fortune: 5, participants: 187,
    quickContent: '🧹 看到垃圾桶满了，顺手换了垃圾袋，室友回来夸我细心',
    quickTags: ['助人'],
  },
  {
    id: 'ch_014', emoji: '🚴', title: '让出共享单车',
    desc: '如果看到有人在找车，把刚停好的车让给他',
    category: 'kindness', difficulty: 'easy', fortune: 4, participants: 203,
    quickContent: '🚴 停好车后看到一个大叔在找车，我把车让给了他',
    quickTags: ['助人'],
  },
  {
    id: 'ch_015', emoji: '🍊', title: '分享水果零食',
    desc: '今天带水果或零食，分给身边的人',
    category: 'kindness', difficulty: 'easy', fortune: 6, participants: 178,
    quickContent: '🍊 今天带了橘子分给同事，大家边吃边聊，办公室氛围好了很多',
    quickTags: ['关怀', '工作'],
  },
  {
    id: 'ch_016', emoji: '📝', title: '给外卖小哥好评',
    desc: '点外卖后，认真写一段好评，特别提到配送服务',
    category: 'kindness', difficulty: 'easy', fortune: 5, participants: 312,
    quickContent: '📝 今天外卖小哥送得很快，我给了五星好评还写了一段感谢的话',
    quickTags: ['关怀'],
  },
  {
    id: 'ch_017', emoji: '🤝', title: '随手帮陌生人',
    desc: '看到有人需要帮忙（推门、提东西、指路），主动上去',
    category: 'kindness', difficulty: 'easy', fortune: 7, participants: 256,
    quickContent: '🤝 今天在商场看到一个人提着大包小包，主动帮他推开了门',
    quickTags: ['助人'],
  },
  {
    id: 'ch_018', emoji: '💡', title: '给同事提个好建议',
    desc: '发现可以改进的工作方法，主动分享给团队',
    category: 'kindness', difficulty: 'medium', fortune: 10, participants: 98,
    quickContent: '💡 今天发现了一个提高效率的方法，分享给团队后大家都说好用',
    quickTags: ['工作'],
  },
  {
    id: 'ch_019', emoji: '🎂', title: '记住别人的生日',
    desc: '给今天过生日的朋友/同事发一句祝福',
    category: 'kindness', difficulty: 'easy', fortune: 8, participants: 145,
    quickContent: '🎂 今天发现是同事的生日，发了一条祝福，他很惊喜',
    quickTags: ['关怀'],
  },
];

// ============================================
// 善待自己 (固定3条，每天展示)
// ============================================
const SELFCARE_POOL: WeeklyInspiration[] = [
  {
    id: 'sc_001', emoji: '📚', title: '读30分钟书',
    desc: '关掉手机，安静地读一本书，给自己30分钟的专注',
    category: 'selfcare', difficulty: 'medium', fortune: 8, participants: 412,
    quickContent: '📚 今天读了30分钟书，暂时放下了手机，找回了久违的专注感',
    quickTags: ['善待自己'],
  },
  {
    id: 'sc_002', emoji: '🌙', title: '今天早睡30分钟',
    desc: '照顾好自己的身体，比平时早睡30分钟',
    category: 'selfcare', difficulty: 'medium', fortune: 8, participants: 267,
    quickContent: '🌙 今天比平时早睡了30分钟，明天早上应该精神好很多',
    quickTags: ['善待自己'],
  },
  {
    id: 'sc_003', emoji: '🚶', title: '散步15分钟',
    desc: '出门走一走，晒太阳、听风声、看路人，什么都不想',
    category: 'selfcare', difficulty: 'easy', fortune: 6, participants: 356,
    quickContent: '🚶 今天出门散了15分钟步，晒了晒太阳，心情好了很多',
    quickTags: ['善待自己'],
  },
  {
    id: 'sc_004', emoji: '🧘', title: '冥想5分钟',
    desc: '闭上眼睛，深呼吸，从头到脚放松，只需5分钟',
    category: 'selfcare', difficulty: 'easy', fortune: 6, participants: 189,
    quickContent: '🧘 今天冥想5分钟，深呼吸后感觉整个人都放松了',
    quickTags: ['善待自己'],
  },
  {
    id: 'sc_005', emoji: '📝', title: '写10分钟日记',
    desc: '把今天的感受写下来，不用很长，写给自己看',
    category: 'selfcare', difficulty: 'medium', fortune: 8, participants: 145,
    quickContent: '📝 今天写了10分钟日记，把开心和不开心的事都写下来，心里舒服多了',
    quickTags: ['善待自己'],
  },
  {
    id: 'sc_006', emoji: '🥗', title: '吃一顿健康餐',
    desc: '今天选一顿饭，吃得健康一点，少油少盐多蔬菜',
    category: 'selfcare', difficulty: 'easy', fortune: 5, participants: 234,
    quickContent: '🥗 今天吃了一顿健康餐，蔬菜沙拉加鸡胸肉，感觉身体很轻盈',
    quickTags: ['善待自己'],
  },
  {
    id: 'sc_007', emoji: '💧', title: '喝够8杯水',
    desc: '提醒自己多喝水，放一个水杯在身边，喝够了再回家',
    category: 'selfcare', difficulty: 'easy', fortune: 4, participants: 312,
    quickContent: '💧 今天提醒自己喝够了8杯水，皮肤感觉都好了',
    quickTags: ['善待自己'],
  },
  {
    id: 'sc_008', emoji: '🧹', title: '整理一个角落',
    desc: '整理房间的一个角落（书桌/衣柜/床头柜），干净后心情会变好',
    category: 'selfcare', difficulty: 'easy', fortune: 6, participants: 198,
    quickContent: '🧹 今天整理了书桌，扔掉了一些没用的东西，桌面干净了心情也好了',
    quickTags: ['善待自己'],
  },
];

// ============================================
// 认证机构任务（社区/政府/公益组织等发布）
// ============================================
const ORG_TASK_POOL: WeeklyInspiration[] = [
  {
    id: 'org_001', emoji: '🌳', title: '社区植树日',
    desc: '本周六上午9点，朝阳社区居委会组织植树活动，为小区增添一抹绿色',
    category: 'org', difficulty: 'medium', fortune: 20, participants: 156,
    quickContent: '🌳 今天参加了社区植树日活动，种了一棵小树苗，希望它能快快长大',
    quickTags: ['社区志愿', '环保'],
    orgName: '朝阳社区居委会', orgType: 'community',
  },
  {
    id: 'org_002', emoji: '🩸', title: '无偿献血',
    desc: '市红十字会组织无偿献血，献血200ml即可挽救一个生命',
    category: 'org', difficulty: 'medium', fortune: 30, participants: 342,
    quickContent: '🩸 今天去献血了，虽然有点紧张，但想到能帮助别人就觉得很值得',
    quickTags: ['公益', '献血'],
    orgName: '市红十字会', orgType: 'ngo',
  },
  {
    id: 'org_003', emoji: '👴', title: '敬老院探访',
    desc: '阳光公益组织招募志愿者，周日去敬老院陪老人聊天、读报',
    category: 'org', difficulty: 'medium', fortune: 25, participants: 89,
    quickContent: '👴 今天去敬老院陪张爷爷聊了两个小时，他讲了很多年轻时的故事',
    quickTags: ['公益', '敬老'],
    orgName: '阳光公益组织', orgType: 'ngo',
  },
  {
    id: 'org_004', emoji: '📚', title: '社区图书捐赠',
    desc: '街道办发起图书捐赠活动，把闲置书籍送给乡村小学的孩子',
    category: 'org', difficulty: 'easy', fortune: 15, participants: 234,
    quickContent: '📚 今天整理书柜捐了10本书，希望乡村的小朋友能喜欢',
    quickTags: ['社区志愿', '教育'],
    orgName: 'XX街道办', orgType: 'gov',
  },
  {
    id: 'org_005', emoji: '🐕', title: '流浪动物救助',
    desc: '动物保护协会招募志愿者，周末协助救助站清理笼舍、喂食',
    category: 'org', difficulty: 'hard', fortune: 25, participants: 67,
    quickContent: '🐕 今天去流浪动物救助站帮忙，给狗狗们洗澡喂食，它们好乖',
    quickTags: ['公益', '动物保护'],
    orgName: '动物保护协会', orgType: 'ngo',
  },
  {
    id: 'org_006', emoji: '🧹', title: '社区大扫除',
    desc: '社区物业联合居委会组织楼道清洁，清理小广告和堆物堆料',
    category: 'org', difficulty: 'medium', fortune: 18, participants: 198,
    quickContent: '🧹 参加了社区大扫除，清理了楼道里的小广告，环境干净多了',
    quickTags: ['社区志愿', '环保'],
    orgName: 'XX社区物业', orgType: 'community',
  },
  {
    id: 'org_007', emoji: '🎒', title: '山区助学物资整理',
    desc: '公益基金会招募志愿者，整理分类捐赠的学习用品和衣物',
    category: 'org', difficulty: 'easy', fortune: 20, participants: 112,
    quickContent: '🎒 今天帮公益基金会整理了一批山区助学物资，分类打包了一下午',
    quickTags: ['公益', '教育'],
    orgName: 'XX公益基金会', orgType: 'ngo',
  },
  {
    id: 'org_008', emoji: '🚮', title: '河流垃圾清理',
    desc: '市环保局联合志愿者协会，周末清理河岸垃圾，保护母亲河',
    category: 'org', difficulty: 'hard', fortune: 25, participants: 78,
    quickContent: '🚮 参加了河流垃圾清理活动，捡了三大袋垃圾，河水变干净了',
    quickTags: ['环保', '志愿'],
    orgName: '市环保局', orgType: 'gov',
  },
  {
    id: 'org_009', emoji: '🍱', title: '爱心午餐配送',
    desc: '社区养老服务中心招募志愿者，为独居老人配送午餐',
    category: 'org', difficulty: 'medium', fortune: 22, participants: 145,
    quickContent: '🍱 今天帮社区养老服务中心给独居老人送午餐，李奶奶拉着我的手说了好多谢谢',
    quickTags: ['社区志愿', '敬老'],
    orgName: 'XX社区养老服务中心', orgType: 'community',
  },
  {
    id: 'org_010', emoji: '📢', title: '文明交通劝导',
    desc: '市文明办招募志愿者，早晚高峰在路口劝导行人遵守交通规则',
    category: 'org', difficulty: 'easy', fortune: 15, participants: 267,
    quickContent: '📢 今天做了文明交通劝导员，提醒了几位闯红灯的行人，安全最重要',
    quickTags: ['文明倡导', '志愿'],
    orgName: '市文明办', orgType: 'gov',
  },
];

export { CHALLENGE_POOL };