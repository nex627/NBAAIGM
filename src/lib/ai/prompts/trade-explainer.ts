export interface TradeMove {
  player: {
    id: string;
    name: string;
    salary: number;
    per: number;
    yearsRemaining: number;
    restricted: boolean;
    restrictionType?: string;
  };
  from: string;
  to: string;
}

export interface TeamInfo {
  id: string;
  name: string;
  shortName: string;
  overTaxLine: number;
  capRoom: number;
  players: TradeMove["player"][];
}

export interface RuleResult {
  name: string;
  passed: boolean;
  level: "pass" | "fail" | "warn";
  desc: string;
}

export interface TradeExplainerInput {
  teams: TeamInfo[];
  moves: TradeMove[];
  ruleResults: RuleResult[];
  allPassed: boolean;
  hasWarning: boolean;
}

export const TRADE_EXPLAINER_SYSTEM = `你是一位 NBA 交易规则解读专家，专门帮助中国球迷理解 NBA 交易中的规则细节。

⚠️ 数据真实性原则：
- 本系统是真实交易模拟器，所有球员数据来自爬虫系统实时获取的真实数据
- 不要编造球员交易去向或阵容变化

你的职责：
1. 将规则引擎的校验结果翻译成球迷能懂的白话
2. 解释每条规则通过/不通过的具体原因
3. 指出交易中的潜在风险和注意事项
4. 绝不替代规则引擎做判断，规则引擎的结果是权威的

输出要求：
- 使用中文
- 语言简洁直白，像跟朋友聊天一样
- 先说结论（通过/不通过），再解释原因
- 如果有不通过的规则，用最直白的话说清楚卡在哪里
- 如果有警告（⚠），要提醒用户注意后续影响
- 薪资数字用百万美元简写（如 $52.6M）
- 不要使用"根据 CBA 第 X 条"这种法律术语，用白话解释
- 不要输出 Markdown 格式，纯文本即可
- 控制在 200 字以内`;

export const TRADE_EXPLAINER_USER = `请解读以下 NBA 交易规则校验结果：

## 交易概况
{{tradeSummary}}

## 规则校验结果
{{ruleResults}}

## 各队薪资详情
{{teamSalaryDetails}}

请用白话解读这笔交易的规则校验结果。`;

export const TRADE_EXPLAINER_EXAMPLES = [
  {
    input: {
      teams: [
        { id: "lal", name: "洛杉矶湖人", shortName: "湖人", overTaxLine: 5738075, capRoom: -38976075 },
        { id: "gsw", name: "金州勇士", shortName: "勇士", overTaxLine: 21008738, capRoom: -54246738 },
      ],
      moves: [
        { player: { name: "LeBron James", salary: 52627153, per: 15.0, restricted: true, restrictionType: "ntc" }, from: "lal", to: "gsw" },
        { player: { name: "Stephen Curry", salary: 59606817, per: 17.0, restricted: true, restrictionType: "ntc" }, from: "gsw", to: "lal" },
      ],
      ruleResults: [
        { name: "湖人·薪资匹配", passed: true, level: "pass", desc: "送出 $52,627,153 → 获得 $59,606,817 | 可接收上限 $65,883,941（税队 ×1.25+$100K）" },
        { name: "勇士·薪资匹配", passed: true, level: "pass", desc: "送出 $59,606,817 → 获得 $52,627,153 | 可接收上限 $74,758,521（税队 ×1.25+$100K）" },
        { name: "湖人·阵容人数", passed: true, level: "pass", desc: "15人 → 14人（✅ 常规赛季上限15人）" },
        { name: "勇士·阵容人数", passed: true, level: "pass", desc: "15人 → 14人（✅ 常规赛季上限15人）" },
      ],
      allPassed: true,
      hasWarning: false,
    },
    output: `这笔交易规则上全部通过。

薪资方面，两队都是超税队，按 ×1.25+$100K 的标准匹配。湖人送出 LeBron（$52.6M）换回 Curry（$59.6M），在 $65.9M 的上限内，轻松过关。勇士那边空间更充裕，上限 $74.8M。

阵容方面，两队都从 15 人变成 14 人，各腾出一个名额可以后续补强。

不过要注意：LeBron 和 Curry 都有无交易条款（NTC），现实中他们可以否决这笔交易。规则引擎只看薪资和人数，但 NTC 是球员的权利。`,
  },
  {
    input: {
      teams: [
        { id: "lal", name: "洛杉矶湖人", shortName: "湖人", overTaxLine: 5738075, capRoom: -38976075 },
        { id: "det", name: "底特律活塞", shortName: "活塞", overTaxLine: 0, capRoom: -21552327 },
      ],
      moves: [
        { player: { name: "Rui Hachimura", salary: 18259259, per: 9.0, restricted: false }, from: "lal", to: "det" },
        { player: { name: "Cade Cunningham", salary: 46394100, per: 17.0, restricted: true, restrictionType: "ntc" }, from: "det", to: "lal" },
      ],
      ruleResults: [
        { name: "湖人·薪资匹配", passed: false, level: "fail", desc: "送出 $18,259,259 → 获得 $46,394,100 | 可接收上限 $22,924,073（税队 ×1.25+$100K）| 超出 $23,470,027" },
        { name: "活塞·薪资匹配", passed: true, level: "pass", desc: "送出 $46,394,100 → 获得 $18,259,259 | 帽下队，接收薪资在空间内" },
        { name: "湖人·阵容人数", passed: true, level: "pass", desc: "15人 → 14人（✅ 常规赛季上限15人）" },
        { name: "活塞·阵容人数", passed: true, level: "pass", desc: "10人 → 9人（✅ 常规赛季上限15人）" },
      ],
      allPassed: false,
      hasWarning: false,
    },
    output: `❌ 这笔交易不通过，卡在湖人的薪资匹配上。

湖人送出八村塁（$18.3M），想换回 Cunningham（$46.4M）。但湖人是超税队，按规则最多只能接收送出薪资的 1.25 倍 + $100K，也就是 $22.9M。Cunningham 的 $46.4M 远超上限，差了 $23.5M，根本塞不进去。

要让这笔交易通过，湖人需要多送出大约 $23.5M 的薪资来匹配。比如再搭上 Austin Reaves（$13.9M）和 Maxi Kleber（$11M）才勉强够。

另外 Cunningham 有 NTC（无交易条款），他可以否决被交易到湖人。`,
  },
  {
    input: {
      teams: [
        { id: "bos", name: "波士顿凯尔特人", shortName: "凯尔特人", overTaxLine: 6445903, capRoom: -39683903 },
        { id: "brk", name: "布鲁克林篮网", shortName: "篮网", overTaxLine: 0, capRoom: 120972000 },
      ],
      moves: [
        { player: { name: "Jayson Tatum", salary: 54126450, per: 17.0, restricted: true, restrictionType: "ntc" }, from: "bos", to: "brk" },
        { player: { name: "D'Angelo Russell", salary: 5685000, per: 10.0, restricted: false }, from: "brk", to: "bos" },
      ],
      ruleResults: [
        { name: "凯尔特人·薪资匹配", passed: false, level: "fail", desc: "送出 $54,126,450 → 获得 $5,685,000 | 可接收上限 $67,663,062（税队 ×1.25+$100K）| 薪资匹配本身通过，但凯尔特人将产生 $48.4M TPE" },
        { name: "篮网·薪资匹配", passed: true, level: "pass", desc: "送出 $5,685,000 → 获得 $54,126,450 | 帽下队，有 $120.9M 空间，接收 Tatum 薪资无压力" },
        { name: "凯尔特人·阵容人数", passed: true, level: "warn", desc: "10人 → 9人（⚠ 低于最低 14 人要求，需在赛季中补满）" },
        { name: "篮网·阵容人数", passed: true, level: "pass", desc: "1人 → 2人（✅ 常规赛季上限15人）" },
      ],
      allPassed: true,
      hasWarning: true,
    },
    output: `⚠️ 这笔交易规则上勉强通过，但有几个大问题需要注意。

薪资匹配方面，凯尔特人送出 Tatum（$54.1M）只换回 Russell（$5.7M），虽然薪资匹配规则本身没问题（超税队上限 $67.7M），但凯尔特人将产生一个约 $48.4M 的交易特例（TPE）。篮网有 $120.9M 的帽下空间，接收 Tatum 完全没压力。

⚠️ 注意事项：
1. 凯尔特人阵容只剩 9 人，远低于最低 14 人要求，必须在赛季中补满
2. Tatum 有 NTC，他可以否决这笔交易
3. 凯尔特人送走当家球星，$48.4M 的 TPE 虽然很大，但 12 个月内用不掉就过期了

这笔交易在规则上可行，但现实中几乎不可能发生。`,
  },
];

export function buildTradeExplainerPrompt(input: TradeExplainerInput): string {
  const tradeSummary = buildTradeSummary(input);
  const ruleResults = buildRuleResultsText(input);
  const teamSalaryDetails = buildTeamSalaryDetails(input);

  return TRADE_EXPLAINER_USER
    .replace("{{tradeSummary}}", tradeSummary)
    .replace("{{ruleResults}}", ruleResults)
    .replace("{{teamSalaryDetails}}", teamSalaryDetails);
}

function buildTradeSummary(input: TradeExplainerInput): string {
  const lines: string[] = [];
  for (const team of input.teams) {
    const outgoing = input.moves.filter((m) => m.from === team.id);
    const incoming = input.moves.filter((m) => m.to === team.id);
    const outNames = outgoing.map((m) => `${m.player.name}($${formatSalary(m.player.salary)})`).join("、");
    const inNames = incoming.map((m) => `${m.player.name}($${formatSalary(m.player.salary)})`).join("、");
    lines.push(`${team.shortName}：送出 ${outNames || "无"}，接收 ${inNames || "无"}`);
  }
  const verdict = input.allPassed
    ? input.hasWarning
      ? "校验结果：⚠️ 通过（有注意事项）"
      : "校验结果：✅ 全部通过"
    : "校验结果：❌ 未通过";
  lines.push(verdict);
  return lines.join("\n");
}

function buildRuleResultsText(input: TradeExplainerInput): string {
  return input.ruleResults
    .map((r) => {
      const icon = r.level === "pass" ? "✅" : r.level === "warn" ? "⚠️" : "❌";
      return `${icon} ${r.name}：${r.desc}`;
    })
    .join("\n");
}

function buildTeamSalaryDetails(input: TradeExplainerInput): string {
  return input.teams
    .map((team) => {
      const outgoing = input.moves.filter((m) => m.from === team.id);
      const incoming = input.moves.filter((m) => m.to === team.id);
      const outTotal = outgoing.reduce((s, m) => s + m.player.salary, 0);
      const inTotal = incoming.reduce((s, m) => s + m.player.salary, 0);
      const taxLabel = team.overTaxLine > 0 ? "超税队" : team.capRoom >= 0 ? "帽下队" : "税下队";
      return `${team.shortName}（${taxLabel}）：超税线 $${formatSalary(team.overTaxLine)}，薪资空间 $${formatSalary(team.capRoom)}，送出 $${formatSalary(outTotal)}，接收 $${formatSalary(inTotal)}`;
    })
    .join("\n");
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
