# 好事发生 · 仪式开关 + AI人物对话 拆解与落地计划

> **目标**：仪式可开关 + 点击AI回复进入人物对话页 + 其它可做的功能
> **优先级**：P0 > P1 > P2

---

## 批次1（P0）：仪式开关

### 1.1 新增 ritual store
- `src/store/ritual.ts` — 仪式设置持久化（开关、音乐、动画等）
- 默认开启仪式，用户可在设置页关闭

### 1.2 修改 record 页面
- 读取 ritual store，根据开关控制 feedback 阶段
- 关闭仪式：提交后直接显示结果（跳过墨滴动画、福气飘字等）
- 开启仪式：保持现有40秒仪式流程

### 1.3 修改 privacy-settings 页面
- 新增"发布善行仪式"开关项

---

## 批次2（P0）：AI人物详情页 + 持续对话

### 2.1 新增 AI对话页面
- `src/pages/ai-chat/index.tsx` — AI人物持续对话页
- 路由：`/pages/ai-chat/index?persona=sudongpo`
- 功能：
  - 显示AI人物头像、简介、代表作品
  - 聊天界面（类似微信对话）
  - 底部输入框 + 快捷话题按钮
  - 支持文本输入

### 2.2 新增 AI对话服务
- `src/services/ai-chat.ts` — 持续对话API封装
- 对话模式：
  - `counsel` — 解惑疏导（用户倾诉负面情绪，AI倾听+引导）
  - `discuss` — 探讨人物作品/思想/生平
  - `guide` — 引导向善（每日一善建议）
- 维护对话上下文（最近5-10轮）

### 2.3 修改 record 页面AI卡片
- AI卡片添加 `onClick` → 跳转到 AI对话页
- 传递 personaId 参数

### 2.4 修改 app.config.ts
- 添加 `pages/ai-chat/index` 页面

---

## 批次3（P1）：福气值等级系统可视化

### 3.1 新增 fortune 等级配置
- `src/data/fortune-levels.ts` — 福气等级定义（10个等级）
- 每个等级：名称、图标、颜色、所需福气值、特权描述

### 3.2 修改 fortune store
- 添加 `getLevel()` 方法
- 添加 `getNextLevelProgress()` 方法

### 3.3 修改 mine 页面
- 福气值显示为等级+进度条形式

---

## 批次4（P1）：每日一善引导

### 4.1 新增 daily-kindness 服务
- `src/services/daily-kindness.ts` — 每日推荐善行
- 从AI人物视角推荐今日善行（如"苏轼建议你今天做一件小事..."）

### 4.2 修改 home 页面
- 首页顶部增加"今日善行建议"卡片
- 点击可直接跳转到record页面并预填充内容

---

## 批次5（P2）：消息通知中心增强

### 5.1 修改 notification store
- 新增通知类型：AI回应通知、善行被见证通知、等级升级通知

### 5.2 修改 notifications 页面
- 按类型分组显示通知

---

## 批次6（P2）：搜索功能

### 6.1 新增搜索服务
- `src/services/search.ts` — 按内容/标签/人物搜索善行记录

### 6.2 修改 home 页面
- 顶部搜索栏接入真实搜索
