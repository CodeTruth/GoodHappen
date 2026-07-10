import React, { useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import { Kindness } from '@/types/kindness';
import { useInteractionStore } from '@/store/interaction';
import { useNotificationStore } from '@/store/notification';
import CommentSection from '@/components/CommentSection';
import styles from './index.module.scss';

interface KindnessCardProps {
  kindness: Kindness;
  onClick?: () => void;
  // 是否显示评论区域（详情页显示，列表页可配置）
  showComment?: boolean;
}

const KindnessCard: React.FC<KindnessCardProps> = ({ kindness, onClick, showComment = false }) => {
  const { id, userName, userAvatar, content, type, tags, images, location, aiResponse, blessingValue, likes, comments, createdAt, isAnonymous } = kindness;
  // 匿名展示
  const displayName = isAnonymous ? '善行使者' : userName;
  const displayAvatar = isAnonymous
    ? 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna4FI272DgxhvKb0S2pMvNJxR2U7kM4GHRt51oWqSKMxLvW6F7Q5GyB9DPiaNJ4V0AvfK8p2nOQ/0'
    : userAvatar;

  // 点赞与评论状态
  const { hasLiked, toggleLike, getLikeCount, getCommentCount } = useInteractionStore();
  const { addNotification, isDndActive } = useNotificationStore();

  const [commentExpanded, setCommentExpanded] = useState(showComment);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    if (hours < 48) return '昨天';
    return date.toLocaleDateString('zh-CN');
  };

  // 实时点赞数
  const currentLikes = getLikeCount(id, likes);
  // 实时评论数
  const currentComments = getCommentCount(id, comments);
  // 当前用户是否已点赞
  const liked = hasLiked(id);

  const handleLikeClick = (e: any) => {
    // 阻止事件冒泡（避免触发卡片点击）
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    const isLiking = toggleLike(id, displayName, displayAvatar);
    // 点赞后发送通知（非免打扰时段，匿名不发送）
    if (isLiking && !isDndActive() && !isAnonymous) {
      addNotification({
        category: 'interaction',
        type: 'like',
        title: '新的温暖',
        content: `你被 ${displayName} 的善行温暖到了 🤍`,
        relatedId: id,
      });
    }
  };

  const handleCommentToggle = (e: any) => {
    if (e && e.stopPropagation) {
      e.stopPropagation();
    }
    setCommentExpanded(!commentExpanded);
  };

  return (
    <View className={styles.card} onClick={onClick}>
      {/* 用户信息 */}
      <View className={styles.header}>
        <Image
          src={displayAvatar}
          className={styles.avatar}
          mode="aspectFill"
          lazyLoad
        />
        <View className={styles.userInfo}>
          <Text className={styles.userName}>{displayName}</Text>
          {isAnonymous && <Text className={styles.anonymousBadge}>匿名</Text>}
          <Text className={styles.meta}>
            {type === 'witness' ? '我见证的温暖' : '善行记录'} · {formatDate(createdAt)}
          </Text>
        </View>
        {type === 'self' && blessingValue > 0 && (
          <View className={styles.blessingTag}>
            <Text className={styles.blessingText}>+{blessingValue}福气</Text>
          </View>
        )}
      </View>

      {/* 内容 */}
      <View className={styles.content}>
        <Text className={styles.textContent}>{content}</Text>
      </View>

      {/* 标签 */}
      {tags.length > 0 && (
        <View className={styles.tags}>
          {tags.map((tag, index) => (
            <View key={index} className={styles.tag}>
              <Text className={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 图片 */}
      {images && images.length > 0 && (
        <View className={styles.images}>
          {images.map((img, index) => (
            <Image
              key={index}
              src={img}
              className={styles.image}
              mode="aspectFill"
              lazyLoad
            />
          ))}
        </View>
      )}

      {/* 位置 */}
      {location && (
        <View className={styles.location}>
          <Text className={styles.locationText}>📍 {location}</Text>
        </View>
      )}

      {/* AI共鸣 */}
      {aiResponse && (
        <View className={styles.aiResponse}>
          <View className={styles.aiHeader}>
            <Text className={styles.aiPersona}>🏛️ {aiResponse.personaName}回应</Text>
          </View>
          <Text className={styles.aiContent}>{aiResponse.content}</Text>
        </View>
      )}

      {/* 底部操作栏 */}
      <View className={styles.footer}>
        <View
          className={`${styles.action} ${styles.likeAction} ${liked ? styles.liked : ''}`}
          onClick={handleLikeClick}
        >
          <Text className={styles.actionIcon}>{liked ? '❤️' : '🤍'}</Text>
          <Text className={styles.actionText}>
            被温暖到 {currentLikes > 0 ? currentLikes : ''}
          </Text>
        </View>
        <View
          className={styles.action}
          onClick={handleCommentToggle}
        >
          <Text className={styles.actionIcon}>💬</Text>
          <Text className={styles.actionText}>{currentComments}</Text>
        </View>
      </View>

      {/* 评论区 */}
      {commentExpanded && (
        <CommentSection
          kindnessId={id}
          baseCommentCount={comments}
          defaultExpanded={true}
        />
      )}
    </View>
  );
};

export default KindnessCard;
