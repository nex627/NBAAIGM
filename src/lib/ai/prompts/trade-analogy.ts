export interface TradeAnalogyInput {
  currentTrade: {
    summary: string;
    starPlayerTraded: boolean;
    multiTeamDeal: boolean;
    picksExchanged: boolean;
    salaryDump: boolean;
    rebuildVsWinNow: "rebuild" | "win_now" | "mutual";
  };
  historicalTrades: HistoricalTrade[];
}

export interface HistoricalTrade {
  year: number;
  teams: string[];
  headline: string;
  starPlayer: string;
  outcome: string;
  verdict: string;
}

export const HISTORICAL_TRADES: HistoricalTrade[] = [
  {
    year: 2023,
    teams: ["PHX", "BKN"],
    headline: "Kevin Durant → 太阳，Mikal Bridges + 4首轮 → 篮网",
    starPlayer: "Kevin Durant",
    outcome: "Bridges 在篮网打出生涯年（场均 27 分），太阳得到 KD 但季后赛出局",
    verdict: "篮网大赚，太阳赌输了",
  },
  {
    year: 2022,
    teams: ["MIN", "UTA"],
    headline: "Rudy Gobert → 森林狼，4首轮 + 多名球员 → 爵士",
    starPlayer: "Rudy Gobert",
    outcome: "森林狼被嘲笑\"人傻钱多\"，但 2024 年打进西决证明了自己",
    verdict: "短期被嘲，长期回本",
  },
  {
    year: 2022,
    teams: ["ATL", "SAS"],
    headline: "Dejounte Murray → 老鹰，3首轮 → 马刺",
    starPlayer: "Dejounte Murray",
    outcome: "Murray 和 Young 后场组合化学反应不佳，老鹰战绩下滑",
    verdict: "老鹰亏了，马刺赚了选秀权",
  },
  {
    year: 2021,
    teams: ["LAL", "WAS"],
    headline: "Russell Westbrook → 湖人，Kuzma+Harrell+首轮 → 奇才",
    starPlayer: "Russell Westbrook",
    outcome: "Westbrook 和 James 完全不兼容，湖人赛季灾难，奇才 Kuzma 打出生涯最佳",
    verdict: "湖人灾难级交易",
  },
  {
    year: 2019,
    teams: ["LAC", "OKC"],
    headline: "Paul George → 快船，Shai Gilgeous-Alexander + 5首轮 → 雷霆",
    starPlayer: "Paul George",
    outcome: "SGA 成长为 MVP 候选人，雷霆囤积了大量选秀权，快船 PG+Kawhi 组合未能夺冠",
    verdict: "雷霆血赚，快船赌输了",
  },
  {
    year: 2019,
    teams: ["HOU", "OKC"],
    headline: "Russell Westbrook → 火箭，Chris Paul + 2首轮 → 雷霆",
    starPlayer: "Russell Westbrook",
    outcome: "CP3 带雷霆超预期打进季后赛，Harden+Westbrook 组合未能突破",
    verdict: "雷霆又赚了",
  },
  {
    year: 2018,
    teams: ["TOR", "SAS"],
    headline: "Kawhi Leonard → 猛龙，DeRozan + 首轮 → 马刺",
    starPlayer: "Kawhi Leonard",
    outcome: "Kawhi 带猛龙夺冠！DeRozan 在马刺稳定但未能突破",
    verdict: "猛龙大赚，队史首冠",
  },
  {
    year: 2018,
    teams: ["PHI", "MIN"],
    headline: "Jimmy Butler → 76人，Covington+Saric → 森林狼",
    starPlayer: "Jimmy Butler",
    outcome: "Butler 在 76 人只打了半个赛季就走了，但后来带热火两次进总决赛",
    verdict: "短期亏，长期看 Butler 证明了自己",
  },
  {
    year: 2017,
    teams: ["CLE", "BOS"],
    headline: "Kyrie Irving → 凯尔特人，Isaiah Thomas + 首轮 → 骑士",
    starPlayer: "Kyrie Irving",
    outcome: "IT 伤病报销，骑士亏；Kyrie 在绿军也不开心最终离队",
    verdict: "双输交易",
  },
  {
    year: 2013,
    teams: ["BKN", "BOS"],
    headline: "KG+Pierce → 篮网，3首轮 → 凯尔特人",
    starPlayer: "Kevin Garnett",
    outcome: "篮网老将阵容迅速瓦解，凯尔特人用选秀权选中 Brown 和 Tatum，重建成功",
    verdict: "史上最亏交易之一，篮网被钉在耻辱柱上",
  },
];

export const TRADE_ANALOGY_SYSTEM = `你是一位 NBA 历史交易专家，擅长从历史交易中找到类比，帮助球迷判断当前交易的合理性。

⚠️ 数据真实性原则：
- 本系统是真实交易模拟器，所有球员数据来自爬虫系统实时获取的真实数据
- 球员所属球队以系统提供的数据为准，不要使用训练知识修正
- 不要编造球员交易去向或阵容变化

你的职责：
1. 从提供的历史交易库中找到最相似的 1-2 笔交易
2. 对比相似点和不同点
3. 给出参考结论

类比维度：
- 是否涉及超级巨星
- 是一换多还是一换一
- 是否涉及选秀权
- 是重建换即战力还是反过来
- 薪资匹配模式

输出要求：
- 使用中文
- 先说最相似的历史交易，再说不同点
- 给出"参考结论"：从历史结果看，这类交易通常谁赚谁亏
- 不要输出 Markdown 格式，纯文本
- 控制在 300 字以内`;

export const TRADE_ANALOGY_USER = `请为以下交易找历史类比：

## 当前交易
{{currentTradeSummary}}

## 交易特征
{{tradeFeatures}}

## 历史交易库
{{historicalTrades}}

请找出最相似的历史交易并分析。`;

export const TRADE_ANALOGY_EXAMPLES = [
  {
    input: {
      currentTrade: {
        summary: "湖人送出 LeBron James（$52.6M）→ 独行侠，换回 Anthony Davis（$54.1M）+ Klay Thompson（$16.7M）+ 2029 首轮",
        starPlayerTraded: true,
        multiTeamDeal: false,
        picksExchanged: true,
        salaryDump: false,
        rebuildVsWinNow: "mutual" as const,
      },
      historicalTrades: HISTORICAL_TRADES,
    },
    output: `最相似的历史交易：2018 年 Kawhi Leonard → 猛龙

相似点：
- 都是超级巨星换队，对方付出即战力+选秀权
- 都涉及合同只剩 2 年的球星
- 接收方都是想冲冠的球队

不同点：
- Kawhi 当时 27 岁正值巅峰，LeBron 已经 41 岁
- 猛龙只送出了 DeRozan + 1 首轮，独行侠送出了 Davis+Thompson+首轮，代价更大
- Kawhi 是防守+进攻双核，LeBron 现在主要是组织核心

参考结论：巨星换队+选秀权的交易，历史来看接收方短期受益（猛龙夺冠），但长期看送出方如果选秀权选到人可能更赚（雷霆选到 SGA）。不过 LeBron 的年龄让这笔交易风险极高。`,
  },
  {
    input: {
      currentTrade: {
        summary: "篮网送出 D'Angelo Russell（$5.7M）+ 3 首轮 → 凯尔特人，换回 Jayson Tatum（$54.1M）",
        starPlayerTraded: true,
        multiTeamDeal: false,
        picksExchanged: true,
        salaryDump: false,
        rebuildVsWinNow: "win_now" as const,
      },
      historicalTrades: HISTORICAL_TRADES,
    },
    output: `最相似的历史交易：2013 年 KG+Pierce → 篮网

相似点：
- 都是送出大量未来资产（首轮签）换当打球星
- 接收方都是想快速崛起的球队
- 都涉及超级巨星的转会

不同点：
- 2013 年篮网换的是 37 岁 KG 和 36 岁 Pierce，Tatum 才 27 岁正值巅峰
- 篮网当年送了 3 首轮，这笔也是 3 首轮，但 Tatum 的价值远超当年的 KG+Pierce
- Tatum 有 5 年合同，比当年 KG 的 2 年更稳定

参考结论：历史上"用未来换现在"的交易，多数是送出方亏（2013 篮网、2021 湖人）。但 Tatum 27 岁 + 5 年合同是特例——如果他能带队进季后赛，这笔交易就是篮网版"猛龙换 Kawhi"。`,
  },
];

export function buildTradeAnalogyPrompt(input: TradeAnalogyInput): string {
  const features: string[] = [];
  if (input.currentTrade.starPlayerTraded) features.push("涉及超级巨星");
  if (input.currentTrade.multiTeamDeal) features.push("多方交易");
  if (input.currentTrade.picksExchanged) features.push("涉及选秀权");
  if (input.currentTrade.salaryDump) features.push("薪资甩卖");
  const rebuildMap: Record<string, string> = {
    rebuild: "重建方换即战力",
    win_now: "冲冠方换球星",
    mutual: "双方各取所需",
  };
  features.push(rebuildMap[input.currentTrade.rebuildVsWinNow]);

  const historicalTrades = input.historicalTrades
    .map(
      (t) =>
        `${t.year} ${t.headline} | 结果：${t.outcome} | 评价：${t.verdict}`
    )
    .join("\n");

  return TRADE_ANALOGY_USER
    .replace("{{currentTradeSummary}}", input.currentTrade.summary)
    .replace("{{tradeFeatures}}", features.join("、"))
    .replace("{{historicalTrades}}", historicalTrades);
}
