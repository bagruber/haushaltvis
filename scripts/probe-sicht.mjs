// Wegwerf-Sichtprüfung: ruft Seiten im echten Browser auf und legt
// Screenshots unter probe-sicht/ ab. Nicht Teil des Builds.
import fs from 'node:fs'
import { chromium } from 'playwright-core'
import { findeChromium } from './lib/rendern.mjs'

const BASIS = process.argv[2] || 'http://localhost:4173/haushaltvis'
const NUR = process.argv[3]
const AUS = 'probe-sicht'
fs.mkdirSync(AUS, { recursive: true })

const SEITEN = [
  ['einzelplan-5', '/einzelplan/5'],
  ['einrichtung-freibad', '/einrichtung/5701'],
  ['posten-edv', '/posten/0301.6322'],
  ['querschnitte', '/erkunden/querschnitte'],
  ['einnahmen', '/erkunden/einnahmen'],
  ['gesamtliste', '/gesamtliste'],
]

const browser = await chromium.launch({ executablePath: findeChromium(), headless: true })
const befunde = []

for (const [breit, groesse] of [['desktop', { width: 1280, height: 1100 }], ['mobil', { width: 375, height: 800 }]]) {
  const ctx = await browser.newContext({ viewport: groesse, deviceScaleFactor: 1 })
  const page = await ctx.newPage()
  const fehler = []
  page.on('pageerror', (e) => fehler.push(String(e)))
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) fehler.push(m.text()) })

  for (const [name, pfad] of SEITEN) {
    if (NUR && name !== NUR) continue
    await page.goto(`${BASIS}${pfad}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    const legenden = await page.locator('button[aria-pressed]').allTextContents()
    const schalter = await page.locator('input[type=checkbox]').evaluateAll(
      (els) => els.map((e) => e.nextElementSibling?.textContent?.trim()),
    )
    befunde.push({ breit, name, legenden: legenden.slice(0, 8), schalter })
    await page.screenshot({ path: `${AUS}/${breit}-${name}.png`, fullPage: false })
  }
  befunde.push({ breit, name: 'fehler', fehler })
  await ctx.close()
}

await browser.close()
fs.writeFileSync(`${AUS}/befunde.json`, JSON.stringify(befunde, null, 1), 'utf8')
console.log(JSON.stringify(befunde, null, 1))
