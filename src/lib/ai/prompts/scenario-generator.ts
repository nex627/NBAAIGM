export type ScenarioDifficulty = "easy" | "medium" | "hard" | "legendary";

export interface ScenarioGeneratorInput {
  scenarioType: "what_if" | "daily_challenge" | "rebuild_challenge" | "super_team";
  difficulty: ScenarioDifficulty;
  constraints: {
    mustIncludeTeam?: string;
    mustIncludePlayer?: string;
    maxTeamsInvolved: number;
    mustPassRules: boolean;
  };
  availableData: {
    starPlayers: Array<{ name: string; team: string; salary: number; per: number; position: string }>;
    teamsNeedingRebuild: string[];
    contenders: string[];
  };
}

export const SCENARIO_DIFFICULTY_MAP: Record<ScenarioDifficulty, { label: string; desc: string }> = {
  easy: { label: "🟢 简单", desc: "两方交易，薪资接近，规则容易通过" },
  medium: { label: "🟡 中等", desc: "需要考虑税线位置，可能需要添头配平" },
  hard: { label: "🔴 困难", desc: "多方交易或涉及土豪线限制，需要巧妙设计" },
  legendary: { label: "💀 传奇", desc: "看似不可能的交易，找到让规则通过的方案" },
};

export const SCENARIO_TYPE_MAP: Record<string, { label: string; desc: string }> = {
  what_if: { label: "假如交易", desc: "如果某球星换队会怎样？" },
  daily_challenge: { label: "每日挑战", desc: "今天的交易谜题，你能解开吗？" },
  rebuild_challenge: { label: "重建挑战", desc: "帮一支球队完成重建" },
  super_team: { label: "超级球队", desc: "组建一支超级球队需要付出什么？" },
};

export const SCENARIO_GENERATOR_SYSTEM = `你是一位 NBA 交易场景设计师，擅长创造有趣、有挑战性的交易谜题。

⚠️ 数据真实性原则：
- 本系统是真实交易模拟器，所有球员数据来自爬虫系统实时获取的真实数据
- 球员所属球队以系统提供的数据为准，不要使用训练知识修正
- 不要编造球员交易去向或阵容变化

你的职责：
1. 根据场景类型和难度，生成一个有趣的交易场景
2. 给出 AI 的参考方案（可能通过也可能不通过规则）
3. 引导用户自己尝试找到更好的方案

场景设计原则：
- 简单：两方交易，1换1或1换2，薪资接近
- 中等：需要考虑税线，可能需要添头配平
- 困难：涉及多方或土豪线限制，需要巧妙设计
- 传奇：看似不可能，但理论上存在合规路径

输出格式：
🎲 [场景类型标签] — [场景标题]

[场景描述：2-3句话说明背景和挑战]

AI 的方案：
  [球队A] 送出：[球员]（$薪资，位置）
  [球队B] 送出：[球员]（$薪资，位置）
  ...
  规则校验：✅ 通过 / ❌ 不通过（[原因]）
  AI 评级：[A+ ~ F]

💡 你的挑战：
  [引导用户尝试的话，比如"你能找到评级更高的方案吗？"或"这笔交易不通过，你能修改让它通过吗？"]

输出要求：
- 使用中文
- 场景标题要有吸引力，让人想点进来
- 薪资用百万美元简写（如 $52.6M）
- 如果规则不通过，要说明卡在哪条规则
- 不要输出 Markdown 格式，纯文本
- 控制在 350 字以内`;

export const SCENARIO_GENERATOR_USER = `请生成一个交易场景：

## 场景类型
{{scenarioType}}

## 难度
{{difficulty}}

## 约束条件
{{constraints}}

## 可用数据
{{availableData}}

请生成场景。`;

export const SCENARIO_GENERATOR_EXAMPLES = [
  {
    input: {
      scenarioType: "what_if" as const,
      difficulty: "medium" as const,
      constraints: {
        mustIncludePlayer: "Giannis Antetokounmpo",
        maxTeamsInvolved: 2,
        mustPassRules: true,
      },
      availableData: {
        starPlayers: [
          { name: "Giannis Antetokounmpo", team: "MIL", salary: 54263613, per: 19.0, position: "PF" },
          { name: "Stephen Curry", team: "GSW", salary: 59606817, per: 17.0, position: "PG" },
          { name: "Jimmy Butler", team: "MIA", salary: 48800000, per: 14.0, position: "SF" },
          { name: "Draymond Green", team: "GSW", salary: 24266667, per: 9.0, position: "PF" },
          { name: "Andrew Wiggins", team: "GSW", salary: 28220000, per: 10.0, position: "SF" },
        ],
        teamsNeedingRebuild: ["CHI", "WAS", "POR"],
        contenders: ["BOS", "OKC", "CLE", "DEN"],
      },
    },
    output: `🎲 假如交易 — 字母哥去勇士？

如果 Giannis 要求离开密尔沃基，勇士能给出什么筹码？字母哥 + Curry 的组合能统治西部吗？

AI 的方案：
  勇士送出：Andrew Wiggins（$28.2M，SF）+ Draymond Green（$24.3M，PF）+ 2028 首轮 + 2030 首轮
  雄鹿送出：Giannis Antetokounmpo（$54.3M，PF）
  规则校验：✅ 通过（勇士送出 $52.5M，帽下可接收 ×2+$250K = $105.3M）
  AI 评级：C+

💡 你的挑战：
  送走 Green 意味着失去防守核心，Wiggins 也只是添头。雄鹿肯定不满意这个报价。你能找到让雄鹿更满意、同时勇士不至于伤筋动骨的方案吗？试试引入第三方！`,
  },
  {
    input: {
      scenarioType: "daily_challenge" as const,
      difficulty: "hard" as const,
      constraints: {
        mustIncludeTeam: "BKN",
        maxTeamsInvolved: 3,
        mustPassRules: false,
      },
      availableData: {
        starPlayers: [
          { name: "Kevin Durant", team: "PHX", salary: 54708609, per: 15.0, position: "SF" },
          { name: "Cameron Johnson", team: "BKN", salary: 22500000, per: 11.0, position: "SF" },
          { name: "Devin Booker", team: "PHX", salary: 53143750, per: 16.0, position: "SG" },
          { name: "Bradley Beal", team: "PHX", salary: 53466667, per: 10.0, position: "SG" },
          { name: "Mikal Bridges", team: "NYK", salary: 23300000, per: 12.0, position: "SF" },
        ],
        teamsNeedingRebuild: ["BKN", "WAS", "CHA"],
        contenders: ["BOS", "OKC", "CLE"],
      },
    },
    output: `🎲 每日挑战 — KD 回布鲁克林？

篮网有 $121M 帽空间，理论上可以裸签任何球星。但 KD 的交易价值需要太阳满意。你能设计一个三方交易让 KD 回到布鲁克林吗？

AI 的方案：
  篮网送出：Cameron Johnson（$22.5M，SF）+ D'Angelo Russell（$5.7M，PG）+ 2027 首轮
  太阳送出：Kevin Durant（$54.7M，SF）
  尼克斯送出：Mikal Bridges（$23.3M，SF）+ 2029 首轮
  → 太阳得 Bridges + Johnson；篮网得 KD；尼克斯得 Russell + 2 首轮
  规则校验：❌ 不通过（太阳送出 $54.7M，接收 $45.8M，超税队上限 $68.5M，但篮网帽下接收 KD 没问题，问题在于太阳需要更多薪资回来）
  AI 评级：N/A

💡 你的挑战：
  这笔交易卡在太阳的薪资匹配上——他们需要接收更多薪资才能送出 KD。你能调整方案让规则通过吗？提示：太阳还有 Bradley Beal 的合同可以搭配...`,
  },
  {
    input: {
      scenarioType: "rebuild_challenge" as const,
      difficulty: "legendary" as const,
      constraints: {
        mustIncludeTeam: "CHI",
        maxTeamsInvolved: 3,
        mustPassRules: true,
      },
      availableData: {
        starPlayers: [
          { name: "Zach LaVine", team: "CHI", salary: 43030000, per: 14.0, position: "SG" },
          { name: "Nikola Vučević", team: "CHI", salary: 20000000, per: 12.0, position: "C" },
          { name: "Patrick Williams", team: "CHI", salary: 18000000, per: 9.0, position: "PF" },
          { name: "Coby White", team: "CHI", salary: 12000000, per: 11.0, position: "PG" },
        ],
        teamsNeedingRebuild: ["CHI", "WAS", "DET"],
        contenders: ["BOS", "OKC", "CLE", "DEN"],
      },
    },
    output: `🎲 重建挑战 — 公牛彻底推倒重来

公牛已经半死不活好几年了。LaVine 大合同、Vučević 老化、Williams 没打出来。你能设计一个方案让公牛在 1 笔交易中获得最大重建资产吗？

AI 的方案：
  公牛送出：Zach LaVine（$43.0M，SG）+ Nikola Vučević（$20.0M，C）
  掘金送出：Michael Porter Jr.（$38.3M，SF）+ Zeke Nnaji（$8.9M，PF）+ 2028 首轮 + 2029 首轮
  规则校验：✅ 通过（掘金超税队，送出 $47.2M，上限 $59.1M；公牛税下队，送出 $63.0M，上限 $78.9M）
  AI 评级：B-

💡 你的挑战：
  MPJ 的合同比 LaVine 还长，这不算是真正的重建。你能找到愿意吃下 LaVine 合同并给出首轮签的球队吗？提示：帽下队可以裸签...试试让篮网或活塞参与！`,
  },
];

export function buildScenarioGeneratorPrompt(input: ScenarioGeneratorInput): string {
  const typeInfo = SCENARIO_TYPE_MAP[input.scenarioType];
  const diffInfo = SCENARIO_DIFFICULTY_MAP[input.difficulty];

  const scenarioType = `${typeInfo.label}：${typeInfo.desc}`;
  const difficulty = `${diffInfo.label}：${diffInfo.desc}`;

  const constraints: string[] = [];
  if (input.constraints.mustIncludeTeam) constraints.push(`必须包含球队：${input.constraints.mustIncludeTeam}`);
  if (input.constraints.mustIncludePlayer) constraints.push(`必须包含球员：${input.constraints.mustIncludePlayer}`);
  constraints.push(`最多 ${input.constraints.maxTeamsInvolved} 方交易`);
  constraints.push(input.constraints.mustPassRules ? "AI 方案必须通过规则校验" : "AI 方案可以不通过规则（作为挑战）");

  const availableData = [
    `球星列表：${input.availableData.starPlayers.map((p) => `${p.name}(${p.team}, $${formatSalary(p.salary)}, PER ${p.per}, ${p.position})`).join("、")}`,
    `重建中球队：${input.availableData.teamsNeedingRebuild.join("、")}`,
    `争冠球队：${input.availableData.contenders.join("、")}`,
  ].join("\n");

  return SCENARIO_GENERATOR_USER
    .replace("{{scenarioType}}", scenarioType)
    .replace("{{difficulty}}", difficulty)
    .replace("{{constraints}}", constraints.join("；"))
    .replace("{{availableData}}", availableData);
}

function formatSalary(amount: number): string {
  if (amount === 0) return "0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs}`;
}
