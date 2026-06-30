// 德育任务 mock 数据
// 场景：上海市实验学校 三年二班 善行圈（circleId = 'circle1'）

export type MoralCategory =
  | 'housework'
  | 'help_others'
  | 'environmental'
  | 'respect_elders'
  | 'reading'
  | 'custom';

// 类别配置
export const CATEGORY_CONFIG: Record<MoralCategory, { name: string; icon: string; color: string }> = {
  housework: { name: '家务劳动', icon: '🏠', color: '#FF6B6B' },
  help_others: { name: '助人为乐', icon: '🤝', color: '#52C41A' },
  environmental: { name: '环保行动', icon: '🌿', color: '#13C2C2' },
  respect_elders: { name: '尊老爱幼', icon: '👴', color: '#FAAD14' },
  reading: { name: '阅读学习', icon: '📚', color: '#722ED1' },
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
  createdAt: string;
}

// 周报数据
export interface WeeklyReport {
  weekRange: { start: string; end: string };
  circleId: string;
  totalCount: number;
  categoryDistribution: Record<MoralCategory, number>;
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
};
