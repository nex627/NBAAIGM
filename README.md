# NBA AI GM — 交易模拟器

中文版 NBA 交易模拟器，完整 CBA 规则引擎 + AI 交易分析。

对标 ESPN Trade Machine，差异化：中文界面 + 代码级规则引擎 + AI 解释 + 移动端优先。

## 功能

### 交易模拟

- 选择两支球队，从每队选择 1-3 名球员 + 选秀权 + 现金
- 实时校验交易规则（薪资匹配、阵容限制、选秀权限制等）
- 判定结果：✅ 规则通过 / ❌ 具体因哪条规则不通过

### AI 交易分析

- 交易评级（A-F）
- 每队得失分析
- 中文自然语言解释
- AI 不替代规则引擎，只负责解释

### AI 功能模块

| 模块 | 说明 |
|------|------|
| Trade Explainer | 交易解释 — 为什么这笔交易合理/不合理 |
| Trade Grader | 交易评级 — A 到 F 评分 |
| Trade Advisor | 交易建议 — 基于球队需求推荐交易方案 |
| Trade Analogy | 历史类比 — 找相似的历史交易 |
| Player Compare | 球员对比 — 数据和风格对比 |
| Salary Advisor | 薪资顾问 — 薪资空间和合同建议 |
| Scenario Generator | 场景生成 — 生成交易挑战场景 |
| GM Chat | GM 对话 — 和 AI 总经理聊天 |
| Rule Explainer | 规则解释 — CBA 规则通俗解读 |

## 项目结构

```
nbatrade/
├── prototype/               ← 可运行的原型（纯 HTML/JS/CSS）
│   ├── index.html
│   ├── server.js            ← Node.js 后端（代理 AI API）
│   ├── css/
│   ├── js/
│   │   ├── app.js           ← 主逻辑
│   │   ├── rules.js         ← CBA 规则引擎
│   │   ├── ai-service.js    ← AI 服务
│   │   ├── ai-ui.js         ← AI 界面交互
│   │   ├── render.js        ← 渲染
│   │   ├── state.js         ← 状态管理
│   │   ├── data.js          ← 数据加载
│   │   └── ui.js            ← UI 交互
│   └── data/
│       ├── output/          ← 结构化数据（合同、规则、TPE）
│       └── team-profiles/   ← 30 支球队档案
├── src/lib/ai/              ← Next.js AI 模块（TypeScript）
│   ├── index.ts             ← AI 服务入口
│   ├── llm-client.ts        ← LLM 客户端（支持 DeepSeek/OpenAI）
│   ├── context-builder.ts   ← 上下文构建
│   ├── team-profile-loader.ts
│   └── prompts/             ← 9 个 AI prompt 模块
├── data/
│   ├── output/              ← 结构化 JSON 数据
│   ├── scripts/             ← 数据校验脚本
│   └── team-profiles/       ← 球队档案（Markdown）
├── docs/                    ← 设计文档
├── .env.example
└── .gitignore
```

## 快速开始

### 原型运行

```bash
cd prototype
node server.js
# 打开 http://localhost:3000
```

### 环境变量

复制 `.env.example` 为 `.env`，填入你的 API Key：

```bash
DEEPSEEK_API_KEY=sk-your-api-key-here
```

启动时设置环境变量：

```bash
# PowerShell
$env:DEEPSEEK_API_KEY="sk-your-key"; node server.js

# Bash
DEEPSEEK_API_KEY=sk-your-key node server.js
```

### 数据

项目内置结构化 JSON 数据（合同、规则、TPE、球员信息），位于 `data/output/` 目录。

## 技术栈

| 层 | 技术 |
|----|------|
| 原型 | HTML + CSS + Vanilla JS + Node.js |
| 生产版 | Next.js + TypeScript + Tailwind CSS |
| 规则引擎 | 纯 TypeScript（不依赖 AI 判断） |
| AI 层 | LLM API（DeepSeek / OpenAI） |
| 数据层 | 静态 JSON |

## 规则引擎

代码级 CBA 规则校验，不依赖 AI：

- 薪资匹配（125% + $10M 规则）
- 阵容限制（最多 15 人）
- 选秀权保护规则
- TPE（交易球员例外）使用
- Luxury Tax / Apron 约束
- Sign-and-Trade 规则

## 版权声明

- 本项目为非官方球迷项目，与 NBA 及任何球队无关
- 所有商标归各自权利人所有
- 球队标识使用纯色圆形 + 队名缩写，不使用任何官方 logo
- 不使用球员照片，用首字母头像替代

## License

MIT
