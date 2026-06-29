import React, { useEffect } from 'react';
import { View, Text, Switch } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore, checkIsMinor } from '@/store/user';
import { useRitualStore } from '@/store/ritual';
import { requireLogin } from '@/services/auth';
import { VisibilityScope } from '@/types/user';
import styles from './index.module.scss';

const PrivacySettingsPage: React.FC = () => {
  const { userInfo, privacySettings, updatePrivacySettings, resetPrivacySettings, loadFromStorage } = useUserStore();
  const { enabled: ritualEnabled, soundEnabled, hapticEnabled, toggleRitual, toggleSound, toggleHaptic, loadFromStorage: loadRitual } = useRitualStore();

  useEffect(() => {
    loadFromStorage();
    loadRitual();
  }, []);

  // 未登录跳转登录页
  useEffect(() => {
    if (!useUserStore.getState().isLoggedIn) {
      requireLogin('/pages/privacy-settings/index');
    }
  }, []);

  const isMinor = checkIsMinor(userInfo?.birthYear);

  // 可见范围选项
  const visibilityOptions: { value: VisibilityScope; label: string; desc: string }[] = [
    { value: 'public', label: '所有人', desc: '所有用户均可查看' },
    { value: 'followers', label: '互相关注', desc: '仅互相关注的用户可查看' },
    { value: 'private', label: '仅自己', desc: '只有自己可以查看' },
  ];

  // 切换可见范围
  const handleVisibilityChange = (scope: VisibilityScope) => {
    // 未成年用户不可选"所有人"
    if (isMinor && scope === 'public') {
      Taro.showToast({ title: '未成年用户不可选择"所有人"', icon: 'none' });
      return;
    }
    updatePrivacySettings({ kindnessVisibility: scope });
  };

  // 切换开关
  const handleSwitchChange = (key: keyof typeof privacySettings, value: boolean) => {
    // 未成年用户不可开启匿名统计
    if (isMinor && key === 'anonymousStats' && value) {
      Taro.showToast({ title: '未成年用户不可参与匿名统计', icon: 'none' });
      return;
    }
    updatePrivacySettings({ [key]: value } as any);
  };

  // 重置设置
  const handleReset = () => {
    Taro.showModal({
      title: '提示',
      content: '确定要恢复默认隐私设置吗？',
      success: (res) => {
        if (res.confirm) {
          resetPrivacySettings();
          Taro.showToast({ title: '已恢复默认', icon: 'success' });
        }
      }
    });
  };

  return (
    <View className={styles.container}>
      {/* 未成年保护横幅 */}
      {isMinor && (
        <View className={styles.minorBanner}>
          <Text className={styles.minorBannerIcon}>🛡️</Text>
          <Text className={styles.minorBannerText}>
            未成年保护模式已开启：匿名聚合统计不可开启，善行可见范围不可选"所有人"。
          </Text>
        </View>
      )}

      {/* 善行可见性 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>谁可以看我的善行</Text>
        <View className={styles.card}>
          <View className={styles.visibilityOptions}>
            {visibilityOptions.map((opt) => {
              const disabled = isMinor && opt.value === 'public';
              const active = privacySettings.kindnessVisibility === opt.value;
              return (
                <View
                  key={opt.value}
                  className={`${styles.visibilityOption} ${disabled ? styles.visibilityDisabled : ''}`}
                  onClick={() => !disabled && handleVisibilityChange(opt.value)}
                >
                  <View className={styles.visibilityLeft}>
                    <Text className={styles.itemLabel}>{opt.label}</Text>
                    <Text className={styles.itemDesc}>
                      {disabled ? '未成年用户不可选' : opt.desc}
                    </Text>
                  </View>
                  <View className={`${styles.visibilityRadio} ${active ? styles.active : ''}`}>
                    {active && <View className={styles.visibilityRadioInner} />}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* 数据与展示 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>数据与展示</Text>
        <View className={styles.card}>
          {/* 匿名聚合统计 */}
          <View className={styles.item}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>纳入匿名聚合统计</Text>
              <Text className={styles.itemDesc}>
                {isMinor
                  ? '未成年用户不可参与匿名统计'
                  : '你的善行数据将匿名纳入社区统计'}
              </Text>
            </View>
            <Switch
              checked={privacySettings.anonymousStats}
              disabled={isMinor}
              color="#FF6B6B"
              onChange={(e) => handleSwitchChange('anonymousStats', e.detail.value)}
            />
          </View>

          {/* 展示称号 */}
          <View className={styles.item}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>展示称号</Text>
              <Text className={styles.itemDesc}>在个人主页展示你的善行称号</Text>
            </View>
            <Switch
              checked={privacySettings.showTitle}
              color="#FF6B6B"
              onChange={(e) => handleSwitchChange('showTitle', e.detail.value)}
            />
          </View>

          {/* 允许善行匹配 */}
          <View className={styles.item}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>允许善行匹配</Text>
              <Text className={styles.itemDesc}>允许系统为你匹配志同道合的善行伙伴</Text>
            </View>
            <Switch
              checked={privacySettings.allowMatching}
              color="#FF6B6B"
              onChange={(e) => handleSwitchChange('allowMatching', e.detail.value)}
            />
          </View>
        </View>
      </View>

      {/* 体验设置 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>体验设置</Text>
        <View className={styles.card}>
          {/* 发布善行仪式 */}
          <View className={styles.item}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>发布善行仪式</Text>
              <Text className={styles.itemDesc}>发布善行后播放墨滴动画、福气飘字等仪式效果</Text>
            </View>
            <Switch
              checked={ritualEnabled}
              color="#C4956A"
              onChange={() => toggleRitual()}
            />
          </View>

          {/* 音效 */}
          <View className={styles.item}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>仪式音效</Text>
              <Text className={styles.itemDesc}>播放古风音效增强沉浸感</Text>
            </View>
            <Switch
              checked={soundEnabled}
              color="#C4956A"
              onChange={() => toggleSound()}
            />
          </View>

          {/* 触觉反馈 */}
          <View className={styles.item}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>触觉反馈</Text>
              <Text className={styles.itemDesc}>发布善行时手机震动反馈</Text>
            </View>
            <Switch
              checked={hapticEnabled}
              color="#C4956A"
              onChange={() => toggleHaptic()}
            />
          </View>
        </View>
      </View>

      {/* 消息推送 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>消息推送</Text>
        <View className={styles.card}>
          {/* 互动消息 */}
          <View className={styles.item}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>互动消息</Text>
              <Text className={styles.itemDesc}>点赞、评论、关注等互动提醒</Text>
            </View>
            <Switch
              checked={privacySettings.notificationInteraction}
              color="#FF6B6B"
              onChange={(e) => handleSwitchChange('notificationInteraction', e.detail.value)}
            />
          </View>

          {/* 系统消息 */}
          <View className={styles.item}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>系统消息</Text>
              <Text className={styles.itemDesc}>账号、安全、功能更新等系统通知</Text>
            </View>
            <Switch
              checked={privacySettings.notificationSystem}
              color="#FF6B6B"
              onChange={(e) => handleSwitchChange('notificationSystem', e.detail.value)}
            />
          </View>

          {/* 温暖通知 */}
          <View className={styles.item}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>温暖通知</Text>
              <Text className={styles.itemDesc}>每日温暖提醒、善行鼓励</Text>
            </View>
            <Switch
              checked={privacySettings.notificationWarm}
              color="#FF6B6B"
              onChange={(e) => handleSwitchChange('notificationWarm', e.detail.value)}
            />
          </View>

          {/* 公益提醒 */}
          <View className={styles.item}>
            <View className={styles.itemLeft}>
              <Text className={styles.itemLabel}>公益提醒</Text>
              <Text className={styles.itemDesc}>公益活动、接单机会提醒</Text>
            </View>
            <Switch
              checked={privacySettings.notificationCharity}
              color="#FF6B6B"
              onChange={(e) => handleSwitchChange('notificationCharity', e.detail.value)}
            />
          </View>
        </View>
      </View>

      {/* 恢复默认 */}
      <View
        className={styles.resetBtn}
        onClick={handleReset}
      >
        <Text className={styles.resetBtnText}>恢复默认设置</Text>
      </View>
    </View>
  );
};

export default PrivacySettingsPage;
