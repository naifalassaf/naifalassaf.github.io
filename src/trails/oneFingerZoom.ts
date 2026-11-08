import type L from 'leaflet'

/**
 * Leaflet internals that its own pinch handler (Map.TouchZoom) uses to zoom without a view
 * reset. The public setZoomAround resets the view on every call, and a reset drops every
 * loaded tile, so a gesture built on it blanks the map until the finger stops.
 */
interface MapInternals {
  _stop(): void
  _moveStart(zoomChanged: boolean, noMoveStart: boolean): void
  _move(center: L.LatLng, zoom: number, data?: { pinch?: boolean; round?: boolean }): void
  _animateZoom(center: L.LatLng, zoom: number, startAnim: boolean, noUpdate?: boolean): void
  _resetView(center: L.LatLng, zoom: number): void
  _limitZoom(zoom: number): number
}

/** how far a finger slides for one zoom level */
const PX_PER_LEVEL = 120
/** the second tap has to land this soon after the first, and this close to it */
const DOUBLE_MS = 300
const DOUBLE_PX = 30
/** a first tap that lasts longer or travels further than this was a press or a pan, not a tap */
const TAP_MS = 250
const TAP_PX = 10
/** how far the second touch has to slide before it's a zoom rather than a double tap */
const SLOP_PX = 8

/**
 * One-finger zoom, as in phone map apps: double-tap and keep the finger down, then slide down
 * to zoom in or up to zoom out, around the point first tapped. Leaflet has no such handler.
 * A double tap that doesn't slide is left to Leaflet's own double-tap zoom.
 * Returns a function that removes it.
 */
export function oneFingerZoom(m: L.Map): () => void {
  const el = m.getContainer()
  const fingers = new Map<number, { x: number; y: number; t: number }>()
  let lastTap: { x: number; y: number; t: number } | null = null
  /** the gesture: where it started, and the map point under the first tap, which stays put */
  let g: { id: number; y: number; zoom: number; at: L.Point; anchor: L.LatLng; sliding: boolean; z: number } | null = null
  const mi = m as unknown as MapInternals

  /** the centre that keeps `g.anchor` under the finger's starting point at zoom `z` */
  const centreAt = (z: number) => {
    const off = g!.at.subtract(m.getSize().divideBy(2))
    return m.unproject(m.project(g!.anchor, z).subtract(off), z)
  }

  function stop() {
    if (!g) return
    if (g.sliding) {
      // settle on a whole zoom level so the tiles are sharp, the way a pinch ends
      const z = mi._limitZoom(g.z)
      if (m.options.zoomAnimation) mi._animateZoom(centreAt(z), z, true, !!m.options.zoomSnap)
      else mi._resetView(centreAt(z), z)
    }
    g = null
    m.dragging.enable()
  }

  const down = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    const now = performance.now()
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, t: now })
    if (fingers.size > 1) {
      // a second finger: it's a pinch, which Leaflet handles
      stop()
      lastTap = null
      return
    }
    if (lastTap && now - lastTap.t < DOUBLE_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < DOUBLE_PX) {
      // the finger stays put on the map: hold off panning until we know whether it slides
      m.dragging.disable()
      const at = m.mouseEventToContainerPoint(e)
      const zoom = m.getZoom()
      g = { id: e.pointerId, y: e.clientY, zoom, at, anchor: m.containerPointToLatLng(at), sliding: false, z: zoom }
    }
  }

  const move = (e: PointerEvent) => {
    if (!g || e.pointerId !== g.id) return
    const dy = e.clientY - g.y
    if (!g.sliding && Math.abs(dy) < SLOP_PX) return
    if (!g.sliding) {
      g.sliding = true
      mi._stop() // a fly still in progress would fight the finger
      mi._moveStart(true, false)
    }
    // follow the finger between whole levels; the tiles in view are scaled, not reloaded
    g.z = Math.min(m.getMaxZoom(), Math.max(m.getMinZoom(), g.zoom + dy / PX_PER_LEVEL))
    mi._move(centreAt(g.z), g.z, { pinch: true, round: false })
  }

  const up = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    const start = fingers.get(e.pointerId)
    fingers.delete(e.pointerId)
    if (g && e.pointerId === g.id) {
      stop()
      lastTap = null
      return
    }
    const now = performance.now()
    const wasTap = start && e.type === 'pointerup' && now - start.t < TAP_MS && Math.hypot(e.clientX - start.x, e.clientY - start.y) < TAP_PX
    lastTap = wasTap && fingers.size === 0 ? { x: e.clientX, y: e.clientY, t: now } : null
  }

  // capture: decide before Leaflet's own drag handler sees the touch
  const opts = { capture: true }
  el.addEventListener('pointerdown', down, opts)
  el.addEventListener('pointermove', move, opts)
  el.addEventListener('pointerup', up, opts)
  el.addEventListener('pointercancel', up, opts)
  return () => {
    el.removeEventListener('pointerdown', down, opts)
    el.removeEventListener('pointermove', move, opts)
    el.removeEventListener('pointerup', up, opts)
    el.removeEventListener('pointercancel', up, opts)
  }
}
