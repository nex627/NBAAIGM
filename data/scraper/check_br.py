import json
from pathlib import Path
d = json.loads(Path(r"D:\nexdev\nbatrade\data\output\players_br.json").read_text("utf-8"))
print(f"Players: {d.get('total', 0)}")
if d.get("players"):
    for p in d["players"][:10]:
        st = p.get("season_stats", {})
        pts = st.get("pts") if st else None
        ast = st.get("ast") if st else None
        reb = st.get("trb") if st else None
        g = st.get("g") if st else None
        print(f"{p['team']:4s} {p['name']:25s} {p['pos']:4s} H:{p['ht']} | G:{g} PTS:{pts} AST:{ast} REB:{reb}")
    # Check for data quality
    with_stats = sum(1 for p in d["players"] if p.get("season_stats"))
    print(f"\nWith season stats: {with_stats}/{d['total']}")
    teams = {}
    for p in d["players"]:
        teams[p["team"]] = teams.get(p["team"], 0) + 1
    print("Teams:", {k: teams[k] for k in sorted(teams)})