// 温暖故事类型定义

export interface WarmStory {
  id: string;
  title: string;
  summary: string; // 善行内容摘要
  aiQuote: string; // AI共鸣金句
  aiPersonaName: string; // AI人格名称
  publisher: string; // 匿名展示，如"四川省·一位坚持了365天的邻居"
  image: string;
  period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'yearly'; // 季度/年度
  year: number;
  kindnessType: string; // 善行类型
  location: string; // 省份
  warmthValue: number; // 温暖值
}

// Mock 温暖故事数据
export const mockWarmStories: WarmStory[] = [
  {
    id: 'story1',
    title: '365天的邻里守望',
    summary: '一年来，她每天清晨为独居老人送上一杯热豆浆，风雨无阻。老人说，那杯豆浆的温度，就是她对这个世界的温柔。',
    aiQuote: '日行一善，不在大小，而在恒心。365个清晨，365杯豆浆，温暖了一座楼，也照亮了一颗心。',
    aiPersonaName: '苏东坡',
    publisher: '四川省·一位坚持了365天的邻居',
    image: 'https://picsum.photos/id/292/750/500',
    period: 'yearly',
    year: 2024,
    kindnessType: '邻里互助',
    location: '四川',
    warmthValue: 3650
  },
  {
    id: 'story2',
    title: '雨夜的伞',
    summary: '暴雨夜，一位外卖小哥把自己的雨衣披在了流浪猫身上，自己淋着雨继续送餐。那一刻，他送的不只是外卖，还有一份无声的善意。',
    aiQuote: '喵~ 你淋湿了自己，却温暖了一个小生命。这个世界因为有你，多了一份柔软 🐱',
    aiPersonaName: '治愈小猫',
    publisher: '广东省·一位雨夜送暖的骑手',
    image: 'https://picsum.photos/id/237/750/500',
    period: 'Q2',
    year: 2024,
    kindnessType: '动物保护',
    location: '广东',
    warmthValue: 890
  },
  {
    id: 'story3',
    title: '山那边的课堂',
    summary: '退休教师走进大山，为留守儿童开设了"流动课堂"。三年间，她的足迹遍布五个村庄，让200多个孩子看见了山外的世界。',
    aiQuote: '己欲立而立人，己欲达而达人。教育不是灌满一桶水，而是点燃一把火。你点燃的，是200个孩子的未来。',
    aiPersonaName: '孔子',
    publisher: '云南省·一位翻山越岭的老师',
    image: 'https://picsum.photos/id/1039/750/500',
    period: 'Q3',
    year: 2024,
    kindnessType: '志愿服务',
    location: '云南',
    warmthValue: 2400
  },
  {
    id: 'story4',
    title: '凌晨四点的早餐',
    summary: '一家早餐店老板每天凌晨四点起床，为环卫工人免费准备热早餐。他说："他们让城市干净，我让他们肚子暖和。"',
    aiQuote: '君子喻于义。你用一碗碗热粥，丈量着这座城市的温度。凌晨四点的灯，是最暖的星。',
    aiPersonaName: '苏东坡',
    publisher: '湖北省·一位早起的城市暖灯',
    image: 'https://picsum.photos/id/312/750/500',
    period: 'Q1',
    year: 2024,
    kindnessType: '助人',
    location: '湖北',
    warmthValue: 1560
  },
  {
    id: 'story5',
    title: '无声的陪伴',
    summary: '一位大学生每周去养老院，不说话，只是静静陪老人坐一下午。后来老人们说，那个安静的下午，是他们一周里最期待的时光。',
    aiQuote: '陪伴是最长情的告白。你用沉默，说出了这个世界最动听的话。',
    aiPersonaName: '艾略特',
    publisher: '江苏省·一位懂得倾听的年轻人',
    image: 'https://picsum.photos/id/64/750/500',
    period: 'Q4',
    year: 2024,
    kindnessType: '陪伴',
    location: '江苏',
    warmthValue: 980
  }
];

// 获取温暖故事列表
export const getWarmStories = (): WarmStory[] => {
  return mockWarmStories;
};

// 按周期筛选温暖故事
export const getStoriesByPeriod = (period: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'yearly'): WarmStory[] => {
  return mockWarmStories.filter(story => story.period === period);
};

// 根据ID获取温暖故事
export const getStoryById = (id: string): WarmStory | undefined => {
  return mockWarmStories.find(story => story.id === id);
};
