import { deepseekChat } from './ai';
import { WeeklyReportData, StudentRankingItem } from './moral-dashboard';

declare const DEEPSEEK_API_KEY: string | undefined;

const API_KEY = (typeof DEEPSEEK_API_KEY !== 'undefined' && DEEPSEEK_API_KEY) ? DEEPSEEK_API_KEY : '';

// ========== AI 周报总结 ==========
export const generateWeeklySummary = async (
  report: WeeklyReportData,
  topUsers: StudentRankingItem[],
  circleName: string
): Promise<string> => {
  const prompt = `你是一位温暖的德育老师，请根据以下班级数据写一段80字以内的周报总结，语气亲切鼓励，引用一句古诗文：
班级：${circleName}
本周总提交：${report.totalCount}条
参与率：${report.participationRate}%
榜样数：${report.exampleCount}人
TOP3：${topUsers.slice(0, 3).map((u) => u.userName).join('、')}`;

  if (API_KEY) {
    try {
      const result = await deepseekChat([
        { role: 'system', content: '你是一位温暖的德育老师，擅长用亲切鼓励的语气写周报总结，喜欢引用古诗文。' },
        { role: 'user', content: prompt },
      ]);
      return result;
    } catch (e) {
      console.warn('[AI Weekly] API failed, fallback to template');
    }
  }

  // 回退模板生成
  const parts: string[] = [];
  if (report.participationRate >= 80) {
    parts.push(`本周${circleName}参与率高达${report.participationRate}%，同学们积极性令人欣喜`);
  } else if (report.participationRate >= 60) {
    parts.push(`本周${circleName}参与率为${report.participationRate}%，大部分同学表现良好`);
  } else {
    parts.push(`本周${circleName}参与率为${report.participationRate}%，期待更多同学加入`);
  }

  if (report.exampleCount >= 5) {
    parts.push(`涌现了${report.exampleCount}位榜样，善行有目共睹`);
  }

  if (topUsers.length > 0) {
    parts.push(`特别表扬${topUsers.slice(0, 2).map((u) => u.userName).join('、')}等同学`);
  }

  const quotes = [
    '"勿以善小而不为"，每一份善意都值得被记录。',
    '"积善成德，而神明自得"，坚持行善，未来可期。',
    '"爱人者，人恒爱之"，温暖他人也是温暖自己。',
    '"桃李不言，下自成蹊"，善行自有感召力。',
  ];
  parts.push(quotes[Math.floor(Math.random() * quotes.length)]);

  return parts.join('，') + '。';
};

// ========== AI 低质量提交改进建议 ==========
export const generateImprovementSuggestion = async (
  content: string,
  taskTitle: string,
  taskDesc: string
): Promise<string> => {
  const prompt = `你是一位耐心的德育老师，学生提交了以下任务记录，内容比较简单，请给出30字以内的温和改进建议：
任务：${taskTitle}（${taskDesc}）
学生记录："${content}"`;

  if (API_KEY) {
    try {
      const result = await deepseekChat([
        { role: 'system', content: '你是一位耐心的德育老师，善于温和地引导学生改进，语气亲切不严厉。' },
        { role: 'user', content: prompt },
      ]);
      return result;
    } catch (e) {
      console.warn('[AI Suggestion] API failed, fallback to template');
    }
  }

  // 回退模板
  if (content.length < 10) {
    return '建议具体描述做了什么、当时的心情和收获，让记录更生动哦～';
  }
  if (content.length < 20) {
    return '可以尝试加入更多细节，比如帮助的对象、具体过程和感受，会更打动人呢～';
  }
  return '内容不错！如果能补充当时的情景或心情，会让这份记录更加温暖动人～';
};
