import { describe, expect, it } from 'vitest'
import i18n from './i18n'

const show = (lang: string, count: number) => i18n.getFixedT(lang)('filters.show', { count, n: String(count) })

describe('the filter page button', () => {
  it('agrees with the count in Arabic', () => {
    expect(show('ar', 0)).toBe('لا توجد مسارات مطابقة')
    expect(show('ar', 1)).toBe('اعرض مسارًا واحدًا')
    expect(show('ar', 2)).toBe('اعرض مسارين')
    expect(show('ar', 5)).toBe('اعرض 5 مسارات')
    expect(show('ar', 14)).toBe('اعرض 14 مسارًا')
    expect(show('ar', 100)).toBe('اعرض 100 مسار')
  })

  it('agrees with the count in English', () => {
    expect(show('en', 0)).toBe('No trails match')
    expect(show('en', 1)).toBe('Show 1 trail')
    expect(show('en', 14)).toBe('Show 14 trails')
  })
})
