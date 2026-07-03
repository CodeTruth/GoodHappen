import { deepseekChat, deepseekChatStream, PERSONAS, PersonaType, StreamCallbacks } from './ai';

export interface AIResponse {
  persona: PersonaType;
  personaName: string;
  content: string;
  createdAt: string;
}

/**
 * 从人设列表中随机选取 n 个不重复的人设
 */
function pickRandomPersonas(count: number, excludeId?: PersonaType) {
  const pool = excludeId ? PERSONAS.filter(p => p.id !== excludeId) : [...PERSONAS];
  const result: typeof PERSONAS = [];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    result.push(shuffled[i]);
  }
  return result;
}

function buildPrompt(kindnessContent: string, personaName: string, isWitness: boolean): string {
  const witnessPrefix = isWitness
    ? '这是一条见证记录——用户记录了自己看到的别人的善行。请以赞赏和鼓励的语气回应，赞美用户善于发现美好的眼睛。'
    : '这是一条善行记录——用户记录了自己做的好事。请以温暖和赞美的语气回应。';

  const globalWarmthConstraint = `
【全局约束】
1. 回复必须结合善行内容的具体细节，不能泛泛而谈
2. 无论以什么风格表达，最终落点必须是：用户感到"被看见、被温暖、被认同、被奖励"
3. 不要中性或冷淡收尾，不要给用户"哦就这样？"的感觉
4. 50-150字`;

  return `${witnessPrefix}\n\n善行内容：${kindnessContent}\n\n请用${personaName}的风格回应这条善行。${globalWarmthConstraint}`;
}

/**
 * 生成单条 AI 回复
 */
async function generateSingleResponse(
  kindnessContent: string,
  persona: typeof PERSONAS[0],
  isWitness: boolean
): Promise<AIResponse> {
  const prompt = buildPrompt(kindnessContent, persona.name, isWitness);
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
}

/**
 * 生成多人 AI 回复（默认2位名人同时回应）
 */
export const generateAIResponse = async (
  kindnessContent: string,
  isWitness: boolean = false,
  personaId?: PersonaType
): Promise<AIResponse> => {
  // 保持单条回复的向后兼容：如果指定了 personaId，只返回一条
  if (personaId) {
    const persona = PERSONAS.find(p => p.id === personaId);
    if (!persona) throw new Error('Persona not found');
    return generateSingleResponse(kindnessContent, persona, isWitness);
  }

  // 多人回复：随机选2个人设，并行请求
  const personas = pickRandomPersonas(2);
  const results = await Promise.all(
    personas.map(p => generateSingleResponse(kindnessContent, p, isWitness))
  );

  // 返回第一条（调用方如需多条，使用 generateMultiAIResponse）
  return results[0];
};

/**
 * 生成多人 AI 回复，返回多条（供记录页展示多条回复卡片）
 */
export const generateMultiAIResponse = async (
  kindnessContent: string,
  isWitness: boolean = false,
  count: number = 2
): Promise<AIResponse[]> => {
  const personas = pickRandomPersonas(count);
  const results = await Promise.all(
    personas.map(p => generateSingleResponse(kindnessContent, p, isWitness))
  );
  return results;
};

/**
 * 流式生成多人 AI 回复（依次展示，第一个流式完成后开始第二个）
 */
export const generateAIResponseStream = async (
  kindnessContent: string,
  isWitness: boolean,
  personaId: PersonaType | undefined,
  callbacks: StreamCallbacks
): Promise<PersonaType> => {
  const persona = personaId
    ? PERSONAS.find(p => p.id === personaId)
    : pickRandomPersonas(1)[0];

  if (!persona) {
    throw new Error('Persona not found');
  }

  const prompt = buildPrompt(kindnessContent, persona.name, isWitness);

  await deepseekChatStream(
    [
      { role: 'system', content: persona.systemPrompt },
      { role: 'user', content: prompt }
    ],
    callbacks
  );

  return persona.id;
};

/**
 * 流式生成多人回复（第一个流式完成后，第二个非流式获取）
 * 返回所有人设 ID
 *
 * @param kindnessContent - 善行记录的文本内容
 * @param isWitness - 是否为见证模式（true 时 AI 回复风格调整为赞美用户善于发现善意）
 * @param callbacks - 回调函数集合，用于在流式输出的不同阶段接收数据：
 *   - firstPersonaStart: 第一位名人开始生成时调用
 *   - firstChunk: 第一位名人流式输出的每个文本片段
 *   - firstComplete: 第一位名人完整回复生成完毕
 *   - secondComplete: 第二位名人完整回复生成完毕
 *   - allComplete: 所有名人回复均已完成
 *   - onError: 生成过程中发生错误时调用
 * @returns Promise<void>，无返回值，结果通过 callbacks 传递
 */
export const generateMultiAIResponseStream = async (
  kindnessContent: string,
  isWitness: boolean,
  callbacks: {
    firstPersonaStart?: () => void;
    firstChunk?: (chunk: string) => void;
    firstComplete?: (fullContent: string, persona: typeof PERSONAS[0]) => void;
    secondComplete?: (fullContent: string, persona: typeof PERSONAS[0]) => void;
    allComplete?: (responses: AIResponse[]) => void;
    onError?: (error: Error) => void;
  }
): Promise<void> => {
  const personas = pickRandomPersonas(2);
  const now = new Date().toISOString();

  try {
    // 第一位：流式呈现
    callbacks.firstPersonaStart?.();
    const prompt1 = buildPrompt(kindnessContent, personas[0].name, isWitness);
    let content1 = '';
    await deepseekChatStream(
      [
        { role: 'system', content: personas[0].systemPrompt },
        { role: 'user', content: prompt1 }
      ],
      {
        onStart: () => {},
        onChunk: (chunk: string) => {
          content1 += chunk;
          callbacks.firstChunk?.(chunk);
        },
        onComplete: () => {
          callbacks.firstComplete?.(content1, personas[0]);
        },
        onError: callbacks.onError
      }
    );

    // 第二位：非流式获取（在第一位流式完成后）
    const resp2 = await generateSingleResponse(kindnessContent, personas[1], isWitness);
    callbacks.secondComplete?.(resp2.content, personas[1]);

    const resp1: AIResponse = {
      persona: personas[0].id,
      personaName: personas[0].name,
      content: content1,
      createdAt: now
    };
    callbacks.allComplete?.([resp1, resp2]);
  } catch (error) {
    callbacks.onError?.(error as Error);
  }
};

export type CredibilityLevel = 'high' | 'medium' | 'low' | 'suspicious';

export interface CredibilityResult {
  level: CredibilityLevel;
  score: number;
  reason?: string;
}

/**
 * 真实性评估：评估善行记录的可信程度
 *
 * 调用 AI 大模型对善行记录内容进行真实性分析，评估记录的可信度等级。
 * 评估标准基于内容的具体程度、可验证性和合理性：
 * - high（高可信）：描述具体，包含时间、地点、人物等细节，可验证感强
 * - medium（中等可信）：正常描述，有一定细节，无明显问题
 * - low（低可信）：内容模糊、泛化、存疑（如"今天帮助了很多人"）
 * - suspicious（疑似虚构）：内容不合理、过于完美、疑似AI编造
 *
 * 可信度评分（score）影响福气值的计算系数：
 * - high: 1.2x 福气加成
 * - medium/low: 1.0x 正常系数
 * - suspicious: 触发人工审核
 *
 * 当 AI 调用失败或结果解析失败时，默认返回 medium（安全降级策略）。
 *
 * @param content - 待评估的善行记录文本内容
 * @returns 可信度评估结果，包含可信度等级、评分（0-1）和理由说明
 */
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

/**
 * 内容审核：评估善行记录是否符合社区规范
 *
 * 调用 AI 大模型对用户提交的内容进行自动审核，判断是否包含违规信息。
 * 审核结果分为三档：
 * - approved：内容合规，允许发布
 * - needs_modification：内容存在轻微问题（模糊、疑似AI编造等），需用户修改后重新提交
 * - rejected：内容明确违规（暴力、色情、政治敏感、广告等），直接拒绝
 *
 * 当 AI 调用失败或结果解析失败时，默认返回 approved（安全降级策略）。
 *
 * @param content - 待审核的文本内容
 * @returns 审核结果，包含审核结论、原因说明和修改建议
 */
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
