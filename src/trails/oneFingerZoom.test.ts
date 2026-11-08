import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import L from 'leaflet'
import { oneFingerZoom } from './oneFingerZoom'

let el: HTMLDivElement
let m: L.Map
let drop: () => void

/** jsdom has no PointerEvent; a MouseEvent carrying the pointer fields is what the handler reads */
function touch(type: string, y: number, id = 1, x = 400) {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true })
  Object.defineProperties(e, { pointerType: { value: 'touch' }, pointerId: { value: id } })
  el.dispatchEvent(e)
}
const tap = (y = 300) => {
  touch('pointerdown', y)
  touch('pointerup', y)
}

beforeEach(() => {
  el = document.createElement('div')
  Object.defineProperty(el, 'clientWidth', { value: 800 })
  Object.defineProperty(el, 'clientHeight', { value: 600 })
  document.body.append(el)
  m = L.map(el, { zoomAnimation: false, fadeAnimation: false }).setView([24.6, 44.5], 8)
  drop = oneFingerZoom(m)
})

afterEach(() => {
  drop()
  m.remove()
  el.remove()
})

describe('one-finger zoom', () => {
  it('zooms in as the finger slides down after a double tap, and settles on a whole level', () => {
    tap()
    touch('pointerdown', 300)
    touch('pointermove', 360)
    expect(m.getZoom()).toBeCloseTo(8.5, 5) // follows the finger between levels
    touch('pointermove', 420)
    touch('pointerup', 420)
    expect(m.getZoom()).toBe(9)
    expect(m.dragging.enabled()).toBe(true)
  })

  it('keeps the loaded tiles while sliding: no view reset until the finger lifts', () => {
    // a view reset is what drops every tile, which blanked the map mid-gesture
    let resets = 0
    m.on('viewprereset', () => resets++)
    tap()
    touch('pointerdown', 300)
    for (let y = 310; y <= 420; y += 10) touch('pointermove', y)
    expect(resets).toBe(0)
    touch('pointerup', 420)
  })

  it('keeps the tapped point in place', () => {
    const before = m.containerPointToLatLng([400, 300])
    tap()
    touch('pointerdown', 300)
    touch('pointermove', 420)
    touch('pointerup', 420)
    const after = m.containerPointToLatLng([400, 300])
    expect(after.lat).toBeCloseTo(before.lat, 3)
    expect(after.lng).toBeCloseTo(before.lng, 3)
  })

  it('zooms out as the finger slides up', () => {
    tap()
    touch('pointerdown', 300)
    touch('pointermove', 60)
    touch('pointerup', 60)
    expect(m.getZoom()).toBe(6)
  })

  it('does nothing on a single touch that slides: that is a pan', () => {
    touch('pointerdown', 300)
    touch('pointermove', 420)
    touch('pointerup', 420)
    expect(m.getZoom()).toBe(8)
  })

  it('leaves a double tap that does not slide to Leaflet', () => {
    tap()
    touch('pointerdown', 300)
    touch('pointerup', 302)
    expect(m.getZoom()).toBe(8)
    expect(m.dragging.enabled()).toBe(true)
  })

  it('hands over to the pinch when a second finger lands', () => {
    tap()
    touch('pointerdown', 300)
    touch('pointermove', 360)
    touch('pointerdown', 200, 2, 200)
    expect(Number.isInteger(m.getZoom())).toBe(true)
    touch('pointermove', 500)
    expect(m.getZoom()).toBe(Math.round(8.5))
    expect(m.dragging.enabled()).toBe(true)
  })
})
