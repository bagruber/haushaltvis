"""
Ingest Moosburg kameral budget data from the AKDB Excel exports into one
canonical, tidy JSON (the "Kameral-Rückgrat").

Sources (see memory/data-sources.md):
  A) HHStellen Ansatz Ergebnis 2018-2022.xlsx / Sheet1  -> Ansatz + Ergebnis 2018..2023
  B) Haushalt 2024 - 15.11.2024.xlsx                    -> Ansatz 2024 + provisional Ist 2024

Output: data/processed/budget.json
  {
    meta:   { generated, years, sources, counts },
    posten: { <hhst_id>: { hhst_id, einzelplan, glz, grz, glz_text, grz_text,
                           kontotext, ea, haushalt } },
    facts:  [ { hhst_id, year, ansatz, ergebnis, provisional } ]
  }

Run:  python etl/ingest.py
"""
from __future__ import annotations

import json
import datetime as dt
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC_A = ROOT / "haushaltsplaene/Haushaltsplanentwurf 2024/HHStellen Ansatz Ergebnis 2018-2022.xlsx"
SRC_B = ROOT / "haushaltsplaene/Haushaltsentwurf 2025/Haushalt 2024 - 15.11.2024.xlsx"
OUT = ROOT / "data/processed/budget.json"

EINZELPLAN_NAME = {
    "0": "Allgemeine Verwaltung",
    "1": "Öffentliche Sicherheit und Ordnung",
    "2": "Schulen",
    "3": "Wissenschaft, Forschung, Kulturpflege",
    "4": "Soziale Sicherung",
    "5": "Gesundheit, Sport, Erholung",
    "6": "Bau- und Wohnungswesen, Verkehr",
    "7": "Öffentliche Einrichtungen, Wirtschaftsförderung",
    "8": "Wirtschaftliche Unternehmen, allg. Grund-/Sondervermögen",
    "9": "Allgemeine Finanzwirtschaft",
}


def code(v) -> str | None:
    """Normalise a GLZ/GRZ cell to a zero-padded 4-char string."""
    if v is None:
        return None
    if isinstance(v, float):
        v = int(v)
    s = str(v).strip()
    if not s:
        return None
    return s.zfill(4)


def num(v):
    """Parse a numeric cell; blanks -> None, so we can distinguish 0 from missing."""
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)):
        return round(float(v), 2)
    s = str(v).strip().replace(".", "").replace(",", ".")
    try:
        return round(float(s), 2)
    except ValueError:
        return None


def ea_of(grz: str) -> str:
    return "E" if grz[0] in "0123" else "A"


def haushalt_of(grz: str) -> str:
    # Verwaltung = HG 0,1,2 (E) + 4,5,6,7,8 (A);  Vermögen = HG 3 (E) + 9 (A)
    return "vermoegen" if grz[0] in "39" else "verwaltung"


def register(posten: dict, glz: str, grz: str, glz_text=None, grz_text=None, kontotext=None):
    hhst = f"{glz}.{grz}"
    p = posten.get(hhst)
    if p is None:
        p = {
            "hhst_id": hhst,
            "einzelplan": glz[0],
            "einzelplan_name": EINZELPLAN_NAME[glz[0]],
            "glz": glz,
            "grz": grz,
            "glz_text": None,
            "grz_text": None,
            "kontotext": None,
            "ea": ea_of(grz),
            "haushalt": haushalt_of(grz),
        }
        posten[hhst] = p
    # Prefer first non-empty text we see (Source B is processed first -> authoritative)
    if glz_text and not p["glz_text"]:
        p["glz_text"] = str(glz_text).strip()
    if grz_text and not p["grz_text"]:
        p["grz_text"] = str(grz_text).strip()
    if kontotext and not p["kontotext"]:
        p["kontotext"] = str(kontotext).strip()
    return hhst


def ingest_b(posten: dict, facts: list):
    """2024 file: Ansatz 2024 + provisional Ist 2024. Authoritative for texts."""
    wb = openpyxl.load_workbook(SRC_B, read_only=True, data_only=True)
    ws = wb.active
    glz_text_map, grz_text_map = {}, {}
    n = 0
    for i, r in enumerate(ws.iter_rows(values_only=True)):
        if i < 2:  # row 0 = junk totals, row 1 = header
            continue
        _, ea, _ep, glz_c, grz_c, glz_t, grz_t, konto, ansatz, recherg = r[:10]
        glz, grz = code(glz_c), code(grz_c)
        if not glz or not grz:
            continue
        hhst = register(posten, glz, grz, glz_t, grz_t, konto)
        if glz_t:
            glz_text_map[glz] = str(glz_t).strip()
        if grz_t:
            grz_text_map[grz] = str(grz_t).strip()
        a, e = num(ansatz), num(recherg)
        if a is not None or e is not None:
            facts.append({"hhst_id": hhst, "year": 2024, "ansatz": a,
                          "ergebnis": e, "provisional": True})
            n += 1
    wb.close()
    return glz_text_map, grz_text_map, n


def ingest_a(posten: dict, facts: list, glz_text_map: dict, grz_text_map: dict):
    """2018-2022 file Sheet1: Ansatz + RechErg per year, GLZ is sparse (forward-fill)."""
    wb = openpyxl.load_workbook(SRC_A, read_only=True, data_only=True)
    ws = wb["Sheet1"]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()

    # Detect year columns from row 0: a cell that is a 4-digit year; Ansatz=col, RechErg=col+1.
    year_cols = {}
    for ci, v in enumerate(rows[0]):
        try:
            y = int(v)
        except (TypeError, ValueError):
            continue
        if 2000 <= y <= 2100:
            year_cols[y] = ci

    n = 0
    cur_glz = None
    for r in rows[2:]:
        glz_c, grz_c = r[0], r[1]
        if code(glz_c):
            cur_glz = code(glz_c)
        grz = code(grz_c)
        if not grz or not cur_glz:
            continue
        hhst = register(posten, cur_glz, grz,
                        glz_text_map.get(cur_glz), grz_text_map.get(grz))
        for year, ci in year_cols.items():
            a = num(r[ci]) if ci < len(r) else None
            e = num(r[ci + 1]) if ci + 1 < len(r) else None
            if a is not None or e is not None:
                facts.append({"hhst_id": hhst, "year": year, "ansatz": a,
                              "ergebnis": e, "provisional": False})
                n += 1
    return n


import re

RE_OLD = re.compile(r"bis\s*2022\s*-?\s*(\d{4,6})", re.I)   # text on NEW code names the OLD code
RE_NEW = re.compile(r"ab\s*202[23]\s*-?\s*(\d{4,6})", re.I)  # text on OLD code names the NEW code


def build_crosswalk(posten: dict) -> dict:
    """
    Map renumbered Gliederungen (recoding ~2022/2023) old->new, parsed from the
    'bis 2022 - XXXX' / 'ab 2023 XXXX' annotations in the GLZ texts. Ambiguous
    splits (one old code -> several new codes) are left unmapped.
    """
    edges: dict[str, set] = {}
    for p in posten.values():
        new_glz = p["glz"]
        tx = p.get("glz_text") or ""
        m = RE_OLD.search(tx)
        if m:
            edges.setdefault(m.group(1).zfill(4), set()).add(new_glz)
        for m2 in RE_NEW.finditer(tx):
            edges.setdefault(new_glz, set()).add(m2.group(1).zfill(4))

    direct = {old: next(iter(news)) for old, news in edges.items()
              if len(news) == 1 and next(iter(news)) != old}

    def resolve(c: str) -> str:
        seen = set()
        while c in direct and c not in seen:
            seen.add(c)
            c = direct[c]
        return c

    return {old: resolve(old) for old in direct}


def apply_crosswalk(posten: dict, facts: list, cw: dict,
                    glz_text_map: dict, grz_text_map: dict) -> int:
    """Remap facts on old GLZ codes to their current code; merge and tidy posten."""
    remapped = 0
    for f in facts:
        glz, grz = f["hhst_id"].split(".")
        if glz in cw:
            f["hhst_id"] = f"{cw[glz]}.{grz}"
            remapped += 1

    # merge facts that now share (hhst_id, year)
    merged: dict[tuple, dict] = {}
    for f in facts:
        key = (f["hhst_id"], f["year"])
        if key in merged:
            cur = merged[key]
            for col in ("ansatz", "ergebnis"):
                if f[col] is not None:
                    cur[col] = (cur[col] or 0) + f[col]
        else:
            merged[key] = f
    facts[:] = list(merged.values())

    used = {f["hhst_id"] for f in facts}
    for hh in list(posten):
        if hh not in used:
            del posten[hh]
    for hh in used:
        if hh not in posten:
            glz, grz = hh.split(".")
            register(posten, glz, grz, glz_text_map.get(glz), grz_text_map.get(grz))
    return remapped


def main():
    posten: dict = {}
    facts: list = []

    glz_text_map, grz_text_map, nb = ingest_b(posten, facts)
    na = ingest_a(posten, facts, glz_text_map, grz_text_map)

    crosswalk = build_crosswalk(posten)
    n_remap = apply_crosswalk(posten, facts, crosswalk, glz_text_map, grz_text_map)

    years = sorted({f["year"] for f in facts})
    out = {
        "meta": {
            "generated": dt.datetime.now().isoformat(timespec="seconds"),
            "years": years,
            "sources": {"2018-2023": SRC_A.name, "2024": SRC_B.name},
            "counts": {"posten": len(posten), "facts": len(facts),
                       "facts_2024": nb, "facts_hist": na,
                       "crosswalk_codes": len(crosswalk), "facts_remapped": n_remap},
            "note": "2024 ergebnis is provisional Ist-Vollzug, not final RechErg.",
        },
        "crosswalk": crosswalk,
        "posten": posten,
        "facts": facts,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    # Stats for verification
    print(f"posten={len(posten)} facts={len(facts)} years={years}")
    print(f"crosswalk: {len(crosswalk)} alte Codes -> neu, {n_remap} Fakten umgehängt")
    for old, new in sorted(crosswalk.items()):
        print(f"    {old} -> {new}")
    missing_glz = sum(1 for p in posten.values() if not p["glz_text"])
    missing_grz = sum(1 for p in posten.values() if not p["grz_text"])
    print(f"posten without glz_text={missing_glz}, without grz_text={missing_grz}")
    from collections import defaultdict
    by = defaultdict(float)
    for f in facts:
        if f["year"] == 2023 and f["ansatz"]:
            p = posten[f["hhst_id"]]
            by[(p["haushalt"], p["ea"])] += f["ansatz"]
    print("Ansatz 2023 by (haushalt, E/A):")
    for k in sorted(by):
        print(f"  {k[0]:11} {k[1]}  {by[k]:16,.0f}")
    print(f"-> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
