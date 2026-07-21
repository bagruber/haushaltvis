"""
Ingest Moosburg kameral budget data into one canonical, tidy JSON (the
"Kameral-Rückgrat").

Quelle (ein Export genügt): die AKDB-Auswertung „Haushaltstellen" — eine
Langformat-Tabelle mit einer Zeile je Haushaltsstelle UND Jahr, die Ansatz,
Rechnungsergebnis, Texte, E/A und die Kennung „freiwillige Leistung" enthält.
Spalten werden über die Kopfzeile erkannt (nicht über feste Positionen), damit
ein neuer Export derselben Form ohne Anpassung funktioniert.

Output: data/processed/budget.json
  {
    meta:   { generated, years, source, counts },
    posten: { <hhst_id>: { hhst_id, einzelplan, einzelplan_name, glz, grz,
                           glz_text, grz_text, kontotext, ea, haushalt, freiwillig } },
    facts:  [ { hhst_id, year, ansatz, ergebnis, provisional } ]
  }

Run:  python etl/ingest.py
"""
from __future__ import annotations

import json
import re
import datetime as dt
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "haushaltsplaene/Official Data/Auswertung 2016 - 2026 Haushaltstellen.xlsx"
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
            "einzelplan_name": EINZELPLAN_NAME.get(glz[0], glz[0]),
            "glz": glz,
            "grz": grz,
            "glz_text": None,
            "grz_text": None,
            "kontotext": None,
            "ea": ea_of(grz),
            "haushalt": haushalt_of(grz),
            "freiwillig": False,
        }
        posten[hhst] = p
    if glz_text and not p["glz_text"]:
        p["glz_text"] = str(glz_text).strip()
    if grz_text and not p["grz_text"]:
        p["grz_text"] = str(grz_text).strip()
    if kontotext and str(kontotext).strip() and not p["kontotext"]:
        p["kontotext"] = str(kontotext).strip()
    return hhst


def header_map(row) -> dict:
    """Normalised header name -> column index."""
    idx = {}
    for ci, v in enumerate(row):
        if v is None:
            continue
        idx[" ".join(str(v).split()).lower()] = ci
    return idx


def find(idx: dict, *names: str) -> int:
    for n in names:
        if n in idx:
            return idx[n]
    raise KeyError(f"Spalte nicht gefunden (eine von {names}). Vorhanden: {sorted(idx)[:12]}…")


def ingest(posten: dict, facts: list):
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    ws = wb.active
    it = ws.iter_rows(values_only=True)
    idx = header_map(next(it))
    c_hj = find(idx, "hj", "haushaltsjahr")
    c_glz = find(idx, "glz")
    c_grz = find(idx, "grz")
    c_glzt = find(idx, "glz-text")
    c_grzt = find(idx, "grz-text")
    c_konto = find(idx, "kontotext")
    c_ans = find(idx, "ansatz (ges.)", "ansatz(ges.)", "ansatz")
    c_erg = find(idx, "recherg")
    c_freiw = idx.get("freiw.leistung")

    years: set[int] = set()
    freiw_latest: dict[str, tuple[int, bool]] = {}
    n = 0
    for r in it:
        try:
            year = int(r[c_hj])
        except (TypeError, ValueError):
            continue
        glz, grz = code(r[c_glz]), code(r[c_grz])
        if not glz or not grz:
            continue
        hhst = register(posten, glz, grz, r[c_glzt], r[c_grzt], r[c_konto])
        if c_freiw is not None:
            fv = str(r[c_freiw]).strip() in ("1", "1.0", "J", "j", "Ja", "ja")
            cur = freiw_latest.get(hhst)
            if cur is None or year > cur[0]:
                freiw_latest[hhst] = (year, fv)
        a, e = num(r[c_ans]), num(r[c_erg])
        if a is not None or e is not None:
            facts.append({"hhst_id": hhst, "year": year, "ansatz": a, "ergebnis": e, "provisional": False})
            years.add(year)
            n += 1
    wb.close()

    # Ergebnis des laufenden (jüngsten) Jahres ist vorläufig.
    maxy = max(years) if years else None
    for f in facts:
        if f["year"] == maxy and f["ergebnis"] is not None:
            f["provisional"] = True
    for hhst, (_, fv) in freiw_latest.items():
        if hhst in posten:
            posten[hhst]["freiwillig"] = fv
    return n, sorted(years), maxy


RE_OLD = re.compile(r"bis\s*2022\s*-?\s*(\d{4,6})", re.I)   # text on NEW code names the OLD code
RE_NEW = re.compile(r"ab\s*202[23]\s*-?\s*(\d{4,6})", re.I)  # text on OLD code names the NEW code


def build_crosswalk(posten: dict) -> dict:
    """Map renumbered Gliederungen (recoding ~2022/2023) old->new from the
    'bis 2022 - XXXX' annotations. Ambiguous splits are left unmapped."""
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


def apply_crosswalk(posten: dict, facts: list, cw: dict) -> int:
    glz_text = {p["glz"]: p["glz_text"] for p in posten.values() if p["glz_text"]}
    grz_text = {p["grz"]: p["grz_text"] for p in posten.values() if p["grz_text"]}
    remapped = 0
    for f in facts:
        glz, grz = f["hhst_id"].split(".")
        if glz in cw:
            f["hhst_id"] = f"{cw[glz]}.{grz}"
            remapped += 1
    merged: dict[tuple, dict] = {}
    for f in facts:
        key = (f["hhst_id"], f["year"])
        if key in merged:
            cur = merged[key]
            for col in ("ansatz", "ergebnis"):
                if f[col] is not None:
                    cur[col] = (cur[col] or 0) + f[col]
            cur["provisional"] = cur["provisional"] or f["provisional"]
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
            register(posten, glz, grz, glz_text.get(glz), grz_text.get(grz))
    return remapped


def main():
    posten: dict = {}
    facts: list = []
    n, years, maxy = ingest(posten, facts)
    crosswalk = build_crosswalk(posten)
    n_remap = apply_crosswalk(posten, facts, crosswalk)

    out = {
        "meta": {
            "generated": dt.datetime.now().isoformat(timespec="seconds"),
            "years": sorted({f["year"] for f in facts}),
            "source": SRC.name,
            "counts": {"posten": len(posten), "facts": len(facts),
                       "crosswalk_codes": len(crosswalk), "facts_remapped": n_remap,
                       "freiwillig": sum(1 for p in posten.values() if p["freiwillig"])},
            "note": f"Ergebnis {maxy} ist vorläufiger Ist-Vollzug, nicht endgültige RechErg.",
        },
        "crosswalk": crosswalk,
        "posten": posten,
        "facts": facts,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

    # Verification
    print(f"posten={len(posten)} facts={len(facts)} years={years} (provisorisch: {maxy})")
    print(f"crosswalk: {len(crosswalk)} alte Codes -> neu, {n_remap} Fakten umgehängt")
    print(f"freiwillige Leistungen: {sum(1 for p in posten.values() if p['freiwillig'])} Posten")
    from collections import defaultdict
    for probe in (2020, 2024):
        by = defaultdict(float)
        for f in facts:
            if f["year"] == probe and f["ansatz"]:
                p = posten[f["hhst_id"]]
                by[(p["haushalt"], p["ea"])] += f["ansatz"]
        print(f"Ansatz {probe} je (Haushalt, E/A):", {f"{k[0]}/{k[1]}": round(v) for k, v in sorted(by.items())})
    print(f"-> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
