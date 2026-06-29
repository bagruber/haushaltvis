"""
Write a human-readable taxonomy review: every Thema → Bereich → Einrichtung with
amounts, so misassignments are easy to spot. Run after ingest + classify.

Output: data/processed/taxonomy_review.md   (open it, mark anything that looks
wrong, tell the assistant — or edit etl/taxonomy.yaml directly and re-run classify).

Run:  python etl/review_taxonomy.py [--year 2024] [--side A|E]
"""
from __future__ import annotations

import argparse
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BUDGET = ROOT / "data/processed/budget.json"
THEMES = ROOT / "data/processed/themes.json"
LABELS = ROOT / "public/data/labels.json"
OUT = ROOT / "data/processed/taxonomy_review.md"


def eur(v: float) -> str:
    return f"{round(v):,}".replace(",", ".") + " €"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--year", type=int, default=2024)
    ap.add_argument("--side", choices=["A", "E"], default="A", help="A=Ausgaben, E=Einnahmen")
    args = ap.parse_args()

    budget = json.loads(BUDGET.read_text(encoding="utf-8"))
    themes = json.loads(THEMES.read_text(encoding="utf-8"))
    labels = json.loads(LABELS.read_text(encoding="utf-8")) if LABELS.exists() else {}
    ab_lbl = labels.get("abschnitt", {})
    posten = budget["posten"]

    # theme -> bereich(ab) -> glz -> {label, value, weight, multi}
    tree: dict = defaultdict(lambda: defaultdict(dict))
    theme_total: dict = defaultdict(float)
    for f in budget["facts"]:
        if f["year"] != args.year or f["ansatz"] is None:
            continue
        p = posten[f["hhst_id"]]
        if p["ea"] != args.side:
            continue
        tags = themes["assignment"].get(f["hhst_id"], [])
        for tag in tags:
            th = tag["theme"]
            w = tag["weight"]
            ab = p["glz"][:2]
            glz = p["glz"]
            node = tree[th][ab].get(glz)
            if node is None:
                node = {"label": " ".join((p["glz_text"] or glz).split()),
                        "value": 0.0, "multi": len(tags) > 1}
                tree[th][ab][glz] = node
            node["value"] += f["ansatz"] * w
            theme_total[th] += f["ansatz"] * w

    side_name = "Ausgaben" if args.side == "A" else "Einnahmen"
    lines = [f"# Taxonomie-Review — {side_name} {args.year}", ""]
    lines.append("Thema → Bereich → Einrichtung mit gewichteten Beträgen. "
                 "Mehrfach getaggte Posten erscheinen unter mehreren Themen (anteilig). "
                 "Markiere alles, was im falschen Thema steht.\n")

    for th in sorted(theme_total, key=lambda k: -theme_total[k]):
        tdef = themes["themes"].get(th, {})
        lines.append(f"## {tdef.get('label', th)} — {eur(theme_total[th])}")
        bereiche = tree[th]
        for ab in sorted(bereiche, key=lambda a: -sum(n["value"] for n in bereiche[a].values())):
            sub = sum(n["value"] for n in bereiche[ab].values())
            lines.append(f"- **{ab_lbl.get(ab, ab)}** [{ab}] — {eur(sub)}")
            for glz, n in sorted(bereiche[ab].items(), key=lambda kv: -kv[1]["value"]):
                flag = " ⚠️anteilig" if n["multi"] else ""
                lines.append(f"    - {n['label']} [{glz}] — {eur(n['value'])}{flag}")
        lines.append("")

    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"-> {OUT.relative_to(ROOT)}  ({len(theme_total)} Themen)")


if __name__ == "__main__":
    main()
