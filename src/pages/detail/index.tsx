import React, { useEffect, useState, useMemo, useRef } from 'react';
import { View, Text, Image, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { Kindness } from '@/types/kindness';
import { getKindnessById } from '@/data/kindness';
import { useKindnessStore } from '@/store/kindness';

// 本地定义（原 @/data/mockComments 已移除）
interface MockComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}
const getMockComments = (_kindnessId: string): MockComment[] => [];
import { useInteractionStore } from '@/store/interaction';
import { useNotificationStore } from '@/store/notification';
import { useProtectionStore } from '@/store/protection';
import { detectRisk, isRepresentative, generateLearnSummary } from '@/services/risk-detection';
import styles from './index.module.scss';

// AI 人设图标映射
const PERSONA_ICONS: Record<string, string> = {
  sudongpo: '📜',
  confucius: '🎓',
  libai: '🍷',
  dufu: '🏚️',
  zhuangzi: '🦋',
  liqingzhao: '🌸',
  taoyuanming: '🌾',
  wangwei: '🏔️',
};

const DetailPage: React.FC = () => {
  const router = useRouter();
  const { id } = router.params;
  const [kindness, setKindness] = useState<Kindness | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sosLoading, setSosLoading] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [aiMatchResults, setAiMatchResults] = useState<{
    count: number;
    avgConfidence: number;
    summary: string;
  } | null>(null);
  const [witnessStatus, setWitnessStatus] = useState<{
    matchCount: number;
    evidenceChainFormed: boolean;
  } | null>(null);

  const sosTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 从 store 获取已发布的善行（用于查找用户自己发布的）
  const publishedList = useKindnessStore((s) => s.publishedList);
  // 互动 store
  const { hasLiked, toggleLike, getLikeCount, getCommentCount, addComment, getCommentList } = useInteractionStore();
  const { addNotification, isDndActive } = useNotificationStore();
  const {
    sosRecords,
    getWitnessMatchBySos,
    triggerSOS: storeTriggerSOS,
    getAIMatchResults,
  } = useProtectionStore();

  useEffect(() => {
    if (id) {
      // 优先从 store 中查找（用户自己发布的）
      const storeItem = publishedList.find((k) => k.id === id);
      if (storeItem) {
        setKindness(storeItem);
        return;
      }
      // 再从 mock 数据中查找
      const mockItem = getKindnessById(id);
      if (mockItem) {
        setKindness(mockItem);
      } else {
        setNotFound(true);
      }
    }
  }, [id, publishedList]);

  useEffect(() => {
    if (!kindness || kindness.type !== 'self') return;
    // 检查是否已有 SOS 记录
    const existingSos = sosRecords.find(s => s.recordId === kindness.id);
    if (existingSos) {
      setSosActive(true);
      const match = getWitnessMatchBySos(existingSos.id);
      if (match) {
        setWitnessStatus({
          matchCount: match.witnessRecordIds.length,
          evidenceChainFormed: match.evidenceChainFormed,
        });
      }
      // 获取 AI 匹配结果
      const aiResults = getAIMatchResults(existingSos.id);
      if (aiResults && aiResults.length > 0) {
        const avgConfidence = aiResults.reduce((sum, r) => sum + r.overallConfidence, 0) / aiResults.length;
        setAiMatchResults({
          count: aiResults.length,
          avgConfidence: Math.round(avgConfidence * 100),
          summary: aiResults[0]?.aiSummary || 'AI见证匹配完成',
        });
      }
    }
  }, [kindness?.id, sosRecords]);

  useEffect(() => {
    return () => {
      if (sosTimerRef.current) {
        clearTimeout(sosTimerRef.current);
        sosTimerRef.current = null;
      }
    };
  }, []);

  // Mock 评论数据
  const mockComments = useMemo<MockComment[]>(() => {
    if (!kindness) return [];
    return getMockComments(kindness.id);
  }, [kindness]);

  // 合并评论：真实评论优先，Mock 评论作为兜底
  const allComments = useMemo(() => {
    const userComments = getCommentList(kindness?.id || '').map(c => ({
      id: c.id,
      userId: c.userId,
      userName: c.userName,
      userAvatar: (c as any).userAvatar || '',
      content: c.content,
      createdAt: c.createdAt,
    }));
    // 如果有用户提交的真实评论，优先展示真实的；仅当真实评论为空时才展示Mock
    if (userComments.length > 0) {
      return userComments;
    }
    return mockComments;
  }, [mockComments, kindness?.id, getCommentList]);

  // 格式化时间
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr; // 无效日期直接返回原字符串
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // 点赞逻辑
  const handleLike = () => {
    if (!kindness) return;
    const isLiking = toggleLike(kindness.id, displayName, displayAvatar);
    if (isLiking && !isDndActive() && !isAnonymous) {
      addNotification({
        category: 'interaction',
        type: 'like',
        title: '新的温暖',
        content: `你被 ${displayName} 的善行温暖到了`,
        relatedId: kindness.id,
      });
    }
  };

  // 评论提交
  const handleComment = () => {
    if (!kindness || !commentText.trim()) return;
    const result = addComment(
      kindness.id,
      commentText.trim(),
      '我',
      'https://picsum.photos/id/64/200/200'
    );
    if (result.success) {
      setCommentText('');
      Taro.showToast({ title: '评论成功', icon: 'success' });
    } else {
      Taro.showToast({ title: result.reason || '评论失败', icon: 'none' });
    }
  };

  // 分享
  const handleShare = () => {
    Taro.showToast({ title: '已复制链接', icon: 'success' });
  };

  // 根据善行内容检测风险场景（事前学习）—— 仅代表性善行展示
  const learnInfo = useMemo(() => {
    if (!kindness) return null;
    const scenario = detectRisk(kindness.content);
    const { representative, reason, twistScore } = isRepresentative(kindness.content, scenario);
    if (!representative || !scenario) return null;
    const summary = generateLearnSummary(scenario, twistScore);
    return { scenario, reason, twistScore, summary };
  }, [kindness?.content]);

  const handleTriggerSOS = () => {
    if (!kindness) return;
    
    Taro.showModal({
      title: '⚠️ 确认发起求助',
      content: '发起后系统将自动锁存当前善行记录，扫描事发时段±30分钟、半径100米内的见证网络。',
      confirmText: '确认发起',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          setSosLoading(true);
          sosTimerRef.current = setTimeout(() => {
            try {
              storeTriggerSOS(kindness.id, '用户手动发起善行保护求助')
                .then((res) => {
                  if (res.success) {
                    setSosActive(true);
                    setSosLoading(false);
                    Taro.showToast({ title: '已锁定证据，正在扫描见证网络', icon: 'none' });
                  } else {
                    setSosLoading(false);
                    Taro.showToast({ title: res.message || '发起失败', icon: 'none' });
                  }
                })
                .catch(() => {
                  setSosLoading(false);
                  Taro.showToast({ title: '发起失败', icon: 'none' });
                });
            } catch (e) {
              setSosLoading(false);
              Taro.showToast({ title: '发起失败', icon: 'none' });
            }
          }, 800);
        }
      },
    });
  };

  // 加载中
  if (!kindness && !notFound) {
    return (
      <View className={styles.container}>
        <View className={styles.loading}>
          <Text className={styles.loadingText}>加载中...</Text>
        </View>
      </View>
    );
  }

  // 不存在
  if (notFound) {
    return (
      <View className={styles.container}>
        <View className={styles.notFound}>
          <Text className={styles.notFoundIcon}>😢</Text>
          <Text className={styles.notFoundText}>善行不存在</Text>
          <Text className={styles.notFoundSub}>该善行可能已被删除或链接无效</Text>
        </View>
      </View>
    );
  }

  if (!kindness) return null;

  // 实时数据
  const currentLikes = getLikeCount(kindness.id, kindness.likes);
  const currentComments = getCommentCount(kindness.id, kindness.comments);
  const liked = hasLiked(kindness.id);

  const {
    userName,
    userAvatar,
    content,
    type,
    tags,
    images,
    location,
    aiResponse,
    blessingValue,
    createdAt,
    isAnonymous,
  } = kindness;

  // 匿名展示
  const displayName = isAnonymous ? '善行使者' : userName;
  const displayAvatar = isAnonymous
    ? 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna4FI272DgxhvKb0S2pMvNJxR2U7kM4GHRt51oWqSKMxLvW6F7Q5GyB9DPiaNJ4V0AvfK8p2nOQ/0'
    : userAvatar;

  return (
    <View className={styles.container}>
      {/* ===== 善行内容区 ===== */}
      <View className={styles.card}>
        {/* 用户信息 */}
        <View className={styles.header}>
          <Image src={displayAvatar} className={styles.avatar} mode="aspectFill" />
          <View className={styles.userInfo}>
            <View style={{ display: 'flex', alignItems: 'center' }}>
              <Text className={styles.userName}>{displayName}</Text>
              {isAnonymous && (
                <Text style={{ fontSize: '20rpx', color: '#9E8E7E', background: '#F0EDE8', padding: '2rpx 10rpx', borderRadius: '8rpx', marginLeft: '8rpx' }}>匿名</Text>
              )}
            </View>
            <Text className={styles.meta}>
              {type === 'witness' ? '我见证的温暖' : '善行记录'} · {formatDate(createdAt)}
            </Text>
          </View>
          {type === 'self' && blessingValue > 0 && (
            <View className={styles.blessingTag}>
              <Text className={styles.blessingText}>+{blessingValue} 福气</Text>
            </View>
          )}
        </View>

        {/* 善行正文 */}
        <View className={styles.content}>
          <Text className={styles.textContent}>{content}</Text>
        </View>

        {/* 标签 */}
        {tags && tags.length > 0 && (
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
                onClick={() => Taro.previewImage({ urls: images, current: img })}
              />
            ))}
          </View>
        )}

        {/* 位置信息 */}
        {location && (
          <View className={styles.location}>
            <Text className={styles.locationText}>📍 {location}</Text>
          </View>
        )}
      </View>

      {/* ===== AI 共鸣区（核心亮点） ===== */}
      {aiResponse && (
        <View className={styles.aiSection}>
          <View className={styles.aiBadge}>
            <Text className={styles.aiBadgeText}>AI 共鸣</Text>
          </View>
          <View className={styles.aiCard}>
            <View className={styles.aiHeader}>
              <View className={styles.aiPersonaIcon}>
                <Text className={styles.aiPersonaEmoji}>
                  {PERSONA_ICONS[aiResponse.persona] || '🤖'}
                </Text>
              </View>
              <View className={styles.aiPersonaInfo}>
                <Text className={styles.aiPersonaName}>{aiResponse.personaName}</Text>
                <Text className={styles.aiPersonaTime}>{formatDate(aiResponse.createdAt)}</Text>
              </View>
            </View>
            <View className={styles.aiDivider} />
            <Text className={styles.aiContent}>{aiResponse.content}</Text>
          </View>
        </View>
      )}

      {/* ===== 事前学习：从他人善行中学习风险防护 ===== */}
      {learnInfo && (
        <View className={styles.learnCard}>
          <View className={styles.learnHeader}>
            <Text className={styles.learnIcon}>📚</Text>
            <Text className={styles.learnTitle}>事前学习</Text>
            <View className={styles.learnTag} style={{ background: learnInfo.scenario.color }}>
              <Text className={styles.learnTagText}>{learnInfo.scenario.icon} {learnInfo.scenario.category}</Text>
            </View>
          </View>
          <View className={styles.learnReason}>
            <Text className={styles.learnReasonIcon}>💡</Text>
            <Text className={styles.learnReasonText}>{learnInfo.reason}</Text>
          </View>
          <Text className={styles.learnDesc}>{learnInfo.summary}</Text>
          <View className={styles.learnAdviceList}>
            {learnInfo.scenario.advice.map((advice, index) => (
              <View key={index} className={styles.learnAdviceItem}>
                <Text className={styles.learnAdviceNum}>{index + 1}</Text>
                <Text className={styles.learnAdviceText}>{advice}</Text>
              </View>
            ))}
          </View>
          <View className={styles.learnAction} onClick={() => Taro.navigateTo({ url: '/pages/record/index' })}>
            <Text className={styles.learnActionText}>🛡️ 我也要做这件事 → 先开启保护</Text>
          </View>
        </View>
      )}

      {/* ===== 互动数据概览 ===== */}
      <View className={styles.statsBar}>
        <View className={styles.statItem}>
          <Text className={styles.statIcon}>🤍</Text>
          <Text className={styles.statValue}>{currentLikes}</Text>
          <Text className={styles.statLabel}>被温暖到</Text>
        </View>
        <View className={styles.statDivider} />
        <View className={styles.statItem}>
          <Text className={styles.statIcon}>💬</Text>
          <Text className={styles.statValue}>{currentComments}</Text>
          <Text className={styles.statLabel}>温暖回应</Text>
        </View>
        <View className={styles.statDivider} />
        <View className={styles.statItem}>
          <Text className={styles.statIcon}>✨</Text>
          <Text className={styles.statValue}>{blessingValue}</Text>
          <Text className={styles.statLabel}>福气值</Text>
        </View>
      </View>

      {/* ===== 善行保护 / SOS 区域 ===== */}
      {kindness.type === 'self' && (
        <View className={styles.protectionSection}>
          {sosActive ? (
            /* 已发起 SOS 状态 */
            <View className={styles.sosActiveCard}>
              <View className={styles.sosActiveHeader}>
                <Text className={styles.sosActiveIcon}>🛡️</Text>
                <Text className={styles.sosActiveTitle}>善行已被保护</Text>
              </View>
              {witnessStatus && (
                <View className={styles.sosActiveStats}>
                  <View className={styles.sosActiveStat}>
                    <Text className={styles.sosActiveStatValue}>{witnessStatus.matchCount}</Text>
                    <Text className={styles.sosActiveStatLabel}>见证记录</Text>
                  </View>
                  <View className={styles.sosActiveDivider} />
                  <View className={styles.sosActiveStat}>
                    <Text className={styles.sosActiveStatValue}>
                      {witnessStatus.evidenceChainFormed ? '✅' : '⏳'}
                    </Text>
                    <Text className={styles.sosActiveStatLabel}>证据链</Text>
                  </View>
                </View>
              )}
              <View
                className={styles.sosViewDetail}
                onClick={() => Taro.navigateTo({ url: `/pages/witness-network/index` })}
              >
                <Text className={styles.sosViewDetailText}>查看见证详情 →</Text>
              </View>
            </View>
          ) : (
            /* 未发起 SOS */
            <View className={styles.sosTriggerCard}>
              <View className={styles.sosTriggerContent}>
                <Text className={styles.sosTriggerIcon}>🛡️</Text>
                <View className={styles.sosTriggerTextWrapper}>
                  <Text className={styles.sosTriggerTitle}>善行保护</Text>
                  <Text className={styles.sosTriggerDesc}>
                    被误解或遭遇不公？善行见证网络帮你还原真相
                  </Text>
                </View>
              </View>
              <View
                className={`${styles.sosTriggerBtn} ${sosLoading ? styles.sosLoadingBtn : ''}`}
                onClick={sosLoading ? undefined : handleTriggerSOS}
              >
                <Text className={styles.sosTriggerBtnText}>
                  {sosLoading ? '发起中...' : '我被讹了'}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ===== 我要见证（非本人善行，一键见证） ===== */}
      {kindness.type !== 'self' && (
        <View className={styles.witnessTriggerSection}>
          <View className={styles.witnessTriggerCard}>
            <View className={styles.witnessTriggerContent}>
              <Text className={styles.witnessTriggerIcon}>👁️</Text>
              <View className={styles.witnessTriggerTextWrapper}>
                <Text className={styles.witnessTriggerTitle}>我要见证</Text>
                <Text className={styles.witnessTriggerDesc}>
                  你亲眼目睹了这件事？立即记录见证，为善行留下真实证据
                </Text>
              </View>
            </View>
            <View
              className={styles.witnessTriggerBtn}
              onClick={() => Taro.navigateTo({
                url: `/pages/record/index?mode=witness&refKindnessId=${kindness.id}`
              })}
            >
              <Text className={styles.witnessTriggerBtnText}>📷 立即见证</Text>
            </View>
          </View>
        </View>
      )}

      {/* ===== 善行保障中心 - 流程可视化 ===== */}
      {kindness.type === 'self' && (
        <View className={styles.safetyCenterCard}>
          <View className={styles.safetyCenterHeader}>
            <Text className={styles.safetyCenterTitle}>🛡️ 善行保障中心</Text>
            <Text className={styles.safetyCenterSub}>行善无忧，系统兜底</Text>
          </View>

          {/* 流程进度条 */}
          <View className={styles.safetyFlow}>
            {/* 步骤1: SOS */}
            <View className={styles.safetyFlowStep}>
              <View className={`${styles.safetyFlowDot} ${sosActive ? styles.safetyFlowDotDone : styles.safetyFlowDotActive}`}>
                <Text className={styles.safetyFlowDotInner}>{sosActive ? '✅' : '🆘'}</Text>
              </View>
              <View className={styles.safetyFlowContent}>
                <Text className={styles.safetyFlowStepTitle}>SOS 紧急求助</Text>
                <Text className={styles.safetyFlowStepDesc}>
                  {sosActive ? '已发起求助，正在扫描见证网络' : '被误解或遭遇不公时一键发起'}
                </Text>
                {sosActive && witnessStatus && (
                  <View className={styles.safetyFlowData}>
                    <Text className={styles.safetyFlowDataItem}>
                      见证记录: <Text className={styles.safetyFlowDataValue}>{witnessStatus.matchCount}条</Text>
                    </Text>
                    <Text className={styles.safetyFlowDataItem}>
                      证据链: <Text className={styles.safetyFlowDataValue}>{witnessStatus.evidenceChainFormed ? '已形成' : '收集中'}</Text>
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* 步骤2: 证据锁定 */}
             <View className={styles.safetyFlowStep}>
               <View className={`${styles.safetyFlowDot} ${styles.safetyFlowDotPending}`}>
                 <Text className={styles.safetyFlowDotInner}>🔒</Text>
               </View>
               <View className={styles.safetyFlowContent}>
                 <Text className={styles.safetyFlowStepTitle}>证据锁定</Text>
                 <Text className={styles.safetyFlowStepDesc}>自动锁定善行时段±30分钟、半径100米内见证数据</Text>
                 <View className={styles.safetyFlowData}>
                   <Text className={styles.safetyFlowDataItem}>
                     见证网络: <Text className={styles.safetyFlowDataValue}>{witnessStatus ? `${witnessStatus.matchCount}条记录` : '待触发'}</Text>
                   </Text>
                 </View>
                 {aiMatchResults && (
                   <View className={styles.safetyFlowData}>
                     <Text className={styles.safetyFlowDataItem}>
                       AI见证匹配: <Text className={styles.safetyFlowDataValue}>{aiMatchResults.count}条结果 · 置信度{aiMatchResults.avgConfidence}%</Text>
                     </Text>
                     {aiMatchResults.summary && (
                       <Text className={styles.safetyFlowDataItem}>
                         {aiMatchResults.summary}
                       </Text>
                     )}
                   </View>
                 )}
               </View>
             </View>

            {/* 步骤3: 律师匹配 */}
            <View className={styles.safetyFlowStep}>
              <View className={`${styles.safetyFlowDot} ${styles.safetyFlowDotPending}`}>
                <Text className={styles.safetyFlowDotInner}>⚖️</Text>
              </View>
              <View className={styles.safetyFlowContent}>
                <Text className={styles.safetyFlowStepTitle}>法律援助</Text>
                <Text className={styles.safetyFlowStepDesc}>专业律师团队提供绿色通道</Text>
                <View
                  className={styles.safetyFlowAction}
                  onClick={() => Taro.navigateTo({ url: '/pages/legal-aid/index' })}
                >
                  <Text className={styles.safetyFlowActionText}>前往法律援助 →</Text>
                </View>
              </View>
            </View>

            {/* 步骤4: 保险理赔 */}
            <View className={styles.safetyFlowStep}>
              <View className={`${styles.safetyFlowDot} ${styles.safetyFlowDotPending}`}>
                <Text className={styles.safetyFlowDotInner}>🏥</Text>
              </View>
              <View className={styles.safetyFlowContent}>
                <Text className={styles.safetyFlowStepTitle}>保险理赔</Text>
                <Text className={styles.safetyFlowStepDesc}>行善过程中受损，可申请保障理赔</Text>
                <View
                  className={styles.safetyFlowAction}
                  onClick={() => Taro.navigateTo({ url: '/pages/insurance/index' })}
                >
                  <Text className={styles.safetyFlowActionText}>申请理赔 →</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ===== 评论区 ===== */}
      <View className={styles.commentSection}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>温暖回应 ({currentComments})</Text>
        </View>

        {/* 评论列表 */}
        {allComments.length > 0 ? (
          <View className={styles.commentList}>
            {allComments.map((comment) => (
              <View key={comment.id} className={styles.commentItem}>
                <Image
                  src={comment.userAvatar}
                  className={styles.commentAvatar}
                  mode="aspectFill"
                />
                <View className={styles.commentBody}>
                  <View className={styles.commentHeader}>
                    <Text className={styles.commentUserName}>{comment.userName}</Text>
                    <Text className={styles.commentTime}>
                      {formatDate(comment.createdAt)}
                    </Text>
                  </View>
                  <Text className={styles.commentContent}>{comment.content}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View className={styles.commentEmpty}>
            <Text className={styles.commentEmptyText}>暂无评论，来说点什么吧</Text>
          </View>
        )}
      </View>

      {/* ===== 底部占位（为固定底部栏留空间） ===== */}
      <View className={styles.bottomPlaceholder} />

      {/* ===== 底部操作栏（固定） ===== */}
      <View className={styles.bottomBar}>
        <View
          className={`${styles.likeBtn} ${liked ? styles.likeBtnActive : ''}`}
          onClick={handleLike}
        >
          <Text className={styles.likeBtnIcon}>{liked ? '❤️' : '🤍'}</Text>
          <Text className={styles.likeBtnText}>
            {liked ? '已温暖' : '被温暖到'}
            {currentLikes > 0 && <Text className={styles.likeCount}> {currentLikes}</Text>}
          </Text>
        </View>
        <View className={styles.commentInputWrapper}>
          <Input
            className={styles.commentInput}
            type="text"
            placeholder="写下你的温暖回应..."
            value={commentText}
            onInput={(e: any) => setCommentText(e.detail.value)}
            maxlength={500}
            confirmType="send"
            onConfirm={handleComment}
          />
        </View>
        <View className={styles.shareBtn} onClick={handleShare}>
          <Text className={styles.shareBtnIcon}>↗</Text>
        </View>
      </View>
    </View>
  );
};

export default DetailPage;
