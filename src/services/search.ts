import { useKindnessStore } from '@/store/kindness';
import { Kindness } from '@/types/kindness';

// 搜索选项
export interface SearchOptions {
  // 搜索关键词
  keyword: string;
  // 搜索范围：默认全部
  scope?: 'content' | 'tags' | 'person' | 'all';
  // 排序方式：默认按时间倒序
  sortBy?: 'time' | 'relevance';
  // 筛选类型：自己的善行/见证的善行
  type?: 'self' | 'witness' | 'all';
}

// 搜索结果项，增加匹配得分用于相关性排序
export interface SearchResult extends Kindness {
  matchScore: number;
}

/**
 * 搜索善行记录
 * @param options 搜索选项
 * @returns 匹配的善行记录列表
 */
export const searchKindness = (options: SearchOptions): SearchResult[] => {
  const { keyword, scope = 'all', sortBy = 'time', type = 'all' } = options;
  const { publishedList } = useKindnessStore.getState();
  
  if (!keyword.trim()) {
    return [];
  }

  const lowerKeyword = keyword.toLowerCase().trim();

  // 先筛选类型
  let filteredList = publishedList.filter(item => {
    if (type === 'all') return true;
    return item.type === type;
  });

  // 匹配并计算得分
  const results: SearchResult[] = filteredList.map(item => {
    let score = 0;

    // 匹配内容
    if (scope === 'all' || scope === 'content') {
      const contentMatch = item.content.toLowerCase().includes(lowerKeyword);
      if (contentMatch) {
        // 内容匹配权重最高
        score += 10;
        // 关键词出现次数越多得分越高
        const matches = item.content.toLowerCase().match(new RegExp(lowerKeyword, 'g'))?.length || 0;
        score += matches * 2;
      }
    }

    // 匹配标签
    if (scope === 'all' || scope === 'tags') {
      const tagMatch = item.tags.some(tag => tag.toLowerCase().includes(lowerKeyword));
      if (tagMatch) {
        score += 8;
        const matchedTags = item.tags.filter(tag => tag.toLowerCase().includes(lowerKeyword)).length;
        score += matchedTags * 1;
      }
    }

    // 匹配人物（发布者和AI人物）
    if (scope === 'all' || scope === 'person') {
      // 匹配发布者名称
      const userNameMatch = item.userName.toLowerCase().includes(lowerKeyword);
      if (userNameMatch) {
        score += 7;
      }
      // 匹配AI人物名称
      if (item.aiResponse?.personaName) {
        const personaNameMatch = item.aiResponse.personaName.toLowerCase().includes(lowerKeyword);
        if (personaNameMatch) {
          score += 7;
        }
      }
    }

    return {
      ...item,
      matchScore: score,
    };
  })
  // 过滤掉得分0的（不匹配）
  .filter(item => item.matchScore > 0);

  // 排序
  if (sortBy === 'relevance') {
    // 按相关性得分降序，得分相同按时间降序
    return results.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else {
    // 按时间降序
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
};

/**
 * 获取热门搜索标签
 * @returns 热门标签列表
 */
export const getHotSearchTags = (): string[] => {
  const { publishedList } = useKindnessStore.getState();
  const tagCount: Record<string, number> = {};

  publishedList.forEach(item => {
    item.tags.forEach(tag => {
      tagCount[tag] = (tagCount[tag] || 0) + 1;
    });
  });

  // 按出现次数排序，取前10个
  return Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
    .slice(0, 10);
};
