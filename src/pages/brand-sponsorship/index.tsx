import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';

interface SponsorshipSlot {
  icon: string;
  name: string;
  price: string;
  period: string;
  benefits: string[];
}

const sponsorshipSlots: SponsorshipSlot[] = [
  {
    icon: '\u{1F3F7}\uFE0F',
    name: '善行广场Banner',
    price: '\u00A550,000',
    period: '/月',
    benefits: [
      '善行广场首页顶部Banner展示，日均曝光10万+',
      '品牌Logo + 自定义文案展示',
      '支持跳转品牌活动页或小程序',
      '每月可更换2次素材',
    ],
  },
  {
    icon: '\u{1F3E0}',
    name: '温暖商城冠名',
    price: '\u00A580,000',
    period: '/季',
    benefits: [
      '温暖商城频道冠名展示"XX品牌·温暖商城"',
      '商城首页品牌专区推荐位',
      '善行兑换商品可植入品牌元素',
      '季度品牌故事专栏1篇',
    ],
  },
  {
    icon: '\u{1F9D1}\u200D\u{1F3EB}',
    name: 'AI人物冠名',
    price: '\u00A530,000',
    period: '/月',
    benefits: [
      '指定AI古风人物（苏轼/孔子等）冠名',
      '冠名人物对话开场品牌提示',
      'AI回复末尾品牌露出',
      '月度冠名报告（含对话量数据）',
    ],
  },
  {
    icon: '\u{1F6E1}\uFE0F',
    name: '善行保险联合品牌',
    price: '\u00A5100,000',
    period: '/年',
    benefits: [
      '善行保险页面联合品牌展示',
      '保险产品可联合命名',
      '年度善行保险品牌日活动1次',
      '用户理赔指南品牌植入',
    ],
  },
  {
    icon: '\u2696\uFE0F',
    name: '法律援助联合品牌',
    price: '\u00A560,000',
    period: '/年',
    benefits: [
      '法律援助页面联合品牌展示',
      '法律知识专栏品牌冠名',
      '每月推送1篇联合普法内容',
      '年度法律援助白皮书联合发布',
    ],
  },
  {
    icon: '\u{1F3EA}',
    name: '福气商城品牌专区',
    price: '\u00A540,000',
    period: '/月',
    benefits: [
      '福气兑换商城独立品牌专区页',
      '品牌商品可上架福气兑换',
      '专区首页推荐位',
      '月度品牌活动支持',
    ],
  },
  {
    icon: '\u{1F4CA}',
    name: '年度报告冠名',
    price: '\u00A5200,000',
    period: '/年',
    benefits: [
      '年度善行报告独家冠名',
      '报告首页/尾页全页品牌展示',
      '报告内数据图表品牌色定制',
      '报告多渠道分发（含媒体通稿）',
    ],
  },
];

const BrandSponsorshipPage: React.FC = () => {
  const handleContact = () => {
    Taro.showModal({
      title: '联系我们',
      content: '感谢您对品牌合作的关注！\n请发送邮件至：\nbrand@haoshi.com\n或拨打商务合作热线：\n400-888-XXXX\n我们的商务团队将在24小时内与您联系。',
      confirmText: '好的',
    });
  };

  return (
    <View className={styles.pageWrapper}>
      <View className={styles.container}>
        {/* 页面头部 */}
        <View className={styles.headerSection}>
          <Text className={styles.pageTitle}>品牌合作方案</Text>
          <Text className={styles.pageSubtitle}>
            携手好事发生，共同传递善行力量
            {'\n'}以下为品牌赞助位的标准化定价方案
          </Text>
        </View>

        {/* 赞助列表 */}
        <View className={styles.sponsorshipList}>
          {sponsorshipSlots.map((slot, index) => (
            <View key={index} className={styles.sponsorCard}>
              <View className={styles.cardHeader}>
                <View className={styles.sponsorName}>
                  <Text className={styles.sponsorIcon}>{slot.icon}</Text>
                  <Text className={styles.sponsorTitle}>{slot.name}</Text>
                </View>
                <View className={styles.priceTag}>
                  <Text className={styles.priceAmount}>{slot.price}</Text>
                  <Text className={styles.pricePeriod}>{slot.period}</Text>
                </View>
              </View>
              <View className={styles.benefitList}>
                {slot.benefits.map((benefit, bIndex) => (
                  <View key={bIndex} className={styles.benefitItem}>
                    <View className={styles.benefitDot} />
                    <Text className={styles.benefitText}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* 底部联系 */}
        <View className={styles.footerSection}>
          <Text className={styles.contactDesc}>
            以上价格为标准化定价，具体合作方案可根据需求定制
            {'\n'}欢迎各品牌方与我们联系洽谈
          </Text>
          <View className={styles.contactBtn} onClick={handleContact}>
            <Text>联系我们</Text>
          </View>
          <Text className={styles.disclaimer}>
            * 以上报价不含税，最终价格以合同为准
            {'\n'}* 品牌合作需通过内容审核，确保与善行理念一致
          </Text>
        </View>
      </View>
    </View>
  );
};

export default BrandSponsorshipPage;