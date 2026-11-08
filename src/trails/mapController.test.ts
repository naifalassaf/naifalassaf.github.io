import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import L from 'leaflet'
import { createTrailMap, type TrailMap, type TrailMapState } from './mapController'
import type { Routes } from './types'
import { t, trail } from './fixtures.test-util'

const A = trail('a', { source: 'ksrnr', start: [27.5, 41.5] })
const B = trail('b', { source: 'darb', start: [24.7, 46.6] })
const NO_START = trail('c', { start: null })
const TRAILS = [A, B, NO_START]
const ROUTES: Routes = {
  a: [[[27.5, 41.5], [27.52, 41.53], [27.55, 41.55]]],
  c: [[[21.1, 40.3], [21.12, 40.32]]],
}

let el: HTMLDivElement
let map: TrailMap
let onSelect: ReturnType<typeof vi.fn<(id: string) => void>>
let onLocate: ReturnType<typeof vi.fn<() => void>>

function state(over: Partial<TrailMapState> = {}): TrailMapState {
  return {
    trails: TRAILS,
    routes: ROUTES,
    visible: new Set(TRAILS.map((x) => x.id)),
    selected: null,
    lang: 'en',
    me: null,
    locating: false,
    ...over,
  }
}

const markerEls = () => [...el.querySelectorAll<HTMLElement>('.leaflet-marker-icon')]
const startPoint = (title: string) => markerEls().find((m) => m.title === title)
const routeEls = () => [...el.querySelectorAll<SVGPathElement>('path.leaflet-interactive')]
const popupText = () => el.querySelector('.leaflet-popup-content')?.innerHTML ?? null
const moved = () => new Promise((r) => setTimeout(r, 400))
const click = (target: Element) => target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))

beforeEach(() => {
  el = document.createElement('div')
  // jsdom lays nothing out; Leaflet reads the map's size from these
  Object.defineProperty(el, 'clientWidth', { value: 800 })
  Object.defineProperty(el, 'clientHeight', { value: 600 })
  document.body.append(el)
  onSelect = vi.fn()
  onLocate = vi.fn()
  map = createTrailMap(el, { onSelect, onLocate, t })
})

afterEach(() => {
  map.destroy()
  el.remove()
})

describe('Start points and Routes', () => {
  it('draws a Start point for each Trail that has one, and every Route', () => {
    map.update(state())
    expect(markerEls().map((m) => m.title).sort()).toEqual(['Trail a', 'Trail b'])
    expect(routeEls()).toHaveLength(2)
  })

  it('colours Start points by Source', () => {
    map.update(state())
    expect(startPoint('Trail a')!.querySelector('.mk.ksrnr')).not.toBeNull()
    expect(startPoint('Trail b')!.querySelector('.mk.darb')).not.toBeNull()
  })

  it('hides both the Start point and the Route of a filtered-out Trail', () => {
    map.update(state())
    map.update(state({ visible: new Set(['b', 'c']) }))
    expect(startPoint('Trail a')).toBeUndefined()
    expect(routeEls()).toHaveLength(1)
    map.update(state())
    expect(startPoint('Trail a')).toBeDefined()
    expect(routeEls()).toHaveLength(2)
  })

  it('reports a click on a Start point or a Route as a selection', () => {
    map.update(state())
    click(startPoint('Trail b')!)
    expect(onSelect).toHaveBeenLastCalledWith('b')
    click(routeEls()[0])
    expect(onSelect).toHaveBeenCalledTimes(2)
  })
})

describe('selection', () => {
  it('restyles the selected Start point and Route', () => {
    map.update(state())
    map.update(state({ selected: 'a' }))
    expect(startPoint('Trail a')!.querySelector('.mk.sel')).not.toBeNull()
    expect(startPoint('Trail b')!.querySelector('.mk.sel')).toBeNull()
    const strokes = routeEls().map((p) => p.getAttribute('stroke'))
    expect(strokes).toContain('#C4652F')
    expect(strokes).toContain('#5F6F4E')
  })

  it('flies to a Trail without a Route at zoom 13 and opens its popup', () => {
    map.update(state())
    map.update(state({ selected: 'b' }))
    expect(map.view()).toEqual({ center: [24.7, 46.6], zoom: 13 })
    expect(popupText()).toContain('Trail b')
  })

  it('frames the whole Route of a Trail that has one', () => {
    map.update(state())
    map.update(state({ selected: 'a' }))
    // the Route's middle, not its Start point (27.5, 41.5)
    const { center } = map.view()
    expect(center[0]).toBeCloseTo(27.525, 2)
    expect(center[1]).toBeCloseTo(41.525, 2)
  })
})

describe('framing', () => {
  it('first frame fits every visible Start point', () => {
    map.update(state())
    const { center, zoom } = map.view()
    expect(zoom).toBeLessThanOrEqual(11)
    expect(center[0]).toBeCloseTo((27.5 + 24.7) / 2, 0)
    expect(center[1]).toBeCloseTo((41.5 + 46.6) / 2, 0)
  })

  it('first frame with a ?trail= selection goes straight to that Trail', () => {
    map.update(state({ selected: 'b', routes: {} }))
    expect(map.view()).toEqual({ center: [24.7, 46.6], zoom: 13 })
  })

  it('a ?trail= link reframes to the whole Route once the Routes arrive', async () => {
    map.update(state({ selected: 'a', routes: {} }))
    expect(map.view().center).toEqual([27.5, 41.5])
    map.update(state({ selected: 'a', routes: ROUTES }))
    await moved() // same zoom, so Leaflet pans with an animation instead of jumping
    expect(map.view().center[0]).toBeCloseTo(27.525, 2)
    expect(map.view().center[1]).toBeCloseTo(41.525, 2)
  })

  it('a ?trail= link still has its popup open after the Routes arrive', async () => {
    map.update(state({ selected: 'b', routes: {} }))
    map.update(state({ selected: 'b', routes: ROUTES }))
    await moved()
    expect(popupText()).toContain('Trail b')
  })

  it('keeps the popup open when the Routes are replaced by a new object (a refetch)', async () => {
    map.update(state({ selected: 'b', routes: {} }))
    map.update(state({ selected: 'b', routes: ROUTES }))
    await moved()
    map.update(state({ selected: 'b', routes: { ...ROUTES } }))
    expect(popupText()).toContain('Trail b')
  })

  it('fits the new visible set when the filters change', () => {
    map.update(state())
    map.update(state({ visible: new Set(['b']) }))
    expect(map.view().center[0]).toBeCloseTo(24.7, 5)
    expect(map.view().center[1]).toBeCloseTo(46.6, 5)
  })

  it('does not move when the visible set is rebuilt with the same Trails (a re-sort)', () => {
    map.update(state())
    map.update(state({ selected: 'b' }))
    const before = map.view()
    map.update(state({ selected: 'b', visible: new Set(['c', 'b', 'a']) }))
    expect(map.view()).toEqual(before)
  })
})

describe('language', () => {
  it('keeps the same Start points and swaps their text', () => {
    map.update(state())
    const before = startPoint('Trail a')
    map.update(state({ lang: 'ar' }))
    const after = startPoint('مسار a')
    expect(after).toBe(before)
  })

  it('keeps an open popup open, now in the new language', () => {
    map.update(state())
    map.update(state({ selected: 'b' }))
    map.update(state({ selected: 'b', lang: 'ar' }))
    expect(popupText()).toContain('مسار b')
    expect(popupText()).toContain('ar:link.darb')
  })

  it('relabels the controls and the Source credit', () => {
    map.update(state())
    expect(el.querySelector('.locate a')!.getAttribute('title')).toBe('en:locate.button')
    expect(el.textContent).toContain('Trails: KSRNR · Darb')
    map.update(state({ lang: 'ar' }))
    expect(el.querySelectorAll('.locate')).toHaveLength(1)
    expect(el.querySelector('.locate a')!.getAttribute('title')).toBe('ar:locate.button')
    expect(el.textContent).toContain('المسارات')
    expect(el.textContent).not.toContain('Trails: KSRNR · Darb')
  })
})

describe("the visitor's location", () => {
  const ME = { pos: [25, 45] as [number, number], accuracy: 30 }
  const locateButton = () => el.querySelector('.locate a')!

  it('draws a dot and an accuracy ring, and removes them when the fix is lost', () => {
    map.update(state({ me: ME }))
    expect(el.querySelector('.me')).not.toBeNull()
    expect(el.querySelector('.me-ring')).not.toBeNull()
    map.update(state({ me: null }))
    expect(el.querySelector('.me')).toBeNull()
  })

  it('locate with a fix flies there and tells the caller', () => {
    map.update(state({ me: ME }))
    click(locateButton())
    expect(map.view().center).toEqual([25, 45])
    expect(map.view().zoom).toBeGreaterThanOrEqual(15)
    expect(onLocate).toHaveBeenCalledOnce()
  })

  it('locate without a fix asks the caller, spins, then flies to the fix that arrives', () => {
    map.update(state())
    click(locateButton())
    expect(onLocate).toHaveBeenCalledOnce()
    map.update(state({ locating: true }))
    expect(locateButton().classList.contains('busy')).toBe(true)
    map.update(state({ locating: false, me: ME }))
    expect(locateButton().classList.contains('busy')).toBe(false)
    expect(map.view().center).toEqual([25, 45])
  })

  it('does not fly to a fix that arrives after a failed request', () => {
    map.update(state())
    map.update(state({ locating: true }))
    map.update(state({ locating: false }))
    const before = map.view()
    map.update(state({ me: ME }))
    expect(map.view()).toEqual(before)
  })

  it('ignores the button while a request is in flight', () => {
    map.update(state({ locating: true }))
    click(locateButton())
    expect(onLocate).not.toHaveBeenCalled()
  })
})

describe('the phone layout', () => {
  const recreate = (o: { covered?: () => { top: number; bottom: number }; popups?: boolean }) => {
    map.destroy()
    map = createTrailMap(el, { onSelect, onLocate, t, ...o })
  }

  it('flies a Trail to the middle of the part of the map the sheet leaves showing', () => {
    // 600px map, the bottom 300px under the sheet: the Start point should sit 150px down, not 300
    recreate({ covered: () => ({ top: 0, bottom: 300 }) })
    map.update(state())
    map.update(state({ selected: 'b' }))
    const { center, zoom } = map.view()
    expect(zoom).toBe(13)
    expect(center[1]).toBeCloseTo(46.6, 5)
    expect(center[0]).toBeLessThan(24.7) // the centre drops south, lifting the point above the sheet
    const px = L.CRS.EPSG3857.latLngToPoint(L.latLng(24.7, 46.6), 13).y - L.CRS.EPSG3857.latLngToPoint(L.latLng(...center), 13).y
    expect(px).toBeCloseTo(-150, 0)
  })

  it('reads the covered edges at each move, so a resized sheet is followed', () => {
    let bottom = 0
    recreate({ covered: () => ({ top: 0, bottom }) })
    map.update(state())
    bottom = 400
    map.update(state({ selected: 'b' }))
    expect(map.view().center[0]).toBeLessThan(24.7)
  })

  it('opens no popup when the page shows the selected Trail itself', () => {
    recreate({ popups: false })
    map.update(state())
    map.update(state({ selected: 'b' }))
    expect(popupText()).toBeNull()
    map.update(state({ selected: 'b', lang: 'ar' }))
    expect(popupText()).toBeNull()
  })
})

describe('satellite imagery', () => {
  it('swaps Esri for the loaded imagery', async () => {
    map.destroy()
    const sat = L.tileLayer('https://sat.test/{z}/{x}/{y}.png')
    map = createTrailMap(el, { onSelect, onLocate, t, loadSatellite: () => Promise.resolve(sat) })
    map.update(state())
    await Promise.resolve()
    await Promise.resolve()
    const srcs = [...el.querySelectorAll<HTMLImageElement>('img.leaflet-tile')].map((i) => i.src)
    expect(srcs.some((s) => s.includes('sat.test'))).toBe(true)
    expect(srcs.some((s) => s.includes('arcgisonline'))).toBe(false)
  })

  it('keeps Esri when loading fails', async () => {
    map.destroy()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    map = createTrailMap(el, { onSelect, onLocate, t, loadSatellite: () => Promise.reject(new Error('no key')) })
    map.update(state())
    await new Promise((r) => setTimeout(r))
    expect([...el.querySelectorAll<HTMLImageElement>('img.leaflet-tile')].some((i) => i.src.includes('arcgisonline'))).toBe(true)
    expect(warn).toHaveBeenCalled()
  })
})

