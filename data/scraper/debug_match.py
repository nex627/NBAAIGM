import json
from pathlib import Path

stats = json.loads(Path(r"D:\nexdev\nbatrade\data\output\stats_raw.json").read_text(encoding="utf-8"))
print(f"Stats entries: {len(stats)}")
for key in list(stats.keys())[:5]:
    print(f"  key={key!r} -> {stats[key].get('name')} / {stats[key].get('team')}")

players = json.loads(Path(r"D:\nexdev\nbatrade\data\output\players.json.bak" if False else r"D:\nexdev\nbatrade\data\output\players.json").read_text(encoding="utf-8"))
print(f"\nPlayers: {len(players.get('players', []))}")