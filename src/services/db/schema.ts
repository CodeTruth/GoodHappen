/**
 * 数据库表结构对应的 TypeScript 类型定义
 * 基于现有业务类型（UserInfo, Kindness, FortuneTransaction 等）映射到 Supabase 表结构
 */

import type { KindnessPersona } from '@/types/kindness';
import type { Gender, VisibilityScope } from '@/types/user';
import type { CheckinCategory, ContentType, CheckinVisibility } from '@/store/checkin';
import type { CircleRole, CircleAccessType } from '@/store/circle';

// ============================================
// 1. profiles（用户资料，对应 Supabase Auth 的 users 表扩展）
// ============================================

export interface DbUser {
  id: string;                           // UUID，对应 auth.users.id
  name: string;                         // 昵称
  avatar: string;                       // 头像 URL
  bio?: string;                         // 个人简介
  gender: Gender;                       // 性别
  birth_year?: number;                  // 出生年份
  region?: string;                      // 地区
  phone?: string;                       // 手机号（脱敏存储）
  blessing_value: number;               // 福气值
  kindness_count: number;               // 善行数量
  witness_count: number;                // 见证数量
  badges: string[];                     // 徽章数组（JSONB）
  circles: string[];                    // 所属善行圈 ID 数组（JSONB）
  emergency_contacts?: EmergencyContactDb[]; // 紧急联系人（JSONB）
  privacy_settings?: PrivacySettingsDb; // 隐私设置（JSONB）
  created_at: string;                   // 注册时间
  updated_at?: string;                  // 更新时间
}

export interface EmergencyContactDb {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

export interface PrivacySettingsDb {
  kindness_visibility: VisibilityScope;
  anonymous_stats: boolean;
  show_title: boolean;
  allow_matching: boolean;
  notification_interaction: boolean;
  notification_system: boolean;
  notification_warm: boolean;
  notification_charity: boolean;
}

// ============================================
// 2. kindness_records（善行记录）
// ============================================

export interface DbKindness {
  id: string;                           // 记录 ID
  user_id: string;                      // 发布者 ID
  user_name: string;                    // 发布者昵称
  user_avatar: string;                  // 发布者头像
  content: string;                      // 内容
  type: 'self' | 'witness';             // 自己做的 vs 见证的
  tags: string[];                       // 标签数组（JSONB）
  images?: string[];                    // 图片 URL 数组（JSONB）
  video?: string;                       // 视频 URL
  location?: string;                    // 位置描述
  visible_scope: VisibilityScope;       // 可见范围
  circle_id?: string;                   // 所属圈子 ID
  ai_response?: DbAIResponse;           // AI 回复（JSONB）
  credibility_score: number;            // 真实性评分 0-1
  blessing_value: number;               // 获得福气值
  likes: number;                        // 点赞数（冗余计数）
  comments: number;                     // 评论数（冗余计数）
  is_anonymous: boolean;                // 是否匿名
  created_at: string;                   // 创建时间
}

export interface DbAIResponse {
  persona: KindnessPersona;
  persona_name: string;
  content: string;
  created_at: string;
}

// ============================================
// 3. fortune_records（福气值交易）
// ============================================

export interface DbFortuneRecord {
  id: string;                           // 交易 ID
  user_id: string;                      // 用户 ID
  type: 'earn' | 'spend' | 'transfer' | 'award' | 'penalty';
  amount: number;                       // 变动金额（正数为增加，负数为减少）
  description: string;                  // 描述
  related_id?: string;                  // 关联记录 ID（如善行 ID）
  balance_after: number;                // 变动后余额
  circle_id?: string;                   // 关联圈子 ID（圈子加成）
  created_at: string;                   // 创建时间
}

// ============================================
// 4. interactions（点赞/评论）
// ============================================

export interface DbInteraction {
  id: string;                           // 互动 ID
  kindness_id: string;                  // 关联善行记录 ID
  user_id: string;                      // 用户 ID
  user_name: string;                    // 用户昵称
  user_avatar: string;                  // 用户头像
  type: 'like' | 'comment';             // 互动类型
  content?: string;                     // 评论内容（点赞时为空）
  mentions?: string[];                  // @提及的用户名数组（JSONB）
  created_at: string;                   // 创建时间
}

// ============================================
// 5. checkin_records（签到/打卡记录）
// ============================================

export interface DbCheckin {
  id: string;                           // 打卡 ID
  user_id: string;                      // 用户 ID
  user_name: string;                    // 用户昵称
  user_avatar: string;                  // 用户头像
  circle_id?: string;                   // 所属圈子 ID
  category: CheckinCategory;            // 品类：warm/growth/positive
  subcategory: string;                  // 子分类
  content_type: ContentType;            // 内容载体：text/image/video
  content: string;                      // 文字内容
  images?: string[];                    // 图片 URL 数组（JSONB）
  video?: string;                       // 视频 URL
  video_thumb?: string;                 // 视频封面
  ai_summary?: string;                  // AI 自动摘要
  visibility: CheckinVisibility;        // 可见范围
  streak_days: number;                  // 连续打卡天数
  created_at: string;                   // 创建时间
  date: string;                         // 日期 YYYY-MM-DD，用于按日去重
}

// ============================================
// 6. circles（善行圈）
// ============================================

export interface DbCircle {
  id: string;                           // 圈子 ID
  name: string;                         // 名称
  type: 'class' | 'company' | 'community' | 'friends' | 'public';
  access_type: CircleAccessType;        // 开放类型：open/closed/public
  description?: string;                 // 描述
  admin_id: string;                     // 管理员 ID
  class_code?: string;                  // 班级码（开放团体）
  require_real_name: boolean;           // 是否需要实名
  member_count: number;                 // 成员数（冗余计数）
  kindness_count: number;               // 善行数（冗余计数）
  created_at: string;                   // 创建时间
}

// ============================================
// 7. circle_members（圈成员关系）
// ============================================

export interface DbCircleMember {
  id: string;                           // 关系 ID
  circle_id: string;                    // 圈子 ID
  user_id: string;                      // 用户 ID
  user_name: string;                    // 用户昵称
  user_avatar: string;                  // 用户头像
  role: CircleRole;                     // 角色：member/groupLeader/admin
  member_number: number;                // 成员编号
  last_checkin_date?: string;           // 最近一次打卡时间
  is_real_name: boolean;                // 是否实名
  joined_at: string;                    // 加入时间
}

// ============================================
// 8. sos_records（SOS 记录）
// ============================================

export interface DbSOSRecord {
  id: string;                           // SOS ID
  user_id: string;                      // 触发用户 ID
  user_name: string;                    // 触发用户昵称
  evidence_package_id?: string;         // 关联证据包 ID
  record_id?: string;                   // 关联善行记录 ID
  source: string;                       // 触发方式
  triggered_at: string;                 // 触发时间
  location_lat?: number;                // 纬度
  location_lng?: number;                // 经度
  location_address?: string;            // 地址
  description: string;                  // 求助描述
  status: 'pending_confirm' | 'confirmed' | 'false_alarm' | 'expired' | 'lawyer_matched' | 'evidence_locked' | 'resolved';
  deposit_amount: number;               // 押金金额
  deposit_status: 'held' | 'refunded' | 'deducted';
  confirmed_at?: string;                // 确认时间
  ai_verdict?: 'real' | 'suspicious' | 'unknown';
  total_notify_cost: number;            // 通知总费用
  notifications?: DbSOSNotification[];  // 通知记录（JSONB）
  scene_context?: Record<string, unknown>; // 场景上下文（JSONB）
  protection_evidence?: Record<string, unknown>; // 保护模式证据（JSONB）
  created_at: string;                   // 创建时间
}

export interface DbSOSNotification {
  target_type: 'emergency_contact' | 'nearby_user';
  target_id: string;
  target_name: string;
  notified_at: string;
  cost: number;
}

// ============================================
// 9. witness_records（见证记录）
// ============================================

export interface DbWitnessRecord {
  id: string;                           // 见证 ID
  witness_user_id: string;              // 见证者用户 ID
  witness_user_name: string;            // 见证者昵称
  witness_user_avatar: string;          // 见证者头像
  record_id: string;                    // 关联的善行记录 ID
  timestamp: string;                    // 记录发布时间
  location_lat: number;                 // 纬度
  location_lng: number;                 // 经度
  location_address: string;             // 地址
  description: string;                  // 见证描述
  matched: boolean;                     // 是否被匹配为善意证据
  notified: boolean;                    // 是否已通知见证者
  badge_granted: boolean;               // 是否已授予徽章
  event_timestamp?: string;             // 事件真实发生时间
  event_location_lat?: number;          // 事件真实发生纬度
  event_location_lng?: number;          // 事件真实发生经度
  metadata_source?: 'exif' | 'manual' | 'inferred';
  created_at: string;                   // 创建时间
}

// ============================================
// 通用类型辅助
// ============================================

/** 数据库查询结果包装 */
export interface DbResult<T> {
  data: T | null;
  error: Error | null;
}

/** 数据库列表查询结果 */
export interface DbListResult<T> {
  data: T[];
  error: Error | null;
  count: number | null;
}

/** 分页参数 */
export interface DbPagination {
  page?: number;
  pageSize?: number;
}

/** 排序参数 */
export interface DbOrderBy {
  column: string;
  ascending?: boolean;
}
