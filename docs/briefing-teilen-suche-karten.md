# Briefing: Teilen, Suche, Zwischenstand 2026, Vorschaukarten

*Angelegt am 14.10.2026. **Runde 1 (Abschnitte 0 bis 6) ist umgesetzt**
(Commits `dde0168` bis `5e9e796` auf `probe/formsprache`) und bleibt hier als
Begründung stehen. **Offen ist Runde 2** (15.10.2026), direkt im Anschluss.
Wo Runde 2 etwas aus Runde 1 ändert, gilt Runde 2. Abschnitt 7 (Betrieb) ist
nur Hintergrund und wird nicht umgesetzt.*

---

# Runde 2 (15.10.2026)

Nach Durchsicht der umgesetzten Runde 1. **Alles in Runde 2 ist entschieden**
(R2.4 und R2.5 am 15.10.2026 von Benedict bestätigt) und kann umgesetzt werden.
Reihenfolge am Ende von Runde 2.

## R2.1 Reihenfolge der Diagramm-Schalter

Neue Reihenfolge in `TimelineControls`
([src/components/Timeline.tsx](../src/components/Timeline.tsx)):

**inflationsbereinigt · je Einwohner · mit Einnahmen verrechnet · Investitionen zeigen**

`ansichtSchreiben` in [src/lib/teilen.ts](../src/lib/teilen.ts) schreibt die
Wörter laut Kommentar „in der Reihenfolge der Schalterzeile“; dort dieselbe
Reihenfolge herstellen (`real,kopf,netto,invest`). `ansichtLesen` liest
weiterhin jede Reihenfolge, alte Links bleiben gültig. Test in
`teilen.test.ts` anpassen.

Mit R2.4a wandert „Investitionen zeigen“ danach aus der Schalterzeile in die
Legende; die drei übrigen Schalter behalten diese Reihenfolge. R2.1 trotzdem
zuerst umsetzen: Es ist ein Zweizeiler, und `?ansicht=invest` bleibt als Wort
für die Legendenauswahl erhalten.

**Prüfen:** Einrichtung mit Einnahmen und Investitionen (Freibad, `/einrichtung/5701`)
zeigt die vier Schalter in der neuen Reihenfolge; `?ansicht=invest,real` aus
einem alten Link schaltet beides ein.

## R2.2 Suchtreffer mit einheitlicher Grammatik

### Problem

Die zweite Zeile eines Treffers folgt heute keiner Regel. Bei Seiten, Themen,
Einzelplänen, Bereichen und Einrichtungen steht dort die **Art** („Einrichtung
5702“), bei Posten aber der **Ort** („Hallenbad · 5702.4107“). Wer „Hallenbad“
sucht, sieht die Einrichtung Hallenbad und darunter Posten, bei denen ebenfalls
„Hallenbad“ an derselben Stelle steht. Das Icon hilft nicht, weil es nach dem
Einzelplan geht: Einrichtung und Posten tragen dasselbe grüne Icon.

### Regel

Jeder Treffer hat drei feste Plätze, für jede Art gleich belegt:

| Platz | Inhalt | Beispiel |
|---|---|---|
| Zeile 1 | Name | „Badegebühren u.ä. Entgelte“ |
| Zeile 2, vorn | **Art**, immer, aus einem festen Wortschatz, `font-semibold text-ink-soft` | „Posten“ |
| Zeile 2, danach | Ort: die nächsthöhere Ebene **mit Namen**, `text-ink-muted` | „· Hallenbad · Einnahme“ |
| rechts | Nummerngerüst, wie heute | `5702.1161` |

Das Icon bleibt beim Einzelplan: Es sagt **wo**, das Art-Wort sagt **was**.

Wortschatz und Ort je Art (die Namen der Ebenen wie in `src/lib/hierarchy.ts`
und der Oberfläche, keine neuen Begriffe):

| Art | Zeile 2 | rechts | Icon |
|---|---|---|---|
| Seite | `Seite` · Erkunden / Über das Projekt (wo sie im Menü hängt) | — | Seiten-Icon, grau |
| Kostenblock | `Kostenblock` · Querschnitt | — | eigenes Icon und Farbe |
| Thema | `Thema` | — | `SquaresFour` in der Themenfarbe |
| Einzelplan | `Einzelplan` | `2` | Einzelplan-Icon |
| Bereich | `Bereich` · Name des Einzelplans | `21xx` | Einzelplan-Icon |
| Einrichtung | `Einrichtung` · Name des Bereichs | `5702` | Einzelplan-Icon |
| Posten | `Posten` · Name der Einrichtung, bei Einnahmen und Investitionen zusätzlich `· Einnahme` bzw. `· Investition` | `5702.1161` | Einzelplan-Icon |

- **Bereich und Einrichtung sind verschiedene Ebenen**: Bereich = zweistellig
  (`57xx` Bäder), Einrichtung = vier- bis fünfstellig (`5701` Freibad, `5702`
  Hallenbad); ein Bereich enthält eine oder mehrere Einrichtungen. 14 der 56
  Bereiche haben nur eine Einrichtung, drei davon mit gleichem Namen (`16`
  Rettungsdienst, `40` Allgemeine Sozialverwaltung, `92` Abwicklung der
  Vorjahre). Dort erscheinen zwei gleichnamige Treffer, die sich nur in Art und
  Nummer unterscheiden. Das ist richtig so und nicht zusammenzulegen: Die
  Bereichsadresse führt zur Einzelplan-Seite, die Einrichtung zu ihrer eigenen.
- **„Kostenblock“** ist das Wort für die Einträge der Querschnitte (Personal,
  Strom & Energie …). So heißen sie schon in `etl/aggregatoren.yaml` und auf
  den Vorschaukarten. „Querschnitt“ bleibt der Name der Seite, die sie
  sammelt, und steht deshalb als Ort dahinter.
- Die Nummer rutscht aus der zweiten Zeile ganz nach rechts; sie steht nicht
  doppelt.
- Bei Seiten fallen die Stichworte aus der zweiten Zeile weg. Sie bleiben im
  Index und werden weiter durchsucht, sind aber Suchhilfe, kein Ort.
- Posten-Zusatz: `ea === "E"` → „Einnahme“, `haushalt === "vermoegen"` und
  `ea === "A"` → „Investition“, laufende Ausgaben ohne Zusatz. So lassen sich
  „Badegebühren“ (`5701.1161`), „Bewirtschaftung der Grundstücke und Gebäude“
  (`5701.5400`) und „Hochbaumaßnahmen“ (`5701.9400`) desselben Bads
  auseinanderhalten.
- Technisch: `SearchItem` bekommt `art` (aus dem Wortschatz) und `ort` statt
  des freien `sub`; `Search.tsx` setzt beide zusammen. So kann keine neue
  Trefferart die Regel unterlaufen.
- `aria-label` der Option: „{Name}, {Art}, {Ort}“.

Rangfolge bleibt wie in Runde 1 (Posten nach allem anderen).

**Prüfen:**
- Test: Jeder Eintrag in `searchIndex` hat eine `art` aus dem Wortschatz und,
  außer Einzelplan, Thema und Seite ohne Menüort, einen nichtleeren `ort`.
- Test: `searchRank(index, "hallenbad")` liefert die Einrichtung `5702` mit Art
  „Einrichtung“ vor allen Treffern der Art „Posten“.
- Von Hand: „Hallenbad“, „Strom“, „Schule“, „46“ eintippen, bei 375 px und
  Desktop. Jede zweite Zeile beginnt mit dem Art-Wort.

## R2.3 Zwischenstand: Notiz, Tooltip, Legende

Ändert Abschnitt 4 „Gegen Fehllesen“ und „Darstellung in der Timeline“.

1. **Text der Notiz:** „Stand 01. Oktober“, aus `stichtag` gebildet (Tag
   zweistellig, Monat ausgeschrieben). Kein „erst 9 Monate“ mehr; `monateBis`
   entfällt, wenn nichts anderes es nutzt. Der Hinweissatz in der Ansicht „mit
   Einnahmen verrechnet“ verliert ebenfalls die „neun Monate“: „Der
   Zwischenstand zum 01. Oktober ist hier ausgeblendet, weil …“.
2. **Kurzer, schlichter Pfeil.** Für diese Notiz kein S-Bogen vom oberen Rand:
   Text links neben den Rauten, auf ihrer Höhe, ein gerader Strich von etwa
   24 px mit kleiner Spitze. Umsetzung als zweite Form in `zeichneNotiz`
   ([src/components/EChart.tsx](../src/components/EChart.tsx)), gewählt über ein
   neues Feld `Notiz.form?: "bogen" | "kurz"` (Standard `"bogen"`, damit die
   bestehenden Notizen „Corona-Pandemie“ und „Gaskrise“ bleiben, wie sie
   sind). Für `"kurz"` braucht das Grid oben keine 56 px Luft.
3. **Einmal je Seite.** Auf der Einzelplan-Seite trägt nur das **erste**
   Bereichsdiagramm, das Rauten zeigt, die Notiz. `Timeline` bekommt dafür
   `zwischenNotiz?: boolean` (Standard `true`); `EinzelplanDetail` setzt es
   nur für den ersten passenden Bereich. Der Satz unter dem Diagramm („Die
   Rauten sind der Zwischenstand …“) steht dort ebenfalls nur einmal, unter
   der Schalterzeile statt unter jedem Diagramm.
4. **Nur wenn eine Raute sichtbar ist.** Blendet jemand in der Legende
   „gebucht“ und „bezahlt“ beide aus, verschwindet die Notiz. Das ist der
   allgemeine Mechanismus aus R2.4h: Die Notiz gehört zu den Serien
   `gebucht` und `bezahlt`. Die Sichtbarkeit kommt aus der eigenen Legende
   (R2.4b).
5. **Tooltip:** Die Zeilen „gebucht …“ und „bezahlt …“ erscheinen nur im
   Tooltip des Jahres mit Zwischenstand (2026). In allen anderen Jahren bleibt
   es bei Ergebnis, Ansatz und gegebenenfalls Investitionen und „Ausgaben
   gesamt“. Umsetzung: eigener `tooltip.formatter`, der Zeilen der beiden
   Rauten-Serien mit Wert `null` weglässt. Reihenfolge der Zeilen fest:
   Ergebnis, Ansatz, gebucht, bezahlt, Ausgaben gesamt, Investitionen.
6. **Raute in der Legende quadratisch.** Erledigt sich mit der eigenen
   Legende (R2.4b): Dort ist die Raute ein quadratisches SVG. Heute zieht
   ECharts eingebaute Symbole wie `diamond` auf `itemWidth × itemHeight`
   (25 × 14), daher die Breite.

**Prüfen:**
- `/einzelplan/5`: genau eine Notiz auf der Seite, „Stand 01. Oktober“, kurzer
  Pfeil, am ersten Bereich mit Rauten.
- In der Legende beide Rauten aus → Notiz weg; eine wieder an → Notiz da.
- Tooltip über 2025: keine Zeilen „gebucht/bezahlt“. Über 2026: beide, mit
  „x % des Ansatzes“ beim bezahlten Wert.
- Legende: Rauten so hoch wie breit.
- Die Notizen „Corona-Pandemie“ (Einnahmen) und „Gaskrise“ (Querschnitte)
  unverändert.

## R2.4 Diagramme verständlicher, ohne Funktion zu verlieren

**Beschlossen: a bis f, dazu h.** g bleibt bewusst draußen.

Heute gibt es zwei Bedienungen für dasselbe: Die Schalterzeile über dem
Diagramm und die klickbare ECharts-Legende darunter. „Investitionen zeigen“
schaltet eine Serie ein, die dann in der Legende noch einmal ein- und
ausgeschaltet werden kann. Die Legende ist außerdem nicht per Tastatur
erreichbar und hat die zu breite Raute.

**a) Eine Regel: Legende = was ich sehe, Schalter = wie gerechnet wird.**
Investitionen sind eine Serie, keine Rechenart. „Investitionen
zeigen“ verschwindet aus der Schalterzeile; der Legendeneintrag
„Investitionen“ ist anfangs aus (ausgegraut) und lässt sich dort einschalten.
In der Schalterzeile bleiben nur Umrechnungen: inflationsbereinigt · je
Einwohner · mit Einnahmen verrechnet.

**b) Eigene Legende statt der von ECharts**, zusammen mit a. Als Reihe von Knöpfen (`<button aria-pressed>`) direkt über dem Diagramm, neben
der Schalterzeile:

```
Zeigen:     [━ Ergebnis] [╌○ Ansatz] [◇ gebucht] [◆ bezahlt] [▮ Investitionen]
Rechnen:    [ ] inflationsbereinigt  [ ] je Einwohner  [ ] mit Einnahmen verrechnet
```

Gewinn: per Tastatur bedienbar, Symbole exakt wie im Diagramm (gestrichelter
Ansatz, quadratische Rauten), ausgeschaltete Einträge sichtbar als aus statt
nur blasser. Die ECharts-Legende wird abgeschaltet (`legend: { show: false }`),
die Sichtbarkeit über `legend.selected` gesteuert. Fährt man mit Maus oder
Fokus über einen Legendenknopf, wird die Serie hervorgehoben
(`dispatchAction({ type: "highlight", seriesName })`), wie es die
ECharts-Legende bisher tat. Eine Komponente `DiagrammLegende` für alle
Timeline-Diagramme; Home, Einnahmen, Investitionen und Querschnitte können
später folgen.

**c) Die Grafik sagt, was gerade gerechnet ist.** Sobald ein
Rechen-Schalter an ist, steht über der y-Achse eine kurze Zeile, z. B. „€ je
Einwohner, in Preisen von 2026“ oder „Eigenanteil nach Abzug der Einnahmen“.
Ein Screenshot erklärt sich dann selbst, und niemand vergleicht versehentlich
eine bereinigte mit einer unbereinigten Kurve.

**d) „Ansicht zurücksetzen“.** Ein Textlink am Ende der
Schalterzeile, nur sichtbar, wenn etwas vom Standard abweicht.

**e) Auswahl beim Weitergehen mitnehmen** (mittlerer Aufwand). Heute hängt die Auswahl an `?ansicht=` der aktuellen Seite; ein Klick
auf einen Posten verliert sie, weil der Link ohne Query gebaut ist. Lösung
nach dem Muster des Stichjahrs (`YearProvider` + `YearUrlSync` in
[src/lib/year.tsx](../src/lib/year.tsx)):

- `AnsichtProvider` im Layout hält Schalter **und** Legendenauswahl
  (Serien-Kennungen `ist`, `plan`, `gebucht`, `bezahlt`, `invest`, `brutto`).
- `AnsichtUrlSync` spiegelt den Zustand auf jeder Seite in `?ansicht=` (und
  `?aus=` für ausgeblendete Serien), wie `jahr`.
- Ein frischer Link mit `?ansicht=` gewinnt einmal, wie beim Jahr.
- Was auf einer Seite nicht passt (verrechnet ohne Einnahmen, Investitionen
  ohne Vermögenshaushalt), bleibt im Zustand gespeichert, wird dort aber weder
  angewendet noch als „an“ angezeigt. Zurück auf einer passenden Seite ist es
  wieder da.

Aufwand: ein Kontext, die beiden Hooks, `useAnsicht` greift auf den Kontext
statt auf die Query zu. Die Seiten selbst ändern sich kaum.

**f) Feste Reihenfolge und Wortwahl in Tooltip, Legende und Tabelle** (klein).
Überall dieselbe Reihenfolge (Ergebnis, Ansatz,
gebucht, bezahlt, Ausgaben gesamt, Investitionen) und dieselben Wörter. Heute
heißt die Investitions-Serie „Investitionen (Ansatz)“, der Schalter
„Investitionen zeigen“.

**g) Bewusst nicht:** Abweichung Plan/Ist in Prozent im Tooltip. Das ist eine
Daten-Auswertung, und die sind für eine spätere Phase zurückgestellt.

**h) Notizen folgen ihrer Linie.** Eine handschriftliche Notiz gehört fast
immer zu einer bestimmten Serie: „Corona-Pandemie“ zur Gewerbesteuer
(Einnahmen), „Gaskrise“ zu Strom & Energie (Querschnitte), „Stand 01. Oktober“
zu den beiden Rauten. Heute bleibt sie voll sichtbar, wenn man über eine
andere Linie fährt und die eigene ausgegraut wird.

- `Notiz` bekommt `serien?: string[]`, die Namen der Serien, zu denen sie
  gehört. Ohne das Feld verhält sie sich wie heute.
- **Ausgrauen:** Wird eine Serie hervorgehoben, die nicht in `serien` steht,
  sinkt die Deckkraft von Text, Bogen und Spitze auf etwa 0,2 (im Bild an die
  Blässe der ausgegrauten Linien angleichen). Endet die Hervorhebung, wieder 1.
  In `EChart` dafür auf `highlight`/`downplay` hören (die feuern bei
  Legenden-Hover und bei `dispatchAction`) und zusätzlich auf
  `mouseover`/`mouseout` der Serien (Hover direkt auf der Linie). Die
  Grafik-Elemente per `setOption({ graphic })` mit derselben `id` umfärben,
  nicht neu zeichnen.
- **Ausblenden:** Ist keine der Serien in `serien` sichtbar (Legende), wird die
  Notiz gar nicht gezeichnet. Das deckt R2.3 Punkt 4 ab.
- Das Ausgrauen setzt voraus, dass die anderen Linien beim Hover überhaupt
  verblassen. Querschnitte hat `emphasis: { focus: "series" }`, das
  Steuer-Diagramm auf der Einnahmen-Seite nicht. Dort dasselbe ergänzen, damit
  sich beide Diagramme gleich verhalten.

**Prüfen (h):** Querschnitte, Hover über „Personal“ → Linie Strom und Notiz
„Gaskrise“ verblassen gemeinsam; Hover über Strom → beide voll. Dasselbe auf
der Einnahmen-Seite mit „Corona-Pandemie“. Strom in der Legende aus → Notiz weg.

Reihenfolge innerhalb von R2.4: f → a+b (zusammen, weil a ohne b die
Investitionen in die ECharts-Legende schieben würde) → h → c → d → e. Mit b
erledigen sich R2.3 Punkt 4 und 6.

## R2.5 Gesamtliste: der ganze Haushalt auf einer Seite

**Beschlossen** (15.10.2026): Name „Gesamtliste“, eigener Eintrag in der
Hauptnavigation, keine Untergruppen-Ebene, CSV-Export nur vorbereitet.

Eine Seite, die den Haushalt so zeigt wie die AKDB-Excel: alle
Haushaltsstellen der Reihe nach, ohne Diagramme pro Bereich.

### Ort und Name

- **Eigener Eintrag in der Hauptnavigation**, auf einer Ebene mit Erkunden:
  Überblick · Erkunden · **Gesamtliste** · Themen · Wofür zahle ich?. Route
  `/gesamtliste`. Überschrift „Der ganze Haushalt, Stelle für Stelle“. Nicht
  „Haushaltsplan“: Das ist das verbindliche Dokument der Stadt, und diese
  Seite ist es nicht.
- Eintrag in `SEITEN` ([src/lib/seiten.ts](../src/lib/seiten.ts)), daraus
  bauen Header und Suche: Icon `ListNumbers`, Stichworte „alle
  Haushaltsstellen“, „Tabelle“, „Excel“, „Liste“. In `Header.tsx` in `links`
  nach Erkunden einhängen.
- **Untere Tab-Leiste (unter `lg`) bekommt damit fünf Einträge.** Bei 320 px
  und 375 px prüfen, dass Icon und Beschriftung nicht umbrechen oder
  überlappen; notfalls die Beschriftung dort auf „Liste“ kürzen.
- Nicht in `NUMMERN_ROUTES` aufnehmen: In der Gesamtliste stehen die Nummern
  immer, ein Schalter wäre sinnlos. Die Jahresleiste gilt dagegen (sie hängt
  am Layout und bestimmt die Spalten).
- Teilbare Abschnitte nach dem Muster aus Paket 2: `/gesamtliste/2`
  (Einzelplan), `/gesamtliste/21` (Bereich), `/gesamtliste/5701`
  (Einrichtung). Die Stellenzahl unterscheidet die Ebene.
- Vorschaukarten (Paket 6): `karten.mjs` legt auch für `/gesamtliste` (Vorlage
  Seite) und für jede `/gesamtliste/<nummer>` eine HTML-Datei ab. Die
  Unterseiten bekommen **kein neues Bild**, sondern zeigen auf das
  vorhandene Bild des Einzelplans, Bereichs oder der Einrichtung.

### Aufbau

Gegliedert wie die Einzelplan-Seiten, aber **alle Einzelpläne untereinander und
alles in Nummernfolge**:

```
Einzelplan 5 · Gesundheit, Sport, Erholung          Einnahmen … · Ausgaben … · Investitionen …
  57xx Bäder (Frei- & Hallenbad)                    …
    5701 Freibad                                    …
      Einnahmen · Verwaltungshaushalt
        5701.1161  Badegebühren u.ä. Entgelte       Ansatz 2026 · Ansatz 2025 · Ergebnis 2025
        …
      Einnahmen · Vermögenshaushalt
        5701.3610  Investitionszuweisungen vom Land
      Ausgaben · Verwaltungshaushalt
        5701.4140  Entgelte für tariflich Beschäftigte
        …
        5701.6790  Innere Verrechnungen Bauhof     (intern, gedämpft)
      Ausgaben · Vermögenshaushalt (Investitionen)
        5701.9400  Hochbaumaßnahmen
```

- Innerhalb einer Einrichtung nach der Gruppierungsnummer sortieren. Die erste
  Ziffer der GRZ trennt schon kameral: 0–2 Einnahmen Verwaltungshaushalt, 3
  Einnahmen Vermögenshaushalt, 4–8 Ausgaben Verwaltungshaushalt, 9 Ausgaben
  Vermögenshaushalt. Die Nummernfolge ist also zugleich die Gruppierung; eine
  Zwischenzeile erscheint, wo die Gruppe wechselt.
- Keine Untergruppen-Ebene (3-stellig): Einzelplan → Bereich → Einrichtung
  reicht und entspricht den übrigen Seiten. Kann später dazukommen; die Namen
  stehen schon in `labels.json` (`unterabschnitt`).
- Kopfzeilen von Einzelplan, Bereich und Einrichtung tragen ihre Summen:
  Einnahmen, Ausgaben, Investitionen. Ganz oben die Summen des ganzen
  Haushalts, getrennt nach Verwaltungs- und Vermögenshaushalt.
- Interne Verrechnungen bleiben drin (sonst stimmen die Summen nicht mit der
  Excel), gedämpft und mit dem Wort „intern“ markiert.

### Spalten

- Mit Stichjahr 2026: **Ansatz 2026 · Ansatz 2025 · Ergebnis 2025**. Das
  Stichjahr aus der Jahresleiste bestimmt die Spalten. Der amtliche Plan zeigt
  das Ergebnis des Vorvorjahrs, weil das Vorjahr bei Planaufstellung noch
  nicht abgerechnet ist. Hier liegt es schon vor und ist aussagekräftiger.
- Zwischenstand: Wenn `zwischenstand.json` da ist und das Stichjahr passt,
  zwei weitere Spalten „gebucht bis 30.09.“ und „bezahlt bis 30.09.“, mit
  einem Schalter „Stand 01. Oktober zeigen“ (aus per Standard). Für die
  Sitzung ist das vermutlich die nützlichste Ansicht überhaupt.
- Nummer, Name und darunter klein der Kontotext, wo es einen gibt.
- Jede Zeile verlinkt auf ihren Posten, jede Einrichtungszeile auf ihre
  Einrichtung.

### Balken

Als Datenbalken in der Liste, nicht als eigenes Diagramm. Hinter
der Ansatz-Spalte ein dünner Balken, Länge proportional zum Betrag, ein
gemeinsamer Maßstab für die ganze Seite. So springen beim Scrollen die großen
Stellen ins Auge, ohne dass ein Diagramm dazukommt.

- Verwaltungshaushalt im getönten Einzelplan-Ton, **Vermögenshaushalt im
  Investitions-Ocker** (`#b39f7a`, derselbe wie die Investitions-Balken in der
  Timeline). Damit gilt in der ganzen App: **Investitionen sind ockerfarbene
  Balken.** Das beantwortet die Frage nach einer globalen Balkensicht für
  Investitionen, ohne eine weitere Seite zu bauen.
- Kleine Beträge werden bei einem gemeinsamen Maßstab fast unsichtbar. Das ist
  gewollt: Der Balken soll das Große zeigen, die Zahl steht daneben.

### Bedienung

- Filter oben: Haushalt [beide · Verwaltung · Vermögen], Art [beide ·
  Einnahmen · Ausgaben], ein Textfeld „in der Liste filtern“ (Name oder
  Nummer, filtert live), Sprungleiste 0–9 zu den Einzelplänen. „Nur
  Verwaltungshaushalt“ ergibt genau den ersten Teil des amtlichen Plans in
  dessen Reihenfolge.
- Leere Stellen (alle gezeigten Spalten 0 oder leer) per Standard ausblenden,
  Schalter „auch leere Stellen“.
- **CSV-Export nur vorbereiten, noch kein Knopf.** Eine reine Funktion
  `gesamtlisteCsv(zeilen, spalten): string` neben den Selektoren, die genau
  die gefilterten, sichtbaren Zeilen mit den sichtbaren Spalten ausgibt.
  Format für deutsches Excel: Semikolon als Trenner, Dezimalkomma, UTF-8 mit
  BOM (sonst zeigt Excel die Umlaute falsch), Nummern als Text, damit
  `0301` seine führende Null behält. Mit Test. Die Seite hält den gefilterten
  Zeilenstand so, dass ein Knopf später nur noch die Funktion aufrufen und
  einen Download anstoßen muss. Knopf und Download bauen wir erst nach
  Rückmeldung.
- Unter 640 px: jede Stelle zweizeilig (Nummer und Name, darunter die Beträge).
- Rund 2.700 Stellen je Jahr. Ohne Virtualisierung rendern, aber je Einzelplan
  `content-visibility: auto`, damit nur das Sichtbare gezeichnet wird. Erst
  messen, dann optimieren.

### Prüfen

- Test: Summe Ansatz Verwaltungshaushalt Einnahmen = Ausgaben (kameraler
  Haushaltsausgleich; für 2026 beide 66.903.830 €), ebenso Vermögenshaushalt
  (31.880.027 €). Die Summen der Liste müssen das exakt treffen.
- Test: Die Reihenfolge der Zeilen ist streng aufsteigend nach `hhst_id`
  innerhalb jeder Einrichtung, Einrichtungen aufsteigend nach GLZ.
- Test für `gesamtlisteCsv`: Kopfzeile, Semikolon, Dezimalkomma, BOM am
  Anfang, `0301.6322` bleibt mit führender Null erhalten, ein Name mit
  Semikolon wird korrekt in Anführungszeichen gesetzt.
- Von Hand: Filter „Vermögen“ + „Ausgaben“ zeigt nur Gruppierungen 9xxx;
  `/gesamtliste/5701` springt zum Freibad; Stichjahr 2024 wechselt die
  Spalten; die Hauptnavigation markiert „Gesamtliste“ als aktiv.
- Untere Tab-Leiste mit fünf Einträgen bei 320 px und 375 px.
- Scroll-Leistung auf einem mittleren Telefon prüfen.

## Reihenfolge Runde 2

1. R2.1 Schalter-Reihenfolge
2. R2.2 Such-Grammatik
3. R2.4f feste Reihenfolge und Wortwahl
4. R2.4a+b eigene Legende, Investitionen in die Legende
5. R2.3 Zwischenstand (Notiz-Text, kurzer Pfeil, einmal je Seite, Tooltip);
   Punkt 4 und 6 sind mit b schon erledigt
6. R2.4h Notizen folgen ihrer Linie
7. R2.4c, d, e (Rechenzeile, Zurücksetzen, Auswahl mitnehmen)
8. R2.5 Gesamtliste

Nach jedem Schritt: `pnpm typecheck && pnpm test && pnpm build`, Sichtprüfung
bei 375 px und Desktop.

---

# Runde 1 (14.10.2026, umgesetzt)

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

*Überholt durch R2.1.* Klein und unabhängig, daher zuerst.

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

*Text, Pfeil und Häufigkeit der Notiz sowie der Tooltip überholt durch R2.3.*

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
