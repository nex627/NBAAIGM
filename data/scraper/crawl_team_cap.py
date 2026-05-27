"""
爬取 spotrac.com 球队薪资空间数据
输出: data/output/teams.json
"""
import json
import re
import time
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup

URL = "https://www.spotrac.com/nba/cap/_/year/2025"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output"
RAW_DIR = Path(__file__).resolve().parents[1] / "raw"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
}

# 球队名缩写映射
TEAM_ABBREV_MAP = {
    "ATL": "Atlanta Hawks", "BOS": "Boston Celtics", "BRK": "Brooklyn Nets",
    "CHO": "Charlotte Hornets", "CHI": "Chicago Bulls", "CLE": "Cleveland Cavaliers",
    "DAL": "Dallas Mavericks", "DEN": "Denver Nuggets", "DET": "Detroit Pistons",
    "GSW": "Golden State Warriors", "HOU": "Houston Rockets", "IND": "Indiana Pacers",
    "LAC": "LA Clippers", "LAL": "Los Angeles Lakers", "MEM": "Memphis Grizzlies",
    "MIA": "Miami Heat", "MIL": "Milwaukee Bucks", "MIN": "Minnesota Timberwolves",
    "NOP": "New Orleans Pelicans", "NYK": "New York Knicks", "OKC": "Oklahoma City Thunder",
    "ORL": "Orlando Magic", "PHI": "Philadelphia 76ers", "PHX": "Phoenix Suns",
    "POR": "Portland Trail Blazers", "SAC": "Sacramento Kings", "SAS": "San Antonio Spurs",
    "TOR": "Toronto Raptors", "UTA": "Utah Jazz", "WAS": "Washington Wizards",
}


def parse_money(value: str) -> int:
    """$150,960,352 → 150960352"""
    if not value or value.strip() in ("-", ""):
        return 0
    cleaned = re.sub(r"[$,]", "", value.strip())
    try:
        return int(cleaned)
    except ValueError:
        return 0


def crawl():
    print(f"[1/3] 请求 {URL} ...")
    resp = requests.get(URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    html = resp.text

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    raw_path = RAW_DIR / "teams_cap.html"
    raw_path.write_text(html, encoding="utf-8")
    print(f"      原始 HTML 已保存: {raw_path} ({len(html)} bytes)")

    print("[2/3] 解析表格 ...")
    soup = BeautifulSoup(html, "lxml")

    # spotrac 用 <table class="responsive-table"> 或类似
    # 尝试多种选择器
    table = soup.find("table")
    if not table:
        print("❌ 找不到表格")
        sys.exit(1)

    teams = []
    tbody = table.find("tbody")
    if not tbody:
        print("❌ 找不到 tbody")
        sys.exit(1)

    rows = tbody.find_all("tr")
    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 6:
            continue

        try:
            # spotrac 表格结构:
            # Rank | Team | Record | Players Active | Avg Age | Total Cap | Cap Space | Active | Active Top 3 | Dead Cap

            team_cell = cols[1] if len(cols) > 1 else None
            if not team_cell:
                continue

            team_link = team_cell.find("a")
            if not team_link:
                continue

            team_abbrev = team_link.text.strip()
            if team_abbrev in ("Totals", "Averages"):
                continue

            team_full = TEAM_ABBREV_MAP.get(team_abbrev, team_abbrev)

            total_cap = parse_money(cols[5].text) if len(cols) > 5 else 0
            cap_space = parse_money(cols[6].text) if len(cols) > 6 else 0
            active_salary = parse_money(cols[7].text) if len(cols) > 7 else 0
            dead_cap = parse_money(cols[9].text) if len(cols) > 9 else 0

            # cap_space 在 spotrac 中：正值=有空间，负值=超帽
            # 用 Cap Space 的符号判断是否超帽

            team = {
                "abbrev": team_abbrev,
                "name": team_full,
                "total_cap_allocations": total_cap,
                "cap_space": cap_space,
                "active_salary": active_salary,
                "dead_cap": dead_cap,
                "over_cap": cap_space < 0,
            }
            teams.append(team)

        except Exception as e:
            print(f"      ⚠ 跳过一行: {e}")
            continue

    print(f"      解析完成: {len(teams)} 支球队")

    # 计算工资帽 (spotrac 页面有显示，从 HTML 中提取)
    cap_match = re.search(r"Salary Cap\s*\$?([\d,]+)", html, re.IGNORECASE)
    salary_cap = 154657000  # 默认 2025-26
    if cap_match:
        salary_cap = parse_money(cap_match.group(1))

    print(f"      工资帽: ${salary_cap:,}")

    # 计算各队的 Cap Space（正值有空间，负值超帽）
    for t in teams:
        t["salary_cap"] = salary_cap

    print("[3/3] 保存 JSON ...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "teams.json"

    result = {
        "source": "spotrac.com",
        "url": URL,
        "salary_cap": salary_cap,
        "total_teams": len(teams),
        "teams": teams,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"      ✅ 已保存: {output_path}")
    print(f"      文件大小: {output_path.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    print("=" * 50)
    print("NBA 球队薪资空间爬虫")
    print("=" * 50)
    time.sleep(1)
    crawl()
    print("\n✅ 完成!")