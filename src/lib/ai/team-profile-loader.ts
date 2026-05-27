import { readFileSync, existsSync } from "fs";
import { join } from "path";

const TEAM_ABBREVIATIONS = [
  "ATL", "BKN", "BOS", "CHA", "CHI",
  "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM",
  "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR",
  "SAC", "SAS", "TOR", "UTA", "WAS",
] as const;

export type TeamAbbreviation = (typeof TEAM_ABBREVIATIONS)[number];

const PROFILE_DIR = join(process.cwd(), "data", "team-profiles");

const profileCache = new Map<string, string>();

export function loadTeamProfile(abbr: string): string | null {
  const upper = abbr.toUpperCase();
  if (profileCache.has(upper)) {
    return profileCache.get(upper)!;
  }

  const filePath = join(PROFILE_DIR, `${upper}.md`);
  if (!existsSync(filePath)) {
    console.warn(`[team-profile-loader] 档案文件不存在: ${filePath}`);
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    profileCache.set(upper, content);
    return content;
  } catch (err) {
    console.warn(`[team-profile-loader] 读取档案失败: ${filePath}`, err);
    return null;
  }
}

export function loadTeamProfiles(abbrs: string[]): string {
  const profiles: string[] = [];
  for (const abbr of abbrs) {
    const profile = loadTeamProfile(abbr);
    if (profile) {
      profiles.push(profile);
    }
  }
  return profiles.join("\n\n---\n\n");
}

export function clearProfileCache(): void {
  profileCache.clear();
}

export function getAllTeamAbbreviations(): readonly TeamAbbreviation[] {
  return TEAM_ABBREVIATIONS;
}
