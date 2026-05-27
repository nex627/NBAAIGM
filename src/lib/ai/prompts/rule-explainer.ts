export type RuleCategory =
  | "salary_match"
  | "apron"
  | "tpe"
  | "roster"
  | "draft_pick"
  | "trade_kicker"
  | "poison_pill"
  | "no_trade_clause"
  | "cash_in_trade"
  | "sign_and_trade"
  | "bird_rights"
  | "minimum_exception"
  | "new_player_restriction";

export interface RuleExplainerInput {
  ruleCategory: RuleCategory;
  ruleName: string;
  ruleResult?: {
    passed: boolean;
    level: "pass" | "fail" | "warn";
    desc: string;
  };
  tradeContext?: {
    teamName: string;
    teamTaxStatus: string;
    outgoingSalary: number;
    incomingSalary: number;
    salaryCap: number;
  };
  ruleData?: Record<string, unknown>;
}

export const RULE_CATEGORY_MAP: Record<RuleCategory, { label: string; keywords: string[] }> = {
  salary_match: {
    label: "薪资匹配",
    keywords: ["薪资匹配", "salary match", "traded player exception", "incoming salary", "outgoing salary"],
  },
  apron: {
    label: "土豪线/硬帽",
    keywords: ["apron", "土豪线", "硬帽", "first apron", "second apron", "hard cap"],
  },
  tpe: {
    label: "交易特例",
    keywords: ["tpe", "trade player exception", "交易特例", "aggregated", "expanded", "standard tpe"],
  },
  roster: {
    label: "阵容人数",
    keywords: ["roster", "阵容", "15人", "20人", "双向合同"],
  },
  draft_pick: {
    label: "选秀权规则",
    keywords: ["draft pick", "选秀权", "stepien", "连续首轮", "保护条件"],
  },
  trade_kicker: {
    label: "交易保证金",
    keywords: ["trade kicker", "trade bonus", "交易保证金", "交易奖金"],
  },
  poison_pill: {
    label: "毒丸条款",
    keywords: ["poison pill", "毒丸", "rookie scale extension", "新秀续约"],
  },
  no_trade_clause: {
    label: "无交易条款",
    keywords: ["no trade clause", "ntc", "无交易条款", "否决权", "veto"],
  },
  cash_in_trade: {
    label: "现金交易",
    keywords: ["cash", "现金", "cash in trade", "cash consideration"],
  },
  sign_and_trade: {
    label: "先签后换",
    keywords: ["sign and trade", "先签后换", "sign-and-trade"],
  },
  bird_rights: {
    label: "伯德条款",
    keywords: ["bird rights", "伯德", "early bird", "non-bird", "鸟权"],
  },
  minimum_exception: {
    label: "底薪特例",
    keywords: ["minimum exception", "底薪", "minimum salary", "底薪特例"],
  },
  new_player_restriction: {
    label: "新签球员交易限制",
    keywords: ["12月15日", "3个月", "newly signed", "交易限制日期", "trade eligible"],
  },
};

export const RULE_EXPLAINER_SYSTEM = `你是一位 NBA 规则科普专家，专门用最通俗的中文给球迷解释 CBA（劳资协议）规则。

⚠️ 数据真实性原则：
- 本系统是真实交易模拟器，所有球员数据来自爬虫系统实时获取的真实数据
- 不要编造球员交易去向或阵容变化

你的职责：
1. 把 CBA 法律条文翻译成球迷秒懂的白话
2. 如果用户正在模拟交易，结合他的交易场景举例说明
3. 用类比和比喻让规则更直观
4. 偶尔用生活化的例子帮助理解

输出要求：
- 使用中文
- 先用一句话概括规则核心，再展开解释
- 薪资数字用百万美元简写（如 $52.6M）
- 如果有交易上下文，用"你这笔交易"来举例
- 不要引用 CBA 条款编号，球迷不需要知道
- 不要输出 Markdown 格式，纯文本即可
- 控制在 300 字以内
- 结尾可以加一句趣味点评（可选）`;

export const RULE_EXPLAINER_USER = `请解释以下 NBA 交易规则：

## 规则名称
{{ruleName}}

## 规则详细数据
{{ruleData}}

{{tradeContextSection}}

请用白话解释这条规则。`;

export const RULE_EXPLAINER_EXAMPLES = [
  {
    input: {
      ruleCategory: "salary_match" as RuleCategory,
      ruleName: "薪资匹配规则",
      tradeContext: {
        teamName: "湖人",
        teamTaxStatus: "超税队",
        outgoingSalary: 52627153,
        incomingSalary: 59606817,
        salaryCap: 165000000,
      },
      ruleData: {
        tiers: [
          { status: "帽下队", formula: "送出薪资 ×2 + $250K", example: "送出 $10M → 最多接收 $20.25M" },
          { status: "税下队", formula: "送出薪资 ×1.25 + $250K", example: "送出 $10M → 最多接收 $12.75M" },
          { status: "超税队", formula: "送出薪资 ×1.25 + $100K", example: "送出 $10M → 最多接收 $12.6M" },
          { status: "第二土豪线", formula: "送出薪资 ×1.0（等额交换）", example: "送出 $10M → 最多接收 $10M" },
        ],
      },
    },
    output: `简单说：NBA 不允许"空手套白狼"，你送出多少薪资，就只能接收差不多等额的薪资回来。

具体分四档：
- 帽下队（有薪资空间的）：最宽松，送出 ×2，比如送出 $10M 可以换回 $20.25M
- 税下队（超帽但没超税线）：送出 ×1.25，比如送出 $10M 可以换回 $12.75M
- 超税队：也是 ×1.25 但缓冲更小，送出 $10M 只能换回 $12.6M
- 第二土豪线队：最严格，1:1 等额交换，一分钱都不能多

你这笔交易里，湖人是超税队，送出 $52.6M，最多能接收 $65.9M。换回的 $59.6M 在范围内，所以通过了。

打个比方：就像换东西，你不能拿一个苹果换一辆车，得价值差不多才行。`,
  },
  {
    input: {
      ruleCategory: "apron" as RuleCategory,
      ruleName: "第二土豪线限制",
      ruleData: {
        secondApronAmount: 222000000,
        restrictions: [
          "不能用聚合特例（Aggregated TPE）",
          "不能在交易中送出现金",
          "不能用先签后换产生的 TPE",
          "不能用纳税人中产（TMLE）",
          "不能聚合多名球员薪资来匹配",
          "不能签买断市场球员（薪资 > NTMLE）",
          "不能通过先签后换获得球员",
        ],
        penalties: [
          "连续 2 年超第二土豪线 → 首轮签被冻结",
          "7 年内超第二土豪线 → 首轮签滑到首轮末尾",
        ],
      },
    },
    output: `第二土豪线就是 NBA 给土豪球队画的"最后红线"（2026-27 赛季是 $222M）。超过这条线，不只是多交税那么简单，而是直接被"封印"一堆权限：

不能做的事：
- 不能把几个低薪球员打包换一个高薪的（禁止薪资聚合）
- 不能送现金给对方贴补交易
- 不能签被其他队买断的球员（除非薪资很低）
- 不能用纳税人中产特例补人
- 不能通过先签后换获得球员

更狠的是惩罚：连续 2 年超线，首轮选秀权直接被冻结！7 年内超线，选秀权滑到首轮最后。

一句话总结：超第二土豪线 = 花钱最多 + 权限最少 + 选秀权危险。这就是为什么很多球队拼命避税。`,
  },
  {
    input: {
      ruleCategory: "tpe" as RuleCategory,
      ruleName: "交易特例（TPE）",
      tradeContext: {
        teamName: "凯尔特人",
        teamTaxStatus: "超税队",
        outgoingSalary: 54126450,
        incomingSalary: 5685000,
        salaryCap: 165000000,
      },
      ruleData: {
        types: [
          { name: "标准 TPE", desc: "非同时交易产生，12 个月内可用，金额 = 送出球员薪资 + $250K" },
          { name: "聚合 TPE", desc: "同时交易中多名球员打包送出时产生，金额 = 总送出薪资 + $250K" },
          { name: "扩展 TPE", desc: "按送出薪资分档：<$7.25M 按 ×2，$7.25M-$29M 按 +$8.5M，>$29M 按 ×1.25" },
          { name: "空间 TPE", desc: "帽下队可用，金额 = 超帽 $250K" },
        ],
      },
    },
    output: `TPE（交易特例）就像一张"代金券"：你送出球员没换回等额薪资时，差额变成一张券，以后可以用来"免费"接收球员。

你这笔交易就是典型场景：凯尔特人送出 Tatum（$54.1M）只换回 Russell（$5.7M），差额约 $48.4M 就变成了 TPE。凯尔特人未来 12 个月内可以用这张"券"接收一个 $48.4M 以内的球员，不需要再送人出去。

TPE 有几种：
- 标准 TPE：一对一交易产生，12 个月有效
- 聚合 TPE：多人打包送出时产生，只能当次用
- 扩展 TPE：按薪资分档，低薪翻倍，高薪 ×1.25
- 空间 TPE：帽下队专用，金额很小

注意：超第二土豪线的球队不能用聚合 TPE，TPE 也不能组合使用。`,
  },
  {
    input: {
      ruleCategory: "draft_pick" as RuleCategory,
      ruleName: "Stepien Rule（选秀权连续性规则）",
      ruleData: {
        rule: "球队不能连续两年没有首轮选秀权",
        details: [
          "首轮签最多只能交易到未来第 7 年",
          "不能出现连续两年没有首轮签的可能",
          "可以用其他队的首轮签来满足连续性",
          "选秀权可以加保护条件",
          "同一时间最多 2 个有条件转让的首轮签",
        ],
      },
    },
    output: `Stepien Rule 翻译成人话：你不能连续两年没有首轮签。

为什么叫 Stepien？因为 80 年代骑士老板 Ted Stepien 疯狂交易首轮签，导致球队连年没有选秀权，烂到不行。NBA 为了防止这种自杀式操作，立了这条规则。

具体来说：
- 你可以交易 2028 年的首轮，但如果 2027 年的首轮也已经送出去了，就不行
- 除非你手里有其他队给你的首轮签，可以拿来"充数"
- 首轮签最多只能提前 7 年交易（不能把 2035 年的签现在就送走）
- 可以加保护条件（比如"前 5 顺位保护"）

一句话：首轮签是球队的未来，NBA 不让你一把梭哈。`,
  },
];

export function buildRuleExplainerPrompt(input: RuleExplainerInput): string {
  const ruleData = input.ruleData
    ? JSON.stringify(input.ruleData, null, 2)
    : "（无详细数据，请根据规则名称解释）";

  const tradeContextSection = input.tradeContext
    ? `## 当前交易上下文\n球队：${input.tradeContext.teamName}（${input.tradeContext.teamTaxStatus}）\n送出薪资：$${formatSalary(input.tradeContext.outgoingSalary)}\n接收薪资：$${formatSalary(input.tradeContext.incomingSalary)}\n工资帽：$${formatSalary(input.tradeContext.salaryCap)}`
    : "";

  const ruleResultSection = input.ruleResult
    ? `\n\n## 规则校验结果\n${input.ruleResult.passed ? "✅ 通过" : "❌ 未通过"}：${input.ruleResult.desc}`
    : "";

  return RULE_EXPLAINER_USER
    .replace("{{ruleName}}", input.ruleName)
    .replace("{{ruleData}}", ruleData)
    .replace("{{tradeContextSection}}", tradeContextSection + ruleResultSection);
}

function formatSalary(amount: number): string {
  if (amount === 0) return "0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)}K`;
  }
  return `${sign}${abs}`;
}
