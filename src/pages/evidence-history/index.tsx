import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEvidenceHistoryStore, EvidenceRecord, EvidenceFile, dataUrlToBlob } from '@/store/evidence-history';
import styles from './index.module.scss';

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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const releaseObjectUrl = () => {
    if (objectUrlRef.current) {
      try { URL.revokeObjectURL(objectUrlRef.current); } catch {}
      objectUrlRef.current = null;
    }
  };

  // 把 dataUrl 转成可播放的 src
  const prepareSrc = (file: EvidenceFile): string | null => {
    if (!file?.dataUrl) return null;
    if (file.dataUrl.startsWith('blob:') || file.dataUrl.startsWith('http')) return file.dataUrl;
    if (file.dataUrl.startsWith('data:')) {
      try {
        releaseObjectUrl();
        const blob = dataUrlToBlob(file.dataUrl);
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        return url;
      } catch {
        return file.dataUrl; // 降级直接用 dataUrl
      }
    }
    return null;
  };

  // 播放视频
  const playVideo = (file: EvidenceFile) => {
    const src = prepareSrc(file);
    if (!src) { Taro.showToast({ title: '视频数据不可用', icon: 'none' }); return; }
    setPlayerOpen({ type: 'video', src, label: file.mimeType?.includes('mp4') ? 'MP4视频' : 'WebM视频' });
  };

  // 播放音频
  const playAudio = (file: EvidenceFile) => {
    const src = prepareSrc(file);
    if (!src) { Taro.showToast({ title: '音频数据不可用', icon: 'none' }); return; }
    setPlayerOpen({ type: 'audio', src, label: '录音' });
  };

  const closePlayer = () => {
    try { videoRef.current?.pause(); } catch {}
    try { audioRef.current?.pause(); } catch {}
    releaseObjectUrl();
    setPlayerOpen(null);
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

  const sourceLabel = (r: EvidenceRecord) =>
    r.source === 'protection' ? '🛡️ 善行保护' : '👁️ 善行见证';

  const safeRecords = Array.isArray(records) ? records : [];

  if (safeRecords.length === 0) {
    return (
      <View className={styles.page}>
        <View className={styles.empty}>
          <Text className={styles.emptyIcon}>📂</Text>
          <Text className={styles.emptyTitle}>暂无证据历史</Text>
          <Text className={styles.emptyDesc}>
            使用「善行保护」或「善行见证」录制后，文件会自动保存在这里。
          </Text>
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
            <video
              ref={(el) => { videoRef.current = el; }}
              src={playerOpen.src}
              controls
              autoPlay
              className={styles.videoPlayer}
              style={{ width: '100%', display: 'block', maxHeight: '70vh', background: '#000' }}
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

      <ScrollView className={styles.list} scrollY>
        {safeRecords.map((record) => {
          const videos = record.files?.filter(f => f.type === 'video') || [];
          const audios = record.files?.filter(f => f.type === 'audio') || [];
          const photos = record.files?.filter(f => f.type === 'photo') || [];
          const hasMedia = videos.length > 0 || audios.length > 0 || photos.length > 0;

          return (
            <View key={record.id} className={styles.card}>
              {/* 头部：来源 + 时间 */}
              <View className={styles.cardHeader}>
                <Text className={styles.cardSource}>{sourceLabel(record)}</Text>
                <Text className={styles.cardTime}>
                  {formatTime(record.startedAt)} ~ {formatTime(record.closedAt)}
                </Text>
              </View>

              <Text className={styles.cardTitle}>{record.title}</Text>

              {/* ===== 证据采集统计（即使文件不可用也显示） ===== */}
              {record.evidenceStats && (
                <View className={styles.statsRow}>
                  {record.evidenceStats.videoDuration > 0 && (
                    <View className={styles.statItem}>
                      <Text className={styles.statIcon}>🎬</Text>
                      <Text className={styles.statValue}>{Math.floor(record.evidenceStats.videoDuration / 60)}分{record.evidenceStats.videoDuration % 60}秒</Text>
                      <Text className={styles.statLabel}>录像</Text>
                    </View>
                  )}
                  {record.evidenceStats.audioDuration > 0 && (
                    <View className={styles.statItem}>
                      <Text className={styles.statIcon}>🎙</Text>
                      <Text className={styles.statValue}>{Math.floor(record.evidenceStats.audioDuration / 60)}分{record.evidenceStats.audioDuration % 60}秒</Text>
                      <Text className={styles.statLabel}>录音</Text>
                    </View>
                  )}
                  {record.evidenceStats.gpsPoints > 0 && (
                    <View className={styles.statItem}>
                      <Text className={styles.statIcon}>📍</Text>
                      <Text className={styles.statValue}>{record.evidenceStats.gpsPoints}</Text>
                      <Text className={styles.statLabel}>GPS点</Text>
                    </View>
                  )}
                  {record.evidenceStats.photos > 0 && (
                    <View className={styles.statItem}>
                      <Text className={styles.statIcon}>📸</Text>
                      <Text className={styles.statValue}>{record.evidenceStats.photos}</Text>
                      <Text className={styles.statLabel}>照片</Text>
                    </View>
                  )}
                </View>
              )}

              {/* ===== 视频播放按钮 ===== */}
              {videos.length > 0 ? videos.map((v) => (
                <View key={v.id} className={styles.mediaBtn} onClick={() => playVideo(v)}>
                  <View className={styles.mediaBtnIcon}>▶</View>
                  <View className={styles.mediaBtnInfo}>
                    <Text className={styles.mediaBtnLabel}>播放视频</Text>
                    <Text className={styles.mediaBtnMeta}>
                      {v.mimeType?.includes('mp4') ? 'MP4' : 'WebM'} · {((v.size || 0) / 1024 / 1024).toFixed(1)}MB
                    </Text>
                  </View>
                  <Text className={styles.mediaBtnArrow}>▶</Text>
                </View>
              )) : record.evidenceStats && record.evidenceStats.videoDuration > 0 ? (
                <View className={`${styles.mediaBtn} ${styles.mediaBtnDisabled}`}>
                  <View className={styles.mediaBtnIcon}>🎬</View>
                  <View className={styles.mediaBtnInfo}>
                    <Text className={styles.mediaBtnLabel}>视频已录制（当前浏览器不支持播放）</Text>
                    <Text className={styles.mediaBtnMeta}>录了 {Math.floor(record.evidenceStats.videoDuration / 60)} 分 {record.evidenceStats.videoDuration % 60} 秒</Text>
                  </View>
                </View>
              ) : null}

              {/* ===== 音频播放按钮 ===== */}
              {audios.length > 0 ? audios.map((a) => (
                <View key={a.id} className={styles.mediaBtn} onClick={() => playAudio(a)}>
                  <View className={styles.mediaBtnIcon}>🎙</View>
                  <View className={styles.mediaBtnInfo}>
                    <Text className={styles.mediaBtnLabel}>播放录音</Text>
                    <Text className={styles.mediaBtnMeta}>
                      音频 · {((a.size || 0) / 1024 / 1024).toFixed(1)}MB
                    </Text>
                  </View>
                  <Text className={styles.mediaBtnArrow}>▶</Text>
                </View>
              )) : record.evidenceStats && record.evidenceStats.audioDuration > 0 ? (
                <View className={`${styles.mediaBtn} ${styles.mediaBtnDisabled}`}>
                  <View className={styles.mediaBtnIcon}>🎙</View>
                  <View className={styles.mediaBtnInfo}>
                    <Text className={styles.mediaBtnLabel}>录音已录制（当前浏览器不支持播放）</Text>
                    <Text className={styles.mediaBtnMeta}>录了 {Math.floor(record.evidenceStats.audioDuration / 60)} 分 {record.evidenceStats.audioDuration % 60} 秒</Text>
                  </View>
                </View>
              ) : null}

              {/* ===== 照片缩略图 ===== */}
              {photos.length > 0 && (
                <View className={styles.photoRow}>
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
                        <Text className={styles.photoFallback}>📷</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* ===== 无文件提示 ===== */}
              {!hasMedia && !record.evidenceStats?.videoDuration && !record.evidenceStats?.audioDuration && (
                <View className={styles.noMedia}>
                  <Text className={styles.noMediaText}>📁 本次未录制多媒体文件</Text>
                </View>
              )}

              {/* ===== GPS ===== */}
              {record.gps && (
                <View className={styles.gpsRow} onClick={() => {
                  const { latitude, longitude, address } = record.gps!;
                  Taro.showModal({
                    title: '📍 位置信息',
                    content: `地址：${address}\n纬度：${latitude.toFixed(6)}\n经度：${longitude.toFixed(6)}`,
                    confirmText: '打开地图',
                    cancelText: '关闭',
                    success: (r) => {
                      if (r.confirm && typeof window !== 'undefined') {
                        window.open(
                          `https://uri.amap.com/marker?position=${longitude},${latitude}&name=${encodeURIComponent(address)}`,
                          '_blank'
                        );
                      }
                    },
                  });
                }}>
                  <Text className={styles.gpsIcon}>📍</Text>
                  <View className={styles.gpsInfo}>
                    <Text className={styles.gpsAddr}>{record.gps.address}</Text>
                    <Text className={styles.gpsCoords}>
                      {record.gps.latitude.toFixed(6)}, {record.gps.longitude.toFixed(6)}
                    </Text>
                  </View>
                  <Text className={styles.gpsArrow}>→</Text>
                </View>
              )}

              {/* ===== 持续时长 ===== */}
              <View className={styles.durationRow}>
                <Text className={styles.durationText}>⏱ 保护时长 {formatDuration(record.duration)}</Text>
              </View>

              {/* ===== 操作按钮 ===== */}
              <View className={styles.actionRow}>
                <View className={styles.actionBtnPrimary} onClick={() => handleUseInRecord(record)}>
                  <Text className={styles.actionBtnText}>{isPickMode ? '✓ 选择这条记录' : '📝 用于发布记录'}</Text>
                </View>
                {!isPickMode && (
                  <View className={styles.actionBtnDel} onClick={() => handleDelete(record.id)}>
                    <Text className={styles.actionBtnTextDel}>🗑 删除</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

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
