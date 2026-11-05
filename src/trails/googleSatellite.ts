import L from 'leaflet'

/**
 * Google satellite imagery through the official Map Tiles API (2D tiles).
 * https://developers.google.com/maps/documentation/tile/2d-tiles-overview
 *
 * Google's terms require its logo on the map and the imagery credits for the area in view,
 * which change as you pan, so both are kept in step with the map here.
 */
const API = 'https://tile.googleapis.com'
const LOGO = 'https://maps.gstatic.com/mapfiles/api-3/images/google_white5.png'

export async function googleSatellite(key: string): Promise<L.TileLayer> {
  const res = await fetch(`${API}/v1/createSession?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mapType: 'satellite', language: 'en-US', region: 'SA' }),
  })
  if (!res.ok) throw new Error(`Google createSession ${res.status}`)
  const { session } = (await res.json()) as { session: string }
  const q = `session=${encodeURIComponent(session)}&key=${encodeURIComponent(key)}`

  const layer = L.tileLayer(`${API}/v1/2dtiles/{z}/{x}/{y}?${q}`, { maxZoom: 20, maxNativeZoom: 20, tileSize: 256 })

  let credit = ''
  let timer = 0
  const logo = new L.Control({ position: 'bottomright' })
  logo.onAdd = () => {
    const a = L.DomUtil.create('a', 'google-logo') as HTMLAnchorElement
    a.href = 'https://www.google.com/maps'
    a.target = '_blank'
    a.rel = 'noopener'
    a.innerHTML = `<img src="${LOGO}" alt="Google" width="66" height="26">`
    return a
  }

  const refreshCredit = (m: L.Map) => {
    clearTimeout(timer)
    timer = window.setTimeout(async () => {
      const b = m.getBounds()
      const params = new URLSearchParams({
        zoom: String(m.getZoom()),
        north: String(b.getNorth()),
        south: String(b.getSouth()),
        east: String(b.getEast()),
        west: String(b.getWest()),
      })
      try {
        const r = await fetch(`${API}/tile/v1/viewport?${q}&${params}`)
        const { copyright } = (await r.json()) as { copyright?: string }
        if (!m.hasLayer(layer)) return
        if (credit) m.attributionControl.removeAttribution(credit)
        credit = copyright ? `Imagery ${copyright.replace(/</g, '&lt;')}` : 'Imagery &copy; Google'
        m.attributionControl.addAttribution(credit)
      } catch {
        /* the credit falls back to the one already shown */
      }
    }, 250)
  }
  const onMove = (e: L.LeafletEvent) => refreshCredit(e.target as L.Map)

  layer.on('add', () => {
    const m = (layer as unknown as { _map: L.Map })._map
    logo.addTo(m)
    m.on('moveend', onMove)
    refreshCredit(m)
  })
  layer.on('remove', () => {
    const m = (layer as unknown as { _map: L.Map | null })._map
    clearTimeout(timer)
    logo.remove()
    if (m) {
      m.off('moveend', onMove)
      if (credit) m.attributionControl.removeAttribution(credit)
    }
    credit = ''
  })
  return layer
}
