import json
from pathlib import Path
for i in [4,5]:
    data = json.loads(Path(rf"D:\nexdev\nbatrade\data\output\batch_{i}.json").read_text("utf-8"))
    print(f"batch_{i}: {len(data)} entries")
    for d in data:
        print(f"  {d}")