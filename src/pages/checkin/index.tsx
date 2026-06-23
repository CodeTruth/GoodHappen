import React, { useState, useEffect } from 'react';
import { View, Text, Textarea, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import {
  useCheckinStore,
  CheckinCategory,
  CATEGORY_INFO,
  SUBCATEGORIES,
  ContentType,
  CheckinVisibility,
} from '@/store/checkin';
import { useCircleStore } from '@/store/circle';
import { useUserStore } from '@/store/user';
import styles from './index.module.scss';

const CheckinPage: React.FC = () => {
  const router = useRouter();
  const { circleId } = router.params;

  // 选中的品类
  const [selectedCategory, setSelectedCategory] = useState<CheckinCategory>('warm');
  // 选中的子分类
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  // 内容载体类型
  const [contentType, setContentType] = useState<ContentType>('text');
  // 文字内容
  const [content, setContent] = useState('');
  // 图片列表
  const [images, setImages] = useState<string[]>([]);
  // 视频
  const [videoPath, setVideoPath] = useState<string>('');
  const [videoThumb, setVideoThumb] = useState<string>('');
  // AI 摘要
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  // 可见范围
  const [visibility, setVisibility] = useState<CheckinVisibility>('circle');
  // 提交中状态
  const [submitting, setSubmitting] = useState(false);

  const {
    addCheckin,
    getUserCheckins,
    getUserStreak,
    getCircleTasks,
    generateAISummary,
    loadFromStorage,
  } = useCheckinStore();

  const { getCircleById, getCurrentUserCircles, loadFromStorage: loadCircleFromStorage } = useCircleStore();
  const { userInfo, loadFromStorage: loadUserFromStorage } = useUserStore();

  const currentCircle = circleId ? getCircleById(circleId) : undefined;
  const userCircles = userInfo ? getCurrentUserCircles(userInfo.id) : [];
  const tasks = circleId ? getCircleTasks(circleId).filter(t => t.isActive) : [];
  const recentCheckins = userInfo ? getUserCheckins(userInfo.id).slice(0, 5) : [];
  const streakDays = userInfo ? getUserStreak(userInfo.id, selectedCategory) : 0;

  useEffect(() => {
    loadFromStorage();
    loadCircleFromStorage();
    loadUserFromStorage();
  }, []);

  // 品类切换时，默认选中第一个子分类
  useEffect(() => {
    if (SUBCATEGORIES[selectedCategory].length > 0) {
      setSelectedSubcategory(SUBCATEGORIES[selectedCategory][0]);
    }
  }, [selectedCategory]);

  // 处理图片选择
  const handleChooseImage = () => {
    Taro.chooseImage({
      count: 9 - images.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: async (res) => {
        const newImages = [...images, ...res.tempFilePaths];
        setImages(newImages);
        // 触发 AI 摘要生成
        await triggerAISummary('image', newImages[0]);
      }
    });
  };

  // 处理视频选择
  const handleChooseVideo = () => {
    Taro.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: async (res) => {
        setVideoPath(res.tempFilePath);
        const videoRes = res as Taro.chooseVideo.SuccessCallbackResult & { thumbTempFilePath?: string };
        setVideoThumb(videoRes.thumbTempFilePath || res.tempFilePath);
        // 触发 AI 摘要生成
        await triggerAISummary('video', res.tempFilePath);
      }
    });
  };

  // 触发 AI 摘要生成（模拟）
  const triggerAISummary = async (type: ContentType, mediaPath?: string) => {
    setIsGeneratingSummary(true);
    setAiSummary('');
    try {
      const summary = await generateAISummary(type, mediaPath, content);
      setAiSummary(summary);
    } catch (e) {
      console.error('[Checkin] AI summary failed:', e);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // 删除图片
  const handleDeleteImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 删除视频
  const handleDeleteVideo = () => {
    setVideoPath('');
    setVideoThumb('');
    setAiSummary('');
  };

  // 提交打卡
  const handleSubmit = async () => {
    if (!userInfo) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    if (!content.trim() && images.length === 0 && !videoPath) {
      Taro.showToast({ title: '请输入内容或添加媒体', icon: 'none' });
      return;
    }

    if (!selectedSubcategory) {
      Taro.showToast({ title: '请选择子分类', icon: 'none' });
      return;
    }

    setSubmitting(true);
    try {
      addCheckin({
        userId: userInfo.id,
        userName: userInfo.name,
        userAvatar: userInfo.avatar,
        circleId: visibility === 'circle' ? (circleId || userCircles[0]?.id) : undefined,
        category: selectedCategory,
        subcategory: selectedSubcategory,
        contentType,
        content: content || aiSummary || '',
        images: images.length > 0 ? images : undefined,
        video: videoPath || undefined,
        videoThumb: videoThumb || undefined,
        aiSummary: aiSummary || undefined,
        visibility,
      });

      Taro.showToast({ title: '打卡成功！', icon: 'success' });

      // 重置表单
      setContent('');
      setImages([]);
      setVideoPath('');
      setVideoThumb('');
      setAiSummary('');
      setContentType('text');

      setTimeout(() => {
        Taro.navigateBack();
      }, 1000);
    } catch (e) {
      console.error('[Checkin] Submit failed:', e);
      Taro.showToast({ title: '打卡失败，请重试', icon: 'none' });
    } finally {
      setSubmitting(false);
    }
  };

  // 格式化时间
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <View className={styles.container}>
      {/* 页面头部 */}
      <View className={styles.header}>
        <Text className={styles.title}>善行打卡</Text>
        <Text className={styles.subtitle}>坚持小事，成就温暖</Text>
        {currentCircle && (
          <View className={styles.circleBadge}>
            <Text className={styles.circleBadgeText}>📍 {currentCircle.name}</Text>
          </View>
        )}
      </View>

      {/* 连续打卡天数 */}
      <View className={styles.streakCard}>
        <Text className={styles.streakIcon}>{CATEGORY_INFO[selectedCategory].icon}</Text>
        <View className={styles.streakInfo}>
          <Text className={styles.streakDays}>{streakDays}天</Text>
          <Text className={styles.streakLabel}>连续打卡</Text>
        </View>
        <Text className={styles.streakEncourage}>
          {streakDays === 0 ? '今天开始打卡吧！' : streakDays >= 7 ? '太棒了，继续加油！' : '坚持下去！'}
        </Text>
      </View>

      {/* 打卡任务（如果有团体任务） */}
      {tasks.length > 0 && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>📋 团体打卡任务</Text>
          {tasks.map(task => (
            <View
              key={task.id}
              className={styles.taskCard}
              onClick={() => {
                setSelectedCategory(task.category);
                if (task.subcategory) setSelectedSubcategory(task.subcategory);
              }}
            >
              <View className={styles.taskInfo}>
                <Text className={styles.taskTitle}>{task.title}</Text>
                {task.description && (
                  <Text className={styles.taskDesc}>{task.description}</Text>
                )}
                <View className={styles.taskMeta}>
                  <Text className={styles.taskCategory}>
                    {CATEGORY_INFO[task.category].icon} {CATEGORY_INFO[task.category].name}
                  </Text>
                  <Text className={styles.taskFreq}>
                    {task.frequency === 'daily' ? '每日' : task.frequency === 'weekly' ? '每周' : `每${task.customDays}天`}
                  </Text>
                </View>
              </View>
              <View className={styles.taskStats}>
                <Text className={styles.taskStatNum}>{task.participantCount}</Text>
                <Text className={styles.taskStatLabel}>参与</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 品类选择 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>选择品类</Text>
        <View className={styles.categoryList}>
          {(Object.keys(CATEGORY_INFO) as CheckinCategory[]).map(cat => (
            <View
              key={cat}
              className={`${styles.categoryCard} ${selectedCategory === cat ? styles.active : ''}`}
              onClick={() => setSelectedCategory(cat)}
              style={selectedCategory === cat ? { borderColor: CATEGORY_INFO[cat].color } : {}}
            >
              <Text className={styles.categoryIcon}>{CATEGORY_INFO[cat].icon}</Text>
              <Text className={styles.categoryName}>{CATEGORY_INFO[cat].name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 子分类选择 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>选择子分类</Text>
        <View className={styles.subcategoryList}>
          {SUBCATEGORIES[selectedCategory].map(sub => (
            <View
              key={sub}
              className={`${styles.subcategoryTag} ${selectedSubcategory === sub ? styles.active : ''}`}
              onClick={() => setSelectedSubcategory(sub)}
            >
              <Text className={styles.subcategoryText}>{sub}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 内容载体选择 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>记录方式</Text>
        <View className={styles.contentTypeList}>
          <View
            className={`${styles.contentTypeBtn} ${contentType === 'text' ? styles.active : ''}`}
            onClick={() => setContentType('text')}
          >
            <Text className={styles.contentTypeIcon}>📝</Text>
            <Text className={styles.contentTypeText}>文字</Text>
          </View>
          <View
            className={`${styles.contentTypeBtn} ${contentType === 'image' ? styles.active : ''}`}
            onClick={() => setContentType('image')}
          >
            <Text className={styles.contentTypeIcon}>📷</Text>
            <Text className={styles.contentTypeText}>图片</Text>
          </View>
          <View
            className={`${styles.contentTypeBtn} ${contentType === 'video' ? styles.active : ''}`}
            onClick={() => setContentType('video')}
          >
            <Text className={styles.contentTypeIcon}>🎬</Text>
            <Text className={styles.contentTypeText}>视频</Text>
          </View>
        </View>
      </View>

      {/* 内容输入 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>打卡内容</Text>
        <Textarea
          className={styles.textarea}
          placeholder="记录下这个温暖的瞬间..."
          value={content}
          onInput={(e) => setContent(e.detail.value)}
          maxlength={500}
          showConfirmBar={false}
        />

        {/* 图片上传 */}
        {(contentType === 'image' || contentType === 'text') && (
          <View className={styles.imageUpload}>
            {images.map((img, index) => (
              <View key={index} className={styles.imagePreview}>
                <Image src={img} className={styles.previewImage} mode="aspectFill" />
                <View className={styles.deleteBtn} onClick={() => handleDeleteImage(index)}>
                  <Text className={styles.deleteIcon}>✕</Text>
                </View>
              </View>
            ))}
            {images.length < 9 && (
              <View className={styles.uploadBtn} onClick={handleChooseImage}>
                <Text className={styles.uploadIcon}>📷</Text>
                <Text className={styles.uploadText}>添加图片</Text>
              </View>
            )}
          </View>
        )}

        {/* 视频上传 */}
        {contentType === 'video' && (
          <View className={styles.videoSection}>
            {!videoPath ? (
              <View className={styles.videoUploadBtn} onClick={handleChooseVideo}>
                <Text className={styles.uploadIcon}>🎬</Text>
                <Text className={styles.uploadText}>选择视频</Text>
                <Text className={styles.uploadHint}>最长60秒</Text>
              </View>
            ) : (
              <View className={styles.videoPreview}>
                <Image src={videoThumb} className={styles.videoThumb} mode="aspectFill" />
                <View className={styles.videoPlayIcon}>
                  <Text className={styles.playIcon}>▶</Text>
                </View>
                <View className={styles.deleteBtn} onClick={handleDeleteVideo}>
                  <Text className={styles.deleteIcon}>✕</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* AI 自动摘要 */}
        {(isGeneratingSummary || aiSummary) && (images.length > 0 || videoPath) && (
          <View className={styles.aiSummary}>
            <View className={styles.aiSummaryHeader}>
              <Text className={styles.aiSummaryIcon}>✨</Text>
              <Text className={styles.aiSummaryTitle}>AI 摘要</Text>
              {isGeneratingSummary && <Text className={styles.aiLoading}>生成中...</Text>}
            </View>
            {aiSummary && (
              <Text className={styles.aiSummaryContent}>{aiSummary}</Text>
            )}
          </View>
        )}
      </View>

      {/* 可见范围选择 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>可见范围</Text>
        <View className={styles.visibilityList}>
          <View
            className={`${styles.visibilityBtn} ${visibility === 'private' ? styles.active : ''}`}
            onClick={() => setVisibility('private')}
          >
            <Text className={styles.visibilityText}>🔒 仅自己</Text>
          </View>
          {userCircles.length > 0 && (
            <View
              className={`${styles.visibilityBtn} ${visibility === 'circle' ? styles.active : ''}`}
              onClick={() => setVisibility('circle')}
            >
              <Text className={styles.visibilityText}>👥 团体可见</Text>
            </View>
          )}
          <View
            className={`${styles.visibilityBtn} ${visibility === 'public' ? styles.active : ''}`}
            onClick={() => setVisibility('public')}
          >
            <Text className={styles.visibilityText}>🌍 全部公开</Text>
          </View>
        </View>
      </View>

      {/* 提交按钮 */}
      <View
        className={`${styles.submitBtn} ${submitting ? styles.disabled : ''}`}
        onClick={!submitting ? handleSubmit : undefined}
      >
        <Text className={styles.submitText}>
          {submitting ? '提交中...' : '完成打卡'}
        </Text>
      </View>

      {/* 最近打卡记录 */}
      {recentCheckins.length > 0 && (
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>最近打卡</Text>
          {recentCheckins.map(record => (
            <View key={record.id} className={styles.recordCard}>
              <View className={styles.recordHeader}>
                <Text className={styles.recordCategory}>
                  {CATEGORY_INFO[record.category].icon} {record.subcategory}
                </Text>
                <Text className={styles.recordTime}>{formatTime(record.createdAt)}</Text>
              </View>
              <Text className={styles.recordContent}>{record.content}</Text>
              {record.streakDays > 1 && (
                <View className={styles.recordStreak}>
                  <Text className={styles.recordStreakText}>🔥 连续{record.streakDays}天</Text>
                </View>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

export default CheckinPage;
