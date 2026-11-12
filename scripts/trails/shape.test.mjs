import { describe, expect, it } from 'vitest'
import { routeShape } from './build-data.mjs'

// lines of [lat, lon] near Hail; 0.001° of latitude ≈ 111 m
const at = (dLat, dLon) => [27.5 + dLat, 41.6 + dLon]
const straight = (from, to, n = 20) => Array.from({ length: n + 1 }, (_, i) => at(from[0] + ((to[0] - from[0]) * i) / n, from[1] + ((to[1] - from[1]) * i) / n))

describe('routeShape', () => {
  it('is null with no Route', () => {
    expect(routeShape(undefined, 5)).toBeNull()
    expect(routeShape([], 5)).toBeNull()
  })

  it('calls a line that ends far from its start one-way', () => {
    expect(routeShape([straight([0, 0], [0.05, 0])], 5.5)).toBe('one-way')
  })

  it('calls a one-direction line out-and-back when the published length is about double', () => {
    // 2.8 km drawn, 6 km published (Darb's "6 كم ذهاب وعودة")
    expect(routeShape([straight([0, 0], [0.025, 0])], 6)).toBe('out-and-back')
  })

  it('calls a closed line that comes back the way it went out-and-back', () => {
    const out = straight([0, 0], [0.02, 0])
    const back = out.slice().reverse().map(([a, b]) => [a, b + 0.0001]) // ~10 m to the side
    expect(routeShape([[...out, ...back]], 4.4)).toBe('out-and-back')
  })

  it('calls a closed line that comes back another way a loop', () => {
    const ring = [...straight([0, 0], [0.01, 0]), ...straight([0.01, 0], [0.01, 0.01]), ...straight([0.01, 0.01], [0, 0.01]), ...straight([0, 0.01], [0, 0])]
    expect(routeShape([ring], 4.4)).toBe('loop')
  })

  it('reads a Route drawn in several pieces as one line', () => {
    const out = straight([0, 0], [0.02, 0])
    const back = out.slice().reverse()
    expect(routeShape([out.slice(0, 11), out.slice(10), back], 4.4)).toBe('out-and-back')
  })
})
