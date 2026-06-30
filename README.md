# Haushalt Moosburg

Der Haushalt der Stadt Moosburg a. d. Isar — interaktiv und verständlich
aufbereitet. Wohin fließt das Geld, woher kommt es, und wie entwickeln sich
einzelne Posten über die Jahre? Statt PDF-Tabellen und Aktenzeichen: Themen,
Diagramme und ein „Wofür zahle ich?"-Rechner.

🔗 **Live:** [bagruber.github.io/haushaltvis](https://bagruber.github.io/haushaltvis/)

> ⚠️ **Hinweis:** Dieses Projekt ist eine **private Eigenentwicklung**, nicht
> offiziell durch die Stadt Moosburg beauftragt oder freigegeben. Die
> Zusammenfassung und thematische Zuordnung der Daten ist **KI-gestützt** und
> kann vereinzelt Fehler enthalten — im Zweifel ist der offizielle
> Haushaltsplan der Stadt verbindlich. Wünsche, Bug-Reports und Datenanfragen
> gerne als [GitHub-Issue](https://github.com/bagruber/haushaltvis/issues).
> Keine Datenerfassung, kein Tracking, keine Cookies.

## Was zeigt die App?

Zwei parallele Sichten auf dieselben Daten:

- **Erkunden (kameral):** der ganze Haushalt als Flussdiagramm — Einnahmen links,
  Ausgaben nach Einzelplänen rechts. Von dort eine Ebene tiefer in Einzelpläne,
  Unterabschnitte (Einrichtungen) und einzelne Posten.
- **Themen:** elf bürgernahe Themen (Kinder & Jugend, Bildung, Mobilität,
  Umwelt …) als Überblick (Sunburst / Kreise / Treemap), je mit Geldfluss,
  Zeitverlauf und größten Posten. Ein Posten kann mehreren Themen zugeordnet sein.
- **Einnahmen** nach Art (Steuern, Zuweisungen, Gebühren …) mit Steuer-Zeitverlauf.
- **Investitionen** (Vermögenshaushalt): Brutto → Förderung → Netto-Eigenanteil,
  inkl. gestapeltem Mehrjahres-Verlauf.
- **Wofür zahle ich?** — schätzt aus Einkommen- und Grundsteuer den kommunalen
  Beitrag und verteilt ihn anteilig auf die Themen.
- **Stichjahr-Slider**, Suche, Glossar-Tooltips und eine
  [Methodik-Seite](https://bagruber.github.io/haushaltvis/methodik).

Vier Ebenen ziehen sich durch: **Gesamthaushalt → Einzelplan → Unterabschnitt →
Einzelposten**, jeweils verlinkt; Themen sind eine zusätzliche Schicht darüber.

## Stack

Bewusst minimal — läuft rein statisch auf GitHub Pages, ohne Backend, ohne
Tracking.

- **[Vite](https://vite.dev) 6** + **React 19** + **React Router 7** + **TypeScript**
- **[Tailwind CSS v4](https://tailwindcss.com)** via `@tailwindcss/vite`
- **[Apache ECharts](https://echarts.apache.org)** + **[d3-hierarchy](https://d3js.org)**
  für die Visualisierungen
- **Python** (openpyxl, pyyaml) für die Daten-Pipeline (`etl/`)

## Lokal entwickeln

```bash
npm install
npm run dev        # Dev-Server auf http://localhost:5173
npm run build      # Produktions-Build nach dist/
npm run typecheck  # nur tsc, kein Build
npm run data       # Daten neu erzeugen (Python, siehe unten)
```

## Daten-Pipeline

Aus den AKDB-Excel-Exporten der Stadt (`haushaltsplaene/`) werden statische
JSONs gebaut. Alles skriptbasiert und reproduzierbar:

```bash
python etl/ingest.py     # Excel → kanonische Faktentabelle (data/processed/budget.json)
python etl/classify.py   # Themen-Zuordnung laut etl/taxonomy.yaml
python etl/build_web.py  # minifizierte JSONs nach public/data/
# Hilfen:
python etl/trace.py            # Posten → Frontend-Routen (data/processed/trace.csv)
python etl/review_taxonomy.py  # Thema → Bereich → Einrichtung (Review-Markdown)
```

Von Hand pflegbar (kein Code nötig): `etl/taxonomy.yaml` (Themen + Zuordnung),
`etl/labels.yaml` (Bereichsnamen), `etl/context.yaml` (Einwohner + Inflation),
`etl/einleitungen.yaml` (Einzelplan-Texte), `etl/glossar.yaml`, `etl/events.yaml`.
Ein neuer Jahrgang: Excel ablegen → `npm run data` → committen.

## Projektstruktur

```
etl/             Python-Daten-Pipeline + editierbare YAMLs
haushaltsplaene/ AKDB-Quell-Exporte (Excel/PDF)
public/data/     fertige JSONs für die Web-App
src/lib/         Daten-Laden, Typen, Selektoren, Farben
src/components/  Charts, Layout, Suche, Timeline, Glossar
src/pages/       die Seiten/Routen
```

Deployment automatisch via GitHub Actions (`.github/workflows/deploy.yml`) bei
Push auf `main`.

## Geschwister-Apps

Teil einer kleinen Familie von Transparenz-Anwendungen für Moosburg:

- **[bagruber/council](https://github.com/bagruber/council)** — Stadtrats-Transparenz
- **[bagruber/datahub](https://github.com/bagruber/datahub)** — Daten-Dashboards
- **bagruber/haushaltvis** *(dieses Repo)* — Haushaltsvisualisierung
