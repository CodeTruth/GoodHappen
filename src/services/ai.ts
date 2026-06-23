import Taro from '@tarojs/taro';

const API_KEY = 'sk-a50f96db09ae43a09b626114e7aa7286';
const API_BASE_URL = 'https://api.deepseek.com';
const MODEL = 'deepseek-chat';
const TIMEOUT = 10000;
const STREAM_TIMEOUT = 3000;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export const deepseekChat = async (messages: ChatMessage[]): Promise<string> => {
  try {
    const response = await Taro.request<ChatResponse>({
      url: `${API_BASE_URL}/chat/completions`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: {
        model: MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.8
      },
      timeout: TIMEOUT
    });

    if (response.statusCode === 200 && response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content;
    }

    console.error('[AI] DeepSeek API response error:', response);
    throw new Error('AI response empty');
  } catch (error) {
    console.error('[AI] DeepSeek API call failed:', error);
    throw error;
  }
};

export interface StreamCallbacks {
  onStart?: () => void;
  onChunk?: (chunk: string) => void;
  onComplete?: (fullContent: string) => void;
  onTimeout?: () => void;
  onError?: (error: Error) => void;
}

export const deepseekChatStream = async (
  messages: ChatMessage[],
  callbacks: StreamCallbacks
): Promise<void> => {
  callbacks.onStart?.();

  const timeoutPromise = new Promise<{ timedOut: boolean }>((resolve) => {
    setTimeout(() => resolve({ timedOut: true }), STREAM_TIMEOUT);
  });

  const apiPromise = Taro.request<ChatResponse>({
    url: `${API_BASE_URL}/chat/completions`,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    data: {
      model: MODEL,
      messages,
      max_tokens: 1024,
      temperature: 0.8,
      stream: false
    },
    timeout: TIMEOUT
  });

  try {
    const result = await Promise.race([apiPromise, timeoutPromise]);

    if ('timedOut' in result && result.timedOut) {
      callbacks.onTimeout?.();

      try {
        const response = await apiPromise;
        if (response.statusCode === 200) {
          const content = response.data?.choices?.[0]?.message?.content || '';
          if (content) {
            const chunks = content.match(/.{1,10}/g) || [content];
            for (const chunk of chunks) {
              callbacks.onChunk?.(chunk);
              await new Promise(resolve => setTimeout(resolve, 30));
            }
            callbacks.onComplete?.(content);
            return;
          }
        }
      } catch (e) {
        console.error('[AI] Fallback after timeout failed:', e);
      }

      callbacks.onComplete?.('AI小伙伴正在赶来，你的温暖已经被记住了 ✨');
      return;
    }

    const response = result as typeof apiPromise extends Promise<infer T> ? T : never;

    if (response.statusCode === 200 && response.data?.choices?.[0]?.message?.content) {
      const content = response.data.choices[0].message.content;
      const chunkSize = Math.max(1, Math.floor(content.length / 20));
      const chunks = content.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [content];

      for (const chunk of chunks) {
        callbacks.onChunk?.(chunk);
        await new Promise(resolve => setTimeout(resolve, 40));
      }
      callbacks.onComplete?.(content);
    } else {
      throw new Error('AI response empty');
    }
  } catch (error) {
    console.error('[AI] Stream chat failed:', error);
    callbacks.onError?.(error as Error);
    callbacks.onComplete?.('AI小伙伴今天有点忙，但你的温暖已经被记住了 ✨');
  }
};

export type PersonaType = 'sudongpo' | 'confucius' | 'hobbes' | 'eliot' | 'praise' | 'cat';

export interface Persona {
  id: PersonaType;
  name: string;
  description: string;
  systemPrompt: string;
}

export const PERSONAS: Persona[] = [
  {
    id: 'sudongpo',
    name: '苏东坡',
    description: '暖心伙伴',
    systemPrompt: '你是苏东坡，一位温暖、哲思、有人情味的古代文人。请用苏轼的风格，以温暖、富有哲理的语言回应每一条善行记录。要结合善行中的具体细节，表达赞美和共鸣，不要泛泛而谈。语言要优美，引用古诗或哲理名言更佳。'
  },
  {
    id: 'confucius',
    name: '孔子',
    description: '生活智者',
    systemPrompt: '你是孔子，一位智慧、睿智、引经据典的思想家。请用孔子的风格，以智慧、深刻的语言回应每一条善行记录。要引用儒家经典，阐述善行的意义和价值，给予智慧的指引。'
  },
  {
    id: 'hobbes',
    name: '霍布斯',
    description: '毒舌好友',
    systemPrompt: '你是霍布斯，一位毒舌但暖心的好友。请用幽默、犀利但充满关怀的语言回应每一条善行记录。先讽刺一下，然后表达真诚的赞美，形成反差萌的效果。'
  },
  {
    id: 'eliot',
    name: '艾略特',
    description: '文艺诗人',
    systemPrompt: '你是艾略特，一位诗意、浪漫、意象丰富的诗人。请用诗歌般优美的语言回应每一条善行记录。使用丰富的意象和比喻，表达对善美的感受。'
  },
  {
    id: 'praise',
    name: '夸夸团',
    description: '热情粉丝',
    systemPrompt: '你是夸夸团成员，一位热情、充满能量、不遗余力夸赞别人的支持者。请用极度热情、充满感叹号的语言回应每一条善行记录。给予最夸张、最真诚的赞美。'
  },
  {
    id: 'cat',
    name: '治愈小猫',
    description: '可爱萌宠',
    systemPrompt: '你是一只治愈系小猫，可爱、简洁、温暖人心。请用可爱、简洁的语言回应每一条善行记录。使用猫的视角和语气，表达温暖和治愈。可以使用猫相关的emoji。'
  }
];

export const getPersonaById = (id: PersonaType): Persona => {
  return PERSONAS.find(p => p.id === id) || PERSONAS[0];
};

export const getRandomPersona = (): Persona => {
  return PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
};