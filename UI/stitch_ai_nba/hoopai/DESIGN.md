---
name: HoopAI 篮核助手
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#393939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c6d3'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e909c'
  outline-variant: '#434651'
  surface-tint: '#b0c6ff'
  primary: '#b0c6ff'
  on-primary: '#002c70'
  primary-container: '#17408b'
  on-primary-container: '#8fafff'
  inverse-primary: '#385ca8'
  secondary: '#ffb3b0'
  on-secondary: '#680010'
  secondary-container: '#c40027'
  on-secondary-container: '#ffd2cf'
  tertiary: '#e9c400'
  on-tertiary: '#3a3000'
  tertiary-container: '#c8a900'
  on-tertiary-container: '#4b3e00'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d9e2ff'
  primary-fixed-dim: '#b0c6ff'
  on-primary-fixed: '#001945'
  on-primary-fixed-variant: '#1b438e'
  secondary-fixed: '#ffdad8'
  secondary-fixed-dim: '#ffb3b0'
  on-secondary-fixed: '#410006'
  on-secondary-fixed-variant: '#93001b'
  tertiary-fixed: '#ffe16d'
  tertiary-fixed-dim: '#e9c400'
  on-tertiary-fixed: '#221b00'
  on-tertiary-fixed-variant: '#544600'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
typography:
  display-lg:
    fontFamily: Anton
    fontSize: 48px
    fontWeight: '400'
    lineHeight: '1.1'
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Anton
    fontSize: 32px
    fontWeight: '400'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Sora
    fontSize: 20px
    fontWeight: '700'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Sora
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Sora
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.6'
  label-caps:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.1em
  data-mono:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin: 16px
---

## 品牌与风格

本设计系统旨在为高频互动的 NBA 交易模拟体验提供专业、充满活力且数据驱动的视觉框架。目标受众是资深篮球爱好者、数据分析师和模拟经理，他们追求深度数据集成与即时反馈。

视觉风格定位为**现代运动（Modern Sports）**与**玻璃拟态（Glassmorphism）**的融合。通过深色背景营造出如临赛场深夜直播的沉浸感，结合高饱和度的 NBA 经典色作为功能导向，展现出专业、权威且充满科技感的品牌性格。界面应减少装饰性元素，强调数据可视化的清晰度与模拟过程中的动态反馈。

## 颜色

本设计系统采用深度黑暗模式。
- **Primary (NBA Blue):** 用于主要动作、导航项和选定状态。
- **Secondary (NBA Red):** 用于警告、薪资帽溢出提示、或竞争对手的负面反馈。
- **Tertiary (AI Gold):** 专属用于 AI 预测预测、交易评分亮点及核心球员评级。
- **Backgrounds:** 背景由深藏蓝（Deep Navy）与碳黑（Charcoal）组成，形成多维度的阴影层次，而非纯黑。
- **Surface:** 使用半透明的白色与蓝色叠加，配合模糊效果，形成玻璃质感层级。

## 字体

字体策略平衡了竞技体育的力量感与精密数据的可读性：
- **标题 (Anton):** 仅用于大标题、比分或球员姓名。这种浓缩的无衬线字体能唤起 NBA 官方转播的即视感。
- **正文 (Sora):** 现代几何风格，确保在深色模式下依然具有极佳的清晰度。
- **标签与数据 (Hanken Grotesk):** 采用等宽数字设置，确保球员薪资、PER 值等数值在纵向对齐时保持整齐。

## 布局与间距

采用基于 **8px** 的网格系统，但在严密的数据密集型列表（如球员名单）中，允许使用 **4px** 的增量以优化空间利用率。
- **移动端布局:** 采用 4 列流式网格，标准边距为 16px。
- **层级堆叠:** 在球员对比视图中，使用固定的 16px Gutter 以确保数据列的分离度。
- **内容流:** 垂直间距应保持紧凑，体现“信息密集、决策快速”的工具属性。

## 海拔高度与深度

深度感通过**玻璃拟态 (Glassmorphism)** 建立，而非传统的实体投影：
- **基础层 (Level 0):** 深色画布底色。
- **容器层 (Level 1):** 背景模糊（Backdrop Blur 20px）加 10% 不透明度的白色填充，并带有 1px 的微妙白色边框。
- **浮动层 (Level 2):** 用于模态框和弹出菜单，背景模糊度增加，边缘带有更强的光晕效果，赋予其科技感。
- **光影处理:** 避免使用大面积阴影，转而使用发光的蓝色或红色光晕（Bloom）来区分当前的活动交易方。

## 形状

形状语言兼顾现代感与亲和力：
- **通用圆角 (Rounded):** 标准卡片和输入框采用 8px 圆角。
- **极端圆角 (Pill):** 用于“交易批准”或“搜索”等交互动作，使用全圆角（Pill-shaped）以引导用户视线。
- **数据单元格:** 内部数据标签允许使用更小的 4px 圆角，以维持严谨的网格感。

## 组件

- **按钮 (Buttons):** 
  - 主动作按钮采用 NBA Blue 渐变填充，文字使用 Anton 字体。
  - AI 辅助按钮采用金色发光边框，点击时带有流光动画。
- **球员卡片 (Player Cards):** 
  - 背景采用半透明玻璃质感，背景显示球员所在球队的 Logo 剪影。
  - 核心属性（如薪资、能力值）使用大字号加粗。
- **数据图表 (Data Charts):** 
  - 使用 NBA Blue 和 NBA Red 的对比色线图。
  - 渐变填充区域应透明度极低，以免遮挡网格线。
- **交易进度条 (Trade Sliders):** 
  - 采用粗壮的轨道设计，进度点在滑动时应触发触感反馈，且数值悬浮显示。
- **状态芯片 (Status Chips):** 
  - 用于标记球员身份（如“受限自由球员”、“不可交易”），背景颜色较深，文字颜色高亮。