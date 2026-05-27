"""
爬取 HoopsRumors NBA 新闻
输出: data/output/news/news_hoopsrumors_{date}.json

数据源: https://www.hoopsrumors.com/

信息质量分级:
  S级(confirmed): 已确认事实 - "officially", "agreed to", "signed", "traded", "part ways", "fired"
  A级(reported):  权威报道   - Shams/Woj/Stein等知名记者报道
  B级(rumor):     交易流言   - "interested", "could", "might", "rumored"

HTML 结构:
  首页文章列表, 每篇文章在 <article> 或 <div class="post"> 中
  标题在 <h2 class="entry-title"><a> 中
  摘要在 <div class="entry-content"> 的前几段
  日期在 <time> 或 <span class="entry-date"> 中
"""
import json
import re
import time
import sys
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup, Tag

BASE_URL = "https://www.hoopsrumors.com/"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output" / "news"
RAW_DIR = Path(__file__).resolve().parents[1] / "raw" / "news"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

TEAM_EN_MAP = {
    "Hawks": "ATL", "Celtics": "BOS", "Nets": "BKN",
    "Hornets": "CHA", "Bulls": "CHI", "Cavaliers": "CLE",
    "Mavericks": "DAL", "Nuggets": "DEN", "Pistons": "DET",
    "Warriors": "GSW", "Rockets": "HOU", "Pacers": "IND",
    "Clippers": "LAC", "Lakers": "LAL", "Grizzlies": "MEM",
    "Heat": "MIA", "Bucks": "MIL", "Timberwolves": "MIN",
    "Pelicans": "NOP", "Knicks": "NYK",
    "Thunder": "OKC", "Magic": "ORL",
    "Sixers": "PHI", "76ers": "PHI", "Suns": "PHX",
    "Trail Blazers": "POR", "Blazers": "POR", "Kings": "SAC",
    "Spurs": "SAS", "Raptors": "TOR",
    "Jazz": "UTA", "Wizards": "WAS",
    "Atlanta": "ATL", "Boston": "BOS", "Brooklyn": "BKN",
    "Charlotte": "CHA", "Chicago": "CHI", "Cleveland": "CLE",
    "Dallas": "DAL", "Denver": "DEN", "Detroit": "DET",
    "Golden State": "GSW", "Houston": "HOU", "Indiana": "IND",
    "LA": "LAC", "Los Angeles": "LAL", "Memphis": "MEM",
    "Miami": "MIA", "Milwaukee": "MIL", "Minnesota": "MIN",
    "New Orleans": "NOP", "New York": "NYK",
    "Oklahoma City": "OKC", "Orlando": "ORL",
    "Philadelphia": "PHI", "Phoenix": "PHX",
    "Portland": "POR", "Sacramento": "SAC",
    "San Antonio": "SAS", "Toronto": "TOR",
    "Utah": "UTA", "Washington": "WAS",
}

S_KEYWORDS = [
    r"officially", r"agreed to", r"signed", r"traded",
    r"part ways", r"fired", r"hired", r"named",
    r"season-ending", r"surgery", r"torn", r"ACL", r"Achilles",
    r"announced", r"waived", r"claimed",
    r"exercised.*option", r"declined.*option",
    r"retired", r"extension", r"renamed",
    r"mutually agreed",
]

A_KEYWORDS = [
    r"Shams", r"Charania", r"Wojnarowski", r"Woj",
    r"Stein", r"Haynes", r"Amick", r"Shelburne",
    r"reports", r"expected to", r"closing in",
    r"serious interest", r"engaged in talks",
    r"planning to", r"likely to",
]

B_KEYWORDS = [
    r"interested", r"could", r"might", r"rumored",
    r"speculated", r"potential", r"possible",
    r"considering", r"exploring", r"monitoring",
    r"believed to", r"reported interest",
]

CATEGORY_MAP = {
    "trade": [r"trade", r"traded", r"deal", r"acquire", r"send"],
    "coach": [r"coach", r"head coach", r"fired", r"hired", r"part ways", r"firing"],
    "injury": [r"injury", r"injured", r"surgery", r"torn", r"ACL", r"Achilles", r"out for"],
    "contract": [r"contract", r"extension", r"option", r"waived", r"signed", r"free agent"],
    "draft": [r"draft", r"pick", r"lottery", r"combine", r"workout"],
    "playoff": [r"playoff", r"finals", r"series", r"game \d"],
    "front_office": [r"GM", r"president", r"executive", r"front office"],
}


def classify_news(title: str, excerpt: str = "") -> tuple[str, int, str]:
    text = f"{title} {excerpt}"
    level = "B"
    score = 0
    category = "other"

    for cat, keywords in CATEGORY_MAP.items():
        for kw in keywords:
            if re.search(kw, text, re.I):
                category = cat
                break
        if category != "other":
            break

    for kw in S_KEYWORDS:
        if re.search(kw, text, re.I):
            level = "S"
            score += 100
            break

    if level != "S":
        for kw in A_KEYWORDS:
            if re.search(kw, text, re.I):
                level = "A"
                score += 50
                break

    for kw in B_KEYWORDS:
        if re.search(kw, text, re.I):
            if level == "B":
                score += 10
            break

    return level, score, category


def extract_teams(title: str, excerpt: str = "") -> list[str]:
    text = f"{title} {excerpt}"
    teams = []
    for en_name, abbrev in TEAM_EN_MAP.items():
        pattern = r'\b' + re.escape(en_name) + r'\b'
        if re.search(pattern, text, re.I):
            if abbrev not in teams:
                teams.append(abbrev)
    return teams


def parse_date(date_str: str) -> str:
    m = re.search(r"(\w+ \d{1,2}),?\s*(\d{4})", date_str)
    if m:
        try:
            dt = datetime.strptime(f"{m.group(1)} {m.group(2)}", "%B %d %Y")
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            pass

    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", date_str)
    if m:
        return date_str[:10]

    return datetime.now().strftime("%Y-%m-%d")


def crawl_page(url: str) -> list[dict]:
    print(f"  请求: {url}")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    html = resp.text

    soup = BeautifulSoup(html, "lxml")
    news_items = []

    articles = soup.find_all("article")
    if not articles:
        articles = soup.find_all("div", class_=re.compile(r"post|entry"))

    for article in articles:
        title_tag = article.find(["h2", "h3"], class_=re.compile(r"entry-title|post-title|title"))
        if not title_tag:
            title_tag = article.find(["h2", "h3"])

        if not title_tag:
            continue

        link_tag = title_tag.find("a", href=True)
        if not link_tag:
            continue

        title = link_tag.get_text(strip=True)
        href = link_tag["href"]

        if not title or not href:
            continue

        excerpt = ""
        content_div = article.find("div", class_=re.compile(r"entry-content|post-content|excerpt"))
        if content_div:
            paragraphs = content_div.find_all("p")
            excerpt = " ".join(p.get_text(strip=True) for p in paragraphs[:2])

        date_str = ""
        time_tag = article.find("time")
        if time_tag:
            date_str = time_tag.get("datetime", "") or time_tag.get_text(strip=True)
        if not date_str:
            date_span = article.find("span", class_=re.compile(r"date|time|meta"))
            if date_span:
                date_str = date_span.get_text(strip=True)

        author = ""
        author_tag = article.find("span", class_=re.compile(r"author|byline"))
        if author_tag:
            author = author_tag.get_text(strip=True)
        if not author:
            author_link = article.find("a", href=re.compile(r"author"))
            if author_link:
                author = author_link.get_text(strip=True)

        news_date = parse_date(date_str)
        level, score, category = classify_news(title, excerpt)
        teams = extract_teams(title, excerpt)

        news_items.append({
            "title": title,
            "url": href,
            "author": author,
            "date": news_date,
            "excerpt": excerpt[:500] if excerpt else "",
            "level": level,
            "score": score,
            "category": category,
            "teams": teams,
        })

    return news_items


def crawl(pages: int = 2):
    print(f"[1/3] 爬取 HoopsRumors 新闻 (前 {pages} 页) ...")
    all_news = []
    seen_urls = set()

    urls = [BASE_URL]
    for i in range(2, pages + 1):
        urls.append(f"{BASE_URL}page/{i}/")

    for url in urls:
        try:
            items = crawl_page(url)
            for item in items:
                if item["url"] not in seen_urls:
                    seen_urls.add(item["url"])
                    all_news.append(item)
            time.sleep(2)
        except Exception as e:
            print(f"  ⚠️ 爬取失败 {url}: {e}")
            continue

    print(f"      共获取 {len(all_news)} 条新闻")

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    today = datetime.now().strftime("%Y-%m-%d")

    print("[2/3] 分类与去重 ...")

    all_news.sort(key=lambda x: x["score"], reverse=True)

    s_count = sum(1 for n in all_news if n["level"] == "S")
    a_count = sum(1 for n in all_news if n["level"] == "A")
    b_count = sum(1 for n in all_news if n["level"] == "B")
    print(f"      S级(已确认): {s_count}  A级(权威报道): {a_count}  B级(流言): {b_count}")

    print("[3/3] 保存 JSON ...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"news_hoopsrumors_{today}.json"

    result = {
        "source": "hoopsrumors.com",
        "url": BASE_URL,
        "crawled_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total": len(all_news),
        "stats": {
            "S_confirmed": s_count,
            "A_reported": a_count,
            "B_rumor": b_count,
        },
        "news": all_news,
    }

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"      ✅ 已保存: {output_path}")
    print(f"      文件大小: {output_path.stat().st_size / 1024:.1f} KB")

    if s_count > 0:
        print(f"\n      🔴 S级 - 已确认事实:")
        for n in all_news:
            if n["level"] == "S":
                teams_str = ",".join(n["teams"]) if n["teams"] else "?"
                print(f"         [{teams_str}] {n['title']}")

    if a_count > 0:
        print(f"\n      🟡 A级 - 权威报道:")
        for n in all_news:
            if n["level"] == "A":
                teams_str = ",".join(n["teams"]) if n["teams"] else "?"
                print(f"         [{teams_str}] {n['title']}")

    return result


if __name__ == "__main__":
    print("=" * 50)
    print("HoopsRumors NBA 新闻爬虫")
    print("=" * 50)
    time.sleep(0.5)

    page_count = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    crawl(pages=page_count)
    print("\n✅ 完成!")
