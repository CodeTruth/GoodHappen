import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Image, Textarea, Camera, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useKindnessStore } from '@/store/kindness';
import { useUserStore } from '@/store/user';
import { useFortuneStore } from '@/store/fortune';

import styles from './index.module.scss';

// 判断运行环境
const isH5 = typeof window !== 'undefined';

export default function WitnessRecordPage() {
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const mediaRecorderRef = useRef<any>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // 状态
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locationError, setLocationError] = useState('');

  // 拍摄内容
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const recordTimerRef = useRef<any>(null);

  // 发布
  const [showPublish, setShowPublish] = useState(false);
  const [description, setDescription] = useState('');
  const [publishing, setPublishing] = useState(false);

  const { userInfo } = useUserStore();
  const { addPublished } = useKindnessStore();
  const { addFortune } = useFortuneStore();

  // ===== 初始化摄像头（H5） =====
  useEffect(() => {
    if (!isH5) return;

    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: true,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err) {
        setCameraError('无法访问摄像头，请检查权限设置');
      }
    };

    initCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((t: any) => t.stop());
      }
    };
  }, []);

  // ===== 页面显示时重置状态（重新进入时清空旧数据） =====
  useEffect(() => {
    Taro.useDidShow(() => {
      setPhotos([]);
      setVideoUrl('');
      setIsRecording(false);
      setRecordTime(0);
      setShowPublish(false);
      setDescription('');
      setCameraError('');
      setLocation(null);
      setLocationError('');
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch (_) {}
        mediaRecorderRef.current = null;
      }
    });
  }, []);

  // ===== 获取GPS位置 =====
  useEffect(() => {
    Taro.getLocation({
      type: 'gcj02',
      success: (res) => {
        setLocation({
          lat: res.latitude,
          lng: res.longitude,
          address: `${res.latitude.toFixed(4)}, ${res.longitude.toFixed(4)}`,
        });
      },
      fail: () => {
        setLocationError('定位失败');
      },
    });
  }, []);

  // ===== 拍照（H5） =====
  const takePhoto = useCallback(() => {
    if (!isH5) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setPhotos(prev => [...prev, dataUrl]);

    Taro.showToast({ title: '已拍照', icon: 'success' });
  }, []);

  // ===== 拍照（小程序） =====
  const handleCameraPhoto = useCallback(() => {
    const ctx = Taro.createCameraContext();
    ctx.takePhoto({
      quality: 'high',
      success: (res) => {
        setPhotos(prev => [...prev, res.tempImagePath]);
        Taro.showToast({ title: '已拍照', icon: 'success' });
      },
      fail: () => {
        Taro.showToast({ title: '拍照失败', icon: 'none' });
      },
    });
  }, []);

  // ===== 获取浏览器支持的最佳视频格式 =====
  const getBestVideoFormat = () => {
    if (!isH5 || !MediaRecorder) return 'video/webm';
    const formats = ['video/mp4', 'video/webm', 'video/ogg'];
    for (const format of formats) {
      if (MediaRecorder.isTypeSupported(format)) return format;
    }
    return 'video/webm';
  };

// ===== 开始/停止录像（H5） =====
  const toggleRecord = useCallback(() => {
    if (!isH5) return;

    if (isRecording) {
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.stop();
        } catch (err) {
          console.warn('[WitnessRecord] Stop recording error:', err);
        }
      }
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
      setIsRecording(false);
    } else {
      const video = videoRef.current;
      if (!video || !video.srcObject) {
        Taro.showToast({ title: '摄像头未就绪', icon: 'none' });
        return;
      }

      try {
        recordedChunksRef.current = [];
        const format = getBestVideoFormat();
        const mediaRecorder = new MediaRecorder(video.srcObject as MediaStream, { mimeType: format });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e: any) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = () => {
          if (recordedChunksRef.current.length > 0) {
            const blob = new Blob(recordedChunksRef.current, { type: format });
            const url = URL.createObjectURL(blob);
            setVideoUrl(url);
            Taro.showToast({ title: '录像已保存', icon: 'success' });
          } else {
            Taro.showToast({ title: '录像内容为空', icon: 'none' });
          }
        };

        mediaRecorder.onerror = (err: any) => {
          console.warn('[WitnessRecord] Recording error:', err);
          Taro.showToast({ title: '录像失败', icon: 'none' });
          setIsRecording(false);
        };

        mediaRecorder.start(1000);
        setIsRecording(true);
        setRecordTime(0);
        recordTimerRef.current = setInterval(() => {
          setRecordTime(t => t + 1);
        }, 1000);
      } catch (err) {
        console.warn('[WitnessRecord] MediaRecorder not supported:', err);
        Taro.showToast({ title: '当前浏览器不支持录像', icon: 'none' });
      }
    }
  }, [isRecording]);

  // ===== 格式化录制时间 =====
  const formatRecordTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ===== 删除照片 =====
  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  // ===== 删除视频 =====
  const removeVideo = () => {
    setVideoUrl('');
    setRecordTime(0);
  };

  // ===== 打开发布面板 =====
  const openPublish = () => {
    if (photos.length === 0 && !videoUrl) {
      Taro.showToast({ title: '请先拍照或录像', icon: 'none' });
      return;
    }
    setShowPublish(true);
  };

  // ===== 发布见证 =====
  const handlePublish = () => {
    if (publishing) return;
    setPublishing(true);

    const newKindness = {
      id: `witness_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: userInfo?.id || 'guest',
      userName: userInfo?.nickname || '热心见证人',
      userAvatar: userInfo?.avatar || '',
      type: 'witness' as const,
      content: description || '我见证了一件温暖的事',
      images: photos,
      video: videoUrl,
      location: location?.address,
      lat: location?.lat,
      lng: location?.lng,
      tags: ['见证'],
      visibleScope: 'public' as const,
      likes: 0,
      comments: 0,
      fortune: 15,
      createdAt: new Date().toISOString(),
      isMock: false,
    };

    setTimeout(() => {
      addPublished(newKindness);
      addFortune(15, 'witness');

      Taro.showToast({
        title: '见证发布成功！+15福气',
        icon: 'success',
        duration: 2000,
      });

      setTimeout(() => {
        Taro.switchTab({ url: '/pages/home/index' });
      }, 1500);
    }, 800);
  };

  // ===== 返回 =====
  const handleBack = () => {
    Taro.navigateBack();
  };

  return (
    <View className={styles.page}>
      {/* ===== 顶部栏 ===== */}
      <View className={styles.topBar}>
        <Text className={styles.backBtn} onClick={handleBack}>←</Text>
        <Text className={styles.topTitle}>我要见证</Text>
        <View className={styles.locationBadge}>
          <Text className={styles.locationIcon}>📍</Text>
          <Text className={styles.locationText}>
            {location ? '已定位' : locationError ? '定位失败' : '定位中...'}
          </Text>
        </View>
      </View>

      {/* ===== 摄像头预览区 ===== */}
      <View className={styles.cameraArea}>
        {isH5 ? (
          <>
            {cameraError ? (
              <View className={styles.cameraError}>
                <Text className={styles.cameraErrorIcon}>📷</Text>
                <Text className={styles.cameraErrorText}>{cameraError}</Text>
                <Text className={styles.cameraErrorHint}>请允许浏览器访问摄像头权限</Text>
              </View>
            ) : (
              <video
                ref={videoRef}
                className={styles.videoPreview}
                autoPlay
                playsInline
                muted
              />
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </>
        ) : (
          <Camera
            className={styles.cameraPreview}
            devicePosition="back"
            flash="auto"
            resolution="high"
          />
        )}

        {/* 录制计时器 */}
        {isRecording && (
          <View className={styles.recordTimer}>
            <Text className={styles.recordDot} />
            <Text className={styles.recordTime}>{formatRecordTime(recordTime)}</Text>
          </View>
        )}
      </View>

      {/* ===== 已拍摄内容预览 ===== */}
      {(photos.length > 0 || videoUrl) && (
        <View className={styles.shootPreview}>
          <ScrollView className={styles.shootScroll} scrollX>
            {photos.map((photo, idx) => (
              <View key={idx} className={styles.shootItem}>
                <Image className={styles.shootImage} src={photo} mode="aspectFill" />
                <Text className={styles.shootRemove} onClick={() => removePhoto(idx)}>×</Text>
              </View>
            ))}
            {videoUrl && (
              <View className={styles.shootItem}>
                <View className={styles.shootVideo}>
                  <Text className={styles.shootVideoIcon}>▶</Text>
                  <Text className={styles.shootVideoTime}>{formatRecordTime(recordTime)}</Text>
                </View>
                <Text className={styles.shootRemove} onClick={removeVideo}>×</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* ===== 底部操作区 ===== */}
      {!showPublish ? (
        <View className={styles.bottomBar}>
          <View className={styles.controlRow}>
            {/* 拍照按钮 */}
            <View
              className={styles.shootBtn}
              onClick={isH5 ? takePhoto : handleCameraPhoto}
            >
              <Text className={styles.shootBtnIcon}>📸</Text>
              <Text className={styles.shootBtnText}>拍照</Text>
            </View>

            {/* 录像按钮 */}
            {isH5 && (
              <View
                className={`${styles.recordBtn} ${isRecording ? styles.recordBtnActive : ''}`}
                onClick={toggleRecord}
              >
                <View className={isRecording ? styles.recordStop : styles.recordCircle} />
                <Text className={styles.shootBtnText}>
                  {isRecording ? '停止' : '录像'}
                </Text>
              </View>
            )}

            {/* 完成按钮 */}
            <View
              className={`${styles.finishBtn} ${(photos.length > 0 || videoUrl) ? styles.finishBtnActive : ''}`}
              onClick={openPublish}
            >
              <Text className={styles.finishBtnText}>
                完成{photos.length > 0 || videoUrl ? `(${photos.length + (videoUrl ? 1 : 0)})` : ''}
              </Text>
            </View>
          </View>

          <Text className={styles.bottomHint}>
            📍 {location?.address || '定位中...'} · 照片/视频将自动附带位置信息
          </Text>
        </View>
      ) : (
        /* ===== 发布面板 ===== */
        <View className={styles.publishPanel}>
          <View className={styles.publishHeader}>
            <Text className={styles.publishTitle}>补充描述（可选）</Text>
            <Text className={styles.publishClose} onClick={() => setShowPublish(false)}>✕</Text>
          </View>
          <Textarea
            className={styles.publishInput}
            placeholder="简要描述你看到的温暖场景..."
            value={description}
            onInput={(e) => setDescription(e.detail.value)}
            maxlength={200}
          />
          <View
            className={styles.publishBtn}
            onClick={handlePublish}
          >
            <Text className={styles.publishBtnText}>
              {publishing ? '发布中...' : '发布见证'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
