import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEvidenceHistoryStore, EvidenceRecord, EvidenceFile, createVideoBlobUrl } from '@/store/evidence-history';
import styles from './index.module.scss';

/** GPS 轨迹地图组件 — 纯 Canvas 绘制，无外部依赖 */
const GpsTrailMap: React.FC<{ points: Array<{ lat: number; lng: number; accuracy: number; time: string }> }> = ({ points }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 340, h = 200;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    // 计算 bounds
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of points) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }
    const pad = 0.0003;
    minLat -= pad; maxLat += pad; minLng -= pad; maxLng += pad;
    const latRange = maxLat - minLat || 0.001;
    const lngRange = maxLng - minLng || 0.001;

    const toX = (lng: number) => ((lng - minLng) / lngRange) * (w - 40) + 20;
    const toY = (lat: number) => h - (((lat - minLat) / latRange) * (h - 40) + 20);

    // 背景
    ctx.fillStyle = '#F5F0EA';
    ctx.fillRect(0, 0, w, h);

    // 网格
    ctx.strokeStyle = '#E5DDD0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
      const x = 20 + (w - 40) * i / 4;
      const y = 20 + (h - 40) * i / 4;
      ctx.beginPath(); ctx.moveTo(x, 20); ctx.lineTo(x, h - 20); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(w - 20, y); ctx.stroke();
    }

    // 轨迹线
    ctx.strokeStyle = '#C4956A';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(toX(points[0].lng), toY(points[0].lat));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(toX(points[i].lng), toY(points[i].lat));
    }
    ctx.stroke();

    // 半透明轨迹带
    ctx.strokeStyle = 'rgba(196, 149, 106, 0.2)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(toX(points[0].lng), toY(points[0].lat));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(toX(points[i].lng), toY(points[i].lat));
    }
    ctx.stroke();

    // 起点标记
    const sx = toX(points[0].lng), sy = toY(points[0].lat);
    ctx.fillStyle = '#22C55E';
    ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('S', sx, sy + 0.5);

    // 终点标记
    const ex = toX(points[points.length - 1].lng), ey = toY(points[points.length - 1].lat);
    ctx.fillStyle = '#EF4444';
    ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('E', ex, ey + 0.5);

  }, [points]);

  return <canvas ref={canvasRef} style={{ display: 'block', borderRadius: '8px' }} />;
};

// 媒体文件有效性判断 — 小于 10KB 的视频/音频一定是损坏的
const MIN_MEDIA_SIZE = 10 * 1024;
const isMediaValid = (f: EvidenceFile) => (f.size || 0) > MIN_MEDIA_SIZE;

const EvidenceHistoryPage: React.FC = () => {
  const { records, loadFromStorage, removeRecord } = useEvidenceHistoryStore();
  const isPickMode = Taro.getCurrentInstance().router?.params?.mode === 'pick';

  useEffect(() => {
    loadFromStorage();
    return () => { releaseObjectUrl(); };
  }, []);

  // 播放器 state
  const [playerOpen, setPlayerOpen] = useState<{
    type: 'video' | 'audio';
    src: string;
    label: string;
  } | null>(null);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const releaseObjectUrl = () => {
    if (objectUrlRef.current) {
      try { URL.revokeObjectURL(objectUrlRef.current); } catch {}
      objectUrlRef.current = null;
    }
  };

  // 播放视频 — 异步转换，失败则降级为原始 dataUrl
  const playVideo = async (file: EvidenceFile) => {
    if (!file?.dataUrl) { Taro.showToast({ title: '视频数据不可用', icon: 'none' }); return; }
    Taro.showToast({ title: '正在解码视频…', icon: 'loading', duration: 0 });
    setPlayerLoading(true);

    let src: string | null = null;
    try {
      src = await createVideoBlobUrl(file.dataUrl);
    } catch (e) {
      console.warn('[playVideo] createVideoBlobUrl error:', e);
    }

    // 降级：blob URL 创建失败时，直接用原始 dataUrl（小视频可能可以）
    if (!src && file.dataUrl.startsWith('data:')) {
      src = file.dataUrl;
      console.log('[playVideo] fallback to raw dataUrl');
    }

    Taro.hideToast();
    setPlayerLoading(false);

    if (!src) {
      Taro.showToast({ title: '视频解码失败，文件可能过大', icon: 'none', duration: 2000 });
      return;
    }

    releaseObjectUrl();
    objectUrlRef.current = src;
    setPlayerOpen({ type: 'video', src, label: file.mimeType?.includes('mp4') ? 'MP4视频' : 'WebM视频' });
  };

  // 播放音频
  const playAudio = async (file: EvidenceFile) => {
    if (!file?.dataUrl) { Taro.showToast({ title: '音频数据不可用', icon: 'none' }); return; }
    setPlayerLoading(true);
    const src = await createVideoBlobUrl(file.dataUrl);
    if (!src) {
      setPlayerLoading(false);
      Taro.showToast({ title: '音频加载失败', icon: 'none' });
      return;
    }
    releaseObjectUrl();
    objectUrlRef.current = src;
    setPlayerLoading(false);
    setPlayerOpen({ type: 'audio', src, label: '录音' });
  };

  const closePlayer = () => {
    try { videoRef.current?.pause(); } catch {}
    try { audioRef.current?.pause(); } catch {}
    releaseObjectUrl();
    setPlayerOpen(null);
    setPlayerLoading(false);
  };

  // 通用下载方法：优先 <a download>，降级用 blob + window.open
  const downloadBlob = (url: string, filename: string) => {
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => document.body.removeChild(a), 300);
    } catch {
      // OPPO/部分浏览器 <a download> 不生效，用 window.open 兜底
      try { window.open(url, '_blank'); } catch {}
    }
  };

  // 视频加载失败 — 提供下载选项
  const onVideoError = () => {
    Taro.showModal({
      title: '无法播放',
      content: '当前浏览器不支持此视频格式，可以下载后用本地播放器打开',
      confirmText: '下载视频',
      cancelText: '关闭',
      success: ({ confirm }) => {
        if (confirm && playerOpen?.src) {
          downloadBlob(playerOpen.src, `善行保护_${new Date().toLocaleDateString('zh-CN')}.webm`);
        }
      },
    });
  };

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '删除确认',
      content: '确定删除这条历史记录？删除后不可恢复。',
      success: (res) => { if (res.confirm) { removeRecord(id); } },
    });
  };

  const handleUseInRecord = (record: EvidenceRecord) => {
    const params = Taro.getCurrentInstance().router?.params;
    if (params?.mode === 'pick') {
      // 选择模式：通过全局事件回传
      const event = new CustomEvent('evidencePick', { detail: record });
      window.dispatchEvent(event);
      Taro.navigateBack();
    } else {
      Taro.navigateTo({ url: `/pages/record/index?from=history&historyId=${record.id}` });
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}分${s}秒` : `${s}秒`;
  };

  /** 格式化日期为中文：2026年3月15日 */
  const formatDateCN = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  /** 格式化时长：h小时mm分 或 mm分ss秒 */
  const formatDurationFull = (seconds: number) => {
    if (seconds <= 0) return '0秒';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}小时${m}分`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  };

  const sourceLabel = (r: EvidenceRecord) =>
    r.source === 'protection' ? '善行保护' : '善行见证';

  const sourceEmoji = (r: EvidenceRecord) =>
    r.source === 'protection' ? '🛡️' : '👁️';

  /** 可信度星级 */
  const trustStars = (level?: string) => {
    if (level === 'high') return '★★★★★';
    if (level === 'medium') return '★★★☆☆';
    return '★★☆☆☆';
  };

  const trustLabel = (level?: string) => {
    if (level === 'high') return '高';
    if (level === 'medium') return '中';
    return '低';
  };

  const safeRecords = Array.isArray(records) ? records : [];

  // ===== 汇总统计 =====
  const summary = useMemo(() => {
    let totalVideoCount = 0;
    let totalAudioCount = 0;
    let totalPhotoCount = 0;
    let totalVideoDuration = 0;
    let totalAudioDuration = 0;
    let totalGpsPoints = 0;

    safeRecords.forEach((r) => {
      totalVideoCount += r.files?.filter(f => f.type === 'video').length || 0;
      totalAudioCount += r.files?.filter(f => f.type === 'audio').length || 0;
      totalPhotoCount += r.files?.filter(f => f.type === 'photo').length || 0;
      if (r.evidenceStats) {
        totalVideoDuration += r.evidenceStats.videoDuration || 0;
        totalAudioDuration += r.evidenceStats.audioDuration || 0;
        totalGpsPoints += r.evidenceStats.gpsPoints || 0;
      }
    });

    return {
      totalRecords: safeRecords.length,
      totalVideoCount,
      totalAudioCount,
      totalPhotoCount,
      totalVideoDuration,
      totalAudioDuration,
      totalGpsPoints,
    };
  }, [safeRecords]);

  // ===== 空状态 =====
  if (safeRecords.length === 0) {
    return (
      <View className={styles.page}>
        <View className={styles.empty}>
          <View className={styles.emptyIllustration}>
            <Text className={styles.emptyIconLarge}>📋</Text>
            <View className={styles.emptyBadge}>
              <Text className={styles.emptyBadgeText}>0</Text>
            </View>
          </View>
          <Text className={styles.emptyTitle}>暂无善行档案</Text>
          <Text className={styles.emptyDesc}>开始一次善行保护或见证吧</Text>
          <View className={styles.emptyHint}>
            <Text className={styles.emptyHintItem}>🛡️ 善行保护 — 录制保护过程中的证据</Text>
            <Text className={styles.emptyHintItem}>👁️ 善行见证 — 录制见证过程中的证据</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      {/* ===== 视频播放器 ===== */}
      {playerOpen?.type === 'video' && (
        <View className={styles.playerOverlay} onClick={closePlayer}>
          <View className={styles.playerCard} onClick={(e) => e.stopPropagation()}>
            <View className={styles.playerTop}>
              <Text className={styles.playerTitle}>▶ 视频播放</Text>
              <Text className={styles.playerCloseBtn} onClick={closePlayer}>✕</Text>
            </View>
            {playerLoading && (
              <View className={styles.playerLoading}>
                <Text className={styles.playerLoadingText}>视频加载中，请稍候…</Text>
              </View>
            )}
            <video
              key={playerOpen.src.substring(0, 30)}
              ref={(el) => { videoRef.current = el; }}
              src={playerOpen.src}
              controls
                autoPlay
                playsInline
                muted
                onError={onVideoError}
              className={styles.videoPlayer}
              style={{ width: '100%', display: 'block', maxHeight: '70vh', background: '#000' }}
              preload="auto"
            />
          </View>
        </View>
      )}

      {/* ===== 音频播放器 ===== */}
      {playerOpen?.type === 'audio' && (
        <View className={styles.playerOverlay} onClick={closePlayer}>
          <View className={styles.audioCard} onClick={(e) => e.stopPropagation()}>
            <View className={styles.playerTop}>
              <Text className={styles.playerTitle}>🎵 播放录音</Text>
              <Text className={styles.playerCloseBtn} onClick={closePlayer}>✕</Text>
            </View>
            <audio
              ref={(el) => { audioRef.current = el; }}
              src={playerOpen.src}
              controls
              autoPlay
              style={{ width: '100%', marginTop: '20px' }}
            />
          </View>
        </View>
      )}

      {/* ===== 汇总统计栏 ===== */}
      <View className={styles.summaryBar}>
        <View className={styles.summaryInner}>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{summary.totalRecords}</Text>
            <Text className={styles.summaryLabel}>总记录</Text>
          </View>
          <View className={styles.summaryDivider} />
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{formatDurationFull(summary.totalVideoDuration)}</Text>
            <Text className={styles.summaryLabel}>录像时长</Text>
          </View>
          <View className={styles.summaryDivider} />
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{summary.totalVideoCount}</Text>
            <Text className={styles.summaryLabel}>视频</Text>
          </View>
          <View className={styles.summaryDivider} />
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{summary.totalAudioCount}</Text>
            <Text className={styles.summaryLabel}>音频</Text>
          </View>
        </View>
      </View>

      <ScrollView className={styles.list} scrollY>
        {/* ===== 时间线 ===== */}
        <View className={styles.timeline}>
          {safeRecords.map((record, idx) => {
            const videos = record.files?.filter(f => f.type === 'video') || [];
            const audios = record.files?.filter(f => f.type === 'audio') || [];
            const photos = record.files?.filter(f => f.type === 'photo') || [];
            const validVideos = videos.filter(isMediaValid);
            const validAudios = audios.filter(isMediaValid);
            const hasMedia = validVideos.length > 0 || validAudios.length > 0 || photos.length > 0;
            const isProtection = record.source === 'protection';

            return (
              <View key={record.id} className={styles.timelineItem}>
                {/* 时间轴节点 */}
                <View className={styles.timelineNode}>
                  <View className={`${styles.timelineDot} ${isProtection ? styles.dotProtection : styles.dotWitness}`}>
                    <Text className={styles.dotEmoji}>{sourceEmoji(record)}</Text>
                  </View>
                  {idx < safeRecords.length - 1 && <View className={styles.timelineLine} />}
                </View>

                {/* 记录卡片 — 整张卡片可点击展开/折叠 */}
                <View
                  className={`${styles.card} ${isProtection ? styles.cardProtection : styles.cardWitness}`}
                  onClick={() => toggleExpand(record.id)}
                >
                  {/* 头部：日期 + 来源标签 + 折叠箭头 */}
                  <View className={styles.cardHeader}>
                    <View className={styles.cardHeaderLeft}>
                      <Text className={styles.cardDate}>{formatDateCN(record.startedAt)}</Text>
                      <View className={`${styles.sourceTag} ${isProtection ? styles.tagProtection : styles.tagWitness}`}>
                        <Text className={styles.sourceTagText}>
                          {sourceEmoji(record)} {sourceLabel(record)}
                        </Text>
                      </View>
                    </View>
                    <Text className={`${styles.expandArrow} ${expandedIds.has(record.id) ? styles.expandArrowOpen : ''}`}>▼</Text>
                  </View>

                  {/* 标题 */}
                  <Text className={styles.cardTitle}>{record.title}</Text>

                  {/* 收起时显示摘要信息 */}
                  {!expandedIds.has(record.id) && hasMedia && (
                    <Text className={styles.cardSummary}>
                      {validVideos.length > 0 && `🎬 ${validVideos.length}个视频`}
                      {validVideos.length > 0 && validAudios.length > 0 && ' · '}
                      {validAudios.length > 0 && `🎙 ${validAudios.length}个音频`}
                      {photos.length > 0 && ' · '}
                      {photos.length > 0 && `📸 ${photos.length}张照片`}
                    </Text>
                  )}

                  {/* 展开内容 */}
                  {expandedIds.has(record.id) && (
                    <View className={styles.cardBody}>
                      {/* ===== 证据分组展示 ===== */}
                      {/* 录像组 — 分为有效和损坏两组 */}
                  {videos.some(isMediaValid) && (
                    <View className={styles.mediaSection}>
                      <View className={styles.mediaSectionHeader}>
                        <Text className={styles.mediaSectionIcon}>🎬</Text>
                        <Text className={styles.mediaSectionTitle}>录像</Text>
                        <Text className={styles.mediaSectionCount}>{videos.filter(isMediaValid).length}个</Text>
                      </View>
                      {videos.filter(isMediaValid).map((v) => (
                        <View key={v.id} className={styles.videoItem}>
                          <View className={styles.videoItemLeft} onClick={(e) => { e.stopPropagation(); playVideo(v); }}>
                            <View className={styles.videoThumb}>
                              {v.thumbnail ? (
                                <img src={v.thumbnail} className={styles.videoThumbImg} alt="视频缩略图" />
                              ) : (
                                <View className={styles.videoThumbPlaceholder}>
                                  <Text className={styles.videoPlayIcon}>▶</Text>
                                </View>
                              )}
                            </View>
                            <View className={styles.videoMeta}>
                              <Text className={styles.videoMetaLabel}>
                                {v.mimeType?.includes('mp4') || v.mimeType?.includes('mpeg')
                                  ? 'MP4视频'
                                  : 'WebM视频'}
                              </Text>
                              <Text className={styles.videoMetaSize}>
                                {((v.size || 0) / 1024 / 1024).toFixed(1)}MB
                              </Text>
                              {!v.mimeType?.includes('mp4') && !v.mimeType?.includes('mpeg') && (
                                <Text className={styles.videoWebmHint}>部分浏览器需下载播放</Text>
                              )}
                            </View>
                          </View>
                          <View
                            className={styles.videoDownloadBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              createVideoBlobUrl(v.dataUrl).then(url => {
                                if (!url) { Taro.showToast({ title: '文件不可用', icon: 'none' }); return; }
                                downloadBlob(url, `善行保护_${v.id}.webm`);
                              });
                            }}
                          >
                            <Text className={styles.videoDownloadText}>⬇ 下载</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* 有视频记录但全部 size=0（旧版 base64 被截断） */}
                  {videos.length > 0 && !videos.some(isMediaValid) && (
                    <View className={styles.mediaSection}>
                      <View className={styles.mediaSectionHeader}>
                        <Text className={styles.mediaSectionIcon}>🎬</Text>
                        <Text className={styles.mediaSectionTitle}>录像</Text>
                        <Text className={styles.mediaSectionCount}>{videos.length}个</Text>
                      </View>
                      <View className={styles.mediaDisabled}>
                        <Text className={styles.mediaDisabledTitle}>
                          ⚠️ 视频文件数据已损坏
                        </Text>
                        <Text className={styles.mediaDisabledText}>
                          检测到 {videos.length} 个视频记录，但文件数据在存储时因超出浏览器限制被截断丢失。请删除此记录并重新录制，新版本使用大容量存储不会再丢失。
                        </Text>
                      </View>
                    </View>
                  )}
                  {/* 没有视频文件但有统计时长 */}
                  {videos.length === 0 && record.evidenceStats && record.evidenceStats.videoDuration > 0 && (
                    <View className={styles.mediaSection}>
                      <View className={styles.mediaSectionHeader}>
                        <Text className={styles.mediaSectionIcon}>🎬</Text>
                        <Text className={styles.mediaSectionTitle}>录像</Text>
                        <Text className={styles.mediaSectionCount}>已录制</Text>
                      </View>
                      <View className={styles.mediaDisabled}>
                        <Text className={styles.mediaDisabledTitle}>
                          ⚠️ 视频文件未完整保存
                        </Text>
                        <Text className={styles.mediaDisabledText}>
                          本次保护录制了 {formatDurationFull(record.evidenceStats.videoDuration)} 的视频，但视频文件因浏览器存储限制未能完整保存。请重新录制一次，新版本已使用大容量存储，不会再丢失。
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* 录音组 — 视频已包含音频时无需独立显示；只显示有效的独立录音 */}
                  {audios.some(isMediaValid) && (
                    <View className={styles.mediaSection}>
                      <View className={styles.mediaSectionHeader}>
                        <Text className={styles.mediaSectionIcon}>🎙</Text>
                        <Text className={styles.mediaSectionTitle}>录音</Text>
                        <Text className={styles.mediaSectionCount}>{audios.filter(isMediaValid).length}个</Text>
                      </View>
                      {audios.filter(isMediaValid).map((a) => (
                        <View key={a.id} className={styles.audioItem} onClick={(e) => { e.stopPropagation(); playAudio(a); }}>
                          <View className={styles.audioWaveform}>
                            <View className={styles.waveBar} style={{ height: '60%' }} />
                            <View className={styles.waveBar} style={{ height: '90%' }} />
                            <View className={styles.waveBar} style={{ height: '40%' }} />
                            <View className={styles.waveBar} style={{ height: '100%' }} />
                            <View className={styles.waveBar} style={{ height: '55%' }} />
                            <View className={styles.waveBar} style={{ height: '75%' }} />
                            <View className={styles.waveBar} style={{ height: '45%' }} />
                            <View className={styles.waveBar} style={{ height: '85%' }} />
                            <View className={styles.waveBar} style={{ height: '35%' }} />
                            <View className={styles.waveBar} style={{ height: '70%' }} />
                          </View>
                          <View className={styles.audioMeta}>
                            <Text className={styles.audioMetaLabel}>录音文件</Text>
                            <Text className={styles.audioMetaSize}>
                              {((a.size || 0) / 1024 / 1024).toFixed(1)}MB
                            </Text>
                          </View>
                          <Text className={styles.audioPlayBtn}>▶</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {/* 没有音频文件但有统计时长（旧数据兼容）— 不显示，视频已包含声音 */}
                  {audios.length === 0 && record.evidenceStats && record.evidenceStats.audioDuration > 0 && false && (
                    <View className={styles.mediaSection}>
                      <View className={styles.mediaSectionHeader}>
                        <Text className={styles.mediaSectionIcon}>🎙</Text>
                        <Text className={styles.mediaSectionTitle}>录音</Text>
                        <Text className={styles.mediaSectionCount}>已录制</Text>
                      </View>
                      <View className={styles.mediaDisabled}>
                        <Text className={styles.mediaDisabledTitle}>
                          ⚠️ 音频文件未完整保存
                        </Text>
                        <Text className={styles.mediaDisabledText}>
                          录音时长 {formatDurationFull(record.evidenceStats.audioDuration)}，但文件因存储限制未能保存。请重新录制。
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* 照片组 */}
                  {photos.length > 0 && (
                    <View className={styles.mediaSection}>
                      <View className={styles.mediaSectionHeader}>
                        <Text className={styles.mediaSectionIcon}>📸</Text>
                        <Text className={styles.mediaSectionTitle}>照片</Text>
                        <Text className={styles.mediaSectionCount}>{photos.length}张</Text>
                      </View>
                      <View className={styles.photoGrid}>
                        {photos.map((p) => (
                          <View
                            key={p.id}
                            className={styles.photoItem}
                            onClick={() => {
                              if (!p.dataUrl) { Taro.showToast({ title: '照片不可用', icon: 'none' }); return; }
                              Taro.previewImage({
                                urls: photos.filter(x => x.dataUrl).map(x => x.dataUrl),
                                current: p.dataUrl,
                              });
                            }}
                          >
                            {p.dataUrl ? (
                              <img src={p.thumbnail || p.dataUrl} className={styles.photoImg} alt="照片" />
                            ) : (
                              <View className={styles.photoFallback}>
                                <Text>📷</Text>
                              </View>
                            )}
                            <View className={styles.photoSizeLabel}>
                              <Text className={styles.photoSizeText}>
                                {((p.size || 0) / 1024).toFixed(0)}KB
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* 无媒体 */}
                  {!hasMedia && !record.evidenceStats?.videoDuration && !record.evidenceStats?.audioDuration && (
                    <View className={styles.noMedia}>
                      <Text className={styles.noMediaText}>📁 本次未录制多媒体文件</Text>
                    </View>
                  )}

                  {/* ===== 数据统计面板 ===== */}
                  <View className={styles.dataPanel}>
                    {/* 录制时长 */}
                    <View className={styles.dataRow}>
                      <Text className={styles.dataLabel}>⏱ 保护时长</Text>
                      <Text className={styles.dataValue}>{formatDurationFull(record.duration)}</Text>
                    </View>

                    {/* GPS轨迹点数 */}
                    {record.evidenceStats && record.evidenceStats.gpsPoints > 0 && (
                      <View className={styles.dataRow}>
                        <Text className={styles.dataLabel}>📍 GPS轨迹点</Text>
                        <Text className={styles.dataValue}>{record.evidenceStats.gpsPoints} 个</Text>
                      </View>
                    )}

                    {/* GPS位置 */}
                    {record.gps && (
                      <View className={styles.dataRow}>
                        <Text className={styles.dataLabel}>📍 记录位置</Text>
                        <Text className={styles.dataValue}>{record.gps.address}</Text>
                      </View>
                    )}

                    {/* GPS 轨迹地图 */}
                    {record.gpsTrail && record.gpsTrail.length >= 2 && (
                      <View className={styles.gpsTrailSection}>
                        <Text className={styles.gpsTrailTitle}>📍 GPS 运动轨迹（{record.gpsTrail.length}个点）</Text>
                        <View
                          className={styles.gpsTrailMap}
                          onClick={(e) => {
                            e.stopPropagation();
                            // 点击打开高德地图 Web 版查看轨迹
                            const pts = record.gpsTrail!;
                            const midIdx = Math.floor(pts.length / 2);
                            const url = `https://uri.amap.com/marker?position=${pts[midIdx].lng},${pts[midIdx].lat}&name=保护轨迹&callnative=0`;
                            window.open(url, '_blank');
                          }}
                        >
                          <GpsTrailMap points={record.gpsTrail} />
                        </View>
                        <Text className={styles.gpsTrailHint}>点击地图可放大查看</Text>
                      </View>
                    )}

                    {/* 可信度评分 */}
                    {record.trustLevel && (
                      <View className={styles.dataRow}>
                        <Text className={styles.dataLabel}>🔒 可信度</Text>
                        <View className={styles.trustDisplay}>
                          <Text className={`${styles.trustStars} ${record.trustLevel === 'high' ? styles.trustHigh : record.trustLevel === 'medium' ? styles.trustMedium : styles.trustLow}`}>
                            {trustStars(record.trustLevel)}
                          </Text>
                          <Text className={`${styles.trustLabelTag} ${record.trustLevel === 'high' ? styles.trustLabelHigh : record.trustLevel === 'medium' ? styles.trustLabelMedium : styles.trustLabelLow}`}>
                            {trustLabel(record.trustLevel)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* 文件统计 */}
                    <View className={styles.dataRow}>
                      <Text className={styles.dataLabel}>📊 文件统计</Text>
                      <Text className={styles.dataValue}>
                        {[
                          videos.length > 0 && `视频×${videos.length}`,
                          audios.length > 0 && `音频×${audios.length}`,
                          photos.length > 0 && `照片×${photos.length}`,
                        ].filter(Boolean).join('  ') || '无文件'}
                      </Text>
                    </View>
                  </View>

                    {/* ===== 操作按钮 ===== */}
                    <View className={styles.actionRow} onClick={(e) => e.stopPropagation()}>
                      {isPickMode ? (
                        <View className={styles.actionBtnPrimary} onClick={(e) => { e.stopPropagation(); handleUseInRecord(record); }}>
                          <Text className={styles.actionBtnText}>✓ 选择这条记录</Text>
                        </View>
                      ) : (
                        <View className={styles.actionBtnDel} onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}>
                          <Text className={styles.actionBtnTextDel}>🗑 删除</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View className={styles.footer}>
          <Text className={styles.footerText}>
            💡 所有文件仅存储在好事发生系统中，不会出现在手机图库
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default EvidenceHistoryPage;
