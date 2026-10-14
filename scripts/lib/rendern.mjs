// Chromium finden und HTML-Schnipsel parallel zu PNG machen. Ohne Bezug auf
// den Haushalt, damit die Datei spaeter unveraendert in ein drittes Projekt
// wandern kann (moosburg.eu). Vorbild: pridemap/scripts/og-images.mjs.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright-core'

const SEITEN = 4 // parallele Tabs; darueber bringt mehr Parallelitaet nichts

// Was `playwright-core install chromium` ablegt, haengt vom System ab: unter
// Linux kommt nur die Headless-Shell (115 MB), lokal oft beides. Fuer einen
// Screenshot reicht die Shell, der volle Browser gewinnt nur, wenn er da ist.
const BROWSER = [
  ['chromium-', ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe', 'chrome-linux/chrome',
    'chrome-mac/Chromium.app/Contents/MacOS/Chromium']],
  ['chromium_headless_shell-', ['chrome-headless-shell-win64/chrome-headless-shell.exe',
    'chrome-win/headless_shell.exe', 'chrome-linux/headless_shell',
    'chrome-headless-shell-linux64/chrome-headless-shell',
    'chrome-mac/headless_shell', 'chrome-headless-shell-mac/chrome-headless-shell']],
]

const BINARIES = new Set([
  'chrome', 'chrome.exe', 'Chromium', 'headless_shell',
  'chrome-headless-shell', 'chrome-headless-shell.exe',
])

/** Eine Ebene unter dem Versionsordner nach dem Binary sehen. */
function suchBinary(wurzel) {
  let eintraege
  try {
    eintraege = fs.readdirSync(wurzel, { withFileTypes: true })
  } catch {
    return null
  }
  for (const e of eintraege) {
    if (!e.isDirectory()) continue
    const unter = path.join(wurzel, e.name)
    for (const datei of fs.readdirSync(unter)) {
      if (BINARIES.has(datei)) return path.join(unter, datei)
    }
  }
  return null
}

/** Das Chromium, das `playwright-core install chromium` abgelegt hat. */
export function findeChromium() {
  if (process.env.PLAYWRIGHT_CHROMIUM_PATH) return process.env.PLAYWRIGHT_CHROMIUM_PATH
  const wurzeln = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), 'AppData/Local/ms-playwright'),
    path.join(os.homedir(), '.cache/ms-playwright'),
    '/ms-playwright',
  ].filter(Boolean)
  for (const [praefix, relativ] of BROWSER) {
    for (const wurzel of wurzeln) {
      if (!fs.existsSync(wurzel)) continue
      const ordner = fs.readdirSync(wurzel).filter(d => d.startsWith(praefix)).sort().reverse()
      for (const dir of ordner) {
        for (const rel of relativ) {
          const exe = path.join(wurzel, dir, rel)
          if (fs.existsSync(exe)) return exe
        }
        // Playwright benennt den Unterordner je Version und System um. Wenn
        // keiner der bekannten Pfade passt, eine Ebene tiefer nachsehen, statt
        // am Namen zu scheitern.
        const gefunden = suchBinary(path.join(wurzel, dir))
        if (gefunden) return gefunden
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
      // Nicht `fortschritt?.(++fertig, …)`: ohne Rueckruf wertet die
      // Optional-Chain ihre Argumente nicht aus, und der Zaehler bliebe stehen.
      fertig++
      fortschritt?.(fertig, aufgaben.length)
    }
    await page.close()
  }

  await Promise.all(Array.from({ length: Math.min(SEITEN, warteschlange.length) }, arbeiter))
  await browser.close()
  return fertig
}
