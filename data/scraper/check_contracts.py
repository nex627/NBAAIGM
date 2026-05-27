import json
from pathlib import Path
c = json.loads(Path(r"D:\nexdev\nbatrade\data\output\contracts.json").read_text("utf-8"))
print(f"Type: {type(c).__name__}")
if isinstance(c, list):
    print(f"Length: {len(c)}")
    print(f"First type: {type(c[0]).__name__}")
    if isinstance(c[0], dict):
        print(f"Keys: {list(c[0].keys())[:10]}")
    else:
        print(f"First: {c[0]!r}")
elif isinstance(c, dict):
    print(f"Keys: {list(c.keys())}")
    if "data" in c:
        print(f"Data type: {type(c['data']).__name__}, len: {len(c['data'])}")
        print(f"First data keys: {list(c['data'][0].keys())[:10] if isinstance(c['data'][0], dict) else type(c['data'][0])}")