import React, { useState, useMemo } from 'react';
import { View, Text, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useInteractionStore, Comment } from '@/store/interaction';
import { validateComment } from '@/utils/sensitive';
import styles from './index.module.scss';

interface CommentSectionProps {
  kindnessId: string;
  // 基础评论数（来自善行数据）
  baseCommentCount: number;
  // 是否展开（默认收起，点击后展开）
  defaultExpanded?: boolean;
}

// 评论氛围引导文案（随机展示一条）
const COMMENT_GUIDES: string[] = [
  '期待"上次我也帮过一个人…"这样的分享',
  '说说你的感受，或分享类似的经历',
  '留下一句温暖的话吧',
  '你的评论，也是一份善意',
];

const CommentSection: React.FC<CommentSectionProps> = ({
  kindnessId,
  baseCommentCount,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const { comments, addComment } = useInteractionStore();
  // 当前善行的评论列表
  const commentList = comments[kindnessId] || [];
  // 总评论数 = 基础数 + 新增数
  const totalCount = baseCommentCount + commentList.length;

  // 随机选择一条引导文案（仅在首次渲染时确定）
  const guideText = useMemo(() => {
    return COMMENT_GUIDES[Math.floor(Math.random() * COMMENT_GUIDES.length)];
  }, []);

  // 格式化时间
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  // 渲染评论内容（高亮 @提及）
  const renderContent = (content: string, mentions: string[]) => {
    if (mentions.length === 0) {
      return <Text className={styles.commentText}>{content}</Text>;
    }
    // 将 @用户名 高亮显示
    const parts: React.ReactNode[] = [];
    const regex = /(@[^\s@,，。.!！?？]+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <Text key={`text-${key++}`} className={styles.commentText}>
            {content.slice(lastIndex, match.index)}
          </Text>
        );
      }
      parts.push(
        <Text key={`mention-${key++}`} className={styles.mentionText}>
          {match[0]}
        </Text>
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push(
        <Text key={`text-${key++}`} className={styles.commentText}>
          {content.slice(lastIndex)}
        </Text>
      );
    }
    return <Text>{parts}</Text>;
  };

  const handleSubmit = () => {
    const result = validateComment(inputValue);
    if (!result.valid) {
      setError(result.reason || '评论内容不合规');
      Taro.showToast({ title: result.reason || '评论内容不合规', icon: 'none' });
      return;
    }

    const addResult = addComment(
      kindnessId,
      inputValue,
      '我',
      'https://picsum.photos/id/64/200/200'
    );

    if (addResult.success) {
      setInputValue('');
      setError('');
      Taro.showToast({ title: '评论成功', icon: 'success' });
      setExpanded(true);
    } else {
      setError(addResult.reason || '评论失败');
      Taro.showToast({ title: addResult.reason || '评论失败', icon: 'none' });
    }
  };

  const handleInputChange = (e: any) => {
    setInputValue(e.detail.value);
    if (error) setError('');
  };

  return (
    <View className={styles.container}>
      {/* 评论数与展开按钮 */}
      <View className={styles.header} onClick={() => setExpanded(!expanded)}>
        <Text className={styles.countText}>💬 {totalCount}条温暖</Text>
        <Text className={styles.toggleText}>{expanded ? '收起' : '查看全部'}</Text>
      </View>

      {/* 评论氛围引导 */}
      <View className={styles.guide}>
        <Text className={styles.guideText}>💡 {guideText}</Text>
      </View>

      {/* 评论输入框 */}
      <View className={styles.inputWrapper}>
        <Input
          className={styles.input}
          type="text"
          placeholder="写下你的温暖回应…支持@提及好友"
          value={inputValue}
          onInput={handleInputChange}
          maxlength={500}
          confirmType="send"
          onConfirm={handleSubmit}
        />
        <View
          className={`${styles.submitBtn} ${inputValue.trim() ? styles.submitBtnActive : ''}`}
          onClick={handleSubmit}
        >
          <Text className={styles.submitBtnText}>发送</Text>
        </View>
      </View>

      {/* 错误提示 */}
      {error && (
        <View className={styles.error}>
          <Text className={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* 评论列表 */}
      {expanded && commentList.length > 0 && (
        <View className={styles.commentList}>
          {commentList.map((comment: Comment) => (
            <View key={comment.id} className={styles.commentItem}>
              <View className={styles.commentAvatarWrapper}>
                <Text className={styles.commentAvatarText}>
                  {comment.userName.charAt(0)}
                </Text>
              </View>
              <View className={styles.commentBody}>
                <View className={styles.commentHeader}>
                  <Text className={styles.commentUserName}>{comment.userName}</Text>
                  <Text className={styles.commentTime}>{formatTime(comment.createdAt)}</Text>
                </View>
                <View className={styles.commentContent}>
                  {renderContent(comment.content, comment.mentions)}
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* 展开状态下的空状态 */}
      {expanded && commentList.length === 0 && (
        <View className={styles.empty}>
          <Text className={styles.emptyText}>还没有评论，来留下第一份温暖吧</Text>
        </View>
      )}
    </View>
  );
};

export default CommentSection;
