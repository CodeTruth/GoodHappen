// 地区温暖地图类型定义

export interface ProvinceWarmth {
  code: string; // 省份编码
  name: string; // 省份名称
  shortName: string; // 简称（用于地图展示）
  monthlyFortune: number; // 本月温暖值
  participantCount: number; // 参与人数
  kindnessCount: number; // 善行数量
  warmthLevel: number; // 温暖等级 1-5（用于色温图）
  // 善行类型分布
  typeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  // 本区域温暖故事
  stories: {
    id: string;
    title: string;
    summary: string;
  }[];
  // 地图位置（CSS Grid 坐标，简化布局）
  gridArea: {
    row: number;
    col: number;
  };
}

// Mock 省份温暖数据（简化版中国地图布局）
// 地图采用 6列 x 5行 的网格布局，大致对应中国地理方位
export const mockProvinceWarmth: ProvinceWarmth[] = [
  // 第一行（北部）
  {
    code: 'XJ', name: '新疆', shortName: '新', monthlyFortune: 2340, participantCount: 156, kindnessCount: 78, warmthLevel: 2,
    typeDistribution: [
      { type: '助人', count: 28, percentage: 35.9 },
      { type: '环保', count: 22, percentage: 28.2 },
      { type: '邻里互助', count: 18, percentage: 23.1 },
      { type: '其他', count: 10, percentage: 12.8 }
    ],
    stories: [
      { id: 'xj1', title: '沙漠边缘的绿洲', summary: '一群志愿者在沙漠边缘种下了1000棵胡杨，守护着这片土地的绿色希望。' }
    ],
    gridArea: { row: 1, col: 1 }
  },
  {
    code: 'NM', name: '内蒙古', shortName: '蒙', monthlyFortune: 1980, participantCount: 132, kindnessCount: 65, warmthLevel: 2,
    typeDistribution: [
      { type: '环保', count: 25, percentage: 38.5 },
      { type: '助人', count: 20, percentage: 30.8 },
      { type: '动物保护', count: 12, percentage: 18.5 },
      { type: '其他', count: 8, percentage: 12.3 }
    ],
    stories: [
      { id: 'nm1', title: '草原上的守望', summary: '牧民自发组织巡护队，保护草原上的野生黄羊，让这片土地恢复生机。' }
    ],
    gridArea: { row: 1, col: 3 }
  },
  {
    code: 'HLJ', name: '黑龙江', shortName: '黑', monthlyFortune: 3120, participantCount: 208, kindnessCount: 98, warmthLevel: 3,
    typeDistribution: [
      { type: '助人', count: 35, percentage: 35.7 },
      { type: '邻里互助', count: 28, percentage: 28.6 },
      { type: '志愿服务', count: 20, percentage: 20.4 },
      { type: '其他', count: 15, percentage: 15.3 }
    ],
    stories: [
      { id: 'hlj1', title: '冰雪中的暖炉', summary: '零下30度的冬夜，出租车司机免费接送夜归的老人，温暖了整座冰城。' }
    ],
    gridArea: { row: 1, col: 5 }
  },
  // 第二行
  {
    code: 'QH', name: '青海', shortName: '青', monthlyFortune: 1560, participantCount: 98, kindnessCount: 52, warmthLevel: 1,
    typeDistribution: [
      { type: '环保', count: 22, percentage: 42.3 },
      { type: '志愿服务', count: 15, percentage: 28.8 },
      { type: '助人', count: 10, percentage: 19.2 },
      { type: '其他', count: 5, percentage: 9.6 }
    ],
    stories: [
      { id: 'qh1', title: '高原上的读书声', summary: '志愿者在高原小学支教三年，让孩子们的读书声回荡在雪山之间。' }
    ],
    gridArea: { row: 2, col: 2 }
  },
  {
    code: 'GS', name: '甘肃', shortName: '甘', monthlyFortune: 1890, participantCount: 124, kindnessCount: 67, warmthLevel: 2,
    typeDistribution: [
      { type: '助人', count: 24, percentage: 35.8 },
      { type: '志愿服务', count: 18, percentage: 26.9 },
      { type: '环保', count: 15, percentage: 22.4 },
      { type: '其他', count: 10, percentage: 14.9 }
    ],
    stories: [
      { id: 'gs1', title: '丝路新故事', summary: '古丝绸之路上的小城，居民自发修缮古道，让千年文明焕发新生。' }
    ],
    gridArea: { row: 2, col: 3 }
  },
  {
    code: 'SD', name: '山东', shortName: '鲁', monthlyFortune: 4560, participantCount: 312, kindnessCount: 156, warmthLevel: 4,
    typeDistribution: [
      { type: '助人', count: 56, percentage: 35.9 },
      { type: '孝亲', count: 38, percentage: 24.4 },
      { type: '邻里互助', count: 32, percentage: 20.5 },
      { type: '其他', count: 30, percentage: 19.2 }
    ],
    stories: [
      { id: 'sd1', title: '孔孟之乡的传承', summary: '一群年轻人复兴传统礼仪，用古老的智慧温暖现代人的生活。' }
    ],
    gridArea: { row: 2, col: 5 }
  },
  // 第三行（中部）
  {
    code: 'SC', name: '四川', shortName: '川', monthlyFortune: 5230, participantCount: 328, kindnessCount: 178, warmthLevel: 5,
    typeDistribution: [
      { type: '邻里互助', count: 62, percentage: 34.8 },
      { type: '助人', count: 48, percentage: 27.0 },
      { type: '陪伴', count: 35, percentage: 19.7 },
      { type: '其他', count: 33, percentage: 18.5 }
    ],
    stories: [
      { id: 'sc1', title: '365天的邻里守望', summary: '一年来，她每天清晨为独居老人送上一杯热豆浆，风雨无阻。' },
      { id: 'sc2', title: '茶馆里的温暖', summary: '成都老茶馆里，老板为环卫工人免费提供茶水，成了城市的一处温暖驿站。' }
    ],
    gridArea: { row: 3, col: 3 }
  },
  {
    code: 'HB', name: '湖北', shortName: '鄂', monthlyFortune: 4120, participantCount: 285, kindnessCount: 142, warmthLevel: 4,
    typeDistribution: [
      { type: '助人', count: 52, percentage: 36.6 },
      { type: '志愿服务', count: 35, percentage: 24.6 },
      { type: '邻里互助', count: 30, percentage: 21.1 },
      { type: '其他', count: 25, percentage: 17.6 }
    ],
    stories: [
      { id: 'hb1', title: '凌晨四点的早餐', summary: '早餐店老板每天凌晨四点起床，为环卫工人免费准备热早餐。' }
    ],
    gridArea: { row: 3, col: 4 }
  },
  {
    code: 'JS', name: '江苏', shortName: '苏', monthlyFortune: 4890, participantCount: 342, kindnessCount: 165, warmthLevel: 4,
    typeDistribution: [
      { type: '陪伴', count: 58, percentage: 35.2 },
      { type: '助人', count: 45, percentage: 27.3 },
      { type: '公益', count: 32, percentage: 19.4 },
      { type: '其他', count: 30, percentage: 18.2 }
    ],
    stories: [
      { id: 'js1', title: '无声的陪伴', summary: '大学生每周去养老院，不说话，只是静静陪老人坐一下午。' }
    ],
    gridArea: { row: 3, col: 5 }
  },
  // 第四行（南部）
  {
    code: 'YN', name: '云南', shortName: '滇', monthlyFortune: 3680, participantCount: 245, kindnessCount: 128, warmthLevel: 3,
    typeDistribution: [
      { type: '志愿服务', count: 45, percentage: 35.2 },
      { type: '助人', count: 38, percentage: 29.7 },
      { type: '环保', count: 25, percentage: 19.5 },
      { type: '其他', count: 20, percentage: 15.6 }
    ],
    stories: [
      { id: 'yn1', title: '山那边的课堂', summary: '退休教师走进大山，为留守儿童开设"流动课堂"，三年走遍五个村庄。' }
    ],
    gridArea: { row: 4, col: 3 }
  },
  {
    code: 'GD', name: '广东', shortName: '粤', monthlyFortune: 5670, participantCount: 389, kindnessCount: 198, warmthLevel: 5,
    typeDistribution: [
      { type: '助人', count: 68, percentage: 34.3 },
      { type: '动物保护', count: 45, percentage: 22.7 },
      { type: '邻里互助', count: 42, percentage: 21.2 },
      { type: '其他', count: 43, percentage: 21.7 }
    ],
    stories: [
      { id: 'gd1', title: '雨夜的伞', summary: '暴雨夜，外卖小哥把雨衣披在了流浪猫身上，自己淋着雨继续送餐。' }
    ],
    gridArea: { row: 4, col: 5 }
  },
  // 第五行
  {
    code: 'XZ', name: '西藏', shortName: '藏', monthlyFortune: 980, participantCount: 56, kindnessCount: 32, warmthLevel: 1,
    typeDistribution: [
      { type: '环保', count: 15, percentage: 46.9 },
      { type: '志愿服务', count: 10, percentage: 31.3 },
      { type: '助人', count: 5, percentage: 15.6 },
      { type: '其他', count: 2, percentage: 6.3 }
    ],
    stories: [
      { id: 'xz1', title: '雪域的守护者', summary: '牧民自发巡护雪豹栖息地，守护着这片高原上的生灵。' }
    ],
    gridArea: { row: 5, col: 2 }
  }
];

// 获取所有省份温暖数据
export const getProvinceWarmthList = (): ProvinceWarmth[] => {
  return mockProvinceWarmth;
};

// 根据省份编码获取详情
export const getProvinceByCode = (code: string): ProvinceWarmth | undefined => {
  return mockProvinceWarmth.find(p => p.code === code);
};

// 获取温暖等级对应的颜色描述（用于色温图）
export const getWarmthLevelColor = (level: number): string => {
  const colors = [
    'rgba(255, 107, 107, 0.15)', // 等级1：最浅
    'rgba(255, 107, 107, 0.30)', // 等级2
    'rgba(255, 107, 107, 0.50)', // 等级3：中等
    'rgba(255, 107, 107, 0.70)', // 等级4
    'rgba(255, 107, 107, 0.90)'  // 等级5：最深
  ];
  return colors[Math.min(level - 1, colors.length - 1)];
};
