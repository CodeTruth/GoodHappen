# 善行圈德育教育场景 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将善行圈打造为小学德育教育工具，实现"老师发布任务→学生提交视频+文字→系统自动汇总排行/周报/档案/榜样墙"的完整闭环

**Architecture:** 复用现有 circle store 三级权限体系，新建 moral-task store 管理德育任务和提交。改造 record 页增加"关联任务"入口，新建3个老师端页面（任务管理、德育仪表盘、学生档案）。所有数据 mock，不对接真实后端。

**Tech Stack:** Taro + React + Zustand + SCSS Modules

## Global Constraints

- 项目路径：`d:\projects\TRAE好事发生项目`
- UI 设计语言：暖金古风，主色 `$color-primary` (#C4956A)，沿用 `@/styles/variables.scss` 变量
- 数据持久化：Zustand + Taro.setStorageSync，key 前缀 `haoshi_`
- 页面注册：新建页面必须在 `src/app.config.ts` 的 pages 数组中注册
- Mock 数据：所有德育场景数据使用本地 mock，不调用外部 API
- 不设"拒绝"概念，保护小学生积极性
- 圈子是临时的（按学期），档案是永久的（跟随个人账号）

---

## 文件结构总览

| 操作 | 文件路径 | 职责 |
|------|---------|------|
| 新建 | `src/data/mock-moral-tasks.ts` | Mock德育任务、提交记录、周报数据 |
| 新建 | `src/store/moral-task.ts` | 德育任务CRUD、提交管理、榜样标记、排行/周报计算 |
| 新建 | `src/services/moral-dashboard.ts` | 排行榜计算、周报统计、榜样汇总、档案数据聚合 |
| 新建 | `src/pages/circle-moral-tasks/index.tsx` | 德育任务管理页（老师端） |
| 新建 | `src/pages/circle-moral-tasks/index.config.ts` | 页面配置 |
| 新建 | `src/pages/circle-moral-tasks/index.module.scss` | 页面样式 |
| 新建 | `src/pages/circle-dashboard/index.tsx` | 班级德育仪表盘（老师端，3个Tab） |
| 新建 | `src/pages/circle-dashboard/index.config.ts` | 页面配置 |
| 新建 | `src/pages/circle-dashboard/index.module.scss` | 页面样式 |
| 新建 | `src/pages/student-profile/index.tsx` | 个人德育档案（老师+学生） |
| 新建 | `src/pages/student-profile/index.config.ts` | 页面配置 |
| 新建 | `src/pages/student-profile/index.module.scss` | 页面样式 |
| 修改 | `src/pages/record/index.tsx` | 增加"关联德育任务"选择器 |
| 修改 | `src/pages/record/index.module.scss` | 增加关联任务区域样式 |
| 修改 | `src/pages/circleDetail/index.tsx` | 增加"任务管理"和"德育看板"入口按钮 |
| 修改 | `src/pages/circleDetail/index.module.scss` | 增加新按钮样式 |
| 修改 | `src/app.config.ts` | 注册3个新页面路由 |

---

### Task 1: 数据层 — Mock数据 + Store + 服务层

**Files:**
- Create: `src/data/mock-moral-tasks.ts`
- Create: `src/store/moral-task.ts`
- Create: `src/services/moral-dashboard.ts`

**Interfaces:**
- Produces: `MoralTask`, `TaskSubmission`, `MoralCategory`, `WeeklyReport`, `StudentMoralProfile` 类型导出
- Produces: `useMoralTaskStore` store（`getTasksByCircle`, `addTask`, `addSubmission`, `markExample`, `addTeacherComment`）
- Produces: `getRanking`, `getWeeklyReport`, `getExampleWall`, `getStudentProfile` 函数

- [ ] **Step 1: 创建 mock 数据文件**

创建 `src/data/mock-moral-tasks.ts`，包含：
- 3个本周德育任务（2 active + 1 expired）
- 5个学生成员的20+条提交记录（部分有视频、有评语、有榜样标记）
- 4周周报统计数据
- 跨学期累积的档案数据

任务类别枚举：`housework | help_others | environmental | respect_elders | reading | custom`
每种类别配 icon 和中文名。

提交记录中至少3条标记为 `isExample: true`（榜样记录），至少2条有 `teacherComment`。

- [ ] **Step 2: 创建 moral-task store**

创建 `src/store/moral-task.ts`：
- 类型定义：`MoralTask`, `TaskSubmission`, `MoralCategory`
- Store 状态：`tasks: MoralTask[]`, `submissions: TaskSubmission[]`
- 方法：`getTasksByCircle(circleId)`, `addTask(task)`, `addSubmission(submission)`, `markExample(submissionId)`, `addTeacherComment(submissionId, comment)`, `markNeedsRevision(submissionId)`
- 初始化时加载 mock 数据
- 持久化：`haoshi_moral_task_store`

- [ ] **Step 3: 创建 dashboard 服务层**

创建 `src/services/moral-dashboard.ts`：
- `getRanking(circleId, weekRange)` — 计算学生完成度排行（任务完成数/自由善行数/连续天数）
- `getWeeklyReport(circleId, weekRange)` — 返回总善行数、分类占比、参与率、周环比
- `getExampleWall(circleId, weekRange)` — 获取榜样记录列表（按周）
- `getStudentProfile(userId, circleId)` — 聚合学生德育档案数据（善行总数、分类分布、时间线、跨学期累积）
- `getUnsubmittedStudents(circleId, taskId)` — 获取未提交学生列表

- [ ] **Step 4: 提交**

```
git add src/data/mock-moral-tasks.ts src/store/moral-task.ts src/services/moral-dashboard.ts
git commit -m "feat(德育): 新增德育任务数据层、store和dashboard服务"
```

---

### Task 2: 德育任务管理页（老师端）

**Files:**
- Create: `src/pages/circle-moral-tasks/index.tsx`
- Create: `src/pages/circle-moral-tasks/index.config.ts`
- Create: `src/pages/circle-moral-tasks/index.module.scss`
- Modify: `src/app.config.ts` — 注册 `pages/circle-moral-tasks/index`

**Interfaces:**
- Consumes: `useMoralTaskStore.getTasksByCircle()`, `useMoralTaskStore.addTask()`
- Consumes: `useCircleStore.hasPermission()` (检查 admin 权限)
- Consumes: router params `circleId`

- [ ] **Step 1: 创建页面配置**

`src/pages/circle-moral-tasks/index.config.ts`:
```ts
export default definePageConfig({
  navigationBarTitleText: '德育任务管理',
  navigationBarBackgroundColor: '#C4956A',
  navigationBarTextStyle: 'white',
});
```

- [ ] **Step 2: 创建页面样式**

`src/pages/circle-moral-tasks/index.module.scss`:
- 页面容器：暖白背景 `$color-bg-page`，padding 遵循 `$page-padding`
- 任务卡片：`$color-bg-card`，圆角 `$radius-lg`，阴影 `$shadow-card`
- 任务卡片左侧彩色条（按类别颜色）
- 发布按钮：渐变背景 `$color-primary → $color-primary-light`
- 弹窗样式：半透明遮罩 + 底部弹出面板
- 已过期任务灰化处理

- [ ] **Step 3: 创建页面主体**

`src/pages/circle-moral-tasks/index.tsx`:
- 从 router params 获取 `circleId`
- 调用 `useMoralTaskStore.getTasksByCircle(circleId)` 获取任务列表
- 任务列表渲染：任务标题、类别icon、截止日期、已交/总人数、状态标签
- 点击任务卡片 → 跳转提交列表（本批次暂不实现，显示 toast "查看提交列表"）
- 点击"+发布" → 弹出发布任务表单（标题、描述、类别选择器、视频要求开关、截止日期）
- 表单提交 → 调用 `addTask()` → 刷新列表 → toast "任务发布成功"
- 权限检查：非管理员显示"无权限"提示

- [ ] **Step 4: 注册页面路由**

在 `src/app.config.ts` 的 pages 数组中添加 `'pages/circle-moral-tasks/index'`。

- [ ] **Step 5: 提交**

```
git add src/pages/circle-moral-tasks/ src/app.config.ts
git commit -m "feat(德育): 新增德育任务管理页（老师端）"
```

---

### Task 3: 任务提交入口 — 改造 record 页

**Files:**
- Modify: `src/pages/record/index.tsx`
- Modify: `src/pages/record/index.module.scss`

**Interfaces:**
- Consumes: `useMoralTaskStore.getTasksByCircle()` — 获取当前圈子的活跃任务
- Consumes: `useMoralTaskStore.addSubmission()` — 提交时关联 taskId

- [ ] **Step 1: record 页增加"关联任务"UI**

在 record 页的善行内容输入区域上方，增加一个可折叠的"关联德育任务"区域：
- 默认收起，显示"📋 关联本周德育任务（可选）"
- 展开后显示当前圈子本周活跃任务列表（从 `useMoralTaskStore.getTasksByCircle` 获取）
- 每个任务显示标题 + 类别icon + 截止日期 + 是否必须视频
- 点击选择/取消选择，选中后高亮
- 如果选中的任务要求视频（`requireVideo: true`），在视频区域显示提示"本次任务需要拍摄视频"

- [ ] **Step 2: record 页样式增加**

在 `src/pages/record/index.module.scss` 中增加：
- `.taskSelector` — 关联任务选择器容器
- `.taskSelectorHeader` — 收起/展开头部
- `.taskSelectorList` — 任务列表
- `.taskOption` — 单个任务选项
- `.taskOptionActive` — 选中状态（金色边框 + 浅金背景）
- `.taskVideoHint` — 视频必填提示

- [ ] **Step 3: 提交逻辑适配**

在 record 页的提交流程中：
- 如果选择了关联任务，在提交的 kindness 记录中附加 `taskId` 信息
- 同时调用 `useMoralTaskStore.addSubmission()` 创建 TaskSubmission 记录
- 智能引导：文字<10字时弹出提示"多写几句吧，说说具体做了什么、感受如何？"

- [ ] **Step 4: 提交**

```
git add src/pages/record/index.tsx src/pages/record/index.module.scss
git commit -m "feat(德育): record页增加关联德育任务选择器"
```

---

### Task 4: 班级德育仪表盘（老师端）

**Files:**
- Create: `src/pages/circle-dashboard/index.tsx`
- Create: `src/pages/circle-dashboard/index.config.ts`
- Create: `src/pages/circle-dashboard/index.module.scss`
- Modify: `src/app.config.ts` — 注册 `pages/circle-dashboard/index`

**Interfaces:**
- Consumes: `getRanking`, `getWeeklyReport`, `getExampleWall` from `@/services/moral-dashboard`
- Consumes: `useCircleStore.getCircleById()` — 获取圈子信息
- Consumes: router params `circleId`
- Consumes: `useMoralTaskStore` — 获取任务列表用于"任务完成(x/total)"

- [ ] **Step 1: 创建页面配置**

`src/pages/circle-dashboard/index.config.ts`:
```ts
export default definePageConfig({
  navigationBarTitleText: '德育看板',
  navigationBarBackgroundColor: '#C4956A',
  navigationBarTextStyle: 'white',
});
```

- [ ] **Step 2: 创建页面样式**

`src/pages/circle-dashboard/index.module.scss`:
- Tab 切换栏：3个Tab（完成度排行/班级周报/榜样墙），选中态金色下划线
- Tab1 排行表：表格布局，表头固定，行交替色
- Tab1 参与率进度条：渐变色条 + 百分比数字
- Tab1 未提交提醒：橙色背景提醒条
- Tab2 周报数据卡片：大数字 + 环比箭头（绿涨红跌）
- Tab2 分类占比：横向占比条（不用饼图，用简洁的条形占比）
- Tab2 趋势数据：4周数据横向排列
- Tab3 榜样卡片：视频缩略图 + 学生姓名 + 评语 + 点赞数

- [ ] **Step 3: 创建页面主体**

`src/pages/circle-dashboard/index.tsx`:
- 从 router params 获取 `circleId`
- 3个Tab切换状态管理
- **Tab1 - 完成度排行：**
  - 顶部：圈子名 + 参与率进度条（如"89% 32/36人"）
  - 未提交学生名单（⚠️橙色提醒）
  - 排行表：排名/学生名/任务完成(x/total)/自由善行/连续天数
  - 点击学生姓名 → `Taro.navigateTo({ url: '/pages/student-profile/index?circleId=xxx&userId=xxx' })`
- **Tab2 - 班级周报：**
  - 周选择器（上一周/下一周按钮）
  - 核心数据：总善行数、环比（↑↓%）
  - 分类占比横向条（家务42%、助人25%、环保18%...）
  - 参与率趋势（近4周数字排列）
  - 本周善行之星
  - "生成周报海报"按钮（点击 toast "周报海报已生成"）
- **Tab3 - 榜样墙：**
  - 周选择器
  - 榜样记录列表：⭐ + 学生姓名 + 视频缩略图(placeholder) + 老师评语 + 👍N

- [ ] **Step 4: 注册页面路由**

在 `src/app.config.ts` 的 pages 数组中添加 `'pages/circle-dashboard/index'`。

- [ ] **Step 5: 提交**

```
git add src/pages/circle-dashboard/ src/app.config.ts
git commit -m "feat(德育): 新增班级德育仪表盘（排行/周报/榜样墙）"
```

---

### Task 5: 个人德育档案页（老师+学生）

**Files:**
- Create: `src/pages/student-profile/index.tsx`
- Create: `src/pages/student-profile/index.config.ts`
- Create: `src/pages/student-profile/index.module.scss`
- Modify: `src/app.config.ts` — 注册 `pages/student-profile/index`

**Interfaces:**
- Consumes: `getStudentProfile` from `@/services/moral-dashboard`
- Consumes: `useMoralTaskStore` — 获取该学生的提交记录、老师评语操作
- Consumes: router params `circleId`, `userId`
- Consumes: `useCircleStore.getMemberRole()` — 判断当前用户角色

- [ ] **Step 1: 创建页面配置**

`src/pages/student-profile/index.config.ts`:
```ts
export default definePageConfig({
  navigationBarTitleText: '德育档案',
  navigationBarBackgroundColor: '#C4956A',
  navigationBarTextStyle: 'white',
});
```

- [ ] **Step 2: 创建页面样式**

`src/pages/student-profile/index.module.scss`:
- 顶部档案卡：学生姓名 + 班级 + 学号
- 数据概览：2x2网格（善行总数/连续打卡/任务完成率/榜样次数）
- 分类分布：横向占比条
- 跨学期累积：学期列表，每行显示学期名 + 善行数
- 善行时间线：左侧竖线 + 圆点时间轴，每条记录显示日期/类别/内容摘要/视频缩略图/老师评语
- 榜样记录有⭐标记和金色边框

- [ ] **Step 3: 创建页面主体**

`src/pages/student-profile/index.tsx`:
- 从 router params 获取 `circleId` 和 `userId`
- 如果没有 userId，使用当前登录用户ID（学生自看模式）
- 调用 `getStudentProfile(userId, circleId)` 获取档案数据
- 顶部：学生姓名 + 班级信息
- 数据概览卡片：善行总数、连续打卡天数、任务完成率、榜样次数
- 分类分布条
- 跨学期累积列表
- 善行时间线：按日期倒序，每条显示日期/关联任务/内容/视频(placeholder)/老师评语
- 老师端操作：
  - 每条记录右侧有"写评语"按钮 → 点击弹出输入框 → 调用 `addTeacherComment()`
  - 每条记录有"⭐标记榜样"按钮 → 点击调用 `markExample()`
  - 底部"生成档案海报"按钮 → toast "档案海报已生成"

- [ ] **Step 4: 注册页面路由**

在 `src/app.config.ts` 的 pages 数组中添加 `'pages/student-profile/index'`。

- [ ] **Step 5: 提交**

```
git add src/pages/student-profile/ src/app.config.ts
git commit -m "feat(德育): 新增个人德育档案页（老师+学生）"
```

---

### Task 6: 善行圈详情页入口集成

**Files:**
- Modify: `src/pages/circleDetail/index.tsx`
- Modify: `src/pages/circleDetail/index.module.scss`

**Interfaces:**
- Consumes: `useCircleStore.hasPermission()` — 判断是否显示老师入口

- [ ] **Step 1: circleDetail 页增加德育功能入口**

在现有的"善行打卡"和"团体管理"按钮区域，增加按钮：

对于**管理员角色**（老师），显示3个按钮：
- 📝 善行打卡（保留）
- 📋 任务管理 → `/pages/circle-moral-tasks/index?id=${circleId}`
- 📊 德育看板 → `/pages/circle-dashboard/index?id=${circleId}`

对于**成员角色**（学生），显示2个按钮：
- 📝 提交善行（保留，跳转record页并传递circleId）
- 📖 我的档案 → `/pages/student-profile/index?circleId=${circleId}`

- [ ] **Step 2: circleDetail 样式适配**

在 `src/pages/circleDetail/index.module.scss` 中：
- `.actionBar` 改为自适应换行布局（`flex-wrap: wrap`）
- 新增按钮样式复用现有 `.actionBtn`，仅调整数量布局

- [ ] **Step 3: 提交**

```
git add src/pages/circleDetail/index.tsx src/pages/circleDetail/index.module.scss
git commit -m "feat(德育): 善行圈详情页集成德育功能入口"
```

---

## 自检结果

**Spec 覆盖检查：**
- §1 核心定位 → Task 1-6 整体实现 ✓
- §2 角色模型 → Task 6 权限判断区分老师/学生入口 ✓
- §3 身份验证 → Demo简化，不需要独立页面，UI标识在用户信息中展示 ✓
- §4 学期生命周期 → mock数据中包含跨学期数据，档案页展示累积 ✓
- §5 任务系统双轨 → Task 2 任务管理 + Task 3 record页关联任务 ✓
- §6 质量控制 → Task 3 智能引导提示 ✓
- §7 榜样激励 → Task 4 Tab3榜样墙 + Task 5 标记榜样/评语 ✓
- §8 四个核心页面 → Task 2/3/4/5 各对应一个页面 ✓

**类型一致性检查：**
- `MoralTask.category` 在 mock data、store、dashboard service 中统一使用 `'housework' | 'help_others' | 'environmental' | 'respect_elders' | 'reading' | 'custom'` ✓
- `TaskSubmission` 在 store 和 service 中统一使用 ✓
- 页面路由参数统一使用 `circleId` + `userId` ✓
