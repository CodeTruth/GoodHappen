import { create } from 'zustand';
import {
  Draft,
  saveDraft,
  getDraft,
  listDrafts,
  deleteDraft,
  markPublished,
  isWithinEditWindow,
  cleanExpiredDrafts,
  getEditWindowRemaining,
} from '@/services/draft';

// 自动保存间隔（毫秒）
const AUTO_SAVE_INTERVAL = 5000;

// 草稿表单数据（用于自动保存的输入态）
export interface DraftFormData {
  content: string;
  recordType: 'self' | 'witness';
  tags: string[];
  images: string[];
  video?: string;
  videoThumb?: string;
  voice?: string;
  voiceText?: string;
  visibleScope: 'private' | 'public' | 'followers' | 'circle'; // N2 三级可见范围
  circleId?: string; // 团体可见时所属的团体ID
  isAnonymous?: boolean;
}

interface DraftState {
  // 当前编辑中的草稿 ID（若有）
  currentDraftId: string | null;
  // 当前表单数据快照
  currentFormData: DraftFormData | null;
  // 草稿列表
  drafts: Draft[];
  // 自动保存定时器句柄
  autoSaveTimer: ReturnType<typeof setInterval> | null;
  // 上次保存时间戳
  lastSavedAt: number | null;

  // 初始化加载
  loadDrafts: () => void;
  // 开始自动保存（绑定当前表单数据获取函数）
  startAutoSave: (getFormData: () => DraftFormData) => void;
  // 停止自动保存
  stopAutoSave: () => void;
  // 立即保存一次
  saveNow: (getFormData?: () => DraftFormData) => void;
  // 加载某个草稿到当前编辑态
  editDraft: (id: string) => Draft | null;
  // 删除草稿（软删除）
  removeDraft: (id: string) => boolean;
  // 标记草稿已发布
  publishDraft: (id: string, publishedId: string) => void;
  // 判断当前草稿是否仍可编辑
  canEditCurrent: () => boolean;
  // 获取当前草稿可编辑剩余秒数
  currentEditRemaining: () => number;
  // 清理当前编辑态
  clearCurrent: () => void;
  // 清理过期草稿
  cleanExpired: () => void;
}

export const useDraftStore = create<DraftState>((set, get) => ({
  currentDraftId: null,
  currentFormData: null,
  drafts: [],
  autoSaveTimer: null,
  lastSavedAt: null,

  loadDrafts: () => {
    cleanExpiredDrafts();
    const drafts = listDrafts();
    set({ drafts });
  },

  startAutoSave: (getFormData) => {
    // 先停掉旧定时器
    const oldTimer = get().autoSaveTimer;
    if (oldTimer) clearInterval(oldTimer);

    const timer = setInterval(() => {
      const formData = getFormData();
      const prev = get().currentFormData;
      // 内容有变化才保存
      const changed =
        !prev ||
        prev.content !== formData.content ||
        prev.tags.length !== formData.tags.length ||
        prev.images.length !== formData.images.length ||
        prev.video !== formData.video ||
        prev.voice !== formData.voice;

      if (!changed) return;

      // 内容为空且无任何附件时不创建草稿
      const hasContent =
        formData.content.trim().length > 0 ||
        formData.images.length > 0 ||
        !!formData.video ||
        !!formData.voice;
      if (!hasContent) return;

      const saved = saveDraft({
        id: get().currentDraftId || undefined,
        ...formData,
      });
      set({
        currentDraftId: saved.id,
        currentFormData: formData,
        lastSavedAt: Date.now(),
        drafts: listDrafts(),
      });
    }, AUTO_SAVE_INTERVAL);

    set({ autoSaveTimer: timer });
  },

  stopAutoSave: () => {
    const timer = get().autoSaveTimer;
    if (timer) {
      clearInterval(timer);
      set({ autoSaveTimer: null });
    }
  },

  saveNow: (getFormData) => {
    if (!getFormData) return;
    const formData = getFormData();
    const hasContent =
      formData.content.trim().length > 0 ||
      formData.images.length > 0 ||
      !!formData.video ||
      !!formData.voice;
    if (!hasContent) return;
    const saved = saveDraft({
      id: get().currentDraftId || undefined,
      ...formData,
    });
    set({
      currentDraftId: saved.id,
      currentFormData: formData,
      lastSavedAt: Date.now(),
      drafts: listDrafts(),
    });
  },

  editDraft: (id) => {
    const draft = getDraft(id);
    if (!draft) return null;
    set({
      currentDraftId: draft.id,
      currentFormData: {
        content: draft.content,
        recordType: draft.recordType,
        tags: draft.tags,
        images: draft.images,
        video: draft.video,
        videoThumb: draft.videoThumb,
        voice: draft.voice,
        voiceText: draft.voiceText,
        visibleScope: draft.visibleScope,
        circleId: draft.circleId,
      },
      drafts: listDrafts(),
    });
    return draft;
  },

  removeDraft: (id) => {
    const ok = deleteDraft(id);
    if (ok) {
      set({ drafts: listDrafts() });
    }
    return ok;
  },

  publishDraft: (id, publishedId) => {
    markPublished(id, publishedId);
    set({ drafts: listDrafts() });
  },

  canEditCurrent: () => {
    const id = get().currentDraftId;
    if (!id) return true;
    const draft = getDraft(id);
    if (!draft) return true;
    return isWithinEditWindow(draft);
  },

  currentEditRemaining: () => {
    const id = get().currentDraftId;
    if (!id) return 0;
    const draft = getDraft(id);
    if (!draft) return 0;
    return getEditWindowRemaining(draft);
  },

  clearCurrent: () => {
    set({
      currentDraftId: null,
      currentFormData: null,
      lastSavedAt: null,
    });
  },

  cleanExpired: () => {
    const n = cleanExpiredDrafts();
    if (n > 0) {
      set({ drafts: listDrafts() });
    }
  },
}));
