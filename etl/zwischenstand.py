"""
Zwischenstand zu einem Stichtag: was bis dahin gebucht (Anordnungs-Soll) und
was bezahlt (Ist) ist. Mehrere Jahre, damit sich der Stand des laufenden
Jahres mit demselben Stichtag des Vorjahres vergleichen lässt.

Quelle: die AKDB-Stichtagsauswertungen in haushaltsplaene/zwischenstand/, je
Jahr die mit dem jüngsten Stichtag. Gleiche Spalten wie der Langexport; Jahr
und Stichtag stehen aber verlässlich nur im Dateinamen, und die Kopfzeile ist
Zeile 2 (Zeile 1 ist eine Summenzeile).

Ein Stand zum Monatsletzten gilt als Stand zum Ersten des Folgemonats:
„Stand 30.09.2025“ und „Stand 01.10.2026“ meinen denselben Schnitt nach dem
dritten Quartal, und so tragen beide Jahre denselben Stichtag 01.10.

Output: data/processed/zwischenstand.json
  { staende: [ { jahr, stichtag, quelle, werte: { <hhst_id>: [soll, ist] } }, … ] }
  nach Jahr aufsteigend.

Eigene Datei, nicht in budget.json: budget.json ist der dokumentierte Vertrag
mit der Stadt (DATENFORMAT.md) und bleibt unverändert. Fehlt diese Datei, ist
das Feature in der App weg — zurücknehmen heißt sie löschen.

Run:  python etl/zwischenstand.py
"""
from __future__ import annotations

import datetime as dt
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


def stichtag_von(tag: str, monat: str, jahr: str) -> str:
    """ISO-Stichtag; ein Monatsletzter wird zum Ersten des Folgemonats."""
    d = dt.date(int(jahr), int(monat), int(tag))
    if (d + dt.timedelta(days=1)).day == 1:
        d += dt.timedelta(days=1)
    return d.isoformat()


def quellen() -> list[tuple[Path, int, str]]:
    """Je Jahr die Auswertung mit dem jüngsten Stichtag: (Datei, Jahr, Stichtag)."""
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
        kandidaten.append((int(jahr), f"{stichjahr}-{monat}-{tag}", f, stichtag_von(tag, monat, stichjahr)))
    if not kandidaten:
        raise SystemExit(f"Keine Auswertung in {SRC_DIR.relative_to(ROOT)} gefunden.")
    je_jahr: dict[int, tuple[Path, int, str]] = {}
    for jahr, roh, datei, stichtag in sorted(kandidaten):
        je_jahr[jahr] = (datei, jahr, stichtag)  # sortiert: der jüngste gewinnt
        if roh != stichtag:
            print(f"{datei.name}: Stand {roh} gilt als Stichtag {stichtag}")
    return [je_jahr[j] for j in sorted(je_jahr)]


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
    budget = json.loads(BUDGET.read_text(encoding="utf-8"))
    staende = [stand(src, jahr, stichtag, budget) for src, jahr, stichtag in quellen()]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps({"staende": staende}, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"-> {OUT.relative_to(ROOT)}  ({OUT.stat().st_size / 1024:,.0f} KB, {len(staende)} Stichtage)")


def stand(src: Path, jahr: int, stichtag: str, budget: dict) -> dict:
    """Eine Auswertung lesen, auf die Haushaltsstellen von budget.json abbilden, prüfen."""
    roh = lesen(src)
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
    print()
    return {"jahr": jahr, "stichtag": stichtag, "quelle": src.name, "werte": werte}


if __name__ == "__main__":
    main()
