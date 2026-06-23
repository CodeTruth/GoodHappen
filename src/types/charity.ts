// 公益需求类型定义

// 需求类型：代取/陪诊/跑腿/维修/陪聊/其他
export type CharityType = 'errand' | 'escort' | 'delivery' | 'repair' | 'chat' | 'other';

// 需求状态机
// [OPEN] → [ACCEPTED] → [IN_PROGRESS] → [COMPLETED]
//    ↓        ↓              ↓
// [EXPIRED] [OPEN退回]   [EXPIRED/CANCELLED]
// [CANCELLED] → 福气解冻退回
export type CharityStatus =
  | 'open'        // 待接单
  | 'accepted'    // 已接单
  | 'in_progress' // 服务中
  | 'completed'   // 已完成
  | 'expired'     // 已超时
  | 'cancelled';  // 已取消

// 评价角色：发布者评接单者 / 接单者评发布者
export type RatingRole = 'publisher_to_accepter' | 'accepter_to_publisher';

// 互评信息
export interface CharityRating {
  role: RatingRole;
  score: number; // 1-5 星
  comment: string;
  createdAt: string;
}

// 公益需求实体
export interface CharityNeed {
  id: string;
  // 发布者信息
  publisherId: string;
  publisherName: string;
  publisherAvatar: string;
  // 需求内容
  title: string;        // 标题 5-30 字
  description: string;  // 描述：时间/地点/详细要求
  type: CharityType;
  expectedTime: string; // 期望完成时间 ISO
  reward: number;       // 福气悬赏 0-50
  contact: string;      // 联系方式（脱敏展示）
  // 状态机
  status: CharityStatus;
  // 接单者信息
  accepterId?: string;
  accepterName?: string;
  accepterAvatar?: string;
  // 时间节点
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  expiredAt?: string;
  cancelledAt?: string;
  createdAt: string;
  // 双方互评
  ratings: CharityRating[];
}

// 需求类型映射
export const CHARITY_TYPE_MAP: Record<CharityType, { label: string; icon: string }> = {
  errand: { label: '代取', icon: '📦' },
  escort: { label: '陪诊', icon: '🏥' },
  delivery: { label: '跑腿', icon: '🛵' },
  repair: { label: '维修', icon: '🔧' },
  chat: { label: '陪聊', icon: '💬' },
  other: { label: '其他', icon: '✨' },
};

// 状态映射
export const CHARITY_STATUS_MAP: Record<CharityStatus, { label: string; color: string }> = {
  open: { label: '待接单', color: '#FF6B6B' },
  accepted: { label: '已接单', color: '#FAAD14' },
  in_progress: { label: '服务中', color: '#165dff' },
  completed: { label: '已完成', color: '#52C41A' },
  expired: { label: '已超时', color: '#999999' },
  cancelled: { label: '已取消', color: '#999999' },
};

// 公益履历统计
export interface CharityRecord {
  totalCount: number;      // 接单总数
  completedCount: number;  // 完成数
  completionRate: number;  // 完成率 0-100
  positiveRate: number;    // 好评率 0-100
  totalReward: number;     // 累计获得福气
  records: CharityRecordItem[];
}

// 履历单条记录
export interface CharityRecordItem {
  needId: string;
  title: string;
  type: CharityType;
  completedAt: string;
  reward: number;
  ratingScore?: number; // 收到的评价星级
  ratingComment?: string;
}
