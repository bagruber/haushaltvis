"""
Emit compact, minified JSON for the web app into public/data/.

Reads the canonical artifacts from data/processed/ and writes slim copies the
frontend loads at runtime. Run after ingest.py + classify.py.

Run:  python etl/build_web.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data/processed"
DST = ROOT / "public/data"


def main():
    DST.mkdir(parents=True, exist_ok=True)
    for name in ("budget.json", "themes.json"):
        data = json.loads((SRC / name).read_text(encoding="utf-8"))
        (DST / name).write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        kb = (DST / name).stat().st_size / 1024
        print(f"{name:14} -> public/data/{name}  ({kb:,.0f} KB)")


if __name__ == "__main__":
    main()
