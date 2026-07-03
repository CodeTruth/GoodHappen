/**
 * 推荐圈子Mock数据
 */

export interface RecommendedCircle {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  description: string;
  icon: string;
  color: string;
}

export const RECOMMENDED_CIRCLES: RecommendedCircle[] = [
  {
    id: 'rec_1',
    name: '社区温暖互助群',
    type: '社区',
    memberCount: 128,
    description: '邻里互助，共建温暖社区',
    icon: '🏘️',
    color: '#E67E22',
  },
  {
    id: 'rec_2',
    name: '每日一善打卡群',
    type: '公益',
    memberCount: 356,
    description: '每天做一件善事，记录温暖瞬间',
    icon: '✨',
    color: '#C4956A',
  },
  {
    id: 'rec_3',
    name: '大学生志愿者联盟',
    type: '校园',
    memberCount: 89,
    description: '高校志愿者交流，组织公益活动',
    icon: '🎓',
    color: '#3498DB',
  },
  {
    id: 'rec_4',
    name: '关爱老人行动组',
    type: '公益',
    memberCount: 64,
    description: '关爱独居老人，定期探访陪伴',
    icon: '👴',
    color: '#E74C3C',
  },
];
