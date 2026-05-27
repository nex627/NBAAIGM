import json
from pathlib import Path
d = json.loads(Path(r"D:\nexdev\nbatrade\data\output\players_full.json").read_text("utf-8"))
players = d.get("players", [])
total = len(players)
with_sal = [p for p in players if p.get("salary_2526")]
with_stats = [p for p in players if p.get("season_stats")]
with_both = [p for p in players if p.get("salary_2526") and p.get("season_stats")]

print(f"总球员: {total}")
print(f"有薪资: {len(with_sal)}")
print(f"有数据: {len(with_stats)}")
print(f"薪资+数据: {len(with_both)}")
print()

# Top 10 salary
top = sorted(with_sal, key=lambda p: p["salary_2526"], reverse=True)[:10]
print("=== 薪资前十 ===")
for p in top:
    st = p.get("season_stats", {})
    pts = st.get("pts", "") if st else ""
    print(f"  {p['team']} {p['name']:22s} ${p['salary_2526']:>13,.0f}  {p['pos']:4s} {pts}PTS")

print()
# Teams with salary coverage
teams_with_sal = {}
for p in with_sal:
    teams_with_sal[p["team"]] = teams_with_sal.get(p["team"], 0) + 1
print("各队薪资覆盖:")
for t in sorted(teams_with_sal):
    print(f"  {t}: {teams_with_sal[t]}")