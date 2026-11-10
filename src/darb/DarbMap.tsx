import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Routes, Trail } from '../trails/types'
import { esc } from '../trails/format'
import { useUi, Req } from './ui'

export type Base = 'map' | 'sat' | 'topo'

const TILES: Record<Base, () => L.TileLayer> = {
  map: () =>
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }),
  sat: () =>
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      maxNativeZoom: 17,
      attribution: 'Imagery &copy; Esri',
    }),
  topo: () =>
    L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      maxNativeZoom: 17,
      attribution: '&copy; <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)',
    }),
}

interface Props {
  trails: Trail[]
  routes: Routes
  /** list mode: the highlighted Trail; trail mode: unused */
  selected?: string | null
  hovered?: string | null
  onSelect?: (id: string) => void
  /** one Trail's page: its route, start and end, framed */
  single?: Trail
  base: Base
  setBase: (b: Base) => void
  className?: string
}

const pin = (cls: string, label = '') =>
  L.divIcon({ className: '', html: `<span class="dpin ${cls}">${label}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] })

export default function DarbMap({ trails, routes, selected, hovered, onSelect, single, base, setBase, className }: Props) {
  const { s, lang } = useUi()
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const tiles = useRef<L.TileLayer | null>(null)
  const layer = useRef<L.LayerGroup | null>(null)
  const markers = useRef(new Map<string, L.Marker>())
  const refit = useRef(() => {})
  const latest = useRef({ onSelect })
  latest.current = { onSelect }

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: true, scrollWheelZoom: true }).setView([24.6, 44.5], 5)
    m.attributionControl.setPrefix(false)
    layer.current = L.layerGroup().addTo(m)
    map.current = m
    // a map mounted hidden (phones start on the list) frames the Trails once it has a size
    let hidden = el.current!.clientWidth === 0
    const ro = new ResizeObserver(() => {
      m.invalidateSize()
      if (hidden && el.current!.clientWidth > 0) refit.current()
      hidden = el.current!.clientWidth === 0
    })
    ro.observe(el.current!)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const m = map.current!
    tiles.current?.remove()
    tiles.current = TILES[base]().addTo(m)
  }, [base])

  // trail page: draw once per Trail / routes arrival
  useEffect(() => {
    if (!single) return
    const m = map.current!
    const g = layer.current!
    g.clearLayers()
    const lines = routes[single.id] ?? []
    const pts: L.LatLngExpression[] = []
    lines.forEach((l) => {
      L.polyline(l, { color: '#fff', weight: 8, opacity: 0.9 }).addTo(g)
      L.polyline(l, { color: '#f47b3d', weight: 4.5 }).addTo(g)
      pts.push(...l)
    })
    if (single.start) {
      L.marker(single.start, { icon: pin('start', lang === 'ar' ? 'ب' : 'S'), title: s.trail.startHere }).addTo(g).bindTooltip(s.trail.startHere)
      pts.push(single.start)
    }
    const lastLine = lines[lines.length - 1]
    const last = lastLine?.[lastLine.length - 1]
    if (last && single.start && L.latLng(last).distanceTo(single.start) > 150)
      L.marker(last, { icon: pin('end', lang === 'ar' ? 'ن' : 'E'), title: s.trail.end }).addTo(g).bindTooltip(s.trail.end)
    if (pts.length > 1) m.fitBounds(L.latLngBounds(pts), { padding: [30, 30] })
    else if (pts.length === 1) m.setView(pts[0], 13)
  }, [single, routes, lang, s])

  // list mode: a marker per Trail, the selected one's route drawn
  useEffect(() => {
    if (single) return
    const g = layer.current!
    g.clearLayers()
    markers.current.clear()
    trails.forEach((tr) => {
      if (!tr.start) return
      const cls = `${tr.difficulty ?? 'none'}${tr.id === selected ? ' sel' : ''}${tr.id === hovered ? ' hov' : ''}`
      const mk = L.marker(tr.start, { icon: pin(cls), title: tr.name[lang] ?? tr.name.ar, zIndexOffset: tr.id === selected ? 1000 : tr.id === hovered ? 500 : 0 })
      const name = esc((lang === 'en' && tr.name.en) || tr.name.ar)
      mk.bindPopup(
        `<div class="dpop"><b>${name}</b><span>${tr.lengthKm ?? '–'} ${s.unit.km} · ${s.difficulty[tr.difficulty ?? 'none']}</span><a href="#/trail/${encodeURIComponent(tr.id)}">${s.card.details} ←</a></div>`,
        { closeButton: false },
      )
      mk.on('click', () => latest.current.onSelect?.(tr.id))
      mk.addTo(g)
      markers.current.set(tr.id, mk)
    })
    if (selected) (routes[selected] ?? []).forEach((l) => L.polyline(l, { color: '#f47b3d', weight: 4 }).addTo(g))
  }, [single, trails, routes, selected, hovered, lang, s])

  // list mode: frame the shown Trails when the set changes
  const key = single ? '' : trails.map((t) => t.id).join(',')
  useEffect(() => {
    if (single) return
    const pts = trails.filter((t) => t.start).map((t) => t.start!)
    refit.current = () => pts.length && map.current!.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 11 })
    refit.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // list mode: fly to the selected Trail
  useEffect(() => {
    if (single || !selected) return
    const tr = trails.find((t) => t.id === selected)
    const lines = routes[selected]
    const m = map.current!
    if (lines?.length) m.flyToBounds(L.latLngBounds(lines.flat()), { padding: [60, 60], duration: 0.6 })
    else if (tr?.start) m.flyTo(tr.start, 12, { duration: 0.6 })
    markers.current.get(selected)?.openPopup()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

  return (
    <div className={`dmap ${className ?? ''}`}>
      <div ref={el} className="dmap-canvas" dir="ltr" />
      <div className="layers" role="group" aria-label="Map layers">
        <Req n={7} />
        {(['map', 'sat', 'topo'] as Base[]).map((b) => (
          <button key={b} type="button" aria-pressed={base === b} onClick={() => setBase(b)}>
            <span className={`swatch ${b}`} aria-hidden="true" />
            {s.layers[b]}
          </button>
        ))}
      </div>
    </div>
  )
}
