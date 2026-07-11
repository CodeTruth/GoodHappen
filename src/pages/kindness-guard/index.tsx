import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { safeNavigateBack } from '@/utils/navigate-back';
import MdText from '@/components/MdText';
import { useProtectionStore } from '@/store/protection';
import { useUserStore } from '@/store/user';
import { useKindnessStore } from '@/store/kindness';
import type { Kindness } from '@/types/kindness';
import { deepseekChat } from '@/services/ai';
import {
  WitnessRecord,
  WITNESS_MATCH_CONFIG,
  calculateDistance,
  isDelayedPost,
  getEffectiveTime,
} from '@/services/evidence';
import styles from './index.module.scss';

// ============================================
// 类型定义
// ============================================

interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
  isLoading?: boolean;
  actions?: string[];
}

/** 可选择的记录项：善行记录 或 善行保护记录 */
interface GuardRecordItem {
  id: string;
  content: string;
  createdAt: string;
  location?: string;
  tags: string[];
  credibilityScore: number;
  sourceType: 'kindness' | 'protection';
  // 原始数据
  source: Kindness | { content: string; timestamp: string; gps: { address?: string }; sealedAt?: string };
}

interface LawFirm {
  name: string;
  displayName: string;
  role: string;
}

interface InsuranceCompany {
  name: string;
  displayName: string;
  product: string;
}

// ============================================
// 合作律所列表
// ============================================

const LAW_FIRMS: LawFirm[] = [
  { name: '北京市盈科律师事务所', displayName: '盈科律所', role: '执业律师' },
  { name: '北京市中伦律师事务所', displayName: '中伦律所', role: '法务智能助手' },
  { name: '北京市金杜律师事务所', displayName: '金杜律所', role: '执业律师' },
  { name: '北京市大成律师事务所', displayName: '大成律所', role: 'AI法务助手' },
  { name: '北京市君合律师事务所', displayName: '君合律所', role: '法务顾问' },
];

// ============================================
// 合作保险公司列表
// ============================================

const INSURANCE_COMPANIES: InsuranceCompany[] = [
  { name: '中国平安财产保险股份有限公司', displayName: '平安财险', product: '善行无忧综合险' },
  { name: '中国太平洋财产保险股份有限公司', displayName: '太平洋财险', product: '善行守护险' },
  { name: '中国人民财产保险股份有限公司', displayName: '人保财险', product: '好人险' },
  { name: '中国人寿财产保险股份有限公司', displayName: '国寿财险', product: '善行保障计划' },
  { name: '众安在线财产保险股份有限公司', displayName: '众安保险', product: '善行者综合保障' },
];

// ============================================
// 见证搜索 Agent 模拟数据
// ============================================

const INLINE_WITNESS_POOL: WitnessRecord[] = [
  {
    id: 'wit_pool_001', recordId: 'k_mock_r001', witnessUserId: 'u_w001', witnessUserName: '暖光小明', witnessUserAvatar: '',
    description: '看到一位年轻人扶老人过马路，老人走得很慢，年轻人一直很耐心地陪着',
    timestamp: '2026-07-10T10:28:00+08:00', gps: { latitude: 39.9048, longitude: 116.4075, address: '北京市朝阳区建国路·路口' },
    matched: true, notified: true, badgeGranted: true,
  },
  {
    id: 'wit_pool_002', recordId: 'k_mock_r002', witnessUserId: 'u_w002', witnessUserName: '路过的小张', witnessUserAvatar: '',
    description: '在马路对面看到有人帮老人，年轻人很小心地扶着老人一步一步走',
    timestamp: '2026-07-10T14:00:00+08:00', gps: { latitude: 39.9120, longitude: 116.4200, address: '北京市朝阳区·家里' },
    matched: true, notified: true, badgeGranted: true,
    eventTimestamp: '2026-07-10T10:30:00+08:00',
    eventGps: { latitude: 39.9043, longitude: 116.4080, address: '北京市朝阳区·路口对面', accuracy: 8 },
    metadataSource: 'exif',
  },
  {
    id: 'wit_pool_003', recordId: 'k_mock_r003', witnessUserId: 'u_w003', witnessUserName: '咖啡店店主', witnessUserAvatar: '',
    description: '有人在店门口帮助了一位摔倒的女生，还把她的东西捡起来了',
    timestamp: '2026-07-10T11:05:00+08:00', gps: { latitude: 39.9055, longitude: 116.4060, address: '北京市朝阳区·咖啡店门口' },
    matched: true, notified: false, badgeGranted: false,
    eventTimestamp: '2026-07-10T10:50:00+08:00',
    eventGps: { latitude: 39.9053, longitude: 116.4062, address: '北京市朝阳区·咖啡店门口', accuracy: 6 },
    metadataSource: 'exif',
  },
  {
    id: 'wit_pool_004', recordId: 'k_mock_r004', witnessUserId: 'u_w004', witnessUserName: '晨跑大叔', witnessUserAvatar: '',
    description: '早上跑步时看到一个年轻人把路边倒下的共享单车一辆一辆扶起来',
    timestamp: '2026-07-10T07:20:00+08:00', gps: { latitude: 39.9080, longitude: 116.4100, address: '北京市朝阳区·公园南门' },
    matched: false, notified: false, badgeGranted: false,
  },
  {
    id: 'wit_pool_005', recordId: 'k_mock_r005', witnessUserId: 'u_w005', witnessUserName: '邻居王姐', witnessUserAvatar: '',
    description: '楼下的小伙子帮我拎了两大袋东西上楼，真是好孩子',
    timestamp: '2026-07-09T17:30:00+08:00', gps: { latitude: 39.9050, longitude: 116.4085, address: '北京市朝阳区·阳光小区3号楼' },
    matched: false, notified: false, badgeGranted: false,
    eventTimestamp: '2026-07-09T17:25:00+08:00',
    eventGps: { latitude: 39.9050, longitude: 116.4085, address: '北京市朝阳区·阳光小区3号楼', accuracy: 4 },
    metadataSource: 'exif',
  },
  {
    id: 'wit_pool_006', recordId: 'k_mock_r006', witnessUserId: 'u_w006', witnessUserName: '快递小哥阿强', witnessUserAvatar: '',
    description: '刚才送货看到一个年轻人帮坐轮椅的老人推过了一个上坡，真的很暖心',
    timestamp: '2026-07-10T15:30:00+08:00', gps: { latitude: 39.9040, longitude: 116.4082, address: '北京市朝阳区·便民市场入口' },
    matched: false, notified: false, badgeGranted: false,
    eventTimestamp: '2026-07-10T15:00:00+08:00',
    eventGps: { latitude: 39.9040, longitude: 116.4082, address: '北京市朝阳区·便民市场入口', accuracy: 10 },
    metadataSource: 'exif',
  },
];

/** 可通知的附近用户（模拟） */
const NEARBY_USERS = [
  { id: 'nearby_001', name: '等公交的李姐', avatar: '', distance: 25, notified: false, responded: true, reward: '30福气值+见证勋章' },
  { id: 'nearby_002', name: '遛狗的张哥', avatar: '', distance: 45, notified: false, responded: true, reward: '30福气值+见证勋章' },
  { id: 'nearby_003', name: '买菜的刘阿姨', avatar: '', distance: 68, notified: false, responded: false, reward: '30福气值+见证勋章' },
  { id: 'nearby_004', name: '路过的外卖员', avatar: '', distance: 92, notified: false, responded: false, reward: '30福气值+见证勋章' },
  { id: 'nearby_005', name: '便利店收银员小陈', avatar: '', distance: 110, notified: false, responded: false, reward: '30福气值+见证勋章' },
];

// ============================================
// 辅助函数
// ============================================

const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max) + '…' : s;

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const formatTimeFull = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// ============================================
// Agent 系统提示词
// ============================================

/** 善守 Agent 提示词 */
function buildGuardPrompt(kindnessCtx: Kindness | null, gpsAddr: string, userAge: string): string {
  const now = new Date().toLocaleString('zh-CN', { hour12: false });
  const hour = new Date().getHours();
  const isNight = hour >= 22 || hour < 5;

  let ctxInfo = '';
  if (kindnessCtx) {
    ctxInfo = `
【用户已关联的善行记录】
- 内容：${kindnessCtx.content}
- 时间：${kindnessCtx.createdAt}
- 地点：${kindnessCtx.location || '未记录'}
- 标签：${kindnessCtx.tags.join('、')}
- 可信度：${Math.round(kindnessCtx.credibilityScore * 100)}%`;
  }

  return `【角色定位】
你是"善守"，善行事后维权AI顾问。帮助做了好事但遇到纠纷的用户，在对话中直接完成所有维权操作。

【你能直接做的事情】
1. 🔒 锁定证据 — 将事件信息打包锁定，生成不可篡改的证据包
2. 👁️ 搜索见证 — 接入「见证搜索Agent」，全网搜索见证者并向附近用户发送帮助请求
3. ⚖️ 接入法律服务 — 为用户对接合作律所平台的律师
4. 💰 接入善行保险 — 为用户对接合作保险公司，咨询、购买、理赔全程在对话中完成

【平台立场 — 你必须始终站在善行者一方】
你的核心使命是：尽一切可能维护行善者的权益，绝不让善行者寒心。

【平台兜底承诺】
当用户问到"打官司要花钱吗""谁出钱""费用怎么办""平台管不管"时，明确告知：
- 「善行兜底保障」：一旦法院、警方等官方机构判定善行者无需承担任何责任、无任何过错，平台将承担全部维权费用（律师费、诉讼费、鉴定费等一切费用）
- 这个承诺不是空头支票，是平台对每一位善行者的庄严承诺
- 平台会做的一切努力：\n  ① 一键固定证据\n  ② 搜索并整理见证\n  ③ 合作律所法律服务\n  ④ 费用全兜底 — 官方判定无责后，所有维权费用由平台承担，你一分钱不用出
- 平台做这些，只为了一个信念：让好人敢做好事，让善良不被辜负

【工作方式】
- 用户描述纠纷后，主动分析情况并建议下一步
- 用户可通过聊天底部按钮触发操作（锁定证据、搜索见证、法律服务、善行保险）
- 如果用户明确说"要律师""需要法律服务""接入法律服务""法律咨询"等，系统会自动执行接入
- 如果用户明确说"查保险""看保险""保险理赔""善行保险""我的保险"等，系统会自动执行接入
- 所有操作结果都在聊天中直接展示，不需要跳转
- 给出清晰可执行的维权步骤
- 当你判断用户的纠纷涉及法律责任问题，主动询问用户"需要我为你接入合作律所平台的法律服务吗？"
- 当你判断用户可能需要保险理赔，主动询问用户"需要接入善行保险Agent咨询保险和理赔吗？"

【见证搜索说明】
- 搜索见证会接入独立的「见证搜索Agent」，它会：
  1. 在平台全网搜索同一时间地点的善行记录和视频
  2. 向事发时在附近的平台用户发送帮助请求通知
  3. 被采纳的见证用户将获得30福气值+见证勋章奖励

【善行保险说明】
- 善行保险接入独立的「保险Agent」，由合作保险公司提供服务
- 保险费用：平台补贴大头，用户只需出小头
- 保险Agent可处理：产品介绍、咨询问答、购买指引、生效时间、保险范围、事后理赔

【当前信息】
当前时间：${now}
用户位置：${gpsAddr}
用户年龄：${userAge || '未知'}${isNight ? '\n⚠️ 当前为夜间时段' : ''}
${ctxInfo}

【绝对边界】
- 只回答善行纠纷维权相关问题
- 不提供正式法律建议（引导用户接入律所平台的律师）
- 不提供正式保险建议（引导用户接入保险Agent）
- 不回答无关问题，礼貌引导回正题`;
}

/** 律师 Agent 提示词 */
function buildLawyerPrompt(lawFirm: LawFirm, kindnessCtx: Kindness | null, accumulatedDesc: string): string {
  let caseInfo = '';
  if (kindnessCtx) {
    caseInfo = `\n【案件背景 — 来自善行记录】\n事件：${kindnessCtx.content}\n时间：${kindnessCtx.createdAt}\n地点：${kindnessCtx.location || '未记录'}\n可信度：${Math.round(kindnessCtx.credibilityScore * 100)}%`;
  } else if (accumulatedDesc) {
    caseInfo = `\n【案件背景】\n${accumulatedDesc}`;
  }

  return `【角色定位】
你是${lawFirm.name}的${lawFirm.role}，已通过「好事发生」平台接入，正在为一位做了好事但遇到纠纷的用户提供法律咨询服务。

【重要说明】
- 你是由律所平台指派接入的，可能是AI法务助手，也可能是执业律师（由律所平台根据案件情况决定）
- 你提供的分析是初步法律咨询意见，正式法律意见需以书面文件为准
- 如果案件复杂或需要出庭代理，建议预约面谈或电话沟通

【服务原则】
- 专业、客观、严谨
- 基于用户提供的事实给出法律分析
- 不清楚的事实主动询问，不臆测
- 如果证据不足，明确告知还需要补充什么
- 始终站在善行者一方，维护其合法权益

【当前案件】${caseInfo}

【平台兜底背景】
用户所在平台承诺：一旦官方机构判定善行者无责，平台将承担全部维权费用。这包括律师费、诉讼费等一切费用。

【对话风格】
- 专业但不冷漠，有温度
- 先倾听事实，再分析法律问题
- 用通俗语言解释法律概念
- 回复简洁，聚焦法律问题本身`;
}

/** 见证搜索 Agent 提示词 */
function buildWitnessAgentPrompt(kindnessCtx: Kindness | null, accumulatedDesc: string, searchResult: string): string {
  const eventInfo = kindnessCtx
    ? `事件：${kindnessCtx.content}\n时间：${kindnessCtx.createdAt}\n地点：${kindnessCtx.location || '未记录'}`
    : accumulatedDesc;

  return `【角色定位】
你是「好事发生」平台的见证搜索Agent，你的任务是帮助遇到纠纷的善行者找到证据和见证者。

【你的能力】
1. 全网搜索 — 在平台内和公开网络上搜索同一时间地点的善行视频、帖子、见证记录
2. 发送帮助请求 — 向事发时在附近（GPS 500米内、时间30分钟内）的平台用户发送求助通知
3. 证据整理 — 将找到的见证信息整理成结构化证据报告

【当前搜索任务】${eventInfo}

【已完成的搜索结果】
${searchResult}

【关于帮助请求】
- 你已经向事发时在附近的平台用户发送了帮助请求
- 被采纳的见证用户将获得：30福气值 + 见证勋章
- 这个奖励机制是为了鼓励更多人站出来为善行者作证
- 你可以向用户说明这个机制

【对话风格】
- 你是一个专注、高效的搜索专家
- 回复简洁，聚焦搜索结果和证据分析
- 如果用户对搜索结果有疑问，帮助分析
- 如果需要补充搜索信息（扩大范围、调整关键词），引导用户说明`;
}

/** 保险 Agent 提示词 */
function buildInsuranceAgentPrompt(company: InsuranceCompany, kindnessCtx: Kindness | null, accumulatedDesc: string): string {
  const eventInfo = kindnessCtx
    ? `事件：${kindnessCtx.content}\n时间：${kindnessCtx.createdAt}\n地点：${kindnessCtx.location || '未记录'}`
    : accumulatedDesc;

  return `【角色定位】
你是${company.name}的保险服务专员，已通过「好事发生」平台接入，正在为用户提供善行保险相关的咨询和服务。

【你负责的产品】
${company.product}

【你能做的事情】
1. 产品介绍 — 详细介绍善行保险的保障范围、保额、生效条件
2. 费用咨询 — 解释保费构成：平台补贴大头，用户只需出小头
3. 购买指引 — 指导用户如何购买、生效时间和注意事项
4. 理赔服务 — 协助用户进行事后理赔，包括材料准备、流程指引、进度查询
5. 保单管理 — 查询保单状态、续保提醒、保障升级

【产品核心信息】
- 法律费用保额：¥50,000
- 赔偿金保额：¥100,000
- 生效条件：累计30天善行记录
- 保费：平台补贴大部分，用户仅需支付少量（约¥9.9/年）
- 理赔前提：官方机构（法院、警方）判定善行者无责

【费用说明 — 重点传达】
- 善行保险的费用由平台和保险公司共同补贴
- 用户实际支付金额非常低（象征性收费，约¥9.9/年）
- 平台补贴大头，目的是让每位善行者都能负担得起保障
- 这个低价不是保障缩水，而是平台的公益投入

【当前用户情况】${eventInfo || '用户尚未提供具体事件信息'}

【对话风格】
- 专业、耐心、亲切
- 像保险顾问一样细致解答
- 用通俗语言解释保险条款
- 主动询问用户的保障需求
- 回复简洁，聚焦保险问题本身`;
}

/** 兜底回复 */
function getFallbackResponse(userInput: string, hasKindness: boolean): string {
  if (hasKindness) {
    return `我看到了你的善行记录，遇到纠纷不要慌。我这边可以直接帮你：\n\n1. 🔒 锁定证据\n2. 👁️ 搜索见证\n3. ⚖️ 接入法律服务\n4. 💰 接入善行保险\n\n你想先做哪一步？直接说就行。`;
  }
  if (/时间|地点|什么时候|哪里/.test(userInput)) {
    return `信息收到。根据你描述的情况，我建议先锁定证据，再搜索看看有没有人见证了这件事。\n\n点击下方按钮，或者直接告诉我你想先做哪一步。`;
  }
  return `理解你的处境。为了更好地帮你，请告诉我：\n\n⏰ 什么时间发生的？\n📍 在哪里？\n👤 涉及哪些人？\n📝 具体发生了什么？\n\n你也可以选择一条已发布的善行记录。`;
}

// ============================================
// 主组件
// ============================================

type AgentMode = 'guard' | 'witness' | 'lawyer' | 'insurance';

export default function KindnessGuardPage() {
  const { triggerSOS, matchLawyer, checkInsuranceEligibility, loadFromStorage: loadProtection, evidencePackages } = useProtectionStore();
  const { userInfo, loadFromStorage: loadUser } = useUserStore();
  const { publishedList, loadFromStorage: loadKindness } = useKindnessStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  const [inputText, setInputText] = useState('');
  const [selectedKindness, setSelectedKindness] = useState<Kindness | null>(null);
  const [showKindnessCards, setShowKindnessCards] = useState(false);
  const [gpsInfo, setGpsInfo] = useState({ latitude: 39.9042, longitude: 116.4074, address: '北京市' });
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

  // Agent 模式
  const [agentMode, setAgentMode] = useState<AgentMode>('guard');
  const agentModeRef = useRef(agentMode);
  useEffect(() => { agentModeRef.current = agentMode; }, [agentMode]);
  const [currentLawFirm, setCurrentLawFirm] = useState<LawFirm | null>(null);
  const [currentInsurance, setCurrentInsurance] = useState<InsuranceCompany | null>(null);
  const [witnessSearchResult, setWitnessSearchResult] = useState('');

  const accumulatedDescRef = useRef('');
  const scrollRef = useRef<any>(null);
  const lastAskedForLawyerRef = useRef(false);
  const lastAskedForInsuranceRef = useRef(false);
  const selectedKindnessRef = useRef<Kindness | null>(null);

  // ===== 初始化 =====
  useEffect(() => {
    loadProtection();
    loadUser();
    loadKindness();
    const coordType = process.env.TARO_ENV === 'h5' ? 'wgs84' as const : 'gcj02' as const;
    Taro.getLocation({ type: coordType })
      .then((loc) => setGpsInfo({ latitude: loc.latitude, longitude: loc.longitude, address: `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}` }))
      .catch(() => {});
  }, []);

  // ===== 合并记录列表：善行记录 + 善行保护记录 =====
  const allRecords = useMemo((): GuardRecordItem[] => {
    const uid = userInfo?.id || 'currentUser';

    // 善行记录
    const kindnessRecords = publishedList
      .filter(k => k.userId === uid && k.type === 'self')
      .map(k => ({
        id: k.id,
        content: k.content,
        createdAt: k.createdAt,
        location: k.location,
        tags: k.tags,
        credibilityScore: k.credibilityScore,
        sourceType: 'kindness' as const,
        source: k,
      }));

    // 善行保护记录（证据包）
    const protectionRecords = evidencePackages
      .filter(pkg => pkg.recordId && pkg.content)
      .map(pkg => ({
        id: `protect_${pkg.recordId}`,
        content: pkg.content,
        createdAt: pkg.sealedAt || pkg.timestamp,
        location: pkg.gps?.address || pkg.eventGps?.address,
        tags: ['已锁定证据'],
        credibilityScore: 0.95,
        sourceType: 'protection' as const,
        source: pkg,
      }));

    // 合并并按时间倒序
    return [...kindnessRecords, ...protectionRecords].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [publishedList, userInfo, evidencePackages]);

  // ===== 欢迎消息 =====
  useEffect(() => {
    const intro = `🛡️ 别怕，平台永远站在善行者这边。\n\n` +
      `做了好事被讹？被误解？需要证据？——我全程帮你搞定。\n\n` +
      `我能做的 4 件事：\n` +
      `🔒 锁定证据　👁️ 搜索见证　⚖️ 法律服务　💰 善行保险\n\n` +
      `━━━\n` +
      `📌 核心承诺：官方判定你无责后，所有维权费用平台全包，你一分钱不出。\n\n` +
      `━━━\n` +
      `📝 告诉我发生了什么：\n` +
      `• 已有记录 → 点左下角「选择记录」\n` +
      `• 没有记录 → 直接说：时间、地点、人物、经过`;

    setMessages([{
      id: 'welcome', role: 'ai',
      content: intro,
      timestamp: new Date().toISOString(),
      actions: ['锁定证据', '搜索见证', '法律服务', '善行保险'],
    }]);
  }, []);

  // ===== 滚动 =====
  useEffect(() => {
    setTimeout(() => { if (scrollRef.current) scrollRef.current.scrollTop = 99999; }, 200);
  }, [messages, showKindnessCards]);

  // ===== 获取可用行动按钮 =====
  const getAvailableActions = useCallback((): string[] => {
    const mode = agentModeRef.current;
    if (mode === 'lawyer') return ['\u7ED3\u675F\u54A8\u8BE2'];
    if (mode === 'witness') return ['\u7ED3\u675F\u641C\u7D22'];
    if (mode === 'insurance') return ['\u7ED3\u675F\u54A8\u8BE2'];
    const actions: string[] = [];
    if (!completedActions.has('evidence')) actions.push('\u9501\u5B9A\u8BC1\u636E');
    if (!completedActions.has('witness')) actions.push('\u641C\u7D22\u89C1\u8BC1');
    if (!completedActions.has('lawyer')) actions.push('\u6CD5\u5F8B\u670D\u52A1');
    if (!completedActions.has('insurance')) actions.push('\u5584\u884C\u4FDD\u9669');
    return actions;
  }, [completedActions]);

  // ===== 消息辅助函数 =====
  const addAIMessage = useCallback((content: string, actions?: string[]) => {
    setMessages(prev => [...prev, {
      id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      role: 'ai', content, timestamp: new Date().toISOString(), actions,
    }]);
  }, []);

  const addLoadingMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, {
      id: `loading_${Date.now()}`, role: 'ai', content: text,
      timestamp: new Date().toISOString(), isLoading: true,
    }]);
  }, []);

  const removeLoadingMessages = useCallback(() => {
    setMessages(prev => prev.filter(m => !m.isLoading));
  }, []);

  // ===== 见证搜索 Agent =====
  const doSearchWitness = useCallback(async () => {
    const kindnessCtx = selectedKindnessRef.current;
    const eventDesc = kindnessCtx?.content || accumulatedDescRef.current;
    if (!eventDesc) {
      addAIMessage('我需要先了解你遇到了什么事才能搜索见证者。请描述一下时间、地点和事件经过。');
      return;
    }

    addLoadingMessage('👁️ 正在接入见证搜索Agent…\n全网搜索中：平台记录 · 社交媒体 · 视频平台');

    await new Promise(r => setTimeout(r, 1200));

    const storeWitnesses: WitnessRecord[] = publishedList
      .filter(k => k.type === 'witness')
      .map(k => ({
        id: `store_${k.id}`, recordId: k.id, witnessUserId: k.userId,
        witnessUserName: k.userName, witnessUserAvatar: k.userAvatar || '',
        description: k.content, timestamp: k.createdAt,
        gps: { latitude: 39.905, longitude: 116.408, address: k.location || '未知地点' },
        matched: true, notified: false, badgeGranted: false,
      }));
    const storeKeys = new Set(storeWitnesses.map(w => `${w.witnessUserId}_${w.description.slice(0, 20)}`));
    const pool = [
      ...INLINE_WITNESS_POOL.filter(w => !storeKeys.has(`${w.witnessUserId}_${w.description.slice(0, 20)}`)),
      ...storeWitnesses,
    ];

    const baseTime = kindnessCtx
      ? new Date(kindnessCtx.createdAt).getTime()
      : new Date().getTime();
    const baseLat = kindnessCtx?.location?.includes('建国路') ? 39.9045 : gpsInfo.latitude;
    const baseLng = kindnessCtx?.location?.includes('建国路') ? 116.4075 : gpsInfo.longitude;

    const matched = pool.filter(w => {
      const wTime = new Date(getEffectiveTime(w)).getTime();
      const timeDiff = Math.abs(wTime - baseTime) / 60000;
      const isDelayed = isDelayedPost(w);
      const maxMinutes = isDelayed
        ? WITNESS_MATCH_CONFIG.DELAYED_POST_TIME_EXTENSION_MINUTES
        : WITNESS_MATCH_CONFIG.TIME_WINDOW_MINUTES;
      if (timeDiff > maxMinutes) return false;
      const wGps = w.eventGps || w.gps;
      const dist = calculateDistance(baseLat, baseLng, wGps.latitude, wGps.longitude);
      return dist <= WITNESS_MATCH_CONFIG.LOCATION_RADIUS_METERS;
    });

    matched.sort((a, b) => {
      const dA = calculateDistance(baseLat, baseLng, (a.eventGps || a.gps).latitude, (a.eventGps || a.gps).longitude);
      const dB = calculateDistance(baseLat, baseLng, (b.eventGps || b.gps).latitude, (b.eventGps || b.gps).longitude);
      return dA - dB;
    });

    removeLoadingMessages();

    const baseTimeStr = formatTimeFull(new Date(baseTime).toISOString());
    let searchReport = `🔍 【见证搜索Agent · 第一阶段】全网搜索完成\n\n搜索范围：${baseTimeStr} ±30分钟 · ±100米\n`;

    if (matched.length === 0) {
      searchReport += `\n暂未在平台找到已有的见证记录，即将向附近用户发送帮助请求。`;
    } else {
      searchReport += `\n✅ 找到 ${matched.length} 条已有见证记录：\n\n`;
      matched.forEach((w, i) => {
        const wGps = w.eventGps || w.gps;
        const dist = Math.round(calculateDistance(baseLat, baseLng, wGps.latitude, wGps.longitude));
        const wTime = getEffectiveTime(w);
        const delayed = isDelayedPost(w);
        searchReport += `${i + 1}. ${w.witnessUserName}\n`;
        searchReport += `   "${truncate(w.description, 40)}"\n`;
        searchReport += `   📍 ${wGps.address} · ${dist}m\n`;
        searchReport += `   🕐 ${formatTime(wTime)}${delayed ? ' (事件时间·EXIF提取)' : ''}\n`;
        searchReport += `   ✅ 时间吻合 · 距离${dist}m\n\n`;
      });
    }

    addAIMessage(searchReport);
    setWitnessSearchResult(searchReport);

    if (matched.length === 0) {
      addAIMessage('暂未在平台找到已有见证记录。是否要向事发时附近的平台用户发送求助通知，请他们提供证据？', ['向附近用户求助', '暂时不']);
      return;
    }

    addAIMessage(`已找到 ${matched.length} 条见证记录。是否还要向事发时附近的平台用户发送求助通知，寻找更多见证者？`, ['继续搜索更多见证', '这些就够了']);
  }, [selectedKindness, gpsInfo, publishedList, addAIMessage, addLoadingMessage, removeLoadingMessages]);

  // ===== 见证搜索第二阶段：向附近用户发求助 =====
  const doSearchWitnessPhase2 = useCallback(async () => {
    addLoadingMessage('正在向事发时附近的平台用户发送帮助请求...');

    await new Promise(r => setTimeout(r, 2000));
    removeLoadingMessages();

    const notifyRadius = 500;
    const nearbyNotified = NEARBY_USERS.filter(u => u.distance <= notifyRadius);
    const responded = nearbyNotified.filter(u => u.responded);

    let notifyReport = '**见证搜索 · 第二阶段** 帮助请求已发送\n\n';
    notifyReport += `向事发时 ${notifyRadius}米 内的 ${nearbyNotified.length} 位平台用户发送了求助通知：\n\n`;

    nearbyNotified.forEach((u, i) => {
      const status = u.responded ? '✅ 已回应' : '⏳ 等待回应';
      notifyReport += `${i + 1}. ${u.name}（${u.distance}m）${status}\n`;
    });

    notifyReport += `\n已收到 ${responded.length} 位用户的回应。`;

    if (responded.length > 0) {
      notifyReport += `\n\n🎁 见证奖励：被采纳的见证用户将获得 30福气值 + 见证勋章。`;
    }

    const prevMatched = (witnessSearchResult || '').match(/找到 (\d+) 条/);
    const prevCount = prevMatched ? parseInt(prevMatched[1]) : 0;
    const totalWitness = prevCount + responded.length;
    const chainFormed = totalWitness >= WITNESS_MATCH_CONFIG.MIN_WITNESS_FOR_CHAIN;

    notifyReport += `\n\n**综合证据链评估：**\n`;
    notifyReport += `· 平台记录：${prevCount} 条\n`;
    notifyReport += `· 用户回应：${responded.length} 人\n`;
    notifyReport += `· 合计见证：${totalWitness} 位\n`;
    if (chainFormed) {
      notifyReport += `· ✅ 已满足证据链形成条件（≥2人），证据链完整。`;
    } else {
      notifyReport += `· ⏳ 还需 ${WITNESS_MATCH_CONFIG.MIN_WITNESS_FOR_CHAIN - totalWitness} 位见证者即可形成证据链。`;
    }

    setAgentMode('witness');
    setCompletedActions(prev => new Set(prev).add('witness'));
    lastAskedForLawyerRef.current = false;
    lastAskedForInsuranceRef.current = false;

    addAIMessage(notifyReport, ['结束搜索']);
  }, [addAIMessage, addLoadingMessage, removeLoadingMessages, witnessSearchResult]);

  // ===== 退出见证搜索 Agent =====
  const exitWitnessMode = useCallback(() => {
    agentModeRef.current = 'guard';
    setAgentMode('guard');
    setWitnessSearchResult('');
    addAIMessage(
      `见证搜索已结束，回到善行守护顾问。\n\n搜索结果已保存，后续可以随时查看。还需要我帮你做什么？`,
      getAvailableActions()
    );
  }, [addAIMessage, getAvailableActions]);

  // ===== 锁定证据 =====
  const doLockEvidence = useCallback(async () => {
    if (!selectedKindness) {
      addAIMessage('锁定证据需要先关联一条善行记录。请先选择一条记录，或描述事件详情后我会帮你创建记录。');
      return;
    }

    addLoadingMessage('🔒 正在锁定证据包…');

    try {
      const desc = `关于善行「${truncate(selectedKindness.content, 20)}」遇到纠纷，需要锁定证据`;
      await triggerSOS(selectedKindness.id, desc);
      removeLoadingMessages();
      setCompletedActions(prev => new Set(prev).add('evidence'));

      addAIMessage(
        `🔒 证据已锁定\n\n` +
        `• 记录：「${truncate(selectedKindness.content, 30)}」\n` +
        `• 锁定时间：${new Date().toLocaleString('zh-CN', { hour12: false })}\n` +
        `• 状态：已标记为"争议前存入"\n` +
        `• GPS：${gpsInfo.address}\n\n` +
        `该证据包已生成不可篡改的哈希值，可在「证据历史」中查看。`,
        getAvailableActions()
      );
    } catch {
      removeLoadingMessages();
      addAIMessage('🔒 证据锁定遇到问题，但你的善行记录本身已带有时间戳和可信度评分，仍然可以作为证据使用。', getAvailableActions());
    }
  }, [selectedKindness, gpsInfo, triggerSOS, addAIMessage, addLoadingMessage, removeLoadingMessages, getAvailableActions]);

  // ===== 接入法律服务 =====
  const doConnectLawyer = useCallback(() => {
    addLoadingMessage('⚖️ 正在接入合作律所平台…');

    setTimeout(() => {
      removeLoadingMessages();
      const firm = LAW_FIRMS[Math.floor(Math.random() * LAW_FIRMS.length)];
      setCurrentLawFirm(firm);
      setAgentMode('lawyer');
      setCompletedActions(prev => new Set(prev).add('lawyer'));
      lastAskedForLawyerRef.current = false;
      lastAskedForInsuranceRef.current = false;

      const isAI = firm.role.includes('AI') || firm.role.includes('智能');
      const roleDesc = isAI ? 'AI法务助手' : firm.role;

      addAIMessage(
        `⚖️ 已接入 ${firm.name}\n\n` +
        `你好，我是${firm.displayName}的${roleDesc}。\n\n` +
        `我已经查看了你之前的描述，现在可以直接向我咨询法律问题。` +
        (isAI
          ? '\n\n（我是律所平台指派的AI法务助手，如果你的案件需要执业律师介入，我可以为你转接。）'
          : '\n\n（我是律所平台指派的执业律师，会根据你的情况提供专业法律分析。）'),
        ['结束咨询']
      );
    }, 1500);
  }, [addAIMessage, addLoadingMessage, removeLoadingMessages]);

  // ===== 退出律师模式 =====
  const exitLawyerMode = useCallback(() => {
    agentModeRef.current = 'guard';
    setAgentMode('guard');
    setCurrentLawFirm(null);
    lastAskedForLawyerRef.current = false;
    lastAskedForInsuranceRef.current = false;
    addAIMessage(
      `已结束法律咨询，回到善行守护顾问。\n\n如果还有需要，可以继续使用其他功能：锁定证据、搜索见证、查看保险。`,
      getAvailableActions()
    );
  }, [addAIMessage, getAvailableActions]);

  // ===== 接入保险 Agent =====
  const doConnectInsurance = useCallback(() => {
    addLoadingMessage('💰 正在接入合作保险公司…');

    setTimeout(() => {
      removeLoadingMessages();
      const company = INSURANCE_COMPANIES[Math.floor(Math.random() * INSURANCE_COMPANIES.length)];
      setCurrentInsurance(company);
      setAgentMode('insurance');
      setCompletedActions(prev => new Set(prev).add('insurance'));
      lastAskedForLawyerRef.current = false;
      lastAskedForInsuranceRef.current = false;

      addAIMessage(
        `💰 已接入 ${company.name}\n\n` +
        `你好，我是${company.displayName}的保险服务专员。\n\n` +
        `我已经查看了你之前的情况，现在可以为你提供善行保险的咨询和服务。\n\n` +
        `我可以帮你：\n` +
        `• 了解善行保险的保障范围和保额\n` +
        `• 咨询保费（平台补贴大头，你只需出小头）\n` +
        `• 指导购买和生效流程\n` +
        `• 协助事后理赔\n\n` +
        `你想了解哪方面？`,
        ['结束咨询']
      );
    }, 1500);
  }, [addAIMessage, addLoadingMessage, removeLoadingMessages]);

  // ===== 退出保险模式 =====
  const exitInsuranceMode = useCallback(() => {
    agentModeRef.current = 'guard';
    setAgentMode('guard');
    setCurrentInsurance(null);
    lastAskedForLawyerRef.current = false;
    lastAskedForInsuranceRef.current = false;
    addAIMessage(
      `已结束保险咨询，回到善行守护顾问。\n\n如果还有需要，可以继续使用其他功能：锁定证据、搜索见证、法律服务。`,
      getAvailableActions()
    );
  }, [addAIMessage, getAvailableActions]);

  // ===== 行动按钮分发 =====
  const handleAction = useCallback((label: string) => {
    switch (label) {
      case '\u9501\u5B9A\u8BC1\u636E': doLockEvidence(); break;
      case '\u641C\u7D22\u89C1\u8BC1': doSearchWitness(); break;
      case '\u6CD5\u5F8B\u670D\u52A1': doConnectLawyer(); break;
      case '\u5584\u884C\u4FDD\u9669': doConnectInsurance(); break;
      case '\u7ED3\u675F\u54A8\u8BE2':
        if (agentMode === 'lawyer') exitLawyerMode();
        else if (agentMode === 'insurance') exitInsuranceMode();
        break;
      case '\u7ED3\u675F\u641C\u7D22': exitWitnessMode(); break;
      case '\u7EE7\u7EED\u641C\u7D22\u66F4\u591A\u89C1\u8BC1':
      case '\u5411\u9644\u8FD1\u7528\u6237\u6C42\u52A9':
        doSearchWitnessPhase2(); break;
    }
  }, [doLockEvidence, doSearchWitness, doConnectLawyer, doConnectInsurance, exitLawyerMode, exitInsuranceMode, exitWitnessMode, agentMode, doSearchWitnessPhase2]);

  // ===== AI对话（多Agent路由）=====
  const getSystemPrompt = useCallback(() => {
    if (agentMode === 'lawyer' && currentLawFirm) {
      return buildLawyerPrompt(currentLawFirm, selectedKindness, accumulatedDescRef.current);
    }
    if (agentMode === 'witness') {
      return buildWitnessAgentPrompt(selectedKindness, accumulatedDescRef.current, witnessSearchResult);
    }
    if (agentMode === 'insurance' && currentInsurance) {
      return buildInsuranceAgentPrompt(currentInsurance, selectedKindness, accumulatedDescRef.current);
    }
    return buildGuardPrompt(selectedKindness, gpsInfo.address, userInfo?.age ? String(userInfo.age) : '');
  }, [agentMode, currentLawFirm, currentInsurance, selectedKindness, gpsInfo, userInfo, witnessSearchResult]);

  const processUserMessage = useCallback(async (text: string) => {
    if (!selectedKindness) {
      accumulatedDescRef.current = accumulatedDescRef.current
        ? `${accumulatedDescRef.current}\n${text}`
        : text;
    }

    // 善守模式：检测意图直接触发功能
    if (agentMode === 'guard') {
      const wantsLawyer = /要律师|需要法律服务|接入法律服务|法律咨询|找律师|请律师|法律帮助|法律支援/.test(text);
      const isConfirmLawyer = lastAskedForLawyerRef.current && text.trim().length <= 12 && /^(好的|好|行|可以|同意|嗯|要|需要|接入|是的)/.test(text.trim());
      if (wantsLawyer || isConfirmLawyer) {
        lastAskedForLawyerRef.current = false;
        lastAskedForInsuranceRef.current = false;
        doConnectLawyer();
        return;
      }

      const wantsInsurance = /查保险|看保险|保险理赔|善行保险|我的保险|保险状态|理赔|保额/.test(text);
      const isConfirmInsurance = lastAskedForInsuranceRef.current && text.trim().length <= 12 && /^(好的|好|行|可以|同意|嗯|要|需要|是的)/.test(text.trim());
      if (wantsInsurance || isConfirmInsurance) {
        lastAskedForLawyerRef.current = false;
        lastAskedForInsuranceRef.current = false;
        doConnectInsurance();
        return;
      }
    }

    const history = messagesRef.current
      .filter(m => !m.isLoading)
      .slice(-8)
      .map(m => ({ role: m.role === 'ai' ? 'assistant' as const : 'user' as const, content: m.content || '' }));

    const loadingText = agentMode === 'lawyer' ? '律师正在分析…' : agentMode === 'witness' ? '搜索Agent分析中…' : agentMode === 'insurance' ? '保险专员正在处理…' : '正在思考…';
    addLoadingMessage(loadingText);

    try {
      const reply = await deepseekChat([
        { role: 'system', content: getSystemPrompt() },
        ...history,
        { role: 'user', content: text },
      ]);

      removeLoadingMessages();

      // 善守模式：检测AI回复中的意图触发
      if (agentMode === 'guard') {
        const askedForLawyer = /是否需要.*法律服务|要不要.*接入.*律师|需要.*法律帮助|接入.*法律服务|为你接入.*律师/.test(reply);
        lastAskedForLawyerRef.current = askedForLawyer;

        const askedForInsurance = /是否需要.*查询保险|要不要.*查.*保险|需要.*保险理赔|查询.*保险状态|善行保险.*查询/.test(reply);
        lastAskedForInsuranceRef.current = askedForInsurance;

        addAIMessage(reply, getAvailableActions());
      } else {
        addAIMessage(reply, getAvailableActions());
      }
    } catch {
      removeLoadingMessages();
      if (agentMode === 'guard') {
        addAIMessage(getFallbackResponse(text, !!selectedKindness), getAvailableActions());
      } else {
        addAIMessage('处理遇到问题，请重试。', getAvailableActions());
      }
    }
  }, [agentMode, getSystemPrompt, selectedKindness, completedActions, addAIMessage, addLoadingMessage, removeLoadingMessages, getAvailableActions, doSearchWitness, doConnectLawyer, doConnectInsurance]);

  // ===== 发送消息 =====
  const sendText = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    if (messagesRef.current.some(m => m.isLoading)) return;
    setMessages(prev => [...prev, {
      id: `u_${Date.now()}`, role: 'user', content: text, timestamp: new Date().toISOString(),
    }]);
    setInputText('');
    setShowKindnessCards(false);
    processUserMessage(text);
  }, [inputText, processUserMessage]);

  // ===== 选择记录（善行记录 或 保护记录）=====
  const handleSelectRecord = useCallback((item: GuardRecordItem) => {
    // 转换为 Kindness 兼容结构（用于后续 agent 提示词）
    const mockKindness: Kindness = {
      id: item.id,
      userId: userInfo?.id || 'currentUser',
      userName: userInfo?.nickname || '温暖体验官',
      userAvatar: userInfo?.avatar || '',
      content: item.content,
      type: 'self',
      tags: item.tags,
      images: [],
      video: null,
      location: item.location,
      visibleScope: 'public',
      circleId: null,
      credibilityScore: item.credibilityScore,
      blessingValue: 0,
      isAnonymous: false,
      createdAt: item.createdAt,
      likes: 0,
      comments: 0,
    };

    setSelectedKindness(mockKindness);
    selectedKindnessRef.current = mockKindness;
    setShowKindnessCards(false);
    accumulatedDescRef.current = item.content;
    setCompletedActions(new Set());

    if (agentMode !== 'guard') {
      setAgentMode('guard');
      setCurrentLawFirm(null);
      setCurrentInsurance(null);
      setWitnessSearchResult('');
    }

    const typeLabel = item.sourceType === 'protection' ? '已锁定的证据' : '善行记录';
    const ctxMsg = `我遇到了纠纷，是关于这条${typeLabel}：\n\n"${item.content}"\n\n时间：${item.createdAt}\n地点：${item.location || '未记录'}`;

    setMessages(prev => [...prev, {
      id: `u_ctx_${Date.now()}`, role: 'user',
      content: `📝 选择了：「${truncate(item.content, 30)}」${item.sourceType === 'protection' ? '（已锁定证据）' : ''}`,
      timestamp: new Date().toISOString(),
    }]);
    processUserMessage(ctxMsg);
  }, [processUserMessage, agentMode, userInfo]);

  // ===== 顶部栏配置 =====
  const topBarConfig = useMemo(() => {
    switch (agentMode) {
      case 'witness': return { avatar: '👁️', title: '见证搜索', status: '搜索Agent · 全网搜索+用户通知', color: '#D97706' };
      case 'lawyer': return { avatar: '⚖️', title: '法律服务', status: currentLawFirm ? `${currentLawFirm.displayName} · ${currentLawFirm.role}` : '律所平台接入中', color: '#2563EB' };
      case 'insurance': return { avatar: '💰', title: '善行保险', status: currentInsurance ? `${currentInsurance.displayName} · 保险服务专员` : '保险公司接入中', color: '#059669' };
      default: return { avatar: '🛡️', title: '善行守护', status: 'AI在线 · 全程在对话中完成', color: '#16A34A' };
    }
  }, [agentMode, currentLawFirm, currentInsurance]);

  const placeholderText = agentMode === 'witness' ? '对搜索结果提问，或补充搜索信息…' : agentMode === 'lawyer' ? '向律师描述情况或提问…' : agentMode === 'insurance' ? '向保险专员咨询问题…' : (selectedKindness ? '描述你遇到的纠纷…' : '描述时间、地点、人物、事件…');

  // ===== 渲染消息 =====
  const renderMessage = (msg: ChatMessage) => {
    const isAI = msg.role === 'ai';

    if (msg.isLoading) {
      return (
        <View key={msg.id} className={`${styles.msgRow} ${styles.msgLeft}`}>
          <View className={styles.msgAvatar}>{topBarConfig.avatar}</View>
          <View className={styles.msgBubble}>
            <Text className={styles.loadingText}>{msg.content}</Text>
            <View className={styles.typingDots}>
              <View className={styles.typingDot} />
              <View className={styles.typingDot} />
              <View className={styles.typingDot} />
            </View>
          </View>
        </View>
      );
    }

    return (
      <View key={msg.id}>
        <View className={`${styles.msgRow} ${isAI ? styles.msgLeft : styles.msgRight}`}>
          {isAI && <View className={styles.msgAvatar}>{topBarConfig.avatar}</View>}
          <View className={`${styles.msgBubble} ${isAI ? styles.bubbleAI : styles.bubbleUser}`}>
            <MdText className={styles.msgText} content={msg.content} />
          </View>
          {!isAI && <View className={styles.msgAvatar}>😊</View>}
        </View>
        {isAI && msg.actions && msg.actions.length > 0 && (
          <View className={styles.actionRow}>
            {msg.actions.map(label => (
              <View key={label} className={styles.actionBtn} onClick={() => handleAction(label)}>
                <Text className={styles.actionBtnLabel}>{label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className={styles.page}>
      {/* 顶部栏 */}
      <View className={styles.topBar}>
        <View className={styles.backBtn} onClick={() => safeNavigateBack()}>
          <Text>←</Text>
        </View>
        <View className={styles.topAvatar}>{topBarConfig.avatar}</View>
        <View className={styles.topInfo}>
          <Text className={styles.topTitle}>{topBarConfig.title}</Text>
          <View className={styles.topStatus}>
            <View className={styles.topStatusDot} style={{ background: topBarConfig.color }} />
            <Text className={styles.topStatusText}>{topBarConfig.status}</Text>
          </View>
        </View>
        {selectedKindness && agentMode === 'guard' && (
          <View className={styles.topBadge}>
            <Text className={styles.topBadgeText}>已关联记录</Text>
          </View>
        )}
      </View>

      {/* 消息列表 */}
      <ScrollView className={styles.chatArea} scrollY scrollWithAnimation ref={scrollRef} enhanced showScrollbar={false}>
        <View className={styles.chatList}>
          {messages.map(msg => renderMessage(msg))}
        </View>
        {showKindnessCards && allRecords.length > 0 && agentMode === 'guard' && (
          <View className={styles.kindnessCardsSection}>
            <Text className={styles.kindnessCardsTitle}>📝 选择一条记录</Text>
            <View className={styles.kindnessCardsScroll}>
              {allRecords.slice(0, 10).map(item => (
                <View key={item.id} className={styles.kindnessCard} onClick={() => handleSelectRecord(item)}>
                  <View className={styles.kindnessCardTop}>
                    <Text className={styles.kindnessCardContent}>{truncate(item.content, 35)}</Text>
                    <Text className={styles.kindnessCardTime}>{formatTime(item.createdAt)}</Text>
                  </View>
                  <View className={styles.kindnessCardMeta}>
                    {item.location && <Text className={styles.kindnessCardLocation}>📍 {item.location}</Text>}
                    {item.sourceType === 'protection' && (
                      <Text className={styles.kindnessCardTag} style={{ background: 'rgba(220,38,38,0.12)', color: '#DC2626' }}>🔒 已锁定证据</Text>
                    )}
                    {item.sourceType === 'kindness' && item.tags.slice(0, 2).map(tag => (
                      <Text key={tag} className={styles.kindnessCardTag}>#{tag}</Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 底部输入栏 */}
      <View className={styles.inputBar}>
        <View
          className={styles.recordPickerBtn}
          onClick={() => {
            if (allRecords.length === 0) {
              Taro.showToast({ title: '你还没有善行记录或保护记录', icon: 'none' });
              return;
            }
            setShowKindnessCards(prev => !prev);
          }}
        >
          <Text className={styles.recordPickerIcon}>📝</Text>
        </View>
        <View className={styles.inputWrap}>
          <Textarea
            className={styles.textInput}
            value={inputText}
            placeholder={placeholderText}
            placeholderClass={styles.inputPlaceholder}
            onInput={(e) => setInputText(e.detail.value)}
            onConfirm={sendText}
            maxlength={500}
            rows={1}
            autoHeight
          />
        </View>
        <View
          className={`${styles.sendBtn} ${inputText.trim() ? styles.sendBtnActive : ''}`}
          onClick={sendText}
        >
          <Text className={styles.sendBtnIcon}>↑</Text>
        </View>
      </View>
    </View>
  );
}