import { describe, expect, it } from 'vitest'
import { crc32, toGpx, toKml, toKmz, zip } from './exports'

const line: [number, number][] = [
  [24.1, 46.2],
  [24.2, 46.3],
]

describe('route files', () => {
  it('GPX lists track points as lat/lon and escapes the name', () => {
    const g = toGpx('Tom & Jerry', [line], [24.1, 46.2])
    expect(g).toContain('<trkpt lat="24.1" lon="46.2"/>')
    expect(g).toContain('<wpt lat="24.1" lon="46.2">')
    expect(g).toContain('Tom &amp; Jerry')
  })

  it('GPX with no route holds only the start waypoint', () => {
    const g = toGpx('x', [], [24.1, 46.2])
    expect(g).toContain('<wpt')
    expect(g).not.toContain('<trk>')
  })

  it('KML writes coordinates as lon,lat', () => {
    expect(toKml('x', [line], null)).toContain('46.2,24.1 46.3,24.2')
  })

  it('crc32 matches the standard check value', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })

  it('zip and KMZ start with a local header and end with the end record', () => {
    const z = zip([{ name: 'a.txt', data: new TextEncoder().encode('hi') }])
    expect([...z.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04])
    const dv = new DataView(z.buffer)
    expect(dv.getUint32(z.length - 22, true)).toBe(0x06054b50)
    const k = toKmz('x', [line], null)
    expect(new TextDecoder().decode(k)).toContain('doc.kml')
  })
})
