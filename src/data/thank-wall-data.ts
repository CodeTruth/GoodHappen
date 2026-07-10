export interface ThankNote {
  id: string;
  content: string;
  from: string;
  time: string;
  location?: string;
  likes: number;
  replied: boolean;
}

export const THANK_NOTES: ThankNote[] = [
  { id: 'tn_001', content: '今天在地铁上有人帮我捡起了掉落的文件，来不及说谢谢人就下车了。谢谢你，陌生人。', from: '一个丢文件的人', time: '2小时前', location: '北京·地铁6号线', likes: 23, replied: false },
  { id: 'tn_002', content: '暴雨天我的车熄火了，一位大叔停下脚步帮我推车，浑身湿透。我永远记得你的背影。', from: '一个被帮助的司机', time: '5小时前', location: '上海·延安路', likes: 89, replied: true },
  { id: 'tn_003', content: '搬家那天邻居主动来帮忙搬重物，搬完后水都没喝一口就走了。好人一生平安。', from: '一个刚搬家的人', time: '昨天', location: '广州·天河区', likes: 56, replied: false },
  { id: 'tn_004', content: '在医院排队时，一个女孩让我排到她前面，说我看起来很不舒服。那天的善意我记到现在。', from: '一个生病的人', time: '昨天', location: '成都·华西医院', likes: 134, replied: true },
  { id: 'tn_005', content: '孩子走丢了，是一位年轻人帮我找到的。他抱着我孩子跑了三条街。这份恩情一辈子不忘。', from: '一位妈妈', time: '3天前', location: '深圳·龙岗', likes: 267, replied: false },
  { id: 'tn_006', content: '考研复习时座位旁的人每天都帮我占座，还悄悄给我放了一杯热咖啡。谢谢你陪我度过了最难的日子。', from: '一个考研人', time: '1周前', location: '武汉·某大学图书馆', likes: 178, replied: true },
  { id: 'tn_007', content: '外卖超时了，小哥淋着雨送来，餐洒了一半。我说没事，他走的时候眼眶是红的。希望他一切顺利。', from: '一个点外卖的人', time: '1周前', location: '杭州·西湖区', likes: 312, replied: false },
  { id: 'tn_008', content: '第一次来这座城市迷路了，一位大爷不仅给我指路，还带我走到了目的地。这座城市因为我温暖了。', from: '一个外地人', time: '2周前', location: '南京·新街口', likes: 95, replied: false },
];