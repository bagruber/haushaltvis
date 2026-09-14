# Briefing: Formsprache-Probe im Haushalt

*Angelegt am 14.09.2026. Status: **Probe, nicht freigegeben.** Alles hier setzt
vorläufige Entscheidungen um; nichts davon ist Kanon.*

Dieses Briefing beschreibt, wie haushaltvis probeweise auf die neue Formsprache der
Moosburg-Projekte umgestellt wird. Es ist so geschrieben, dass eine neue Sitzung ohne
Vorwissen loslegen kann. Wer es abarbeitet, liest zuerst die Abschnitte 1 bis 3 ganz,
dann die Arbeitspakete der Reihe nach.

---

## 1. Worum es geht

In zwei Vorschlagsrunden (11. und 14.09.2026) ist für alle Moosburg-Projekte eine
einheitlichere Formsprache entstanden. Am 14.09.2026 hat Benedict einen Satz
**vorläufiger Entscheidungen** getroffen. haushaltvis ist das Pilotprojekt: Hier wird
ausprobiert, ob die Entscheidungen in einer echten, datenreichen App tragen, bevor
irgendetwas in den gemeinsamen Kanon (`moosburg-design`) wandert.

Für diese Probe gilt haushaltvis als **Teil der Plattform moosburg.eu**, obwohl es dort
noch keine Adresse hat. Einzige Folge: Der Navigationseintrag „zurück zu moosburg.eu“
entfällt. Alles andere wird behandelt wie bei jedem Plattform-Projekt.

### Quellen, in dieser Reihenfolge lesen

| Quelle | Wozu |
|---|---|
| Vorschlagsseite (Artefakt): https://claude.ai/code/artifact/764bc923-36f6-4751-8e8e-01eddec5c826 | Alle Varianten visuell, die gewählten sind mit „Vorläufig entschieden“ markiert. Oben ein Schriftwähler, der die ganze Seite umsetzt. |
| `../moosburg-design/docs/formsprache/ENTSCHEIDUNGEN.md` | Das vollständige Protokoll: Prozess, Entscheidungen, geparkte Ideen, Werte, offene Punkte. **Maßgeblich, falls dieses Briefing und das Protokoll auseinanderlaufen.** |
| `../moosburg-design/README.md` | Der heutige Kanon: Tokens, Anwendungsprofile, Regeln (Stripe, kein Kantenakzent, Kontrast). |
| `../moosburg-eu/BRIEFING.md`, Abschnitt 8 | Plattformweite Gestaltungsregeln. |
| `usability/2026-08-stadtrat.md` | Befunde aus den Usability-Sessions. Die Probe darf nichts verschlechtern, was dort als funktionierend bestätigt ist. |
| `OFFENE-PUNKTE.md` | pnpm, Hausbasis, TypeScript-7-Eigenheiten. |

## 2. Die vorläufigen Entscheidungen, übersetzt in den Haushalt

| Entscheidung (14.09.2026) | Was das im Haushalt heißt | Arbeitspaket |
|---|---|---|
| Schriften: **Source Serif 4** (Titel), **Atkinson Hyperlegible Next** (Text), **Madelon Script** (Handschrift) | Playfair und Inter lösen sich ab; Madelon kommt neu dazu | AP 1 |
| **Mehrheitlich keine Versalien** | `.headline` und `.eyebrow` verlieren `uppercase`; Seitentitel in Satzschreibung | AP 2 |
| Zahlen: **Versalziffern mit fester Breite** | alle Kennzahlen `lining-nums tabular-nums`, Beschriftung unter der Zahl | AP 3 |
| **Fehler korrigieren** | abgeschnittene Achsen, einseitige Kantenakzente, Zeichen statt Icons | AP 4 |
| Kategorien: **Variante C, Farbklecks mit Kategoriezeile** | Einzelpläne 0 bis 9 und Kostenblöcke bekommen Klecks, Icon und Farbzeile | AP 5 |
| **Data-Hub-Kacheln** und **Kacheln/Einträge** wie vorgeschlagen, schmal die **Register-Variante** | Einstiegs-Kacheln auf der Startseite, Kostenblock-Kacheln, Register-Einträge am Handy | AP 6 |
| Handschrift: **Überlappung Variante 1** | Script groß, halbtransparent hinter der Überschrift, dazu Notizen im Diagramm | AP 7 |
| **Seitenköpfe** wie vorgeschlagen | mobil Titel oben links; Desktop mit Überlappung, Federzeichnung und Logo-Platz | AP 8 |
| **Farbflächen und Themenfarben** übernommen | eine deckende Fläche mit Gold, zum Beispiel „Wofür zahle ich?“ | AP 9 |
| Status: **Rose** | „In Vorbereitung“ und „Thema folgt“ als Rosen-Status | AP 10 |
| Navigation: **Variante A, alles in einer Zeile** | neue Kopfzeile mit „Über das Projekt“; mobil Tab-Leiste unten | AP 11 |
| Aus Runde 2 bestätigt: einheitliche Suche, Ecken 4 und 10 px, Tab-Leiste wo mehrere Tabs, Chips als scrollbare Zeile, Buttons und Segmente, Titel plus ein Satz | Suche, Chips, Segmente, Radien, Beschreibungstexte | AP 12 |

**Nicht Teil der Probe:** Dunkelmodus (weiter verfolgt, aber nicht entschieden),
Änderungen an `moosburg-design`, das Sitzungstool (dort gilt ein eigener Kompromiss, siehe
Protokoll), die in den Usability-Sessions gefundenen Inhaltsprobleme (siehe Abschnitt 6).

## 3. Rahmen, der nicht verhandelbar ist

**Branch.** Gearbeitet wird auf `probe/formsprache`, abgezweigt von `main`. `main`
deployt über `.github/workflows/pages.yml` sofort nach GitHub Pages; die Probe darf dort
nicht landen. Pushen des Branches ist unkritisch (der Workflow reagiert nur auf `main`),
aber vorher kurz bei Benedict fragen. Kleine Commits je Arbeitspaket, deutsche
Commit-Nachrichten, **ohne jeden Hinweis auf KI-Unterstützung** (kein Co-Authored-By,
kein „Generated with“).

**Kanon nicht anfassen.** `moosburg-design` bleibt unverändert, auch wenn die Probe
funktioniert. Abweichungen stehen lokal in einem eigenen `@theme`-Block in
`src/index.css` **nach** dem Import des Kanons, jede mit Kommentar
`/* Probe Formsprache, vorläufig (14.09.2026): … */`. Das ist der dokumentierte Weg aus
dem README von `moosburg-design` („Ein Projekt darf einzelne Werte danach in einem
eigenen @theme-Block überschreiben; jede Abweichung braucht einen Kommentar mit Grund“).

**Pakete und Hausbasis.** Die Regeln aus `OFFENE-PUNKTE.md` und
`../hausbasis/baseline.json` gelten:

- Neu hinzu kommen genau drei Pakete:
  - `@fontsource-variable/source-serif-4` `^5.3.0`
  - `@fontsource-variable/atkinson-hyperlegible-next` `^5.3.0`
  - `@phosphor-icons/react` `^2.1.10` (dieselbe Range wie im Repo `moosburg`, damit der
    pnpm-Store nur eine Kopie hält)
- `@fontsource/playfair-display` und `@fontsource-variable/inter` bleiben in der
  `package.json`, bis die Entscheidung endgültig ist. Nur ihre CSS-Imports fliegen raus.
  So bleibt die Probe mit einem Revert umkehrbar.
- **Nichts sonst hochziehen.** haushaltvis weicht bereits von der Hausbasis ab (unter
  anderem `react ^19.0.0` statt `^19.2.8`, `tailwindcss ^4.0.0` statt `^4.3.3`,
  `react-router-dom ^7.14.2` statt `^7.18.2`, `vitest ^4.1.9` statt `^4.1.11`). Das ist
  ein eigenes Thema und wird hier **nicht** mitgemacht: gemischte Änderungen machen einen
  Fehler unzuordenbar.
- pnpm, nicht npm. Wird die Probe endgültig, gehören die neuen Schriftpakete in
  `hausbasis/baseline.json`.

**Textstimme.** Neuer UI-Text ohne Gedankenstriche (weder — noch – als Satzzeichen);
stattdessen Komma, Doppelpunkt, Klammer oder neuer Satz. Bestehende Texte werden **nicht**
flächendeckend umgeschrieben (79 Gedankenstriche stehen heute in `src/`); nur Texte, die in
einem Arbeitspaket ohnehin neu entstehen, sind sauber. Neue Texte vorher Benedict zeigen.

**Rot heißt im Haushalt Defizit.** `Header.tsx` und `ui.tsx` begründen, warum aktive
Zustände hier Tinte sind und nicht Rot: in einer Finanz-App liest sich Rot als Fehlbetrag.
Das Artefakt zeigt aktive Navigation und Chips in Rot, weil es app-übergreifend denkt.
**Für die Probe gilt die Haushalt-Regel:** aktive Zustände (Nav-Unterstreichung,
Tab-Pille, gewählter Chip, Segment) in Tinte. Das ist eine bewusste, kommentierte
Abweichung und ein Befund für die Auswertung.

**Barrierefreiheit halten.** Skip-Link, sichtbarer Fokus, `ChartTable` als Tabellen-Zwilling
jedes Diagramms, `prefers-reduced-motion`, Radiogroup-Tastatursteuerung im
`SegmentedToggle`: alles bleibt funktional erhalten. Die Barrierefreiheitserklärung
(`src/pages/Rechtliches.tsx`) nicht ändern, ohne Benedict zu fragen.

---

## 4. Arbeitspakete

Jedes Paket nennt Ziel, Ist-Zustand mit Fundstellen, Umsetzung und eine Prüfung.
Zeilennummern stammen vom Stand `18f4202` und können wandern.

### AP 0: Vorbereitung und Vorher-Stand

1. `git switch -c probe/formsprache` von einem sauberen `main`.
2. `pnpm install`, dann `pnpm typecheck`, `pnpm test`, `pnpm build`. Alle drei müssen vor
   der ersten Änderung grün sein; sonst erst klären.
3. **Vorher-Screenshots** in 1440 px und 390 px Breite von diesen Routen: `/`,
   `/erkunden`, `/erkunden/einnahmen`, `/erkunden/investitionen`,
   `/erkunden/querschnitte`, `/themen`, `/wofuer-zahle-ich`, `/einzelplan/2`,
   eine Einrichtung, ein Posten (über „Das fällt auf“ auf der Startseite), `/info`.
   Ablage: `docs/formsprache-probe/vorher/`. Nicht committen, ohne zu fragen (Binärdateien).
   Hinweis zu Headless-Chrome unter Windows: Unter etwa 500 px Fensterbreite wird der
   Viewport breiter gerendert als der Screenshot; für 390 px die Gerätesimulation der
   DevTools oder Playwright mit `viewport` nutzen.

**Prüfung:** drei grüne Befehle, Screenshots vorhanden.

### AP 1: Schriften und Grund-Tokens

**Ist:** `src/index.css` importiert Inter (variabel) und Playfair Display (400, 600, 700,
900). Die Rollen kommen aus dem Kanon: `--font-display`, `--font-sans`, `--font-script`
(Letztere ist heute ungenutzt).

**Umsetzung:**

- Imports ersetzen durch `@fontsource-variable/atkinson-hyperlegible-next` (plus Kursive,
  falls irgendwo `italic` gesetzt wird) und die Source-Serif-4-Datei mit **optischen
  Größen**. Das Paket liefert `opsz.css`, `wght.css`, `standard.css` (jeweils mit
  `-italic`). In der CSS-Datei nachsehen, welche `@font-face` sowohl die `opsz`- als
  auch die `wght`-Achse abdeckt, und diese nehmen. Die optischen Größen sind der Grund für
  die Wahl: groß mit Playfair-nahem Kontrast, klein robust.
- Die Familiennamen stehen in den CSS-Dateien der Pakete (Fontsource nennt variable
  Familien üblicherweise „… Variable“). Namen von dort übernehmen, nicht raten.
- **Madelon Script** ist kein npm-Paket. Die Datei liegt in
  `../moosburg/public/fonts/MadelonScript.otf`; für die Probe nach
  `public/fonts/MadelonScript.otf` kopieren und per `@font-face` einbinden, wie es
  `../moosburg/src/index.css` tut. Pfad mit `base` beachten (`/haushaltvis/fonts/…`, oder
  relativ über `import.meta.env.BASE_URL`, falls in CSS nötig per Vite-Asset-Import).
  **Offen:** Die Lizenz ist nirgends dokumentiert (die Datei nennt „Ferdiansyah
  ijemrockart Studio, All rights reserved“). Deshalb in `OFFENE-PUNKTE.md` vermerken und
  die Handschrift ausschließlich über `--font-script` ansprechen, damit ein Tausch eine
  Zeile ist. Notfall-Ersatz mit gleichem Charakter: Ms Madi (Google Fonts, OFL).
- Lokaler `@theme`-Block nach dem Kanon-Import:
  - `--font-display`: Source Serif 4, Fallback `Georgia, serif`
  - `--font-sans`: Atkinson Hyperlegible Next, Fallback `ui-sans-serif, system-ui, sans-serif`
  - `--font-script`: Madelon Script, Fallback `cursive`
  - Radien (siehe AP 12): `--radius-lg: 10px; --radius-xl: 10px;` (Kanon: 6 und 10),
    `--radius-md` bleibt 4 px.
- `h1, h2, h3, .font-display` bekommen zusätzlich `font-optical-sizing: auto` und
  `font-variant-numeric: lining-nums`.
- **ECharts zeichnet auf Canvas und erbt keine CSS-Schrift.** In `src/components/EChart.tsx`
  eine globale `textStyle.fontFamily` setzen (aus `getComputedStyle(document.body)` gelesen)
  und `setOption` erst nach `document.fonts.ready` ausführen, sonst rendern Achsen und
  Legenden beim ersten Laden in der Systemschrift.

**Zu prüfen und Benedict zu melden:**

- Atkinson Hyperlegible Next setzt die **Null mit Schrägstrich**, auch in Jahreszahlen
  wie 2026. Prüfen, ob die Schrift eine Alternative per OpenType-Feature anbietet (zum
  Beispiel mit wakamaifondue.com oder `fontkit`). Nicht eigenmächtig umschalten; mit
  Screenshot vorlegen.
- Wirken die Kennzahlen in Source Serif 4 mit `lining-nums tabular-nums` ruhig?

**Prüfung:** DevTools, Tab „Fonts“ bzw. „Rendered Fonts“: Überschriften in Source Serif 4,
Fließtext und Diagrammbeschriftungen in Atkinson, keine Fallback-Schrift. `pnpm build` grün.

### AP 2: Versalien und Etiketten

**Ist:**

- `.headline` (`src/index.css`) setzt alle Seitentitel in Versalien: Home, Erkunden,
  Einnahmen, Investitionen, Querschnitte, Wofür zahle ich, Themen, Glossar, Info,
  Methodik, Impressum, Datenschutz, Barrierefreiheit.
- `.eyebrow` (Versalien, 0.14em Sperrung, 11 px) steht an diesen Stellen:
  - `ui.tsx` (`Stat`)
  - `Home.tsx`: „Stadt Moosburg an der Isar“ über der H1 und die vier Kennzahl-Labels
  - `Themen.tsx`: „In Vorbereitung“
  - `EinrichtungDetail.tsx`: vier Kennzahl-Labels
  - `Investitionen.tsx`: Kennzahl-Labels
  - `Querschnitte.tsx`: Kostenblock-Art und Kennzahl-Labels
- Dazu ein `uppercase` in `ThemeDetail.tsx` (intern).

**Umsetzung:**

- `.headline`: `text-transform` und `letter-spacing` entfernen; Gewicht bleibt über die
  Titelschrift. Kommentar aktualisieren (Versalien nur noch ausnahmsweise im Seitentitel,
  im Haushalt nirgends).
- `.eyebrow` nicht einfach umbenennen, sondern je Fundstelle entscheiden:
  - Kennzahl-Labels werden zur Beschriftung **unter** der Zahl (AP 3).
  - Wiederkehrende Kategorien werden zur Kategoriezeile (AP 5).
  - „In Vorbereitung“ wird zum Rosen-Status (AP 10).
  - „Stadt Moosburg an der Isar“ über der Home-H1 ist redundant zur Wortmarke im Kopf.
    **Vorschlag: streichen.** Benedict hat entschieden, Etiketten nicht zu erzwingen, sie
    aber dort zu behalten, wo sie informieren; das hier gehört zur ersten Sorte. Vor dem
    Streichen kurz bestätigen lassen.
- Danach die Klasse `.eyebrow` aus `index.css` löschen, wenn keine Fundstelle mehr übrig ist.

**Prüfung:** `grep -rn "uppercase\|eyebrow" src` findet nichts mehr außer bewusst
kommentierten Ausnahmen.

### AP 3: Kennzahlen

**Ist:** Kennzahlreihen in `Home.tsx` (vier Werte), `Investitionen.tsx` (vier),
`EinrichtungDetail.tsx` (vier, „Zuschussbedarf“ in `text-red-600`),
`Querschnitte.tsx` (drei je Karte) und die Komponente `Stat` in `ui.tsx`. Heute:
Versalien-Label oben, Playfair-Zahl, Hinweis klein darunter. Playfair setzt Ziffern als
Mediävalziffern, die Zahlen „hüpfen“.

**Umsetzung (Vorschlag „Zahlen“ aus dem Artefakt, Abschnitt Zahlen und Kleinkram):**

- Eine gemeinsame Komponente statt vier Kopien, zum Beispiel `Kennzahl` in `ui.tsx`:
  Zahl zuerst (Titelschrift, `font-variant-numeric: lining-nums tabular-nums`, Gewicht wie
  Zwischenüberschrift, `whitespace-nowrap`), darunter Label und Hinweis in einer
  gedämpften Zeile in Satzschreibung (`text-sm text-ink-muted`), zum Beispiel
  „Ausgaben 2026, beide Haushalte“.
- Die rote Zahl „Zuschussbedarf“ bleibt rot: Dort meint Rot tatsächlich den Fehlbetrag.
- Die Kennzahlreihe bleibt ohne Karte, getrennt durch Haarlinien oben und unten (wie heute
  auf Home); das entspricht der gewünschten Eintrag-Ästhetik von moosburg.eu.

**Prüfung:** Screenshot Home und Investitionen 1440 und 390; keine Zahl bricht um, alle
Ziffern stehen auf der Grundlinie.

### AP 4: Fehler korrigieren

1. **Abgeschnittene Achsenbeschriftung.** Auf der Startseite zeigt „Der Haushalt über die
   Jahre“ oben „20 Mio. €“ und „00 Mio. €“ statt 120 und 100: `grid.left` ist mit
   64 px fest und zu schmal. Gleiche Bauart, gleiches Risiko:
   - `Home.tsx` (Chart 1, `grid: { left: 64 … }`)
   - `Einnahmen.tsx:55` (`left: 66`)
   - `Querschnitte.tsx:129` (`left: 66`)
   - `components/Timeline.tsx:93` (`left: 64`, betrifft Einzelplan, Einrichtung, Posten)
   - `Investitionen.tsx:119` (`left: 64`)

   **Lösung:** `containLabel: true` mit kleinem Rand, wie es `Investitionen.tsx:75` und
   `ThemeDetail.tsx:92` schon tun. Mit der neuen Schrift (breiter als Inter) wäre der Fehler
   sonst noch häufiger.
   **Prüfung:** Die höchste Achsenbeschriftung ist in 390 und 1440 px vollständig lesbar,
   auch mit „je Einwohner“ und „inflationsbereinigt“ in der Timeline.
2. **Einseitige Kantenakzente**, laut Kanon in allen Projekten unerwünscht:
   - `Home.tsx:347` und `:359`: `border-l-2` an den beiden Einstiegs-Links; wird zu
     Kacheln (AP 6)
   - `Themen.tsx:18`: `border-l-2 border-gold-500` am Hinweistext; wird zu einer Fläche in
     `gold-100` mit Rahmen oder zum Rosen-Status mit Absatz (AP 10)
   - `pages/intern/ThemenVorschau.tsx:118`: intern, gleiches Muster, gleich mitziehen
   - `EinzelplanDetail.tsx` (Abschnitte, `border-t-2` in Einzelplanfarbe) und
     `Querschnitte.tsx` (Karten, `border-t-2` in Kostenblockfarbe): farbige Kante oben;
     wird zu Farbklecks und Kategoriezeile (AP 5)

   Keine Verstöße und bleiben: die Haarlinie am aufgeklappten Bereich in
   `WofuerZahleIch.tsx:160` (neutrale Struktur).
3. **Zeichen statt Icons:**
   - `Header.tsx`: ☰ und ✕ im Menüknopf (entfällt mit AP 11)
   - `WofuerZahleIch.tsx`: ▸ und ▾
   - „→“ in Linktexten auf Home, Themen und in `Term.tsx`
   - „›“ in den Breadcrumbs von Einzelplan, Einrichtung und Posten

   Ersetzen durch Phosphor-Icons (`CaretRight`, `CaretDown`, `ArrowRight`), Gewicht
   `regular`, `aria-hidden`. Die Breadcrumbs dabei **nicht** umgestalten: Die Usability-Runde
   hat „Breadcrumbs auffälliger“ als Wunsch notiert, aber ausdrücklich festgehalten, dass
   solche Lösungen erst als Entwurf gezeigt und getestet werden.

**Prüfung:** `grep -rn "border-l-2\|border-t-2\|☰\|✕\|▸\|▾" src` leer; Achsen-Screenshots.

### AP 5: Kategorien, Variante C (Farbklecks mit Kategoriezeile)

**Idee:** Wiederkehrende Kategorien bekommen eine Zeile mit Icon und Kategoriefarbe, und
dort, wo ein Eintrag Gewicht hat, einen **Farbklecks**: eine organische Fläche in der
hellen Tönung der Kategorie mit dem Icon darauf. Er ersetzt das getönte Quadrat hinter
Icons, das auf sehr vielen Vorlagen-Seiten steht, und die farbige Oberkante.

**Wiederkehrende Kategorien im Haushalt:**

- Die zehn **Einzelpläne** (0 bis 9), Farben in `src/lib/colors.ts`
  (`EINZELPLAN_COLORS`, aus den Stripe-Farben).
- Die **Kostenblöcke** in Querschnitte (`c.color`, `c.agg.art`).
- Die Art einer Haushaltsstelle (Einnahme/Ausgabe, Verwaltungs-/Vermögenshaushalt) bleibt
  bei den neutralen `Chip`s; sie ist Metadatum, keine Kategorie.

**Bausteine:**

- `Klecks`: SVG mit `viewBox="0 0 48 48"`, Pfad
  `M25 3.5c8.6.3 17.8 5.2 19.2 14.6 1.5 9.8-4 21.5-14.4 24.9C19.7 46.3 6.6 41.5 4.3 30.7 2 19.6 12.2 3 25 3.5z`.
  Das Icon (22 px) liegt zentriert darauf, der Klecks misst 46 px (38 px in dichten
  Listen). Für Abwechslung zwischen Nachbarn den Pfad um 70° oder um 150° und gespiegelt
  drehen, nie mit neuem Pfad. Beide Elemente `aria-hidden`; die Bedeutung trägt der Text.
- `KategorieZeile`: Icon 16 px plus Text, 14 px, `font-weight: 600`, Satzschreibung,
  **keine** Sperrung.
- Farben aus der vorhandenen Hilfe `tint()` in `colors.ts` ableiten: Klecks-Fläche etwa
  `tint(farbe, 0.78)`, Icon und Text etwa `tint(farbe, -0.35)`. **Den Text-Kontrast gegen
  `cream` (#faf7f2) je Einzelplan nachrechnen**, Minimum 4,5:1, und den `tint`-Wert je
  Farbe so weit absenken, bis er erreicht ist. Gelb und Türkis werden deutlich dunkler
  müssen. Die Formel steht in `../moosburg-design/scripts/kontrast.mjs`.

**Icon je Einzelplan** (Vorschlag, alle Namen in Phosphor 2.1 vorhanden; vor dem Einbau mit
Benedict abstimmen):

| EP | Aufgabenbereich | Icon |
|---|---|---|
| 0 | Allgemeine Verwaltung | `Bank` |
| 1 | Öffentliche Sicherheit | `ShieldCheck` |
| 2 | Schulen | `GraduationCap` |
| 3 | Kultur | `MaskHappy` |
| 4 | Soziales | `HandHeart` |
| 5 | Gesundheit, Sport | `Heartbeat` |
| 6 | Bau, Verkehr | `TrafficCone` |
| 7 | Öffentliche Einrichtungen, Wirtschaftsförderung | `Drop` |
| 8 | Wirtschaftliche Unternehmen | `Factory` |
| 9 | Finanzwirtschaft | `Coins` |

Die Namen der Einzelpläne kommen aus den Daten (`labels.json`), nicht aus dieser Tabelle.

**Einsatzorte:**

1. `EinzelplanDetail.tsx`, Kopf: das farbige Quadrat vor der H1 wird zum Klecks.
2. `EinzelplanDetail.tsx`, Abschnitte: `border-t-2` in Planfarbe raus, statt dessen
   Kategoriezeile über der Abschnittsüberschrift (oder eine Haarlinie plus Zeile).
3. `Querschnitte.tsx`, Kostenblock-Karten: `border-t-2` raus, Klecks plus Kategoriezeile
   „Gruppierungsplan“ bzw. „Stichwort-Auswahl“ statt `.eyebrow`; siehe auch AP 6.
4. `Home.tsx`, „Das fällt auf“: Die Kontextzeile jedes Eintrags beginnt mit der
   Kategoriezeile des Einzelplans (Icon plus Name in Farbe). Der Einzelplan eines Postens
   steckt in den Postendaten (`PostenDetail` nutzt `p.einzelplan`).
5. `WofuerZahleIch.tsx`: Das farbige Quadrat vor jedem Bereich wird zum kleinen Klecks
   (38 px) mit Icon; der Balken darunter behält die Planfarbe.

**Prüfung:** Kontrastwerte je Einzelplan als kleine Tabelle in den Probe-Notizen (AP 13);
Screenshot Einzelplan 2 und Querschnitte.

### AP 6: Kacheln und Einträge

**Entscheidungen:** Kacheln bleiben am Desktop die dominanten Einträge; schmale Screens
bekommen die Register-Variante; das Data-Hub-Muster (Kategorie abgehoben, Anzahl als eigene
Zeile, Farbklecks) ist übernommen. Die Eintrag-Ästhetik von moosburg.eu (ohne Rahmen,
Haarlinien) bleibt, wo Listen heute schon so aussehen.

1. **Startseite, Einstiege** (`Home.tsx:344–370`): Die zwei Links mit Kantenakzent werden
   zu zwei Kacheln:
   - Kachel „Haushalt erkunden“: weißer Grund, 1 px `ink-line`, Radius 10 px, Klecks mit
     `FlowArrow`, Titel in Titelschrift, genau ein Satz
   - Kachel „Themen-Sicht“: gleicher Aufbau, Klecks mit `SquaresFour`, dazu der Rosen-Status
     „In Vorbereitung“ (AP 10)

   Unter 640 px werden beide zu Register-Einträgen: Klecks links, Titel und Satz, Pfeil
   rechts, getrennt durch Haarlinien, ohne Rahmen.
2. **Querschnitte, Kostenblock-Karten** nach Data-Hub-Muster: oben Klecks plus
   Kategoriezeile, dann der Titel, dann die Kennzahlen, darunter **als eigene, durch eine
   Haarlinie abgesetzte Zeile** die Anzahl („142 Haushaltsstellen“, Zahl groß in
   Titelschrift). Die aufklappbaren Details bleiben.
3. **Themen, „Was bis dahin verfügbar ist“** (`Themen.tsx`): Die Liste ist schon im
   Register-Stil; nur das „→“ wird zu `ArrowRight`, dazu optional ein kleiner Klecks je
   Eintrag (Geldfluss `FlowArrow`, Investitionen `Wrench`, Querschnitte `SquaresFour`).
4. **Beschreibungen:** Jede Kachel und jeder Eintrag hat Titel plus **genau einen Satz**.
   Die heutigen Texte der Einstiege haben zwei Sätze; kürzen und die neuen Sätze Benedict
   vorlegen.

**Prüfung:** Startseite 1440 und 390 px; Kacheln gleich hoch, Register am Handy ohne
Rahmen.

### AP 7: Handschrift, Überlappung Variante 1, und Notizen

**Variante 1** (Artefakt, Abschnitt Handschrift, Panel 1): Die Handschrift liegt groß und
halbtransparent **hinter** der Überschrift; die Überschrift steht in Satzschreibung.

- Aufbau: Wrapper mit `position: relative`; das Script als `span` mit
  `position: absolute`, `aria-hidden="true"`, `pointer-events: none`, `select-none`
  - Farbe `gold-500` mit etwa 55 % Deckkraft
  - Größe etwa 1,45-mal die Überschrift
  - Versatz etwa `top: -0.7em`, leicht nach links
  - Drehung −6°
  - Die Überschrift liegt mit eigenem `position: relative` darüber.
- **Ein Etikett oder eine Kategoriezeile über der Überschrift bekommt genug Abstand**, damit
  das Script es nicht kreuzt. Auf der Geschichtsseite des Stadt-Prototyps überschneiden sich
  Script und Etikett und werden beide unleserlich; genau das soll hier nicht passieren.
- Höchstens **eine** Überlappung pro Seite, nur auf den Hauptseiten: Startseite, Erkunden,
  Wofür zahle ich, Themen. Detailseiten (Einzelplan, Einrichtung, Posten) bleiben ohne.
- Die Wörter sind Gestaltung und Text zugleich; **Vorschläge, vor Einbau mit Benedict
  abstimmen:** Startseite „öffentlich“, Erkunden „nachvollziehbar“, Wofür zahle ich „pro
  Kopf“, Themen „bald“.
- **Prüfung:** Überschrift bei 200 % Browser-Zoom und in 390 px lesbar; Script verdeckt
  keine Zeile darunter.

**Notizen im Diagramm** (bestätigt): Eine handschriftliche Notiz in `gold-700` mit kurzem
Pfeil in `gold-500` zeigt auf eine auffällige Stelle, zum Beispiel im Chart „Der Haushalt
über die Jahre“ auf das Jahr mit dem höchsten Ansatz. **Das Jahr aus den Daten berechnen**,
nie fest eintragen.

- Umsetzung am einfachsten als ECharts-`markPoint` bzw. `graphic` mit
  `fontFamily: "Madelon Script"` (Achtung: Canvas braucht die geladene Schrift, siehe AP 1),
  alternativ als HTML-Overlay über dem Diagramm.
- Unter 640 px ausblenden, dort ist kein Platz.
- Höchstens eine Notiz pro Diagramm und nur auf der Startseite in der Probe.

### AP 8: Seitenköpfe

**Mobil:** Seitentitel oben links, groß, direkt unter der Kopfzeile. Das ist heute schon
weitgehend so; nach AP 2 und AP 11 nur prüfen.

**Desktop, Hauptseiten** (Startseite, Erkunden, Wofür zahle ich, Themen):

- Großer Titel mit der Überlappung aus AP 7, darunter der Einleitungsabsatz.
- **Federzeichnung im Anschnitt:** `../moosburg/public/sketches/rathausB.svg` nach
  `public/sketches/` kopieren (dieselbe Urheberschaft wie der Stadt-Prototyp). Einbinden als
  `mask-image` in `gold-500` mit geringer Deckkraft (etwa 0,3 auf Creme), rechts unten
  angeschnitten. Vorbild ist `../moosburg/src/components/SketchGround.tsx`; dort ist auch
  begründet, warum Maske statt `<img>` (Token-Farbe) und warum erst ab `sm` sichtbar
  (unter etwa 200 px verschmiert die Zeichnung).
- **Logo-Platz:** Eigene Tool-Logos kommen später. Für die Probe steht dort die Moosburger
  Rose (`../moosburg/public/rose.svg`, einfarbig in `red-700`) als Platzhalter, **kein**
  gestrichelter Kasten; der ist nur im Artefakt als Markierung gemeint.
- Detailseiten behalten ihre kompakten Köpfe (Breadcrumb, H1, Chips) mit Kategoriezeile
  bzw. Klecks aus AP 5.

**Prüfung:** Startseite 1440 px im Vergleich mit dem Artefakt (Abschnitt Suche, Filter,
Tabs, Titel, „Seitentitel am Desktop“).

### AP 9: Deckende Farbfläche mit Gold und Themenfarben

**Idee:** Wie die Seitenköpfe des Stadt-Prototyps: eine dunkle, satte Fläche, darauf
Creme-Schrift, Etikett, große Zahl und Handschrift in `gold-200`, Zeichnung in Creme mit
geringer Deckkraft, der Stripe als unterer Abschluss. **Höchstens eine Fläche pro
Bildschirm.**

**Flächentöne** (vorläufig entschieden, noch nicht im Kanon, deshalb im lokalen
`@theme`-Block mit Kommentar):

| Token (Vorschlag) | Wert | Creme darauf | Gold-200 darauf | Gold-500 als Deko |
|---|---|---|---|---|
| `--color-flaeche-tiefrot` (= `red-900`) | `#6d0818` | 11,6:1 | 8,5:1 | 4,4:1 |
| `--color-flaeche-tannengruen` | `#1f3b2d` | 11,4:1 | 8,4:1 | 4,4:1 |
| `--color-flaeche-isarpetrol` | `#123b4a` | 11,2:1 | 8,3:1 | 4,3:1 |
| `--color-flaeche-erdbraun` | `#4a2a17` | 12,1:1 | 8,9:1 | 4,6:1 |
| `--color-flaeche-nachtblau` | `#26295e` | 12,6:1 | 9,3:1 | 4,8:1 |
| `--color-flaeche-aubergine` | `#3f2248` | 12,8:1 | 9,4:1 | 4,9:1 |

Werte am 14.09.2026 gerechnet (WCAG-Formel), noch nicht in `kontrast.mjs` geprüft. Gold-700
(`#6e5a30`) gibt es als Kopf-Fläche im Prototyp bereits.

**Einsatzorte im Haushalt:**

1. **Startseite, Einstieg „Wofür zahle ich?“** als neue Fläche nach dem Abschnitt „Zwei
   Haushalte, zwei Logiken“:
   - Kategoriezeile „Wofür zahle ich?“ mit Icon `Coins`
   - Überschrift „Was Moosburg {Jahr} für jeden ausgibt“ mit Überlappung „pro Kopf“ (auf
     der Fläche `gold-200`)
   - große Zahl `view.proKopfNominal` in `gold-200`
   - ein Satz mit der Einwohnerzahl aus den Daten
   - Button in Creme „Aufschlüsseln“ nach `/wofuer-zahle-ich`

   Alle Zahlen aus `view`, nichts fest eintragen.
2. **Wofür zahle ich, Ergebnis:** Der Satz „Dein geschätzter kommunaler Beitrag“ mit der
   heute **roten** Zahl wird zur Fläche mit der Zahl in `gold-200`. Das löst nebenbei den
   Widerspruch, dass hier ein positiver Beitrag in Defizit-Rot steht.

Auf einem Bildschirm stehen die beiden nie gleichzeitig, die Regel „eine pro Bildschirm“
hält also.

**Offene Frage, bitte mit Screenshots vorlegen:** Welche Themenfarbe trägt die Fläche im
Haushalt? Das Artefakt zeigt Tiefrot. Im Haushalt steht Rot aber für Defizit (Abschnitt 3).
Den Ton deshalb als **ein** lokales Token `--color-flaeche-haushalt` führen, zuerst mit
Tiefrot bauen, dann **Tiefrot und Erdbraun** (Alternative: Nachtblau) als Screenshot-Paar
vorlegen. Nicht selbst entscheiden.

**Prüfung:** Kontrast Creme und Gold-200 auf dem gewählten Ton wie in der Tabelle; Fläche in
390 px ohne abgeschnittene Zahl; Stripe unten volle Breite.

### AP 10: Status mit der Rose

**Entscheidung:** Zustandsmarke ist die Rose (Artefakt, Abschnitt Status): Rose in
Zustandsfarbe plus Wort, das Wort ist immer da, die Farbe trägt allein nichts. Rot für
„online“, Gold für „Vorschau/in Vorbereitung“, verblasst für „Archiv“.

**Im Haushalt** gibt es keine „online“-Zustände, und Rot ist belegt. Deshalb:

- `Themen.tsx`: das Etikett „In Vorbereitung“ wird zur Rose in `gold-500` mit dem Wort
  „In Vorbereitung“ in `ink-soft`
- `ThemaPlatzhalter` in `ui.tsx` („Thema folgt“, heute gestrichelter Rahmen) wird zu Rose
  in Gold plus Wort, ohne Rahmen; der Link auf `/themen` und der `title` bleiben
- Startseite: dieselbe Marke an der Kachel „Themen-Sicht“ (AP 6)
- **Nicht** für „(nur Plan)“ in der `YearBar` verwenden: Das ist ein Datenzustand, kein
  Projektstatus. Plan bleibt die gestrichelte Linie, wie in der Timeline begründet und in
  der Usability-Runde als verstanden bestätigt.

Rose als Komponente mit `rose.svg` (siehe AP 8), 16 bis 17 px, `aria-hidden`, Wort daneben.

### AP 11: Navigation, Variante A in einer Zeile

**Ist:** `Header.tsx`, sticky:

- links die Wortmarke „Haushalt“ (rot) plus „Moosburg“ in Playfair
- vier Links als Pillen, aktiv in Tinte
- rechts eine schmale Suche
- mobil ein Hamburger mit Unicode-Zeichen
- darunter der Stripe mit 3 px (Kanon: 4 px)

Die `YearBar` klebt in `Layout.tsx` mit `top-[60px]` darunter. Die Rechtliches- und
Info-Seiten sind nur über die Fußzeile erreichbar.

**Soll am Desktop** (Artefakt, Abschnitt Navigation, Variante A, ohne den Eintrag
moosburg.eu):

```
[Stripe 4 px, volle Breite, an der Oberkante]
[Rose] Haushalt Moosburg  │            Überblick  Erkunden  Themen  Wofür zahle ich?  │  [Suche]  (i) Über das Projekt ▾
```

- Höhe 64 px. Stripe an die **Oberkante** (heute unter dem Kopf), 4 px.
- Wortmarke: Rose als Logo-Platzhalter, „Haushalt“ weiterhin in Rot (Marke, nicht Zustand),
  „Moosburg“ in Tinte, beides in der Titelschrift.
- Navigation in Satzschreibung, 15 px; aktiver Eintrag `font-weight: 600` mit **2 px
  Unterstreichung in Tinte** (Haushalt-Regel, siehe Abschnitt 3; im Artefakt rot).
- Suche nach AP 12.
- **„Über das Projekt“** als Disclosure-Button (`aria-expanded`, `aria-controls`, Esc
  schließt, Fokus kehrt zum Button zurück, Klick außerhalb schließt), **kein**
  `role="menu"`. Inhalt des Panels:
  - Titel „Haushalt Moosburg“, ein Satz, was die App ist (aus README bzw. `Info.tsx`
    ableiten)
  - die Zeile „Privates Projekt, kein Auftritt der Stadt. Verbindlich ist der offizielle
    Haushaltsplan.“ (Wortlaut mit Benedict abstimmen; Footer und README formulieren es
    heute unterschiedlich)
  - Links: Über das Projekt (`/info`), Methodik und Daten (`/methodik`), Glossar,
    Barrierefreiheit, Impressum, Datenschutz, Fehler melden (GitHub-Issues laut README)
  - Icons `Info`, `Scroll`, `Envelope`, `ArrowSquareOut`
- Die Fußzeile bleibt unverändert als zweiter Weg.

**Soll mobil** (unter `md`):

- Oben eine App-Leiste: Rose plus „Haushalt Moosburg“ links; rechts Such-Icon
  (`MagnifyingGlass`, öffnet die Suche als Vollbreiten-Feld) und Info-Icon (öffnet „Über
  das Projekt“ als Blatt).
- **Tab-Leiste unten** mit den vier Hauptzielen:
  - Überblick `House`
  - Erkunden `FlowArrow`
  - Themen `SquaresFour`
  - Wofür zahle ich? `Wallet`

  Jeder Tab mit Icon und Beschriftung (12 px, zweizeilig erlaubt); aktiver Tab mit Pille
  hinter dem Icon in `cream-dark` und Beschriftung in Tinte.
- `padding-bottom` für `main` plus `env(safe-area-inset-bottom)`.
- Der Hamburger entfällt.
- Die Unterreiter von Erkunden (`ErkundenLayout.tsx`, Chips als Pillen, scrollbar) bleiben.
- `YearBar`-Offset an die neue Kopfhöhe anpassen; am besten die Höhe als CSS-Variable
  führen statt `top-[60px]`.

**Prüfung:** Tastatur: Tab durch Kopf, Disclosure öffnen und mit Esc schließen, Fokus
sichtbar; Screenreader-Name der Tabs; 390 px: nichts verdeckt Inhalt, `YearBar` klebt
korrekt; 1440 px: eine Zeile, kein Umbruch der Navigation.

### AP 12: Suche, Chips, Segmente, Radien, Beschreibungen

- **Radien:** 4 px für Marken und Kleinteile, **10 px** für Kacheln, Buttons, Suche, Flächen
  und Eingabefelder; Pille nur noch für Chips und die Tab-Markierung. Umsetzung über die
  Token-Überschreibung aus AP 1 und Durchsicht der Klassen:
  - heute 20× `rounded-md`, 12× `rounded-lg`, 6× `rounded-sm`, 4× `rounded-xl`,
    5× `rounded-full`, 3× `rounded`
  - Buttons und Felder auf `rounded-lg` (dann 10 px)
  - `rounded-sm` und `rounded` für Farbquadrate entfallen mit AP 5
- **Suche** (`Search.tsx`): einheitliches Feld mit Icon `MagnifyingGlass` links, Radius
  10 px, Höhe 40 px im Kopf bzw. 48 px mobil, feste Breite statt Aufspringen beim Fokus.
  Das ARIA-Combobox-Muster und die Tastatursteuerung bleiben unverändert.
- **Chips:** Die Beispiel-Buttons in `WofuerZahleIch.tsx` („Single, zur Miete“ …) werden
  Chips als Pillen, bei Überbreite eine horizontal scrollbare Zeile. Gewählter Chip in
  Tinte, nicht Rot.
- **Segmente** (`SegmentedToggle` in `ui.tsx`): Aussehen wie im Artefakt (Spur in
  `cream-dark`, gewähltes Segment weiß mit leichtem Schatten), aber gewählt in Tinte-Text
  statt invertiert, falls es mit der Haushalt-Regel harmoniert; sonst die heutige
  Tinte-Füllung behalten. Tastatursteuerung unverändert.
- **Buttons:** drei Stufen: primär (Flächenfarbe), tonal (`cream-dark`), Text-Link.
  Im Haushalt ist primär nicht Rot, sondern Tinte (Haushalt-Regel); auf der Farbfläche Creme.

### AP 13: Nachher-Stand, Auswertung, Protokoll

1. **Nachher-Screenshots** derselben Routen und Breiten wie in AP 0 nach
   `docs/formsprache-probe/nachher/`.
2. **Probe-Notizen** als `docs/formsprache-probe/ERGEBNIS.md`:
   - was umgesetzt ist, je Arbeitspaket
   - was nicht funktioniert hat und warum
   - Kontrastwerte (AP 5, AP 9)
   - offene Fragen mit Screenshot-Paaren (Liste unten)
   - Abweichungen vom Artefakt samt Begründung (mindestens: aktive Zustände in Tinte)
3. **Protokoll nachführen:** In `../moosburg-design/docs/formsprache/ENTSCHEIDUNGEN.md` im
   Abschnitt „Verlauf“ einen Eintrag mit Datum, Branch, Commit und Verweis auf
   `ERGEBNIS.md`. Entscheidungen dort **nicht** auf „endgültig“ setzen; das tut nur
   Benedict.
4. `OFFENE-PUNKTE.md` dieses Repos: den Probe-Eintrag aktualisieren und Madelon-Lizenz,
   Null mit Schrägstrich und Themenfarbe nachtragen, falls noch offen.

**Abschlussprüfung, alle grün:**

- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build`
- [ ] `grep -rn "uppercase\|eyebrow\|border-l-2\|border-t-2" src` ohne unkommentierte Treffer
- [ ] keine Unicode-Zeichen als Icons mehr (☰ ✕ ▸ ▾ als Bedienelement; „→“ und „›“ in Links)
- [ ] höchste Achsenbeschriftung in allen Zeitverläufen vollständig
- [ ] Fonts-Panel: nur Source Serif 4, Atkinson Hyperlegible Next, Madelon Script
- [ ] Tastatur und Fokus: Kopf, Disclosure, Tab-Leiste, Suche, Segmente
- [ ] 200 % Zoom: Seitentitel mit Überlappung lesbar
- [ ] `prefers-reduced-motion` respektiert
- [ ] Vorher/Nachher-Screenshots vollständig, `ERGEBNIS.md` geschrieben, Protokoll nachgeführt

---

## 5. Offene Fragen, die in der Probe beantwortet oder Benedict vorgelegt werden

| Frage | Wie vorlegen |
|---|---|
| Themenfarbe der Fläche im Haushalt: Tiefrot trotz Defizit-Bedeutung, oder Erdbraun bzw. Nachtblau? | Screenshot-Paar Startseite |
| Aktive Zustände: Tinte (Haushalt-Regel) oder Rot (Artefakt)? | Screenshot-Paar Kopfzeile |
| Null mit Schrägstrich in Atkinson: gibt es eine Alternative, und wird sie gewünscht? | Kennzahlen-Screenshot |
| Madelon Script: Lizenz geklärt? Sonst Ms Madi | Hinweis, kein Screenshot |
| Script-Wörter je Hauptseite | Liste aus AP 7 |
| Etikett „Stadt Moosburg an der Isar“ streichen? | Hinweis |
| Kürzere Beschreibungssätze der Einstiegskacheln | Textvorschlag |
| Icon je Einzelplan | Tabelle aus AP 5 |
| Tab-Beschriftung „Wofür zahle ich?“ zweizeilig oder kürzer | Screenshot 390 px |

## 6. Bewusst nicht in dieser Probe

- **Dunkelmodus.** Weiter verfolgt, aber nicht entschieden; eigener Schritt nach der Probe.
- **Änderungen am Kanon** (`moosburg-design`), an anderen Repos oder an der Hausbasis.
- **Inhaltliche Befunde der Usability-Runde**, die eigene Tests brauchen: Seitenklarheit
  und Farbtrennung im Sankey, Begriffe „Investitionen“ und „bilanziert“, Auffindbarkeit der
  Glossar-Tooltips, auffälligere Breadcrumbs, Share-Button, eindeutige Nummern einblendbar,
  Synonyme in der Suche. Die Probe darf sie nicht verschlechtern (Term-Unterstreichung
  bleibt erkennbar, Breadcrumbs bleiben mindestens so sichtbar wie heute).
- **Themen-Detail** bleibt gesperrt; die internen Seiten unter `/intern` werden nur
  mitgezogen, wo sie gemeinsame Komponenten nutzen.
- **Daten, ETL, Selektoren:** unverändert.
