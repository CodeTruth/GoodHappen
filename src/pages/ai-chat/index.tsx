import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import { PERSONAS, PersonaType } from '@/services/ai';
import {
  ChatSession,
  ChatMode,
  createChatSession,
  addMessageToSession,
  sendChatMessageStream,
  getQuickTopics,
} from '@/services/ai-chat';
import { useMoralTaskStore } from '@/store/moral-task';
import { getRanking } from '@/services/moral-dashboard';
import styles from './index.module.scss';

const MODE_LABELS: Record<ChatMode, string> = {
  counsel: '解惑疏导',
  discuss: '探讨交流',
  guide: '引导向善',
  free: '自由聊天',
};

const MODE_EMOJIS: Record<ChatMode, string> = {
  counsel: '🌿',
  discuss: '📖',
  guide: '✨',
  free: '💬',
};

const AiChatPage: React.FC = () => {
  const router = useRouter();
  const personaId = (router.params.persona as PersonaType) || 'sudongpo';
  const initialMode = (router.params.mode as ChatMode) || 'free';

  const persona = PERSONAS.find(p => p.id === personaId);
  const [session, setSession] = useState<ChatSession>(() =>
    createChatSession(personaId, initialMode)
  );
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<ChatMode>(initialMode);
  const scrollViewRef = useRef<any>(null);

  const quickTopics = getQuickTopics(personaId);

  // 检测用户圈子贡献，生成专属表扬语
  const getCirclePraise = useCallback(() => {
    const { getSubmissionsByUser } = useMoralTaskStore.getState();
    const currentUserId = 'currentUser';

    // 获取用户在各个圈子的提交
    const circleIds = ['circle1', 'circle2', 'circle3'];
    let exampleCount = 0;
    let isTopRank = false;

    for (const cid of circleIds) {
      const subs = getSubmissionsByUser(currentUserId, cid);
      const examples = subs.filter((s) => s.isExample).length;
      if (examples > 0) {
        exampleCount += examples;
      }

      // 检查是否排行第一
      const ranking = getRanking(cid);
      if (ranking.length > 0 && ranking[0].userId === currentUserId) {
        isTopRank = true;
      }
    }

    if (exampleCount > 0 && isTopRank) {
      return `听闻你近日在圈子中表现优异，被标记为榜样${exampleCount}次，且位列排行之首，实在令人欣慰！`;
    } else if (exampleCount > 0) {
      return `听闻你近日在圈子中被标记为榜样${exampleCount}次，善行有目共睹，令人欣慰！`;
    } else if (isTopRank) {
      return `听闻你在圈子中位列排行之首，积极参与，令人欣慰！`;
    }
    return '';
  }, []);

  // 切换对话模式
  const handleModeChange = (mode: ChatMode) => {
    setCurrentMode(mode);
    const newSession = createChatSession(personaId, mode);
    // 保留历史消息但更新模式
    newSession.messages = [...session.messages];
    setSession(newSession);
  };

  // 发送消息
  const handleSend = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg = text.trim();
    setInputText('');

    // 添加用户消息
    const sessionWithUser = addMessageToSession(session, 'user', userMsg);
    setSession(sessionWithUser);

    setIsLoading(true);

    // 创建占位AI消息
    const sessionWithPlaceholder = addMessageToSession(sessionWithUser, 'assistant', '');
    setSession(sessionWithPlaceholder);

    let aiContent = '';

    try {
      await sendChatMessageStream(
        sessionWithUser,
        userMsg,
        {
          onChunk: (chunk) => {
            aiContent += chunk;
            setSession((prev) => {
              const messages = [...prev.messages];
              messages[messages.length - 1] = {
                ...messages[messages.length - 1],
                content: aiContent,
              };
              return { ...prev, messages };
            });
          },
          onComplete: () => {
            setIsLoading(false);
          },
          onError: () => {
            setSession((prev) => {
              const messages = [...prev.messages];
              messages[messages.length - 1] = {
                ...messages[messages.length - 1],
                content: '先贤今日思绪纷扰，换个问题聊聊？',
              };
              return { ...prev, messages };
            });
            setIsLoading(false);
          },
        }
      );
    } catch (error) {
      console.error('[AI Chat] Error:', error);
      setSession((prev) => {
        const messages = [...prev.messages];
        messages[messages.length - 1] = {
          ...messages[messages.length - 1],
          content: '网络有些不畅，稍后再试吧。',
        };
        return { ...prev, messages };
      });
      setIsLoading(false);
    }
  }, [session, isLoading]);

  // 发送快捷话题
  const handleQuickTopic = (prompt: string) => {
    handleSend(prompt);
  };

  // 滚动到底部
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollTo?.({
          top: 999999,
          animated: true,
        });
      }, 100);
    }
  }, [session.messages.length, isLoading]);

  if (!persona) {
    return (
      <View className={styles.page}>
        <View style={{ padding: 40, textAlign: 'center' }}>
          <Text>人物不存在</Text>
        </View>
      </View>
    );
  }

  const modes: ChatMode[] = ['free', 'counsel', 'discuss', 'guide'];

  const EditableView = View as any;

  return (
    <View className={styles.page}>
      {/* 人物头部 */}
      <View className={styles.header}>
        <View className={styles.avatar}>🏛️</View>
        <View className={styles.headerInfo}>
          <Text className={styles.headerName}>{persona.name}</Text>
          <Text className={styles.headerDesc}>{persona.description}</Text>
        </View>
      </View>

      {/* 模式切换 */}
      <View className={styles.modeBar}>
        {modes.map((mode) => (
          <View
            key={mode}
            className={`${styles.modeTag} ${currentMode === mode ? styles.modeTagActive : ''}`}
            onClick={() => handleModeChange(mode)}
          >
            <Text>{MODE_EMOJIS[mode]} {MODE_LABELS[mode]}</Text>
          </View>
        ))}
      </View>

      {/* 聊天区域 */}
      <ScrollView
        ref={scrollViewRef}
        className={styles.chatArea}
        scrollY
        scrollWithAnimation
      >
        {/* 欢迎语 */}
        {session.messages.length === 0 && (
          <View className={styles.welcomeCard}>
            <Text className={styles.welcomeText}>
              我是{persona.name}，{persona.description}。{'\n'}
              {getCirclePraise() && (
                <Text>{getCirclePraise()}{'\n\n'}</Text>
              )}
              你可以向我倾诉烦恼、探讨我的作品和思想，或让我为你推荐一件今日的善事。{'\n'}
              点击下方快捷话题，或直接输入你想说的话。
            </Text>
          </View>
        )}

        {/* 快捷话题（只有没聊过天的时候显示） */}
        {session.messages.length === 0 && quickTopics.length > 0 && (
          <View className={styles.quickTopics}>
            <Text className={styles.quickTopicTitle}>💡 快捷话题</Text>
            {quickTopics.map((topic, idx) => (
              <View
                key={idx}
                className={styles.topicBtn}
                onClick={() => handleQuickTopic(topic.prompt)}
              >
                <Text>{topic.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 消息列表 */}
        {session.messages.map((msg, idx) => (
          <View
            key={idx}
            className={`${styles.messageRow} ${msg.role === 'user' ? styles.messageRowUser : ''}`}
          >
            <View
              className={`${styles.messageAvatar} ${
                msg.role === 'user' ? styles.messageAvatarUser : styles.messageAvatarAi
              }`}
            >
              <Text>{msg.role === 'user' ? '😊' : '🏛️'}</Text>
            </View>
            <View
              className={`${styles.messageBubble} ${
                msg.role === 'user' ? styles.bubbleUser : styles.bubbleAi
              }`}
            >
              <Text>{msg.content || '...'}</Text>
            </View>
          </View>
        ))}

        {/* 加载中 */}
        {isLoading && (
          <View className={styles.loadingRow}>
            <View className={styles.loadingDot} />
            <View className={styles.loadingDot} />
            <View className={styles.loadingDot} />
          </View>
        )}
      </ScrollView>

      {/* 输入区域 */}
      <View className={styles.inputArea}>
        <ScrollView
          className={styles.input}
          scrollY
          style={{ maxHeight: '200rpx' }}
        >
          <EditableView
            contentEditable={'true'}
            onInput={(e: any) => setInputText(e.detail.value)}
            style={{ minHeight: '40rpx', padding: '4rpx 0' }}
          >
            {inputText}
          </EditableView>
        </ScrollView>
        <View
          className={`${styles.sendBtn} ${!inputText.trim() ? styles.sendBtnDisabled : ''}`}
          onClick={() => handleSend(inputText)}
        >
          <Text>➤</Text>
        </View>
      </View>
    </View>
  );
};

export default AiChatPage;
