export interface Challenge {
  id: string;
  title: string;
  desc: string;
  emoji: string;
  orgName: string;
  startDate: string;
  endDate: string;
  participants: number;
  targetDays: number;
  reward: string;
  status: 'active' | 'upcoming' | 'ended';
  joined?: boolean;
  myDays?: number;
}

export const CHALLENGES: Challenge[] = [
  {
    id: 'ch_7days', title: '7天零废弃挑战', desc: '连续7天不产生一次性垃圾：自带购物袋、水杯、餐具。每天记录一个小行动。',
    emoji: '🌍', orgName: '市环保局', startDate: '2026-07-01', endDate: '2026-07-31',
    participants: 1234, targetDays: 7, reward: '生态守护者徽章 + 100福气值',
    status: 'active',
  },
  {
    id: 'ch_smile', title: '让100个人微笑', desc: '在一个月内，通过善行让100个陌生人微笑。可以是让座、帮忙、一个微笑、一句谢谢。',
    emoji: '😊', orgName: '好事发生', startDate: '2026-07-01', endDate: '2026-07-31',
    participants: 567, targetDays: 30, reward: '微笑大使称号 + 500福气值',
    status: 'active',
  },
  {
    id: 'ch_read', title: '7天阅读挑战', desc: '连续7天每天阅读30分钟，记录读后感。善待自己也是一种善行。',
    emoji: '📚', orgName: 'PAGE ONE 书店', startDate: '2026-07-10', endDate: '2026-07-31',
    participants: 890, targetDays: 7, reward: 'PAGE ONE 8折月卡 + 150福气值',
    status: 'active',
  },
  {
    id: 'ch_volunteer', title: '月度志愿者打卡', desc: '一个月内完成3次志愿服务：社区服务、公益捐款、帮助陌生人都可以。',
    emoji: '🤝', orgName: '市文明办', startDate: '2026-07-01', endDate: '2026-08-01',
    participants: 345, targetDays: 3, reward: '文明志愿者证书 + 300福气值',
    status: 'active',
  },
];