"""
爬取 ESPN NBA 球员资料和赛季数据

数据源:
- 球队名单页: /nba/team/roster/_/name/{team}  → 身高/体重/年龄/位置/薪水/ESPN ID
- 球队数据页: /nba/team/stats/_/name/{team}     → 赛季数据 (PTS/REB/AST/...)

输出: data/output/players.json

ESPN 30队缩写:
"""
import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://www.espn.com"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output"
RAW_DIR = Path(__file__).resolve().parents[1] / "raw"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
}

TEAMS = {
    "ATL": "atl", "BOS": "bos", "BKN": "bkn", "CHA": "cha", "CHI": "chi",
    "CLE": "cle", "DAL": "dal", "DEN": "den", "DET": "det", "GSW": "gs",
    "HOU": "hou", "IND": "ind", "LAC": "lac", "LAL": "lal", "MEM": "mem",
    "MIA": "mia", "MIL": "mil", "MIN": "min", "NOP": "no", "NYK": "ny",
    "OKC": "okc", "ORL": "orl", "PHI": "phi", "PHX": "phx", "POR": "por",
    "SAC": "sac", "SAS": "sa", "TOR": "tor", "UTA": "utah", "WAS": "wsh",
}


def parse_height(ht: str) -> dict | None:
    """6' 8\" -> {'feet': 6, 'inches': 8, 'cm': 203}"""
    m = re.match(r"(\d+)'\s*(\d+)\"", ht)
    if not m:
        return None
    feet, inches = int(m.group(1)), int(m.group(2))
    cm = round(feet * 30.48 + inches * 2.54)
    return {"feet": feet, "inches": inches, "cm": cm}


def parse_weight(wt: str) -> dict | None:
    m = re.match(r"(\d+)\s*lbs", wt)
    if not m:
        return None
    lbs = int(m.group(1))
    return {"lbs": lbs, "kg": round(lbs * 0.453592)}


def crawl_roster(abbr: str, team_code: str) -> list[dict]:
    """爬取球队名单页: 身高/体重/年龄/位置"""
    url = f"{BASE}/nba/team/roster/_/name/{team_code}"
    print(f"  {abbr} 名单: {url}")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    table = soup.select_one(".ResponsiveTable")
    if not table:
        return []

    players = []
    rows = table.select("tbody tr")
    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 8:
            continue

        name_cell = cells[1]
        a_tag = name_cell.find("a")
        if not a_tag:
            continue

        name = a_tag.get_text(strip=True)
        href = a_tag.get("href", "")
        espn_id = None
        id_match = re.search(r"/id/(\d+)/", href)
        if id_match:
            espn_id = int(id_match.group(1))

        # name 里可能包含球衣号，例："Luka Doncic77"
        name = re.sub(r"\d+$", "", name).strip()

        pos = cells[2].get_text(strip=True)
        age = cells[3].get_text(strip=True)
        ht = cells[4].get_text(strip=True)
        wt = cells[5].get_text(strip=True)
        college = cells[6].get_text(strip=True)
        salary_raw = cells[7].get_text(strip=True)

        players.append({
            "name": name,
            "espn_id": espn_id,
            "team": abbr,
            "pos": pos,
            "age": int(age) if age.isdigit() else None,
            "height": parse_height(ht),
            "weight": parse_weight(wt),
            "college": college if college != "--" else None,
            "salary_espn": salary_raw,
        })

    return players


def crawl_team_stats(abbr: str, team_code: str) -> dict[str, dict]:
    """爬取球队数据页: 赛季场均数据"""
    url = f"{BASE}/nba/team/stats/_/name/{team_code}"
    print(f"  {abbr} 数据: {url}")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    table = soup.select_one(".ResponsiveTable")
    if not table:
        return {}

    stats_by_name = {}
    rows = table.select("tbody tr")
    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 14:
            continue

        name_cell = cells[0]
        a_tag = name_cell.find("a")
        if not a_tag:
            continue

        name = a_tag.get_text(strip=True)
        name = re.sub(r"\d+$", "", name).strip()

        try:
            stats_by_name[name] = {
                "gp": int(cells[1].get_text(strip=True) or 0),
                "gs": int(cells[2].get_text(strip=True) or 0),
                "min": float(cells[3].get_text(strip=True) or 0),
                "pts": float(cells[4].get_text(strip=True) or 0),
                "oreb": float(cells[5].get_text(strip=True) or 0),
                "dreb": float(cells[6].get_text(strip=True) or 0),
                "reb": float(cells[7].get_text(strip=True) or 0),
                "ast": float(cells[8].get_text(strip=True) or 0),
                "stl": float(cells[9].get_text(strip=True) or 0),
                "blk": float(cells[10].get_text(strip=True) or 0),
                "tov": float(cells[11].get_text(strip=True) or 0),
                "pf": float(cells[12].get_text(strip=True) or 0),
                "ast_to": float(cells[13].get_text(strip=True) or 0),
            }
        except (ValueError, IndexError):
            continue

    return stats_by_name


def main():
    print("=" * 60)
    print("ESPN NBA 球员资料 + 赛季数据爬虫")
    print("=" * 60)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    all_players = []
    all_stats = {}

    print("\n[1] 爬取 30 队球员名单 (身高/体重/年龄)...")
    for abbr, code in TEAMS.items():
        try:
            players = crawl_roster(abbr, code)
            all_players.extend(players)
            time.sleep(1)
        except Exception as e:
            print(f"  ❌ {abbr} 名单失败: {e}")

    print(f"\n  共 {len(all_players)} 名球员")

    print("\n[2] 爬取 30 队赛季数据...")
    for abbr, code in TEAMS.items():
        try:
            stats = crawl_team_stats(abbr, code)
            all_stats.update(stats)
            time.sleep(1)
        except Exception as e:
            print(f"  ❌ {abbr} 数据失败: {e}")

    print(f"\n  共 {len(all_stats)} 条赛季数据")

    print("\n[3] 合并资料+数据...")
    for p in all_players:
        name = p["name"]
        if name in all_stats:
            p["season_stats"] = all_stats[name]

    print(f"\n[4] 保存 {OUTPUT_DIR / 'players.json'} ...")
    result = {
        "source": "espn.com",
        "updated": time.strftime("%Y-%m-%d"),
        "total": len(all_players),
        "players": all_players,
    }
    out_path = OUTPUT_DIR / "players.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  已保存: {out_path} ({out_path.stat().st_size:,} bytes)")

    print("\n✅ 完成")


if __name__ == "__main__":
    main()