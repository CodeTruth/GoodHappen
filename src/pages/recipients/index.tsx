import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import { useFortuneStore } from '@/store/fortune';
import { useCharityFundStore, Recipient, RecipientType, RECIPIENT_TYPE_MAP } from '@/store/charityFund';
import styles from './index.module.scss';

// 类型筛选标签
const typeTabs: { key: RecipientType | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'student', label: '困境学生' },
  { key: 'elderly', label: '独居老人' },
  { key: 'patient', label: '重病患者' },
  { key: 'disabled', label: '残障人士' },
  { key: 'emergency', label: '突发困难' },
];

const RecipientsPage: React.FC = () => {
  const { availableFortune, loadFromStorage: loadFortune } = useFortuneStore();
  const {
    recipients,
    organizations,
    donateFortune,
    loadFromStorage: loadCharityFund,
  } = useCharityFundStore();

  const [activeType, setActiveType] = useState<RecipientType | 'all'>('all');
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null);
  const [donateAmount, setDonateAmount] = useState<number>(0);

  useEffect(() => {
    loadFortune();
    loadCharityFund();
  }, []);

  // 按类型筛选
  const filteredRecipients = useMemo(() => {
    if (activeType === 'all') return recipients.filter(r => r.status !== 'archived');
    return recipients.filter(r => r.type === activeType && r.status !== 'archived');
  }, [recipients, activeType]);

  // 格式化金额
  const formatMoney = (amount: number): string => `¥${amount.toLocaleString('zh-CN')}`;

  // 计算进度百分比
  const getProgress = (recipient: Recipient): number => {
    if (recipient.requiredAmount <= 0) return 0;
    return Math.min(100, Math.round((recipient.receivedAmount / recipient.requiredAmount) * 100));
  };

  // 点击受助人卡片
  const handleRecipientClick = (recipient: Recipient) => {
    setSelectedRecipient(recipient);
    setDonateAmount(0);
  };

  // 关闭详情
  const handleCloseDetail = () => {
    setSelectedRecipient(null);
  };

  // 选择捐赠金额
  const handleAmountSelect = (amount: number) => {
    setDonateAmount(amount);
  };

  // 确认捐赠
  const handleDonate = () => {
    if (!selectedRecipient) return;
    if (donateAmount <= 0) {
      Taro.showToast({ title: '请选择兑换福气数', icon: 'none' });
      return;
    }
    if (donateAmount > availableFortune) {
      Taro.showToast({ title: `可用福气不足（当前${availableFortune}）`, icon: 'none' });
      return;
    }

    const result = donateFortune(
      donateAmount,
      selectedRecipient.id,
      selectedRecipient.organizationId
    );

    if (result.success) {
      Taro.showModal({
        title: '兑换成功',
        content: `${result.message}\n你的温暖正在帮助${selectedRecipient.alias}`,
        showCancel: false,
        confirmText: '继续传递',
      });
      setSelectedRecipient(null);
      setDonateAmount(0);
    } else {
      Taro.showToast({ title: result.message, icon: 'none' });
    }
  };

  // 快捷金额选项
  const quickAmounts = [10, 30, 50, 100];

  return (
    <ScrollView className={styles.container} scrollY enableBackToTop>
      {/* 头部 */}
      <View className={styles.header}>
        <Text className={styles.headerTitle}>受助人故事</Text>
        <Text className={styles.headerSubtitle}>
          每一份温暖都将精准送达{'\n'}
          故事已脱敏处理，保护隐私
        </Text>
        <View className={styles.fortuneInfo}>
          <Text className={styles.fortuneInfoText}>
            可用福气 <Text className={styles.fortuneInfoValue}>{availableFortune}</Text>
          </Text>
        </View>
      </View>

      {/* 类型筛选 */}
      <ScrollView scrollX className={styles.tabs}>
        {typeTabs.map((tab) => (
          <Text
            key={tab.key}
            className={classnames(styles.tab, activeType === tab.key && styles.active)}
            onClick={() => setActiveType(tab.key)}
          >
            {tab.label}
          </Text>
        ))}
      </ScrollView>

      {/* 受助人列表 */}
      <View className={styles.recipientList}>
        {filteredRecipients.length > 0 ? (
          filteredRecipients.map((recipient) => {
            const typeInfo = RECIPIENT_TYPE_MAP[recipient.type];
            const progress = getProgress(recipient);
            const org = organizations.find(o => o.id === recipient.organizationId);
            return (
              <View
                key={recipient.id}
                className={styles.recipientCard}
                onClick={() => handleRecipientClick(recipient)}
              >
                {/* 头部：头像 + 类型标签 */}
                <View className={styles.cardHeader}>
                  <Image
                    src={recipient.avatar || ''}
                    className={styles.avatar}
                    mode="aspectFill"
                  />
                  <View className={styles.headerInfo}>
                    <View className={styles.nameRow}>
                      <Text className={styles.alias}>{recipient.alias}</Text>
                      <View
                        className={styles.typeTag}
                        style={{ background: `${typeInfo.color}1A` }}
                      >
                        <Text className={styles.typeIcon}>{typeInfo.icon}</Text>
                        <Text className={styles.typeLabel} style={{ color: typeInfo.color }}>
                          {typeInfo.label}
                        </Text>
                      </View>
                    </View>
                    <Text className={styles.meta}>
                      {recipient.ageGroup} · {recipient.region}
                    </Text>
                  </View>
                </View>

                {/* 故事 */}
                <Text className={styles.story}>{recipient.story}</Text>

                {/* 所需帮助 */}
                <View className={styles.helpRow}>
                  <Text className={styles.helpLabel}>所需帮助：</Text>
                  <Text className={styles.helpValue}>{recipient.neededHelp}</Text>
                </View>

                {/* 进度条 */}
                <View className={styles.progressSection}>
                  <View className={styles.progressHeader}>
                    <Text className={styles.progressLabel}>已获帮助进度</Text>
                    <Text className={styles.progressPercent}>{progress}%</Text>
                  </View>
                  <View className={styles.progressBar}>
                    <View
                      className={styles.progressFill}
                      style={{ width: `${progress}%`, background: typeInfo.color }}
                    />
                  </View>
                  <View className={styles.progressAmount}>
                    <Text className={styles.amountRaised}>
                      {formatMoney(recipient.receivedAmount)}
                    </Text>
                    <Text className={styles.amountTarget}>
                      / {formatMoney(recipient.requiredAmount)}
                    </Text>
                  </View>
                </View>

                {/* 公益组织 */}
                {org && (
                  <View className={styles.orgRow}>
                    <Text className={styles.orgIcon}>🏢</Text>
                    <Text className={styles.orgName}>{org.name}</Text>
                    {org.isVerified && (
                      <Text className={styles.orgVerified}>✓ 认证</Text>
                    )}
                  </View>
                )}

                {/* 反馈 */}
                {recipient.feedback && (
                  <View className={styles.feedbackBox}>
                    <Text className={styles.feedbackIcon}>{'💬'}</Text>
                    <Text className={styles.feedbackText}>{recipient.feedback}</Text>
                  </View>
                )}

                {/* 状态标签 */}
                {recipient.status === 'completed' && (
                  <View className={styles.completedTag}>
                    <Text className={styles.completedText}>✓ 已完成帮扶</Text>
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>🌱</Text>
            <Text className={styles.emptyText}>暂无该类型的受助人</Text>
          </View>
        )}
      </View>

      {/* 底部说明 */}
      <View className={styles.footerNote}>
        <Text className={styles.footerText}>
          所有受助人信息均经脱敏处理{'\n'}
          不展示真实姓名，照片做模糊处理{'\n'}
          善款通过公益组织中转，不直接对个人
        </Text>
      </View>

      {/* 捐赠弹窗 */}
      {selectedRecipient && (
        <View className={styles.detailMask} onClick={handleCloseDetail}>
          <View className={styles.detailPanel} onClick={(e) => e.stopPropagation()}>
            <View className={styles.detailHeader}>
              <Text className={styles.detailTitle}>福气兑换善款</Text>
              <Text className={styles.detailClose} onClick={handleCloseDetail}>✕</Text>
            </View>

            {/* 受助人信息 */}
            <View className={styles.detailRecipient}>
              <Text className={styles.detailAlias}>{selectedRecipient.alias}</Text>
              <Text className={styles.detailHelp}>{selectedRecipient.neededHelp}</Text>
              <View className={styles.detailProgress}>
                <Text className={styles.detailProgressText}>
                  已筹 {formatMoney(selectedRecipient.receivedAmount)} / {formatMoney(selectedRecipient.requiredAmount)}
                </Text>
              </View>
            </View>

            {/* 金额选择 */}
            <View className={styles.amountSection}>
              <Text className={styles.amountTitle}>选择兑换福气数</Text>
              <View className={styles.amountGrid}>
                {quickAmounts.map((amount) => (
                  <View
                    key={amount}
                    className={classnames(
                      styles.amountItem,
                      donateAmount === amount && styles.amountItemActive
                    )}
                    onClick={() => handleAmountSelect(amount)}
                  >
                    <Text className={styles.amountValue}>{amount}</Text>
                    <Text className={styles.amountUnit}>福气</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 兑换信息 */}
            {donateAmount > 0 && (
              <View className={styles.exchangeInfo}>
                <View className={styles.exchangeRow}>
                  <Text className={styles.exchangeLabel}>兑换福气</Text>
                  <Text className={styles.exchangeValue}>{donateAmount} 福气</Text>
                </View>
                <View className={styles.exchangeRow}>
                  <Text className={styles.exchangeLabel}>对应善款</Text>
                  <Text className={styles.exchangeValue}>{formatMoney(donateAmount)}</Text>
                </View>
                <View className={styles.exchangeRow}>
                  <Text className={styles.exchangeLabel}>可用福气</Text>
                  <Text className={classnames(
                    styles.exchangeValue,
                    donateAmount > availableFortune && styles.exchangeValueWarn
                  )}>
                    {availableFortune} 福气
                  </Text>
                </View>
              </View>
            )}

            {/* 兑换按钮 */}
            <View
              className={classnames(
                styles.donateBtn,
                (donateAmount <= 0 || donateAmount > availableFortune) && styles.donateBtnDisabled
              )}
              onClick={() => {
                if (donateAmount > 0 && donateAmount <= availableFortune) {
                  handleDonate();
                }
              }}
            >
              <Text className={styles.donateBtnText}>
                {donateAmount <= 0
                  ? '请选择兑换福气数'
                  : donateAmount > availableFortune
                  ? '可用福气不足'
                  : `兑换 ${formatMoney(donateAmount)} 善款`}
              </Text>
            </View>

            {/* 温暖提示 */}
            <Text className={styles.warmTip}>
              你的温暖正在帮助{selectedRecipient.alias}{'\n'}
              善款将通过公益组织中转送达
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default RecipientsPage;
