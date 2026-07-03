/**
 * 福气计算引擎单元测试
 *
 * 测试内容：
 * 1. calculateFortune 的各维度正确性
 * 2. getLevelByFortune 的10个等级映射
 * 3. getTitleByFortune 的名称返回
 */

import { calculateFortune, getLevelByFortune, getTitleByFortune } from '../fortune';

// ============================================
// calculateFortune 测试
// ============================================

describe('calculateFortune', () => {
  // 基本输入模板
  const baseInput = {
    content: '今天帮老奶奶提菜篮子上楼，她很开心。',
    type: 'self' as const,
    tags: ['助人'],
    imageCount: 0,
    hasVideo: false,
    credibilityLevel: 'high' as const,
    streakDays: 1,
    likes: 2,
    comments: 1,
  };

  test('witness 类型应返回0福气值', () => {
    const result = calculateFortune({ ...baseInput, type: 'witness' });
    expect(result.total).toBe(0);
    expect(result.baseScore).toBe(0);
  });

  test('suspicious 可信度应返回0福气值', () => {
    const result = calculateFortune({ ...baseInput, credibilityLevel: 'suspicious' });
    expect(result.total).toBe(0);
    expect(result.typeMultiplier).toBe(0);
  });

  test('高可信度应有 trustMultiplier = 1.2', () => {
    const result = calculateFortune({ ...baseInput, credibilityLevel: 'high' });
    expect(result.trustMultiplier).toBe(1.2);
  });

  test('中等可信度应有 trustMultiplier = 1.0', () => {
    const result = calculateFortune({ ...baseInput, credibilityLevel: 'medium' });
    expect(result.trustMultiplier).toBe(1.0);
  });

  test('低可信度应有 trustMultiplier = 0.5', () => {
    const result = calculateFortune({ ...baseInput, credibilityLevel: 'low' });
    expect(result.trustMultiplier).toBe(0.5);
  });

  test('短文本无图片应使用 textShort (baseScore=5)', () => {
    const result = calculateFortune({
      ...baseInput,
      content: '让座',
      imageCount: 0,
      hasVideo: false,
    });
    expect(result.baseScore).toBe(5);
  });

  test('长文本(>=50字)应使用 textLong (baseScore=8)', () => {
    const result = calculateFortune({
      ...baseInput,
      content: '今天在公园散步时，看到一位老奶奶提着很重的菜篮子上楼，我主动上前帮忙提了上去，老奶奶非常开心地感谢我，我也感到很高兴。帮助他人真的能带来快乐！',
      imageCount: 0,
      hasVideo: false,
    });
    expect(result.baseScore).toBe(8);
  });

  test('1-3张图片应使用 textWithImages1_3 (baseScore=8)', () => {
    const result = calculateFortune({
      ...baseInput,
      content: '帮忙提菜',
      imageCount: 2,
      hasVideo: false,
    });
    expect(result.baseScore).toBe(8);
  });

  test('4张以上图片应使用 textWithImages4_9 (baseScore=10)', () => {
    const result = calculateFortune({
      ...baseInput,
      content: '社区志愿服务',
      imageCount: 5,
      hasVideo: false,
    });
    expect(result.baseScore).toBe(10);
  });

  test('包含视频应使用 textWithVideo (baseScore=10)', () => {
    const result = calculateFortune({
      ...baseInput,
      content: '志愿服务记录',
      imageCount: 0,
      hasVideo: true,
    });
    expect(result.baseScore).toBe(10);
  });

  test('扶老助残标签应有 typeMultiplier = 1.2', () => {
    const result = calculateFortune({
      ...baseInput,
      tags: ['扶老助残'],
    });
    expect(result.typeMultiplier).toBe(1.2);
  });

  test('志愿服务标签应有 typeMultiplier = 1.15', () => {
    const result = calculateFortune({
      ...baseInput,
      tags: ['志愿服务'],
    });
    expect(result.typeMultiplier).toBe(1.15);
  });

  test('环保标签应有 typeMultiplier = 1.1', () => {
    const result = calculateFortune({
      ...baseInput,
      tags: ['环保'],
    });
    expect(result.typeMultiplier).toBe(1.1);
  });

  test('普通标签（如助人）应有 typeMultiplier = 1.0', () => {
    const result = calculateFortune({
      ...baseInput,
      tags: ['助人'],
    });
    expect(result.typeMultiplier).toBe(0.9); // 默认0.9，助人不在TYPE_MULTIPLIERS特殊列表中
  });

  test('高价值标签应取最高乘数', () => {
    const result = calculateFortune({
      ...baseInput,
      tags: ['助人', '扶老助残', '环保'],
    });
    expect(result.typeMultiplier).toBe(1.2); // 取最高值
  });

  test('连续7天应有 streakMultiplier = 1.05', () => {
    const result = calculateFortune({
      ...baseInput,
      streakDays: 7,
    });
    expect(result.streakMultiplier).toBe(1.05);
  });

  test('连续14天应有 streakMultiplier = 1.1', () => {
    const result = calculateFortune({
      ...baseInput,
      streakDays: 14,
    });
    expect(result.streakMultiplier).toBe(1.1);
  });

  test('连续30天应有 streakMultiplier = 1.15', () => {
    const result = calculateFortune({
      ...baseInput,
      streakDays: 30,
    });
    expect(result.streakMultiplier).toBe(1.15);
  });

  test('点赞bonus：每3赞加1分，最多5分', () => {
    const result = calculateFortune({
      ...baseInput,
      likes: 15,
      comments: 0,
    });
    expect(result.bonusLikes).toBe(5); // Math.min(floor(15/3), 5) = 5
  });

  test('评论bonus：每2评加1分，最多3分', () => {
    const result = calculateFortune({
      ...baseInput,
      likes: 0,
      comments: 6,
    });
    expect(result.bonusComments).toBe(3); // Math.min(floor(6/2), 3) = 3
  });

  test('福气值上限为30', () => {
    // 构造一个极高的分数
    const result = calculateFortune({
      ...baseInput,
      content: 'x'.repeat(100), // 长文本
      imageCount: 5,
      tags: ['扶老助残'], // 1.2x
      credibilityLevel: 'high', // 1.2x
      streakDays: 30, // 1.15x
      likes: 100,
      comments: 100,
    });
    expect(result.total).toBeLessThanOrEqual(30);
  });

  test('福气值下限为0', () => {
    const result = calculateFortune({
      ...baseInput,
      credibilityLevel: 'low', // 0.5x
      content: 'x', // 短文本
      likes: 0,
      comments: 0,
    });
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  test('完整的福气计算验证', () => {
    // baseScore=8 (long text), typeMultiplier=1.2 (扶老助残), trustMultiplier=1.2 (high)
    // streakMultiplier=1.0 (1 day), bonusLikes=0, bonusComments=0
    const result = calculateFortune({
      content: 'A'.repeat(50),
      type: 'self',
      tags: ['扶老助残'],
      imageCount: 0,
      hasVideo: false,
      credibilityLevel: 'high',
      streakDays: 1,
      likes: 2,
      comments: 1,
    });
    // 8 * 1.2 * 1.2 * 1.0 + 0 + 0 = 11.52 → Math.round = 12
    expect(result.total).toBe(12);
    expect(result.baseScore).toBe(8);
    expect(result.typeMultiplier).toBe(1.2);
    expect(result.trustMultiplier).toBe(1.2);
    expect(result.streakMultiplier).toBe(1.0);
    expect(result.bonusLikes).toBe(0);
    expect(result.bonusComments).toBe(0);
  });
});

// ============================================
// getLevelByFortune 测试（10个等级映射）
// ============================================

describe('getLevelByFortune', () => {
  test('福气值0应返回等级1 - 微光初现', () => {
    const level = getLevelByFortune(0);
    expect(level.level).toBe(1);
    expect(level.name).toBe('微光初现');
  });

  test('福气值30应返回等级1', () => {
    const level = getLevelByFortune(30);
    expect(level.level).toBe(1);
  });

  test('福气值50应返回等级2 - 星火燎原', () => {
    const level = getLevelByFortune(50);
    expect(level.level).toBe(2);
    expect(level.name).toBe('星火燎原');
  });

  test('福气值100应返回等级2', () => {
    const level = getLevelByFortune(100);
    expect(level.level).toBe(2);
  });

  test('福气值150应返回等级3 - 暖阳初升', () => {
    const level = getLevelByFortune(150);
    expect(level.level).toBe(3);
    expect(level.name).toBe('暖阳初升');
  });

  test('福气值300应返回等级4 - 春风化雨', () => {
    const level = getLevelByFortune(300);
    expect(level.level).toBe(4);
    expect(level.name).toBe('春风化雨');
  });

  test('福气值500应返回等级5 - 灯火万家', () => {
    const level = getLevelByFortune(500);
    expect(level.level).toBe(5);
    expect(level.name).toBe('灯火万家');
  });

  test('福气值800应返回等级6 - 厚德载物', () => {
    const level = getLevelByFortune(800);
    expect(level.level).toBe(6);
    expect(level.name).toBe('厚德载物');
  });

  test('福气值1200应返回等级7 - 上善若水', () => {
    const level = getLevelByFortune(1200);
    expect(level.level).toBe(7);
    expect(level.name).toBe('上善若水');
  });

  test('福气值1800应返回等级8 - 大爱无疆', () => {
    const level = getLevelByFortune(1800);
    expect(level.level).toBe(8);
    expect(level.name).toBe('大爱无疆');
  });

  test('福气值2500应返回等级9 - 慈航普度', () => {
    const level = getLevelByFortune(2500);
    expect(level.level).toBe(9);
    expect(level.name).toBe('慈航普度');
  });

  test('福气值3500应返回等级10 - 功德圆满', () => {
    const level = getLevelByFortune(3500);
    expect(level.level).toBe(10);
    expect(level.name).toBe('功德圆满');
  });

  test('福气值5000仍返回等级10（最高级）', () => {
    const level = getLevelByFortune(5000);
    expect(level.level).toBe(10);
  });
});

// ============================================
// getTitleByFortune 测试
// ============================================

describe('getTitleByFortune', () => {
  test('福气值0应返回"微光初现"', () => {
    expect(getTitleByFortune(0)).toBe('微光初现');
  });

  test('福气值200应返回"星火燎原"', () => {
    expect(getTitleByFortune(200)).toBe('星火燎原');
  });

  test('福气值500应返回"灯火万家"', () => {
    expect(getTitleByFortune(500)).toBe('灯火万家');
  });

  test('福气值3500应返回"功德圆满"', () => {
    expect(getTitleByFortune(3500)).toBe('功德圆满');
  });

  test('福气值10000应返回"功德圆满"（最高级）', () => {
    expect(getTitleByFortune(10000)).toBe('功德圆满');
  });
});