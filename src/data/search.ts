// 搜索相关 Mock 数据：热门搜索、搜索历史

// 热门搜索推荐（按热度排序）
export interface HotSearchItem {
  keyword: string;
  heat: number;
  trend: 'up' | 'down' | 'flat';
}

export const mockHotSearchList: HotSearchItem[] = [
  { keyword: '邻里互助', heat: 9820, trend: 'up' },
  { keyword: '环保', heat: 7631, trend: 'up' },
  { keyword: '让座', heat: 6542, trend: 'flat' },
  { keyword: '帮老人', heat: 5821, trend: 'down' },
  { keyword: '志愿服务', heat: 4932, trend: 'up' },
  { keyword: '陪伴', heat: 4210, trend: 'flat' },
  { keyword: '举手之劳', heat: 3865, trend: 'up' },
  { keyword: '善意传递', heat: 3120, trend: 'down' },
];

// 推荐标签（用于快捷搜索）
export const mockSearchTags: string[] = [
  '助人', '环保', '见证', '公益', '邻里互助',
  '孝亲', '陪伴', '关怀', '工作', '亲子',
];

// 推荐地区（用于快捷搜索）
export const mockSearchRegions: string[] = [
  '北京市', '上海市', '广州市', '深圳市', '杭州市',
  '成都市', '武汉市', '南京市', '西安市', '重庆市',
];
