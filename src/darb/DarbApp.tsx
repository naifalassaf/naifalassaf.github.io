import { useEffect, useMemo, useRef, useState } from 'react'
import type { Difficulty, Routes, Trail } from '../trails/types'
import { difficultyRank, duration, fold, haystack, km, num, pick } from '../trails/format'
import { REQS, STRINGS, fill, type Lang } from './strings'
import { Icon, Req, Scenery, UiContext, useUi } from './ui'
import DarbMap, { type Base } from './DarbMap'
import TrailPage from './TrailPage'
import { TRAILS } from './data'


export type Sort = 'default' | 'near' | 'short' | 'long' | 'easy' | 'hard' | 'gain'
type Bucket = 'short' | 'mid' | 'long'
type View = 'grid' | 'split' | 'map'

export interface ListState {
  q: string
  region: string | null
  levels: Difficulty[]
  len: Bucket | null
  dur: Bucket | null
  withRoute: boolean
  sort: Sort
  view: View
}
const EMPTY: ListState = { q: '', region: null, levels: [], len: null, dur: null, withRoute: false, sort: 'default', view: 'split' }

function useRoute() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  const m = hash.match(/^#\/trail\/([^?]+)/)
  return m ? { page: 'trail' as const, id: decodeURIComponent(m[1]) } : { page: 'list' as const }
}

function initialLang(): Lang {
  try {
    const q = new URLSearchParams(location.search).get('lang')
    if (q === 'en' || q === 'ar') return q
    return localStorage.getItem('darb.lang') === 'en' ? 'en' : 'ar'
  } catch {
    return 'ar'
  }
}

export function useRoutes() {
  const [routes, setRoutes] = useState<Routes>({})
  useEffect(() => {
    fetch('/data/trail-routes.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then((r: Routes) => setRoutes(Object.fromEntries(Object.entries(r).filter(([id]) => id.startsWith('darb-')))))
      .catch(() => setRoutes({}))
  }, [])
  return routes
}

export function useMe() {
  const [pos, setPos] = useState<[number, number] | null>(null)
  const locate = () =>
    new Promise<[number, number] | null>((res) => {
      if (!navigator.geolocation) return res(null)
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const v: [number, number] = [p.coords.latitude, p.coords.longitude]
          setPos(v)
          res(v)
        },
        () => res(null),
        { timeout: 10000, maximumAge: 300000 },
      )
    })
  return { pos, locate }
}

export default function DarbApp() {
  const [lang, setLang] = useState<Lang>(initialLang)
  const [showReqs, setShowReqs] = useState(true)
  const [panel, setPanel] = useState(false)
  const s = STRINGS[lang]
  const route = useRoute()
  const routes = useRoutes()
  const me = useMe()
  const [list, setList] = useState<ListState>(EMPTY)
  const [base, setBase] = useState<Base>('topo')

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.title = s.docTitle
  }, [lang, s])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route.page, route.page === 'trail' ? route.id : ''])

  const switchLang = () => {
    const next: Lang = lang === 'ar' ? 'en' : 'ar'
    setLang(next)
    try {
      localStorage.setItem('darb.lang', next)
    } catch {
      /* private mode */
    }
  }

  /** Brief panel: go to the page that shows item n and flash its marker */
  const goToReq = (n: number) => {
    const r = REQS.find((x) => x.n === n)!
    setPanel(false)
    setShowReqs(true)
    if (r.where === 'trail' && route.page !== 'trail') {
      const demo = TRAILS.find((t) => t.hasRoute && t.difficulty) ?? TRAILS[0]
      location.hash = `#/trail/${demo.id}`
    } else if (r.where === 'list' && route.page !== 'list') location.hash = '#/'
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-req="${n}"]`)
      if (!el) return
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el.classList.remove('flash')
      void el.offsetWidth
      el.classList.add('flash')
    }, 350)
  }

  return (
    <UiContext.Provider value={{ lang, s, showReqs }}>
      <div className="mock-banner" role="note">
        {s.mockup}
      </div>
      <header className="top">
        <div className="top-in">
          <a href="#/" className="wordmark" aria-label={s.brand}>
            {/* Darb's own logo, the white-wordmark version from darb.org, for the teal bar */}
            <img src="/darb/logo-white.png" alt="" width="76" height="40" />
            <small>{s.brandSub}</small>
          </a>
          <nav className="mainnav" aria-label="main">
            <a href="#/" aria-current="page">
              {s.nav.trails}
            </a>
            <a href="#/" onClick={(e) => e.preventDefault()}>
              {s.nav.events}
            </a>
            <a href="#/" onClick={(e) => e.preventDefault()}>
              {s.nav.about}
            </a>
            <a href="#/" onClick={(e) => e.preventDefault()}>
              {s.nav.app}
            </a>
          </nav>
          <div className="top-actions">
            <Req n={14} />
            <label className="reqtoggle">
              <input type="checkbox" checked={showReqs} onChange={(e) => setShowReqs(e.target.checked)} />
              <span>{s.reqs.show}</span>
            </label>
            <button type="button" className="btn ghost sm" onClick={switchLang} lang={lang === 'ar' ? 'en' : 'ar'}>
              {s.switchLang}
            </button>
          </div>
        </div>
      </header>

      {route.page === 'list' ? (
        <ListPage state={list} setState={setList} routes={routes} me={me} base={base} setBase={setBase} />
      ) : (
        <TrailPage id={route.id} routes={routes} base={base} setBase={setBase} />
      )}

      <footer className="foot">
        <div className="foot-in">
          <img src="/darb/logo-white.png" alt={s.brand} width="91" height="48" className="foot-logo" />
          <p>{s.footer.note}</p>
          <p className="muted">{s.footer.sources}</p>
        </div>
      </footer>

      {showReqs && (
        <>
          <button type="button" className="reqfab" onClick={() => setPanel((p) => !p)} aria-expanded={panel}>
            <Icon k="check" size={18} />
            <span className="rf-label">{s.reqs.panel}</span> <b>{num(lang, REQS.length)}</b>
          </button>
          {panel && (
            <div className="reqpanel" role="dialog" aria-label={s.reqs.panel}>
              <div className="reqpanel-h">
                <b>{s.reqs.panel}</b>
                <button type="button" className="icon-btn" onClick={() => setPanel(false)} aria-label={s.trail.close}>
                  <Icon k="close" />
                </button>
              </div>
              <ol>
                {REQS.map((r) => (
                  <li key={r.n}>
                    <button type="button" onClick={() => goToReq(r.n)}>
                      <span className="req static">{r.n}</span>
                      <span className="rq-t">
                        {r[lang]}
                        <small>
                          {s.reqs.on}: {s.reqs[r.where]}
                        </small>
                      </span>
                      <Icon k="chev" size={16} />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </UiContext.Provider>
  )
}

const inBucket = (v: number | null, b: Bucket | null, lo: number, hi: number) =>
  !b || (v != null && (b === 'short' ? v < lo : b === 'mid' ? v >= lo && v <= hi : v > hi))

function ListPage(props: {
  state: ListState
  setState: (f: (s: ListState) => ListState) => void
  routes: Routes
  me: ReturnType<typeof useMe>
  base: Base
  setBase: (b: Base) => void
}) {
  const { state: st, setState, routes, me, base, setBase } = props
  const { s, lang } = useUi()
  const set = <K extends keyof ListState>(k: K, v: ListState[K]) => setState((p) => ({ ...p, [k]: v }))
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [drawer, setDrawer] = useState(false)
  const [nearNote, setNearNote] = useState<string | null>(null)

  const regions = useMemo(() => {
    const m = new Map<string, Trail['region']>()
    TRAILS.forEach((t) => m.set(t.region.ar, t.region))
    return [...m.values()].sort((a, b) => pick(a, lang).localeCompare(pick(b, lang), lang))
  }, [lang])

  const filterOnly = (x: ListState) => {
    const needle = fold(x.q)
    return TRAILS.filter(
      (t) =>
        (!needle || haystack(t).includes(needle)) &&
        (!x.region || t.region.ar === x.region) &&
        (!x.levels.length || (t.difficulty && x.levels.includes(t.difficulty))) &&
        inBucket(t.lengthKm, x.len, 5, 10) &&
        inBucket(t.duration ? (t.duration[0] + t.duration[1]) / 120 : null, x.dur, 2, 4) &&
        (!x.withRoute || Boolean(routes[t.id]?.length)),
    )
  }

  const shown = useMemo(() => {
    const list = filterOnly(st)
    const len = (t: Trail) => t.lengthKm ?? Infinity
    const by: Partial<Record<Sort, (a: Trail, b: Trail) => number>> = {
      short: (a, b) => len(a) - len(b),
      long: (a, b) => (b.lengthKm ?? -1) - (a.lengthKm ?? -1),
      easy: (a, b) => difficultyRank(a) - difficultyRank(b) || len(a) - len(b),
      hard: (a, b) => (difficultyRank(b) % 4) - (difficultyRank(a) % 4) || len(b) - len(a),
      gain: (a, b) => (b.gainM ?? -1) - (a.gainM ?? -1),
      near: me.pos ? (a, b) => (a.start ? km(me.pos!, a.start) : Infinity) - (b.start ? km(me.pos!, b.start) : Infinity) : undefined,
    }
    const f = by[st.sort]
    return f ? [...list].sort(f) : list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st, routes, me.pos])

  const chooseSort = async (v: Sort) => {
    set('sort', v)
    setNearNote(null)
    if (v === 'near' && !me.pos) {
      setNearNote(s.sort.locating)
      const p = await me.locate()
      setNearNote(p ? null : s.sort.noLocation)
    }
  }

  const select = (id: string) => {
    setSelected(id)
    document.getElementById(`card-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }

  const chips: { key: string; label: string; clear: () => void }[] = [
    ...(st.region ? [{ key: 'r', label: pick(regions.find((r) => r.ar === st.region) ?? null, lang), clear: () => set('region', null) }] : []),
    ...st.levels.map((l) => ({ key: l, label: s.difficulty[l], clear: () => set('levels', st.levels.filter((x) => x !== l)) })),
    ...(st.len ? [{ key: 'len', label: s.filters.len[st.len], clear: () => set('len', null) }] : []),
    ...(st.dur ? [{ key: 'dur', label: s.filters.dur[st.dur], clear: () => set('dur', null) }] : []),
    ...(st.withRoute ? [{ key: 'wr', label: s.filters.withRoute, clear: () => set('withRoute', false) }] : []),
  ]
  const clearAll = () => setState((p) => ({ ...p, region: null, levels: [], len: null, dur: null, withRoute: false }))

  return (
    <main className={`listpage view-${st.view}`}>
      <section className="hero">
        <Scenery seed="darb-hero" />
        <div className="hero-in">
          <h1>{s.hero.title}</h1>
          <p>{s.hero.sub}</p>
          <SearchBox q={st.q} setQ={(q) => set('q', q)} regions={regions} onRegion={(r) => setState((p) => ({ ...p, region: r, q: '' }))} />
        </div>
      </section>

      <div className="toolbar">
        <div className="toolbar-in">
          <b className="count" aria-live="polite">
            {fill(s.results, { n: num(lang, shown.length) })}
          </b>
          <button type="button" className={`btn outline${chips.length ? ' has' : ''}`} onClick={() => setDrawer(true)}>
            <Icon k="filter" size={18} />
            {s.filters.button}
            {chips.length > 0 && <span className="badge">{num(lang, chips.length)}</span>}
            <Req n={4} />
          </button>
          <label className="sortsel">
            <span className="sr-only">{s.sort.label}</span>
            <Icon k="list" size={18} />
            <select value={st.sort} onChange={(e) => chooseSort(e.target.value as Sort)}>
              {(['default', 'near', 'short', 'long', 'easy', 'hard', 'gain'] as Sort[]).map((k) => (
                <option key={k} value={k}>
                  {s.sort.label}: {s.sort[k]}
                </option>
              ))}
            </select>
            <Req n={5} />
          </label>
          <div className="viewseg" role="group" aria-label="view">
            {(['grid', 'split', 'map'] as View[]).map((v) => (
              <button key={v} type="button" aria-pressed={st.view === v} onClick={() => set('view', v)} title={s.view[v]}>
                <Icon k={v} size={18} />
                <span>{s.view[v]}</span>
              </button>
            ))}
          </div>
        </div>
        {(chips.length > 0 || nearNote) && (
          <div className="chiprow">
            {nearNote && <span className="note">{nearNote}</span>}
            {chips.map((c) => (
              <button key={c.key} type="button" className="chip on" onClick={c.clear}>
                {c.label}
                <Icon k="close" size={14} />
              </button>
            ))}
            {chips.length > 1 && (
              <button type="button" className="linkbtn" onClick={clearAll}>
                {s.filters.clear}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="results">
        <div className="cards-pane">
          {shown.length === 0 && <p className="empty">{s.empty}</p>}
          <div className="cards">
            {shown.map((t, i) => (
              <TrailCard
                key={t.id}
                t={t}
                first={i === 0}
                on={t.id === selected}
                hasRoute={Boolean(routes[t.id]?.length)}
                away={st.sort === 'near' && me.pos && t.start ? km(me.pos, t.start) : null}
                onHover={setHovered}
                onLocate={() => select(t.id)}
              />
            ))}
          </div>
        </div>
        <div className="map-pane">
          <Req n={1} />
          <DarbMap trails={shown} routes={routes} selected={selected} hovered={hovered} onSelect={select} base={base} setBase={setBase} />
        </div>
      </div>

      {/* phones: one floating switch between the list and the map */}
      <button
        type="button"
        className="mswitch"
        onClick={() => {
          set('view', st.view === 'map' ? 'split' : 'map')
          // bring the results to the top so the map fills the screen
          const top = document.querySelector('.results')!.getBoundingClientRect().top + scrollY - (document.querySelector('.toolbar') as HTMLElement).offsetHeight - 58
          if (scrollY < top || st.view === 'map') scrollTo({ top: Math.max(0, top) })
        }}
      >
        <Icon k={st.view === 'map' ? 'list' : 'map'} size={18} />
        {st.view === 'map' ? s.view.showList : s.view.showMap}
        <Req n={13} />
      </button>

      {drawer && (
        <FilterDrawer
          st={st}
          setState={setState}
          regions={regions}
          preview={(x) => filterOnly(x).length}
          onClose={() => setDrawer(false)}
        />
      )}
    </main>
  )
}

function SearchBox({ q, setQ, regions, onRegion }: { q: string; setQ: (q: string) => void; regions: Trail['region'][]; onRegion: (r: string) => void }) {
  const { s, lang } = useUi()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const needle = fold(q)
  const trails = needle ? TRAILS.filter((t) => haystack(t).includes(needle)).slice(0, 5) : []
  const places = needle ? regions.filter((r) => fold(`${r.ar} ${r.en}`).includes(needle)).slice(0, 3) : []

  useEffect(() => {
    const on = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false)
    document.addEventListener('mousedown', on)
    return () => document.removeEventListener('mousedown', on)
  }, [])

  return (
    <div className="searchbox" ref={box}>
      <Req n={3} />
      <label>
        <span className="sr-only">{s.search.label}</span>
        <Icon k="search" />
        <input
          type="search"
          value={q}
          placeholder={s.search.ph}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        />
      </label>
      {open && needle && (
        <div className="suggest" role="listbox">
          {places.length > 0 && <div className="sg-h">{s.search.places}</div>}
          {places.map((r) => (
            <button
              key={r.ar}
              type="button"
              role="option"
              onClick={() => {
                onRegion(r.ar)
                setOpen(false)
              }}
            >
              <Icon k="pin" size={16} /> {pick(r, lang)}
            </button>
          ))}
          {trails.length > 0 && <div className="sg-h">{s.search.trails}</div>}
          {trails.map((t) => (
            <a key={t.id} role="option" href={`#/trail/${t.id}`} onClick={() => setOpen(false)}>
              <Icon k="dist" size={16} />
              <span>
                {pick(t.name, lang)}
                <small>{[pick(t.city, lang), pick(t.region, lang)].filter(Boolean).join('، ')}</small>
              </span>
            </a>
          ))}
          {!trails.length && !places.length && <div className="sg-none">{s.search.none}</div>}
        </div>
      )}
    </div>
  )
}

export function Stats({ t, compact }: { t: Trail; compact?: boolean }) {
  const { s, lang } = useUi()
  const u = { h: s.unit.h, min: s.unit.min }
  return (
    <ul className={`stats${compact ? ' compact' : ''}`}>
      {t.lengthKm != null && (
        <li title={s.stat.length}>
          <Icon k="dist" size={16} />
          <span className="v">

            <b>{num(lang, t.lengthKm)}</b> {s.unit.km}
          </span>
          {!compact && <small>{s.stat.length}</small>}
        </li>
      )}
      {t.duration && (
        <li title={s.stat.time}>
          <Icon k="time" size={16} />
          <span className="v">
            <b>{duration(t.duration, lang, u)}</b>
          </span>
          {!compact && <small>{s.stat.time}</small>}
        </li>
      )}
      {t.gainM != null && (
        <li title={s.stat.gain}>
          <Icon k="up" size={16} />
          <span className="v">

            <b>{num(lang, t.gainM, 0)}</b> {s.unit.m}
          </span>
          {!compact && <small>{s.stat.gain}</small>}
        </li>
      )}
      {!compact && t.highM != null && (
        <li title={s.stat.high}>
          <Icon k="peak" size={16} />
          <span className="v">

            <b>{num(lang, t.highM, 0)}</b> {s.unit.m}
          </span>
          <small>{s.stat.high}</small>
        </li>
      )}
      {!compact && t.lowM != null && (
        <li title={s.stat.low}>
          <Icon k="low" size={16} />
          <span className="v">

            <b>{num(lang, t.lowM, 0)}</b> {s.unit.m}
          </span>
          <small>{s.stat.low}</small>
        </li>
      )}
    </ul>
  )
}

export const Level = ({ d }: { d: Difficulty | null }) => {
  const { s } = useUi()
  return (
    <span className={`level ${d ?? 'none'}`}>
      <i />
      <i />
      <i />
      {s.difficulty[d ?? 'none']}
    </span>
  )
}

function TrailCard(props: {
  t: Trail
  first: boolean
  on: boolean
  hasRoute: boolean
  away: number | null
  onHover: (id: string | null) => void
  onLocate: () => void
}) {
  const { t, first, on, hasRoute, away, onHover, onLocate } = props
  const { s, lang } = useUi()
  return (
    <article
      id={`card-${t.id}`}
      className={`card${on ? ' on' : ''}`}
      onMouseEnter={() => onHover(t.id)}
      onMouseLeave={() => onHover(null)}
    >
      {first && <Req n={2} />}
      <a href={`#/trail/${t.id}`} className="card-img">
        <Scenery seed={t.id} label={s.photo} />
        <Level d={t.difficulty} />
        {away != null && (
          <span className="away">
            {num(lang, away, away < 10 ? 1 : 0)} {s.unit.km}
          </span>
        )}
      </a>
      <div className="card-body">
        <p className="place">
          <Icon k="pin" size={14} />
          {[pick(t.city, lang), pick(t.region, lang)].filter((x, i, a) => x && a.indexOf(x) === i).join('، ')}
        </p>
        <h3>
          <a href={`#/trail/${t.id}`}>{pick(t.name, lang)}</a>
        </h3>
        <Stats t={t} compact />
        <div className="card-foot">
          <a href={`#/trail/${t.id}`} className="btn primary sm">
            {s.card.details}
          </a>
          {t.start && (
            <button type="button" className="btn ghost sm" onClick={onLocate}>
              <Icon k="map" size={16} />
              {hasRoute ? s.card.route : s.trail.startHere}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function FilterDrawer(props: {
  st: ListState
  setState: (f: (s: ListState) => ListState) => void
  regions: Trail['region'][]
  preview: (x: ListState) => number
  onClose: () => void
}) {
  const { st, setState, regions, preview, onClose } = props
  const { s, lang } = useUi()
  const [d, setD] = useState(st)
  const set = <K extends keyof ListState>(k: K, v: ListState[K]) => setD((p) => ({ ...p, [k]: v }))
  const n = preview(d)

  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', on)
    document.body.style.overflow = 'hidden'
    return () => {
      removeEventListener('keydown', on)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const bucket = (k: 'len' | 'dur', label: string, opts: Record<Bucket, string>) => (
    <fieldset>
      <legend>{label}</legend>
      <div className="chips">
        <button type="button" className={`chip${!d[k] ? ' on' : ''}`} onClick={() => set(k, null)}>
          {s.filters.all}
        </button>
        {(Object.keys(opts) as Bucket[]).map((b) => (
          <button key={b} type="button" className={`chip${d[k] === b ? ' on' : ''}`} onClick={() => set(k, d[k] === b ? null : b)}>
            {opts[b]}
          </button>
        ))}
      </div>
    </fieldset>
  )

  return (
    <div className="drawer-wrap" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={s.filters.title}>
        <div className="drawer-h">
          <h2>{s.filters.title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={s.trail.close}>
            <Icon k="close" />
          </button>
        </div>
        <div className="drawer-b">
          <fieldset>
            <legend>{s.filters.region}</legend>
            <div className="chips">
              <button type="button" className={`chip${!d.region ? ' on' : ''}`} onClick={() => set('region', null)}>
                {s.filters.all}
              </button>
              {regions.map((r) => (
                <button key={r.ar} type="button" className={`chip${d.region === r.ar ? ' on' : ''}`} onClick={() => set('region', d.region === r.ar ? null : r.ar)}>
                  {pick(r, lang)}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>{s.filters.difficulty}</legend>
            <div className="chips">
              {(['easy', 'moderate', 'hard'] as Difficulty[]).map((l) => {
                const on = d.levels.includes(l)
                return (
                  <button key={l} type="button" className={`chip lvl-${l}${on ? ' on' : ''}`} aria-pressed={on} onClick={() => set('levels', on ? d.levels.filter((x) => x !== l) : [...d.levels, l])}>
                    <Level d={l} />
                  </button>
                )
              })}
            </div>
          </fieldset>
          {bucket('len', s.filters.length, s.filters.len)}
          {bucket('dur', s.filters.duration, s.filters.dur)}
          <fieldset>
            <legend>{s.filters.route}</legend>
            <label className="switch">
              <input type="checkbox" checked={d.withRoute} onChange={(e) => set('withRoute', e.target.checked)} />
              <span />
              {s.filters.withRoute}
            </label>
          </fieldset>
        </div>
        <div className="drawer-f">
          <button type="button" className="linkbtn" onClick={() => setD((p) => ({ ...p, region: null, levels: [], len: null, dur: null, withRoute: false }))}>
            {s.filters.clear}
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={n === 0}
            onClick={() => {
              setState(() => d)
              onClose()
            }}
          >
            {n === 0 ? s.empty.split('.')[0] : fill(s.filters.apply, { n: num(lang, n) })}
          </button>
        </div>
      </aside>
    </div>
  )
}
