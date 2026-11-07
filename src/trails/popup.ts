import type { Lang, Trail } from './types'
import { duration, esc, num, pick } from './format'

/**
 * The HTML inside a Start point's popup: name, Source and place, stats, difficulty,
 * coordinates, and links to the Source's page and Google Maps. Every piece of Trail text
 * is escaped. Only call it for a Trail with a Start point.
 */
export function popupHtml(tr: Trail, lang: Lang, t: (key: string) => string): string {
  const place = [t(`source.${tr.source}`), pick(tr.region, lang), pick(tr.city, lang)].filter(Boolean).map(esc).join(' · ')
  const stats = [
    tr.lengthKm != null && `${num(lang, tr.lengthKm)} ${t('unit.km')}`,
    tr.highM != null && `${t('stat.high')} ${num(lang, tr.highM, 0)} ${t('unit.m')}`,
    tr.duration && duration(tr.duration, lang, { h: t('unit.h'), min: t('unit.min') }),
  ]
    .filter(Boolean)
    .map((s) => esc(String(s)))
    .join(' · ')
  const [la, lo] = tr.start!
  return (
    `<div dir="${lang === 'ar' ? 'rtl' : 'ltr'}">` +
    `<span class="pt">${esc(pick(tr.name, lang))}</span>` +
    `<span class="pm">${place}</span><br>` +
    `<span class="pm">${stats}</span>` +
    (tr.difficulty ? ` <span class="pill ${tr.difficulty}">${esc(t(`difficulty.${tr.difficulty}`))}</span>` : '') +
    `<br><span class="pm coords">${la.toFixed(5)}, ${lo.toFixed(5)}</span><br>` +
    `<a href="${esc(tr.page[lang])}" target="_blank" rel="noopener">${esc(t(`link.${tr.pageOf ?? tr.source}`))}</a>` +
    ` · <a href="https://www.google.com/maps/search/?api=1&query=${la},${lo}" target="_blank" rel="noopener">${esc(t('link.gmaps'))}</a>` +
    `</div>`
  )
}
