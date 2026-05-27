"""
爬取虎扑 NBA 新闻流
输出: data/output/news/news_hupu_{date}.json

数据源: https://voice.hupu.com/nba/1 (Next.js SSR)

数据提取: 页面 HTML 中 <script id="__NEXT_DATA__"> 包含完整 JSON 数据
  pageProps.data: 新闻列表
  每条: { nid, title, time, origin, url, img, replies }

信息质量分级:
  S级(confirmed): 已确认事实 - "官方宣布"、"正式签约"、"交易完成"、"被解雇"
  A级(reported):  权威报道   - Shams/Woj/Haynes等知名记者、ESPN/The Athletic报道
  B级(rumor):     交易流言   - "据传"、"可能"、"有意"、"感兴趣"
"""
import json
import re
import time
import sys
from datetime import datetime, timedelta
from pathlib import Path

import requests

BASE_URL = "https://voice.hupu.com/nba/"
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output" / "news"
RAW_DIR = Path(__file__).resolve().parents[1] / "raw" / "news"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
}

TEAM_CN_MAP = {
    "老鹰": "ATL", "凯尔特人": "BOS", "篮网": "BKN",
    "黄蜂": "CHA", "公牛": "CHI", "骑士": "CLE",
    "独行侠": "DAL", "掘金": "DEN", "活塞": "DET",
    "勇士": "GSW", "火箭": "HOU", "步行者": "IND",
    "快船": "LAC", "湖人": "LAL", "灰熊": "MEM",
    "热火": "MIA", "雄鹿": "MIL", "森林狼": "MIN",
    "鹈鹕": "NOP", "尼克斯": "NYK",
    "雷霆": "OKC", "魔术": "ORL",
    "76人": "PHI", "太阳": "PHX",
    "开拓者": "POR", "国王": "SAC",
    "马刺": "SAS", "猛龙": "TOR",
    "爵士": "UTA", "奇才": "WAS",
    "达拉斯": "DAL", "波士顿": "BOS", "布鲁克林": "BKN",
    "费城": "PHI", "密尔沃基": "MIL", "金州": "GSW",
    "洛杉矶": "LAL", "圣安东尼奥": "SAS", "俄克拉荷马": "OKC",
    "新奥尔良": "NOP", "明尼苏达": "MIN", "萨克拉门托": "SAC",
    "印第安纳": "IND", "波特兰": "POR", "孟菲斯": "MEM",
    "奥兰多": "ORL", "犹他": "UTA", "华盛顿": "WAS",
    "休斯顿": "HOU", "迈阿密": "MIA", "丹佛": "DEN",
    "底特律": "DET", "夏洛特": "CHA", "亚特兰大": "ATL",
    "芝加哥": "CHI", "克利夫兰": "CLE", "多伦多": "TOR",
    "凤凰城": "PHX",
}

S_KEYWORDS = [
    "官方宣布", "正式签约", "正式加盟", "交易完成", "正式交易",
    "被解雇", "已解雇", "下课", "辞职", "宣布退役",
    "赛季报销", "确认缺席", "遭遇.*撕裂", "骨折", "韧带撕裂",
    "ACL撕裂", "跟腱撕裂", "十字韧带",
    "当选", "荣获", "签下", "裁掉", "买断.*达成",
    "执行.*选项", "拒绝.*选项", "续约.*达成",
    "选中", "签回", "分道扬镳",
]

A_KEYWORDS = [
    "Shams", "Woj", "Haynes", "Charania", "Stein",
    "据ESPN", "据The Athletic", "据TA", "据Sportsnet",
    "据名记", "据资深记者",
    "预计将", "接近达成", "即将", "有望签约",
    "有意.*交易", "计划.*交易",
]

B_KEYWORDS = [
    "据传", "可能", "有意", "感兴趣", "或被交易",
    "传闻", "猜测", "分析.*认为", "媒体.*认为",
    "或将", "考虑.*交易", "潜在.*目标",
    "绯闻", "流言",
]

SOURCES_HIGH = ["NBA官网", "球队官方", "官方"]
SOURCES_MEDIUM = ["ESPN", "The Athletic", "Sportsnet", "X", "Twitter"]
SOURCES_LOW = ["虎扑", "微博", "Instagram"]


def classify_news(title: str, source: str) -> tuple[str, int]:
    level = "B"
    score = 0

    for kw in S_KEYWORDS:
        if re.search(kw, title):
            level = "S"
            score += 100
            break

    if level != "S":
        for kw in A_KEYWORDS:
            if re.search(kw, title):
                level = "A"
                score += 50
                break

    if level == "S":
        for src in SOURCES_HIGH:
            if src in source:
                score += 30
                break
    elif level == "A":
        for src in SOURCES_MEDIUM:
            if src in source:
                score += 20
                break

    for kw in B_KEYWORDS:
        if re.search(kw, title):
            if level == "B":
                score += 10
            break

    return level, score


def extract_teams(title: str) -> list[str]:
    teams = []
    for cn_name, abbrev in TEAM_CN_MAP.items():
        if cn_name in title:
            if abbrev not in teams:
                teams.append(abbrev)
    return teams


def parse_time_ago(time_str: str) -> str:
    today = datetime.now()
    time_str = time_str.strip()

    m = re.match(r"(\d+)\s*小时前", time_str)
    if m:
        return today.strftime("%Y-%m-%d")

    m = re.match(r"(\d+)\s*分钟前", time_str)
    if m:
        return today.strftime("%Y-%m-%d")

    m = re.match(r"(\d+)\s*天前", time_str)
    if m:
        days = int(m.group(1))
        return (today - timedelta(days=days)).strftime("%Y-%m-%d")

    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", time_str)
    if m:
        return time_str[:10]

    return today.strftime("%Y-%m-%d")


def crawl_page(page: int = 1) -> list[dict]:
    url = f"{BASE_URL}{page}"
    print(f"  请求第 {page} 页: {url}")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    resp.encoding = "utf-8"
    html = resp.text

    m = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html)
    if not m:
        print(f"  ⚠️ 第 {page} 页未找到 __NEXT_DATA__")
        return []

    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        print(f"  ⚠️ 第 {page} 页 JSON 解析失败")
        return []

    items = data.get("props", {}).get("pageProps", {}).get("data", [])
    if not items:
        print(f"  ⚠️ 第 {page} 页无数据")
        return []

    news_items = []
    for item in items:
        title = item.get("title", "").strip()
        if not title:
            continue

        href = item.get("url", "")
        source = item.get("origin", "")
        time_text = item.get("time", "")
        replies = item.get("replies", 0)

        level, score = classify_news(title, source)
        teams = extract_teams(title)
        news_date = parse_time_ago(time_text)

        news_items.append({
            "title": title,
            "url": href,
            "source": source,
            "time_ago": time_text,
            "date": news_date,
            "replies": replies,
            "level": level,
            "score": score,
            "teams": teams,
        })

    return news_items


def crawl(pages: int = 3):
    print(f"[1/3] 爬取虎扑 NBA 新闻 (前 {pages} 页) ...")
    all_news = []
    seen_titles = set()

    for page in range(1, pages + 1):
        try:
            items = crawl_page(page)
            for item in items:
                if item["title"] not in seen_titles:
                    seen_titles.add(item["title"])
                    all_news.append(item)
            time.sleep(1)
        except Exception as e:
            print(f"  ⚠️ 第 {page} 页爬取失败: {e}")
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
    output_path = OUTPUT_DIR / f"news_hupu_{today}.json"

    result = {
        "source": "hupu.com",
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
    print("虎扑 NBA 新闻爬虫")
    print("=" * 50)
    time.sleep(0.5)

    page_count = int(sys.argv[1]) if len(sys.argv) > 1 else 3
    crawl(pages=page_count)
    print("\n✅ 完成!")
