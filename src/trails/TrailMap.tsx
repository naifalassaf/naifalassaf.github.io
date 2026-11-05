import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import type { Lang, Routes, Trail } from './types'
import { duration, num, pick } from './format'

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
  const base = useRef<{ sat: L.TileLayer; topo: L.TileLayer } | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [ready, setReady] = useState(false)
  const first = useRef(true)

  /* map, once */
  useEffect(() => {
    if (!el.current || map.current) return
    const m = L.map(el.current, { zoomControl: true, attributionControl: true }).setView([24.6, 44.5], 6)
    const sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Imagery &copy; Esri',
    }).addTo(m)
    const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 17,
      attribution: '&copy; OpenTopoMap (CC-BY-SA), &copy; OpenStreetMap',
    })
    m.attributionControl.setPrefix(false)
    base.current = { sat, topo }
    map.current = m
    // the stacked mobile layout and window resizes change the map's size under Leaflet
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el.current)
    setReady(true)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
    }
  }, [])

  /* controls and Source credit, in the current language */
  useEffect(() => {
    const m = map.current
    if (!m || !base.current) return
    controls.current.forEach((c) => c.remove())
    const layers = L.control.layers({ [t('layers.sat')]: base.current.sat, [t('layers.topo')]: base.current.topo }, {}, { position: 'topleft' })
    const legend = new L.Control({ position: 'bottomleft' })
    legend.onAdd = () => {
      const d = L.DomUtil.create('div', 'legend')
      d.innerHTML =
        `<div><span class="mk ksrnr"></span>${esc(t('legend.ksrnr'))}</div>` +
        `<div><span class="mk darb"></span>${esc(t('legend.darb'))}</div>` +
        `<div><span class="ln"></span>${esc(t('legend.route'))}</div>`
      return d
    }
    layers.addTo(m)
    legend.addTo(m)
    controls.current = [layers, legend]
    const credit = lang === 'ar' ? 'المسارات: محمية الملك سلمان · جمعية درب' : 'Trails: KSRNR · Darb'
    m.attributionControl.addAttribution(credit)
    return () => {
      m.attributionControl.removeAttribution(credit)
    }
  }, [ready, lang, t])

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
      first.current = false
      m.fitBounds(b, { maxZoom: 11 })
    } else m.flyToBounds(b, { duration: 0.7, maxZoom: 11 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visKey, ready])

  /* fly to the selected Trail */
  useEffect(() => {
    const m = map.current
    if (!m || !selected) return
    const pl = lines.current.get(selected)
    const mk = markers.current.get(selected)
    if (pl && m.hasLayer(pl)) m.flyToBounds(pl.getBounds().pad(0.2), { duration: 0.9, maxZoom: 15 })
    else if (mk) m.flyTo(mk.getLatLng(), 13, { duration: 0.9 })
    if (mk && m.hasLayer(mk)) setTimeout(() => mk.openPopup(), 950)
  }, [selected])

  return (
    <div id="map" ref={el} dir="ltr" role="region" aria-label={t('title')} />
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
