import json
d = json.load(open(r"D:\nexdev\nbatrade\data\output\contracts.json", "r", encoding="utf-8"))
print(f"共 {d['total']} 条合同")
for p in d["players"][:5]:
    print(json.dumps(p, ensure_ascii=False))