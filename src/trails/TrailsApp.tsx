import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import data from './data/trails.json'
import TrailMap from './TrailMap'
import { LOCKUP_SVG } from './lockup'
import { rememberLang } from './i18n'
import { difficultyRank, duration, fold, haystack, num, pick } from './format'
import type { Difficulty, Lang, Routes, SourceId, Trail, TrailData } from './types'

const DATA = data as unknown as TrailData
const TRAILS = DATA.trails
const SOURCES: SourceId[] = ['ksrnr', 'darb']
const LEVELS: Difficulty[] = ['easy', 'moderate', 'hard']
type Sort = 'default' | 'short' | 'long' | 'easy'

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
}
const Svg = ({ k }: { k: keyof typeof Icon }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
    {Icon[k]}
  </svg>
)

function initialTrail() {
  const id = new URLSearchParams(location.search).get('trail')
  return id && TRAILS.some((t) => t.id === id) ? id : null
}

function setParam(key: string, value: string | null) {
  const u = new URL(location.href)
  if (value) u.searchParams.set(key, value)
  else u.searchParams.delete(key)
  history.replaceState(null, '', u)
}

export default function TrailsApp() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const [routes, setRoutes] = useState<Routes>({})
  const [q, setQ] = useState('')
  const [src, setSrc] = useState<SourceId | null>(null)
  const [reg, setReg] = useState<string | null>(null)
  const [lvl, setLvl] = useState<Difficulty | null>(null)
  const [sort, setSort] = useState<Sort>('default')
  const [selected, setSelected] = useState<string | null>(initialTrail)

  useEffect(() => {
    fetch("/data/trail-routes.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then(setRoutes)
      .catch(() => setRoutes({}))
  }, [])

  // a ?trail= link: bring its entry into view in the list too
  useEffect(() => {
    // desktop only: on phones the map sits above the list and should stay in view
    if (selected && matchMedia('(min-width: 901px)').matches)
      document.getElementById(`trail-${selected}`)?.scrollIntoView({ block: 'center' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.title = t('docTitle')
  }, [lang, t])

  const switchLang = () => {
    const next: Lang = lang === 'ar' ? 'en' : 'ar'
    i18n.changeLanguage(next)
    rememberLang(next)
    setParam('lang', next === 'ar' ? null : 'en')
  }

  const select = (id: string) => {
    setSelected(id)
    setParam('trail', id)
    document.getElementById(`trail-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const regions = useMemo(() => {
    const seen = new Map<string, Trail['region']>()
    TRAILS.forEach((tr) => seen.set(tr.region.ar, tr.region))
    return [...seen.values()].sort((a, b) => pick(a, lang).localeCompare(pick(b, lang), lang))
  }, [lang])

  const shown = useMemo(() => {
    const needle = fold(q)
    const list = TRAILS.filter(
      (tr) =>
        (!src || tr.source === src) &&
        (!reg || tr.region.ar === reg) &&
        (!lvl || tr.difficulty === lvl) &&
        (!needle || haystack(tr).includes(needle)),
    )
    const len = (tr: Trail, dir: 1 | -1) => (tr.lengthKm == null ? Infinity : dir * tr.lengthKm)
    if (sort === 'short') list.sort((a, b) => len(a, 1) - len(b, 1))
    if (sort === 'long') list.sort((a, b) => len(a, -1) - len(b, -1))
    if (sort === 'easy') list.sort((a, b) => difficultyRank(a) - difficultyRank(b) || len(a, 1) - len(b, 1))
    return list
  }, [q, src, reg, lvl, sort])

  const visible = useMemo(() => new Set(shown.map((x) => x.id)), [shown])
  const mapped = shown.filter((x) => x.start).length
  const regionCount = new Set(shown.map((x) => x.region.ar)).size
  const count = (s: SourceId) => TRAILS.filter((x) => x.source === s).length
  const date = (s: SourceId) => {
    const d = DATA.sources[s].asOf
    return d ? new Date(d + 'T12:00:00Z').toLocaleDateString(lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  }
  const anyOurs = TRAILS.some((x) => x.nameEnOurs)

  return (
    <div className="shell">
      <aside>
        <header className="masthead">
          <span className="lockup" role="img" aria-label={t('brand')} dangerouslySetInnerHTML={{ __html: LOCKUP_SVG }} />
          <span className="mast-text">
            <h1>{t('title')}</h1>
            <p>{t('subtitle')}</p>
          </span>
          <button type="button" className="lang" onClick={switchLang} lang={lang === 'ar' ? 'en' : 'ar'}>
            {t('switchLang')}
          </button>
        </header>

        <div className="tally" aria-live="polite">
          <div>
            <b>{num(lang, shown.length)}</b>
            <span>{t('tally.trails')}</span>
          </div>
          <div>
            <b>{num(lang, mapped)}</b>
            <span>{t('tally.mapped')}</span>
          </div>
          <div>
            <b>{num(lang, regionCount)}</b>
            <span>{t('tally.regions')}</span>
          </div>
        </div>

        <div className="filters">
          <label className="search">
            <span className="sr-only">{t('filters.searchLabel')}</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('filters.search')} />
          </label>
          <Chips label={t('filters.source')} all={t('filters.all')} value={src} onChange={setSrc} options={SOURCES.map((s) => [s, t(`source.${s}`)])} />
          <Chips label={t('filters.region')} all={t('filters.all')} value={reg} onChange={setReg} options={regions.map((r) => [r.ar, pick(r, lang)])} />
          <Chips label={t('filters.difficulty')} all={t('filters.all')} value={lvl} onChange={setLvl} options={LEVELS.map((d) => [d, t(`difficulty.${d}`)])} />
          <label className="sort">
            <span className="label">{t('filters.sort')}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="default">{t('filters.sortDefault')}</option>
              <option value="short">{t('filters.sortShort')}</option>
              <option value="long">{t('filters.sortLong')}</option>
              <option value="easy">{t('filters.sortEasy')}</option>
            </select>
          </label>
        </div>

        <div id="list">
          {shown.length === 0 && <p className="empty">{t('empty')}</p>}
          {shown.map((tr) => (
            <TrailItem key={tr.id} tr={tr} lang={lang} on={tr.id === selected} hasRoute={Boolean(routes[tr.id]?.length)} onSelect={() => select(tr.id)} />
          ))}
        </div>

        <footer className="colophon">
          <h3>{t('about.heading')}</h3>
          <p dangerouslySetInnerHTML={{ __html: t('about.ksrnr', { count: num(lang, count('ksrnr')), date: date('ksrnr') }) }} />
          <p dangerouslySetInnerHTML={{ __html: t('about.darb', { count: num(lang, count('darb')), date: date('darb') }) }} />
          <p>{t('about.gaps')}</p>
          {lang === 'en' && anyOurs && <p>{t('about.oursEn')}</p>}
          <p>{t('about.unofficial')}</p>
          <p dangerouslySetInnerHTML={{ __html: t('about.by') }} />
        </footer>
      </aside>

      <TrailMap trails={TRAILS} visible={visible} selected={selected} routes={routes} onSelect={select} />
    </div>
  )
}

function Chips<V extends string>(props: {
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

function TrailItem({ tr, lang, on, hasRoute, onSelect }: { tr: Trail; lang: Lang; on: boolean; hasRoute: boolean; onSelect: () => void }) {
  const { t } = useTranslation()
  const other: Lang = lang === 'ar' ? 'en' : 'ar'
  const secondary = tr.name[other]
  const place = [pick(tr.region, lang), pick(tr.city, lang)].filter(Boolean).join(' · ')
  const q = encodeURIComponent(`${tr.name.ar} ${tr.city?.ar || tr.region.ar}`)
  const u = { h: t('unit.h'), min: t('unit.min') }
  return (
    <article
      id={`trail-${tr.id}`}
      className={`item${on ? ' on' : ''}`}
      tabIndex={0}
      aria-current={on || undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <h2>
        <span className="n">
          {pick(tr.name, lang)}
          {lang === 'en' && tr.nameEnOurs && <sup title={t('about.oursEn')}>*</sup>}
        </span>
        {tr.difficulty && <span className={`pill ${tr.difficulty}`}>{t(`difficulty.${tr.difficulty}`)}</span>}
      </h2>
      {secondary && (
        <p className="alt" lang={other} dir={other === 'ar' ? 'rtl' : 'ltr'}>
          {secondary}
        </p>
      )}
      <p className="place">
        <span className="src">{t(`source.${tr.source}`)}</span> · {place}
      </p>
      <div className="data">
        {tr.lengthKm != null && (
          <i title={t('stat.length')}>
            <Svg k="dist" />
            {num(lang, tr.lengthKm)}
            <span className="u">{t('unit.km')}</span>
          </i>
        )}
        {tr.highM != null && (
          <i title={t('stat.high')}>
            <Svg k="elev" />
            {num(lang, tr.highM, 0)}
            <span className="u">{t('unit.m')}</span>
          </i>
        )}
        {tr.gainM != null && (
          <i title={t('stat.gain')}>
            <span className="u">↗</span>
            {num(lang, tr.gainM, 0)}
            <span className="u">{t('unit.m')}</span>
          </i>
        )}
        {tr.duration && (
          <i title={t('stat.time')}>
            <Svg k="time" />
            {duration(tr.duration, lang, u)}
          </i>
        )}
        {hasRoute && (
          <i>
            <Svg k="route" />
            <span className="u">{t('route')}</span>
          </i>
        )}
      </div>
      <div className="links" onClick={(e) => e.stopPropagation()}>
        <a href={tr.page[lang]} target="_blank" rel="noopener">
          {t(`link.${tr.source}`)}
        </a>
        {tr.download && (
          <a href={tr.download} target="_blank" rel="noopener">
            {t('link.kml')}
          </a>
        )}
        {tr.start ? (
          <a href={`https://www.google.com/maps/search/?api=1&query=${tr.start[0]},${tr.start[1]}`} target="_blank" rel="noopener">
            {t('link.gmaps')}
          </a>
        ) : (
          <>
            <a href={`https://www.google.com/maps/search/?api=1&query=${q}`} target="_blank" rel="noopener">
              {t('link.search')}
            </a>
            <span className="none">{t('noStart')}</span>
          </>
        )}
      </div>
    </article>
  )
}
