import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import data from './data/trails.json'
import TrailMap from './TrailMap'
import PhoneLayout from './PhoneLayout'
import { Chips, Svg, TrailLinks, type FilterGroup, type Sort } from './parts'
import { LOCKUP_SVG } from './lockup'
import { rememberLang } from './i18n'
import { difficultyRank, duration, fold, haystack, km, num, pick } from './format'
import { useMyLocation } from './useMyLocation'
import type { Difficulty, Lang, Routes, SourceId, Trail, TrailData } from './types'

const DATA = data as unknown as TrailData
/** KSRNR and Asir stay hidden unless the page is opened with ?dev=true (hidden, not secret: the data ships either way) */
const DEV = new URLSearchParams(location.search).get('dev') === 'true'
const SOURCES: SourceId[] = DEV ? ['ksrnr', 'darb', 'asir'] : ['darb']
const TRAILS = DATA.trails.filter((t) => SOURCES.includes(t.source))
const LEVELS: Difficulty[] = ['easy', 'moderate', 'hard']
/** phones get the map with a bottom sheet; wider screens, the register beside the map */
const PHONE = '(max-width: 900px)'
function usePhone() {
  const [phone, setPhone] = useState(() => matchMedia(PHONE).matches)
  useEffect(() => {
    const mq = matchMedia(PHONE)
    const on = () => setPhone(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return phone
}

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
  // Source, region and difficulty fold behind an Advanced search button
  const [filtersOpen, setFiltersOpen] = useState(false)
  const me = useMyLocation()
  const phone = usePhone()
  // the distance sort was picked and is waiting on a first fix, or couldn't get one
  const [nearState, setNearState] = useState<'idle' | 'locating' | 'failed'>('idle')

  useEffect(() => {
    fetch("/data/trail-routes.json")
      .then((r) => (r.ok ? r.json() : {}))
      .then((r: Routes) => setRoutes(Object.fromEntries(Object.entries(r).filter(([id]) => TRAILS.some((t) => t.id === id)))))
      .catch(() => setRoutes({}))
  }, [])

  const chooseSort = async (next: Sort) => {
    setSort(next)
    setNearState('idle')
    if (next !== 'near' || me.pos) return
    setNearState('locating')
    const r = await me.locateOnce()
    setNearState(Array.isArray(r) ? 'idle' : 'failed')
  }

  // a ?trail= link: bring its entry into view in the list too
  useEffect(() => {
    // on phones the sheet shows the selected Trail itself
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
    if (sort === 'near' && me.pos) {
      const away = (tr: Trail) => (tr.start ? km(me.pos!, tr.start) : Infinity)
      list.sort((a, b) => away(a) - away(b))
    }
    return list
  }, [q, src, reg, lvl, sort, me.pos])

  const visible = useMemo(() => new Set(shown.map((x) => x.id)), [shown])
  const mapped = shown.filter((x) => x.start).length
  const regionCount = new Set(shown.map((x) => x.region.ar)).size
  const count = (s: SourceId) => TRAILS.filter((x) => x.source === s).length
  const date = (s: SourceId) => {
    const d = DATA.sources[s].asOf
    return d ? new Date(d + 'T12:00:00Z').toLocaleDateString(lang === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
  }
  const anyOurs = TRAILS.some((x) => x.nameEnOurs)
  const active = [src, reg, lvl].filter(Boolean).length
  const clearFilters = () => {
    setSrc(null)
    setReg(null)
    setLvl(null)
  }
  const deselect = () => {
    setSelected(null)
    setParam('trail', null)
  }
  const sorts: [Sort, string][] = [
    ['default', t(SOURCES.length > 1 ? 'filters.sortDefault' : 'filters.sortPlain')],
    ['near', t('filters.sortNear')],
    ['short', t('filters.sortShort')],
    ['long', t('filters.sortLong')],
    ['easy', t('filters.sortEasy')],
  ]
  const sortNote = sort === 'near' && nearState !== 'idle' ? t(nearState === 'locating' ? 'filters.locating' : 'filters.noLocation') : null

  // Advanced search, once for both layouts; Source only when more than one is shown
  const groups: FilterGroup[] = [
    ...(SOURCES.length > 1
      ? [{ key: 'src', label: t('filters.source'), value: src, options: SOURCES.map((s): [string, string] => [s, t(`source.${s}`)]), onChange: (v: string | null) => setSrc(v as SourceId | null) }]
      : []),
    { key: 'reg', label: t('filters.region'), value: reg, options: regions.map((r): [string, string] => [r.ar, pick(r, lang)]), onChange: setReg },
    { key: 'lvl', label: t('filters.difficulty'), value: lvl, options: LEVELS.map((d): [string, string] => [d, t(`difficulty.${d}`)]), onChange: (v: string | null) => setLvl(v as Difficulty | null) },
  ]

  const filterChips = (
    <>
      {groups.map((g) => (
        <Chips key={g.key} label={g.label} all={t('filters.all')} value={g.value} onChange={g.onChange} options={g.options} />
      ))}
      {active > 0 && (
        <button type="button" className="clear" onClick={clearFilters}>
          {t('filters.clear')}
        </button>
      )}
    </>
  )

  const colophon = (
    <footer className="colophon">
      <h3>{t('about.heading')}</h3>
      {SOURCES.map((s) => (
        <p key={s} dangerouslySetInnerHTML={{ __html: t(`about.${s}`, { count: num(lang, count(s)), date: date(s) }) }} />
      ))}
      {TRAILS.some((tr) => tr.pageOf === 'schf') && <p dangerouslySetInnerHTML={{ __html: t('about.schf') }} />}
      <p>{t('about.gaps')}</p>
      {lang === 'en' && anyOurs && <p>{t('about.oursEn')}</p>}
      <p>{t('about.unofficial')}</p>
      <p dangerouslySetInnerHTML={{ __html: t('about.by') }} />
    </footer>
  )

  if (phone)
    return (
      <PhoneLayout
        trails={TRAILS}
        shown={shown}
        visible={visible}
        routes={routes}
        me={me}
        q={q}
        setQ={setQ}
        sort={sort}
        sorts={sorts}
        chooseSort={chooseSort}
        sortNote={sortNote}
        active={active}
        groups={groups}
        clearFilters={clearFilters}
        colophon={colophon}
        selected={selected}
        select={select}
        deselect={deselect}
        switchLang={switchLang}
        regionCount={regionCount}
      />
    )

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
          <div className="search-row">
            <label className="search">
              <span className="sr-only">{t('filters.searchLabel')}</span>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('filters.search')} />
            </label>
            <button
              type="button"
              className="ftoggle"
              aria-expanded={filtersOpen}
              aria-controls="filter-more"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              {t('filters.toggle')}
              {active > 0 && <span className="badge">{num(lang, active)}</span>}
            </button>
          </div>
          <div id="filter-more" className={`more${filtersOpen ? ' open' : ''}`}>
            {filterChips}
          </div>
          <label className="sort">
            <span className="label">{t('filters.sort')}</span>
            <select value={sort} onChange={(e) => chooseSort(e.target.value as Sort)}>
              {sorts.map(([s, label]) => (
                <option key={s} value={s}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {sortNote && (
            <p className="note" role="status">
              {sortNote}
            </p>
          )}
        </div>

        <div id="list">
          {shown.length === 0 && <p className="empty">{t('empty')}</p>}
          {shown.map((tr) => (
            <TrailItem
              key={tr.id}
              tr={tr}
              lang={lang}
              on={tr.id === selected}
              hasRoute={Boolean(routes[tr.id]?.length)}
              awayKm={sort === 'near' && me.pos && tr.start ? km(me.pos, tr.start) : null}
              onSelect={() => select(tr.id)}
            />
          ))}
        </div>

        {colophon}
      </aside>

      <TrailMap trails={TRAILS} visible={visible} selected={selected} routes={routes} onSelect={select} me={me} />
    </div>
  )
}

function TrailItem(props: { tr: Trail; lang: Lang; on: boolean; hasRoute: boolean; awayKm: number | null; onSelect: () => void }) {
  const { tr, lang, on, hasRoute, awayKm, onSelect } = props
  const { t } = useTranslation()
  const other: Lang = lang === 'ar' ? 'en' : 'ar'
  const secondary = tr.name[other]
  const place = [pick(tr.region, lang), pick(tr.city, lang)].filter(Boolean).join(' · ')
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
        {awayKm != null && (
          <i title={t('stat.away')}>
            <span className="u">⌖</span>
            {num(lang, awayKm, awayKm < 10 ? 1 : 0)}
            <span className="u">{t('unit.km')}</span>
          </i>
        )}
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
      <TrailLinks tr={tr} lang={lang} className="links" />
    </article>
  )
}
