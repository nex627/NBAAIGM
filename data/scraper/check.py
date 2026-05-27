import json
from pathlib import Path
d = json.loads(Path(r"D:\nexdev\nbatrade\data\output\players.json").read_text("utf-8"))
print(f"Players: {d['total']}")
if d["players"]:
    p = d["players"][0]
    print(f"First: {p['team']} {p['name']} {p.get('season_stats', 'no stats')}")
else:
    print("No players found")