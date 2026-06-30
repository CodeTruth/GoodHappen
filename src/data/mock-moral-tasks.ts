// 德育任务 mock 数据
// 场景：上海市实验学校 三年二班 善行圈（circleId = 'circle1'）

export type MoralCategory =
  // 班级
  | 'housework'
  | 'help_others'
  | 'environmental'
  | 'respect_elders'
  | 'reading'
  // 企业
  | 'charity'
  | 'volunteer'
  | 'innovation'
  | 'team'
  // 社区
  | 'elderly'
  | 'neighbor'
  | 'culture'
  | 'safety'
  // 朋友
  | 'help'
  | 'accompany'
  | 'share'
  | 'encourage'
  | 'memory'
  // 公共
  | 'education'
  | 'health'
  // 通用
  | 'custom';

// 类别配置（覆盖所有圈子类型）
export const CATEGORY_CONFIG: Record<MoralCategory, { name: string; icon: string; color: string }> = {
  // 班级
  housework: { name: '家务劳动', icon: '🏠', color: '#FF6B6B' },
  help_others: { name: '助人为乐', icon: '🤝', color: '#52C41A' },
  environmental: { name: '环保行动', icon: '🌿', color: '#13C2C2' },
  respect_elders: { name: '尊老爱幼', icon: '👴', color: '#FAAD14' },
  reading: { name: '阅读学习', icon: '📚', color: '#722ED1' },
  // 企业
  charity: { name: '公益慈善', icon: '❤️', color: '#FF6B6B' },
  volunteer: { name: '志愿服务', icon: '🤝', color: '#13C2C2' },
  innovation: { name: '创新贡献', icon: '💡', color: '#FAAD14' },
  team: { name: '团队协作', icon: '👥', color: '#722ED1' },
  // 社区
  elderly: { name: '敬老助老', icon: '👴', color: '#FAAD14' },
  neighbor: { name: '邻里互助', icon: '🤝', color: '#13C2C2' },
  culture: { name: '文化传承', icon: '📖', color: '#722ED1' },
  safety: { name: '安全守护', icon: '🛡️', color: '#FF6B6B' },
  // 朋友
  help: { name: '及时帮助', icon: '🆘', color: '#FF6B6B' },
  accompany: { name: '陪伴支持', icon: '💕', color: '#FAAD14' },
  share: { name: '好物分享', icon: '🎁', color: '#52C41A' },
  encourage: { name: '鼓励打气', icon: '💪', color: '#13C2C2' },
  memory: { name: '美好回忆', icon: '📸', color: '#722ED1' },
  // 公共
  education: { name: '教育助学', icon: '📚', color: '#722ED1' },
  health: { name: '健康关爱', icon: '🏥', color: '#13C2C2' },
  // 通用
  custom: { name: '自定义', icon: '✨', color: '#C4956A' },
};

// 德育任务
export interface MoralTask {
  id: string;
  circleId: string;
  title: string;
  description: string;
  category: MoralCategory;
  requireVideo: boolean;
  weekRange: { start: string; end: string };
  status: 'active' | 'expired';
  createdAt: string;
}

// 任务提交
export interface TaskSubmission {
  id: string;
  taskId: string | null; // null 表示自由记录
  userId: string;
  userName: string;
  userAvatar: string;
  circleId: string;
  content: string;
  videoUrl?: string;
  imageUrl?: string;
  reviewedBy?: string;
  teacherComment?: string;
  isExample: boolean;
  needsRevision: boolean;
  likes?: number; // 点赞数
  likedBy?: string[]; // 点赞用户ID列表
  comments?: { id: string; userId: string; userName: string; content: string; createdAt: string }[];
  createdAt: string;
}

// 周报数据
export interface WeeklyReport {
  weekRange: { start: string; end: string };
  circleId: string;
  totalCount: number;
  categoryDistribution: Record<string, number>;
  participationRate: number; // 百分比
  exampleCount: number;
  weekIndex: number; // W22, W23...
}

// 跨学期档案
export interface SemesterProfile {
  semester: string;
  yearLabel: string;
  totalCount: number;
  exampleCount: number;
  taskCompletionRate: number;
}

// ========== 本周日期 ==========
const now = new Date('2026-06-30');
const thisWeekStart = new Date(now);
thisWeekStart.setDate(now.getDate() - now.getDay());
const thisWeekEnd = new Date(thisWeekStart);
thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
const fmt = (d: Date) => d.toISOString().split('T')[0];

// ========== 3个德育任务 ==========
export const mockMoralTasks: MoralTask[] = [
  {
    id: 'task1',
    circleId: 'circle1',
    title: '帮父母做家务',
    description: '洗碗、扫地、整理房间、洗衣服等均可，请拍摄视频记录',
    category: 'housework',
    requireVideo: true,
    weekRange: { start: fmt(thisWeekStart), end: fmt(thisWeekEnd) },
    status: 'active',
    createdAt: '2026-06-29T08:00:00Z',
  },
  {
    id: 'task2',
    circleId: 'circle1',
    title: '主动帮助同学',
    description: '帮助同学解决学习困难、分享文具、一起打扫卫生等',
    category: 'help_others',
    requireVideo: false,
    weekRange: { start: fmt(thisWeekStart), end: fmt(thisWeekEnd) },
    status: 'active',
    createdAt: '2026-06-29T08:00:00Z',
  },
  {
    id: 'task3',
    circleId: 'circle1',
    title: '环保小行动',
    description: '垃圾分类、节约用水用电、爱护花草树木等',
    category: 'environmental',
    requireVideo: false,
    weekRange: { start: '2026-06-16', end: '2026-06-22' },
    status: 'expired',
    createdAt: '2026-06-16T08:00:00Z',
  },
  // --- 企业：科技公司善行圈（circle2）---
  {
    id: 'task4',
    circleId: 'circle2',
    title: '社区义工日',
    description: '前往社区敬老院陪伴老人，协助日常活动，记录服务时长',
    category: 'charity',
    requireVideo: false,
    weekRange: { start: fmt(thisWeekStart), end: fmt(thisWeekEnd) },
    status: 'active',
    createdAt: '2026-06-29T09:00:00Z',
  },
  {
    id: 'task5',
    circleId: 'circle2',
    title: '绿色办公周',
    description: '推行无纸化办公、节约用电、自带水杯，提交绿色办公小贴士',
    category: 'environmental',
    requireVideo: false,
    weekRange: { start: fmt(thisWeekStart), end: fmt(thisWeekEnd) },
    status: 'active',
    createdAt: '2026-06-29T09:00:00Z',
  },
  {
    id: 'task6',
    circleId: 'circle2',
    title: '跨部门协作挑战',
    description: '与技术部以外的同事合作完成一项公益创新方案',
    category: 'team',
    requireVideo: false,
    weekRange: { start: '2026-06-16', end: '2026-06-22' },
    status: 'expired',
    createdAt: '2026-06-16T09:00:00Z',
  },
  // --- 社区：阳光社区善行圈（circle3）---
  {
    id: 'task7',
    circleId: 'circle3',
    title: '楼道清洁日',
    description: '清理所住楼道垃圾、擦拭扶手和门窗，拍照记录前后对比',
    category: 'environmental',
    requireVideo: false,
    weekRange: { start: fmt(thisWeekStart), end: fmt(thisWeekEnd) },
    status: 'active',
    createdAt: '2026-06-29T10:00:00Z',
  },
  {
    id: 'task8',
    circleId: 'circle3',
    title: '关爱独居老人',
    description: '定期探访社区独居老人，陪聊天、帮忙买菜或代取快递',
    category: 'elderly',
    requireVideo: false,
    weekRange: { start: fmt(thisWeekStart), end: fmt(thisWeekEnd) },
    status: 'active',
    createdAt: '2026-06-29T10:00:00Z',
  },
  {
    id: 'task9',
    circleId: 'circle3',
    title: '邻里互助站',
    description: '在互助群中响应邻居需求，或出借闲置物品给有需要的邻居',
    category: 'neighbor',
    requireVideo: false,
    weekRange: { start: '2026-06-16', end: '2026-06-22' },
    status: 'expired',
    createdAt: '2026-06-16T10:00:00Z',
  },
  // --- 朋友：老友记善行圈（circle4）---
  {
    id: 'task10',
    circleId: 'circle4',
    title: '互助打卡',
    description: '本周为朋友做一件力所能及的事，可以是帮搬家、带饭、修电脑等',
    category: 'help',
    requireVideo: false,
    weekRange: { start: fmt(thisWeekStart), end: fmt(thisWeekEnd) },
    status: 'active',
    createdAt: '2026-06-29T11:00:00Z',
  },
  {
    id: 'task11',
    circleId: 'circle4',
    title: '陪伴时光',
    description: '陪伴朋友度过重要时刻或低落时期，一起吃饭、散步、聊天均可',
    category: 'accompany',
    requireVideo: false,
    weekRange: { start: fmt(thisWeekStart), end: fmt(thisWeekEnd) },
    status: 'active',
    createdAt: '2026-06-29T11:00:00Z',
  },
  {
    id: 'task12',
    circleId: 'circle4',
    title: '美好回忆集',
    description: '记录和朋友的一次美好聚会或旅行，配照片和文字感言',
    category: 'memory',
    requireVideo: false,
    weekRange: { start: '2026-06-16', end: '2026-06-22' },
    status: 'expired',
    createdAt: '2026-06-16T11:00:00Z',
  },
];

// ========== 20+ 条提交记录 ==========
// 学生：m1=温暖小太阳(管理员), m2=小明, m3=小红, m4=小华, m5=小芳
export const mockTaskSubmissions: TaskSubmission[] = [
  // --- 本周任务1：帮父母做家务 (task1) ---
  {
    id: 'sub1', taskId: 'task1', userId: 'u2', userName: '小明', userAvatar: 'https://picsum.photos/id/65/200/200',
    circleId: 'circle1', content: '今天帮妈妈做了番茄炒蛋，还主动把厨房擦得干干净净！妈妈说我是她的小帮手，特别开心。',
    videoUrl: 'https://example.com/video1', teacherComment: '真棒，独立完成一桌菜，越来越熟练了！', isExample: true, needsRevision: false,
    createdAt: '2026-06-29T18:30:00Z',
  },
  {
    id: 'sub2', taskId: 'task1', userId: 'u3', userName: '小红', userAvatar: 'https://picsum.photos/id/66/200/200',
    circleId: 'circle1', content: '今天扫地拖地，还把衣服叠好了，妈妈说我很能干！',
    videoUrl: 'https://example.com/video2', isExample: false, needsRevision: false,
    createdAt: '2026-06-28T19:00:00Z',
  },
  {
    id: 'sub3', taskId: 'task1', userId: 'u4', userName: '小华', userAvatar: 'https://picsum.photos/id/67/200/200',
    circleId: 'circle1', content: '洗碗了', videoUrl: 'https://example.com/video3', isExample: false, needsRevision: false,
    createdAt: '2026-06-29T20:00:00Z',
  },
  {
    id: 'sub4', taskId: 'task1', userId: 'u5', userName: '小芳', userAvatar: 'https://picsum.photos/id/68/200/200',
    circleId: 'circle1', content: '帮奶奶浇了阳台上的花，还帮她拿药，奶奶说我是好孩子。',
    videoUrl: 'https://example.com/video4', isExample: false, needsRevision: false,
    createdAt: '2026-06-27T17:00:00Z',
  },
  {
    id: 'sub5', taskId: 'task1', userId: 'currentUser', userName: '温暖小太阳', userAvatar: 'https://picsum.photos/id/64/200/200',
    circleId: 'circle1', content: '帮爸爸洗车，还整理了客厅的茶几，把杂志都摆整齐了。',
    videoUrl: 'https://example.com/video5', isExample: false, needsRevision: false,
    createdAt: '2026-06-28T18:00:00Z',
  },
  // --- 本周任务2：主动帮助同学 (task2) ---
  {
    id: 'sub6', taskId: 'task2', userId: 'u2', userName: '小明', userAvatar: 'https://picsum.photos/id/65/200/200',
    circleId: 'circle1', content: '数学课的时候，小红有道题不会，我下课给她讲了三遍，她终于会了！',
    teacherComment: '乐于助人的好同学，老师为你骄傲！', isExample: true, needsRevision: false,
    createdAt: '2026-06-29T15:30:00Z',
  },
  {
    id: 'sub7', taskId: 'task2', userId: 'u3', userName: '小红', userAvatar: 'https://picsum.photos/id/66/200/200',
    circleId: 'circle1', content: '中午吃饭的时候，看到同学饭卡掉了，马上捡起来还给了他。',
    isExample: false, needsRevision: false,
    createdAt: '2026-06-28T12:00:00Z',
  },
  {
    id: 'sub8', taskId: 'task2', userId: 'u5', userName: '小芳', userAvatar: 'https://picsum.photos/id/68/200/200',
    circleId: 'circle1', content: '帮同学捡起了掉在地上的书。', isExample: false, needsRevision: false,
    createdAt: '2026-06-29T14:00:00Z',
  },
  {
    id: 'sub9', taskId: 'task2', userId: 'u4', userName: '小华', userAvatar: 'https://picsum.photos/id/67/200/200',
    circleId: 'circle1', content: '扶了同学。', isExample: false, needsRevision: false,
    createdAt: '2026-06-27T09:00:00Z',
  },
  // --- 上周任务3：环保小行动 (task3, expired) ---
  {
    id: 'sub10', taskId: 'task3', userId: 'u2', userName: '小明', userAvatar: 'https://picsum.photos/id/65/200/200',
    circleId: 'circle1', content: '和妈妈一起做了垃圾分类，把家里所有的垃圾都分好类了，妈妈说我是环保小卫士！',
    videoUrl: 'https://example.com/video6', teacherComment: '垃圾分类做得好，从小培养环保意识！', isExample: true, needsRevision: false,
    createdAt: '2026-06-20T18:00:00Z',
  },
  {
    id: 'sub11', taskId: 'task3', userId: 'u3', userName: '小红', userAvatar: 'https://picsum.photos/id/66/200/200',
    circleId: 'circle1', content: '洗手的时候把水龙头关小了，节约用水。', isExample: false, needsRevision: false,
    createdAt: '2026-06-19T19:00:00Z',
  },
  {
    id: 'sub12', taskId: 'task3', userId: 'u4', userName: '小华', userAvatar: 'https://picsum.photos/id/67/200/200',
    circleId: 'circle1', content: '把废纸收集起来交给老师回收。', isExample: false, needsRevision: false,
    createdAt: '2026-06-21T17:00:00Z',
  },
  {
    id: 'sub13', taskId: 'task3', userId: 'u5', userName: '小芳', userAvatar: 'https://picsum.photos/id/68/200/200',
    circleId: 'circle1', content: '下雨天把外面晾的衣服收回来了，还关了阳台的窗户。', isExample: false, needsRevision: false,
    createdAt: '2026-06-18T16:00:00Z',
  },
  // --- 自由记录（taskId: null）---
  {
    id: 'sub14', taskId: null, userId: 'u2', userName: '小明', userAvatar: 'https://picsum.photos/id/65/200/200',
    circleId: 'circle1', content: '今天放学路上看到一个老奶奶过马路很慢，我主动过去扶她过了马路，她夸我是好孩子。',
    isExample: true, needsRevision: false,
    createdAt: '2026-06-26T17:00:00Z',
  },
  {
    id: 'sub15', taskId: null, userId: 'u3', userName: '小红', userAvatar: 'https://picsum.photos/id/66/200/200',
    circleId: 'circle1', content: '周末读了《小王子》，特别感动，明白了什么是真正的友谊。',
    isExample: false, needsRevision: false,
    createdAt: '2026-06-25T20:00:00Z',
  },
  {
    id: 'sub16', taskId: null, userId: 'u5', userName: '小芳', userAvatar: 'https://picsum.photos/id/68/200/200',
    circleId: 'circle1', content: '爸爸生日，我画了一幅画送给他，爸爸可开心了！', isExample: false, needsRevision: false,
    createdAt: '2026-06-24T19:00:00Z',
  },
  {
    id: 'sub17', taskId: null, userId: 'u2', userName: '小明', userAvatar: 'https://picsum.photos/id/65/200/200',
    circleId: 'circle1', content: '今天体育课的时候，同学摔倒了，我马上扶他起来，还陪他去了医务室。',
    isExample: false, needsRevision: false,
    createdAt: '2026-06-23T15:00:00Z',
  },
  {
    id: 'sub18', taskId: null, userId: 'u4', userName: '小华', userAvatar: 'https://picsum.photos/id/67/200/200',
    circleId: 'circle1', content: '帮妈妈叠衣服。', isExample: false, needsRevision: false,
    createdAt: '2026-06-22T18:00:00Z',
  },
  {
    id: 'sub19', taskId: null, userId: 'currentUser', userName: '温暖小太阳', userAvatar: 'https://picsum.photos/id/64/200/200',
    circleId: 'circle1', content: '今天主动帮值日生擦黑板，老师表扬我了！', isExample: false, needsRevision: false,
    createdAt: '2026-06-21T17:00:00Z',
  },
  {
    id: 'sub20', taskId: null, userId: 'u3', userName: '小红', userAvatar: 'https://picsum.photos/id/66/200/200',
    circleId: 'circle1', content: '下雨天主动把走廊的伞都摆整齐了。', isExample: false, needsRevision: false,
    createdAt: '2026-06-20T16:00:00Z',
  },
  {
    id: 'sub21', taskId: 'task1', userId: 'u2', userName: '小明', userAvatar: 'https://picsum.photos/id/65/200/200',
    circleId: 'circle1', content: '又帮妈妈拖了地，特别累但是很有成就感！', videoUrl: 'https://example.com/video7',
    isExample: false, needsRevision: false,
    createdAt: '2026-06-28T19:30:00Z',
  },
  {
    id: 'sub22', taskId: null, userId: 'u2', userName: '小明', userAvatar: 'https://picsum.photos/id/65/200/200',
    circleId: 'circle1', content: '给流浪猫喂了吃的，看它吃得很香。', isExample: false, needsRevision: false,
    createdAt: '2026-06-27T18:00:00Z',
  },
  {
    id: 'sub23', taskId: 'task2', userId: 'currentUser', userName: '温暖小太阳', userAvatar: 'https://picsum.photos/id/64/200/200',
    circleId: 'circle1', content: '借给同学彩色笔，他画了一幅好看的画。', isExample: false, needsRevision: false,
    createdAt: '2026-06-29T10:00:00Z',
  },
  // ========== 企业：科技公司善行圈（circle2）==========
  // --- task4: 社区义工日 ---
  {
    id: 'sub24', taskId: 'task4', userId: 'u20', userName: '技术部小张', userAvatar: 'https://picsum.photos/id/70/200/200',
    circleId: 'circle2', content: '周六去了阳光敬老院，陪王奶奶读了一下午报纸，她讲了很多年轻时的故事，感触很深。',
    isExample: true, needsRevision: false, createdAt: '2026-06-28T15:00:00Z',
  },
  {
    id: 'sub25', taskId: 'task4', userId: 'u21', userName: '市场部小李', userAvatar: 'https://picsum.photos/id/71/200/200',
    circleId: 'circle2', content: '和同事们一起给敬老院包了饺子，老人们吃得特别开心，还夸我们手艺好！',
    isExample: false, needsRevision: false, createdAt: '2026-06-27T12:00:00Z',
  },
  {
    id: 'sub26', taskId: 'task4', userId: 'currentUser', userName: '温暖小太阳', userAvatar: 'https://picsum.photos/id/64/200/200',
    circleId: 'circle2', content: '帮敬老院的李爷爷修好了收音机，他高兴得合不拢嘴，一直拉着我的手道谢。',
    isExample: false, needsRevision: false, createdAt: '2026-06-26T16:00:00Z',
  },
  // --- task5: 绿色办公周 ---
  {
    id: 'sub27', taskId: 'task5', userId: 'u22', userName: '运营部小王', userAvatar: 'https://picsum.photos/id/72/200/200',
    circleId: 'circle2', content: '本周推行了电子签批，减少了约200张A4纸的使用，还整理了绿色办公小贴士分享给大家。',
    isExample: true, needsRevision: false, createdAt: '2026-06-28T10:00:00Z',
  },
  {
    id: 'sub28', taskId: 'task5', userId: 'u23', userName: '产品部小陈', userAvatar: 'https://picsum.photos/id/73/200/200',
    circleId: 'circle2', content: '每天自带水杯，拒绝了一次性纸杯，还提醒了周围同事一起加入。',
    isExample: false, needsRevision: false, createdAt: '2026-06-27T09:00:00Z',
  },
  {
    id: 'sub29', taskId: 'task5', userId: 'u24', userName: '人事部小刘', userAvatar: 'https://picsum.photos/id/74/200/200',
    circleId: 'circle2', content: '下班前检查全部门关灯关空调，养成节能好习惯。',
    isExample: false, needsRevision: false, createdAt: '2026-06-26T18:00:00Z',
  },
  // --- task6: 跨部门协作挑战（expired）---
  {
    id: 'sub30', taskId: 'task6', userId: 'u20', userName: '技术部小张', userAvatar: 'https://picsum.photos/id/70/200/200',
    circleId: 'circle2', content: '和市场部小李合作开发了"爱心捐赠"小程序原型，方便大家在线捐赠闲置物品。',
    isExample: true, needsRevision: false, createdAt: '2026-06-20T14:00:00Z',
  },
  {
    id: 'sub31', taskId: 'task6', userId: 'u21', userName: '市场部小李', userAvatar: 'https://picsum.photos/id/71/200/200',
    circleId: 'circle2', content: '配合技术部做了用户调研，收集了50多份公益需求问卷。',
    isExample: false, needsRevision: false, createdAt: '2026-06-19T11:00:00Z',
  },
  // --- 自由记录 ---
  {
    id: 'sub32', taskId: null, userId: 'u22', userName: '运营部小王', userAvatar: 'https://picsum.photos/id/72/200/200',
    circleId: 'circle2', content: '看到同事加班到很晚，主动帮他带了晚餐，他说很暖心。',
    isExample: false, needsRevision: false, createdAt: '2026-06-25T20:00:00Z',
  },
  {
    id: 'sub33', taskId: null, userId: 'currentUser', userName: '温暖小太阳', userAvatar: 'https://picsum.photos/id/64/200/200',
    circleId: 'circle2', content: '帮新来的实习生熟悉公司环境，带他吃了第一顿午餐。',
    isExample: false, needsRevision: false, createdAt: '2026-06-24T12:00:00Z',
  },
  // ========== 社区：阳光社区善行圈（circle3）==========
  // --- task7: 楼道清洁日 ---
  {
    id: 'sub34', taskId: 'task7', userId: 'u30', userName: '1号楼张阿姨', userAvatar: 'https://picsum.photos/id/75/200/200',
    circleId: 'circle3', content: '把1号楼3层的楼道从头到尾擦了一遍，还喷了消毒液，邻居们都说干净多了！',
    isExample: true, needsRevision: false, createdAt: '2026-06-28T08:00:00Z',
  },
  {
    id: 'sub35', taskId: 'task7', userId: 'u31', userName: '2号楼李大爷', userAvatar: 'https://picsum.photos/id/76/200/200',
    circleId: 'circle3', content: '清理了楼道堆放的杂物，消除了消防隐患。',
    isExample: false, needsRevision: false, createdAt: '2026-06-27T07:00:00Z',
  },
  {
    id: 'sub36', taskId: 'task7', userId: 'currentUser', userName: '温暖小太阳', userAvatar: 'https://picsum.photos/id/64/200/200',
    circleId: 'circle3', content: '打扫了电梯间，把小广告都撕掉了，还贴了文明提示牌。',
    isExample: false, needsRevision: false, createdAt: '2026-06-26T09:00:00Z',
  },
  // --- task8: 关爱独居老人 ---
  {
    id: 'sub37', taskId: 'task8', userId: 'u32', userName: '3号楼王阿姨', userAvatar: 'https://picsum.photos/id/77/200/200',
    circleId: 'circle3', content: '每天下午去刘奶奶家陪她聊半小时天，帮她买了菜和降压药。',
    isExample: true, needsRevision: false, createdAt: '2026-06-28T17:00:00Z',
  },
  {
    id: 'sub38', taskId: 'task8', userId: 'u33', userName: '1号楼赵叔叔', userAvatar: 'https://picsum.photos/id/78/200/200',
    circleId: 'circle3', content: '帮独居的张大爷修好了漏水的水龙头，还检查了家里的电路安全。',
    isExample: false, needsRevision: false, createdAt: '2026-06-27T16:00:00Z',
  },
  {
    id: 'sub39', taskId: 'task8', userId: 'u34', userName: '2号楼孙奶奶', userAvatar: 'https://picsum.photos/id/79/200/200',
    circleId: 'circle3', content: '给隔壁独居的小周送了亲手包的馄饨，年轻人工作忙，要照顾好自己。',
    isExample: false, needsRevision: false, createdAt: '2026-06-26T18:00:00Z',
  },
  // --- task9: 邻里互助站（expired）---
  {
    id: 'sub40', taskId: 'task9', userId: 'u30', userName: '1号楼张阿姨', userAvatar: 'https://picsum.photos/id/75/200/200',
    circleId: 'circle3', content: '把家里闲置的婴儿车和绘本放到了共享角，很快就有邻居来领用了。',
    isExample: true, needsRevision: false, createdAt: '2026-06-20T10:00:00Z',
  },
  {
    id: 'sub41', taskId: 'task9', userId: 'u32', userName: '3号楼王阿姨', userAvatar: 'https://picsum.photos/id/77/200/200',
    circleId: 'circle3', content: '在群里响应了代取快递的需求，帮2户邻居顺路带了上来。',
    isExample: false, needsRevision: false, createdAt: '2026-06-19T18:00:00Z',
  },
  // --- 自由记录 ---
  {
    id: 'sub42', taskId: null, userId: 'u31', userName: '2号楼李大爷', userAvatar: 'https://picsum.photos/id/76/200/200',
    circleId: 'circle3', content: '下雨天看到邻居没关车窗，赶紧在群里提醒，避免了损失。',
    isExample: false, needsRevision: false, createdAt: '2026-06-25T15:00:00Z',
  },
  {
    id: 'sub43', taskId: null, userId: 'currentUser', userName: '温暖小太阳', userAvatar: 'https://picsum.photos/id/64/200/200',
    circleId: 'circle3', content: '帮张阿姨用手机APP挂了专家号，她夸我比亲孩子还贴心。',
    isExample: false, needsRevision: false, createdAt: '2026-06-24T10:00:00Z',
  },
  // ========== 朋友：老友记善行圈（circle4）==========
  // --- task10: 互助打卡 ---
  {
    id: 'sub44', taskId: 'task10', userId: 'u41', userName: '阿杰', userAvatar: 'https://picsum.photos/id/80/200/200',
    circleId: 'circle4', content: '大伟搬家，我和小美一起去帮忙，搬了十几趟终于搞定了，晚上一起吃火锅庆祝！',
    isExample: true, needsRevision: false, createdAt: '2026-06-28T20:00:00Z',
  },
  {
    id: 'sub45', taskId: 'task10', userId: 'u42', userName: '小美', userAvatar: 'https://picsum.photos/id/81/200/200',
    circleId: 'circle4', content: '小丽电脑坏了，我帮她重装了系统，还教了她几个快捷键。',
    isExample: false, needsRevision: false, createdAt: '2026-06-27T19:00:00Z',
  },
  {
    id: 'sub46', taskId: 'task10', userId: 'u43', userName: '大伟', userAvatar: 'https://picsum.photos/id/82/200/200',
    circleId: 'circle4', content: '阿杰加班没吃晚饭，我给他带了份他最爱的红烧肉盖饭。',
    isExample: false, needsRevision: false, createdAt: '2026-06-26T21:00:00Z',
  },
  {
    id: 'sub47', taskId: 'task10', userId: 'currentUser', userName: '温暖小太阳', userAvatar: 'https://picsum.photos/id/64/200/200',
    circleId: 'circle4', content: '阿杰的车打不着火了，我赶过去帮他搭了电，友谊的小船稳得很。',
    isExample: false, needsRevision: false, createdAt: '2026-06-25T18:00:00Z',
  },
  // --- task11: 陪伴时光 ---
  {
    id: 'sub48', taskId: 'task11', userId: 'u42', userName: '小美', userAvatar: 'https://picsum.photos/id/81/200/200',
    circleId: 'circle4', content: '小丽最近失恋了，我陪她在江边散步聊了一晚上，她心情好多了。',
    isExample: true, needsRevision: false, createdAt: '2026-06-28T22:00:00Z',
  },
  {
    id: 'sub49', taskId: 'task11', userId: 'u44', userName: '小丽', userAvatar: 'https://picsum.photos/id/83/200/200',
    circleId: 'circle4', content: '大伟面试紧张，我陪他模拟了三次，最后他顺利拿到了offer！',
    isExample: false, needsRevision: false, createdAt: '2026-06-27T15:00:00Z',
  },
  {
    id: 'sub50', taskId: 'task11', userId: 'u41', userName: '阿杰', userAvatar: 'https://picsum.photos/id/80/200/200',
    circleId: 'circle4', content: '周末陪小美去医院做检查，排队挂号拿药全程陪着，朋友说关键时刻还是得靠兄弟。',
    isExample: false, needsRevision: false, createdAt: '2026-06-26T14:00:00Z',
  },
  // --- task12: 美好回忆集（expired）---
  {
    id: 'sub51', taskId: 'task12', userId: 'u43', userName: '大伟', userAvatar: 'https://picsum.photos/id/82/200/200',
    circleId: 'circle4', content: '去年一起去云南旅行的照片整理出来了，大理的洱海、丽江的古城，每一张都是回忆杀！',
    isExample: true, needsRevision: false, createdAt: '2026-06-20T12:00:00Z',
  },
  {
    id: 'sub52', taskId: 'task12', userId: 'u44', userName: '小丽', userAvatar: 'https://picsum.photos/id/83/200/200',
    circleId: 'circle4', content: '整理了毕业十周年的聚会相册，大家变化好大但感情没变，约定五年后再聚！',
    isExample: false, needsRevision: false, createdAt: '2026-06-19T20:00:00Z',
  },
  // --- 自由记录 ---
  {
    id: 'sub53', taskId: null, userId: 'u41', userName: '阿杰', userAvatar: 'https://picsum.photos/id/80/200/200',
    circleId: 'circle4', content: '小美生日，我们几个偷偷给她准备了惊喜派对，她感动得哭了。',
    isExample: false, needsRevision: false, createdAt: '2026-06-24T21:00:00Z',
  },
  {
    id: 'sub54', taskId: null, userId: 'currentUser', userName: '温暖小太阳', userAvatar: 'https://picsum.photos/id/64/200/200',
    circleId: 'circle4', content: '给考研的阿杰寄了一箱他喜欢的零食和鼓励卡片，他说备考动力满满。',
    isExample: false, needsRevision: false, createdAt: '2026-06-23T16:00:00Z',
  },
];

// ========== 4周周报数据 ==========
export const mockWeeklyReports: WeeklyReport[] = [
  {
    weekRange: { start: '2026-06-02', end: '2026-06-08' },
    circleId: 'circle1', totalCount: 85, categoryDistribution: { housework: 35, help_others: 22, environmental: 15, respect_elders: 8, reading: 3, custom: 2 },
    participationRate: 78, exampleCount: 4, weekIndex: 22,
  },
  {
    weekRange: { start: '2026-06-09', end: '2026-06-15' },
    circleId: 'circle1', totalCount: 98, categoryDistribution: { housework: 38, help_others: 25, environmental: 18, respect_elders: 10, reading: 5, custom: 2 },
    participationRate: 82, exampleCount: 5, weekIndex: 23,
  },
  {
    weekRange: { start: '2026-06-16', end: '2026-06-22' },
    circleId: 'circle1', totalCount: 110, categoryDistribution: { housework: 42, help_others: 28, environmental: 20, respect_elders: 12, reading: 6, custom: 2 },
    participationRate: 85, exampleCount: 6, weekIndex: 24,
  },
  {
    weekRange: { start: '2026-06-23', end: '2026-06-29' },
    circleId: 'circle1', totalCount: 128, categoryDistribution: { housework: 48, help_others: 32, environmental: 24, respect_elders: 14, reading: 7, custom: 3 },
    participationRate: 89, exampleCount: 7, weekIndex: 25,
  },
  // --- circle2: 企业 ---
  {
    weekRange: { start: '2026-06-02', end: '2026-06-08' },
    circleId: 'circle2', totalCount: 42, categoryDistribution: { charity: 12, environmental: 10, volunteer: 8, innovation: 6, team: 4, custom: 2 },
    participationRate: 65, exampleCount: 2, weekIndex: 22,
  },
  {
    weekRange: { start: '2026-06-09', end: '2026-06-15' },
    circleId: 'circle2', totalCount: 55, categoryDistribution: { charity: 15, environmental: 12, volunteer: 10, innovation: 8, team: 6, custom: 4 },
    participationRate: 72, exampleCount: 3, weekIndex: 23,
  },
  {
    weekRange: { start: '2026-06-16', end: '2026-06-22' },
    circleId: 'circle2', totalCount: 68, categoryDistribution: { charity: 18, environmental: 15, volunteer: 12, innovation: 10, team: 8, custom: 5 },
    participationRate: 78, exampleCount: 4, weekIndex: 24,
  },
  {
    weekRange: { start: '2026-06-23', end: '2026-06-29' },
    circleId: 'circle2', totalCount: 76, categoryDistribution: { charity: 20, environmental: 18, volunteer: 14, innovation: 12, team: 8, custom: 4 },
    participationRate: 82, exampleCount: 5, weekIndex: 25,
  },
  // --- circle3: 社区 ---
  {
    weekRange: { start: '2026-06-02', end: '2026-06-08' },
    circleId: 'circle3', totalCount: 38, categoryDistribution: { environmental: 12, elderly: 10, neighbor: 8, culture: 4, safety: 3, custom: 1 },
    participationRate: 58, exampleCount: 2, weekIndex: 22,
  },
  {
    weekRange: { start: '2026-06-09', end: '2026-06-15' },
    circleId: 'circle3', totalCount: 48, categoryDistribution: { environmental: 15, elderly: 12, neighbor: 10, culture: 5, safety: 4, custom: 2 },
    participationRate: 65, exampleCount: 3, weekIndex: 23,
  },
  {
    weekRange: { start: '2026-06-16', end: '2026-06-22' },
    circleId: 'circle3', totalCount: 62, categoryDistribution: { environmental: 18, elderly: 16, neighbor: 12, culture: 8, safety: 5, custom: 3 },
    participationRate: 74, exampleCount: 4, weekIndex: 24,
  },
  {
    weekRange: { start: '2026-06-23', end: '2026-06-29' },
    circleId: 'circle3', totalCount: 70, categoryDistribution: { environmental: 20, elderly: 18, neighbor: 14, culture: 10, safety: 5, custom: 3 },
    participationRate: 80, exampleCount: 5, weekIndex: 25,
  },
  // --- circle4: 朋友 ---
  {
    weekRange: { start: '2026-06-02', end: '2026-06-08' },
    circleId: 'circle4', totalCount: 25, categoryDistribution: { help: 8, accompany: 6, share: 4, encourage: 3, memory: 3, custom: 1 },
    participationRate: 70, exampleCount: 2, weekIndex: 22,
  },
  {
    weekRange: { start: '2026-06-09', end: '2026-06-15' },
    circleId: 'circle4', totalCount: 32, categoryDistribution: { help: 10, accompany: 8, share: 5, encourage: 4, memory: 4, custom: 1 },
    participationRate: 78, exampleCount: 3, weekIndex: 23,
  },
  {
    weekRange: { start: '2026-06-16', end: '2026-06-22' },
    circleId: 'circle4', totalCount: 40, categoryDistribution: { help: 12, accompany: 10, share: 6, encourage: 5, memory: 5, custom: 2 },
    participationRate: 85, exampleCount: 4, weekIndex: 24,
  },
  {
    weekRange: { start: '2026-06-23', end: '2026-06-29' },
    circleId: 'circle4', totalCount: 45, categoryDistribution: { help: 14, accompany: 12, share: 7, encourage: 5, memory: 5, custom: 2 },
    participationRate: 88, exampleCount: 5, weekIndex: 25,
  },
];

// ========== 跨学期档案数据 ==========
export const mockSemesterProfiles: Record<string, SemesterProfile[]> = {
  u2: [
    { semester: '二年级下', yearLabel: '2024-2025学年', totalCount: 86, exampleCount: 5, taskCompletionRate: 94 },
    { semester: '三年级上', yearLabel: '2025-2026学年', totalCount: 112, exampleCount: 8, taskCompletionRate: 96 },
    { semester: '三年级下', yearLabel: '2025-2026学年', totalCount: 67, exampleCount: 3, taskCompletionRate: 95 },
  ],
  u3: [
    { semester: '二年级下', yearLabel: '2024-2025学年', totalCount: 72, exampleCount: 4, taskCompletionRate: 88 },
    { semester: '三年级上', yearLabel: '2025-2026学年', totalCount: 98, exampleCount: 6, taskCompletionRate: 91 },
    { semester: '三年级下', yearLabel: '2025-2026学年', totalCount: 55, exampleCount: 2, taskCompletionRate: 90 },
  ],
  u4: [
    { semester: '二年级下', yearLabel: '2024-2025学年', totalCount: 45, exampleCount: 1, taskCompletionRate: 72 },
    { semester: '三年级上', yearLabel: '2025-2026学年', totalCount: 68, exampleCount: 2, taskCompletionRate: 78 },
    { semester: '三年级下', yearLabel: '2025-2026学年', totalCount: 38, exampleCount: 0, taskCompletionRate: 75 },
  ],
  u5: [
    { semester: '二年级下', yearLabel: '2024-2025学年', totalCount: 58, exampleCount: 2, taskCompletionRate: 82 },
    { semester: '三年级上', yearLabel: '2025-2026学年', totalCount: 85, exampleCount: 4, taskCompletionRate: 86 },
    { semester: '三年级下', yearLabel: '2025-2026学年', totalCount: 48, exampleCount: 1, taskCompletionRate: 84 },
  ],
  currentUser: [
    { semester: '二年级下', yearLabel: '2024-2025学年', totalCount: 76, exampleCount: 4, taskCompletionRate: 90 },
    { semester: '三年级上', yearLabel: '2025-2026学年', totalCount: 95, exampleCount: 7, taskCompletionRate: 93 },
    { semester: '三年级下', yearLabel: '2025-2026学年', totalCount: 52, exampleCount: 2, taskCompletionRate: 88 },
  ],
  // --- 企业成员 ---
  u20: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 32, exampleCount: 3, taskCompletionRate: 85 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 28, exampleCount: 2, taskCompletionRate: 90 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 18, exampleCount: 1, taskCompletionRate: 88 },
  ],
  u21: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 24, exampleCount: 2, taskCompletionRate: 78 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 30, exampleCount: 3, taskCompletionRate: 92 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 15, exampleCount: 1, taskCompletionRate: 85 },
  ],
  u22: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 20, exampleCount: 1, taskCompletionRate: 72 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 25, exampleCount: 2, taskCompletionRate: 80 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 12, exampleCount: 0, taskCompletionRate: 75 },
  ],
  u23: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 18, exampleCount: 1, taskCompletionRate: 70 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 22, exampleCount: 1, taskCompletionRate: 82 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 10, exampleCount: 0, taskCompletionRate: 70 },
  ],
  u24: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 15, exampleCount: 0, taskCompletionRate: 65 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 20, exampleCount: 1, taskCompletionRate: 78 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 8, exampleCount: 0, taskCompletionRate: 68 },
  ],
  // --- 社区居民 ---
  u30: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 45, exampleCount: 4, taskCompletionRate: 88 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 52, exampleCount: 5, taskCompletionRate: 92 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 30, exampleCount: 2, taskCompletionRate: 90 },
  ],
  u31: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 38, exampleCount: 3, taskCompletionRate: 82 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 42, exampleCount: 3, taskCompletionRate: 85 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 25, exampleCount: 1, taskCompletionRate: 80 },
  ],
  u32: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 35, exampleCount: 2, taskCompletionRate: 80 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 40, exampleCount: 3, taskCompletionRate: 88 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 22, exampleCount: 1, taskCompletionRate: 85 },
  ],
  u33: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 28, exampleCount: 1, taskCompletionRate: 75 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 32, exampleCount: 2, taskCompletionRate: 82 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 18, exampleCount: 0, taskCompletionRate: 78 },
  ],
  u34: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 30, exampleCount: 2, taskCompletionRate: 78 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 35, exampleCount: 2, taskCompletionRate: 85 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 20, exampleCount: 1, taskCompletionRate: 80 },
  ],
  // --- 朋友圈 ---
  u41: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 42, exampleCount: 3, taskCompletionRate: 90 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 38, exampleCount: 2, taskCompletionRate: 88 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 25, exampleCount: 1, taskCompletionRate: 85 },
  ],
  u42: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 35, exampleCount: 2, taskCompletionRate: 85 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 32, exampleCount: 2, taskCompletionRate: 86 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 20, exampleCount: 1, taskCompletionRate: 82 },
  ],
  u43: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 30, exampleCount: 1, taskCompletionRate: 80 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 28, exampleCount: 1, taskCompletionRate: 82 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 18, exampleCount: 0, taskCompletionRate: 78 },
  ],
  u44: [
    { semester: '2024年度', yearLabel: '2024年', totalCount: 25, exampleCount: 1, taskCompletionRate: 75 },
    { semester: '2025上半年', yearLabel: '2025年', totalCount: 24, exampleCount: 1, taskCompletionRate: 80 },
    { semester: '2025下半年', yearLabel: '2025年', totalCount: 15, exampleCount: 0, taskCompletionRate: 72 },
  ],
};
