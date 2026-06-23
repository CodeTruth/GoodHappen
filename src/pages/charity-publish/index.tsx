import React, { useState, useEffect } from 'react';
import { View, Text, Textarea, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCharityStore } from '@/store/charity';
import { useFortuneStore } from '@/store/fortune';
import { useUserStore } from '@/store/user';
import { CharityType, CHARITY_TYPE_MAP } from '@/types/charity';
import styles from './index.module.scss';

// 需求类型列表
const TYPE_LIST: CharityType[] = ['errand', 'escort', 'delivery', 'repair', 'chat', 'other'];

// 福气悬赏快捷选项
const REWARD_PRESETS = [0, 5, 10, 20, 30, 50];

const CharityPublishPage: React.FC = () => {
  const { publishNeed, canPublishReward, getKindnessCount, loadFromStorage, checkExpiry } = useCharityStore();
  const { availableFortune, frozenFortune, loadFromStorage: loadFortune } = useFortuneStore();
  const { isLoggedIn, loadFromStorage: loadUser } = useUserStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<CharityType>('errand');
  const [expectedTime, setExpectedTime] = useState('');
  const [reward, setReward] = useState(0);
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadFromStorage();
    loadFortune();
    loadUser();
    checkExpiry();
  }, []);

  // 福气悬赏资格
  const rewardQual = canPublishReward();
  const kindnessCount = getKindnessCount();
  const canUseReward = rewardQual.qualified;

  // 标题字数
  const titleLen = title.length;
  const descLen = description.length;

  // 处理发布
  const handleSubmit = () => {
    if (submitting) return;

    // 校验登录
    if (!isLoggedIn) {
      Taro.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    // 校验标题
    if (titleLen < 5 || titleLen > 30) {
      Taro.showToast({ title: '标题需在5-30字之间', icon: 'none' });
      return;
    }

    // 校验描述
    if (!description.trim()) {
      Taro.showToast({ title: '请填写需求描述', icon: 'none' });
      return;
    }

    // 校验期望完成时间
    if (!expectedTime) {
      Taro.showToast({ title: '请选择期望完成时间', icon: 'none' });
      return;
    }

    // 校验悬赏资格
    if (reward > 0 && !canUseReward) {
      Taro.showModal({
        title: '暂无悬赏资格',
        content: rewardQual.reason || '需累计至少5件善行才能发布悬赏',
        showCancel: false,
      });
      return;
    }

    // 校验可用福气
    if (reward > 0 && availableFortune < reward) {
      Taro.showToast({
        title: `可用福气不足（${availableFortune}）`,
        icon: 'none',
      });
      return;
    }

    setSubmitting(true);

    const result = publishNeed({
      title: title.trim(),
      description: description.trim(),
      type,
      expectedTime,
      reward,
      contact: contact.trim() || undefined,
    });

    setSubmitting(false);

    if (result.success) {
      Taro.showToast({ title: '发布成功', icon: 'success' });
      setTimeout(() => {
        Taro.navigateBack();
      }, 1500);
    } else {
      Taro.showToast({ title: result.message, icon: 'none' });
    }
  };

  // 选择期望完成时间
  const handlePickTime = () => {
    Taro.showActionSheet({
      itemList: ['1小时后', '3小时后', '今天内', '明天', '后天', '一周内'],
      success: (res) => {
        const now = new Date();
        const target = new Date(now);
        switch (res.tapIndex) {
          case 0: target.setHours(target.getHours() + 1); break;
          case 1: target.setHours(target.getHours() + 3); break;
          case 2: target.setHours(23, 59, 0); break;
          case 3: target.setDate(target.getDate() + 1); target.setHours(18, 0, 0); break;
          case 4: target.setDate(target.getDate() + 2); target.setHours(18, 0, 0); break;
          case 5: target.setDate(target.getDate() + 7); target.setHours(18, 0, 0); break;
        }
        setExpectedTime(target.toISOString());
      },
    });
  };

  // 格式化时间展示
  const formatExpectedTime = (iso: string): string => {
    if (!iso) return '请选择期望完成时间';
    const date = new Date(iso);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return '即将';
    if (hours < 24) return `${hours}小时后`;
    if (days < 7) return `${days}天后`;
    return date.toLocaleDateString('zh-CN');
  };

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.title}>发布公益需求</Text>
        <Text className={styles.subtitle}>让善意在邻里间流动</Text>
      </View>

      {/* 福气信息 */}
      <View className={styles.fortuneInfo}>
        <View className={styles.fortuneItem}>
          <Text className={styles.fortuneLabel}>可用福气</Text>
          <Text className={styles.fortuneValue}>{availableFortune}</Text>
        </View>
        <View className={styles.fortuneDivider} />
        <View className={styles.fortuneItem}>
          <Text className={styles.fortuneLabel}>冻结福气</Text>
          <Text className={styles.fortuneValue}>{frozenFortune}</Text>
        </View>
        <View className={styles.fortuneDivider} />
        <View className={styles.fortuneItem}>
          <Text className={styles.fortuneLabel}>善行数</Text>
          <Text className={styles.fortuneValue}>{kindnessCount}</Text>
        </View>
      </View>

      {/* 表单 */}
      <View className={styles.form}>
        {/* 标题 */}
        <View className={styles.formItem}>
          <View className={styles.labelRow}>
            <Text className={styles.label}>标题</Text>
            <Text className={styles.counter}>{titleLen}/30</Text>
          </View>
          <Input
            className={styles.input}
            placeholder="如：帮老人取一下快递"
            value={title}
            onInput={(e) => setTitle(e.detail.value.slice(0, 30))}
            maxlength={30}
          />
          {titleLen > 0 && titleLen < 5 && (
            <Text className={styles.hint}>标题至少5个字</Text>
          )}
        </View>

        {/* 需求类型 */}
        <View className={styles.formItem}>
          <Text className={styles.label}>需求类型</Text>
          <View className={styles.typeGrid}>
            {TYPE_LIST.map((t) => {
              const config = CHARITY_TYPE_MAP[t];
              return (
                <View
                  key={t}
                  className={`${styles.typeOption} ${type === t ? styles.active : ''}`}
                  onClick={() => setType(t)}
                >
                  <Text className={styles.typeIcon}>{config.icon}</Text>
                  <Text className={styles.typeName}>{config.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* 描述 */}
        <View className={styles.formItem}>
          <View className={styles.labelRow}>
            <Text className={styles.label}>详细描述</Text>
            <Text className={styles.counter}>{descLen}/200</Text>
          </View>
          <Textarea
            className={styles.textarea}
            placeholder="请描述时间、地点、详细要求等..."
            value={description}
            onInput={(e) => setDescription(e.detail.value.slice(0, 200))}
            maxlength={200}
            showConfirmBar={false}
          />
        </View>

        {/* 期望完成时间 */}
        <View className={styles.formItem}>
          <Text className={styles.label}>期望完成时间</Text>
          <View className={styles.timePicker} onClick={handlePickTime}>
            <Text className={styles.timeText}>
              {formatExpectedTime(expectedTime)}
            </Text>
            <Text className={styles.arrow}>›</Text>
          </View>
        </View>

        {/* 福气悬赏 */}
        <View className={styles.formItem}>
          <View className={styles.labelRow}>
            <Text className={styles.label}>福气悬赏</Text>
            {!canUseReward && (
              <Text className={styles.hintWarn}>需≥5件善行</Text>
            )}
          </View>
          <View className={styles.rewardPresets}>
            {REWARD_PRESETS.map((r) => (
              <View
                key={r}
                className={`${styles.rewardOption} ${reward === r ? styles.active : ''} ${!canUseReward && r > 0 ? styles.disabled : ''}`}
                onClick={() => canUseReward || r === 0 ? setReward(r) : null}
              >
                <Text className={styles.rewardText}>{r === 0 ? '无悬赏' : `${r}福气`}</Text>
              </View>
            ))}
          </View>
          {/* 自定义悬赏 */}
          {canUseReward && (
            <View className={styles.customReward}>
              <Input
                className={styles.rewardInput}
                type="number"
                placeholder="自定义悬赏（0-50）"
                value={reward > 0 && !REWARD_PRESETS.includes(reward) ? String(reward) : ''}
                onInput={(e) => {
                  const val = parseInt(e.detail.value) || 0;
                  setReward(Math.min(50, Math.max(0, val)));
                }}
                maxlength={2}
              />
              <Text className={styles.rewardUnit}>福气</Text>
            </View>
          )}
          {/* 悬赏规则提示 */}
          {reward > 0 && (
            <View className={styles.rewardRules}>
              <Text className={styles.ruleText}>
                · 悬赏福气将冻结，完成后自动划转给接单者{'\n'}
                · 单笔上限50，单日转出≤100，单月≤500{'\n'}
                · 取消或超时后福气自动退回
              </Text>
            </View>
          )}
        </View>

        {/* 联系方式 */}
        <View className={styles.formItem}>
          <Text className={styles.label}>联系方式（可选）</Text>
          <Input
            className={styles.input}
            placeholder="手机号/微信号，将脱敏展示"
            value={contact}
            onInput={(e) => setContact(e.detail.value)}
            maxlength={20}
          />
          {contact && (
            <Text className={styles.hint}>
              展示为：{contact.slice(0, 3)}****{contact.slice(-4)}
            </Text>
          )}
        </View>
      </View>

      {/* 提交按钮 */}
      <View className={styles.submitBtn} onClick={handleSubmit}>
        <Text className={styles.submitText}>
          {submitting ? '发布中...' : '发布需求'}
        </Text>
      </View>

      {/* 底部说明 */}
      <View className={styles.footerNote}>
        <Text className={styles.footerText}>
          公益需求面向邻里互助{'\n'}
          请发布真实、合理、安全的需求
        </Text>
      </View>
    </ScrollView>
  );
};

export default CharityPublishPage;
