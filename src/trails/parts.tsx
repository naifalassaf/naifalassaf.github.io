import { useTranslation } from 'react-i18next'
import type { Lang, Trail } from './types'

/** Shared by the desktop register and the phone sheet. */

export type Sort = 'default' | 'short' | 'long' | 'easy' | 'near'

/** one Advanced search filter (Source, region or difficulty), as data */
export interface FilterGroup {
  key: string
  label: string
  value: string | null
  options: [string, string][]
  onChange: (v: string | null) => void
}

const Icon = {
  dist: <path d="M3 12h18M4 7v10M20 7v10" />,
  elev: <path d="M4 21h16M12 18V6M7 11l5-5 5 5" />,
  time: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  route: <path d="M5 19c4 0 3-6 7-6s3-6 7-6" />,
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  // Shapes: a ring with an arrowhead, a there-and-back pair of arrows, a single arrow (drawn left to right; RTL flips it)
  loop: <path d="M19 12a7 7 0 1 1-2.05-4.95M19 4v4h-4" />,
  'out-and-back': <path d="M4 9h15M15 5l4 4M20 15H5M9 19l-4-4" />,
  'one-way': <path d="M4 12h15M14 7l5 5-5 5" />,
}
export const Svg = ({ k }: { k: keyof typeof Icon }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
    {Icon[k]}
  </svg>
)

export function Chips<V extends string>(props: {
  label: string
  all: string
  value: V | null
  onChange: (v: V | null) => void
  options: [V, string][]
}) {
  const { label, all, value, onChange, options } = props
  return (
    <div role="group" aria-label={label}>
      <div className="label">{label}</div>
      <div className="grp">
        <button type="button" aria-pressed={value === null} onClick={() => onChange(null)}>
          {all}
        </button>
        {options.map(([v, text]) => (
          <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(value === v ? null : v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * A Trail's outbound links: its Source's page, the route file, and Google Maps (its Start point,
 * or a search when none is published). `mapsFirst` leads with Maps as the main action.
 */
export function TrailLinks({ tr, lang, className, mapsFirst }: { tr: Trail; lang: Lang; className: string; mapsFirst?: boolean }) {
  const { t } = useTranslation()
  const q = encodeURIComponent(`${tr.name.ar} ${tr.city?.ar || tr.region.ar}`)
  const maps = (
    <a
      key="maps"
      className={mapsFirst ? 'primary' : undefined}
      href={`https://www.google.com/maps/search/?api=1&query=${tr.start ? `${tr.start[0]},${tr.start[1]}` : q}`}
      target="_blank"
      rel="noopener"
    >
      {t(tr.start ? 'link.gmaps' : 'link.search')}
    </a>
  )
  const page = (
    <a key="page" href={tr.page[lang]} target="_blank" rel="noopener">
      {t(`link.${tr.pageOf ?? tr.source}`)}
    </a>
  )
  const kml = tr.download && (
    <a key="kml" href={tr.download} target="_blank" rel="noopener">
      {t('link.kml')}
    </a>
  )
  const none = !tr.start && (
    <span key="none" className="none">
      {t('noStart')}
    </span>
  )
  return (
    <div className={className} onClick={(e) => e.stopPropagation()}>
      {mapsFirst ? [maps, page, kml, none] : [page, kml, maps, none]}
    </div>
  )
}
