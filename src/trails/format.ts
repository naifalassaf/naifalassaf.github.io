import type { Bilingual, Difficulty, Lang, Trail } from './types'

/** Western digits in both languages, as the Sources publish them. */
const nf = (lang: Lang, max = 2) =>
  new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { maximumFractionDigits: max })

export const num = (lang: Lang, n: number, max = 2) => nf(lang, max).format(n)

/** English if there is one, Arabic otherwise. */
export const pick = (b: Bilingual | null, lang: Lang) => (b ? (lang === 'en' && b.en ? b.en : b.ar) : '')

/** [154,154] → "2 h 34 min"; [120,180] → "2–3 h" */
export function duration([lo, hi]: [number, number], lang: Lang, u: { h: string; min: string }) {
  const one = (m: number) => {
    const h = Math.floor(m / 60)
    const r = m % 60
    if (!h) return `${num(lang, r)} ${u.min}`
    return r ? `${num(lang, h)} ${u.h} ${num(lang, r)} ${u.min}` : `${num(lang, h)} ${u.h}`
  }
  if (lo === hi) return one(lo)
  return `${num(lang, lo / 60, 1)}–${num(lang, hi / 60, 1)} ${u.h}`
}

const RANK: Record<Difficulty, number> = { easy: 1, moderate: 2, hard: 3 }
export const difficultyRank = (t: Trail) => (t.difficulty ? RANK[t.difficulty] : 4)

/** Loose Arabic/Latin matching: drops diacritics and folds alef, ta marbuta and ya forms. */
export function fold(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ٰٟ̀-ͯـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[-_'’]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const haystack = (t: Trail) =>
  fold([t.name.ar, t.name.en, t.region.ar, t.region.en, t.city?.ar, t.city?.en].filter(Boolean).join(' '))
