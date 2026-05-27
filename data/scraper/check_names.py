import json
from pathlib import Path

contracts = json.loads(Path(r"D:\nexdev\nbatrade\data\output\contracts.json").read_text("utf-8"))
br = json.loads(Path(r"D:\nexdev\nbatrade\data\output\players_br.json").read_text("utf-8"))

c_players = contracts.get("players", contracts)
print("=== CONTRACTS sample ===")
for p in c_players[:8]:
    print(f"  {p.get('player', p.get('name', '???'))} | {p.get('team', '??')} | salary: {p.get('salary_2425', 'N/A')}")

print("\n=== BR sample ===")
for p in br["players"][:8]:
    print(f"  {p['name']} | {p['team']}")

# Try matching with different keys
print("\n=== Contract keys ===")
for k in list(c_players[0].keys())[:10]:
    print(f"  {k}: {c_players[0][k]!r}")