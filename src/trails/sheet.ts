/** Where the phone layout's bottom sheet can rest, and where a drag lets it go. */

export type Snap = 'peek' | 'half' | 'full'
export const SNAPS: Snap[] = ['peek', 'half', 'full']
export const PEEK = 156
/** the floating brand bar: the sheet stops below it, and the map keeps framed Trails under it */
export const TOP = 64
/** a drag shorter than this settles back where it's nearest; longer, it carries on that way */
const FLICK = 24

/** keep in step with the .sheet[data-snap] heights in trails.css */
export const heightOf = (s: Snap, H: number) => (s === 'peek' ? PEEK : s === 'half' ? Math.round(H / 2) : H - TOP)

/** tapping the handle steps through the heights */
export const NEXT: Record<Snap, Snap> = { peek: 'half', half: 'full', full: 'peek' }

/**
 * Where a drag from height `from` that was let go at `to` settles, in a screen `H` px tall.
 * A short drag snaps to the nearest height. A longer one goes to the nearest height in the
 * direction it moved, so a quick flick moves one step even if it didn't get halfway there.
 */
export function settle(from: number, to: number, H: number): Snap {
  const all = SNAPS.map((s) => [s, heightOf(s, H)] as const)
  const nearest = (list: (typeof all)[number][]) => list.reduce((a, b) => (Math.abs(b[1] - to) < Math.abs(a[1] - to) ? b : a))[0]
  const moved = to - from
  if (Math.abs(moved) < FLICK) return nearest(all)
  const ahead = all.filter(([, h]) => (moved > 0 ? h > from + 1 : h < from - 1))
  return nearest(ahead.length ? ahead : all)
}
