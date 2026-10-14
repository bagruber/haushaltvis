// Chromium finden und HTML-Schnipsel parallel zu PNG machen. Ohne Bezug auf
// den Haushalt, damit die Datei spaeter unveraendert in ein drittes Projekt
// wandern kann (moosburg.eu). Vorbild: pridemap/scripts/og-images.mjs.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const SEITEN = 4 // parallele Tabs; darueber bringt mehr Parallelitaet nichts

/** Das Chromium, das `playwright-core install chromium` abgelegt hat. */
export function findeChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH
  const wurzeln = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), 'AppData/Local/ms-playwright'),
    path.join(os.homedir(), '.cache/ms-playwright'),
    '/ms-playwright',
  ].filter(Boolean)
  const relativ = [
    'chrome-win64/chrome.exe', 'chrome-win/chrome.exe',
    'chrome-linux/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
  ]
  for (const wurzel of wurzeln) {
    if (!fs.existsSync(wurzel)) continue
    const ordner = fs.readdirSync(wurzel).filter(d => d.startsWith('chromium-')).sort().reverse()
    for (const dir of ordner) {
      for (const rel of relativ) {
        const exe = path.join(wurzel, dir, rel)
        if (fs.existsSync(exe)) return exe
      }
    }
  }
  return null
}

/**
 * Jede Aufgabe ist { html, datei }. Gerendert wird in `breite` x `hoehe` CSS-
 * Pixeln bei doppelter Dichte, also doppelt so gross als PNG.
 *
 * Vor dem Schuss wird auf die Schriften gewartet: Canvas und Layout greifen
 * sonst auf die Systemschrift zurueck, und zwar endgueltig.
 */
export async function renderePngs(aufgaben, { breite, hoehe, dichte = 2, fortschritt } = {}) {
  if (!aufgaben.length) return 0
  const exe = findeChromium()
  if (!exe) {
    console.error('Chromium nicht gefunden. Einmal installieren mit:')
    console.error('  pnpm exec playwright-core install chromium')
    console.error('oder PLAYWRIGHT_CHROMIUM_PATH auf ein vorhandenes Binary zeigen lassen.')
    process.exit(1)
  }

  const browser = await chromium.launch({ executablePath: exe, headless: true })
  const ctx = await browser.newContext({
    viewport: { width: breite, height: hoehe },
    deviceScaleFactor: dichte,
  })

  let fertig = 0
  const warteschlange = [...aufgaben]
  const arbeiter = async () => {
    const page = await ctx.newPage()
    while (warteschlange.length) {
      const { html, datei } = warteschlange.shift()
      try {
        await page.setContent(html, { waitUntil: 'load' })
        await page.evaluate(() => document.fonts.ready)
        fs.mkdirSync(path.dirname(datei), { recursive: true })
        await page.screenshot({ path: datei })
      } catch (err) {
        console.warn(`  ! ${path.basename(datei)}: ${err.message}`)
      }
      fortschritt?.(++fertig, aufgaben.length)
    }
    await page.close()
  }

  await Promise.all(Array.from({ length: Math.min(SEITEN, warteschlange.length) }, arbeiter))
  await browser.close()
  return fertig
}
