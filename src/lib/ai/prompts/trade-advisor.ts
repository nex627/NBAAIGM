export interface TradeAdvisorInput {
  team: {
    name: string;
    shortName: string;
    taxStatus: string;
    totalPayroll: number;
    capSpace: number;
    apronLevel: string;
    rosterCount: number;
    needs: string[];
    corePlayers: Array<{
      name: string;
      salary: number;
      per: number;
      yearsRemaining: number;
      age: number;
      position: string;
      untouchable: boolean;
    }>;
    tradablePlayers: Array<{
      name: string;
      salary: number;
      per: number;
      yearsRemaining: number;
      age: number;
      position: string;
    }>;
    availablePicks: string[];
  };
  potentialPartners: Array<{
    name: string;
    shortName: string;
    taxStatus: string;
    totalPayroll: number;
    capSpace: number;
    needs: string[];
    tradablePlayers: Array<{
      name: string;
      salary: number;
      per: number;
      yearsRemaining: number;
      age: number;
      position: string;
    }>;
  }>;
  salaryCapThresholds: {
    salaryCap: number;
    luxuryTaxLine: number;
    firstApron: number;
    secondApron: number;
  };
  teamProfiles?: string;
}

export const TRADE_ADVISOR_SYSTEM = `你是一位 NBA 交易策划师，擅长为球队找到切实可行的交易方案。

⚠️ 数据真实性原则：
- 本系统是真实交易模拟器，所有球员数据来自爬虫系统实时获取的真实数据
- 球员所属球队以系统提供的数据为准，不要使用训练知识修正
- 不要编造球员交易去向或阵容变化，不要假设球员已离队或要求交易

你的职责：
1. 基于球队现状和需求，推荐 3 个可行的交易方案
2. 每个方案必须满足 CBA 薪资匹配规则
3. 按可行性从高到低排序

薪资匹配规则（必须严格遵守）：
- 帽下队（capSpace > 0）：可接收送出薪资 ×2 + $250K
- 税下队（超帽但未超税线）：可接收送出薪资 ×1.25 + $250K
- 超税队（超税线但未超第二土豪线）：可接收送出薪资 ×1.25 + $100K
- 第二土豪线队：只能等额交换（1:1）

其他约束：
- 不可交易标记为 untouchable 的球员
- 交易后每队阵容人数不能超过 15 人
- 注意第二土豪线限制（不能使用聚合特例、不能签买断球员等）

球队档案使用指引（如果提供了球队档案）：
- 球队档案包含9个维度的深度信息：建队阶段、核心球员状态（含伤病风险和交易价值）、总经理决策风格、老板意愿、教练体系、薪资状况、选秀权状况、交易偏好与倾向、交易关系网络
- 核心球员状态中标注了📋当前状态、⚠️长期风险、💰交易价值，这些信息对评估交易可行性至关重要
- 特别关注球员的伤病风险和出勤率——高风险球员的交易价值会大幅降低
- 参考总经理决策风格和交易偏好——不同GM有不同的操作模式
- 利用交易关系网络——有良好交易关系的球队更容易达成交易
- 注意信息的时效性标注——更新频率为"高"的章节（如核心球员状态）信息可能已过时，需要结合常识判断
- 档案中的"不可交易"/"极低交易价值"球员不应出现在交易方案中

输出格式（每个方案）：
方案 N：[球队A简称] ↔ [球队B简称]
  送出：[球员名]（$薪资，PER，位置）
  换回：[球员名]（$薪资，PER，位置）
  薪资匹配：送出 $XM / 接收 $XM / 上限 $XM → ✅/❌
  评级：A+ ~ F
  理由：基于球队档案信息，说明为什么这笔交易对双方都有意义，包括建队方向匹配度、球员伤病风险评估、GM偏好契合度等

输出要求：
- 使用中文
- 3 个方案之间用空行分隔
- 薪资用百万美元简写（如 $52.6M）
- 如果找不到 3 个合规方案，就输出能找到的，并说明限制
- 不要输出 Markdown 格式，纯文本
- 控制在 800 字以内`;

export const TRADE_ADVISOR_USER = `请为以下球队推荐交易方案：

## 目标球队
{{targetTeam}}

## 潜在交易伙伴
{{potentialPartners}}

## 薪资帽阈值
{{salaryCapThresholds}}

{{teamProfilesSection}}

请推荐 3 个可行交易方案。`;

export const TRADE_ADVISOR_EXAMPLES = [
  {
    input: {
      team: {
        name: "洛杉矶湖人", shortName: "湖人", taxStatus: "超税队", totalPayroll: 189700000,
        capSpace: -39000000, apronLevel: "第一土豪线", rosterCount: 14,
        needs: ["3D锋线", "年轻内线", "投射"],
        corePlayers: [
          { name: "LeBron James", salary: 52627153, per: 15.0, yearsRemaining: 2, age: 41, position: "SF", untouchable: true },
          { name: "Luka Dončić", salary: 45999660, per: 20.0, yearsRemaining: 2, age: 27, position: "PG", untouchable: true },
        ],
        tradablePlayers: [
          { name: "Rui Hachimura", salary: 18225000, per: 11.0, yearsRemaining: 2, age: 27, position: "PF" },
          { name: "Austin Reaves", salary: 13937600, per: 12.0, yearsRemaining: 3, age: 26, position: "SG" },
          { name: "Dorian Finney-Smith", salary: 14904000, per: 9.0, yearsRemaining: 2, age: 32, position: "SF" },
          { name: "Gabe Vincent", salary: 11000000, per: 7.0, yearsRemaining: 2, age: 29, position: "PG" },
        ],
        availablePicks: ["2028 1st (own)", "2030 1st (own)"],
      },
      potentialPartners: [
        {
          name: "芝加哥公牛", shortName: "公牛", taxStatus: "税下队", totalPayroll: 155000000, capSpace: -5000000,
          needs: ["到期合同", "选秀权", "年轻球员"],
          tradablePlayers: [
            { name: "Zach LaVine", salary: 43030000, per: 14.0, yearsRemaining: 2, age: 30, position: "SG" },
            { name: "Nikola Vučević", salary: 20000000, per: 12.0, yearsRemaining: 1, age: 34, position: "C" },
            { name: "Patrick Williams", salary: 18000000, per: 9.0, yearsRemaining: 4, age: 23, position: "PF" },
          ],
        },
        {
          name: "布鲁克林篮网", shortName: "篮网", taxStatus: "帽下队", totalPayroll: 44000000, capSpace: 121000000,
          needs: ["到期合同", "选秀权"],
          tradablePlayers: [
            { name: "Cameron Johnson", salary: 22500000, per: 11.0, yearsRemaining: 3, age: 28, position: "SF" },
            { name: "Dorian Finney-Smith", salary: 14904000, per: 9.0, yearsRemaining: 2, age: 32, position: "PF" },
            { name: "Day'Ron Sharpe", salary: 3900000, per: 10.0, yearsRemaining: 2, age: 23, position: "C" },
          ],
        },
      ],
      salaryCapThresholds: { salaryCap: 154000000, luxuryTaxLine: 187000000, firstApron: 189000000, secondApron: 202000000 },
    },
    output: `方案 1：湖人 ↔ 篮网
  送出：Rui Hachimura（$18.2M，PER 11.0，PF）+ Gabe Vincent（$11.0M，PER 7.0，PG）
  换回：Cameron Johnson（$22.5M，PER 11.0，SF）+ Day'Ron Sharpe（$3.9M，PER 10.0，C）
  薪资匹配：送出 $29.2M / 接收 $26.4M / 上限 $36.6M（×1.25+$100K）→ ✅
  评级：B+
  理由：湖人得到 3D 锋线 Johnson 补强投射，Sharpe 提供年轻内线深度；篮网获得到期合同和选秀权空间

方案 2：湖人 ↔ 公牛
  送出：Rui Hachimura（$18.2M，PER 11.0，PF）+ 2028 首轮
  换回：Patrick Williams（$18.0M，PER 9.0，PF）
  薪资匹配：送出 $18.2M / 接收 $18.0M / 上限 $22.9M（×1.25+$100K）→ ✅
  评级：B-
  理由：Williams 才 23 岁 4 年合同，潜力股；公牛获得首轮签加速重建。风险是 Williams 尚未证明自己

方案 3：湖人 ↔ 公牛
  送出：Dorian Finney-Smith（$14.9M，PER 9.0，SF）+ Gabe Vincent（$11.0M，PER 7.0，PG）
  换回：Nikola Vučević（$20.0M，PER 12.0，C）
  薪资匹配：送出 $25.9M / 接收 $20.0M / 上限 $32.5M（×1.25+$100K）→ ✅
  评级：C+
  理由：Vučević 提供内线得分和篮板，但 34 岁到期合同，短期补强；公牛释放空间进入重建`,
  },
  {
    input: {
      team: {
        name: "底特律活塞", shortName: "活塞", taxStatus: "帽下队", totalPayroll: 132000000, capSpace: 22000000,
        apronLevel: "帽下", rosterCount: 13,
        needs: ["即战力球星", "投射", "经验"],
        corePlayers: [
          { name: "Cade Cunningham", salary: 46394100, per: 17.0, yearsRemaining: 5, age: 24, position: "PG", untouchable: true },
          { name: "Jalen Duren", salary: 6482640, per: 12.0, yearsRemaining: 2, age: 21, position: "C", untouchable: false },
        ],
        tradablePlayers: [
          { name: "Jalen Duren", salary: 6482640, per: 12.0, yearsRemaining: 2, age: 21, position: "C" },
          { name: "Isaiah Stewart", salary: 15000000, per: 10.0, yearsRemaining: 3, age: 23, position: "PF" },
          { name: "Ausar Thompson", salary: 8772600, per: 9.0, yearsRemaining: 2, age: 22, position: "SF" },
        ],
        availablePicks: ["2027 1st (own)", "2029 1st (own)", "2026 2nd (MIL)"],
      },
      potentialPartners: [
        {
          name: "迈阿密热火", shortName: "热火", taxStatus: "超税队", totalPayroll: 195000000, capSpace: -41000000,
          needs: ["年轻资产", "选秀权", "薪资空间"],
          tradablePlayers: [
            { name: "Jimmy Butler", salary: 48800000, per: 14.0, yearsRemaining: 1, age: 36, position: "SF" },
            { name: "Tyler Herro", salary: 32500000, per: 13.0, yearsRemaining: 3, age: 25, position: "SG" },
          ],
        },
      ],
      salaryCapThresholds: { salaryCap: 154000000, luxuryTaxLine: 187000000, firstApron: 189000000, secondApron: 202000000 },
    },
    output: `方案 1：活塞 ↔ 热火
  送出：Isaiah Stewart（$15.0M，PER 10.0，PF）+ Ausar Thompson（$8.8M，PER 9.0，SF）+ 2027 首轮
  换回：Tyler Herro（$32.5M，PER 13.0，SG）
  薪资匹配：送出 $23.8M / 接收 $32.5M / 上限 $47.9M（×2+$250K，帽下队）→ ✅
  评级：B
  理由：Herro 25 岁 3 年合同，提供投射和得分；热火获得年轻资产+首轮签加速重建

方案 2：活塞 ↔ 热火
  送出：Isaiah Stewart（$15.0M）+ Jalen Duren（$6.5M）+ 2027 首轮 + 2029 首轮
  换回：Jimmy Butler（$48.8M，PER 14.0，SF）
  薪资匹配：送出 $21.5M / 接收 $48.8M / 上限 $43.3M（×2+$250K）→ ✅
  评级：C-
  理由：Butler 只有 1 年合同且 36 岁，风险极高；但 Butler 的季后赛经验对年轻活塞有价值。不建议送出 2 个首轮

方案 3：活塞 ↔ 热火（三方交易建议）
  活塞空间充裕但可交易资产有限，建议引入第三方球队。如活塞吸收 Butler 到期合同，第三方提供年轻资产给热火，活塞获得第三方球员。但当前数据不足以生成具体三方方案，建议手动探索`,
  },
];

export function buildTradeAdvisorPrompt(input: TradeAdvisorInput): string {
  const targetTeam = [
    `${input.team.shortName}（${input.team.taxStatus}，总薪资 $${formatSalary(input.team.totalPayroll)}，空间 $${formatSalary(input.team.capSpace)}，${input.team.apronLevel}）`,
    `阵容人数：${input.team.rosterCount}/15`,
    `需求：${input.team.needs.join("、")}`,
    `核心球员（不可交易）：${input.team.corePlayers.map((p) => `${p.name}($${formatSalary(p.salary)}, PER ${p.per})`).join("、")}`,
    `可交易球员：${input.team.tradablePlayers.map((p) => `${p.name}($${formatSalary(p.salary)}, PER ${p.per}, ${p.position})`).join("、")}`,
    `可用选秀权：${input.team.availablePicks.join("、") || "无"}`,
  ].join("\n");

  const potentialPartners = input.potentialPartners
    .map(
      (p) =>
        `${p.shortName}（${p.taxStatus}，总薪资 $${formatSalary(p.totalPayroll)}，空间 $${formatSalary(p.capSpace)}）\n  需求：${p.needs.join("、")}\n  可交易球员：${p.tradablePlayers.map((pl) => `${pl.name}($${formatSalary(pl.salary)}, PER ${pl.per}, ${pl.position})`).join("、")}`
    )
    .join("\n\n");

  const thresholds = `薪资帽 $${formatSalary(input.salaryCapThresholds.salaryCap)} / 税线 $${formatSalary(input.salaryCapThresholds.luxuryTaxLine)} / 第一土豪线 $${formatSalary(input.salaryCapThresholds.firstApron)} / 第二土豪线 $${formatSalary(input.salaryCapThresholds.secondApron)}`;

  const teamProfilesSection = input.teamProfiles
    ? `## 球队深度档案（包含建队方向、球员伤病风险、GM偏好、交易关系等关键信息）\n${input.teamProfiles}`
    : "";

  return TRADE_ADVISOR_USER
    .replace("{{targetTeam}}", targetTeam)
    .replace("{{potentialPartners}}", potentialPartners)
    .replace("{{salaryCapThresholds}}", thresholds)
    .replace("{{teamProfilesSection}}", teamProfilesSection);
}

function formatSalary(amount: number): string {
  if (amount === 0) return "0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs}`;
}
