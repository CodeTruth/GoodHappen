/**
 * 证据收集指南 — 按场景提供具体、可执行的证据收集清单
 * AI在对话中匹配场景后，直接引用对应清单指导用户
 */

export interface EvidenceGuideItem {
  /** 优先级，1最高 */
  priority: number;
  /** 证据类型标签 */
  label: string;
  /** 具体操作描述 */
  action: string;
  /** 为什么重要 */
  reason: string;
}

export interface SceneGuide {
  /** 场景关键词（用于AI匹配） */
  keywords: string[];
  /** 该场景的法律依据 */
  law: string;
  /** 证据收集清单 */
  checklist: EvidenceGuideItem[];
  /** 笔录/沟通注意事项 */
  tips: string[];
}

export const EVIDENCE_GUIDES: SceneGuide[] = [
  {
    keywords: ['扶老人', '扶起老人', '老人摔倒', '老人倒地', '碰瓷', '讹人'],
    law: '《民法典》第184条（"好人法"）：因自愿实施紧急救助行为造成受助人损害的，救助人不承担民事责任。',
    checklist: [
      { priority: 1, label: '监控录像', action: '记住事发地点周围是否有商铺摄像头、交通摄像头、小区门禁。告知律师具体位置，由律师申请调取。', reason: '监控是最直接的客观证据，能还原"你到达时老人已倒地"的事实' },
      { priority: 2, label: '目击者', action: '回想当时周围有没有路人、店主、保安。如果有人停留或帮忙，尝试记住特征。平台会帮你全网搜索见证者。', reason: '第三方证人证言效力高，尤其与监控互相印证时' },
      { priority: 3, label: '伤情记录', action: '老人摔倒时身体哪些部位着地？你扶起时老人有无表示哪里疼？救护车到达时老人的状态？这些细节很关键。', reason: '判断伤情是否与"被撞"的逻辑一致，还是典型的自身摔倒' },
      { priority: 4, label: '时间线', action: '梳理精确时间线：你到达时间→发现老人→你做了什么→叫救护车→家属到达→警方到达。', reason: '完整时间线能证明你没有"肇事-逃逸-返回"的间隙' },
      { priority: 5, label: '通话记录', action: '保留120急救电话的拨打记录和通话时间。', reason: '证明你的救助行为是及时、主动的' },
    ],
    tips: [
      '笔录时只说事实（"我看到老人倒在地上，我扶了他并拨打了120"），不说推测（"我觉得他可能是自己摔的"）',
      '不签署任何与事实不符的材料，不签署调解协议',
      '如果警方要求你垫付医药费，可以拒绝，这不是你的法定义务',
      '全程保持冷静和礼貌，你的态度也会被记录',
    ],
  },
  {
    keywords: ['小孩', '走丢', '找妈妈', '人贩子', '拐卖', '被误解', '被当成'],
    law: '《民法典》第121条：没有法定的或者约定的义务，为避免他人利益受损失而进行管理的人，有权请求受益人偿还由此支出的必要费用。',
    checklist: [
      { priority: 1, label: '现场位置', action: '你发现小孩的具体地点（哪个商场、哪条街、哪个出口）？当时周围有什么店铺？', reason: '帮助还原"你是在公共场所发现走失儿童并帮助"的场景' },
      { priority: 2, label: '第三方见证', action: '当时有没有店员、保安、其他路人看到你帮助小孩的过程？', reason: '第三方证言能证明你的行为是善意帮助' },
      { priority: 3, label: '通讯记录', action: '你是否拨打了110？从发现到交给家长/警方经过了多长时间？', reason: '证明你第一时间寻求了正当途径帮助' },
      { priority: 4, label: '孩子状态', action: '发现时孩子的状态（哭闹、平静、有无外伤）？', reason: '排除"你造成伤害"的可能性' },
    ],
    tips: [
      '这种情况一般不会产生法律纠纷，更多是心理上的委屈',
      '如果被对方指责，不要争执，可以说"我理解你的担心，我也是为了孩子安全"',
      '如果对方态度恶劣甚至威胁报警，你可以主动说"没问题，我们请民警来协调"',
    ],
  },
  {
    keywords: ['交通事故', '车祸', '撞人', '被追尾', '刮擦', '肇事'],
    law: '《道路交通安全法》第70条：在道路上发生交通事故，车辆驾驶人应当立即停车，保护现场；造成人身伤亡的，车辆驾驶人应当立即抢救受伤人员，并迅速报告执勤的交通警察或者公安机关交通管理部门。',
    checklist: [
      { priority: 1, label: '现场照片', action: '拍了现场全景照片吗？（车辆位置、路况、标线、碎片分布）全景+特写至少各3张。', reason: '现场照片是事故认定最核心的证据' },
      { priority: 2, label: '行车记录仪', action: '你的车和对方车的行车记录仪是否正常工作？保存好SD卡。', reason: '行车记录仪视频是最直接的动态证据' },
      { priority: 3, label: '交警认定书', action: '交警是否出具了事故责任认定书？你对认定结果有异议可以申请复核。', reason: '责任认定书是后续赔偿和诉讼的法律依据' },
      { priority: 4, label: '伤情鉴定', action: '如果有人受伤，保留所有医疗记录、诊断证明、费用票据。', reason: '伤情鉴定和医疗费用是赔偿计算的基础' },
      { priority: 5, label: '证人信息', action: '现场有没有其他驾驶员、行人停留？记录他们的联系方式。', reason: '证人证言可以补充监控盲区' },
    ],
    tips: [
      '救助伤者前先拍照固定现场（挪动车辆前拍全景）',
      '不私下承诺赔偿金额，一切以交警认定和保险理赔为准',
      '不签署对方提供的任何"私了"协议，除非你完全理解并同意',
    ],
  },
  {
    keywords: ['急救', '心肺复苏', 'CPR', '抢救', '昏迷', '晕倒', 'AED'],
    law: '《民法典》第184条（"好人法"）：因自愿实施紧急救助行为造成受助人损害的，救助人不承担民事责任。',
    checklist: [
      { priority: 1, label: '施救时间', action: '你开始施救的时间？AED是否使用？心肺复苏持续了多久？120何时到达？', reason: '证明你在"黄金4分钟"内尽到了合理救助义务' },
      { priority: 2, label: '现场证人', action: '施救时周围有没有人？有没有其他人参与或协助？', reason: '证明你的施救行为是正当的紧急救助' },
      { priority: 3, label: '自身资质', action: '你是否有急救培训证书？（如红十字会急救证）', reason: '有资质更能证明你具备施救能力，操作符合规范' },
      { priority: 4, label: '伤者状态', action: '你施救前伤者是什么状态？（无意识、无呼吸、有无外伤）', reason: '判断你的救助方式是否适当' },
    ],
    tips: [
      '《民法典》184条明确保护紧急救助者，即使造成受助人损害也不担责',
      '不做超出自己能力范围的救助，心肺复苏可能造成肋骨骨折，这属于合理施救范围',
      '如果被追责，平台会接入法律服务和善行保险为你兜底',
    ],
  },
  {
    keywords: ['见义勇为', '制止', '打架', '拉架', '挡住', '制服', '抢劫', '偷窃', '小偷'],
    law: '《刑法》第20条（正当防卫）：为了使国家、公共利益、本人或者他人的人身、财产和其他权利免受正在进行的不法侵害，而采取的制止不法侵害的行为，对不法侵害人造成损害的，属于正当防卫，不负刑事责任。',
    checklist: [
      { priority: 1, label: '事件经过', action: '详细描述：你看到了什么→你做了什么→结果怎样。重点是"不法侵害正在进行"这个前提。', reason: '正当防卫的核心要件是"正在进行的不法侵害"' },
      { priority: 2, label: '监控/录像', action: '事发地是否有监控？你自己或路人有没有拍视频？', reason: '视频能直接还原"谁先动手""是否正在进行"的关键事实' },
      { priority: 3, label: '伤情', action: '你或对方有没有受伤？去了哪家医院？诊断结果？', reason: '伤情鉴定影响案件定性（正当防卫/防卫过当/互殴）' },
      { priority: 4, label: '报警记录', action: '你是否报了警？警方受理了吗？有没有受案回执？', reason: '警方记录是后续维权的起点' },
    ],
    tips: [
      '如果被警方以"互殴"立案，不要慌，立即要求平台接入律师',
      '正当防卫的认定标准在近年司法实践中已明显放宽（参考"昆山反杀案""福州赵宇案"）',
      '不主动攻击、不追击，"制止正在进行的不法侵害"就足够了',
    ],
  },
];

/**
 * 根据用户描述匹配最相关的场景指南
 * @param userText 用户的描述文本
 * @returns 匹配到的场景指南数组（按匹配度排序），可能为空
 */
export function matchEvidenceGuides(userText: string): SceneGuide[] {
  const text = userText.toLowerCase();
  const scored = EVIDENCE_GUIDES.map(guide => {
    const matchCount = guide.keywords.filter(kw => text.includes(kw)).length;
    return { guide, score: matchCount };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score);
  return scored.map(item => item.guide);
}

/**
 * 将场景指南格式化为prompt文本，供AI引用
 */
export function formatGuideForPrompt(guides: SceneGuide[]): string {
  if (guides.length === 0) return '';
  return '\n\n【相关场景证据指南 — 请引用其中适合的内容指导用户】\n' +
    guides.map(g => {
      const checklist = g.checklist.map(c =>
        `${c.priority}. 【${c.label}】${c.action}（${c.reason}）`
      ).join('\n');
      const tips = g.tips.map(t => `  - ${t}`).join('\n');
      return `场景：${g.keywords.slice(0, 3).join('/')}\n法律依据：${g.law}\n证据清单：\n${checklist}\n注意事项：\n${tips}`;
    }).join('\n\n');
}