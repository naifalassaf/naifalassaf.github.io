import { describe, expect, it } from 'vitest'
import { heightOf, settle } from './sheet'

// an 800px screen: peek 156, half 400, full 736
const H = 800
const at = { peek: heightOf('peek', H), half: heightOf('half', H), full: heightOf('full', H) }

describe('where a dragged sheet settles', () => {
  it('a small nudge settles back where it started', () => {
    expect(settle(at.half, at.half + 15, H)).toBe('half')
    expect(settle(at.half, at.half - 15, H)).toBe('half')
  })

  it('a short flick moves one step that way, though it is nearer where it started', () => {
    expect(settle(at.half, at.half + 40, H)).toBe('full')
    expect(settle(at.half, at.half - 40, H)).toBe('peek')
    expect(settle(at.peek, at.peek + 40, H)).toBe('half')
  })

  it('a long drag down from full stops at the nearest height on the way', () => {
    expect(settle(at.full, 450, H)).toBe('half')
    expect(settle(at.full, 200, H)).toBe('peek')
  })

  it('dragging past the last height stays there', () => {
    expect(settle(at.full, at.full + 60, H)).toBe('full')
    expect(settle(at.peek, 100, H)).toBe('peek')
  })
})
