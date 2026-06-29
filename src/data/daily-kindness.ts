export interface DailyKindness {
  date: string;      // MM-DD格式
  suggestion: string;
  quote: string;
  persona: string;
}

// 365天善行建议（简化版，实际可扩展为完整365条）
const suggestions: Omit<DailyKindness, 'date'>[] = [
  { suggestion: '给一位久未联系的朋友发条问候消息', quote: '海内存知己，天涯若比邻。', persona: '王勃' },
  { suggestion: '在公交车上给需要的人让个座', quote: '老吾老以及人之老，幼吾幼以及人之幼。', persona: '孟子' },
  { suggestion: '对今天服务你的人真诚地说声谢谢', quote: '滴水之恩，当涌泉相报。', persona: '韩信' },
  { suggestion: '帮同事或同学解决一个小问题', quote: '赠人玫瑰，手有余香。', persona: '佚名' },
  { suggestion: '给家人做一顿饭或泡一杯茶', quote: '谁言寸草心，报得三春晖。', persona: '孟郊' },
  { suggestion: '捡起路边的一片垃圾', quote: '勿以善小而不为。', persona: '刘备' },
  { suggestion: '认真倾听别人说话，不打断', quote: '听君一席话，胜读十年书。', persona: '佚名' },
  { suggestion: '给陌生人一个真诚的微笑', quote: '笑一笑，十年少。', persona: '佚名' },
  { suggestion: '分享自己的知识或经验给需要的人', quote: '授人以鱼不如授人以渔。', persona: '老子' },
  { suggestion: '为身边的人送上一份小惊喜', quote: '礼轻情意重。', persona: '元稹' },
  { suggestion: '耐心解答一个孩子的问题', quote: '师者，所以传道授业解惑也。', persona: '韩愈' },
  { suggestion: '主动帮邻居提一下重物', quote: '远亲不如近邻。', persona: '佚名' },
  { suggestion: '写一段鼓励的话给正在努力的人', quote: '宝剑锋从磨砺出，梅花香自苦寒来。', persona: '佚名' },
  { suggestion: '节约一度电或一滴水', quote: '历览前贤国与家，成由勤俭败由奢。', persona: '李商隐' },
  { suggestion: '给流浪动物一点食物或水', quote: '天地之大德曰生。', persona: '周易' },
  { suggestion: '原谅一个人的无心之过', quote: '海纳百川，有容乃大。', persona: '林则徐' },
  { suggestion: '为社区或班级做一件力所能及的事', quote: '苟利国家生死以，岂因祸福避趋之。', persona: '林则徐' },
  { suggestion: '认真完成今天该做的每一件事', quote: '业精于勤，荒于嬉。', persona: '韩愈' },
  { suggestion: '赞美一个人的优点或进步', quote: '良言一句三冬暖。', persona: '佚名' },
  { suggestion: '睡前回想今天做过的三件好事', quote: '吾日三省吾身。', persona: '曾子' },
  { suggestion: '给远方的父母打个电话', quote: '父母在，不远游，游必有方。', persona: '孔子' },
  { suggestion: '把不需要的衣物捐给需要的人', quote: '己所不欲，勿施于人；己所欲，亦勿强施于人。', persona: '孔子' },
  { suggestion: '主动为新来的同事或同学介绍环境', quote: '有朋自远方来，不亦乐乎。', persona: '孔子' },
  { suggestion: '帮老人或孩子过一条马路', quote: '爱人者，人恒爱之。', persona: '孟子' },
  { suggestion: '在公共场所保持安静', quote: '非礼勿言，非礼勿听。', persona: '孔子' },
  { suggestion: '给努力工作的人递上一杯水', quote: '同舟共济，守望相助。', persona: '佚名' },
  { suggestion: '记住并叫出清洁阿姨或保安大叔的名字', quote: '姓名是一个人的尊严。', persona: '佚名' },
  { suggestion: '把共享单车摆放整齐', quote: '一屋不扫，何以扫天下。', persona: '陈蕃' },
  { suggestion: '给同事带一份早餐或零食', quote: '投我以木桃，报之以琼瑶。', persona: '诗经' },
  { suggestion: '认真读完一本书并分享给朋友', quote: '腹有诗书气自华。', persona: '苏轼' },
  { suggestion: '为辛苦的家人捶捶背或捏捏肩', quote: '百善孝为先。', persona: '佚名' },
];

/**
 * 获取今日善行建议
 * 根据一年中的第几天循环取建议
 */
export function getTodaySuggestion(): DailyKindness {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
  const index = dayOfYear % suggestions.length;
  const s = suggestions[index];

  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return {
    date: `${month}-${day}`,
    ...s,
  };
}
