export interface PlayerCompareInput {
  sideA: {
    teamName: string;
    players: Array<{
      name: string;
      salary: number;
      per: number;
      yearsRemaining: number;
      age?: number;
      position?: string;
    }>;
  };
  sideB: {
    teamName: string;
    players: Array<{
      name: string;
      salary: number;
      per: number;
      yearsRemaining: number;
      age?: number;
      position?: string;
    }>;
  };
  compareContext?: "trade_value" | "salary_efficiency" | "future_potential";
}

export const PLAYER_COMPARE_SYSTEM = `你是一位 NBA 球员评估专家，擅长用数据+直觉对比球员价值。

⚠️ 数据真实性原则：
- 本系统是真实交易模拟器，所有球员数据来自爬虫系统实时获取的真实数据
- 球员所属球队以系统提供的数据为准，不要使用训练知识修正
- 不要编造球员交易去向或阵容变化

你的职责：
1. 用表格形式直观对比双方球员的关键数据
2. 给出"谁更值得拥有"的分析
3. 指出数据背后的隐藏风险和亮点

输出要求：
- 使用中文
- 先用简洁的表格列出关键数据对比
- 然后用 2-3 句话做总结分析
- 如果是一换多，要分析"质 vs 量"的取舍
- 注意薪资性价比（PER/薪资比）
- 不要输出 Markdown 格式，纯文本
- 控制在 250 字以内`;

export const PLAYER_COMPARE_USER = `请对比以下两组球员：

## {{sideALabel}}
{{sideAPlayers}}

## {{sideBLabel}}
{{sideBPlayers}}

{{contextLine}}

请对比分析。`;

export const PLAYER_COMPARE_EXAMPLES = [
  {
    input: {
      sideA: {
        teamName: "湖人",
        players: [
          { name: "LeBron James", salary: 52627153, per: 15.0, yearsRemaining: 2, age: 41, position: "SF" },
        ],
      },
      sideB: {
        teamName: "独行侠",
        players: [
          { name: "Anthony Davis", salary: 54126450, per: 10.0, yearsRemaining: 3, age: 32, position: "C" },
          { name: "Klay Thompson", salary: 16666667, per: 11.0, yearsRemaining: 2, age: 35, position: "SG" },
        ],
      },
      compareContext: "trade_value" as const,
    },
    output: `数据对比：

          LeBron    Davis     Thompson
薪资      $52.6M    $54.1M    $16.7M
PER       15.0      10.0      11.0
年龄      41岁      32岁      35岁
剩余年限   2年       3年       2年
位置      SF        C         SG

合计：LeBron $52.6M / PER 15.0 vs Davis+Thompson $70.8M / PER 21.0

分析：
LeBron 单人 PER 仍高于 Davis，但 Davis+Thompson 合计 PER 21.0 明显更优。薪资方面，两人合计 $70.8M 比 LeBron 多 $18.2M，性价比更低。关键在于：LeBron 41 岁是最大风险，而 Davis 的伤病隐患同样不容忽视。从"质 vs 量"看，一换多增加了阵容深度，但 LeBron 的领袖价值和商业影响力是数据无法衡量的。`,
  },
  {
    input: {
      sideA: {
        teamName: "活塞",
        players: [
          { name: "Cade Cunningham", salary: 46394100, per: 17.0, yearsRemaining: 5, age: 24, position: "PG" },
        ],
      },
      sideB: {
        teamName: "老鹰",
        players: [
          { name: "Trae Young", salary: 46394100, per: 15.0, yearsRemaining: 2, age: 27, position: "PG" },
          { name: "Onyeka Okongwu", salary: 15000000, per: 13.0, yearsRemaining: 2, age: 24, position: "C" },
        ],
      },
      compareContext: "future_potential" as const,
    },
    output: `数据对比：

          Cunningham  Young     Okongwu
薪资      $46.4M      $46.4M    $15.0M
PER       17.0        15.0      13.0
年龄      24岁        27岁      24岁
剩余年限   5年         2年       2年
位置      PG          PG        C

合计：Cunningham $46.4M / 5年 vs Young+Okongwu $61.4M / 各2年

分析：
从未来潜力看，Cunningham 24 岁 + 5 年合同是压倒性优势。Young 虽然进攻火力强，但 2 年合同意味着随时可能离开。Okongwu 是不错的年轻内线，但还没证明自己能当二当家。Cunningham 的合同安全感和成长空间，是这笔对比中最大的砝码。`,
  },
  {
    input: {
      sideA: {
        teamName: "勇士",
        players: [
          { name: "Stephen Curry", salary: 59606817, per: 17.0, yearsRemaining: 2, age: 38, position: "PG" },
        ],
      },
      sideB: {
        teamName: "火箭",
        players: [
          { name: "Kevin Durant", salary: 54708609, per: 15.0, yearsRemaining: 2, age: 37, position: "SF" },
        ],
      },
      compareContext: "salary_efficiency" as const,
    },
    output: `数据对比：

          Curry       Durant
薪资      $59.6M      $54.7M
PER       17.0        15.0
年龄      38岁        37岁
剩余年限   2年         2年
位置      PG          SF

PER/薪资比：Curry 0.285/M vs Durant 0.274/M

分析：
两人年龄和合同年限几乎一样，Curry 薪资略高但 PER 也更高，性价比微优。不过差距很小，基本是同一档。真正的区别在于球风：Curry 是体系核心，换队后可能打折扣；Durant 是即插即用的得分手，适配性更强。如果纯看薪资效率，Curry 略胜；如果看交易后的即战力保障，Durant 更稳。`,
  },
];

export function buildPlayerComparePrompt(input: PlayerCompareInput): string {
  const sideALabel = input.sideA.teamName;
  const sideAPlayers = input.sideA.players
    .map((p) => `${p.name}：薪资 $${formatSalary(p.salary)}，PER ${p.per}，${p.yearsRemaining}年合同${p.age ? `，${p.age}岁` : ""}，${p.position || "未知位置"}`)
    .join("\n");

  const sideBLabel = input.sideB.teamName;
  const sideBPlayers = input.sideB.players
    .map((p) => `${p.name}：薪资 $${formatSalary(p.salary)}，PER ${p.per}，${p.yearsRemaining}年合同${p.age ? `，${p.age}岁` : ""}，${p.position || "未知位置"}`)
    .join("\n");

  const contextMap: Record<string, string> = {
    trade_value: "对比角度：交易价值（谁更值得用交易获取）",
    salary_efficiency: "对比角度：薪资性价比（谁的 PER/薪资比更优）",
    future_potential: "对比角度：未来潜力（谁的成长空间更大）",
  };
  const contextLine = input.compareContext ? contextMap[input.compareContext] : "";

  return PLAYER_COMPARE_USER
    .replace("{{sideALabel}}", sideALabel)
    .replace("{{sideAPlayers}}", sideAPlayers)
    .replace("{{sideBLabel}}", sideBLabel)
    .replace("{{sideBPlayers}}", sideBPlayers)
    .replace("{{contextLine}}", contextLine);
}

function formatSalary(amount: number): string {
  if (amount === 0) return "0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
  return `${sign}${abs}`;
}
