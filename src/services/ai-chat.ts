import { deepseekChat, deepseekChatStream, PERSONAS, PersonaType, StreamCallbacks } from './ai';

export type ChatMode = 'counsel' | 'discuss' | 'guide' | 'free';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatSession {
  personaId: PersonaType;
  personaName: string;
  messages: ChatMessage[];
  mode: ChatMode;
}

// 快捷话题预设
export const QUICK_TOPICS: Record<PersonaType, { label: string; prompt: string }[]> = {
  sudongpo: [
    { label: '聊聊豁达', prompt: '我最近遇到了一些不顺心的事，能跟我聊聊怎么保持豁达的心态吗？' },
    { label: '东坡美食', prompt: '你发明东坡肉的时候是怎么想的？能教我做人间的滋味吗？' },
    { label: '诗词推荐', prompt: '给我推荐一首你的诗，适合我现在心情的。' },
  ],
  confucius: [
    { label: '如何行善', prompt: '我想多做好事，但不知道怎么开始，能给我一些建议吗？' },
    { label: '论语智慧', prompt: '"己所不欲，勿施于人"这句话，在今天还有什么新的理解吗？' },
    { label: '修身养性', prompt: '您觉得现代人最缺的是什么品德？该怎么修炼？' },
  ],
  libai: [
    { label: '侠客精神', prompt: '您写"十步杀一人，千里不留行"的时候，心里想的是什么？' },
    { label: '人生豪迈', prompt: '我最近有点低落，能跟我说几句豪迈的话提提气吗？' },
    { label: '诗酒人生', prompt: '您觉得喝酒和写诗是什么关系？' },
  ],
  dufu: [
    { label: '悲悯之心', prompt: '您看到天下苍生受苦时，心里是怎么想的？' },
    { label: '困境中的光', prompt: '我现在处境不太好，能跟我说说您在最困难的时候是怎么过来的吗？' },
    { label: '诗歌力量', prompt: '您觉得诗歌能改变什么？' },
  ],
  zhuangzi: [
    { label: '逍遥之道', prompt: '"逍遥游"到底是什么意思？现代人能做到吗？' },
    { label: '放下执念', prompt: '我总是放不下一些事情，您能教我怎么看开吗？' },
    { label: '梦与现实', prompt: '"庄周梦蝶"，您觉得是庄周梦见了蝴蝶，还是蝴蝶梦见了庄周？' },
  ],
  liqingzhao: [
    { label: '女性力量', prompt: '作为宋代最杰出的女词人，您觉得女性在文学上有什么独特的视角？' },
    { label: '情感细腻', prompt: '您写"知否知否，应是绿肥红瘦"的时候是什么心情？' },
    { label: '坚韧之美', prompt: '您经历了那么多苦难，是怎么保持对美的敏感的？' },
  ],
  taoyuanming: [
    { label: '田园之趣', prompt: '"采菊东篱下，悠然见南山"——您当时看到的是什么？' },
    { label: '归隐之心', prompt: '现代人也很想逃离城市，您觉得归隐需要勇气还是放弃？' },
    { label: '简单生活', prompt: '您觉得一个人需要多少东西才能幸福？' },
  ],
  wangwei: [
    { label: '山水禅意', prompt: '"空山不见人，但闻人语响"——您写这首诗时看到了什么？' },
    { label: '静谧之美', prompt: '我觉得生活太吵了，能教我怎么找到内心的安静吗？' },
    { label: '诗中有画', prompt: '您说"诗中有画，画中有诗"，能给我描述一幅您心中的画吗？' },
  ],
};

// 模式对应的system prompt后缀
const MODE_PROMPTS: Record<ChatMode, string> = {
  counsel: `
【当前模式：解惑疏导】
用户可能在倾诉烦恼、表达负面情绪或寻求建议。
你的任务是：
1. 先倾听——让用户感到被理解，不急于给建议
2. 再共情——用你的人格魅力和人生经历来回应
3. 后引导—— gently 引导用户看到事情的另一面，不强迫、不说教
4. 语气温暖、真诚，像一位有智慧的老朋友在聊天
5. 回复控制在80-150字`,
  discuss: `
【当前模式：探讨作品/思想/生平】
用户想深入了解你的人物背景、作品或思想。
你的任务是：
1. 用你的人物口吻回答，保持角色一致性
2. 可以引用你的作品、讲述你的经历
3. 用现代人能理解的方式解释你的思想
4. 语气亲切自然，不要像学术论文
5. 回复控制在80-150字`,
  guide: `
【当前模式：引导向善】
用户希望得到每日善行的建议或道德上的指引。
你的任务是：
1. 根据你的人物特点给出具体的善行建议（越具体越好）
2. 解释为什么这件善事有意义
3. 用你的经历或思想来佐证
4. 给用户信心和鼓励
5. 回复控制在80-150字`,
  free: `
【当前模式：自由聊天】
像一位有智慧的老朋友一样和用户聊天。
回复控制在80-150字，保持你的人设一致性。`,
};

function buildChatMessages(
  session: ChatSession,
  newUserMessage: string
): { systemPrompt: string; messages: { role: 'user' | 'assistant' | 'system'; content: string }[] } {
  const persona = PERSONAS.find(p => p.id === session.personaId);
  if (!persona) throw new Error('Persona not found');

  const systemPrompt = `${persona.systemPrompt}\n\n${MODE_PROMPTS[session.mode]}`;

  // 只保留最近8轮对话作为上下文
  const recentMessages = session.messages.slice(-16);

  const messages: { role: 'user' | 'assistant' | 'system'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...recentMessages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: newUserMessage },
  ];

  return { systemPrompt, messages };
}

/**
 * 发送消息并获取AI回复（非流式）
 */
export async function sendChatMessage(
  session: ChatSession,
  userMessage: string
): Promise<string> {
  const { messages } = buildChatMessages(session, userMessage);
  return await deepseekChat(messages);
}

/**
 * 发送消息并获取AI回复（流式）
 */
export async function sendChatMessageStream(
  session: ChatSession,
  userMessage: string,
  callbacks: StreamCallbacks
): Promise<string> {
  const { messages } = buildChatMessages(session, userMessage);
  return await deepseekChatStream(messages, callbacks);
}

/**
 * 获取某人物的快捷话题
 */
export function getQuickTopics(personaId: PersonaType): { label: string; prompt: string }[] {
  return QUICK_TOPICS[personaId] || [];
}

/**
 * 创建新的聊天会话
 */
export function createChatSession(personaId: PersonaType, mode: ChatMode = 'free'): ChatSession {
  const persona = PERSONAS.find(p => p.id === personaId);
  if (!persona) throw new Error('Persona not found');

  return {
    personaId,
    personaName: persona.name,
    messages: [],
    mode,
  };
}

/**
 * 向会话中添加消息
 */
export function addMessageToSession(
  session: ChatSession,
  role: 'user' | 'assistant',
  content: string
): ChatSession {
  return {
    ...session,
    messages: [
      ...session.messages,
      { role, content, timestamp: new Date().toISOString() },
    ],
  };
}
