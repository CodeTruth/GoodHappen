import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { useFortuneStore } from '@/store/fortune';

const STORAGE_KEY = 'haoshi_moral_task_store';

// ============================================
// 本地类型定义（原 @/data/mock-moral-tasks 已移除）
// ============================================

export type MoralCategory = string;

export interface MoralTask {
  id: string;
  circleId: string;
  title: string;
  description: string;
  category: MoralCategory;
  status: 'active' | 'archived';
  requireVideo?: boolean;
  weekRange?: { start: string; end: string };
  createdAt: string;
}

export interface TaskSubmission {
  id: string;
  circleId: string;
  taskId?: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  isExample: boolean;
  needsRevision: boolean;
  teacherComment?: string;
  likes: number;
  likedBy: string[];
  comments?: { id: string; userId: string; userName: string; content: string; createdAt: string }[];
  createdAt: string;
}

interface MoralTaskState {
  tasks: MoralTask[];
  submissions: TaskSubmission[];

  // 查询
  getTasksByCircle: (circleId: string) => MoralTask[];
  getActiveTasksByCircle: (circleId: string) => MoralTask[];
  getSubmissionsByCircle: (circleId: string) => TaskSubmission[];
  getSubmissionsByTask: (taskId: string) => TaskSubmission[];
  getSubmissionsByUser: (userId: string, circleId: string) => TaskSubmission[];
  getSubmissionById: (id: string) => TaskSubmission | undefined;

  // 操作
  addTask: (task: Omit<MoralTask, 'id' | 'status' | 'createdAt'>) => MoralTask;
  addSubmission: (submission: Omit<TaskSubmission, 'id' | 'isExample' | 'needsRevision' | 'likes' | 'likedBy' | 'comments' | 'createdAt'>) => TaskSubmission;
  markExample: (submissionId: string, isExample: boolean) => void;
  addTeacherComment: (submissionId: string, comment: string) => void;
  markNeedsRevision: (submissionId: string) => void;
  toggleLike: (submissionId: string, userId: string) => boolean;
  addComment: (submissionId: string, comment: Omit<NonNullable<TaskSubmission['comments']>[number], 'id' | 'createdAt'>) => void;

  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const generateId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useMoralTaskStore = create<MoralTaskState>((set, get) => ({
  tasks: [],
  submissions: [],

  getTasksByCircle: (circleId) => {
    return get().tasks.filter((t) => t.circleId === circleId);
  },

  getActiveTasksByCircle: (circleId) => {
    return get().tasks.filter((t) => t.circleId === circleId && t.status === 'active');
  },

  getSubmissionsByCircle: (circleId) => {
    return get().submissions
      .filter((s) => s.circleId === circleId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getSubmissionsByTask: (taskId) => {
    return get().submissions
      .filter((s) => s.taskId === taskId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getSubmissionsByUser: (userId, circleId) => {
    return get().submissions
      .filter((s) => s.userId === userId && s.circleId === circleId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getSubmissionById: (id) => {
    return get().submissions.find((s) => s.id === id);
  },

  addTask: (task) => {
    const newTask: MoralTask = {
      ...task,
      id: generateId('task'),
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ tasks: [...state.tasks, newTask] }));
    get().saveToStorage();
    return newTask;
  },

  addSubmission: (submission) => {
    const newSubmission: TaskSubmission = {
      ...submission,
      id: generateId('sub'),
      isExample: false,
      needsRevision: false,
      likes: 0,
      likedBy: [],
      comments: [],
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ submissions: [...state.submissions, newSubmission] }));

    // 联动福气值：关联任务+5，自由记录+3
    const fortuneStore = useFortuneStore.getState();
    const fortuneAmount = submission.taskId ? 5 : 3;
    fortuneStore.addFortune(
      fortuneAmount,
      submission.taskId ? '完成圈子任务' : '圈子自由记录',
      newSubmission.id
    );
    fortuneStore.recordKindness();

    get().saveToStorage();
    return newSubmission;
  },

  toggleLike: (submissionId, userId) => {
    let result = false;
    set((state) => ({
      submissions: state.submissions.map((s) => {
        if (s.id !== submissionId) return s;
        const hasLiked = s.likedBy?.includes(userId);
        if (hasLiked) {
          return {
            ...s,
            likes: Math.max(0, (s.likes || 0) - 1),
            likedBy: (s.likedBy || []).filter((id) => id !== userId),
          };
        } else {
          result = true;
          return {
            ...s,
            likes: (s.likes || 0) + 1,
            likedBy: [...(s.likedBy || []), userId],
          };
        }
      }),
    }));
    get().saveToStorage();
    return result;
  },

  markExample: (submissionId, isExample) => {
    set((state) => ({
      submissions: state.submissions.map((s) =>
        s.id === submissionId ? { ...s, isExample } : s
      ),
    }));

    // 联动福气值：被标记榜样额外+10
    if (isExample) {
      const fortuneStore = useFortuneStore.getState();
      fortuneStore.addFortune(10, '被标记为圈子榜样', submissionId);
    }

    get().saveToStorage();
  },

  addTeacherComment: (submissionId, comment) => {
    set((state) => ({
      submissions: state.submissions.map((s) =>
        s.id === submissionId ? { ...s, teacherComment: comment, reviewedBy: 'teacher' } : s
      ),
    }));
    get().saveToStorage();
  },

  markNeedsRevision: (submissionId) => {
    set((state) => ({
      submissions: state.submissions.map((s) =>
        s.id === submissionId ? { ...s, needsRevision: true } : s
      ),
    }));
    get().saveToStorage();
  },

  addComment: (submissionId, comment) => {
    const newComment = {
      ...comment,
      id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      submissions: state.submissions.map((s) =>
        s.id === submissionId
          ? ({ ...s, comments: [...(s.comments || []), newComment] } as TaskSubmission)
          : s
      ),
    }));
    get().saveToStorage();
  },

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        set({
          tasks: parsed.tasks || [],
          submissions: parsed.submissions || [],
        });
      }
    } catch (e) {
      console.error('[MoralTaskStore] Load from storage failed:', e);
    }
  },

  saveToStorage: () => {
    try {
      const { tasks, submissions } = get();
      Taro.setStorageSync(STORAGE_KEY, JSON.stringify({ tasks, submissions }));
    } catch (e) {
      console.error('[MoralTaskStore] Save to storage failed:', e);
    }
  },
}));
