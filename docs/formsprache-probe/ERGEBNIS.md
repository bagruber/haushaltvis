# Ergebnis der Formsprache-Probe im Haushalt

*Stand 14.09.2026, Branch `probe/formsprache`. Die Entscheidungen bleiben vorläufig und gelten
nur für diese Probe in haushaltvis; nichts davon ist Kanon.*

Vorschau: https://bagruber.github.io/haushaltvis/v2/ (die Wurzel zeigt weiter den Stand von
`main`). Jeder Push auf den Branch baut die Vorschau neu, siehe
`.github/workflows/probe-vorschau.yml`.

Screenshots vorher und nachher liegen lokal in `docs/formsprache-probe/vorher/` und
`nachher/`, die Paare zu den offenen Fragen in `nachher/paare/`. Sie sind nicht eingecheckt
(Binärdateien, per `.git/info/exclude` ausgenommen).

## Umgesetzt

| AP | Stand | Wo |
|---|---|---|
| 1 Schriften, Tokens | Source Serif 4 (opsz-Datei, Achsen opsz und wght), Atkinson Hyperlegible Next, Madelon Script aus `src/assets/fonts/`. Radien lg und xl 10 px. ECharts zeichnet erst nach dem Laden der Schriften und bekommt die Textschrift explizit. | `src/index.css`, `EChart.tsx` |
| 2 Versalien | `.headline` ohne Versalien, `.eyebrow` gelöscht, jede Fundstelle einzeln aufgelöst. Das Etikett „Stadt Moosburg an der Isar“ über der Home-H1 ist gestrichen. | alle Seiten |
| 3 Kennzahlen | Komponente `Kennzahl`: Zahl zuerst, Beschriftung darunter, `lining-nums tabular-nums`. Zuschussbedarf bleibt rot. | Home, Investitionen, Einrichtung, Querschnitte, `Stat` |
| 4 Fehler | Alle Zeitverläufe mit `containLabel`; Kantenakzente ersetzt; ☰ ✕ ▸ ▾ › und Linkpfeile durch Phosphor-Icons ersetzt. | Home, Einnahmen, Querschnitte, Timeline, Investitionen |
| 5 Kategorien | `Klecks` und `KategorieZeile`, Icon je Einzelplan in `src/lib/kategorien.ts` | Einzelplan-Kopf, Querschnitte, „Das fällt auf“, Wofür zahle ich |
| 6 Kacheln, Register | Einstiege auf Home ab 640 px als Kacheln, darunter als Register. Kostenblöcke als Data-Hub-Kacheln mit Anzahl-Zeile. Themen-Liste als Register mit kleinem Klecks. | Home, Querschnitte, Themen |
| 7 Handschrift | `SeitenTitel` mit Überlappung Variante 1 auf den vier Hauptseiten; Notiz „höchster Ansatz“ im Haushalts-Chart, aus den Daten berechnet, unter 640 px aus. | Home, Erkunden, Wofür zahle ich, Themen |
| 8 Seitenköpfe | `SeitenKopf`: ab 640 px Rose als Logo-Platzhalter und `rathausB.svg` als Maske in Gold, rechts unten angeschnitten. | vier Hauptseiten |
| 9 Farbfläche | Token `--color-flaeche-haushalt` (Tiefrot). Fläche „Wofür zahle ich?“ auf Home, Ergebnis des Rechners als Fläche mit der Zahl in Gold-200. | Home, Wofür zahle ich |
| 10 Status | `Rose` und `RoseStatus`; „In Vorbereitung“ und „Thema folgt“. Die Datenmarke „(nur Plan)“ bleibt, wie sie ist. | Themen, Home, Detailseiten |
| 11 Navigation | Stripe 4 px an der Oberkante, Kopf 64 px in einer Zeile, aktiv 600 mit 2 px Unterstreichung in Tinte. „Über das Projekt“ als Disclosure (Esc, Klick außerhalb, Fokus zurück), mobil als Blatt. Unter 1024 px Tab-Leiste unten, Hamburger entfällt. Stichjahr-Leiste klebt über `--kopf-hoehe`. | `Header.tsx`, `Layout.tsx` |
| 12 Bausteine | Suche mit Icon, feste Breite, 40 bzw. 48 px; Beispiel-Chips als scrollbare Zeile mit `aria-pressed`; Segmente mit weißem Segment auf `cream-dark`; Felder 10 px. | `Search.tsx`, `ui.tsx`, Wofür zahle ich |

Geprüft: `pnpm typecheck`, `pnpm test` (21), `pnpm build` grün. Mit Playwright: Disclosure per
Enter öffnen, per Esc schließen, Fokus kehrt zum Knopf zurück, Klick außerhalb schließt.
Gerenderte Schriften nur Source Serif 4, Atkinson Hyperlegible Next und Madelon Script. Mobil
schließt die Stichjahr-Leiste bündig an den Kopf an (69 px). Die Suche nach Resten
(`uppercase`, `eyebrow`, `border-l-2`, `border-t-2`, ☰ ✕ ▸ ▾) ist leer; nur die interne Seite
`intern/Zuordnung` behält ihre ▸ ▾ ✕ (Werkzeug, nicht Teil der Probe).

## Abweichungen vom Briefing und vom Vorschlag

- **Aktive Zustände in Tinte statt Rot:** Navigation, Tab-Pille, gewählter Chip. Im Haushalt
  heißt Rot Defizit.
- **Tab-Leiste bis 1024 px statt bis 768 px:** Das Protokoll nennt „ab 1024 px Navigation im
  Kopf“. Die Kopfzeile mit Wortmarke, vier Einträgen, Suche und „Über das Projekt“ passt unter
  1024 px nicht in eine Zeile.
- **Einzelplan-Abschnitte ohne Kategoriezeile:** Stattdessen eine Haarlinie. Jede Zeile hätte
  denselben Einzelplan genannt, der schon im Kopf steht (Redundanz vermeiden).
- **Einnahmen-Gruppen:** Die goldenen Oberkanten sind jetzt Haarlinien, ohne Klecks.
  Einnahmearten sind hier keine wiederkehrende Kategorie.
- **Zwei Überlappungen auf der Startseite:** Titel („öffentlich“) und Farbfläche („pro Kopf“).
  AP 7 erlaubt eine pro Seite, AP 9 verlangt eine auf der Fläche. Beide stehen nie auf einem
  Bildschirm.
- **Stichjahr-Leiste deckend:** Halbtransparent wirkte sie über der Farbfläche trüb.
- **Kopf ohne `backdrop-blur`:** Der Filter macht den Kopf zum Bezugsrahmen fester
  Kindelemente, das mobile Blatt „Über das Projekt“ säße sonst im Kopf.
- **Pfeile in Inhalten bleiben Text:** „2025 → 2026“ und „10 Mio. € → 13 Mio. €“ sind Aussagen,
  keine Bedienelemente. Ersetzt sind nur Pfeile in Linktexten.
- **Madelon Script bleibt öffentlich:** Entscheidung Benedict vom 14.09.2026, die Schrift gilt
  als aufgegeben. Ersatz bei Bedarf Ms Madi, der Tausch ist eine Zeile (`--font-script`).

## Was beim Bauen nicht funktioniert hat

- **Handschrift abgeschnitten:** Der Schwung des „ö“ in „öffentlich“ ragt links über den
  Titel hinaus und wurde von `overflow-hidden` am Seitenkopf abgeschnitten. Jetzt ist nur die
  Zeichnung beschnitten.
- **Script kreuzt die Rose:** Der Abstand über dem Titel war mit 0,8 em zu knapp, jetzt 1,15 em.
  Dieselbe Falle wie auf der Geschichtsseite des Stadt-Prototyps.
- **Notiz im Chart fehlte:** ECharts ist modular registriert, `MarkPointComponent` fehlte.
- **Federzeichnung hinter Text:** Auf „Wofür zahle ich?“ und „Themen“ steckte der Kopf im
  schmalen Textcontainer. Er steht jetzt außerhalb.
- **Beschriftungen im Flussdiagramm:** Die breitere Textschrift schneidet lange
  Einnahme-Namen links ab („…hlüsselzuweisungen“). Behoben im Usability-Teil (Sankey).

## Kontrast

Kategorie-Töne aus `tint(farbe, 0.78)` für die Klecks-Fläche und `tint(farbe, -0.35)` für Icon
und Text; gerechnet mit der WCAG-Formel wie in `kontrast.mjs`.

| Kategorie | Farbe | Text | Text auf Creme | Icon auf Klecks |
|---|---|---|---|---|
| EP 0 Allgemeine Verwaltung | `#8a8170` | `#5a5449` | 7,02 | 5,86 |
| EP 1 Sicherheit | `#c8102e` | `#820a1e` | 9,77 | 7,05 |
| EP 2 Schulen | `#009ac7` | `#006481` | 6,26 | 5,22 |
| EP 3 Kultur | `#6b3e7a` | `#46284f` | 11,72 | 8,78 |
| EP 4 Soziales | `#e91e8c` | `#97145b` | 7,66 | 5,86 |
| EP 5 Gesundheit, Sport | `#0a9e4c` | `#076731` | 6,56 | 5,43 |
| EP 6 Bau, Verkehr | `#3b3f9a` | `#262964` | 12,41 | 9,15 |
| EP 7 Öffentliche Einrichtungen | `#18ada4` | `#10706b` | 5,53 | 4,75 |
| EP 8 Wirtschaftliche Unternehmen | `#b8964e` | `#786233` | 5,47 | 4,79 |
| EP 9 Finanzwirtschaft | `#1a1a1a` | `#111111` | 17,67 | 11,88 |
| Personal | `#2f6f8f` | `#1f485d` | 9,17 | 7,19 |
| Zuschüsse | `#6b3e7a` | `#46284f` | 11,72 | 8,78 |
| Gebäude | `#c26a2c` | `#7e451d` | 7,13 | 5,86 |
| EDV | `#0a9e4c` | `#076731` | 6,56 | 5,43 |
| Strom | `#d4a017` | `#8a680f` | 4,83 | 4,32 |
| Wasser | `#3a8fb7` | `#265d77` | 6,74 | 5,61 |

Farbfläche: Creme auf Tiefrot 11,57:1, Gold-200 auf Tiefrot 8,53:1; Creme auf Erdbraun
12,02:1, Gold-200 auf Erdbraun 8,86:1.

## Offene Fragen für Benedict

| Frage | Vorlage |
|---|---|
| Farbfläche: Tiefrot trotz Defizit-Bedeutung, oder Erdbraun? | `paare/flaeche-tiefrot.png`, `paare/flaeche-erdbraun.png` |
| Aktive Zustände: Tinte oder Rot? | `paare/aktiv-tinte.png`, `paare/aktiv-rot.png` |
| Null mit Schrägstrich in Atkinson: Keines der Features `zero`, `ss01` bis `ss20`, `cv01` bis `cv20`, `salt` liefert im Browser eine Null ohne Schrägstrich (Sichtprüfung). Eine Alternative ginge nur über eine andere Textschrift. | `paare/kennzahlen-null.png` |
| Handschrift-Wörter: „öffentlich“ (Home), „nachvollziehbar“ (Erkunden), „pro Kopf“ (Wofür zahle ich, Farbfläche), „bald“ (Themen); Notiz „höchster Ansatz“ | Seiten in `nachher/` |
| Icon je Einzelplan wie im Briefing vorgeschlagen (Bank, ShieldCheck, GraduationCap, MaskHappy, HandHeart, Heartbeat, TrafficCone, Drop, Factory, Coins); Kostenblöcke Users, HandCoins, Buildings, Desktop, Lightning, Drop | `nachher/wofuer-1440.png`, `nachher/querschnitte-1440.png` |
| Tab-Beschriftung „Wofür zahle ich?“: passt bei 390 px in eine Zeile | `paare/tableiste-390.png` |
| Madelon-Lizenz | vorerst öffentlich erlaubt, kein Screenshot |

### Neue Texte zur Abstimmung

- Kachel „Haushalt erkunden“: „Vom Gesamthaushalt bis zur einzelnen Haushaltsstelle, mit
  Einnahmen, Investitionen und Querschnitten.“
- Kachel „Themen-Sicht“: „Der Haushalt nach Lebensbereichen statt nach Aktenzeichen.“
- Farbfläche Home: Kategoriezeile „Wofür zahle ich?“, Überschrift „Was Moosburg {Jahr} für
  jeden ausgibt“, Satz „Die Ausgaben beider Haushalte, geteilt durch {Einwohner} Einwohner.“,
  Knopf „Aufschlüsseln“
- Rechner: „Dein geschätzter kommunaler Beitrag“, „pro Jahr“
- „Über das Projekt“: „Der Haushalt der Stadt Moosburg an der Isar, verständlich aufbereitet bis
  zur einzelnen Haushaltsstelle.“ und „Privates Projekt, kein Auftritt der Stadt. Verbindlich ist
  der offizielle Haushaltsplan.“; Links „Methodik und Daten“, „Impressum und Kontakt“, „Fehler
  melden“
- Kennzahl-Beschriftungen Home: „Ausgaben {Jahr}, Ansatz beider Haushalte“, „je Einwohner, bei
  {Einwohner} Einwohnern“, „davon Investitionen, der Rest ist laufender Betrieb“
