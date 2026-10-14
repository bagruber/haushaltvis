"""
Zwischenstand des laufenden Haushaltsjahres: was zu einem Stichtag gebucht
(Anordnungs-Soll) und was bezahlt (Ist) ist.

Quelle: eine AKDB-Stichtagsauswertung in haushaltsplaene/zwischenstand/, bei
mehreren die mit dem jüngsten Stichtag. Gleiche Spalten wie der Langexport,
aber ohne Spalte HJ: Jahr und Stichtag stehen nur im Dateinamen, und die
Kopfzeile ist Zeile 2 (Zeile 1 ist eine Summenzeile).

Output: data/processed/zwischenstand.json
  { jahr, stichtag, quelle, werte: { <hhst_id>: [soll, ist] } }

Eigene Datei, nicht in budget.json: budget.json ist der dokumentierte Vertrag
mit der Stadt (DATENFORMAT.md) und bleibt unverändert. Fehlt diese Datei, ist
das Feature in der App weg — zurücknehmen heißt sie löschen.

Run:  python etl/zwischenstand.py
"""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

import openpyxl

from ingest import code, num, ea_of, haushalt_of, header_map, find

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "haushaltsplaene/zwischenstand"
BUDGET = ROOT / "data/processed/budget.json"
OUT = ROOT / "data/processed/zwischenstand.json"

# „Haushalt 2026 Stand 01.10.2026" — Jahr und Stichtag tragen nur den Namen.
RE_NAME = re.compile(r"Haushalt (\d{4}) Stand (\d\d)\.(\d\d)\.(\d{4})")


def quelle() -> tuple[Path, int, str]:
    """Die Auswertung mit dem jüngsten Stichtag, plus Jahr und Stichtag."""
    kandidaten = []
    for f in SRC_DIR.glob("*.xlsx"):
        if f.name.startswith("~$"):
            continue  # offene Excel-Sperrdatei
        m = RE_NAME.search(f.name)
        if not m:
            raise SystemExit(
                f"Dateiname passt nicht: {f.name}\n"
                "Erwartet wird „Haushalt <JJJJ> Stand <TT.MM.JJJJ> ….xlsx"
                " — Jahr und Stichtag stehen nur im Namen und werden nicht geraten."
            )
        jahr, tag, monat, stichjahr = m.groups()
        kandidaten.append((f"{stichjahr}-{monat}-{tag}", f, int(jahr)))
    if not kandidaten:
        raise SystemExit(f"Keine Auswertung in {SRC_DIR.relative_to(ROOT)} gefunden.")
    kandidaten.sort()
    stichtag, datei, jahr = kandidaten[-1]
    if len(kandidaten) > 1:
        print(f"{len(kandidaten)} Auswertungen gefunden, genommen: {datei.name}")
    return datei, jahr, stichtag


def lesen(src: Path) -> dict[str, tuple[float, float, float, str]]:
    """Haushaltsstelle -> (Ansatz, Soll, Ist, Text), wie in der Datei geschrieben."""
    wb = openpyxl.load_workbook(src, read_only=True, data_only=True)
    ws = wb.active
    it = ws.iter_rows(values_only=True)
    next(it)  # Summenzeile
    idx = header_map(next(it))
    c_glz = find(idx, "glz")
    c_grz = find(idx, "grz")
    c_glzt = find(idx, "glz-text")
    c_grzt = find(idx, "grz-text")
    c_ans = find(idx, "ansatz (ges.)", "ansatz(ges.)", "ansatz")
    c_soll = find(idx, "soll_hs")
    c_ist = find(idx, "ist_hs")

    roh: dict[str, tuple[float, float, float, str]] = {}
    for r in it:
        glz, grz = code(r[c_glz]), code(r[c_grz])
        if not glz or not grz:
            continue
        text = " ".join(f"{r[c_glzt] or ''} / {r[c_grzt] or ''}".split())
        roh[f"{glz}.{grz}"] = (
            num(r[c_ans]) or 0.0,
            num(r[c_soll]) or 0.0,
            num(r[c_ist]) or 0.0,
            text,
        )
    wb.close()
    return roh


def main():
    src, jahr, stichtag = quelle()
    roh = lesen(src)

    budget = json.loads(BUDGET.read_text(encoding="utf-8"))
    crosswalk = budget.get("crosswalk", {})
    posten = budget["posten"]

    werte: dict[str, list[float]] = {}
    fremd: list[tuple[str, float, str]] = []
    for hhst, (_ansatz, soll, ist, text) in roh.items():
        glz, grz = hhst.split(".")
        ziel = f"{crosswalk.get(glz, glz)}.{grz}"
        if ziel in posten:
            werte[ziel] = [round(soll, 2), round(ist, 2)]
        else:
            fremd.append((hhst, soll, text))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {"jahr": jahr, "stichtag": stichtag, "quelle": src.name, "werte": werte},
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )

    # Selbstkontrolle: dieselben drei Zeilen, die im Briefing gemessen wurden.
    summen: dict[tuple[str, str], list[float]] = defaultdict(lambda: [0.0, 0.0, 0.0])
    for hhst, (ansatz, soll, ist, _text) in roh.items():
        grz = hhst.split(".")[1]
        s = summen[(haushalt_of(grz), ea_of(grz))]
        s[0] += ansatz
        s[1] += soll
        s[2] += ist
    print(f"{src.name}  (Stichtag {stichtag}, {len(roh)} Zeilen)")
    print(f"{'':24}{'Ansatz':>14}{'Soll (gebucht)':>18}{'Ist (bezahlt)':>16}")
    for (haushalt, ea), (a, soll, ist) in sorted(summen.items()):
        name = {"verwaltung": "VwH", "vermoegen": "VmH"}[haushalt]
        art = {"A": "Ausgaben", "E": "Einnahmen"}[ea]
        print(f"{name + ' ' + art:24}{a:14,.0f}{soll:18,.0f}{ist:16,.0f}")

    print(f"\n{len(werte)} Haushaltsstellen uebernommen, {len(fremd)} nicht in budget.json:")
    for hhst, soll, text in sorted(fremd):
        print(f"   {hhst}  Soll {soll:>10,.2f}  {text}")
    if fremd:
        print("   Ist darunter Relevantes, lieber den Langexport neu ziehen als hier Posten anlegen.")
    print(f"-> {OUT.relative_to(ROOT)}  ({OUT.stat().st_size / 1024:,.0f} KB)")


if __name__ == "__main__":
    main()
