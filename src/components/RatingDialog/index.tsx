import Taro from '@tarojs/taro';
import React, { useState } from 'react';
import { View, Text, Textarea } from '@tarojs/components';
import { useCharityStore } from '@/store/charity';
import { useUserStore } from '@/store/user';
import { CharityNeed } from '@/types/charity';
import styles from './index.module.scss';

interface RatingDialogProps {
  need: CharityNeed;
  visible: boolean;
  onClose: () => void;
  onRated?: () => void;
}

// 双方互评弹窗
// - 发布者 → 接单者：服务质量 1-5星 + 简短文字
// - 接单者 → 发布者：沟通配合 1-5星 + 简短文字
const RatingDialog: React.FC<RatingDialogProps> = ({ need, visible, onClose, onRated }) => {
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [hoverScore, _setHoverScore] = useState(0);
  const { rateNeed } = useCharityStore();
  const { userInfo } = useUserStore();
  const userId = userInfo?.id || 'currentUser';

  if (!visible) return null;

  // 判断当前用户角色
  const isPublisher = need.publisherId === userId;
  const isAccepter = need.accepterId === userId;

  if (!isPublisher && !isAccepter) return null;

  // 评价维度文案
  const dimensionLabel = isPublisher ? '服务质量' : '沟通配合';
  const targetName = isPublisher ? need.accepterName : need.publisherName;
  const targetAvatar = isPublisher ? need.accepterAvatar : need.publisherAvatar;

  // 星级文案
  const scoreLabels = ['很差', '较差', '一般', '满意', '非常满意'];
  const displayScore = hoverScore || score;

  const handleSubmit = () => {
    const result = rateNeed(need.id, score, comment);
    if (result.success) {
      onRated?.();
      onClose();
    } else {
      Taro.showToast({ title: result.message || '评价失败', icon: 'none' });
    }
  };

  return (
    <View className={styles.mask} onClick={onClose}>
      <View className={styles.dialog} catchMove onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <View className={styles.header}>
          <Text className={styles.title}>互评</Text>
          <Text className={styles.subtitle}>
            你的评价是温暖故事的参考维度
          </Text>
        </View>

        {/* 评价对象 */}
        <View className={styles.targetInfo}>
          <Text className={styles.targetAvatar}>👤</Text>
          <View className={styles.targetMeta}>
            <Text className={styles.targetName}>{targetName || '对方'}</Text>
            <Text className={styles.targetRole}>
              {isPublisher ? '接单者' : '发布者'}
            </Text>
          </View>
        </View>

        {/* 评价维度 */}
        <View className={styles.dimension}>
          <Text className={styles.dimensionLabel}>{dimensionLabel}</Text>
          <View className={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Text
                key={star}
                className={`${styles.star} ${star <= displayScore ? styles.starActive : ''}`}
                onClick={() => setScore(star)}
                // hover 模拟（小程序无 hover，用点击预选）
              >
                {star <= displayScore ? '★' : '☆'}
              </Text>
            ))}
          </View>
          <Text className={styles.scoreLabel}>{scoreLabels[displayScore - 1]}</Text>
        </View>

        {/* 评价内容 */}
        <View className={styles.commentSection}>
          <Text className={styles.commentLabel}>简短评价（可选）</Text>
          <Textarea
            className={styles.textarea}
            placeholder="写下你的感受，让温暖被看见..."
            value={comment}
            onInput={(e) => setComment(e.detail.value)}
            maxlength={100}
            showConfirmBar={false}
          />
          <Text className={styles.charCount}>{comment.length}/100</Text>
        </View>

        {/* 操作按钮 */}
        <View className={styles.actions}>
          <View className={styles.cancelBtn} onClick={onClose}>
            <Text className={styles.cancelText}>稍后评价</Text>
          </View>
          <View className={styles.submitBtn} onClick={handleSubmit}>
            <Text className={styles.submitText}>提交评价</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default RatingDialog;
