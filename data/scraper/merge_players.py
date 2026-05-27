"""合并 ESPN 球员资料 + 赛季数据"""
import json
from pathlib import Path

DATA = Path(r"D:\nexdev\nbatrade\data\output")

players = json.loads((DATA / "players.json").read_text(encoding="utf-8"))
stats = json.loads((DATA / "stats_raw.json").read_text(encoding="utf-8"))

matched = 0
for p in players["players"]:
    key = f"{p['team']}|{p['name']}"
    if key in stats:
        st = stats[key]
        p["season_stats"] = {
            "gp": st["gp"], "gs": st["gs"], "min": st["min"],
            "pts": st["pts"], "reb": st["reb"], "ast": st["ast"],
            "stl": st["stl"], "blk": st["blk"], "tov": st["tov"], "pf": st["pf"],
            "oreb": st["oreb"], "dreb": st["dreb"], "ast_to": st["ast_to"],
        }
        matched += 1

# 清理无数据球员
players["players"] = [p for p in players["players"] if p.get("season_stats")]
players["total"] = len(players["players"])

out = DATA / "players.json"
out.write_text(json.dumps(players, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"合并完成: {matched} 人匹配到赛季数据")
print(f"最终保留 {players['total']} 名球员")
print(f"文件: {out} ({out.stat().st_size:,} bytes)")