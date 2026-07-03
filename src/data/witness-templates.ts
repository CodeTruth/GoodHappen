// ============================================
// 一键见证模板数据
// 用于"我看到的好事"快速填写
// ============================================

export interface WitnessTemplate {
  id: string;
  icon: string;
  title: string;
  desc: string;
}

export const WITNESS_TEMPLATES: WitnessTemplate[] = [
  { id: 'wt_01', icon: '🚇', title: '地铁让座', desc: '今天在地铁上给需要的人让座，对方连声道谢，心里暖暖的。' },
  { id: 'wt_02', icon: '🤝', title: '帮忙开门', desc: '帮后面的人扶了一下门，对方微笑着说谢谢，一整天心情都变好了。' },
  { id: 'wt_03', icon: '🗑️', title: '捡起垃圾', desc: '看到地上有垃圾顺手捡了起来，扔进垃圾桶，举手之劳让环境更美好。' },
  { id: 'wt_04', icon: '💪', title: '帮提重物', desc: '看到一位老人拎着很重的购物袋，主动上前帮忙提了一段路。' },
  { id: 'wt_05', icon: '🧭', title: '热心指路', desc: '遇到一位迷路的游客，耐心地为他指路并画了简单的地图。' },
  { id: 'wt_06', icon: '💧', title: '递一瓶水', desc: '看到环卫工人在烈日下工作，买了一瓶水送过去。' },
  { id: 'wt_07', icon: '🛵', title: '扶起电动车', desc: '路边的电动车被风吹倒了，帮忙扶起来摆好。' },
  { id: 'wt_08', icon: '🐱', title: '喂流浪猫', desc: '看到小区里的流浪猫，回家拿了食物和水喂它们。' },
  { id: 'wt_09', icon: '❤️', title: '安慰朋友', desc: '朋友今天心情不太好，耐心倾听并给了TA一个温暖的拥抱。' },
  { id: 'wt_10', icon: '📚', title: '分享笔记', desc: '把精心整理的学习笔记分享给同学，大家一起进步的感觉真好。' },
];