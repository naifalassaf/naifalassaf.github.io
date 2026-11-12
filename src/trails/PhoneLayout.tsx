import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import TrailMap from './TrailMap'
import { LOCKUP_SVG } from './lockup'
import { duration, km, num, pick } from './format'
import { Chips, Svg, TrailLinks, type FilterGroup, type Sort } from './parts'
import { heightOf, NEXT, settle, TOP, type Snap } from './sheet'
import type { Lang, Routes, Trail } from './types'
import type { MyLocation } from './useMyLocation'

/**
 * Phones: the map fills the screen and the register lives in a bottom sheet over it.
 * The sheet rests at one of three heights (peek, half, full) and can be dragged between them;
 * a selected Trail replaces the list with its details, so the map never needs a popup.
 *
 * Advanced search is a page of its own in the sheet, swapped in for the list the way a Trail's
 * details are, so its sections scroll like any content however many regions there are.
 *
 * Touch, as in phone map apps: until the sheet is full, a vertical swipe anywhere on it moves
 * the sheet rather than scrolling what's inside. Once it's full the content scrolls, and pulling
 * down with the content already at its top brings the sheet back down.
 */

export interface PhoneProps {
  trails: Trail[]
  shown: Trail[]
  visible: Set<string>
  routes: Routes
  me: MyLocation
  q: string
  setQ: (q: string) => void
  sort: Sort
  sorts: [Sort, string][]
  chooseSort: (s: Sort) => void
  /** shown under the sort while the distance sort waits on, or failed to get, a location */
  sortNote: string | null
  /** how many of Source / region / difficulty are set */
  active: number
  /** Source / region / difficulty */
  groups: FilterGroup[]
  clearFilters: () => void
  colophon: ReactNode
  selected: string | null
  select: (id: string) => void
  deselect: () => void
  switchLang: () => void
  regionCount: number
}

export default function PhoneLayout(p: PhoneProps) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language as Lang
  const root = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLElement>(null)
  const [snap, setSnap] = useState<Snap>('half')
  const [drag, setDrag] = useState<number | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterBtn = useRef<HTMLButtonElement>(null)
  // closing the filter page puts focus back on the button that opened it
  const wasOpen = useRef(false)
  useEffect(() => {
    if (wasOpen.current && !filtersOpen) filterBtn.current?.focus()
    wasOpen.current = filtersOpen
  }, [filtersOpen])
  const start = useRef<{ y: number; h: number } | null>(null)
  /** a mouse drag ends in a click on the handle too; that click mustn't also step the snap */
  const dragged = useRef(false)
  /** the live drag height, for the touch listeners, which outlive a render */
  const dragH = useRef<number | null>(null)
  const sel = p.selected ? p.trails.find((x) => x.id === p.selected) : undefined

  // The map reads where the sheet is heading, not where it is mid-animation, so a fly started in
  // the same render as a snap change frames the Trail above the sheet's new edge. A full sheet
  // hides the map, and filtering or searching there would otherwise squeeze the matches into the
  // sliver left above it and zoom out to the whole world; frame them for the half sheet instead,
  // which is what's showing when the sheet comes back down.
  const snapNow = useRef(snap)
  snapNow.current = snap
  const covered = () => {
    const H = root.current?.clientHeight ?? 0
    return { top: TOP, bottom: heightOf(snapNow.current === 'full' ? 'half' : snapNow.current, H) }
  }

  // Leaflet's bottom controls (legend, credit) ride on top of the sheet
  useEffect(() => {
    const el = sheet.current!
    const ro = new ResizeObserver(() => root.current?.style.setProperty('--sheet', `${el.offsetHeight}px`))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /** picking a Trail, from the list or the map: show its details with the map still in view */
  const select = (id: string) => {
    setSnap('half')
    setFiltersOpen(false)
    p.select(id)
  }

  // the three steps of any drag, by mouse or by touch
  const begin = (y: number) => ({ y, h: sheet.current!.offsetHeight })
  const follow = (from: { y: number; h: number }, y: number) => {
    const H = root.current!.clientHeight
    dragH.current = Math.max(96, Math.min(H - TOP, from.h + from.y - y))
    setDrag(dragH.current)
  }
  /** let go: settle on a height; true if the sheet had actually moved */
  const finish = (from: { y: number; h: number }) => {
    const h = dragH.current
    dragH.current = null
    setDrag(null)
    if (h == null) return false
    setSnap(settle(from.h, h, root.current!.clientHeight))
    return true
  }

  // touch: the handle, the header and (until the sheet is full) the content all drag the sheet
  useEffect(() => {
    const el = sheet.current!
    let g: { y: number; h: number; x: number; body: Element | null; mode: 'wait' | 'drag' | 'pass' } | null = null
    const onStart = (e: TouchEvent) => {
      const t = e.touches[0]
      g = e.touches.length === 1 ? { ...begin(t.clientY), x: t.clientX, body: (e.target as Element).closest('.sheet-body'), mode: 'wait' } : null
    }
    const onMove = (e: TouchEvent) => {
      if (!g || g.mode === 'pass') return
      const t = e.touches[0]
      const dy = g.y - t.clientY // + is up
      const dx = t.clientX - g.x
      if (g.mode === 'wait') {
        if (g.body && snapNow.current !== 'full') {
          // the content isn't scrollable yet: cancel the scroll before it can start
          e.preventDefault()
          if (Math.abs(dy) >= 4) g.mode = 'drag'
        } else if (g.body) {
          // full: scroll, unless this is a pull down with the content already at its top
          g.mode = g.body.scrollTop <= 0 && dy < 0 ? 'drag' : 'pass'
        } else if (Math.abs(dx) + Math.abs(dy) >= 4) {
          // header: up and down moves the sheet, sideways is left to the sort row
          g.mode = Math.abs(dy) > Math.abs(dx) ? 'drag' : 'pass'
        }
        if (g.mode === 'drag') g.y = t.clientY - Math.sign(dy) // start from here, not the touch-down
      }
      if (g.mode !== 'drag') return
      e.preventDefault()
      follow(g, t.clientY)
    }
    const onEnd = () => {
      if (g?.mode === 'drag') finish(g)
      g = null
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
    // begin/follow/finish only touch refs and setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // mouse: the handle (touch is handled above)
  const grab = {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      start.current = begin(e.clientY)
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (start.current && Math.abs(e.clientY - start.current.y) > 4) follow(start.current, e.clientY)
    },
    onPointerUp: () => {
      if (!start.current) return
      dragged.current = finish(start.current)
      start.current = null
    },
    onPointerCancel: () => {
      if (start.current) finish(start.current)
      start.current = null
    },
  }

  /** Advanced search takes the whole sheet; leaving it shows the results with the map above */
  const openFilters = () => {
    setFiltersOpen(true)
    setSnap('full')
  }
  const closeFilters = () => {
    setFiltersOpen(false)
    setSnap('half')
  }

  const other: Lang = lang === 'ar' ? 'en' : 'ar'
  const u = { h: t('unit.h'), min: t('unit.min') }
  const place = (tr: Trail) => [pick(tr.region, lang), pick(tr.city, lang)].filter(Boolean).join(' · ')
  const away = (tr: Trail) => (p.sort === 'near' && p.me.pos && tr.start ? km(p.me.pos, tr.start) : null)

  return (
    <div className="phone" ref={root}>
      <TrailMap trails={p.trails} visible={p.visible} selected={p.selected} routes={p.routes} onSelect={select} me={p.me} popups={false} covered={covered} />

      <header className="ph-top">
        <span className="ph-brand">
          <span className="lockup" role="img" aria-label={t('brand')} dangerouslySetInnerHTML={{ __html: LOCKUP_SVG }} />
          <h1>{t('title')}</h1>
        </span>
        <button type="button" className="lang" onClick={p.switchLang} lang={other}>
          {t('switchLang')}
        </button>
      </header>

      <section
        ref={sheet}
        className={`sheet${drag != null ? ' dragging' : ''}`}
        data-snap={snap}
        style={drag != null ? { height: drag } : undefined}
        aria-label={sel ? pick(sel.name, lang) : t('title')}
      >
        <button type="button" className="grab" aria-label={t('sheet.resize')} onClick={() => {
            if (dragged.current) dragged.current = false
            else setSnap((s) => NEXT[s])
          }} {...grab}>
          <span />
        </button>

        {sel ? (
          <div className="sheet-body detail">
            <button type="button" className="back" onClick={p.deselect}>
              <span aria-hidden="true">{lang === 'ar' ? '→' : '←'}</span> {t('sheet.back')}
            </button>
            <h2>
              <span className="n">
                {pick(sel.name, lang)}
                {lang === 'en' && sel.nameEnOurs && <sup title={t('about.oursEn')}>*</sup>}
              </span>
              {sel.difficulty && <span className={`pill ${sel.difficulty}`}>{t(`difficulty.${sel.difficulty}`)}</span>}
            </h2>
            {sel.name[other] && (
              <p className="alt" lang={other} dir={other === 'ar' ? 'rtl' : 'ltr'}>
                {sel.name[other]}
              </p>
            )}
            <p className="place">
              <span className="src">{t(`source.${sel.source}`)}</span> · {place(sel)}
            </p>
            <dl className="stats">
              {sel.lengthKm != null && <Stat label={t('stat.length')} value={num(lang, sel.lengthKm)} unit={t('unit.km')} />}
              {sel.gainM != null && <Stat label={t('stat.gain')} value={num(lang, sel.gainM, 0)} unit={t('unit.m')} />}
              {sel.highM != null && <Stat label={t('stat.high')} value={num(lang, sel.highM, 0)} unit={t('unit.m')} />}
              {sel.duration && <Stat label={t('stat.time')} value={duration(sel.duration, lang, u)} />}
              {sel.shape && <Stat label={t('stat.shape')} value={t(`shape.${sel.shape}`)} />}
            </dl>
            <TrailLinks tr={sel} lang={lang} className="links" mapsFirst />
          </div>
        ) : filtersOpen ? (
          <div id="sheet-filters" className="filters fpage" role="region" aria-label={t('filters.toggle')}>
            <div className="fpage-head">
              <button type="button" className="back" onClick={closeFilters} autoFocus>
                <span aria-hidden="true">{lang === 'ar' ? '→' : '←'}</span> {t('filters.results')}
              </button>
              <h2>{t('filters.toggle')}</h2>
            </div>
            <div className="sheet-body fpage-body">
              {p.groups.map((g) => (
                <Chips key={g.key} label={g.label} all={t('filters.all')} value={g.value} onChange={g.onChange} options={g.options} />
              ))}
            </div>
            <div className="fpage-foot">
              <button type="button" className="clear" onClick={p.clearFilters} disabled={p.active === 0}>
                {t('filters.clear')}
              </button>
              <button type="button" className="show" onClick={closeFilters}>
                {t('filters.show', { count: p.shown.length, n: num(lang, p.shown.length) })}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="filters sheet-head">
              <div className="search-row">
                <label className="search">
                  <span className="sr-only">{t('filters.searchLabel')}</span>
                  <input type="search" value={p.q} onChange={(e) => p.setQ(e.target.value)} onFocus={() => setSnap('full')} placeholder={t('filters.search')} />
                </label>
                <button
                  ref={filterBtn}
                  type="button"
                  className="ficon"
                  aria-expanded={false}
                  aria-controls="sheet-filters"
                  aria-label={t('filters.toggle')}
                  onClick={openFilters}
                >
                  <Svg k="filter" />
                  {p.active > 0 && <span className="badge">{num(lang, p.active)}</span>}
                </button>
              </div>
              <div className="sorts" role="group" aria-label={t('filters.sort')}>
                {p.sorts.map(([s, label]) => (
                  <button key={s} type="button" aria-pressed={p.sort === s} onClick={() => p.chooseSort(s)}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="count" aria-live="polite">
                {p.sortNote ?? `${num(lang, p.shown.length)} ${t('tally.trails')} · ${num(lang, p.regionCount)} ${t('tally.regions')}`}
              </p>
            </div>
            <div className="sheet-body">
              {p.shown.length === 0 && <p className="empty">{t('empty')}</p>}
              <ol className="rows">
                {p.shown.map((tr) => {
                  const a = away(tr)
                  return (
                    <li key={tr.id}>
                      <button type="button" className="row" onClick={() => select(tr.id)}>
                        <span className={`dot ${tr.difficulty ?? ''}`} title={tr.difficulty ? t(`difficulty.${tr.difficulty}`) : undefined} />
                        <span className="row-main">
                          <b>{pick(tr.name, lang)}</b>
                          <small>{a != null ? `${num(lang, a, a < 10 ? 1 : 0)} ${t('unit.km')} · ${place(tr)}` : place(tr)}</small>
                        </span>
                        <span className="row-meta">
                          <b>{tr.lengthKm != null ? `${num(lang, tr.lengthKm)} ${t('unit.km')}` : '—'}</b>
                          {(tr.duration || tr.shape) && (
                            <small>{[tr.duration && duration(tr.duration, lang, u), tr.shape && t(`shape.${tr.shape}`)].filter(Boolean).join(' · ')}</small>
                          )}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
              {p.colophon}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value} {unit && <span className="u">{unit}</span>}
      </dd>
    </div>
  )
}
