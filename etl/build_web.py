"""
Emit compact, minified JSON for the web app into public/data/.

Reads the canonical artifacts from data/processed/, plus manual events from
etl/events.yaml, derives factual structural events (new / discontinued sizeable
Posten) from the data, and writes slim copies the frontend loads at runtime.

Run after ingest.py + classify.py.  Run:  python etl/build_web.py
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data/processed"
DST = ROOT / "public/data"
EVENTS_YAML = ROOT / "etl/events.yaml"

# Threshold for auto-derived "Posten neu/aufgegeben" events (in €, peak value).
AUTO_EVENT_MIN = 200_000
# Max auto events kept per Abschnitt per direction (neu/aufgegeben), biggest first.
AUTO_EVENT_PER_AB = 2
# The data switches source at 2023->2024, so changes touching the boundary are
# join artefacts, not real budget decisions. Only trust changes inside this range.
RELIABLE_FIRST = 2018
RELIABLE_LAST = 2023


def short(label: str | None, fallback: str) -> str:
    if not label:
        return fallback
    return " ".join(label.split())


def derive_events(budget: dict) -> list[dict]:
    """New / discontinued sizeable Posten -> abschnitt-scoped events."""
    posten = budget["posten"]

    # per posten: {year: value} within the reliable, single-source range
    by_posten: dict[str, dict[int, float]] = defaultdict(dict)
    for f in budget["facts"]:
        if not (RELIABLE_FIRST <= f["year"] <= RELIABLE_LAST):
            continue
        v = f["ansatz"] if f["ansatz"] is not None else f["ergebnis"]
        if v:
            by_posten[f["hhst_id"]][f["year"]] = v

    raw = []
    for hhst, yv in by_posten.items():
        present = sorted(yv)
        peak = max(abs(v) for v in yv.values())
        if peak < AUTO_EVENT_MIN:
            continue
        p = posten[hhst]
        ab = p["glz"][:2]
        name = short(p["grz_text"], hhst)
        first, last = present[0], present[-1]
        if first > RELIABLE_FIRST:
            raw.append((ab, "neu", peak, {
                "scope": "abschnitt", "id": ab, "year": first,
                "title": f"Neuer Posten: {name}",
                "text": f"Erstmals veranschlagt ({p['glz_text'] or ab}).",
                "_auto": True,
            }))
        if last < RELIABLE_LAST:
            raw.append((ab, "weg", peak, {
                "scope": "abschnitt", "id": ab, "year": last,
                "title": f"Posten aufgegeben: {name}",
                "text": f"Letztmals veranschlagt ({p['glz_text'] or ab}).",
                "_auto": True,
            }))

    # cap per (abschnitt, direction), biggest first
    raw.sort(key=lambda r: -r[2])
    kept_count: dict[tuple[str, str], int] = defaultdict(int)
    out = []
    for ab, direction, _peak, ev in raw:
        if kept_count[(ab, direction)] >= AUTO_EVENT_PER_AB:
            continue
        kept_count[(ab, direction)] += 1
        out.append(ev)
    return out


def load_manual_events() -> list[dict]:
    if not EVENTS_YAML.exists():
        return []
    doc = yaml.safe_load(EVENTS_YAML.read_text(encoding="utf-8")) or {}
    return doc.get("events") or []


def main():
    DST.mkdir(parents=True, exist_ok=True)

    budget = None
    for name in ("budget.json", "themes.json"):
        data = json.loads((SRC / name).read_text(encoding="utf-8"))
        if name == "budget.json":
            budget = data
        (DST / name).write_text(
            json.dumps(data, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        kb = (DST / name).stat().st_size / 1024
        print(f"{name:14} -> public/data/{name}  ({kb:,.0f} KB)")

    manual = load_manual_events()
    auto = derive_events(budget)
    events = {"events": manual + auto}
    (DST / "events.json").write_text(
        json.dumps(events, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"events.json    -> {len(manual)} manuell + {len(auto)} automatisch")


if __name__ == "__main__":
    main()
