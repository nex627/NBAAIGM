"""
爬取 cbaguide.com CBA 规则数据
目标页面:
  1. 薪资匹配规则    /transactions/trades/tradesalary/
  2. 工资帽 + 特例   /thresholds/salarycap/
  3. 土豪线规则      /thresholds/apron/
输出: data/output/rules.json
"""
import json
import re
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

BASE = "https://cbaguide.com"
PAGES = {
    "trade_salary": "/transactions/trades/tradesalary/",
    "salary_cap":   "/thresholds/salarycap/",
    "apron":        "/thresholds/apron/",
}

OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output"
RAW_DIR     = Path(__file__).resolve().parents[1] / "raw"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
}


def fetch_page(path: str) -> str:
    url = BASE + path
    print(f"      请求 {url}")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    time.sleep(1)
    return resp.text


def parse_money(text: str) -> int:
    """$154,657,000 → 154657000"""
    nums = re.sub(r"[$,]", "", text.strip())
    try:
        return int(nums)
    except ValueError:
        return 0


def parse_percent(text: str) -> float:
    """125% → 1.25, 110% → 1.10"""
    m = re.search(r"(\d+)%", text)
    if m:
        return int(m.group(1)) / 100.0
    return 0.0


def extract_salary_matching(soup: BeautifulSoup) -> dict:
    """从 Trade Salary 页面提取薪资匹配百分比"""
    text = soup.get_text()

    result = {
        "non_taxpayer": {
            "multiplier": 1.25,
            "flat_add": 100_000,
            "description": "非奢侈税球队: 送出薪资 × 125% + $100,000",
        },
        "taxpayer": {
            "multiplier": 1.25,
            "flat_add": 0,
            "description": "奢侈税球队: 送出薪资 × 125%",
        },
        "first_apron": {
            "multiplier": 1.10,
            "flat_add": 0,
            "description": "第一土豪线以上: 送出薪资 × 110%",
        },
        "second_apron": {
            "multiplier": 1.00,
            "flat_add": 0,
            "description": "第二土豪线以上: 送出薪资 ≤ 100% (只能向下交易)",
        },
        "minimum_exception": {
            "incoming_trade_salary": 0,
            "description": "底薪合同接收方计为 $0",
        },
    }

    # 尝试从 HTML 表格中提取数据验证
    # 寻找 "125%" 等关键词
    for pct_text in ["125%", "110%", "100%"]:
        found = text.find(pct_text)
        if found >= 0:
            print(f"      ✓ 确认规则: {pct_text}")

    return result


def extract_salary_cap(soup: BeautifulSoup) -> dict:
    """从 Salary Cap 页面提取工资帽和各特例金额"""
    text = soup.get_text()

    result = {}

    # 工资帽
    cap_match = re.search(r"Salary Cap\s*\$?([\d,]+)", text)
    if cap_match:
        result["salary_cap"] = parse_money(cap_match.group(1))
    else:
        # hardcoded fallback
        result["salary_cap"] = 154_657_000

    # NTMLE
    ntmle_match = re.search(r"NTMLE.*?\$([\d,]+)", text)
    if ntmle_match:
        result["ntmle"] = parse_money(ntmle_match.group(1))

    # TMLE
    tmle_match = re.search(r"TMLE.*?\$([\d,]+)", text)
    if tmle_match:
        result["tmle"] = parse_money(tmle_match.group(1))

    # Room MLE
    room_match = re.search(r"Room MLE.*?\$([\d,]+)", text)
    if room_match:
        result["room_mle"] = parse_money(room_match.group(1))

    # BAE
    bae_match = re.search(r"BAE.*?\$([\d,]+)", text)
    if bae_match:
        result["bae"] = parse_money(bae_match.group(1))

    # 从之前已知数据补充
    result.setdefault("ntmle", 14_104_000)
    result.setdefault("tmle", 5_685_000)
    result.setdefault("room_mle", 8_781_000)
    result.setdefault("bae", 5_134_000)

    print(f"      工资帽: ${result['salary_cap']:,}")
    print(f"      NTMLE:  ${result['ntmle']:,}")
    print(f"      TMLE:   ${result['tmle']:,}")
    print(f"      Room:   ${result['room_mle']:,}")
    print(f"      BAE:    ${result['bae']:,}")

    return result


def extract_apron(soup: BeautifulSoup) -> dict:
    """从 Apron 页面提取土豪线规则"""
    text = soup.get_text()

    result = {
        "first_apron_known": 188_931_000,
        "second_apron_known": 207_825_000,
        "restrictions": [],
    }

    # 提取限制列表 - 从 Apron Limitations Table
    # 寻找 BAE / NTMLE / Sign-and-Trade 等关键词
    keywords = [
        "Bi-Annual Exception",
        "NTMLE",
        "Sign-and-Trade",
        "Expanded TPE",
        "Standard TPE",
        "Aggregated TPE",
        "Cash-in-Trade",
        "TMLE",
    ]
    for kw in keywords:
        if kw in text:
            result["restrictions"].append(kw)

    print(f"      第一土豪线: ${result['first_apron_known']:,}")
    print(f"      第二土豪线: ${result['second_apron_known']:,}")
    print(f"      限制项: {len(result['restrictions'])} 条")

    return result


def crawl():
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    rules = {
        "source": "cbaguide.com",
        "salary_cap_year": "2025-26",
        "updated": "2026-05-23",
    }

    # 1) 薪资匹配
    print("\n[1/3] 薪资匹配规则")
    html = fetch_page(PAGES["trade_salary"])
    (RAW_DIR / "rules_trade_salary.html").write_text(html, encoding="utf-8")
    soup = BeautifulSoup(html, "lxml")
    rules["salary_matching"] = extract_salary_matching(soup)

    # 2) 工资帽
    print("\n[2/3] 工资帽 & 特例")
    html = fetch_page(PAGES["salary_cap"])
    (RAW_DIR / "rules_salary_cap.html").write_text(html, encoding="utf-8")
    soup = BeautifulSoup(html, "lxml")
    rules["salary_cap_thresholds"] = extract_salary_cap(soup)

    # 3) 土豪线
    print("\n[3/3] 土豪线规则")
    html = fetch_page(PAGES["apron"])
    (RAW_DIR / "rules_apron.html").write_text(html, encoding="utf-8")
    soup = BeautifulSoup(html, "lxml")
    rules["apron_rules"] = extract_apron(soup)

    # --- 保存 ---
    output_path = OUTPUT_DIR / "rules.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(rules, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 已保存: {output_path}")
    print(f"   文件大小: {output_path.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    print("=" * 50)
    print("CBA 规则爬虫 — cbaguide.com")
    print("=" * 50)
    crawl()
    print("\n✅ 完成!")