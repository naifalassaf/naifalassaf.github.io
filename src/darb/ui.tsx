import { createContext, useContext, type ReactNode } from 'react'
import { REQS, STRINGS, type Lang } from './strings'

interface Ui {
  lang: Lang
  s: (typeof STRINGS)['ar']
  showReqs: boolean
}
export const UiContext = createContext<Ui>({ lang: 'ar', s: STRINGS.ar, showReqs: true })
export const useUi = () => useContext(UiContext)

/** A numbered marker tying a spot on the page to an item in Darb's brief. */
export function Req({ n }: { n: number }) {
  const { lang, showReqs } = useUi()
  if (!showReqs) return null
  const r = REQS.find((x) => x.n === n)!
  return (
    <span className="req" data-req={n} title={r[lang]} aria-label={r[lang]}>
      {n}
    </span>
  )
}

const PATHS = {
  search: <path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.3-4.3" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  dist: <path d="M4 17c3-6 6 2 9-4s4-6 7-6M4 17h.01M20 7h.01" />,
  time: <path d="M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />,
  up: <path d="m3 18 6-7 4 4 8-9M15 6h6v6" />,
  peak: <path d="m3 20 7-12 4 6 2-3 5 9H3Z" />,
  low: <path d="M3 8h18M6 12l6 6 6-6" />,
  level: <path d="M5 20v-5M12 20V10M19 20V4" />,
  pin: <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  share: <path d="M8 12h.01M16 6h.01M16 18h.01M9.5 11l5-3.5M9.5 13l5 3.5M8 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm8-6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm0 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />,
  download: <path d="M12 4v11m0 0 4.5-4.5M12 15l-4.5-4.5M5 20h14" />,
  nav: <path d="M3 11 21 3l-8 18-2-8-8-2Z" />,
  copy: <path d="M9 9h10v11H9zM5 15V4h10" />,
  shield: <path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6l-8-3Zm-3.5 9 2.5 2.5 4.5-5" />,
  map: <path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14" />,
  list: <path d="M4 6h16M4 12h16M4 18h16" />,
  grid: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  split: <path d="M4 4h16v16H4zM11 4v16" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chev: <path d="m9 6 6 6-6 6" />,
  loc: <path d="M12 2v3m0 14v3M2 12h3m14 0h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />,
  check: <path d="m5 12 5 5 9-10" />,
  photo: <path d="M4 6h16v12H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01" />,
}
export type IconName = keyof typeof PATHS
export const Icon = ({ k, size = 20 }: { k: IconName; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="ic">
    {PATHS[k]}
  </svg>
)

/** small deterministic RNG so each Trail always gets the same placeholder scene */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353) >>> 0
  return () => {
    h = (h + 0x6d2b79f5) >>> 0
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SKIES = [
  ['#f6d6a8', '#e9a46c', '#b65d3a'], // dusk
  ['#cfe3ef', '#e9eef0', '#f3e4cc'], // morning
  ['#9fc4dd', '#d7e6ec', '#eedcbf'], // noon
  ['#f4c9a0', '#f1dcc0', '#cfd9da'], // dawn
]
const RIDGES = [
  ['#c9a27a', '#a8774f', '#7c5235', '#4f3424'],
  ['#b9a58b', '#94795d', '#6c5643', '#3f3329'],
  ['#d3b48e', '#b38a60', '#8a6141', '#5a3d2a'],
]

/** Illustrated stand-in for a trail photo: sky, three ridges, foreground. */
export function Scenery({ seed, label, children }: { seed: string; label?: string; children?: ReactNode }) {
  const r = rng(seed)
  const sky = SKIES[Math.floor(r() * SKIES.length)]
  const rid = RIDGES[Math.floor(r() * RIDGES.length)]
  const ridge = (base: number, amp: number, steps: number) => {
    let d = `M0 ${base}`
    for (let i = 0; i <= steps; i++) d += ` L${(i / steps) * 400} ${base - r() * amp}`
    return d + ' L400 300 L0 300 Z'
  }
  const sunX = 60 + r() * 280
  const id = `g${seed.replace(/[^a-z0-9]/gi, '')}`
  return (
    <div className="scenery">
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky[0]} />
            <stop offset=".6" stopColor={sky[1]} />
            <stop offset="1" stopColor={sky[2]} />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill={`url(#${id})`} />
        <circle cx={sunX} cy={70 + r() * 40} r={16 + r() * 10} fill="#fff6e2" opacity=".85" />
        <path d={ridge(150, 60, 7)} fill={rid[0]} opacity=".55" />
        <path d={ridge(190, 70, 9)} fill={rid[1]} opacity=".8" />
        <path d={ridge(235, 55, 12)} fill={rid[2]} />
        <path d={ridge(280, 25, 16)} fill={rid[3]} />
      </svg>
      {label && <span className="ph-label">{label}</span>}
      {children}
    </div>
  )
}
