# NBA 交易模拟器 — 开发计划

> 参考 token-nav 架构设计 | 创建日期：2026-05-23 | 更新：2026-05-23
> 原型设计：参考 ESPN Trade Machine + Fanspo Trade Machine
> 部署策略：集成到 token-nav 项目，作为子路由 `/nba-trade/`

---

## 一、项目信息

| 项目 | 内容 |
|------|------|
| 项目名称 | NBA 交易模拟器 (nbatrade) |
| 项目定位 | 中文版 NBA 交易模拟器，完整 CBA 规则引擎 + AI 分析 |
| 对标产品 | ESPN Trade Machine |
| 差异化 | 中文界面 + 代码级规则引擎 + AI 解释 + 移动端优先 |
| 部署方式 | 集成到 token-nav 项目，路由 `/nba-trade/` |
| 数据存储 | 静态 JSON（无数据库） |

---

## 二、部署策略

### 2.1 为什么集成到 token-nav

```
token-nav 项目 (D:\nexdev\token-nav\)
├── src/app/
│   ├── page.tsx                    ← token-nav 首页
│   ├── providers/                  ← token-nav 服务商库
│   ├── models/                     ← token-nav 模型库
│   ├── compare/                    ← token-nav 对比
│   └── nba-trade/                  ← 🆕 nbatrade 入口
│       ├── page.tsx                ← 交易模拟器主界面
│       └── rules/
│           └── page.tsx            ← 规则说明页
├── src/components/
│   ├── header.tsx                  ← token-nav 导航（复用）
│   ├── footer.tsx                  ← token-nav 底部（复用）
│   └── nba/                        ← 🆕 nbatrade 专属组件
│       ├── TeamSelector.tsx
│       ├── PlayerSelector.tsx
│       ├── TradePanel.tsx
│       ├── TradeResult.tsx
│       └── AIAnalysis.tsx
├── src/lib/
│   ├── engine/                     ← 🆕 规则引擎
│   │   ├── salaryMatch.ts
│   │   ├── tradeRestrictions.ts
│   │   ├── rosterCheck.ts
│   │   ├── pickCheck.ts
│   │   ├── tradeKicker.ts
│   │   └── index.ts
│   ├── nba-types.ts                ← 🆕 NBA 类型定义
│   ├── nba-players.ts              ← 🆕 球员数据（静态 JSON 导入）
│   └── nba-teams.ts                ← 🆕 球队数据（静态 JSON 导入）
└── public/
    └── nba/                        ← 🆕 球队 Logo
        ├── lakers.svg
        ├── warriors.svg
        └── ...
```

### 2.2 关键决策

| 决策 | 理由 |
|------|------|
| 不新建项目，集成到 token-nav | 共用一台 Vercel 服务器，无需额外部署 |
| 不用数据库，静态 JSON | 数据不常更新，无运行时依赖 |
| AI 调用走客户端 | token-nav 是 `output: 'export'` 静态导出，无法使用 API Route |
| 组件放 `components/nba/` | 命名空间隔离，不污染 token-nav 现有组件 |

### 2.3 nbatrade 独立目录（仅保留文档）

```
D:\nexdev\nbatrade\
├── docs/
│   ├── 策划方案.md
│   └── DEVELOPMENT_PLAN.md          ← 本文件
└── data/                            ← 爬虫脚本 + 原始数据
    ├── scraper/
    │   ├── crawl_contracts.py
    │   ├── crawl_team_cap.py
    │   └── crawl_rules.py
    ├── raw/
    └── output/
        ├── players.json
        ├── teams.json
        └── rules.json
```

> 爬虫和数据维护在 nbatrade 目录，产出 JSON 后拷贝到 token-nav 的 `src/lib/`。

---

## 三、技术架构

### 3.1 技术选型（与 token-nav 完全一致）

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js 14+ (App Router) | 与 token-nav 同一项目 |
| 样式方案 | Tailwind CSS | 复用 token-nav 的 tailwind.config |
| UI 图标 | lucide-react | 已安装 |
| 规则引擎 | 纯 TypeScript | 核心差异化，代码级规则校验 |
| AI 层 | 客户端 fetch → LLM API | 直接调 deepseek/gpt-4o-mini |
| 数据层 | 静态 JSON 文件 | 爬取后生成，无数据库 |
| 部署 | Vercel | 与 token-nav 同一项目 |

### 3.2 AI 调用方案（客户端直连）

```
用户点击「分析交易」
  → 前端 fetch('https://api.deepseek.com/v1/chat/completions', { apiKey, body })
  → 返回 AI 分析结果
  → 渲染到 AIAnalysis 组件
```

- API Key 使用 `NEXT_PUBLIC_AI_API_KEY` 环境变量
- 前端做调用次数限制（localStorage 计数）
- 显示 loading 态和错误兜底

---

## 四、页面清单

| 页面 | 路径 | 优先级 | 说明 |
|------|------|--------|------|
| 交易模拟器 | `/nba-trade/` | P0 | 主界面，完整交易交互流程 |
| 规则说明 | `/nba-trade/rules/` | P1 | CBA 规则清单，SEO 内容页 |
| Header 导航入口 | token-nav header | P0 | 在 token-nav 导航栏加「NBA交易」入口 |

---

## 五、原型设计方案（参考 ESPN + Fanspo）

### 5.1 竞品分析总结

通过实际操作 ESPN Trade Machine 和 Fanspo Trade Machine，总结设计要点：

#### ESPN Trade Machine 设计特征

| 方面 | 设计 |
|------|------|
| **布局** | 纵向排列，两队面板上下堆叠 |
| **配色** | ESPN 红白配色，深灰文字 |
| **选队** | 弹窗式下拉（东/西部联盟分组） |
| **球队信息** | 队名 + 财务指标（Over Tax Line / Cap Room） |
| **球员表** | 三栏：Player / Salary / PER，含头像缩略图 |
| **交易操作** | 点击球员名 → 弹出目标球队选择 → 确认 |
| **交易限制** | 🔒 图标提示（刚签约、交易保证金等） |
| **合约信息** | 剩余年限 + 交易限制标记 |
| **多队交易** | 支持 Team 1/2/3（最多 3 队） |
| **辅助功能** | Start Over（重置）、Feedback（反馈） |
| **使用教程** | 5 步图文引导（首次访问可见） |

#### Fanspo Trade Machine 设计特征

| 方面 | 设计 |
|------|------|
| **布局** | 横向双面板 + 中间切换箭头 ⇄ |
| **配色** | 暗色主题（dark mode），彩色球队色 |
| **赛季** | 下拉选择赛季（2025-2026） |
| **工具栏** | Settings / Full Width / Cap FAQ / Light Mode |
| **操作按钮** | Reset / Try Trade（底部固定） |
| **热门球员** | "Trending Players Being Traded" 栏 |
| **球队面板** | 球队 Logo + 队名 + 队内球员列表 |
| **球员卡片** | 头像 + 姓名 + 薪资 + 合约年 + 箭头图标 |
| **交易视觉** | 球员移出后灰显，显示方向箭头 |
| **财务汇总** | 送出/获得薪资汇总，差异计算 |
| **分享** | 生成可分享的交易链接 |

#### 我们的差异化设计

| 特性 | ESPN | Fanspo | nbatrade（我们） |
|------|------|--------|------------------|
| 语言 | 英文 | 英文 | **中文** |
| 规则校验 | 基础 | 较详细 | **完整 CBA 规则引擎** |
| AI 分析 | ❌ | ❌ | **✅ DeepSeek 分析** |
| 移动端 | 差 | 一般 | **优先适配** |
| 选秀权 | ❌ | ✅ | **✅ 含保护条件** |
| 现金交易 | 基础 | 基础 | **✅ 完整规则** |
| 交易保证金 | ❌ | 部分 | **✅ 自动计算** |

---

### 5.2 原型交互流程

```
┌──────────────────────────────────────────────────┐
│                 用户进入页面                       │
│                      │                            │
│            ┌─────────▼─────────┐                  │
│            │  选择「球队 A」    │                  │
│            │  (弹窗：30 队分组)  │                  │
│            └─────────┬─────────┘                  │
│                      │                            │
│            ┌─────────▼─────────┐                  │
│            │  选择「球队 B」    │                  │
│            │  (弹窗：30 队分组)  │                  │
│            └─────────┬─────────┘                  │
│                      │                            │
│         ┌────────────▼────────────┐               │
│         │  双面板对比视图          │               │
│         │  ┌────────┐ ┌────────┐  │               │
│         │  │ A 球员 │ │ B 球员 │  │               │
│         │  │ 列表   │ │ 列表   │  │               │
│         │  └────────┘ └────────┘  │               │
│         └────────────┬────────────┘               │
│                      │                            │
│     ┌────────────────┼────────────────┐           │
│     │    点击球员 → 添加到交易包       │           │
│     │    ┌──────────────────────┐    │           │
│     │    │  送出：球员A, 球员B   │    │           │
│     │    │  获得：球员X, 球员Y   │    │           │
│     │    │  + 选秀权 / 现金      │    │           │
│     │    └──────────────────────┘    │           │
│     └────────────────┬───────────────┘           │
│                      │                            │
│            ┌─────────▼─────────┐                  │
│            │ 点击「检查交易」   │                  │
│            └─────────┬─────────┘                  │
│                      │                            │
│     ┌────────────────┼────────────────┐           │
│     │         ┌──────▼──────┐         │           │
│     │         │  规则校验    │         │           │
│     │         │  ✅/❌ 逐条  │         │           │
│     │         └──────┬──────┘         │           │
│     │                │                │           │
│     │         ┌──────▼──────┐         │           │
│     │         │  AI 分析     │         │           │
│     │         │  评级 + 点评 │         │           │
│     │         └─────────────┘         │           │
│     └─────────────────────────────────┘           │
│                      │                            │
│            ┌─────────▼─────────┐                  │
│            │  分享交易链接      │                  │
│            └───────────────────┘                  │
└──────────────────────────────────────────────────┘
```

---

### 5.3 详细原型设计（桌面端 Desktop）

```
┌──────────────────────────────────────────────────────────────┐
│  token-nav Header  [NBA 交易]  ← 导航入口                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  NBA 交易模拟器                                       │    │
│  │  模拟真实 NBA 交易，AI 分析帮你决策                    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌──────────────────────────┐    ┌──────────────────────┐    │
│  │  ┌──────────────────┐    │    │  ┌──────────────┐    │    │
│  │  │ 🏀 选择球队 A  ▼ │    │ ⇄  │  │ 🏀 选择球队 B ▼│   │    │
│  │  └──────────────────┘    │    │  └──────────────┘    │    │
│  │                          │    │                      │    │
│  │  ┌────────────────────┐  │    │  ┌────────────────┐  │    │
│  │  │ 湖人 Logo  洛杉矶湖人│  │    │  │勇士 Logo 金州勇士│  │    │
│  │  │                    │  │    │  │                │  │    │
│  │  │ 📊 超过奢侈税线     │  │    │  │ 📊 超过奢侈税线 │  │    │
│  │  │    $7,394,273      │  │    │  │    $16,849,986 │  │    │
│  │  │ 💰 薪资空间        │  │    │  │ 💰 薪资空间    │  │    │
│  │  │    -$40,652,185    │  │    │  │    -$50,097,986│  │    │
│  │  └────────────────────┘  │    │  └────────────────┘  │    │
│  │                          │    │                      │    │
│  │  球员列表（按薪资降序）    │    │  球员列表（按薪资降序） │    │
│  │  ┌────────────────────┐  │    │  ┌────────────────┐  │    │
│  │  │头像 │球员 │薪资 │PER│  │    │  │头像│球员│薪资│PER│  │    │
│  │  │ 🏀  │东契奇│$54M│28│→│    │  │ 🏀 │库里│$59M│22│→│    │
│  │  │ 🏀🔒│詹姆斯│$52M│20│→│    │  │ 🏀 │巴特勒│$54M│23│→│   │
│  │  │ 🏀🔒│八村塁│$18M│11│→│    │  │ 🏀 │波神│$30M│19│→│   │
│  │  │ 🏀🔒│里夫斯│$13M│20│→│    │  │ 🏀 │格林│$25M│10│→│   │
│  │  │ 🏀  │范德彪│$11M│11│→│    │  │ 🏀 │穆迪│$11M│13│→│   │
│  │  │ ... 更多球员 ...   │  │    │  │ ... 更多球员 ... │  │    │
│  │  └────────────────────┘  │    │  └────────────────┘  │    │
│  └──────────────────────────┘    └──────────────────────┘    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  交易包                                              │    │
│  │  ┌─────────────────────┐  ┌─────────────────────┐    │    │
│  │  │ 送出 (来自湖人)      │  │ 获得 (来自勇士)      │    │    │
│  │  │                     │  │                     │    │    │
│  │  │ 🔴 东契奇  $54M  [×]│  │ 🟢 库里    $59M  [×]│    │    │
│  │  │ 🔴 里夫斯  $13M  [×]│  │ 🟢 穆迪    $11M  [×]│    │    │
│  │  │ 🔴 2026首轮    [×]  │  │                     │    │    │
│  │  │                     │  │                     │    │    │
│  │  │ 送出薪资: $67M      │  │ 获得薪资: $70M      │    │    │
│  │  └─────────────────────┘  └─────────────────────┘    │    │
│  │                                                     │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │          [ 🔍 检查交易规则 ]                  │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─ 规则校验结果 ───────────────────────────────────────┐    │
│  │ ✅ 薪资匹配通过                                       │    │
│  │    送出 $67,000,000，获得 $70,000,000                │    │
│  │    湖人超税线：可接收 125%+$100K = $67,100,000       │    │
│  │ ✅ 阵容人数通过 (湖人15人 → 保持14人)                 │    │
│  │ ✅ Stepien Rule 通过 (2026首轮未被交易)              │    │
│  │ ⚠️ 交易限制提醒                                      │    │
│  │    里夫斯刚签约（Poison Pill 生效中）                │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─ 🤖 AI 交易分析 ─────────────────────────────────────┐    │
│  │  ┌──────┐                                            │    │
│  │  │  B+  │  综合评级                                   │    │
│  │  └──────┘                                            │    │
│  │                                                      │    │
│  │  🏀 湖人角度：                                        │    │
│  │    · 获得 MVP 级别控卫，与詹姆斯组成超级双核          │    │
│  │    · 送走里夫斯影响板凳深度，但换来穆迪补强侧翼       │    │
│  │    · 薪资增加 $3M，奢侈税加重                         │    │
│  │                                                      │    │
│  │  🏀 勇士角度：                                        │    │
│  │    · 东契奇是库里继任者，重建基石                     │    │
│  │    · 里夫斯性价比极高，即战力补充                     │    │
│  │    · 获得 2026 首轮签，加速重建                       │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  [ 🔗 分享交易 ]  [ 🔄 重新开始 ]  [ ⭐ 收藏交易 ]           │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│  token-nav Footer                                            │
└──────────────────────────────────────────────────────────────┘
```

---

### 5.4 移动端布局设计（Mobile First）

```
┌──────────────────────┐
│  token-nav Header     │
│  [NBA 交易]           │
├──────────────────────┤
│                      │
│  NBA 交易模拟器       │
│  模拟真实 NBA 交易    │
│                      │
│  ┌──────────────────┐ │
│  │ 🏀 球队 A: 湖人 ▼│ │
│  └──────────────────┘ │
│         ⇅ 切换         │
│  ┌──────────────────┐ │
│  │ 🏀 球队 B: 勇士 ▼│ │
│  └──────────────────┘ │
│                      │
│  ┌─ 湖人 ──────────┐ │
│  │ 奢侈税: $7.4M    │ │
│  │ 薪资空间: -$40M   │ │
│  └──────────────────┘ │
│                      │
│  ┌─ 球员列表(湖人)──┐ │
│  │ 🏀 东契奇 $54M → │ │
│  │ 🏀🔒 詹姆斯 $52M →│ │
│  │ 🏀🔒 八村塁 $18M →│ │
│  │ 🏀 里夫斯 $13M  → │ │
│  │ ... 更多 ...     │ │
│  └──────────────────┘ │
│                      │
│  ┌─ 球员列表(勇士)──┐ │
│  │ 🏀 库里 $59M    →│ │
│  │ 🏀 巴特勒 $54M  →│ │
│  │ 🏀 波神 $30M    →│ │
│  │ 🏀 格林 $25M    →│ │
│  │ ... 更多 ...     │ │
│  └──────────────────┘ │
│                      │
│  ┌─ 交易包 ────────┐ │
│  │ 送出：           │ │
│  │ 东契奇 $54M  [×] │ │
│  │ 里夫斯 $13M  [×] │ │
│  │ 获得：           │ │
│  │ 库里 $59M    [×] │ │
│  │ 穆迪 $11M    [×] │ │
│  └──────────────────┘ │
│                      │
│  [ 🔍 检查交易规则 ]  │
│                      │
│  ┌─ 规则结果 ──────┐ │
│  │ ✅ 薪资匹配     │ │
│  │ ✅ 阵容人数     │ │
│  └──────────────────┘ │
│                      │
│  ┌─ AI 分析 ──────┐  │
│  │ 评级: B+       │  │
│  │ 湖人获得...     │  │
│  └──────────────────┘  │
│                      │
│  [🔗分享] [🔄重置]   │
│                      │
├──────────────────────┤
│  token-nav Footer     │
└──────────────────────┘
```

---

### 5.5 关键交互细节

#### 5.5.1 选择球队弹窗（参考 ESPN）

```
┌─────────────────────────────┐
│ 选择球队              [✕]   │
├─────────────────────────────┤
│                             │
│ ── 东部联盟 ──              │
│ 🏀 亚特兰大老鹰             │
│ 🏀 波士顿凯尔特人           │
│ 🏀 布鲁克林篮网             │
│ 🏀 夏洛特黄蜂               │
│ ... (15 队)                 │
│                             │
│ ── 西部联盟 ──              │
│ 🏀 达拉斯独行侠             │
│ 🏀 丹佛掘金                 │
│ 🏀 金州勇士                 │
│ 🏀 休斯顿火箭               │
│ ... (15 队)                 │
│                             │
└─────────────────────────────┘
```

#### 5.5.2 球员行悬停态 / 已选态

```
正常态：
┌─────────────────────────────────────┐
│ 🏀 东契奇  │ $54,126,450 │ 28.0 │ →│
└─────────────────────────────────────┘

悬停态（可交易）：
┌─────────────────────────────────────┐
│ 🏀 东契奇  │ $54,126,450 │ 28.0 │ →│  ← 高亮 + 指针
└─────────────────────────────────────┘

已选态（在交易包中）：
┌─────────────────────────────────────┐
│ 🏀 东契奇  │ $54,126,450 │ ✓ 已加入│  ← 绿底灰显
└─────────────────────────────────────┘

不可交易态（交易限制）：
┌─────────────────────────────────────┐
│ 🏀🔒 詹姆斯│ $52,627,153 │ 20.8 │  │  ← 灰色 + 锁图标
└─────────────────────────────────────┘
```

#### 5.5.3 选秀权添加

```
┌──────────────────────────────────┐
│ 添加选秀权                    [✕]│
├──────────────────────────────────┤
│                                  │
│ 类型：  [首轮 ▼]  [次轮 ▼]      │
│ 年份：  [2026 ▼]                │
│ 原属：  [湖人自有 ▼]            │
│ 保护：  □ 乐透保护              │
│         □ 前10保护              │
│         □ 前5保护               │
│         □ 无保护                │
│                                  │
│        [ 添加到交易包 ]          │
└──────────────────────────────────┘
```

#### 5.5.4 现金添加

```
┌──────────────────────────────────┐
│ 添加现金                      [✕]│
├──────────────────────────────────┤
│                                  │
│ 金额：$ [________] 万            │
│                                  │
│ 规则提示：                       │
│ 本赛季现金上限：$3,000,000       │
│ 已使用：$0                       │
│ 可用：$3,000,000                 │
│                                  │
│        [ 添加到交易包 ]          │
└──────────────────────────────────┘
```

---

### 5.6 色彩与视觉规范

| 元素 | 颜色 | 说明 |
|------|------|------|
| 主背景 | `#0f1117` (dark) | 参考 Fanspo 暗色主题 |
| 面板背景 | `#1a1d2e` | 卡片/面板 |
| 主色调 | `#3b82f6` (蓝) | 按钮、链接 |
| 成功色 | `#22c55e` (绿) | ✅ 规则通过 |
| 失败色 | `#ef4444` (红) | ❌ 规则失败 |
| 警告色 | `#f59e0b` (黄) | ⚠️ 提醒 |
| 送出标识 | `#ef4444` 红底 | 交易包中"送出" |
| 获得标识 | `#22c55e` 绿底 | 交易包中"获得" |
| 文字主色 | `#e2e8f0` | 正文 |
| 文字次要 | `#94a3b8` | 辅助信息 |
| 球队色 | 动态（30 队各自色） | Logo / 标签 |

---

### 5.7 响应式断点

| 断点 | 宽度 | 布局 |
|------|------|------|
| Mobile | < 768px | 单列纵向，球队面板堆叠 |
| Tablet | 768px - 1024px | 双列，面板并排 |
| Desktop | > 1024px | 双列 + 宽间距，完整信息 |

---

### 5.8 数据来源参考

| 数据类型 | 来源 | 备注 |
|------|------|------|
| 球员头像 | `cdn.nba.com/headshots/nba/latest/260x190/{playerId}.png` | NBA 官方 CDN |
| 球队 Logo | `cdn.nba.com/logos/nba/{teamId}/primary/L/logo.svg` | NBA 官方 CDN |
| 球员合同 | basketball-reference.com → 爬虫爬取 | 静态 JSON |
| 球队薪资 | spotrac.com → 爬虫爬取 | 静态 JSON |
| CBA 规则 | cbafaq.com → 手动整理 | 规则常量 |

---

### 5.9 交互逻辑伪代码（React + TypeScript）

> 以下为所有核心交互的 JavaScript / TypeScript 伪代码。采用 React Hooks + 函数式组件模式，状态管理用 `useReducer`。

---

#### 5.9.1 全局状态定义（State Shape）

```typescript
// ============================================================
// 文件：src/lib/nba-types.ts — 交易核心类型
// ============================================================

interface Player {
  id: string
  name: string
  teamId: string
  salary: number
  per: number | null          // Player Efficiency Rating
  yearsRemaining: number
  hasTradeRestriction: boolean // 交易限制标记（🔒 图标）
  restrictionType?: 'poison_pill' | 'recently_signed' | 'ntc' | 'trade_kicker'
  headshotUrl: string
}

interface Team {
  id: string
  name: string
  conference: 'east' | 'west'
  logoUrl: string
  overTaxLine: number          // 超过奢侈税线的金额
  capRoom: number              // 薪资空间（负值 = 超帽）
  players: Player[]
  draftPicks: DraftPick[]
  cashUsedThisSeason: number   // 本赛季已使用现金
  maxCashAllowed: number       // $3,000,000
}

interface DraftPick {
  id: string
  round: 1 | 2
  year: number
  originalTeamId: string       // 选秀权原属球队
  protection: 'lottery' | 'top10' | 'top5' | 'none'
}

interface TradeItem {
  type: 'player' | 'draft_pick' | 'cash'
  player?: Player
  draftPick?: DraftPick
  cashAmount?: number
}

interface TradeProposal {
  teamA: Team | null
  teamB: Team | null
  outgoing: TradeItem[]        // 送出项
  incoming: TradeItem[]        // 获得项
}

// ============================================================
// 文件：src/app/nba-trade/page.tsx — 主页面状态
// ============================================================

type TradeAction =
  | { type: 'SELECT_TEAM_A'; team: Team }
  | { type: 'SELECT_TEAM_B'; team: Team }
  | { type: 'SWAP_TEAMS' }
  | { type: 'ADD_TO_TRADE'; item: TradeItem; direction: 'out' | 'in' }
  | { type: 'REMOVE_FROM_TRADE'; itemId: string; direction: 'out' | 'in' }
  | { type: 'CHECK_TRADE' }
  | { type: 'TRADE_CHECK_RESULT'; result: TradeCheckResult }
  | { type: 'AI_ANALYSIS_RESULT'; analysis: AIAnalysis }
  | { type: 'RESET' }

interface TradeState {
  teamA: Team | null
  teamB: Team | null
  outgoing: TradeItem[]        // 从 teamA 送出
  incoming: TradeItem[]        // 从 teamB 获得
  checkResult: TradeCheckResult | null
  aiAnalysis: AIAnalysis | null
  isChecking: boolean          // 校验 loading
  isAnalyzing: boolean         // AI loading
  showTeamModal: 'A' | 'B' | null  // 当前打开的选队弹窗
}
```

---

#### 5.9.2 选队交互 — 弹窗 + 两联盟分组

```
┌─────────────────────────────────────────────────────────────────┐
│                        选队交互流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  用户点击「选择球队 A」                                           │
│       │                                                         │
│       ▼                                                         │
│  dispatch({ type: 'OPEN_TEAM_MODAL', target: 'A' })              │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────────────────┐                                    │
│  │ TeamSelectorModal 打开    │                                    │
│  │                          │                                    │
│  │ ─── 东部联盟 (15 队) ─── │                                    │
│  │ 🏀 老鹰  🏀 凯尔特人     │                                    │
│  │ 🏀 篮网  🏀 黄蜂        │                                    │
│  │ ...                     │                                    │
│  │                          │                                    │
│  │ ─── 西部联盟 (15 队) ─── │                                    │
│  │ 🏀 独行侠 🏀 掘金       │                                    │
│  │ 🏀 勇士   🏀 火箭       │                                    │
│  │ ...                     │                                    │
│  │                          │                                    │
│  │ [已选: B 队灰色不可点击]  │                                    │
│  └──────────────────────────┘                                    │
│       │                                                         │
│       │ 用户点击「金州勇士」                                      │
│       ▼                                                         │
│  onSelectTeam('gsw')                                            │
│       │                                                         │
│       ├─ 校验：勇士 ≠ 已选球队？                                 │
│       │    ↓ Yes                                                │
│       ├─ 从 teamsData 获取 Team 完整对象                         │
│       ├─ dispatch({ type: 'SELECT_TEAM_A', team: warriors })     │
│       ├─ dispatch({ type: 'CLOSE_TEAM_MODAL' })                 │
│       ├─ 加载勇士球员列表（按薪资降序）                          │
│       └─ 重置 outgoing / incoming（球队变更清空交易包）          │
│                                                                 │
│  同样流程选择 Team B                                             │
│                                                                 │
│  两队都选完后 → 显示双面板视图                                    │
│       │                                                         │
│       ├─ 球队 A 面板：Logo + 财务 + 球员列表                     │
│       ├─ ⇄ 交换按钮（点击互换两队）                              │
│       └─ 球队 B 面板：Logo + 财务 + 球员列表                     │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// ============================================================
// 组件：TeamSelectorModal.tsx
// ============================================================

function TeamSelectorModal({
  target,      // 'A' | 'B'
  teams,       // Team[]
  excludeId,   // 排除的球队 ID（避免双选同一队）
  onSelect,
  onClose,
}: Props) {

  const eastTeams = teams.filter(t => t.conference === 'east')
  const westTeams = teams.filter(t => t.conference === 'west')

  function handleSelect(team: Team) {
    if (team.id === excludeId) return  // 已选球队不可点击
    onSelect(team)
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h2>选择球队 {target === 'A' ? 'A' : 'B'}</h2>

      <section>
        <h3>东部联盟</h3>
        {eastTeams.map(team => (
          <TeamRow
            key={team.id}
            team={team}
            disabled={team.id === excludeId}
            onClick={() => handleSelect(team)}
          >
            <img src={team.logoUrl} width={24} />
            <span>{team.name}</span>
          </TeamRow>
        ))}
      </section>

      <section>
        <h3>西部联盟</h3>
        {westTeams.map(team => (
          <TeamRow
            key={team.id}
            team={team}
            disabled={team.id === excludeId}
            onClick={() => handleSelect(team)}
          >
            <img src={team.logoUrl} width={24} />
            <span>{team.name}</span>
          </TeamRow>
        ))}
      </section>
    </Modal>
  )
}
```

```typescript
// ============================================================
// 状态处理：reducer 中的选队逻辑
// ============================================================

function tradeReducer(state: TradeState, action: TradeAction): TradeState {
  switch (action.type) {

    case 'SELECT_TEAM_A':
      return {
        ...state,
        teamA: action.team,
        // 球队变更 → 清空交易包（防止脏数据）
        outgoing: [],
        incoming: [],
        checkResult: null,
        aiAnalysis: null,
        showTeamModal: null,
      }

    case 'SELECT_TEAM_B':
      return {
        ...state,
        teamB: action.team,
        outgoing: [],
        incoming: [],
        checkResult: null,
        aiAnalysis: null,
        showTeamModal: null,
      }

    case 'SWAP_TEAMS':
      return {
        ...state,
        teamA: state.teamB,
        teamB: state.teamA,
        // 互换后交易方向也反转
        outgoing: state.incoming,
        incoming: state.outgoing,
        checkResult: null,
        aiAnalysis: null,
      }

    // ...
  }
}
```

---

#### 5.9.3 球员交易交互 — 点击式（非拖拽）

```
┌─────────────────────────────────────────────────────────────────┐
│                      球员交易交互流程                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  前提：teamA 和 teamB 均已选择                                   │
│                                                                 │
│  用户点击 teamA 球员列表中的「东契奇 →」                          │
│       │                                                         │
│       ▼                                                         │
│  handlePlayerClick(player, sourceTeam: 'A')                      │
│       │                                                         │
│       ├─ 检查球员是否已在交易包中？                               │
│       │    ↓ 是 → handleRemoveClick()（直接移除）                │
│       │    ↓ 否 → 下一步                                         │
│       │                                                         │
│       ├─ 检查球员是否可交易？                                     │
│       │    ↓ hasTradeRestriction === true                        │
│       │    ↓ 弹出提示 toast："该球员存在交易限制：刚签约"         │
│       │    ↓ 但仍允许加入交易包（规则校验时再拦截）               │
│       │                                                         │
│       ├─ 确定交易方向                                             │
│       │    sourceTeam === 'A' → direction = 'out'                │
│       │    sourceTeam === 'B' → direction = 'in'                 │
│       │                                                         │
│       └─ dispatch({                                              │
│            type: 'ADD_TO_TRADE',                                 │
│            item: { type: 'player', player: doncic },             │
│            direction: 'out'                                      │
│          })                                                      │
│       │                                                         │
│       ▼                                                         │
│  reducer 处理：                                                  │
│    ├─ outgoing.push(doncic)                                      │
│    ├─ 两个人都不能再互相添加同一人                                │
│    └─ UI 更新：                                                  │
│        ├─ 东契奇行变为「✓ 已加入」绿底灰显                       │
│        ├─ 交易包面板「送出」区出现东契奇卡片                      │
│        └─ 底部薪资汇总更新：送出 $54,126,450                     │
│                                                                 │
│  同理，点击 teamB 球员列表中的「库里 →」                          │
│    → direction = 'in'                                            │
│    → incoming.push(curry)                                        │
│    → 交易包「获得」区出现库里卡片                                 │
│                                                                 │
│  点击交易包中的 [×] 按钮移除球员：                                │
│    → dispatch({ type: 'REMOVE_FROM_TRADE', itemId, direction })  │
│    → UI 恢复球员行为正常态                                       │
│    → 薪资汇总自动重新计算                                        │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// ============================================================
// 组件：PlayerRow.tsx — 单个球员行
// ============================================================

type PlayerRowStatus = 'normal' | 'hover' | 'selected' | 'restricted'

function PlayerRow({
  player,
  status,        // 根据是否在交易包中计算
  onClick,
}: Props) {

  const isInTrade = status === 'selected'
  const isRestricted = player.hasTradeRestriction && status !== 'selected'

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors',
        status === 'normal'   && 'hover:bg-blue-900/20',
        status === 'selected' && 'bg-green-900/30 opacity-60 cursor-default',
        isRestricted          && 'opacity-40 cursor-not-allowed',
      )}
      onClick={isInTrade ? undefined : onClick}
      title={isRestricted ? getRestrictionTooltip(player) : undefined}
    >
      {/* 头像 */}
      <img src={player.headshotUrl} width={28} height={38} />

      {/* 姓名 */}
      <span className="flex-1 font-medium text-sm">
        {player.name}
        {isRestricted && <LockIcon className="inline ml-1 w-3 h-3" />}
      </span>

      {/* 薪资（格式化：$54.1M） */}
      <span className="text-xs text-slate-400 tabular-nums w-16 text-right">
        ${formatSalary(player.salary)}
      </span>

      {/* PER */}
      <span className="text-xs text-slate-500 tabular-nums w-10 text-right">
        {player.per ?? 'N/A'}
      </span>

      {/* 操作按钮 */}
      {isInTrade ? (
        <span className="text-xs text-green-400">✓ 已加入</span>
      ) : (
        <ArrowRightIcon className="w-4 h-4 text-slate-600" />
      )}
    </div>
  )
}

// 辅助函数
function formatSalary(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
  return `$${amount}`
}

function getRestrictionTooltip(player: Player): string {
  switch (player.restrictionType) {
    case 'poison_pill':     return '毒丸条款生效中（新秀续约）'
    case 'recently_signed': return '刚签约，90天内不可交易'
    case 'ntc':             return '拥有交易否决权'
    case 'trade_kicker':    return '含交易保证金条款'
    default:                return '存在交易限制'
  }
}
```

```typescript
// ============================================================
// 组件：PlayerList.tsx — 球员列表面板
// ============================================================

function PlayerList({ team, tradeItems, onPlayerClick }: Props) {

  // 判断球队角色：是 teamA 还是 teamB
  // 从 tradeState 上下文获取

  const sortedPlayers = [...team.players].sort(
    (a, b) => b.salary - a.salary
  )

  return (
    <div className="bg-slate-900/50 rounded-lg overflow-hidden">
      {/* 球队头部：Logo + 队名 */}
      <div className="flex items-center gap-2 p-3 border-b border-slate-800">
        <img src={team.logoUrl} width={32} height={32} />
        <h3 className="font-bold">{team.name}</h3>
      </div>

      {/* 财务信息 */}
      <div className="grid grid-cols-2 gap-2 p-3 text-xs border-b border-slate-800">
        <div>
          <span className="text-slate-500">奢侈税</span>
          <p className="text-red-400">${formatSalary(team.overTaxLine)}</p>
        </div>
        <div>
          <span className="text-slate-500">薪资空间</span>
          <p className={team.capRoom < 0 ? 'text-red-400' : 'text-green-400'}>
            {team.capRoom < 0 ? '-' : ''}${formatSalary(Math.abs(team.capRoom))}
          </p>
        </div>
      </div>

      {/* 球员列表 */}
      <div className="max-h-96 overflow-y-auto">
        {/* 表头 */}
        <div className="flex items-center gap-3 px-3 py-1 text-xs text-slate-500 border-b border-slate-800/50">
          <span className="flex-1">球员</span>
          <span className="w-16 text-right">薪资</span>
          <span className="w-10 text-right">PER</span>
          <span className="w-8" />
        </div>

        {sortedPlayers.map(player => {
          const isSelected = tradeItems.some(
            item => item.type === 'player' && item.player!.id === player.id
          )
          const status = isSelected
            ? 'selected'
            : player.hasTradeRestriction
              ? 'restricted'
              : 'normal'

          return (
            <PlayerRow
              key={player.id}
              player={player}
              status={status}
              onClick={() => onPlayerClick(player)}
            />
          )
        })}
      </div>
    </div>
  )
}
```

---

#### 5.9.4 Reducer 核心逻辑 — 添加 / 移除交易项

```typescript
// ============================================================
// Reducer：ADD_TO_TRADE 和 REMOVE_FROM_TRADE
// ============================================================

case 'ADD_TO_TRADE': {
  const { item, direction } = action

  // 防止重复添加
  const targetList = direction === 'out' ? state.outgoing : state.incoming
  const alreadyExists = targetList.some(existing => {
    if (existing.type !== item.type) return false
    if (item.type === 'player') return existing.player!.id === item.player!.id
    if (item.type === 'draft_pick') return existing.draftPick!.id === item.draftPick!.id
    return false
  })
  if (alreadyExists) return state

  // 添加并重新计算
  const newOutgoing = direction === 'out'
    ? [...state.outgoing, item]
    : state.outgoing
  const newIncoming = direction === 'in'
    ? [...state.incoming, item]
    : state.incoming

  return {
    ...state,
    outgoing: newOutgoing,
    incoming: newIncoming,
    // 清除上次的校验结果（交易内容已变）
    checkResult: null,
    aiAnalysis: null,
  }
}

case 'REMOVE_FROM_TRADE': {
  const { itemId, direction } = action
  const targetList = direction === 'out' ? state.outgoing : state.incoming

  const filtered = targetList.filter(item => {
    if (item.type === 'player') return item.player!.id !== itemId
    if (item.type === 'draft_pick') return item.draftPick!.id !== itemId
    if (item.type === 'cash') return false // 现金通过特殊处理
    return true
  })

  return {
    ...state,
    outgoing: direction === 'out' ? filtered : state.outgoing,
    incoming: direction === 'in' ? filtered : state.incoming,
    checkResult: null,
    aiAnalysis: null,
  }
}
```

---

#### 5.9.5 选秀权添加交互

```
┌─────────────────────────────────────────────────────────────────┐
│                     选秀权添加流程                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  用户点击交易包中的「+ 添加选秀权」                              │
│       │                                                         │
│       ▼                                                         │
│  打开 DraftPickModal 弹窗                                        │
│       │                                                         │
│       ├─ 轮次选择：[首轮 ▼] / [次轮 ▼]                          │
│       ├─ 年份选择：[2026 ▼] ~ [2032 ▼]                          │
│       ├─ 原属球队：[湖人自有 ▼] / [来自其他队 ▼]                │
│       └─ 保护条件：                                             │
│           ☐ 无保护                                               │
│           ☐ 乐透保护 (保护 1-14 顺位)                            │
│           ☐ 前10保护                                            │
│           ☐ 前5保护                                             │
│       │                                                         │
│       ▼                                                         │
│  用户点击「添加到交易包」                                        │
│       │                                                         │
│       ├─ 校验：年份 ≥ 当前赛季？                                 │
│       ├─ 校验：该选秀权未被交易过？（Stepien Rule 预检）         │
│       └─ dispatch({                                              │
│            type: 'ADD_TO_TRADE',                                 │
│            item: { type: 'draft_pick', draftPick },              │
│            direction: 'out'  // 或 'in'                          │
│          })                                                      │
│       │                                                         │
│       ▼                                                         │
│  交易包更新 → 显示「🔴 2026首轮（湖人，无保护）」                  │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// ============================================================
// 组件：DraftPickModal.tsx
// ============================================================

function DraftPickModal({ team, onAdd, onClose }: Props) {
  const [round, setRound]       = useState<1 | 2>(1)
  const [year, setYear]         = useState(2026)
  const [originalTeam, setOrig] = useState(team.id)
  const [protection, setProtect] = useState<Protection>('none')

  const years = Array.from({ length: 8 }, (_, i) => 2026 + i)

  function handleSubmit() {
    const draftPick: DraftPick = {
      id: `${team.id}-${round}-${year}`,
      round,
      year,
      originalTeamId: originalTeam,
      protection,
    }
    onAdd({ type: 'draft_pick', draftPick })
    onClose()
  }

  return (
    <Modal onClose={onClose}>
      <h3>添加选秀权</h3>

      <label>轮次</label>
      <Select value={round} onChange={setRound}
        options={[{ value: 1, label: '首轮' }, { value: 2, label: '次轮' }]} />

      <label>年份</label>
      <Select value={year} onChange={setYear}
        options={years.map(y => ({ value: y, label: String(y) }))} />

      <label>原属球队</label>
      <Select value={originalTeam} onChange={setOrig}
        options={[{ value: team.id, label: `${team.name}自有` }]} />

      <label>保护条件</label>
      <RadioGroup value={protection} onChange={setProtect}>
        <Radio value="none">无保护</Radio>
        <Radio value="lottery">乐透保护（1-14顺位）</Radio>
        <Radio value="top10">前10保护</Radio>
        <Radio value="top5">前5保护</Radio>
      </RadioGroup>

      <Button onClick={handleSubmit}>添加到交易包</Button>
    </Modal>
  )
}
```

---

#### 5.9.6 现金添加交互

```
┌─────────────────────────────────────────────────────────────────┐
│                      现金添加流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  用户点击交易包中的「+ 添加现金」                                │
│       │                                                         │
│       ▼                                                         │
│  打开 CashModal 弹窗                                             │
│       │                                                         │
│       ├─ 显示规则提示：                                          │
│       │   本赛季现金上限：$3,000,000                             │
│       │   已使用：$0                                             │
│       │   可用：$3,000,000                                       │
│       │                                                         │
│       ├─ 输入金额（滑块 + 文本框）                                │
│       │   [ ====●======== ] $1,500,000                           │
│       │                                                         │
│       └─ 即时校验：                                              │
│           · 金额 > 0                                             │
│           · 金额 ≤ 可用余额                                      │
│           · 现金只能单向（送出 或 获得，不能同时）               │
│       │                                                         │
│       ▼                                                         │
│  用户点击「添加到交易包」                                        │
│       │                                                         │
│       └─ dispatch({                                              │
│            type: 'ADD_TO_TRADE',                                 │
│            item: { type: 'cash', cashAmount: 1_500_000 },        │
│            direction: 'out'                                      │
│          })                                                      │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// ============================================================
// 组件：CashModal.tsx
// ============================================================

function CashModal({ team, onAdd, onClose }: Props) {
  const maxCash = team.maxCashAllowed - team.cashUsedThisSeason
  const [amount, setAmount] = useState(0)

  const isValid = amount > 0 && amount <= maxCash

  return (
    <Modal onClose={onClose}>
      <h3>添加现金</h3>

      {/* 规则提示 */}
      <div className="bg-blue-900/30 rounded p-3 text-xs space-y-1">
        <p>本赛季现金上限：${team.maxCashAllowed.toLocaleString()}</p>
        <p>已使用：${team.cashUsedThisSeason.toLocaleString()}</p>
        <p className="text-green-400">
          可用：${maxCash.toLocaleString()}
        </p>
      </div>

      {/* 输入 */}
      <label>金额</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={maxCash}
          step={100_000}
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
          className="flex-1"
        />
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
          className="w-32 text-right"
        />
      </div>

      {!isValid && amount > maxCash && (
        <p className="text-red-400 text-xs">超出可用上限</p>
      )}

      <Button disabled={!isValid} onClick={() => {
        onAdd({ type: 'cash', cashAmount: amount })
        onClose()
      }}>
        添加到交易包
      </Button>
    </Modal>
  )
}
```

---

#### 5.9.7 规则校验流程（核心引擎触发）

```
┌─────────────────────────────────────────────────────────────────┐
│                    规则校验完整流程                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  用户点击「🔍 检查交易规则」                                      │
│       │                                                         │
│       ├─ 前置条件检查：                                          │
│       │   · teamA 和 teamB 必须都已选                           │
│       │   · outgoing 或 incoming 非空                           │
│       │   ↓ 不满足 → 显示 toast 提示                             │
│       │                                                         │
│       ▼                                                         │
│  dispatch({ type: 'CHECK_TRADE' })                               │
│       │                                                         │
│       │ 设置 isChecking = true，显示 loading 骨架屏               │
│       ▼                                                         │
│  ┌──────────────────────────────────────┐                       │
│  │  runTradeCheck(proposal)  规则引擎    │                       │
│  │                                      │                       │
│  │  Step 1: totalOutSalary = sum(...)   │                       │
│  │  Step 2: totalInSalary  = sum(...)   │                       │
│  │  Step 3: 逐一执行规则检查             │                       │
│  └──────────────────┬───────────────────┘                       │
│                     │                                            │
│                     ▼                                            │
│  ┌─── 薪资匹配检查 (salaryMatchCheck) ──────────────────┐      │
│  │  输入：totalOutSalary, totalInSalary, team.isTaxPayer │      │
│  │                                                        │      │
│  │  if (teamA.isTaxPayer) {                               │      │
│  │    allowedIncoming = totalOutSalary * 1.25 + 100000    │      │
│  │  } else if (teamA.overApron2) {                        │      │
│  │    allowedIncoming = totalOutSalary + 250000           │      │
│  │  } else {                                              │      │
│  │    // 非税队：更灵活，具体看薪资档位                    │      │
│  │  }                                                     │      │
│  │                                                        │      │
│  │  result = totalInSalary <= allowedIncoming              │      │
│  └────────────────────────────────────────────────────────┘      │
│                     │                                            │
│                     ▼                                            │
│  ┌─── 阵容人数检查 (rosterCheck) ───────────────────────┐      │
│  │  输入：team.players.length, outgoingCount, incomingCount│      │
│  │                                                        │      │
│  │  newCount = currentCount - outgoingCount + incomingCount│      │
│  │  result = newCount <= 15 && newCount >= 1              │      │
│  └────────────────────────────────────────────────────────┘      │
│                     │                                            │
│                     ▼                                            │
│  ┌─── Stepien Rule (pickCheck) ─────────────────────────┐      │
│  │  禁止连续两年交易首轮签                                 │      │
│  │                                                        │      │
│  │  if (tradeIncludesOutgoingFirst) {                     │      │
│  │    teamStillHasOwnOrSwapped = checkPickAvailability()  │      │
│  │    result = teamStillHasOwnOrSwapped                   │      │
│  │  }                                                     │      │
│  └────────────────────────────────────────────────────────┘      │
│                     │                                            │
│                     ▼                                            │
│  ┌─── 交易保证金检查 (tradeKickerCheck) ────────────────┐      │
│  │  对每个 outgoing 球员检查 trade_kicker                  │      │
│  │  kickerAmount = player.salary * kickerPercent          │      │
│  │  totalOutSalary += kickerAmount  // 重新计算            │      │
│  └────────────────────────────────────────────────────────┘      │
│                     │                                            │
│                     ▼                                            │
│  ┌─── 其他规则 ────────────────────────────────────────┐       │
│  │  · 毒丸条款 (Poison Pill)                             │       │
│  │  · 底薪特例 (Minimum Salary Exception)               │        │
│  │  · 新签球员 90 天限制                                  │       │
│  │  · NTC 交易否决权                                     │       │
│  │  · 现金上限                                           │       │
│  └──────────────────────────────────────────────────────┘       │
│                     │                                            │
│                     ▼                                            │
│  dispatch({                                                      │
│    type: 'TRADE_CHECK_RESULT',                                   │
│    result: {                                                     │
│      allPassed: boolean,                                         │
│      checks: RuleCheckResult[],  // 每条规则的结果               │
│      summary: {                                                 │
│        totalOutSalary, totalInSalary,                           │
│        salaryDiff, teamANewRoster, teamBNewRoster               │
│      }                                                           │
│    }                                                             │
│  })                                                              │
│       │                                                         │
│       ▼                                                         │
│  UI 渲染规则结果：                                                │
│  ┌───────────────────────────────────────────┐                   │
│  │ ✅ 薪资匹配通过                            │                   │
│  │    送出 $67M → 可接收 $83.8M = 67M×1.25+100K│                 │
│  │    实际接收 $70M ✅                         │                   │
│  │ ✅ 阵容人数通过 (15人 → 14人)               │                   │
│  │ ✅ Stepien Rule 通过                        │                   │
│  │ ⚠️ 交易限制提醒                             │                   │
│  │    里夫斯刚签约（Poison Pill）              │                   │
│  │    （提示但不阻止交易）                      │                   │
│  └───────────────────────────────────────────┘                   │
│       │                                                         │
│       │ allPassed === true                                       │
│       ▼                                                         │
│  自动触发 AI 分析（见下一节）                                    │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// ============================================================
// Reducer：CHECK_TRADE
// ============================================================

async function handleCheckTrade(state: TradeState, dispatch: Dispatch) {
  // 前置校验
  if (!state.teamA || !state.teamB) {
    toast.warning('请先选择两支球队')
    return
  }
  if (state.outgoing.length === 0 && state.incoming.length === 0) {
    toast.warning('请先添加交易球员或资产')
    return
  }

  dispatch({ type: 'CHECK_TRADE' })   // isChecking = true

  try {
    const proposal: TradeProposal = {
      teamA: state.teamA,
      teamB: state.teamB,
      outgoing: state.outgoing,
      incoming: state.incoming,
    }

    // 🔥 调用规则引擎（纯 TypeScript，同步）
    const result = runTradeCheck(proposal)

    dispatch({ type: 'TRADE_CHECK_RESULT', result })

    // 规则全部通过 → 自动触发 AI 分析
    if (result.allPassed) {
      handleAIAnalysis(proposal, result, dispatch)
    }
  } catch (err) {
    toast.error('校验出错：' + err.message)
    dispatch({ type: 'TRADE_CHECK_RESULT', result: null })
  }
}
```

---

#### 5.9.8 AI 分析流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      AI 分析流程                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  触发条件：规则校验 allPassed === true                           │
│       │                                                         │
│       ├─ 检查今日调用次数（localStorage 计数）                   │
│       │   · 每日上限：20 次                                     │
│       │   · 超限 → 显示「今日 AI 分析次数已用完」               │
│       │                                                         │
│       ▼                                                         │
│  dispatch({ type: 'AI_ANALYSIS_LOADING' })                       │
│       │                                                         │
│       │ isAnalyzing = true，显示 skeleton loading               │
│       ▼                                                         │
│  ┌──────────────────────────────────────┐                       │
│  │  buildPrompt(proposal, checkResult)   │                       │
│  │                                      │                       │
│  │  构造 System Prompt：                │                       │
│  │  "你是 NBA 薪资专家和交易分析师，     │                       │
│  │   精通 CBA 规则。请分析以下交易，     │                       │
│  │   给出评级（A+ ~ F）和双方得失分析。" │                       │
│  │                                      │                       │
│  │  构造 User Prompt：                  │                       │
│  │  ```                                │                       │
│  │  交易提案：                          │                       │
│  │  湖人送出：东契奇($54.1M, PER28)... │                       │
│  │  湖人获得：库里($59.6M, PER22)...   │                       │
│  │  规则校验：✅ 薪资匹配 ...          │                       │
│  │  ```                                │                       │
│  └──────────────────┬───────────────────┘                       │
│                     │                                            │
│                     ▼                                            │
│  ┌──────────────────────────────────────┐                       │
│  │  fetch('https://api.deepseek.com/...')│                      │
│  │                                      │                       │
│  │  headers: {                          │                       │
│  │    Authorization: `Bearer ${         │                       │
│  │      process.env.NEXT_PUBLIC_AI_KEY  │                       │
│  │    }`                                │                       │
│  │  }                                   │                       │
│  │                                      │                       │
│  │  body: JSON.stringify({              │                       │
│  │    model: 'deepseek-chat',           │                       │
│  │    messages: [                       │                       │
│  │      { role: 'system', content },    │                       │
│  │      { role: 'user', content }       │                       │
│  │    ],                                │                       │
│  │    temperature: 0.7,                 │                       │
│  │    max_tokens: 800,                  │                       │
│  │  })                                  │                       │
│  └──────────────────┬───────────────────┘                       │
│                     │                                            │
│          ┌──────────┼──────────┐                                │
│          │ 成功                │ 失败                            │
│          ▼                     ▼                                 │
│    解析 JSON 响应          显示错误兜底                          │
│    extractRating()         "AI 分析暂不可用"                     │
│    parseAnalysis()          + 重试按钮                           │
│          │                                                       │
│          ▼                                                       │
│  dispatch({                                                      │
│    type: 'AI_ANALYSIS_RESULT',                                   │
│    analysis: {                                                   │
│      rating: 'B+',                                               │
│      summary: '这是一笔双赢交易...',                             │
│      teamAPerspective: '湖人角度分析...',                        │
│      teamBPerspective: '勇士角度分析...',                        │
│    }                                                             │
│  })                                                              │
│       │                                                         │
│       ├─ localStorage 计数 +1                                    │
│       └─ isAnalyzing = false                                     │
│                                                                 │
│  UI 渲染 AI 分析卡片                                             │
└─────────────────────────────────────────────────────────────────┘
```

```typescript
// ============================================================
// 文件：src/lib/nba-ai.ts — AI 分析模块
// ============================================================

const AI_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DAILY_LIMIT = 20

function getTodayKey(): string {
  const today = new Date().toISOString().slice(0, 10)
  return `nba-ai-count-${today}`
}

function checkRateLimit(): boolean {
  if (typeof window === 'undefined') return false
  const key = getTodayKey()
  const count = Number(localStorage.getItem(key) || 0)
  return count < DAILY_LIMIT
}

function incrementRateLimit(): void {
  const key = getTodayKey()
  const count = Number(localStorage.getItem(key) || 0)
  localStorage.setItem(key, String(count + 1))
}

async function analyzeTrade(
  proposal: TradeProposal,
  ruleResult: TradeCheckResult,
): Promise<AIAnalysis> {

  if (!checkRateLimit()) {
    throw new Error('今日 AI 分析次数已用完（20次/天）')
  }

  const systemPrompt = `你是 NBA 薪资专家和交易分析师，精通 CBA 规则...`
  const userPrompt = buildUserPrompt(proposal, ruleResult)

  const response = await fetch(AI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
    }),
  })

  if (!response.ok) {
    throw new Error(`AI API 错误: ${response.status}`)
  }

  incrementRateLimit()

  const data = await response.json()
  const rawText = data.choices[0].message.content

  // 解析 AI 返回的文本，提取结构化信息
  return parseAIResponse(rawText)
}

function buildUserPrompt(
  proposal: TradeProposal,
  result: TradeCheckResult,
): string {
  const outSummary = proposal.outgoing.map(item => {
    if (item.type === 'player') {
      return `${item.player!.name}($${formatSalary(item.player!.salary)}, PER${item.player!.per ?? 'N/A'})`
    }
    if (item.type === 'draft_pick') {
      return `${item.draftPick!.year}年${item.draftPick!.round === 1 ? '首轮' : '次轮'}签`
    }
    return `$${item.cashAmount!.toLocaleString()} 现金`
  }).join('、')

  const inSummary = proposal.incoming.map(item => {
    // 同上
  }).join('、')

  return [
    `交易提案：`,
    `${proposal.teamA!.name} 送出：${outSummary}`,
    `${proposal.teamB!.name} 送出：${inSummary}`,
    ``,
    `规则校验结果：`,
    ...result.checks.map(c =>
      `${c.passed ? '✅' : '❌'} ${c.name}: ${c.detail}`
    ),
    ``,
    `请分析此交易并给出评级（A+ ~ F）。`,
  ].join('\n')
}

function parseAIResponse(rawText: string): AIAnalysis {
  // 简单正则提取，实际可能需要更鲁棒的解析
  const ratingMatch = rawText.match(/评级[：:]\s*([A-F][+-]?)/i)
  return {
    rating: ratingMatch?.[1] ?? 'N/A',
    summary: rawText,
    teamAPerspective: '',  // 可从 rawText 分段提取
    teamBPerspective: '',
  }
}
```

---

#### 5.9.9 分享与重置

```typescript
// ============================================================
// 分享交易链接
// ============================================================

function generateShareUrl(state: TradeState): string {
  const params = new URLSearchParams()

  if (state.teamA) params.set('a', state.teamA.id)
  if (state.teamB) params.set('b', state.teamB.id)

  state.outgoing.forEach(item => {
    if (item.type === 'player') params.append('out', item.player!.id)
  })
  state.incoming.forEach(item => {
    if (item.type === 'player') params.append('in', item.player!.id)
  })

  return `${window.location.origin}/nba-trade?${params.toString()}`
}

function handleShare(state: TradeState) {
  const url = generateShareUrl(state)
  if (navigator.share) {
    navigator.share({ title: 'NBA 交易模拟', url })
  } else {
    navigator.clipboard.writeText(url)
    toast.success('链接已复制到剪贴板！')
  }
}

// ============================================================
// 重置
// ============================================================

case 'RESET':
  return {
    teamA: null,
    teamB: null,
    outgoing: [],
    incoming: [],
    checkResult: null,
    aiAnalysis: null,
    isChecking: false,
    isAnalyzing: false,
    showTeamModal: null,
  }
```

---

#### 5.9.10 完整组件树 + 数据流图

```
┌─────────────────────────────────────────────────────────────────┐
│                        组件树 & 数据流                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TradePage (page.tsx)                                           │
│  ├─ useReducer(tradeReducer, initialState)                      │
│  │                                                              │
│  ├─ <Header />                          ← token-nav 复用        │
│  │                                                              │
│  ├─ <TradeHeader />                                              │
│  │   └─ 标题 + 副标题 + 赛季选择器                               │
│  │                                                              │
│  ├─ <TeamSelector show={showTeamModal} />                       │
│  │   └─ 选队弹窗（Modal）                                       │
│  │       └─ 点击球队 → dispatch SELECT_TEAM_A / SELECT_TEAM_B   │
│  │                                                              │
│  ├─ <SwapButton onClick={dispatch SWAP_TEAMS} />                │
│  │                                                              │
│  ├─ <TeamPanel team={teamA} />                                  │
│  │   ├─ 队徽 + 队名                                              │
│  │   ├─ 财务卡片（奢侈税 / 薪资空间）                            │
│  │   └─ <PlayerList team={teamA} />                             │
│  │       └─ <PlayerRow /> × N                                   │
│  │           └─ onClick → dispatch ADD_TO_TRADE                  │
│  │                                                              │
│  ├─ <TeamPanel team={teamB} />                                  │
│  │   └─ （同上）                                                 │
│  │                                                              │
│  ├─ <TradePackage />                                             │
│  │   ├─ <OutgoingColumn>                                        │
│  │   │   ├─ <TradeItemCard /> × N (球员/选秀权/现金)            │
│  │   │   │   └─ [×] → dispatch REMOVE_FROM_TRADE                │
│  │   │   ├─ <AddPlayerButton />                                 │
│  │   │   ├─ <AddPickButton /> → 打开 <DraftPickModal />          │
│  │   │   └─ <AddCashButton />  → 打开 <CashModal />             │
│  │   ├─ <IncomingColumn>                                        │
│  │   │   └─ （同上结构）                                         │
│  │   └─ <CheckTradeButton />                                    │
│  │       └─ onClick → handleCheckTrade()                         │
│  │                                                              │
│  ├─ <TradeCheckResult result={checkResult} />                   │
│  │   └─ 逐条渲染 ✅/❌/⚠️ 规则结果                              │
│  │                                                              │
│  ├─ <AIAnalysis analysis={aiAnalysis} />                        │
│  │   ├─ 评级徽章（A+ ~ F）                                       │
│  │   ├─ 综述                                                     │
│  │   └─ 双方角度分析                                             │
│  │                                                              │
│  ├─ <ActionBar />                                                │
│  │   ├─ [🔗 分享] → handleShare()                               │
│  │   ├─ [🔄 重置] → dispatch RESET                              │
│  │   └─ [⭐ 收藏] → localStorage                                │
│  │                                                              │
│  └─ <Footer />                            ← token-nav 复用      │
│                                                                 │
│  ─── 数据流向 ───                                                │
│                                                                 │
│  teams.json ──import──▶ teamsData: Team[]                       │
│  players.json ─import─▶ playersData: Player[]                   │
│       │                                                         │
│       └──▶ useMemo: team.players = playersData.filter(          │
│              p => p.teamId === team.id                          │
│            )                                                     │
│                                                                 │
│  state ──▶ reducer ──▶ 新 state ──▶ 组件树 re-render            │
│                                                                 │
│  state.outgoing + state.incoming ──▶ runTradeCheck()            │
│       └──▶ TradeCheckResult ──▶ buildUserPrompt()               │
│            └──▶ fetch(AI_API) ──▶ AIAnalysis                    │
└─────────────────────────────────────────────────────────────────┘
```

---

### 5.10 交互时序图（核心 Happy Path）

```
用户                     UI                     Reducer               规则引擎              AI API
 │                        │                        │                     │                    │
 │  点击「选择球队 A」     │                        │                     │                    │
 │───────────────────────▶│                        │                     │                    │
 │                        │  OPEN_TEAM_MODAL       │                     │                    │
 │                        │───────────────────────▶│                     │                    │
 │                        │                        │                     │                    │
 │  选择「湖人」          │                        │                     │                    │
 │───────────────────────▶│                        │                     │                    │
 │                        │  SELECT_TEAM_A         │                     │                    │
 │                        │───────────────────────▶│                     │                    │
 │                        │                        │ 更新 teamA          │                    │
 │                        │                        │ 清空 out/in         │                    │
 │                        │                        │                     │                    │
 │                        │◀── re-render ──────────│                     │                    │
 │                        │                        │                     │                    │
 │  (同理选择勇士为 Team B)│                        │                     │                    │
 │                        │                        │                     │                    │
 │  点击「东契奇 →」      │                        │                     │                    │
 │───────────────────────▶│                        │                     │                    │
 │                        │  ADD_TO_TRADE          │                     │                    │
 │                        │  (doncic, 'out')       │                     │                    │
 │                        │───────────────────────▶│                     │                    │
 │                        │                        │ outgoing.push(doncic)│                  │
 │                        │◀── re-render ──────────│                     │                    │
 │                        │                        │                     │                    │
 │  点击「库里 →」        │                        │                     │                    │
 │───────────────────────▶│                        │                     │                    │
 │                        │  ADD_TO_TRADE          │                     │                    │
 │                        │  (curry, 'in')         │                     │                    │
 │                        │───────────────────────▶│                     │                    │
 │                        │                        │ incoming.push(curry)│                    │
 │                        │◀── re-render ──────────│                     │                    │
 │                        │                        │                     │                    │
 │  点击「检查交易」       │                        │                     │                    │
 │───────────────────────▶│                        │                     │                    │
 │                        │  CHECK_TRADE           │                     │                    │
 │                        │───────────────────────▶│                     │                    │
 │                        │                        │  isChecking=true    │                    │
 │                        │                        │                     │                    │
 │                        │                        │  runTradeCheck()    │                    │
 │                        │                        │────────────────────▶│                    │
 │                        │                        │                     │  逐条执行规则     │
 │                        │                        │◀────────────────────│                    │
 │                        │                        │  TradeCheckResult   │                    │
 │                        │                        │                     │                    │
 │                        │                        │  allPassed === true │                    │
 │                        │                        │                     │                    │
 │                        │◀── re-render ──────────│                     │                    │
 │                        │  (渲染规则结果 +       │                     │                    │
 │                        │   触发 AI 分析)        │                     │                    │
 │                        │                        │                     │                    │
 │                        │  fetch(AI_API) ────────────────────────────────────────────────▶│
 │                        │                        │                     │                    │
 │                        │◀────────────────────────────────────────────────────────────────│
 │                        │  AI 分析结果           │                     │                    │
 │                        │                        │                     │                    │
 │                        │  AI_ANALYSIS_RESULT    │                     │                    │
 │                        │───────────────────────▶│                     │                    │
 │                        │                        │ 更新 aiAnalysis     │                    │
 │                        │◀── re-render ──────────│                     │                    │
 │                        │                        │                     │                    │
 │  (查看完整分析结果)     │                        │                     │                    │
 │◀───────────────────────│                        │                     │                    │
 │                        │                        │                     │                    │
```

## 六、开发阶段

### Phase 1：数据准备（1 天）

- [ ] 编写爬虫脚本（Python，放 nbatrade 目录）
  - `data/scraper/crawl_contracts.py` → basketball-reference 合同数据
  - `data/scraper/crawl_team_cap.py` → spotrac 薪资空间
  - `data/scraper/crawl_rules.py` → cbaguide 规则数据
- [ ] 数据清洗 + 输出 JSON
  - `data/output/players.json` → ~530 条球员
  - `data/output/teams.json` → 30 条球队
- [ ] 拷贝 JSON 到 token-nav：
  - `players.json` → token-nav `src/lib/nba-players.ts`（import json）
  - `teams.json` → token-nav `src/lib/nba-teams.ts`（import json）
- [ ] 准备 30 支球队 Logo → `token-nav/public/nba/`

### Phase 2：规则引擎（1.5 天）

在 token-nav 项目内实现 `src/lib/engine/`。

**Phase 2a — 核心规则（P0）**
- [ ] `salaryMatch.ts` — 薪资匹配（4 档：非税/税/第一土豪/第二土豪）
- [ ] `tradeRestrictions.ts` — 底薪特例 + 新签球员限制
- [ ] `rosterCheck.ts` — 阵容人数（15+3）
- [ ] `pickCheck.ts` — Stepien Rule
- [ ] `tradeKicker.ts` — 交易保证金
- [ ] `index.ts` — 统一入口 `runTradeCheck(proposal): TradeResult`

**Phase 2b — 边界规则（P1）**
- [ ] 毒丸条款
- [ ] TPE 匹配
- [ ] NTC（无交易条款）
- [ ] 现金上限

### Phase 3：类型定义 + 常量（0.5 天）

- [ ] `src/lib/nba-types.ts`
  - `Player`, `Team`, `DraftPick`, `TradeProposal`, `TradeResult`, `RuleCheckResult`
- [ ] `src/lib/nba-constants.ts`
  - 工资帽阈值、税率、现金上限等

### Phase 4：UI 组件（1.5 天）

在 token-nav `src/components/nba/` 下创建：

- [ ] `TeamSelector.tsx` — 下拉搜索选队 + Logo + 薪资空间
- [ ] `PlayerSelector.tsx` — 按球队过滤 + 搜索（姓名/位置/薪资）
- [ ] `TradePanel.tsx` — 双面板：送出 vs 获得 + 选秀权 + 现金
- [ ] `TradeResult.tsx` — 规则逐条展示（✅绿色 / ❌红色）
- [ ] `AIAnalysis.tsx` — 评级徽章 + 得失分析 + skeleton loading

### Phase 5：页面拼装（0.5 天）

- [ ] `src/app/nba-trade/page.tsx` — 主界面，'use client'，拼装所有组件
- [ ] `src/app/nba-trade/rules/page.tsx` — 规则说明 SEO 页
- [ ] token-nav header 添加「NBA交易」导航入口

### Phase 6：AI 集成（0.5 天）

- [ ] `src/lib/nba-ai.ts` — 封装 fetch 调用
  ```typescript
  // 客户端直接调 LLM API
  export async function analyzeTrade(proposal: TradeProposal, ruleResult: TradeResult) {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_AI_API_KEY}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [...] })
    })
    return response.json()
  }
  ```
- [ ] Prompt 设计：System = NBA 薪资专家，User = 交易详情 + 规则结果
- [ ] 前端调用次数限制（localStorage，每日上限）

### Phase 7：SEO + 优化（0.5 天）

- [ ] `src/app/nba-trade/layout.tsx` — metadata（标题、描述、OG）
- [ ] 规则说明页做好 SEO 内容结构
- [ ] 更新 token-nav 的 sitemap（加入 `/nba-trade/`）

### Phase 8：移动端适配（0.5 天）

- [ ] Tailwind 响应式：移动端纵向排列两队选择器
- [ ] 触控按钮尺寸优化
- [ ] 球员选择器移动端交互

### Phase 9：发布（0.5 天）

- [ ] `npm run build` token-nav（静态导出包含 `/nba-trade/`）
- [ ] Vercel 重新部署
- [ ] 测试全流程
- [ ] 录 vibe coding 视频发抖音

---

## 七、时间估算

| 阶段 | 内容 | 预估 |
|------|------|------|
| Phase 1 | 数据准备（爬虫+JSON+Logo） | 1 天 |
| Phase 2 | 规则引擎 | 1.5 天 |
| Phase 3 | 类型定义+常量 | 0.5 天 |
| Phase 4 | UI 组件 | 1.5 天 |
| Phase 5 | 页面拼装 | 0.5 天 |
| Phase 6 | AI 集成 | 0.5 天 |
| Phase 7 | SEO+优化 | 0.5 天 |
| Phase 8 | 移动端适配 | 0.5 天 |
| Phase 9 | 发布 | 0.5 天 |
| **合计** | | **约 7 天** |

---

## 八、数据流

```
爬虫 (Python, nbatrade/data/)
  ↓ 产出
JSON 文件 (players.json, teams.json)
  ↓ 拷贝到
token-nav/src/lib/nba-players.ts, nba-teams.ts
  ↓ 导入
React 组件 (TeamSelector, PlayerSelector)
  ↓ 用户交互
TradeProposal 状态
  ↓ 提交
规则引擎 runTradeCheck() → TradeResult
  ↓ 规则全部通过
客户端 fetch → LLM API → AI 分析
  ↓ 渲染
TradeResult + AIAnalysis 组件展示
```

---

## 九、风险与应对

| 风险 | 应对 |
|------|------|
| API Key 客户端暴露 | 使用用量限制的 key，后续可加 CloudBase 云函数代理 |
| 爬虫数据源变更 | 手动维护 JSON，数据量小（530 球员 + 30 球队） |
| CBA 规则覆盖不全 | Phase 1 做 80% 常见规则，够用即可 |
| LLM 调用超量 | localStorage 计数 + 每日上限 |
| token-nav 项目体积增大 | nba-trade 代码量不大（~2K 行），可接受 |

---

## 十、后续独立部署路径

当 nbatrade 流量足够大需要独立服务器时：

```
当前：token-nav/src/app/nba-trade/  →  未来：独立 nbatrade Vercel 项目
```

迁移成本低：组件和引擎代码直接搬，无需重写。