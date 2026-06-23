import React, { useEffect } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useInviteStore, INVITE_REWARD } from '@/store/invite';
import styles from './index.module.scss';

const InvitePage: React.FC = () => {
  const {
    inviteCode,
    inviteRecords,
    totalInvited,
    generateInviteCode,
    simulateInviteRegister,
    getInviteStats,
    copyInviteCode,
    generateInviteText,
    loadFromStorage,
  } = useInviteStore();

  useEffect(() => {
    loadFromStorage();
    if (!inviteCode) {
      generateInviteCode();
    }
  }, []);

  const stats = getInviteStats();

  // 复制邀请码
  const handleCopyCode = () => {
    copyInviteCode();
  };

  // 生成海报（简化版：复制海报文案到剪贴板）
  const handleGeneratePoster = () => {
    const text = generateInviteText();
    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showModal({
          title: '邀请海报已生成',
          content: '邀请文案已复制到剪贴板，快去分享给好友吧！',
          showCancel: false,
        });
      },
    });
  };

  // 分享给微信好友
  const handleShareWechat = () => {
    const text = generateInviteText();
    Taro.setClipboardData({
      data: text,
      success: () => {
        Taro.showToast({ title: '文案已复制，去微信粘贴分享', icon: 'none', duration: 2000 });
      },
    });
  };

  // 模拟好友注册（演示用）
  const handleSimulateRegister = () => {
    Taro.showModal({
      title: '模拟好友注册',
      content: `输入你的邀请码 ${inviteCode} 模拟好友注册流程？`,
      success: (res) => {
        if (res.confirm) {
          simulateInviteRegister(inviteCode);
        }
      },
    });
  };

  // 格式化时间
  const formatTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <View className={styles.container}>
      {/* 顶部海报卡片 */}
      <View className={styles.posterCard}>
        <Text className={styles.posterIcon}>🎁</Text>
        <Text className={styles.posterTitle}>邀请好友，共享温暖</Text>
        <Text className={styles.posterDesc}>
          好友通过你的邀请码注册{'\n'}双方各获得福气奖励
        </Text>
        <Text className={styles.rewardTag}>双方各得 {INVITE_REWARD} 福气</Text>
      </View>

      {/* 邀请码卡片 */}
      <View className={styles.codeCard}>
        <Text className={styles.codeLabel}>我的专属邀请码</Text>
        <Text className={styles.codeValue}>{inviteCode || '生成中...'}</Text>
        <View className={styles.codeActions}>
          <View className={`${styles.codeBtn} ${styles.codeBtnPrimary}`} onClick={handleCopyCode}>
            <Text>复制邀请码</Text>
          </View>
          <View className={`${styles.codeBtn} ${styles.codeBtnSecondary}`} onClick={handleGeneratePoster}>
            <Text>生成海报</Text>
          </View>
        </View>
      </View>

      {/* 统计卡片 */}
      <View className={styles.statsCard}>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.total}</Text>
          <Text className={styles.statLabel}>已邀请人数</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.completed}</Text>
          <Text className={styles.statLabel}>已完成注册</Text>
        </View>
        <View className={styles.statItem}>
          <Text className={styles.statValue}>{stats.reward}</Text>
          <Text className={styles.statLabel}>累计福气奖励</Text>
        </View>
      </View>

      {/* 邀请排行榜（不排名，只显示数量） */}
      <View className={styles.rankCard}>
        <Text className={styles.rankTitle}>🏆 我的邀请</Text>
        <Text className={styles.rankText}>你已邀请 {totalInvited} 人</Text>
        <Text className={styles.rankSub}>不排名、不对抗，让温暖一起传递</Text>
      </View>

      {/* 邀请记录 */}
      <Text className={styles.sectionTitle}>邀请记录</Text>
      {inviteRecords.length === 0 ? (
        <View className={styles.emptyState}>
          <Text className={styles.emptyIcon}>💌</Text>
          <Text className={styles.emptyText}>还没有邀请记录{'\n'}快去邀请好友一起记录温暖吧</Text>
        </View>
      ) : (
        <View className={styles.recordList}>
          {inviteRecords.map(record => (
            <View key={record.id} className={styles.recordItem}>
              <Image src={record.inviteeAvatar} className={styles.recordAvatar} mode="aspectFill" />
              <View className={styles.recordInfo}>
                <Text className={styles.recordName}>{record.inviteeName}</Text>
                <Text className={styles.recordTime}>{formatTime(record.invitedAt)} 通过邀请码注册</Text>
              </View>
              <Text className={styles.recordReward}>+{INVITE_REWARD}福气</Text>
            </View>
          ))}
        </View>
      )}

      {/* 海报预览 */}
      <View className={styles.posterPreview}>
        <Text className={styles.posterPreviewTitle}>海报文案预览</Text>
        <View className={styles.posterPreviewContent}>
          <Text className={styles.posterPreviewText}>
            我在「好事发生」记录生活中的温暖瞬间，邀请你一起加入！{'\n\n'}
            邀请码：{inviteCode}{'\n\n'}
            通过邀请码注册，双方各获得 {INVITE_REWARD} 福气奖励 ✨
          </Text>
        </View>
      </View>

      {/* 分享按钮 */}
      <Button
        className={styles.shareBtn}
        openType="share"
        onClick={handleShareWechat}
      >
        <Text className={styles.shareBtnText}>分享给微信好友</Text>
      </Button>

      {/* 模拟注册按钮（演示用） */}
      <View className={styles.simulateBtn} onClick={handleSimulateRegister}>
        <Text className={styles.simulateBtnText}>演示：模拟好友通过邀请码注册</Text>
      </View>
    </View>
  );
};

export default InvitePage;
