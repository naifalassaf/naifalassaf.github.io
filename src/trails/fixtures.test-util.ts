import type { Trail } from './types'

/** a Trail with sensible defaults; override what a test cares about */
export function trail(id: string, over: Partial<Trail> = {}): Trail {
  return {
    id,
    source: 'darb',
    name: { ar: `مسار ${id}`, en: `Trail ${id}` },
    nameEnOurs: false,
    region: { ar: 'الرياض', en: 'Riyadh' },
    city: null,
    lengthKm: 5,
    highM: 900,
    lowM: null,
    gainM: null,
    duration: [120, 120],
    difficulty: 'easy',
    shape: 'loop',
    start: [24.7, 46.6],
    page: { ar: `https://darb.org/tracks/${id}/1`, en: `https://darb.org/en/tracks/${id}/1` },
    download: null,
    hasRoute: false,
    ...over,
  }
}

/** a stand-in for i18next: shows the language and key, so tests can see both */
export const t = (k: string, l: string) => `${l}:${k}`
