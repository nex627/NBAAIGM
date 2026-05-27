import json
d = json.load(open(r"D:\nexdev\nbatrade\data\output\players.json", encoding="utf-8"))
print(f"共 {d['total']} 名球员")
for p in d["players"][:8]:
    print(f"{p['team']} {p['name']:20s} #{p['pos']} {p['age']}y {p['ht']:8s} {p['wt']}")