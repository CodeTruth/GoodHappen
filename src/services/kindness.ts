import { deepseekChat, deepseekChatStream, PERSONAS, PersonaType, StreamCallbacks } from './ai';

export interface AIResponse {
  persona: PersonaType;
  personaName: string;
  content: string;
  createdAt: string;
}

export const generateAIResponse = async (
  kindnessContent: string,
  isWitness: boolean = false,
  personaId?: PersonaType
): Promise<AIResponse> => {
  const persona = personaId
    ? PERSONAS.find(p => p.id === personaId)
    : PERSONAS[Math.floor(Math.random() * PERSONAS.length)];

  if (!persona) {
    throw new Error('Persona not found');
  }

  const witnessPrefix = isWitness
    ? '这是一条见证记录——用户记录了自己看到的别人的善行。请以赞赏和鼓励的语气回应，赞美用户善于发现美好的眼睛。'
    : '这是一条善行记录——用户记录了自己做的好事。请以温暖和赞美的语气回应。';

  const prompt = `${witnessPrefix}\n\n善行内容：${kindnessContent}\n\n请用${persona.name}的风格回应这条善行：`;

  try {
    const response = await deepseekChat([
      { role: 'system', content: persona.systemPrompt },
      { role: 'user', content: prompt }
    ]);

    return {
      persona: persona.id,
      personaName: persona.name,
      content: response,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('[AI] Generate response failed:', error);
    return {
      persona: persona.id,
      personaName: persona.name,
      content: 'AI小伙伴今天有点忙，但你的温暖已经被记住了 ✨',
      createdAt: new Date().toISOString()
    };
  }
};

export const generateAIResponseStream = async (
  kindnessContent: string,
  isWitness: boolean,
  personaId: PersonaType | undefined,
  callbacks: StreamCallbacks
): Promise<PersonaType> => {
  const persona = personaId
    ? PERSONAS.find(p => p.id === personaId)
    : PERSONAS[Math.floor(Math.random() * PERSONAS.length)];

  if (!persona) {
    throw new Error('Persona not found');
  }

  const witnessPrefix = isWitness
    ? '这是一条见证记录——用户记录了自己看到的别人的善行。请以赞赏和鼓励的语气回应，赞美用户善于发现美好的眼睛。'
    : '这是一条善行记录——用户记录了自己做的好事。请以温暖和赞美的语气回应。';

  const prompt = `${witnessPrefix}\n\n善行内容：${kindnessContent}\n\n请用${persona.name}的风格回应这条善行（50-150字）：`;

  const originalOnComplete = callbacks.onComplete;
  callbacks.onComplete = (fullContent: string) => {
    originalOnComplete?.(fullContent);
  };

  await deepseekChatStream(
    [
      { role: 'system', content: persona.systemPrompt },
      { role: 'user', content: prompt }
    ],
    callbacks
  );

  return persona.id;
};

export type CredibilityLevel = 'high' | 'medium' | 'low' | 'suspicious';

export interface CredibilityResult {
  level: CredibilityLevel;
  score: number;
  reason?: string;
}

export const evaluateCredibility = async (content: string): Promise<CredibilityResult> => {
  const systemPrompt = `你是一个真实性评估专家。请评估以下善行记录的真实可信度。

评估标准：
1. HIGH（高可信）：描述具体，包含时间、地点、人物等细节，可验证感强
2. MEDIUM（中等可信）：正常描述，有一定细节，无明显问题
3. LOW（低可信）：内容模糊、泛化、存疑（如"今天帮助了很多人"）
4. SUSPICIOUS（疑似虚构）：内容不合理、过于完美、疑似AI编造

请只返回JSON格式，不要包含其他文字：
{"level": "high|medium|low|suspicious", "score": 0-1之间的数字, "reason": "简短理由"}`;

  try {
    const response = await deepseekChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ]);

    try {
      const result = JSON.parse(response);
      return {
        level: result.level as CredibilityLevel,
        score: typeof result.score === 'number' ? result.score : 0.5,
        reason: result.reason
      };
    } catch (e) {
      console.error('[AI] Parse credibility result failed:', e);
      return { level: 'medium', score: 0.7, reason: '解析失败，默认中等' };
    }
  } catch (error) {
    console.error('[AI] Evaluate credibility failed:', error);
    return { level: 'medium', score: 0.7, reason: 'AI调用失败，默认中等' };
  }
};

export type ModerationResult = 'approved' | 'needs_modification' | 'rejected';

export interface ModerationResponse {
  result: ModerationResult;
  reason?: string;
  suggestions?: string[];
}

export const moderateContent = async (content: string): Promise<ModerationResponse> => {
  const systemPrompt = `你是一个内容审核专家。请审核以下内容是否符合社区规范。

审核标准：
1. APPROVED（通过）：内容符合规范，无违规内容
2. NEEDS_MODIFICATION（需修改）：存在轻微问题（如内容过于模糊、疑似AI编造），退回用户修改
3. REJECTED（拒绝）：明确违规（暴力、色情、政治敏感、广告营销等）

请只返回JSON格式，不要包含其他文字：
{"result": "approved|needs_modification|rejected", "reason": "简短理由", "suggestions": ["建议1", "建议2"]}`;

  try {
    const response = await deepseekChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: content }
    ]);

    try {
      const result = JSON.parse(response);
      return {
        result: result.result as ModerationResult,
        reason: result.reason,
        suggestions: result.suggestions || []
      };
    } catch (e) {
      console.error('[AI] Parse moderation result failed:', e);
      return { result: 'approved', reason: '解析失败，默认通过' };
    }
  } catch (error) {
    console.error('[AI] Moderate content failed:', error);
    return { result: 'approved', reason: 'AI调用失败，默认通过' };
  }
};