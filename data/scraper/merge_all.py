"""
合并数据源:
  - players_br.json: basketball-reference (身高/体重/年龄/赛季数据)
  - contracts.json: Spotrac (薪资合同)
输出: players.json
"""
import json
import re
from pathlib import Path

DATA = Path(r"D:\nexdev\nbatrade\data\output")
BR = json.loads((DATA / "players_br.json").read_text(encoding="utf-8"))
CONTRACTS_RAW = json.loads((DATA / "contracts.json").read_text(encoding="utf-8"))
CONTRACTS = CONTRACTS_RAW.get("players", CONTRACTS_RAW)

def normalize(s: str) -> str:
    """去除特殊字符，用于姓名匹配"""
    s = s.lower()
    s = re.sub(r"[^a-z\s]", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

# 建立合同查找表
contract_map = {}
for c in CONTRACTS:
    key = normalize(c.get("name", ""))
    if key:
        contract_map[key] = c

merged = []
matched = 0
no_contract = 0
no_match = 0

for p in BR["players"]:
    key = normalize(p["name"])
    contract = contract_map.get(key)

    player = {
        "name": p["name"],
        "team": p["team"],
        "number": p["number"],
        "pos": p["pos"],
        "ht": p["ht"],
        "wt": p["wt"],
        "birth_date": p["birth_date"],
        "exp": p["exp"],
        "college": p["college"],
        "season_stats": p.get("season_stats"),
    }

    if contract:
        matched += 1
        player["spotrac_id"] = contract.get("spotrac_id")
        player["total_value"] = contract.get("total_value")
        player["aav"] = contract.get("aav")
        player["contract_start"] = contract.get("contract_start")
        player["contract_end"] = contract.get("contract_end")
        player["contract_years"] = contract.get("contract_years")
        player["age_at_signing"] = contract.get("age_at_signing")
        player["agent"] = contract.get("agent")
    else:
        no_contract += 1

    merged.append(player)

print(f"合并完成:")
print(f"  总球员: {len(merged)}")
print(f"  匹配到合同: {matched}")
print(f"  无合同数据: {no_contract}")

# 检查哪些球员没匹配到合同的
unmatched = [p for p in merged if "total_value" not in p]
print(f"\n未匹配合同球员 ({len(unmatched)}):")
for p in unmatched[:10]:
    print(f"  {p['team']} {p['name']}")
if len(unmatched) > 10:
    print(f"  ... 等 {len(unmatched)} 人")

out = DATA / "players.json"
out.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n输出: {out} ({out.stat().st_size:,} bytes)")