/** Route files built in the browser from the published route lines: GPX, KML, and KMZ (a zipped KML). */

type Pt = [number, number] // [lat, lon]

const xml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!)

export function toGpx(name: string, lines: Pt[][], start: Pt | null): string {
  const wpt = start ? `  <wpt lat="${start[0]}" lon="${start[1]}"><name>${xml(name)} — start</name></wpt>\n` : ''
  const trk = lines.length
    ? `  <trk>\n    <name>${xml(name)}</name>\n${lines
        .map((l) => `    <trkseg>\n${l.map(([la, lo]) => `      <trkpt lat="${la}" lon="${lo}"/>`).join('\n')}\n    </trkseg>`)
        .join('\n')}\n  </trk>\n`
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Darb mockup" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>${xml(name)}</name></metadata>
${wpt}${trk}</gpx>
`
}

export function toKml(name: string, lines: Pt[][], start: Pt | null): string {
  // KML is lon,lat
  const pm = start
    ? `    <Placemark><name>${xml(name)} — start</name><Point><coordinates>${start[1]},${start[0]}</coordinates></Point></Placemark>\n`
    : ''
  const route = lines.length
    ? `    <Placemark>
      <name>${xml(name)}</name>
      <Style><LineStyle><color>ff3d7bf4</color><width>4</width></LineStyle></Style>
      <MultiGeometry>
${lines.map((l) => `        <LineString><tessellate>1</tessellate><coordinates>${l.map(([la, lo]) => `${lo},${la}`).join(' ')}</coordinates></LineString>`).join('\n')}
      </MultiGeometry>
    </Placemark>\n`
    : ''
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${xml(name)}</name>
${pm}${route}  </Document>
</kml>
`
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** A minimal zip with stored (uncompressed) entries — all a KMZ needs. */
export function zip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder()
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const f of files) {
    const name = enc.encode(f.name)
    const crc = crc32(f.data)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // UTF-8 names
    local.setUint32(14, crc, true)
    local.setUint32(18, f.data.length, true)
    local.setUint32(22, f.data.length, true)
    local.setUint16(26, name.length, true)
    parts.push(new Uint8Array(local.buffer), name, f.data)

    const cen = new DataView(new ArrayBuffer(46))
    cen.setUint32(0, 0x02014b50, true)
    cen.setUint16(4, 20, true)
    cen.setUint16(6, 20, true)
    cen.setUint16(8, 0x0800, true)
    cen.setUint32(16, crc, true)
    cen.setUint32(20, f.data.length, true)
    cen.setUint32(24, f.data.length, true)
    cen.setUint16(28, name.length, true)
    cen.setUint32(42, offset, true)
    central.push(new Uint8Array(cen.buffer), name)
    offset += 30 + name.length + f.data.length
  }
  const cenSize = central.reduce((s, p) => s + p.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, cenSize, true)
  end.setUint32(16, offset, true)
  const all = [...parts, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0))
  let at = 0
  for (const p of all) {
    out.set(p, at)
    at += p.length
  }
  return out
}

export const toKmz = (name: string, lines: Pt[][], start: Pt | null) =>
  zip([{ name: 'doc.kml', data: new TextEncoder().encode(toKml(name, lines, start)) }])

export function saveFile(filename: string, data: string | Uint8Array, type: string) {
  const blob = new Blob([data as BlobPart], { type })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
