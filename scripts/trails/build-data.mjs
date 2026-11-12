#!/usr/bin/env node
/**
 * Builds the Saudi Trails data files.
 *
 *   node scripts/trails/build-data.mjs           refresh Darb from its public API
 *   node scripts/trails/build-data.mjs --ksrnr   also re-download KSRNR's KML routes
 *
 * Sources: KSRNR (snapshot), Darb (live API), Asir (snapshot of the Aseer Development
 * Authority's outdoor guide). The site shows KSRNR and Asir only with ?dev=true.
 *
 * Every Trail's Shape (loop, out-and-back or one-way) is read from its Route by routeShape();
 * trail-shapes.json holds the ones set by hand, for Trails with no Route or where the line misleads.
 *
 * Outputs (both committed):
 *   src/trails/data/trails.json   every Trail, normalised and bilingual
 *   public/data/trail-routes.json     every Route, as simplified [lat, lon] lines keyed by Trail id
 *
 * KSRNR is a dated snapshot: its Trail facts live in original-snapshot.json and
 * ksrnr-meta.json, and its Routes are cached in ksrnr-routes.json so CI never calls KSRNR
 * (its server rejects cross-site requests and its terms need permission for reuse).
 * Darb is refreshed on every run. If Darb can't be reached, the previous Darb data is kept
 * and the script still exits 0, so a Darb outage never breaks a deploy.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../..')
const OUT_TRAILS = resolve(ROOT, 'src/trails/data/trails.json')
const OUT_ROUTES = resolve(ROOT, 'public/data/trail-routes.json')
const KSRNR_ROUTES = resolve(HERE, 'ksrnr-routes.json')
const DARB_API = 'https://api.darb.org/api/'
const UA = 'SaudiTrails-build (+https://naifalassaf.sa/trails)'

const readJson = async (p, fallback) => {
  try { return JSON.parse(await readFile(p, 'utf8')) } catch { return fallback }
}
const writeJson = async (p, v) => {
  await mkdir(dirname(p), { recursive: true })
  await writeFile(p, JSON.stringify(v) + '\n')
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const today = () => new Date().toISOString().slice(0, 10)

/* ---------- text normalisation ---------- */

const ascii = (s) =>
  String(s ?? '')
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/٬/g, ',')
    .trim()

/** "4,5 كم" → 4.5, "٨ كم" → 8, "-" → null */
export function parseKm(s) {
  const m = ascii(s).match(/\d+(?:[.,]\d+)?/)
  return m ? Number(m[0].replace(',', '.')) : null
}

/** "1,981 م" → 1981, "1.170 م" → 1170, "1310.6" → 1311 */
export function parseMetres(s) {
  const m = ascii(s).match(/\d+(?:[.,]\d+)*/)
  if (!m) return null
  const raw = m[0]
  const n = /[.,]\d{3}$/.test(raw) ? Number(raw.replace(/[.,]/g, '')) : Number(raw.replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n) : null
}

/** Duration in minutes as [min, max]: "2-3 س" → [120,180], "2 س 34 د" → [154,154], "ساعة" → [60,60] */
export function parseDuration(s) {
  const t = ascii(s)
  if (!t || t === '-') return null
  const hm = t.match(/(\d+(?:\.\d+)?)\s*(?:س|h)\S*\s*(\d+)\s*(?:د|m)/)
  if (hm) { const v = Math.round(Number(hm[1]) * 60 + Number(hm[2])); return [v, v] }
  const nums = (t.match(/\d+(?:\.\d+)?/g) || []).map(Number)
  if (!nums.length) return /ساع|hour/i.test(t) ? [60, 60] : null
  const unit = /دقيق|min/i.test(t) && !/س|ساع|h/i.test(t) ? 1 : 60
  const lo = Math.round(nums[0] * unit)
  const hi = Math.round((nums.length > 1 && /-|–|إلى|to/.test(t) ? nums[1] : nums[0]) * unit)
  return [Math.min(lo, hi), Math.max(lo, hi)]
}

const DIFFICULTY = { 'سهل': 'easy', 'متوسط': 'moderate', 'صعب': 'hard', easy: 'easy', moderate: 'moderate', medium: 'moderate', hard: 'hard', difficult: 'hard' }
export const parseDifficulty = (s) => DIFFICULTY[ascii(s).toLowerCase()] ?? null

const REGION_EN = {
  'الرياض': 'Riyadh', 'مكة المكرمة': 'Makkah', 'المدينة المنورة': 'Madinah', 'القصيم': 'Al-Qassim',
  'المنطقة الشرقية': 'Eastern Province', 'الشرقية': 'Eastern Province', 'عسير': 'Asir', 'تبوك': 'Tabuk',
  'حائل': 'Hail', 'الحدود الشمالية': 'Northern Borders', 'جازان': 'Jazan', 'نجران': 'Najran',
  'الباحة': 'Al-Bahah', 'الجوف': 'Al-Jawf',
}
/** Canonical Arabic region name: "منطقة الرياض" → "الرياض" */
function regionAr(s) {
  let t = String(s ?? '').trim()
  if (!t) return ''
  if (t !== 'المنطقة الشرقية') t = t.replace(/^منطقة\s+/, '')
  if (t === 'الشرقية') t = 'المنطقة الشرقية'
  if (t === 'مكة') t = 'مكة المكرمة'
  return t
}
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

/* ---------- geometry ---------- */

const R = 6371000
function metres([la1, lo1], [la2, lo2]) {
  const x = ((lo2 - lo1) * Math.PI / 180) * Math.cos(((la1 + la2) / 2) * Math.PI / 180)
  const y = (la2 - la1) * Math.PI / 180
  return Math.hypot(x, y) * R
}
function segDist(p, a, b) {
  // equirectangular projection around a, good enough at trail scale
  const k = Math.cos(a[0] * Math.PI / 180)
  const P = [(p[1] - a[1]) * k, p[0] - a[0]], B = [(b[1] - a[1]) * k, b[0] - a[0]]
  const L = B[0] ** 2 + B[1] ** 2
  const t = L ? Math.max(0, Math.min(1, (P[0] * B[0] + P[1] * B[1]) / L)) : 0
  return Math.hypot(P[0] - t * B[0], P[1] - t * B[1]) * (Math.PI / 180) * R
}
/** Douglas–Peucker, tolerance in metres; rounds to 5 decimals (~1 m). */
export function simplify(line, tol = 6) {
  if (line.length < 3) return line.map(round)
  const keep = new Uint8Array(line.length); keep[0] = keep[line.length - 1] = 1
  const stack = [[0, line.length - 1]]
  while (stack.length) {
    const [i, j] = stack.pop(); let max = 0, idx = -1
    for (let k = i + 1; k < j; k++) { const d = segDist(line[k], line[i], line[j]); if (d > max) { max = d; idx = k } }
    if (max > tol && idx > 0) { keep[idx] = 1; stack.push([i, idx], [idx, j]) }
  }
  return line.filter((_, k) => keep[k]).map(round)
}
const round = ([a, b]) => [Math.round(a * 1e5) / 1e5, Math.round(b * 1e5) / 1e5]
const lineKm = (lines) => lines.reduce((s, l) => s + l.slice(1).reduce((t, p, i) => t + metres(l[i], p), 0), 0) / 1000

/* ---------- Shape ---------- */

/** a line's points at most `step` metres apart */
function resample(line, step = 20) {
  const out = [line[0]]
  for (let i = 1; i < line.length; i++) {
    const n = Math.max(1, Math.ceil(metres(line[i - 1], line[i]) / step))
    for (let k = 1; k <= n; k++) out.push([line[i - 1][0] + (line[i][0] - line[i - 1][0]) * k / n, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * k / n])
  }
  return out
}

/**
 * A Trail's Shape from its Route, or null with no Route.
 * - Ends within 250 m (or 5% of the line) of where it began: a loop, unless the way back
 *   retraces the way out (60%+ of the return within 40 m of the outbound), then out-and-back.
 * - Ends elsewhere: one-way, unless the published length is 1.6× the drawn line or more,
 *   which means the Source drew one direction of an out-and-back.
 * The line is split at its farthest point from the start into "out" and "back".
 */
export function routeShape(lines, publishedKm) {
  const pts = (lines ?? []).flat()
  if (pts.length < 2) return null
  const drawnM = lineKm(lines) * 1000
  const closed = metres(pts[0], pts.at(-1)) <= Math.max(250, drawnM * 0.05)
  if (!closed) return publishedKm != null && publishedKm * 1000 >= drawnM * 1.6 ? 'out-and-back' : 'one-way'
  let far = 0, farM = 0
  pts.forEach((p, i) => { const d = metres(pts[0], p); if (d > farM) { farM = d; far = i } })
  const out = pts.slice(0, far + 1), back = resample(pts.slice(far))
  if (out.length < 2) return 'loop'
  const near = back.filter((p) => out.some((a, i) => i > 0 && segDist(p, out[i - 1], a) < 40)).length
  return near / back.length >= 0.6 ? 'out-and-back' : 'loop'
}

/* ---------- KSRNR ---------- */

/** Only <LineString> coordinates: the files' Point placemarks are internal signage and survey codes. */
export function kmlLines(kml) {
  const lines = []
  for (const m of kml.matchAll(/<LineString\b[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/LineString>/g)) {
    const pts = m[1].trim().split(/\s+/).map((c) => c.split(',').map(Number)).filter((c) => c.length >= 2 && c.every(Number.isFinite)).map(([lon, lat]) => [lat, lon])
    if (pts.length > 1) lines.push(pts)
  }
  return lines
}

async function ksrnr(refreshRoutes) {
  const snap = (await readJson(resolve(HERE, 'original-snapshot.json'), [])).filter((t) => t.source_en === 'KSRNR')
  const meta = await readJson(resolve(HERE, 'ksrnr-meta.json'), {})
  let routes = await readJson(KSRNR_ROUTES, {})
  if (refreshRoutes) {
    routes = {}
    for (const t of snap) {
      const id = 'ksrnr-' + t.page.match(/(\d+)$/)[1]
      const res = await fetch(t.kml, { headers: { 'User-Agent': UA } })
      const body = await res.text()
      if (!res.ok || !/<kml/i.test(body)) throw new Error(`KSRNR KML for ${t.name} failed (${res.status})`)
      routes[id] = kmlLines(body).map((l) => simplify(l))
      console.log(`  ksrnr ${id}: ${routes[id].length} line(s), ${lineKm(routes[id]).toFixed(2)} km`)
      await sleep(300)
    }
    await writeJson(KSRNR_ROUTES, routes)
  }
  const trails = snap.map((t) => {
    const ev = t.page.match(/(\d+)$/)[1]
    const id = 'ksrnr-' + ev
    const en = meta.trails?.[ev] ?? {}
    return {
      id, source: 'ksrnr',
      name: { ar: clean(t.name), en: en.name ?? null },
      nameEnOurs: false,
      region: { ar: regionAr(t.region), en: REGION_EN[regionAr(t.region)] ?? null },
      city: null,
      lengthKm: parseKm(t.length), highM: parseMetres(t.high), lowM: null, gainM: null,
      duration: parseDuration(t.hours),
      difficulty: parseDifficulty(t.difficulty),
      start: [Number(t.lat), Number(t.lon)],
      page: { ar: t.page, en: t.page.replace('/ar/', '/en/') },
      download: t.kml,
      hasRoute: Boolean(routes[id]?.length),
    }
  })
  return { trails, routes, asOf: meta.asOf ?? null }
}

/* ---------- Darb ---------- */

async function darbGet(path, lang) {
  const res = await fetch(DARB_API + path, { headers: { 'Accept-Language': lang, 'User-Agent': UA, Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Darb ${path} → ${res.status}`)
  const j = await res.json()
  if (j && j.isSuccess === false) throw new Error(`Darb ${path} → ${j.message}`)
  return j.data ?? j
}
const parsePoint = (p) => {
  try { const o = typeof p === 'string' ? JSON.parse(p) : p; const v = [Number(o.Latitude), Number(o.Longitude)]; return v.every(Number.isFinite) && v[0] ? v : null } catch { return null }
}

async function darb() {
  const snapshot = Object.fromEntries(
    (await readJson(resolve(HERE, 'original-snapshot.json'), []))
      .filter((t) => t.source_en === 'DARB')
      .map((t) => [t.page.match(/tracks\/(\d+)/)[1], t]),
  )
  const [ar, en, summaries] = [
    (await darbGet('tracks?PageNumber=1&PageSize=100', 'ar-SA')).items,
    (await darbGet('tracks?PageNumber=1&PageSize=100', 'en-US')).items,
    await darbGet('tracks/all-tracks-summaries-map', 'ar-SA'),
  ]
  if (!ar?.length) throw new Error('Darb returned no tracks')
  const ours = await readJson(resolve(HERE, 'darb-en.json'), { names: {}, cities: {} })
  const enById = Object.fromEntries(en.map((t) => [t.id, t]))
  const startById = Object.fromEntries(summaries.map((s) => [s.documentId, parsePoint(s.firstPoint)]))
  const trails = [], routes = {}
  for (const t of ar) {
    const id = 'darb-' + t.id
    const e = enById[t.id] ?? {}
    const old = snapshot[t.id] ?? {}
    let line = []
    try {
      const pts = await darbGet(`tracks/track-map-details?Id=${t.id}&Type=1`, 'ar-SA')
      line = (Array.isArray(pts) ? pts : []).map(parsePoint).filter(Boolean)
    } catch (err) { console.warn(`  darb ${id}: no route (${err.message})`) }
    await sleep(200)
    if (line.length > 1) routes[id] = [simplify(line)]
    const rAr = regionAr(t.region?.title || old.region)
    const cityAr = clean(t.city?.title || old.city)
    trails.push({
      id, source: 'darb',
      // Darb's English wins; ours fills the gaps and is flagged so the footer can say so
      name: { ar: clean(t.title), en: clean(e.title) || ours.names[t.id] || null },
      nameEnOurs: !clean(e.title) && Boolean(ours.names[t.id]),
      region: { ar: rAr, en: REGION_EN[rAr] ?? null },
      // Darb's English city titles disagree with its Arabic ones, so cities use our table
      city: cityAr ? { ar: cityAr, en: ours.cities[cityAr] ?? null } : null,
      lengthKm: parseKm(t.length) ?? parseKm(old.length),
      highM: parseMetres(t.highestElevationAboveSeaLevel) ?? parseMetres(old.high),
      lowM: parseMetres(t.minimumHeightAboveSeaLevel) ?? parseMetres(old.low),
      gainM: parseMetres(t.heightGainedOrLost) ?? parseMetres(old.gain),
      duration: parseDuration(t.duration) ?? parseDuration(old.hours),
      difficulty: parseDifficulty(t.difficulty?.title) ?? parseDifficulty(old.difficulty),
      start: startById[t.id] ?? (line[0] ? round(line[0]) : null),
      page: { ar: `https://darb.org/tracks/${t.id}/1`, en: `https://darb.org/en/tracks/${t.id}/1` },
      download: null,
      hasRoute: Boolean(routes[id]),
    })
    console.log(`  darb ${id}: ${trails.at(-1).name.ar}${routes[id] ? `, route ${lineKm(routes[id]).toFixed(2)} km` : ''}`)
  }
  return { trails, routes, asOf: today() }
}

/* ---------- Asir ---------- */

/**
 * Aseer Development Authority, Outdoor Activities Guide: a dated snapshot read from the guide
 * by hand (asir-snapshot.json), with Routes from the guide's linked KML files (asir-routes.json).
 * The snapshot carries working fields (end, oneWay, routeFrom, note) that the site doesn't use.
 */
async function asir() {
  const snap = await readJson(resolve(HERE, 'asir-snapshot.json'), { asOf: null, trails: [] })
  const routes = await readJson(resolve(HERE, 'asir-routes.json'), {})
  const trails = snap.trails.map(({ end, oneWay, routeFrom, note, ...t }) => ({ ...t, hasRoute: Boolean(routes[t.id]?.length) }))
  return { trails, routes, asOf: snap.asOf }
}

/* ---------- main ---------- */

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {

const prevTrails = await readJson(OUT_TRAILS, { sources: {}, trails: [] })
const prevRoutes = await readJson(OUT_ROUTES, {})

console.log('KSRNR (snapshot)')
const k = await ksrnr(process.argv.includes('--ksrnr'))

console.log('Asir (snapshot)')
const a = await asir()

console.log('Darb (live API)')
let d
try {
  d = await darb()
} catch (err) {
  console.warn(`::warning::Darb refresh failed, keeping previous Darb data: ${err.message}`)
  d = {
    trails: prevTrails.trails.filter((t) => t.source === 'darb'),
    routes: Object.fromEntries(Object.entries(prevRoutes).filter(([id]) => id.startsWith('darb-'))),
    asOf: prevTrails.sources?.darb?.asOf ?? null,
  }
}

// Darb trails its API doesn't carry yet, kept by hand (darb-extra.json); they replace any copy carried over above
const x = await readJson(resolve(HERE, 'darb-extra.json'), { trails: [], routes: {} })
const extraIds = new Set(x.trails.map((t) => t.id))
d.trails = [...d.trails.filter((t) => !extraIds.has(t.id)), ...x.trails.map((t) => ({ ...t, hasRoute: Boolean(x.routes[t.id]?.length) }))]
d.routes = { ...d.routes, ...x.routes }
if (x.trails.length) console.log(`Darb extras (by hand): ${x.trails.length}`)

const allRoutes = { ...k.routes, ...d.routes, ...a.routes }

// Shape: set by hand wins, then the Route's; null when neither knows
const byHand = (await readJson(resolve(HERE, 'trail-shapes.json'), { shapes: {} })).shapes
const trails = [...k.trails, ...d.trails, ...a.trails].map((t) => ({ ...t, shape: byHand[t.id]?.shape ?? routeShape(allRoutes[t.id], t.lengthKm) }))
const unknown = trails.filter((t) => !t.shape).map((t) => t.id)
if (unknown.length) console.warn(`::warning::No shape for ${unknown.join(', ')}: add them to scripts/trails/trail-shapes.json`)

await writeJson(OUT_TRAILS, {
  sources: { ksrnr: { asOf: k.asOf }, darb: { asOf: d.asOf }, asir: { asOf: a.asOf } },
  trails,
})
await writeJson(OUT_ROUTES, allRoutes)
console.log(`Wrote ${trails.length} trails, ${Object.keys(allRoutes).length} routes`)
}
