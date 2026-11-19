"""
Die Erläuterungen der Kämmerei zum Entwurf: kurzer und langer Erläuterungstext
je Haushaltsstelle aus dem Arbeitsplan, so weit sie gesichtet sind.

Gesichtet heißt: etl/erlaeuterungen.yaml entscheidet je Stelle, ob der Text
gezeigt wird (`zeigen`: true, kurz für nur den kurzen Text, false), und nennt
Suchwörter, unter denen die Stelle gefunden wird. Gezeigt wird der Text aus
dem Arbeitsplan, wörtlich. Nennt er Firmen oder Fachsoftware, steht in der
YAML unter `text` derselbe Text, die Namen durch ihre Art in eckigen Klammern
ersetzt, und gezeigt wird dieser. Sonst trägt die YAML nur einen Prüfwert des
Textes, nicht den Text: Das Repository ist öffentlich. Passt der Prüfwert nicht mehr,
hat die Kämmerei die Erläuterung geändert, und die alte Entscheidung gilt
nicht: Die Stelle fällt heraus, bis sie neu gesichtet ist.

Output: data/processed/erlaeuterungen.json
  { jahr, stand, quelle,
    stellen: { <hhst_id>: { text?: [kurz, lang], such?: [wort, …] } } }

Eigene Datei: Fehlt sie, gibt es in der App keine Erläuterungen und keine
Suchwörter. Zurücknehmen heißt sie löschen.

Run:  python etl/erlaeuterungen.py   (nach etl/entwurf.py)
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import yaml

from entwurf import BUDGET, quelle, lesen

ROOT = Path(__file__).resolve().parent.parent
SICHTUNG = ROOT / "etl/erlaeuterungen.yaml"
OUT = ROOT / "data/processed/erlaeuterungen.json"


def main():
    src, jahr, stand = quelle()
    crosswalk = json.loads(BUDGET.read_text(encoding="utf-8")).get("crosswalk", {})
    roh = {}
    for hhst, z in lesen(src, jahr).items():
        glz, grz = hhst.split(".")
        kurz, lang = text_roh(z["kurz"]), text_roh(z["lang"])
        if kurz or lang:
            roh[f"{crosswalk.get(glz, glz)}.{grz}"] = {"kurz": kurz, "lang": lang}

    sichtung = yaml.safe_load(SICHTUNG.read_text(encoding="utf-8")) if SICHTUNG.exists() else {}
    stellen: dict[str, dict] = {}
    zahl = {"gezeigt": 0, "nur Suche": 0, "verworfen": 0, "veraltet": 0, "ungesichtet": 0}
    for hhst, t in sorted(roh.items()):
        s = (sichtung or {}).get(hhst)
        if s is None:
            zahl["ungesichtet"] += 1
            continue
        if s.get("pruef") != pruefwert(t["kurz"], t["lang"]):
            zahl["veraltet"] += 1
            print(f"   veraltet {hhst}: Text im Arbeitsplan geändert, neu sichten")
            continue
        eintrag: dict = {}
        if s.get("zeigen") is True and s.get("text"):
            eintrag["text"] = s["text"]
        elif s.get("zeigen") is True:
            eintrag["text"] = [x for x in (t["kurz"], t["lang"]) if x]
        elif s.get("zeigen") == "kurz" and t["kurz"]:
            eintrag["text"] = [t["kurz"]]
        such = [w.strip() for w in s.get("suchwoerter") or [] if str(w).strip()]
        if such:
            eintrag["such"] = such
        if eintrag:
            stellen[hhst] = eintrag
            zahl["gezeigt" if "text" in eintrag else "nur Suche"] += 1
        else:
            zahl["verworfen"] += 1

    out = {"jahr": jahr, "stand": stand, "quelle": src.name, "stellen": stellen}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"{src.name}: {len(roh)} Erläuterungen, " + ", ".join(f"{v} {k}" for k, v in zahl.items()))
    print(f"-> {OUT.relative_to(ROOT)}  ({OUT.stat().st_size / 1024:,.0f} KB)")


def pruefwert(kurz: str | None, lang: str | None) -> str:
    """Kurzer Fingerabdruck beider Texte, wie bei der Sichtung."""
    return hashlib.sha256(f"{kurz or ''}\n--\n{lang or ''}".encode("utf-8")).hexdigest()[:16]


def text_roh(v) -> str | None:
    """Wie in der Zelle, nur ohne Rand; Zeilenumbrüche bleiben, gezeigt wird wörtlich."""
    if v is None:
        return None
    s = str(v).strip()
    return s or None


if __name__ == "__main__":
    main()
