import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import type { Lang, Routes, Trail } from './types'
import { duration, num, pick } from './format'
import { googleSatellite } from './googleSatellite'
import { useMyLocation } from './useMyLocation'

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

interface Props {
  trails: Trail[]
  visible: Set<string>
  selected: string | null
  routes: Routes
  onSelect: (id: string) => void
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const ROUTE = { color: '#5F6F4E', weight: 3, opacity: 0.85 }
const ROUTE_ON = { color: '#C4652F', weight: 5, opacity: 1 }

const ME_ICON = L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9], html: '<span class="me"></span>' })

type Help = 'denied' | 'unavailable' | 'unsupported'

/** which set of "turn location back on" steps to show */
function platform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

function icon(t: Trail, on: boolean) {
  const cls = on ? 'sel' : t.source
  const s = on ? 21 : 15
  return L.divIcon({ className: '', iconSize: [s, s], iconAnchor: [s / 2, s / 2], html: `<span class="mk ${cls}"></span>` })
}

export default function TrailMap({ trails, visible, selected, routes, onSelect }: Props) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const markers = useRef(new Map<string, L.Marker>())
  const lines = useRef(new Map<string, L.Polyline>())
  const controls = useRef<L.Control[]>([])
  const [base, setBase] = useState<{ sat: L.TileLayer; topo: L.TileLayer } | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [ready, setReady] = useState(false)
  const first = useRef(true)
  const me = useMyLocation()
  const meRef = useRef(me)
  meRef.current = me
  const meLayers = useRef<{ dot: L.Marker; ring: L.Circle } | null>(null)
  const [help, setHelp] = useState<Help | null>(null)
  const [locating, setLocating] = useState(false)

  /* map, once */
  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: true, attributionControl: true, maxZoom: 20 }).setView([24.6, 44.5], 6)
    // Esri is the fallback when there's no Google key or Google fails. In remote Saudi areas
    // it only has imagery to zoom 17, so deeper zooms enlarge those tiles instead of going blank.
    const esri = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      maxNativeZoom: 17,
      attribution: 'Imagery &copy; Esri',
    }).addTo(m)
    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      maxNativeZoom: 17,
      attribution: '&copy; <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA), &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    })
    m.attributionControl.setPrefix(false)
    setBase({ sat: esri, topo })
    map.current = m
    let gone = false
    if (GOOGLE_KEY) {
      googleSatellite(GOOGLE_KEY)
        .then((g) => {
          if (gone) return
          if (m.hasLayer(esri)) {
            m.removeLayer(esri)
            g.addTo(m)
          }
          setBase({ sat: g, topo })
        })
        .catch((err) => console.warn('Google satellite unavailable, using Esri:', err))
    }
    // the stacked mobile layout and window resizes change the map's size under Leaflet
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el.current)
    setReady(true)
    return () => {
      gone = true
      ro.disconnect()
      m.remove()
      map.current = null
    }
  }, [])

  /* controls and Source credit, in the current language */
  useEffect(() => {
    const m = map.current
    if (!m || !base) return
    controls.current.forEach((c) => c.remove())
    const layers = L.control.layers({ [t('layers.sat')]: base.sat, [t('layers.topo')]: base.topo }, {}, { position: 'topleft' })
    const legend = new L.Control({ position: 'bottomleft' })
    legend.onAdd = () => {
      const d = L.DomUtil.create('div', 'legend')
      d.innerHTML =
        `<div><span class="mk ksrnr"></span>${esc(t('legend.ksrnr'))}</div>` +
        `<div><span class="mk darb"></span>${esc(t('legend.darb'))}</div>` +
        `<div><span class="ln"></span>${esc(t('legend.route'))}</div>`
      return d
    }
    const locate = new L.Control({ position: 'topleft' })
    locate.onAdd = () => {
      const bar = L.DomUtil.create('div', 'leaflet-bar locate')
      const a = L.DomUtil.create('a', '', bar)
      a.href = '#'
      a.role = 'button'
      a.title = t('locate.button')
      a.setAttribute('aria-label', t('locate.button'))
      a.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
      L.DomEvent.disableClickPropagation(bar)
      L.DomEvent.on(a, 'click', (e) => {
        L.DomEvent.preventDefault(e)
        onLocateRef.current()
      })
      return bar
    }
    layers.addTo(m)
    locate.addTo(m)
    legend.addTo(m)
    controls.current = [layers, locate, legend]
    const credit = lang === 'ar' ? 'المسارات: محمية الملك سلمان · جمعية درب' : 'Trails: KSRNR · Darb'
    m.attributionControl.addAttribution(credit)
    return () => {
      m.attributionControl.removeAttribution(credit)
    }
  }, [ready, base, lang, t])

  /* markers and routes, built per language (popups are text) */
  useEffect(() => {
    const m = map.current
    if (!m) return
    markers.current.forEach((x) => x.remove())
    lines.current.forEach((x) => x.remove())
    markers.current.clear()
    lines.current.clear()
    for (const tr of trails) {
      const r = routes[tr.id]
      if (r?.length) {
        const pl = L.polyline(r, { ...ROUTE, interactive: true })
        pl.on('click', () => onSelectRef.current(tr.id))
        lines.current.set(tr.id, pl)
      }
      if (!tr.start) continue
      const mk = L.marker(tr.start, { icon: icon(tr, false), title: pick(tr.name, lang), keyboard: false })
      mk.bindPopup(popup(tr, lang, t))
      mk.on('click', () => onSelectRef.current(tr.id))
      markers.current.set(tr.id, mk)
    }
  }, [trails, routes, lang, t, ready])

  /* visibility and selection */
  useEffect(() => {
    const m = map.current
    if (!m) return
    lines.current.forEach((pl, id) => {
      const show = visible.has(id)
      if (show && !m.hasLayer(pl)) pl.addTo(m)
      if (!show && m.hasLayer(pl)) pl.remove()
      pl.setStyle(id === selected ? ROUTE_ON : ROUTE)
      if (id === selected && show) pl.bringToFront()
    })
    markers.current.forEach((mk, id) => {
      const tr = trails.find((x) => x.id === id)!
      const show = visible.has(id)
      if (show && !m.hasLayer(mk)) mk.addTo(m)
      if (!show && m.hasLayer(mk)) mk.remove()
      mk.setIcon(icon(tr, id === selected))
      mk.setZIndexOffset(id === selected ? 1000 : 0)
    })
  }, [visible, selected, trails, routes, lang])

  /* frame what's visible when the filter changes */
  const visKey = [...visible].sort().join(',')
  useEffect(() => {
    const m = map.current
    if (!m) return
    const pts: L.LatLngExpression[] = []
    for (const tr of trails) if (visible.has(tr.id) && tr.start) pts.push(tr.start)
    if (!pts.length) return
    const b = L.latLngBounds(pts).pad(0.25)
    if (first.current) {
      // first paint: show everything, unless a ?trail= link already picked one to fly to
      first.current = false
      if (!selected) m.fitBounds(b, { maxZoom: 11 })
      else m.setView(b.getCenter(), 6)
    } else m.flyToBounds(b, { duration: 0.7, maxZoom: 11 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visKey])

  const routesLoaded = Object.keys(routes).length > 0

  /* fly to the selected Trail */
  useEffect(() => {
    const m = map.current
    if (!m || !selected) return
    const pl = lines.current.get(selected)
    const mk = markers.current.get(selected)
    if (pl && m.hasLayer(pl)) m.flyToBounds(pl.getBounds().pad(0.2), { duration: 0.9, maxZoom: 17 })
    else if (mk) m.flyTo(mk.getLatLng(), 13, { duration: 0.9 })
    if (mk && m.hasLayer(mk)) setTimeout(() => mk.openPopup(), 950)
    // re-run once the Routes arrive, so a ?trail= link frames the whole Route
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, routesLoaded])

  /* the visitor's position: a dot, plus a ring for how sure the browser is */
  useEffect(() => {
    const m = map.current
    if (!m) return
    if (!me.pos) {
      meLayers.current?.dot.remove()
      meLayers.current?.ring.remove()
      meLayers.current = null
      return
    }
    if (!meLayers.current) {
      meLayers.current = {
        ring: L.circle(me.pos, { radius: me.accuracy, className: 'me-ring', interactive: false }).addTo(m),
        dot: L.marker(me.pos, { icon: ME_ICON, interactive: false, keyboard: false, zIndexOffset: 2000 }).addTo(m),
      }
    } else {
      meLayers.current.dot.setLatLng(me.pos)
      meLayers.current.ring.setLatLng(me.pos).setRadius(me.accuracy)
    }
  }, [me.pos, me.accuracy, ready])

  /* the locate button: fly to the dot, or explain why there isn't one */
  const onLocateRef = useRef(() => {})
  onLocateRef.current = async () => {
    const m = map.current
    if (!m || locating) return
    setHelp(null)
    const fly = (p: [number, number]) => m.flyTo(p, Math.max(m.getZoom(), 15), { duration: 0.9 })
    const { pos } = meRef.current
    if (pos) return fly(pos)
    // ask again even after a denial: some browsers re-prompt, and it's how a fresh grant is noticed
    setLocating(true)
    const r = await meRef.current.locateOnce()
    setLocating(false)
    if (Array.isArray(r)) fly(r)
    else setHelp(r)
  }

  useEffect(() => {
    el.current?.querySelector('.locate a')?.classList.toggle('busy', locating)
  }, [locating])

  return (
    <div id="map" ref={el} dir="ltr" role="region" aria-label={t('title')}>
      {help &&
        el.current &&
        createPortal(<LocateHelp kind={help} onClose={() => setHelp(null)} onRetry={() => onLocateRef.current()} />, el.current)}
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

function popup(tr: Trail, lang: Lang, t: (k: string) => string) {
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
    `<a href="${esc(tr.page[lang])}" target="_blank" rel="noopener">${esc(t(`link.${tr.source}`))}</a>` +
    ` · <a href="https://www.google.com/maps/search/?api=1&query=${la},${lo}" target="_blank" rel="noopener">${esc(t('link.gmaps'))}</a>` +
    `</div>`
  )
}
