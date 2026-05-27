"""
爬取 hoopsrumors.com 各队 TPE (Traded Player Exception) 数据
输出: data/output/team_tpes.json

数据源: https://www.hoopsrumors.com/2012/02/outstanding-trade-exceptions.html

HTML 结构: 每个 TPE 是一个 <p> 标签，包含:
  Amount: $6,700,000
  Obtained: <a>Clint Capela</a> (Rockets)
  Initial amount: $22,531,707  (可选)
  Used: <a>Nikola Vucevic</a> ($21,481,481)  (可选)
  Expires: 7/6/26
斜体 <p> 表示 apron 受限 TPE
"""
import json
import re
import time
import sys
from pathlib import Path

import requests
from bs4 import BeautifulSoup, Tag

URL = "https://www.hoopsrumors.com/2012/02/outstanding-trade-exceptions.html"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output"
RAW_DIR = Path(__file__).resolve().parents[1] / "raw"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
}

TEAM_ABBREV_MAP = {
    "Atlanta Hawks": "ATL", "Boston Celtics": "BOS", "Brooklyn Nets": "BKN",
    "Charlotte Hornets": "CHA", "Chicago Bulls": "CHI", "Cleveland Cavaliers": "CLE",
    "Dallas Mavericks": "DAL", "Denver Nuggets": "DEN", "Detroit Pistons": "DET",
    "Golden State Warriors": "GSW", "Houston Rockets": "HOU", "Indiana Pacers": "IND",
    "LA Clippers": "LAC", "Los Angeles Clippers": "LAC",
    "Los Angeles Lakers": "LAL", "Memphis Grizzlies": "MEM",
    "Miami Heat": "MIA", "Milwaukee Bucks": "MIL", "Minnesota Timberwolves": "MIN",
    "New Orleans Pelicans": "NOP", "New York Knicks": "NYK",
    "Oklahoma City Thunder": "OKC", "Orlando Magic": "ORL",
    "Philadelphia 76ers": "PHI", "Phoenix Suns": "PHX",
    "Portland Trail Blazers": "POR", "Sacramento Kings": "SAC",
    "San Antonio Spurs": "SAS", "Toronto Raptors": "TOR",
    "Utah Jazz": "UTA", "Washington Wizards": "WAS",
}


def parse_money(value: str) -> int:
    cleaned = re.sub(r"[$,]", "", value.strip())
    try:
        return int(cleaned)
    except ValueError:
        return 0


def parse_date(date_str: str) -> str:
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", date_str.strip())
    if m:
        month, day, year = m.groups()
        year = int(year)
        if year < 100:
            year += 2000
        return f"{year}-{int(month):02d}-{int(day):02d}"
    return date_str.strip()


def extract_player_name(p_tag: Tag, keyword: str) -> tuple[str | None, str | None]:
    """从 <p> 标签中提取 keyword: 后的球员名和括号中的球队名"""
    text = p_tag.get_text(separator="\n")
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if keyword in line:
            player_name = None
            source_team = None
            for child in p_tag.children:
                if isinstance(child, Tag) and child.name == "strong":
                    link = child.find("a")
                    if link:
                        player_name = link.get_text(strip=True)
                        break
                    player_name = child.get_text(strip=True)
                    break
                elif isinstance(child, Tag) and child.name == "a":
                    child_text = child.get_text(strip=True)
                    if keyword in child.previous_sibling.get_text() if child.previous_sibling else False:
                        player_name = child_text
                        break

            if not player_name:
                after = line.split(keyword, 1)[-1].strip().lstrip(":").strip()
                player_name = after.split("(")[0].strip() if "(" in after else after or None

            team_match = re.search(r"\(([^)]+)\)", line)
            if team_match:
                candidate = team_match.group(1).strip()
                if not re.match(r"^\$?[\d,]+$", candidate):
                    source_team = candidate

            return player_name, source_team
    return None, None


def parse_tpe_paragraph(p_tag: Tag) -> dict | None:
    """解析单个 TPE 的 <p> 标签"""
    text = p_tag.get_text(separator="|")
    full_text = p_tag.get_text()

    amount_match = re.search(r"Amount:\s*\$?([\d,]+)", full_text)
    if not amount_match:
        return None

    is_italic = bool(p_tag.find("em") or p_tag.find("i"))
    for child in p_tag.children:
        if isinstance(child, Tag) and child.name in ("em", "i"):
            is_italic = True
            break

    tpe = {
        "amount_remaining": parse_money(amount_match.group(1)),
        "source_player": None,
        "source_team": None,
        "initial_amount": None,
        "used_amount": None,
        "used_for": None,
        "expires": None,
        "apron_restricted": is_italic,
    }

    obtained_links = p_tag.find_all("a", string=re.compile(r"Obtained", re.I))
    if obtained_links:
        next_strong = obtained_links[0].find_next_sibling("strong")
        if next_strong:
            link = next_strong.find("a")
            tpe["source_player"] = (link or next_strong).get_text(strip=True)
        else:
            parent_next = obtained_links[0].next_sibling
            if parent_next and isinstance(parent_next, str):
                name = parent_next.strip().lstrip(":").strip()
                if name:
                    tpe["source_player"] = name

    team_in_parens = re.search(r"Obtained[^)]*?\)\s*\(([^)]+)\)", full_text)
    if not team_in_parens:
        after_obtained = full_text.split("Obtained", 1)[-1] if "Obtained" in full_text else ""
        parens = re.findall(r"\(([^)]+)\)", after_obtained)
        for p in parens:
            if not re.match(r"^\$?[\d,]+$", p.strip()):
                tpe["source_team"] = p.strip()
                break

    initial_match = re.search(r"Initial amount:\s*\$?([\d,]+)", full_text)
    if initial_match:
        tpe["initial_amount"] = parse_money(initial_match.group(1))

    used_links = p_tag.find_all("a", string=re.compile(r"Used", re.I))
    if used_links:
        next_strong = used_links[0].find_next_sibling("strong")
        if next_strong:
            link = next_strong.find("a")
            tpe["used_for"] = (link or next_strong).get_text(strip=True)
        used_amount_match = re.search(r"Used[^$]*\$?([\d,]+)", full_text)
        if used_amount_match:
            tpe["used_amount"] = parse_money(used_amount_match.group(1))

    expires_match = re.search(r"Expires:\s*(\d{1,2}/\d{1,2}/\d{2,4})", full_text)
    if expires_match:
        tpe["expires"] = parse_date(expires_match.group(1))

    if tpe["initial_amount"] and not tpe["used_amount"] and tpe["amount_remaining"] < tpe["initial_amount"]:
        tpe["used_amount"] = tpe["initial_amount"] - tpe["amount_remaining"]

    return tpe


def crawl():
    print(f"[1/3] 请求 {URL} ...")
    resp = requests.get(URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    html = resp.text

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    raw_path = RAW_DIR / "hoopsrumors_tpes.html"
    raw_path.write_text(html, encoding="utf-8")
    print(f"      原始 HTML 已保存: {raw_path} ({len(html)} bytes)")

    print("[2/3] 解析 TPE 数据 ...")
    soup = BeautifulSoup(html, "lxml")

    entry_content = soup.find("div", class_="entry-content")
    if not entry_content:
        entry_content = soup.find("article")
    if not entry_content:
        print("❌ 找不到内容区域")
        sys.exit(1)

    teams = {}
    current_team = None

    for element in entry_content.find_all(["h3", "p"]):
        if element.name == "h3":
            team_name = element.get_text(strip=True)
            abbrev = TEAM_ABBREV_MAP.get(team_name)
            if abbrev:
                current_team = team_name
                if current_team not in teams:
                    teams[current_team] = {"abbrev": abbrev, "tpes": []}
            else:
                current_team = None
            continue

        if current_team is None:
            continue

        tpe = parse_tpe_paragraph(element)
        if tpe:
            teams[current_team]["tpes"].append(tpe)

    total_tpes = sum(len(t["tpes"]) for t in teams.values())
    print(f"      解析完成: {len(teams)} 支球队, {total_tpes} 个 TPE")

    print("[3/3] 保存 JSON ...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / "team_tpes.json"

    result = {
        "source": "hoopsrumors.com",
        "url": URL,
        "updated": time.strftime("%Y-%m-%d"),
        "total_teams": len(teams),
        "total_tpes": total_tpes,
        "teams": teams,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"      ✅ 已保存: {output_path}")
    print(f"      文件大小: {output_path.stat().st_size / 1024:.1f} KB")

    print("\n      各队 TPE 汇总:")
    for team_name, data in sorted(teams.items(), key=lambda x: -sum(t["amount_remaining"] for t in x[1]["tpes"])):
        total = sum(t["amount_remaining"] for t in data["tpes"])
        if total > 0:
            print(f"      {data['abbrev']:>3}  ${total:>14,}  ({len(data['tpes'])} TPEs)")


if __name__ == "__main__":
    print("=" * 50)
    print("NBA TPE (Traded Player Exception) 爬虫")
    print("=" * 50)
    time.sleep(1)
    crawl()
    print("\n✅ 完成!")
