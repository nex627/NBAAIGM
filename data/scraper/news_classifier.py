"""
NBA 新闻分类器
输入: data/output/news/news_hupu_{date}.json + news_hoopsrumors_{date}.json
输出: data/output/news/changes_{date}.json + data/output/news/changes_{date}.md

功能:
  1. 合并多源新闻，按事件去重（同一事件虎扑+HoopsRumors各报一次→合并）
  2. 交叉验证：多源报道的事件提升可信度
  3. 生成每日变更清单（JSON + Markdown）
  4. 识别影响球队档案的事件，标注需更新的文件

事件类型与档案影响映射:
  coach_change   → {team}/team-profiles/{ABBREV}.md 第5节"教练体系"
  gm_change      → {team}/team-profiles/{ABBREV}.md 第3节"总经理"
  trade          → {team}/team-profiles/{ABBREV}.md 第2/8节
  injury         → {team}/team-profiles/{ABBREV}.md 第2节
  contract       → {team}/team-profiles/{ABBREV}.md 第6节
  draft          → {team}/team-profiles/{ABBREV}.md 第7节
  front_office   → {team}/team-profiles/{ABBREV}.md 第3/4节
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parents[1] / "output" / "news"

EVENT_TYPE_MAP = {
    "coach": "coach_change",
    "front_office": "front_office",
    "trade": "trade",
    "injury": "injury",
    "contract": "contract",
    "draft": "draft",
    "playoff": "playoff",
    "other": "other",
}

PROFILE_SECTION_MAP = {
    "coach_change": "第5节「教练体系」",
    "front_office": "第3/4节「总经理/老板」",
    "trade": "第2/8节「核心球员/交易偏好」",
    "injury": "第2节「核心球员状态」",
    "contract": "第6节「薪资状况」",
    "draft": "第7节「选秀权状况」",
    "playoff": "",
    "other": "",
}

EVENT_PRIORITY = {
    "coach_change": 1,
    "front_office": 2,
    "trade": 3,
    "injury": 4,
    "contract": 5,
    "draft": 6,
    "playoff": 7,
    "other": 8,
}


def load_news(source: str, date: str) -> list[dict]:
    filename = f"news_{source}_{date}.json"
    path = OUTPUT_DIR / filename
    if not path.exists():
        print(f"  ⚠️ 文件不存在: {path}")
        return []

    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    news = data.get("news", [])
    for item in news:
        item["_source"] = source
    return news


def normalize_title(title: str) -> str:
    t = title.lower()
    t = re.sub(r"[^\w\s]", "", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


def extract_key_entities(title: str) -> set[str]:
    entities = set()
    name_patterns = [
        r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)",
        r"([\u4e00-\u9fff]{2,4})",
    ]
    for pat in name_patterns:
        for m in re.finditer(pat, title):
            entities.add(m.group(1))
    return entities


def deduplicate_events(all_news: list[dict]) -> list[dict]:
    events = []
    used = set()

    for i, news in enumerate(all_news):
        if i in used:
            continue

        event = {
            "title": news["title"],
            "teams": list(news.get("teams", [])),
            "level": news["level"],
            "score": news.get("score", 0),
            "category": EVENT_TYPE_MAP.get(news.get("category", "other"), "other"),
            "sources": [news.get("_source", "unknown")],
            "urls": [news.get("url", "")],
            "dates": [news.get("date", "")],
            "affects_profile": "",
            "cross_validated": False,
        }

        norm_i = normalize_title(news["title"])
        entities_i = extract_key_entities(news["title"])

        for j in range(i + 1, len(all_news)):
            if j in used:
                continue

            norm_j = normalize_title(all_news[j]["title"])
            entities_j = extract_key_entities(all_news[j]["title"])

            overlap = entities_i & entities_j
            if len(overlap) >= 2:
                used.add(j)
                event["sources"].append(all_news[j].get("_source", "unknown"))
                event["urls"].append(all_news[j].get("url", ""))
                event["dates"].append(all_news[j].get("date", ""))
                if all_news[j]["level"] == "S":
                    event["level"] = "S"
                elif all_news[j]["level"] == "A" and event["level"] != "S":
                    event["level"] = "A"

        unique_sources = list(set(event["sources"]))
        event["cross_validated"] = len(unique_sources) >= 2
        if event["cross_validated"] and event["level"] == "A":
            event["level"] = "S"
            event["score"] += 50

        event["affects_profile"] = PROFILE_SECTION_MAP.get(event["category"], "")
        events.append(event)
        used.add(i)

    return events


def generate_markdown(events: list[dict], date: str) -> str:
    lines = [
        f"# NBA 每日变更清单 ({date})",
        "",
    ]

    s_events = [e for e in events if e["level"] == "S"]
    a_events = [e for e in events if e["level"] == "A"]
    b_events = [e for e in events if e["level"] == "B"]

    if s_events:
        lines.append("## 🔴 已确认事实（需更新档案）")
        lines.append("")
        lines.append("| 事件 | 球队 | 来源 | 影响档案 |")
        lines.append("|------|------|------|----------|")
        for e in sorted(s_events, key=lambda x: EVENT_PRIORITY.get(x["category"], 9)):
            teams_str = ",".join(e["teams"]) if e["teams"] else "?"
            sources_str = "+".join(e["sources"])
            cv = " ✅交叉验证" if e["cross_validated"] else ""
            lines.append(f"| {e['title']} | {teams_str} | {sources_str}{cv} | {e['affects_profile']} |")
        lines.append("")

    if a_events:
        lines.append("## 🟡 权威报道（待确认）")
        lines.append("")
        lines.append("| 事件 | 球队 | 来源 | 可信度 |")
        lines.append("|------|------|------|--------|")
        for e in sorted(a_events, key=lambda x: EVENT_PRIORITY.get(x["category"], 9)):
            teams_str = ",".join(e["teams"]) if e["teams"] else "?"
            sources_str = "+".join(e["sources"])
            cv = " ✅交叉验证" if e["cross_validated"] else ""
            lines.append(f"| {e['title']} | {teams_str} | {sources_str}{cv} | 高 |")
        lines.append("")

    if b_events:
        lines.append("## 🟢 交易流言（仅供参考）")
        lines.append("")
        lines.append("| 流言 | 涉及球队 | 来源 | 可信度 |")
        lines.append("|------|----------|------|--------|")
        for e in sorted(b_events, key=lambda x: -x.get("score", 0)):
            teams_str = ",".join(e["teams"]) if e["teams"] else "?"
            sources_str = "+".join(e["sources"])
            lines.append(f"| {e['title']} | {teams_str} | {sources_str} | 低 |")
        lines.append("")

    lines.append("---")
    lines.append(f"*生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*")
    lines.append(f"*数据源: 虎扑 + HoopsRumors*")

    return "\n".join(lines)


def classify(date: str = ""):
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    print(f"[1/4] 加载新闻数据 ({date}) ...")
    hupu_news = load_news("hupu", date)
    hoops_news = load_news("hoopsrumors", date)

    all_news = hupu_news + hoops_news
    print(f"      虎扑: {len(hupu_news)} 条, HoopsRumors: {len(hoops_news)} 条, 合计: {len(all_news)} 条")

    if not all_news:
        print("      ❌ 无新闻数据，请先运行爬虫")
        return

    print("[2/4] 去重与合并 ...")
    all_news.sort(key=lambda x: x.get("score", 0), reverse=True)
    events = deduplicate_events(all_news)
    print(f"      合并后事件数: {len(events)}")

    print("[3/4] 分类统计 ...")
    s_count = sum(1 for e in events if e["level"] == "S")
    a_count = sum(1 for e in events if e["level"] == "A")
    b_count = sum(1 for e in events if e["level"] == "B")
    cv_count = sum(1 for e in events if e["cross_validated"])
    print(f"      S级: {s_count}  A级: {a_count}  B级: {b_count}  交叉验证: {cv_count}")

    print("[4/4] 生成变更清单 ...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    json_path = OUTPUT_DIR / f"changes_{date}.json"
    result = {
        "date": date,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_events": len(events),
        "stats": {
            "S_confirmed": s_count,
            "A_reported": a_count,
            "B_rumor": b_count,
            "cross_validated": cv_count,
        },
        "events": events,
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"      ✅ JSON: {json_path}")

    md_content = generate_markdown(events, date)
    md_path = OUTPUT_DIR / f"changes_{date}.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(md_content)
    print(f"      ✅ Markdown: {md_path}")

    print(f"\n      📋 变更清单预览:")
    print(f"      {'='*50}")
    for line in md_content.split("\n"):
        if line.strip():
            print(f"      {line}")


if __name__ == "__main__":
    print("=" * 50)
    print("NBA 新闻分类器")
    print("=" * 50)

    date = sys.argv[1] if len(sys.argv) > 1 else ""
    classify(date)
    print("\n✅ 完成!")
