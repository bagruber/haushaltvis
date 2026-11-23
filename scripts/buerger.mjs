// Die Bürgerversion aus einem fertigen Build schneiden.
//
//   node scripts/buerger.mjs <ordner>            schneiden, dann prüfen
//   node scripts/buerger.mjs <ordner> --pruefen  nur prüfen (nach den Karten)
//
// Läuft nach `vite build` mit VITE_VARIANTE=buerger. Die App lässt nur weg,
// was ohne diese Daten leer bliebe (src/lib/variante.ts); dass sie gar nicht
// erst ausgeliefert werden, regelt dieser Schritt. Öffentlich ist nur
// Beschlossenes: kein Entwurf und kein Finanzplan, keine unterjährigen
// Zwischenstände, vom Wortlaut der Erläuterungen nur die daraus abgeleiteten
// Suchwörter.
//
// Die Prüfung vergleicht mit den vollen Daten in public/data und bricht ab,
// sobald irgendwo im Ordner etwas davon steht, auch in den Vorschaukarten.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ordner = process.argv[2]
const nurPruefen = process.argv.includes('--pruefen')
if (!ordner) {
  console.error('Aufruf: node scripts/buerger.mjs <ordner> [--pruefen]')
  process.exit(1)
}
const daten = path.join(ordner, 'data')
const quelle = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data')
const lies = (datei) => JSON.parse(fs.readFileSync(datei, 'utf8'))
const schreib = (name, wert) => fs.writeFileSync(path.join(daten, name), JSON.stringify(wert))

const budget = lies(path.join(daten, 'budget.json'))
const jahre = new Set(budget.meta.years.map(String))
const stellen = budget.posten

// ── Schneiden ────────────────────────────────────────────────────────────────
if (!nurPruefen) {
  for (const name of ['data/entwurf.json', 'data/zwischenstand.json', '404.html']) {
    fs.rmSync(path.join(ordner, name), { force: true })
  }

  // Nur die Suchwörter, und nur für Stellen, die es im beschlossenen Haushalt gibt.
  const erl = lies(path.join(daten, 'erlaeuterungen.json'))
  schreib('erlaeuterungen.json', {
    jahr: erl.jahr,
    stellen: Object.fromEntries(
      Object.entries(erl.stellen)
        .filter(([h, s]) => stellen[h] && s.such?.length)
        .map(([h, s]) => [h, { such: s.such }]),
    ),
  })

  // Vorberechnete Reihen reichen bis ins Entwurfsjahr.
  const agg = lies(path.join(daten, 'aggregatoren.json'))
  for (const a of Object.values(agg)) {
    a.reihe = Object.fromEntries(Object.entries(a.reihe ?? {}).filter(([j]) => jahre.has(j)))
    a.hhst = (a.hhst ?? []).filter((h) => stellen[h])
  }
  schreib('aggregatoren.json', agg)

  // Themen kennen auch die Stellen, die erst der Entwurf hat.
  const themes = lies(path.join(daten, 'themes.json'))
  themes.assignment = Object.fromEntries(Object.entries(themes.assignment ?? {}).filter(([h]) => stellen[h]))
  schreib('themes.json', themes)

  // Erklärt etwas, das es hier nicht gibt.
  const glossar = lies(path.join(daten, 'glossar.json'))
  delete glossar.zwischenstand
  schreib('glossar.json', glossar)
}

// ── Prüfen ───────────────────────────────────────────────────────────────────
const fehler = []
const ERLAUBT = new Set([
  'budget.json', 'themes.json', 'events.json', 'labels.json', 'context.json', 'einleitungen.json',
  'glossar.json', 'aggregatoren.json', 'zuordnung.json', 'erlaeuterungen.json',
])
for (const name of fs.readdirSync(daten)) {
  if (!ERLAUBT.has(name)) fehler.push(`data/${name} ist nicht für die Bürgerversion freigegeben`)
}
if (fs.existsSync(path.join(ordner, '404.html'))) fehler.push('404.html ist noch da')
if (budget.meta.entwurf) fehler.push('budget.json trägt einen Entwurf')
const neuestes = Math.max(...budget.meta.years)
if (budget.facts.some((f) => f.year === neuestes && f.ergebnis != null)) {
  fehler.push(`budget.json hat ein Ist für ${neuestes}, das Jahr läuft noch`)
}
for (const [h, s] of Object.entries(lies(path.join(daten, 'erlaeuterungen.json')).stellen)) {
  if (Object.keys(s).some((k) => k !== 'such')) fehler.push(`erlaeuterungen.json: ${h} trägt mehr als Suchwörter`)
}
for (const [k, a] of Object.entries(lies(path.join(daten, 'aggregatoren.json')))) {
  const fremd = Object.keys(a.reihe ?? {}).filter((j) => !jahre.has(j))
  if (fremd.length) fehler.push(`aggregatoren.json: ${k} reicht bis ${fremd.join(', ')}`)
}
if (lies(path.join(daten, 'glossar.json')).zwischenstand) fehler.push('glossar.json erklärt den Zwischenstand')

// Nirgends im Ordner darf der Wortlaut einer Erläuterung stehen oder eine
// Stelle, die erst der Entwurf kennt. Nicht gezählt werden Texte, die ohnehin
// im beschlossenen Haushalt stehen (etwa als Kontotext), kurze
// Allerweltswörter und Erläuterungen aus einem einzigen Wort, das zugleich
// Suchwort der Stelle ist: die Suchwörter sind freigegeben.
const beschlossenerText = JSON.stringify(budget)
const verboten = []
for (const s of Object.values(lies(path.join(quelle, 'erlaeuterungen.json')).stellen)) {
  for (const t of s.text ?? []) {
    if (t.length >= 20 && !beschlossenerText.includes(t) && !s.such?.includes(t)) verboten.push(t)
  }
}
const entwurf = fs.existsSync(path.join(quelle, 'entwurf.json')) ? lies(path.join(quelle, 'entwurf.json')) : null
for (const h of Object.keys(entwurf?.posten ?? {})) if (!stellen[h]) verboten.push(h)

const dateien = []
const sammle = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) sammle(p)
    else if (/\.(html|js|json|css|txt|xml)$/.test(e.name)) dateien.push(p)
  }
}
sammle(ordner)
for (const datei of dateien) {
  const inhalt = fs.readFileSync(datei, 'utf8')
  const treffer = verboten.find((v) => inhalt.includes(v))
  if (treffer) fehler.push(`${path.relative(ordner, datei)} enthält „${treffer.slice(0, 60)}“`)
}

if (fehler.length) {
  console.error(`Bürgerversion nicht freigabefähig, ${fehler.length} Befund(e):`)
  for (const f of fehler.slice(0, 40)) console.error(`  - ${f}`)
  process.exit(1)
}
console.log(
  `Bürgerversion geprüft: ${dateien.length} Dateien, ${verboten.length} gesperrte Texte und Stellen, ` +
    `Jahre ${budget.meta.years[0]} bis ${neuestes}, keine Funde.`,
)
