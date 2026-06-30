import { useMoralTaskStore } from '@/store/moral-task';
import { useCircleStore } from '@/store/circle';
import { TaskSubmission, MoralCategory, CATEGORY_CONFIG, mockWeeklyReports, mockSemesterProfiles, WeeklyReport, SemesterProfile } from '@/data/mock-moral-tasks';

// ========== 学生排行项 ==========
export interface StudentRankingItem {
  rank: number;
  userId: string;
  userName: string;
  userAvatar: string;
  taskCompleted: number;
  totalTasks: number;
  freeKindness: number;
  streakDays: number;
  exampleCount: number;
}

// ========== 班级周报项 ==========
export interface WeeklyReportData extends WeeklyReport {
  weekOverWeekChange: number; // 环比变化百分比
}

// ========== 榜样墙项 ==========
export interface ExampleWallItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  videoUrl?: string;
  teacherComment?: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  likeCount: number;
  createdAt: string;
}

// ========== 学生德育档案 ==========
export interface StudentMoralProfile {
  userId: string;
  userName: string;
  userAvatar: string;
  currentSemester: {
    totalCount: number;
    exampleCount: number;
    streakDays: number;
    taskCompletionRate: number;
  };
  categoryDistribution: { category: MoralCategory; name: string; count: number; percentage: number }[];
  semesterProfiles: SemesterProfile[];
  timeline: {
    id: string;
    date: string;
    categoryName: string;
    categoryIcon: string;
    content: string;
    videoUrl?: string;
    teacherComment?: string;
    isExample: boolean;
    taskTitle?: string;
  }[];
}

// ========== 排行计算 ==========
export const getRanking = (circleId: string): StudentRankingItem[] => {
  const { getSubmissionsByCircle, getTasksByCircle } = useMoralTaskStore.getState();
  const { getCircleById } = useCircleStore.getState();

  const submissions = getSubmissionsByCircle(circleId);
  const tasks = getTasksByCircle(circleId);
  const totalTasks = tasks.filter((t) => t.status === 'active').length;
  const circle = getCircleById(circleId);
  const members = circle?.members || [];

  // 计算每个学生的数据
  const studentMap: Record<string, StudentRankingItem> = {};

  members.forEach((m) => {
    if (m.role === 'admin') return; // 老师不参与排名
    const userSubmissions = submissions.filter((s) => s.userId === m.userId);
    const taskCompleted = new Set(userSubmissions.filter((s) => s.taskId).map((s) => s.taskId)).size;
    const freeKindness = userSubmissions.filter((s) => !s.taskId).length;
    const exampleCount = userSubmissions.filter((s) => s.isExample).length;

    // 计算连续打卡天数（简单逻辑：最近有提交算1天）
    const dates = userSubmissions.map((s) => s.createdAt.split('T')[0]);
    const uniqueDates = [...new Set(dates)].sort().reverse();
    let streakDays = 0;
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = new Date(today);
      expected.setDate(expected.getDate() - i);
      if (uniqueDates[i] === expected.toISOString().split('T')[0]) {
        streakDays++;
      } else {
        break;
      }
    }

    studentMap[m.userId] = {
      rank: 0,
      userId: m.userId,
      userName: m.userName,
      userAvatar: m.userAvatar,
      taskCompleted,
      totalTasks,
      freeKindness,
      streakDays,
      exampleCount,
    };
  });

  // 排序：先按任务完成率，再按自由善行数，再按榜样次数
  const sorted = Object.values(studentMap).sort((a, b) => {
    const rateA = a.totalTasks > 0 ? a.taskCompleted / a.totalTasks : 0;
    const rateB = b.totalTasks > 0 ? b.taskCompleted / b.totalTasks : 0;
    if (rateB !== rateA) return rateB - rateA;
    if (b.freeKindness !== a.freeKindness) return b.freeKindness - a.freeKindness;
    return b.exampleCount - a.exampleCount;
  });

  // 设置排名
  return sorted.map((item, index) => ({ ...item, rank: index + 1 }));
};

// ========== 未提交学生 ==========
export const getUnsubmittedStudents = (circleId: string, taskId: string): { userId: string; userName: string; userAvatar: string }[] => {
  const { getSubmissionsByTask, getTasksByCircle } = useMoralTaskStore.getState();
  const { getCircleById } = useCircleStore.getState();

  const submissions = getSubmissionsByTask(taskId);
  const circle = getCircleById(circleId);
  if (!circle) return [];

  const submittedUserIds = new Set(submissions.map((s) => s.userId));
  return circle.members
    .filter((m) => m.role !== 'admin' && !submittedUserIds.has(m.userId))
    .map((m) => ({ userId: m.userId, userName: m.userName, userAvatar: m.userAvatar }));
};

// ========== 班级周报 ==========
export const getWeeklyReport = (circleId: string, weekIndex: number): WeeklyReportData | null => {
  const report = mockWeeklyReports.find((r) => r.circleId === circleId && r.weekIndex === weekIndex);
  if (!report) return null;

  // 计算环比
  const prevReport = mockWeeklyReports.find((r) => r.circleId === circleId && r.weekIndex === weekIndex - 1);
  const weekOverWeekChange = prevReport
    ? Math.round(((report.totalCount - prevReport.totalCount) / prevReport.totalCount) * 100)
    : 0;

  return { ...report, weekOverWeekChange };
};

// ========== 榜样墙 ==========
export const getExampleWall = (circleId: string, weekRange?: { start: string; end: string }): ExampleWallItem[] => {
  const { getSubmissionsByCircle } = useMoralTaskStore.getState();
  const submissions = getSubmissionsByCircle(circleId);

  let examples = submissions.filter((s) => s.isExample);

  if (weekRange) {
    examples = examples.filter((s) => {
      const date = s.createdAt.split('T')[0];
      return date >= weekRange.start && date <= weekRange.end;
    });
  }

  return examples.map((s) => {
    // 从提交记录推断类别：如果是任务提交，从任务找类别；自由记录标记为custom
    let category: MoralCategory = 'custom';
    if (s.taskId) {
      const { tasks } = useMoralTaskStore.getState();
      const task = tasks.find((t) => t.id === s.taskId);
      if (task) category = task.category;
    }
    const catConfig = CATEGORY_CONFIG[category];

    return {
      id: s.id,
      userId: s.userId,
      userName: s.userName,
      userAvatar: s.userAvatar,
      content: s.content,
      videoUrl: s.videoUrl,
      teacherComment: s.teacherComment,
      categoryName: catConfig.name,
      categoryIcon: catConfig.icon,
      categoryColor: catConfig.color,
      likeCount: Math.floor(Math.random() * 20) + 5, // mock点赞数
      createdAt: s.createdAt,
    };
  });
};

// ========== 学生德育档案 ==========
export const getStudentProfile = (userId: string, circleId: string): StudentMoralProfile => {
  const { getSubmissionsByUser, getTasksByCircle } = useMoralTaskStore.getState();
  const { getCircleById } = useCircleStore.getState();

  const submissions = getSubmissionsByUser(userId, circleId);
  const tasks = getTasksByCircle(circleId);
  const circle = getCircleById(circleId);
  const member = circle?.members.find((m) => m.userId === userId);

  // 当前学期数据
  const totalCount = submissions.length;
  const exampleCount = submissions.filter((s) => s.isExample).length;
  const taskCompleted = new Set(submissions.filter((s) => s.taskId).map((s) => s.taskId)).size;
  const totalTasks = tasks.filter((t) => t.status === 'active').length;
  const taskCompletionRate = totalTasks > 0 ? Math.round((taskCompleted / totalTasks) * 100) : 0;

  // 连续打卡天数
  const dates = submissions.map((s) => s.createdAt.split('T')[0]);
  const uniqueDates = [...new Set(dates)].sort().reverse();
  let streakDays = 0;
  const today = new Date().toISOString().split('T')[0];
  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (uniqueDates[i] === expected.toISOString().split('T')[0]) {
      streakDays++;
    } else {
      break;
    }
  }

  // 分类分布
  const categoryCount: Record<MoralCategory, number> = {
    housework: 0, help_others: 0, environmental: 0, respect_elders: 0, reading: 0, custom: 0,
  };
  const { tasks: allTasks } = useMoralTaskStore.getState();

  submissions.forEach((s) => {
    let category: MoralCategory = 'custom';
    if (s.taskId) {
      const task = allTasks.find((t) => t.id === s.taskId);
      if (task) category = task.category;
    }
    categoryCount[category]++;
  });

  const categoryDistribution = Object.entries(categoryCount)
    .filter(([, count]) => count > 0)
    .map(([cat, count]) => {
      const config = CATEGORY_CONFIG[cat as MoralCategory];
      return {
        category: cat as MoralCategory,
        name: config.name,
        count,
        percentage: totalCount > 0 ? Math.round((count / totalCount) * 100) : 0,
      };
    })
    .sort((a, b) => b.count - a.count);

  // 时间线
  const timeline = submissions.map((s) => {
    let category: MoralCategory = 'custom';
    let taskTitle: string | undefined;
    if (s.taskId) {
      const task = allTasks.find((t) => t.id === s.taskId);
      if (task) {
        category = task.category;
        taskTitle = task.title;
      }
    }
    const config = CATEGORY_CONFIG[category];
    return {
      id: s.id,
      date: s.createdAt,
      categoryName: config.name,
      categoryIcon: config.icon,
      content: s.content,
      videoUrl: s.videoUrl,
      teacherComment: s.teacherComment,
      isExample: s.isExample,
      taskTitle,
    };
  });

  // 跨学期档案
  const semesterProfiles = mockSemesterProfiles[userId] || [];

  return {
    userId,
    userName: member?.userName || '未知',
    userAvatar: member?.userAvatar || '',
    currentSemester: {
      totalCount,
      exampleCount,
      streakDays,
      taskCompletionRate,
    },
    categoryDistribution,
    semesterProfiles,
    timeline,
  };
};
