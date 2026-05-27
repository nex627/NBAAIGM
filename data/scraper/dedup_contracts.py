import json
from collections import Counter

d = json.load(open(r'd:\nexdev\nbatrade\data\output\contracts.json', 'r', encoding='utf-8'))
players = d['players']

seen = {}
for p in players:
    sid = p['spotrac_id']
    if sid not in seen:
        seen[sid] = p
    else:
        existing = seen[sid]
        if p.get('yearly_salary') and not existing.get('yearly_salary'):
            seen[sid] = p
        elif p.get('yearly_salary') and existing.get('yearly_salary'):
            if len(p.get('contract_notes', [])) > len(existing.get('contract_notes', [])):
                seen[sid] = p

unique = list(seen.values())
print(f"去重前: {len(players)} 条")
print(f"去重后: {len(unique)} 条")

has_detail = sum(1 for p in unique if p.get('yearly_salary'))
has_ntc = sum(1 for p in unique if p.get('no_trade_clause'))
has_tk = sum(1 for p in unique if p.get('trade_kicker'))
has_options = sum(1 for p in unique if p.get('option_years') and len(p['option_years']) > 0)
has_fa = sum(1 for p in unique if p.get('free_agent_type'))

print(f"\n有详情: {has_detail}/{len(unique)}")
print(f"NTC: {has_ntc}")
print(f"Trade Kicker: {has_tk}")
print(f"Options: {has_options}")
print(f"FA Type: {has_fa}")

print(f"\n--- NTC 球员 ---")
for p in unique:
    if p.get('no_trade_clause'):
        print(f"  {p['name']} ({p.get('team', '?')})")

print(f"\n--- Trade Kicker 球员 ---")
for p in unique:
    if p.get('trade_kicker'):
        pct = p.get('trade_kicker_pct', '?')
        print(f"  {p['name']} ({p.get('team', '?')}) - {pct}%")

d['total'] = len(unique)
d['players'] = unique

out_path = r'd:\nexdev\nbatrade\data\output\contracts.json'
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(d, f, ensure_ascii=False, indent=2)

from pathlib import Path
fsize = Path(out_path).stat().st_size
print(f"\n已保存去重后数据: {fsize:,} bytes ({fsize/1024:.1f} KB)")
