# Datenformat & Unabhängigkeit

Die App ist ein **statisches Programm, das seine Daten zur Laufzeit** aus dem
Ordner `data/` (im veröffentlichten Build: `dist/data/`) lädt — nichts ist ins
JavaScript „eingebacken". Daraus folgt das Betriebsmodell:

> **Einmal bauen, dann nur noch Dateien tauschen.** Wer die Dateien in `data/`
> im hier beschriebenen Format ersetzt, aktualisiert die App **ohne neuen Build**,
> ohne Python, ohne dieses Repository. Beim nächsten Laden erscheint der neue Stand.

Zwei Dateien sind für die Verwaltung relevant:

- **`data/budget.json`** — die eigentlichen Haushaltsdaten (Rohdaten, aggregiert).
- **`data/zuordnung.json`** — die thematische Zuordnung (Export des Werkzeugs
  `/intern/zuordnung`). Optional; wenn vorhanden, **gewinnt sie** über die
  mitgelieferte Standard-Zuordnung.

Die übrigen Dateien (`themes.json`, `context.json`, `labels.json`,
`einleitungen.json`, `glossar.json`, `events.json`) sind stabiler und nur bei
inhaltlichen Änderungen anzufassen.

---

## `data/budget.json` (Pflicht)

```jsonc
{
  "meta": {
    "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024],  // vorhandene Jahre
    "note": "…"                                            // frei, optional
  },
  "posten": {                        // Objekt: Haushaltsstellen-ID -> Stammdaten
    "2110.4107": {
      "hhst_id": "2110.4107",        // = "<GLZ>.<GRZ>"
      "einzelplan": "2",             // 1. Ziffer der GLZ
      "einzelplan_name": "Schulen",
      "glz": "2110",                 // Gliederung (Unterabschnitt/Einrichtung)
      "grz": "4107",                 // Gruppierung
      "glz_text": "Anton-Vitzthum-Grundschule",
      "grz_text": "Beamtenbezüge",
      "kontotext": null,             // optionaler Zusatztext oder null
      "ea": "A",                     // "E" = Einnahme, "A" = Ausgabe
      "haushalt": "verwaltung"       // "verwaltung" | "vermoegen"
    }
    // … alle weiteren Posten
  },
  "facts": [                         // eine Zeile je Posten UND Jahr
    {
      "hhst_id": "2110.4107",
      "year": 2024,
      "ansatz": 87800,               // Plan (€) oder null
      "ergebnis": null,              // Ist (€) oder null
      "provisional": true            // true = Ergebnis noch vorläufig
    }
    // …
  ]
}
```

**Ableitungsregeln** (falls selbst erzeugt): `ea` = `E`, wenn die erste Ziffer
der GRZ 0–3 ist, sonst `A`. `haushalt` = `vermoegen`, wenn die erste GRZ-Ziffer
3 oder 9 ist, sonst `verwaltung`. Beträge sind ganze Euro (Punkt als
Dezimaltrenner, kein Tausenderpunkt). `null` heißt „kein Wert", `0` heißt „null Euro".

Diese Datei entsteht heute aus den AKDB-Excel-Exporten via `etl/ingest.py` — das
ist die **Referenz-Umsetzung**. Jede beliebige Quelle (eigenes Skript, IT der
Stadt, späteres Doppik-System), die dieses Schema ausgibt, funktioniert genauso.

---

## `data/zuordnung.json` (optional, gewinnt wenn vorhanden)

Exakt das **Export-Format des Werkzeugs** `/intern/zuordnung`. Getrennt nach
Haushalt auf Unterabschnitts-Ebene, plus Ebene der Einzelposten:

```jsonc
{
  "unterabschnitt": {
    "verwaltung": { "2110": ["bildung"], "5701": ["sport_gesundheit"] },
    "vermoegen":  { "8812": ["wohnen", "wirtschaft"] }
  },
  "posten": {                        // optional, feinste Ebene
    "7692.7150": ["kultur_freizeit", "sport_gesundheit"]
  }
}
```

Die App berechnet daraus je Posten die Themen als **Vereinigung** aus
Posten-Ebene und der Unterabschnitts-Ebene des jeweiligen Haushalts. Die
Theme-IDs müssen in `themes.json` definiert sein. Ist die Datei leer oder fehlt
sie, greift die mitgelieferte Standard-Zuordnung aus `themes.json`.

**Workflow:** im Werkzeug sortieren → „Export JSON" → Datei als `zuordnung.json`
nach `data/` legen → fertig (kein Build).

---

## Weitere Dateien (nur bei Bedarf)

- **`data/themes.json`** — `{ themes: { <id>: {label, color, description} }, assignment: { … } }`.
  Enthält die Themen-Definitionen (Name, Farbe) und eine Standard-Zuordnung.
- **`data/context.json`** — `{ population: { "2024": 19908, … }, cpi: { "2024": 119.3, … } }`
  für Pro-Kopf- und Inflations-Ansichten.
- **`data/labels.json`** — `{ abschnitt: { "21": "Schulen" }, unterabschnitt: { … } }`
  saubere Namen für Bereiche.
- **`data/einleitungen.json`** — `{ "ep:2": "Einleitungstext …" }` je Einzelplan.
- **`data/glossar.json`** — `{ "ansatz": "Definition …" }`.
- **`data/events.json`** — `{ "events": [ { scope, id, year, title, text } ] }`.

Alle diese Dateien lassen sich einzeln austauschen; die App lädt sie tolerant
(fehlt eine, läuft die App ohne das jeweilige Extra weiter).
