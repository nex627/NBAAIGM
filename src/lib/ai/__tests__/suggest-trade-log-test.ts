const localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]); },
  get length() { return Object.keys(localStorageStore).length; },
  key: (_index: number) => null,
};

(globalThis as Record<string, unknown>).localStorage = localStorageMock;

import { AIService } from "../index";
import type { SuggestTradeOptions } from "../index";

const MOCK_SALARY_CAP_THRESHOLDS = {
  salaryCap: 154_000_000,
  luxuryTaxLine: 187_950_000,
  firstApron: 189_070_000,
  secondApron: 202_070_000,
};

const MOCK_LAKERS: SuggestTradeOptions["team"] = {
  name: "洛杉矶湖人",
  shortName: "湖人",
  taxStatus: "超税队",
  totalPayroll: 189_700_000,
  capSpace: -39_000_000,
  apronLevel: "第一土豪线",
  rosterCount: 14,
  needs: ["3D锋线", "年轻内线", "投射"],
  corePlayers: [
    { name: "LeBron James", salary: 52_627_153, per: 15.0, yearsRemaining: 2, age: 41, position: "SF", untouchable: true },
    { name: "Luka Dončić", salary: 45_999_660, per: 20.0, yearsRemaining: 2, age: 27, position: "PG", untouchable: true },
  ],
  tradablePlayers: [
    { name: "Rui Hachimura", salary: 18_225_000, per: 11.0, yearsRemaining: 2, age: 27, position: "PF" },
    { name: "Austin Reaves", salary: 13_937_600, per: 12.0, yearsRemaining: 3, age: 26, position: "SG" },
    { name: "Dorian Finney-Smith", salary: 14_904_000, per: 9.0, yearsRemaining: 2, age: 32, position: "SF" },
    { name: "Gabe Vincent", salary: 11_000_000, per: 7.0, yearsRemaining: 2, age: 29, position: "PG" },
    { name: "Maxi Kleber", salary: 11_000_000, per: 6.0, yearsRemaining: 2, age: 34, position: "PF" },
    { name: "Jarred Vanderbilt", salary: 11_625_000, per: 7.0, yearsRemaining: 3, age: 26, position: "PF" },
  ],
  availablePicks: ["2028 1st (own)", "2030 1st (own)"],
};

const MOCK_BULLS: SuggestTradeOptions["potentialPartners"][number] = {
  name: "芝加哥公牛",
  shortName: "公牛",
  taxStatus: "税下队",
  totalPayroll: 155_000_000,
  capSpace: -5_000_000,
  needs: ["到期合同", "选秀权", "年轻球员"],
  tradablePlayers: [
    { name: "Zach LaVine", salary: 43_030_000, per: 14.0, yearsRemaining: 2, age: 30, position: "SG" },
    { name: "Nikola Vučević", salary: 20_000_000, per: 12.0, yearsRemaining: 1, age: 34, position: "C" },
    { name: "Patrick Williams", salary: 18_000_000, per: 9.0, yearsRemaining: 4, age: 23, position: "PF" },
    { name: "Coby White", salary: 12_000_000, per: 11.0, yearsRemaining: 2, age: 25, position: "PG" },
  ],
};

const MOCK_NETS: SuggestTradeOptions["potentialPartners"][number] = {
  name: "布鲁克林篮网",
  shortName: "篮网",
  taxStatus: "帽下队",
  totalPayroll: 44_000_000,
  capSpace: 110_000_000,
  needs: ["到期合同", "选秀权"],
  tradablePlayers: [
    { name: "Cameron Johnson", salary: 22_500_000, per: 11.0, yearsRemaining: 3, age: 28, position: "SF" },
    { name: "Dorian Finney-Smith", salary: 14_904_000, per: 9.0, yearsRemaining: 2, age: 32, position: "PF" },
    { name: "Day'Ron Sharpe", salary: 3_900_000, per: 10.0, yearsRemaining: 2, age: 23, position: "C" },
    { name: "Cameron Thomas", salary: 4_800_000, per: 13.0, yearsRemaining: 1, age: 23, position: "SG" },
  ],
};

const MOCK_PISTONS: SuggestTradeOptions["potentialPartners"][number] = {
  name: "底特律活塞",
  shortName: "活塞",
  taxStatus: "帽下队",
  totalPayroll: 132_000_000,
  capSpace: 22_000_000,
  needs: ["即战力球星", "经验老将"],
  tradablePlayers: [
    { name: "Jalen Duren", salary: 6_482_640, per: 12.0, yearsRemaining: 2, age: 21, position: "C" },
    { name: "Isaiah Stewart", salary: 15_000_000, per: 10.0, yearsRemaining: 3, age: 23, position: "PF" },
    { name: "Ausar Thompson", salary: 8_772_600, per: 9.0, yearsRemaining: 2, age: 22, position: "SF" },
  ],
};

async function main() {
  console.log("=".repeat(60));
  console.log("  NBA Trade Simulator — suggestTrade 日志测试");
  console.log("=".repeat(60));
  console.log();

  const ai = new AIService({
    apiKey: "test-key-for-logging-only",
    provider: "deepseek",
  });

  const options: SuggestTradeOptions = {
    team: MOCK_LAKERS,
    potentialPartners: [MOCK_BULLS, MOCK_NETS, MOCK_PISTONS],
    salaryCapThresholds: MOCK_SALARY_CAP_THRESHOLDS,
    useCache: false,
  };

  console.log("[测试] 即将调用 suggestTrade，观察日志输出...");
  console.log("[测试] 目标球队: 湖人（超税队 / 第一土豪线）");
  console.log("[测试] 交易伙伴: 公牛（税下队）、篮网（帽下队）、活塞（帽下队）");
  console.log();

  try {
    const result = await ai.suggestTrade(options);
    console.log();
    console.log("=".repeat(60));
    console.log("  LLM 返回结果（mock，实际会调用 API）");
    console.log("=".repeat(60));
    console.log(result.substring(0, 500));
  } catch (err: unknown) {
    const error = err as Error;
    console.log();
    console.log("=".repeat(60));
    console.log("  LLM API 调用失败（预期行为，因为 API Key 是假的）");
    console.log("  但日志输出已经完整展示了薪资计算过程");
    console.log("=".repeat(60));
    console.log(`  错误: ${error.message}`);
  }
}

main();
