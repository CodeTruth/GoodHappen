// 善行类型定义

export interface Kindness {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  type: 'self' | 'witness'; // 自己做的 vs 见证的
  tags: string[];
  images?: string[];
  video?: string;
  location?: string;
  visibleScope: 'private' | 'public' | 'followers' | 'circle'; // N2 三级可见范围：仅自己/团体可见/全部公开/互相关注
  circleId?: string; // 团体可见时所属的团体ID
  aiResponse?: AIResponse;
  credibilityScore: number; // 真实性评分 0-1
  blessingValue: number; // 福气值
  likes: number;
  comments: number;
  createdAt: string;
}

export interface AIResponse {
  persona: 'sudongpo' | 'confucius' | 'hobbes' | 'eliot' | 'praise' | 'cat';
  personaName: string;
  content: string;
  createdAt: string;
}

export interface KindnessTag {
  id: string;
  name: string;
  icon?: string;
}