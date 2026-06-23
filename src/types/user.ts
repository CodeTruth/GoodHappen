// 用户类型定义

// 用户性别
export type Gender = 'male' | 'female' | 'unknown';

// 可见范围（N2 三级可见范围）
// private: 仅自己可见（成长私密日记，本人和AI共鸣引擎可见）
// circle: 团体可见（团体成员可见，出现在团体动态流）
// public: 全部公开（同步到善行广场，全社会可见）
// followers: 互相关注可见（兼容旧逻辑）
export type VisibilityScope = 'public' | 'followers' | 'private' | 'circle';

// 用户信息（登录后存储的完整资料）
export interface UserInfo {
  id: string;
  name: string;              // 昵称（必填）
  avatar: string;            // 头像URL
  bio?: string;              // 个人简介（≤100字）
  gender: Gender;            // 性别
  birthYear: number | null;  // 出生年份（用于未成年判定）
  region: string;            // 地区（省/直辖市）
  phone?: string;            // 手机号（脱敏存储）
  blessingValue: number;     // 福气值
  kindnessCount: number;     // 善行数量
  witnessCount: number;      // 见证数量
  badges: string[];          // 徽章
  circles: string[];         // 所属善行圈
  createdAt: string;         // 注册时间
}

// 隐私设置
export interface PrivacySettings {
  kindnessVisibility: VisibilityScope;  // 谁可以看我的善行
  anonymousStats: boolean;              // 纳入匿名聚合统计
  showTitle: boolean;                   // 展示称号
  allowMatching: boolean;               // 允许善行匹配
  notificationInteraction: boolean;     // 互动消息
  notificationSystem: boolean;          // 系统消息
  notificationWarm: boolean;            // 温暖通知
  notificationCharity: boolean;         // 公益提醒
}

// 保留兼容旧代码的 User 接口
export interface User {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  blessingValue: number; // 福气值
  kindnessCount: number; // 善行数量
  witnessCount: number; // 见证数量
  badges: string[]; // 徽章
  circles: string[]; // 所属善行圈
  createdAt: string;
}

export interface Circle {
  id: string;
  name: string;
  type: 'class' | 'company' | 'community'; // 班级/企业/社区
  description?: string;
  memberCount: number;
  kindnessCount: number;
  adminId: string;
  createdAt: string;
}