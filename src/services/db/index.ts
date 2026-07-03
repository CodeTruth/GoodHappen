/**
 * 后端 API 服务层统一导出
 * 所有数据库操作通过 dbClient 封装，Supabase 不可用时返回 null 或空数组
 */

// 客户端封装
export { dbClient } from './client';

// 类型定义
export type {
  DbUser,
  DbKindness,
  DbFortuneRecord,
  DbInteraction,
  DbCheckin,
  DbCircle,
  DbCircleMember,
  DbSOSRecord,
  DbWitnessRecord,
  EmergencyContactDb,
  PrivacySettingsDb,
  DbAIResponse,
  DbSOSNotification,
  DbPagination,
  DbOrderBy,
} from './schema';

// ===== 用户 API =====
import {
  getUserProfile,
  getUserByPhone,
  getUsersByIds,
  getUserList,
  searchUsersByName,
  createUserProfile,
  updateUserProfile,
  updateUserBlessingValue,
  incrementKindnessCount,
  incrementWitnessCount,
  addUserBadge,
  deleteUserProfile,
} from './userApi';

export {
  getUserProfile,
  getUserByPhone,
  getUsersByIds,
  getUserList,
  searchUsersByName,
  createUserProfile,
  updateUserProfile,
  updateUserBlessingValue,
  incrementKindnessCount,
  incrementWitnessCount,
  addUserBadge,
  deleteUserProfile,
} from './userApi';

export const userApi = {
  getUserProfile,
  getUserByPhone,
  getUsersByIds,
  getUserList,
  searchUsersByName,
  createUserProfile,
  updateUserProfile,
  updateUserBlessingValue,
  incrementKindnessCount,
  incrementWitnessCount,
  addUserBadge,
  deleteUserProfile,
};

// ===== 善行 API =====
import {
  getKindnessById,
  getKindnessList,
  getUserKindnessList,
  getCircleKindnessList,
  createKindness,
  updateKindness,
  deleteKindness,
  getUserKindnessCount,
  incrementLikes,
  incrementComments,
} from './kindnessApi';

export {
  getKindnessById,
  getKindnessList,
  getUserKindnessList,
  getCircleKindnessList,
  createKindness,
  updateKindness,
  deleteKindness,
  getUserKindnessCount,
  incrementLikes,
  incrementComments,
} from './kindnessApi';

export const kindnessApi = {
  getKindnessById,
  getKindnessList,
  getUserKindnessList,
  getCircleKindnessList,
  createKindness,
  updateKindness,
  deleteKindness,
  getUserKindnessCount,
  incrementLikes,
  incrementComments,
};

// ===== 福气值 API =====
import {
  getFortuneRecords,
  getFortuneRecordById,
  getUserFortune,
  getFortuneSumByType,
  addFortuneRecord,
  earnFortune,
  spendFortune,
  transferFortune,
  awardFortune,
  penaltyFortune,
} from './fortuneApi';

export {
  getFortuneRecords,
  getFortuneRecordById,
  getUserFortune,
  getFortuneSumByType,
  addFortuneRecord,
  earnFortune,
  spendFortune,
  transferFortune,
  awardFortune,
  penaltyFortune,
} from './fortuneApi';

export const fortuneApi = {
  getFortuneRecords,
  getFortuneRecordById,
  getUserFortune,
  getFortuneSumByType,
  addFortuneRecord,
  earnFortune,
  spendFortune,
  transferFortune,
  awardFortune,
  penaltyFortune,
};

// ===== 互动 API =====
import {
  toggleLike,
  hasLiked,
  getLikes,
  getLikeCount,
  addComment,
  getComments,
  getCommentCount,
  deleteComment,
  getInteractions,
  getUserInteractions,
} from './interactionApi';

export {
  toggleLike,
  hasLiked,
  getLikes,
  getLikeCount,
  addComment,
  getComments,
  getCommentCount,
  deleteComment,
  getInteractions,
  getUserInteractions,
} from './interactionApi';

export const interactionApi = {
  toggleLike,
  hasLiked,
  getLikes,
  getLikeCount,
  addComment,
  getComments,
  getCommentCount,
  deleteComment,
  getInteractions,
  getUserInteractions,
};

// ===== 打卡 API =====
import {
  addCheckin,
  getCheckins,
  saveTasks,
  getTasks,
} from './checkinApi';

export {
  addCheckin,
  getCheckins,
  saveTasks,
  getTasks,
} from './checkinApi';

export const checkinApi = {
  addCheckin,
  getCheckins,
  saveTasks,
  getTasks,
};
