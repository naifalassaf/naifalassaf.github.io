/**
 * Prints a page to PDF with an installed Chrome. Shared by the build step (build-pdf.mjs)
 * and the dev server (vite.config.ts), so both produce the same file.
 * Set CHROME_PATH to override the search below.
 */
import { existsSync } from 'node:fs'
import puppeteer from 'puppeteer-core'

const CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

export function findChrome() {
  const chrome = CANDIDATES.find((p) => existsSync(p))
  if (!chrome) throw new Error(`No Chrome found (tried: ${CANDIDATES.join(', ')}). Set CHROME_PATH.`)
  return chrome
}

/** @returns {Promise<Uint8Array>} the PDF bytes */
export async function printPdf(url) {
  const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle0' })
    await page.evaluate(() => document.fonts.ready)
    return await page.pdf({ preferCSSPageSize: true, printBackground: true })
  } finally {
    await browser.close()
  }
}
