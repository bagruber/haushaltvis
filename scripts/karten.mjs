// Vorschaukarten je Adresse.
//
//   node scripts/karten.mjs dist
//
// Legt fuer jede teilbare Adresse eine eigene HTML-Datei mit eigenen
// og:-Angaben ab und daneben ein PNG 1200x630. Messenger und soziale Netze
// fuehren kein JavaScript aus; sie lesen nur die Metazeilen der Datei, die
// unter der Adresse liegt. Auf GitHub Pages ist das fuer jede Unterseite
// sonst 404.html, also gar keine Karte.
//
// Eigener Schritt auf einem fertigen Ordner, nicht Teil von `vite build`:
// wird `data/` spaeter getauscht, lassen sich die Karten auf demselben Ordner
// neu erzeugen, ohne die App neu zu bauen.
import fs from 'node:fs'
import path from 'node:path'
import { BREITE, HOEHE, esc, karteEbene, karteSeite } from './lib/vorlage.mjs'
import { renderePngs } from './lib/rendern.mjs'
import { EINZELPLAN_COLORS, KOSTENBLOCK_COLORS } from '../src/lib/marke.mjs'
import { incomeCategory, isInternal } from '../src/lib/kameral.mjs'

const ordner = process.argv[2]
if (!ordner) {
  console.error('Aufruf: node scripts/karten.mjs <ordner>   (z. B. dist)')
  process.exit(1)
}
const SITE = (process.env.SITE_URL || 'https://bagruber.github.io').replace(/\/$/, '')

// Icon-Namen, nicht Komponenten: die Zuordnung Einzelplan -> Icon lebt in
// src/lib/kategorien.ts, hier stehen nur ihre Namen, weil Node die .ts-Datei
// nicht laedt. Gleiches gilt fuer die Kostenblock- und Seiten-Icons.
const EP_ICON = {
  '0': 'Bank', '1': 'ShieldCheck', '2': 'GraduationCap', '3': 'MaskHappy', '4': 'HandHeart',
  '5': 'Heartbeat', '6': 'TrafficCone', '7': 'Drop', '8': 'Factory', '9': 'Coins',
}
const BLOCK_ICON = {
  personal: 'Users', zuschuesse: 'HandCoins', gebaeude: 'Buildings',
  it: 'Desktop', strom: 'Lightning', wasser: 'Drop',
}
const GOLD = '#b8964e'
const NOTIZ_TINTE = '#6e5a30'
const NOTIZ_PFEIL = '#b8964e'

// Handschriftliche Notizen, die in der App an derselben Stelle stehen.
const NOTIZEN = { strom: { text: 'Gaskrise', fenster: [2022, 2023, 2024], richtung: 'max' } }

// ── Daten ───────────────────────────────────────────────────────────────────
const lies = (rel) => JSON.parse(fs.readFileSync(path.join(ordner, 'data', rel), 'utf8'))
const budget = lies('budget.json')
const labels = (() => { try { return lies('labels.json') } catch { return {} } })()
const context = (() => { try { return lies('context.json') } catch { return {} } })()
const aggregatoren = (() => { try { return lies('aggregatoren.json') } catch { return {} } })()
const glossar = (() => { try { return lies('glossar.json') } catch { return {} } })()

const jahre = [...budget.meta.years].sort((a, b) => a - b)
const planJahr = jahre[jahre.length - 1]
const posten = budget.posten

const fmtEur = (v) => `${Math.round(v).toLocaleString('de-DE')} €`
/** Auf der Karte steht der ganze Betrag, ab einer Million gerundet. */
const fmtBetrag = (v) =>
  Math.abs(v) >= 1_000_000
    ? `${(v / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio. €`
    : fmtEur(v)
const fmtKopf = (v) =>
  `${v.toLocaleString('de-DE', { maximumFractionDigits: Math.abs(v) < 10 ? 2 : Math.abs(v) < 100 ? 1 : 0 })} €`
const saeubere = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

/**
 * Ansatz und Ergebnis je Jahr, in einem Durchgang fuer alle Ebenen. Die
 * Aggregation ist dieselbe Regel wie in lib/data/selectors.ts; sie steht hier
 * noch einmal, weil Node die .ts-Dateien nicht laedt.
 */
function sammle() {
  const leer = () => ({ ansatz: new Map(), ergebnis: new Map() })
  const stufen = {
    laufend: new Map(), invest: new Map(), einnahme: new Map(), art: new Map(),
  }
  const hol = (karte, schluessel) => {
    if (!karte.has(schluessel)) karte.set(schluessel, leer())
    return karte.get(schluessel)
  }
  const buche = (eintrag, f) => {
    if (f.ansatz != null) eintrag.ansatz.set(f.year, (eintrag.ansatz.get(f.year) ?? 0) + f.ansatz)
    if (f.ergebnis != null) eintrag.ergebnis.set(f.year, (eintrag.ergebnis.get(f.year) ?? 0) + f.ergebnis)
  }
  for (const f of budget.facts) {
    const p = posten[f.hhst_id]
    if (!p) continue
    const ziel = p.ea === 'E' ? 'einnahme' : p.haushalt === 'verwaltung' ? 'laufend' : 'invest'
    for (const ebene of [p.einzelplan, p.glz.slice(0, 2), p.glz, p.hhst_id]) {
      buche(hol(stufen[ziel], ebene), f)
    }
    if (p.ea === 'E' && !isInternal(p)) buche(hol(stufen.art, incomeCategory(p)), f)
  }
  return stufen
}
const stufen = sammle()

const reiheAus = (eintrag) => {
  if (!eintrag) return null
  const ist = jahre.map((y) => eintrag.ergebnis.get(y) ?? null)
  const ansatz = jahre.map((y) => eintrag.ansatz.get(y) ?? null)
  if (!ist.some((v) => v) && !ansatz.some((v) => v)) return null
  // Der Plan haengt an seinem eigenen Jahr: 86 der 262 Einrichtungen haben
  // ihren letzten Ansatz vor dem laufenden Jahr.
  let planIndex = -1
  ansatz.forEach((v, i) => { if (v) planIndex = i })
  let istIndex = -1
  ist.forEach((v, i) => { if (v) istIndex = i })
  return { jahre, ist, ansatz, planIndex, istIndex, plan: planIndex >= 0 ? ansatz[planIndex] : null }
}

/**
 * Die Zahl auf der Karte traegt immer ihr Jahr. Der Ansatz des laufenden
 * Jahres heisst „Plan", ein aelterer „Ansatz", und wo es nie einen gab, steht
 * das letzte Ergebnis.
 */
function kennzahl(r, art) {
  if (r.planIndex >= 0) {
    const jahr = jahre[r.planIndex]
    return { wert: r.ansatz[r.planIndex], jahr, marke: jahr === planJahr ? `Plan ${jahr}` : `Ansatz ${jahr}` }
  }
  const jahr = jahre[r.istIndex]
  return { wert: r.ist[r.istIndex], jahr, marke: `Ergebnis ${jahr}`, art }
}

/** Erste Geldart, die es auf dieser Ebene ueberhaupt gibt. */
function geldart(schluessel) {
  for (const [art, stufe] of [
    ['Laufende Ausgaben', stufen.laufend],
    ['Investitionen', stufen.invest],
    ['Einnahmen', stufen.einnahme],
  ]) {
    const r = reiheAus(stufe.get(schluessel))
    if (r) return { art, r }
  }
  return null
}

function wertZeile(art, k) {
  const pop = context.population?.[String(k.jahr)]
  const kopf = pop ? ` · ${fmtKopf(k.wert / pop)} je Einwohner` : ''
  return `${art}, ${k.marke}${kopf}`
}

/** Index des Extremwerts im Fenster — wie extremImFenster in lib/notiz.ts. */
function notizFuer(key, werte) {
  const n = NOTIZEN[key]
  if (!n) return undefined
  let best = -1
  for (const y of n.fenster) {
    const i = jahre.indexOf(y)
    const v = i >= 0 ? werte[i] : null
    if (v == null) continue
    if (best < 0 || (n.richtung === 'min' ? v < werte[best] : v > werte[best])) best = i
  }
  return best < 0 ? undefined : { text: n.text, index: best, wert: werte[best], farbe: NOTIZ_TINTE, pfeil: NOTIZ_PFEIL }
}

// ── Adressen ────────────────────────────────────────────────────────────────
const eintraege = []
const adresse = (pfad) => `${SITE.replace(/^https?:\/\//, '')}${basis}${pfad.replace(/^\//, '')}`

/** Ein Eintrag: eigene HTML-Datei, dazu entweder eigenes Bild oder ein geteiltes. */
const eigeneBilder = new Set()
const nimm = (pfad, titel, beschreibung, bild, karte) => {
  if (karte) eigeneBilder.add(bild)
  eintraege.push({ pfad, titel, beschreibung, bild, karte })
}

/** Das erste Bild, das es wirklich gibt — sonst die allgemeine og.png. */
const bildOderOben = (...kandidaten) => kandidaten.find((k) => eigeneBilder.has(k)) ?? null

// Basis aus der gebauten index.html lesen: dort steht sie schon drin, und so
// stimmt sie auch fuer die Vorschau unter /v2/.
const schale = fs.readFileSync(path.join(ordner, 'index.html'), 'utf8')
const basisTreffer = schale.match(/<script type="module"[^>]*src="([^"]*)\/assets\//)
if (!basisTreffer) {
  console.error('In index.html steht kein Modul-Script mit /assets/ — ist das ein fertiger Build?')
  process.exit(1)
}
const basis = `${basisTreffer[1]}/`
if (!basis.startsWith('/')) {
  // Portables Demo-Paket: relative Basis, dazu Hash-Routing. Beides macht
  // absolute og:-Adressen unmoeglich, und Crawler sehen ohnehin nur die eine
  // index.html. Kein Fehler, nur nichts zu tun.
  console.log(`Relative Basis "${basis}" — portables Paket, keine eigenen Karten.`)
  process.exit(0)
}

// Einzelpläne
const epNamen = new Map()
for (const p of Object.values(posten)) if (!epNamen.has(p.einzelplan)) epNamen.set(p.einzelplan, p.einzelplan_name)
for (const [ep, name] of [...epNamen].sort()) {
  const g = geldart(ep)
  if (!g) continue
  const k = kennzahl(g.r, g.art)
  nimm(
    `/einzelplan/${ep}`,
    `Einzelplan ${ep} · ${name}`,
    `${g.art} des Einzelplans ${ep}: ${fmtEur(k.wert)} (${k.marke}).`,
    `/einzelplan/${ep}`,
    karteEbene({
      ebene: 'Einzelplan', nummer: ep, oberzeile: 'Aufgabenbereich im Haushalt', titel: name,
      farbe: EINZELPLAN_COLORS[ep], iconName: EP_ICON[ep], variante: Number(ep),
      wert: fmtBetrag(k.wert), wertZeile: wertZeile(g.art, k), werte: g.r, adresse: adresse(`/einzelplan/${ep}`),
    }),
  )
}

// Bereiche
const bereiche = new Map()
for (const p of Object.values(posten)) {
  const ab = p.glz.slice(0, 2)
  if (!bereiche.has(ab)) bereiche.set(ab, p)
}
for (const [ab, p] of [...bereiche].sort()) {
  const name = labels.abschnitt?.[ab] ?? ab
  const g = geldart(ab)
  if (!g) {
    // Zwei Bereiche tragen nur Nullwerte. Die Adresse gibt es trotzdem, also
    // bekommt sie ihren Titel — nur kein eigenes Bild.
    nimm(
      `/bereich/${ab}`,
      `Bereich ${ab}xx · ${name}`,
      `Bereich ${ab}xx im Einzelplan ${p.einzelplan} (${p.einzelplan_name}) der Stadt Moosburg.`,
      bildOderOben(`/einzelplan/${p.einzelplan}`),
      null,
    )
    continue
  }
  const k = kennzahl(g.r, g.art)
  nimm(
    `/bereich/${ab}`,
    `Bereich ${ab}xx · ${name}`,
    `${g.art} im Bereich ${ab}xx (Einzelplan ${p.einzelplan}): ${fmtEur(k.wert)} (${k.marke}).`,
    `/bereich/${ab}`,
    karteEbene({
      ebene: 'Bereich', nummer: `${ab}xx`, oberzeile: `Einzelplan ${p.einzelplan} · ${p.einzelplan_name}`,
      titel: name, farbe: EINZELPLAN_COLORS[p.einzelplan], iconName: EP_ICON[p.einzelplan], variante: Number(ab),
      wert: fmtBetrag(k.wert), wertZeile: wertZeile(g.art, k), werte: g.r, adresse: adresse(`/bereich/${ab}`),
    }),
  )
}

// Einrichtungen
const einrichtungen = new Map()
for (const p of Object.values(posten)) if (p.glz_text && !einrichtungen.has(p.glz)) einrichtungen.set(p.glz, p)
for (const [glz, p] of [...einrichtungen].sort()) {
  const name = saeubere(p.glz_text)
  const g = geldart(glz)
  if (!g) {
    nimm(
      `/einrichtung/${glz}`,
      `${name} · Einrichtung ${glz}`,
      `Einrichtung ${glz} im Einzelplan ${p.einzelplan} (${p.einzelplan_name}) der Stadt Moosburg.`,
      bildOderOben(`/bereich/${glz.slice(0, 2)}`, `/einzelplan/${p.einzelplan}`),
      null,
    )
    continue
  }
  const k = kennzahl(g.r, g.art)
  nimm(
    `/einrichtung/${glz}`,
    `${name} · Einrichtung ${glz}`,
    `${g.art}: ${fmtEur(k.wert)} (${k.marke}).`,
    `/einrichtung/${glz}`,
    karteEbene({
      ebene: 'Einrichtung', nummer: glz, oberzeile: `Einzelplan ${p.einzelplan} · ${p.einzelplan_name}`,
      titel: name, farbe: EINZELPLAN_COLORS[p.einzelplan], iconName: EP_ICON[p.einzelplan], variante: Number(glz),
      wert: fmtBetrag(k.wert), wertZeile: wertZeile(g.art, k), werte: g.r, adresse: adresse(`/einrichtung/${glz}`),
    }),
  )
}

// Kostenblöcke
for (const [key, agg] of Object.entries(aggregatoren)) {
  const ist = jahre.map((y) => agg.reihe[String(y)]?.ergebnis || null)
  const ansatz = jahre.map((y) => agg.reihe[String(y)]?.ansatz || null)
  let planIndex = -1
  ansatz.forEach((v, i) => { if (v) planIndex = i })
  const r = { jahre, ist, ansatz, planIndex, plan: planIndex >= 0 ? ansatz[planIndex] : null }
  const jahr = jahre[planIndex]
  const marke = jahr === planJahr ? `Plan ${jahr}` : `Ansatz ${jahr}`
  const pop = context.population?.[String(jahr)]
  nimm(
    `/erkunden/querschnitte/${key}`,
    `${agg.title} · Querschnitt`,
    `${saeubere(agg.beschreibung)} ${fmtEur(r.plan)} (${marke}).`,
    `/erkunden/querschnitte/${key}`,
    karteEbene({
      ebene: 'Querschnitt', nummer: '', oberzeile: 'Kostenblock über alle Einzelpläne', titel: agg.title,
      farbe: KOSTENBLOCK_COLORS[key] ?? GOLD, iconName: BLOCK_ICON[key] ?? 'Tag', variante: planIndex,
      wert: fmtBetrag(r.plan), wertZeile: `Laufende Ausgaben, ${marke}${pop ? ` · ${fmtKopf(r.plan / pop)} je Einwohner` : ''}`,
      werte: r, notiz: notizFuer(key, ist), adresse: adresse(`/erkunden/querschnitte/${key}`),
    }),
  )
}

// Einnahmearten
const kennung = (name) =>
  name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
for (const [name, eintrag] of [...stufen.art].sort()) {
  const r = reiheAus(eintrag)
  if (!r || r.planIndex < 0) continue
  const k = kennzahl(r, 'Einnahmen')
  const pfad = `/erkunden/einnahmen/${kennung(name)}`
  nimm(
    pfad,
    `${name} · Einnahmen`,
    `Einnahmen der Stadt Moosburg aus ${name}: ${fmtEur(k.wert)} (${k.marke}).`,
    pfad,
    karteEbene({
      ebene: 'Einnahmeart', nummer: '', oberzeile: 'Woher das Geld kommt', titel: name,
      farbe: GOLD, iconName: 'TrayArrowDown', variante: r.planIndex,
      wert: fmtBetrag(k.wert), wertZeile: wertZeile('Einnahmen', k), werte: r, adresse: adresse(pfad),
    }),
  )
}

// Seiten und Seitenabschnitte. Name und Icon stehen in src/lib/seiten.ts; der
// Satz ist der Karte eigen, denn die Seite selbst hat keinen.
const SEITEN = [
  ['/', 'Überblick', 'House', 'Der Haushalt, öffentlich lesbar', 'Was die Stadt Moosburg einnimmt und ausgibt, durchsuchbar bis zur einzelnen Buchungszeile.'],
  ['/ueberblick/verlauf', 'Überblick', 'House', 'Der Haushalt über die Jahre', 'Laufender Betrieb und Investitionen, Jahr für Jahr seit 2016.'],
  ['/ueberblick/wachstum', 'Überblick', 'House', 'Was davon echtes Wachstum ist', 'Mehr Einwohner und Inflation vergrößern den Haushalt, ohne dass die Stadt mehr leistet. Beides herausgerechnet.'],
  ['/ueberblick/auffaelliges', 'Überblick', 'House', 'Das fällt auf', 'Die größten Veränderungen im Haushalt, von Jahr zu Jahr verglichen.'],
  ['/erkunden', 'Seite', 'FlowArrow', 'Geldfluss', 'Wo das Geld herkommt und wohin es geht, vom Gesamthaushalt bis zur Einrichtung.'],
  ['/erkunden/einnahmen', 'Seite', 'TrayArrowDown', 'Woher das Geld kommt', 'Steuern, Zuweisungen, Gebühren und Entgelte der Stadt Moosburg.'],
  ['/erkunden/einnahmen/verlauf', 'Einnahmen', 'TrayArrowDown', 'Steuern im Zeitverlauf', 'Einkommensteuer-Anteil, Gewerbesteuer, Grundsteuer und Schlüsselzuweisungen über die Jahre.'],
  ['/erkunden/investitionen', 'Seite', 'Crane', 'Investitionen', 'Was die Stadt baut und anschafft, mit Laufzeit und Eigenanteil je Vorhaben.'],
  ['/erkunden/investitionen/wer-bezahlt', 'Investitionen', 'Crane', 'Wer die Investitionen bezahlt', 'Förderung, Anliegerbeiträge, Verkaufserlöse — und was die Stadt selbst trägt.'],
  ['/erkunden/investitionen/vorhaben', 'Investitionen', 'Crane', 'Vorhaben über ihre Laufzeit', 'Jedes Bauvorhaben als Ganzes, über alle Jahre summiert.'],
  ['/erkunden/investitionen/laufende-ansaetze', 'Investitionen', 'Crane', 'Laufende Ansätze', 'Grunderwerb, Straßenunterhalt, Fahrzeuge: Daueraufgaben statt Projekte.'],
  ['/erkunden/investitionen/verlauf', 'Investitionen', 'Crane', 'Investitionen über die Jahre', 'Die Ansätze des Vermögenshaushalts, gestapelt nach Einzelplan.'],
  ['/erkunden/querschnitte', 'Seite', 'TreeStructure', 'Querschnitte', 'Personal steckt in fast jeder Einrichtung, Strom in jedem Gebäude. Kostenblöcke quer über den Haushalt.'],
  ['/erkunden/querschnitte/verlauf', 'Querschnitte', 'TreeStructure', 'Kostenblöcke über die Jahre', 'Personal, Zuschüsse, Gebäude, IT, Strom und Wasser im Vergleich.'],
  ['/erkunden/gesamtliste', 'Seite', 'ListNumbers', 'Der ganze Haushalt, Stelle für Stelle', 'Jede Haushaltsstelle in ihrer Nummernfolge, wie im amtlichen Plan: Einzelplan, Bereich, Einrichtung, dann die einzelnen Posten.'],
  ['/wofuer-zahle-ich', 'Rechner', 'Wallet', 'Wofür zahle ich?', 'Aus Einkommen- und Grundsteuer geschätzt: welcher Teil Ihres Beitrags in Schulen, Kitas, Straßen und Bäder fließt.'],
  ['/themen', 'Seite', 'SquaresFour', 'Themen', 'Der Haushalt quer zur Verwaltungsgliederung gelesen: Bildung, Mobilität, Soziales.'],
  ['/methodik', 'Seite', 'Scroll', 'Methodik und Daten', 'Woher die Zahlen kommen, wie sie aufbereitet sind und was sie nicht sagen.'],
  ['/glossar', 'Seite', 'BookOpen', 'Glossar', 'Ansatz, Soll, Gliederung: die Fachbegriffe des kameralen Haushalts, kurz erklärt.'],
  ['/info', 'Seite', 'Info', 'Über das Projekt', 'Ein privates Projekt, kein Auftritt der Stadt. Verbindlich ist der offizielle Haushaltsplan.'],
  ['/impressum', 'Seite', 'Envelope', 'Impressum', 'Verantwortlich für dieses Angebot und wie Sie Kontakt aufnehmen.'],
  ['/datenschutz', 'Seite', 'Lock', 'Datenschutz', 'Was die Seite speichert — und was nicht.'],
  ['/barrierefreiheit', 'Seite', 'PersonArmsSpread', 'Barrierefreiheit', 'Wie zugänglich diese Seite ist und wo sie noch nicht reicht.'],
]
for (const [pfad, art, iconName, titel, satz] of SEITEN) {
  const bild = pfad === '/' ? '/ueberblick' : pfad
  nimm(pfad, titel, satz, bild, karteSeite({ art, iconName, titel, satz, adresse: adresse(pfad) }))
}

// Die Gesamtliste zeigt denselben Haushalt in Nummernfolge. Jede Ebene ist
// dort eine Sprungmarke und damit eine Adresse — das Bild hat sie schon.
for (const [ebene, nummer, name] of [
  ...[...epNamen].sort().map(([ep, name]) => ['/einzelplan/', ep, name]),
  ...[...bereiche].sort().map(([ab, p]) => ['/bereich/', ab, labels.abschnitt?.[ab] ?? ab]),
  ...[...einrichtungen].sort().map(([glz, p]) => ['/einrichtung/', glz, saeubere(p.glz_text)]),
]) {
  const pfad = `/erkunden/gesamtliste/${nummer}`
  nimm(
    pfad,
    `${name} · Gesamtliste`,
    `Alle Haushaltsstellen zu ${nummer} in Nummernfolge, mit Ansatz, Vorjahr und Ergebnis.`,
    bildOderOben(`${ebene}${nummer}`),
    null,
  )
}

// Glossarbegriffe: eigener Titel und eigener Text, aber das Bild der
// Glossarseite — 27 fast gleiche Karten waeren Ballast.
for (const [id, e] of Object.entries(glossar)) {
  nimm(`/glossar/${id}`, `${e.title} · Glossar`, saeubere(e.text), '/glossar', null)
}

// Posten: eigener Titel und Text, Bild der Einrichtung. Eigene Bilder waeren
// rund 150 MB, und der Titel traegt hier mehr als das Bild.
for (const p of Object.values(posten)) {
  const r = reiheAus(stufen[p.ea === 'E' ? 'einnahme' : p.haushalt === 'verwaltung' ? 'laufend' : 'invest'].get(p.hhst_id))
  const k = r ? kennzahl(r, p.ea === 'E' ? 'Einnahme' : 'Ausgabe') : null
  const name = saeubere(p.grz_text ?? p.hhst_id)
  const ort = saeubere(p.glz_text ?? p.glz)
  const was = p.ea === 'E' ? 'Einnahme' : 'Ausgabe'
  nimm(
    `/posten/${p.hhst_id}`,
    k ? `${name}, ${ort}: ${fmtEur(k.wert)}` : `${name}, ${ort}`,
    k
      ? `Haushaltsstelle ${p.hhst_id} der Stadt Moosburg, ${was} im ${
          p.haushalt === 'verwaltung' ? 'Verwaltungshaushalt' : 'Vermögenshaushalt'
        }. ${k.marke}: ${fmtEur(k.wert)}.`
      : `Haushaltsstelle ${p.hhst_id} der Stadt Moosburg, ${was} ohne Ansatz in den vorliegenden Jahren.`,
    bildOderOben(`/einrichtung/${p.glz}`, `/bereich/${p.glz.slice(0, 2)}`, `/einzelplan/${p.einzelplan}`),
    null,
  )
}

// ── Schreiben ───────────────────────────────────────────────────────────────
/** Dieselbe Schale mit eigenen Metazeilen. Die App darin bleibt unveraendert. */
function html({ pfad, titel, beschreibung, bild }) {
  const url = `${SITE}${basis}${pfad.replace(/^\//, '')}`
  const voll = `${titel} · Haushalt Moosburg`
  // og:image muss absolut sein; relative Pfade ignorieren die meisten Dienste.
  const bildUrl = bild ? `${SITE}${basis}karten${bild}.png` : `${SITE}${basis}og.png`
  return schale
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(voll)}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${esc(beschreibung)}" />`)
    .replace(/<meta property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${esc(voll)}" />`)
    .replace(/<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${esc(beschreibung)}" />`)
    .replace(/<meta property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${esc(url)}" />`)
    .replace(/<meta property="og:image"[\s\S]*?\/>/, `<meta property="og:image" content="${esc(bildUrl)}" />`)
}

let htmlZahl = 0
for (const e of eintraege) {
  const datei = e.pfad === '/'
    ? path.join(ordner, 'index.html')
    : path.join(ordner, e.pfad.replace(/^\//, ''), 'index.html')
  fs.mkdirSync(path.dirname(datei), { recursive: true })
  fs.writeFileSync(datei, html(e))
  htmlZahl++
}

const aufgaben = eintraege
  .filter((e) => e.karte)
  .map((e) => ({ html: e.karte, datei: path.join(ordner, 'karten', `${e.bild.replace(/^\//, '')}.png`) }))

console.log(`${htmlZahl} HTML-Dateien geschrieben, ${aufgaben.length} Bilder zu rendern.`)
const zahl = (art) => eintraege.filter((e) => e.pfad.startsWith(art)).length
console.log(
  `  Einzelplaene ${zahl('/einzelplan/')}, Bereiche ${zahl('/bereich/')}, Einrichtungen ${zahl('/einrichtung/')}, ` +
  `Kostenbloecke ${zahl('/erkunden/querschnitte/') - 1}, Einnahmearten ${zahl('/erkunden/einnahmen/') - 1}, ` +
  `Seiten ${SEITEN.length}, Gesamtliste ${zahl('/erkunden/gesamtliste/')}, Glossar ${zahl('/glossar/')}, Posten ${zahl('/posten/')}`,
)

const start = Date.now()
const fertig = await renderePngs(aufgaben, {
  breite: BREITE,
  hoehe: HOEHE,
  dichte: 1,
  fortschritt: (n, von) => {
    if (n % 50 === 0 || n === von) process.stdout.write(`\r  ${n}/${von}`)
  },
})
process.stdout.write('\n')
console.log(`${fertig} Bilder in ${((Date.now() - start) / 1000).toFixed(0)} s -> ${path.join(ordner, 'karten')}`)
