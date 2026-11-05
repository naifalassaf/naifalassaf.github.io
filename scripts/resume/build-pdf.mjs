#!/usr/bin/env node
/**
 * Prints the built /resume page to dist/Naif-Alassaf-Resume.pdf, so the PDF always matches
 * src/data/resume.json. Runs after `vite build` (see the "build" script).
 * In development the dev server makes the same PDF on request (see vite.config.ts).
 */
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'
import { printPdf } from './print.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = resolve(ROOT, 'dist/Naif-Alassaf-Resume.pdf')
// the old link, kept working for anyone who saved it
const LEGACY = resolve(ROOT, 'dist/resume - Naif Alassaf.pdf')

const server = await preview({ root: ROOT, preview: { port: 4179, strictPort: false }, logLevel: 'warn' })
try {
  const url = server.resolvedUrls.local[0].replace(/\/$/, '') + '/resume.html'
  const pdf = await printPdf(url)
  writeFileSync(OUT, pdf)
  writeFileSync(LEGACY, pdf)
  console.log(`Resume PDF → ${OUT}`)
} finally {
  await new Promise((r) => server.httpServer.close(r))
}
