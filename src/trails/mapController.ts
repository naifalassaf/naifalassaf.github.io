import L from 'leaflet'
import type { Lang, Routes, SourceId, Trail } from './types'
import { esc, pick } from './format'
import { popupHtml } from './popup'
import { oneFingerZoom } from './oneFingerZoom'

/** Everything the map draws. Pass the whole state on every update; the controller works out what changed. */
export interface TrailMapState {
  trails: Trail[]
  routes: Routes
  /** ids of the Trails the filters leave showing */
  visible: Set<string>
  selected: string | null
  lang: Lang
  /** the visitor's latest fix, or null when there is none */
  me: { pos: [number, number]; accuracy: number } | null
  /** true while a one-off location request is in flight: the locate button spins */
  locating: boolean
}

export interface TrailMapOptions {
  /** a Start point or Route was clicked */
  onSelect: (id: string) => void
  /**
   * The locate button was pressed (ignored while `locating`). When there is already a fix the
   * map flies to it; otherwise the caller should request one by setting `locating`, and the
   * map flies to the fix if one arrives before `locating` goes back to false.
   */
  onLocate: () => void
  /** translated text for a key, in a language */
  t: (key: string, lang: Lang) => string
  /** better satellite imagery to swap in for Esri once it loads; Esri stays if it's missing or fails */
  loadSatellite?: () => Promise<L.TileLayer>
  /**
   * How many px of the map are hidden under things drawn over its top and bottom edges (the
   * phone layout's floating header and bottom sheet). Read at each move, so it can follow a
   * sheet that's dragged; framing and flying keep their target in the part left showing.
   */
  covered?: () => { top: number; bottom: number }
  /** false: Start points open no popup, for a layout that shows the selected Trail itself */
  popups?: boolean
}

export interface TrailMap {
  update(state: TrailMapState): void
  /** where the map is looking now */
  view(): { center: [number, number]; zoom: number }
  destroy(): void
}

const ROUTE = { color: '#5F6F4E', weight: 3, opacity: 0.85 }
const ROUTE_ON = { color: '#C4652F', weight: 5, opacity: 1 }
const ME_ICON = L.divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9], html: '<span class="me"></span>' })
const LOCATE_SVG =
  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
/** the attribution line names only the Sources on the map, in this order */
const SOURCE_ORDER: SourceId[] = ['ksrnr', 'darb', 'asir']
const CREDIT_NAME: Record<SourceId, Record<Lang, string>> = {
  ksrnr: { ar: 'محمية الملك سلمان', en: 'KSRNR' },
  darb: { ar: 'جمعية درب', en: 'Darb' },
  asir: { ar: 'هيئة تطوير عسير', en: 'Aseer Development Authority' },
}
const CREDIT_LEAD: Record<Lang, string> = { ar: 'المسارات: ', en: 'Trails: ' }
const sourcesIn = (trails: Trail[]) => SOURCE_ORDER.filter((s) => trails.some((t) => t.source === s))

function icon(t: Trail, on: boolean) {
  const cls = on ? 'sel' : t.source
  const s = on ? 21 : 15
  return L.divIcon({ className: '', iconSize: [s, s], iconAnchor: [s / 2, s / 2], html: `<span class="mk ${cls}"></span>` })
}

const keyOf = (ids: Set<string>) => [...ids].sort().join(',')
const hasRoutes = (r: Routes | undefined) => !!r && Object.keys(r).length > 0

/**
 * The Saudi Trails map: Start points, Routes, the visitor's position, and the controls, on a
 * Leaflet map inside `el`. Framing rules:
 *  1. first frame: fit everything visible, or, when a Trail is already selected, centre at zoom 6
 *  2. the visible set changes: fly to fit it
 *  3. a Trail is selected: fly to its Route (or its Start point), then open its popup
 *  4. Routes arrive while a Trail is selected: rule 3 again, so the whole Route is framed
 */
export function createTrailMap(el: HTMLElement, opts: TrailMapOptions): TrailMap {
  const m = L.map(el, { zoomControl: true, attributionControl: true, maxZoom: 20 }).setView([24.6, 44.5], 6)
  m.attributionControl.setPrefix(false)
  const dropOneFingerZoom = oneFingerZoom(m)

  // Esri is the fallback satellite. In remote Saudi areas it only has imagery to zoom 17,
  // so deeper zooms enlarge those tiles instead of going blank.
  const base = {
    sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      maxNativeZoom: 17,
      attribution: 'Imagery &copy; Esri',
    }) as L.TileLayer,
    topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxZoom: 20,
      maxNativeZoom: 17,
      attribution:
        '&copy; <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA), &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    }),
  }
  base.sat.addTo(m)

  const markers = new Map<string, L.Marker>()
  const lines = new Map<string, L.Polyline>()
  let byId = new Map<string, Trail>()
  let controls: L.Control[] = []
  let credit: string | null = null
  let locateLink: HTMLAnchorElement | null = null
  let meLayers: { dot: L.Marker; ring: L.Circle } | null = null
  let prev: TrailMapState | null = null
  let prevVisKey: string | null = null
  let framed = false
  let awaitingFix = false
  /** cancels the popup waiting for the current fly to end */
  let pendingPopup: (() => void) | null = null
  let gone = false

  const cover = () => opts.covered?.() ?? { top: 0, bottom: 0 }
  /** fitBounds/flyToBounds padding that keeps to the uncovered band */
  const pad = () => {
    const c = cover()
    return { paddingTopLeft: L.point(0, c.top), paddingBottomRight: L.point(0, c.bottom) }
  }
  /** the map centre that puts `p` in the middle of the uncovered band at zoom `z` */
  const centreFor = (p: L.LatLngExpression, z: number) => {
    const c = cover()
    if (c.bottom === c.top) return L.latLng(p) // nothing to shift: skip the projection round trip
    return m.unproject(m.project(p, z).add([0, (c.bottom - c.top) / 2]), z)
  }
  const fly = (p: [number, number]) => {
    const z = Math.max(m.getZoom(), 15)
    m.flyTo(centreFor(p, z), z, { duration: 0.9 })
  }

  function buildControls(lang: Lang, sources: SourceId[]) {
    controls.forEach((c) => c.remove())
    const t = (k: string) => opts.t(k, lang)
    const layers = L.control.layers({ [t('layers.sat')]: base.sat, [t('layers.topo')]: base.topo }, {}, { position: 'topleft' })
    const legend = new L.Control({ position: 'bottomleft' })
    legend.onAdd = () => {
      const d = L.DomUtil.create('div', 'legend')
      d.innerHTML =
        sources.map((s) => `<div><span class="mk ${s}"></span>${esc(t(`legend.${s}`))}</div>`).join('') +
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
      a.innerHTML = LOCATE_SVG
      a.classList.toggle('busy', !!prev?.locating)
      L.DomEvent.disableClickPropagation(bar)
      L.DomEvent.on(a, 'click', (e) => {
        L.DomEvent.preventDefault(e)
        onLocatePressed()
      })
      locateLink = a
      return bar
    }
    layers.addTo(m)
    locate.addTo(m)
    legend.addTo(m)
    controls = [layers, locate, legend]
    if (credit) m.attributionControl.removeAttribution(credit)
    credit = CREDIT_LEAD[lang] + sources.map((s) => CREDIT_NAME[s][lang]).join(' · ')
    m.attributionControl.addAttribution(credit)
  }

  function onLocatePressed() {
    if (!prev || prev.locating) return
    if (prev.me) fly(prev.me.pos)
    opts.onLocate()
  }

  function buildLayers(s: TrailMapState) {
    markers.forEach((x) => x.remove())
    lines.forEach((x) => x.remove())
    markers.clear()
    lines.clear()
    byId = new Map(s.trails.map((tr) => [tr.id, tr]))
    const t = (k: string) => opts.t(k, s.lang)
    for (const tr of s.trails) {
      const r = s.routes[tr.id]
      if (r?.length) {
        const pl = L.polyline(r, { ...ROUTE, interactive: true })
        pl.on('click', () => opts.onSelect(tr.id))
        lines.set(tr.id, pl)
      }
      if (!tr.start) continue
      const mk = L.marker(tr.start, { icon: icon(tr, false), title: pick(tr.name, s.lang), keyboard: false })
      if (opts.popups !== false) mk.bindPopup(popupHtml(tr, s.lang, t))
      mk.on('click', () => opts.onSelect(tr.id))
      markers.set(tr.id, mk)
    }
  }

  /** a language switch keeps every marker: only its text changes */
  function retitle(lang: Lang) {
    const t = (k: string) => opts.t(k, lang)
    markers.forEach((mk, id) => {
      const tr = byId.get(id)!
      const title = pick(tr.name, lang)
      mk.options.title = title
      mk.getElement()?.setAttribute('title', title)
      if (mk.getPopup()) mk.setPopupContent(popupHtml(tr, lang, t))
    })
  }

  function applyVisibility(s: TrailMapState) {
    lines.forEach((pl, id) => {
      const show = s.visible.has(id)
      if (show && !m.hasLayer(pl)) pl.addTo(m)
      if (!show && m.hasLayer(pl)) pl.remove()
      pl.setStyle(id === s.selected ? ROUTE_ON : ROUTE)
      if (id === s.selected && show) pl.bringToFront()
    })
    markers.forEach((mk, id) => {
      const show = s.visible.has(id)
      if (show && !m.hasLayer(mk)) mk.addTo(m)
      if (!show && m.hasLayer(mk)) mk.remove()
      mk.setIcon(icon(byId.get(id)!, id === s.selected))
      mk.setZIndexOffset(id === s.selected ? 1000 : 0)
    })
  }

  function frame(s: TrailMapState) {
    const pts: L.LatLngExpression[] = []
    for (const tr of s.trails) if (s.visible.has(tr.id) && tr.start) pts.push(tr.start)
    if (!pts.length) return
    const b = L.latLngBounds(pts).pad(0.25)
    if (!framed) {
      framed = true
      // first paint: show everything, unless a ?trail= link already picked one to fly to
      if (!s.selected) m.fitBounds(b, { maxZoom: 11, ...pad() })
      else m.setView(b.getCenter(), 6)
    } else m.flyToBounds(b, { duration: 0.7, maxZoom: 11, ...pad() })
  }

  function flyToSelected(id: string) {
    const pl = lines.get(id)
    const mk = markers.get(id)
    pendingPopup?.()
    pendingPopup = null
    // Finish any move still animating first: stopping a pan fires moveend, which would
    // otherwise open the popup the moment this fly begins instead of when it ends.
    m.stop()
    if (mk && m.hasLayer(mk) && mk.getPopup()) {
      const open = () => {
        pendingPopup = null
        // look the marker up now: the layers may have been rebuilt during the flight
        const now = markers.get(id)
        if (prev?.selected === id && now && m.hasLayer(now)) now.openPopup()
      }
      pendingPopup = () => m.off('moveend', open)
      // listen before moving: without animation Leaflet moves synchronously
      m.once('moveend', open)
    }
    if (pl && m.hasLayer(pl)) m.flyToBounds(pl.getBounds().pad(0.2), { duration: 0.9, maxZoom: 17, ...pad() })
    else if (mk) m.flyTo(centreFor(mk.getLatLng(), 13), 13, { duration: 0.9 })
  }

  function drawMe(me: TrailMapState['me']) {
    if (!me) {
      meLayers?.dot.remove()
      meLayers?.ring.remove()
      meLayers = null
      return
    }
    if (!meLayers) {
      meLayers = {
        ring: L.circle(me.pos, { radius: me.accuracy, className: 'me-ring', interactive: false }).addTo(m),
        dot: L.marker(me.pos, { icon: ME_ICON, interactive: false, keyboard: false, zIndexOffset: 2000 }).addTo(m),
      }
    } else {
      meLayers.dot.setLatLng(me.pos)
      meLayers.ring.setLatLng(me.pos).setRadius(me.accuracy)
    }
  }

  // a window resize, or crossing into the phone layout, changes the map's size under Leaflet
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => m.invalidateSize())
  ro?.observe(el)

  if (opts.loadSatellite) {
    opts
      .loadSatellite()
      .then((g) => {
        if (gone) return
        const wasOn = m.hasLayer(base.sat)
        if (wasOn) m.removeLayer(base.sat)
        base.sat = g
        if (wasOn) g.addTo(m)
        if (prev) buildControls(prev.lang, sourcesIn(prev.trails))
      })
      .catch((err) => console.warn('Google satellite unavailable, using Esri:', err))
  }

  return {
    update(s) {
      const p = prev
      prev = s
      const sources = sourcesIn(s.trails)
      if (s.lang !== p?.lang || sources.join() !== (p ? sourcesIn(p.trails).join() : null)) buildControls(s.lang, sources)

      const rebuilt = s.trails !== p?.trails || s.routes !== p?.routes
      // rebuilding removes the old markers, closing any open popup; reopen it on the new one
      const reopen = rebuilt && !!s.selected && s.selected === p?.selected && !!markers.get(s.selected)?.isPopupOpen()
      if (rebuilt) buildLayers(s)
      else if (s.lang !== p?.lang) retitle(s.lang)

      const visKey = keyOf(s.visible)
      const visChanged = visKey !== prevVisKey
      prevVisKey = visKey
      if (rebuilt || visChanged || s.selected !== p?.selected) applyVisibility(s)
      if (reopen) {
        const mk = markers.get(s.selected!)
        if (mk && m.hasLayer(mk)) mk.openPopup()
      }
      if (visChanged || !framed) frame(s)

      const routesArrived = !hasRoutes(p?.routes) && hasRoutes(s.routes)
      if (s.selected && (s.selected !== p?.selected || routesArrived)) flyToSelected(s.selected)

      if (s.me?.pos !== p?.me?.pos || s.me?.accuracy !== p?.me?.accuracy) drawMe(s.me)
      if (s.locating && !p?.locating) awaitingFix = true
      if (awaitingFix && s.me && s.me.pos !== p?.me?.pos) {
        awaitingFix = false
        fly(s.me.pos)
      }
      if (!s.locating && p?.locating) awaitingFix = false
      if (s.locating !== !!p?.locating) locateLink?.classList.toggle('busy', s.locating)
    },
    view() {
      const c = m.getCenter()
      return { center: [c.lat, c.lng], zoom: m.getZoom() }
    },
    destroy() {
      gone = true
      ro?.disconnect()
      dropOneFingerZoom()
      m.remove()
    },
  }
}
