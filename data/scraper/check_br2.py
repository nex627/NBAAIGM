import json
from pathlib import Path

f = Path(r"D:\nexdev\nbatrade\data\output\players_br.json")
print(f"Exists: {f.exists()}, Size: {f.stat().st_size if f.exists() else 0}")
if f.exists() and f.stat().st_size > 1000:
    d = json.loads(f.read_text("utf-8"))
    print(f"Players: {d.get('total', len(d.get('players', [])))}")
    if d.get("players"):
        p = d["players"][0]
        print(f"First: {p.get('name')} | stats: {p.get('season_stats', {}).get('pts')}")