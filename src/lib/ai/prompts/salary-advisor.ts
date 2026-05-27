export interface SalaryAdvisorInput {
  team: {
    name: string;
    shortName: string;
    totalPayroll: number;
    capSpace: number;
    taxStatus: string;
    apronLevel: string;
    luxuryTaxBill: number;
    rosterCount: number;
    contracts: Array<{
      name: string;
      salary: number;
      per: number;
      yearsRemaining: number;
      age: number;
      position: string;
      contractType: "max" | "rookie_scale" | "veteran_min" | "mid_level" | "standard" | "expiring";
    }>;
  };
  thresholds: {
    salaryCap: number;
    minimumTeamSalary: number;
    luxuryTaxLine: number;
    firstApron: number;
    secondApron: number;
  };
}

export const SALARY_ADVISOR_SYSTEM = `你是一位 NBA 薪资帽专家，专门帮球队分析薪资结构和优化建议。

⚠️ 数据真实性原则：
- 本系统是真实交易模拟器，所有球员数据来自爬虫系统实时获取的真实数据
- 球员所属球队以系统提供的数据为准，不要使用训练知识修正
- 不要编造球员交易去向或阵容变化

你的职责：
1. 诊断球队当前薪资健康状况
2. 识别薪资结构中的风险和机会
3. 给出 3 条可操作的建议

薪资健康评级标准：
- 🟢 健康：帽下队或税下队，有操作空间
- 🟡 警告：超税线但未超土豪线，灵活性受限
- 🔴 危险：超第一/第二土豪线，严重受限

分析维度：
1. 薪资分布：顶薪占比、到期合同、垃圾合同
2. 税线位置：距各条线的距离、触发限制
3. 灵活性：可用特例、交易配平空间、未来空间
4. 风险点：第二土豪线惩罚、首轮签冻结、硬帽触发

输出格式：
当前状态：[健康评级] [一句话总结]
  总薪资 $XM / 薪资帽 $XM / 税线 $XM / 第一土豪线 $XM / 第二土豪线 $XM

⚠️ 风险提示：
  - [风险1]
  - [风险2]

💡 AI 建议：
  1. [建议1] → 预期效果
  2. [建议2] → 预期效果
  3. [建议3] → 预期效果

输出要求：
- 使用中文
- 薪资用百万美元简写（如 $52.6M）
- 建议必须具体到球员和操作，不要泛泛而谈
- 不要输出 Markdown 格式，纯文本
- 控制在 400 字以内`;

export const SALARY_ADVISOR_USER = `请分析以下球队的薪资结构：

## 球队信息
{{teamInfo}}

## 薪资帽阈值
{{thresholds}}

请给出薪资健康诊断和建议。`;

export const SALARY_ADVISOR_EXAMPLES = [
  {
    input: {
      team: {
        name: "洛杉矶湖人", shortName: "湖人", totalPayroll: 189700000, capSpace: -39000000,
        taxStatus: "超税队", apronLevel: "第一土豪线", luxuryTaxBill: 8500000, rosterCount: 14,
        contracts: [
          { name: "LeBron James", salary: 52627153, per: 15.0, yearsRemaining: 2, age: 41, position: "SF", contractType: "max" },
          { name: "Luka Dončić", salary: 45999660, per: 20.0, yearsRemaining: 2, age: 27, position: "PG", contractType: "max" },
          { name: "Austin Reaves", salary: 13937600, per: 12.0, yearsRemaining: 3, age: 26, position: "SG", contractType: "standard" },
          { name: "Rui Hachimura", salary: 18225000, per: 11.0, yearsRemaining: 2, age: 27, position: "PF", contractType: "standard" },
          { name: "Dorian Finney-Smith", salary: 14904000, per: 9.0, yearsRemaining: 2, age: 32, position: "SF", contractType: "standard" },
          { name: "Gabe Vincent", salary: 11000000, per: 7.0, yearsRemaining: 2, age: 29, position: "PG", contractType: "mid_level" },
          { name: "Maxi Kleber", salary: 11000000, per: 6.0, yearsRemaining: 2, age: 34, position: "PF", contractType: "standard" },
          { name: "Jarred Vanderbilt", salary: 11625000, per: 7.0, yearsRemaining: 3, age: 26, position: "PF", contractType: "standard" },
        ],
      },
      thresholds: { salaryCap: 154000000, minimumTeamSalary: 139000000, luxuryTaxLine: 187000000, firstApron: 189000000, secondApron: 202000000 },
    },
    output: `当前状态：🟡 警告 — 超第一土豪线，操作空间严重受限
  总薪资 $189.7M / 薪资帽 $154.0M / 税线 $187.0M / 第一土豪线 $189.0M / 第二土豪线 $202.0M

⚠️ 风险提示：
  - 已超第一土豪线 $0.7M，触发硬帽限制，不能使用聚合特例
  - 距第二土豪线仅 $12.3M，任何加薪操作都可能越线
  - 奢侈税预估 $8.5M，且连续超税将触发重复税
  - 两人占薪资 52%（LeBron $52.6M + Luka $46.0M），结构极度头重脚轻

💡 AI 建议：
  1. 交易 Maxi Kleber（$11.0M）→ 释放空间回到第一土豪线下，恢复聚合特例使用权
  2. 用底薪特例签自由球员补第 15 人 → 不影响薪资匹配，增加阵容深度
  3. 避免使用 NTMLE（非税中产）→ 会触发第一土豪线硬帽，锁死后续操作空间`,
  },
  {
    input: {
      team: {
        name: "底特律活塞", shortName: "活塞", totalPayroll: 132000000, capSpace: 22000000,
        taxStatus: "帽下队", apronLevel: "帽下", luxuryTaxBill: 0, rosterCount: 13,
        contracts: [
          { name: "Cade Cunningham", salary: 46394100, per: 17.0, yearsRemaining: 5, age: 24, position: "PG", contractType: "max" },
          { name: "Jalen Duren", salary: 6482640, per: 12.0, yearsRemaining: 2, age: 21, position: "C", contractType: "rookie_scale" },
          { name: "Isaiah Stewart", salary: 15000000, per: 10.0, yearsRemaining: 3, age: 23, position: "PF", contractType: "standard" },
          { name: "Ausar Thompson", salary: 8772600, per: 9.0, yearsRemaining: 2, age: 22, position: "SF", contractType: "rookie_scale" },
          { name: "Tobias Harris", salary: 25000000, per: 10.0, yearsRemaining: 2, age: 33, position: "PF", contractType: "standard" },
        ],
      },
      thresholds: { salaryCap: 154000000, minimumTeamSalary: 139000000, luxuryTaxLine: 187000000, firstApron: 189000000, secondApron: 202000000 },
    },
    output: `当前状态：🟢 健康 — 帽下队，操作空间充裕
  总薪资 $132.0M / 薪资帽 $154.0M / 税线 $187.0M / 第一土豪线 $189.0M / 第二土豪线 $202.0M

⚠️ 风险提示：
  - 总薪资低于最低薪资线 $139.0M，赛季末需补齐差额（差额分给现有球员）
  - Tobias Harris $25.0M PER 只有 10.0，性价比偏低
  - 阵容只有 13 人，需要补充 2 人达到最低要求

💡 AI 建议：
  1. 利用 $22.0M 帽空间直接签自由球员 → 不需要薪资匹配，可以裸签
  2. 吸收到期合同换选秀权 → 帽下队可以吃下其他队的垃圾合同，赚取首轮签
  3. 给 Jalen Duren 提前续约 → 新秀合同还剩 2 年，趁 PER 12.0 时锁定，避免涨价`,
  },
  {
    input: {
      team: {
        name: "波士顿凯尔特人", shortName: "凯尔特人", totalPayroll: 236000000, capSpace: -71000000,
        taxStatus: "超税队", apronLevel: "第二土豪线", luxuryTaxBill: 65000000, rosterCount: 15,
        contracts: [
          { name: "Jayson Tatum", salary: 54126450, per: 17.0, yearsRemaining: 5, age: 27, position: "SF", contractType: "max" },
          { name: "Jaylen Brown", salary: 52368217, per: 14.0, yearsRemaining: 4, age: 28, position: "SG", contractType: "max" },
          { name: "Derrick White", salary: 30714286, per: 13.0, yearsRemaining: 3, age: 31, position: "PG", contractType: "standard" },
          { name: "Jrue Holiday", salary: 32300000, per: 11.0, yearsRemaining: 3, age: 35, position: "PG", contractType: "standard" },
          { name: "Kristaps Porziņģis", salary: 30000000, per: 12.0, yearsRemaining: 1, age: 30, position: "C", contractType: "expiring" },
        ],
      },
      thresholds: { salaryCap: 154000000, minimumTeamSalary: 139000000, luxuryTaxLine: 187000000, firstApron: 189000000, secondApron: 202000000 },
    },
    output: `当前状态：🔴 危险 — 超第二土豪线，灵活性几乎为零
  总薪资 $236.0M / 薪资帽 $154.0M / 税线 $187.0M / 第一土豪线 $189.0M / 第二土豪线 $202.0M

⚠️ 风险提示：
  - 超第二土豪线 $34.0M，所有土豪线限制全部触发
  - 奢侈税预估 $65.0M，是全联盟最高
  - 不能使用任何特例（TPE、NTMLE、BAE 全部冻结）
  - 首轮签可能被冻结（7 年内第 2 次超第二土豪线将冻结首轮）
  - 不能在买断市场签人
  - 交易只能 1:1 等额交换

💡 AI 建议：
  1. 交易 Jrue Holiday（$32.3M）→ 35 岁合同偏长，换回更便宜的替代者释放空间
  2. 让 Porziņģis 到期走人 → $30.0M 到期合同是最大降薪机会，不要续约
  3. 考虑拆双探花 → Brown $52.4M 的合同在第二土豪线下是沉重负担，交易他能一次性回到税线下`,
  },
];

export function buildSalaryAdvisorPrompt(input: SalaryAdvisorInput): string {
  const teamInfo = [
    `${input.team.shortName}（${input.team.taxStatus}，${input.team.apronLevel}）`,
    `总薪资 $${formatSalary(input.team.totalPayroll)} / 薪资空间 $${formatSalary(input.team.capSpace)} / 奢侈税 $${formatSalary(input.team.luxuryTaxBill)}`,
    `阵容人数：${input.team.rosterCount}/15`,
    `合同列表：`,
    ...input.team.contracts.map(
      (c) =>
        `  ${c.name}：$${formatSalary(c.salary)}，PER ${c.per}，${c.yearsRemaining}年，${c.age}岁，${c.position}，${c.contractType}`
    ),
  ].join("\n");

  const thresholds = `薪资帽 $${formatSalary(input.thresholds.salaryCap)} / 最低薪资 $${formatSalary(input.thresholds.minimumTeamSalary)} / 税线 $${formatSalary(input.thresholds.luxuryTaxLine)} / 第一土豪线 $${formatSalary(input.thresholds.firstApron)} / 第二土豪线 $${formatSalary(input.thresholds.secondApron)}`;

  return SALARY_ADVISOR_USER
    .replace("{{teamInfo}}", teamInfo)
    .replace("{{thresholds}}", thresholds);
}

function formatSalary(amount: number): string {
  if (amount === 0) return "0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs}`;
}
