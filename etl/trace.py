"""
Hard traceability map: every Einzelposten (Haushaltsstelle) → where it shows up
in the frontend. This is the ground truth for content sanity-checks: pick any
Posten and see exactly which Thema, which kameral level, and which frontend
routes it appears on.

Output:
  data/processed/trace.csv   one row per Haushaltsstelle (sortable in Excel)

Columns:
  hhst_id, ea, haushalt,
  einzelplan, aufgabenbereich,         # Einzelplan (1-stellig) + Name
  bereich_code, bereich,               # Abschnitt (2-stellig) + Label
  untergruppe_code, untergruppe,       # Unterabschnitt (3-stellig) + Label
  einrichtung_code, einrichtung,       # Gliederung (4-/5-stellig) + Name
  posten,                              # Gruppierung text (the line item)
  themen,                              # assigned Themen (full, ; -separated)
  route_einrichtung, route_posten, route_themen   # frontend URLs

Run:  python etl/trace.py
"""
from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUDGET = ROOT / "data/processed/budget.json"
THEMES = ROOT / "data/processed/themes.json"
LABELS = ROOT / "public/data/labels.json"
OUT = ROOT / "data/processed/trace.csv"

EINZELPLAN = {
    "0": "Allgemeine Verwaltung", "1": "Öffentliche Sicherheit und Ordnung",
    "2": "Schulen", "3": "Wissenschaft, Forschung, Kulturpflege",
    "4": "Soziale Sicherung", "5": "Gesundheit, Sport, Erholung",
    "6": "Bau- und Wohnungswesen, Verkehr", "7": "Öffentliche Einrichtungen, Wirtschaftsförderung",
    "8": "Wirtschaftliche Unternehmen", "9": "Allgemeine Finanzwirtschaft",
}


def clean(s):
    return " ".join((s or "").split())


def main():
    budget = json.loads(BUDGET.read_text(encoding="utf-8"))
    themes = json.loads(THEMES.read_text(encoding="utf-8"))
    labels = json.loads(LABELS.read_text(encoding="utf-8")) if LABELS.exists() else {}
    ab_lbl = labels.get("abschnitt", {})
    ua_lbl = labels.get("unterabschnitt", {})
    tdefs = themes["themes"]

    rows = []
    for hhst, p in budget["posten"].items():
        glz = p["glz"]
        ep, ab, ua = glz[0], glz[:2], glz[:3]
        tags = [t["theme"] for t in themes["assignment"].get(hhst, [])]
        themen = "; ".join(tdefs.get(t, {}).get("label", t) for t in tags)
        rows.append({
            "hhst_id": hhst,
            "ea": p["ea"],
            "haushalt": p["haushalt"],
            "einzelplan": ep,
            "aufgabenbereich": EINZELPLAN.get(ep, ep),
            "bereich_code": ab,
            "bereich": ab_lbl.get(ab, ""),
            "untergruppe_code": ua,
            "untergruppe": ua_lbl.get(ua, ""),
            "einrichtung_code": glz,
            "einrichtung": clean(p["glz_text"]),
            "posten": clean(p["grz_text"]),
            "themen": themen,
            "route_einrichtung": f"/einrichtung/{glz}",
            "route_posten": f"/posten/{hhst}",
            "route_themen": "; ".join(f"/themen/{t}" for t in tags),
        })

    rows.sort(key=lambda r: (r["einzelplan"], r["bereich_code"], r["einrichtung_code"], r["hhst_id"]))
    with OUT.open("w", encoding="utf-8-sig", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(f"-> {OUT.relative_to(ROOT)}  ({len(rows)} Posten)")
    # quick integrity counts
    untagged = sum(1 for r in rows if not r["themen"])
    print(f"   ohne Thema: {untagged}")


if __name__ == "__main__":
    main()
