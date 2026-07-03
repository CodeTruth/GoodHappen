import React, { useState } from 'react';
import { View, Text, Textarea, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

// 反馈类型选项
const FEEDBACK_TYPES = [
  '功能建议',
  '体验问题',
  '内容建议',
  'BUG反馈',
  '其他',
];

// 预设功能投票列表
const FEATURE_VOTES = [
  { id: 'f1', icon: '🤖', name: 'AI先贤视频对话（实时互动）', votes: 128 },
  { id: 'f2', icon: '📊', name: '善行影响力排行榜（校园版）', votes: 96 },
  { id: 'f3', icon: '🎁', name: '善行积分兑换实体礼品', votes: 85 },
  { id: 'f4', icon: '👥', name: '班级善行PK赛', votes: 72 },
  { id: 'f5', icon: '📱', name: '微信运动步数兑换福气值', votes: 63 },
];

const FeedbackPage: React.FC = () => {
  const [feedbackType, setFeedbackType] = useState('');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [votedFeatures, setVotedFeatures] = useState<Set<string>>(new Set());
  const [featureVotes, setFeatureVotes] = useState(FEATURE_VOTES);
  const [showModal, setShowModal] = useState(false);

  const canSubmit = feedbackType && content.trim().length >= 10;

  const handleSubmit = () => {
    if (!canSubmit) {
      Taro.showToast({ title: '请选择类型并填写至少10字内容', icon: 'none' });
      return;
    }
    // 模拟提交
    setShowModal(true);
  };

  const handleVote = (featureId: string) => {
    if (votedFeatures.has(featureId)) return;
    setVotedFeatures(prev => {
      const next = new Set(prev);
      next.add(featureId);
      return next;
    });
    setFeatureVotes(prev =>
      prev.map(f => f.id === featureId ? { ...f, votes: f.votes + 1 } : f)
    );
  };

  const handleCloseModal = () => {
    setShowModal(false);
    // 返回上一页
    Taro.navigateBack();
  };

  return (
    <View className={styles.pageWrapper}>
      <ScrollView scrollY>
        {/* 意见反馈表单 */}
        <View className={styles.sectionCard}>
          <Text className={styles.sectionTitle}>意见反馈</Text>

          {/* 反馈类型选择 */}
          <View className={styles.formGroup}>
            <Text className={styles.formLabel}>反馈类型</Text>
            <View className={styles.typeSelector}>
              {FEEDBACK_TYPES.map((type) => (
                <Text
                  key={type}
                  className={`${styles.typeOption} ${feedbackType === type ? styles.typeOptionActive : ''}`}
                  onClick={() => setFeedbackType(type)}
                >
                  {type}
                </Text>
              ))}
            </View>
          </View>

          {/* 反馈内容 */}
          <View className={styles.formGroup}>
            <Text className={styles.formLabel}>详细描述</Text>
            <View className={styles.textareaWrapper}>
              <Textarea
                className={styles.textarea}
                value={content}
                onInput={(e) => setContent(e.detail.value)}
                placeholder="请详细描述您的建议或遇到的问题（至少10个字）"
                maxlength={500}
              />
              <Text className={styles.textareaCounter}>{content.length}/500</Text>
            </View>
          </View>

          {/* 联系方式 */}
          <View className={styles.formGroup}>
            <Text className={styles.formLabel}>联系方式（选填）</Text>
            <Input
              className={styles.input}
              value={contact}
              onInput={(e) => setContact(e.detail.value)}
              placeholder="手机号 / 微信号 / 邮箱"
            />
          </View>

          {/* 提交按钮 */}
          <View
            className={`${styles.submitBtn} ${!canSubmit ? styles.submitBtnDisabled : ''}`}
            onClick={handleSubmit}
          >
            <Text>提交反馈</Text>
          </View>
        </View>

        {/* 想要的功能投票列表 */}
        <View className={styles.sectionCard}>
          <Text className={styles.sectionTitle}>想要的功能</Text>
          <Text style={{
            fontSize: '22rpx',
            color: '#9E8E7E',
            marginBottom: '24rpx',
            display: 'block',
            lineHeight: 1.6,
          }}>
            为你最期待的功能投票，我们将优先开发高票功能
          </Text>
          <View className={styles.featureList}>
            {featureVotes.map((feature) => {
              const isVoted = votedFeatures.has(feature.id);
              return (
                <View
                  key={feature.id}
                  className={`${styles.featureItem} ${isVoted ? styles.featureItemVoted : ''}`}
                  onClick={() => handleVote(feature.id)}
                >
                  <View className={styles.featureInfo}>
                    <Text className={styles.featureIcon}>{feature.icon}</Text>
                    <Text className={styles.featureName}>{feature.name}</Text>
                  </View>
                  <View style={{ display: 'flex', alignItems: 'center' }}>
                    <Text
                      className={`${styles.featureVoteBtn} ${isVoted ? styles.featureVoteBtnVoted : ''}`}
                    >
                      {isVoted ? '已投票' : '投票'}
                    </Text>
                    <Text className={styles.featureVoteCount}>{feature.votes}票</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* 感谢弹窗 */}
      {showModal && (
        <View className={styles.overlay} onClick={handleCloseModal}>
          <View className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalIcon}>🙏</Text>
            <Text className={styles.modalTitle}>感谢你的反馈</Text>
            <Text className={styles.modalDesc}>
              每一条反馈我们都会认真阅读{'\n'}
              你的建议帮助我们变得更好{'\n'}
              愿善意温暖常在
            </Text>
            <View className={styles.modalBtn} onClick={handleCloseModal}>
              <Text>我知道了</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default FeedbackPage;