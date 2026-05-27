import { LLMClient, checkDailyLimit, incrementDailyUsage, getRemainingUsage, getCachedResult, setCachedResult, generateCacheKey } from "./llm-client";
import {
  TRADE_EXPLAINER_SYSTEM,
  TRADE_EXPLAINER_EXAMPLES,
  buildTradeExplainerPrompt,
  type TradeExplainerInput,
} from "./prompts/trade-explainer";
import {
  RULE_EXPLAINER_SYSTEM,
  RULE_EXPLAINER_EXAMPLES,
  buildRuleExplainerPrompt,
  type RuleExplainerInput,
} from "./prompts/rule-explainer";
import {
  TRADE_GRADER_SYSTEM,
  TRADE_GRADER_EXAMPLES,
  buildTradeGraderPrompt,
  type TradeGraderInput,
} from "./prompts/trade-grader";
import {
  PLAYER_COMPARE_SYSTEM,
  PLAYER_COMPARE_EXAMPLES,
  buildPlayerComparePrompt,
  type PlayerCompareInput,
} from "./prompts/player-compare";
import {
  TRADE_ANALOGY_SYSTEM,
  TRADE_ANALOGY_EXAMPLES,
  HISTORICAL_TRADES,
  buildTradeAnalogyPrompt,
  type TradeAnalogyInput,
} from "./prompts/trade-analogy";
import {
  TRADE_ADVISOR_SYSTEM,
  TRADE_ADVISOR_EXAMPLES,
  buildTradeAdvisorPrompt,
  type TradeAdvisorInput,
} from "./prompts/trade-advisor";
import { loadTeamProfiles } from "./team-profile-loader";
import {
  SALARY_ADVISOR_SYSTEM,
  SALARY_ADVISOR_EXAMPLES,
  buildSalaryAdvisorPrompt,
  type SalaryAdvisorInput,
} from "./prompts/salary-advisor";
import {
  SCENARIO_GENERATOR_SYSTEM,
  SCENARIO_GENERATOR_EXAMPLES,
  buildScenarioGeneratorPrompt,
  type ScenarioGeneratorInput,
  type ScenarioDifficulty,
  SCENARIO_DIFFICULTY_MAP,
  SCENARIO_TYPE_MAP,
} from "./prompts/scenario-generator";
import {
  GM_CHAT_SYSTEM,
  buildGMChatPrompt,
  type GMChatInput,
} from "./prompts/gm-chat";
import {
  buildTradeExplainerContext,
  buildRuleExplainerContext,
  extractRuleDataFromRulesJson,
  getTeamTaxStatus,
  type TeamData,
  type SalaryCapThresholds,
} from "./context-builder";
import type { RuleCategory } from "./prompts/rule-explainer";

export type {
  TradeExplainerInput, RuleExplainerInput, RuleCategory, TeamData, SalaryCapThresholds,
  TradeGraderInput, PlayerCompareInput, TradeAnalogyInput,
  TradeAdvisorInput, SalaryAdvisorInput, ScenarioGeneratorInput, ScenarioDifficulty,
};
export { LLMClient } from "./llm-client";
export { buildTradeExplainerContext, buildRuleExplainerContext, extractRuleDataFromRulesJson, getTeamTaxStatus } from "./context-builder";
export {
  TRADE_EXPLAINER_SYSTEM, RULE_EXPLAINER_SYSTEM, TRADE_GRADER_SYSTEM,
  PLAYER_COMPARE_SYSTEM, TRADE_ANALOGY_SYSTEM,
  TRADE_ADVISOR_SYSTEM, SALARY_ADVISOR_SYSTEM, SCENARIO_GENERATOR_SYSTEM, GM_CHAT_SYSTEM,
} from "./prompts";
export { HISTORICAL_TRADES } from "./prompts/trade-analogy";
export { SCENARIO_DIFFICULTY_MAP, SCENARIO_TYPE_MAP } from "./prompts/scenario-generator";
export { loadTeamProfile, loadTeamProfiles, clearProfileCache, getAllTeamAbbreviations } from "./team-profile-loader";

export interface AIServiceConfig {
  apiKey: string;
  provider?: "deepseek" | "openai";
  model?: string;
  baseUrl?: string;
}

export interface ExplainTradeOptions {
  teams: TeamData[];
  moves: Array<{
    player: { id: string; name: string; salary: number; per: number; yearsRemaining: number; restricted: boolean; restrictionType?: string };
    from: string;
    to: string;
  }>;
  ruleResults: Array<{ name: string; passed: boolean; level: "pass" | "fail" | "warn"; desc: string }>;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
  useCache?: boolean;
}

export interface ExplainRuleOptions {
  ruleCategory: RuleCategory;
  ruleResult: { name: string; passed: boolean; level: "pass" | "fail" | "warn"; desc: string };
  team?: TeamData;
  outgoingSalary?: number;
  incomingSalary?: number;
  thresholds?: SalaryCapThresholds;
  rulesJson?: Record<string, unknown>;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
  useCache?: boolean;
}

export interface GradeTradeOptions {
  teams: Array<{
    name: string;
    shortName: string;
    taxStatus: string;
    totalPayroll: number;
    capSpace: number;
    outgoingPlayers: Array<{ name: string; salary: number; per: number; yearsRemaining: number; age?: number; position?: string }>;
    incomingPlayers: Array<{ name: string; salary: number; per: number; yearsRemaining: number; age?: number; position?: string }>;
    outgoingPicks: string[];
    incomingPicks: string[];
  }>;
  allPassed: boolean;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
  useCache?: boolean;
}

export interface ComparePlayersOptions {
  sideA: {
    teamName: string;
    players: Array<{ name: string; salary: number; per: number; yearsRemaining: number; age?: number; position?: string }>;
  };
  sideB: {
    teamName: string;
    players: Array<{ name: string; salary: number; per: number; yearsRemaining: number; age?: number; position?: string }>;
  };
  compareContext?: "trade_value" | "salary_efficiency" | "future_potential";
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
  useCache?: boolean;
}

export interface FindAnalogyOptions {
  tradeSummary: string;
  starPlayerTraded: boolean;
  multiTeamDeal: boolean;
  picksExchanged: boolean;
  salaryDump: boolean;
  rebuildVsWinNow: "rebuild" | "win_now" | "mutual";
  customHistoricalTrades?: TradeAnalogyInput["historicalTrades"];
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
  useCache?: boolean;
}

export interface SuggestTradeOptions {
  team: TradeAdvisorInput["team"];
  potentialPartners: TradeAdvisorInput["potentialPartners"];
  salaryCapThresholds: TradeAdvisorInput["salaryCapThresholds"];
  involvedTeamAbbrs?: string[];
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
  useCache?: boolean;
}

export interface AnalyzeSalaryOptions {
  team: SalaryAdvisorInput["team"];
  thresholds: SalaryAdvisorInput["thresholds"];
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
  useCache?: boolean;
}

export interface GenerateScenarioOptions {
  scenarioType: ScenarioGeneratorInput["scenarioType"];
  difficulty: ScenarioGeneratorInput["difficulty"];
  constraints: ScenarioGeneratorInput["constraints"];
  availableData: ScenarioGeneratorInput["availableData"];
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
  useCache?: boolean;
}

export interface ChatWithGMOptions {
  teamName: string;
  teamShortName: string;
  teamAbbr: string;
  conversationHistory: Array<{ role: "owner" | "gm"; content: string }>;
  ownerMessage: string;
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

export class AIService {
  private client: LLMClient;

  constructor(config: AIServiceConfig) {
    this.client = new LLMClient({
      provider: config.provider || "deepseek",
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
      maxTokens: 1024,
      temperature: 0.3,
    });
  }

  async explainTrade(options: ExplainTradeOptions): Promise<string> {
    if (!checkDailyLimit()) {
      return "今日 AI 分析次数已用完，明天再来试试吧！规则校验结果仍然可以正常查看。";
    }

    const input = buildTradeExplainerContext(options.teams, options.moves, options.ruleResults);
    const userPrompt = buildTradeExplainerPrompt(input);

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(TRADE_EXPLAINER_SYSTEM, userPrompt);
      const cached = getCachedResult(cacheKey);
      if (cached) return cached;
    }

    const result = await this.client.call({
      systemPrompt: TRADE_EXPLAINER_SYSTEM,
      userPrompt,
      examples: TRADE_EXPLAINER_EXAMPLES.map((e) => ({ input: e.input, output: e.output })),
      onChunk: options.onChunk,
      signal: options.signal,
    });

    incrementDailyUsage();

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(TRADE_EXPLAINER_SYSTEM, userPrompt);
      setCachedResult(cacheKey, result.content);
    }

    return result.content;
  }

  async explainRule(options: ExplainRuleOptions): Promise<string> {
    if (!checkDailyLimit()) {
      return "今日 AI 分析次数已用完，明天再来试试吧！";
    }

    const ruleData = options.rulesJson
      ? extractRuleDataFromRulesJson(options.rulesJson, options.ruleCategory)
      : undefined;

    const input = buildRuleExplainerContext(
      options.ruleCategory, options.ruleResult, options.team,
      options.outgoingSalary, options.incomingSalary, options.thresholds, ruleData
    );
    const userPrompt = buildRuleExplainerPrompt(input);

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(RULE_EXPLAINER_SYSTEM, userPrompt);
      const cached = getCachedResult(cacheKey);
      if (cached) return cached;
    }

    const result = await this.client.call({
      systemPrompt: RULE_EXPLAINER_SYSTEM,
      userPrompt,
      examples: RULE_EXPLAINER_EXAMPLES.map((e) => ({ input: e.input, output: e.output })),
      onChunk: options.onChunk,
      signal: options.signal,
    });

    incrementDailyUsage();

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(RULE_EXPLAINER_SYSTEM, userPrompt);
      setCachedResult(cacheKey, result.content);
    }

    return result.content;
  }

  async gradeTrade(options: GradeTradeOptions): Promise<string> {
    if (!checkDailyLimit()) {
      return "今日 AI 分析次数已用完，明天再来试试吧！";
    }

    const input: TradeGraderInput = { teams: options.teams, allPassed: options.allPassed };
    const userPrompt = buildTradeGraderPrompt(input);

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(TRADE_GRADER_SYSTEM, userPrompt);
      const cached = getCachedResult(cacheKey);
      if (cached) return cached;
    }

    const result = await this.client.call({
      systemPrompt: TRADE_GRADER_SYSTEM,
      userPrompt,
      examples: TRADE_GRADER_EXAMPLES.map((e) => ({ input: e.input, output: e.output })),
      onChunk: options.onChunk,
      signal: options.signal,
    });

    incrementDailyUsage();

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(TRADE_GRADER_SYSTEM, userPrompt);
      setCachedResult(cacheKey, result.content);
    }

    return result.content;
  }

  async comparePlayers(options: ComparePlayersOptions): Promise<string> {
    if (!checkDailyLimit()) {
      return "今日 AI 分析次数已用完，明天再来试试吧！";
    }

    const input: PlayerCompareInput = {
      sideA: options.sideA,
      sideB: options.sideB,
      compareContext: options.compareContext,
    };
    const userPrompt = buildPlayerComparePrompt(input);

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(PLAYER_COMPARE_SYSTEM, userPrompt);
      const cached = getCachedResult(cacheKey);
      if (cached) return cached;
    }

    const result = await this.client.call({
      systemPrompt: PLAYER_COMPARE_SYSTEM,
      userPrompt,
      examples: PLAYER_COMPARE_EXAMPLES.map((e) => ({ input: e.input, output: e.output })),
      onChunk: options.onChunk,
      signal: options.signal,
    });

    incrementDailyUsage();

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(PLAYER_COMPARE_SYSTEM, userPrompt);
      setCachedResult(cacheKey, result.content);
    }

    return result.content;
  }

  async findAnalogy(options: FindAnalogyOptions): Promise<string> {
    if (!checkDailyLimit()) {
      return "今日 AI 分析次数已用完，明天再来试试吧！";
    }

    const input: TradeAnalogyInput = {
      currentTrade: {
        summary: options.tradeSummary,
        starPlayerTraded: options.starPlayerTraded,
        multiTeamDeal: options.multiTeamDeal,
        picksExchanged: options.picksExchanged,
        salaryDump: options.salaryDump,
        rebuildVsWinNow: options.rebuildVsWinNow,
      },
      historicalTrades: options.customHistoricalTrades || HISTORICAL_TRADES,
    };
    const userPrompt = buildTradeAnalogyPrompt(input);

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(TRADE_ANALOGY_SYSTEM, userPrompt);
      const cached = getCachedResult(cacheKey);
      if (cached) return cached;
    }

    const result = await this.client.call({
      systemPrompt: TRADE_ANALOGY_SYSTEM,
      userPrompt,
      examples: TRADE_ANALOGY_EXAMPLES.map((e) => ({ input: e.input, output: e.output })),
      onChunk: options.onChunk,
      signal: options.signal,
    });

    incrementDailyUsage();

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(TRADE_ANALOGY_SYSTEM, userPrompt);
      setCachedResult(cacheKey, result.content);
    }

    return result.content;
  }

  async suggestTrade(options: SuggestTradeOptions): Promise<string> {
    console.log(`[AI suggestTrade] 开始 — 目标球队: ${options.team.shortName}`);

    if (!checkDailyLimit()) {
      console.warn(`[AI suggestTrade] 日限流已满，剩余次数: ${0}`);
      return "今日 AI 分析次数已用完，明天再来试试吧！";
    }
    console.log(`[AI suggestTrade] 日限流检查通过，剩余次数: ${getRemainingUsage()}`);

    logSalaryCalculation(options.team, options.potentialPartners, options.salaryCapThresholds);

    const teamAbbrs = options.involvedTeamAbbrs || [
      options.team.shortName,
      ...options.potentialPartners.map((p) => p.shortName),
    ];
    const teamProfiles = loadTeamProfiles(teamAbbrs);
    console.log(`[AI suggestTrade] 加载球队档案: ${teamAbbrs.join(", ")}，总长度: ${teamProfiles.length} 字符`);

    const input: TradeAdvisorInput = {
      team: options.team,
      potentialPartners: options.potentialPartners,
      salaryCapThresholds: options.salaryCapThresholds,
      teamProfiles: teamProfiles || undefined,
    };
    const userPrompt = buildTradeAdvisorPrompt(input);
    console.log(`[AI suggestTrade] Prompt 构建完成，长度: ${userPrompt.length} 字符`);

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(TRADE_ADVISOR_SYSTEM, userPrompt);
      const cached = getCachedResult(cacheKey);
      if (cached) {
        console.log(`[AI suggestTrade] 命中缓存，cacheKey: ${cacheKey}`);
        return cached;
      }
      console.log(`[AI suggestTrade] 缓存未命中，cacheKey: ${generateCacheKey(TRADE_ADVISOR_SYSTEM, userPrompt)}`);
    }

    console.log(`[AI suggestTrade] 调用 LLM API...`);
    const startTime = Date.now();

    const result = await this.client.call({
      systemPrompt: TRADE_ADVISOR_SYSTEM,
      userPrompt,
      examples: TRADE_ADVISOR_EXAMPLES.map((e) => ({ input: e.input, output: e.output })),
      onChunk: options.onChunk,
      signal: options.signal,
    });

    const elapsed = Date.now() - startTime;
    console.log(`[AI suggestTrade] LLM API 返回，耗时: ${elapsed}ms, tokens: prompt=${result.usage.promptTokens} completion=${result.usage.completionTokens} total=${result.usage.totalTokens}`);

    incrementDailyUsage();
    console.log(`[AI suggestTrade] 日限流计数+1，剩余次数: ${getRemainingUsage()}`);

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(TRADE_ADVISOR_SYSTEM, userPrompt);
      setCachedResult(cacheKey, result.content);
      console.log(`[AI suggestTrade] 结果已缓存，cacheKey: ${cacheKey}`);
    }

    console.log(`[AI suggestTrade] 完成 — ${options.team.shortName}`);
    return result.content;
  }

  async analyzeSalary(options: AnalyzeSalaryOptions): Promise<string> {
    if (!checkDailyLimit()) {
      return "今日 AI 分析次数已用完，明天再来试试吧！";
    }

    const input: SalaryAdvisorInput = {
      team: options.team,
      thresholds: options.thresholds,
    };
    const userPrompt = buildSalaryAdvisorPrompt(input);

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(SALARY_ADVISOR_SYSTEM, userPrompt);
      const cached = getCachedResult(cacheKey);
      if (cached) return cached;
    }

    const result = await this.client.call({
      systemPrompt: SALARY_ADVISOR_SYSTEM,
      userPrompt,
      examples: SALARY_ADVISOR_EXAMPLES.map((e) => ({ input: e.input, output: e.output })),
      onChunk: options.onChunk,
      signal: options.signal,
    });

    incrementDailyUsage();

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(SALARY_ADVISOR_SYSTEM, userPrompt);
      setCachedResult(cacheKey, result.content);
    }

    return result.content;
  }

  async generateScenario(options: GenerateScenarioOptions): Promise<string> {
    if (!checkDailyLimit()) {
      return "今日 AI 分析次数已用完，明天再来试试吧！";
    }

    const input: ScenarioGeneratorInput = {
      scenarioType: options.scenarioType,
      difficulty: options.difficulty,
      constraints: options.constraints,
      availableData: options.availableData,
    };
    const userPrompt = buildScenarioGeneratorPrompt(input);

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(SCENARIO_GENERATOR_SYSTEM, userPrompt);
      const cached = getCachedResult(cacheKey);
      if (cached) return cached;
    }

    const result = await this.client.call({
      systemPrompt: SCENARIO_GENERATOR_SYSTEM,
      userPrompt,
      examples: SCENARIO_GENERATOR_EXAMPLES.map((e) => ({ input: e.input, output: e.output })),
      onChunk: options.onChunk,
      signal: options.signal,
    });

    incrementDailyUsage();

    if (options.useCache !== false) {
      const cacheKey = generateCacheKey(SCENARIO_GENERATOR_SYSTEM, userPrompt);
      setCachedResult(cacheKey, result.content);
    }

    return result.content;
  }

  async chatWithGM(options: ChatWithGMOptions): Promise<string> {
    console.log(`[AI chatWithGM] 开始 — 球队: ${options.teamName}`);

    if (!checkDailyLimit()) {
      console.warn(`[AI chatWithGM] 日限流已满`);
      return "今日 AI 分析次数已用完，明天再来试试吧！";
    }

    const teamProfile = loadTeamProfiles([options.teamAbbr]);
    console.log(`[AI chatWithGM] 加载球队档案: ${options.teamAbbr}，长度: ${teamProfile.length} 字符`);

    const input: GMChatInput = {
      teamName: options.teamName,
      teamShortName: options.teamShortName,
      teamProfile: teamProfile || "暂无球队档案",
      conversationHistory: options.conversationHistory,
      ownerMessage: options.ownerMessage,
    };

    const { systemPrompt, userPrompt } = buildGMChatPrompt(input);
    console.log(`[AI chatWithGM] Prompt 构建完成，system: ${systemPrompt.length} 字符，user: ${userPrompt.length} 字符`);

    const result = await this.client.call({
      systemPrompt,
      userPrompt,
      onChunk: options.onChunk,
      signal: options.signal,
    });

    incrementDailyUsage();
    console.log(`[AI chatWithGM] 完成 — tokens: prompt=${result.usage.promptTokens} completion=${result.usage.completionTokens}`);

    return result.content;
  }
}

function formatSalaryLog(amount: number): string {
  if (amount === 0) return "$0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs}`;
}

function getSalaryMatchMultiplier(taxStatus: string): { multiplier: number; addon: number; label: string } {
  if (taxStatus === "帽下队") return { multiplier: 2.0, addon: 250000, label: "帽下队 ×2+$250K" };
  if (taxStatus === "税下队") return { multiplier: 1.25, addon: 250000, label: "税下队 ×1.25+$250K" };
  if (taxStatus === "超税队") return { multiplier: 1.25, addon: 100000, label: "超税队 ×1.25+$100K" };
  if (taxStatus.includes("土豪线")) return { multiplier: 1.0, addon: 0, label: "土豪线 ×1.0（等额交换）" };
  return { multiplier: 1.25, addon: 100000, label: "默认 ×1.25+$100K" };
}

function logSalaryCalculation(
  team: TradeAdvisorInput["team"],
  partners: TradeAdvisorInput["potentialPartners"],
  thresholds: TradeAdvisorInput["salaryCapThresholds"]
): void {
  console.group(`[AI suggestTrade] 薪资计算日志 — ${team.shortName}`);

  console.group("目标球队");
  console.log(`  名称: ${team.name}（${team.shortName}）`);
  console.log(`  税线状态: ${team.taxStatus}`);
  console.log(`  土豪线级别: ${team.apronLevel}`);
  console.log(`  总薪资: ${formatSalaryLog(team.totalPayroll)}`);
  console.log(`  薪资空间: ${formatSalaryLog(team.capSpace)}`);
  console.log(`  阵容人数: ${team.rosterCount}/15`);
  console.log(`  需求: ${team.needs.join("、")}`);
  console.groupEnd();

  console.group("核心球员（不可交易）");
  team.corePlayers.forEach((p) => {
    console.log(`  ${p.name}: ${formatSalaryLog(p.salary)}, PER ${p.per}, ${p.yearsRemaining}年, ${p.age}岁, ${p.position}, untouchable=${p.untouchable}`);
  });
  console.groupEnd();

  console.group("可交易球员");
  team.tradablePlayers.forEach((p) => {
    console.log(`  ${p.name}: ${formatSalaryLog(p.salary)}, PER ${p.per}, ${p.yearsRemaining}年, ${p.age}岁, ${p.position}`);
  });
  const totalTradableSalary = team.tradablePlayers.reduce((sum, p) => sum + p.salary, 0);
  console.log(`  可交易薪资合计: ${formatSalaryLog(totalTradableSalary)}`);
  console.groupEnd();

  console.log(`可用选秀权: ${team.availablePicks.join("、") || "无"}`);

  console.group("薪资帽阈值");
  console.log(`  薪资帽: ${formatSalaryLog(thresholds.salaryCap)}`);
  console.log(`  奢侈税线: ${formatSalaryLog(thresholds.luxuryTaxLine)}`);
  console.log(`  第一土豪线: ${formatSalaryLog(thresholds.firstApron)}`);
  console.log(`  第二土豪线: ${formatSalaryLog(thresholds.secondApron)}`);
  console.groupEnd();

  const teamRule = getSalaryMatchMultiplier(team.taxStatus);
  console.group("薪资匹配规则（目标球队视角）");
  console.log(`  状态: ${team.taxStatus}`);
  console.log(`  公式: ${teamRule.label}`);
  console.log(`  送出薪资上限计算: 送出薪资 × ${teamRule.multiplier} + ${formatSalaryLog(teamRule.addon)}`);
  const exampleOutgoing = totalTradableSalary;
  const exampleLimit = exampleOutgoing * teamRule.multiplier + teamRule.addon;
  console.log(`  示例: 送出全部可交易球员 ${formatSalaryLog(exampleOutgoing)} → 可接收上限 ${formatSalaryLog(exampleLimit)}`);
  console.groupEnd();

  partners.forEach((partner) => {
    console.group(`交易伙伴: ${partner.shortName}`);
    console.log(`  名称: ${partner.name}`);
    console.log(`  税线状态: ${partner.taxStatus}`);
    console.log(`  总薪资: ${formatSalaryLog(partner.totalPayroll)}`);
    console.log(`  薪资空间: ${formatSalaryLog(partner.capSpace)}`);
    console.log(`  需求: ${partner.needs.join("、")}`);

    const partnerRule = getSalaryMatchMultiplier(partner.taxStatus);
    console.log(`  薪资匹配规则: ${partnerRule.label}`);

    console.group("  可交易球员");
    partner.tradablePlayers.forEach((p) => {
      console.log(`    ${p.name}: ${formatSalaryLog(p.salary)}, PER ${p.per}, ${p.yearsRemaining}年, ${p.age}岁, ${p.position}`);
    });
    const partnerTradableTotal = partner.tradablePlayers.reduce((sum, p) => sum + p.salary, 0);
    console.log(`    可交易薪资合计: ${formatSalaryLog(partnerTradableTotal)}`);
    console.groupEnd();

    console.group("  配平可行性速算");
    team.tradablePlayers.forEach((ourPlayer) => {
      partner.tradablePlayers.forEach((theirPlayer) => {
        const ourOutgoing = ourPlayer.salary;
        const ourIncomingLimit = ourOutgoing * teamRule.multiplier + teamRule.addon;
        const theirOutgoing = theirPlayer.salary;
        const theirIncomingLimit = theirOutgoing * partnerRule.multiplier + partnerRule.addon;

        const weCanReceive = theirPlayer.salary <= ourIncomingLimit;
        const theyCanReceive = ourPlayer.salary <= theirIncomingLimit;

        if (weCanReceive && theyCanReceive) {
          console.log(`    ✅ ${ourPlayer.name}(${formatSalaryLog(ourPlayer.salary)}) ↔ ${theirPlayer.name}(${formatSalaryLog(theirPlayer.salary)})`);
          console.log(`       我方: 送出 ${formatSalaryLog(ourOutgoing)}, 上限 ${formatSalaryLog(ourIncomingLimit)}, 接收 ${formatSalaryLog(theirPlayer.salary)} → ✅`);
          console.log(`       对方: 送出 ${formatSalaryLog(theirOutgoing)}, 上限 ${formatSalaryLog(theirIncomingLimit)}, 接收 ${formatSalaryLog(ourPlayer.salary)} → ✅`);
        }
      });
    });
    console.groupEnd();

    console.groupEnd();
  });

  console.group("土豪线约束检查");
  const payroll = team.totalPayroll;
  if (payroll > thresholds.secondApron) {
    console.log(`  🔴 超第二土豪线 ${formatSalaryLog(payroll - thresholds.secondApron)}`);
    console.log(`  限制: 不能使用聚合特例 / 不能签买断球员 / 首轮签可能冻结 / 只能 1:1 等额交换`);
  } else if (payroll > thresholds.firstApron) {
    console.log(`  🟡 超第一土豪线 ${formatSalaryLog(payroll - thresholds.firstApron)}`);
    console.log(`  限制: 不能使用聚合特例 / 硬帽生效`);
  } else if (payroll > thresholds.luxuryTaxLine) {
    console.log(`  🟡 超奢侈税线 ${formatSalaryLog(payroll - thresholds.luxuryTaxLine)}`);
    console.log(`  限制: 使用 NTMLE 会触发第一土豪线硬帽`);
  } else if (payroll > thresholds.salaryCap) {
    console.log(`  🟢 超帽但税下，灵活性尚可`);
  } else {
    console.log(`  🟢 帽下队，空间 ${formatSalaryLog(thresholds.salaryCap - payroll)}`);
  }
  console.groupEnd();

  console.groupEnd();
}
