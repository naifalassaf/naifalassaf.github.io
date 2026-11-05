#!/usr/bin/env node
/**
 * Prints the built /resume page to dist/Naif-Alassaf-Resume.pdf, so the PDF always matches
 * src/data/resume.json. Runs after `vite build` (see the "build" script).
 *
 * Uses an installed Chrome (GitHub's Ubuntu runners have one) instead of downloading one:
 * set CHROME_PATH to override the search below.
 */
import { existsSync, copyFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import puppeteer from 'puppeteer-core'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = resolve(ROOT, 'dist/Naif-Alassaf-Resume.pdf')
// the old link, kept working for anyone who saved it
const LEGACY = resolve(ROOT, 'dist/resume - Naif Alassaf.pdf')

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)
const chrome = CANDIDATES.find((p) => existsSync(p))
if (!chrome) {
  console.error(`No Chrome found (tried: ${CANDIDATES.join(', ')}). Set CHROME_PATH.`)
  process.exit(1)
}

const server = await preview({ root: ROOT, preview: { port: 4179, strictPort: false }, logLevel: 'warn' })
const url = server.resolvedUrls.local[0].replace(/\/$/, '') + '/resume.html'
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage()
  await page.goto(url, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  await page.pdf({ path: OUT, preferCSSPageSize: true, printBackground: true })
  copyFileSync(OUT, LEGACY)
  console.log(`Resume PDF → ${OUT}`)
} finally {
  await browser.close()
  await new Promise((r) => server.httpServer.close(r))
}
