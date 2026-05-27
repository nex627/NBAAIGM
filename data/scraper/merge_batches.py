"""合并分批薪资到球员资料"""
import json
from pathlib import Path

DATA = Path(r"D:\nexdev\nbatrade\data\output")

# 读取分批薪资
salaries = {}
for fname in ["batch_1.json","batch_2.json","batch_3.json","batch_4b.json","batch_6.json","batch_7.json"]:
    f = DATA / fname
    if f.exists():
        batch = json.loads(f.read_text("utf-8"))
        for p in batch:
            if p.get("name", "").startswith("ERR:"):
                continue
            key = f"{p['team']}|{p['name']}"
            salaries[key] = p.get("salary_2526")
        print(f"  {fname}: {len(batch)} 条")

# 读取完整的球员资料（之前抓的 530 人）
br_file = DATA / "players_br.json"
if br_file.exists() and br_file.stat().st_size > 1000:
    br = json.loads(br_file.read_text("utf-8"))
else:
    print("players_br.json 被清空了，重新从批次构建")
    br = {"players": []}

# 合并薪资
matched = 0
for p in br.get("players", []):
    key = f"{p['team']}|{p['name']}"
    if key in salaries:
        p["salary_2526"] = salaries[key]
        matched += 1
    else:
        p["salary_2526"] = None

with_sal = sum(1 for p in br["players"] if p.get("salary_2526"))
total = len(br["players"])

print(f"\n合并结果:")
print(f"  总球员: {total}")
print(f"  有薪资: {with_sal}")
print(f"  匹配率: {with_sal/total*100:.1f}%")

# 保存
out = DATA / "players.json"
out.write_text(json.dumps(br, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"  输出: {out} ({out.stat().st_size:,} bytes)")

# 显示薪资前十
top = sorted([p for p in br["players"] if p.get("salary_2526")], key=lambda p: p["salary_2526"], reverse=True)[:10]
print("\n=== 薪资前十 ===")
for p in top:
    print(f"  {p['team']} {p['name']:22s} ${p['salary_2526']:>13,.0f}")

# 各队覆盖
teams_sal = {}
teams_all = {}
for p in br["players"]:
    t = p["team"]
    teams_all[t] = teams_all.get(t, 0) + 1
    if p.get("salary_2526"):
        teams_sal[t] = teams_sal.get(t, 0) + 1
print("\n=== 各队薪资覆盖 ===")
for t in sorted(teams_all):
    s = teams_sal.get(t, 0)
    a = teams_all[t]
    print(f"  {t}: {s}/{a}")