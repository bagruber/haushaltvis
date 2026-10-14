// Die Vorschaukarte als HTML, nach den freigegebenen Entwuerfen in
// docs/vorschaukarten/. Drei Vorlagen: Haushaltsebene, Querschnitt (dieselbe
// mit Kostenblock-Icon und optionaler Notiz) und Seite.
//
// Schriften, Rose und Rathaus-Skizze stecken als data:-URI drin: die Seite
// wird mit page.setContent() gesetzt und hat keine Herkunft, von der aus
// file://-Adressen laden duerfen.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as Phosphor from '@phosphor-icons/react'
import { KLECKS_PFAD, KLECKS_DREHUNG, kategorieTon, PLAN_COLOR } from '../../src/lib/marke.mjs'

const WURZEL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const P = (...t) => path.join(WURZEL, ...t)

export const BREITE = 1200
export const HOEHE = 630

// Tokens aus moosburg-design, hier als Werte: das Skript laedt kein CSS.
const CREME = '#faf7f2'
const TINTE = '#1c1c1c'
const GEDAEMPFT = '#6f6b63'
const LEISE = '#555555'
const LINIE = '#e4e0d7'
const ROT = '#a50d24'
const SKIZZE = '#e3d8c2'
const REGENBOGEN = ['#e91e8c', '#e5202e', '#f4830a', '#f5d400', '#0a9e4c', '#009ac7', '#3b3f9a', '#8b4a2a', '#1a1a1a']

const b64 = (datei) => fs.readFileSync(datei).toString('base64')

const SCHRIFTEN = `
@font-face{font-family:'Source Serif 4 Variable';font-style:normal;font-weight:200 900;font-display:block;
  src:url(data:font/woff2;base64,${b64(P('node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-opsz-normal.woff2'))}) format('woff2-variations')}
@font-face{font-family:'Atkinson Hyperlegible Next Variable';font-style:normal;font-weight:200 800;font-display:block;
  src:url(data:font/woff2;base64,${b64(P('node_modules/@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2'))}) format('woff2-variations')}
@font-face{font-family:'Madelon Script';font-style:normal;font-weight:400;font-display:block;
  src:url(data:font/otf;base64,${b64(P('src/assets/fonts/MadelonScript.otf'))}) format('opentype')}`

const SERIF = "'Source Serif 4 Variable', Georgia, serif"
const SANS = "'Atkinson Hyperlegible Next Variable', sans-serif"
const SKRIPT = "'Madelon Script', cursive"

/** Zeichnung aus public/ als Maske, damit sie einen Token-Ton annimmt. */
function maske(datei, farbe, stil) {
  const url = `url(data:image/svg+xml;base64,${b64(P('public', datei))})`
  return `background:${farbe};-webkit-mask:${url} no-repeat center/contain;mask:${url} no-repeat center/contain;${stil}`
}

export const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Ein Phosphor-Icon als SVG. Die Farbe kommt wie in der App von currentColor. */
function icon(name, groesse) {
  const Komponente = Phosphor[name]
  if (!Komponente) throw new Error(`Unbekanntes Icon: ${name}`)
  return renderToStaticMarkup(createElement(Komponente, { size: groesse, color: 'currentColor' }))
}

/** Farbklecks mit dem Icon darauf, wie <Klecks> in der App. */
function klecks(farbe, iconName, variante = 0) {
  const ton = kategorieTon(farbe)
  const drehung = KLECKS_DREHUNG[variante % 3]
  return `<span style="position:relative;display:inline-grid;place-items:center;width:68px;height:68px;color:${ton.text}">
    <svg viewBox="0 0 48 48" style="position:absolute;inset:0;width:100%;height:100%${drehung ? `;transform:${drehung}` : ''}"><path d="${KLECKS_PFAD}" fill="${ton.flaeche}"/></svg>
    <span style="position:relative;display:grid;place-items:center">${icon(iconName, 32)}</span>
  </span>`
}

const streifen = () =>
  `<div style="display:flex;height:10px">${REGENBOGEN.map((c) => `<span style="flex:1;background:${c}"></span>`).join('')}</div>`

const fussleiste = (adresse) => `
  <div style="position:absolute;left:0;right:0;bottom:0;height:84px;border-top:2px solid ${LINIE};background:${CREME};
       padding:0 80px;display:flex;align-items:center;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:14px">
      <span style="${maske('rose.svg', ROT, 'width:36px;height:36px;display:inline-block')}"></span>
      <span style="font-family:${SERIF};font-weight:700;font-size:30px"><span style="color:${ROT}">Haushalt</span> Moosburg</span>
    </div>
    <span style="font-size:22px;color:${GEDAEMPFT}">${esc(adresse)}</span>
  </div>`

/** Die Nummer mit gedaempftem "xx" fuer die Stellen, die die Ebene offen laesst. */
function nummergeruest(nummer) {
  const offen = nummer.endsWith('xx')
  return offen
    ? `${esc(nummer.slice(0, -2))}<span style="color:#a8a297;font-weight:400">xx</span>`
    : esc(nummer)
}

/**
 * Titelgroesse nach Laenge, mit Trennung: deutsche Komposita sind laenger als
 * die Spalte breit ist, und ohne `hyphens` kappt der Browser mitten im Wort.
 * Was auch dann nicht passt, endet in Auslassungspunkten — ein AKDB-Langtext
 * darf die Karte nicht auffressen.
 */
function titelStil(titel) {
  const n = titel.length
  const groesse = n <= 14 ? 104 : n <= 22 ? 88 : n <= 34 ? 72 : 60
  const zeilen = groesse <= 60 ? 3 : 2
  return `font-family:${SERIF};font-weight:700;font-size:${groesse}px;line-height:${groesse >= 88 ? 1 : 1.06};
    letter-spacing:-0.01em;margin:0;hyphens:auto;overflow-wrap:break-word;
    display:-webkit-box;-webkit-line-clamp:${zeilen};-webkit-box-orient:vertical;overflow:hidden`
}

/**
 * Die Reihe rechts: Ist bis zum letzten Rechnungsjahr als Linie in der Farbe
 * der Ebene, der Plan des laufenden Jahres als hohler Kreis. Dieselbe
 * Grammatik wie in der App — voll ist Vollzug, hohl ist Absicht.
 */
function reihe(werte, farbe, notiz) {
  const zahlen = [...werte.ist.filter((v) => v != null), werte.plan].filter((v) => v != null)
  if (zahlen.length < 2) return ''
  const max = Math.max(...zahlen, 0)
  const min = Math.min(...zahlen, 0)
  const spanne = max - min || 1
  const x = (i) => 20 + (i * 360) / Math.max(1, werte.jahre.length - 1)
  // Mit Notiz bleibt oben Platz fuer den Zettel, sonst nimmt die Linie die
  // ganze Hoehe. Dasselbe tut in der App der Gitter-Rand von 56 px.
  const oben = notiz ? 86 : 20
  const y = (v) => 240 - ((v - min) / spanne) * (240 - oben)
  const punkte = werte.ist
    .map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
    .filter(Boolean)
    .join(' ')
  const letzterIst = werte.ist.reduce((acc, v, i) => (v == null ? acc : i), -1)
  const planX = x(werte.planIndex ?? werte.jahre.length - 1)

  // Notiz nur, wo die App an dieser Stelle auch eine hat (Strom: Gaskrise).
  // Der Zettel steht im freien Rand ueber der Grafik, der Bogen zeigt von dort
  // auf den Punkt — wie die Notiz im Diagramm der App (lib/notiz.ts).
  const zettel = notiz
    ? (() => {
        const px = x(notiz.index)
        const py = y(notiz.wert)
        const tx = Math.min(Math.max(px - 70, 70), 330)
        return `<text x="${tx}" y="44" font-size="40" fill="${notiz.farbe}"
           font-family="Madelon Script, cursive" text-anchor="middle" transform="rotate(-3 ${tx} 44)">${esc(notiz.text)}</text>
         <path d="M${tx + 20} 58 Q ${tx + 10} ${(58 + py) / 2} ${px} ${py - 14}"
           fill="none" stroke="${notiz.pfeil}" stroke-width="2.2" stroke-linecap="round" fill-opacity="0"/>
         <path d="M${px - 7} ${py - 22} L ${px} ${py - 13} L ${px - 11} ${py - 11}"
           fill="none" stroke="${notiz.pfeil}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`
      })()
    : ''

  return `<div style="position:absolute;right:72px;top:150px;width:400px">
    <svg width="400" height="270" viewBox="0 0 400 270">
      <line x1="10" y1="240" x2="392" y2="240" stroke="${LINIE}" stroke-width="2"/>
      <polyline points="${punkte}" fill="none" stroke="${farbe}" stroke-width="4.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${letzterIst >= 0 ? `<circle cx="${x(letzterIst).toFixed(1)}" cy="${y(werte.ist[letzterIst]).toFixed(1)}" r="6.5" fill="${farbe}"/>` : ''}
      ${werte.plan != null ? `<circle cx="${planX.toFixed(1)}" cy="${y(werte.plan).toFixed(1)}" r="7" fill="${CREME}" stroke="${PLAN_COLOR}" stroke-width="3"/>` : ''}
      ${zettel}
      <text x="20" y="266" font-size="19" fill="${GEDAEMPFT}" font-family="${SANS}" text-anchor="middle">${werte.jahre[0]}</text>
      <text x="380" y="266" font-size="19" fill="${GEDAEMPFT}" font-family="${SANS}" text-anchor="middle">${werte.jahre[werte.jahre.length - 1]}</text>
    </svg>
    <div style="display:flex;gap:22px;margin-top:8px;font-size:19px;color:${GEDAEMPFT}">
      <span style="display:inline-flex;align-items:center;gap:8px"><span style="width:26px;height:4px;border-radius:2px;background:${farbe}"></span>Ist</span>
      <span style="display:inline-flex;align-items:center;gap:8px"><span style="width:12px;height:12px;border-radius:50%;border:3px solid ${PLAN_COLOR};box-sizing:border-box"></span>Plan</span>
    </div>
  </div>`
}

const rahmen = (inhalt) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
${SCHRIFTEN}
*{box-sizing:border-box}
html,body{margin:0;width:${BREITE}px;height:${HOEHE}px;overflow:hidden}
body{background:${CREME};color:${TINTE};font-family:${SANS};-webkit-font-smoothing:antialiased}
</style></head><body><div style="position:relative;width:${BREITE}px;height:${HOEHE}px;overflow:hidden">${inhalt}</div></body></html>`

/**
 * Haushaltsebene und Querschnitt: links Klecks, Ebene, Nummer, Titel und eine
 * Zahl, rechts die Reihe. Jede Zahl traegt ihr Jahr — wird `data/` einmal ohne
 * neuen Build getauscht, ist die Karte veraltet, aber nicht falsch.
 */
export function karteEbene({ ebene, nummer, oberzeile, titel, farbe, iconName, variante, wert, wertZeile, werte, notiz, adresse }) {
  return rahmen(`
  ${streifen()}
  <div style="position:absolute;left:80px;top:70px;width:${werte ? 600 : 1040}px;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:18px">
      ${klecks(farbe, iconName, variante)}
      <div style="display:flex;flex-direction:column;gap:2px">
        <span style="font-size:25px;font-weight:600;color:${LEISE};font-variant-numeric:tabular-nums">${ebene}${
          nummer ? ` ${nummergeruest(nummer)}` : ''
        }</span>
        <span style="font-size:22px;color:${GEDAEMPFT}">${esc(oberzeile)}</span>
      </div>
    </div>
    <h1 style="${titelStil(titel)};margin-top:40px">${esc(titel)}</h1>
    <div style="margin-top:38px;font-family:${SERIF};font-weight:600;font-size:66px;line-height:1;
         font-variant-numeric:lining-nums tabular-nums">${esc(wert)}</div>
    <div style="margin-top:12px;font-size:24px;color:${GEDAEMPFT}">${esc(wertZeile)}</div>
  </div>
  ${werte ? reihe(werte, farbe, notiz) : ''}
  ${fussleiste(adresse)}`)
}

/** Seite: kein Zahlenteil, stattdessen ein Satz und die Rathaus-Skizze. */
export function karteSeite({ art, iconName, titel, satz, adresse }) {
  return rahmen(`
  ${streifen()}
  <div style="position:absolute;right:-60px;bottom:84px;width:629px;height:500px;
       ${maske('sketches/rathausB.svg', SKIZZE, '')}"></div>
  <div style="position:absolute;left:80px;top:70px;width:640px;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:16px;color:${GEDAEMPFT}">
      <span style="display:grid;place-items:center">${icon(iconName, 34)}</span>
      <span style="font-size:25px;font-weight:600">${esc(art)}</span>
    </div>
    <h1 style="${titelStil(titel)};margin-top:40px">${esc(titel)}</h1>
    <p style="margin:36px 0 0;font-size:32px;line-height:1.4;color:${LEISE};max-width:600px">${esc(satz)}</p>
  </div>
  ${fussleiste(adresse)}`)
}
