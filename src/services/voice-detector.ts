/**
 * 语音求救检测服务
 *
 * 两层检测：
 * 1. 尖叫/大喊检测（Web Audio API）— 分析音量突变，所有浏览器可用
 * 2. 语音关键词识别（Web Speech API）— 识别"救命"等关键词，仅 Chrome
 *
 * 为 AI 自动 SOS 提供第 7 个判定维度
 */

// ============================================
// 类型定义
// ============================================

export interface VoiceDetectionResult {
  /** 是否检测到求救语音 */
  detected: boolean;
  /** 识别到的关键词（语音识别层） */
  keywords: string[];
  /** 音量突变分 0-100（尖叫检测层） */
  screamScore: number;
  /** 综合语音风险分 0-100 */
  score: number;
  /** 详细描述 */
  detail: string;
  /** 是否有语音识别能力 */
  speechRecognitionAvailable: boolean;
  /** 是否有音频分析能力 */
  audioAnalysisAvailable: boolean;
}

export type VoiceDetectionCallback = (result: VoiceDetectionResult) => void;

// ============================================
// 配置
// ============================================

const CONFIG = {
  /** 求救关键词 */
  SOS_KEYWORDS: ['救命', '帮帮我', '救我', '报警', '求助', '放开我', '别过来', '出事了', '我被讹', '打人了', '抢劫', '坏人'],
  /** 音量分析窗口 ms */
  VOLUME_WINDOW: 3000,
  /** 尖叫判定阈值 — 当前音量超过均值的倍数 */
  SCREAM_MULTIPLIER: 3.5,
  /** 尖叫最低绝对阈值（分贝） */
  SCREAM_MIN_DB: -15,
  /** 音量采样间隔 ms */
  SAMPLE_INTERVAL: 100,
  /** 语音识别语言 */
  SPEECH_LANG: 'zh-CN',
  /** 语音识别最大重启次数（Chrome 会自动停止） */
  MAX_RESTARTS: 50,
  /** 语音识别重启间隔 ms */
  RESTART_DELAY: 300,
};

// ============================================
// 语音求救检测器
// ============================================

class VoiceDetector {
  private listeners: Set<VoiceDetectionCallback> = new Set();
  private volumeHistory: Array<{ timestamp: number; db: number }> = [];
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private recognition: any = null;
  private speechAvailable = false;
  private audioAvailable = false;
  private _running = false;
  private _restartCount = 0;
  private _latestTranscript = '';
  private _transcriptKeywords: string[] = [];
  private _currentScreamScore = 0;

  get running() { return this._running; }
  get isSpeechAvailable() { return this.speechAvailable; }
  get isAudioAvailable() { return this.audioAvailable; }

  /** 注册结果监听 */
  onDetect(cb: VoiceDetectionCallback) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** 获取最新检测结果 */
  getLatest(): VoiceDetectionResult {
    const keywordScore = this._transcriptKeywords.length > 0 ? Math.min(100, this._transcriptKeywords.length * 35) : 0;
    const combinedScore = Math.min(100, Math.max(keywordScore, this._currentScreamScore));

    let detail = '';
    if (this._transcriptKeywords.length > 0) {
      detail = `识别到求救关键词：「${this._transcriptKeywords.join('」「')}」`;
      if (this._currentScreamScore > 50) detail += '，伴随大声呼喊';
    } else if (this._currentScreamScore > 50) {
      detail = `检测到异常大声呼喊（音量突变分${this._currentScreamScore}）`;
    } else {
      detail = '语音环境正常';
    }

    return {
      detected: combinedScore >= 60,
      keywords: [...this._transcriptKeywords],
      screamScore: this._currentScreamScore,
      score: combinedScore,
      detail,
      speechRecognitionAvailable: this.speechAvailable,
      audioAnalysisAvailable: this.audioAvailable,
    };
  }

  /** 启动语音检测 */
  async start(existingStream?: MediaStream): Promise<void> {
    if (this._running) return;
    this._running = true;
    this._latestTranscript = '';
    this._transcriptKeywords = [];
    this._currentScreamScore = 0;
    this.volumeHistory = [];
    this._restartCount = 0;

    // 1. 启动音量分析（使用保护模式已有的录音 stream，避免重复请求权限）
    this.audioAvailable = await this.startAudioAnalysis(existingStream);

    // 2. 启动语音关键词识别
    this.speechAvailable = this.startSpeechRecognition();

    // 3. 定时分析音量模式
    this.sampleTimer = setInterval(() => this.analyzeVolumePattern(), 1000);

    console.log(`[VoiceDetector] Started — speech: ${this.speechAvailable}, audio: ${this.audioAvailable}`);
  }

  /** 停止检测 */
  stop() {
    this._running = false;

    if (this.sampleTimer) { clearInterval(this.sampleTimer); this.sampleTimer = null; }
    if (this.audioContext) { this.audioContext.close().catch(() => {}); this.audioContext = null; this.analyser = null; }
    if (this.recognition) { try { this.recognition.stop(); } catch {} this.recognition = null; }
    // 不关闭 mediaStream（由保护模式管理）

    this.volumeHistory = [];
    console.log('[VoiceDetector] Stopped');
  }

  /** 重置关键词检测（每 30 秒清除一次，避免旧关键词持续影响评分） */
  resetKeywords() {
    this._transcriptKeywords = [];
    this._currentScreamScore = 0;
  }

  // ---- 私有方法 ----

  /** 启动 Web Audio 音量分析 */
  private async startAudioAnalysis(existingStream?: MediaStream): Promise<boolean> {
    try {
      if (typeof AudioContext === 'undefined') return false;

      const stream = existingStream || await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaStream = stream;

      this.audioContext = new AudioContext();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;

      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      // 定时采样音量
      const sampleVolume = () => {
        if (!this._running || !this.analyser) return;
        const data = new Float32Array(this.analyser.fftSize);
        this.analyser.getFloatTimeDomainData(data);

        // 计算 RMS 音量（分贝）
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
        const rms = Math.sqrt(sum / data.length);
        const db = rms > 0 ? 20 * Math.log10(rms) : -100;

        this.volumeHistory.push({ timestamp: Date.now(), db });
        // 只保留最近 10 秒
        const cutoff = Date.now() - 10000;
        this.volumeHistory = this.volumeHistory.filter(v => v.timestamp > cutoff);
      };

      this.sampleTimer = setInterval(sampleVolume, CONFIG.SAMPLE_INTERVAL);
      return true;
    } catch {
      return false;
    }
  }

  /** 启动 Web Speech 语音关键词识别 */
  private startSpeechRecognition(): boolean {
    // #ifdef H5
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return false;

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = CONFIG.SPEECH_LANG;
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        this._latestTranscript = fullTranscript;

        // 检测求救关键词
        const found: string[] = [];
        for (const keyword of CONFIG.SOS_KEYWORDS) {
          if (fullTranscript.includes(keyword) && !this._transcriptKeywords.includes(keyword)) {
            found.push(keyword);
          }
        }
        if (found.length > 0) {
          this._transcriptKeywords.push(...found);
          console.warn('[VoiceDetector] SOS keywords detected:', found);
          this.notifyListeners();
        }
      };

      this.recognition.onend = () => {
        // Chrome 会自动停止，需要重启
        if (this._running && this._restartCount < CONFIG.MAX_RESTARTS) {
          this._restartCount++;
          setTimeout(() => {
            try { this.recognition?.start(); } catch {}
          }, CONFIG.RESTART_DELAY);
        }
      };

      this.recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech' && e.error !== 'aborted') {
          console.warn('[VoiceDetector] Speech error:', e.error);
        }
      };

      this.recognition.start();
      return true;
    } catch {
      return false;
    }
    // #endif
  }

  /** 分析音量模式 — 检测尖叫/大喊 */
  private analyzeVolumePattern() {
    if (this.volumeHistory.length < 10) return;

    const now = Date.now();
    const windowSamples = this.volumeHistory.filter(v => now - v.timestamp < CONFIG.VOLUME_WINDOW);
    if (windowSamples.length < 5) return;

    // 计算基线音量（排除可能的尖峰值后的均值）
    const sorted = [...windowSamples].map(v => v.db).sort((a, b) => a - b);
    const baseline = sorted[Math.floor(sorted.length * 0.5)] || -40;

    // 找窗口内的峰值
    let peakDb = -100;
    for (const v of windowSamples) {
      if (v.db > peakDb) peakDb = v.db;
    }

    // 尖叫评分：峰值远超基线 + 绝对音量够大
    const ratio = baseline > -60 ? (peakDb - baseline) : 0;
    let screamScore = 0;

    if (ratio > 25 && peakDb > CONFIG.SCREAM_MIN_DB) {
      screamScore = 100; // 极度尖叫
    } else if (ratio > 20 && peakDb > CONFIG.SCREAM_MIN_DB) {
      screamScore = 85;  // 大声呼喊
    } else if (ratio > 15 && peakDb > -20) {
      screamScore = 60;  // 明显大声
    } else if (ratio > 10 && peakDb > -25) {
      screamScore = 30;  // 偏大声
    }

    this._currentScreamScore = screamScore;

    if (screamScore >= 60) {
      console.warn(`[VoiceDetector] Scream detected! peak=${peakDb.toFixed(1)}dB baseline=${baseline.toFixed(1)}dB score=${screamScore}`);
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    const result = this.getLatest();
    this.listeners.forEach(cb => cb(result));
  }
}

// 单例
export const voiceDetector = new VoiceDetector();