# Offene Punkte

*Notiert am 26.08.2026 fuer spaetere Sitzungen. Erledigte Punkte bitte streichen,
nicht abhaken — die Datei soll kurz bleiben.*


## Formsprache-Probe (seit 14.09.2026, umgesetzt auf dem Branch)

Dieses Repo ist Pilot fuer die neue Formsprache der Moosburg-Projekte. Die
Entscheidungen dafuer sind **vorlaeufig**. Umgesetzt auf `probe/formsprache`,
Vorschau unter https://bagruber.github.io/haushaltvis/v2/ (die Wurzel bleibt
`main`). Ergebnis und offene Fragen: `docs/formsprache-probe/ERGEBNIS.md`.
Briefing: `docs/briefing-formsprache-probe.md`, Protokoll:
`../moosburg-design/docs/formsprache/ENTSCHEIDUNGEN.md`.

Noch offen:

- **Madelon Script:** Lizenz ungeklaert; oeffentlich vorerst erlaubt, weil die
  Schrift als aufgegeben gilt. Ersatz bei Bedarf Ms Madi (OFL), Tausch ueber
  `--font-script`.
- **Themenfarbe der Farbflaeche** (Tiefrot) und **Null mit Schraegstrich** in
  Atkinson: am 14.09.2026 vorerst so akzeptiert, vor einer endgueltigen
  Entscheidung noch einmal ansehen.
- **Vor einem Merge nach `main`:** `noindex` aus `index.html` entfernen, die
  Schriftpakete in `hausbasis/baseline.json` eintragen, den Vorschau-Schritt in
  `pages.yml` und `probe-vorschau.yml` wieder entfernen.

## Diagramm-Bedienung (seit 15.10.2026)

Legende und Schalterzeile trennen jetzt, **was** zu sehen ist (Legende) von
**wie** gerechnet wird (Schalter). Offen:

- **Die eigene Legende haben bisher nur die Timeline-Diagramme**
  (Posten, Einrichtung, Einzelplan, Thema). Home, Einnahmen, Investitionen und
  Querschnitte benutzen weiter die eingebaute von ECharts: nicht per Tastatur
  erreichbar und mit der breitgezogenen Raute. Sie koennen folgen, wenn die
  Form traegt.
- **Abweichung vom Entwurf:** die Legende steht unter der Schalterzeile, nicht
  darueber. Dort sitzt sie direkt ueber dem Diagramm, das sie erklaert; die
  Schalterzeile gehoert auf der Einzelplan-Seite zur ganzen Seite.

## Zwischenstand 2026 (seit 14.10.2026)

Die Marken „gebucht/bezahlt bis 30.09." sind ein **Versuch** fuer die kommende
Sitzung und die interne Arbeit, umgesetzt in der gemeinsamen `Timeline`
(Posten, Einrichtung, Bereiche im Einzelplan). Offen:

- **Vor einem Merge nach `main` neu entscheiden, ob der Zwischenstand bleibt.**
  Zuruecknehmen heisst `public/data/zwischenstand.json` loeschen — kein
  Code-Schalter noetig, die Tests ueberspringen dann ihren Block.
- **Home, Einnahmen, Investitionen und Querschnitte** haben eigene Diagramme
  und zeigen noch keinen Zwischenstand. Erst, wenn die Form traegt.
- **Aussagekraeftig wird er erst im Vergleich** („bis 30.09.2025 waren 68 %
  bezahlt, dieses Jahr 59 %"). Die Kaemmerei fragen, ob AKDB dieselbe
  Auswertung zum 01.10. der Vorjahre rueckwirkend ausgibt.

## Gesamtliste (seit 15.10.2026)

Die Seite `/erkunden/gesamtliste` (abgesetzter Reiter unter Erkunden) zeigt
alle 4.306 Haushaltsstellen in Nummernfolge.
Offen:

- **CSV-Export ist vorbereitet, hat aber keinen Knopf.** `gesamtlisteCsv` in
  `src/lib/data/gesamtliste.ts` gibt die sichtbaren Zeilen mit den sichtbaren
  Spalten fuer deutsches Excel aus. Knopf und Download kommen nach
  Rueckmeldung; die Seite haelt den gefilterten Zeilenstand schon so, dass nur
  noch der Aufruf fehlt.
- **Scroll-Leistung auf einem mittleren Telefon pruefen.** Gemessen ist nur der
  Aufbau: alle 4.306 Zeilen stehen in 257 ms (Desktop-Chromium). Beim Scrollen
  hilft `content-visibility: auto` je Einzelplan.
- **Untergruppen-Ebene (3-stellig)** fehlt bewusst. Die Namen stehen schon in
  `labels.json` (`unterabschnitt`), falls sie spaeter dazukommen soll.

## Vorschaukarten (seit 14.10.2026)

Je Adresse eine HTML-Datei mit eigener Karte (`scripts/karten.mjs`). Noch zu
pruefen, was nur am echten Geraet geht:

- **Messenger-Test** nach dem Deploy auf `/v2/`: Links in WhatsApp, Signal und
  Telegram auf einem Telefon schicken, dazu Mastodon und LinkedIn
  (Post Inspector). Einige Dienste schneiden quadratisch zu; geht dabei der
  Titel verloren, die Raender anpassen.
- **Buildzeit in CI** vor und nach dem Schritt notieren. Lokal brauchen die 358
  Bilder rund 35 s; mehr als zwei Minuten zusaetzlich waere ein Grund, die
  Einrichtungen auf eine gemeinsame Bildvorlage zurueckzunehmen.
- **Betrieb bei der Stadt** ist offen (Abschnitt 7 des Briefings). Chromium
  gehoert nicht auf staedtische Server: die Karten entstehen dort, wo gebaut
  wird, und werden mit dem Ordner ausgeliefert.

## Toolchain-Stand

Dieses Repo laeuft seit dem 26.08.2026 auf **pnpm** (nicht npm) und auf der
projektweiten Hausbasis. **Die Zielversionen stehen nicht hier**, sondern in
`hausbasis/baseline.json` — eine Quelle statt einer Tabelle je Repo. Abgleich:

```bash
node ../hausbasis/check.mjs --kurz
```

Der Sinn ist Deduplizierung: alle Repos teilen sich einen pnpm-Store, der genau so
weit dedupliziert, wie die Versionen uebereinstimmen. Gemessen kostet ein Repo mit
abweichenden Versionen ~158 MB, ein Versions-Zwilling ~8 MB. **Einzelne Pakete
also nicht im Alleingang hochziehen** — das faellt allen anderen Repos zur Last.

## Warum `"types": ["node"]` in der tsconfig.app.json steht

`src/lib/data/selectors.test.ts` prueft den echten Datenbestand und liest dafuer
mit `node:fs` von der Platte. TypeScript 7 zieht `@types/*` nicht mehr
automatisch in jeden Scope; ohne den Eintrag bricht der Build mit TS2591
(*"Cannot find name 'node:fs'"*, dazu `__dirname`).

Der Eintrag ist also kein Versehen und auch nicht redundant zur
`tsconfig.node.json` — die deckt nur `vite.config.ts` ab.

## Warum `baseUrl` aus der tsconfig verschwunden ist

TypeScript 7 hat die Option entfernt (Fehler TS5102). Die Zeile
`"baseUrl": "."` wurde ersatzlos gestrichen — `paths` loest TS 7 relativ zur
tsconfig-Datei auf, die Eintraege stimmen unveraendert weiter. **Nicht
"reparieren", indem `baseUrl` wieder eingetragen wird.**

## Beim naechsten Paket-Update

Weder `pnpm install` noch `pnpm prune` raeumt die alte Version aus
`node_modules/.pnpm`. Nach einem Upgrade deshalb:

```bash
rm -rf node_modules && pnpm install
pnpm store prune
```

Ohne diesen Schritt bleibt der Speichergewinn auf dem Papier. In den beiden
Upgrade-Wellen am 26.08.2026 hat das zusammen ~1,2 GB freigegeben.
