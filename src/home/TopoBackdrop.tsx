import { useEffect, useRef } from 'react'
import { contourRings } from './contours'

// three peaks; `depth` is how far each layer drifts with the pointer
const PEAKS = [
  { rings: contourRings(980, 300, 14, 34, 1.3), depth: 28 },
  { rings: contourRings(1320, 640, 9, 30, 4.1, 0.7), depth: 18 },
  { rings: contourRings(260, 760, 7, 38, 2.2, 0.8), depth: 12 },
]

const drift = (depth: number) => ({
  transform: `translate(calc(var(--px, 0) * ${depth}px), calc(var(--py, 0) * ${depth}px))`,
  transition: 'transform 0.6s ease-out',
})

/** Decorative contour rings (generated, not a real map), drifting gently with the cursor. The summit label is Riyadh's elevation, 612 m. */
export default function TopoBackdrop() {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const on = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        ref.current?.style.setProperty('--px', String(e.clientX / innerWidth - 0.5))
        ref.current?.style.setProperty('--py', String(e.clientY / innerHeight - 0.5))
      })
    }
    addEventListener('pointermove', on)
    return () => {
      removeEventListener('pointermove', on)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <svg
      ref={ref}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    >
      {PEAKS.map((pk, j) => (
        <g key={j} style={drift(pk.depth)}>
          {pk.rings.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={i === pk.rings.length - 4 && j === 0 ? 'var(--contour-strong)' : 'var(--contour)'}
              strokeWidth={i % 5 === 4 ? 1.6 : 1}
            />
          ))}
        </g>
      ))}
      <g style={drift(28)}>
        <path d="M980 288 l9 15 h-18 z" fill="var(--accent)" />
        <text x="996" y="303" className="mono" fontSize="12" fill="var(--muted)">
          612 m
        </text>
      </g>
    </svg>
  )
}
