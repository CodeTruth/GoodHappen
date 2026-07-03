# 好事发生 (Hǎo Shì Fā Shēng)

> AI驱动的善行正反馈系统 -- "再小的善意也值得被看见"

---

## 项目概述

"好事发生"是一个以中国传统美德为内核、AI技术为驱动的善行正反馈平台。它通过记录、见证、保护和激励善行，构建一个温暖可信的善意生态系统。项目融合了先贤智慧（孔子、苏东坡、李白等）与现代AI能力，为用户提供从"想做好事"到"做好事无后顾之忧"的全链路支持。

---

## 核心功能

### 1. AI善行顾问
- 用户在做好事前可咨询AI顾问，获得基于场景的综合评判与行动方案
- 内置8位先贤人设（孔子、苏东坡、李白、杜甫、庄子、李清照、陶渊明、王阳明），AI以不同人设风格给出建议
- 风险分级评估（A-E级），自动提示法律风险和操作建议

### 2. 善行保护模式
- 一键启动：全程录像 + 录音 + GPS存证
- 遇纠纷系统自动生成不可篡改的证据包
- "我被讹了"一键求助，锁定时间线与原始内容
- 证据链哈希校验，确保完整性

### 3. 网络见证
- 分布式目击者匹配，形成独立证据链
- AI多模态语义分析，文字+媒体交叉验证
- 延迟发布检测（支持拍完照隔很久才发帖的场景）
- "温暖见证人"徽章激励

### 4. SOS求助
- 善行者触发"我被讹了"后的紧急响应机制
- 自动扫描事发时间±30分钟、地点半径100m内所有独立用户的见证记录
- 主动征集：向事发地附近用户推送"征集见证"通知
- 律师匹配与证据锁定

### 5. 福气成长
- 基于善行内容、类型、可信度、连续天数等维度智能计算福气值
- 10个等级体系（微光初现 → 功德圆满），逐级解锁特权
- 每日福气上限机制，鼓励持续行善
- 里程碑成就与福气排行榜

### 6. 善行圈
- 圈子化社交：班级圈、社区圈、兴趣圈
- 圈子榜样墙与道德任务
- 善行记录展示与互动（点赞、评论、见证）

### 7. 更多功能
- 善行保险与法律援助
- 公益悬赏与慈善基金
- 温暖地图与年度报告
- 先贤AI对话

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Taro 4 (React 18) |
| 语言 | TypeScript 5 |
| 状态管理 | Zustand 4 |
| AI能力 | DeepSeek API (deepseek-chat) |
| 后端服务 | Supabase (PostgreSQL + Auth + Storage) |
| 构建工具 | Webpack 5 |
| 样式方案 | SCSS Modules |
| 目标平台 | 微信小程序 / H5 |

---

## 项目亮点

### 规模
- **50个页面**：覆盖首页、记录、善行圈、个人中心、AI顾问、保护模式等完整功能链路
- **24个服务模块**：AI对话、证据链存证、风险检测、见证匹配、审核、搜索等
- **18个数据模块**：善行、用户、品牌、挑战、圈配置、等级体系等

### 独家功能
1. **先贤AI对话系统**：8位中国古代先贤人设，以传统文化智慧回应现代善行场景
2. **善行保护模式**：事前存证+事后维权的一站式保护方案，行业首创
3. **网络见证与SOS**：分布式目击匹配+AI语义分析，形成不可篡改的独立证据链

### 质量
- **TypeScript零编译错误**：全项目严格类型检查
- **SCSS变量体系**：统一的中国传统美学暖金色系设计语言
- **React.memo性能优化**：关键组件记忆化，避免不必要渲染

---

## 项目结构

```
src/
├── app.config.ts          # 应用配置（页面路由、tabBar、窗口设置）
├── app.tsx                # 应用入口
├── app.scss               # 全局样式
│
├── pages/                 # 50个页面
│   ├── home/              # 首页（善行广场、数据概览、保护入口）
│   ├── record/            # 善行记录（发布、AI评估、福气计算）
│   ├── mine/              # 个人中心
│   ├── circle/            # 善行圈列表
│   ├── circleDetail/      # 善行圈详情
│   ├── detail/            # 善行详情
│   ├── ai-advisor/        # AI善行顾问
│   ├── ai-chat/           # AI先贤对话
│   ├── protection-mode/   # 善行保护模式
│   ├── witness-network/   # 网络见证
│   ├── evidence-report/   # 证据报告
│   ├── legal-aid/         # 法律援助
│   ├── insurance/         # 善行保险
│   ├── sos-guard/         # SOS求助
│   ├── checkin/           # 每日签到
│   ├── challenges/        # 善行挑战
│   ├── warmth-map/        # 温暖地图
│   ├── warmth-stats/      # 温暖统计
│   ├── warmth-stories/    # 温暖故事
│   ├── charity-fund/      # 慈善基金
│   ├── charity-tasks/     # 慈善任务
│   ├── charity-publish/   # 慈善发布
│   ├── charity-record/    # 慈善记录
│   ├── shop/              # 善行商城
│   ├── merchant-list/     # 商户列表
│   ├── search/            # 搜索
│   ├── notifications/     # 通知
│   ├── login/             # 登录
│   ├── onboarding/        # 新手指引
│   ├── invite/            # 邀请好友
│   ├── annual-report/     # 年度报告
│   ├── feedback/          # 意见反馈
│   └── ... (更多页面)
│
├── components/            # 可复用组件
│   ├── KindnessCard/      # 善行卡片
│   ├── BrandCard/         # 品牌卡片
│   ├── CommentSection/    # 评论区域
│   ├── WarmPartnerCard/   # 温暖伙伴卡片
│   ├── SharePoster/       # 分享海报
│   ├── MilestonePopup/    # 里程碑弹窗
│   ├── RatingDialog/      # 评分对话框
│   ├── WelcomeGuide/      # 新手引导
│   └── CustomTabBar/      # 自定义TabBar
│
├── services/              # 24个服务模块
│   ├── ai.ts              # AI服务（DeepSeek API封装）
│   ├── ai-chat.ts         # AI对话服务
│   ├── ai-kindness-advisor.ts  # AI善行顾问
│   ├── ai-witness.ts      # AI见证匹配
│   ├── ai-circle.ts       # AI善行圈
│   ├── ai-danger-detection.ts  # AI危险检测
│   ├── evidence.ts        # 证据链存证
│   ├── evidence-report.ts # 证据报告生成
│   ├── kindness.ts        # 善行服务（可信度评估、AI多角色回复）
│   ├── protection-mode.ts # 保护模式
│   ├── sos-guard.ts       # SOS求助
│   ├── risk-detection.ts  # 风险检测
│   ├── moderation.ts      # 内容审核
│   ├── matching.ts        # 匹配服务
│   ├── search.ts          # 搜索服务
│   ├── analytics.ts       # 分析统计
│   ├── auth.ts            # 认证服务
│   ├── supabase.ts        # Supabase客户端
│   └── ... (更多服务)
│
├── store/                 # 21个Zustand状态模块
│   ├── kindness.ts        # 善行状态
│   ├── user.ts            # 用户状态
│   ├── fortune.ts         # 福气状态
│   ├── protection.ts      # 保护模式状态
│   ├── social.ts          # 社交状态
│   ├── circle.ts          # 善行圈状态
│   ├── notification.ts    # 通知状态
│   ├── milestone.ts       # 里程碑状态
│   └── ... (更多状态模块)
│
├── utils/                 # 工具函数
│   ├── fortune.ts         # 福气计算引擎
│   └── sensitive.ts       # 敏感词检测
│
├── types/                 # TypeScript类型定义
│   ├── kindness.ts        # 善行类型
│   ├── user.ts            # 用户类型
│   └── charity.ts         # 慈善类型
│
├── data/                  # 18个数据模块
│   ├── daily-kindness.ts  # 每日善行灵感
│   ├── fortune-levels.ts  # 福气等级体系（10级）
│   ├── kindness.ts        # 善行mock数据
│   ├── brands.ts          # 品牌数据
│   ├── social.ts          # 社交数据
│   └── ... (更多数据)
│
├── config/                # 配置
│   ├── circle-types.ts    # 善行圈类型配置
│   └── ...
│
└── styles/                # 全局样式
    ├── variables.scss     # SCSS变量（间距、圆角、阴影、字体）
    └── theme.scss         # 主题色（暖金色系）
```

---

## 组件架构

### 页面组件（Pages）
每个页面由三部分组成：
- `index.tsx` — 页面逻辑与渲染
- `index.module.scss` — 页面样式（CSS Modules）
- `index.config.ts` — 页面配置（导航栏标题等）

### 可复用组件（Components）
采用 `React.memo` 包裹，避免不必要渲染。组件目录包含：
- `index.tsx` — 组件实现
- `index.module.scss` — 组件样式

### 状态管理（Store）
基于 Zustand，每个store包含：
- 状态定义（TypeScript接口）
- 操作方法（add/update/delete）
- 持久化逻辑（loadFromStorage/saveToStorage）

### 服务模块（Services）
按功能域划分，每个服务文件导出纯函数和类型定义，不依赖UI层。

---

## 安装与运行

```bash
# 克隆项目
git clone <repo-url>
cd haoshi-fasheng

# 安装依赖
npm install

# 开发模式 - 微信小程序
npm run dev:weapp

# 开发模式 - H5
npm run dev:h5

# 构建 - 微信小程序
npm run build:weapp

# 构建 - H5
npm run build:h5
```

### 环境要求
- Node.js >= 18
- npm >= 9

---

## 关键设计决策

### 1. 暖金色设计语言
基于中国传统美学，以宣纸白、墨色、朱砂、金色为主体色调，营造温暖、可信、有文化底蕴的产品体验。

### 2. 先贤AI人设
选择8位中国古代先贤作为AI回复人设，每位先贤有独立的性格特征、语言风格和知识领域，使AI回复更具文化温度和辨识度。

### 3. 证据链不可篡改
善行记录创建时同步生成基于哈希的证据包，一键求助时锁定时间线和原始内容，形成可验证的完整证据链。

### 4. 延迟发布支持
通过事件元数据（EXIF提取的事件真实时间/GPS），解决"拍完照隔很久才发帖"场景下的见证匹配问题。

---

## 演示视频

<!-- 演示视频占位：可后补 -->
<!-- 届时可将演示视频链接放在此处 -->

---

## 许可证

[MIT](LICENSE)

---

## 项目状态

**v1.0.0** - 生产就绪 | TypeScript零编译错误 | 50个页面 | 24个服务模块 | 3项独家功能