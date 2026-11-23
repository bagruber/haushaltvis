"""
Der Haushaltsentwurf des kommenden Jahres aus dem Arbeitsplan der Kämmerei:
Ansatz je Haushaltsstelle, dazu das erste Finanzplanjahr.

Quelle: haushaltsplaene/arbeitsplan/, die Datei mit dem jüngsten Stand, z. B.
„Arbeitsplan 2027 Stand 13.11.2026.xlsx". Blatt „Arbeitsplan <Jahr>": eine
Zeile je Haushaltsstelle mit Ansatz des Planjahres und Finanzplan der
Folgejahre. Planjahr und Stand stehen nur im Dateinamen.

Output: data/processed/entwurf.json
  { jahr, stand, quelle,
    ansatz:     { <hhst_id>: <€> },     jede Zeile des Arbeitsplans; 0 bleibt 0
    posten:     { <hhst_id>: {…} },     nur Stellen, die budget.json nicht kennt
    finanzplan: { jahr, ansatz: { <hhst_id>: <€> } } }

Eigene Datei, nicht in budget.json: budget.json bleibt der beschlossene Stand
(DATENFORMAT.md). Die App hängt den Entwurf beim Laden als weiteres Jahr an.
Steht der beschlossene Haushalt im Langexport, wird diese Datei gelöscht.

Run:  python etl/entwurf.py
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

import openpyxl

from ingest import EINZELPLAN_NAME, code, num, ea_of, haushalt_of, header_map, find

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "haushaltsplaene/arbeitsplan"
BUDGET = ROOT / "data/processed/budget.json"
OUT = ROOT / "data/processed/entwurf.json"

RE_NAME = re.compile(r"Arbeitsplan (\d{4}) Stand (\d\d)\.(\d\d)\.(\d{4})")


def quelle() -> tuple[Path, int, str]:
    """Der Arbeitsplan mit dem jüngsten Stand: (Datei, Planjahr, Stand als ISO-Datum)."""
    kandidaten = []
    for f in SRC_DIR.glob("*.xlsx"):
        if f.name.startswith("~$"):
            continue
        m = RE_NAME.search(f.name)
        if not m:
            raise SystemExit(
                f"Dateiname passt nicht: {f.name}\n"
                "Erwartet wird „Arbeitsplan <JJJJ> Stand <TT.MM.JJJJ>.xlsx“"
                " — Planjahr und Stand stehen nur im Namen und werden nicht geraten."
            )
        jahr, tag, monat, stichjahr = m.groups()
        kandidaten.append((f"{stichjahr}-{monat}-{tag}", int(jahr), f))
    if not kandidaten:
        raise SystemExit(f"Kein Arbeitsplan in {SRC_DIR.relative_to(ROOT)} gefunden.")
    stand, jahr, datei = max(kandidaten)
    return datei, jahr, stand


def text(v) -> str | None:
    s = " ".join(str(v).split()) if v is not None else ""
    return s or None


def lesen(src: Path, jahr: int):
    """Haushaltsstelle -> Zeile des Blatts „Arbeitsplan <jahr>“, wie geschrieben."""
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    ws = wb[f"Arbeitsplan {jahr}"]
    it = ws.iter_rows(values_only=True)
    idx = header_map(next(it))
    c = {
        "glz": find(idx, "glz"),
        "grz": find(idx, "grz"),
        "ea": find(idx, "ea"),
        "glz_text": find(idx, "glz_text"),
        "grz_text": find(idx, "grz_text"),
        "kontotext": find(idx, "kontotext"),
        "vorjahr": find(idx, f"ansatz_{jahr - 1}"),
        "ansatz": find(idx, f"ansatz_{jahr}"),
        "fpl": find(idx, f"fpl-{jahr + 1}"),
        "kurz": find(idx, "kurzer erl.text"),
        "lang": find(idx, "langer erl.text"),
    }
    zeilen = {}
    for r in it:
        glz, grz = code(r[c["glz"]]), code(r[c["grz"]])
        if not glz or not grz:
            continue
        zeilen[f"{glz}.{grz}"] = {k: r[i] for k, i in c.items()}
    wb.close()
    return zeilen


def main():
    src, jahr, stand = quelle()
    budget = json.loads(BUDGET.read_text(encoding="utf-8"))
    if jahr in budget["meta"]["years"]:
        raise SystemExit(
            f"{jahr} steht schon in budget.json ({budget['meta']['source']}).\n"
            f"Der Entwurf ist überholt: {OUT.relative_to(ROOT)} löschen und den Arbeitsplan ins Archiv legen."
        )
    crosswalk = budget.get("crosswalk", {})
    bekannt = budget["posten"]
    zeilen = lesen(src, jahr)

    ansatz: dict[str, float] = defaultdict(float)
    fpl: dict[str, float] = defaultdict(float)
    neu: dict[str, dict] = {}
    for hhst, z in zeilen.items():
        glz, grz = hhst.split(".")
        if z["ea"] and z["ea"] != ea_of(grz):
            raise SystemExit(f"{hhst}: Spalte EA sagt {z['ea']}, die Gruppierung {ea_of(grz)}.")
        ziel_glz = crosswalk.get(glz, glz)
        ziel = f"{ziel_glz}.{grz}"
        # Leer heißt hier nichts geplant: das Blatt hat für jede Stelle eine Zeile.
        ansatz[ziel] += num(z["ansatz"]) or 0.0
        fpl[ziel] += num(z["fpl"]) or 0.0
        if ziel not in bekannt and ziel not in neu:
            neu[ziel] = {
                "hhst_id": ziel,
                "einzelplan": ziel_glz[0],
                "einzelplan_name": EINZELPLAN_NAME.get(ziel_glz[0], ziel_glz[0]),
                "glz": ziel_glz,
                "grz": grz,
                "glz_text": text(z["glz_text"]),
                "grz_text": text(z["grz_text"]),
                "kontotext": text(z["kontotext"]),
                "ea": ea_of(grz),
                "haushalt": haushalt_of(grz),
            }

    out = {
        "jahr": jahr,
        "stand": stand,
        "quelle": src.name,
        "ansatz": {h: round(v, 2) for h, v in sorted(ansatz.items())},
        "posten": dict(sorted(neu.items())),
        "finanzplan": {"jahr": jahr + 1, "ansatz": {h: round(v, 2) for h, v in sorted(fpl.items())}},
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    # Selbstkontrolle
    print(f"{src.name}  (Entwurf {jahr}, Stand {stand}, {len(zeilen)} Zeilen)")
    summen: dict[tuple[str, str], list[float]] = defaultdict(lambda: [0.0, 0.0])
    for h in ansatz:
        grz = h.split(".")[1]
        s = summen[(haushalt_of(grz), ea_of(grz))]
        s[0] += ansatz[h]
        s[1] += fpl[h]
    print(f"{'':24}{'Ansatz ' + str(jahr):>16}{'Finanzplan ' + str(jahr + 1):>18}")
    for (haushalt, ea), (a, f) in sorted(summen.items()):
        name = {"verwaltung": "VwH", "vermoegen": "VmH"}[haushalt]
        art = {"A": "Ausgaben", "E": "Einnahmen"}[ea]
        print(f"{name + ' ' + art:24}{a:16,.0f}{f:18,.0f}")

    # Der Ansatz des Vorjahres im Arbeitsplan muss der aus budget.json sein.
    vorjahr = {f["hhst_id"]: f["ansatz"] for f in budget["facts"] if f["year"] == jahr - 1}
    abw = []
    for hhst, z in zeilen.items():
        glz, grz = hhst.split(".")
        ziel = f"{crosswalk.get(glz, glz)}.{grz}"
        a, b = num(z["vorjahr"]) or 0.0, vorjahr.get(ziel) or 0.0
        if abs(a - b) > 0.5:
            abw.append((ziel, a, b))
    print(f"\nAnsatz {jahr - 1} gegen budget.json: {len(abw)} Abweichungen")
    for h, a, b in abw[:10]:
        print(f"   {h}  Arbeitsplan {a:,.0f}  budget.json {b:,.0f}")

    weg = sorted(set(vorjahr) - set(ansatz))
    print(f"neu in {jahr} (nicht in budget.json): {len(neu)}")
    print(f"in {jahr - 1}, nicht mehr in {jahr}: {len(weg)}")
    vergleich(src, jahr, set(zeilen))
    print(f"-> {OUT.relative_to(ROOT)}  ({OUT.stat().st_size / 1024:,.0f} KB)")


def vergleich(src: Path, jahr: int, plan: set[str]):
    """Gegenprobe mit dem Blatt „HHStellenvergleich“ der Kämmerei: Dort schlägt
    je Stelle ein SVERWEIS im jeweils anderen Jahr nach, „#N/A“ heißt fehlt.
    Dieselben Stellen müssen herauskommen wie aus dem Abgleich der Blätter."""
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    if "HHStellenvergleich" not in wb.sheetnames or str(jahr - 1) not in wb.sheetnames:
        print("kein Blatt HHStellenvergleich, Gegenprobe entfällt")
        return
    it = wb[str(jahr - 1)].iter_rows(values_only=True)
    next(it)  # Summenzeile
    idx = header_map(next(it))
    c_glz, c_grz = find(idx, "glz"), find(idx, "grz")
    vorher = {f"{code(r[c_glz])}.{code(r[c_grz])}" for r in it if code(r[c_glz]) and code(r[c_grz])}
    it = wb["HHStellenvergleich"].iter_rows(values_only=True)
    kopf = [str(k) for k in next(it)]
    i_vor, i_neu = kopf.index(str(jahr - 1)), kopf.index(str(jahr))
    i_nicht_vor, i_nicht_neu = kopf.index(f"nicht in {jahr - 1}"), kopf.index(f"nicht in {jahr}")
    # Die Kennung ist GLZ und GRZ ohne Punkt; die GRZ hat immer vier Stellen.
    punkt = lambda k: f"{str(k)[:-4].lstrip('0').zfill(4)}.{str(k)[-4:]}"
    na_neu, na_weg = set(), set()
    for r in it:
        if r[i_nicht_vor] == "#N/A" and r[i_neu]:
            na_neu.add(punkt(r[i_neu]))
        if r[i_nicht_neu] == "#N/A" and r[i_vor]:
            na_weg.add(punkt(r[i_vor]))
    wb.close()
    neu, weg = plan - vorher, vorher - plan
    ok = neu == na_neu and weg == na_weg
    print(f"Gegenprobe HHStellenvergleich: neu {len(neu)} / {len(na_neu)}, weg {len(weg)} / {len(na_weg)}"
          f"  {'stimmt' if ok else 'WEICHT AB'}")
    if not ok:
        for h in sorted(neu ^ na_neu):
            print(f"   neu, nur {'im Abgleich' if h in neu else 'im HHStellenvergleich'}: {h}")
        for h in sorted(weg ^ na_weg):
            print(f"   weg, nur {'im Abgleich' if h in weg else 'im HHStellenvergleich'}: {h}")


if __name__ == "__main__":
    main()
