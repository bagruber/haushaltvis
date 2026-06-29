"""
Assign the human-editable Themen-Taxonomie (etl/taxonomy.yaml) onto every
budget Posten and write data/processed/themes.json.

Resolution order per Posten (hhst_id = GLZ.GRZ):
  1. gliederung_overrides[GLZ]   (4-digit, wins)
  2. abschnitt_themes[GLZ[:2]]   (2-digit default)
  3. default_theme               (fallback)

Each Posten's theme weights are normalised to sum 1.0 so that summing weighted
amounts across themes never double-counts the total.

Output:
  data/processed/themes.json
    { meta, themes: {<id>: {label,color,description}},
      assignment: { <hhst_id>: [ {theme, weight}, ... ] } }

Run:  python etl/classify.py
"""
from __future__ import annotations

import json
import datetime as dt
from collections import defaultdict
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
TAX = ROOT / "etl/taxonomy.yaml"
BUDGET = ROOT / "data/processed/budget.json"
OUT = ROOT / "data/processed/themes.json"


def norm_entries(raw):
    """Accept ['a', {theme: b, weight: 2}] -> [(theme, weight), ...]."""
    out = []
    for item in raw:
        if isinstance(item, str):
            out.append((item, 1.0))
        elif isinstance(item, dict):
            out.append((item["theme"], float(item.get("weight", 1.0))))
    return out


def main():
    tax = yaml.safe_load(TAX.read_text(encoding="utf-8"))
    themes = tax["themes"]
    abschnitt = {k: norm_entries(v) for k, v in (tax.get("abschnitt_themes") or {}).items()}
    overrides = {k: norm_entries(v) for k, v in (tax.get("gliederung_overrides") or {}).items()}
    default_theme = tax.get("default_theme")

    budget = json.loads(BUDGET.read_text(encoding="utf-8"))
    posten = budget["posten"]

    # latest available volume per posten (for coverage reporting), prefer 2024->2023
    vol = {}
    for f in budget["facts"]:
        v = f["ansatz"] if f["ansatz"] is not None else f["ergebnis"]
        if v is None:
            continue
        cur = vol.get(f["hhst_id"])
        if cur is None or f["year"] > cur[0]:
            vol[f["hhst_id"]] = (f["year"], abs(v))

    assignment = {}
    used = set()
    fallback = []
    theme_vol = defaultdict(float)
    for hhst, p in posten.items():
        glz = p["glz"]
        ab = glz[:2]
        if glz in overrides:
            entries = overrides[glz]
        elif ab in abschnitt:
            entries = abschnitt[ab]
        else:
            entries = [(default_theme, 1.0)]
            fallback.append(ab)
        # No fractional assignment: every theme tag carries the FULL amount.
        # A Posten may belong to several Themen (counted fully in each); Theme
        # totals therefore need not reconcile to the kameral sum.
        tags = [{"theme": t, "weight": 1.0} for t, _w in entries]
        assignment[hhst] = tags
        for e in tags:
            used.add(e["theme"])
        amt = vol.get(hhst, (0, 0.0))[1]
        for e in tags:
            theme_vol[e["theme"]] += amt

    # validate every used theme is defined
    unknown = used - set(themes)
    if unknown:
        raise SystemExit(f"ERROR: taxonomy references undefined themes: {sorted(unknown)}")

    out = {
        "meta": {
            "generated": dt.datetime.now().isoformat(timespec="seconds"),
            "n_posten": len(assignment),
            "n_themes": len(themes),
            "multi_tagged": sum(1 for a in assignment.values() if len(a) > 1),
        },
        "themes": themes,
        "assignment": assignment,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    # report
    print(f"assigned {len(assignment)} posten -> {len(themes)} themes "
          f"({out['meta']['multi_tagged']} multi-tagged)")
    if fallback:
        from collections import Counter
        print(f"WARN: {len(set(fallback))} unmapped Abschnitte -> '{default_theme}': "
              f"{sorted(set(fallback))}")
    print("Weighted volume share per theme (latest amount):")
    grand = sum(theme_vol.values()) or 1.0
    for t in sorted(theme_vol, key=lambda k: -theme_vol[k]):
        print(f"  {themes[t]['label']:32} {theme_vol[t]:14,.0f}  {theme_vol[t]/grand:5.1%}")
    print(f"-> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
