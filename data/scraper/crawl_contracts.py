import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup, Tag

BASE = "https://www.spotrac.com"
LIST_URL = f"{BASE}/nba/contracts/_/year/2025/sort/value"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output"
RAW_DIR = Path(__file__).resolve().parents[1] / "raw"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
}

TEAMS = [
    "atl", "bos", "bkn", "cha", "chi", "cle", "dal", "den", "det", "gsw",
    "hou", "ind", "lac", "lal", "mem", "mia", "mil", "min", "nop", "nyk",
    "okc", "orl", "phi", "phx", "por", "sac", "sas", "tor", "uta", "was",
]

SIGNING_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028]


def parse_money(value: str) -> int | None:
    if not value or value.strip() == "":
        return None
    cleaned = re.sub(r"[$,]", "", value.strip())
    try:
        return int(cleaned)
    except ValueError:
        return None


def parse_team_abbr(cell) -> str:
    text = cell.get_text(" ", strip=True)
    match = re.search(r"\b([A-Z]{2,3})\b", text)
    if not match:
        return text.strip()
    return match.group(1)


def crawl_team_all(team: str) -> list[dict]:
    url = f"{BASE}/nba/contracts/_/team/{team}/sort/value"
    print(f"  请求球队页: {team.upper()} -> {url}")
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"  ❌ 请求失败: {e}")
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    table = soup.select_one("table")
    if not table:
        print(f"  ❌ {team.upper()} 找不到表格")
        return []

    rows = table.select("tbody tr")
    print(f"  {team.upper()}: {len(rows)} 行")

    players = []
    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 8:
            continue

        a_tag = cells[0].find("a")
        if not a_tag:
            continue

        name = a_tag.get_text(strip=True)
        href = a_tag.get("href", "")

        spotrac_id = None
        id_match = re.search(r"/id/(\d+)/", href)
        if id_match:
            spotrac_id = int(id_match.group(1))

        pos = cells[1].get_text(strip=True)
        team_abbr = parse_team_abbr(cells[2])
        age_at_signing = cells[3].get_text(strip=True)
        start_year = cells[4].get_text(strip=True)
        end_year = cells[5].get_text(strip=True)
        years = cells[6].get_text(strip=True)
        total_value = parse_money(cells[7].get_text(strip=True))
        aav = parse_money(cells[8].get_text(strip=True))

        players.append({
            "name": name,
            "spotrac_id": spotrac_id,
            "pos": pos,
            "team": team_abbr,
            "age_at_signing": age_at_signing,
            "contract_start": start_year,
            "contract_end": end_year,
            "contract_years": years,
            "total_value": total_value,
            "aav": aav,
        })

    return players


def crawl_year_page(year: int) -> list[dict]:
    url = f"{BASE}/nba/contracts/_/year/{year}/sort/value"
    print(f"  请求年份页: {year} -> {url}")
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"  ❌ 请求失败: {e}")
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    table = soup.select_one("table")
    if not table:
        print(f"  ❌ {year} 找不到表格")
        return []

    rows = table.select("tbody tr")
    print(f"  {year}: {len(rows)} 行")

    players = []
    for row in rows:
        cells = row.find_all("td")
        if len(cells) < 8:
            continue

        a_tag = cells[0].find("a")
        if not a_tag:
            continue

        name = a_tag.get_text(strip=True)
        href = a_tag.get("href", "")

        spotrac_id = None
        id_match = re.search(r"/id/(\d+)/", href)
        if id_match:
            spotrac_id = int(id_match.group(1))

        pos = cells[1].get_text(strip=True)
        team_abbr = parse_team_abbr(cells[2])
        age_at_signing = cells[3].get_text(strip=True)
        start_year = cells[4].get_text(strip=True)
        end_year = cells[5].get_text(strip=True)
        years = cells[6].get_text(strip=True)
        total_value = parse_money(cells[7].get_text(strip=True))
        aav = parse_money(cells[8].get_text(strip=True))

        players.append({
            "name": name,
            "spotrac_id": spotrac_id,
            "pos": pos,
            "team": team_abbr,
            "age_at_signing": age_at_signing,
            "contract_start": start_year,
            "contract_end": end_year,
            "contract_years": years,
            "total_value": total_value,
            "aav": aav,
            "signing_year": year,
        })

    return players


def crawl_all_players() -> list[dict]:
    all_players = []
    seen_ids = set()

    print("  === 阶段1: 按球队抓取 (不限年份) ===")
    for i, team in enumerate(TEAMS):
        time.sleep(1.5)
        players = crawl_team_all(team)
        new_count = 0
        for p in players:
            if p["spotrac_id"] not in seen_ids:
                seen_ids.add(p["spotrac_id"])
                all_players.append(p)
                new_count += 1
            else:
                existing = next((x for x in all_players if x["spotrac_id"] == p["spotrac_id"]), None)
                if existing and p.get("total_value") and existing.get("total_value"):
                    if (p["total_value"] or 0) > (existing["total_value"] or 0):
                        idx = all_players.index(existing)
                        all_players[idx] = p
                        print(f"    更新合同: {p['name']} (更大合同 {p['total_value']} > {existing['total_value']})")

        print(f"  {team.upper()}: {len(players)} 行, 新增 {new_count}, 累计: {len(all_players)} 人 ({i+1}/{len(TEAMS)})")

        if (i + 1) % 5 == 0:
            _save_intermediate(all_players)

    print(f"\n  阶段1完成: {len(all_players)} 人")

    print("\n  === 阶段2: 按年份补充 ===")
    for i, year in enumerate(SIGNING_YEARS):
        time.sleep(1.5)
        players = crawl_year_page(year)
        new_count = 0
        for p in players:
            if p["spotrac_id"] not in seen_ids:
                seen_ids.add(p["spotrac_id"])
                all_players.append(p)
                new_count += 1

        if new_count > 0:
            print(f"  {year}: 补充 {new_count} 人, 累计: {len(all_players)} 人")

    print(f"\n  阶段2完成: {len(all_players)} 人")

    return all_players


def _save_intermediate(all_players: list[dict]):
    out_path = OUTPUT_DIR / "contracts.json"
    result = {
        "source": "spotrac.com",
        "updated": time.strftime("%Y-%m-%d"),
        "total": len(all_players),
        "players": all_players,
    }
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  💾 中间保存: {len(all_players)} 人")


def parse_contract_notes(soup) -> dict:
    result = {
        "no_trade_clause": False,
        "trade_kicker": None,
        "trade_kicker_pct": None,
        "option_years": [],
        "contract_notes": [],
    }

    notes_section = None
    notes_div = soup.find("div", class_="notes")
    if notes_div:
        notes_section = notes_div.find("ul")
    if not notes_section:
        notes_section = soup.find("ul", class_="contractnotes")
    if not notes_section:
        for ul in soup.find_all("ul"):
            parent = ul.parent
            if parent and isinstance(parent, Tag):
                parent_text = parent.get_text()
                if "Contract Notes" in parent_text:
                    notes_section = ul
                    break

    if not notes_section:
        return result

    for li in notes_section.find_all("li"):
        note_text = li.get_text(strip=True)
        result["contract_notes"].append(note_text)
        lower = note_text.lower()

        if "no-trade" in lower or "ntc" in lower or "trade veto" in lower:
            result["no_trade_clause"] = True

        tk_match = re.search(r"(\d+)%?\s*(?:Trade\s*Bonus|Trade\s*Kicker)", note_text, re.IGNORECASE)
        if tk_match:
            result["trade_kicker"] = True
            result["trade_kicker_pct"] = int(tk_match.group(1))
        elif "trade bonus" in lower or "trade kicker" in lower:
            result["trade_kicker"] = True
            pct_match = re.search(r"(\d+)%", note_text)
            if pct_match:
                result["trade_kicker_pct"] = int(pct_match.group(1))

        if "player option" in lower or "po" in lower.split():
            opt_match = re.search(r"(\d{4})-\d{2}", note_text)
            if opt_match:
                result["option_years"].append({"year": opt_match.group(0), "type": "PO"})
        if "team option" in lower or "to" in lower.split():
            opt_match = re.search(r"(\d{4})-\d{2}", note_text)
            if opt_match:
                result["option_years"].append({"year": opt_match.group(0), "type": "TO"})
        if "early termination" in lower or "eto" in lower.split():
            opt_match = re.search(r"(\d{4})-\d{2}", note_text)
            if opt_match:
                result["option_years"].append({"year": opt_match.group(0), "type": "ETO"})

    return result


def parse_option_from_table(soup) -> list[dict]:
    options = []
    tables = soup.find_all("table")
    for table in tables:
        rows = table.select("tbody tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 2:
                continue
            season = cells[0].get_text(strip=True)
            if not re.match(r"^\d{4}-\d{2}$", season):
                continue
            for cell in cells:
                text = cell.get_text(strip=True)
                lower = text.lower()
                if "p/o" in lower or "player option" in lower or ("player" in lower and "option" in lower):
                    options.append({"year": season, "type": "PO"})
                elif "t/o" in lower or "team option" in lower or "club option" in lower:
                    options.append({"year": season, "type": "TO"})
                elif "eto" in lower or "early termination" in lower:
                    options.append({"year": season, "type": "ETO"})
                elif text == "UFA":
                    options.append({"year": season, "type": "UFA"})
                elif text == "RFA":
                    options.append({"year": season, "type": "RFA"})
    return options


def crawl_player_detail(spotrac_id: int, slug: str = "") -> dict | None:
    url = f"{BASE}/nba/player/_/id/{spotrac_id}/{slug}" if slug else f"{BASE}/nba/player/_/id/{spotrac_id}"
    print(f"    详情页: {url}")
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30)
        resp.raise_for_status()
    except Exception as e:
        print(f"    ⚠️ 请求失败: {e}")
        return None

    soup = BeautifulSoup(resp.text, "lxml")

    yearly = []
    table = soup.select_one("table.contract-breakdown")
    if not table:
        table = soup.select_one("table.salaryTable, table.salary, table")
    if table:
        rows = table.select("tbody tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 4:
                continue
            season = cells[0].get_text(strip=True)
            if not re.match(r"^\d{4}-\d{2}$|^\d{4}$", season):
                continue

            salary = 0
            for idx in range(1, min(len(cells), 8)):
                val = parse_money(cells[idx].get_text(strip=True))
                if val is not None and val > 100000:
                    salary = val
                    break

            status = ""
            for cell in reversed(cells):
                text = cell.get_text(strip=True)
                if text in ("UFA", "RFA", "PO", "TO", "ETO", "P/O", "T/O"):
                    status = text
                    break
            if not status:
                for cell in cells:
                    text = cell.get_text(strip=True).lower()
                    if "player option" in text or "p/o" in text:
                        status = "PO"
                        break
                    elif "team option" in text or "club option" in text or "t/o" in text:
                        status = "TO"
                        break
                    elif "eto" in text or "early termination" in text:
                        status = "ETO"
                        break

            yearly.append({
                "season": season,
                "salary": salary,
                "status": status,
            })

    contract_notes = parse_contract_notes(soup)
    table_options = parse_option_from_table(soup)

    existing_years = {o["year"] for o in contract_notes["option_years"]}
    for opt in table_options:
        if opt["year"] not in existing_years and opt["type"] in ("PO", "TO", "ETO"):
            contract_notes["option_years"].append(opt)
            existing_years.add(opt["year"])

    fa_year = None
    fa_type = None
    for opt in table_options:
        if opt["type"] in ("UFA", "RFA"):
            fa_year = opt["year"]
            fa_type = opt["type"]
            break

    if not fa_year:
        fa_div = soup.find("div", class_="value", string=re.compile(r"\d{4}\s*/\s*(UFA|RFA)"))
        if fa_div:
            fa_match = re.search(r"(\d{4})\s*/\s*(UFA|RFA)", fa_div.get_text(strip=True))
            if fa_match:
                fa_year = fa_match.group(1) + "-" + str(int(fa_match.group(1)) + 1)[-2:]
                fa_type = fa_match.group(2)

    if not fa_year:
        fa_text = soup.find(string=re.compile(r"Free Agent:\s*\d{4}\s*/\s*(UFA|RFA)"))
        if fa_text:
            fa_match = re.search(r"(\d{4})\s*/\s*(UFA|RFA)", fa_text)
            if fa_match:
                fa_year = fa_match.group(1) + "-" + str(int(fa_match.group(1)) + 1)[-2:]
                fa_type = fa_match.group(2)

    if not fa_year:
        all_text = soup.get_text()
        fa_match = re.search(r"(\d{4})\s*/\s*(UFA|RFA)", all_text)
        if fa_match:
            fa_year = fa_match.group(1) + "-" + str(int(fa_match.group(1)) + 1)[-2:]
            fa_type = fa_match.group(2)

    result = {}
    if yearly:
        result["yearly_salary"] = yearly
    result.update(contract_notes)
    if fa_year:
        result["free_agent_year"] = fa_year
        result["free_agent_type"] = fa_type

    return result if result else None


def main(fetch_detail: bool = False, max_detail: int = 30, start: int = 0, delay: float = 1.5, refresh_list: bool = False):
    print("=" * 60)
    print("Spotrac NBA 合同爬虫 (球队+年份)")
    print("=" * 60)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    existing_path = OUTPUT_DIR / "contracts.json"
    all_players = None

    if not refresh_list and existing_path.exists():
        print("\n[1] 读取已有 contracts.json ...")
        try:
            with open(existing_path, "r", encoding="utf-8") as f:
                existing = json.load(f)
            all_players = existing.get("players", [])
            unique_ids = set()
            deduped = []
            for p in all_players:
                if p.get("spotrac_id") not in unique_ids:
                    unique_ids.add(p.get("spotrac_id"))
                    deduped.append(p)
            all_players = deduped
            print(f"  已有 {len(all_players)} 条合同 (去重后)")
        except Exception as e:
            print(f"  ⚠️ 读取失败: {e}，将重新爬取")

    if all_players is None or refresh_list:
        print("\n[1] 爬取合同列表 (球队+年份)...")
        all_players = crawl_all_players()
        print(f"\n  总计: {len(all_players)} 条合同 (去重)")

    if fetch_detail and all_players:
        need_detail = []
        for p in all_players:
            if "yearly_salary" in p and p.get("yearly_salary"):
                continue
            need_detail.append(p)

        total_need = len(need_detail)
        batch = need_detail[start:start + max_detail]
        print(f"\n[2] 爬取逐年薪资明细 ...")
        print(f"  需要详情: {total_need} 人, 本次: {len(batch)} 人 (start={start})")

        success = 0
        fail = 0
        for i, p in enumerate(batch):
            time.sleep(delay)
            detail = crawl_player_detail(p["spotrac_id"])
            if detail:
                p.update(detail)
                success += 1
            else:
                fail += 1

            if (i + 1) % 10 == 0:
                print(f"  进度: {i + 1}/{len(batch)} (✅{success} ❌{fail})")
                out_path = OUTPUT_DIR / "contracts.json"
                result = {
                    "source": "spotrac.com",
                    "updated": time.strftime("%Y-%m-%d"),
                    "total": len(all_players),
                    "players": all_players,
                }
                out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

        print(f"\n  本批完成: ✅{success} ❌{fail}")

        still_need = total_need - success
        if still_need > 0 and start + max_detail < total_need:
            next_start = start + max_detail
            print(f"  剩余: {still_need} 人, 下一批: --start {next_start} --max {max_detail}")

    print(f"\n[3] 保存 {OUTPUT_DIR / 'contracts.json'} ...")
    result = {
        "source": "spotrac.com",
        "updated": time.strftime("%Y-%m-%d"),
        "total": len(all_players),
        "players": all_players,
    }
    out_path = OUTPUT_DIR / "contracts.json"
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  已保存: {out_path} ({out_path.stat().st_size:,} bytes)")

    if fetch_detail:
        has_detail = sum(1 for p in all_players if "yearly_salary" in p and p.get("yearly_salary"))
        no_detail = len(all_players) - has_detail
        print(f"\n  📊 详情统计: {has_detail} 人有详情 / {no_detail} 人待抓取")

    print("\n✅ 完成")


if __name__ == "__main__":
    fetch = "--detail" in sys.argv
    max_n = int(sys.argv[sys.argv.index("--max") + 1]) if "--max" in sys.argv else 30
    start_n = int(sys.argv[sys.argv.index("--start") + 1]) if "--start" in sys.argv else 0
    delay_n = float(sys.argv[sys.argv.index("--delay") + 1]) if "--delay" in sys.argv else 1.5
    refresh = "--refresh" in sys.argv
    main(fetch_detail=fetch, max_detail=max_n, start=start_n, delay=delay_n, refresh_list=refresh)
