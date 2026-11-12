import { describe, expect, it } from 'vitest'
import { popupHtml } from './popup'
import { trail } from './fixtures.test-util'

const t = (k: string) => `[${k}]`

describe('popupHtml', () => {
  it('escapes Trail text', () => {
    const html = popupHtml(trail('1', { name: { ar: 'x', en: '<img src=x onerror=alert(1)> & "q"' } }), 'en', t)
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt; &amp; &quot;q&quot;')
  })

  it('uses the Arabic name when there is no English one', () => {
    const html = popupHtml(trail('1', { name: { ar: 'مسار', en: null } }), 'en', t)
    expect(html).toContain('<span class="pt">مسار</span>')
  })

  it('leaves out stats the Source did not publish', () => {
    const html = popupHtml(trail('1', { lengthKm: null, highM: null, duration: null, difficulty: null }), 'en', t)
    expect(html).not.toContain('[unit.km]')
    expect(html).not.toContain('[stat.high]')
    expect(html).not.toContain('pill')
  })

  it('shows stats, difficulty, coordinates and both links', () => {
    const html = popupHtml(trail('7', { lengthKm: 7.5, start: [21.1476, 40.3024] }), 'ar', t)
    expect(html).toContain('dir="rtl"')
    expect(html).toContain('7.5 [unit.km]')
    expect(html).toContain('<span class="pill easy">[difficulty.easy]</span>')
    expect(html).toContain('21.14760, 40.30240')
    expect(html).toContain('href="https://darb.org/tracks/7/1"')
    expect(html).toContain('query=21.1476,40.3024')
  })

  it('says whether the Trail is a loop, out-and-back or one-way', () => {
    expect(popupHtml(trail('1', { shape: 'one-way' }), 'en', t)).toContain('[shape.one-way]')
    expect(popupHtml(trail('1', { shape: null }), 'en', t)).not.toContain('[shape.')
  })

  it('labels the page link by whose page it is, when that isn’t the Source', () => {
    const html = popupHtml(trail('8', { start: [27.5, 41.6], pageOf: 'schf' }), 'en', t)
    expect(html).toContain('[link.schf]')
    expect(html).not.toContain('[link.darb]')
  })
})
