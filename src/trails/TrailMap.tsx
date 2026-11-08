import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import type { Lang, Routes, Trail } from './types'
import { googleSatellite } from './googleSatellite'
import { createTrailMap, type TrailMap as Controller } from './mapController'
import type { MyLocation } from './useMyLocation'

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

interface Props {
  trails: Trail[]
  visible: Set<string>
  selected: string | null
  routes: Routes
  onSelect: (id: string) => void
  /** the visitor's location, shared with the list's distance sort */
  me: MyLocation
  /** false: no popups, for a layout that shows the selected Trail itself (read once, at mount) */
  popups?: boolean
  /** px hidden under the page's own overlays at the map's top and bottom edges */
  covered?: () => { top: number; bottom: number }
}

type Help = 'denied' | 'unavailable' | 'unsupported'

/** which set of "turn location back on" steps to show */
function platform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

/** React's side of the map: owns the visitor's location and the help dialog; the map controller draws. */
export default function TrailMap({ trails, visible, selected, routes, onSelect, me, popups, covered }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<Controller | null>(null)
  const [help, setHelp] = useState<Help | null>(null)
  const [locating, setLocating] = useState(false)

  const locate = async () => {
    setHelp(null)
    if (me.pos || locating) return // with a fix the map flies to it itself
    // ask again even after a denial: some browsers re-prompt, and it's how a fresh grant is noticed
    setLocating(true)
    const r = await me.locateOnce()
    setLocating(false)
    if (!Array.isArray(r)) setHelp(r)
  }

  // the controller is created once; its callbacks reach the latest render through this
  // (react-i18next hands back a new i18n object on a language switch, so it goes through here too)
  const latest = useRef({ onSelect, locate, i18n, covered })
  latest.current = { onSelect, locate, i18n, covered }

  useEffect(() => {
    const c = createTrailMap(el.current!, {
      onSelect: (id) => latest.current.onSelect(id),
      onLocate: () => latest.current.locate(),
      t: (k, l) => latest.current.i18n.getFixedT(l)(k),
      loadSatellite: GOOGLE_KEY ? () => googleSatellite(GOOGLE_KEY) : undefined,
      covered: () => latest.current.covered?.() ?? { top: 0, bottom: 0 },
      popups,
    })
    map.current = c
    return () => {
      c.destroy()
      map.current = null
    }
  }, [])

  useEffect(() => {
    map.current?.update({
      trails,
      routes,
      visible,
      selected,
      lang,
      me: me.pos ? { pos: me.pos, accuracy: me.accuracy } : null,
      locating,
    })
  })

  return (
    <div id="map" ref={el} dir="ltr" role="region" aria-label={t('title')}>
      {help &&
        el.current &&
        createPortal(<LocateHelp kind={help} onClose={() => setHelp(null)} onRetry={locate} />, el.current)}
    </div>
  )
}

function LocateHelp({ kind, onClose, onRetry }: { kind: Help; onClose: () => void; onRetry: () => void }) {
  const { t, i18n } = useTranslation()
  const steps = kind === 'denied' ? (t(`locate.steps.${platform()}`, { returnObjects: true }) as string[]) : []
  return (
    <div className="locate-help" dir={i18n.dir()} role="alertdialog" aria-labelledby="locate-help-title">
      <p className="lh-title" id="locate-help-title">
        {t(`locate.${kind}.title`)}
      </p>
      <p>{t(`locate.${kind}.body`)}</p>
      {steps.length > 0 && (
        <ol>
          {steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      )}
      <div className="lh-actions">
        {kind !== 'unsupported' && (
          <button type="button" onClick={onRetry}>
            {t('locate.retry')}
          </button>
        )}
        <button type="button" className="quiet" onClick={onClose}>
          {t('locate.close')}
        </button>
      </div>
    </div>
  )
}
