// 敏感词过滤工具（用于评论防刷和搜索过滤）

// 敏感词列表（模拟，实际项目应从服务端获取）
const SENSITIVE_WORDS: string[] = [
  '广告', '加微信', '微信号', 'QQ群', '赌博', '色情', '暴力',
  '辱骂', '傻逼', '操你', '去死', '杀人', '毒品', '传销',
  '反动', '政治敏感', '诈骗', '刷单', '代购', '优惠券'
];

// 重复内容判定：相同内容在短时间内重复出现视为刷屏
const RECENT_COMMENTS: string[] = [];
const MAX_RECENT = 20;

export interface ValidateResult {
  valid: boolean;
  reason?: string;
}

// 检查是否包含敏感词
export const containsSensitiveWord = (text: string): boolean => {
  return SENSITIVE_WORDS.some((word) => text.includes(word));
};

// 敏感词替换为 *
export const maskSensitiveWords = (text: string): string => {
  let result = text;
  SENSITIVE_WORDS.forEach((word) => {
    if (result.includes(word)) {
      result = result.split(word).join('*'.repeat(word.length));
    }
  });
  return result;
};

// 检查是否为重复内容（与最近评论比较）
export const isDuplicateContent = (text: string): boolean => {
  const trimmed = text.trim();
  if (RECENT_COMMENTS.includes(trimmed)) {
    return true;
  }
  // 检查高度相似（完全相同或仅差标点）
  return RECENT_COMMENTS.some((prev) => {
    const minLen = Math.min(prev.length, trimmed.length);
    let sameCount = 0;
    for (let i = 0; i < minLen; i++) {
      if (prev[i] === trimmed[i]) sameCount++;
    }
    return sameCount / Math.max(prev.length, trimmed.length) > 0.9;
  });
};

// 记录评论到最近列表（用于重复检测）
export const recordComment = (text: string): void => {
  RECENT_COMMENTS.push(text.trim());
  if (RECENT_COMMENTS.length > MAX_RECENT) {
    RECENT_COMMENTS.shift();
  }
};

// 综合校验评论内容（防刷）
export const validateComment = (text: string): ValidateResult => {
  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, reason: '评论内容不能为空' };
  }
  if (trimmed.length < 2) {
    return { valid: false, reason: '评论至少需要2个字' };
  }
  if (trimmed.length > 500) {
    return { valid: false, reason: '评论不能超过500字' };
  }
  if (containsSensitiveWord(trimmed)) {
    return { valid: false, reason: '评论包含敏感词，请修改后重试' };
  }
  if (isDuplicateContent(trimmed)) {
    return { valid: false, reason: '请勿重复评论相同内容' };
  }
  return { valid: true };
};

// 校验搜索关键词
export const validateSearchKeyword = (keyword: string): ValidateResult => {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return { valid: false, reason: '请输入搜索关键词' };
  }
  if (containsSensitiveWord(trimmed)) {
    return { valid: false, reason: '搜索内容包含敏感词' };
  }
  return { valid: true };
};

// 提取 @提及的用户名
export const extractMentions = (text: string): string[] => {
  const regex = /@([^\s@,，。.!！?？]+)/g;
  const mentions: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
};
