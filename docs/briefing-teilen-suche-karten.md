# Briefing: Teilen, Suche, Zwischenstand 2026, Vorschaukarten

*Angelegt am 14.10.2026. Alle Entscheidungen sind getroffen, die Umsetzung
kann beginnen. Fünf Arbeitspakete plus ein Aufräumschritt. Wer das Briefing
abarbeitet, liest zuerst Abschnitt 0 ganz. Abschnitt 7 (Betrieb) ist nur
Hintergrund und wird nicht umgesetzt.*

Rahmen, der für alle Pakete gilt:

- Gearbeitet wird auf einem Branch **von `probe/formsprache`** aus, nicht von
  `main`. Die Suche nutzt die Einzelplan-Icons und den `Klecks` aus der Probe.
- **Ein neues Paket, sonst keins:** `playwright-core` für die Vorschaukarten
  (Paket 6). Es kommt **zuerst** in `hausbasis/baseline.json`, mit dem Range,
  den die Pride Map schon nutzt (`^1.61.1`), dann hier. Alles andere geht mit
  React, ECharts und Phosphor, die schon da sind.
- Nach jedem Paket: `pnpm typecheck && pnpm test && pnpm build`, dann im
  Dev-Server bei 375 px und bei Desktop-Breite ansehen.
- Commit-Nachrichten ohne Hinweis auf KI-Unterstützung.

---

## 0. Entscheidungen

Am 14.10.2026 von Benedict bestätigt:

- **Sollstand** = die AKDB-Spalte `Soll_HS`, also das Anordnungs-Soll (gebucht),
  daneben `Ist_HS` (bezahlt). Kein zeitanteiliger Plan.
- **Benennung bleibt, wie sie ist:** Die zweistellige Ebene heißt in der
  Oberfläche „Bereich“ (kameral: Abschnitt), siehe `src/lib/hierarchy.ts`.
  Schreibweise der Nummer `21xx`, `xx` gedämpft. Nur Bereich 46 hat auch
  5-stellige Gliederungen (`46410` …); `46xx` liest sich trotzdem als „beginnt
  mit 46“.
- **Der Zwischenstand ist vorläufig:** ein Versuch für die kommende Sitzung und
  für die interne Arbeit. Datenschutz ist dafür kein Hindernis. Vor einem Merge
  nach `main` neu entscheiden, ob er bleibt.
- **Marken des Zwischenstands:** Ausgaben „gebucht bis 30.09.“ (Soll) und
  „bezahlt bis 30.09.“ (Ist), Einnahmen „festgesetzt“ und „eingegangen“.
  „Anordnungs-Soll“ nur im Glossar.
- **In der Ansicht „mit Einnahmen verrechnet“ kein Zwischenstand.** Einnahmen
  kommen zeitlich ganz anders herein als Ausgaben (Gebühren oft einmal
  jährlich); die Differenz nach neun Monaten wäre Rauschen.
- **Zwischenstand erst nur in der gemeinsamen `Timeline`** (Posten, Einrichtung,
  Bereiche im Einzelplan). Home, Einnahmen, Investitionen und Querschnitte
  haben eigene Charts und kommen später, wenn die Form trägt.
- **Ansichts-Schalter wandern in den geteilten Link.** Wer einen Ausschnitt
  teilt, meint das Bild, das er gerade sieht.
- **Vorschaukarten gehören in diese Runde**, nach dem Entwurf in
  `docs/vorschaukarten/` (Paket 6). Gerendert wird mit `playwright-core`, wie
  in der Pride Map, nicht mit satori/resvg. Begründung in Paket 6.
- **Themen in der Suche** zeigen auf `/themen`, solange die Themen-Details
  gesperrt sind.
- **Betrieb bei der Stadt ist offen**, bis Benedict mit der IT gesprochen hat.
  Paket 6 ist so gebaut, dass es keine Variante ausschließt (Abschnitt 7).

---

## 1. Checkbox „mit Einnahmen verrechnet“ ans Ende

Klein und unabhängig, daher zuerst.

In `TimelineControls` ([src/components/Timeline.tsx](../src/components/Timeline.tsx))
den `hasEinnahmen`-Block hinter den `hasContext`-Block verschieben. Reihenfolge
danach: Investitionen zeigen · inflationsbereinigt · je Einwohner · mit Einnahmen
verrechnet. Sonst nichts ändern.

**Prüfen:** Einrichtung mit Einnahmen und Investitionen (z. B. ein Freibad) und
ein Einzelplan zeigen die neue Reihenfolge; Einnahmen- und Querschnittseite, die
nur `hasContext` setzen, sehen aus wie vorher.

---

## 2. Teilen, feiner als eine Seite

### Ist-Zustand

`Teilen` in [src/components/ui.tsx](../src/components/ui.tsx) teilt
`window.location.href`, also Seite plus `?jahr=`. Es sitzt auf Einzelplan,
Einrichtung, Posten und „Wofür zahle ich?“. Abschnitte innerhalb einer Seite
haben keine Adresse; die Diagramm-Schalter liegen in `useState` und gehen beim
Teilen verloren.

### URL-Form: Abschnitt im Pfad

Zwei Formen fallen aus:

- `#bereich-21` bricht im Hash-Router-Modus (`VITE_ROUTER=hash`, das portable
  Demo-Paket): Dort ist die Route selbst schon `#/einzelplan/2`.
- `?teil=bereich-21` funktioniert in der App, aber nicht für Vorschaukarten
  (Paket 6): Ein statischer Host liefert für `/einzelplan/2?teil=…` dieselbe
  Datei wie für `/einzelplan/2`, also dieselbe Karte.

Deshalb kommt der Abschnitt in den Pfad. Jeder teilbare Abschnitt ist damit eine
eigene Adresse, für die Paket 6 eine eigene HTML-Datei mit eigener Karte ablegen
kann:

```
/bereich/21                              → Einzelplan 2, bei Bereich 21
/erkunden/querschnitte/strom             → Querschnitte, bei Strom
/erkunden/einnahmen/<g.key>
/erkunden/investitionen/vorhaben
/ueberblick/verlauf                      → Startseite, bei „über die Jahre“
/glossar/ansatz
```

- `/bereich/:ab` ist neu und steht neben `/einrichtung/:glz` und `/posten/:id`:
  Jede Haushaltsebene hat damit eine kurze Adresse. Die Route rendert
  `EinzelplanDetail` mit `ep = ab[0]` und scrollt zu Bereich `ab`.
- Die übrigen Seiten bekommen ein optionales Segment `:teil?` (React Router 7
  kann das). `/ueberblick/:teil` ist ein Alias, der `Home` rendert.
- Kennungen aus Daten-Schlüsseln, nie aus Beschriftungen (die ändern sich):
  `21`, `personal`, `strom` … Die Abschnitte tragen dieselbe Kennung als
  HTML-`id`.

Query-Parameter bleiben für den Zustand, der keine eigene Karte braucht:

- `ansicht` — kommagetrennte Schalter aus `TimelineMode`: `invest`, `real`,
  `kopf`, `netto`. Fehlt der Parameter, alles aus.
- `jahr` bleibt wie es ist (`YearUrlSync` in [src/lib/year.tsx](../src/lib/year.tsx)).

### Umsetzung

1. **`useAnsicht()`** in `src/lib/` — ersetzt das `useState<TimelineMode>({})`
   auf den Seiten, liest und schreibt `?ansicht=` mit `replace: true` (gleiches
   Muster wie `YearUrlSync`). Seiten: EinzelplanDetail, EinrichtungDetail,
   PostenDetail, Querschnitte, Einnahmen, ThemeDetail.
2. **`useTeilScroll(teil: string | undefined, bereit: boolean)`** — scrollt nach
   dem Laden der Daten einmal zum Element mit `id === teil`. Die Daten kommen
   asynchron, deshalb erst scrollen, wenn `bereit` true ist.
3. **`Teilen` um `pfad` und `titel` erweitern.** Ohne `pfad` verhält es sich wie
   heute. Mit `pfad` teilt es diesen Pfad plus die aktuellen Query-Parameter
   und als Titel `"{titel} · {document.title}"`. Die URL-Bildung als reine
   Funktion herausziehen (`teilUrl(href, pfad)`) und testen, auch für den
   Hash-Modus.
4. **Kleiner Link-Knopf an Abschnittsüberschriften**: nur Icon (`LinkSimple` aus
   Phosphor), `aria-label="Link zu diesem Abschnitt teilen"`, `text-ink-muted`,
   immer sichtbar (auf Touch gibt es kein Hover). Rückmeldung wie bei `Teilen`
   („Link kopiert“, per `aria-live`).

Abschnitte, die eine Kennung und den Knopf bekommen:

| Seite | Abschnitte (Pfad) |
|---|---|
| Einzelplan | jeder Bereich: `/bereich/21` |
| Querschnitte | `…/verlauf`, dann je Kostenblock `…/personal`, `zuschuesse`, `gebaeude`, `it`, `strom`, `wasser` |
| Einnahmen | `…/verlauf`, dann je Gruppe der vorhandene `g.key` |
| Investitionen | `…/wer-bezahlt`, `vorhaben`, `laufende-ansaetze`, `verlauf` |
| Überblick | `/ueberblick/verlauf`, `wachstum`, `auffaelliges` |
| Glossar | hat schon `id` je Begriff; Pfad `/glossar/<id>` ergänzen |

Einrichtung und Posten sind schon fein genug; dort bleibt der Seiten-Knopf.

Beim Scrollen in einer Seite ändert sich der Pfad **nicht** mit; nur der
Link-Knopf erzeugt die Abschnittsadresse. Sonst füllt jede Scrollbewegung den
Verlauf.

**Prüfen:**
- Unit-Test für `teilUrl` (Browser- und Hash-Modus) und für das
  Lesen/Schreiben von `ansicht`.
- `/bereich/21?ansicht=kopf` in frischem Tab: Einzelplan 2, bei Bereich 21,
  „je Einwohner“ ist an.
- `/erkunden/querschnitte/strom` landet beim Kostenblock Strom.
- Dasselbe im Hash-Build (`VITE_ROUTER=hash pnpm build`, dann `pnpm preview`).
- Auf GitHub Pages (Vorschau `/v2/`): ein tiefer Link in frischem Tab läuft
  über `404.html` und landet richtig.
- Zurück-Taste nach Schalter-Klicks: kein Verlauf voller Zwischenschritte.

---

## 3. Bereichsnummern, Seiten in der Suche, Icons

### 3a. Nummer in der Bereichsüberschrift

In [src/pages/EinzelplanDetail.tsx](../src/pages/EinzelplanDetail.tsx) vor
`s.label` die Nummer setzen: `21` in `text-ink-soft tabular-nums`, `xx` in
`text-ink-muted`, kleiner als die Überschrift (wie `Nummer` in
[src/lib/nummern.tsx](../src/lib/nummern.tsx), aber **immer sichtbar**, nicht an
den Nummern-Schalter gebunden: auf dieser Ebene ist die Nummer Orientierung,
nicht Detail).

Bereich 16 hat keinen Namen in `labels.json` und zeigt heute nur „16“. Beim
Umsetzen einen Namen in `etl/labels.yaml` nachtragen.

### 3b. Neue Einträge im Suchindex

`searchIndex` in [src/lib/data/selectors.ts](../src/lib/data/selectors.ts)
bekommt drei neue Arten:

| Art | label | sub | route | keys |
|---|---|---|---|---|
| Seite | „Querschnitte“ | „Seite · Personal, Strom, Gebäude …“ | `/erkunden/querschnitte` | — |
| Kostenblock | „Strom & Energie“ | „Querschnitt“ | `/erkunden/querschnitte/strom` | — |
| Bereich | „Kindertageseinrichtungen & Jugend“ | „Bereich 46xx · Soziale Sicherung“ | `/bereich/46` | `["46"]` |

Seiten: Überblick, Geldfluss, Einnahmen, Investitionen, Querschnitte, Wofür
zahle ich?, Themen, Methodik und Daten, Glossar, Über das Projekt, Impressum,
Datenschutz, Barrierefreiheit. Die Liste steht als Konstante neben den
Nav-Links in [src/components/Header.tsx](../src/components/Header.tsx), damit
Name und Icon an einer Stelle gepflegt werden. Für Seiten ein optionales Feld
`stichworte` (z. B. Querschnitte: Personal, Strom, Wasser, Kostenblöcke), das
`searchRank` wie das Label durchsucht, aber mit dem Synonym-Malus von 50.

Rangfolge: Seiten, Kostenblöcke, Einzelpläne, Bereiche und Einrichtungen bleiben
`rank: 0`, Posten `rank: 1`. Damit stehen alle neuen Arten vor den Einzelposten.
Bei Zahlen sortiert schon heute die Schlüssellänge: `21` findet zuerst den
Bereich, dann die Einrichtungen `21..`.

Nebenbefund: Themen stehen im Index mit `/themen/:id`, und diese Route leitet
gesperrt auf `/themen` um. Solange die Zuordnung nicht freigegeben ist, zeigen
die Themen-Einträge direkt auf `/themen`.

### 3c. Icons in der Ergebnisliste

Zwei Kanäle, jeder mit einer Aufgabe:

- **Wo im Haushalt?** — das Einzelplan-Icon (`einzelplanKategorie(ep)` aus
  [src/lib/kategorien.ts](../src/lib/kategorien.ts)) in der Einzelplan-Farbe, auf
  **allen** Haushaltsebenen: Einzelplan, Bereich, Einrichtung, Posten. Wer „Schule“
  sucht, sieht an der Mütze sofort, welche Treffer zum Schulbereich gehören.
- **Welche Ebene?** — keine weiteren Pictogramme, sondern das Nummerngerüst
  rechtsbündig in einer schmalen `tabular-nums`-Spalte: `2` · `21xx` · `2110` ·
  `2110.4107`. Die Länge zeigt die Tiefe, und die Nummer ist zugleich die amtliche
  Referenz.

Seiten und Kostenblöcke haben keine Nummer und sind keine Haushaltsstelle:

- **Seite** — ihr Nav-Icon (`House`, `FlowArrow`, `BookOpen` …) in
  `text-ink-muted`, ohne Farbfläche. Einnahmen, Investitionen und Querschnitte
  haben heute kein Icon. Vorschlag: `TrayArrowDown` (Einnahmen), `Crane`
  (Investitionen), `TreeStructure` (Querschnitte). Nicht `Coins`: Das ist
  schon das Icon von Einzelplan 9.
- **Kostenblock** — das vorhandene `ICON[key]` aus
  [src/pages/Querschnitte.tsx](../src/pages/Querschnitte.tsx) in seiner Farbe. Dazu
  `ICON` und `COLOR` aus der Seite in eine kleine Datei unter `src/lib/` ziehen,
  damit die Suche sie importieren kann.

Farbig heißt also „Teil des Haushalts“, grau heißt „Seite der App“. Die
Art steht weiterhin als Text in der `sub`-Zeile; die Icons sind `aria-hidden`.
Die Liste wird dafür von `w-80` auf etwa `w-96` breiter; mobil bleibt sie
volle Breite.

Falls sich bei einem Test zeigt, dass Leute die Arten trotzdem nicht trennen:
Gruppenüberschriften („Seiten“, „Bereiche“, „Posten“) wären der stärkere Hebel.
Erst probieren, wenn die Icons nicht reichen; sie ändern die Tastaturnavigation.

**Prüfen (als Tests in `selectors.test.ts`):**
- `searchRank(index, "21")[0]` ist der Bereich 21.
- `searchRank(index, "querschnitt")[0].route` ist `/erkunden/querschnitte`.
- `searchRank(index, "strom")` hat den Kostenblock vor jedem Posten.
- Jeder Bereich, der Posten hat, steht genau einmal im Index.
- Von Hand: Pfeiltasten und Enter funktionieren mit Icons wie vorher; Liste bei
  375 px ohne horizontales Scrollen.

---

## 4. Zwischenstand 2026 (Stichtag 01.10.2026)

Vorläufig, ein Versuch für die kommende Sitzung und die interne Arbeit: Für das
laufende Jahr zeigt die Timeline zusätzlich, was bis zum Stichtag gebucht und
bezahlt ist. **Fehlt die Datendatei, ist das Feature weg.** Kein Code-Schalter
nötig; zurücknehmen heißt `zwischenstand.json` löschen.

### Daten

Quelle: `Haushalt 2026 Stand 01.10.2026 - mit Haushaltssperre.xlsx` (nach dem
Aufräumen in `haushaltsplaene/zwischenstand/`, siehe Paket 5). Gleiche
AKDB-Spalten wie der Langexport, aber **ohne Spalte `HJ`**: Jahr und Stichtag
stehen nur im Dateinamen. Relevant: `GLZ`, `GRZ`, `Ansatz (ges.)`, `Soll_HS`,
`Ist_HS`. Alle anderen Spalten ignorieren, auch `HS-Sperre`.

Gemessen beim Anlegen dieses Plans:

| | Ansatz | Soll_HS | Ist_HS |
|---|---:|---:|---:|
| VwH Ausgaben | 66.903.830 | 46.057.065 | 39.365.324 |
| VwH Einnahmen | 66.903.830 | 47.082.147 | 39.462.094 |
| VmH Ausgaben | 31.880.027 | 10.159.745 | 9.675.927 |

2.746 Zeilen; 10 Haushaltsstellen gibt es nur hier, nicht im Langexport. Die
Ansätze sind identisch mit den 2026er-Zeilen des Langexports.

**Neue Datei `public/data/zwischenstand.json`**, getrennt von `budget.json`:

```jsonc
{
  "jahr": 2026,
  "stichtag": "2026-10-01",
  "quelle": "Haushalt 2026 Stand 01.10.2026 - mit Haushaltssperre.xlsx",
  "werte": { "0000.4100": [100868.84, 100868.84] }   // [soll, ist]
}
```

Warum eigene Datei: `budget.json` ist der dokumentierte Vertrag mit der Stadt
(DATENFORMAT.md) und bleibt unverändert. Das Experiment lässt sich durch Löschen
einer Datei zurücknehmen, und ein neuer Stichtag ersetzt nur diese Datei.

**ETL:** neues Skript `etl/zwischenstand.py`.
- Nimmt die jüngste Datei aus `haushaltsplaene/zwischenstand/`; Jahr und Stichtag
  per Regex aus dem Dateinamen (`Haushalt (\d{4}) Stand (\d\d)\.(\d\d)\.(\d{4})`).
  Passt der Name nicht: Abbruch mit klarer Meldung, nicht raten.
- Spalten über die Kopfzeile finden wie in `ingest.py` (`header_map`, `find`
  von dort importieren). Die Kopfzeile ist hier **Zeile 2**; Zeile 1 ist eine
  Summenzeile.
- Den Crosswalk aus `data/processed/budget.json` (`"crosswalk"`) auf die GLZ
  anwenden, dann nur Haushaltsstellen übernehmen, die es in `budget.json` gibt.
  Die übrigen mit Nummer und Text auflisten (erwartet: die 10 oben). Wenn
  darunter Relevantes ist, lieber den Langexport neu ziehen als hier Posten
  anlegen.
- Ausgabe nach `data/processed/zwischenstand.json`; `build_web.py` kopiert nach
  `public/data/`. `package.json` → `data` um das Skript ergänzen.
- Am Ende die drei Summenzeilen der Tabelle oben drucken, als Selbstkontrolle.

`ingest.py` bleibt, wie es ist: Das Ist des laufenden Jahres wird dort weiter
verworfen, damit die Ist-Linie 2026 leer bleibt.

**Frontend-Daten:**
- `core.ts`: `optional<Zwischenstand | null>("data/zwischenstand.json", null)`,
  wie die anderen optionalen Dateien. Typ in `types.ts`.
- `YearSeries` bekommt ein optionales Feld
  `zwischen?: { jahr: number; stichtag: string; soll: number; ist: number }`.
  Die gemeinsame Aggregation (bei `bereichSeries`, um Zeile 475 in
  `selectors.ts`) summiert es mit demselben Prädikat wie Ansatz und Ergebnis.
  So bekommen alle Timeline-Aufrufer es ohne neue Props.
- `adjustSeries` rechnet `zwischen` mit den Faktoren des Jahres 2026 um
  (inflationsbereinigt, je Einwohner). Vorher prüfen, ob `context.json` für 2026
  Einwohner und VPI hat; fehlt eins, die Marken in dieser Ansicht weglassen
  statt falsch skalieren.

### Darstellung in der Timeline

Die Grammatik, die schon gilt: Ist = Vollfarbe, Plan = gedämpft und hohl. Sie
wird um eine Dimension erweitert:

| Marke | Form | Farbe | Füllung |
|---|---|---|---|
| Ergebnis (Ist), ganzes Jahr | Kreis | Ist-Farbe | voll |
| Ansatz (Plan) | Kreis | `PLAN_COLOR` | hohl |
| bezahlt bis 30.09. | **Raute** | Ist-Farbe | voll |
| gebucht bis 30.09. | **Raute** | Ist-Farbe | hohl, 2 px Rand |

Lesart: **Kreis = ganzes Jahr, Raute = Teil des Jahres.** Farbe trennt Plan von
Vollzug wie bisher, die Füllung trennt bezahlt von gebucht.

- Zwei eigene Serien vom Typ `scatter` auf der Kategorie „2026“. **Keine
  Linie**, auch nicht zur Ist-Linie 2025 (die Ist-Serie hat 2026 `null`; ihr
  `connectNulls` betrifft die neuen Serien nicht, trotzdem im Bild prüfen).
- Gebucht und bezahlt liegen oft dicht beieinander (Gesamt-VwH: 46,1 zu 39,4 Mio.,
  bei vielen Posten identisch). Damit beide sichtbar bleiben: `symbolOffset`
  `[-6, 0]` für gebucht und `[6, 0]` für bezahlt, also nebeneinander statt
  übereinander. Bei identischen Werten stehen zwei Rauten auf gleicher Höhe,
  eine hohl, eine voll. Das liest sich als „gleich“, nicht als Fehler.
- Rauten etwas größer als die Kreise (`symbolSize` 10), sonst verschwindet die
  hohle Raute neben der Ansatz-Marke.
- Achsenbeschriftung für 2026: `2026` und darunter klein `Stand 1.10.`.
- Tooltip für 2026: Ansatz, gebucht, bezahlt, und **„x % des Ansatzes“** beim
  bezahlten Wert.
- Tabelle unter dem Diagramm (`ChartTable`): zwei zusätzliche Spalten „gebucht
  bis 30.09.“ und „bezahlt bis 30.09.“, nur gefüllt in der Zeile 2026, nur
  vorhanden, wenn es einen Zwischenstand gibt. Die Zeile heißt dann
  „2026 (Stand 1.10.)“ statt „2026 (nur Plan)“.
- In der Ansicht „mit Einnahmen verrechnet“: keine Rauten, darunter der Satz
  „Der Zwischenstand nach neun Monaten ist hier ausgeblendet, weil Einnahmen und
  Ausgaben zu verschiedenen Zeiten im Jahr anfallen.“

### Gegen Fehllesen

Die größte Gefahr: Jede Raute liegt unter dem Ansatz, und wer nicht weiß, dass
nur neun Monate gezählt sind, liest überall „Stadt gibt weniger aus als geplant“.

- **Keine ¾-Linie, keine Hochrechnung.** Beides unterstellt gleichmäßiges
  Ausgeben. Die Kreisumlage, Personalnachzahlungen und Bauschlussrechnungen
  fallen gehäuft am Jahresende an.
- Stattdessen eine **handschriftliche Notiz** (vorhandener Mechanismus,
  `notiz`-Prop von `EChart`, siehe [src/lib/notiz.ts](../src/lib/notiz.ts)):
  „erst 9 Monate“ mit Pfeil auf die bezahlt-Raute. Die Timeline reicht heute
  keine Notiz durch; dafür ein optionales Prop ergänzen. Nur eine Notiz je
  Diagramm: Wo schon eine sitzt, gewinnt die vorhandene. Unter 640 px gibt es
  keine Notizen; dort trägt die Achsenbeschriftung „Stand 1.10.“.
- Glossar: neuer Eintrag „Zwischenstand“ (gebucht vs. bezahlt, warum der Wert
  unter dem Ansatz liegt) in `etl/glossar.yaml`, im Tooltip über `Term` verlinkt.
- DATENFORMAT.md: Abschnitt für `zwischenstand.json` ergänzen.

### Idee für später, braucht Daten

Aussagekräftig wird der Zwischenstand erst im Vergleich: „Bis 30.09.2025 waren
68 % bezahlt, dieses Jahr 59 %.“ Dafür bräuchte es dieselbe Auswertung zum
01.10. der Vorjahre. Die Kämmerei fragen, ob AKDB das rückwirkend ausgibt. Dann
würde die Raute nicht mit dem Jahresansatz verglichen, sondern mit sich selbst.

**Prüfen:**
- ETL-Lauf druckt die Summen aus der Tabelle oben.
- Test in `selectors.test.ts`: `zwischen.soll` einer Einrichtung ist die Summe
  über ihre Posten in `zwischenstand.json`; ohne Datei ist `zwischen` undefined
  und alle bestehenden Tests laufen unverändert.
- Von Hand, je bei 375 px und Desktop: Posten mit Soll = Ist (zwei Rauten auf
  einer Höhe), Posten mit Soll ≠ Ist (z. B. `0301.6322`, EDV-Kosten:
  61.080 zu 56.547), ein Einzelplan-Bereich, alle vier Schalter einzeln.
- `zwischenstand.json` löschen, neu laden: App sieht aus wie vor dem Paket.

---

## 5. Aufräumen in `haushaltsplaene/`

Der Ordner ist gitignored und liegt nur lokal; Umzug also mit `mv`, kein git.
Dateinamen **nicht** umbenennen, sie tragen den Stand.

```
haushaltsplaene/
  akdb/              ← Langexporte, liest ingest.py
    Auswertung 2016 - 2026 Haushaltstellen.xlsx
    Auswertung 2016 - 2026 Planansätze.xlsx
    Auswertung 2016 - 2025 Rechnungsergebnisse.xlsx
  zwischenstand/     ← liest zwischenstand.py, jüngste Datei gewinnt
    Haushalt 2026 Stand 01.10.2026 - mit Haushaltssperre.xlsx
  archiv/
    2024 Haushaltsplanentwurf/   (bisher „Haushaltsplanentwurf 2024“)
    2025 Haushaltsentwurf/       (bisher „Haushaltsentwurf 2025“)
```

- `ingest.py`: `SRC` nicht mehr fest verdrahten, sondern
  `akdb/Auswertung * Haushaltstellen.xlsx` per Glob suchen; bei mehr als einem
  Treffer den mit dem höchsten Endjahr im Namen nehmen und das ausgeben.
- README, Abschnitt „Projektstruktur“, um die drei Unterordner ergänzen.
- Ordnernamen ohne Leerzeichen; das ist auch die künftige Ablage, falls die
  Kämmerei Dateien selbst einspielt.

**Prüfen:** Dateizahl vorher und nachher gleich (`find haushaltsplaene -type f |
wc -l`, vorher 19). `pnpm data` läuft durch, `git diff public/data/budget.json`
zeigt nur das `generated`-Datum.

---

## 6. Vorschaukarten je Adresse

Heute zeigt jeder geteilte Link dieselbe Karte (`public/og.png`). Messenger und
soziale Netzwerke führen kein JavaScript aus; sie lesen nur die `<meta
property="og:…">` der HTML-Datei, die unter der Adresse liegt. Auf GitHub Pages
ist das für jede Unterseite `404.html` (mit Status 404), also gar keine Karte.

**Gestaltung ist freigegeben** (14.10.2026). Die vier Entwürfe mit echten Zahlen
(Freibad, Bereich 46xx, Strom, „Wofür zahle ich?“) liegen als HTML in
[docs/vorschaukarten/](vorschaukarten/) und auf dem Canvas
https://claude.ai/artifact/5rPir8wkjBiZq5y1343DVX. In den Dateien zeigen
Schrift (Madelon) und Rathaus-Skizze auf `/_blob/…`-Adressen des Canvas; im
Repo liegen sie unter `src/assets/fonts/MadelonScript.otf` und
`public/sketches/rathausB.svg` (für die Karte in `#e3d8c2` eingefärbt).

### Was entsteht

Ein Node-Skript `scripts/karten.mjs` legt für jede teilbare Adresse zwei Dinge
ab:

1. **eine HTML-Datei** `<pfad>/index.html`, die Kopie von `dist/index.html` mit
   eigenem `<title>`, `description`, `og:title`, `og:description`, `og:url`,
   `og:image`. Die App darin ist unverändert; der Router übernimmt wie sonst.
   Ordner mit `index.html` statt `21.html`, weil das jeder statische Server
   ohne Zusatzregel ausliefert (Apache, nginx, IIS, GitHub Pages). Die
   Umleitung `/bereich/21` → `/bereich/21/` auf Pages ist harmlos; Crawler
   folgen ihr. Die Pride Map macht es genauso (`scripts/prerender.mjs`).
2. **ein PNG** 1200 × 630 unter `karten/<pfad>.png`.

**Das Skript ist ein eigener Schritt auf einem fertigen Ordner**, nicht Teil
von `vite build`:

```
node scripts/karten.mjs <ordner>      # liest <ordner>/data/*.json, schreibt in <ordner>
```

`package.json`: `"karten": "node scripts/karten.mjs dist"`, und `build` ruft es
nach `vite build` auf. Grund: Wird `data/` später getauscht, lassen sich die
Karten auf demselben Ordner neu erzeugen, ohne die App neu zu bauen (siehe
Abschnitt 7).

| Adressen | Anzahl | HTML | eigenes Bild |
|---|---:|---|---|
| Einzelpläne | 10 | ja | ja |
| Bereiche | 56 | ja | ja |
| Einrichtungen | 262 | ja | ja |
| Kostenblöcke, Einnahme-Gruppen | ~15 | ja | ja |
| Seiten und Seitenabschnitte | ~20 | ja | ja, Seitenvorlage |
| Posten | 4.306 | ja, eigener Titel und Text | **nein**, Bild der Einrichtung |

Für die Posten wären es sonst ~150 MB Bilder; der Titel („Beamtenbezüge,
Grundschule …, 87.800 €“) trägt dort ohnehin mehr als das Bild.

### Rendern: `playwright-core`, wie in der Pride Map

Die Karte ist HTML und CSS, genau wie der Entwurf. `playwright-core` öffnet sie
in einem lokalen Chromium (`page.setContent`) und macht einen Screenshot.
Vorbild ist [../pridemap/scripts/og-images.mjs](../../pridemap/scripts/og-images.mjs):
Chromium-Suche in den üblichen Pfaden, vier Seiten parallel, klare Meldung,
wenn Chromium fehlt.

Warum nicht satori/resvg, wie zuerst geplant:

- **Ein Werkzeug für alle Repos.** Die Pride Map nutzt `playwright-core`
  schon, und sie braucht es, weil ihre Karten Kartenkacheln als Hintergrund
  haben. Ein zweites Werkzeug für dasselbe wäre genau die Drift, die die
  Hausbasis verhindern soll.
- **Der Entwurf ist schon HTML.** Er lässt sich fast unverändert als Vorlage
  übernehmen. satori kann nur eine Teilmenge von CSS und verlangt statische TTF
  statt der woff2-Dateien, die das Projekt schon hat.
- Preis: Chromium (~150 MB) muss da sein, lokal einmal, in CI pro Lauf
  (gecacht). Bei ~350 Karten sind das grob 30 bis 60 Sekunden Renderzeit.

Einzelheiten:

- Schriften: die woff2-Dateien aus `@fontsource-variable/…` und
  `src/assets/fonts/MadelonScript.otf` per `file://` in die Vorlage einbinden.
  Vor dem Screenshot `await document.fonts.ready`.
- Icons: die echten Phosphor-Komponenten mit `renderToStaticMarkup` aus
  `react-dom/server` zu SVG machen. Kein zusätzliches Paket.
- Klecks-Pfad und Farbtöne (`kategorieTon`) nicht abschreiben. Node lädt die
  `.ts`-Dateien aus `src/` wegen der `@/`-Pfad-Aliase nicht direkt; deshalb die
  paar Konstanten (Klecks-Pfad, Einzelplan-Farben, Kostenblock-Farben, die
  `tint`-Funktion) in eine kleine `.mjs`-Datei unter `src/lib/` legen, die App
  und Skript beide importieren. Die Zuordnung Einzelplan → Phosphor-Icon bleibt
  in `kategorien.ts`; das Skript braucht dafür nur die Icon-Namen.
- Absolute Bild-URL ist Pflicht (`og:image` mit relativem Pfad ignorieren die
  meisten Dienste). Basis aus einer Umgebungsvariable `SITE_URL`, Standard
  `https://bagruber.github.io` plus Vite-`base`. Die Vorschau unter `/v2/`
  bekommt so ihre eigenen Karten.
- CI (`pages.yml`, beide Builds, Haupt und `/v2/`): vor dem Build
  `pnpm exec playwright-core install --with-deps chromium`, den Ordner
  `~/.cache/ms-playwright` mit `actions/cache` über die Playwright-Version
  cachen.
- Wiederverwendung später: Die Hilfsfunktionen (Chromium finden, parallel
  rendern) bleiben klein und in einer eigenen Datei
  `scripts/lib/rendern.mjs`, ohne Haushalts-Bezug. Wenn ein drittes Projekt
  Karten braucht (moosburg.eu), kann sie nach `moosburg-design` wandern. Jetzt
  nicht herauslösen.

### Gestaltung

Eine Familie mit der bestehenden `og.png`: Creme, Regenbogenstreifen oben,
Source Serif für Titel und Zahl, Atkinson für alles andere, unten eine Leiste
mit Rose, „Haushalt Moosburg“ und Adresse. Drei Vorlagen:

- **Haushaltsebene** (Einzelplan, Bereich, Einrichtung): links Klecks mit
  Einzelplan-Icon und -Farbe, darunter Ebene und Nummer (`Einrichtung 5701`,
  `Bereich 46xx`), Titel, eine Zahl mit Jahr und Wert je Einwohner. Rechts eine
  Linie Ist 2016 bis zum letzten Rechnungsjahr in der Einzelplan-Farbe, dazu
  der Plan des laufenden Jahres als hohler Kreis. Dieselbe Grammatik wie in der
  App.
- **Querschnitt**: wie oben, mit dem Icon und der Farbe des Kostenblocks. Gibt
  es in der App für dieses Diagramm eine handschriftliche Notiz, kommt sie mit
  auf die Karte (Strom: „Gaskrise“).
- **Seite**: kein Zahlenteil, stattdessen ein Satz und die Rathaus-Skizze wie
  auf `og.png`.

Regeln:

- **Jede Zahl trägt ihr Jahr** („Plan 2026“). Wird `data/` ohne neuen Build
  getauscht, sind die Karten veraltet, aber nicht falsch.
- Titelgröße nach Länge: 104 px bis ~14 Zeichen, 88 px bis ~22, sonst 72 px auf
  höchstens zwei Zeilen, danach Auslassungspunkte. Sehr lange AKDB-Texte
  („Kredite, innere Darl., Kreditbeschaff.-Kosten …“) vorher mit `cleanText`
  und den Namen aus `labels.json` entschärfen.
- Kein Zwischenstand auf Karten. Er ist vorläufig, Karten bleiben lange im
  Umlauf.

### Prüfen

- Das Skript meldet die Zahl der HTML-Dateien und Bilder; Abgleich mit der
  Tabelle oben.
- Fünf PNGs von Hand ansehen, darunter das mit dem längsten Titel.
- Nach dem Deploy auf `/v2/`: Links in WhatsApp, Signal und Telegram auf einem
  echten Telefon schicken, dazu Mastodon und LinkedIn (Post Inspector). Einige
  Dienste schneiden quadratisch zu; falls der Titel dabei verloren geht, Ränder
  anpassen.
- Buildzeit in CI vorher und nachher notieren; mehr als zwei Minuten zusätzlich
  wäre ein Grund, die Einrichtungen auf eine gemeinsame Bildvorlage
  zurückzunehmen.
- `node scripts/karten.mjs dist` ein zweites Mal auf demselben Ordner laufen
  lassen: gleiches Ergebnis, keine doppelten Dateien.
- Nach `rm -rf node_modules && pnpm install` und `pnpm store prune`: genau eine
  `playwright-core`-Version im Store, dieselbe wie in der Pride Map
  (`node ../hausbasis/check.mjs --kurz`).

---

## 7. Betrieb bei der Stadt: offen, nicht umsetzen

Benedict spricht zuerst mit der städtischen IT. Hier nur, was Paket 6 dafür
offenhalten muss. Die Varianten, geordnet nach Angriffsfläche bei der Stadt:

| | Variante | Was die Stadt braucht |
|---|---|---|
| 0 | extern gehostet, Stadt setzt nur einen DNS-Eintrag | CNAME |
| 1 | statischer Ordner auf vorhandenem Webspace | Unterordner, Upload per SFTP/CMS |
| 2 | wie 1, plus Import-Werkzeug im Browser (Pyodide) | wie 1 |
| 3 | Container, nur lesend, `data/` als Netzlaufwerk | Container-Plattform, Proxy, Patchprozess |
| 4 | wie 3, plus Python-Container, der abgelegte xlsx umrechnet | wie 3, plus Ablageordner |
| 5 | Container mit Upload-Seite | wie 4, plus Anmeldung, Sicherheitsprüfung |

Was das für die Vorschaukarten heißt:

- **Bei 0 und überall, wo neu gebaut wird:** keine Einschränkung.
- **Wo nur `data/` getauscht wird (1 bis 5):** Die Karten bleiben auf dem alten
  Stand, bis jemand `karten.mjs` auf dem Ordner neu laufen lässt. Weil jede
  Zahl ihr Jahr trägt, sind sie veraltet, aber nicht falsch. Neue Einrichtungen
  haben bis dahin keine eigene Karte und fallen auf `og.png` zurück.
- **Chromium gehört nicht auf städtische Server.** Die Karten entstehen dort,
  wo gebaut wird (CI oder Benedicts Rechner), und werden mit dem Ordner
  ausgeliefert. Für 4 und 5 hieße das: Python rechnet die Daten auf dem Server
  um, die Karten kommen weiterhin von außen.
- **Hash-Build** (portables Demo-Paket): keine eigenen Karten möglich, Crawler
  sehen nur `index.html`. Ist für eine Demo in Ordnung.
- **Umzug auf eine andere Domain:** neu bauen mit `SITE_URL` und `base`; die
  absoluten Bild-URLs stecken in den HTML-Dateien.

---

## Reihenfolge

1. Paket 1, Checkbox → `pnpm build`, Sichtprüfung
2. Paket 5, Aufräumen `haushaltsplaene/` → `pnpm data` unverändert
3. Paket 2, Teilen → Tests `teilUrl`/`ansicht`, Hash-Build prüfen
4. Paket 3, Suche und Icons → Such-Tests, Sichtprüfung 375 px
5. Paket 4, Zwischenstand → ETL-Summen, Selektor-Test, Sichtprüfung, Löschtest
6. Paket 6, Vorschaukarten → Hausbasis-Eintrag, Zählung, Messenger-Test

Teilen vor Suche, weil die Suche die Abschnittsadressen braucht. Aufräumen vor
Zwischenstand, weil `zwischenstand.py` den neuen Ordner liest. Vorschaukarten
zuletzt, weil sie auf den Adressen aus Paket 2 aufbauen.
