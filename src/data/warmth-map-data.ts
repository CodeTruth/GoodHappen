export interface ProvinceWarmthData {
  name: string;
  shortName: string;
  warmthLevel: number; // 1-5
  participantCount: number;
  monthlyFortune: number;
  kindnessCount: number;
  gridArea: { row: number; col: number };
  typeDistribution: { type: string; percentage: number }[];
  stories: { id: string; title: string; summary: string }[];
}

export const PROVINCE_WARMTH_DATA: ProvinceWarmthData[] = [
  // ========== 第1行：东北地区 ==========
  {
    name: '黑龙江省',
    shortName: '黑龙江',
    warmthLevel: 2,
    participantCount: 1200,
    monthlyFortune: 8500,
    kindnessCount: 320,
    gridArea: { row: 1, col: 2 },
    typeDistribution: [
      { type: '陪伴', percentage: 35 },
      { type: '助人', percentage: 30 },
      { type: '环保', percentage: 25 },
      { type: '关怀', percentage: 10 },
    ],
    stories: [
      {
        id: 'hlj-1',
        title: '冰城暖冬行动',
        summary: '哈尔滨市民自发组织为街头环卫工人送热饮和保暖物资，连续30天不间断，温暖了整个寒冬。',
      },
      {
        id: 'hlj-2',
        title: '林区守望者',
        summary: '大兴安岭护林员志愿者团队常年守护森林，同时为偏远林区居民提供生活物资和医疗协助。',
      },
    ],
  },
  {
    name: '吉林省',
    shortName: '吉林',
    warmthLevel: 2,
    participantCount: 980,
    monthlyFortune: 7200,
    kindnessCount: 280,
    gridArea: { row: 1, col: 3 },
    typeDistribution: [
      { type: '陪伴', percentage: 40 },
      { type: '助人', percentage: 30 },
      { type: '环保', percentage: 20 },
      { type: '关怀', percentage: 10 },
    ],
    stories: [
      {
        id: 'jl-1',
        title: '长白山下的爱心食堂',
        summary: '延边地区村民自发开设免费爱心食堂，为留守老人和儿童提供营养餐食，已持续运营两年。',
      },
    ],
  },
  {
    name: '辽宁省',
    shortName: '辽宁',
    warmthLevel: 3,
    participantCount: 2100,
    monthlyFortune: 15000,
    kindnessCount: 560,
    gridArea: { row: 1, col: 4 },
    typeDistribution: [
      { type: '助人', percentage: 35 },
      { type: '陪伴', percentage: 25 },
      { type: '环保', percentage: 25 },
      { type: '捐赠', percentage: 15 },
    ],
    stories: [
      {
        id: 'ln-1',
        title: '沈阳爱心驿站',
        summary: '沈阳市建立100个社区爱心驿站，为市民提供免费饮水、充电、休息等服务，成为城市温暖地标。',
      },
      {
        id: 'ln-2',
        title: '海边环保卫士',
        summary: '大连志愿者团队每周组织海滩清洁活动，累计清理海洋垃圾超过10吨，守护蔚蓝海岸。',
      },
    ],
  },

  // ========== 第2行：华北及内蒙古 ==========
  {
    name: '内蒙古自治区',
    shortName: '内蒙古',
    warmthLevel: 2,
    participantCount: 850,
    monthlyFortune: 6000,
    kindnessCount: 220,
    gridArea: { row: 2, col: 1 },
    typeDistribution: [
      { type: '环保', percentage: 40 },
      { type: '助人', percentage: 30 },
      { type: '关怀', percentage: 20 },
      { type: '陪伴', percentage: 10 },
    ],
    stories: [
      {
        id: 'nmg-1',
        title: '草原上的绿色希望',
        summary: '鄂尔多斯牧民自发组织草原生态修复项目，种植固沙植物超过5000亩，遏制沙漠化蔓延。',
      },
    ],
  },
  {
    name: '北京市',
    shortName: '北京',
    warmthLevel: 5,
    participantCount: 5000,
    monthlyFortune: 50000,
    kindnessCount: 2000,
    gridArea: { row: 2, col: 2 },
    typeDistribution: [
      { type: '志愿', percentage: 30 },
      { type: '助人', percentage: 25 },
      { type: '捐赠', percentage: 25 },
      { type: '环保', percentage: 20 },
    ],
    stories: [
      {
        id: 'bj-1',
        title: '首都志愿者联盟',
        summary: '北京市民自发组成志愿者联盟，在社区服务、大型活动保障、应急救援等领域累计服务超百万小时。',
      },
      {
        id: 'bj-2',
        title: '胡同里的守望',
        summary: '老北京胡同居民建立邻里互助网络，为独居老人提供日常照料和紧急救助，重现邻里温情。',
      },
    ],
  },
  {
    name: '天津市',
    shortName: '天津',
    warmthLevel: 4,
    participantCount: 2800,
    monthlyFortune: 22000,
    kindnessCount: 780,
    gridArea: { row: 2, col: 3 },
    typeDistribution: [
      { type: '助人', percentage: 35 },
      { type: '志愿', percentage: 30 },
      { type: '陪伴', percentage: 20 },
      { type: '环保', percentage: 15 },
    ],
    stories: [
      {
        id: 'tj-1',
        title: '津门爱心 Ferry',
        summary: '天津港志愿者团队为过往船员提供生活便利和应急帮助，被称为海上丝绸之路的温暖灯塔。',
      },
    ],
  },
  {
    name: '河北省',
    shortName: '河北',
    warmthLevel: 3,
    participantCount: 1900,
    monthlyFortune: 13000,
    kindnessCount: 520,
    gridArea: { row: 2, col: 4 },
    typeDistribution: [
      { type: '助人', percentage: 35 },
      { type: '环保', percentage: 30 },
      { type: '关怀', percentage: 20 },
      { type: '捐赠', percentage: 15 },
    ],
    stories: [
      {
        id: 'heb-1',
        title: '雄安新区的绿色先锋',
        summary: '雄安建设者们在施工之余积极参与植树造林和环保宣传，打造绿色宜居新城的先行者。',
      },
      {
        id: 'heb-2',
        title: '太行山支教团',
        summary: '河北师范大学学生组建支教团队，深入太行山区为留守儿童开设兴趣课堂，点亮希望之光。',
      },
    ],
  },
  {
    name: '山东省',
    shortName: '山东',
    warmthLevel: 4,
    participantCount: 3200,
    monthlyFortune: 24000,
    kindnessCount: 890,
    gridArea: { row: 2, col: 5 },
    typeDistribution: [
      { type: '助人', percentage: 30 },
      { type: '志愿', percentage: 30 },
      { type: '环保', percentage: 25 },
      { type: '陪伴', percentage: 15 },
    ],
    stories: [
      {
        id: 'sd-1',
        title: '齐鲁大地上的善行',
        summary: '山东各地广泛推行"善行义举四德榜"，累计表彰好人好事超过10万件，形成崇德向善的社会风尚。',
      },
      {
        id: 'sd-2',
        title: '青岛蓝丝带行动',
        summary: '青岛市民发起关爱自闭症儿童蓝丝带行动，通过公益跑步和义卖筹集善款，帮助特殊儿童融入社会。',
      },
    ],
  },
  {
    name: '山西省',
    shortName: '山西',
    warmthLevel: 3,
    participantCount: 1400,
    monthlyFortune: 9500,
    kindnessCount: 380,
    gridArea: { row: 2, col: 6 },
    typeDistribution: [
      { type: '环保', percentage: 35 },
      { type: '助人', percentage: 30 },
      { type: '关怀', percentage: 20 },
      { type: '捐赠', percentage: 15 },
    ],
    stories: [
      {
        id: 'sx-1',
        title: '煤都转型绿行者',
        summary: '山西 former 煤矿工人转型为环保志愿者，在矿区开展生态修复和植树造林，让黑色土地重披绿装。',
      },
    ],
  },

  // ========== 第3行：西北及华中 ==========
  {
    name: '新疆维吾尔自治区',
    shortName: '新疆',
    warmthLevel: 2,
    participantCount: 900,
    monthlyFortune: 6500,
    kindnessCount: 240,
    gridArea: { row: 3, col: 1 },
    typeDistribution: [
      { type: '环保', percentage: 35 },
      { type: '助人', percentage: 30 },
      { type: '陪伴', percentage: 20 },
      { type: '关怀', percentage: 15 },
    ],
    stories: [
      {
        id: 'xj-1',
        title: '天山脚下的民族团结',
        summary: '新疆各族群众互帮互助，在多民族社区建立"民族团结一家亲"结对帮扶机制，共筑和谐家园。',
      },
    ],
  },
  {
    name: '甘肃省',
    shortName: '甘肃',
    warmthLevel: 2,
    participantCount: 750,
    monthlyFortune: 5200,
    kindnessCount: 190,
    gridArea: { row: 3, col: 2 },
    typeDistribution: [
      { type: '环保', percentage: 35 },
      { type: '助人', percentage: 30 },
      { type: '关怀', percentage: 20 },
      { type: '捐赠', percentage: 15 },
    ],
    stories: [
      {
        id: 'gs-1',
        title: '丝绸之路上的绿洲守护者',
        summary: '敦煌莫高窟志愿者团队常年守护文化遗产，同时参与周边荒漠化治理，让千年丝路焕发新生。',
      },
    ],
  },
  {
    name: '宁夏回族自治区',
    shortName: '宁夏',
    warmthLevel: 2,
    participantCount: 450,
    monthlyFortune: 3500,
    kindnessCount: 130,
    gridArea: { row: 3, col: 3 },
    typeDistribution: [
      { type: '环保', percentage: 40 },
      { type: '助人', percentage: 30 },
      { type: '关怀', percentage: 20 },
      { type: '陪伴', percentage: 10 },
    ],
    stories: [
      {
        id: 'nx-1',
        title: '塞上江南的治沙人',
        summary: '宁夏志愿者传承"麦草方格"治沙经验，在毛乌素沙地边缘持续植树固沙，守护黄河上游生态屏障。',
      },
    ],
  },
  {
    name: '陕西省',
    shortName: '陕西',
    warmthLevel: 3,
    participantCount: 1800,
    monthlyFortune: 14000,
    kindnessCount: 510,
    gridArea: { row: 3, col: 4 },
    typeDistribution: [
      { type: '助人', percentage: 35 },
      { type: '志愿', percentage: 25 },
      { type: '环保', percentage: 25 },
      { type: '捐赠', percentage: 15 },
    ],
    stories: [
      {
        id: 'snx-1',
        title: '古城西安的暖心地铁',
        summary: '西安地铁工作人员和乘客共同营造温馨出行环境，多次涌现见义勇为、帮扶老弱病残的感人瞬间。',
      },
      {
        id: 'snx-2',
        title: '黄土高原上的支教接力',
        summary: '陕西高校志愿者连续20年赴陕北老区支教，累计培养留守儿童超过5000人次，知识改变命运的接力从未中断。',
      },
    ],
  },
  {
    name: '河南省',
    shortName: '河南',
    warmthLevel: 3,
    participantCount: 2600,
    monthlyFortune: 17000,
    kindnessCount: 720,
    gridArea: { row: 3, col: 5 },
    typeDistribution: [
      { type: '助人', percentage: 35 },
      { type: '志愿', percentage: 25 },
      { type: '环保', percentage: 25 },
      { type: '关怀', percentage: 15 },
    ],
    stories: [
      {
        id: 'hn-1',
        title: '中原大地的抗洪英雄',
        summary: '河南遭遇洪灾时，无数普通市民挺身而出，自发组织救援、捐赠物资，展现了中原儿女的大爱精神。',
      },
      {
        id: 'hn-2',
        title: '郑州爱心粥屋',
        summary: '郑州市民开设免费爱心粥屋，每天为环卫工人、流浪者等群体提供早餐，一碗热粥温暖一座城。',
      },
    ],
  },
  {
    name: '江苏省',
    shortName: '江苏',
    warmthLevel: 5,
    participantCount: 4500,
    monthlyFortune: 42000,
    kindnessCount: 1600,
    gridArea: { row: 3, col: 6 },
    typeDistribution: [
      { type: '志愿', percentage: 30 },
      { type: '助人', percentage: 25 },
      { type: '环保', percentage: 25 },
      { type: '捐赠', percentage: 20 },
    ],
    stories: [
      {
        id: 'js-1',
        title: '苏大强的志愿服务',
        summary: '江苏省志愿服务体系完善，注册志愿者超过1500万人，在助老扶幼、环境保护、大型赛会等领域全面开花。',
      },
      {
        id: 'js-2',
        title: '苏州河道的守护者',
        summary: '苏州市民自发组建河道巡查队，定期清理河道垃圾、监测水质，让江南水乡重现清澈容颜。',
      },
    ],
  },
  {
    name: '上海市',
    shortName: '上海',
    warmthLevel: 5,
    participantCount: 4800,
    monthlyFortune: 48000,
    kindnessCount: 1800,
    gridArea: { row: 1, col: 1 },
    typeDistribution: [
      { type: '志愿', percentage: 35 },
      { type: '捐赠', percentage: 25 },
      { type: '助人', percentage: 25 },
      { type: '环保', percentage: 15 },
    ],
    stories: [
      {
        id: 'sh-1',
        title: '魔都的温度',
        summary: '上海市民在繁忙都市中不忘传递温暖，地铁站内的"爱心接力"、社区里的"老伙伴计划"让城市充满人情味。',
      },
      {
        id: 'sh-2',
        title: '进博会上的志愿蓝',
        summary: '上海青年志愿者在中国国际进口博览会上提供多语种服务，向世界展示中国青年的责任与担当。',
      },
    ],
  },

  // ========== 第4行：青藏高原及华中 ==========
  {
    name: '青海省',
    shortName: '青海',
    warmthLevel: 1,
    participantCount: 300,
    monthlyFortune: 2200,
    kindnessCount: 80,
    gridArea: { row: 4, col: 1 },
    typeDistribution: [
      { type: '环保', percentage: 45 },
      { type: '关怀', percentage: 30 },
      { type: '助人', percentage: 15 },
      { type: '陪伴', percentage: 10 },
    ],
    stories: [
      {
        id: 'qh-1',
        title: '三江源生态守护者',
        summary: '青海牧民放下牧鞭成为生态管护员，守护中华水塔三江源，保护高原珍稀野生动物栖息地。',
      },
    ],
  },
  {
    name: '西藏自治区',
    shortName: '西藏',
    warmthLevel: 1,
    participantCount: 250,
    monthlyFortune: 1800,
    kindnessCount: 65,
    gridArea: { row: 4, col: 2 },
    typeDistribution: [
      { type: '环保', percentage: 40 },
      { type: '关怀', percentage: 30 },
      { type: '助人', percentage: 20 },
      { type: '陪伴', percentage: 10 },
    ],
    stories: [
      {
        id: 'xz-1',
        title: '高原上的格桑花',
        summary: '西藏志愿者们克服高原反应，深入偏远牧区为藏族群众送医送药、普及健康知识，被誉为高原上的格桑花。',
      },
    ],
  },
  {
    name: '四川省',
    shortName: '四川',
    warmthLevel: 4,
    participantCount: 3400,
    monthlyFortune: 26000,
    kindnessCount: 950,
    gridArea: { row: 4, col: 3 },
    typeDistribution: [
      { type: '助人', percentage: 30 },
      { type: '志愿', percentage: 25 },
      { type: '环保', percentage: 25 },
      { type: '捐赠', percentage: 20 },
    ],
    stories: [
      {
        id: 'sc-1',
        title: '汶川地震后的重生',
        summary: '汶川地震后，四川人民互帮互助重建家园，这份坚韧与大爱精神延续至今，成为巴蜀大地最宝贵的财富。',
      },
      {
        id: 'sc-2',
        title: '成都茶馆里的公益',
        summary: '成都茶馆老板设立"爱心茶座"，为环卫工人、快递员等户外工作者提供免费茶水休息区。',
      },
    ],
  },
  {
    name: '重庆市',
    shortName: '重庆',
    warmthLevel: 4,
    participantCount: 2900,
    monthlyFortune: 21000,
    kindnessCount: 820,
    gridArea: { row: 4, col: 4 },
    typeDistribution: [
      { type: '助人', percentage: 35 },
      { type: '志愿', percentage: 25 },
      { type: '环保', percentage: 25 },
      { type: '陪伴', percentage: 15 },
    ],
    stories: [
      {
        id: 'cq-1',
        title: '山城的棒棒军温情',
        summary: '重庆"棒棒军"在辛勤劳动之余，多次见义勇为、拾金不昧，用最朴实的行动诠释山城人民的善良。',
      },
      {
        id: 'cq-2',
        title: '长江边的环保卫士',
        summary: '重庆志愿者坚持每周巡江，清理长江沿岸垃圾，保护母亲河生态环境，守护一江碧水向东流。',
      },
    ],
  },
  {
    name: '湖北省',
    shortName: '湖北',
    warmthLevel: 4,
    participantCount: 2700,
    monthlyFortune: 19000,
    kindnessCount: 760,
    gridArea: { row: 4, col: 5 },
    typeDistribution: [
      { type: '助人', percentage: 35 },
      { type: '志愿', percentage: 30 },
      { type: '捐赠', percentage: 20 },
      { type: '环保', percentage: 15 },
    ],
    stories: [
      {
        id: 'hb-1',
        title: '武汉封城时的光',
        summary: '新冠疫情中，武汉市民自发组成志愿服务车队、社区保障队，在至暗时刻点亮希望之光。',
      },
      {
        id: 'hb-2',
        title: '东湖绿道上的微笑',
        summary: '武汉东湖绿道志愿者为游客提供导览和便民服务，用微笑服务传递城市的热情与友好。',
      },
    ],
  },
  {
    name: '安徽省',
    shortName: '安徽',
    warmthLevel: 3,
    participantCount: 1700,
    monthlyFortune: 12000,
    kindnessCount: 480,
    gridArea: { row: 4, col: 6 },
    typeDistribution: [
      { type: '助人', percentage: 35 },
      { type: '环保', percentage: 30 },
      { type: '关怀', percentage: 20 },
      { type: '陪伴', percentage: 15 },
    ],
    stories: [
      {
        id: 'ah-1',
        title: '徽州的孝道传承',
        summary: '安徽黄山脚下的 villagers 传承徽州孝道文化，建立村级养老互助中心，让老人安享幸福晚年。',
      },
    ],
  },

  // ========== 第5行：华南及东南 ==========
  {
    name: '云南省',
    shortName: '云南',
    warmthLevel: 3,
    participantCount: 1300,
    monthlyFortune: 9500,
    kindnessCount: 360,
    gridArea: { row: 5, col: 1 },
    typeDistribution: [
      { type: '环保', percentage: 35 },
      { type: '助人', percentage: 30 },
      { type: '关怀', percentage: 20 },
      { type: '陪伴', percentage: 15 },
    ],
    stories: [
      {
        id: 'yn-1',
        title: '彩云之南的护象人',
        summary: '云南村民与野象和谐共处，组建亚洲象保护志愿队，在人象冲突中寻求平衡，守护生物多样性。',
      },
    ],
  },
  {
    name: '贵州省',
    shortName: '贵州',
    warmthLevel: 2,
    participantCount: 900,
    monthlyFortune: 6200,
    kindnessCount: 260,
    gridArea: { row: 5, col: 2 },
    typeDistribution: [
      { type: '环保', percentage: 35 },
      { type: '助人', percentage: 30 },
      { type: '捐赠', percentage: 20 },
      { type: '关怀', percentage: 15 },
    ],
    stories: [
      {
        id: 'gz-1',
        title: '大山里的爱心邮路',
        summary: '贵州乡村邮递员在送信之余，为山区老人代购生活用品、传递亲情问候，成为大山里的爱心使者。',
      },
    ],
  },
  {
    name: '广西壮族自治区',
    shortName: '广西',
    warmthLevel: 3,
    participantCount: 1200,
    monthlyFortune: 8500,
    kindnessCount: 340,
    gridArea: { row: 5, col: 3 },
    typeDistribution: [
      { type: '助人', percentage: 35 },
      { type: '环保', percentage: 30 },
      { type: '关怀', percentage: 20 },
      { type: '陪伴', percentage: 15 },
    ],
    stories: [
      {
        id: 'gx-1',
        title: '壮乡的爱心山歌',
        summary: '广西壮族群众用山歌传唱好人好事，将善行义举编入传统歌谣，让美德在悠扬歌声中代代相传。',
      },
    ],
  },
  {
    name: '广东省',
    shortName: '广东',
    warmthLevel: 5,
    participantCount: 5000,
    monthlyFortune: 50000,
    kindnessCount: 2000,
    gridArea: { row: 6, col: 1 },
    typeDistribution: [
      { type: '志愿', percentage: 30 },
      { type: '捐赠', percentage: 25 },
      { type: '助人', percentage: 25 },
      { type: '环保', percentage: 20 },
    ],
    stories: [
      {
        id: 'gd-1',
        title: '粤港深的公益创新',
        summary: '珠三角地区公益组织创新"时间银行"模式，市民存储志愿服务时间，未来可兑换相应服务，形成良性循环。',
      },
      {
        id: 'gd-2',
        title: '粤菜师傅的爱心餐',
        summary: '广东餐饮从业者发起"爱心餐"行动，为困难群体提供免费餐食，用粤菜温度传递岭南大爱。',
      },
    ],
  },
  {
    name: '海南省',
    shortName: '海南',
    warmthLevel: 2,
    participantCount: 600,
    monthlyFortune: 4800,
    kindnessCount: 180,
    gridArea: { row: 1, col: 5 },
    typeDistribution: [
      { type: '环保', percentage: 45 },
      { type: '助人', percentage: 25 },
      { type: '关怀', percentage: 20 },
      { type: '陪伴', percentage: 10 },
    ],
    stories: [
      {
        id: 'hn-1',
        title: '海岛上的珊瑚守护者',
        summary: '海南潜水志愿者定期开展珊瑚种植和海洋清洁活动，保护热带海洋生态系统，守护蔚蓝家园。',
      },
    ],
  },
  {
    name: '香港特别行政区',
    shortName: '香港',
    warmthLevel: 2,
    participantCount: 1100,
    monthlyFortune: 9000,
    kindnessCount: 310,
    gridArea: { row: 1, col: 6 },
    typeDistribution: [
      { type: '捐赠', percentage: 35 },
      { type: '志愿', percentage: 30 },
      { type: '助人', percentage: 20 },
      { type: '关怀', percentage: 15 },
    ],
    stories: [
      {
        id: 'hk-1',
        title: '狮子山下的互助精神',
        summary: '香港市民发扬"狮子山精神"，在社区建立互助网络，帮助弱势群体共渡难关，展现东方之珠的温情。',
      },
    ],
  },
  {
    name: '澳门特别行政区',
    shortName: '澳门',
    warmthLevel: 2,
    participantCount: 350,
    monthlyFortune: 3200,
    kindnessCount: 110,
    gridArea: { row: 6, col: 2 },
    typeDistribution: [
      { type: '捐赠', percentage: 35 },
      { type: '关怀', percentage: 30 },
      { type: '志愿', percentage: 20 },
      { type: '助人', percentage: 15 },
    ],
    stories: [
      {
        id: 'mo-1',
        title: '小城大爱的濠江情',
        summary: '澳门社团和市民积极参与慈善公益事业，从赈灾捐款到日常扶老携幼，小城大爱温暖人心。',
      },
    ],
  },
  {
    name: '湖南省',
    shortName: '湖南',
    warmthLevel: 3,
    participantCount: 2000,
    monthlyFortune: 14500,
    kindnessCount: 550,
    gridArea: { row: 5, col: 4 },
    typeDistribution: [
      { type: '助人', percentage: 35 },
      { type: '志愿', percentage: 25 },
      { type: '环保', percentage: 25 },
      { type: '关怀', percentage: 15 },
    ],
    stories: [
      {
        id: 'hun-1',
        title: '雷锋家乡的传人',
        summary: '湖南作为雷锋故乡，学雷锋活动常态化，百万志愿者活跃在三湘大地，让雷锋精神在新时代绽放光芒。',
      },
      {
        id: 'hun-2',
        title: '湘江边的救生英雄',
        summary: '长沙退休老人自发组成湘江义务救生队，十年如一日守护游泳者安全，挽救数十条生命。',
      },
    ],
  },
  {
    name: '江西省',
    shortName: '江西',
    warmthLevel: 3,
    participantCount: 1300,
    monthlyFortune: 9200,
    kindnessCount: 370,
    gridArea: { row: 5, col: 5 },
    typeDistribution: [
      { type: '环保', percentage: 35 },
      { type: '助人', percentage: 30 },
      { type: '关怀', percentage: 20 },
      { type: '捐赠', percentage: 15 },
    ],
    stories: [
      {
        id: 'jx-1',
        title: '井冈山下的红色传承',
        summary: '井冈山老区群众传承红色基因，建立"红军后代志愿服务队"，为游客讲述革命故事、帮助困难家庭。',
      },
    ],
  },
  {
    name: '福建省',
    shortName: '福建',
    warmthLevel: 4,
    participantCount: 2400,
    monthlyFortune: 18000,
    kindnessCount: 680,
    gridArea: { row: 6, col: 3 },
    typeDistribution: [
      { type: '助人', percentage: 30 },
      { type: '环保', percentage: 30 },
      { type: '捐赠', percentage: 25 },
      { type: '志愿', percentage: 15 },
    ],
    stories: [
      {
        id: 'fj-1',
        title: '妈祖故里的善行',
        summary: '福建莆田湄洲岛渔民传承妈祖"立德行善大爱"精神，成立海上救援队，多次在台风天救助遇险船只。',
      },
      {
        id: 'fj-2',
        title: '闽南茶文化中的暖',
        summary: '福建茶农开设"爱心茶摊"，为过往行人提供免费茶水，一杯清茶传递闽南人的好客与温情。',
      },
    ],
  },
  {
    name: '浙江省',
    shortName: '浙江',
    warmthLevel: 5,
    participantCount: 4200,
    monthlyFortune: 38000,
    kindnessCount: 1400,
    gridArea: { row: 5, col: 6 },
    typeDistribution: [
      { type: '志愿', percentage: 30 },
      { type: '助人', percentage: 25 },
      { type: '环保', percentage: 25 },
      { type: '捐赠', percentage: 20 },
    ],
    stories: [
      {
        id: 'zj-1',
        title: '最美浙江人的力量',
        summary: '浙江省广泛开展"最美人物"评选，从"最美妈妈"到"最美司机"，凡人善举汇聚成最美风尚。',
      },
      {
        id: 'zj-2',
        title: '杭州西湖的志愿红',
        summary: '杭州西湖景区志愿者常年为游客提供义务讲解和便民服务，"志愿红"成为西湖边最温暖的风景。',
      },
    ],
  },
  {
    name: '台湾省',
    shortName: '台湾',
    warmthLevel: 2,
    participantCount: 800,
    monthlyFortune: 6800,
    kindnessCount: 250,
    gridArea: { row: 6, col: 4 },
    typeDistribution: [
      { type: '环保', percentage: 35 },
      { type: '助人', percentage: 30 },
      { type: '关怀', percentage: 20 },
      { type: '捐赠', percentage: 15 },
    ],
    stories: [
      {
        id: 'tw-1',
        title: '宝岛台湾的爱心厨房',
        summary: '台湾爱心人士开设"爱心厨房"，为低收入家庭和独居老人提供免费营养餐，用美食传递关爱。',
      },
    ],
  },
];
