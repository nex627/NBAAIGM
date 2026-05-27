import type { RuleCategory, RuleExplainerInput } from "./prompts/rule-explainer";
import type { TradeExplainerInput } from "./prompts/trade-explainer";
import { RULE_CATEGORY_MAP } from "./prompts/rule-explainer";

export interface SalaryCapThresholds {
  salary_cap: number;
  minimum_team_salary: number;
  luxury_tax_line: number;
  first_apron: number;
  second_apron: number;
}

export interface PlayerData {
  id: string;
  name: string;
  salary: number;
  per: number;
  yearsRemaining: number;
  restricted: boolean;
  restrictionType?: string;
  position?: string;
  contractType?: string;
}

export interface TeamData {
  id: string;
  name: string;
  shortName: string;
  conference: string;
  overTaxLine: number;
  capRoom: number;
  players: PlayerData[];
}

export function getTeamTaxStatus(team: { overTaxLine: number; capRoom: number }): string {
  if (team.capRoom >= 0) return "帽下队";
  if (team.overTaxLine > 0) return "超税队";
  return "税下队";
}

export function getTeamApronLevel(
  team: { overTaxLine: number; capRoom: number },
  thresholds: SalaryCapThresholds
): string {
  const totalPayroll = thresholds.salary_cap - team.capRoom;
  if (totalPayroll > thresholds.second_apron) return "第二土豪线";
  if (totalPayroll > thresholds.first_apron) return "第一土豪线";
  if (totalPayroll > thresholds.luxury_tax_line) return "超税线";
  if (totalPayroll > thresholds.salary_cap) return "超帽";
  return "帽下";
}

export function buildTradeExplainerContext(
  teams: TeamData[],
  moves: Array<{ player: PlayerData; from: string; to: string }>,
  ruleResults: Array<{ name: string; passed: boolean; level: "pass" | "fail" | "warn"; desc: string }>
): TradeExplainerInput {
  const involvedTeamIds = new Set<string>();
  moves.forEach((m) => {
    involvedTeamIds.add(m.from);
    involvedTeamIds.add(m.to);
  });

  const involvedTeams = teams.filter((t) => involvedTeamIds.has(t.id));

  const allPassed = ruleResults.every((r) => r.passed !== false);
  const hasWarning = ruleResults.some((r) => r.level === "warn");

  return {
    teams: involvedTeams.map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      overTaxLine: t.overTaxLine,
      capRoom: t.capRoom,
      players: t.players,
    })),
    moves,
    ruleResults,
    allPassed,
    hasWarning,
  };
}

export function buildRuleExplainerContext(
  ruleCategory: RuleCategory,
  ruleResult: { name: string; passed: boolean; level: "pass" | "fail" | "warn"; desc: string },
  team?: TeamData,
  outgoingSalary?: number,
  incomingSalary?: number,
  thresholds?: SalaryCapThresholds,
  ruleData?: Record<string, unknown>
): RuleExplainerInput {
  const categoryInfo = RULE_CATEGORY_MAP[ruleCategory];

  const input: RuleExplainerInput = {
    ruleCategory,
    ruleName: ruleResult.name || categoryInfo.label,
    ruleResult: {
      passed: ruleResult.passed,
      level: ruleResult.level,
      desc: ruleResult.desc,
    },
  };

  if (team && outgoingSalary !== undefined && incomingSalary !== undefined && thresholds) {
    input.tradeContext = {
      teamName: team.shortName,
      teamTaxStatus: getTeamTaxStatus(team),
      outgoingSalary,
      incomingSalary,
      salaryCap: thresholds.salary_cap,
    };
  }

  if (ruleData) {
    input.ruleData = ruleData;
  }

  return input;
}

export function extractRuleDataFromRulesJson(
  rulesJson: Record<string, unknown>,
  category: RuleCategory
): Record<string, unknown> | undefined {
  const extractors: Partial<Record<RuleCategory, (json: Record<string, unknown>) => Record<string, unknown>>> = {
    salary_match: (json) => ({
      tiers: [
        { status: "帽下队", formula: "送出薪资 ×2 + $250K" },
        { status: "税下队", formula: "送出薪资 ×1.5 + $250K" },
        { status: "超税队", formula: "送出薪资 ×1.25 + $100K" },
        { status: "第二土豪线", formula: "送出薪资 ×1.0（等额交换）" },
      ],
      traded_player_exceptions: json.traded_player_exceptions,
    }),
    apron: (json) => ({
      thresholds: json.salary_cap_thresholds,
      first_apron_restrictions: (json.apron_rules as Record<string, unknown>)?.first_apron_restrictions,
      second_apron_restrictions: (json.apron_rules as Record<string, unknown>)?.second_apron_restrictions,
      second_apron_penalties: (json.apron_rules as Record<string, unknown>)?.second_apron_penalties,
      hard_cap_triggers: (json.apron_rules as Record<string, unknown>)?.hard_cap_triggers,
    }),
    tpe: (json) => ({
      types: json.traded_player_exceptions,
      usage_rules: json.tpe_usage_rules,
    }),
    draft_pick: (json) => json.draft_pick_rules as Record<string, unknown>,
    trade_kicker: (json) =>
      (json.trade_salary_adjustments as Record<string, unknown>)?.trade_bonus_detail as Record<string, unknown>,
    poison_pill: (json) =>
      (json.trade_salary_adjustments as Record<string, unknown>)?.poison_pill_detail as Record<string, unknown>,
    no_trade_clause: (json) => json.no_trade_clause as Record<string, unknown>,
    cash_in_trade: (json) => json.cash_in_trade as Record<string, unknown>,
    sign_and_trade: (json) => ({
      rules: json.general_trade_rules,
      bird_rights: json.bird_rights_in_trades,
    }),
    bird_rights: (json) => json.bird_rights_in_trades as Record<string, unknown>,
    minimum_exception: (json) => ({
      scale: json.minimum_salary_scale,
      trade_rule: "底薪球员在交易中按 $0 计算薪资匹配",
    }),
    new_player_restriction: (json) => ({
      rule: "新签约球员在 12 月 15 日之前不能被交易（或签约后 3 个月，以较晚者为准）",
      exceptions: "使用空间签约的球员、底薪签约的球员有特殊规则",
      general_rules: json.general_trade_rules,
    }),
  };

  const extractor = extractors[category];
  return extractor ? extractor(rulesJson) : undefined;
}

export function trimContextForTokenLimit(
  context: string,
  maxTokens: number = 2000
): string {
  const estimatedTokens = Math.ceil(context.length / 2);
  if (estimatedTokens <= maxTokens) return context;

  const ratio = maxTokens / estimatedTokens;
  const maxChars = Math.floor(context.length * ratio * 0.9);
  const trimmed = context.substring(0, maxChars);
  const lastNewline = trimmed.lastIndexOf("\n");
  return lastNewline > 0 ? trimmed.substring(0, lastNewline) + "\n...（数据已截断）" : trimmed + "...（数据已截断）";
}
