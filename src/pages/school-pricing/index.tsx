import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

interface PricingPlan {
  name: string;
  price: string;
  priceLabel: string;
  isFree?: boolean;
  features: string[];
  highlighted?: boolean;
  btnType?: 'primary' | 'secondary' | 'free';
}

const plans: PricingPlan[] = [
  {
    name: '基础版',
    price: '免费',
    isFree: true,
    priceLabel: '',
    features: [
      '基础善行记录功能',
      'AI 智能回应（古风人物）',
      '个人善行统计',
      '福气值累积体系',
      '基础徽章系统',
    ],
    btnType: 'free',
  },
  {
    name: '专业版',
    price: '2,999',
    priceLabel: '/学期',
    highlighted: true,
    features: [
      '包含基础版全部功能',
      '善行圈管理（班级/企业）',
      '德育看板数据可视化',
      '教师/管理员审核系统',
      '成员善行排行榜',
      '自定义善行标签',
      '定期德育报告',
    ],
    btnType: 'primary',
  },
  {
    name: '旗舰版',
    price: '9,999',
    priceLabel: '/学期',
    features: [
      '包含专业版全部功能',
      '专属客服经理',
      '定制化德育报告',
      'API 对接学校/企业系统',
      '多校区/多部门管理',
      'AI 德育顾问',
      '家长端联动功能',
      '年度德育总结报告',
    ],
    btnType: 'primary',
  },
];

const SchoolPricingPage: React.FC = () => {
  const handleContact = (planName: string) => {
    Taro.showModal({
      title: '联系咨询',
      content: `感谢您对「${planName}」感兴趣！\n请发送邮件至：\nschool@haoshi.com\n或拨打咨询热线：\n400-888-XXXX\n我们会尽快与您联系。`,
      confirmText: '我知道了',
    });
  };

  return (
    <View className={styles.pageWrapper}>
      <View className={styles.container}>
        {/* 页面头部 */}
        <View className={styles.headerSection}>
          <Text className={styles.pageTitle}>学校 / 企业定价</Text>
          <Text className={styles.pageSubtitle}>
            为<Text className={styles.highlight}>学校</Text>和<Text className={styles.highlight}>企业</Text>定制的德育管理系统
            {'\n'}让善行教育融入日常管理
          </Text>
        </View>

        {/* 套餐卡片 */}
        <View className={styles.pricingGrid}>
          {plans.map((plan, index) => (
            <View
              key={index}
              className={`${styles.pricingCard} ${plan.highlighted ? styles.pricingCardPremium : ''}`}
            >
              {plan.highlighted && (
                <Text className={styles.recommendBadge}>推荐</Text>
              )}

              <Text className={styles.planName}>{plan.name}</Text>

              <View className={styles.planPrice}>
                {plan.isFree ? (
                  <Text className={styles.priceFree}>{plan.price}</Text>
                ) : (
                  <>
                    <Text className={styles.priceSymbol}>¥</Text>
                    <Text className={styles.priceAmount}>{plan.price}</Text>
                    <Text className={styles.priceUnit}>{plan.priceLabel}</Text>
                  </>
                )}
              </View>

              <View className={styles.featureList}>
                {plan.features.map((feature, fIndex) => (
                  <View key={fIndex} className={styles.featureItem}>
                    <Text className={styles.featureIcon}>
                      {plan.isFree ? '✅' : plan.highlighted ? '⭐' : '🏆'}
                    </Text>
                    <Text className={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View
                className={`${styles.contactBtn} ${
                  plan.btnType === 'secondary'
                    ? styles.contactBtnSecondary
                    : plan.btnType === 'free'
                    ? styles.contactBtnFree
                    : ''
                }`}
                onClick={() => handleContact(plan.name)}
              >
                <Text>联系咨询</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 底部说明 */}
        <View className={styles.footerNote}>
          <Text>
            所有套餐均包含基础数据安全保障{'\n'}
            支持免费试用 14 天，随时退款{'\n'}
            批量采购请联系商务获取更多优惠
          </Text>
        </View>
      </View>
    </View>
  );
};

export default SchoolPricingPage;