import { useEffect, useMemo, useState } from 'react'
import type { Routes, Trail } from '../trails/types'
import { duration, km, num, pick } from '../trails/format'
import { fill } from './strings'
import { Icon, Req, Scenery, useUi } from './ui'
import DarbMap from './DarbMap'
import type { MyLocation } from '../trails/useMyLocation'
import { TRAILS } from './data'
import { Level, Stats } from './DarbApp'
import { saveFile, toGpx, toKml, toKmz } from './exports'

const PHOTOS = 5

export default function TrailPage({ id, routes, me }: { id: string; routes: Routes; me: MyLocation }) {
  const { s, lang } = useUi()
  const t = TRAILS.find((x) => x.id === id)
  // stable per Trail, so the map doesn't redraw on every render
  const one = useMemo(() => (t ? [t] : []), [t])
  const oneId = useMemo(() => new Set(t ? [t.id] : []), [t])
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [share, setShare] = useState(false)

  if (!t)
    return (
      <main className="trailpage">
        <div className="wrap">
          <p className="empty">{s.trail.notFound}</p>
          <a href="#/" className="btn primary">
            {s.trail.back}
          </a>
        </div>
      </main>
    )

  const lines = routes[t.id] ?? []
  const name = pick(t.name, lang)
  const place = [pick(t.city, lang), pick(t.region, lang)].filter((x, i, a) => x && a.indexOf(x) === i).join('، ')
  const u = { h: s.unit.h, min: s.unit.min }
  const nearby = t.start
    ? TRAILS.filter((x) => x.id !== t.id && x.start)
        .map((x) => ({ x, d: km(t.start!, x.start!) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
    : []

  const about = fill(s.trail.about, {
    level: s.difficulty[t.difficulty ?? 'none'],
    place,
    len: t.lengthKm != null ? `${num(lang, t.lengthKm)} ${s.unit.km}` : '—',
    time: t.duration ? duration(t.duration, lang, u) : '—',
    gain: t.gainM != null ? `${num(lang, t.gainM, 0)} ${s.unit.m}` : '—',
    high: t.highM != null ? `${num(lang, t.highM, 0)} ${s.unit.m}` : '—',
  })

  return (
    <main className="trailpage">
      <div className="wrap">
        <nav className="crumbs" aria-label="breadcrumb">
          <a href="#/">{s.nav.trails}</a>
          <Icon k="chev" size={14} />
          <span>{pick(t.region, lang)}</span>
          <Icon k="chev" size={14} />
          <span aria-current="page">{name}</span>
        </nav>

        <Gallery t={t} onOpen={setLightbox} />

        <div className="title-row">
          <Req n={6} />
          <div>
            <p className="place">
              <Icon k="pin" size={16} />
              {place}
            </p>
            <h1>{name}</h1>
            {t.name[lang === 'ar' ? 'en' : 'ar'] && (
              <p className="alt" lang={lang === 'ar' ? 'en' : 'ar'}>
                {t.name[lang === 'ar' ? 'en' : 'ar']}
              </p>
            )}
          </div>
          <div className="title-actions">
            <Level d={t.difficulty} />
            <button type="button" className="btn outline" onClick={() => setShare(true)}>
              <Icon k="share" size={18} />
              {s.trail.share}
              <Req n={12} />
            </button>
          </div>
        </div>

        <div className="statband">
          <Stats t={t} />
        </div>

        <div className="detail-grid">
          <div className="detail-main">
            <section className="panel">
              <h2>{s.trail.overview}</h2>
              <p className="lede">{about}</p>
              <p className="muted small">{s.trail.aboutNote}</p>
            </section>

            <section className="panel" id="trail-map">
              <h2>{s.trail.map}</h2>
              {t.start || lines.length ? (
                <DarbMap key={t.id} trails={one} visible={oneId} selected={t.id} routes={routes} onSelect={() => {}} me={me} popups={false} className="tall" />
              ) : (
                <p className="muted">{s.trail.noStart}</p>
              )}
              {!lines.length && t.start && <p className="muted small">{s.trail.noRoute}</p>}
            </section>

            <section className="panel" id="safety">
              <h2>
                <Icon k="shield" />
                {s.trail.safety}
                <Req n={11} />
              </h2>
              <div className="safety">
                {s.safetyItems.map(([h, b], i) => (
                  <details key={h} open={i < 2}>
                    <summary>{h}</summary>
                    <p>{b}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside className="detail-side">
            <GetThere t={t} />
            <Downloads t={t} lines={lines} />
            <a className="official" href={t.page[lang]} target="_blank" rel="noopener">
              {s.trail.official} ↗
            </a>
          </aside>
        </div>

        {nearby.length > 0 && (
          <section className="nearby">
            <h2>{s.trail.similar}</h2>
            <div className="nearby-row">
              {nearby.map(({ x, d }) => (
                <a key={x.id} href={`#/trail/${x.id}`} className="mini">
                  <Scenery seed={x.id} />
                  <span className="mini-b">
                    <b>{pick(x.name, lang)}</b>
                    <small>
                      {num(lang, d, 0)} {s.unit.km} · {x.lengthKm != null ? `${num(lang, x.lengthKm)} ${s.unit.km}` : ''} · {s.difficulty[x.difficulty ?? 'none']}
                    </small>
                  </span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* phones: the three actions stay in reach */}
      <div className="actionbar">
        <a href={t.start ? gmaps(t.start) : '#trail-map'} target={t.start ? '_blank' : undefined} rel="noopener" className="btn primary">
          <Icon k="nav" size={18} />
          {s.trail.getThere}
        </a>
        <a href="#downloads" className="btn outline" onClick={(e) => (e.preventDefault(), document.getElementById('downloads')?.scrollIntoView({ behavior: 'smooth' }))}>
          <Icon k="download" size={18} />
        </a>
        <button type="button" className="btn outline" onClick={() => setShare(true)} aria-label={s.trail.share}>
          <Icon k="share" size={18} />
        </button>
      </div>

      {lightbox != null && <Lightbox t={t} at={lightbox} setAt={setLightbox} />}
      {share && <ShareSheet t={t} onClose={() => setShare(false)} />}
    </main>
  )
}

const gmaps = ([la, lo]: [number, number]) => `https://www.google.com/maps/dir/?api=1&destination=${la},${lo}`

function Gallery({ t, onOpen }: { t: Trail; onOpen: (i: number) => void }) {
  const { s, lang } = useUi()
  return (
    <div className="gallery">
      <Req n={10} />
      {Array.from({ length: PHOTOS }, (_, i) => (
        <button key={i} type="button" className={`g${i}`} onClick={() => onOpen(i)} aria-label={fill(s.trail.photoOf, { i: num(lang, i + 1), n: num(lang, PHOTOS) })}>
          <Scenery seed={`${t.id}-${i}`} label={i === 0 ? s.photo : undefined} />
          {i === PHOTOS - 1 && (
            <span className="g-all">
              <Icon k="photo" size={18} />
              {s.trail.gallery} ({num(lang, PHOTOS)})
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

function Lightbox({ t, at, setAt }: { t: Trail; at: number; setAt: (i: number | null) => void }) {
  const { s, lang } = useUi()
  const go = (d: number) => setAt((at + d + PHOTOS) % PHOTOS)
  const rtl = lang === 'ar'
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAt(null)
      if (e.key === 'ArrowRight') go(rtl ? -1 : 1)
      if (e.key === 'ArrowLeft') go(rtl ? 1 : -1)
    }
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  })
  return (
    <div className="lightbox" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && setAt(null)}>
      <button type="button" className="icon-btn lb-close" onClick={() => setAt(null)} aria-label={s.trail.close}>
        <Icon k="close" />
      </button>
      <button type="button" className="icon-btn lb-prev" onClick={() => go(-1)} aria-label={s.trail.prev}>
        <Icon k="chev" />
      </button>
      <figure>
        <Scenery seed={`${t.id}-${at}`} label={s.photo} />
        <figcaption>
          {pick(t.name, lang)} — {fill(s.trail.photoOf, { i: num(lang, at + 1), n: num(lang, PHOTOS) })}
        </figcaption>
      </figure>
      <button type="button" className="icon-btn lb-next" onClick={() => go(1)} aria-label={s.trail.next}>
        <Icon k="chev" />
      </button>
      <div className="lb-thumbs">
        {Array.from({ length: PHOTOS }, (_, i) => (
          <button key={i} type="button" aria-current={i === at} onClick={() => setAt(i)}>
            <Scenery seed={`${t.id}-${i}`} />
          </button>
        ))}
      </div>
    </div>
  )
}

function useCopied() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      /* clipboard blocked; still show the text */
    }
    setCopied(key)
    setTimeout(() => setCopied(null), 1600)
  }
  return { copied, copy }
}

function GetThere({ t }: { t: Trail }) {
  const { s } = useUi()
  const { copied, copy } = useCopied()
  if (!t.start) return null
  const [la, lo] = t.start
  return (
    <section className="panel side">
      <h2>
        <Icon k="nav" />
        {s.trail.getThere}
        <Req n={9} />
      </h2>
      <p className="muted small">{s.trail.getThereSub}</p>
      <div className="dirs">
        <a className="btn primary block" href={gmaps(t.start)} target="_blank" rel="noopener">
          {s.trail.google}
        </a>
        <a className="btn outline block" href={`https://maps.apple.com/?daddr=${la},${lo}`} target="_blank" rel="noopener">
          {s.trail.apple}
        </a>
        <a className="btn outline block" href={`https://waze.com/ul?ll=${la},${lo}&navigate=yes`} target="_blank" rel="noopener">
          {s.trail.waze}
        </a>
      </div>
      <button type="button" className="coords" onClick={() => copy('c', `${la.toFixed(6)}, ${lo.toFixed(6)}`)}>
        <span dir="ltr">
          {la.toFixed(5)}, {lo.toFixed(5)}
        </span>
        <span className="cp">
          <Icon k={copied ? 'check' : 'copy'} size={16} />
          {copied ? s.trail.copied : s.trail.copyCoords}
        </span>
      </button>
    </section>
  )
}

function Downloads({ t, lines }: { t: Trail; lines: [number, number][][] }) {
  const { s, lang } = useUi()
  const name = pick(t.name, lang)
  const file = t.id
  const can = lines.length > 0 || Boolean(t.start)
  const items: [string, string, () => void][] = [
    ['GPX', s.trail.gpx, () => saveFile(`${file}.gpx`, toGpx(name, lines, t.start), 'application/gpx+xml')],
    ['KML', s.trail.kml, () => saveFile(`${file}.kml`, toKml(name, lines, t.start), 'application/vnd.google-earth.kml+xml')],
    ['KMZ', s.trail.kmz, () => saveFile(`${file}.kmz`, toKmz(name, lines, t.start), 'application/vnd.google-earth.kmz')],
  ]
  return (
    <section className="panel side" id="downloads">
      <h2>
        <Icon k="download" />
        {s.trail.download}
        <Req n={8} />
      </h2>
      <p className="muted small">{s.trail.downloadSub}</p>
      <div className="dls">
        {items.map(([fmt, sub, go]) => (
          <button key={fmt} type="button" className="dl" disabled={!can} onClick={go}>
            <span className="fmt">{fmt}</span>
            <span className="dl-t">
              <b>.{fmt.toLowerCase()}</b>
              <small>{sub}</small>
            </span>
            <Icon k="download" size={18} />
          </button>
        ))}
      </div>
      {!lines.length && t.start && <p className="muted small">{s.trail.startOnly}</p>}
    </section>
  )
}

function ShareSheet({ t, onClose }: { t: Trail; onClose: () => void }) {
  const { s, lang } = useUi()
  const { copied, copy } = useCopied()
  const url = `${location.origin}${location.pathname}${lang === 'en' ? '?lang=en' : ''}#/trail/${t.id}`
  const text = `${pick(t.name, lang)} — ${s.brand}`
  const enc = encodeURIComponent
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    addEventListener('keydown', on)
    return () => removeEventListener('keydown', on)
  }, [onClose])
  const native = typeof navigator.share === 'function'
  return (
    <div className="drawer-wrap center" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sharesheet" role="dialog" aria-modal="true" aria-label={s.trail.shareTitle}>
        <div className="drawer-h">
          <h2>{s.trail.shareTitle}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={s.trail.close}>
            <Icon k="close" />
          </button>
        </div>
        <div className="share-card">
          <Scenery seed={`${t.id}-0`} />
          <div>
            <b>{pick(t.name, lang)}</b>
            <small dir="ltr">{url.replace(/^https?:\/\//, '')}</small>
          </div>
        </div>
        <div className="share-grid">
          <a href={`https://wa.me/?text=${enc(`${text}\n${url}`)}`} target="_blank" rel="noopener" className="sh wa">
            <span>W</span>
            {s.trail.whatsapp}
          </a>
          <a href={`https://x.com/intent/post?text=${enc(text)}&url=${enc(url)}`} target="_blank" rel="noopener" className="sh x">
            <span>𝕏</span>
            {s.trail.x}
          </a>
          <a href={`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`} target="_blank" rel="noopener" className="sh tg">
            <span>T</span>
            {s.trail.telegram}
          </a>
          <a href={`mailto:?subject=${enc(text)}&body=${enc(url)}`} className="sh em">
            <span>@</span>
            {s.trail.email}
          </a>
        </div>
        <div className="share-actions">
          <button type="button" className="btn outline block" onClick={() => copy('l', url)}>
            <Icon k={copied ? 'check' : 'copy'} size={18} />
            {copied ? s.trail.copied : s.trail.copyLink}
          </button>
          {native && (
            <button type="button" className="btn primary block" onClick={() => navigator.share({ title: text, url }).catch(() => {})}>
              <Icon k="share" size={18} />
              {s.trail.share}…
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
