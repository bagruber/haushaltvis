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
LABELS_YAML = ROOT / "etl/labels.yaml"
CONTEXT_YAML = ROOT / "etl/context.yaml"
EINLEITUNGEN_YAML = ROOT / "etl/einleitungen.yaml"
GLOSSAR_YAML = ROOT / "etl/glossar.yaml"
AGGREGATOREN_YAML = ROOT / "etl/aggregatoren.yaml"

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


def _agg_match(p: dict, rule: dict) -> bool:
    """True if posten p satisfies every rule field (AND-combined)."""
    if "ea" in rule and p["ea"] != rule["ea"]:
        return False
    if "haushalt" in rule and p["haushalt"] != rule["haushalt"]:
        return False
    if "grz_hauptgruppe" in rule and p["grz"][:1] != rule["grz_hauptgruppe"]:
        return False
    if "grz_prefix" in rule and p["grz"][:2] not in rule["grz_prefix"]:
        return False
    if "stichworte" in rule:
        # Match on the cost nature (Gruppierungs-/Kontotext), not the facility
        # (Gliederungstext) — otherwise a "Wasserversorgung" Einrichtung would
        # pull in its personnel etc.
        text = " ".join(filter(None, [p.get("grz_text"), p.get("kontotext")])).lower()
        if not any(s.lower() in text for s in rule["stichworte"]):
            return False
    return True


def build_aggregatoren(budget: dict) -> dict:
    """Cross-cutting cost blocks: members + per-year Ansatz/Ergebnis sums."""
    if not AGGREGATOREN_YAML.exists():
        return {}
    spec = yaml.safe_load(AGGREGATOREN_YAML.read_text(encoding="utf-8")) or {}
    posten = budget["posten"]
    facts_by_hhst: dict[str, list[dict]] = defaultdict(list)
    for f in budget["facts"]:
        facts_by_hhst[f["hhst_id"]].append(f)

    out = {}
    meta_keys = ("title", "art", "kriterium", "beschreibung")
    for key, rule in spec.items():
        members = sorted(h for h, p in posten.items() if _agg_match(p, rule))
        reihe: dict[str, dict] = {}
        for h in members:
            for f in facts_by_hhst.get(h, []):
                y = str(f["year"])
                r = reihe.setdefault(y, {"ansatz": 0.0, "ergebnis": 0.0, "prov": False})
                if f.get("ansatz") is not None:
                    r["ansatz"] += f["ansatz"]
                if f.get("ergebnis") is not None:
                    r["ergebnis"] += f["ergebnis"]
                if f.get("provisional"):
                    r["prov"] = True
        out[key] = {
            **{k: (" ".join(str(rule[k]).split()) if k in rule else "") for k in meta_keys},
            "hhst": members,
            "reihe": {y: {"ansatz": round(v["ansatz"], 2),
                          "ergebnis": round(v["ergebnis"], 2),
                          "prov": v["prov"]}
                      for y, v in sorted(reihe.items())},
        }
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

    labels = yaml.safe_load(LABELS_YAML.read_text(encoding="utf-8")) if LABELS_YAML.exists() else {}
    (DST / "labels.json").write_text(
        json.dumps(labels, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"labels.json    -> {len(labels.get('abschnitt', {}))} Abschnitte, "
          f"{len(labels.get('unterabschnitt', {}))} Unterabschnitte")

    context = yaml.safe_load(CONTEXT_YAML.read_text(encoding="utf-8")) if CONTEXT_YAML.exists() else {}
    (DST / "context.json").write_text(
        json.dumps(context, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"context.json   -> {len(context.get('population', {}))} Jahre Einwohner, "
          f"{len(context.get('cpi', {}))} Jahre CPI")

    einl = yaml.safe_load(EINLEITUNGEN_YAML.read_text(encoding="utf-8")) if EINLEITUNGEN_YAML.exists() else {}
    einl = {k: " ".join(str(v).split()) for k, v in (einl or {}).items()}
    (DST / "einleitungen.json").write_text(
        json.dumps(einl, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"einleitungen.json -> {len(einl)} Texte")

    raw = yaml.safe_load(GLOSSAR_YAML.read_text(encoding="utf-8")) if GLOSSAR_YAML.exists() else {}
    glos = {}
    for k, v in (raw or {}).items():
        if isinstance(v, dict):
            glos[k] = {"title": " ".join(str(v.get("title", k)).split()),
                       "text": " ".join(str(v.get("text", "")).split())}
        else:  # legacy: plain string
            glos[k] = {"title": k, "text": " ".join(str(v).split())}
    (DST / "glossar.json").write_text(
        json.dumps(glos, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"glossar.json   -> {len(glos)} Begriffe")

    agg = build_aggregatoren(budget)
    (DST / "aggregatoren.json").write_text(
        json.dumps(agg, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print("aggregatoren.json -> " + ", ".join(
        f"{k}={len(v['hhst'])}" for k, v in agg.items()))


if __name__ == "__main__":
    main()
