/**
 * 传感器数据采集服务
 *
 * 采集加速度计（替代脉搏）、GPS、时间、天气等多维度数据
 * 为 AI 自动 SOS 判定提供实时数据源
 */

// ============================================
// 类型定义
// ============================================

/** 单次加速度采样 */
export interface AccelerationSample {
  timestamp: number;
  x: number;
  y: number;
  z: number;
  magnitude: number;  // 合加速度（g）
}

/** 运动状态快照（每秒计算一次） */
export interface MotionSnapshot {
  timestamp: number;
  /** 合加速度均值（g） */
  avgMagnitude: number;
  /** 合加速度标准差 — 反映运动强度 */
  stdMagnitude: number;
  /** 运动强度等级 */
  intensity: 'still' | 'low' | 'moderate' | 'high';
  /** 是否检测到冲击峰值（可能摔倒） */
  impactDetected: boolean;
  /** 冲击峰值（g） */
  peakImpact: number;
  /** 冲击后是否静止（摔倒确认） */
  postImpactStill: boolean;
}

/** 环境上下文（定时刷新） */
export interface EnvironmentContext {
  timestamp: number;
  /** 当前小时 0-23 */
  hour: number;
  /** 时间风险等级 0-1（凌晨更高） */
  timeRisk: number;
  /** 天气状况 */
  weather: {
    text: string;       // '晴' '小雨' 等
    temp: number;       // 温度
    humidity: number;   // 湿度
    icon: string;       // 天气图标
  };
  /** 天气风险等级 0-1 */
  weatherRisk: number;
  /** GPS 位置 */
  location: {
    lat: number;
    lng: number;
    address: string;
    accuracy: number;
  } | null;
}

/** 完整的 SOS 判定数据包 */
export interface SOSAssessmentData {
  /** 最近 N 秒的运动快照 */
  recentMotion: MotionSnapshot[];
  /** 当前环境上下文 */
  environment: EnvironmentContext;
  /** 保护模式已运行时长（秒） */
  protectionDuration: number;
}

/** 传感器监听器回调 */
export type MotionSnapshotCallback = (snapshot: MotionSnapshot) => void;

// ============================================
// 配置
// ============================================

const CONFIG = {
  /** 采样间隔 ms */
  SAMPLE_INTERVAL: 100,
  /** 快照计算窗口 ms（1秒内的采样用于计算统计量） */
  SNAPSHOT_WINDOW: 1000,
  /** 冲击检测阈值（g） */
  IMPACT_THRESHOLD: 2.8,
  /** 冲击后静止检测窗口 ms */
  POST_IMPACT_WINDOW: 3000,
  /** 静止判定阈值（标准差 < 此值视为静止） */
  STILL_THRESHOLD: 0.4,
  /** 运动强度分级 */
  INTENSITY: {
    still: 0.5,
    low: 2.0,
    moderate: 5.0,
    // > 5.0 = high
  },
  /** 环境上下文刷新间隔 ms */
  ENV_REFRESH_INTERVAL: 60000, // 1分钟
  /** 保留最近 N 个快照用于判定 */
  MAX_SNAPSHOTS: 30,
  /** 天气缓存有效期 ms */
  WEATHER_CACHE_TTL: 30 * 60 * 1000,
};

// ============================================
// 传感器监控器
// ============================================

class SensorMonitor {
  private samples: AccelerationSample[] = [];
  private snapshots: MotionSnapshot[] = [];
  private listeners: Set<MotionSnapshotCallback> = new Set();
  private envContext: EnvironmentContext | null = null;
  private envTimer: ReturnType<typeof setInterval> | null = null;
  private sampleTimer: ReturnType<typeof setInterval> | null = null;
  private snapshotTimer: ReturnType<typeof setInterval> | null = null;
  private weatherCache: { data: EnvironmentContext['weather']; risk: number; fetchedAt: number } | null = null;
  private currentGps: { lat: number; lng: number; address: string; accuracy: number } | null = null;
  private _running = false;

  get running() { return this._running; }

  /** 获取最近快照 */
  getSnapshots(): MotionSnapshot[] {
    return this.snapshots;
  }

  /** 获取环境上下文 */
  getEnvironment(): EnvironmentContext | null {
    return this.envContext;
  }

  /** 更新 GPS 位置（由外部 GPS 定时回调写入） */
  updateGps(lat: number, lng: number, address: string, accuracy: number) {
    this.currentGps = { lat, lng, address, accuracy };
  }

  /** 启动传感器采集 */
  async start(): Promise<boolean> {
    if (this._running) return true;
    this.samples = [];
    this.snapshots = [];
    this.weatherCache = null;

    // 1. 启动加速度计
    const motionOk = await this.startMotion();
    if (!motionOk) {
      console.warn('[SensorMonitor] 加速度计不可用，仅使用 GPS + 时间 + 天气判定');
    }

    // 2. 定时计算运动快照
    this.snapshotTimer = setInterval(() => this.computeSnapshot(), CONFIG.SNAPSHOT_WINDOW);

    // 3. 首次获取环境上下文
    await this.refreshEnvironment();

    // 4. 定时刷新环境
    this.envTimer = setInterval(() => this.refreshEnvironment(), CONFIG.ENV_REFRESH_INTERVAL);

    this._running = true;
    console.log('[SensorMonitor] Started', motionOk ? 'with motion' : 'without motion');
    return true;
  }

  /** 停止采集 */
  stop() {
    this._running = false;
    if (this.sampleTimer) { clearInterval(this.sampleTimer); this.sampleTimer = null; }
    if (this.snapshotTimer) { clearInterval(this.snapshotTimer); this.snapshotTimer = null; }
    if (this.envTimer) { clearInterval(this.envTimer); this.envTimer = null; }

    // 移除加速度计监听
    if (typeof window !== 'undefined') {
      window.removeEventListener('devicemotion', this.onDeviceMotion);
    }

    this.samples = [];
    console.log('[SensorMonitor] Stopped');
  }

  /** 注册运动快照监听 */
  onSnapshot(cb: MotionSnapshotCallback) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** 获取完整的 SOS 评估数据 */
  getAssessmentData(protectionDuration: number): SOSAssessmentData {
    return {
      recentMotion: this.snapshots.slice(-CONFIG.MAX_SNAPSHOTS),
      environment: this.envContext || this.createFallbackEnv(),
      protectionDuration,
    };
  }

  // ---- 私有方法 ----

  private onDeviceMotion = (e: DeviceMotionEvent) => {
    const acc = e.accelerationIncludingGravity;
    if (!acc || acc.x == null || acc.y == null || acc.z == null) return;
    const x = acc.x / 9.8;
    const y = acc.y / 9.8;
    const z = acc.z / 9.8;
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    this.samples.push({ timestamp: Date.now(), x, y, z, magnitude });
  };

  private async startMotion(): Promise<boolean> {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return false;

    try {
      // iOS 13+ 需要用户授权
      const DME = DeviceMotionEvent as any;
      if (typeof DME.requestPermission === 'function') {
        const state = await DME.requestPermission();
        if (state !== 'granted') return false;
      }

      window.addEventListener('devicemotion', this.onDeviceMotion);

      // 验证是否真的有数据（部分浏览器/模拟器返回空值）
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          const hasData = this.samples.length > 2;
          if (!hasData) {
            window.removeEventListener('devicemotion', this.onDeviceMotion);
          }
          resolve(hasData);
        }, 2000);
      });
    } catch {
      return false;
    }
  }

  private computeSnapshot() {
    const now = Date.now();
    const windowSamples = this.samples.filter(s => now - s.timestamp < CONFIG.SNAPSHOT_WINDOW * 2);

    if (windowSamples.length === 0) {
      // 无传感器数据时创建一个"未知"快照
      const snapshot: MotionSnapshot = {
        timestamp: now,
        avgMagnitude: 1.0,
        stdMagnitude: 0,
        intensity: 'still',
        impactDetected: false,
        peakImpact: 0,
        postImpactStill: false,
      };
      this.snapshots.push(snapshot);
      if (this.snapshots.length > CONFIG.MAX_SNAPSHOTS * 2) {
        this.snapshots = this.snapshots.slice(-CONFIG.MAX_SNAPSHOTS);
      }
      this.listeners.forEach(cb => cb(snapshot));
      return;
    }

    // 计算统计量
    const magnitudes = windowSamples.map(s => s.magnitude);
    const avg = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
    const variance = magnitudes.reduce((a, m) => a + (m - avg) ** 2, 0) / magnitudes.length;
    const std = Math.sqrt(variance);

    // 冲击检测
    let peakImpact = 0;
    for (const m of magnitudes) {
      if (m > peakImpact) peakImpact = m;
    }
    const impactDetected = peakImpact > CONFIG.IMPACT_THRESHOLD;

    // 冲击后静止检测
    let postImpactStill = false;
    if (impactDetected) {
      const impactTime = windowSamples.find(s => s.magnitude > CONFIG.IMPACT_THRESHOLD)?.timestamp || 0;
      const postSamples = windowSamples.filter(s => s.timestamp > impactTime && s.timestamp - impactTime < CONFIG.POST_IMPACT_WINDOW);
      if (postSamples.length > 3) {
        const postAvg = postSamples.reduce((a, s) => a + s.magnitude, 0) / postSamples.length;
        postImpactStill = Math.abs(postAvg - 1.0) < CONFIG.STILL_THRESHOLD; // 接近静止（1g = 重力）
      }
    }

    // 运动强度分级
    let intensity: MotionSnapshot['intensity'] = 'still';
    if (std > CONFIG.INTENSITY.moderate) intensity = 'high';
    else if (std > CONFIG.INTENSITY.low) intensity = 'moderate';
    else if (std > CONFIG.INTENSITY.still) intensity = 'low';

    const snapshot: MotionSnapshot = {
      timestamp: now,
      avgMagnitude: Math.round(avg * 100) / 100,
      stdMagnitude: Math.round(std * 100) / 100,
      intensity,
      impactDetected,
      peakImpact: Math.round(peakImpact * 100) / 100,
      postImpactStill,
    };

    this.snapshots.push(snapshot);
    if (this.snapshots.length > CONFIG.MAX_SNAPSHOTS * 2) {
      this.snapshots = this.snapshots.slice(-CONFIG.MAX_SNAPSHOTS);
    }

    this.listeners.forEach(cb => cb(snapshot));
  }

  private async refreshEnvironment() {
    const weather = await this.fetchWeather();
    const hour = new Date().getHours();
    const timeRisk = this.calcTimeRisk(hour);

    this.envContext = {
      timestamp: Date.now(),
      hour,
      timeRisk,
      weather: weather || { text: '未知', temp: 25, humidity: 50, icon: '🔄' },
      weatherRisk: this.calcWeatherRisk(weather),
      location: this.currentGps ? { ...this.currentGps } : null,
    };
  }

  private calcTimeRisk(hour: number): number {
    // 凌晨 0-5 点风险最高，白天 8-18 点最低
    if (hour >= 0 && hour < 5) return 0.8;
    if (hour >= 5 && hour < 7) return 0.5;
    if (hour >= 7 && hour < 18) return 0.1;
    if (hour >= 18 && hour < 21) return 0.3;
    return 0.6; // 21-24
  }

  private calcWeatherRisk(weather: EnvironmentContext['weather'] | null): number {
    if (!weather) return 0.3;
    const t = weather.text;
    if (t.includes('暴') || t.includes('雷') || t.includes('冰')) return 0.8;
    if (t.includes('大') && (t.includes('雨') || t.includes('雪'))) return 0.7;
    if (t.includes('雨') || t.includes('雪') || t.includes('雾') || t.includes('霾')) return 0.5;
    if (weather.temp < -5 || weather.temp > 38) return 0.5;
    if (weather.temp < 0 || weather.temp > 35) return 0.3;
    return 0.1;
  }

  private async fetchWeather(): Promise<EnvironmentContext['weather'] | null> {
    // 缓存有效则直接返回
    if (this.weatherCache && Date.now() - this.weatherCache.fetchedAt < CONFIG.WEATHER_CACHE_TTL) {
      return this.weatherCache.data;
    }

    if (!this.currentGps) return null;

    try {
      const resp = await fetch(
        `https://devapi.qweather.com/v7/weather/now?location=${this.currentGps.lng},${this.currentGps.lat}&key=${process.env.TARO_APP_QWEATHER_KEY || ''}`,
      );
      if (!resp.ok) return null;
      const json = await resp.json();
      if (json.code !== '200') return null;

      const now = json.now;
      const weather: EnvironmentContext['weather'] = {
        text: now.text,
        temp: parseInt(now.temp) || 25,
        humidity: parseInt(now.humidity) || 50,
        icon: this.weatherIcon(now.text),
      };
      const risk = this.calcWeatherRisk(weather);

      this.weatherCache = { data: weather, risk, fetchedAt: Date.now() };
      return weather;
    } catch {
      // 天气获取失败不影响核心功能
      return null;
    }
  }

  private weatherIcon(text: string): string {
    if (text.includes('晴')) return '☀️';
    if (text.includes('云') || text.includes('阴')) return '⛅';
    if (text.includes('雨')) return '🌧️';
    if (text.includes('雪')) return '❄️';
    if (text.includes('雾') || text.includes('霾')) return '🌫️';
    if (text.includes('雷')) return '⛈️';
    return '🔄';
  }

  private createFallbackEnv(): EnvironmentContext {
    const hour = new Date().getHours();
    return {
      timestamp: Date.now(),
      hour,
      timeRisk: this.calcTimeRisk(hour),
      weather: { text: '未知', temp: 25, humidity: 50, icon: '🔄' },
      weatherRisk: 0.3,
      location: this.currentGps ? { ...this.currentGps } : null,
    };
  }
}

// 单例
export const sensorMonitor = new SensorMonitor();