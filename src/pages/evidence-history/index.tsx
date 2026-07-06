import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useEvidenceHistoryStore, EvidenceRecord, EvidenceFile, shortHash, dataUrlToBlob } from '@/store/evidence-history';
import { trustLevelStars } from '@/services/evidence-crypto';
import styles from './index.module.scss';

const EvidenceHistoryPage: React.FC = () => {
  const { records, loadFromStorage, removeRecord, verifyIntegrity } = useEvidenceHistoryStore();
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ allValid: boolean; details: { id: string; valid: boolean; reason?: string }[] } | null>(null);

  useEffect(() => {
    loadFromStorage();
    return () => { releaseObjectUrl(); };
  }, []);

  // 验证完整性
  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const details = await verifyIntegrity();
      const allValid = details.every(d => d.valid);
      setVerifyResult({ allValid, details });
      if (allValid) {
        Taro.showToast({ title: `完整性验证通过 ✓ ${details.length}条`, icon: 'none', duration: 2500 });
      } else {
        Taro.showToast({ title: '检测到数据异常！', icon: 'none', duration: 2500 });
      }
    } catch {
      Taro.showToast({ title: '验证失败', icon: 'none' });
    } finally {
      setVerifying(false);
    }
  };

  // 播放器 state
  const [playing, setPlaying] = useState<{ type: 'video' | 'audio'; src: string } | null>(null);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // 清理 Object URL，防止内存泄漏
  const releaseObjectUrl = () => {
    if (objectUrlRef.current) {
      try { URL.revokeObjectURL(objectUrlRef.current); } catch {}
      objectUrlRef.current = null;
    }
  };

  const handleDelete = (id: string) => {
    Taro.showModal({
      title: '删除确认',
      content: '确定删除这条历史记录？删除后不可恢复。',
      success: (res) => {
        if (res.confirm) {
          removeRecord(id);
          Taro.showToast({ title: '已删除', icon: 'success' });
        }
      },
    });
  };

  const handleUseInRecord = (record: EvidenceRecord) => {
    Taro.navigateTo({
      url: `/pages/record/index?from=history&historyId=${record.id}`,
    });
  };

  // 播放视频：base64 → Blob → Object URL（避免超大 base64 直接作为 src 导致播放失败）
  const handlePlayVideo = (file: EvidenceFile) => {
    try {
      releaseObjectUrl();
      if (file.dataUrl.startsWith('blob:')) {
        // 已经是 Object URL，直接使用
        setPlaying({ type: 'video', src: file.dataUrl });
      } else {
        const blob = dataUrlToBlob(file.dataUrl);
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setPlaying({ type: 'video', src: objectUrl });
      }
    } catch (e) {
      console.warn('[EvidenceHistory] Video play error:', e);
      // 降级：直接用 dataUrl
      setPlaying({ type: 'video', src: file.dataUrl });
    }
  };

  // 播放音频
  const handlePlayAudio = (file: EvidenceFile) => {
    try {
      releaseObjectUrl();
      if (file.dataUrl.startsWith('blob:')) {
        setPlaying({ type: 'audio', src: file.dataUrl });
      } else {
        const blob = dataUrlToBlob(file.dataUrl);
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        setPlaying({ type: 'audio', src: objectUrl });
      }
    } catch (e) {
      console.warn('[EvidenceHistory] Audio play error:', e);
      setPlaying({ type: 'audio', src: file.dataUrl });
    }
  };

  // 关闭播放器
  const handleClosePlayer = () => {
    try { videoPlayerRef.current?.pause(); } catch {}
    try { audioPlayerRef.current?.pause(); } catch {}
    releaseObjectUrl();
    setPlaying(null);
  };

  // 查看 GPS 位置
  const handleViewGPS = (record: EvidenceRecord) => {
    if (!record.gps) return;
    const { latitude, longitude, address } = record.gps;
    if (typeof window !== 'undefined') {
      window.open(`https://uri.amap.com/marker?position=${longitude},${latitude}&name=${encodeURIComponent(address)}`, '_blank');
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}分${s}秒`;
  };

  const sourceLabel = (r: EvidenceRecord) =>
    r.source === 'protection' ? '🛡️ 扇形保护' : '👁️ 扇形见证';

  // 确保 records 是数组（防御性编程）
  const safeRecords = Array.isArray(records) ? records : [];

  if (safeRecords.length === 0) {
    return (
      <View className={styles.page}>
        <View className={styles.empty}>
          <Text className={styles.emptyIcon}>📂</Text>
          <Text className={styles.emptyTitle}>暂无证据历史</Text>
          <Text className={styles.emptyDesc}>
            使用「扇形保护」或「我要见证」录制后，文件会自动保存在这里。{'\n'}
            所有文件仅存储在好事发生系统中，不会出现在手机图库。
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      {/* 视频播放器浮层 */}
      {playing?.type === 'video' && (
        <View className={styles.playerOverlay} onClick={handleClosePlayer}>
          <View className={styles.playerCard} onClick={(e) => e.stopPropagation()}>
            <View className={styles.playerClose} onClick={handleClosePlayer}>
              <Text className={styles.playerCloseText}>✕</Text>
            </View>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={(el) => { videoPlayerRef.current = el; }}
              src={playing.src}
              controls
              autoPlay
              className={styles.videoPlayer}
            />
          </View>
        </View>
      )}

      {/* 音频播放器浮层 */}
      {playing?.type === 'audio' && (
        <View className={styles.playerOverlay} onClick={handleClosePlayer}>
          <View className={styles.audioPlayerCard} onClick={(e) => e.stopPropagation()}>
            <View className={styles.playerClose} onClick={handleClosePlayer}>
              <Text className={styles.playerCloseText}>✕</Text>
            </View>
            <Text className={styles.audioPlayerTitle}>🎵 播放录音</Text>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              ref={(el) => { audioPlayerRef.current = el; }}
              src={playing.src}
              controls
              autoPlay
              className={styles.audioPlayer}
            />
          </View>
        </View>
      )}

      <ScrollView className={styles.list} scrollY>
        {/* 验证完整性按钮 */}
        {safeRecords.length > 0 && (
          <View className={styles.verifyBar}>
            <View className={styles.verifyBtn} onClick={handleVerify}>
              <Text className={styles.verifyBtnText}>
                {verifying ? '🔍 验证中...' : '🛡️ 验证数据完整性'}
              </Text>
            </View>
            {verifyResult && (
              <Text className={verifyResult.allValid ? styles.verifyOk : styles.verifyFail}>
                {verifyResult.allValid
                  ? `✓ ${verifyResult.details.length}条证据全部验证通过`
                  : `✗ 检测到 ${verifyResult.details.filter(d => !d.valid).length}条异常`}
              </Text>
            )}
          </View>
        )}
        {safeRecords.map((record) => (
          <View key={record.id} className={styles.card}>
            <View className={styles.cardHeader}>
              <Text className={styles.cardSource}>{sourceLabel(record)}</Text>
              <Text className={styles.cardTime}>
                {formatTime(record.startedAt)} ~ {formatTime(record.closedAt)}
              </Text>
            </View>

            <Text className={styles.cardTitle}>{record.title}</Text>
            <Text className={styles.cardDesc}>{record.description}</Text>

            <View className={styles.cardMeta}>
              <Text className={styles.metaItem}>⏱ {formatDuration(record.duration)}</Text>
              {Array.isArray(record.files) && record.files.filter(f => f.type === 'video').length > 0 && (
                <Text className={styles.metaItem}>🎬 {record.files.filter(f => f.type === 'video').length}视频</Text>
              )}
              {Array.isArray(record.files) && record.files.filter(f => f.type === 'photo').length > 0 && (
                <Text className={styles.metaItem}>📸 {record.files.filter(f => f.type === 'photo').length}照片</Text>
              )}
              {Array.isArray(record.files) && record.files.filter(f => f.type === 'audio').length > 0 && (
                <Text className={styles.metaItem}>🎙 {record.files.filter(f => f.type === 'audio').length}录音</Text>
              )}
            </View>

            {/* 数据完整性与可信度 */}
            {(record.dataHash || record.trustLevel) && (
              <View className={styles.integrityBar}>
                {record.dataHash && (
                  <View className={styles.integrityItem}>
                    <Text className={styles.integrityIcon}>🔗</Text>
                    <Text className={styles.integrityLabel}>数据指纹</Text>
                    <Text className={styles.integrityValue}>{shortHash(record.dataHash)}</Text>
                  </View>
                )}
                {record.trustLevel && (
                  <View className={styles.integrityItem}>
                    <Text className={styles.integrityIcon}>🏷️</Text>
                    <Text className={styles.integrityLabel}>可信度</Text>
                    <Text className={styles.integrityValue}>{trustLevelStars(record.trustLevel)}</Text>
                  </View>
                )}
                {record.encrypted && (
                  <View className={styles.integrityItem}>
                    <Text className={styles.integrityIcon}>🔒</Text>
                    <Text className={styles.integrityLabel}>AES加密</Text>
                    <Text className={styles.integrityValue}>✓</Text>
                  </View>
                )}
                <View className={styles.integrityItem}>
                  <Text className={styles.integrityIcon}>📦</Text>
                  <Text className={styles.integrityLabel}>私有存储</Text>
                  <Text className={styles.integrityValue}>✓</Text>
                </View>
              </View>
            )}

            {/* GPS 信息 */}
            {record.gps && (
              <View className={styles.gpsBar} onClick={() => handleViewGPS(record)}>
                <Text className={styles.gpsIcon}>📍</Text>
                <View className={styles.gpsInfo}>
                  <Text className={styles.gpsAddress}>{record.gps.address}</Text>
                  <Text className={styles.gpsCoords}>
                    {record.gps.latitude.toFixed(6)}, {record.gps.longitude.toFixed(6)}
                  </Text>
                </View>
                <Text className={styles.gpsArrow}>→</Text>
              </View>
            )}

            {/* 文件预览 */}
            {Array.isArray(record.files) && record.files.length > 0 && (
              <View className={styles.fileGrid}>
                {record.files.map((file) => (
                  <View key={file.id} className={styles.fileItem}>
                    {file.type === 'photo' ? (
                      <Image
                        className={styles.fileThumb}
                        src={file.thumbnail || file.dataUrl}
                        mode="aspectFill"
                        onClick={() => {
                          const photos = record.files.filter(f => f.type === 'photo').map(f => f.dataUrl);
                          const idx = photos.indexOf(file.dataUrl);
                          Taro.previewImage({
                            urls: photos,
                            current: photos[idx] || photos[0],
                          });
                        }}
                      />
                    ) : file.type === 'video' ? (
                      <View className={styles.fileVideoItem} onClick={() => handlePlayVideo(file)}>
                        {file.thumbnail ? (
                          <Image className={styles.fileThumb} src={file.thumbnail} mode="aspectFill" />
                        ) : (
                          <View className={styles.fileVideoPlaceholder}>
                            <Text className={styles.fileVideoIcon}>🎬</Text>
                          </View>
                        )}
                        <View className={styles.playBadge}>
                          <Text className={styles.playBadgeIcon}>▶</Text>
                        </View>
                        <Text className={styles.fileLabel}>视频</Text>
                      </View>
                    ) : file.type === 'audio' ? (
                      <View className={styles.fileAudioItem} onClick={() => handlePlayAudio(file)}>
                        <Text className={styles.audioItemIcon}>🎙</Text>
                        <Text className={styles.fileLabel}>录音</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            )}

            <View className={styles.cardActions}>
              <View className={styles.actionBtn} onClick={() => handleUseInRecord(record)}>
                <Text className={styles.actionBtnText}>用于发布记录</Text>
              </View>
              <View className={styles.actionBtnDel} onClick={() => handleDelete(record.id)}>
                <Text className={styles.actionBtnDelText}>删除</Text>
              </View>
            </View>
          </View>
        ))}

        <View className={styles.footer}>
          <Text className={styles.footerText}>
            💡 所有文件仅保存在好事发生系统中，不会出现在手机图库
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default EvidenceHistoryPage;
