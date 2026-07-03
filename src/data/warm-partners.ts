/**
 * 温暖伙伴数据
 * 品牌合作信息，展示在发现页
 */

export interface WarmPartnerData {
  brandLogo: string;
  brandName: string;
  title: string;
  content: string;
  link?: string;
}

export const WARM_PARTNERS: WarmPartnerData[] = [
  {
    brandLogo: 'https://placehold.co/100x100/4A90A4/FFFFFF?text=善',
    brandName: '善行者基金会',
    title: '2024年冬季温暖行动招募中',
    content: '为偏远山区儿童送去保暖衣物和学习用品。您的每一份记录，都将转化为真实的物资捐赠。',
    link: '/pages/charity-publish/index',
  },
  {
    brandLogo: 'https://placehold.co/100x100/34A853/FFFFFF?text=绿',
    brandName: '绿色地球公益',
    title: '城市绿植认养计划',
    content: '认养一棵城市行道树，定期参与养护活动。让城市多一点绿，让心灵多一点宁静。',
    link: '/pages/charity-tasks/index',
  },
  {
    brandLogo: 'https://placehold.co/100x100/E67E22/FFFFFF?text=暖',
    brandName: '暖冬行动联盟',
    title: '为流浪者送一份热饭',
    content: '联合本地餐饮商家，为街头流浪人员提供热餐。用一餐热饭，温暖一座城市。',
    link: '/pages/charity-publish/index',
  },
  {
    brandLogo: 'https://placehold.co/100x100/C4956A/FFFFFF?text=书',
    brandName: '书香中国',
    title: '乡村图书角共建计划',
    content: '为乡村小学捐赠图书，建立班级图书角。让阅读的种子在每个孩子心中生根发芽。',
    link: '/pages/charity-fund/index',
  },
  {
    brandLogo: 'https://placehold.co/100x100/9B59B6/FFFFFF?text=宠',
    brandName: '它基金',
    title: '流浪动物绝育公益行',
    content: '支持流浪动物TNR（捕捉-绝育-放归）计划，用科学方式减少流浪动物数量。',
    link: '/pages/charity-publish/index',
  },
];
