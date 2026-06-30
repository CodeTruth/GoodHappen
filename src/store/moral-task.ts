import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { MoralTask, TaskSubmission } from '@/data/mock-moral-tasks';
import {
  mockMoralTasks,
  mockTaskSubmissions,
} from '@/data/mock-moral-tasks';
import { useFortuneStore } from '@/store/fortune';

const STORAGE_KEY = 'haoshi_moral_task_store';

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
  addSubmission: (submission: Omit<TaskSubmission, 'id' | 'isExample' | 'needsRevision' | 'createdAt'>) => TaskSubmission;
  markExample: (submissionId: string, isExample: boolean) => void;
  addTeacherComment: (submissionId: string, comment: string) => void;
  markNeedsRevision: (submissionId: string) => void;

  // 持久化
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

const generateId = (prefix: string): string =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const useMoralTaskStore = create<MoralTaskState>((set, get) => ({
  tasks: [...mockMoralTasks],
  submissions: [...mockTaskSubmissions],

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

  loadFromStorage: () => {
    try {
      const data = Taro.getStorageSync(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // 仅当存储中有数据时覆盖mock数据，否则保留mock
        if (parsed.tasks && parsed.tasks.length > mockMoralTasks.length) {
          set({ tasks: parsed.tasks });
        }
        if (parsed.submissions && parsed.submissions.length > mockTaskSubmissions.length) {
          set({ submissions: parsed.submissions });
        }
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
