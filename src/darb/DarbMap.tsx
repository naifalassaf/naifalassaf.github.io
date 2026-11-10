import TrailMap from '../trails/TrailMap'
import type { MyLocation } from '../trails/useMyLocation'
import type { Lang, Routes, Trail } from '../trails/types'
import { duration, esc, num, pick } from '../trails/format'
import { STRINGS } from './strings'
import { Req } from './ui'

/** Routes in Darb's teal; the selected one in the orange of the logo's road */
const DARB_ROUTES = {
  route: { color: '#004053', weight: 3, opacity: 0.8 },
  selected: { color: '#f47b3d', weight: 5, opacity: 1 },
}

/** A Start point's popup, linking to the mockup's own trail page instead of the Source's. */
export function darbPopup(tr: Trail, lang: Lang): string {
  const s = STRINGS[lang]
  const place = [pick(tr.city, lang), pick(tr.region, lang)].filter((x, i, a) => x && a.indexOf(x) === i).map(esc).join('، ')
  const stats = [
    tr.lengthKm != null && `${num(lang, tr.lengthKm)} ${s.unit.km}`,
    tr.duration && duration(tr.duration, lang, { h: s.unit.h, min: s.unit.min }),
    tr.gainM != null && `↗ ${num(lang, tr.gainM, 0)} ${s.unit.m}`,
  ]
    .filter(Boolean)
    .map((x) => esc(String(x)))
    .join(' · ')
  const [la, lo] = tr.start!
  return (
    `<div dir="${lang === 'ar' ? 'rtl' : 'ltr'}">` +
    `<span class="pt">${esc(pick(tr.name, lang))}</span>` +
    `<span class="pm">${place}</span><br>` +
    `<span class="pm">${stats}</span>` +
    (tr.difficulty ? ` <span class="pill ${tr.difficulty}">${esc(s.difficulty[tr.difficulty])}</span>` : '') +
    `<span class="pa"><a class="pbtn" href="#/trail/${encodeURIComponent(tr.id)}">${esc(s.card.details)}</a>` +
    `<a href="https://www.google.com/maps/dir/?api=1&destination=${la},${lo}" target="_blank" rel="noopener">${esc(s.trail.getThere)}</a></span>` +
    `</div>`
  )
}

interface Props {
  trails: Trail[]
  visible: Set<string>
  selected: string | null
  routes: Routes
  onSelect: (id: string) => void
  me: MyLocation
  /** false on a trail's own page, which shows the Trail itself */
  popups?: boolean
  className?: string
}

/** The /trails map itself (same controls, layers, locate button and framing), dressed in Darb's colours. */
export default function DarbMap({ className, ...p }: Props) {
  return (
    <div className={`dmap ${className ?? ''}`}>
      <Req n={7} />
      <TrailMap {...p} popupHtml={darbPopup} routeStyle={DARB_ROUTES} />
    </div>
  )
}
