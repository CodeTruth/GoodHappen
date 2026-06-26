import { Kindness } from '@/types/kindness';

// Mock善行数据
export const mockKindnessList: Kindness[] = [
  {
    id: '1',
    userId: 'user1',
    userName: '温暖小太阳',
    userAvatar: 'https://picsum.photos/id/64/200/200',
    content: '今天帮楼下独居的张奶奶提了两大袋菜上楼，她一直拉着我的手说谢谢，还非要给我塞两个苹果。其实只是举手之劳，但看到她脸上的笑容，我觉得今天特别有意义。',
    type: 'self',
    tags: ['助人', '邻里互助'],
    images: ['https://picsum.photos/id/292/300/300'],
    location: '北京市朝阳区',
    visibleScope: 'public',
    credibilityScore: 1.0,
    blessingValue: 12,
    likes: 23,
    comments: 5,
    createdAt: '2024-06-22T10:30:00Z',
    aiResponse: {
      persona: 'sudongpo',
      personaName: '苏东坡',
      content: '此乃古道热肠。君子之行，不在人知，而在己安。你今日之举，正是此道。',
      createdAt: '2024-06-22T10:30:03Z'
    }
  },
  {
    id: '2',
    userId: 'user2',
    userName: '城市观察者',
    userAvatar: 'https://picsum.photos/id/91/200/200',
    content: '地铁上看到一个女孩给孕妇让座，孕妇一直在说谢谢，女孩笑着说"没事，我年轻站得住"。那一刻觉得这个世界真温暖。',
    type: 'witness',
    tags: ['见证', '助人'],
    images: ['https://picsum.photos/id/312/300/300'],
    location: '上海市浦东新区',
    visibleScope: 'public',
    credibilityScore: 1.0,
    blessingValue: 0, // 见证不计入福气值
    likes: 45,
    comments: 12,
    createdAt: '2024-06-22T09:15:00Z',
    aiResponse: {
      persona: 'sudongpo',
      personaName: '苏东坡',
      content: '你看到了她给孕妇让座的那一刻，还把那一刻记了下来。这个世界需要更多这样的眼睛。',
      createdAt: '2024-06-22T09:15:03Z'
    }
  },
  {
    id: '3',
    userId: 'user3',
    userName: '环保小卫士',
    userAvatar: 'https://picsum.photos/id/177/200/200',
    content: '今天在公园散步，看到地上有垃圾，顺手捡起来扔进了垃圾桶。虽然只是小事，但希望每个人都能爱护环境。',
    type: 'self',
    tags: ['环保', '公益'],
    images: ['https://picsum.photos/id/401/300/300'],
    location: '广州市天河区',
    visibleScope: 'public',
    credibilityScore: 1.0,
    blessingValue: 8,
    likes: 18,
    comments: 3,
    createdAt: '2024-06-22T08:45:00Z',
    aiResponse: {
      persona: 'liqingzhao',
      personaName: '李清照',
      content: '这样的温柔，恰似细雨润物无声，让人心头一暖。',
      createdAt: '2024-06-22T08:45:03Z'
    }
  },
  {
    id: '4',
    userId: 'user4',
    userName: '暖心传递者',
    userAvatar: 'https://picsum.photos/id/338/200/200',
    content: '帮同事加班改方案，虽然自己也很累，但看到他如释重负的表情，觉得一切都值得。团队合作就是这样互相支持吧。',
    type: 'self',
    tags: ['助人', '工作'],
    images: ['https://picsum.photos/id/431/300/300'],
    location: '深圳市南山区',
    visibleScope: 'followers',
    credibilityScore: 1.0,
    blessingValue: 10,
    likes: 32,
    comments: 8,
    createdAt: '2024-06-21T22:30:00Z',
    aiResponse: {
      persona: 'confucius',
      personaName: '孔子',
      content: '己欲立而立人，己欲达而达人。今日之举，正是此道。',
      createdAt: '2024-06-21T22:30:03Z'
    }
  },
  {
    id: '5',
    userId: 'user5',
    userName: '善意记录员',
    userAvatar: 'https://picsum.photos/id/1027/200/200',
    content: '看到路边有个小朋友在帮妈妈推婴儿车，虽然只是个小动作，但那个画面特别温馨。希望他长大后也能一直保持这份善良。',
    type: 'witness',
    tags: ['见证', '亲子'],
    images: ['https://picsum.photos/id/570/300/300'],
    location: '杭州市西湖区',
    visibleScope: 'public',
    credibilityScore: 1.0,
    blessingValue: 0,
    likes: 56,
    comments: 15,
    createdAt: '2024-06-21T20:15:00Z',
    aiResponse: {
      persona: 'dufu',
      personaName: '杜甫',
      content: '人间烟火里，这样的善意就像寒夜里的一盏灯，虽微弱却足以照亮归途。',
      createdAt: '2024-06-21T20:15:03Z'
    }
  },
  {
    id: '6',
    userId: 'user6',
    userName: '日常行善者',
    userAvatar: 'https://picsum.photos/id/64/200/200',
    content: '今天给外卖小哥送了一瓶水，他说这是他今天收到的第一份关心。其实只是一瓶水，但希望能让他感受到这个城市的温暖。',
    type: 'self',
    tags: ['助人', '关怀'],
    images: ['https://picsum.photos/id/580/300/300'],
    location: '成都市武侯区',
    visibleScope: 'public',
    credibilityScore: 1.0,
    blessingValue: 11,
    likes: 67,
    comments: 19,
    createdAt: '2024-06-21T18:00:00Z',
    aiResponse: {
      persona: 'zhuangzi',
      personaName: '庄子',
      content: '善行如水，顺势而为，不争而利万物。这便是自然之道。',
      createdAt: '2024-06-21T18:00:03Z'
    }
  },
  {
    id: '7',
    userId: 'user7',
    userName: '城市温暖',
    userAvatar: 'https://picsum.photos/id/91/200/200',
    content: '看到有人把共享单车摆放整齐，虽然不是自己做的，但这种默默为他人着想的行为真的值得记录。',
    type: 'witness',
    tags: ['见证', '公益'],
    images: ['https://picsum.photos/id/625/300/300'],
    location: '武汉市江汉区',
    visibleScope: 'public',
    credibilityScore: 1.0,
    blessingValue: 0,
    likes: 41,
    comments: 9,
    createdAt: '2024-06-21T16:30:00Z',
    aiResponse: {
      persona: 'libai',
      personaName: '李白',
      content: '千尺桃花潭水，不及你这份豪情万丈！举杯敬你，好样的！',
      createdAt: '2024-06-21T16:30:03Z'
    }
  },
  {
    id: '8',
    userId: 'user8',
    userName: '孝心满满',
    userAvatar: 'https://picsum.photos/id/177/200/200',
    content: '今天陪妈妈去医院检查，虽然排队很久，但能陪在她身边，我觉得很安心。父母年纪大了，需要我们的陪伴。',
    type: 'self',
    tags: ['孝亲', '陪伴'],
    images: ['https://picsum.photos/id/835/300/300'],
    location: '南京市鼓楼区',
    visibleScope: 'public',
    credibilityScore: 1.0,
    blessingValue: 15,
    likes: 89,
    comments: 23,
    createdAt: '2024-06-21T14:00:00Z',
    aiResponse: {
      persona: 'sudongpo',
      personaName: '苏东坡',
      content: '百善孝为先。你今日之行，正是此道。父母在，不远游，游必有方。',
      createdAt: '2024-06-21T14:00:03Z'
    }
  },
  {
    id: '9',
    userId: 'user9',
    userName: '善意传播者',
    userAvatar: 'https://picsum.photos/id/338/200/200',
    content: '看到社区志愿者在给老人免费理发，他们用自己的专业技能帮助需要的人，这种善行特别有意义。',
    type: 'witness',
    tags: ['见证', '公益', '助人'],
    images: ['https://picsum.photos/id/1080/300/300'],
    location: '西安市雁塔区',
    visibleScope: 'public',
    credibilityScore: 1.0,
    blessingValue: 0,
    likes: 72,
    comments: 16,
    createdAt: '2024-06-21T12:00:00Z',
    aiResponse: {
      persona: 'confucius',
      personaName: '孔子',
      content: '己欲立而立人，己欲达而达人。这些志愿者，正是此道的践行者。',
      createdAt: '2024-06-21T12:00:03Z'
    }
  },
  {
    id: '10',
    userId: 'user10',
    userName: '温暖日常',
    userAvatar: 'https://picsum.photos/id/1027/200/200',
    content: '今天帮邻居照看了一会儿孩子，她去办事的时候孩子没人带。虽然有点手忙脚乱，但看到孩子天真的笑容，一切都值得。',
    type: 'self',
    tags: ['助人', '邻里互助'],
    images: ['https://picsum.photos/id/326/300/300'],
    location: '重庆市渝中区',
    visibleScope: 'public',
    credibilityScore: 1.0,
    blessingValue: 13,
    likes: 54,
    comments: 11,
    createdAt: '2024-06-21T10:00:00Z',
    aiResponse: {
      persona: 'wangwei',
      personaName: '王维',
      content: '你的善行如山间清泉，默默滋养，却让整个山谷都有了生机。',
      createdAt: '2024-06-21T10:00:03Z'
    }
  }
];

// 获取善行列表
export const getKindnessList = (): Kindness[] => {
  return mockKindnessList;
};

// 根据ID获取善行
export const getKindnessById = (id: string): Kindness | undefined => {
  return mockKindnessList.find(item => item.id === id);
};