// Mock评论数据 —— 为每条善行提供示例评论

export interface MockComment {
  id: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}

const mockCommentsMap: Record<string, MockComment[]> = {
  '1': [
    {
      id: 'c1_1',
      userName: '暖风轻拂',
      userAvatar: 'https://picsum.photos/id/91/200/200',
      content: '张奶奶一定很感动，你是个好人！',
      createdAt: '2024-06-22T11:00:00Z',
    },
    {
      id: 'c1_2',
      userName: '追光少年',
      userAvatar: 'https://picsum.photos/id/177/200/200',
      content: '举手之劳暖人心，这就是善意的力量。',
      createdAt: '2024-06-22T12:30:00Z',
    },
    {
      id: 'c1_3',
      userName: '路过的人',
      userAvatar: 'https://picsum.photos/id/338/200/200',
      content: '我也经常帮邻居，看到你这样说觉得特别有共鸣。',
      createdAt: '2024-06-22T14:00:00Z',
    },
    {
      id: 'c1_4',
      userName: '善良小天使',
      userAvatar: 'https://picsum.photos/id/1027/200/200',
      content: '那两个苹果一定是世界上最甜的苹果！',
      createdAt: '2024-06-22T15:20:00Z',
    },
    {
      id: 'c1_5',
      userName: '城市漫步者',
      userAvatar: 'https://picsum.photos/id/64/200/200',
      content: '邻里互助真的很重要，向楼主学习。',
      createdAt: '2024-06-22T16:45:00Z',
    },
    {
      id: 'c1_6',
      userName: '瑞幸咖啡',
      userAvatar: 'https://picsum.photos/id/1080/200/200',
      content: '瑞幸咖啡致敬这份邻里间的温暖，一杯小蓝杯，敬每一位城市善行者 ☕',
      createdAt: '2024-06-22T17:10:00Z',
    },
    {
      id: 'c1_7',
      userName: '星巴克',
      userAvatar: 'https://picsum.photos/id/1069/200/200',
      content: '星巴克致敬每一位传递温暖的邻里伙伴，用一杯拿铁的温度，致敬善行的力量。',
      createdAt: '2024-06-22T17:30:00Z',
    },
  ],
  '2': [
    {
      id: 'c2_1',
      userName: '小鹿斑比',
      userAvatar: 'https://picsum.photos/id/64/200/200',
      content: '给孕妇让座虽然小，但真的很暖心。',
      createdAt: '2024-06-22T10:00:00Z',
    },
    {
      id: 'c2_2',
      userName: '正能量达人',
      userAvatar: 'https://picsum.photos/id/91/200/200',
      content: '"我年轻站得住"，这句话太可爱了哈哈哈',
      createdAt: '2024-06-22T10:30:00Z',
    },
    {
      id: 'c2_3',
      userName: '温柔以待',
      userAvatar: 'https://picsum.photos/id/177/200/200',
      content: '地铁上让人让座的善意真的要珍惜，希望更多人像这个女孩一样。',
      createdAt: '2024-06-22T11:15:00Z',
    },
    {
      id: 'c2_4',
      userName: '瑞幸咖啡',
      userAvatar: 'https://picsum.photos/id/1080/200/200',
      content: '城市通勤路上的善意最动人，瑞幸咖啡致敬每一位温暖的同路人 ☕',
      createdAt: '2024-06-22T11:45:00Z',
    },
  ],
  '3': [
    {
      id: 'c3_1',
      userName: '绿色生活家',
      userAvatar: 'https://picsum.photos/id/64/200/200',
      content: '从身边小事做起，保护环境人人有责！',
      createdAt: '2024-06-22T09:30:00Z',
    },
    {
      id: 'c3_2',
      userName: '自然之子',
      userAvatar: 'https://picsum.photos/id/338/200/200',
      content: '公园的环境越来越好，离不开大家的努力。',
      createdAt: '2024-06-22T10:00:00Z',
    },
    {
      id: 'c3_3',
      userName: '环保先锋',
      userAvatar: 'https://picsum.photos/id/1027/200/200',
      content: '捡垃圾虽然不起眼，但确实是很棒的善行。为楼主点赞！',
      createdAt: '2024-06-22T11:30:00Z',
    },
    {
      id: 'c3_4',
      userName: 'Patagonia',
      userAvatar: 'https://picsum.photos/id/1084/200/200',
      content: 'Patagonia 致敬每一位守护地球的善行者，用环保行动致敬自然的守护者 🌍',
      createdAt: '2024-06-22T12:00:00Z',
    },
    {
      id: 'c3_5',
      userName: '奈雪的茶',
      userAvatar: 'https://picsum.photos/id/1079/200/200',
      content: '奈雪的茶致敬每一份对自然的善意，用一杯果茶的清甜，致敬地球的守护者。',
      createdAt: '2024-06-22T12:15:00Z',
    },
  ],
  '4': [
    {
      id: 'c4_1',
      userName: '职场人',
      userAvatar: 'https://picsum.photos/id/91/200/200',
      content: '同事之间互相帮助真的很重要，楼主辛苦了！',
      createdAt: '2024-06-21T23:00:00Z',
    },
    {
      id: 'c4_2',
      userName: '奋斗青年',
      userAvatar: 'https://picsum.photos/id/177/200/200',
      content: '加班本身就很累了，还帮别人改方案，太佩服了。',
      createdAt: '2024-06-22T08:00:00Z',
    },
    {
      id: 'c4_3',
      userName: '好心人',
      userAvatar: 'https://picsum.photos/id/64/200/200',
      content: '团队合作互相支持才是最好的工作状态。',
      createdAt: '2024-06-22T09:15:00Z',
    },
    {
      id: 'c4_4',
      userName: ' sunny day',
      userAvatar: 'https://picsum.photos/id/338/200/200',
      content: '如释重负的表情一定很精彩吧哈哈，不过真的很温暖。',
      createdAt: '2024-06-22T10:30:00Z',
    },
  ],
  '5': [
    {
      id: 'c5_1',
      userName: '亲子达人',
      userAvatar: 'https://picsum.photos/id/64/200/200',
      content: '言传不如身教，这个妈妈教育得真好。',
      createdAt: '2024-06-21T21:00:00Z',
    },
    {
      id: 'c5_2',
      userName: '童心未泯',
      userAvatar: 'https://picsum.photos/id/91/200/200',
      content: '小朋友推婴儿车的画面想想就觉得超级温馨。',
      createdAt: '2024-06-21T21:30:00Z',
    },
    {
      id: 'c5_3',
      userName: '月下独行',
      userAvatar: 'https://picsum.photos/id/177/200/200',
      content: '善良的孩子会有善良的大人，愿他一直如此。',
      createdAt: '2024-06-22T07:00:00Z',
    },
  ],
  '6': [
    {
      id: 'c6_1',
      userName: '送水小分队',
      userAvatar: 'https://picsum.photos/id/91/200/200',
      content: '我也是送水的！夏天外卖小哥真的很辛苦，一瓶水就是一份关心。',
      createdAt: '2024-06-21T19:00:00Z',
    },
    {
      id: 'c6_2',
      userName: '外卖骑士',
      userAvatar: 'https://picsum.photos/id/177/200/200',
      content: '作为外卖员，真的很感谢有这样的善心人。',
      createdAt: '2024-06-21T19:30:00Z',
    },
    {
      id: 'c6_3',
      userName: '每日善行',
      userAvatar: 'https://picsum.photos/id/338/200/200',
      content: '一瓶水虽小，但带来的温暖是巨大的。',
      createdAt: '2024-06-21T20:00:00Z',
    },
    {
      id: 'c6_4',
      userName: '瑞幸咖啡',
      userAvatar: 'https://picsum.photos/id/1080/200/200',
      content: '瑞幸咖啡向每一位烈日下的劳动者致敬，也向每一位传递清凉的善心人致敬 ☕',
      createdAt: '2024-06-21T20:30:00Z',
    },
    {
      id: 'c6_5',
      userName: '星巴克',
      userAvatar: 'https://picsum.photos/id/1069/200/200',
      content: '星巴克致敬每一份夏日里的清凉善意，用一杯冰美式的温度，致敬善行的力量。',
      createdAt: '2024-06-21T21:00:00Z',
    },
  ],
  '7': [
    {
      id: 'c7_1',
      userName: '共享达人',
      userAvatar: 'https://picsum.photos/id/64/200/200',
      content: '摆共享单车看起来简单，但确实需要有人去做。',
      createdAt: '2024-06-21T17:30:00Z',
    },
    {
      id: 'c7_2',
      userName: '城市观察',
      userAvatar: 'https://picsum.photos/id/91/200/200',
      content: '为他人着想，默默行善，这种人最值得尊敬。',
      createdAt: '2024-06-21T18:00:00Z',
    },
  ],
  '8': [
    {
      id: 'c8_1',
      userName: '孝顺孩子',
      userAvatar: 'https://picsum.photos/id/64/200/200',
      content: '百善孝为先！楼主是好样的。',
      createdAt: '2024-06-21T15:00:00Z',
    },
    {
      id: 'c8_2',
      userName: '家有老母',
      userAvatar: 'https://picsum.photos/id/91/200/200',
      content: '父母最需要的就是陪伴，楼主做得很好。',
      createdAt: '2024-06-21T15:30:00Z',
    },
    {
      id: 'c8_3',
      userName: '暖心大叔',
      userAvatar: 'https://picsum.photos/id/177/200/200',
      content: '看到这条突然很想给妈妈打电话了…谢谢楼主的提醒。',
      createdAt: '2024-06-21T16:00:00Z',
    },
    {
      id: 'c8_4',
      userName: '医路同行',
      userAvatar: 'https://picsum.photos/id/338/200/200',
      content: '医院排队确实很久，有陪伴就是最大的安慰。',
      createdAt: '2024-06-21T16:30:00Z',
    },
    {
      id: 'c8_5',
      userName: '静水流深',
      userAvatar: 'https://picsum.photos/id/1027/200/200',
      content: '珍惜和父母在一起的每一天，共勉。',
      createdAt: '2024-06-21T17:00:00Z',
    },
    {
      id: 'c8_6',
      userName: '奈雪的茶',
      userAvatar: 'https://picsum.photos/id/1079/200/200',
      content: '奈雪的茶致敬每一份温暖的陪伴，用一杯果茶的清甜，致敬亲情的力量。',
      createdAt: '2024-06-21T17:30:00Z',
    },
  ],
  '9': [
    {
      id: 'c9_1',
      userName: '社区热心人',
      userAvatar: 'https://picsum.photos/id/64/200/200',
      content: '志愿者真的很伟大，用自己的专业技能帮助别人。',
      createdAt: '2024-06-21T13:00:00Z',
    },
    {
      id: 'c9_2',
      userName: '美发师小王',
      userAvatar: 'https://picsum.photos/id/91/200/200',
      content: '我是一名理发师，我们店也定期去社区义剪，真的很开心。',
      createdAt: '2024-06-21T13:30:00Z',
    },
    {
      id: 'c9_3',
      userName: '爱心传递',
      userAvatar: 'https://picsum.photos/id/177/200/200',
      content: '专业的人做专业的事，还能帮助有需要的人，双倍温暖！',
      createdAt: '2024-06-21T14:00:00Z',
    },
    {
      id: 'c9_4',
      userName: '瑞幸咖啡',
      userAvatar: 'https://picsum.photos/id/1080/200/200',
      content: '用专业技能传递温暖，瑞幸咖啡致敬每一位社区志愿者 ☕',
      createdAt: '2024-06-21T14:30:00Z',
    },
  ],
  '10': [
    {
      id: 'c10_1',
      userName: '宝妈一枚',
      userAvatar: 'https://picsum.photos/id/64/200/200',
      content: '帮忙看孩子真的需要耐心，楼主太棒了！',
      createdAt: '2024-06-21T11:00:00Z',
    },
    {
      id: 'c10_2',
      userName: '邻里一家亲',
      userAvatar: 'https://picsum.photos/id/91/200/200',
      content: '远亲不如近邻，互帮互助才是最好的社区关系。',
      createdAt: '2024-06-21T11:30:00Z',
    },
    {
      id: 'c10_3',
      userName: '童心世界',
      userAvatar: 'https://picsum.photos/id/177/200/200',
      content: '孩子的笑容是最纯真的回报！',
      createdAt: '2024-06-21T12:00:00Z',
    },
    {
      id: 'c10_4',
      userName: '暖心邻居',
      userAvatar: 'https://picsum.photos/id/338/200/200',
      content: '下次邻居有困难我也会帮忙的，被楼主的善行感染了。',
      createdAt: '2024-06-21T12:30:00Z',
    },
    {
      id: 'c10_5',
      userName: '星巴克',
      userAvatar: 'https://picsum.photos/id/1069/200/200',
      content: '星巴克致敬每一位温暖的邻里伙伴，用一杯咖啡的温度，致敬社区的善意。',
      createdAt: '2024-06-21T13:00:00Z',
    },
    {
      id: 'c10_6',
      userName: '奈雪的茶',
      userAvatar: 'https://picsum.photos/id/1079/200/200',
      content: '奈雪的茶致敬每一份温暖的邻里情，用一杯果茶的清甜，致敬善意的传递。',
      createdAt: '2024-06-21T13:15:00Z',
    },
  ],
};

export const getMockComments = (kindnessId: string): MockComment[] => {
  return mockCommentsMap[kindnessId] || [];
};
