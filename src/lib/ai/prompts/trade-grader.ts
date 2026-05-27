export interface TradeGraderInput {
  teams: Array<{
    name: string;
    shortName: string;
    taxStatus: string;
    totalPayroll: number;
    capSpace: number;
    outgoingPlayers: Array<{
      name: string;
      salary: number;
      per: number;
      yearsRemaining: number;
      age?: number;
      position?: string;
    }>;
    incomingPlayers: Array<{
      name: string;
      salary: number;
      per: number;
      yearsRemaining: number;
      age?: number;
      position?: string;
    }>;
    outgoingPicks: string[];
    incomingPicks: string[];
  }>;
  allPassed: boolean;
}

export const TRADE_GRADER_SYSTEM = `你是一位资深的 NBA 交易分析师，擅长评估交易对每支球队的利弊。

⚠️ 数据真实性原则：
- 本系统是真实交易模拟器，所有球员数据来自爬虫系统实时获取的真实数据
- 球员所属球队以系统提供的数据为准，不要使用训练知识修正
- 不要编造球员交易去向或阵容变化

你的职责：
1. 对每支参与交易的球队分别评级（A+ 到 F）
2. 给出综合评级（整体交易公平性）
3. 从四个维度分析每队得失

评级标准：
- A+/A：大赚，明显获利
- A-/B+：小赚，略有优势
- B/B-：公平，各取所需
- C+/C：小亏，略有劣势
- C-/D：大亏，明显吃亏
- F：灾难级交易

四个分析维度：
1. 战力变化（40%权重）：PER 变化、即战力增减、球星级别变化
2. 薪资灵活性（25%权重）：帽空间变化、税线位置变化、未来薪资负担
3. 未来资产（20%权重）：选秀权得失、年轻球员潜力、合同年限
4. 阵容适配（15%权重）：位置互补性、化学反应、球权分配

输出格式要求：
- 使用中文
- 每队先给总评，再分四个维度各一句话点评
- 最后给综合评级和一句话总结
- 薪资用百万美元简写（如 $52.6M）
- 不要输出 Markdown 格式，纯文本
- 控制在 400 字以内`;

export const TRADE_GRADER_USER = `请评估以下 NBA 交易：

## 交易详情
{{tradeDetails}}

## 规则校验
{{ruleVerdict}}

请对每支球队评级并分析。`;

export const TRADE_GRADER_EXAMPLES = [
  {
    input: {
      teams: [
        {
          name: "达拉斯独行侠", shortName: "独行侠", taxStatus: "超税队", totalPayroll: 173000000, capSpace: -8000000,
          outgoingPlayers: [
            { name: "Luka Dončić", salary: 45999660, per: 20.0, yearsRemaining: 2, age: 27, position: "PG" },
          ],
          incomingPlayers: [
            { name: "Anthony Davis", salary: 54126450, per: 10.0, yearsRemaining: 3, age: 32, position: "C" },
          ],
          outgoingPicks: [], incomingPicks: ["2029 1st"],
        },
        {
          name: "洛杉矶湖人", shortName: "湖人", taxStatus: "超税队", totalPayroll: 189700000, capSpace: -39000000,
          outgoingPlayers: [
            { name: "Anthony Davis", salary: 54126450, per: 10.0, yearsRemaining: 3, age: 32, position: "C" },
          ],
          incomingPlayers: [
            { name: "Luka Dončić", salary: 45999660, per: 20.0, yearsRemaining: 2, age: 27, position: "PG" },
          ],
          outgoingPicks: ["2029 1st"], incomingPicks: [],
        },
      ],
      allPassed: true,
    },
    output: `独行侠：D+
  战力：D  → 失去 MVP 级核心，Davis 虽强但出勤率堪忧
  薪资：C  → Davis 薪资更高，薪资压力增大
  未来：C  → 得到 2029 首轮，但失去 27 岁建队基石
  适配：C+ → Davis + Irving 组合上限高，但健康风险大

湖人：A
  战力：A  → 得到 27 岁 MVP 级控卫，未来 5 年核心确定
  薪资：B+ → Luka 薪资更低，省下 $8M+ 空间
  未来：A  → Luka 才 27 岁，比 Davis 年轻 5 岁，黄金期更长
  适配：A  → Luka + James 组合攻击力爆表，传球视野顶级

综合评级：C+（湖人明显获利，独行侠送走 27 岁巨星令人费解）`,
  },
  {
    input: {
      teams: [
        {
          name: "底特律活塞", shortName: "活塞", taxStatus: "税下队", totalPayroll: 132000000, capSpace: 33000000,
          outgoingPlayers: [
            { name: "Cade Cunningham", salary: 46394100, per: 17.0, yearsRemaining: 5, age: 24, position: "PG" },
          ],
          incomingPlayers: [
            { name: "Trae Young", salary: 46394100, per: 15.0, yearsRemaining: 2, age: 27, position: "PG" },
            { name: "Onyeka Okongwu", salary: 15000000, per: 13.0, yearsRemaining: 2, age: 24, position: "C" },
          ],
          outgoingPicks: [], incomingPicks: [],
        },
        {
          name: "亚特兰大老鹰", shortName: "老鹰", taxStatus: "超税队", totalPayroll: 195000000, capSpace: -64000000,
          outgoingPlayers: [
            { name: "Trae Young", salary: 46394100, per: 15.0, yearsRemaining: 2, age: 27, position: "PG" },
            { name: "Onyeka Okongwu", salary: 15000000, per: 13.0, yearsRemaining: 2, age: 24, position: "C" },
          ],
          incomingPlayers: [
            { name: "Cade Cunningham", salary: 46394100, per: 17.0, yearsRemaining: 5, age: 24, position: "PG" },
          ],
          outgoingPicks: [], incomingPicks: [],
        },
      ],
      allPassed: true,
    },
    output: `活塞：B-
  战力：C+ → Cunningham PER 更高，但换回两人增加了深度
  薪资：B  → 帽下队，薪资不是问题，Young+Okongwu 合同年限更短
  未来：C  → 失去 24 岁 5 年合同的核心，Young 只有 2 年合同
  适配：B  → Young + Okongwu 挡拆组合不错，但防守端堪忧

老鹰：A-
  战力：A  → Cunningham 比 Young 更全面，防守端升级明显
  薪资：B+ → 只出一人换一人，薪资结构更简洁，释放 Okongwu 的位置
  未来：A  → 24 岁 5 年合同，比 Young 的 2 年合同稳定得多
  适配：A  → Cunningham + Johnson 组合攻守兼备，上限更高

综合评级：B（老鹰小赚，活塞用年限换深度但风险较大）`,
  },
  {
    input: {
      teams: [
        {
          name: "布鲁克林篮网", shortName: "篮网", taxStatus: "帽下队", totalPayroll: 44000000, capSpace: 121000000,
          outgoingPlayers: [
            { name: "D'Angelo Russell", salary: 5685000, per: 10.0, yearsRemaining: 2, age: 29, position: "PG" },
          ],
          incomingPlayers: [
            { name: "Jayson Tatum", salary: 54126450, per: 17.0, yearsRemaining: 5, age: 27, position: "SF" },
          ],
          outgoingPicks: ["2027 1st", "2029 1st", "2031 1st"], incomingPicks: [],
        },
        {
          name: "波士顿凯尔特人", shortName: "凯尔特人", taxStatus: "超税队", totalPayroll: 236000000, capSpace: -71000000,
          outgoingPlayers: [
            { name: "Jayson Tatum", salary: 54126450, per: 17.0, yearsRemaining: 5, age: 27, position: "SF" },
          ],
          incomingPlayers: [
            { name: "D'Angelo Russell", salary: 5685000, per: 10.0, yearsRemaining: 2, age: 29, position: "PG" },
          ],
          outgoingPicks: [], incomingPicks: ["2027 1st", "2029 1st", "2031 1st"],
        },
      ],
      allPassed: true,
    },
    output: `篮网：A
  战力：A  → 得到当打之年的超级巨星，从鱼腩变季后赛球队
  薪资：A  → 帽下 $121M 空间，Tatum 的合同完全塞得下
  未来：B+ → 付出 3 个首轮，但 Tatum 5 年合同锁定了核心
  适配：A  → Tatum 作为建队基石，攻防两端都是核心

凯尔特人：F
  战力：F  → 失去 27 岁当家球星，换回 Russell 战力断崖下跌
  薪资：B  → 释放 $48M 空间，但这是被迫重建
  未来：C  → 3 个首轮有潜力，但送走 Tatum 等于推倒重来
  适配：D  → Russell 和 Brown 的后场组合防守灾难

综合评级：D（一方大赚一方血亏，现实中凯尔特人绝不会做这笔交易）`,
  },
];

export function buildTradeGraderPrompt(input: TradeGraderInput): string {
  const tradeDetails = input.teams
    .map((team) => {
      const outPlayers = team.outgoingPlayers
        .map((p) => `${p.name}($${formatSalary(p.salary)}, PER ${p.per}, ${p.yearsRemaining}年${p.age ? `, ${p.age}岁` : ""})`)
        .join("、");
      const inPlayers = team.incomingPlayers
        .map((p) => `${p.name}($${formatSalary(p.salary)}, PER ${p.per}, ${p.yearsRemaining}年${p.age ? `, ${p.age}岁` : ""})`)
        .join("、");
      const outPicks = team.outgoingPicks.length > 0 ? `送出选秀权：${team.outgoingPicks.join("、")}` : "";
      const inPicks = team.incomingPicks.length > 0 ? `获得选秀权：${team.incomingPicks.join("、")}` : "";

      return [
        `${team.shortName}（${team.taxStatus}，总薪资 $${formatSalary(team.totalPayroll)}，薪资空间 $${formatSalary(team.capSpace)}）`,
        `  送出：${outPlayers || "无"}`,
        `  接收：${inPlayers || "无"}`,
        outPicks ? `  ${outPicks}` : "",
        inPicks ? `  ${inPicks}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const ruleVerdict = input.allPassed ? "✅ 规则校验全部通过" : "❌ 规则校验未通过（仅供参考）";

  return TRADE_GRADER_USER
    .replace("{{tradeDetails}}", tradeDetails)
    .replace("{{ruleVerdict}}", ruleVerdict);
}

function formatSalary(amount: number): string {
  if (amount === 0) return "0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs}`;
}
