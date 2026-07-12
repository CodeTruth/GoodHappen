/**
 * AI 自动 SOS 判定服务
 *
 * 基于传感器采集的多维度数据，通过前端规则引擎实时评估危险等级
 * 危险时自动触发 SOS
 *
 * 判定维度：
 * 1. 摔倒检测（加速度冲击 + 冲击后静止）
 * 2. 运动异常（突然剧烈运动后突然静止）
 * 3. 时间风险（凌晨风险更高）
 * 4. 天气风险（恶劣天气增加户外风险）
 */

import { sensorMonitor, type SOSAssessmentData, type MotionSnapshot } from './sensor-monitor';
import { voiceDetector, type VoiceDetectionResult } from './voice-detector';

// ============================================
// 类型定义
// ============================================

export type RiskLevel = 'safe' | 'watch' | 'danger' | 'critical';

export interface AutoSOSResult {
  /** 风险等级 */
  riskLevel: RiskLevel;
  /** 综合风险分 0-100 */
  score: number;
  /** 各维度得分明细 */
  factors: RiskFactor[];
  /** 是否触发自动 SOS */
  shouldTriggerSOS: boolean;
  /** 触发原因（人类可读） */
  reason: string;
  /** 建议动作 */
  suggestion: string;
  /** 检测到的时间 */
  detectedAt: string;
  /** 环境摘要（附在 SOS 通知中） */
  envSummary: string;
}

interface RiskFactor {
  name: string;
  score: number;      // 0-100
  weight: number;     // 权重
  triggered: boolean;
  detail: string;
}

/** 自动 SOS 触发回调 */
export type AutoSOSCallback = (result: AutoSOSResult) => void;

// ============================================
// 权重配置
// ============================================

const WEIGHTS = {
  fall: 0.30,         // 摔倒 — 核心
  motionAnomaly: 0.15, // 运动异常
  voice: 0.15,        // 语音求救 — 新增
  time: 0.12,         // 时间
  weather: 0.08,      // 天气
  duration: 0.08,     // 保护时长
  stillness: 0.12,    // 异常静止
};

/** 自动 SOS 触发阈值 */
const SOS_TRIGGER_THRESHOLD = 70;

/** 冷却时间 ms — 避免连续触发 */
const COOLDOWN_MS = 30000;

// ============================================
// AI 自动 SOS 判定器
// ============================================

class AutoSOSAssessor {
  private callback: AutoSOSCallback | null = null;
  private assessTimer: ReturnType<typeof setInterval> | null = null;
  private lastTriggerTime = 0;
  private _enabled = false;
  private _motionEnabled = false;

  get enabled() { return this._enabled; }

  /** 设置自动 SOS 触发回调 */
  onTrigger(cb: AutoSOSCallback) {
    this.callback = cb;
  }

  /** 启动自动 SOS 监测（保护模式 active 时调用） */
  start(protectionDuration: number) {
    if (this._enabled) return;
    this._enabled = true;
    this._motionEnabled = sensorMonitor.running;

    // 每 2 秒评估一次
    this.assessTimer = setInterval(() => {
      this.assess(protectionDuration);
    }, 2000);

    console.log('[AutoSOS] Monitoring started');
  }

  /** 停止监测 */
  stop() {
    this._enabled = false;
    if (this.assessTimer) {
      clearInterval(this.assessTimer);
      this.assessTimer = null;
    }
    console.log('[AutoSOS] Monitoring stopped');
  }

  /** 手动触发一次评估（用于调试/测试） */
  assessNow(protectionDuration: number): AutoSOSResult | null {
    return this.assess(protectionDuration);
  }

  /** 获取环境摘要文本 */
  getEnvSummary(): string {
    const env = sensorMonitor.getEnvironment();
    if (!env) return '';
    const parts: string[] = [];
    parts.push(`${env.hour}:00`);
    if (env.location) {
      parts.push(env.location.address || `${env.location.lat.toFixed(4)},${env.location.lng.toFixed(4)}`);
    }
    parts.push(`${env.weather.icon} ${env.weather.text} ${env.weather.temp}°C`);
    const motion = sensorMonitor.getSnapshots();
    const last = motion[motion.length - 1];
    if (last) {
      const intensityMap = { still: '静止', low: '步行', moderate: '活动', high: '剧烈运动' };
      parts.push(intensityMap[last.intensity]);
    }
    // 语音检测状态
    const voice = voiceDetector.getLatest();
    if (voice.speechRecognitionAvailable || voice.audioAnalysisAvailable) {
      parts.push('🎤语音监听');
    }
    return parts.join(' | ');
  }

  // ---- 私有方法 ----

  private assess(protectionDuration: number): AutoSOSResult | null {
    if (!this._enabled) return null;

    const data = sensorMonitor.getAssessmentData(protectionDuration);
    const factors: RiskFactor[] = [];

    // 1. 摔倒检测
    factors.push(this.assessFall(data.recentMotion));
    // 2. 运动异常
    factors.push(this.assessMotionAnomaly(data.recentMotion));
    // 3. 语音求救
    factors.push(this.assessVoice());
    // 4. 时间风险
    factors.push(this.assessTime(data.environment.hour));
    // 5. 天气风险
    factors.push(this.assessWeather(data.environment.weatherRisk));
    // 6. 保护时长（超30分钟风险渐增）
    factors.push(this.assessDuration(data.protectionDuration));
    // 7. 异常静止
    factors.push(this.assessStillness(data.recentMotion));

    // 加权计算综合分
    let totalScore = 0;
    let totalWeight = 0;
    for (const f of factors) {
      totalScore += f.score * f.weight;
      totalWeight += f.weight;
    }
    const score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

    // 确定风险等级
    let riskLevel: RiskLevel = 'safe';
    if (score >= 70) riskLevel = 'critical';
    else if (score >= 50) riskLevel = 'danger';
    else if (score >= 25) riskLevel = 'watch';

    // 生成原因和建议
    const triggeredFactors = factors.filter(f => f.triggered);
    const reason = triggeredFactors.length > 0
      ? triggeredFactors.map(f => f.detail).join('；')
      : '综合评估正常';

    const suggestion = this.getSuggestion(riskLevel, triggeredFactors);

    // 环境摘要
    const envSummary = this.getEnvSummary();

    const result: AutoSOSResult = {
      riskLevel,
      score,
      factors,
      shouldTriggerSOS: score >= SOS_TRIGGER_THRESHOLD && (Date.now() - this.lastTriggerTime > COOLDOWN_MS),
      reason,
      suggestion,
      detectedAt: new Date().toISOString(),
      envSummary,
    };

    // 触发自动 SOS
    if (result.shouldTriggerSOS && this.callback) {
      this.lastTriggerTime = Date.now();
      console.warn('[AutoSOS] AUTO TRIGGER! Score:', score, 'Reason:', reason);
      this.callback(result);
    }

    return result;
  }

  /** 摔倒检测：冲击峰值 + 冲击后静止 */
  private assessFall(motion: MotionSnapshot[]): RiskFactor {
    if (!this._motionEnabled || motion.length < 2) {
      return { name: '摔倒检测', score: 0, weight: WEIGHTS.fall, triggered: false, detail: '传感器不可用' };
    }

    const recent = motion.slice(-10);
    let maxImpact = 0;
    let hasPostStill = false;

    for (let i = 0; i < recent.length; i++) {
      if (recent[i].peakImpact > maxImpact) {
        maxImpact = recent[i].peakImpact;
        // 检查后续是否有静止
        for (let j = i + 1; j < recent.length && j <= i + 3; j++) {
          if (recent[j].postImpactStill) {
            hasPostStill = true;
            break;
          }
        }
      }
    }

    let score = 0;
    let triggered = false;
    let detail = '';

    if (maxImpact >= 3.5 && hasPostStill) {
      score = 100;
      triggered = true;
      detail = `检测到强烈冲击(${maxImpact.toFixed(1)}g)后身体静止，疑似严重摔倒`;
    } else if (maxImpact >= 2.8 && hasPostStill) {
      score = 85;
      triggered = true;
      detail = `检测到冲击(${maxImpact.toFixed(1)}g)后身体静止，疑似摔倒`;
    } else if (maxImpact >= 2.8) {
      score = 40;
      detail = `检测到冲击(${maxImpact.toFixed(1)}g)，但身体仍在活动`;
    } else if (maxImpact >= 2.0) {
      score = 15;
      detail = `轻微震动(${maxImpact.toFixed(1)}g)`;
    } else {
      detail = '无冲击检测';
    }

    return { name: '摔倒检测', score, weight: WEIGHTS.fall, triggered, detail };
  }


  /** 语音求救检测 */
  private assessVoice(): RiskFactor {
    const result = voiceDetector.getLatest();

    if (!result.speechRecognitionAvailable && !result.audioAnalysisAvailable) {
      return { name: '语音求救', score: 0, weight: WEIGHTS.voice, triggered: false, detail: '语音检测不可用' };
    }

    let detail = '';
    let score = 0;
    let triggered = false;

    if (result.detected) {
      score = result.score;
      triggered = true;
      detail = result.detail;
    } else if (result.screamScore > 30) {
      score = result.screamScore * 0.5;
      detail = `音量偏高（分${Math.round(score)}），持续关注`;
    } else {
      const capabilities: string[] = [];
      if (result.speechRecognitionAvailable) capabilities.push('关键词识别');
      if (result.audioAnalysisAvailable) capabilities.push('音量监测');
      detail = `${capabilities.join('+')}运行中，未检测到异常`;
    }

    return { name: '语音求救', score, weight: WEIGHTS.voice, triggered, detail };
  }

  /** 运动异常：突然剧烈运动 */
  private assessMotionAnomaly(motion: MotionSnapshot[]): RiskFactor {
    if (!this._motionEnabled || motion.length < 10) {
      return { name: '运动异常', score: 0, weight: WEIGHTS.motionAnomaly, triggered: false, detail: '数据不足' };
    }

    const recent = motion.slice(-15);
    // 检测：前半段低强度 → 后半段高强度（突然剧烈运动）
    const mid = Math.floor(recent.length / 2);
    const firstHalf = recent.slice(0, mid);
    const secondHalf = recent.slice(mid);

    const avgFirst = firstHalf.reduce((a, s) => a + s.stdMagnitude, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, s) => a + s.stdMagnitude, 0) / secondHalf.length;

    let score = 0;
    let triggered = false;
    let detail = '';

    // 检测持续高强度运动（可能被追赶）
    const highIntensityCount = recent.filter(s => s.intensity === 'high').length;
    const highRatio = highIntensityCount / recent.length;

    if (highRatio > 0.6 && avgSecond - avgFirst > 2) {
      score = 80;
      triggered = true;
      detail = `检测到突然剧烈运动（${Math.round(highRatio * 100)}%时间高强度），可能正在被追赶`;
    } else if (highRatio > 0.4) {
      score = 50;
      detail = `持续高强度运动（${Math.round(highRatio * 100)}%时间）`;
    } else if (avgSecond - avgFirst > 3) {
      score = 40;
      detail = '运动强度突然增大';
    } else {
      detail = '运动正常';
    }

    return { name: '运动异常', score, weight: WEIGHTS.motionAnomaly, triggered, detail };
  }

  /** 时间风险评估 */
  private assessTime(hour: number): RiskFactor {
    let score = 0;
    let detail = '';

    if (hour >= 0 && hour < 5) {
      score = 80;
      detail = `凌晨${hour}点，独处风险极高`;
    } else if (hour >= 5 && hour < 7) {
      score = 50;
      detail = `清晨${hour}点，天色较暗`;
    } else if (hour >= 22 || hour === 23) {
      score = 60;
      detail = `夜间${hour}点，风险较高`;
    } else if (hour >= 18 && hour < 22) {
      score = 30;
      detail = `傍晚${hour}点`;
    } else {
      score = 10;
      detail = `白天${hour}点，风险较低`;
    }

    return { name: '时间风险', score, weight: WEIGHTS.time, triggered: score >= 50, detail };
  }

  /** 天气风险评估 */
  private assessWeather(weatherRisk: number): RiskFactor {
    const score = Math.round(weatherRisk * 100);
    const triggered = score >= 50;
    let detail = '';

    if (score >= 70) detail = '极端恶劣天气，户外风险极高';
    else if (score >= 50) detail = '天气不佳，增加户外风险';
    else if (score >= 30) detail = '天气一般';
    else detail = '天气良好';

    return { name: '天气风险', score, weight: WEIGHTS.weather, triggered, detail };
  }

  /** 保护时长评估 */
  private assessDuration(durationSec: number): RiskFactor {
    const min = durationSec / 60;
    let score = 0;
    let detail = '';

    if (min >= 60) {
      score = 70;
      detail = `已持续保护${Math.round(min)}分钟，长时间独处风险增加`;
    } else if (min >= 30) {
      score = 40;
      detail = `已保护${Math.round(min)}分钟`;
    } else {
      score = 10;
      detail = `保护刚开始${Math.round(min)}分钟`;
    }

    return { name: '保护时长', score, weight: WEIGHTS.duration, triggered: score >= 50, detail };
  }

  /** 异常静止检测 */
  private assessStillness(motion: MotionSnapshot[]): RiskFactor {
    if (!this._motionEnabled || motion.length < 10) {
      return { name: '异常静止', score: 0, weight: WEIGHTS.stillness, triggered: false, detail: '数据不足' };
    }

    const recent = motion.slice(-15);
    const stillCount = recent.filter(s => s.intensity === 'still').length;
    const stillRatio = stillCount / recent.length;

    let score = 0;
    let triggered = false;
    let detail = '';

    if (stillRatio >= 0.9) {
      score = 60;
      triggered = true;
      detail = `身体长时间静止(${Math.round(stillRatio * 100)}%)，可能已失去行动能力`;
    } else if (stillRatio >= 0.7) {
      score = 30;
      detail = `大部分时间静止(${Math.round(stillRatio * 100)}%)`;
    } else {
      detail = '有正常活动';
    }

    return { name: '异常静止', score, weight: WEIGHTS.stillness, triggered, detail };
  }

  private getSuggestion(level: RiskLevel, factors: RiskFactor[]): string {
    const fall = factors.find(f => f.name === '摔倒检测');
    if (fall?.triggered && fall.score >= 85) {
      return 'AI 检测到疑似摔倒，已自动发送求助信号';
    }
    if (level === 'critical') {
      return 'AI 检测到高危情况，已自动触发紧急求助';
    }
    if (level === 'danger') {
      return 'AI 检测到风险升高，请保持警惕';
    }
    if (level === 'watch') {
      return 'AI 正在持续监测中';
    }
    return 'AI 监测：当前环境安全';
  }
}

// 单例
export const autoSOSAssessor = new AutoSOSAssessor();